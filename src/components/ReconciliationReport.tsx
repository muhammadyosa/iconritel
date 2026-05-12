import { useState, useMemo, useCallback, useEffect } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { toLocalDateStr } from "@/lib/dateUtils";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import { useCloudTickets } from "@/hooks/useCloudTickets";

const RECON_HISTORY_PAGE_SIZE = 1000;

export function ReconciliationReport() {
  const { tickets } = useCloudTickets();

  const [reconRange, setReconRange] = useState<DateRange | undefined>(() => {
    const now = new Date();
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
  });
  const [reconStartHour, setReconStartHour] = useState<number>(0);
  const [reconEndHour, setReconEndHour] = useState<number>(23);
  const [reconUserDetail, setReconUserDetail] = useState<{ key: string; name: string } | null>(null);
  const [reconHistoryData, setReconHistoryData] = useState<any[]>([]);

  const reconWindow = useMemo(() => {
    const fromDate = reconRange?.from || new Date();
    const toDate = reconRange?.to || fromDate;
    const startBound = new Date(fromDate); startBound.setHours(reconStartHour, 0, 0, 0);
    const endBound = new Date(toDate); endBound.setHours(reconEndHour, 59, 59, 999);
    return {
      fromDate, toDate, startBound, endBound,
      cutoff: toLocalDateStr(startOfDay(fromDate)),
      cutoffEnd: toLocalDateStr(endOfDay(toDate)),
    };
  }, [reconRange, reconStartHour, reconEndHour]);

  const fetchReconHistory = useCallback(async () => {
    const rows: any[] = [];
    for (let from = 0; ; from += RECON_HISTORY_PAGE_SIZE) {
      const to = from + RECON_HISTORY_PAGE_SIZE - 1;
      const res = await supabase
        .from("daily_user_ticket_history")
        .select("user_id, user_name, date, total_created, total_resolved")
        .gte("date", reconWindow.cutoff)
        .lte("date", reconWindow.cutoffEnd)
        .range(from, to);
      if (res.error) break;
      const batch = res.data || [];
      rows.push(...batch);
      if (batch.length < RECON_HISTORY_PAGE_SIZE) break;
    }
    setReconHistoryData(rows);
  }, [reconWindow.cutoff, reconWindow.cutoffEnd]);

  const { debounced: debouncedFetchRecon } = useDebouncedCallback(fetchReconHistory, 400);

  useEffect(() => {
    fetchReconHistory();
    const ch = supabase
      .channel("recon-refresh-settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_user_ticket_history" }, () => debouncedFetchRecon())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchReconHistory, debouncedFetchRecon]);

  const reconLiveCreatedTickets = useMemo(() => {
    return tickets.filter(t => {
      try {
        const d = new Date(t.createdISO);
        return isWithinInterval(d, { start: reconWindow.startBound, end: reconWindow.endBound });
      } catch { return false; }
    });
  }, [tickets, reconWindow]);

  const reconLiveResolvedTickets = useMemo(() => {
    return tickets.filter(t => {
      if (!t.resolvedAt) return false;
      try {
        const d = new Date(t.resolvedAt);
        return isWithinInterval(d, { start: reconWindow.startBound, end: reconWindow.endBound });
      } catch { return false; }
    });
  }, [tickets, reconWindow]);

  const reconStats = useMemo(() => {
    const stats: Record<string, { name: string; histCreated: number; histResolved: number; liveCreated: number; liveResolved: number }> = {};
    const nameToKey = new Map<string, string>();
    const getKey = (id?: string | null, name?: string | null) => {
      const nameKey = name?.trim().toLowerCase() || "";
      if (nameKey && nameToKey.has(nameKey)) return nameToKey.get(nameKey)!;
      const key = id || nameKey || "unknown";
      if (nameKey) nameToKey.set(nameKey, key);
      return key;
    };
    const ensure = (key: string, name: string) => {
      if (!stats[key]) stats[key] = { name: name || "Unknown", histCreated: 0, histResolved: 0, liveCreated: 0, liveResolved: 0 };
      else if (name && name !== "Unknown") stats[key].name = name;
      return stats[key];
    };
    reconHistoryData.forEach(rec => {
      const s = ensure(getKey(rec.user_id, rec.user_name), (rec.user_name || "Unknown").trim());
      s.histCreated += rec.total_created || 0;
      s.histResolved += rec.total_resolved || 0;
    });
    reconLiveCreatedTickets.forEach(t => {
      const s = ensure(getKey(t.createdByUserId, t.createdByName), (t.createdByName || "Unknown").trim());
      s.liveCreated += 1;
    });
    reconLiveResolvedTickets.forEach(t => {
      const s = ensure(getKey(t.resolvedByUserId || t.createdByUserId, t.resolvedByName || t.createdByName), (t.resolvedByName || t.createdByName || "Unknown").trim());
      s.liveResolved += 1;
    });
    return Object.entries(stats)
      .map(([userKey, s]) => ({
        userKey,
        name: s.name,
        histCreated: s.histCreated,
        histResolved: s.histResolved,
        liveCreated: s.liveCreated,
        liveResolved: s.liveResolved,
        finalCreated: Math.max(s.histCreated, s.liveCreated),
        finalResolved: Math.max(s.histResolved, s.liveResolved),
      }))
      .filter(u => u.histCreated || u.histResolved || u.liveCreated || u.liveResolved)
      .sort((a, b) => b.finalCreated - a.finalCreated || b.finalResolved - a.finalResolved);
  }, [reconHistoryData, reconLiveCreatedTickets, reconLiveResolvedTickets]);

  return (
    <>
      <Card className="shadow-card overflow-hidden">
        <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-accent/5 space-y-2">
          <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary text-[9px] sm:text-[10px] px-1.5 sm:px-2">CHECK</Badge>
              <span>Rekonsiliasi Live vs History</span>
              <Badge variant="secondary" className="text-[8px] sm:text-[9px]">{reconStats.length} user</Badge>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => {
                const headers = ["Nama User", "Hist Created", "Live Created", "Final Created", "Delta C", "Hist Resolved", "Live Resolved", "Final Resolved", "Delta R", "Status"];
                const rows = reconStats.map(u => {
                  const dC = u.histCreated - u.liveCreated;
                  const dR = u.histResolved - u.liveResolved;
                  const status = dC === 0 && dR === 0 ? "MATCH" : (dC > 0 || dR > 0 ? "HISTORY>LIVE (auto-deleted)" : "LIVE>HISTORY (belum sync)");
                  return [u.name, u.histCreated, u.liveCreated, u.finalCreated, dC, u.histResolved, u.liveResolved, u.finalResolved, dR, status];
                });
                const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `rekonsiliasi-user-noc-${toLocalDateStr(new Date())}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export CSV
            </Button>
          </CardTitle>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="default" className="h-6 text-[10px] px-2.5 gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {reconRange?.from
                    ? reconRange.to && reconRange.to.getTime() !== reconRange.from.getTime()
                      ? `${format(reconRange.from, "dd MMM", { locale: localeId })} - ${format(reconRange.to, "dd MMM", { locale: localeId })}`
                      : format(reconRange.from, "dd MMM yyyy", { locale: localeId })
                    : "Pilih Tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="range" selected={reconRange} onSelect={setReconRange} disabled={(date) => date > new Date()} numberOfMonths={1} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground">Jam</span>
              <Select value={String(reconStartHour)} onValueChange={(v) => setReconStartHour(Number(v))}>
                <SelectTrigger className="h-6 w-[64px] text-[10px] px-2"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 24 }, (_, i) => <SelectItem key={i} value={String(i)} className="text-[11px]">{String(i).padStart(2, "0")}:00</SelectItem>)}</SelectContent>
              </Select>
              <span className="text-muted-foreground">→</span>
              <Select value={String(reconEndHour)} onValueChange={(v) => setReconEndHour(Number(v))}>
                <SelectTrigger className="h-6 w-[64px] text-[10px] px-2"><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: 24 }, (_, i) => <SelectItem key={i} value={String(i)} className="text-[11px]">{String(i).padStart(2, "0")}:59</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { const now = new Date(); setReconRange({ from: now, to: now }); setReconStartHour(0); setReconEndHour(23); }}>Hari Ini</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { const now = new Date(); setReconRange({ from: new Date(now.getFullYear(), now.getMonth(), 1), to: now }); setReconStartHour(0); setReconEndHour(23); }}>Bulan Ini</Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => { const now = new Date(); setReconRange({ from: subDays(now, 6), to: now }); setReconStartHour(0); setReconEndHour(23); }}>7 Hari</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="min-w-[640px]">
              <ScrollArea className={reconStats.length > 8 ? "h-[380px]" : ""}>
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-[9px] sm:text-[10px]">Nama User</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center">Hist C</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center">Live C</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center font-bold">Final</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center">Δ</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center text-success">Hist R</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center text-success">Live R</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center font-bold text-success">Final</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center">Δ</TableHead>
                      <TableHead className="text-[9px] sm:text-[10px] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reconStats.length === 0 ? (
                      <TableRow><TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-6">Tidak ada data dalam window ini</TableCell></TableRow>
                    ) : reconStats.map((u) => {
                      const dC = u.histCreated - u.liveCreated;
                      const dR = u.histResolved - u.liveResolved;
                      const match = dC === 0 && dR === 0;
                      return (
                        <TableRow key={u.userKey} className="cursor-pointer hover:bg-accent/5" onClick={() => setReconUserDetail({ key: u.userKey, name: u.name })}>
                          <TableCell className="py-1.5 text-[10px] sm:text-xs font-semibold truncate max-w-[140px]">{u.name}</TableCell>
                          <TableCell className="text-center text-[10px] sm:text-xs py-1.5">{u.histCreated}</TableCell>
                          <TableCell className="text-center text-[10px] sm:text-xs py-1.5">{u.liveCreated}</TableCell>
                          <TableCell className="text-center text-[10px] sm:text-xs font-bold py-1.5">{u.finalCreated}</TableCell>
                          <TableCell className={cn("text-center text-[10px] sm:text-xs py-1.5 font-medium", dC === 0 ? "text-muted-foreground" : dC > 0 ? "text-warning" : "text-destructive")}>{dC > 0 ? `+${dC}` : dC}</TableCell>
                          <TableCell className="text-center text-[10px] sm:text-xs text-success py-1.5">{u.histResolved}</TableCell>
                          <TableCell className="text-center text-[10px] sm:text-xs text-success py-1.5">{u.liveResolved}</TableCell>
                          <TableCell className="text-center text-[10px] sm:text-xs font-bold text-success py-1.5">{u.finalResolved}</TableCell>
                          <TableCell className={cn("text-center text-[10px] sm:text-xs py-1.5 font-medium", dR === 0 ? "text-muted-foreground" : dR > 0 ? "text-warning" : "text-destructive")}>{dR > 0 ? `+${dR}` : dR}</TableCell>
                          <TableCell className="text-center py-1.5">
                            {match ? (
                              <Badge variant="outline" className="text-[8px] sm:text-[9px] border-success text-success">✓ MATCH</Badge>
                            ) : (dC > 0 || dR > 0) ? (
                              <Badge variant="outline" className="text-[8px] sm:text-[9px] border-warning text-warning">AUTO-DEL</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[8px] sm:text-[9px] border-destructive text-destructive">DESYNC</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
          <div className="px-3 py-2 border-t bg-muted/20 text-[9px] sm:text-[10px] text-muted-foreground space-y-0.5">
            <div><strong>Window:</strong> {reconRange?.from ? format(reconRange.from, "dd MMM yyyy") : "-"}{reconRange?.to && reconRange.to.getTime() !== reconRange.from?.getTime() ? ` → ${format(reconRange.to, "dd MMM yyyy")}` : ""} · {String(reconStartHour).padStart(2, "0")}:00 – {String(reconEndHour).padStart(2, "0")}:59 · klik baris untuk detail</div>
            <div><strong>Catatan:</strong> filter jam hanya membatasi data <em>Live</em>; History tersimpan per-hari sehingga selalu mencakup seluruh hari.</div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!reconUserDetail} onOpenChange={(open) => !open && setReconUserDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Badge className="bg-primary/10 text-primary text-[10px]">DETAIL</Badge>
              <span>{reconUserDetail?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs">
              Window: {reconRange?.from ? format(reconRange.from, "dd MMM yyyy") : "-"}{reconRange?.to && reconRange.to.getTime() !== reconRange.from?.getTime() ? ` → ${format(reconRange.to, "dd MMM yyyy")}` : ""} · {String(reconStartHour).padStart(2, "0")}:00 – {String(reconEndHour).padStart(2, "0")}:59
            </DialogDescription>
          </DialogHeader>
          {reconUserDetail && (() => {
            const userKey = reconUserDetail.key;
            const matchUser = (id?: string | null, name?: string | null) => {
              const k = id || name?.trim().toLowerCase() || "unknown";
              return k === userKey;
            };
            const liveCreated = reconLiveCreatedTickets.filter(t => matchUser(t.createdByUserId, t.createdByName));
            const liveResolved = reconLiveResolvedTickets.filter(t => matchUser(t.resolvedByUserId || t.createdByUserId, t.resolvedByName || t.createdByName));
            const histRecs = reconHistoryData.filter(r => matchUser(r.user_id, r.user_name)).sort((a, b) => a.date.localeCompare(b.date));
            return (
              <Tabs defaultValue="live-created" className="flex-1 overflow-hidden flex flex-col">
                <TabsList className="grid grid-cols-3 h-8">
                  <TabsTrigger value="live-created" className="text-[10px]">Live Created ({liveCreated.length})</TabsTrigger>
                  <TabsTrigger value="live-resolved" className="text-[10px]">Live Resolved ({liveResolved.length})</TabsTrigger>
                  <TabsTrigger value="history" className="text-[10px]">History ({histRecs.length} hari)</TabsTrigger>
                </TabsList>
                <TabsContent value="live-created" className="flex-1 overflow-hidden mt-2">
                  <ScrollArea className="h-[55vh]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow><TableHead className="text-[10px]">Ticket</TableHead><TableHead className="text-[10px]">Customer/Host</TableHead><TableHead className="text-[10px]">Status</TableHead><TableHead className="text-[10px]">Created</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveCreated.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">Tidak ada incident live created di window ini</TableCell></TableRow>
                        ) : liveCreated.map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="text-[10px] font-mono">{t.serviceId || t.id.slice(0, 8)}</TableCell>
                            <TableCell className="text-[10px] truncate max-w-[180px]">{t.customerName || t.hostname || "-"}</TableCell>
                            <TableCell className="text-[10px]"><StatusBadge status={t.status as any} /></TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{format(new Date(t.createdISO), "dd/MM HH:mm")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="live-resolved" className="flex-1 overflow-hidden mt-2">
                  <ScrollArea className="h-[55vh]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow><TableHead className="text-[10px]">Ticket</TableHead><TableHead className="text-[10px]">Customer/Host</TableHead><TableHead className="text-[10px]">Resolved By</TableHead><TableHead className="text-[10px]">Resolved At</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {liveResolved.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">Tidak ada incident live resolved di window ini</TableCell></TableRow>
                        ) : liveResolved.map(t => (
                          <TableRow key={t.id}>
                            <TableCell className="text-[10px] font-mono">{t.serviceId || t.id.slice(0, 8)}</TableCell>
                            <TableCell className="text-[10px] truncate max-w-[180px]">{t.customerName || t.hostname || "-"}</TableCell>
                            <TableCell className="text-[10px]">{t.resolvedByName || t.createdByName || "-"}</TableCell>
                            <TableCell className="text-[10px] text-muted-foreground">{t.resolvedAt ? format(new Date(t.resolvedAt), "dd/MM HH:mm") : "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="history" className="flex-1 overflow-hidden mt-2">
                  <ScrollArea className="h-[55vh]">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow><TableHead className="text-[10px]">Tanggal</TableHead><TableHead className="text-[10px] text-center">Total Created</TableHead><TableHead className="text-[10px] text-center text-success">Total Resolved</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {histRecs.length === 0 ? (
                          <TableRow><TableCell colSpan={3} className="text-center text-xs text-muted-foreground py-6">Tidak ada record history di window ini</TableCell></TableRow>
                        ) : histRecs.map((r, idx) => (
                          <TableRow key={`${r.date}-${idx}`}>
                            <TableCell className="text-[10px] font-mono">{r.date}</TableCell>
                            <TableCell className="text-center text-[10px] font-bold">{r.total_created || 0}</TableCell>
                            <TableCell className="text-center text-[10px] font-bold text-success">{r.total_resolved || 0}</TableCell>
                          </TableRow>
                        ))}
                        {histRecs.length > 0 && (
                          <TableRow className="bg-muted/30 font-bold">
                            <TableCell className="text-[10px]">TOTAL</TableCell>
                            <TableCell className="text-center text-[10px]">{histRecs.reduce((s, r) => s + (r.total_created || 0), 0)}</TableCell>
                            <TableCell className="text-center text-[10px] text-success">{histRecs.reduce((s, r) => s + (r.total_resolved || 0), 0)}</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
