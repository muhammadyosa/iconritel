import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Ticket } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Area, AreaChart, ResponsiveContainer,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  Activity, Calendar as CalendarIcon, CheckCircle2, Clock, AlertTriangle,
  TrendingUp, Layers, Trophy, Sparkles,
} from "lucide-react";
import type { DateRange } from "react-day-picker";

type Variant = "noc" | "ritel";
type TrendPeriod = "today" | "7d" | "14d" | "30d" | "custom" | "all";

interface Props {
  tickets: Ticket[];
  variant: Variant;
}

interface UserHistoryRow {
  user_name: string;
  total_created: number;
  total_resolved: number;
}

const TREND_COLORS = [
  "hsl(142, 71%, 45%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 80%, 55%)", "hsl(180, 70%, 40%)",
  "hsl(330, 75%, 50%)", "hsl(25, 95%, 53%)",
];

const VARIANT_CONFIG = {
  noc: {
    badge: "NOC",
    icon: "🛰️",
    badgeClass: "bg-primary text-primary-foreground",
    borderClass: "border-primary/20",
    bgClass: "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
    accentClass: "text-primary",
    top5Label: "Top 5 User NOC",
    top5CountLabel: "user aktif",
    remainingLabel: "user lainnya",
  },
  ritel: {
    badge: "RITEL",
    icon: "🏬",
    badgeClass: "bg-success text-success-foreground",
    borderClass: "border-success/20",
    bgClass: "bg-gradient-to-r from-success/10 via-success/5 to-transparent",
    accentClass: "text-success",
    top5Label: "Top 5 Tim Ritel",
    top5CountLabel: "tim aktif",
    remainingLabel: "tim lainnya",
  },
};

const PERIOD_LABELS = {
  today: "Today",
  "7d": "7H",
  "14d": "14H",
  "30d": "30H",
  custom: "Custom",
  all: "Semua",
} as const;

