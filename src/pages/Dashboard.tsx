import { Activity, AlertTriangle, Zap, Server, Calendar, Clock, User, ExternalLink, TrendingUp, BarChart3, FileText, History, RefreshCw, Loader2 } from "lucide-react";
import { DashboardSkeleton } from "@/components/PageSkeleton";
import { RecentActivity } from "@/components/RecentActivity";
import { MonthlyAnalytics } from "@/components/MonthlyAnalytics";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { useUserRole } from "@/hooks/useUserRole";
import { useTicketHistory } from "@/hooks/useTicketHistory";
import { useShiftReportHistory } from "@/hooks/useShiftReportHistory";
import { useCloudShiftReports } from "@/hooks/useCloudShiftReports";
import { FEEDER_CONSTRAINTS_SET, Ticket, ALL_CONSTRAINTS } from "@/types/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useEffect, useMemo } from "react";
import { OLT } from "@/types/olt";
import { loadOLTData } from "@/lib/indexedDB";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LineChart, Line } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftReportCard } from "@/components/ShiftReportCard";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface ShiftReport {
  id: string;
  date: string;
  shift: string;
  officer: string;
  oltDown?: string;
  portDown?: string;
  fatLoss?: string;
  summary?: string;
  issues: string;
  notes: string;
  createdAt: string;
}

