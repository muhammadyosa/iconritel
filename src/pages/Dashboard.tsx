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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell, LineChart, Line, PieChart, Pie, Cell as RechartsCell, AreaChart, Area } from "recharts";
import { Checkbox } from "@/components/ui/checkbox";
import { loadDefaultRegionalTeamData, subscribeRegionalTeamUpdates } from "@/lib/defaultRegionalData";

import { DashboardTierOverSLA } from "@/components/DashboardTierOverSLA";
import { SectionInfoDialog, buildInsight, type InfoSection, type InfoMetric } from "@/components/SectionInfoDialog";
import { RegionalTeamRecord } from "@/types/regionalTeam";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShiftReportCard } from "@/components/ShiftReportCard";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { toLocalDateStr } from "@/lib/dateUtils";
import { isOverSlaUnresolved } from "@/lib/sla";
import { toast } from "sonner";

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
  const { tickets, isLoading: isLoadingTickets, refetch: refetchTickets } = useCloudTickets();
  const { isAdmin } = useUserRole();
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
  const [trendFilter, setTrendFilter] = useState<string>("month");
  const [statusAnalysisPeriod, setStatusAnalysisPeriod] = useState<"today" | "week" | "month" | "all">("month");
  const [trendCustomDate, setTrendCustomDate] = useState<string>(() => toLocalDateStr(new Date()));
  const [trendSeries, setTrendSeries] = useState<{ ritel: boolean; feeder: boolean; created: boolean }>({ ritel: true, feeder: true, created: false });
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
  const [teamData, setTeamData] = useState<RegionalTeamRecord[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [regionStatusFilter, setRegionStatusFilter] = useState<string>("all");
  const [regionProportionOpen, setRegionProportionOpen] = useState(false);

  // Controlled open-state for each SectionInfoDialog so we can reopen them via "Kembali ke ringkasan"
  const [regionalInfoOpen, setRegionalInfoOpen] = useState(false);
  const [ritelInfoOpen, setRitelInfoOpen] = useState(false);
  const [feederInfoOpen, setFeederInfoOpen] = useState(false);
  const [overSlaInfoOpen, setOverSlaInfoOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetchTickets();
      toast.success("✅ Data dashboard diperbarui", {
        description: "KPI, Trend Chart, dan Monthly Analysis telah disinkronkan ulang.",
      });
    } catch (err) {
      toast.error("Gagal memperbarui data", {
        description: err instanceof Error ? err.message : "Coba lagi sebentar.",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // When a metric inside a SectionInfoDialog is clicked, the section dialog closes and the
  // filter dialog opens. We remember a "return" callback so the user can jump back to the
  // originating ringkasan dialog with one click.
  const [infoReturn, setInfoReturn] = useState<{ label: string; run: () => void } | null>(null);

  // Helper: open the existing filter dialog with a filtered subset of incidents.
  // Used by clickable metrics inside SectionInfoDialog across all dashboard cards.
  const openIncidentList = (
    title: string,
    list: Ticket[],
    returnTo?: { label: string; run: () => void } | null,
  ) => {
    setShowOltList(false);
    setInlineSelectedTicket(null);
    setPreviousDialogState(null);
    setFilterDialogTickets(list);
    setFilterDialogTitle(title);
    setInfoReturn(returnTo ?? null);
    setFilterDialogOpen(true);
  };

  // Load OLT data
  useEffect(() => {
    loadOLTData().then(setOltData).catch((error) => {
      if (import.meta.env.DEV) {
        console.error("Error loading OLT data:", error);
      }
    });
  }, []);

  // Load Regional Team data (and refresh whenever admin uploads a new file)
  useEffect(() => {
    const reload = () => loadDefaultRegionalTeamData().then(setTeamData).catch(() => {});
    reload();
    return subscribeRegionalTeamUpdates(reload);
  }, []);

  // Hostname to Region mapping
  const hostnameToRegionMap = useMemo(() => {
    const map: Record<string, string> = {};
    teamData.forEach((rec) => {
      const region = rec.region.trim().toUpperCase();
      if (!region) return;
      rec.hostnames.forEach((h) => {
        const normalized = h.trim().toUpperCase();
        if (normalized) map[normalized] = region;
      });
    });
    return map;
  }, [teamData]);

  const getTicketRegion = useMemo(() => {
    return (serpo: string) => {
      // Try matching hostname from tickets
      const ticket = tickets.find(t => t.serpo === serpo);
      const hostname = ticket?.hostname || serpo;
      return hostnameToRegionMap[hostname.trim().toUpperCase()] || "-";
    };
  }, [hostnameToRegionMap, tickets]);

  // Regional incident data for pie chart and stats
  const regionalIncidentData = useMemo(() => {
    const regionMap: Record<string, RegionalTeamRecord[]> = {};
    teamData.forEach((rec) => {
      const region = rec.region.trim().toUpperCase();
      if (!region) return;
      if (!regionMap[region]) regionMap[region] = [];
      regionMap[region].push(rec);
    });

    const regionStats: Record<string, { total: number; resolved: number; pending: number; critical: number; ritel: number; feeder: number }> = {};
    Object.keys(regionMap).forEach((region) => {
      regionStats[region] = { total: 0, resolved: 0, pending: 0, critical: 0, ritel: 0, feeder: 0 };
    });

    tickets.forEach((ticket) => {
      const region = hostnameToRegionMap[(ticket.hostname || "").trim().toUpperCase()];
      if (!region || !regionStats[region]) return;
      regionStats[region].total++;
      if (ticket.status === "Resolved") regionStats[region].resolved++;
      else if (ticket.status === "Critical") regionStats[region].critical++;
      else regionStats[region].pending++;
      if (FEEDER_CONSTRAINTS_SET.has(ticket.constraint)) regionStats[region].feeder++;
      else regionStats[region].ritel++;
    });

    return Object.entries(regionStats)
      .filter(([, s]) => s.total > 0)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([region, stats]) => ({ region, ...stats }));
  }, [teamData, tickets, hostnameToRegionMap]);

  // Tickets for selected region
  const selectedRegionTickets = useMemo(() => {
    if (!selectedRegion) return [];
    return tickets.filter(t => {
      const region = hostnameToRegionMap[(t.hostname || "").trim().toUpperCase()];
      return region === selectedRegion;
    });
  }, [selectedRegion, tickets, hostnameToRegionMap]);

  const ritelTickets = useMemo(() => tickets.filter(t => !FEEDER_CONSTRAINTS_SET.has(t.constraint)), [tickets]);
  const feederTickets = useMemo(() => tickets.filter(t => FEEDER_CONSTRAINTS_SET.has(t.constraint)), [tickets]);

  const totalIncidents = tickets.length;
  const resolvedCount = useMemo(() => tickets.filter(t => t.status === "Resolved").length, [tickets]);
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 0;
  const todayStr = useMemo(() => toLocalDateStr(new Date()), []);
  const todayCreated = useMemo(() => tickets.filter(t => toLocalDateStr(new Date(t.createdISO)) === todayStr).length, [tickets, todayStr]);
  const todayResolved = useMemo(() => tickets.filter(t => t.status === "Resolved" && t.resolvedAt && toLocalDateStr(new Date(t.resolvedAt)) === todayStr).length, [tickets, todayStr]);
  const overSLA = useMemo(() => tickets.filter(isOverSlaUnresolved).length, [tickets]);
  const feederImpact = useMemo(() => tickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length, [tickets]);
  const totalOLT = useMemo(() => new Set(tickets.map((t) => t.hostname).filter(Boolean)).size || 0, [tickets]);
  const activeIncidents = useMemo(() => tickets.filter(t => t.status !== "Resolved").length, [tickets]);

  const recentTickets = useMemo(() => tickets
    .filter((t) => selectedConstraint === "all" || t.constraint === selectedConstraint)
    .slice(0, 10), [tickets, selectedConstraint]);
  
  const filteredTickets = useMemo(() => tickets.filter((ticket) => {
    if (selectedStatus && ticket.status !== selectedStatus) return false;
    if (selectedCategory && ticket.category !== selectedCategory) return false;
    
    if (selectedMetric === "overSLA") {
      return isOverSlaUnresolved(ticket);
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
    <div className="space-y-5 sm:space-y-6 w-full max-w-full overflow-x-hidden min-w-0">
      {/* Header Section — judul + quick stats inline */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">
              🖥️ Dashboard Overview
            </h1>
            <p className="text-muted-foreground text-[11px] sm:text-sm mt-0.5">
              Monitoring incident NOC RITEL
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="shrink-0 gap-1.5 h-8 px-2.5 sm:px-3 text-[11px] sm:text-xs"
            aria-label="Refresh data dashboard"
            title="Refresh KPI, Trend Chart & Monthly Analysis"
          >
            {isRefreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{isRefreshing ? "Memuat..." : "Refresh"}</span>
          </Button>
        </div>

        {/* Quick stats hari ini — pindah dari banner terpisah ke header */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 py-2 rounded-lg bg-muted/40 border border-border/50">
          <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">📅 Hari ini</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-primary font-bold tabular-nums">+{todayCreated}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">dibuat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] sm:text-xs text-success font-bold tabular-nums">+{todayResolved}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">resolved</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] sm:text-xs font-bold text-foreground tabular-nums">{resolutionRate}%</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolution Rate</span>
          </div>
        </div>
      </motion.div>

      {/* Section: Ringkasan KPI */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">📊 Ringkasan KPI</h2>
          <div className="flex-1 h-px bg-border/60" />
        </div>
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
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]",
            sub: `✅ ${resolvedCount} resolved · 🔄 ${activeIncidents} aktif`,
            progress: resolutionRate,
            progressColor: "bg-primary",
          },
          { 
            title: "Over SLA (>24h)", 
            value: overSLA, 
            emoji: "⚠️", 
            metric: "overSLA",
            bgClass: "bg-destructive/8 hover:bg-destructive/15",
            borderClass: "border-destructive/30 hover:border-destructive/50",
            valueClass: "text-destructive",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.4)]",
            sub: totalIncidents > 0 ? `${Math.round((overSLA / totalIncidents) * 100)}% dari total` : "0%",
            progress: totalIncidents > 0 ? Math.round((overSLA / totalIncidents) * 100) : 0,
            progressColor: "bg-destructive",
          },
          { 
            title: "Impact OLT", 
            value: totalOLT, 
            emoji: "📟", 
            metric: "olt",
            bgClass: "bg-success/8 hover:bg-success/15",
            borderClass: "border-success/30 hover:border-success/50",
            valueClass: "text-success",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--success)/0.4)]",
            sub: `📡 ${totalOLT} OLT terdampak`,
            progress: null as number | null,
            progressColor: "bg-success",
          },
          { 
            title: "Impact Feeder", 
            value: feederImpact, 
            emoji: "⛓️‍💥", 
            metric: "feeder",
            bgClass: "bg-warning/8 hover:bg-warning/15",
            borderClass: "border-warning/30 hover:border-warning/50",
            valueClass: "text-warning",
            glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--warning)/0.4)]",
            sub: totalIncidents > 0 ? `${Math.round((feederImpact / totalIncidents) * 100)}% dari total` : "0%",
            progress: totalIncidents > 0 ? Math.round((feederImpact / totalIncidents) * 100) : 0,
            progressColor: "bg-warning",
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
                filtered = tickets.filter(isOverSlaUnresolved);
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
            <div className="p-3 sm:p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg sm:text-xl">{card.emoji}</span>
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{card.title}</p>
                </div>
                <p className={`text-2xl sm:text-3xl font-bold shrink-0 tabular-nums ${card.valueClass}`}>
                  {card.value}
                </p>
              </div>
              {/* Sub info */}
              <p className="text-[8px] sm:text-[9px] text-muted-foreground/80 truncate">{card.sub}</p>
              {/* Mini progress bar */}
              {card.progress !== null && (
                <div className="w-full h-1 rounded-full bg-muted/60 overflow-hidden">
                  <motion.div 
                    className={`h-full rounded-full ${card.progressColor}/60`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(card.progress, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.3 + index * 0.1 }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      </section>

      {/* Section: Tren & Distribusi */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">📈 Tren & Distribusi</h2>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      <div className="grid gap-2 sm:gap-3 grid-cols-1 lg:grid-cols-2 w-full">
        {/* Status Distribution — Arc Gauge (Current Statistic style) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="lg:col-span-1 h-full"
        >
          <Card className="overflow-hidden border h-full flex flex-col">
            <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                  Status Distribution
                </CardTitle>
                <div className="flex items-center gap-0.5 bg-muted/40 rounded-md p-0.5">
                  {[
                    { key: "today" as const, label: "Hari Ini" },
                    { key: "week" as const, label: "Minggu Ini" },
                    { key: "month" as const, label: "Bulan Ini" },
                    { key: "all" as const, label: "Semua" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setStatusAnalysisPeriod(opt.key)}
                      className={`text-[9px] px-1.5 py-0.5 rounded transition-colors ${
                        statusAnalysisPeriod === opt.key
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-2.5">
              {(() => {
                const statusData = [
                  { emoji: "⚙️", label: "Progres", value: tickets.filter((t) => t.status === "On Progress").length, color: "hsl(217, 91%, 60%)", status: "On Progress" as const },
                  { emoji: "🚨", label: "Critical", value: tickets.filter((t) => t.status === "Critical").length, color: "hsl(0, 84%, 60%)", status: "Critical" as const },
                  { emoji: "✅", label: "Resolved", value: tickets.filter((t) => t.status === "Resolved").length, color: "hsl(142, 71%, 45%)", status: "Resolved" as const },
                  { emoji: "⏳", label: "Pending", value: tickets.filter((t) => t.status === "Pending").length, color: "hsl(38, 92%, 50%)", status: "Pending" as const },
                ];
                const total = statusData.reduce((s, d) => s + d.value, 0) || 1;
                const openStatus = (status: string) => {
                  setSelectedStatus(selectedStatus === status ? null : status);
                  const filtered = tickets.filter((t) => t.status === status);
                  setPreviousDialogState(null);
                  setShowOltList(false);
                  setFilterDialogTickets(filtered);
                  setFilterDialogTitle(`⚙️ Incident dengan Status: ${status}`);
                  setFilterDialogOpen(true);
                };

                // Build concentric semi-circular arcs
                 // viewBox padded to fit round stroke caps without clipping
                 const cx = 110, cy = 110;
                 const radii = [88, 72, 56, 40];
                 const stroke = 10;
                 const gap = 0.012; // small angular inset so caps don't touch baseline
                 const arcPath = (r: number, pct: number) => {
                   const clamped = Math.max(0, Math.min(1, pct));
                   if (clamped <= 0) return "";
                   const startA = Math.PI - gap;
                   const endA = Math.PI - (Math.PI - gap * 2) * clamped - gap + gap; // simplified below
                   const sweep = (Math.PI - gap * 2) * clamped;
                   const a1 = Math.PI - gap;
                   const a2 = a1 - sweep;
                   const x1 = cx + r * Math.cos(a1);
                   const y1 = cy - r * Math.sin(a1);
                   const x2 = cx + r * Math.cos(a2);
                   const y2 = cy - r * Math.sin(a2);
                   const large = sweep > Math.PI ? 1 : 0;
                   return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
                 };
                 const fullArc = (r: number) => {
                   const a1 = Math.PI - gap;
                   const a2 = gap;
                   const x1 = cx + r * Math.cos(a1);
                   const y1 = cy - r * Math.sin(a1);
                   const x2 = cx + r * Math.cos(a2);
                   const y2 = cy - r * Math.sin(a2);
                   return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
                 };

                 return (
                   <div className="flex flex-col gap-1 flex-1 justify-center">
                     <div className="flex flex-row items-center gap-2 sm:gap-3 flex-1">
                       {/* Arc visual */}
                       <div className="flex items-center justify-center shrink-0 flex-1">
                         <svg viewBox="0 0 220 125" className="w-full max-w-[260px] sm:max-w-[300px] h-auto overflow-visible">
                           {statusData.map((d, i) => (
                             <path
                               key={`bg-${d.label}`}
                               d={fullArc(radii[i])}
                               fill="none"
                               stroke="hsl(var(--muted))"
                               strokeOpacity={0.3}
                               strokeWidth={stroke}
                               strokeLinecap="round"
                             />
                           ))}
                           {statusData.map((d, i) => {
                             const pct = d.value / total;
                             if (pct <= 0) return null;
                             return (
                               <path
                                 key={`fg-${d.label}`}
                                 d={arcPath(radii[i], pct)}
                                 fill="none"
                                 stroke={d.color}
                                 strokeWidth={stroke}
                                 strokeLinecap="round"
                                 className="cursor-pointer transition-opacity hover:opacity-80"
                                 onClick={() => openStatus(d.status)}
                               >
                                 <title>{`${d.label}: ${d.value} (${Math.round(pct * 100)}%)`}</title>
                               </path>
                             );
                           })}
                         </svg>
                       </div>

                      {/* Legend list — narrow, number on left */}
                      <div className="shrink-0 w-[150px] sm:w-[170px] space-y-0.5">
                        {statusData.map((d) => {
                          const pct = Math.round((d.value / total) * 100);
                          return (
                            <button
                              key={d.label}
                              onClick={() => openStatus(d.status)}
                              className="w-full flex items-center gap-1.5 px-1 py-0.5 rounded-md hover:bg-muted/40 transition-colors text-left"
                            >
                              <span className="w-7 text-[11px] sm:text-xs font-bold tabular-nums text-right">
                                {d.value.toLocaleString("id-ID")}
                              </span>
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: d.color }}
                              />
                              <span className="text-[10px] sm:text-[11px] font-medium flex items-center gap-1 min-w-0">
                                <span>{d.emoji}</span>
                                <span className="truncate">{d.label}</span>
                                <span className="text-muted-foreground">({pct}%)</span>
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {(() => {
                      // Filter tickets by selected period for the analysis section
                      const now = new Date();
                      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                      const startOfWeek = startOfDay - ((now.getDay() + 6) % 7) * 86400000; // Monday
                      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                      const periodStart =
                        statusAnalysisPeriod === "today"
                          ? startOfDay
                          : statusAnalysisPeriod === "week"
                          ? startOfWeek
                          : statusAnalysisPeriod === "month"
                          ? startOfMonth
                          : 0;
                      const periodTickets =
                        statusAnalysisPeriod === "all"
                          ? tickets
                          : tickets.filter((t) => {
                              const ts = t.createdISO ? new Date(t.createdISO).getTime() : NaN;
                              return !isNaN(ts) && ts >= periodStart;
                            });
                      const periodCounts = {
                        "On Progress": periodTickets.filter((t) => t.status === "On Progress").length,
                        Critical: periodTickets.filter((t) => t.status === "Critical").length,
                        Resolved: periodTickets.filter((t) => t.status === "Resolved").length,
                        Pending: periodTickets.filter((t) => t.status === "Pending").length,
                      };
                      const periodData = statusData.map((d) => ({
                        ...d,
                        value: periodCounts[d.status as keyof typeof periodCounts],
                      }));
                      const totalReal = periodData.reduce((s, d) => s + d.value, 0);
                      if (totalReal === 0) {
                        return (
                          <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                            <p className="text-[10px] text-muted-foreground text-center py-1">
                              Belum ada incident pada periode ini
                            </p>
                          </div>
                        );
                      }

                      const sorted = [...periodData].sort((a, b) => b.value - a.value);
                      const top = sorted[0];
                      const topPct = Math.round((top.value / totalReal) * 100);
                      const resolved = periodData.find((d) => d.status === "Resolved")!;
                      const critical = periodData.find((d) => d.status === "Critical")!;
                      const resolvedPct = Math.round((resolved.value / totalReal) * 100);
                      const criticalPct = Math.round((critical.value / totalReal) * 100);
                      const health =
                        criticalPct >= 30
                          ? { label: "Kritis", color: "text-destructive", emoji: "🚨" }
                          : resolvedPct >= 60
                          ? { label: "Sehat", color: "text-success", emoji: "✅" }
                          : { label: "Perlu Perhatian", color: "text-warning", emoji: "⚠️" };

                      return (
                        <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5">
                          <div className="flex items-center justify-end px-1">
                            <span className={`text-[10px] font-bold ${health.color} flex items-center gap-1`}>
                              <span>{health.emoji}</span>
                              <span>{health.label}</span>
                            </span>
                          </div>
                          <p className="text-[10px] leading-relaxed text-muted-foreground px-1">
                            Status dominan{" "}
                            <span className="font-semibold text-foreground">
                              {top.emoji} {top.label}
                            </span>{" "}
                            ({topPct}%). Tingkat penyelesaian{" "}
                            <span className="font-semibold text-success">{resolvedPct}%</span> dan kritis{" "}
                            <span className="font-semibold text-destructive">{criticalPct}%</span> dari total{" "}
                            <span className="font-semibold text-foreground">{totalReal.toLocaleString("id-ID")}</span> incident.
                          </p>
                          <p className="text-[9px] text-muted-foreground text-center pt-0.5">
                            Klik baris untuk detail
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Category Trend — Market Overview style (Area chart + series toggles) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="h-full"
        >
          <Card className="overflow-hidden border h-full">
            <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex flex-col">
                  <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                    <TrendingUp className="h-4 w-4 text-accent" />
                    Category Trend
                  </CardTitle>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    Tren harian RITEL, FEEDER & Insident
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Series toggles */}
                  <div className="flex items-center gap-2 sm:gap-3">
                    {[
                      { key: "ritel" as const, label: "🏠 RITEL", color: "hsl(217, 91%, 60%)" },
                      { key: "feeder" as const, label: "🏬 FEEDER", color: "hsl(38, 92%, 50%)" },
                      { key: "created" as const, label: "📥 Insident", color: "hsl(262, 83%, 58%)" },
                    ].map((s) => (
                      <label key={s.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <Checkbox
                          checked={trendSeries[s.key]}
                          onCheckedChange={(v) =>
                            setTrendSeries((prev) => ({ ...prev, [s.key]: !!v }))
                          }
                          className="h-3.5 w-3.5"
                          style={{
                            borderColor: trendSeries[s.key] ? s.color : undefined,
                            backgroundColor: trendSeries[s.key] ? s.color : undefined,
                          }}
                        />
                        <span className="text-[10px] sm:text-[11px] font-medium">{s.label}</span>
                      </label>
                    ))}
                  </div>
                  <Select value={trendFilter} onValueChange={setTrendFilter}>
                    <SelectTrigger className="w-[110px] sm:w-[130px] h-7 text-[10px] sm:text-xs rounded-full">
                      <SelectValue placeholder="Rentang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Hari ini</SelectItem>
                      <SelectItem value="month">Bulan Ini</SelectItem>
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
                const toLocalDateStrInner = (d: Date) => {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, "0");
                  const day = String(d.getDate()).padStart(2, "0");
                  return `${y}-${m}-${day}`;
                };
                const ticketLocalDate = (t: Ticket) => toLocalDateStrInner(new Date(t.createdISO));

                const rowFor = (isoDate: string, displayDate: string) => {
                  const dayTickets = tickets.filter((t) => ticketLocalDate(t) === isoDate);
                  const ritel = dayTickets.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
                  const feeder = dayTickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
                  const inProgress = dayTickets.filter((t) => t.status === "On Progress" || t.status === "Critical" || t.status === "Pending").length;
                  const resolved = dayTickets.filter((t) => t.status === "Resolved").length;
                  return { date: displayDate, isoDate, ritel, feeder, total: dayTickets.length, created: dayTickets.length, inProgress, resolved };
                };

                const buildRange = (days: number) => {
                  const todayLocal = new Date();
                  todayLocal.setHours(0, 0, 0, 0);
                  const historyMap = new Map(
                    (getChartData(days) || []).map((r) => [r.isoDate, r])
                  );
                  const out: ReturnType<typeof rowFor>[] = [];
                  for (let i = days - 1; i >= 0; i--) {
                    const d = new Date(todayLocal);
                    d.setDate(d.getDate() - i);
                    const isoDate = toLocalDateStrInner(d);
                    const displayDate = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
                    const live = rowFor(isoDate, displayDate);
                    const hist = historyMap.get(isoDate);
                    if (hist) {
                      out.push({
                        date: displayDate,
                        isoDate,
                        ritel: Math.max(live.ritel, hist.ritel || 0),
                        feeder: Math.max(live.feeder, hist.feeder || 0),
                        total: Math.max(live.total, hist.total || 0),
                        created: Math.max(live.created, hist.created || 0),
                        inProgress: Math.max(live.inProgress, hist.inProgress || 0),
                        resolved: Math.max(live.resolved, hist.resolved || 0),
                      });
                    } else {
                      out.push(live);
                    }
                  }
                  return out;
                };

                let chartData: ReturnType<typeof rowFor>[] = [];

                if (trendFilter === "today") {
                  const today = new Date();
                  chartData = [rowFor(toLocalDateStrInner(today), today.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }))];
                } else if (trendFilter === "custom") {
                  const [yy, mm, dd] = trendCustomDate.split("-").map(Number);
                  const customD = new Date(yy, (mm || 1) - 1, dd || 1);
                  chartData = [rowFor(trendCustomDate, customD.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }))];
                } else if (trendFilter === "month") {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const days = today.getDate();
                  chartData = buildRange(days);
                } else if (trendFilter === "all") {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  let earliest = today;
                  tickets.forEach((t) => {
                    const td = new Date(t.createdISO);
                    td.setHours(0, 0, 0, 0);
                    if (td < earliest) earliest = td;
                  });
                  const days = Math.max(1, Math.round((today.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000)) + 1);
                  chartData = buildRange(Math.min(days, 90));
                } else {
                  const days = Number(trendFilter) || 7;
                  chartData = buildRange(days);
                }

                const numDays = chartData.length;

                const chartConfig: ChartConfig = {
                  ritel: { label: "🏠 RITEL", color: "hsl(217, 91%, 60%)" },
                  feeder: { label: "🏬 FEEDER", color: "hsl(38, 92%, 50%)" },
                  created: { label: "📥 Insident", color: "hsl(262, 83%, 58%)" },
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
                  setFilterDialogTitle(`📥 Insident - ${displayDate}`);
                  setFilterDialogOpen(true);
                };

                return (
                  <ChartContainer config={chartConfig} className="h-[120px] sm:h-[140px] md:h-[160px] w-full transition-all duration-300">
                    <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id="grad-ritel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-feeder" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        interval={numDays > 14 ? 3 : numDays > 7 ? 1 : 0}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        width={28}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {trendSeries.ritel && (
                        <Area
                          type="monotone"
                          dataKey="ritel"
                          stroke="hsl(217, 91%, 60%)"
                          strokeWidth={2.5}
                          fill="url(#grad-ritel)"
                          dot={false}
                          activeDot={{
                            r: 6, strokeWidth: 2, cursor: "pointer",
                            onClick: (_: any, payload: any) => {
                              if (payload?.payload) handleDotClick("RITEL", payload.payload.isoDate, payload.payload.date);
                            },
                          }}
                          name="🏠 RITEL"
                        />
                      )}
                      {trendSeries.feeder && (
                        <Area
                          type="monotone"
                          dataKey="feeder"
                          stroke="hsl(38, 92%, 50%)"
                          strokeWidth={2.5}
                          fill="url(#grad-feeder)"
                          dot={false}
                          activeDot={{
                            r: 6, strokeWidth: 2, cursor: "pointer",
                            onClick: (_: any, payload: any) => {
                              if (payload?.payload) handleDotClick("FEEDER", payload.payload.isoDate, payload.payload.date);
                            },
                          }}
                          name="🏬 FEEDER"
                        />
                      )}
                      {trendSeries.created && (
                        <Area
                          type="monotone"
                          dataKey="created"
                          stroke="hsl(262, 83%, 58%)"
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          fill="url(#grad-created)"
                          dot={false}
                          activeDot={{
                            r: 6, strokeWidth: 2, cursor: "pointer",
                            onClick: (_: any, payload: any) => {
                              if (payload?.payload) handleStatusDotClick(payload.payload.isoDate, payload.payload.date);
                            },
                          }}
                          name="📥 Insident"
                        />
                      )}
                    </AreaChart>
                  </ChartContainer>
                );
              })()}
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Klik titik untuk detail • Centang seri untuk menampilkan/menyembunyikan
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      </section>

      {/* Section: Analitik Bulanan */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">🗓️ Analitik Bulanan</h2>
          <div className="flex-1 h-px bg-border/60" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <MonthlyAnalytics tickets={tickets} getTrendChartData={getTrendChartData} getCategoryData={getCategoryData} />
        </motion.div>
      </section>

      {/* Section: Per Wilayah & Kategori */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">🗺️ Per Wilayah & Kategori</h2>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      {/* Proporsi + Tier + Ritel/Feeder + NOC Statistik */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.7 }}
        className="space-y-3"
      >
          {/* Left column: Regional Office + Ritel + Feeder stacked. Right column: Tier OVER SLA full height */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
            {/* LEFT COLUMN — stacked */}
            <div className="space-y-3 min-w-0">
            {/* Regional Office Summary — Modern Minimalist */}
            <Card className="overflow-hidden border">
              <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-muted/10">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
                      🗺️ Regional Office
                      {(() => {
                        // Always render the info button — even when empty, so the user can see status.
                        const totalAll = regionalIncidentData.reduce((s, r) => s + r.total, 0);
                        const totalResolved = regionalIncidentData.reduce((s, r) => s + r.resolved, 0);
                        const totalCritical = regionalIncidentData.reduce((s, r) => s + r.critical, 0);
                        const totalPendingAll = regionalIncidentData.reduce((s, r) => s + r.pending, 0);
                        const rate = totalAll > 0 ? Math.round((totalResolved / totalAll) * 100) : 0;
                        const sorted = [...regionalIncidentData].sort((a, b) => b.total - a.total);
                        const bestRegion = [...regionalIncidentData].sort((a, b) => (b.total > 0 ? b.resolved / b.total : 0) - (a.total > 0 ? a.resolved / a.total : 0))[0];
                        const worstRegion = [...regionalIncidentData].sort((a, b) => b.critical - a.critical)[0];
                        const topRegion = sorted[0];

                        const insight = buildInsight({
                          total: totalAll,
                          resolved: totalResolved,
                          pending: totalPendingAll,
                          critical: totalCritical,
                          rate,
                          contextLabel: "incident lintas region",
                          emptyText: "✅ Belum ada data region atau belum ada incident terdeteksi.",
                        });

                        // Filter helpers
                        const allRegional = tickets.filter(t => {
                          const region = hostnameToRegionMap[(t.hostname || "").trim().toUpperCase()];
                          return !!region && regionalIncidentData.some(r => r.region === region);
                        });
                        const filterByStatus = (statuses: Ticket["status"][]) =>
                          allRegional.filter(t => statuses.includes(t.status));
                        const filterPendingBucket = () =>
                          allRegional.filter(t => t.status !== "Resolved" && t.status !== "Critical");
                        const filterByRegion = (region: string) =>
                          tickets.filter(t => hostnameToRegionMap[(t.hostname || "").trim().toUpperCase()] === region);

                        const returnTo = { label: "Ringkasan Regional Office", run: () => setRegionalInfoOpen(true) };
                        const openList = (title: string, list: Ticket[]) => openIncidentList(title, list, returnTo);

                        const sections: InfoSection[] = [
                          {
                            heading: "Ringkasan Realtime",
                            emoji: "📈",
                            metrics: [
                              { label: "Total Incident", value: totalAll, hint: `${regionalIncidentData.length} region aktif`, tone: "primary",
                                onClick: totalAll > 0 ? () => openList("🗺️ Semua Incident Regional", allRegional) : undefined },
                              { label: "Resolved", value: totalResolved, hint: `${totalAll > 0 ? rate : 0}%`, tone: "success",
                                onClick: totalResolved > 0 ? () => openList("✅ Resolved — Regional", filterByStatus(["Resolved"])) : undefined },
                              { label: "Pending", value: totalPendingAll, hint: `${totalAll > 0 ? Math.round((totalPendingAll/totalAll)*100) : 0}%`, tone: "warning",
                                onClick: totalPendingAll > 0 ? () => openList("⏳ Pending / On Progress — Regional", filterPendingBucket()) : undefined },
                              { label: "Critical", value: totalCritical, hint: `${totalAll > 0 ? Math.round((totalCritical/totalAll)*100) : 0}%`, tone: "destructive",
                                onClick: totalCritical > 0 ? () => openList("🚨 Critical — Regional", filterByStatus(["Critical"])) : undefined },
                            ],
                          },
                          {
                            heading: "Performa per Region",
                            emoji: "🗺️",
                            bullets: sorted.length === 0
                              ? [{ label: "Belum ada region dengan incident.", tone: "default" }]
                              : sorted.map((r) => {
                                  const rRate = r.total > 0 ? Math.round((r.resolved / r.total) * 100) : 0;
                                  const tone: InfoMetric["tone"] = r.critical > r.total * 0.4 ? "destructive" : rRate >= 60 ? "success" : "warning";
                                  return {
                                    label: `${r.region} • ${r.total} incident`,
                                    value: `${rRate}% resolved`,
                                    tone,
                                    onClick: () => openList(`🗺️ Region: ${r.region}`, filterByRegion(r.region)),
                                  };
                                }),
                          },
                          {
                            heading: "Highlight",
                            emoji: "🏅",
                            bullets: totalAll === 0 ? [{ label: "Belum ada highlight tersedia.", tone: "default" }] : [
                              ...(bestRegion ? [{
                                label: `🥇 Best Performance: ${bestRegion.region}`,
                                value: `${bestRegion.total > 0 ? Math.round((bestRegion.resolved/bestRegion.total)*100) : 0}%`,
                                tone: "success" as const,
                                onClick: () => openList(`🥇 Region terbaik: ${bestRegion.region}`, filterByRegion(bestRegion.region)),
                              }] : []),
                              ...(worstRegion && worstRegion.critical > 0 ? [{
                                label: `⚠️ Most Critical: ${worstRegion.region}`,
                                value: `${worstRegion.critical} tiket`,
                                tone: "destructive" as const,
                                onClick: () => openList(`🚨 Critical region: ${worstRegion.region}`, filterByRegion(worstRegion.region).filter(t => t.status === "Critical")),
                              }] : []),
                              ...(topRegion ? [{
                                label: `📦 Region paling sibuk: ${topRegion.region}`,
                                value: `${topRegion.total}`,
                                tone: "primary" as const,
                                onClick: () => openList(`📦 Region tersibuk: ${topRegion.region}`, filterByRegion(topRegion.region)),
                              }] : []),
                            ],
                          },
                        ];

                        return (
                          <SectionInfoDialog
                            title="Regional Office"
                            emoji="🗺️"
                            description="Distribusi incident per region beserta tingkat resolusi terkini."
                            insight={insight}
                            sections={sections}
                            open={regionalInfoOpen}
                            onOpenChange={setRegionalInfoOpen}
                          />
                        );
                      })()}
                    </CardTitle>
                    <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5">Klik region untuk detail incident</p>
                  </div>
                  {/* Mini Donut Chart in header */}
                  {regionalIncidentData.length > 0 && (() => {
                    const PIE_COLORS = [
                      "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
                      "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(180, 70%, 40%)",
                    ];
                    const totalAll = regionalIncidentData.reduce((s, r) => s + r.total, 0);
                    return (
                      <div className="flex items-center gap-2">
                        <div className="w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] cursor-pointer" onClick={() => setRegionProportionOpen(true)} title="Klik untuk detail proporsi">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={regionalIncidentData.map((r, i) => ({ name: r.region, value: r.total, fill: PIE_COLORS[i % PIE_COLORS.length] }))}
                                cx="50%" cy="50%"
                                innerRadius="55%" outerRadius="90%"
                                dataKey="value"
                                strokeWidth={1}
                                stroke="hsl(var(--background))"
                              >
                                {regionalIncidentData.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-bold text-foreground leading-none tabular-nums">{totalAll}</div>
                          <div className="text-[8px] sm:text-[9px] text-muted-foreground">{regionalIncidentData.length} Region</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardHeader>
              <CardContent className="p-2.5 sm:p-3">
                {regionalIncidentData.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Belum ada data region</p>
                ) : (() => {
                  const totalAll = regionalIncidentData.reduce((s, r) => s + r.total, 0);
                  const totalResolved = regionalIncidentData.reduce((s, r) => s + r.resolved, 0);
                  const totalCritical = regionalIncidentData.reduce((s, r) => s + r.critical, 0);
                  const totalPendingAll = regionalIncidentData.reduce((s, r) => s + r.pending, 0);
                  const PIE_COLORS = [
                    "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
                    "hsl(0, 84%, 60%)", "hsl(262, 83%, 58%)", "hsl(180, 70%, 40%)",
                  ];
                  const maxRegionTotal = Math.max(...regionalIncidentData.map(r => r.total), 1);
                  const bestRegion = [...regionalIncidentData].sort((a, b) => (b.total > 0 ? b.resolved / b.total : 0) - (a.total > 0 ? a.resolved / a.total : 0))[0];
                  const worstRegion = [...regionalIncidentData].sort((a, b) => b.critical - a.critical)[0];

                  return (
                    <div className="space-y-3">
                      {/* Global progress bar with legend */}
                      <div className="space-y-1">
                        <div className="w-full h-2 rounded-full bg-muted/30 overflow-hidden flex">
                          <motion.div className="h-full bg-success rounded-l-full" initial={{ width: 0 }} animate={{ width: `${totalAll > 0 ? (totalResolved / totalAll) * 100 : 0}%` }} transition={{ duration: 0.8 }} />
                          <motion.div className="h-full bg-warning" initial={{ width: 0 }} animate={{ width: `${totalAll > 0 ? (totalPendingAll / totalAll) * 100 : 0}%` }} transition={{ duration: 0.8, delay: 0.15 }} />
                          <motion.div className="h-full bg-destructive rounded-r-full" initial={{ width: 0 }} animate={{ width: `${totalAll > 0 ? (totalCritical / totalAll) * 100 : 0}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                        </div>
                        <div className="flex items-center justify-between text-[7px] sm:text-[8px] text-muted-foreground">
                          <div className="flex items-center gap-2.5">
                            <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-success" />{totalResolved} Resolved</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-warning" />{totalPendingAll} Pending</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive" />{totalCritical} Critical</span>
                          </div>
                        </div>
                      </div>

                      {/* Region cards — clickable */}
                      <div className="space-y-1.5">
                        {regionalIncidentData.map((r, i) => {
                          const rRate = r.total > 0 ? Math.round((r.resolved / r.total) * 100) : 0;
                          const color = PIE_COLORS[i % PIE_COLORS.length];
                          return (
                            <motion.div
                              key={r.region}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3, delay: i * 0.06 }}
                              className="group rounded-lg border border-border/30 bg-muted/5 hover:bg-muted/20 hover:border-primary/30 transition-all p-2 cursor-pointer active:scale-[0.98]"
                              onClick={() => { setSelectedRegion(r.region); setRegionDialogOpen(true); }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                                  <span className="text-[9px] sm:text-[10px] font-semibold truncate">{r.region}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] sm:text-[9px] font-bold tabular-nums ${rRate >= 50 ? 'text-success' : rRate >= 20 ? 'text-warning' : 'text-destructive'}`}>{rRate}%</span>
                                  <span className="text-[10px] sm:text-xs font-bold tabular-nums text-foreground">{r.total}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-muted/30 overflow-hidden flex mb-1">
                                <div className="h-full bg-success transition-all duration-500" style={{ width: `${r.total > 0 ? (r.resolved / r.total) * 100 : 0}%` }} />
                                <div className="h-full bg-warning transition-all duration-500" style={{ width: `${r.total > 0 ? (r.pending / r.total) * 100 : 0}%` }} />
                                <div className="h-full bg-destructive transition-all duration-500" style={{ width: `${r.total > 0 ? (r.critical / r.total) * 100 : 0}%` }} />
                              </div>
                              <div className="flex items-center gap-3 text-[7px] sm:text-[8px] text-muted-foreground">
                                <span className="text-success tabular-nums">✅ {r.resolved}</span>
                                <span className="text-destructive tabular-nums">🔴 {r.critical}</span>
                                <span className="text-warning tabular-nums">⏳ {r.pending}</span>
                                <span className="ml-auto text-[6px] sm:text-[7px] opacity-60 tabular-nums">{totalAll > 0 ? Math.round((r.total / totalAll) * 100) : 0}% total</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>

                      {/* Compact insights */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-success/5 border border-success/15">
                          <span className="text-[9px]">🏅</span>
                          <div className="min-w-0">
                            <div className="text-[6px] sm:text-[7px] text-muted-foreground uppercase tracking-wider">Best Performance</div>
                            <div className="text-[8px] sm:text-[9px] font-bold text-success truncate">{bestRegion?.region} — {bestRegion?.total > 0 ? Math.round((bestRegion.resolved / bestRegion.total) * 100) : 0}%</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-destructive/5 border border-destructive/15">
                          <span className="text-[9px]">⚠️</span>
                          <div className="min-w-0">
                            <div className="text-[6px] sm:text-[7px] text-muted-foreground uppercase tracking-wider">Most Critical</div>
                            <div className="text-[8px] sm:text-[9px] font-bold text-destructive truncate">{worstRegion?.region} — {worstRegion?.critical} tiket</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            {/* Ritel & Feeder Stats — Premium Twin Cards (stacked under Regional Office) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {[
                {
                  label: "Incident Ritel", icon: "📦", data: ritelTickets,
                  accent: "primary",
                  gradient: "from-primary/10 via-primary/5 to-transparent",
                  ring: "ring-primary/20",
                  dot: "bg-primary",
                  text: "text-primary",
                  border: "border-primary/25",
                  progressBg: "bg-primary/15",
                  progressFill: "bg-gradient-to-r from-primary to-primary/70",
                },
                {
                  label: "Incident Feeder", icon: "⚡", data: feederTickets,
                  accent: "warning",
                  gradient: "from-warning/10 via-warning/5 to-transparent",
                  ring: "ring-warning/20",
                  dot: "bg-warning",
                  text: "text-warning",
                  border: "border-warning/25",
                  progressBg: "bg-warning/15",
                  progressFill: "bg-gradient-to-r from-warning to-warning/70",
                },
              ].map((section, idx) => {
                const resolved = section.data.filter(t => t.status === "Resolved").length;
                const pending = section.data.filter(t => t.status !== "Resolved").length;
                const rate = section.data.length > 0 ? Math.round((resolved / section.data.length) * 100) : 0;
                const constraintCount: Record<string, number> = {};
                section.data.forEach(t => { constraintCount[t.constraint] = (constraintCount[t.constraint] || 0) + 1; });
                const topConstraints = Object.entries(constraintCount).sort((a, b) => b[1] - a[1]).slice(0, 3);
                const maxConstraint = topConstraints[0]?.[1] || 1;

                return (
                  <motion.div
                    key={section.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 + idx * 0.08 }}
                  >
                    <Card className={`overflow-hidden border ${section.border} hover:shadow-md transition-all duration-300 group h-full`}>
                      <CardHeader className={`relative py-2.5 px-3 sm:px-4 border-b bg-gradient-to-br ${section.gradient}`}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center ring-1 ${section.ring} bg-background/60 backdrop-blur-sm shrink-0`}>
                              <span className="text-sm sm:text-base">{section.icon}</span>
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-[11px] sm:text-xs font-semibold leading-tight truncate">{section.label}</CardTitle>
                              <p className="text-[8px] sm:text-[9px] text-muted-foreground leading-tight mt-0.5">Resolution rate {rate}%</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {(() => {
                              const critical = section.data.filter(t => t.status === "Critical").length;
                              const onProgress = section.data.filter(t => t.status === "On Progress").length;
                              const pendingStatus = section.data.filter(t => t.status === "Pending").length;
                              // Pending bucket = everything not Resolved (matches `pending` var above)
                              const sortedConstraints = Object.entries(
                                section.data.reduce((acc, t) => { acc[t.constraint] = (acc[t.constraint] || 0) + 1; return acc; }, {} as Record<string, number>)
                              ).sort((a, b) => b[1] - a[1]);
                              const top5 = sortedConstraints.slice(0, 5);
                              const totalConstraintTypes = sortedConstraints.length;

                              const insight = buildInsight({
                                total: section.data.length,
                                resolved,
                                pending: pendingStatus,  // pending status only for pct calc consistency
                                critical,
                                rate,
                                contextLabel: section.label.toLowerCase(),
                                emptyText: `✅ Belum ada ${section.label.toLowerCase()} terdeteksi. Layanan ${section.label === "Incident Ritel" ? "RITEL" : "FEEDER"} dalam kondisi stabil.`,
                              });

                              const filterStatus = (status: Ticket["status"]) => section.data.filter(t => t.status === status);
                              const filterByConstraint = (name: string) => section.data.filter(t => t.constraint === name);

                              const isRitel = section.label === "Incident Ritel";
                              const setInfoOpen = isRitel ? setRitelInfoOpen : setFeederInfoOpen;
                              const isInfoOpen = isRitel ? ritelInfoOpen : feederInfoOpen;
                              const returnTo = {
                                label: `Ringkasan ${section.label}`,
                                run: () => setInfoOpen(true),
                              };
                              const openList = (title: string, list: Ticket[]) => openIncidentList(title, list, returnTo);

                              const sections: InfoSection[] = [
                                {
                                  heading: "Status Realtime",
                                  emoji: "📊",
                                  metrics: [
                                    { label: "Total", value: section.data.length, tone: section.accent as InfoMetric["tone"],
                                      onClick: section.data.length > 0 ? () => openList(`${section.icon} Semua ${section.label}`, section.data) : undefined },
                                    { label: "Resolved", value: resolved, hint: `${rate}%`, tone: "success",
                                      onClick: resolved > 0 ? () => openList(`✅ Resolved — ${section.label}`, filterStatus("Resolved")) : undefined },
                                    { label: "On Progress", value: onProgress, tone: "primary",
                                      onClick: onProgress > 0 ? () => openList(`🔧 On Progress — ${section.label}`, filterStatus("On Progress")) : undefined },
                                    { label: "Pending", value: pendingStatus, tone: "warning",
                                      onClick: pendingStatus > 0 ? () => openList(`⏳ Pending — ${section.label}`, filterStatus("Pending")) : undefined },
                                    { label: "Critical", value: critical, tone: "destructive",
                                      onClick: critical > 0 ? () => openList(`🚨 Critical — ${section.label}`, filterStatus("Critical")) : undefined },
                                    { label: "Belum Selesai", value: pending, tone: "destructive",
                                      onClick: pending > 0 ? () => openList(`📌 Belum Selesai — ${section.label}`, section.data.filter(t => t.status !== "Resolved")) : undefined },
                                  ],
                                },
                                {
                                  heading: `Top Constraint (${totalConstraintTypes} kategori)`,
                                  emoji: "🎯",
                                  bullets: top5.length > 0 ? top5.map(([name, count], i) => ({
                                    label: `${i + 1}. ${name}`,
                                    value: `${count} (${Math.round((count/section.data.length)*100)}%)`,
                                    tone: i === 0 ? (section.accent as InfoMetric["tone"]) : "default",
                                    onClick: () => openList(`🎯 ${name} — ${section.label}`, filterByConstraint(name)),
                                  })) : [{ label: "Belum ada data constraint", tone: "default" as const }],
                                },
                                {
                                  heading: "Tentang Kategori",
                                  emoji: "ℹ️",
                                  paragraph: section.label === "Incident Ritel"
                                    ? "Kategori RITEL mencakup gangguan pelanggan akhir seperti LINK LOSS, BAD RX, ONT PROBLEM, INTERMITTENT, dan permasalahan layanan ICONPLAY/INET. Penanganan biasanya melibatkan tim mitra/serpo lokal."
                                    : "Kategori FEEDER mencakup gangguan infrastruktur backbone seperti FAT BAD RX, FAT LOSS, PORT DOWN, OLT DOWN/BAD RX. Format incident mengikuti standar [PROACTIVE NOC RETAIL] dan menjadi prioritas operasional NOC.",
                                },
                              ];

                              return (
                                <SectionInfoDialog
                                  title={section.label}
                                  emoji={section.icon}
                                  description={`Analisa lengkap ${section.label.toLowerCase()} berdasarkan data realtime.`}
                                  insight={insight}
                                  sections={sections}
                                  open={isInfoOpen}
                                  onOpenChange={setInfoOpen}
                                />
                              );
                            })()}
                            <div className="text-right">
                              <div className={`text-xl sm:text-2xl font-bold ${section.text} tabular-nums leading-none`}>{section.data.length}</div>
                              <div className="text-[7px] sm:text-[8px] text-muted-foreground uppercase tracking-wider mt-0.5">Total</div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-3 space-y-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                            <span className="text-muted-foreground font-medium">Progress</span>
                            <span className={`font-bold ${section.text} tabular-nums`}>{rate}%</span>
                          </div>
                          <div className={`relative w-full h-2 rounded-full ${section.progressBg} overflow-hidden`}>
                            <motion.div
                              className={`h-full rounded-full ${section.progressFill} shadow-sm`}
                              initial={{ width: 0 }}
                              animate={{ width: `${rate}%` }}
                              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          <div className={`text-center p-2 rounded-lg bg-muted/30 border border-border/40`}>
                            <div className={`text-base sm:text-lg font-bold ${section.text} tabular-nums leading-none`}>{section.data.length}</div>
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1">Total</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-success/5 border border-success/20">
                            <div className="text-base sm:text-lg font-bold text-success tabular-nums leading-none">{resolved}</div>
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1">Resolved</div>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                            <div className="text-base sm:text-lg font-bold text-destructive tabular-nums leading-none">{pending}</div>
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1">Pending</div>
                          </div>
                        </div>

                        {topConstraints.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-border/40">
                            <div className="flex items-center justify-between">
                              <span className="text-[8px] sm:text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Top Constraint</span>
                              <span className="text-[7px] sm:text-[8px] text-muted-foreground/70">{topConstraints.length} kategori</span>
                            </div>
                            <div className="space-y-1">
                              {topConstraints.map(([name, count], i) => (
                                <div key={name} className="flex items-center gap-2 text-[9px] sm:text-[10px]">
                                  <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[7px] font-bold ${i === 0 ? `${section.text} bg-current/10` : 'text-muted-foreground bg-muted/50'}`}>
                                    {i + 1}
                                  </span>
                                  <span className="text-foreground/80 truncate flex-1 font-medium">{name}</span>
                                  <div className={`w-14 sm:w-20 h-1.5 rounded-full ${section.progressBg} overflow-hidden`}>
                                    <motion.div
                                      className={`h-full rounded-full ${section.progressFill}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(count / maxConstraint) * 100}%` }}
                                      transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                                    />
                                  </div>
                                  <span className={`font-bold ${section.text} w-6 text-right tabular-nums`}>{count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            </div>
            {/* END LEFT COLUMN */}

            {/* RIGHT COLUMN — Tier Incident OVER SLA (full height) */}
            <div className="min-w-0 lg:sticky lg:top-3 self-start w-full">
              <DashboardTierOverSLA
                tickets={tickets}
                getTicketRegion={getTicketRegion}
                infoOpen={overSlaInfoOpen}
                onInfoOpenChange={setOverSlaInfoOpen}
                onOpenList={(title, list) =>
                  openIncidentList(title, list, {
                    label: "Ringkasan OVER SLA",
                    run: () => setOverSlaInfoOpen(true),
                  })
                }
              />
            </div>
          </div>

      </motion.div>
      </section>

      {/* Section: Operasional Harian */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-0.5">
          <h2 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">🛠️ Operasional Harian</h2>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      {/* Report Shift + NOC Statistik + Recent Activity - 3 columns at bottom */}
      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 w-full items-start">
        {/* Report Shift */}
        {shiftReports.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
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
              
              <CardContent className="pt-3 pb-4 px-3 sm:px-4">
                <Tabs value={shiftReportTab} onValueChange={(v) => { setShiftReportTab(v); setSelectedHistoryDate(null); }} className="w-full">
                  <div className="flex items-center justify-between mb-3">
                    <TabsList className="inline-flex w-auto gap-1 h-auto p-1">
                      <TabsTrigger value="latest" className="flex items-center gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Zap className="h-3 w-3" />
                        Terbaru
                      </TabsTrigger>
                      <TabsTrigger value="history" className="flex items-center gap-1.5 text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <History className="h-3 w-3" />
                        Riwayat
                      </TabsTrigger>
                    </TabsList>
                    
                    {shiftReportTab === "latest" && (() => {
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
                        <div className="grid gap-3 grid-cols-1">
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
                        <div className="grid gap-2 grid-cols-1">
                          {getHistoryRecords().map((record, idx) => {
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
                        
                        <div className="grid gap-3 grid-cols-1">
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

        {/* Recent Activity - All Roles */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <RecentActivity />
        </motion.div>
      </div>
      </section>



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
          setInfoReturn(null);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="flex-shrink-0">
            {(previousDialogState || inlineSelectedTicket) ? (
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
            ) : infoReturn ? (
              <button
                onClick={() => {
                  const run = infoReturn.run;
                  setInfoReturn(null);
                  setFilterDialogOpen(false);
                  // Re-open the originating ringkasan dialog after the filter dialog closes
                  setTimeout(() => run(), 60);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 border border-primary/20 rounded-full px-3 py-1 w-fit transition-all duration-200 active:scale-95 mb-1"
                title={`Kembali ke ${infoReturn.label}`}
              >
                <span className="text-sm">←</span>
                Kembali ke {infoReturn.label}
              </button>
            ) : null}
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
      {/* Region Detail Dialog */}
      <Dialog open={regionDialogOpen} onOpenChange={(open) => { setRegionDialogOpen(open); if (!open) setRegionStatusFilter("all"); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              🗺️ Incident Region: {selectedRegion}
              <Badge variant="secondary" className="text-[10px]">{selectedRegionTickets.length} tiket</Badge>
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const resolved = selectedRegionTickets.filter(t => t.status === "Resolved").length;
            const critical = selectedRegionTickets.filter(t => t.status === "Critical").length;
            const pending = selectedRegionTickets.length - resolved - critical;
            const filters = [
              { key: "all", label: "Semua", count: selectedRegionTickets.length, color: "text-foreground" },
              { key: "Resolved", label: "✅ Resolved", count: resolved, color: "text-success" },
              { key: "Critical", label: "🔴 Critical", count: critical, color: "text-destructive" },
              { key: "pending", label: "⏳ Pending", count: pending, color: "text-warning" },
            ];
            return (
              <div className="flex items-center gap-1.5 pb-2 border-b flex-wrap">
                {filters.map(f => (
                  <button
                    key={f.key}
                    onClick={() => setRegionStatusFilter(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                      regionStatusFilter === f.key
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {f.label} <span className="tabular-nums">({f.count})</span>
                  </button>
                ))}
              </div>
            );
          })()}
          <div className="overflow-auto flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow className="text-[10px] sm:text-xs">
                  <TableHead className="py-1.5">Incident ID</TableHead>
                  <TableHead className="py-1.5">Hostname</TableHead>
                  <TableHead className="py-1.5">Kendala</TableHead>
                  <TableHead className="py-1.5">Status</TableHead>
                  <TableHead className="py-1.5">Tanggal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  const filtered = selectedRegionTickets.filter(t => {
                    if (regionStatusFilter === "all") return true;
                    if (regionStatusFilter === "pending") return t.status !== "Resolved" && t.status !== "Critical";
                    return t.status === regionStatusFilter;
                  });
                  if (filtered.length === 0) return (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">Tidak ada incident</TableCell>
                    </TableRow>
                  );
                  return filtered.map((t) => (
                    <TableRow key={t.id} className="text-[10px] sm:text-xs">
                      <TableCell className="py-1.5 font-mono text-[10px] font-semibold whitespace-nowrap">{t.id}</TableCell>
                      <TableCell className="py-1.5 font-medium truncate max-w-[120px]">{t.hostname}</TableCell>
                      <TableCell className="py-1.5">{t.constraint}</TableCell>
                      <TableCell className="py-1.5"><StatusBadge status={t.status} /></TableCell>
                      <TableCell className="py-1.5 tabular-nums text-muted-foreground">{new Date(t.createdISO).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "2-digit" })}</TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Region Proportion Dialog */}
      <Dialog open={regionProportionOpen} onOpenChange={setRegionProportionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm sm:text-base">🥧 Proporsi Incident per Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={regionalIncidentData.map((r, i) => ({ name: r.region, value: r.total, fill: ["hsl(217,91%,60%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(262,83%,58%)", "hsl(180,70%,40%)"][i % 6] }))}
                    cx="50%" cy="50%"
                    innerRadius="40%" outerRadius="75%"
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {regionalIncidentData.map((_, i) => (
                      <Cell key={i} fill={["hsl(217,91%,60%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(262,83%,58%)", "hsl(180,70%,40%)"][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} tiket`, "Total"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {regionalIncidentData.map((r, i) => {
                const totalAll = regionalIncidentData.reduce((s, x) => s + x.total, 0);
                const pct = totalAll > 0 ? Math.round((r.total / totalAll) * 100) : 0;
                const color = ["hsl(217,91%,60%)", "hsl(142,71%,45%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)", "hsl(262,83%,58%)", "hsl(180,70%,40%)"][i % 6];
                return (
                  <div
                    key={r.region}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => { setRegionProportionOpen(false); setSelectedRegion(r.region); setRegionDialogOpen(true); }}
                  >
                    <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium flex-1">{r.region}</span>
                    <span className="text-xs tabular-nums font-bold">{r.total}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
