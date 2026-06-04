import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Ticket } from "@/types/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { RegionBadge } from "@/components/RegionBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DurationCell } from "@/components/DurationCell";
import { SectionInfoDialog, buildInsight, type InfoSection, type InfoMetric } from "@/components/SectionInfoDialog";
import { cn } from "@/lib/utils";

const SLA_MS = 8 * 60 * 60 * 1000;

interface DashboardTierOverSLAProps {
  tickets: Ticket[];
  getTicketRegion: (hostname: string) => string;
  /** Optional callback to open the global filter dialog with a ticket subset */
  onOpenList?: (title: string, list: Ticket[]) => void;
  /** Controlled open state for the info ringkasan dialog (enables "Kembali ke ringkasan" flow) */
  infoOpen?: boolean;
  onInfoOpenChange?: (open: boolean) => void;
}

export function DashboardTierOverSLA({ tickets, getTicketRegion, onOpenList, infoOpen, onInfoOpenChange }: DashboardTierOverSLAProps) {
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
      .slice(0, 20);
  }, [overSLATickets, now]);

  const maxDuration = top15[0]?.durationMs || 1;

  // Analysis data
  const analysis = useMemo(() => {
    if (top15.length === 0) return null;

    // Average duration
    const avgMs = top15.reduce((s, t) => s + t.durationMs, 0) / top15.length;
    const avgMins = Math.floor(avgMs / 60000);
    const avgDays = Math.floor(avgMins / 1440);
    const avgHours = Math.floor((avgMins % 1440) / 60);
    const avgM = avgMins % 60;
    const avgParts: string[] = [];
    if (avgDays > 0) avgParts.push(`${avgDays} Hari`);
    if (avgHours > 0) avgParts.push(`${avgHours} Jam`);
    avgParts.push(`${avgM} Menit`);
    const avgLabel = avgParts.join(" ");

    // Max duration
    const maxMs = top15[0].durationMs;
    const maxMins = Math.floor(maxMs / 60000);
    const maxDays = Math.floor(maxMins / 1440);
    const maxHours = Math.floor((maxMins % 1440) / 60);
    const maxM = maxMins % 60;
    const maxParts: string[] = [];
    if (maxDays > 0) maxParts.push(`${maxDays} Hari`);
    if (maxHours > 0) maxParts.push(`${maxHours} Jam`);
    maxParts.push(`${maxM} Menit`);
    const maxLabel = maxParts.join(" ");

    // Region counts
    const regionMap: Record<string, number> = {};
    top15.forEach((t) => {
      const r = getTicketRegion(t.serpo);
      if (r && r !== "-") regionMap[r] = (regionMap[r] || 0) + 1;
    });
    const topRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1])[0];

    // Status breakdown
    const criticalCount = top15.filter((t) => t.status === "Critical").length;
    const pendingCount = top15.filter((t) => t.status === "Pending").length;
    const onProgressCount = top15.filter((t) => t.status === "On Progress").length;

    // Recommendation
    let recommendation = "";
    let recColor = "text-muted-foreground";
    if (criticalCount > top15.length * 0.5) {
      recommendation = "⚠️ Mayoritas incident berstatus Critical. Prioritaskan eskalasi dan penanganan segera untuk mengurangi dampak layanan.";
      recColor = "text-destructive";
    } else if (pendingCount > top15.length * 0.4) {
      recommendation = "⏳ Banyak incident berstatus Pending. Percepat proses resolusi agar tidak menumpuk lebih lama.";
      recColor = "text-warning";
    } else if (avgMs > 48 * 60 * 60 * 1000) {
      recommendation = "📈 Rata-rata durasi sangat tinggi (>48 jam). Evaluasi SOP penanganan dan alokasi resource untuk mempercepat resolusi.";
      recColor = "text-destructive";
    } else if (avgMs > 24 * 60 * 60 * 1000) {
      recommendation = "📊 Rata-rata durasi cukup tinggi (>24 jam). Tingkatkan koordinasi antar tim untuk mempercepat penyelesaian.";
      recColor = "text-warning";
    } else {
      recommendation = "✅ Durasi incident masih terkendali. Pertahankan performa dan pantau trend secara berkala.";
      recColor = "text-emerald-600 dark:text-emerald-400";
    }

    return { avgLabel, maxLabel, topRegion, criticalCount, pendingCount, onProgressCount, recommendation, recColor, regionMap };
  }, [top15, getTicketRegion]);

  if (top15.length === 0) return null;

  return (
    <>
      <Card className="overflow-hidden border">
        <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-xs sm:text-sm flex items-center gap-2">🏆 Tier Incident OVER SLA</CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Top 20 incident dengan durasi tertinggi</p>
            </div>
            {analysis && (() => {
              const totalOver = overSLATickets.length;

              const insight = buildInsight({
                total: top15.length,
                resolved: 0, // resolved incidents are excluded from over-SLA list
                pending: analysis.pendingCount,
                critical: analysis.criticalCount,
                rate: 0,
                contextLabel: "incident over SLA",
                emptyText: "✅ Tidak ada incident yang melewati SLA. Performa layanan sangat baik.",
              });

              const filterStatus = (status: Ticket["status"]) =>
                overSLATickets.filter(t => t.status === status);
              const filterRegion = (region: string) =>
                overSLATickets.filter(t => getTicketRegion(t.serpo) === region);

              const sections: InfoSection[] = [
                {
                  heading: "Statistik Realtime",
                  emoji: "📈",
                  metrics: [
                    { label: "Total Over SLA", value: totalOver, hint: `Top ${top15.length} ditampilkan`, tone: "destructive",
                      onClick: totalOver > 0 && onOpenList ? () => onOpenList("⏰ Semua Incident Over SLA", overSLATickets) : undefined },
                    { label: "Rata-rata Durasi", value: analysis.avgLabel, tone: "warning" },
                    { label: "Durasi Tertinggi", value: analysis.maxLabel, tone: "destructive",
                      onClick: top15[0] && onOpenList ? () => onOpenList(`🔥 Incident terlama: ${top15[0].id}`, [top15[0]]) : undefined },
                    { label: "Critical", value: analysis.criticalCount, tone: "destructive",
                      onClick: analysis.criticalCount > 0 && onOpenList ? () => onOpenList("🚨 Critical — Over SLA", filterStatus("Critical")) : undefined },
                    { label: "Pending", value: analysis.pendingCount, tone: "warning",
                      onClick: analysis.pendingCount > 0 && onOpenList ? () => onOpenList("⏳ Pending — Over SLA", filterStatus("Pending")) : undefined },
                    { label: "On Progress", value: analysis.onProgressCount, tone: "primary",
                      onClick: analysis.onProgressCount > 0 && onOpenList ? () => onOpenList("🔧 On Progress — Over SLA", filterStatus("On Progress")) : undefined },
                  ],
                },
                {
                  heading: "Distribusi Region",
                  emoji: "🗺️",
                  bullets: Object.keys(analysis.regionMap).length === 0
                    ? [{ label: "Belum ada region terdeteksi.", tone: "default" }]
                    : Object.entries(analysis.regionMap)
                      .sort((a, b) => b[1] - a[1])
                      .map(([region, count]) => ({
                        label: region,
                        value: `${count} incident`,
                        tone: count >= 5 ? "destructive" as const : count >= 3 ? "warning" as const : "default" as const,
                        onClick: onOpenList ? () => onOpenList(`🗺️ Over SLA — ${region}`, filterRegion(region)) : undefined,
                      })),
                },
                {
                  heading: "Kriteria Over SLA",
                  emoji: "ℹ️",
                  paragraph: "Incident dianggap melewati SLA jika berstatus Pending, atau jika durasi sejak dibuat sudah melampaui 8 jam (untuk status Critical/On Progress). Daftar diurutkan dari durasi terlama ke tersingkat untuk memudahkan prioritas penanganan.",
                },
                {
                  heading: "Rekomendasi",
                  emoji: "🎯",
                  paragraph: analysis.recommendation,
                },
              ];

              return (
                <SectionInfoDialog
                  title="Tier Incident OVER SLA"
                  emoji="🏆"
                  description="Analisa lengkap incident yang melewati SLA berdasarkan data realtime."
                  insight={insight}
                  sections={sections}
                  open={infoOpen}
                  onOpenChange={onInfoOpenChange}
                />
              );
            })()}
          </div>
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
              <span>Top {top15.length} / {overSLATickets.length} Over SLA</span>
            </div>

            {/* Analisa Statistik Panel */}
            {analysis && (
              <div className="mt-2 border border-border/40 rounded-lg bg-muted/10 p-2 sm:p-2.5 space-y-2">
                <h4 className="text-[9px] sm:text-[10px] font-semibold text-foreground flex items-center gap-1.5">
                  📊 Analisa Statistik
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  <div className="bg-background/60 rounded-md p-1.5 sm:p-2 border border-border/30">
                    <span className="text-[7px] sm:text-[8px] text-muted-foreground block">⏱️ Rata-rata Durasi</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-foreground">{analysis.avgLabel}</span>
                  </div>
                  <div className="bg-background/60 rounded-md p-1.5 sm:p-2 border border-border/30">
                    <span className="text-[7px] sm:text-[8px] text-muted-foreground block">🔥 Durasi Tertinggi</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-destructive">{analysis.maxLabel}</span>
                  </div>
                  <div className="bg-background/60 rounded-md p-1.5 sm:p-2 border border-border/30">
                    <span className="text-[7px] sm:text-[8px] text-muted-foreground block">📍 Region Terbanyak</span>
                    <span className="text-[9px] sm:text-[10px] font-bold text-foreground">
                      {analysis.topRegion ? `${analysis.topRegion[0]} (${analysis.topRegion[1]})` : "-"}
                    </span>
                  </div>
                  <div className="bg-background/60 rounded-md p-1.5 sm:p-2 border border-border/30">
                    <span className="text-[7px] sm:text-[8px] text-muted-foreground block">📋 Breakdown Status</span>
                    <div className="flex items-center gap-1.5 text-[8px] sm:text-[9px] font-semibold">
                      <span className="text-destructive">{analysis.criticalCount}C</span>
                      <span className="text-warning">{analysis.pendingCount}P</span>
                      <span className="text-primary">{analysis.onProgressCount}O</span>
                    </div>
                  </div>
                </div>
                {/* Region distribution */}
                {analysis.regionMap && Object.keys(analysis.regionMap).length > 1 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(analysis.regionMap).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                      <span key={region} className="inline-flex items-center gap-0.5 text-[7px] sm:text-[8px] bg-background/60 border border-border/30 rounded px-1 py-0.5">
                        <RegionBadge region={region} />
                        <span className="font-bold ml-0.5">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
                {/* Recommendation */}
                <div className={cn("text-[8px] sm:text-[9px] leading-relaxed p-1.5 rounded-md bg-background/40 border border-border/20", analysis.recColor)}>
                  {analysis.recommendation}
                </div>
              </div>
            )}
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
