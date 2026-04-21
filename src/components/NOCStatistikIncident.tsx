import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TrendingUp, Activity, Calendar as CalendarIcon } from "lucide-react";
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
    badgeClass: "bg-primary text-primary-foreground",
    borderClass: "border-primary/20",
    bgClass: "bg-primary/5",
    top5Label: "Top 5 User NOC",
    top5CountLabel: "user aktif",
    remainingLabel: "user lainnya di tabel bawah",
  },
  ritel: {
    badge: "RITEL",
    badgeClass: "bg-success text-success-foreground",
    borderClass: "border-success/20",
    bgClass: "bg-success/5",
    top5Label: "Top 5 Tim Ritel",
    top5CountLabel: "tim aktif",
    remainingLabel: "tim lainnya di tabel bawah",
  },
};

export function NOCStatistikIncident({ tickets, variant }: Props) {
  const [userHistory, setUserHistory] = useState<UserHistoryRow[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const config = VARIANT_CONFIG[variant];

  // Fetch user history for NOC variant
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

  // Local-date helper (WIB-accurate)
  const toLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // Resolve active date range based on trendPeriod
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

  // Tickets filtered by active range — drives ALL stats so they stay in sync with the filter
  const filteredTickets = useMemo(() => {
    if (!activeRange) return tickets;
    return tickets.filter(t => {
      const d = new Date(t.createdISO);
      return isWithinInterval(d, { start: activeRange.from, end: activeRange.to });
    });
  }, [tickets, activeRange]);

  // Stats
  const resolved = useMemo(() => filteredTickets.filter(t => t.status === "Resolved").length, [filteredTickets]);
  const pending = useMemo(() => filteredTickets.filter(t => t.status === "On Progress" || t.status === "Pending").length, [filteredTickets]);
  const critical = useMemo(() => filteredTickets.filter(t => t.status === "Critical").length, [filteredTickets]);
  const total = filteredTickets.length;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Category trend
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
        const entry: Record<string, any> = { date: format(new Date(date + "T00:00:00"), "dd MMM", { locale: localeId }) };
        allConstraints.forEach(c => { entry[c] = counts[c] || 0; });
        return entry;
      });
  }, [filteredTickets]);

  const constraintKeys = useMemo(() => {
    if (trendData.length === 0) return [];
    const keys = Object.keys(trendData[0]).filter(k => k !== "date");
    const totals: Record<string, number> = {};
    trendData.forEach(row => keys.forEach(k => { totals[k] = (totals[k] || 0) + (row[k] || 0); }));
    return keys.sort((a, b) => (totals[b] || 0) - (totals[a] || 0)).slice(0, 8);
  }, [trendData]);

  const chartConfig: ChartConfig = useMemo(() => {
    const c: ChartConfig = {};
    constraintKeys.forEach((key, i) => { c[key] = { label: key, color: TREND_COLORS[i % TREND_COLORS.length] }; });
    return c;
  }, [constraintKeys]);

  // Top 5 ranking — when a period filter is active, compute from filteredTickets so it syncs.
  // Only fall back to cumulative cloud user-history for NOC variant when "Semua Data" is selected.
  const top5Data = useMemo(() => {
    if (variant === "noc") {
      if (activeRange) {
        // Filtered: aggregate from live tickets by createdByName
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
      // All data: use cumulative cloud history
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
      // Ritel: group by serpo (tim) from filtered tickets
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

  // Resolution rate segments
  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const criticalPct = total > 0 ? (critical / total) * 100 : 0;

  return (
    <Card className={cn("overflow-hidden border", config.borderClass)}>
      <CardHeader className={cn("py-2.5 px-3 sm:px-4 border-b", config.bgClass)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Badge className={cn("text-[9px] sm:text-[10px] px-2.5 py-0.5 rounded-full font-bold", config.badgeClass)}>
              {config.badge}
            </Badge>
            <span className="font-bold">Statistik Incident</span>
          </CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground font-medium tabular-nums">
            {total} total
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-4">
        {/* Status Row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Resolved", value: resolved, dotClass: "bg-success", valClass: "text-success", bgClass: "bg-success/10 border-success/20" },
            { label: "Pending", value: pending, dotClass: "bg-warning", valClass: "text-warning", bgClass: "bg-warning/10 border-warning/20" },
            { label: "Critical", value: critical, dotClass: "bg-destructive", valClass: "text-destructive", bgClass: "bg-destructive/10 border-destructive/20" },
          ].map(s => (
            <div key={s.label} className={cn("flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg border", s.bgClass)}>
              <div className={cn("w-2 h-2 rounded-full shrink-0", s.dotClass)} />
              <span className="text-[8px] sm:text-[10px] text-muted-foreground truncate">{s.label}</span>
              <span className={cn("ml-auto text-base sm:text-lg font-bold tabular-nums shrink-0", s.valClass)}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Category Trend */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold">Category Trend</span>
            <div className="flex gap-0.5">
              {(["7d", "14d", "30d", "all"] as const).map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={trendPeriod === p ? "default" : "ghost"}
                  className={cn(
                    "h-5 sm:h-6 text-[7px] sm:text-[9px] px-1.5 sm:px-2 rounded-md",
                    trendPeriod === p && "font-bold"
                  )}
                  onClick={() => setTrendPeriod(p)}
                >
                  {p === "all" ? "Semua Data" : p.toUpperCase().replace("D", " Hari")}
                </Button>
              ))}
            </div>
          </div>
          {trendData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[150px] sm:h-[200px] w-full">
              <LineChart data={trendData}>
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
            <div className="h-[150px] flex items-center justify-center text-[10px] text-muted-foreground">Belum ada data trend</div>
          )}
        </div>

        {/* Resolution Rate */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold">Resolution Rate</span>
            <span className={cn(
              "text-sm sm:text-base font-bold",
              resRate >= 60 ? "text-success" : resRate >= 30 ? "text-warning" : "text-destructive"
            )}>{resRate}%</span>
          </div>
          <div className="w-full h-3 sm:h-3.5 rounded-full overflow-hidden flex bg-muted/30">
            {resolvedPct > 0 && (
              <motion.div className="h-full bg-success" initial={{ width: 0 }} animate={{ width: `${resolvedPct}%` }} transition={{ duration: 0.8 }} />
            )}
            {pendingPct > 0 && (
              <motion.div className="h-full bg-warning" initial={{ width: 0 }} animate={{ width: `${pendingPct}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
            )}
            {criticalPct > 0 && (
              <motion.div className="h-full bg-destructive" initial={{ width: 0 }} animate={{ width: `${criticalPct}%` }} transition={{ duration: 0.8, delay: 0.2 }} />
            )}
          </div>
        </div>

        {/* Analisa Ringkas */}
        {total > 0 && (() => {
          const topConstraint = constraintKeys[0];
          const topConstraintCount = trendData.reduce((s, row) => s + (row[topConstraint] || 0), 0);
          const avgPerDay = trendData.length > 0 ? Math.round(total / trendData.length) : 0;
          const peakDay = trendData.length > 0
            ? trendData.reduce((best, row) => {
                const dayTotal = constraintKeys.reduce((s, k) => s + (row[k] || 0), 0);
                return dayTotal > best.val ? { date: row.date, val: dayTotal } : best;
              }, { date: "", val: 0 })
            : { date: "-", val: 0 };
          return (
            <div className="p-2 rounded-md bg-muted/30 border border-border/30 space-y-1.5">
              <p className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" /> Analisa Statistik
              </p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[7px] sm:text-[8px]">
                <span className="text-muted-foreground">Resolution Rate:</span>
                <span className={cn("font-semibold", resRate >= 60 ? "text-success" : resRate >= 30 ? "text-warning" : "text-destructive")}>{resRate}% ({resolved}/{total})</span>
                <span className="text-muted-foreground">Kategori Dominan:</span>
                <span className="font-semibold">{topConstraint || "-"} ({topConstraintCount})</span>
                <span className="text-muted-foreground">Rata-rata/hari:</span>
                <span className="font-semibold">{avgPerDay} incident</span>
                <span className="text-muted-foreground">Peak Day:</span>
                <span className="font-semibold text-destructive">{peakDay.date} ({peakDay.val})</span>
                <span className="text-muted-foreground">Critical Ratio:</span>
                <span className={cn("font-semibold", critical > 0 ? "text-destructive" : "text-success")}>{total > 0 ? Math.round((critical / total) * 100) : 0}% ({critical})</span>
                <span className="text-muted-foreground">Pending Ratio:</span>
                <span className={cn("font-semibold", pending > 0 ? "text-warning" : "text-success")}>{total > 0 ? Math.round((pending / total) * 100) : 0}% ({pending})</span>
              </div>
              {resRate < 50 && (
                <p className="text-[7px] sm:text-[8px] text-muted-foreground/80 italic mt-1">
                  ⚠️ Resolution rate di bawah 50% — perlu peningkatan kecepatan penanganan incident
                </p>
              )}
              {resRate >= 50 && resRate < 80 && (
                <p className="text-[7px] sm:text-[8px] text-muted-foreground/80 italic mt-1">
                  💡 Resolution rate cukup baik, target di atas 80% untuk performa optimal
                </p>
              )}
              {resRate >= 80 && (
                <p className="text-[7px] sm:text-[8px] text-muted-foreground/80 italic mt-1">
                  ✅ Resolution rate sangat baik — pertahankan performa tim
                </p>
              )}
            </div>
          );
        })()}


        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] sm:text-xs font-semibold">{config.top5Label}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{activeCount} {config.top5CountLabel}</span>
          </div>
          <div className="space-y-2">
            {top5.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground w-4 text-center tabular-nums">{i + 1}</span>
                <span className="text-[10px] sm:text-xs font-semibold truncate flex-1 min-w-0">{item.name}</span>
                <span className="text-[10px] sm:text-xs font-bold tabular-nums shrink-0 w-6 text-right">{item.count}</span>
                <div className="w-14 sm:w-20 h-2.5 sm:h-3 rounded-full bg-muted/30 overflow-hidden shrink-0">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                  />
                </div>
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-bold tabular-nums shrink-0 w-8 text-right",
                  item.rate >= 60 ? "text-success" : item.rate >= 30 ? "text-warning" : "text-destructive"
                )}>{item.rate}%</span>
              </div>
            ))}
            {top5.length === 0 && (
              <p className="text-center text-[10px] text-muted-foreground py-4">Belum ada data</p>
            )}
          </div>
          {remainingCount > 0 && (
            <p className="text-center text-[9px] sm:text-[10px] text-muted-foreground mt-3 opacity-70">
              + {remainingCount} {config.remainingLabel}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
