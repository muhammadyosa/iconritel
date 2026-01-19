import { Activity, AlertTriangle, Zap, Server, Calendar, Clock, User, ExternalLink, TrendingUp, BarChart3, FileText } from "lucide-react";
import { useTickets } from "@/hooks/useTickets";
import { FEEDER_CONSTRAINTS_SET, Ticket, ALL_CONSTRAINTS } from "@/types/ticket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useState, useEffect } from "react";
import { OLT } from "@/types/olt";
import { loadOLTData } from "@/lib/indexedDB";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from "recharts";
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
  const { tickets, excelData } = useTickets();
  const [shiftReports, setShiftReports] = useState<ShiftReport[]>([]);
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
  const [previousDialogState, setPreviousDialogState] = useState<{
    title: string;
    tickets: Ticket[];
    showOltList: boolean;
    inlineTicket: Ticket | null;
  } | null>(null);

  // Load shift reports from localStorage
  useEffect(() => {
    const reports = JSON.parse(localStorage.getItem("shiftReports") || "[]");
    setShiftReports(reports);
  }, []);

  // Load OLT data
  useEffect(() => {
    loadOLTData().then(setOltData).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Error loading OLT data:", error);
      }
    });
  }, []);

  const totalIncidents = tickets.length;
  const overSLA = tickets.filter((t) => {
    const ageMs = new Date().getTime() - new Date(t.createdISO).getTime();
    return ageMs > 24 * 60 * 60 * 1000 && t.status !== "Resolved";
  }).length;
  const feederImpact = tickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
  // Count unique OLT hostnames from tickets (impact)
  const totalOLT = new Set(tickets.map((t) => t.hostname).filter(Boolean)).size || 0;

  const recentTickets = tickets
    .filter((t) => selectedConstraint === "all" || t.constraint === selectedConstraint)
    .slice(0, 10);
  
  const filteredTickets = tickets.filter((ticket) => {
    if (selectedStatus && ticket.status !== selectedStatus) return false;
    if (selectedCategory && ticket.category !== selectedCategory) return false;
    
    // Metric-based filters
    if (selectedMetric === "overSLA") {
      const ageMs = new Date().getTime() - new Date(ticket.createdISO).getTime();
      return ageMs > 24 * 60 * 60 * 1000 && ticket.status !== "Resolved";
    }
    if (selectedMetric === "feeder") {
      return FEEDER_CONSTRAINTS_SET.has(ticket.constraint);
    }
    if (selectedMetric === "total") {
      return true; // Show all tickets
    }
    if (selectedMetric === "olt") {
      return ticket.constraint === "OLT DOWN";
    }
    
    return true;
  });

  return (
    <div className="min-h-screen space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="flex items-center gap-3 mb-2">
          <div>
            <h1 className="text-3xl font-bold">
              🖥️ Dashboard Overview
            </h1>
            <p className="text-muted-foreground text-sm">
              Monitoring incident NOC RITEL
            </p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 w-full">
        {[
          { 
            title: "Total Incident", 
            value: totalIncidents, 
            emoji: "🗃️", 
            metric: "total",
            gradient: "from-blue-500 to-blue-700",
            glowColor: "shadow-blue-500/50"
          },
          { 
            title: "Over SLA (>24h)", 
            value: overSLA, 
            emoji: "⚠️", 
            metric: "overSLA",
            gradient: "from-red-500 to-red-700",
            glowColor: "shadow-red-500/50"
          },
          { 
            title: "Impact OLT", 
            value: totalOLT, 
            emoji: "📟", 
            metric: "olt",
            gradient: "from-green-500 to-emerald-700",
            glowColor: "shadow-green-500/50"
          },
          { 
            title: "Impact Feeder", 
            value: feederImpact, 
            emoji: "⛓️‍💥", 
            metric: "feeder",
            gradient: "from-amber-500 to-orange-600",
            glowColor: "shadow-amber-500/50"
          }
        ].map((card, index) => (
          <motion.div
            key={card.metric}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            onClick={() => {
              let filtered: Ticket[] = [];
              let title = "";
              
              // Reset previous state when opening new dialog
              setPreviousDialogState(null);
              
              if (card.metric === "total") {
                filtered = tickets;
                title = "🗃️ Semua Tiket";
              } else if (card.metric === "overSLA") {
                filtered = tickets.filter((t) => {
                  const ageMs = new Date().getTime() - new Date(t.createdISO).getTime();
                  return ageMs > 24 * 60 * 60 * 1000 && t.status !== "Resolved";
                });
                title = "⚠️ Tiket Over SLA (>24h)";
              } else if (card.metric === "feeder") {
                filtered = tickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint));
                title = "⛓️‍💥 Tiket Impact Feeder";
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
              rounded-2xl border-2 overflow-hidden
              transition-all duration-300
              hover:scale-105 hover:shadow-2xl ${card.glowColor}
              hover:border-primary/50
            `}
          >
            {/* Background Gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
            
            {/* Content */}
            <div className="relative p-3 sm:p-4 md:p-6">
              <div className="flex items-start justify-between mb-2 sm:mb-4">
                <span className="text-2xl sm:text-3xl drop-shadow-lg">{card.emoji}</span>
              </div>
              
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mb-1 truncate">{card.title}</p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">
                  {card.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section - Bar Charts */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2 w-full">
        {/* Status Distribution Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card className="shadow-2xl overflow-hidden border-2 backdrop-blur-lg bg-card/70">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:pt-6">
              {(() => {
                const statusData = [
                  { name: "⚙️ On Progress", value: tickets.filter((t) => t.status === "On Progress").length, fill: "hsl(217, 91%, 60%)", status: "On Progress" },
                  { name: "🚨 Critical", value: tickets.filter((t) => t.status === "Critical").length, fill: "hsl(0, 84%, 60%)", status: "Critical" },
                  { name: "✅ Resolved", value: tickets.filter((t) => t.status === "Resolved").length, fill: "hsl(142, 71%, 45%)", status: "Resolved" },
                  { name: "⏳ Pending", value: tickets.filter((t) => t.status === "Pending").length, fill: "hsl(38, 92%, 50%)", status: "Pending" },
                ];

                const chartConfig: ChartConfig = {
                  value: { label: "Jumlah" },
                };

                return (
                  <ChartContainer config={chartConfig} className="h-[200px] sm:h-[240px] md:h-[280px] w-full transition-all duration-500 ease-out">
                    <BarChart
                      data={statusData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      onClick={(data) => {
                        if (data?.activePayload?.[0]?.payload?.status) {
                          const status = data.activePayload[0].payload.status;
                          setSelectedStatus(selectedStatus === status ? null : status);
                          const filtered = tickets.filter((t) => t.status === status);
                          setPreviousDialogState(null);
                          setShowOltList(false);
                          setFilterDialogTickets(filtered);
                          setFilterDialogTitle(`⚙️ Tiket dengan Status: ${status}`);
                          setFilterDialogOpen(true);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        width={120}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer">
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                );
              })()}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Klik pada bar untuk melihat detail tiket
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Distribution Bar Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card className="shadow-2xl overflow-hidden border-2 backdrop-blur-lg bg-card/70">
            <CardHeader className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Category Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:pt-6">
              {(() => {
                const ritelCount = tickets.filter((t) => t.category === "RITEL").length;
                const feederCount = tickets.filter((t) => t.category === "FEEDER").length;

                const categoryData = [
                  { name: "🏠 RITEL", value: ritelCount, fill: "hsl(217, 91%, 60%)", category: "RITEL" },
                  { name: "🏬 FEEDER", value: feederCount, fill: "hsl(38, 92%, 50%)", category: "FEEDER" },
                ];

                const chartConfig: ChartConfig = {
                  value: { label: "Jumlah" },
                };

                return (
                  <ChartContainer config={chartConfig} className="h-[200px] sm:h-[240px] md:h-[280px] w-full transition-all duration-500 ease-out">
                    <BarChart
                      data={categoryData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                      onClick={(data) => {
                        if (data?.activePayload?.[0]?.payload?.category) {
                          const category = data.activePayload[0].payload.category;
                          setSelectedCategory(selectedCategory === category ? null : category);
                          const filtered = tickets.filter((t) => t.category === category);
                          setPreviousDialogState(null);
                          setShowOltList(false);
                          setFilterDialogTickets(filtered);
                          setFilterDialogTitle(`🏠 Tiket dengan Category: ${category}`);
                          setFilterDialogOpen(true);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis 
                        type="number"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        width={100}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                      />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} cursor="pointer">
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                );
              })()}
              <p className="text-xs text-muted-foreground text-center mt-2">
                Klik pada bar untuk melihat detail tiket
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Shift Reports Section */}
      {shiftReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <Card className="shadow-2xl border-2 bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
            <CardHeader className="border-b border-primary/10">
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-1 bg-primary rounded-full" />
                Laporan Shift Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {shiftReports.slice(-3).reverse().map((report) => (
                  <div
                    key={report.id}
                    className="p-4 rounded-lg bg-card border border-primary/10 shadow-sm hover:shadow-md transition-all hover:border-primary/30"
                  >
                    <div className="space-y-2 mb-4 pb-3 border-b border-border/50">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-semibold text-xs">
                          {new Date(report.date).toLocaleDateString("id-ID", { 
                            weekday: 'short', 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span className="font-medium capitalize px-2 py-0.5 bg-primary/10 rounded-md">
                            Shift {report.shift}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <User className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                          <span className="font-medium truncate max-w-[100px]">{report.officer}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {report.oltDown && (
                        <div className="bg-destructive/5 p-3 rounded-lg border border-destructive/20">
                          <div className="text-xs font-bold text-destructive mb-2 flex items-center gap-1">
                            📡 LAPORAN OLT DOWN
                          </div>
                          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                            {report.oltDown}
                          </pre>
                        </div>
                      )}
                      
                      {report.portDown && (
                        <div className="bg-warning/5 p-3 rounded-lg border border-warning/20">
                          <div className="text-xs font-bold text-warning mb-2 flex items-center gap-1">
                            🔌 LAPORAN PORT DOWN
                          </div>
                          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                            {report.portDown}
                          </pre>
                        </div>
                      )}
                      
                      {report.fatLoss && (
                        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
                          <div className="text-xs font-bold text-primary mb-2 flex items-center gap-1">
                            📊 LAPORAN FAT LOSS
                          </div>
                          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                            {report.fatLoss}
                          </pre>
                        </div>
                      )}

                      {report.issues && (
                        <div className="bg-accent/5 p-3 rounded-lg border border-accent/20">
                          <div className="text-xs font-bold text-accent mb-2 flex items-center gap-1">
                            ⚠️ PERMASALAHAN
                          </div>
                          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                            {report.issues}
                          </pre>
                        </div>
                      )}

                      {report.notes && (
                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                          <div className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                            📝 CATATAN
                          </div>
                          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-muted-foreground">
                            {report.notes}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Tickets Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
      >
        <Card className="shadow-2xl border-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Recent Tickets</CardTitle>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedConstraint} onValueChange={setSelectedConstraint}>
                <SelectTrigger className="w-[180px] h-9">
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
          <CardContent>
            <div className="space-y-3">
              {recentTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Belum ada tiket
                </p>
              ) : (
                <div className="rounded-md border overflow-auto max-h-80">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-7">
                        <TableHead className="px-2 py-1 text-[11px]">Ticket ID</TableHead>
                        <TableHead className="px-2 py-1 text-[11px]">Type</TableHead>
                        <TableHead className="px-2 py-1 text-[11px]">Customer/Type</TableHead>
                        <TableHead className="px-2 py-1 text-[11px]">Service ID</TableHead>
                        <TableHead className="px-2 py-1 text-[11px]">Serpo</TableHead>
                        <TableHead className="px-2 py-1 text-[11px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTickets.map((ticket) => (
                        <TableRow 
                          key={ticket.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors h-9"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <TableCell className="px-2 py-1 text-[11px] font-medium">{ticket.id}</TableCell>
                          <TableCell className="px-2 py-1">
                            <div>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                                  ticket.category === "FEEDER"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-primary text-primary-foreground"
                                }`}
                              >
                                {ticket.category}
                              </span>
                              <div className="text-[9px] text-muted-foreground mt-0.5">
                                {ticket.constraint}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            {ticket.category === "FEEDER" ? (
                              ticket.constraint === "OLT DOWN" ? (
                                <span className="text-[11px] font-medium">{ticket.hostname}</span>
                              ) :
                              ticket.constraint === "PORT DOWN" ? (
                                <div className="text-[11px]">
                                  <div className="font-medium">{ticket.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || "PORT INFO"}</div>
                                  <div className="text-muted-foreground text-[9px]">{ticket.hostname}</div>
                                </div>
                              ) :
                              ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT LOW RX" ? (
                                <div className="text-[11px]">
                                  <div className="font-medium">{ticket.fatId}</div>
                                  <div className="text-muted-foreground text-[9px]">{ticket.hostname}</div>
                                </div>
                              ) : (
                                <span className="text-[11px] font-medium">{ticket.constraint}</span>
                              )
                            ) : (
                              <span className="text-[11px] font-medium">{ticket.customerName || "-"}</span>
                            )}
                          </TableCell>
                          <TableCell className="px-2 py-1 font-mono text-[11px]">{ticket.serviceId}</TableCell>
                          <TableCell className="px-2 py-1 text-[11px]">{ticket.serpo}</TableCell>
                          <TableCell className="px-2 py-1">
                            <div>
                              <StatusBadge status={ticket.status} />
                              <div className="text-[9px] text-muted-foreground mt-0.5">
                                {new Date(ticket.createdISO).toLocaleString("id-ID", {
                                  day: "numeric",
                                  month: "numeric",
                                  year: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Ticket Detail Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Detail Tiket
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
              <div className="grid grid-cols-3 gap-2 text-xs">
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
                <p className="text-xs font-semibold text-success mb-1">Ticket Result</p>
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
            <DialogTitle 
              className={`flex items-center gap-2 text-lg ${(previousDialogState || inlineSelectedTicket) ? "cursor-pointer hover:text-primary transition-colors" : ""}`}
              onClick={() => {
                if (inlineSelectedTicket) {
                  // Go back from ticket detail to ticket list
                  setInlineSelectedTicket(null);
                } else if (previousDialogState) {
                  setShowOltList(previousDialogState.showOltList);
                  setFilterDialogTickets(previousDialogState.tickets);
                  setFilterDialogTitle(previousDialogState.title);
                  setInlineSelectedTicket(previousDialogState.inlineTicket);
                  setPreviousDialogState(null);
                }
              }}
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              {(previousDialogState || inlineSelectedTicket) && (
                <span className="text-muted-foreground hover:text-primary">←</span>
              )}
              {inlineSelectedTicket ? `🎫 Detail Tiket: ${inlineSelectedTicket.id}` : filterDialogTitle}
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
            {inlineSelectedTicket ? (
              /* Inline Ticket Detail View */
              <div className="space-y-4">
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
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Ticket Result:</p>
                  <p className="text-sm font-mono whitespace-pre-wrap break-all">{inlineSelectedTicket.ticketResult}</p>
                </div>
              </div>
            ) : showOltList ? (
              /* OLT List View - Compact Cards */
              <div className="space-y-2">
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
                            setFilterDialogTitle(`Tiket OLT: ${hostname}`);
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
                              <span className="text-xs text-muted-foreground">tiket</span>
                            </div>
                          </div>
                          
                          {/* Row 2: Additional Info */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Klik untuk lihat tiket</span>
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
              </div>
            ) : (
              /* Ticket List View - Compact Cards */
              filterDialogTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Tidak ada tiket dalam kategori ini
                </p>
              ) : (
                <div className="space-y-2">
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
                </div>
              )
            )}
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
