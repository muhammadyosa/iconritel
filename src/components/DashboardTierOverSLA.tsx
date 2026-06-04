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
  onOpenList?: (title: string, list: Ticket[]) => void;
  infoOpen?: boolean;
  onInfoOpenChange?: (open: boolean) => void;
}

export function DashboardTierOverSLA({ tickets, getTicketRegion, onOpenList, infoOpen, onInfoOpenChange }: DashboardTierOverSLAProps) {
  const [now, setNow] = useState(Date.now());
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showAll, setShowAll] = useState(false);

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

  const rankedAll = useMemo(() => {
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
      .sort((a, b) => b.durationMs - a.durationMs);
  }, [overSLATickets, now]);

  const top5 = rankedAll.slice(0, 5);
  const restList = rankedAll.slice(5, 20);
  const visibleList = showAll ? rankedAll.slice(0, 20) : top5;
  const maxDuration = top5[0]?.durationMs || 1;

  const analysis = useMemo(() => {
    if (rankedAll.length === 0) return null;

    const top15 = rankedAll.slice(0, 20);
    const avgMs = top15.reduce((s, t) => s + t.durationMs, 0) / top15.length;
    const fmt = (ms: number) => {
      const m = Math.floor(ms / 60000);
      const d = Math.floor(m / 1440);
      const h = Math.floor((m % 1440) / 60);
      const mm = m % 60;
      const p: string[] = [];
      if (d > 0) p.push(`${d}H`);
      if (h > 0) p.push(`${h}J`);
      p.push(`${mm}M`);
      return p.join(" ");
    };
    const avgLabel = fmt(avgMs);
    const maxLabel = fmt(top15[0].durationMs);

    const regionMap: Record<string, number> = {};
    top15.forEach((t) => {
      const r = getTicketRegion(t.serpo);
      if (r && r !== "-") regionMap[r] = (regionMap[r] || 0) + 1;
    });
    const topRegion = Object.entries(regionMap).sort((a, b) => b[1] - a[1])[0];

    const criticalCount = top15.filter((t) => t.status === "Critical").length;
    const pendingCount = top15.filter((t) => t.status === "Pending").length;
    const onProgressCount = top15.filter((t) => t.status === "On Progress").length;

    let recommendation = "";
    let recColor = "text-muted-foreground";
    if (criticalCount > top15.length * 0.5) {
      recommendation = "⚠️ Mayoritas Critical — prioritaskan eskalasi.";
      recColor = "text-destructive";
    } else if (pendingCount > top15.length * 0.4) {
      recommendation = "⏳ Banyak Pending — percepat resolusi agar tidak menumpuk.";
      recColor = "text-warning";
    } else if (avgMs > 48 * 60 * 60 * 1000) {
      recommendation = "📈 Rata-rata >48 jam — evaluasi SOP & alokasi resource.";
      recColor = "text-destructive";
    } else if (avgMs > 24 * 60 * 60 * 1000) {
      recommendation = "📊 Rata-rata >24 jam — tingkatkan koordinasi tim.";
      recColor = "text-warning";
    } else {
      recommendation = "✅ Durasi masih terkendali — pertahankan performa.";
      recColor = "text-success";
    }

    return { avgLabel, maxLabel, topRegion, criticalCount, pendingCount, onProgressCount, recommendation, recColor, regionMap, top15 };
  }, [rankedAll, getTicketRegion]);

  if (rankedAll.length === 0) return null;

  const totalOver = overSLATickets.length;
  const distTotal = (analysis?.criticalCount ?? 0) + (analysis?.pendingCount ?? 0) + (analysis?.onProgressCount ?? 0) || 1;
  const critPct = ((analysis?.criticalCount ?? 0) / distTotal) * 100;
  const pendPct = ((analysis?.pendingCount ?? 0) / distTotal) * 100;
  const onProgPct = ((analysis?.onProgressCount ?? 0) / distTotal) * 100;

  return (
    <>
      <Card className="overflow-hidden border border-border/60">
        {/* Compact header */}
        <CardHeader className="py-2 px-2.5 sm:px-3 border-b bg-muted/20">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-[11px] sm:text-xs flex items-center gap-1.5">🏆 Tier Incident OVER SLA</CardTitle>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">Realtime • {totalOver} incident melewati SLA</p>
            </div>
            {analysis && (() => {
              const insight = buildInsight({
                total: analysis.top15.length,
                resolved: 0,
                pending: analysis.pendingCount,
                critical: analysis.criticalCount,
                rate: 0,
                contextLabel: "incident over SLA",
                emptyText: "✅ Tidak ada incident yang melewati SLA.",
              });
              const filterStatus = (status: Ticket["status"]) => overSLATickets.filter(t => t.status === status);
              const filterRegion = (region: string) => overSLATickets.filter(t => getTicketRegion(t.serpo) === region);
              const sections: InfoSection[] = [
                {
                  heading: "Statistik Realtime", emoji: "📈",
                  metrics: [
                    { label: "Total Over SLA", value: totalOver, tone: "destructive",
                      onClick: totalOver > 0 && onOpenList ? () => onOpenList("⏰ Semua Incident Over SLA", overSLATickets) : undefined },
                    { label: "Rata-rata", value: analysis.avgLabel, tone: "warning" },
                    { label: "Tertinggi", value: analysis.maxLabel, tone: "destructive" },
                    { label: "Critical", value: analysis.criticalCount, tone: "destructive",
                      onClick: analysis.criticalCount > 0 && onOpenList ? () => onOpenList("🚨 Critical — Over SLA", filterStatus("Critical")) : undefined },
                    { label: "Pending", value: analysis.pendingCount, tone: "warning",
                      onClick: analysis.pendingCount > 0 && onOpenList ? () => onOpenList("⏳ Pending — Over SLA", filterStatus("Pending")) : undefined },
                    { label: "On Progress", value: analysis.onProgressCount, tone: "primary",
                      onClick: analysis.onProgressCount > 0 && onOpenList ? () => onOpenList("🔧 On Progress — Over SLA", filterStatus("On Progress")) : undefined },
                  ],
                },
                {
                  heading: "Distribusi Region", emoji: "🗺️",
                  bullets: Object.keys(analysis.regionMap).length === 0
                    ? [{ label: "Belum ada region terdeteksi.", tone: "default" }]
                    : Object.entries(analysis.regionMap).sort((a, b) => b[1] - a[1]).map(([region, count]) => ({
                        label: region, value: `${count}`,
                        tone: count >= 5 ? "destructive" as const : count >= 3 ? "warning" as const : "default" as const,
                        onClick: onOpenList ? () => onOpenList(`🗺️ Over SLA — ${region}`, filterRegion(region)) : undefined,
                      })),
                },
                { heading: "Kriteria", emoji: "ℹ️", paragraph: "Incident dianggap melewati SLA jika berstatus Pending atau durasi >8 jam (Critical/On Progress)." },
                { heading: "Rekomendasi", emoji: "🎯", paragraph: analysis.recommendation },
              ];
              return (
                <SectionInfoDialog title="Tier Incident OVER SLA" emoji="🏆"
                  description="Analisa lengkap incident yang melewati SLA berdasarkan data realtime."
                  insight={insight} sections={sections} open={infoOpen} onOpenChange={onInfoOpenChange} />
              );
            })()}
          </div>
        </CardHeader>

        <CardContent className="p-2 sm:p-2.5 space-y-2">
          {/* KPI strip */}
          {analysis && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              {[
                { label: "Total", value: totalOver, tone: "text-destructive", bg: "bg-destructive/10" },
                { label: "Rata²", value: analysis.avgLabel, tone: "text-warning", bg: "bg-warning/10" },
                { label: "Max", value: analysis.maxLabel, tone: "text-destructive", bg: "bg-destructive/10" },
                { label: "Critical", value: analysis.criticalCount, tone: "text-destructive", bg: "bg-destructive/10" },
                { label: "Pending", value: analysis.pendingCount, tone: "text-warning", bg: "bg-warning/10" },
                { label: "OnProg", value: analysis.onProgressCount, tone: "text-primary", bg: "bg-primary/10" },
              ].map((k) => (
                <div key={k.label} className={cn("rounded-md border border-border/40 px-1.5 py-1", k.bg)}>
                  <div className="text-[7px] sm:text-[8px] text-muted-foreground uppercase tracking-wide truncate">{k.label}</div>
                  <div className={cn("text-[10px] sm:text-[11px] font-bold tabular-nums truncate", k.tone)}>{k.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Inline status distribution bar */}
          {analysis && (
            <div className="space-y-0.5">
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div className="bg-destructive" style={{ width: `${critPct}%` }} title={`Critical ${Math.round(critPct)}%`} />
                <div className="bg-warning" style={{ width: `${pendPct}%` }} title={`Pending ${Math.round(pendPct)}%`} />
                <div className="bg-primary" style={{ width: `${onProgPct}%` }} title={`On Progress ${Math.round(onProgPct)}%`} />
              </div>
              <div className="flex items-center justify-between text-[7px] sm:text-[8px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-destructive" />{Math.round(critPct)}%</span>
                  <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-warning" />{Math.round(pendPct)}%</span>
                  <span className="flex items-center gap-0.5"><span className="w-1 h-1 rounded-full bg-primary" />{Math.round(onProgPct)}%</span>
                </span>
                <span>Top {visibleList.length} / {totalOver}</span>
              </div>
            </div>
          )}

          {/* Ranking list */}
          <div className="space-y-0.5">
            {visibleList.map((t, idx) => {
              const region = getTicketRegion(t.serpo);
              const isTop3 = idx < 3;
              const rankIcon = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
              const pct = Math.max((t.durationMs / maxDuration) * 100, 4);
              const barColor =
                t.status === "Critical" ? "bg-destructive/70" :
                t.status === "Pending" ? "bg-warning/70" : "bg-primary/70";
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={cn(
                    "w-full text-left rounded-md border border-border/30 hover:border-primary/40 hover:bg-muted/40 transition-all px-1.5 py-1",
                    isTop3 && "bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px]">
                    <span className={cn("w-5 text-center font-bold shrink-0", isTop3 ? "text-base" : "text-muted-foreground")}>{rankIcon}</span>
                    <span className="font-mono font-semibold truncate min-w-0 flex-1">{t.id}</span>
                    <span className="hidden sm:inline-block scale-90 shrink-0"><RegionBadge region={region} /></span>
                    <span className="scale-90 shrink-0"><StatusBadge status={t.status} /></span>
                    <span className={cn("font-bold tabular-nums whitespace-nowrap shrink-0 w-[78px] text-right", isTop3 ? "text-destructive" : "text-foreground")}>
                      {t.durationLabel}
                    </span>
                  </div>
                  <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full bg-muted/30">
                    <div className={cn("h-full rounded-full", barColor)} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Toggle show more */}
          {restList.length > 0 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-[9px] text-primary hover:underline py-0.5"
            >
              {showAll ? "▲ Tampilkan Top 5 saja" : `▼ Tampilkan ${restList.length} lainnya`}
            </button>
          )}

          {/* Analisa Statistik */}
          {analysis && (
            <div className="rounded-lg border border-border/40 bg-muted/10 p-1.5 sm:p-2 space-y-1.5">
              <h4 className="text-[9px] sm:text-[10px] font-semibold text-foreground flex items-center gap-1">📊 Analisa Statistik</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                <div className="bg-background/60 rounded border border-border/30 px-1.5 py-1">
                  <span className="text-[7px] text-muted-foreground block">⏱️ Rata²</span>
                  <span className="text-[9px] font-bold text-warning tabular-nums truncate block">{analysis.avgLabel}</span>
                </div>
                <div className="bg-background/60 rounded border border-border/30 px-1.5 py-1">
                  <span className="text-[7px] text-muted-foreground block">🔥 Max</span>
                  <span className="text-[9px] font-bold text-destructive tabular-nums truncate block">{analysis.maxLabel}</span>
                </div>
                <div className="bg-background/60 rounded border border-border/30 px-1.5 py-1">
                  <span className="text-[7px] text-muted-foreground block">📍 Region</span>
                  <span className="text-[9px] font-bold text-foreground truncate block">
                    {analysis.topRegion ? `${analysis.topRegion[0]} (${analysis.topRegion[1]})` : "-"}
                  </span>
                </div>
                <div className="bg-background/60 rounded border border-border/30 px-1.5 py-1">
                  <span className="text-[7px] text-muted-foreground block">📋 Status</span>
                  <div className="flex items-center gap-1 text-[8px] font-semibold tabular-nums">
                    <span className="text-destructive">{analysis.criticalCount}C</span>
                    <span className="text-warning">{analysis.pendingCount}P</span>
                    <span className="text-primary">{analysis.onProgressCount}O</span>
                  </div>
                </div>
              </div>
              {Object.keys(analysis.regionMap).length > 1 && (
                <div className="flex flex-wrap gap-0.5">
                  {Object.entries(analysis.regionMap).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                    <span key={region} className="inline-flex items-center gap-0.5 text-[7px] bg-background/60 border border-border/30 rounded px-1 py-0.5">
                      <RegionBadge region={region} />
                      <span className="font-bold ml-0.5">{count}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className={cn("text-[8px] sm:text-[9px] leading-snug px-1.5 py-1 rounded bg-background/40 border border-border/20", analysis.recColor)}>
                {analysis.recommendation}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Detail Incident</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Informasi lengkap incident</DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Incident ID</span><p className="font-mono font-semibold">{selectedTicket.id}</p></div>
                  <div><span className="text-muted-foreground">Status</span><div className="mt-0.5"><StatusBadge status={selectedTicket.status} /></div></div>
                  <div><span className="text-muted-foreground">Region</span><div className="mt-0.5"><RegionBadge region={getTicketRegion(selectedTicket.serpo)} /></div></div>
                  <div><span className="text-muted-foreground">Durasi</span><div className="mt-0.5"><DurationCell createdISO={selectedTicket.createdISO} status={selectedTicket.status} resolvedAt={selectedTicket.resolvedAt} /></div></div>
                  <div><span className="text-muted-foreground">Serpo</span><p className="font-medium">{selectedTicket.serpo}</p></div>
                  <div><span className="text-muted-foreground">Constraint</span><p className="font-medium">{selectedTicket.constraint}</p></div>
                  <div><span className="text-muted-foreground">Hostname</span><p className="font-mono text-[10px]">{selectedTicket.hostname}</p></div>
                  <div><span className="text-muted-foreground">Customer</span><p className="font-medium">{selectedTicket.customerName}</p></div>
                  <div><span className="text-muted-foreground">FAT ID</span><p className="font-mono text-[10px]">{selectedTicket.fatId}</p></div>
                  <div><span className="text-muted-foreground">SN ONT</span><p className="font-mono text-[10px]">{selectedTicket.snOnt}</p></div>
                </div>
                <div><span className="text-muted-foreground">Dibuat</span><p className="font-medium">{new Date(selectedTicket.createdISO).toLocaleString("id-ID")}</p></div>
                {selectedTicket.ticketResult && (<div><span className="text-muted-foreground">Hasil</span><p className="font-medium">{selectedTicket.ticketResult}</p></div>)}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
