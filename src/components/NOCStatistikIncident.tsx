import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { format, subDays, startOfDay } from "date-fns";

type Variant = "noc" | "ritel";
type TrendPeriod = "7d" | "14d" | "30d" | "all";

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

  // Stats
  const resolved = useMemo(() => tickets.filter(t => t.status === "Resolved").length, [tickets]);
  const pending = useMemo(() => tickets.filter(t => t.status === "On Progress" || t.status === "Pending").length, [tickets]);
  const critical = useMemo(() => tickets.filter(t => t.status === "Critical").length, [tickets]);
  const total = tickets.length;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Category trend
  const trendData = useMemo(() => {
    const periodDays = trendPeriod === "7d" ? 7 : trendPeriod === "14d" ? 14 : trendPeriod === "30d" ? 30 : null;
    const startDate = periodDays ? startOfDay(subDays(new Date(), periodDays)) : null;
    const filtered = startDate ? tickets.filter(t => new Date(t.createdISO) >= startDate) : tickets;

    const dateMap: Record<string, Record<string, number>> = {};
    filtered.forEach(t => {
      const d = new Date(t.createdISO).toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = {};
      const key = t.constraint || "Lainnya";
      dateMap[d][key] = (dateMap[d][key] || 0) + 1;
    });

    const allConstraints = new Set<string>();
    Object.values(dateMap).forEach(v => Object.keys(v).forEach(k => allConstraints.add(k)));

    return Object.entries(dateMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, counts]) => {
        const entry: Record<string, any> = { date: format(new Date(date), "dd MMM") };
        allConstraints.forEach(c => { entry[c] = counts[c] || 0; });
        return entry;
      });
  }, [tickets, trendPeriod]);

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

  // Top 5 ranking
  const top5Data = useMemo(() => {
    if (variant === "noc") {
      // Aggregate user history
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
      // Ritel: group by serpo (tim)
      const map: Record<string, { total: number; resolved: number }> = {};
      tickets.forEach(t => {
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
  }, [variant, tickets, userHistory]);

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

        {/* Top 5 Ranking */}
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
