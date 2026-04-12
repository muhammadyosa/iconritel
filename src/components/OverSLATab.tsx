import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ticket } from "@/types/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { DurationCell } from "@/components/DurationCell";
import { RegionBadge } from "@/components/RegionBadge";
import { AlertTriangle, Clock, Search, Timer, TrendingUp, ChevronRight } from "lucide-react";
import {
  PieChart, Pie, Cell as RechartsCell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SLA_MS = 8 * 60 * 60 * 1000;

const REGION_COLORS = [
  "hsl(217, 91%, 45%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 55%)",
  "hsl(262, 80%, 55%)",
  "hsl(180, 70%, 40%)",
  "hsl(330, 75%, 50%)",
  "hsl(25, 95%, 53%)",
  "hsl(195, 85%, 45%)",
  "hsl(55, 80%, 45%)",
];

type CardType = "total" | "critical" | "onProgress" | "pending";

interface OverSLATabProps {
  tickets: Ticket[];
  getTicketRegion: (serpo: string) => string;
  onTicketClick?: (ticket: Ticket) => void;
}

export function OverSLATab({ tickets, getTicketRegion, onTicketClick }: OverSLATabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [activeCard, setActiveCard] = useState<CardType | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  // Real-time ticker for accurate calculations
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // update every 30s
    return () => clearInterval(timer);
  }, []);

  // Filter: over SLA (>= 8h) OR Pending — recalculated with live `now`
  const overSLATickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.status === "Pending") return true;
      if (t.status === "Resolved") return false;
      const elapsed = now - new Date(t.createdISO).getTime();
      return elapsed >= SLA_MS;
    });
  }, [tickets, now]);

  // Search filter
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return overSLATickets;
    const q = searchQuery.toLowerCase();

    return overSLATickets.filter((t) => {
      if (searchField === "all") {
        return (
          t.id.toLowerCase().includes(q) ||
          t.constraint.toLowerCase().includes(q) ||
          t.serpo.toLowerCase().includes(q) ||
          getTicketRegion(t.serpo).toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q)
        );
      }
      switch (searchField) {
        case "ticketId": return t.id.toLowerCase().includes(q);
        case "constraint": return t.constraint.toLowerCase().includes(q);
        case "serpo": return t.serpo.toLowerCase().includes(q);
        case "region": return getTicketRegion(t.serpo).toLowerCase().includes(q);
        case "status": return t.status.toLowerCase().includes(q);
        default: return true;
      }
    });
  }, [overSLATickets, searchQuery, searchField, getTicketRegion]);

  // Sort by duration descending
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const endA = a.status === "Pending" && a.resolvedAt ? new Date(a.resolvedAt).getTime() : now;
      const endB = b.status === "Pending" && b.resolvedAt ? new Date(b.resolvedAt).getTime() : now;
      const durA = endA - new Date(a.createdISO).getTime();
      const durB = endB - new Date(b.createdISO).getTime();
      return durB - durA;
    });
  }, [filteredTickets, now]);

  // Region chart data with extended analytics
  const regionData = useMemo(() => {
    const map: Record<string, { overSLA: number; pending: number; critical: number; totalDurationMs: number; count: number; maxDurationMs: number }> = {};
    overSLATickets.forEach((t) => {
      const region = getTicketRegion(t.serpo);
      if (!map[region]) map[region] = { overSLA: 0, pending: 0, critical: 0, totalDurationMs: 0, count: 0, maxDurationMs: 0 };
      if (t.status === "Pending") {
        map[region].pending++;
      } else {
        map[region].overSLA++;
      }
      if (t.status === "Critical") {
        map[region].critical++;
      }
      const endTime = (t.status === "Pending" || t.status === "Resolved") && t.resolvedAt
        ? new Date(t.resolvedAt).getTime() : now;
      const dur = endTime - new Date(t.createdISO).getTime();
      map[region].totalDurationMs += dur;
      map[region].count++;
      if (dur > map[region].maxDurationMs) map[region].maxDurationMs = dur;
    });
    return Object.entries(map)
      .map(([name, val]) => ({
        name,
        ...val,
        total: val.overSLA + val.pending,
        avgDurationMs: val.count > 0 ? val.totalDurationMs / val.count : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [overSLATickets, getTicketRegion, now]);

  const pieData = useMemo(() => {
    return regionData.map((r) => ({ name: r.name, value: r.total }));
  }, [regionData]);

  // Stats — derived from the already-filtered overSLATickets
  const stats = useMemo(() => {
    const critical = overSLATickets.filter((t) => t.status === "Critical").length;
    const onProgress = overSLATickets.filter((t) => t.status === "On Progress").length;
    const pending = overSLATickets.filter((t) => t.status === "Pending").length;
    return { total: overSLATickets.length, critical, onProgress, pending };
  }, [overSLATickets]);

  // Drill-down
  const cardDrillDown = useMemo(() => {
    if (!activeCard) return [];
    switch (activeCard) {
      case "total": return overSLATickets;
      case "critical": return overSLATickets.filter((t) => t.status === "Critical");
      case "onProgress": return overSLATickets.filter((t) => t.status === "On Progress");
      case "pending": return overSLATickets.filter((t) => t.status === "Pending");
    }
  }, [activeCard, overSLATickets]);

  const cardRegionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    cardDrillDown.forEach((t) => {
      const r = getTicketRegion(t.serpo);
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cardDrillDown, getTicketRegion]);

  const cardConstraintBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    cardDrillDown.forEach((t) => {
      map[t.constraint] = (map[t.constraint] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cardDrillDown]);

  // Card config using design system tokens (matching Dashboard)
  const cardConfig: Record<CardType, {
    label: string; emoji: string;
    iconClass: string; bgClass: string; borderClass: string; valueClass: string; glowClass: string;
    icon: React.ReactNode;
  }> = {
    total: {
      label: "Total Over SLA", emoji: "⚠️",
      iconClass: "bg-destructive/10 text-destructive",
      bgClass: "bg-destructive/5",
      borderClass: "border-destructive/20",
      valueClass: "text-destructive",
      glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.4)]",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
    critical: {
      label: "Critical", emoji: "🔴",
      iconClass: "bg-destructive/10 text-destructive",
      bgClass: "bg-destructive/5",
      borderClass: "border-destructive/20",
      valueClass: "text-destructive",
      glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.4)]",
      icon: <Timer className="h-4 w-4" />,
    },
    onProgress: {
      label: "On Progress", emoji: "🔵",
      iconClass: "bg-primary/10 text-primary",
      bgClass: "bg-primary/5",
      borderClass: "border-primary/20",
      valueClass: "text-primary",
      glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]",
      icon: <Clock className="h-4 w-4" />,
    },
    pending: {
      label: "Pending", emoji: "🟡",
      iconClass: "bg-warning/10 text-warning",
      bgClass: "bg-warning/5",
      borderClass: "border-warning/20",
      valueClass: "text-warning",
      glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--warning)/0.4)]",
      icon: <AlertTriangle className="h-4 w-4" />,
    },
  };

  const cardValues: Record<CardType, number> = {
    total: stats.total,
    critical: stats.critical,
    onProgress: stats.onProgress,
    pending: stats.pending,
  };

  return (
    <div className="space-y-3">
      {/* Stats Cards - Interactive, matching Dashboard style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["total", "critical", "onProgress", "pending"] as CardType[]).map((type) => {
          const cfg = cardConfig[type];
          return (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={cn(
                  "shadow-sm border cursor-pointer transition-all duration-300",
                  cfg.bgClass, cfg.borderClass, cfg.glowClass
                )}
                onClick={() => setActiveCard(type)}
              >
                <CardContent className="p-2.5 sm:p-3 flex items-center gap-2.5">
                  <div className={cn("p-2 rounded-lg", cfg.iconClass)}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium">{cfg.label}</p>
                    <p className={cn("text-lg sm:text-xl font-bold", cfg.valueClass)}>{cardValues[type]}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {/* Pie Chart */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-muted/20">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">🗺️ Proporsi Over SLA per Region</CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Analisa distribusi incident over SLA per wilayah</p>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {pieData.length > 0 ? (() => {
              const pieConfig: ChartConfig = {};
              pieData.forEach((d, i) => { pieConfig[d.name] = { label: d.name, color: REGION_COLORS[i % REGION_COLORS.length] }; });
              const totalAll = pieData.reduce((s, d) => s + d.value, 0);
              const worstRegion = regionData[0];
              return (
                <div className="space-y-3">
                  <ChartContainer config={pieConfig} className="h-[180px] sm:h-[200px] w-full mx-auto aspect-square max-w-[280px] sm:max-w-[300px]">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius="35%" outerRadius="65%" paddingAngle={2}
                        dataKey="value" nameKey="name"
                        label={({ name, percent, cx, cy, midAngle, outerRadius }: any) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 14;
                          const x = cx + radius * Math.cos(-midAngle * RADIAN);
                          const y = cy + radius * Math.sin(-midAngle * RADIAN);
                          if (percent < 0.05) return null;
                          return (
                            <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
                              className="text-[7px] xs:text-[8px] sm:text-[9px] font-semibold" style={{ textShadow: "0 0 4px hsl(var(--background))" }}>
                              {(percent * 100).toFixed(0)}%
                            </text>
                          );
                        }}
                        labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                        strokeWidth={2} stroke="hsl(var(--background))">
                        {pieData.map((_, index) => (
                          <RechartsCell key={`cell-${index}`} fill={REGION_COLORS[index % REGION_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  {/* Detail per Region */}
                  <div className="space-y-1">
                    {regionData.map((r, i) => {
                      const pct = totalAll > 0 ? Math.round((r.total / totalAll) * 100) : 0;
                      const barPct = totalAll > 0 ? (r.total / regionData[0].total) * 100 : 0;
                      const avgMins = Math.floor(r.avgDurationMs / 60000);
                      const avgH = Math.floor(avgMins / 60);
                      const avgM = avgMins % 60;
                      const avgLabel = avgH > 0 ? `${avgH}j ${avgM}m` : `${avgM}m`;
                      const maxMins = Math.floor(r.maxDurationMs / 60000);
                      const maxD = Math.floor(maxMins / 1440);
                      const maxH = Math.floor((maxMins % 1440) / 60);
                      const maxM = maxMins % 60;
                      const maxParts: string[] = [];
                      if (maxD > 0) maxParts.push(`${maxD}h`);
                      if (maxH > 0) maxParts.push(`${maxH}j`);
                      maxParts.push(`${maxM}m`);
                      const maxLabel = maxParts.join(" ");
                      return (
                        <div key={r.name} className="px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setSelectedRegion(r.name)}>
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }} />
                            <span className="text-[9px] sm:text-[10px] font-medium truncate flex-1">{r.name}</span>
                            <span className="text-[9px] sm:text-[10px] font-bold tabular-nums">{r.total}</span>
                            <span className="text-[8px] sm:text-[9px] text-muted-foreground tabular-nums w-7 text-right">{pct}%</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 rounded-full bg-muted/40 overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${barPct}%`, backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[7px] sm:text-[8px] text-muted-foreground shrink-0">
                              <span className="text-destructive font-semibold">{r.critical}🔴</span>
                              <span className="text-destructive font-semibold">{r.overSLA}⚡</span>
                              <span className="text-warning font-semibold">{r.pending}⏳</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[7px] sm:text-[8px] text-muted-foreground/70 pl-3.5">
                            <span>⏱ Avg: <span className="font-semibold text-foreground/70">{avgLabel}</span></span>
                            <span className="text-border">|</span>
                            <span>Max: <span className="font-semibold text-destructive/70">{maxLabel}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Analysis insights */}
                  {regionData.length > 1 && (() => {
                    const totalCritical = regionData.reduce((s, r) => s + r.critical, 0);
                    const totalPending = regionData.reduce((s, r) => s + r.pending, 0);
                    const avgAllMs = regionData.reduce((s, r) => s + r.avgDurationMs, 0) / regionData.length;
                    const avgAllMins = Math.floor(avgAllMs / 60000);
                    const avgAllH = Math.floor(avgAllMins / 60);
                    const avgAllM = avgAllMins % 60;
                    const longestRegion = [...regionData].sort((a, b) => b.avgDurationMs - a.avgDurationMs)[0];
                    const longestAvgMins = Math.floor(longestRegion.avgDurationMs / 60000);
                    const longestH = Math.floor(longestAvgMins / 60);
                    const longestM = longestAvgMins % 60;
                    return (
                      <div className="mx-2 p-2 rounded-md bg-muted/30 border border-border/30 space-y-1">
                        <p className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> Analisa Ringkas
                        </p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[7px] sm:text-[8px]">
                          <span className="text-muted-foreground">Rata-rata durasi:</span>
                          <span className="font-semibold">{avgAllH > 0 ? `${avgAllH}j ${avgAllM}m` : `${avgAllM}m`}</span>
                          <span className="text-muted-foreground">Region terlama:</span>
                          <span className="font-semibold text-destructive">{longestRegion.name} ({longestH}j {longestM}m)</span>
                          <span className="text-muted-foreground">Total Critical:</span>
                          <span className="font-semibold text-destructive">{totalCritical} incident</span>
                          <span className="text-muted-foreground">Total Pending:</span>
                          <span className="font-semibold text-warning">{totalPending} incident</span>
                        </div>
                        {worstRegion && totalAll > 0 && (
                          <p className="text-[7px] sm:text-[8px] text-muted-foreground/80 italic mt-1">
                            💡 {worstRegion.name} menyumbang {Math.round((worstRegion.total / totalAll) * 100)}% dari total over SLA — perlu perhatian khusus
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Summary footer */}
                  <div className="flex items-center justify-between px-2 pt-1.5 border-t border-border/40">
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                      Total: <span className="font-bold text-foreground">{totalAll}</span> incident · {regionData.length} region
                    </span>
                    {worstRegion && (
                      <span className="text-[8px] sm:text-[9px] text-destructive font-medium">
                        🔺 {worstRegion.name} ({Math.round((worstRegion.total / totalAll) * 100)}%)
                      </span>
                    )}
                  </div>
                </div>
              );
            })() : (
              <p className="text-center text-muted-foreground text-xs py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>

        {/* Tier Incident OVER SLA - Top 20 by Duration */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-muted/20">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-2">🏆 Tier Incident OVER SLA</CardTitle>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Top 20 incident dengan durasi tertinggi</p>
          </CardHeader>
          <CardContent className="p-1.5 sm:p-2">
            {overSLATickets.length > 0 ? (() => {
              const top15 = [...overSLATickets]
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
              const maxDuration = top15[0]?.durationMs || 1;

              return (
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
                              "border-b border-border/10 hover:bg-muted/30 transition-colors relative cursor-pointer",
                              isTop3 && "bg-muted/10"
                            )}
                            onClick={() => onTicketClick?.(t)}
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
                  {/* Footer */}
                  <div className="flex items-center justify-between px-1.5 pt-1.5 mt-0.5 text-[8px] sm:text-[9px] text-muted-foreground">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />Critical</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" />Pending</span>
                      <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />On Progress</span>
                    </div>
                    <span>Top {top15.length} / {overSLATickets.length}</span>
                  </div>
                </div>
              );
            })() : (
              <p className="text-center text-muted-foreground text-xs py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm border">
        <CardHeader className="py-1.5 sm:py-2 px-2 sm:px-3 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <CardTitle className="text-xs sm:text-sm">📢 List Over SLA & Pending ({sortedTickets.length})</CardTitle>
            <div className="flex gap-1">
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="h-6 sm:h-7 text-[9px] sm:text-[10px] w-[90px] sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="ticketId">Incident ID</SelectItem>
                  <SelectItem value="constraint">Constraint</SelectItem>
                  <SelectItem value="serpo">Serpo</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] pl-6 w-[130px] sm:w-[160px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 sm:p-2">
          <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
            <Table className="min-w-[700px]">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="h-5 sm:h-6">
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">No</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Incident ID</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Constraint</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Serpo/Tim</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Region</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Durasi</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Status</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">
                      ✅ Tidak ada incident Over SLA atau Pending
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTickets.map((ticket, idx) => (
                    <TableRow key={ticket.id} className="h-6 sm:h-7 hover:bg-muted/40 cursor-pointer" onClick={() => onTicketClick?.(ticket)}>
                      <TableCell className="px-1 py-0.5 text-[8px] sm:text-[9px] text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="px-1 py-0.5 font-mono text-[9px] sm:text-[10px] font-medium">{ticket.id}</TableCell>
                      <TableCell className="px-1 py-0.5 text-[9px] sm:text-[10px]">
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0">
                          {ticket.constraint}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-[9px] sm:text-[10px]">{ticket.serpo}</TableCell>
                      <TableCell className="px-1 py-0.5">
                        <RegionBadge region={getTicketRegion(ticket.serpo)} />
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <DurationCell
                          createdISO={ticket.createdISO}
                          status={ticket.status}
                          resolvedAt={ticket.resolvedAt}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-[8px] sm:text-[9px] text-muted-foreground whitespace-nowrap">
                        {ticket.createdAt}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={activeCard !== null} onOpenChange={(open) => !open && setActiveCard(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {activeCard && cardConfig[activeCard].emoji} {activeCard && cardConfig[activeCard].label}
              <Badge variant="secondary" className="text-xs">{cardDrillDown.length} Incident</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detail incident berdasarkan status yang dipilih
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Region Breakdown */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Distribusi per Region
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {cardRegionBreakdown.map((r) => (
                  <div key={r.name} className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1.5">
                    <RegionBadge region={r.name} />
                    <Badge variant="outline" className="text-[9px] font-bold">{r.count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Constraint Breakdown */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                📋 Top Constraint
              </h4>
              <div className="flex flex-wrap gap-1">
                {cardConstraintBreakdown.slice(0, 8).map((c) => (
                  <Badge key={c.name} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0.5 gap-1">
                    {c.name}
                    <span className="font-bold text-primary">{c.count}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Ticket list */}
            <ScrollArea className="max-h-[40vh]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="h-6">
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">ID</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Constraint</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Region</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Durasi</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardDrillDown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-xs">
                          Tidak ada data
                        </TableCell>
                      </TableRow>
                    ) : (
                      cardDrillDown.map((t) => (
                        <TableRow key={t.id} className="h-6 hover:bg-muted/40 cursor-pointer" onClick={() => { setActiveCard(null); onTicketClick?.(t); }}>
                          <TableCell className="px-1.5 py-0.5 font-mono text-[9px] font-medium">{t.id}</TableCell>
                          <TableCell className="px-1.5 py-0.5 text-[9px]">{t.constraint}</TableCell>
                          <TableCell className="px-1.5 py-0.5">
                            <RegionBadge region={getTicketRegion(t.serpo)} />
                          </TableCell>
                          <TableCell className="px-1.5 py-0.5">
                            <DurationCell createdISO={t.createdISO} status={t.status} resolvedAt={t.resolvedAt} />
                          </TableCell>
                          <TableCell className="px-1.5 py-0.5">
                            <StatusBadge status={t.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Region Drill-down Dialog */}
      <Dialog open={selectedRegion !== null} onOpenChange={(open) => !open && setSelectedRegion(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              🗺️ Incident Over SLA — {selectedRegion}
              <Badge variant="secondary" className="text-xs">
                {overSLATickets.filter((t) => getTicketRegion(t.serpo) === selectedRegion).length} Incident
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Daftar incident over SLA & pending di region {selectedRegion}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-6">
                    <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">No</TableHead>
                    <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">ID</TableHead>
                    <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Constraint</TableHead>
                    <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Serpo</TableHead>
                    <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Durasi</TableHead>
                    <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overSLATickets
                    .filter((t) => getTicketRegion(t.serpo) === selectedRegion)
                    .sort((a, b) => {
                      const durA = now - new Date(a.createdISO).getTime();
                      const durB = now - new Date(b.createdISO).getTime();
                      return durB - durA;
                    })
                    .map((t, idx) => (
                      <TableRow key={t.id} className="h-6 hover:bg-muted/40 cursor-pointer" onClick={() => { setSelectedRegion(null); onTicketClick?.(t); }}>
                        <TableCell className="px-1.5 py-0.5 text-[8px] sm:text-[9px] text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="px-1.5 py-0.5 font-mono text-[9px] font-medium">{t.id}</TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[9px]">
                          <Badge variant="outline" className="text-[8px] px-1 py-0">{t.constraint}</Badge>
                        </TableCell>
                        <TableCell className="px-1.5 py-0.5 text-[9px] text-muted-foreground">{t.serpo}</TableCell>
                        <TableCell className="px-1.5 py-0.5">
                          <DurationCell createdISO={t.createdISO} status={t.status} resolvedAt={t.resolvedAt} />
                        </TableCell>
                        <TableCell className="px-1.5 py-0.5">
                          <StatusBadge status={t.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
