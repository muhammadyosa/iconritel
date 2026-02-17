import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LineChart, Line, Cell } from "recharts";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { TrendingUp, Clock, CheckCircle, AlertTriangle, BarChart3 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MonthlyAnalyticsProps {
  tickets: Ticket[];
}

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--destructive))",
  "hsl(var(--warning, 45 93% 47%))",
  "hsl(var(--success, 142 76% 36%))",
  "hsl(200 80% 50%)",
  "hsl(280 70% 55%)",
  "hsl(340 75% 55%)",
  "hsl(30 80% 50%)",
];

export function MonthlyAnalytics({ tickets }: MonthlyAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Generate last 6 months for selector
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Filter tickets by selected month
  const monthTickets = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return tickets.filter((t) => {
      const d = new Date(t.createdISO);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [tickets, selectedMonth]);

  // KPI metrics
  const kpis = useMemo(() => {
    const resolved = monthTickets.filter((t) => t.status === "Resolved");
    const totalResolutionMs = resolved.reduce((sum, t) => {
      if (t.resolvedAt) {
        return sum + (new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime());
      }
      return sum;
    }, 0);
    const avgResolutionMs = resolved.length > 0 ? totalResolutionMs / resolved.length : 0;
    const avgResolutionHours = Math.round((avgResolutionMs / (1000 * 60 * 60)) * 10) / 10;

    const slaCompliant = monthTickets.filter((t) => {
      if (t.status === "Resolved" && t.resolvedAt) {
        const resMs = new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime();
        return resMs <= 24 * 60 * 60 * 1000;
      }
      return false;
    }).length;
    const slaRate = monthTickets.length > 0 ? Math.round((slaCompliant / monthTickets.length) * 100) : 0;

    const ritel = monthTickets.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
    const feeder = monthTickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;

    return {
      total: monthTickets.length,
      resolved: resolved.length,
      avgResolutionHours,
      slaRate,
      slaCompliant,
      ritel,
      feeder,
    };
  }, [monthTickets]);

  // Category breakdown chart data
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    monthTickets.forEach((t) => {
      map.set(t.constraint, (map.get(t.constraint) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTickets]);

  // Daily trend for SLA compliance
  const dailyTrend = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const maxDay = year === today.getFullYear() && month === today.getMonth() + 1
      ? today.getDate()
      : daysInMonth;

    const data: { day: string; total: number; resolved: number; slaOk: number }[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const dayStr = String(d);
      const dayTickets = monthTickets.filter((t) => new Date(t.createdISO).getDate() === d);
      const resolvedDay = dayTickets.filter((t) => t.status === "Resolved");
      const slaOk = resolvedDay.filter((t) => {
        if (t.resolvedAt) {
          const ms = new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime();
          return ms <= 24 * 60 * 60 * 1000;
        }
        return false;
      }).length;
      data.push({ day: dayStr, total: dayTickets.length, resolved: resolvedDay.length, slaOk });
    }
    return data;
  }, [monthTickets, selectedMonth]);

  const trendConfig: ChartConfig = {
    total: { label: "Total", color: "hsl(var(--primary))" },
    resolved: { label: "Resolved", color: "hsl(var(--success, 142 76% 36%))" },
    slaOk: { label: "SLA OK", color: "hsl(200 80% 50%)" },
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Analisis Performa Bulanan
        </h3>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Tiket</p>
            <p className="text-2xl font-bold text-primary">{kpis.total}</p>
            <div className="flex gap-1 justify-center mt-1">
              <Badge variant="outline" className="text-[10px] px-1">R:{kpis.ritel}</Badge>
              <Badge variant="outline" className="text-[10px] px-1">F:{kpis.feeder}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" /> Resolved
            </p>
            <p className="text-2xl font-bold text-success">{kpis.resolved}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" /> Avg Resolusi
            </p>
            <p className="text-2xl font-bold text-warning">{kpis.avgResolutionHours}h</p>
          </CardContent>
        </Card>
        <Card className={`border-${kpis.slaRate >= 80 ? "success" : "destructive"}/20 bg-${kpis.slaRate >= 80 ? "success" : "destructive"}/5`}>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1 flex items-center justify-center gap-1">
              <TrendingUp className="h-3 w-3" /> SLA Rate
            </p>
            <p className={`text-2xl font-bold ${kpis.slaRate >= 80 ? "text-success" : "text-destructive"}`}>
              {kpis.slaRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Category Breakdown */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Tiket per Kategori</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data</p>
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8 }}
                      formatter={(value: number) => [`${value} tiket`, "Jumlah"]}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Tren Harian & SLA Compliance</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            {dailyTrend.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data</p>
            ) : (
              <ChartContainer config={trendConfig} className="h-[220px] w-full">
                <LineChart data={dailyTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} width={30} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="slaOk" stroke="var(--color-slaOk)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
