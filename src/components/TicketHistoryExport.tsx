import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { parseLocalDateStr, toLocalDateStr } from "@/lib/dateUtils";


interface HistoryRecord {
  date: string;
  ritel: number;
  feeder: number;
  total: number;
  created: number;
  in_progress: number;
  resolved: number;
  live_ritel?: number;
  live_feeder?: number;
  live_total?: number;
  live_in_progress?: number;
  live_resolved?: number;
  final_ritel?: number;
  final_feeder?: number;
  final_total?: number;
  final_in_progress?: number;
  final_resolved?: number;
}

const HISTORY_PAGE_SIZE = 1000;

export function TicketHistoryExport() {
  const { tickets } = useCloudTickets();
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("month");

  const cutoffDate = useMemo(() => {
    const cutoff = new Date();
    if (days === "month") return new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    return cutoff;
  }, [days]);

  useEffect(() => {
    fetchHistory();
  }, [days]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const cutoffStr = toLocalDateStr(cutoffDate);
      const allRows: HistoryRecord[] = [];
      for (let from = 0; ; from += HISTORY_PAGE_SIZE) {
        const to = from + HISTORY_PAGE_SIZE - 1;
        const { data, error } = await supabase
          .from("daily_ticket_history")
          .select("date, ritel, feeder, total, created, in_progress, resolved")
          .gte("date", cutoffStr)
          .order("date", { ascending: false })
          .range(from, to);

        if (error) throw error;
        const batch = data || [];
        allRows.push(...batch);
        if (batch.length < HISTORY_PAGE_SIZE) break;
      }
      setRecords(allRows);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching history:", err);
      toast.error("Gagal memuat data historis incident");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return parseLocalDateStr(dateStr).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const displayRecords = useMemo(() => {
    const cutoffStr = toLocalDateStr(cutoffDate);
    const map = new Map<string, HistoryRecord>();

    records.forEach((r) => {
      map.set(r.date, {
        ...r,
        live_ritel: 0,
        live_feeder: 0,
        live_total: 0,
        live_in_progress: 0,
        live_resolved: 0,
      });
    });

    tickets.forEach((ticket) => {
      const date = toLocalDateStr(new Date(ticket.createdISO));
      if (date < cutoffStr) return;
      const rec = map.get(date) || { date, ritel: 0, feeder: 0, total: 0, created: 0, in_progress: 0, resolved: 0, live_ritel: 0, live_feeder: 0, live_total: 0, live_in_progress: 0, live_resolved: 0 };
      const isFeeder = FEEDER_CONSTRAINTS_SET.has(ticket.constraint);
      rec.live_total = (rec.live_total || 0) + 1;
      if (isFeeder) rec.live_feeder = (rec.live_feeder || 0) + 1;
      else rec.live_ritel = (rec.live_ritel || 0) + 1;
      if (ticket.status === "Resolved") rec.live_resolved = (rec.live_resolved || 0) + 1;
      else rec.live_in_progress = (rec.live_in_progress || 0) + 1;
      map.set(date, rec);
    });

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        final_ritel: Math.max(r.ritel || 0, r.live_ritel || 0),
        final_feeder: Math.max(r.feeder || 0, r.live_feeder || 0),
        final_total: Math.max(r.total || 0, r.live_total || 0),
        final_in_progress: Math.max(r.in_progress || 0, r.live_in_progress || 0),
        final_resolved: Math.max(r.resolved || 0, r.live_resolved || 0),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, tickets, cutoffDate]);

  const buildExportData = () =>
    displayRecords.map((r) => ({
      Tanggal: formatDate(r.date),
      "Tanggal (ISO)": r.date,
      "Hist Ritel": r.ritel,
      "Live Ritel": r.live_ritel || 0,
      "Final Ritel": r.final_ritel || 0,
      "Hist Feeder": r.feeder,
      "Live Feeder": r.live_feeder || 0,
      "Final Feeder": r.final_feeder || 0,
      "Hist Total": r.total,
      "Live Total": r.live_total || 0,
      "Final Total": r.final_total || 0,
      "Hist On Progress": r.in_progress,
      "Live On Progress": r.live_in_progress || 0,
      "Final On Progress": r.final_in_progress || 0,
      "Hist Resolved": r.resolved,
      "Live Resolved": r.live_resolved || 0,
      "Final Resolved": r.final_resolved || 0,
    }));

  const handleExportExcel = async () => {
    if (displayRecords.length === 0) return toast.error("Tidak ada data untuk di-export");
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(buildExportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histori Incident");
    XLSX.writeFile(wb, `histori-incident-${days}hari-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  const handleExportCSV = async () => {
    if (displayRecords.length === 0) return toast.error("Tidak ada data untuk di-export");
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(buildExportData());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `histori-incident-${days}hari-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File CSV berhasil diunduh");
  };

  const totalRitel = displayRecords.reduce((s, r) => s + (r.final_ritel || 0), 0);
  const totalFeeder = displayRecords.reduce((s, r) => s + (r.final_feeder || 0), 0);
  const totalAll = displayRecords.reduce((s, r) => s + (r.final_total || 0), 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                📊 Daily Incident History
              </CardTitle>
              <CardDescription>
                Data historis incident tersimpan permanen di cloud — tidak hilang saat browser di-clear
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="14">14 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={records.length === 0}>
                    <FileDown className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-primary">{totalRitel}</p>
              <p className="text-[10px] text-muted-foreground">Total Ritel</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-destructive">{totalFeeder}</p>
              <p className="text-[10px] text-muted-foreground">Total Feeder</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{totalAll}</p>
              <p className="text-[10px] text-muted-foreground">Total Semua</p>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Memuat data...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Belum ada data historis incident
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border max-h-[50vh]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  <TableRow>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs text-center">Ritel</TableHead>
                    <TableHead className="text-xs text-center">Feeder</TableHead>
                    <TableHead className="text-xs text-center">Total</TableHead>
                    <TableHead className="text-xs text-center">On Progress</TableHead>
                    <TableHead className="text-xs text-center">Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.date}>
                      <TableCell className="text-xs font-medium">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="secondary" className="text-[10px]">{r.ritel}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="destructive" className="text-[10px]">{r.feeder}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center font-semibold">{r.total}</TableCell>
                      <TableCell className="text-xs text-center">{r.in_progress}</TableCell>
                      <TableCell className="text-xs text-center">{r.resolved}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-3">
            {records.length} data ditemukan • Terakhir {days} hari
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
