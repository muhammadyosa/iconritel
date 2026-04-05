import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "@/types/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { RegionBadge } from "@/components/RegionBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DurationCell } from "@/components/DurationCell";
import { cn } from "@/lib/utils";

const SLA_MS = 8 * 60 * 60 * 1000;

interface DashboardTierOverSLAProps {
  tickets: Ticket[];
  getTicketRegion: (hostname: string) => string;
}

export function DashboardTierOverSLA({ tickets, getTicketRegion }: DashboardTierOverSLAProps) {
  const [now, setNow] = useState(Date.now());
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const overSLATickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.status === "Pending") return true;
      if (t.status === "Resolved") return false;
      const elapsed = now - new Date(t.createdISO).getTime();
      return elapsed >= SLA_MS;
    });
  }, [tickets, now]);

  const top15 = useMemo(() => {
    return [...overSLATickets]
      .map((t) => {
        const endTime = (t.status === "Pending" || t.status === "Resolved") && t.resolvedAt
          ? new Date(t.resolvedAt).getTime() : now;
        const durationMs = endTime - new Date(t.createdISO).getTime();
        const totalMinutes = Math.floor(durationMs / 60000);
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const mins = totalMinutes % 60;
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}H`);
        if (hours > 0) parts.push(`${hours}J`);
        parts.push(`${mins}M`);
        return { ...t, durationMs, durationLabel: parts.join(" ") };
      })
      .sort((a, b) => b.durationMs - a.durationMs)
      .slice(0, 15);
  }, [overSLATickets, now]);

  const maxDuration = top15[0]?.durationMs || 1;

  if (top15.length === 0) return null;

  return (
    <>
      <Card className="overflow-hidden border">
        <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-muted/20">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">🏆 Tier Incident OVER SLA</CardTitle>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Top 15 incident dengan durasi tertinggi</p>
        </CardHeader>
        <CardContent className="p-1.5 sm:p-2">
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] sm:text-[10px]">
              <thead>
                <tr className="border-b border-border/40 text-[8px] sm:text-[9px] text-muted-foreground">
                  <th className="text-center w-6 py-1 font-semibold">#</th>
                  <th className="text-left py-1 font-semibold">ID</th>
                  <th className="text-left py-1 font-semibold hidden sm:table-cell">Serpo</th>
                  <th className="text-center py-1 font-semibold">Region</th>
                  <th className="text-center py-1 font-semibold">Status</th>
                  <th className="text-right py-1 pr-1.5 font-semibold whitespace-nowrap">Durasi</th>
                </tr>
              </thead>
              <tbody>
                {top15.map((t, idx) => {
                  const region = getTicketRegion(t.serpo);
                  const isTop3 = idx < 3;
                  const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : String(idx + 1);
                  const pct = Math.max((t.durationMs / maxDuration) * 100, 4);
                  const barColor = t.status === "Critical"
                    ? "bg-destructive/60"
                    : t.status === "Pending"
                    ? "bg-warning/60"
                    : "bg-primary/60";
                  return (
                    <tr
                      key={t.id}
                      className={cn(
                        "border-b border-border/10 hover:bg-muted/30 transition-colors cursor-pointer",
                        isTop3 && "bg-muted/10"
                      )}
                      onClick={() => setSelectedTicket(t)}
                    >
                      <td className="text-center py-1.5 font-bold text-muted-foreground">{rankIcon}</td>
                      <td className="py-1.5 font-mono font-semibold">{t.id}</td>
                      <td className="py-1.5 text-muted-foreground truncate max-w-[100px] hidden sm:table-cell">{t.serpo}</td>
                      <td className="py-1.5 text-center"><RegionBadge region={region} /></td>
                      <td className="py-1.5 text-center"><StatusBadge status={t.status} /></td>
                      <td className="py-1.5 pr-1.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="hidden sm:block w-16 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
                          </div>
                          <span className={cn(
                            "font-bold tabular-nums whitespace-nowrap",
                            isTop3 ? "text-destructive" : "text-foreground"
                          )}>
                            {t.durationLabel}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-1.5 pt-1.5 mt-0.5 text-[8px] sm:text-[9px] text-muted-foreground">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />Critical</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" />Pending</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />On Progress</span>
              </div>
              <span>Top {top15.length} / {overSLATickets.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Detail Incident</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informasi lengkap incident
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Incident ID</span>
                    <p className="font-mono font-semibold">{selectedTicket.id}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status</span>
                    <div className="mt-0.5"><StatusBadge status={selectedTicket.status} /></div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Region</span>
                    <div className="mt-0.5"><RegionBadge region={getTicketRegion(selectedTicket.serpo)} /></div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Durasi</span>
                    <div className="mt-0.5">
                      <DurationCell createdISO={selectedTicket.createdISO} status={selectedTicket.status} resolvedAt={selectedTicket.resolvedAt} />
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Serpo</span>
                    <p className="font-medium">{selectedTicket.serpo}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Constraint</span>
                    <p className="font-medium">{selectedTicket.constraint}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hostname</span>
                    <p className="font-mono text-[10px]">{selectedTicket.hostname}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer</span>
                    <p className="font-medium">{selectedTicket.customerName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">FAT ID</span>
                    <p className="font-mono text-[10px]">{selectedTicket.fatId}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SN ONT</span>
                    <p className="font-mono text-[10px]">{selectedTicket.snOnt}</p>
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Dibuat</span>
                  <p className="font-medium">{new Date(selectedTicket.createdISO).toLocaleString("id-ID")}</p>
                </div>
                {selectedTicket.ticketResult && (
                  <div>
                    <span className="text-muted-foreground">Hasil</span>
                    <p className="font-medium">{selectedTicket.ticketResult}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