export function NOCStatistikIncident({ tickets, variant }: Props) {
  const [userHistory, setUserHistory] = useState<UserHistoryRow[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const config = VARIANT_CONFIG[variant];

  useEffect(() => {
    if (variant !== "noc") return;
    (async () => {
      try {
        const { data } = await supabase
          .from("daily_user_ticket_history")
          .select("user_name, total_created, total_resolved");
        setUserHistory((data || []) as UserHistoryRow[]);
      } catch {}
    })();
  }, [variant]);

  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const activeRange = useMemo(() => {
    const now = new Date();
    if (trendPeriod === "all") return null;
    if (trendPeriod === "today") return { from: startOfDay(now), to: endOfDay(now) };
    if (trendPeriod === "7d") return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    if (trendPeriod === "14d") return { from: startOfDay(subDays(now, 13)), to: endOfDay(now) };
    if (trendPeriod === "30d") return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    if (trendPeriod === "custom" && customRange?.from) {
      return { from: startOfDay(customRange.from), to: endOfDay(customRange.to ?? customRange.from) };
    }
    return null;
  }, [trendPeriod, customRange]);

  const filteredTickets = useMemo(() => {
    if (!activeRange) return tickets;
    return tickets.filter(t => {
      const d = new Date(t.createdISO);
      return isWithinInterval(d, { start: activeRange.from, end: activeRange.to });
    });
  }, [tickets, activeRange]);

  const resolved = useMemo(() => filteredTickets.filter(t => t.status === "Resolved").length, [filteredTickets]);
  const pending = useMemo(() => filteredTickets.filter(t => t.status === "On Progress" || t.status === "Pending").length, [filteredTickets]);
  const critical = useMemo(() => filteredTickets.filter(t => t.status === "Critical").length, [filteredTickets]);
  const total = filteredTickets.length;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Trend data
  const trendData = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    filteredTickets.forEach(t => {
      const d = toLocalDateStr(new Date(t.createdISO));
      if (!dateMap[d]) dateMap[d] = {};
      const key = t.constraint || "Lainnya";
      dateMap[d][key] = (dateMap[d][key] || 0) + 1;
    });
    const allConstraints = new Set<string>();
    Object.values(dateMap).forEach(v => Object.keys(v).forEach(k => allConstraints.add(k)));
    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => {
        const entry: Record<string, any> = {
          date: format(new Date(date + "T00:00:00"), "dd MMM", { locale: localeId }),
          _total: 0,
        };
        allConstraints.forEach(c => {
          entry[c] = counts[c] || 0;
          entry._total += counts[c] || 0;
        });
        return entry;
      });
  }, [filteredTickets]);

  const constraintKeys = useMemo(() => {
    if (trendData.length === 0) return [];
    const keys = Object.keys(trendData[0]).filter(k => k !== "date" && k !== "_total");
    const totals: Record<string, number> = {};
    trendData.forEach(row => keys.forEach(k => { totals[k] = (totals[k] || 0) + (row[k] || 0); }));
    return keys.sort((a, b) => (totals[b] || 0) - (totals[a] || 0)).slice(0, 6);
  }, [trendData]);

  const chartConfig: ChartConfig = useMemo(() => {
    const c: ChartConfig = {};
    constraintKeys.forEach((key, i) => { c[key] = { label: key, color: TREND_COLORS[i % TREND_COLORS.length] }; });
    return c;
  }, [constraintKeys]);

  // Sparkline (last 14 days from filtered)
  const sparkData = useMemo(() => trendData.slice(-14).map(r => ({ v: r._total })), [trendData]);

  // Top 5 ranking
  const top5Data = useMemo(() => {
    if (variant === "noc") {
      if (activeRange) {
        const map: Record<string, { created: number; resolved: number }> = {};
        filteredTickets.forEach(t => {
          const name = (t.createdByName || "").trim() || "Unknown";
          if (!map[name]) map[name] = { created: 0, resolved: 0 };
          map[name].created++;
          if (t.status === "Resolved") map[name].resolved++;
        });
        return Object.entries(map)
          .map(([name, s]) => ({ name, count: s.created, rate: s.created > 0 ? Math.round((s.resolved / s.created) * 100) : 0 }))
          .sort((a, b) => b.count - a.count);
      }
      const map: Record<string, { created: number; resolved: number }> = {};
      userHistory.forEach(row => {
        if (!map[row.user_name]) map[row.user_name] = { created: 0, resolved: 0 };
        map[row.user_name].created += row.total_created;
        map[row.user_name].resolved += row.total_resolved;
      });
      return Object.entries(map)
        .map(([name, s]) => ({ name, count: s.created, rate: s.created > 0 ? Math.round((s.resolved / s.created) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);
    } else {
      const map: Record<string, { total: number; resolved: number }> = {};
      filteredTickets.forEach(t => {
        const serpo = (t.serpo || "").trim();
        if (!serpo) return;
        if (!map[serpo]) map[serpo] = { total: 0, resolved: 0 };
        map[serpo].total++;
        if (t.status === "Resolved") map[serpo].resolved++;
      });
      return Object.entries(map)
        .map(([name, s]) => ({ name, count: s.total, rate: s.total > 0 ? Math.round((s.resolved / s.total) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);
    }
  }, [variant, filteredTickets, userHistory, activeRange]);

  const activeCount = top5Data.length;
  const top5 = top5Data.slice(0, 5);
  const remainingCount = Math.max(0, top5Data.length - 5);
  const maxCount = top5.length > 0 ? top5[0].count : 1;

  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const criticalPct = total > 0 ? (critical / total) * 100 : 0;

  // KPI tiles
  const kpis = [
    { label: "Total", value: total, icon: Layers, color: "text-foreground", bg: "bg-muted/40", ring: "ring-border" },
    { label: "Resolved", value: resolved, icon: CheckCircle2, color: "text-success", bg: "bg-success/10", ring: "ring-success/30" },
    { label: "Pending", value: pending, icon: Clock, color: "text-warning", bg: "bg-warning/10", ring: "ring-warning/30" },
    { label: "Critical", value: critical, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", ring: "ring-destructive/30" },
    { label: "Res. Rate", value: `${resRate}%`, icon: TrendingUp, color: resRate >= 60 ? "text-success" : resRate >= 30 ? "text-warning" : "text-destructive", bg: "bg-primary/10", ring: "ring-primary/30" },
  ];

  // Analisa
  const topConstraint = constraintKeys[0];
  const topConstraintCount = trendData.reduce((s, row) => s + (row[topConstraint] || 0), 0);
  const avgPerDay = trendData.length > 0 ? Math.round(total / trendData.length) : 0;
  const peakDay = trendData.length > 0
    ? trendData.reduce((best, row) => row._total > best.val ? { date: row.date, val: row._total } : best, { date: "-", val: 0 })
    : { date: "-", val: 0 };

  return (
    <Card className={cn("overflow-hidden border", config.borderClass)}>
      {/* Header */}
      <CardHeader className={cn("py-2 px-3 border-b", config.bgClass)}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <span className="text-base leading-none">{config.icon}</span>
            <Badge className={cn("text-[9px] px-2 py-0.5 rounded-full font-bold", config.badgeClass)}>
              {config.badge}
            </Badge>
            <span className="font-bold">Statistik Incident</span>
          </CardTitle>
          {/* Period selector */}
          <div className="flex items-center gap-0.5 flex-wrap">
            {(["today", "7d", "14d", "30d", "custom", "all"] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={trendPeriod === p ? "default" : "ghost"}
                className={cn(
                  "h-5 sm:h-6 text-[8px] sm:text-[9px] px-1.5 rounded-md",
                  trendPeriod === p && "font-bold"
                )}
                onClick={() => setTrendPeriod(p)}
              >
                {PERIOD_LABELS[p]}
              </Button>
            ))}
            {trendPeriod === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-5 sm:h-6 text-[8px] sm:text-[9px] px-1.5 rounded-md gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    {customRange?.from
                      ? customRange.to
                        ? `${format(customRange.from, "dd MMM", { locale: localeId })}-${format(customRange.to, "dd MMM", { locale: localeId })}`
                        : format(customRange.from, "dd MMM", { locale: localeId })
                      : "Pilih"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customRange?.from}
                    selected={customRange}
                    onSelect={setCustomRange}
                    numberOfMonths={1}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-2.5 sm:p-3 space-y-3">
        {/* KPI Tiles + Mini Sparkline */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
                className={cn(
                  "relative rounded-lg p-2 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-sm",
                  k.bg, k.ring,
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-wide text-muted-foreground font-semibold truncate">
                    {k.label}
                  </span>
                  <Icon className={cn("h-3 w-3 shrink-0", k.color)} />
                </div>
                <div className={cn("text-base sm:text-lg font-bold tabular-nums leading-tight mt-0.5", k.color)}>
                  {k.value}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Sparkline strip */}
        {sparkData.length > 1 && (
          <div className="rounded-lg border border-border/40 bg-muted/20 px-2.5 py-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1 shrink-0">
              <Sparkles className={cn("h-3 w-3", config.accentClass)} />
              <span className="text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                Volume {sparkData.length}H
              </span>
            </div>
            <div className="flex-1 h-7">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id={`spark-${variant}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={1.5} fill={`url(#spark-${variant})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <span className="text-[9px] sm:text-[10px] font-bold tabular-nums shrink-0">
              {sparkData.reduce((s, d) => s + d.v, 0)}
            </span>
          </div>
        )}

        {/* Resolution rate stacked bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Status Distribution</span>
            <div className="flex items-center gap-2 text-[8px] sm:text-[9px]">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" />{Math.round(resolvedPct)}%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning" />{Math.round(pendingPct)}%</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-destructive" />{Math.round(criticalPct)}%</span>
            </div>
          </div>
          <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-muted/30">
            {resolvedPct > 0 && (
              <motion.div className="h-full bg-success" initial={{ width: 0 }} animate={{ width: `${resolvedPct}%` }} transition={{ duration: 0.7 }} />
            )}
            {pendingPct > 0 && (
              <motion.div className="h-full bg-warning" initial={{ width: 0 }} animate={{ width: `${pendingPct}%` }} transition={{ duration: 0.7, delay: 0.1 }} />
            )}
            {criticalPct > 0 && (
              <motion.div className="h-full bg-destructive" initial={{ width: 0 }} animate={{ width: `${criticalPct}%` }} transition={{ duration: 0.7, delay: 0.2 }} />
            )}
          </div>
        </div>

        {/* Two-column: Category Trend + Top 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          {/* Category Trend */}
          <div className="lg:col-span-3 rounded-lg border border-border/40 bg-card p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-primary" /> Category Trend
              </span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground">{constraintKeys.length} kategori</span>
            </div>
            {trendData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[140px] sm:h-[170px] w-full">
                <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={28} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  {constraintKeys.map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={1.5} dot={false} activeDot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ChartContainer>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-[10px] text-muted-foreground">Belum ada data trend</div>
            )}
            {/* Legend chips */}
            {constraintKeys.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {constraintKeys.map((key, i) => {
                  const sum = trendData.reduce((s, r) => s + (r[key] || 0), 0);
                  return (
                    <div key={key} className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/40 text-[8px] sm:text-[9px]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }} />
                      <span className="font-medium truncate max-w-[80px]">{key}</span>
                      <span className="text-muted-foreground tabular-nums">{sum}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top 5 */}
          <div className="lg:col-span-2 rounded-lg border border-border/40 bg-card p-2.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] sm:text-xs font-semibold flex items-center gap-1">
                <Trophy className={cn("h-3 w-3", config.accentClass)} /> {config.top5Label}
              </span>
              <span className="text-[8px] sm:text-[9px] text-muted-foreground">{activeCount} {config.top5CountLabel}</span>
            </div>
            <div className="space-y-1.5">
              {top5.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-center gap-1.5"
                >
                  <span className={cn(
                    "text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full tabular-nums shrink-0",
                    i === 0 ? "bg-warning/20 text-warning" :
                    i === 1 ? "bg-muted text-muted-foreground" :
                    i === 2 ? "bg-accent/20 text-accent-foreground" :
                    "bg-muted/40 text-muted-foreground"
                  )}>{i + 1}</span>
                  <span className="text-[10px] font-semibold truncate flex-1 min-w-0">{item.name}</span>
                  <div className="w-10 sm:w-14 h-1.5 rounded-full bg-muted/30 overflow-hidden shrink-0">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                    />
                  </div>
                  <span className="text-[10px] font-bold tabular-nums shrink-0 w-5 text-right">{item.count}</span>
                  <span className={cn(
                    "text-[9px] font-bold tabular-nums shrink-0 w-7 text-right",
                    item.rate >= 60 ? "text-success" : item.rate >= 30 ? "text-warning" : "text-destructive"
                  )}>{item.rate}%</span>
                </motion.div>
              ))}
              {top5.length === 0 && (
                <p className="text-center text-[10px] text-muted-foreground py-4">Belum ada data</p>
              )}
            </div>
            {remainingCount > 0 && (
              <p className="text-center text-[9px] text-muted-foreground mt-2 opacity-70">
                + {remainingCount} {config.remainingLabel}
              </p>
            )}
          </div>
        </div>

        {/* Analisa Ringkas — compact grid */}
        {total > 0 && (
          <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-1.5">
            <p className="text-[9px] font-semibold text-muted-foreground flex items-center gap-1 uppercase tracking-wide">
              <Activity className="h-3 w-3" /> Analisa Statistik
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[9px] sm:text-[10px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Res. Rate</span>
                <span className={cn("font-bold tabular-nums", resRate >= 60 ? "text-success" : resRate >= 30 ? "text-warning" : "text-destructive")}>
                  {resRate}% ({resolved}/{total})
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Dominan</span>
                <span className="font-bold truncate">{topConstraint || "-"} ({topConstraintCount})</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Avg/hari</span>
                <span className="font-bold tabular-nums">{avgPerDay}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Peak</span>
                <span className="font-bold text-destructive tabular-nums">{peakDay.date} ({peakDay.val})</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Critical%</span>
                <span className={cn("font-bold tabular-nums", critical > 0 ? "text-destructive" : "text-success")}>
                  {total > 0 ? Math.round((critical / total) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Pending%</span>
                <span className={cn("font-bold tabular-nums", pending > 0 ? "text-warning" : "text-success")}>
                  {total > 0 ? Math.round((pending / total) * 100) : 0}%
                </span>
              </div>
            </div>
            <p className={cn(
              "text-[8px] sm:text-[9px] italic pt-0.5 border-t border-border/30 mt-1",
              resRate < 50 ? "text-destructive/80" : resRate < 80 ? "text-warning/80" : "text-success/80"
            )}>
              {resRate < 50
                ? "⚠️ Resolution rate di bawah 50% — perlu peningkatan kecepatan penanganan."
                : resRate < 80
                ? "💡 Resolution rate cukup baik, target di atas 80% untuk performa optimal."
                : "✅ Resolution rate sangat baik — pertahankan performa tim."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