export default function Dashboard() {
  const { tickets, isLoading: isLoadingTickets } = useCloudTickets();
  const { getChartData, getTrendChartData, getCategoryData, getTicketsForDate, getTicketsForDateByStatus } = useTicketHistory(tickets);
  
  // Cloud shift reports hook
  const { 
    isLoading: isLoadingShiftReports, 
    fetchReports: fetchShiftReports, 
    getFormattedReports,
    updateReport: updateShiftReport,
  } = useCloudShiftReports();
  
  // Memoize formatted reports to avoid re-creating on every render
  const shiftReports = useMemo(() => getFormattedReports(), [getFormattedReports]);
  
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [oltData, setOltData] = useState<OLT[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filterDialogTitle, setFilterDialogTitle] = useState("");
  const [filterDialogTickets, setFilterDialogTickets] = useState<Ticket[]>([]);
  const [showOltList, setShowOltList] = useState(false);
  const [selectedConstraint, setSelectedConstraint] = useState<string>("all");
  const [inlineSelectedTicket, setInlineSelectedTicket] = useState<Ticket | null>(null);
  const [trendFilter, setTrendFilter] = useState<string>("7");
  const [trendCustomDate, setTrendCustomDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [previousDialogState, setPreviousDialogState] = useState<{
    title: string;
    tickets: Ticket[];
    showOltList: boolean;
    inlineTicket: Ticket | null;
  } | null>(null);

  // Hook for shift report history (using formatted reports)
  const { getHistoryRecords, getReportsForDate } = useShiftReportHistory(shiftReports as any);
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  const [shiftReportTab, setShiftReportTab] = useState<string>("latest");

  // Load OLT data
  useEffect(() => {
    loadOLTData().then(setOltData).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Error loading OLT data:", error);
      }
    });
  }, []);

  const totalIncidents = tickets.length;
  const overSLA = useMemo(() => tickets.filter((t) => {
    const ageMs = new Date().getTime() - new Date(t.createdISO).getTime();
    return ageMs > 24 * 60 * 60 * 1000 && t.status !== "Resolved";
  }).length, [tickets]);
  const feederImpact = useMemo(() => tickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length, [tickets]);
  const totalOLT = useMemo(() => new Set(tickets.map((t) => t.hostname).filter(Boolean)).size || 0, [tickets]);

  const recentTickets = useMemo(() => tickets
    .filter((t) => selectedConstraint === "all" || t.constraint === selectedConstraint)
    .slice(0, 10), [tickets, selectedConstraint]);
  
  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    if (selectedStatus && ticket.status !== selectedStatus) return false;
    if (selectedCategory && ticket.category !== selectedCategory) return false;
    
    if (selectedMetric === "overSLA") {
      const ageMs = new Date().getTime() - new Date(ticket.createdISO).getTime();
      return ageMs > 24 * 60 * 60 * 1000 && ticket.status !== "Resolved";
    }
    if (selectedMetric === "feeder") {
      return FEEDER_CONSTRAINTS_SET.has(ticket.constraint);
    }
    if (selectedMetric === "total") return true;
    if (selectedMetric === "olt") return ticket.constraint === "OLT DOWN";
    
    return true;
  }), [tickets, selectedStatus, selectedCategory, selectedMetric]);

  if (isLoadingTickets && tickets.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">
          🖥️ Dashboard Overview
        </h1>
        <p className="text-muted-foreground text-[11px] sm:text-sm">
          Monitoring incident NOC RITEL
        </p>
      </motion.div>

      {/* KPI Cards Section */}
      <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4 w-full">
        {[
          { 
            title: "Total Incident", 
            value: totalIncidents, 
            emoji: "🗃️", 
            metric: "total",
            bgClass: "bg-primary/8 hover:bg-primary/15",
            borderClass: "border-primary/30 hover:border-primary/50",
            valueClass: "text-primary",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]"
          },
          { 
            title: "Over SLA (>24h)", 
            value: overSLA, 
            emoji: "⚠️", 
            metric: "overSLA",
            bgClass: "bg-destructive/8 hover:bg-destructive/15",
            borderClass: "border-destructive/30 hover:border-destructive/50",
            valueClass: "text-destructive",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.4)]"
          },
          { 
            title: "Impact OLT", 
            value: totalOLT, 
            emoji: "📟", 
            metric: "olt",
            bgClass: "bg-success/8 hover:bg-success/15",
            borderClass: "border-success/30 hover:border-success/50",
            valueClass: "text-success",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--success)/0.4)]"
          },
          { 
            title: "Impact Feeder", 
            value: feederImpact, 
            emoji: "⛓️‍💥", 
            metric: "feeder",
            bgClass: "bg-warning/8 hover:bg-warning/15",
            borderClass: "border-warning/30 hover:border-warning/50",
            valueClass: "text-warning",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--warning)/0.4)]"
          }
        ].map((card, index) => (
          <motion.div
            key={card.metric}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => {
              let filtered: Ticket[] = [];
              let title = "";
              
              setPreviousDialogState(null);
              
              if (card.metric === "total") {
                filtered = tickets;
                title = "🗃️ Semua Incident";
              } else if (card.metric === "overSLA") {
                filtered = tickets.filter((t) => {
                  const ageMs = new Date().getTime() - new Date(t.createdISO).getTime();
                  return ageMs > 24 * 60 * 60 * 1000 && t.status !== "Resolved";
                });
                title = "⚠️ Incident Over SLA (>24h)";
              } else if (card.metric === "feeder") {
                filtered = tickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint));
                title = "⛓️‍💥 Incident Impact Feeder";
              } else if (card.metric === "olt") {
                setShowOltList(true);
                setFilterDialogTitle("📟 Daftar OLT Terdampak");
                setFilterDialogOpen(true);
                return;
              }
              
              setShowOltList(false);
              setFilterDialogTickets(filtered);
              setFilterDialogTitle(title);
              setFilterDialogOpen(true);
            }}
            className={`
              relative cursor-pointer group
              rounded-xl ${card.bgClass} ${card.borderClass} border
              transition-all duration-300
              ${card.glowClass} active:scale-[0.97]
            `}
          >
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl sm:text-2xl">{card.emoji}</span>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{card.title}</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold shrink-0 tabular-nums ${card.valueClass}`}>
                  {card.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 lg:grid-cols-2 w-full">
        {/* Status Distribution Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="overflow-hidden border">
            <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
              <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
              {(() => {
                const statusData = [
                  { emoji: "⚙️", label: "Progres", value: tickets.filter((t) => t.status === "On Progress").length, fill: "hsl(217, 91%, 60%)", status: "On Progress" },
                  { emoji: "🚨", label: "Critical", value: tickets.filter((t) => t.status === "Critical").length, fill: "hsl(0, 84%, 60%)", status: "Critical" },
                  { emoji: "✅", label: "Resolved", value: tickets.filter((t) => t.status === "Resolved").length, fill: "hsl(142, 71%, 45%)", status: "Resolved" },
                  { emoji: "⏳", label: "Pending", value: tickets.filter((t) => t.status === "Pending").length, fill: "hsl(38, 92%, 50%)", status: "Pending" },
                ];

                const chartConfig: ChartConfig = {
                  value: { label: "Jumlah" },
                };

                // Custom Y-axis tick with emoji above label
                const CustomYAxisTick = ({ x, y, payload }: any) => {
                  const item = statusData.find((d) => d.label === payload.value);
                  return (
                    <g transform={`translate(${x},${y})`}>
                      <text
                        x={-8}
                        y={-8}
                        textAnchor="end"
                        fontSize={14}
                        className="select-none"
                      >
                        {item?.emoji}
                      </text>
                      <text
                        x={-8}
                        y={6}
                        textAnchor="end"
                        fontSize={9}
                        fill="hsl(var(--muted-foreground))"
                      >
                        {payload.value}
                      </text>
                    </g>
                  );
                };

                return (
                  <ChartContainer config={chartConfig} className="h-[180px] xs:h-[190px] sm:h-[210px] md:h-[240px] w-full transition-all duration-300">
                    <BarChart
                      data={statusData}
                      layout="vertical"
                      margin={{ top: 8, right: 15, left: 5, bottom: 8 }}
                      barCategoryGap="25%"
                      onClick={(data) => {
                        if (data?.activePayload?.[0]?.payload?.status) {
                          const status = data.activePayload[0].payload.status;
                          setSelectedStatus(selectedStatus === status ? null : status);
                          const filtered = tickets.filter((t) => t.status === status);
                          setPreviousDialogState(null);
                          setShowOltList(false);
                          setFilterDialogTickets(filtered);
                          setFilterDialogTitle(`⚙️ Incident dengan Status: ${status}`);
                          setFilterDialogOpen(true);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        type="category"
                        dataKey="label" 
                        tick={<CustomYAxisTick />}
                        width={75}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer" maxBarSize={28}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                );
              })()}
              <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-1">
                Klik bar untuk detail
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Distribution Line Chart - Daily Trend with History */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="overflow-hidden border">
            <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                  <TrendingUp className="h-4 w-4 text-accent" />
                  Category Trend
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Select value={trendFilter} onValueChange={setTrendFilter}>
                    <SelectTrigger className="w-[100px] sm:w-[120px] h-7 text-[10px] sm:text-xs">
                      <SelectValue placeholder="Rentang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hari ini</SelectItem>
                      <SelectItem value="all">Semua Data</SelectItem>
                      <SelectItem value="7">7 Hari</SelectItem>
                      <SelectItem value="14">14 Hari</SelectItem>
                      <SelectItem value="30">30 Hari</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                  {trendFilter === "custom" && (
                    <input
                      type="date"
                      value={trendCustomDate}
                      onChange={(e) => setTrendCustomDate(e.target.value)}
                      className="h-7 text-[10px] sm:text-xs px-2 rounded-md border border-input bg-background"
                    />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-3">
              {(() => {
                // Calculate chart data based on filter
                const today = new Date();
                let chartData: Array<{
                  date: string; isoDate: string;
                  ritel: number; feeder: number; total: number;
                  created: number; inProgress: number; resolved: number;
                }> = [];
                
                if (trendFilter === "today") {
                  const todayStr = today.toISOString().split('T')[0];
                  const displayDate = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                  const dayTickets = tickets.filter((t) => new Date(t.createdISO).toISOString().split('T')[0] === todayStr);
                  const ritelCount = dayTickets.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
                  const feederCount = dayTickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
                  chartData = [{
                    date: displayDate,
                    isoDate: todayStr,
                    ritel: ritelCount,
                    feeder: feederCount,
                    total: dayTickets.length,
                    created: dayTickets.length,
                    inProgress: dayTickets.filter((t) => t.status === "On Progress" || t.status === "Critical" || t.status === "Pending").length,
                    resolved: dayTickets.filter((t) => t.status === "Resolved").length,
                  }];
                } else if (trendFilter === "custom") {
                  const customD = new Date(trendCustomDate);
                  const isoDate = trendCustomDate;
                  const displayDate = customD.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
                  const dayTickets = tickets.filter((t) => new Date(t.createdISO).toISOString().split('T')[0] === isoDate);
                  const ritelCount = dayTickets.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
                  const feederCount = dayTickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
                  chartData = [{
                    date: displayDate,
                    isoDate,
                    ritel: ritelCount,
                    feeder: feederCount,
                    total: dayTickets.length,
                    created: dayTickets.length,
                    inProgress: dayTickets.filter((t) => t.status === "On Progress" || t.status === "Critical" || t.status === "Pending").length,
                    resolved: dayTickets.filter((t) => t.status === "Resolved").length,
                  }];
                } else if (trendFilter === "all") {
                  // Find earliest ticket date
                  const earliest = tickets.reduce((min, t) => {
                    const d = new Date(t.createdISO);
                    return d < min ? d : min;
                  }, today);
                  const days = Math.max(1, Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1);
                  chartData = getChartData(days);
                } else {
                  // 7, 14, 30 days
                  const days = Number(trendFilter);
                  chartData = getChartData(days);
                }

                const numDays = trendFilter === "today" || trendFilter === "custom" ? 1 : trendFilter === "all" ? chartData.length : Number(trendFilter);

                const chartConfig: ChartConfig = {
                  ritel: { label: "🏠 RITEL", color: "hsl(217, 91%, 60%)" },
                  feeder: { label: "🏬 FEEDER", color: "hsl(38, 92%, 50%)" },
                  created: { label: "📥Insident", color: "hsl(262, 83%, 58%)" },
                };

                const handleDotClick = (category: "RITEL" | "FEEDER", isoDate: string, displayDate: string) => {
                  const filtered = getTicketsForDate(isoDate, category);
                  setPreviousDialogState(null);
                  setShowOltList(false);
                  setInlineSelectedTicket(null);
                  setFilterDialogTickets(filtered);
                  setFilterDialogTitle(`${category === "RITEL" ? "🏠" : "🏬"} ${category} - ${displayDate}`);
                  setFilterDialogOpen(true);
                };

                const handleStatusDotClick = (isoDate: string, displayDate: string) => {
                  const filtered = getTicketsForDateByStatus(isoDate, "created");
                  setPreviousDialogState(null);
                  setShowOltList(false);
                  setInlineSelectedTicket(null);
                  setFilterDialogTickets(filtered);
                  setFilterDialogTitle(`📥Insident - ${displayDate}`);
                  setFilterDialogOpen(true);
                };

                return (
                  <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px] md:h-[260px] w-full transition-all duration-300">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date"
                        tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        interval={numDays > 14 ? 3 : numDays > 7 ? 1 : 0}
                      />
                      <YAxis 
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={25}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="ritel" 
                        stroke="hsl(217, 91%, 60%)" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 1, r: numDays > 14 ? 2 : 3, cursor: "pointer" }}
                        activeDot={{ 
                          r: 6, 
                          strokeWidth: 2, 
                          cursor: "pointer",
                          onClick: (_, payload: any) => {
                            if (payload?.payload) {
                              handleDotClick("RITEL", payload.payload.isoDate, payload.payload.date);
                            }
                          }
                        }}
                        name="🏠 RITEL"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="feeder" 
                        stroke="hsl(38, 92%, 50%)" 
                        strokeWidth={2}
                        dot={{ fill: "hsl(38, 92%, 50%)", strokeWidth: 1, r: numDays > 14 ? 2 : 3, cursor: "pointer" }}
                        activeDot={{ 
                          r: 6, 
                          strokeWidth: 2, 
                          cursor: "pointer",
                          onClick: (_, payload: any) => {
                            if (payload?.payload) {
                              handleDotClick("FEEDER", payload.payload.isoDate, payload.payload.date);
                            }
                          }
                        }}
                        name="🏬 FEEDER"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="created" 
                        stroke="hsl(262, 83%, 58%)" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={{ fill: "hsl(262, 83%, 58%)", strokeWidth: 1, r: numDays > 14 ? 2 : 3, cursor: "pointer" }}
                        activeDot={{ 
                          r: 6, 
                          strokeWidth: 2, 
                          cursor: "pointer",
                          onClick: (_, payload: any) => {
                            if (payload?.payload) {
                              handleStatusDotClick(payload.payload.isoDate, payload.payload.date);
                            }
                          }
                        }}
                        name="📥Insident"
                      />
                    </LineChart>
                  </ChartContainer>
                );
              })()}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-1.5">
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-muted-foreground">🏠 RITEL</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-muted-foreground">🏬 FEEDER</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <div className="w-2 h-2 rounded-full" style={{ background: "hsl(262, 83%, 58%)" }} />
                  <span className="text-muted-foreground">📥Insident</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Klik titik untuk detail
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Monthly Analytics Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <MonthlyAnalytics tickets={tickets} getTrendChartData={getTrendChartData} getCategoryData={getCategoryData} />
      </motion.div>

      {/* Shift Reports Section - Enhanced Layout */}
      {shiftReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="overflow-hidden border">
            <CardHeader className="py-3 px-3 sm:px-6 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold">📋 Report Shift</h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                    Rekap aktivitas shift harian tim NOC
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-2 py-1 rounded-md bg-primary/10 border border-primary/20 font-medium text-primary">
                    {shiftReports.length} Laporan
                  </span>
                  <span className="text-[10px] px-2 py-1 rounded-md bg-muted border font-medium text-muted-foreground">
                    {getHistoryRecords().length} Hari
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={fetchShiftReports} 
                    disabled={isLoadingShiftReports} 
                    title="Refresh data"
                    className="h-8 w-8"
                  >
                    {isLoadingShiftReports ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4 pb-5">
              <Tabs value={shiftReportTab} onValueChange={(v) => { setShiftReportTab(v); setSelectedHistoryDate(null); }} className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="inline-flex w-auto gap-1 h-auto p-1">
                    <TabsTrigger value="latest" className="flex items-center gap-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Terbaru
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-1.5 text-[11px] sm:text-xs px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      Riwayat
                    </TabsTrigger>
                  </TabsList>
                  
                  {shiftReportTab === "latest" && (() => {
                    // Get latest date from shift reports
                    const latestDate = shiftReports.length > 0 
                      ? new Date(Math.max(...shiftReports.map(r => new Date(r.date).getTime()))).toISOString().split('T')[0]
                      : null;
                    const latestReports = latestDate 
                      ? shiftReports.filter(r => new Date(r.date).toISOString().split('T')[0] === latestDate)
                      : [];
                    
                    return (
                      <p className="text-[10px] text-muted-foreground hidden sm:block">
                        📅 {latestDate ? new Date(latestDate).toLocaleDateString("id-ID", { 
                          weekday: 'short', 
                          day: 'numeric', 
                          month: 'short' 
                        }) : '-'} ({latestReports.length} laporan)
                      </p>
                    );
                  })()}
                </div>
                
                <TabsContent value="latest" className="mt-0">
                  {(() => {
                    // Get latest date from shift reports
                    const latestDate = shiftReports.length > 0 
                      ? new Date(Math.max(...shiftReports.map(r => new Date(r.date).getTime()))).toISOString().split('T')[0]
                      : null;
                    const latestReports = latestDate 
                      ? shiftReports.filter(r => new Date(r.date).toISOString().split('T')[0] === latestDate)
                      : [];
                    
                    if (latestReports.length === 0) {
                      return (
                        <div className="text-center py-10 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                          <p className="text-sm font-medium">Belum ada laporan hari ini</p>
                          <p className="text-xs opacity-70 mt-1">Buat laporan shift baru di tab Report</p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {latestReports.reverse().map((report, index) => (
                          <ShiftReportCard
                            key={report.id}
                            report={report}
                            index={index}
                            total={latestReports.length}
                            onEdit={async (id, data) => {
                              return await updateShiftReport(id, data);
                            }}
                          />
                        ))}
                      </div>
                    );
                  })()}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  {!selectedHistoryDate ? (
                    <div className="space-y-4">
                      {/* Timeline-style history */}
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {getHistoryRecords().map((record, idx) => {
                          // Calculate shift summary
                          const shiftSummary = record.shifts.reduce((acc, s) => {
                            acc[s.shift] = (acc[s.shift] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);
                          
                          return (
                            <motion.div
                              key={record.date}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: idx * 0.03 }}
                              className="group relative rounded-xl bg-card border border-border/60 shadow-sm hover:shadow-lg hover:border-primary/40 cursor-pointer transition-all duration-200 overflow-hidden"
                              onClick={() => setSelectedHistoryDate(record.date)}
                            >
                              {/* Date Header */}
                              <div className="bg-gradient-to-r from-primary/10 to-transparent px-3 py-2 border-b border-border/50">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="text-sm font-semibold text-foreground">
                                      {new Date(record.date).toLocaleDateString("id-ID", { 
                                        weekday: 'short', 
                                        day: 'numeric',
                                        month: 'short'
                                      })}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                    {record.reportCount}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Shift Badges */}
                              <div className="p-3">
                                <div className="flex flex-wrap gap-1.5">
                                  {shiftSummary['pagi'] && (
                                    <span className="text-[10px] px-2 py-1 bg-warning/15 text-warning border border-warning/30 rounded-md font-medium flex items-center gap-1">
                                      🌅 Pagi
                                      {shiftSummary['pagi'] > 1 && <span className="text-[9px] opacity-75">×{shiftSummary['pagi']}</span>}
                                    </span>
                                  )}
                                  {shiftSummary['siang'] && (
                                    <span className="text-[10px] px-2 py-1 bg-primary/15 text-primary border border-primary/30 rounded-md font-medium flex items-center gap-1">
                                      ☀️ Siang
                                      {shiftSummary['siang'] > 1 && <span className="text-[9px] opacity-75">×{shiftSummary['siang']}</span>}
                                    </span>
                                  )}
                                  {shiftSummary['malam'] && (
                                    <span className="text-[10px] px-2 py-1 bg-accent/15 text-accent-foreground border border-accent/30 rounded-md font-medium flex items-center gap-1">
                                      🌙 Malam
                                      {shiftSummary['malam'] > 1 && <span className="text-[9px] opacity-75">×{shiftSummary['malam']}</span>}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-2 group-hover:text-primary transition-colors flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" />
                                  Klik untuk detail
                                </p>
                              </div>
                            </motion.div>
                          );
                        })}
                        {getHistoryRecords().length === 0 && (
                          <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
                            <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
                            <p className="text-sm font-medium">Belum ada riwayat</p>
                            <p className="text-xs opacity-70 mt-1">Laporan akan muncul setelah disimpan</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Back button with date info */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedHistoryDate(null)}
                          className="h-8 text-xs gap-2"
                        >
                          <span>←</span>
                          Kembali ke Riwayat
                        </Button>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10">
                          <Calendar className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-primary">
                            {new Date(selectedHistoryDate).toLocaleDateString("id-ID", { 
                              weekday: 'long', 
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {getReportsForDate(selectedHistoryDate).map((report, index) => (
                          <ShiftReportCard
                            key={report.id}
                            report={report}
                            index={index}
                            total={getReportsForDate(selectedHistoryDate).length}
                            compact
                            onEdit={async (id, data) => {
                              return await updateShiftReport(id, data);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Incidents + Recent Activity Grid */}
      <div className="grid gap-3 grid-cols-1 lg:grid-cols-[1fr_380px] w-full">
      {/* Recent Tickets Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Card className="overflow-hidden border">
          <CardHeader className="py-3 px-3 sm:px-6 border-b bg-muted/20 flex flex-col xs:flex-row xs:items-center justify-between space-y-2 xs:space-y-0">
            <CardTitle className="text-xs sm:text-sm">Recent Incidents</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedConstraint} onValueChange={setSelectedConstraint}>
                <SelectTrigger className="w-[140px] sm:w-[170px] h-7 sm:h-8 text-[10px] sm:text-xs">
                  <SelectValue placeholder="Filter Constraint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Constraint</SelectItem>
                  {ALL_CONSTRAINTS.map((constraint) => (
                    <SelectItem key={constraint} value={constraint}>
                      {constraint}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-1.5 sm:p-2">
            {recentTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada incident
              </p>
            ) : (
              <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[40vh] xs:max-h-[45vh] sm:max-h-[50vh] md:max-h-[55vh] lg:max-h-[60vh]">
                <Table className="min-w-[600px]">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="h-5">
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">🎫 Insident ID</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">📦 Type</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👤 Customer/Type</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👨‍💼 Service ID</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👥 Serpo</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">✍️ Create by</TableHead>
                      <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">⚙️ Status</TableHead>
                      
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="h-6 sm:h-7 cursor-pointer hover:bg-muted/70" onClick={() => setSelectedTicket(ticket)}>
                        <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium">{ticket.id}</TableCell>
                        <TableCell className="px-1 sm:px-1.5 py-0.5">
                          <div>
                            <Badge
                              className={`text-[7px] sm:text-[8px] px-1 py-0 h-3 sm:h-3.5 ${
                                ticket.category === "FEEDER"
                                  ? "bg-warning text-warning-foreground"
                                  : "bg-primary text-primary-foreground"
                              }`}
                            >
                              {ticket.category}
                            </Badge>
                            <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5 truncate max-w-[80px] sm:max-w-none">
                              {ticket.constraint}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">
                          {ticket.category === "FEEDER" ? (
                            ticket.constraint === "OLT DOWN" ? (
                              <span className="font-medium">{ticket.hostname}</span>
                            ) :
                            ticket.constraint === "PORT DOWN" ? (
                              <div>
                                <div className="font-medium text-[9px] sm:text-[10px]">{ticket.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || "PORT"}</div>
                                <div className="text-muted-foreground text-[7px] sm:text-[8px]">{ticket.hostname}</div>
                              </div>
                            ) :
                            ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT BAD RX" ? (
                              <div>
                                <div className="font-medium text-[9px] sm:text-[10px]">{ticket.fatId}</div>
                                <div className="text-muted-foreground text-[7px] sm:text-[8px]">{ticket.hostname}</div>
                              </div>
                            ) : ticket.constraint
                          ) : ticket.customerName}
                        </TableCell>
                        <TableCell className="px-1 sm:px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px]">{ticket.serviceId}</TableCell>
                        <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">{ticket.serpo}</TableCell>
                        <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">
                          <span className="text-muted-foreground">{ticket.createdByName || "-"}</span>
                        </TableCell>
                        <TableCell className="px-1 sm:px-1.5 py-0.5">
                          <div>
                            <StatusBadge status={ticket.status} />
                            <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5">
                              {ticket.createdAt}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {recentTickets.length > 200 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Menampilkan 200 dari {recentTickets.length} insident
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <RecentActivity />
        </motion.div>
      )}
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="w-[95vw] max-w-2xl p-3 sm:p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
               Detail Incident
            </DialogTitle>
          </DialogHeader>
          
          {selectedTicket && (
            <div className="space-y-3">
              {/* Header: ID, Date, Status */}
              <div className="flex items-center justify-between pb-2 border-b">
                <div>
                  <h3 className="text-lg font-bold">{selectedTicket.id}</h3>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedTicket.createdISO).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {selectedTicket.createdByName && (
                      <span className="ml-2 text-muted-foreground">• Create by <span className="font-medium text-foreground">{selectedTicket.createdByName}</span></span>
                    )}
                  </p>
                </div>
                <StatusBadge status={selectedTicket.status} />
              </div>

              {/* Category & Constraint - Inline */}
              <div className="flex gap-2 flex-wrap">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    selectedTicket.category === "FEEDER"
                      ? "bg-warning/20 text-warning"
                      : "bg-primary/20 text-primary"
                  }`}
                >
                  {selectedTicket.category}
                </span>
                <span className="text-xs px-2 py-1 rounded-full font-semibold bg-accent/20 text-accent">
                  {selectedTicket.constraint}
                </span>
              </div>

              {/* Combined Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                 <div className="p-2 bg-muted/30 rounded">
                   <p className="text-muted-foreground mb-0.5">Service ID</p>
                   <p className="font-mono font-medium truncate">{selectedTicket.serviceId}</p>
                 </div>
                 <div className="p-2 bg-muted/30 rounded">
                   <p className="text-muted-foreground mb-0.5">Customer</p>
                   <p className="font-medium truncate">{selectedTicket.customerName || "-"}</p>
                 </div>
                 <div className="p-2 bg-muted/30 rounded">
                   <p className="text-muted-foreground mb-0.5">SERPO</p>
                   <p className="font-medium truncate">{selectedTicket.serpo}</p>
                 </div>
                 <div className="p-2 bg-muted/30 rounded">
                   <p className="text-muted-foreground mb-0.5">Hostname</p>
                   <p className="font-mono font-medium truncate">{selectedTicket.hostname}</p>
                 </div>
                 <div className="p-2 bg-muted/30 rounded">
                   <p className="text-muted-foreground mb-0.5">FAT ID</p>
                   <p className="font-mono font-medium truncate">{selectedTicket.fatId}</p>
                 </div>
                 <div className="p-2 bg-muted/30 rounded">
                   <p className="text-muted-foreground mb-0.5">SN ONT</p>
                   <p className="font-mono font-medium truncate">{selectedTicket.snOnt}</p>
                 </div>
               </div>

              {/* Ticket Result - Compact */}
              <div className="p-2 bg-success/5 rounded border border-success/20">
                <p className="text-xs font-semibold text-success mb-1">Incident Result</p>
                <pre className="text-[10px] whitespace-pre-wrap font-mono bg-background p-2 rounded border max-h-24 overflow-auto">
                  {selectedTicket.ticketResult}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Filter Dialog - Shows tickets by Status or Category or OLT List */}
      <Dialog open={filterDialogOpen} onOpenChange={(open) => {
        setFilterDialogOpen(open);
        if (!open) {
          setPreviousDialogState(null);
          setInlineSelectedTicket(null);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            {(previousDialogState || inlineSelectedTicket) && (
              <button
                onClick={() => {
                  if (inlineSelectedTicket) {
                    setInlineSelectedTicket(null);
                  } else if (previousDialogState) {
                    setShowOltList(previousDialogState.showOltList);
                    setFilterDialogTickets(previousDialogState.tickets);
                    setFilterDialogTitle(previousDialogState.title);
                    setInlineSelectedTicket(previousDialogState.inlineTicket);
                    setPreviousDialogState(null);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-full px-3 py-1 w-fit transition-all duration-200 active:scale-95 mb-1"
              >
                <span className="text-sm">←</span>
                Kembali
              </button>
            )}
            <DialogTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              {inlineSelectedTicket ? `🎫 Detail Incident: ${inlineSelectedTicket.id}` : filterDialogTitle}
              {!inlineSelectedTicket && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({showOltList 
                    ? (() => {
                        const oltMap = new Map<string, number>();
                        tickets.forEach(ticket => {
                          if (ticket.hostname) {
                            oltMap.set(ticket.hostname, (oltMap.get(ticket.hostname) || 0) + 1);
                          }
                        });
                        return oltMap.size;
                      })()
                    : filterDialogTickets.length
                  } item)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-3 flex-1 overflow-auto min-h-0">
            <AnimatePresence mode="wait">
            {inlineSelectedTicket ? (
              /* Inline Ticket Detail View */
              <motion.div
                key="ticket-detail"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4"
              >
                {/* Header Info */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    inlineSelectedTicket.category === "FEEDER"
                      ? "bg-warning/20 text-warning"
                      : "bg-primary/20 text-primary"
                  }`}>
                    {inlineSelectedTicket.category}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-accent/20 text-accent">
                    {inlineSelectedTicket.constraint}
                  </span>
                  <StatusBadge status={inlineSelectedTicket.status} />
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(inlineSelectedTicket.createdISO).toLocaleString("id-ID")}
                    {inlineSelectedTicket.createdByName && (
                      <span className="ml-2">• Create by <span className="font-medium text-foreground">{inlineSelectedTicket.createdByName}</span></span>
                    )}
                  </span>
                </div>

                {/* Detail Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Service ID</p>
                    <p className="font-mono font-medium">{inlineSelectedTicket.serviceId || "-"}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium truncate">{inlineSelectedTicket.customerName || "-"}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">SERPO/Tim</p>
                    <p className="font-medium">{inlineSelectedTicket.serpo}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">Hostname OLT</p>
                    <p className="font-mono text-xs truncate">{inlineSelectedTicket.hostname || "-"}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">ID FAT</p>
                    <p className="font-mono text-xs">{inlineSelectedTicket.fatId || "-"}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50">
                    <p className="text-xs text-muted-foreground">SN ONT</p>
                    <p className="font-mono text-xs">{inlineSelectedTicket.snOnt || "-"}</p>
                  </div>
                </div>

                {/* Ticket Result */}
                <div className="p-3 rounded-lg bg-accent/10 border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Incident Result:</p>
                  <p className="text-sm font-mono whitespace-pre-wrap break-all">{inlineSelectedTicket.ticketResult}</p>
                </div>
              </motion.div>
            ) : showOltList ? (
              /* OLT List View - Compact Cards */
              <motion.div
                key="olt-list"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-2"
              >
                {(() => {
                  const oltMap = new Map<string, number>();
                  tickets.forEach(ticket => {
                    if (ticket.hostname) {
                      oltMap.set(ticket.hostname, (oltMap.get(ticket.hostname) || 0) + 1);
                    }
                  });
                  
                  const uniqueOlts = Array.from(oltMap.entries())
                    .sort((a, b) => b[1] - a[1]); // Sort by count descending
                  
                  return uniqueOlts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Tidak ada data OLT
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {uniqueOlts.map(([hostname, count], index) => (
                        <div 
                          key={hostname} 
                          className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            // Save current state before drilling down
                            setPreviousDialogState({
                              title: filterDialogTitle,
                              tickets: filterDialogTickets,
                              showOltList: true,
                              inlineTicket: null
                            });
                            const oltTickets = tickets.filter(t => t.hostname === hostname);
                            setShowOltList(false);
                            setInlineSelectedTicket(null);
                            setFilterDialogTickets(oltTickets);
                            setFilterDialogTitle(`Incident OLT: ${hostname}`);
                          }}
                        >
                          {/* Row 1: No, Hostname, Count */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs text-muted-foreground flex-shrink-0">{index + 1}.</span>
                              <span className="font-mono font-semibold text-primary text-sm truncate">{hostname}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-lg font-bold text-primary">{count}</span>
                              <span className="text-xs text-muted-foreground">incident</span>
                            </div>
                          </div>
                          
                          {/* Row 2: Additional Info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Klik untuk lihat incident</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-warning/20 text-warning">
                              OLT
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </motion.div>
            ) : (
              /* Ticket List View - Compact Cards */
              filterDialogTickets.length === 0 ? (
                <motion.p
                  key="empty-list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-muted-foreground text-center py-8"
                >
                  Tidak ada incident dalam kategori ini
                </motion.p>
              ) : (
                <motion.div
                  key="ticket-list"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-2"
                >
                  {filterDialogTickets.map((ticket, index) => (
                    <div 
                      key={ticket.id}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setInlineSelectedTicket(ticket);
                      }}
                    >
                      {/* Row 1: No, Ticket ID, Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-muted-foreground flex-shrink-0">{index + 1}.</span>
                          <span className="font-semibold text-primary text-sm truncate">{ticket.id}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium flex-shrink-0">
                            {ticket.constraint}
                          </span>
                        </div>
                        <StatusBadge status={ticket.status} />
                      </div>
                      
                      {/* Row 2: Customer, SERPO, Hostname */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="font-medium truncate max-w-[150px]">
                            {ticket.category === "FEEDER" 
                              ? (ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT LOW RX"
                                  ? `${ticket.fatId}`
                                  : ticket.constraint === "PORT DOWN"
                                    ? (() => {
                                        const match = ticket.ticketResult.match(/PORT - (.+?) - DOWN/);
                                        return match ? match[1] : "PORT";
                                      })()
                                    : ticket.customerName || "-")
                              : (ticket.customerName || "-")
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">SERPO:</span>
                          <span className="font-medium">{ticket.serpo}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">OLT:</span>
                          <span className="font-mono truncate max-w-[120px]">{ticket.hostname}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            ticket.category === "FEEDER"
                              ? "bg-warning/20 text-warning"
                              : "bg-primary/20 text-primary"
                          }`}
                        >
                          {ticket.category}
                        </span>
                        <span className="text-muted-foreground ml-auto flex-shrink-0">
                          {new Date(ticket.createdISO).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )
            )}
            </AnimatePresence>
          </div>
          
          <div className="flex justify-end pt-3 border-t mt-3 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setFilterDialogOpen(false)}>
              Tutup
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
