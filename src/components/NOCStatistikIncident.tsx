import { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";

interface NOCStatistikIncidentProps {
  tickets: Ticket[];
}

interface UserHistoryRow {
  id: string;
  date: string;
  user_name: string;
  user_id: string | null;
  total_created: number;
  total_resolved: number;
  created_at: string;
}

type TrendPeriod = "7d" | "14d" | "30d" | "all";

const TREND_COLORS = [
  "hsl(142, 71%, 45%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)", "hsl(262, 80%, 55%)", "hsl(180, 70%, 40%)",
  "hsl(330, 75%, 50%)", "hsl(25, 95%, 53%)",
];

export function NOCStatistikIncident({ tickets }: NOCStatistikIncidentProps) {
  const [userHistory, setUserHistory] = useState<UserHistoryRow[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("30d");

  // Fetch user history data
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await supabase
          .from("daily_user_ticket_history")
          .select("*")
          .order("date", { ascending: false });
        setUserHistory((data || []) as UserHistoryRow[]);
      } catch {}
    };
    fetchHistory();
  }, []);

  // Stats
  const resolved = useMemo(() => tickets.filter(t => t.status === "Resolved").length, [tickets]);
  const pending = useMemo(() => tickets.filter(t => t.status === "On Progress" || t.status === "Pending").length, [tickets]);
  const critical = useMemo(() => tickets.filter(t => t.status === "Critical").length, [tickets]);
  const total = tickets.length;
  const resRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  // Category trend chart data
  const trendData = useMemo(() => {
    const periodDays = trendPeriod === "7d" ? 7 : trendPeriod === "14d" ? 14 : trendPeriod === "30d" ? 30 : null;
    const now = new Date();
    const startDate = periodDays ? startOfDay(subDays(now, periodDays)) : null;

    const filtered = startDate
      ? tickets.filter(t => new Date(t.createdISO) >= startDate)
      : tickets;

    // Group by date and constraint type
    const dateMap: Record<string, Record<string, number>> = {};
    filtered.forEach(t => {
      const d = new Date(t.createdISO).toISOString().split("T")[0];
      if (!dateMap[d]) dateMap[d] = {};
      const key = t.constraint || "Lainnya";
      dateMap[d][key] = (dateMap[d][key] || 0) + 1;
    });

    // Get all constraint types
    const allConstraints = new Set<string>();
    Object.values(dateMap).forEach(v => Object.keys(v).forEach(k => allConstraints.add(k)));

    // Build sorted array
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
    // Sort by total desc, take top 8
    const totals: Record<string, number> = {};
    trendData.forEach(row => keys.forEach(k => { totals[k] = (totals[k] || 0) + (row[k] || 0); }));
    return keys.sort((a, b) => (totals[b] || 0) - (totals[a] || 0)).slice(0, 8);
  }, [trendData]);

  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    constraintKeys.forEach((key, i) => {
      config[key] = { label: key, color: TREND_COLORS[i % TREND_COLORS.length] };
    });
    return config;
  }, [constraintKeys]);

  // Top 5 User NOC from history data
  const topUsers = useMemo(() => {
    const map: Record<string, { created: number; resolved: number }> = {};
    userHistory.forEach(row => {
      if (!map[row.user_name]) map[row.user_name] = { created: 0, resolved: 0 };
      map[row.user_name].created += row.total_created;
      map[row.user_name].resolved += row.total_resolved;
    });
    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s, rate: s.created > 0 ? Math.round((s.resolved / s.created) * 100) : 0 }))
      .sort((a, b) => b.created - a.created);
  }, [userHistory]);

  const activeUsers = topUsers.length;
  const top5 = topUsers.slice(0, 5);
  const remainingCount = topUsers.length - 5;
  const maxCreated = top5.length > 0 ? top5[0].created : 1;

  // Resolution rate bar segments
  const resolvedPct = total > 0 ? (resolved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const criticalPct = total > 0 ? (critical / total) * 100 : 0;

  return (
    <Card className="overflow-hidden border border-primary/20">
      <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-primary/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs sm:text-sm flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold">
              NOC
            </Badge>
            Statistik Incident
          </CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground font-medium">
            {total} total
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-4">
        {/* Status Badges Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-success/10 border border-success/20">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolved</span>
            <span className="ml-auto text-sm sm:text-base font-bold text-success">{resolved}</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-warning/10 border border-warning/20">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Pending</span>
            <span className="ml-auto text-sm sm:text-base font-bold text-warning">{pending}</span>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Critical</span>
            <span className="ml-auto text-sm sm:text-base font-bold text-destructive">{critical}</span>
          </div>
        </div>

        {/* Category Trend Chart */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-foreground">Category Trend</span>
            <div className="flex gap-1">
              {(["7d", "14d", "30d", "all"] as const).map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={trendPeriod === p ? "default" : "ghost"}
                  className="h-5 text-[8px] sm:text-[9px] px-1.5 sm:px-2"
                  onClick={() => setTrendPeriod(p)}
                >
                  {p === "all" ? "Semua Data" : p === "7d" ? "7D" : p === "14d" ? "14D" : "30D"}
                </Button>
              ))}
            </div>
          </div>
          {trendData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[160px] sm:h-[200px] w-full">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={28} />
                <ChartTooltip content={<ChartTooltipContent />} />
                {constraintKeys.map((key, i) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={TREND_COLORS[i % TREND_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-[10px] text-muted-foreground">
              Belum ada data trend
            </div>
          )}
        </div>

        {/* Resolution Rate Bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] sm:text-xs font-semibold text-foreground">Resolution Rate</span>
            <span className={cn(
              "text-sm sm:text-base font-bold",
              resRate >= 60 ? "text-success" : resRate >= 30 ? "text-warning" : "text-destructive"
            )}>{resRate}%</span>
          </div>
          <div className="w-full h-3 sm:h-4 rounded-full overflow-hidden flex bg-muted/40">
            {resolvedPct > 0 && (
              <motion.div
                className="h-full bg-success"
                initial={{ width: 0 }}
                animate={{ width: `${resolvedPct}%` }}
                transition={{ duration: 0.8 }}
              />
            )}
            {pendingPct > 0 && (
              <motion.div
                className="h-full bg-warning"
                initial={{ width: 0 }}
                animate={{ width: `${pendingPct}%` }}
                transition={{ duration: 0.8, delay: 0.1 }}
              />
            )}
            {criticalPct > 0 && (
              <motion.div
                className="h-full bg-destructive"
                initial={{ width: 0 }}
                animate={{ width: `${criticalPct}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            )}
          </div>
        </div>

        {/* Top 5 User NOC */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] sm:text-xs font-semibold text-foreground">Top 5 User NOC</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">{activeUsers} user aktif</span>
          </div>
          <div className="space-y-1.5">
            {top5.map((user, i) => (
              <div key={user.name} className="flex items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                <span className="text-[10px] sm:text-xs font-medium truncate flex-1 min-w-0">{user.name}</span>
                <span className="text-[10px] sm:text-xs font-bold tabular-nums shrink-0">{user.created}</span>
                <div className="w-12 sm:w-20 h-2.5 rounded-full bg-muted/40 overflow-hidden shrink-0">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }}
                    initial={{ width: 0 }}
                    animate={{ width: `${maxCreated > 0 ? (user.created / maxCreated) * 100 : 0}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                  />
                </div>
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-bold tabular-nums shrink-0 w-8 text-right",
                  user.rate >= 60 ? "text-success" : user.rate >= 30 ? "text-warning" : "text-destructive"
                )}>{user.rate}%</span>
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <p className="text-center text-[9px] sm:text-[10px] text-muted-foreground mt-2">
              + {remainingCount} user lainnya di tabel bawah
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
