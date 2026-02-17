import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LineChart, Line, Cell } from "recharts";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { TrendingUp, Clock, CheckCircle, BarChart3, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface MonthlyAnalyticsProps {
  tickets: Ticket[];
}

const CATEGORY_COLORS: Record<string, string> = {
  "LINK LOSS": "hsl(217, 91%, 60%)",
  "BAD RX": "hsl(0, 84%, 60%)",
  "ONT PROBLEM": "hsl(38, 92%, 50%)",
  "FAT LOSS": "hsl(142, 71%, 45%)",
  "PORT DOWN": "hsl(280, 70%, 55%)",
  "OLT DOWN": "hsl(200, 80%, 50%)",
  "GANGGUAN ICONPLAY": "hsl(340, 75%, 55%)",
  "GANGGUAN BERULANG": "hsl(30, 80%, 50%)",
  "PENGECEKAN BERSAMA": "hsl(170, 60%, 45%)",
  "CABLE PROBLEM": "hsl(260, 50%, 55%)",
  "INTERMITTENT": "hsl(315, 60%, 50%)",
  "FAT BAD RX": "hsl(15, 85%, 55%)",
  "CABLE PROBLEM (FEEDER)": "hsl(190, 70%, 45%)",
};
const FALLBACK_COLORS = [
  "hsl(217, 91%, 60%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)", "hsl(200, 80%, 50%)", "hsl(280, 70%, 55%)",
  "hsl(340, 75%, 55%)", "hsl(30, 80%, 50%)",
];

export function MonthlyAnalytics({ tickets }: MonthlyAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Drill-down state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillTickets, setDrillTickets] = useState<Ticket[]>([]);
  const [drillSelectedTicket, setDrillSelectedTicket] = useState<Ticket | null>(null);

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

  const monthTickets = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return tickets.filter((t) => {
      const d = new Date(t.createdISO);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [tickets, selectedMonth]);

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

    return { total: monthTickets.length, resolved: resolved.length, avgResolutionHours, slaRate, slaCompliant, ritel, feeder };
  }, [monthTickets]);

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    monthTickets.forEach((t) => {
      map.set(t.constraint, (map.get(t.constraint) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthTickets]);

  const dailyTrend = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    const maxDay = year === today.getFullYear() && month === today.getMonth() + 1
      ? today.getDate()
      : daysInMonth;

    const data: { day: string; dayNum: number; total: number; resolved: number; slaOk: number }[] = [];
    for (let d = 1; d <= maxDay; d++) {
      const dayTickets = monthTickets.filter((t) => new Date(t.createdISO).getDate() === d);
      const resolvedDay = dayTickets.filter((t) => t.status === "Resolved");
      const slaOk = resolvedDay.filter((t) => {
        if (t.resolvedAt) {
          const ms = new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime();
          return ms <= 24 * 60 * 60 * 1000;
        }
        return false;
      }).length;
      data.push({ day: String(d), dayNum: d, total: dayTickets.length, resolved: resolvedDay.length, slaOk });
    }
    return data;
  }, [monthTickets, selectedMonth]);

  const trendConfig: ChartConfig = {
    total: { label: "Total", color: "hsl(var(--primary))" },
    resolved: { label: "Resolved", color: "hsl(142, 71%, 45%)" },
    slaOk: { label: "SLA OK", color: "hsl(200, 80%, 50%)" },
  };

  // Drill-down handlers
  const handleCategoryClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.name) {
      const constraint = data.activePayload[0].payload.name;
      const filtered = monthTickets.filter((t) => t.constraint === constraint);
      setDrillSelectedTicket(null);
      setDrillTickets(filtered);
      setDrillTitle(`📊 ${constraint} — ${filtered.length} tiket`);
      setDrillOpen(true);
    }
  };

  const handleTrendDotClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.dayNum) {
      const dayNum = data.activePayload[0].payload.dayNum;
      const filtered = monthTickets.filter((t) => new Date(t.createdISO).getDate() === dayNum);
      const [, month] = selectedMonth.split("-").map(Number);
      const monthName = new Date(2026, month - 1).toLocaleDateString("id-ID", { month: "short" });
      setDrillSelectedTicket(null);
      setDrillTickets(filtered);
      setDrillTitle(`📅 ${dayNum} ${monthName} — ${filtered.length} tiket`);
      setDrillOpen(true);
    }
  };

  // Custom Y-axis tick with emoji-style for category chart
  const CustomCategoryTick = ({ x, y, payload }: any) => {
    const isFeeder = FEEDER_CONSTRAINTS_SET.has(payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-8} y={-7} textAnchor="end" fontSize={12} className="select-none">
          {isFeeder ? "🏬" : "🏠"}
        </text>
        <text x={-8} y={7} textAnchor="end" fontSize={8} fill="hsl(var(--muted-foreground))">
          {payload.value.length > 14 ? payload.value.slice(0, 14) + "…" : payload.value}
        </text>
      </g>
    );
  };

  const selectedMonthLabel = monthOptions.find((o) => o.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="space-y-3">
      {/* Header - matches Status Distribution / Category Trend style */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          Analisis Performa Bulanan
        </h3>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px] sm:w-[170px] h-7 text-[10px] sm:text-xs">
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

      {/* KPI Summary - compact cards with glow effect matching Dashboard KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          {
            emoji: "🗃️", title: "Total Tiket", value: kpis.total,
            sub: <div className="flex gap-1 justify-center mt-0.5"><Badge variant="outline" className="text-[9px] px-1 h-4">R:{kpis.ritel}</Badge><Badge variant="outline" className="text-[9px] px-1 h-4">F:{kpis.feeder}</Badge></div>,
            bgClass: "bg-primary/8 hover:bg-primary/15", borderClass: "border-primary/30 hover:border-primary/50",
            valueClass: "text-primary", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--primary)/0.3)]",
          },
          {
            emoji: "✅", title: "Resolved", value: kpis.resolved,
            bgClass: "bg-success/8 hover:bg-success/15", borderClass: "border-success/30 hover:border-success/50",
            valueClass: "text-success", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--success)/0.3)]",
          },
          {
            emoji: "⏱️", title: "Avg Resolusi", value: `${kpis.avgResolutionHours}h`,
            bgClass: "bg-warning/8 hover:bg-warning/15", borderClass: "border-warning/30 hover:border-warning/50",
            valueClass: "text-warning", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--warning)/0.3)]",
          },
          {
            emoji: "📈", title: "SLA Rate", value: `${kpis.slaRate}%`,
            bgClass: kpis.slaRate >= 80 ? "bg-success/8 hover:bg-success/15" : "bg-destructive/8 hover:bg-destructive/15",
            borderClass: kpis.slaRate >= 80 ? "border-success/30 hover:border-success/50" : "border-destructive/30 hover:border-destructive/50",
            valueClass: kpis.slaRate >= 80 ? "text-success" : "text-destructive",
            glowClass: kpis.slaRate >= 80 ? "hover:shadow-[0_0_15px_-4px_hsl(var(--success)/0.3)]" : "hover:shadow-[0_0_15px_-4px_hsl(var(--destructive)/0.3)]",
          },
        ].map((card, i) => (
          <div key={i} className={`rounded-lg border p-2 sm:p-2.5 transition-all duration-300 cursor-default ${card.bgClass} ${card.borderClass} ${card.glowClass}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm sm:text-base">{card.emoji}</span>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate">{card.title}</p>
            </div>
            <p className={`text-xl sm:text-2xl font-bold tabular-nums text-center ${card.valueClass}`}>{card.value}</p>
            {card.sub}
          </div>
        ))}
      </div>

      {/* Charts - matching Status Distribution / Category Trend card style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Category Breakdown */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
            <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              Tiket per Kategori
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data bulan ini</p>
            ) : (
              <>
                <ChartContainer
                  config={{ value: { label: "Jumlah" } }}
                  className="h-[180px] xs:h-[190px] sm:h-[210px] md:h-[240px] w-full transition-all duration-300"
                >
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 8, right: 15, left: 5, bottom: 8 }}
                    barCategoryGap="20%"
                    onClick={handleCategoryClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={<CustomCategoryTick />} width={80} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer" maxBarSize={24}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-1">
                  Klik bar untuk detail
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
            <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              Tren Harian & SLA Compliance
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {dailyTrend.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data bulan ini</p>
            ) : (
              <>
                <ChartContainer config={trendConfig} className="h-[180px] xs:h-[190px] sm:h-[210px] md:h-[240px] w-full transition-all duration-300">
                  <LineChart
                    data={dailyTrend}
                    margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                    onClick={handleTrendDotClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={25} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ r: 2, cursor: "pointer" }} activeDot={{ r: 5, cursor: "pointer" }} />
                    <Line type="monotone" dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2} dot={{ r: 2, cursor: "pointer" }} activeDot={{ r: 5, cursor: "pointer" }} />
                    <Line type="monotone" dataKey="slaOk" stroke="var(--color-slaOk)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ChartContainer>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-2.5 h-0.5 rounded bg-primary inline-block" /> Total
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-2.5 h-0.5 rounded inline-block" style={{ background: "hsl(142, 71%, 45%)" }} /> Resolved
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-2.5 h-0.5 rounded inline-block border-dashed border-t" style={{ borderColor: "hsl(200, 80%, 50%)" }} /> SLA OK
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-0.5">
                  Klik titik untuk detail
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={drillOpen} onOpenChange={(open) => { setDrillOpen(open); if (!open) setDrillSelectedTicket(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-4">
          <DialogHeader className="flex-shrink-0">
            {drillSelectedTicket ? (
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Button variant="default" size="sm" className="rounded-full h-7 px-3 text-xs" onClick={() => setDrillSelectedTicket(null)}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> Kembali
                </Button>
                <span className="truncate">Detail Tiket</span>
              </DialogTitle>
            ) : (
              <DialogTitle className="text-sm sm:text-base">{drillTitle}</DialogTitle>
            )}
          </DialogHeader>

          <div className="mt-2 flex-1 overflow-auto min-h-0">
            <AnimatePresence mode="wait">
              {drillSelectedTicket ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={drillSelectedTicket.status} />
                    <Badge variant="outline" className="text-[10px]">{drillSelectedTicket.constraint}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{drillSelectedTicket.category}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { label: "ID Tiket", value: drillSelectedTicket.id },
                      { label: "Service ID", value: drillSelectedTicket.serviceId },
                      { label: "Customer", value: drillSelectedTicket.customerName },
                      { label: "Hostname", value: drillSelectedTicket.hostname },
                      { label: "SERPO", value: drillSelectedTicket.serpo },
                      { label: "ID FAT", value: drillSelectedTicket.fatId },
                      { label: "SN ONT", value: drillSelectedTicket.snOnt },
                      { label: "Dibuat", value: drillSelectedTicket.createdAt },
                      { label: "Oleh", value: drillSelectedTicket.createdByName || "-" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/40 rounded p-1.5">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="font-medium text-[11px] break-all">{item.value || "-"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/40 rounded p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Ticket Result:</p>
                    <p className="text-xs font-mono whitespace-pre-wrap break-all">{drillSelectedTicket.ticketResult}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-1.5"
                >
                  {drillTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Tidak ada tiket</p>
                  ) : (
                    drillTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setDrillSelectedTicket(ticket)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <StatusBadge status={ticket.status} />
                            <span className="text-[10px] font-medium text-muted-foreground">{ticket.constraint}</span>
                          </div>
                          <p className="text-xs font-medium truncate">
                            {FEEDER_CONSTRAINTS_SET.has(ticket.constraint) ? ticket.hostname : ticket.customerName}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-[10px] font-mono text-muted-foreground">{ticket.id}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(ticket.createdISO).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end pt-2 border-t mt-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setDrillOpen(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
