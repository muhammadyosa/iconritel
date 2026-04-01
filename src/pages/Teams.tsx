import { Users, Eye, CalendarIcon, X, Monitor, TrendingUp, TrendingDown, ArrowRight, ChevronDown, ChevronUp, Trophy, Medal } from "lucide-react";
import { TeamsSkeleton } from "@/components/PageSkeleton";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { useTicketHistory } from "@/hooks/useTicketHistory";
import { FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell as RechartsCell, LineChart, Line } from "recharts";
import { useState, useMemo, useCallback, useEffect } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { id as localeId } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import RegionalOfficeTab from "@/components/RegionalOfficeTab";
import type { DateRange } from "react-day-picker";

const NOC_CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(210, 70%, 50%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(160, 55%, 45%)",
  "hsl(30, 80%, 50%)",
  "hsl(190, 60%, 45%)",
  "hsl(60, 70%, 45%)",
];

const chartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
  resolved: {
    label: "Resolved",
    color: "hsl(var(--success))",
  },
  pending: {
    label: "Pending",
    color: "hsl(var(--warning))",
  },
  critical: {
    label: "Critical",
    color: "hsl(var(--destructive))",
  },
} satisfies ChartConfig;

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--destructive))",
  "hsl(var(--accent-foreground))",
  "hsl(var(--muted-foreground))",
];

export default function Teams() {
  const { tickets, isLoading } = useCloudTickets();
  const { history } = useTicketHistory(tickets);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [periodPreset, setPeriodPreset] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("team-stats");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [statsSheetTeam, setStatsSheetTeam] = useState<{ team: string; category: "ritel" | "feeder" } | null>(null);
  const [statusSheet, setStatusSheet] = useState<{ category: "ritel" | "feeder"; status: "Resolved" | "Pending" | "Critical" } | null>(null);
  const [nocStatusSheet, setNocStatusSheet] = useState<{ status: "Resolved" | "Pending" | "Critical" } | null>(null);
  const [nocUserSheet, setNocUserSheet] = useState<string | null>(null);
  const [kpiSheet, setKpiSheet] = useState<{ title: string; emoji: string; tickets: any[] } | null>(null);
  const [teamDrillSheet, setTeamDrillSheet] = useState<{ teams: { team: string; category: string; tickets: any[] }[] } | null>(null);
  const [expandedDrillTeam, setExpandedDrillTeam] = useState<string | null>(null);
  const [userDrillSheet, setUserDrillSheet] = useState<{ users: { name: string; tickets: any[] }[] } | null>(null);
  const [expandedDrillUser, setExpandedDrillUser] = useState<string | null>(null);
  const [rankingPeriod, setRankingPeriod] = useState<"7d" | "14d" | "30d">("7d");
  // trendFilter is now unified with periodPreset

  // Handle period preset change
  const handlePeriodChange = (value: string) => {
    setPeriodPreset(value);
    if (value === "all") {
      setDateRange(undefined);
    } else if (value === "7d") {
      setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    } else if (value === "14d") {
      setDateRange({ from: subDays(new Date(), 14), to: new Date() });
    } else if (value === "30d") {
      setDateRange({ from: subDays(new Date(), 30), to: new Date() });
    }
  };

  // Filter tickets by date range
  const filteredTickets = tickets.filter((ticket) => {
    if (!dateRange?.from) return true;
    const ticketDate = new Date(ticket.createdISO);
    const from = startOfDay(dateRange.from);
    const to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
    return isWithinInterval(ticketDate, { start: from, end: to });
  });

  // Separate team stats by category (RITEL vs FEEDER)
  const teamStatsByCategory = useMemo(() => {
    const ritelStats: Record<string, { total: number; resolved: number; pending: number; critical: number; tickets: any[] }> = {};
    const feederStats: Record<string, { total: number; resolved: number; pending: number; critical: number; tickets: any[] }> = {};

    filteredTickets.forEach((ticket) => {
      if (!ticket.serpo) return;
      const target = ticket.category === "FEEDER" ? feederStats : ritelStats;
      if (!target[ticket.serpo]) {
        target[ticket.serpo] = { total: 0, resolved: 0, pending: 0, critical: 0, tickets: [] };
      }
      target[ticket.serpo].total++;
      target[ticket.serpo].tickets.push(ticket);
      if (ticket.status === "Resolved") target[ticket.serpo].resolved++;
      if (ticket.status === "Pending" || ticket.status === "On Progress") target[ticket.serpo].pending++;
      if (ticket.status === "Critical") target[ticket.serpo].critical++;
    });

    const toSorted = (stats: typeof ritelStats) =>
      Object.entries(stats)
        .map(([team, s]) => ({ team, ...s }))
        .sort((a, b) => b.total - a.total);

    // Constraint breakdown
    const constraintCount: Record<string, number> = {};
    const constraintResolved: Record<string, number> = {};
    filteredTickets.forEach((ticket) => {
      const cat = ticket.constraint || "Lainnya";
      constraintCount[cat] = (constraintCount[cat] || 0) + 1;
      if (ticket.status === "Resolved") constraintResolved[cat] = (constraintResolved[cat] || 0) + 1;
    });
    const topConstraints = Object.entries(constraintCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const topConstraintsResolved = Object.entries(constraintResolved)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      ritel: toSorted(ritelStats),
      feeder: toSorted(feederStats),
      ritelTotal: Object.values(ritelStats).reduce((s, v) => s + v.total, 0),
      feederTotal: Object.values(feederStats).reduce((s, v) => s + v.total, 0),
      ritelResolved: Object.values(ritelStats).reduce((s, v) => s + v.resolved, 0),
      feederResolved: Object.values(feederStats).reduce((s, v) => s + v.resolved, 0),
      topConstraints,
      topConstraintsResolved,
      constraintCount,
      constraintResolved,
    };
  }, [filteredTickets]);

  const teamStats = filteredTickets.reduce((acc, ticket) => {
    if (!ticket.serpo) return acc;
    if (!acc[ticket.serpo]) {
      acc[ticket.serpo] = { total: 0, resolved: 0, pending: 0, critical: 0, tickets: [] };
    }
    acc[ticket.serpo].total++;
    acc[ticket.serpo].tickets.push(ticket);
    if (ticket.status === "Resolved") acc[ticket.serpo].resolved++;
    if (ticket.status === "Pending" || ticket.status === "On Progress") acc[ticket.serpo].pending++;
    if (ticket.status === "Critical") acc[ticket.serpo].critical++;
    return acc;
  }, {} as Record<string, { total: number; resolved: number; pending: number; critical: number; tickets: any[] }>);

  const chartData = Object.entries(teamStats).map(([team, stats]) => ({
    team,
    total: stats.total,
    resolved: stats.resolved,
    pending: stats.pending,
    critical: stats.critical,
    tickets: stats.tickets,
  }));

  const selectedTeamData = selectedTeam ? teamStats[selectedTeam] : null;

  // === Team NOC stats (per user/creator) ===
  const userStats = useMemo(() => {
    const stats: Record<string, { total: number; resolved: number; pending: number; critical: number; tickets: any[] }> = {};
    filteredTickets.forEach((ticket) => {
      const creator = ticket.createdByName || "Unknown";
      if (!stats[creator]) {
        stats[creator] = { total: 0, resolved: 0, pending: 0, critical: 0, tickets: [] };
      }
      stats[creator].total++;
      stats[creator].tickets.push(ticket);
      if (ticket.status === "Resolved") stats[creator].resolved++;
      if (ticket.status === "Pending" || ticket.status === "On Progress") stats[creator].pending++;
      if (ticket.status === "Critical") stats[creator].critical++;
    });
    return Object.entries(stats)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTickets]);

  // === Ranking User NOC with local period filter (direct DB query to include resolved tickets) ===
  const rankingDays = rankingPeriod === "7d" ? 7 : rankingPeriod === "14d" ? 14 : 30;
  const [rankingDbTickets, setRankingDbTickets] = useState<any[]>([]);
  const [allCreatorNames, setAllCreatorNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchRankingTickets = async () => {
      const cutoff = startOfDay(subDays(new Date(), rankingDays)).toISOString();
      // Fetch tickets in period
      const { data, error } = await supabase
        .from("tickets")
        .select("created_by_name, status, created_iso")
        .gte("created_iso", cutoff);
      if (!error && data) {
        setRankingDbTickets(data);
      }
      // Fetch ALL distinct creator names (ever)
      const { data: allData } = await supabase
        .from("tickets")
        .select("created_by_name");
      if (allData) {
        const names = new Set<string>();
        allData.forEach((t: any) => {
          if (t.created_by_name) names.add(t.created_by_name);
        });
        setAllCreatorNames(Array.from(names));
      }
    };
    fetchRankingTickets();
  }, [rankingDays, tickets]);

  const rankingUserStats = useMemo(() => {
    const stats: Record<string, { total: number; resolved: number; pending: number; critical: number; tickets: any[] }> = {};
    // Initialize all known creators with zero counts
    allCreatorNames.forEach((name) => {
      stats[name] = { total: 0, resolved: 0, pending: 0, critical: 0, tickets: [] };
    });
    // Aggregate period tickets
    rankingDbTickets.forEach((ticket) => {
      const creator = ticket.created_by_name || "Unknown";
      if (!stats[creator]) {
        stats[creator] = { total: 0, resolved: 0, pending: 0, critical: 0, tickets: [] };
      }
      stats[creator].total++;
      stats[creator].tickets.push(ticket);
      if (ticket.status === "Resolved") stats[creator].resolved++;
      if (ticket.status === "Pending" || ticket.status === "On Progress") stats[creator].pending++;
      if (ticket.status === "Critical") stats[creator].critical++;
    });
    return Object.entries(stats)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [rankingDbTickets, allCreatorNames]);

  const rankingTotals = useMemo(() => {
    const t = { total: 0, resolved: 0, pending: 0, critical: 0 };
    rankingUserStats.forEach(u => { t.total += u.total; t.resolved += u.resolved; t.pending += u.pending; t.critical += u.critical; });
    return t;
  }, [rankingUserStats]);

  const nocTotals = useMemo(() => {
    const t = { total: 0, resolved: 0, pending: 0, critical: 0 };
    userStats.forEach(u => { t.total += u.total; t.resolved += u.resolved; t.pending += u.pending; t.critical += u.critical; });
    return t;
  }, [userStats]);

  // NOC constraint breakdown
  const nocConstraintStats = useMemo(() => {
    const countMap: Record<string, number> = {};
    const resolvedMap: Record<string, number> = {};
    filteredTickets.forEach((ticket) => {
      const cat = ticket.constraint || "Lainnya";
      countMap[cat] = (countMap[cat] || 0) + 1;
      if (ticket.status === "Resolved") resolvedMap[cat] = (resolvedMap[cat] || 0) + 1;
    });
    const topAll = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const topResolved = Object.entries(resolvedMap).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { countMap, resolvedMap, topAll, topResolved };
  }, [filteredTickets]);
  // Trend date range is now unified with the main period filter
  const trendDateRange = useMemo(() => {
    if (!dateRange?.from) return null; // "all" = no filter
    return { from: startOfDay(dateRange.from), to: dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from) };
  }, [dateRange]);

  const filterRecordByTrendDate = useCallback((recDate: string) => {
    if (!trendDateRange) return true;
    const d = new Date(recDate + "T00:00:00");
    return isWithinInterval(d, { start: trendDateRange.from, end: trendDateRange.to });
  }, [trendDateRange]);

  // Trend filter label for display
  const trendPeriodLabel = useMemo(() => {
    if (periodPreset === "all") return "Semua Data";
    if (periodPreset === "7d") return "7 Hari";
    if (periodPreset === "14d") return "14 Hari";
    if (periodPreset === "30d") return "30 Hari";
    if (periodPreset === "custom" && dateRange?.from) {
      return dateRange.to
        ? `${format(dateRange.from, "dd MMM", { locale: localeId })} - ${format(dateRange.to, "dd MMM", { locale: localeId })}`
        : format(dateRange.from, "dd MMM yyyy", { locale: localeId });
    }
    return "Semua Data";
  }, [periodPreset, dateRange]);

  // NOC Category Trend data - uses cloud history for persistence
  const nocCategoryTrend = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();

    history.categoryRecords.forEach((rec) => {
      if (!filterRecordByTrendDate(rec.date)) return;
      categories.add(rec.constraint_type);
      if (!dateMap[rec.date]) dateMap[rec.date] = {};
      dateMap[rec.date][rec.constraint_type] = Math.max(dateMap[rec.date][rec.constraint_type] || 0, rec.count);
    });

    const today = new Date().toISOString().split('T')[0];
    const todayLive: Record<string, number> = {};
    filteredTickets.forEach((ticket) => {
      const date = ticket.createdISO?.split("T")[0];
      if (date === today && filterRecordByTrendDate(today)) {
        const cat = ticket.constraint || "Lainnya";
        categories.add(cat);
        todayLive[cat] = (todayLive[cat] || 0) + 1;
      }
    });
    if (Object.keys(todayLive).length > 0) {
      dateMap[today] = { ...(dateMap[today] || {}), ...todayLive };
    }

    const sortedDates = Object.keys(dateMap).sort();
    const catList = Array.from(categories).sort();
    const data = sortedDates.map((date) => {
      const entry: Record<string, any> = { date: format(new Date(date + "T00:00:00"), "dd MMM", { locale: localeId }) };
      catList.forEach((cat) => { entry[cat] = dateMap[date][cat] || 0; });
      return entry;
    });

    const config: ChartConfig = {};
    catList.forEach((cat, i) => {
      config[cat] = { label: cat, color: NOC_CATEGORY_COLORS[i % NOC_CATEGORY_COLORS.length] };
    });

    return { data, categories: catList, config };
  }, [filteredTickets, history.categoryRecords, filterRecordByTrendDate]);

  // Category Trend for RITEL tickets - uses cloud history
  const ritelCategoryTrend = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();
    const today = new Date().toISOString().split('T')[0];

    history.categoryRecords.forEach((rec) => {
      if (FEEDER_CONSTRAINTS_SET.has(rec.constraint_type)) return;
      if (!filterRecordByTrendDate(rec.date)) return;
      categories.add(rec.constraint_type);
      if (!dateMap[rec.date]) dateMap[rec.date] = {};
      dateMap[rec.date][rec.constraint_type] = Math.max(dateMap[rec.date][rec.constraint_type] || 0, rec.count);
    });

    const todayLive: Record<string, number> = {};
    filteredTickets.filter(t => t.category !== "FEEDER").forEach((ticket) => {
      const date = ticket.createdISO?.split("T")[0];
      if (date === today && filterRecordByTrendDate(today)) {
        const cat = ticket.constraint || "Lainnya";
        categories.add(cat);
        todayLive[cat] = (todayLive[cat] || 0) + 1;
      }
    });
    if (Object.keys(todayLive).length > 0) {
      dateMap[today] = { ...(dateMap[today] || {}), ...todayLive };
    }

    const sortedDates = Object.keys(dateMap).sort();
    const catList = Array.from(categories).sort();
    const data = sortedDates.map((date) => {
      const entry: Record<string, any> = { date: format(new Date(date + "T00:00:00"), "dd MMM", { locale: localeId }) };
      catList.forEach((cat) => { entry[cat] = dateMap[date][cat] || 0; });
      return entry;
    });
    const config: ChartConfig = {};
    catList.forEach((cat, i) => { config[cat] = { label: cat, color: NOC_CATEGORY_COLORS[i % NOC_CATEGORY_COLORS.length] }; });
    return { data, categories: catList, config };
  }, [filteredTickets, history.categoryRecords, filterRecordByTrendDate]);

  // Category Trend for FEEDER tickets - uses cloud history
  const feederCategoryTrend = useMemo(() => {
    const dateMap: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();
    const today = new Date().toISOString().split('T')[0];

    history.categoryRecords.forEach((rec) => {
      if (!FEEDER_CONSTRAINTS_SET.has(rec.constraint_type)) return;
      if (!filterRecordByTrendDate(rec.date)) return;
      categories.add(rec.constraint_type);
      if (!dateMap[rec.date]) dateMap[rec.date] = {};
      dateMap[rec.date][rec.constraint_type] = Math.max(dateMap[rec.date][rec.constraint_type] || 0, rec.count);
    });

    const todayLive: Record<string, number> = {};
    filteredTickets.filter(t => t.category === "FEEDER").forEach((ticket) => {
      const date = ticket.createdISO?.split("T")[0];
      if (date === today && filterRecordByTrendDate(today)) {
        const cat = ticket.constraint || "Lainnya";
        categories.add(cat);
        todayLive[cat] = (todayLive[cat] || 0) + 1;
      }
    });
    if (Object.keys(todayLive).length > 0) {
      dateMap[today] = { ...(dateMap[today] || {}), ...todayLive };
    }

    const sortedDates = Object.keys(dateMap).sort();
    const catList = Array.from(categories).sort();
    const data = sortedDates.map((date) => {
      const entry: Record<string, any> = { date: format(new Date(date + "T00:00:00"), "dd MMM", { locale: localeId }) };
      catList.forEach((cat) => { entry[cat] = dateMap[date][cat] || 0; });
      return entry;
    });
    const config: ChartConfig = {};
    catList.forEach((cat, i) => { config[cat] = { label: cat, color: NOC_CATEGORY_COLORS[i % NOC_CATEGORY_COLORS.length] }; });
    return { data, categories: catList, config };
  }, [filteredTickets, history.categoryRecords, filterRecordByTrendDate]);
  const dateFilter = (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <Select value={periodPreset} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-[140px] sm:w-[160px] h-9 text-xs sm:text-sm">
          <SelectValue placeholder="Pilih Periode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Data</SelectItem>
          <SelectItem value="7d">7 Hari Terakhir</SelectItem>
          <SelectItem value="14d">14 Hari Terakhir</SelectItem>
          <SelectItem value="30d">30 Hari Terakhir</SelectItem>
          <SelectItem value="custom">Custom</SelectItem>
        </SelectContent>
      </Select>

      {periodPreset === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 justify-start text-left font-normal text-xs sm:text-sm",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM", { locale: localeId })} -{" "}
                    {format(dateRange.to, "dd MMM yyyy", { locale: localeId })}
                  </>
                ) : (
                  format(dateRange.from, "dd MMM yyyy", { locale: localeId })
                )
              ) : (
                <span>Pilih tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={1}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      )}

      {dateRange && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 px-2"
          onClick={() => {
            setDateRange(undefined);
            setPeriodPreset("all");
          }}
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {dateRange && (
        <Badge variant="secondary" className="text-xs">
          {filteredTickets.length} incident
        </Badge>
      )}
    </div>
  );

  if (isLoading && tickets.length === 0) {
    return <TeamsSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">👥 List Team</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Statistik incident per tim dan aktivitas user NOC</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 gap-1 h-auto flex-wrap sm:flex-nowrap p-1 mb-4">
            <TabsTrigger value="team-stats" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              👥 Team Ritel/Serpo
            </TabsTrigger>
            <TabsTrigger value="team-noc" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              💻 Team NOC
            </TabsTrigger>
            <TabsTrigger value="regional-office" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
              🗺 Regional Office
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ===== TAB 1: Team Stats (existing) ===== */}
        <TabsContent value="team-stats" className="space-y-4">
          {dateFilter}

          {teamStatsByCategory.ritel.length === 0 && teamStatsByCategory.feeder.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  {isLoading ? (
                    <p className="text-sm">Memuat data tim...</p>
                  ) : (
                    <>
                      <Users className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Belum ada data tim. Buat incident untuk melihat statistik tim.</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    emoji: "👥",
                    title: "Total Tim Aktif",
                    value: teamStatsByCategory.ritel.length + teamStatsByCategory.feeder.length,
                    borderClass: "border-primary/30 hover:border-primary/50",
                    valueClass: "text-primary",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]",
                    bgClass: "bg-primary/5",
                    onClick: () => {
                      const teams = [
                        ...teamStatsByCategory.ritel.map(t => ({ team: t.team, category: "RITEL", tickets: t.tickets })),
                        ...teamStatsByCategory.feeder.map(t => ({ team: t.team, category: "FEEDER", tickets: t.tickets })),
                      ];
                      setExpandedDrillTeam(null);
                      setTeamDrillSheet({ teams });
                    },
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">{teamStatsByCategory.ritel.length} Ritel</Badge>
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-warning/10 text-warning border-warning/20">{teamStatsByCategory.feeder.length} Serpo</Badge>
                      </div>
                    ),
                  },
                  {
                    emoji: "🗃️",
                    title: "Total Insident",
                    value: teamStatsByCategory.ritelTotal + teamStatsByCategory.feederTotal,
                    borderClass: "border-muted-foreground/30 hover:border-muted-foreground/50",
                    valueClass: "text-foreground",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--muted-foreground)/0.3)]",
                    bgClass: "bg-muted/5",
                    onClick: () => setKpiSheet({ title: "🗃️ Semua Incident", emoji: "🗃️", tickets: filteredTickets }),
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {teamStatsByCategory.topConstraints.map(([name, count]) => (
                          <Badge key={name} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-muted/50 border-border">{name} {count}</Badge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    emoji: "✅",
                    title: "Total Resolved",
                    value: teamStatsByCategory.ritelResolved + teamStatsByCategory.feederResolved,
                    borderClass: "border-success/30 hover:border-success/50",
                    valueClass: "text-success",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--success)/0.4)]",
                    bgClass: "bg-success/5",
                    onClick: () => setKpiSheet({ title: "✅ Incident Resolved", emoji: "✅", tickets: filteredTickets.filter(t => t.status === "Resolved") }),
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {teamStatsByCategory.topConstraintsResolved.map(([name, count]) => (
                          <Badge key={name} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-success/10 text-success border-success/20">{name} {count}</Badge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    emoji: "📊",
                    title: "Resolution Rate",
                    value: `${(teamStatsByCategory.ritelTotal + teamStatsByCategory.feederTotal) > 0
                      ? Math.round(((teamStatsByCategory.ritelResolved + teamStatsByCategory.feederResolved) / (teamStatsByCategory.ritelTotal + teamStatsByCategory.feederTotal)) * 100)
                      : 0}%`,
                    borderClass: "border-destructive/30 hover:border-destructive/50",
                    valueClass: "text-primary",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.4)]",
                    bgClass: "bg-destructive/5",
                    onClick: () => setKpiSheet({ title: "📊 Detail Resolution Rate", emoji: "📊", tickets: filteredTickets }),
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {teamStatsByCategory.topConstraints.slice(0, 3).map(([name, total]) => {
                          const resolved = teamStatsByCategory.constraintResolved[name] || 0;
                          const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
                          return (
                            <Badge key={name} variant="outline" className={cn("text-[8px] sm:text-[9px] px-1.5 py-0 border-destructive/20", rate >= 70 ? "bg-success/10 text-success" : rate >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>{name} {rate}%</Badge>
                          );
                        })}
                      </div>
                    ),
                  },
                ].map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`
                      relative cursor-pointer rounded-xl ${card.bgClass} ${card.borderClass} border
                      transition-all duration-300
                      ${card.glowClass} active:scale-[0.97]
                    `}
                    onClick={card.onClick}
                  >
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg sm:text-xl">{card.emoji}</span>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{card.title}</p>
                        </div>
                        <p className={`text-xl sm:text-2xl font-bold shrink-0 tabular-nums ${card.valueClass}`}>
                          {card.value}
                        </p>
                      </div>
                      {card.badges}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Statistik Incident per Bagian */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Ritel Incident Stats */}
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-primary/5">
                    <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] px-1.5 sm:px-2">RITEL</Badge>
                        <span>Statistik Incident</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">{teamStatsByCategory.ritelTotal} total</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {teamStatsByCategory.ritel.length > 0 ? (() => {
                      const rPending = teamStatsByCategory.ritelTotal - teamStatsByCategory.ritelResolved - teamStatsByCategory.ritel.reduce((s, t) => s + t.critical, 0);
                      const rCritical = teamStatsByCategory.ritel.reduce((s, t) => s + t.critical, 0);
                      const rRate = teamStatsByCategory.ritelTotal > 0 ? Math.round((teamStatsByCategory.ritelResolved / teamStatsByCategory.ritelTotal) * 100) : 0;
                      return (
                        <div className="space-y-3">
                          {/* Status summary row */}
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-success/10 cursor-pointer hover:bg-success/20 active:bg-success/25 transition-colors"
                              onClick={() => setStatusSheet({ category: "ritel", status: "Resolved" })}
                            >
                              <div className="h-2 w-2 rounded-full bg-success shrink-0" />
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolved</span>
                              <span className="text-sm sm:text-base font-bold text-success ml-auto">{teamStatsByCategory.ritelResolved}</span>
                            </div>
                            <div
                              className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-warning/10 cursor-pointer hover:bg-warning/20 active:bg-warning/25 transition-colors"
                              onClick={() => setStatusSheet({ category: "ritel", status: "Pending" })}
                            >
                              <div className="h-2 w-2 rounded-full bg-warning shrink-0" />
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Pending</span>
                              <span className="text-sm sm:text-base font-bold text-warning ml-auto">{rPending}</span>
                            </div>
                            <div
                              className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 cursor-pointer hover:bg-destructive/20 active:bg-destructive/25 transition-colors"
                              onClick={() => setStatusSheet({ category: "ritel", status: "Critical" })}
                            >
                              <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Critical</span>
                              <span className="text-sm sm:text-base font-bold text-destructive ml-auto">{rCritical}</span>
                            </div>
                          </div>
                          {/* Category Trend */}
                          {ritelCategoryTrend.data.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Category Trend</p>
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0">{trendPeriodLabel}</Badge>
                              </div>
                              <ChartContainer config={ritelCategoryTrend.config} className="aspect-[2/1] w-full max-h-[160px] sm:max-h-[200px]">
                                <LineChart data={ritelCategoryTrend.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={ritelCategoryTrend.data.length > 14 ? 3 : ritelCategoryTrend.data.length > 7 ? 1 : 0} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  {ritelCategoryTrend.categories.map((cat, i) => (
                                    <Line key={cat} type="monotone" dataKey={cat} stroke={NOC_CATEGORY_COLORS[i % NOC_CATEGORY_COLORS.length]} strokeWidth={1.5} dot={{ r: ritelCategoryTrend.data.length > 14 ? 0 : 2 }} />
                                  ))}
                                </LineChart>
                              </ChartContainer>
                            </div>
                          )}
                          {/* Resolution rate bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolution Rate</span>
                              <span className={cn("text-xs sm:text-sm font-bold", rRate >= 70 ? "text-success" : rRate >= 40 ? "text-warning" : "text-destructive")}>{rRate}%</span>
                            </div>
                            <div className="h-2.5 sm:h-3 w-full rounded-full bg-muted overflow-hidden flex">
                              {teamStatsByCategory.ritelResolved > 0 && <div className="h-full bg-success transition-all" style={{ width: `${(teamStatsByCategory.ritelResolved / teamStatsByCategory.ritelTotal) * 100}%` }} />}
                              {rPending > 0 && <div className="h-full bg-warning transition-all" style={{ width: `${(rPending / teamStatsByCategory.ritelTotal) * 100}%` }} />}
                              {rCritical > 0 && <div className="h-full bg-destructive transition-all" style={{ width: `${(rCritical / teamStatsByCategory.ritelTotal) * 100}%` }} />}
                            </div>
                          </div>
                          {/* Top 5 Ritel teams */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between pb-1 border-b border-border/50">
                              <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Top 5 Tim Ritel</p>
                              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{teamStatsByCategory.ritel.length} tim aktif</p>
                            </div>
                            {teamStatsByCategory.ritel.slice(0, 5).map((t, i) => {
                              const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                              return (
                                <div
                                  key={t.team}
                                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:bg-primary/5 active:bg-primary/10 rounded-md px-1.5 py-1 sm:py-1.5 transition-colors"
                                  onClick={() => setStatsSheetTeam({ team: t.team, category: "ritel" })}
                                >
                                  <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                                  <span className="text-[10px] sm:text-xs font-medium truncate flex-1 min-w-0 text-primary hover:underline underline-offset-2">{t.team}</span>
                                  <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 h-4 shrink-0">{t.total}</Badge>
                                  <div className="w-12 sm:w-20 shrink-0">
                                    <Progress value={rate} className="h-1.5 sm:h-2" />
                                  </div>
                                  <span className={cn("text-[9px] sm:text-[10px] font-bold w-7 text-right shrink-0", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                </div>
                              );
                            })}
                            {teamStatsByCategory.ritel.length > 5 && (
                              <p className="text-[8px] sm:text-[9px] text-muted-foreground text-center pt-1">+ {teamStatsByCategory.ritel.length - 5} tim lainnya di tabel bawah</p>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                      <p className="text-xs text-muted-foreground text-center py-6">Belum ada data Ritel</p>
                    )}
                  </CardContent>
                </Card>

                {/* Serpo/Feeder Incident Stats */}
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-warning/5">
                    <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-warning text-warning-foreground text-[9px] sm:text-[10px] px-1.5 sm:px-2">FEEDER</Badge>
                        <span>Statistik Incident</span>
                      </div>
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">{teamStatsByCategory.feederTotal} total</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {teamStatsByCategory.feeder.length > 0 ? (() => {
                      const fPending = teamStatsByCategory.feederTotal - teamStatsByCategory.feederResolved - teamStatsByCategory.feeder.reduce((s, t) => s + t.critical, 0);
                      const fCritical = teamStatsByCategory.feeder.reduce((s, t) => s + t.critical, 0);
                      const fRate = teamStatsByCategory.feederTotal > 0 ? Math.round((teamStatsByCategory.feederResolved / teamStatsByCategory.feederTotal) * 100) : 0;
                      return (
                        <div className="space-y-3">
                          {/* Status summary row */}
                          <div className="flex items-center gap-2">
                            <div
                              className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-success/10 cursor-pointer hover:bg-success/20 active:bg-success/25 transition-colors"
                              onClick={() => setStatusSheet({ category: "feeder", status: "Resolved" })}
                            >
                              <div className="h-2 w-2 rounded-full bg-success shrink-0" />
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolved</span>
                              <span className="text-sm sm:text-base font-bold text-success ml-auto">{teamStatsByCategory.feederResolved}</span>
                            </div>
                            <div
                              className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-warning/10 cursor-pointer hover:bg-warning/20 active:bg-warning/25 transition-colors"
                              onClick={() => setStatusSheet({ category: "feeder", status: "Pending" })}
                            >
                              <div className="h-2 w-2 rounded-full bg-warning shrink-0" />
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Pending</span>
                              <span className="text-sm sm:text-base font-bold text-warning ml-auto">{fPending}</span>
                            </div>
                            <div
                              className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 cursor-pointer hover:bg-destructive/20 active:bg-destructive/25 transition-colors"
                              onClick={() => setStatusSheet({ category: "feeder", status: "Critical" })}
                            >
                              <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Critical</span>
                              <span className="text-sm sm:text-base font-bold text-destructive ml-auto">{fCritical}</span>
                            </div>
                          </div>
                          {/* Category Trend */}
                          {feederCategoryTrend.data.length > 0 && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Category Trend</p>
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0">{trendPeriodLabel}</Badge>
                              </div>
                              <ChartContainer config={feederCategoryTrend.config} className="aspect-[2/1] w-full max-h-[160px] sm:max-h-[200px]">
                                <LineChart data={feederCategoryTrend.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={feederCategoryTrend.data.length > 14 ? 3 : feederCategoryTrend.data.length > 7 ? 1 : 0} />
                                  <YAxis allowDecimals={false} tick={{ fontSize: 9 }} />
                                  <ChartTooltip content={<ChartTooltipContent />} />
                                  {feederCategoryTrend.categories.map((cat, i) => (
                                    <Line key={cat} type="monotone" dataKey={cat} stroke={NOC_CATEGORY_COLORS[i % NOC_CATEGORY_COLORS.length]} strokeWidth={1.5} dot={{ r: feederCategoryTrend.data.length > 14 ? 0 : 2 }} />
                                  ))}
                                </LineChart>
                              </ChartContainer>
                            </div>
                          )}
                          {/* Resolution rate bar */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolution Rate</span>
                              <span className={cn("text-xs sm:text-sm font-bold", fRate >= 70 ? "text-success" : fRate >= 40 ? "text-warning" : "text-destructive")}>{fRate}%</span>
                            </div>
                            <div className="h-2.5 sm:h-3 w-full rounded-full bg-muted overflow-hidden flex">
                              {teamStatsByCategory.feederResolved > 0 && <div className="h-full bg-success transition-all" style={{ width: `${(teamStatsByCategory.feederResolved / teamStatsByCategory.feederTotal) * 100}%` }} />}
                              {fPending > 0 && <div className="h-full bg-warning transition-all" style={{ width: `${(fPending / teamStatsByCategory.feederTotal) * 100}%` }} />}
                              {fCritical > 0 && <div className="h-full bg-destructive transition-all" style={{ width: `${(fCritical / teamStatsByCategory.feederTotal) * 100}%` }} />}
                            </div>
                          </div>
                          {/* Top 5 Serpo teams */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between pb-1 border-b border-border/50">
                              <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Top 5 Tim Serpo</p>
                              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{teamStatsByCategory.feeder.length} tim aktif</p>
                            </div>
                            {teamStatsByCategory.feeder.slice(0, 5).map((t, i) => {
                              const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                              return (
                                <div
                                  key={t.team}
                                  className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:bg-warning/5 active:bg-warning/10 rounded-md px-1.5 py-1 sm:py-1.5 transition-colors"
                                  onClick={() => setStatsSheetTeam({ team: t.team, category: "feeder" })}
                                >
                                  <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                                  <span className="text-[10px] sm:text-xs font-medium truncate flex-1 min-w-0 text-primary hover:underline underline-offset-2">{t.team}</span>
                                  <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 h-4 shrink-0">{t.total}</Badge>
                                  <div className="w-12 sm:w-20 shrink-0">
                                    <Progress value={rate} className="h-1.5 sm:h-2" />
                                  </div>
                                  <span className={cn("text-[9px] sm:text-[10px] font-bold w-7 text-right shrink-0", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                </div>
                              );
                            })}
                            {teamStatsByCategory.feeder.length > 5 && (
                              <p className="text-[8px] sm:text-[9px] text-muted-foreground text-center pt-1">+ {teamStatsByCategory.feeder.length - 5} tim lainnya di tabel bawah</p>
                            )}
                          </div>
                        </div>
                      );
                    })() : (
                      <p className="text-xs text-muted-foreground text-center py-6">Belum ada data Serpo</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Stats Sheet - Controlled */}
              <Sheet open={!!statsSheetTeam} onOpenChange={(open) => !open && setStatsSheetTeam(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                  {statsSheetTeam && (() => {
                    const source = statsSheetTeam.category === "ritel" ? teamStatsByCategory.ritel : teamStatsByCategory.feeder;
                    const teamData = source.find(t => t.team === statsSheetTeam.team);
                    if (!teamData) return null;
                    const rate = teamData.total > 0 ? Math.round((teamData.resolved / teamData.total) * 100) : 0;
                    const isRitel = statsSheetTeam.category === "ritel";
                    return (
                      <>
                        <SheetHeader>
                          <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Badge className={cn("text-[10px]", isRitel ? "bg-primary text-primary-foreground" : "bg-warning text-warning-foreground")}>
                              {isRitel ? "RITEL" : "FEEDER"}
                            </Badge>
                            {statsSheetTeam.team}
                          </SheetTitle>
                          <SheetDescription className="text-xs sm:text-sm">
                            {teamData.total} total insident • {teamData.resolved} resolved • Rate: {rate}%
                          </SheetDescription>
                        </SheetHeader>
                        {/* Summary mini cards */}
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          <div className="p-2 rounded-lg bg-muted/50 text-center">
                            <p className="text-sm sm:text-lg font-bold">{teamData.total}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Total</p>
                          </div>
                          <div className="p-2 rounded-lg bg-success/10 text-center">
                            <p className="text-sm sm:text-lg font-bold text-success">{teamData.resolved}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</p>
                          </div>
                          <div className="p-2 rounded-lg bg-warning/10 text-center">
                            <p className="text-sm sm:text-lg font-bold text-warning">{teamData.pending}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
                          </div>
                          <div className="p-2 rounded-lg bg-destructive/10 text-center">
                            <p className="text-sm sm:text-lg font-bold text-destructive">{teamData.critical}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Critical</p>
                          </div>
                        </div>
                        <ScrollArea className="h-[calc(100vh-250px)] mt-4">
                          <div className="space-y-3 pr-2">
                            {teamData.tickets.map((ticket: any) => (
                              <Card key={ticket.id} className="shadow-sm">
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xs sm:text-sm truncate">{ticket.ticketId || ticket.id}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{ticket.createdAt}{ticket.createdByName ? ` • ${ticket.createdByName}` : ""}</p>
                                      </div>
                                      <StatusBadge status={ticket.status} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-xs">
                                      <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                                      <div><span className="text-muted-foreground">Service ID:</span><p className="font-medium font-mono truncate">{ticket.serviceId}</p></div>
                                      <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                                      <div><span className="text-muted-foreground">Hostname:</span><p className="font-medium font-mono text-[9px] truncate">{ticket.hostname}</p></div>
                                    </div>
                                    <div className="pt-1.5 border-t">
                                      <p className="text-[10px] font-mono p-1.5 bg-muted/50 rounded break-all">{ticket.ticketResult}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    );
                  })()}
                </SheetContent>
              </Sheet>

              {/* Status Filter Sheet */}
              <Sheet open={!!statusSheet} onOpenChange={(open) => !open && setStatusSheet(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                  {statusSheet && (() => {
                    const isRitel = statusSheet.category === "ritel";
                    const source = isRitel ? teamStatsByCategory.ritel : teamStatsByCategory.feeder;
                    const statusFilter = statusSheet.status;
                    const matchStatus = (ticket: any) => {
                      if (statusFilter === "Resolved") return ticket.status === "Resolved";
                      if (statusFilter === "Critical") return ticket.status === "Critical";
                      return ticket.status === "Pending" || ticket.status === "On Progress";
                    };
                    const filteredList = source.flatMap(t => t.tickets.filter(matchStatus));
                    const statusColor = statusFilter === "Resolved" ? "text-success" : statusFilter === "Critical" ? "text-destructive" : "text-warning";
                    const statusBg = statusFilter === "Resolved" ? "bg-success" : statusFilter === "Critical" ? "bg-destructive" : "bg-warning";
                    return (
                      <>
                        <SheetHeader>
                          <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Badge className={cn("text-[10px]", isRitel ? "bg-primary text-primary-foreground" : "bg-warning text-warning-foreground")}>
                              {isRitel ? "RITEL" : "FEEDER"}
                            </Badge>
                            <div className={cn("h-2.5 w-2.5 rounded-full", statusBg)} />
                            Incident {statusFilter}
                          </SheetTitle>
                          <SheetDescription className="text-xs sm:text-sm">
                            {filteredList.length} incident dengan status {statusFilter}
                          </SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                          <div className="space-y-3 pr-2">
                            {filteredList.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada incident {statusFilter}</p>
                            ) : filteredList.map((ticket: any) => (
                              <Card key={ticket.id} className="shadow-sm">
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xs sm:text-sm truncate">{ticket.ticketId || ticket.id}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                          {ticket.createdAt}{ticket.createdByName ? ` • ${ticket.createdByName}` : ""}
                                          {ticket.serpo ? ` • ${ticket.serpo}` : ""}
                                        </p>
                                      </div>
                                      <StatusBadge status={ticket.status} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-xs">
                                      <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                                      <div><span className="text-muted-foreground">Service ID:</span><p className="font-medium font-mono truncate">{ticket.serviceId}</p></div>
                                      <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                                      <div><span className="text-muted-foreground">Hostname:</span><p className="font-medium font-mono text-[9px] truncate">{ticket.hostname}</p></div>
                                    </div>
                                    <div className="pt-1.5 border-t">
                                      <p className="text-[10px] font-mono p-1.5 bg-muted/50 rounded break-all">{ticket.ticketResult}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    );
                  })()}
                </SheetContent>
              </Sheet>

              {/* Team Ritel Section */}
              {teamStatsByCategory.ritel.length > 0 && (
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-primary/5">
                    <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-primary text-primary-foreground text-[10px] px-2">RITEL</Badge>
                        <span>Team Ritel</span>
                        <Badge variant="secondary" className="text-[10px]">{teamStatsByCategory.ritel.length} tim</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        {teamStatsByCategory.ritelTotal} insident • {teamStatsByCategory.ritelResolved} resolved
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="min-w-[560px]">
                        <ScrollArea className={teamStatsByCategory.ritel.length > 5 ? "h-[420px]" : ""}>
                          <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background">
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-[10px] sm:text-xs w-8">#</TableHead>
                                <TableHead className="text-[10px] sm:text-xs">Nama Tim</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center w-14">Total</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center text-success w-16">Resolved</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center text-warning w-16">Pending</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center text-destructive w-16">Critical</TableHead>
                                <TableHead className="text-[10px] sm:text-xs w-[120px] sm:w-[160px]">Progress</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teamStatsByCategory.ritel.map((t, i) => {
                                const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                                return (
                                  <TableRow
                                    key={t.team}
                                    className={cn("cursor-pointer transition-colors hover:bg-primary/5", selectedTeam === t.team && "bg-primary/5")}
                                    onClick={() => setStatsSheetTeam({ team: t.team, category: "ritel" })}
                                  >
                                    <TableCell className="text-xs font-medium text-muted-foreground py-2">{i + 1}</TableCell>
                                    <TableCell className="py-2">
                                      <span className="text-xs sm:text-sm font-semibold truncate block max-w-[140px] sm:max-w-[200px]">{t.team}</span>
                                    </TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-bold py-2">{t.total}</TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-medium text-success py-2">{t.resolved}</TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-medium text-warning py-2">{t.pending}</TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-medium text-destructive py-2">{t.critical}</TableCell>
                                    <TableCell className="py-2">
                                      <div className="flex items-center gap-2">
                                        <Progress value={rate} className="h-2 flex-1" />
                                        <span className={cn("text-[10px] sm:text-xs font-bold min-w-[32px] text-right", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Team Feeder/Serpo Section */}
              {teamStatsByCategory.feeder.length > 0 && (
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-warning/5">
                    <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-warning text-warning-foreground text-[10px] px-2">FEEDER</Badge>
                        <span>Team Serpo/Feeder</span>
                        <Badge variant="secondary" className="text-[10px]">{teamStatsByCategory.feeder.length} tim</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        {teamStatsByCategory.feederTotal} insident • {teamStatsByCategory.feederResolved} resolved
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="min-w-[560px]">
                        <ScrollArea className={teamStatsByCategory.feeder.length > 5 ? "h-[420px]" : ""}>
                          <Table>
                            <TableHeader className="sticky top-0 z-10 bg-background">
                              <TableRow className="bg-muted/30">
                                <TableHead className="text-[10px] sm:text-xs w-8">#</TableHead>
                                <TableHead className="text-[10px] sm:text-xs">Nama Tim</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center w-14">Total</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center text-success w-16">Resolved</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center text-warning w-16">Pending</TableHead>
                                <TableHead className="text-[10px] sm:text-xs text-center text-destructive w-16">Critical</TableHead>
                                <TableHead className="text-[10px] sm:text-xs w-[120px] sm:w-[160px]">Progress</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {teamStatsByCategory.feeder.map((t, i) => {
                                const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                                return (
                                  <TableRow
                                    key={t.team}
                                    className={cn("cursor-pointer transition-colors hover:bg-warning/5", selectedTeam === t.team && "bg-warning/5")}
                                    onClick={() => setStatsSheetTeam({ team: t.team, category: "feeder" })}
                                  >
                                    <TableCell className="text-xs font-medium text-muted-foreground py-2">{i + 1}</TableCell>
                                    <TableCell className="py-2">
                                      <span className="text-xs sm:text-sm font-semibold truncate block max-w-[140px] sm:max-w-[200px]">{t.team}</span>
                                    </TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-bold py-2">{t.total}</TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-medium text-success py-2">{t.resolved}</TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-medium text-warning py-2">{t.pending}</TableCell>
                                    <TableCell className="text-center text-xs sm:text-sm font-medium text-destructive py-2">{t.critical}</TableCell>
                                    <TableCell className="py-2">
                                      <div className="flex items-center gap-2">
                                        <Progress value={rate} className="h-2 flex-1" />
                                        <span className={cn("text-[10px] sm:text-xs font-bold min-w-[32px] text-right", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== TAB 2: Team NOC ===== */}
        <TabsContent value="team-noc" className="space-y-4">
          {dateFilter}

          {userStats.length === 0 ? (
            <Card className="shadow-card">
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-8">
                  {isLoading ? (
                    <p className="text-sm">Memuat data...</p>
                  ) : (
                    <>
                      <Monitor className="h-10 sm:h-12 w-10 sm:w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">Belum ada data aktivitas user.</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    emoji: "👤",
                    title: "Total User Aktif",
                    value: userStats.length,
                    borderClass: "border-primary/30 hover:border-primary/50",
                    valueClass: "text-primary",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.4)]",
                    bgClass: "bg-primary/5",
                    onClick: () => {
                      setExpandedDrillUser(null);
                      setUserDrillSheet({ users: userStats.map(u => ({ name: u.name, tickets: u.tickets })) });
                    },
                    badges: null,
                  },
                  {
                    emoji: "🗃️",
                    title: "Total Incident",
                    value: nocTotals.total,
                    borderClass: "border-muted-foreground/30 hover:border-muted-foreground/50",
                    valueClass: "text-foreground",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--muted-foreground)/0.3)]",
                    bgClass: "bg-muted/5",
                    onClick: () => setKpiSheet({ title: "🗃️ Semua Incident NOC", emoji: "🗃️", tickets: filteredTickets }),
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {nocConstraintStats.topAll.map(([name, count]) => (
                          <Badge key={name} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-muted/50 border-border">{name} {count}</Badge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    emoji: "✅",
                    title: "Total Resolved",
                    value: nocTotals.resolved,
                    borderClass: "border-success/30 hover:border-success/50",
                    valueClass: "text-success",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--success)/0.4)]",
                    bgClass: "bg-success/5",
                    onClick: () => setKpiSheet({ title: "✅ Incident Resolved NOC", emoji: "✅", tickets: filteredTickets.filter(t => t.status === "Resolved") }),
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {nocConstraintStats.topResolved.map(([name, count]) => (
                          <Badge key={name} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0 bg-success/10 text-success border-success/20">{name} {count}</Badge>
                        ))}
                      </div>
                    ),
                  },
                  {
                    emoji: "📊",
                    title: "Resolution Rate",
                    value: `${nocTotals.total > 0 ? Math.round((nocTotals.resolved / nocTotals.total) * 100) : 0}%`,
                    borderClass: "border-destructive/30 hover:border-destructive/50",
                    valueClass: "text-primary",
                    glowClass: "hover:shadow-[0_0_20px_-4px_hsl(var(--destructive)/0.4)]",
                    bgClass: "bg-destructive/5",
                    onClick: () => setKpiSheet({ title: "📊 Detail Resolution Rate NOC", emoji: "📊", tickets: filteredTickets }),
                    badges: (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {nocConstraintStats.topAll.slice(0, 3).map(([name, total]) => {
                          const resolved = nocConstraintStats.resolvedMap[name] || 0;
                          const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
                          return (
                            <Badge key={name} variant="outline" className={cn("text-[8px] sm:text-[9px] px-1.5 py-0 border-destructive/20", rate >= 70 ? "bg-success/10 text-success" : rate >= 40 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>{name} {rate}%</Badge>
                          );
                        })}
                      </div>
                    ),
                  },
                ].map((card, index) => (
                  <motion.div
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`
                      relative cursor-pointer rounded-xl ${card.bgClass} ${card.borderClass} border
                      transition-all duration-300
                      ${card.glowClass} active:scale-[0.97]
                    `}
                    onClick={card.onClick}
                  >
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg sm:text-xl">{card.emoji}</span>
                          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">{card.title}</p>
                        </div>
                        <p className={`text-xl sm:text-2xl font-bold shrink-0 tabular-nums ${card.valueClass}`}>
                          {card.value}
                        </p>
                      </div>
                      {card.badges}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Statistik Incident NOC Card */}
              <Card className="shadow-card overflow-hidden">
                <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-accent/5">
                  <CardTitle className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent text-accent-foreground text-[9px] sm:text-[10px] px-1.5 sm:px-2">NOC</Badge>
                      <span>Statistik Incident</span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">{nocTotals.total} total</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4">
                  {(() => {
                    const nRate = nocTotals.total > 0 ? Math.round((nocTotals.resolved / nocTotals.total) * 100) : 0;
                    return (
                      <div className="space-y-3">
                        {/* Status summary row */}
                        <div className="flex items-center gap-2">
                          <div
                            className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-success/10 cursor-pointer hover:bg-success/20 active:bg-success/25 transition-colors"
                            onClick={() => setNocStatusSheet({ status: "Resolved" })}
                          >
                            <div className="h-2 w-2 rounded-full bg-success shrink-0" />
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolved</span>
                            <span className="text-sm sm:text-base font-bold text-success ml-auto">{nocTotals.resolved}</span>
                          </div>
                          <div
                            className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-warning/10 cursor-pointer hover:bg-warning/20 active:bg-warning/25 transition-colors"
                            onClick={() => setNocStatusSheet({ status: "Pending" })}
                          >
                            <div className="h-2 w-2 rounded-full bg-warning shrink-0" />
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Pending</span>
                            <span className="text-sm sm:text-base font-bold text-warning ml-auto">{nocTotals.pending}</span>
                          </div>
                          <div
                            className="flex-1 flex items-center gap-1.5 p-2 rounded-lg bg-destructive/10 cursor-pointer hover:bg-destructive/20 active:bg-destructive/25 transition-colors"
                            onClick={() => setNocStatusSheet({ status: "Critical" })}
                          >
                            <div className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Critical</span>
                            <span className="text-sm sm:text-base font-bold text-destructive ml-auto">{nocTotals.critical}</span>
                          </div>
                        </div>
                        {/* Category Trend */}
                        {nocCategoryTrend.data.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Category Trend</p>
                              <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0">{trendPeriodLabel}</Badge>
                            </div>
                            <ChartContainer config={nocCategoryTrend.config} className="aspect-[2/1] w-full max-h-[180px] sm:max-h-[220px]">
                              <LineChart data={nocCategoryTrend.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                                <XAxis
                                  dataKey="date"
                                  tick={{ fontSize: 9 }}
                                  interval={nocCategoryTrend.data.length > 14 ? 3 : nocCategoryTrend.data.length > 7 ? 1 : 0}
                                />
                                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                                <ChartTooltip content={<ChartTooltipContent />} />
                                {nocCategoryTrend.categories.map((cat, i) => (
                                  <Line
                                    key={cat}
                                    type="monotone"
                                    dataKey={cat}
                                    stroke={NOC_CATEGORY_COLORS[i % NOC_CATEGORY_COLORS.length]}
                                    strokeWidth={1.5}
                                    dot={nocCategoryTrend.data.length <= 14}
                                    activeDot={{ r: 3 }}
                                  />
                                ))}
                              </LineChart>
                            </ChartContainer>
                          </div>
                        )}
                        {/* Resolution rate bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] sm:text-[10px] text-muted-foreground">Resolution Rate</span>
                            <span className={cn("text-xs sm:text-sm font-bold", nRate >= 70 ? "text-success" : nRate >= 40 ? "text-warning" : "text-destructive")}>{nRate}%</span>
                          </div>
                          <div className="h-2.5 sm:h-3 w-full rounded-full bg-muted overflow-hidden flex">
                            {nocTotals.resolved > 0 && <div className="h-full bg-success transition-all" style={{ width: `${(nocTotals.resolved / nocTotals.total) * 100}%` }} />}
                            {nocTotals.pending > 0 && <div className="h-full bg-warning transition-all" style={{ width: `${(nocTotals.pending / nocTotals.total) * 100}%` }} />}
                            {nocTotals.critical > 0 && <div className="h-full bg-destructive transition-all" style={{ width: `${(nocTotals.critical / nocTotals.total) * 100}%` }} />}
                          </div>
                        </div>
                        {/* Top 5 NOC users */}
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between pb-1 border-b border-border/50">
                            <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Top 5 User NOC</p>
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground">{userStats.length} user aktif</p>
                          </div>
                          {userStats.slice(0, 5).map((u, i) => {
                            const rate = u.total > 0 ? Math.round((u.resolved / u.total) * 100) : 0;
                            return (
                              <div
                                key={u.name}
                                className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:bg-accent/5 active:bg-accent/10 rounded-md px-1.5 py-1 sm:py-1.5 transition-colors"
                                onClick={() => setNocUserSheet(u.name)}
                              >
                                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground w-4 text-center shrink-0">{i + 1}</span>
                                <span className="text-[10px] sm:text-xs font-medium truncate flex-1 min-w-0 text-primary hover:underline underline-offset-2">{u.name}</span>
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0 h-4 shrink-0">{u.total}</Badge>
                                <div className="w-12 sm:w-20 shrink-0">
                                  <Progress value={rate} className="h-1.5 sm:h-2" />
                                </div>
                                <span className={cn("text-[9px] sm:text-[10px] font-bold w-7 text-right shrink-0", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                              </div>
                            );
                          })}
                          {userStats.length > 5 && (
                            <p className="text-[8px] sm:text-[9px] text-muted-foreground text-center pt-1">+ {userStats.length - 5} user lainnya di tabel bawah</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* NOC Status Sheet */}
              <Sheet open={!!nocStatusSheet} onOpenChange={(open) => !open && setNocStatusSheet(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                  {nocStatusSheet && (() => {
                    const statusFilter = nocStatusSheet.status;
                    const matchStatus = (ticket: any) => {
                      if (statusFilter === "Resolved") return ticket.status === "Resolved";
                      if (statusFilter === "Critical") return ticket.status === "Critical";
                      return ticket.status === "Pending" || ticket.status === "On Progress";
                    };
                    const filteredList = userStats.flatMap(u => u.tickets.filter(matchStatus));
                    const statusColor = statusFilter === "Resolved" ? "text-success" : statusFilter === "Critical" ? "text-destructive" : "text-warning";
                    const statusBg = statusFilter === "Resolved" ? "bg-success" : statusFilter === "Critical" ? "bg-destructive" : "bg-warning";
                    return (
                      <>
                        <SheetHeader>
                          <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Badge className={cn("text-[10px]", statusBg, "text-white")}>{statusFilter}</Badge>
                            Incident NOC
                          </SheetTitle>
                          <SheetDescription className="text-xs sm:text-sm">
                            {filteredList.length} incident berstatus {statusFilter}
                          </SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                          <div className="space-y-3 pr-2">
                            {filteredList.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada incident {statusFilter}</p>
                            ) : filteredList.map((ticket: any) => (
                              <Card key={ticket.id} className="shadow-sm">
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xs sm:text-sm truncate">{ticket.ticketId || ticket.id}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{ticket.createdAt}{ticket.createdByName ? ` • ${ticket.createdByName}` : ""}</p>
                                      </div>
                                      <StatusBadge status={ticket.status} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-xs">
                                      <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                                      <div><span className="text-muted-foreground">Serpo:</span><p className="font-medium truncate">{ticket.serpo}</p></div>
                                      <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                                      <div><span className="text-muted-foreground">Hostname:</span><p className="font-medium font-mono text-[9px] truncate">{ticket.hostname}</p></div>
                                    </div>
                                    <div className="pt-1.5 border-t">
                                      <p className="text-[10px] font-mono p-1.5 bg-muted/50 rounded break-all">{ticket.ticketResult}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    );
                  })()}
                </SheetContent>
              </Sheet>

              {/* NOC User Detail Sheet */}
              <Sheet open={!!nocUserSheet} onOpenChange={(open) => !open && setNocUserSheet(null)}>
                <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                  {nocUserSheet && (() => {
                    const userData = userStats.find(u => u.name === nocUserSheet);
                    if (!userData) return null;
                    const rate = userData.total > 0 ? Math.round((userData.resolved / userData.total) * 100) : 0;
                    return (
                      <>
                        <SheetHeader>
                          <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
                            <Badge className="bg-accent text-accent-foreground text-[10px]">NOC</Badge>
                            {nocUserSheet}
                          </SheetTitle>
                          <SheetDescription className="text-xs sm:text-sm">
                            {userData.total} total insident • {userData.resolved} resolved • Rate: {rate}%
                          </SheetDescription>
                        </SheetHeader>
                        <div className="grid grid-cols-4 gap-2 mt-4">
                          <div className="p-2 rounded-lg bg-muted/50 text-center">
                            <p className="text-sm sm:text-lg font-bold">{userData.total}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Total</p>
                          </div>
                          <div className="p-2 rounded-lg bg-success/10 text-center">
                            <p className="text-sm sm:text-lg font-bold text-success">{userData.resolved}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</p>
                          </div>
                          <div className="p-2 rounded-lg bg-warning/10 text-center">
                            <p className="text-sm sm:text-lg font-bold text-warning">{userData.pending}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
                          </div>
                          <div className="p-2 rounded-lg bg-destructive/10 text-center">
                            <p className="text-sm sm:text-lg font-bold text-destructive">{userData.critical}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Critical</p>
                          </div>
                        </div>
                        <ScrollArea className="h-[calc(100vh-280px)] mt-4">
                          <div className="space-y-3 pr-2">
                            {userData.tickets.map((ticket: any) => (
                              <Card key={ticket.id} className="shadow-sm">
                                <CardContent className="p-3">
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <p className="font-bold text-xs sm:text-sm truncate">{ticket.ticketId || ticket.id}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{ticket.createdAt} • {ticket.serpo}</p>
                                      </div>
                                      <div className="flex flex-col gap-1 shrink-0">
                                        <StatusBadge status={ticket.status} />
                                        <Badge variant="outline" className={cn("text-[10px]", ticket.category === "FEEDER" ? "bg-warning/10 text-warning border-warning/20" : "bg-primary/10 text-primary border-primary/20")}>{ticket.category}</Badge>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-xs">
                                      <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                                      <div><span className="text-muted-foreground">Service ID:</span><p className="font-medium font-mono truncate">{ticket.serviceId}</p></div>
                                      <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                                      <div><span className="text-muted-foreground">Hostname:</span><p className="font-medium font-mono text-[9px] truncate">{ticket.hostname}</p></div>
                                    </div>
                                    <div className="pt-1.5 border-t">
                                      <p className="text-[10px] font-mono p-1.5 bg-muted/50 rounded break-all">{ticket.ticketResult}</p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </>
                    );
                  })()}
                </SheetContent>
              </Sheet>

               {/* Full Table - User NOC */}
              <Card className="shadow-card overflow-hidden">
                <CardHeader className="py-3 px-4 border-b bg-accent/5">
                  <CardTitle className="flex flex-col gap-2 text-sm sm:text-base">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-accent text-accent-foreground text-[10px] px-2">NOC</Badge>
                        <span>Ranking User NOC</span>
                        <Badge variant="secondary" className="text-[10px]">{rankingUserStats.length} user</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground font-normal">
                        {rankingTotals.total} incident • {rankingTotals.resolved} resolved
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(["7d", "14d", "30d"] as const).map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={rankingPeriod === p ? "default" : "outline"}
                          className="h-6 text-[10px] px-2.5"
                          onClick={() => setRankingPeriod(p)}
                        >
                          {p === "7d" ? "7 Hari" : p === "14d" ? "14 Hari" : "30 Hari"}
                        </Button>
                      ))}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="min-w-[560px]">
                      <ScrollArea className={rankingUserStats.length > 8 ? "h-[420px]" : ""}>
                        <Table>
                          <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow className="bg-muted/30">
                              <TableHead className="text-[10px] sm:text-xs w-8">#</TableHead>
                              <TableHead className="text-[10px] sm:text-xs">Nama User</TableHead>
                              <TableHead className="text-[10px] sm:text-xs text-center w-14">Total</TableHead>
                              <TableHead className="text-[10px] sm:text-xs text-center text-success w-16">Resolved</TableHead>
                              <TableHead className="text-[10px] sm:text-xs text-center text-warning w-16">Pending</TableHead>
                              <TableHead className="text-[10px] sm:text-xs text-center text-destructive w-16">Critical</TableHead>
                              <TableHead className="text-[10px] sm:text-xs w-[120px] sm:w-[160px]">Progress</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rankingUserStats.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                                  Tidak ada data incident dalam {rankingPeriod === "7d" ? "7" : rankingPeriod === "14d" ? "14" : "30"} hari terakhir
                                </TableCell>
                              </TableRow>
                            ) : rankingUserStats.map((u, i) => {
                              const rate = u.total > 0 ? Math.round((u.resolved / u.total) * 100) : 0;
                              return (
                                <TableRow
                                  key={u.name}
                                  className="cursor-pointer transition-colors hover:bg-accent/5"
                                  onClick={() => setNocUserSheet(u.name)}
                                >
                                  <TableCell className="py-2 w-[40px]">
                                    {i === 0 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/30" title="🥇 Peringkat 1">
                                        <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                                      </span>
                                    ) : i === 1 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700/30" title="🥈 Peringkat 2">
                                        <Medal className="h-3.5 w-3.5 text-slate-400" />
                                      </span>
                                    ) : i === 2 ? (
                                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30" title="🥉 Peringkat 3">
                                        <Medal className="h-3.5 w-3.5 text-orange-500" />
                                      </span>
                                    ) : (
                                      <span className="text-xs font-medium text-muted-foreground">{i + 1}</span>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2">
                                    <span className={cn("text-xs sm:text-sm font-semibold truncate block max-w-[140px] sm:max-w-[200px]", i === 0 ? "text-yellow-600 dark:text-yellow-400" : i === 1 ? "text-slate-500 dark:text-slate-300" : i === 2 ? "text-orange-600 dark:text-orange-400" : "")}>{u.name}</span>
                                  </TableCell>
                                  <TableCell className="text-center text-xs sm:text-sm font-bold py-2">{u.total}</TableCell>
                                  <TableCell className="text-center text-xs sm:text-sm font-medium text-success py-2">{u.resolved}</TableCell>
                                  <TableCell className="text-center text-xs sm:text-sm font-medium text-warning py-2">{u.pending}</TableCell>
                                  <TableCell className="text-center text-xs sm:text-sm font-medium text-destructive py-2">{u.critical}</TableCell>
                                  <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                      <Progress value={rate} className="h-2 flex-1" />
                                      <span className={cn("text-[10px] sm:text-xs font-bold min-w-[32px] text-right", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
               </Card>

              {/* Grafik Trend Incident per User */}
              {rankingUserStats.filter(u => u.total > 0).length > 0 && (
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="py-3 px-4 border-b bg-accent/5">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <span>Trend Incident per User</span>
                      <Badge variant="secondary" className="text-[10px]">{rankingPeriod === "7d" ? "7 Hari" : rankingPeriod === "14d" ? "14 Hari" : "30 Hari"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2 sm:p-4">
                    {(() => {
                      // Build daily data per user
                      const days = rankingDays;
                      const today = startOfDay(new Date());
                      const dateKeys: string[] = [];
                      for (let d = days; d >= 0; d--) {
                        dateKeys.push(format(subDays(today, d), "yyyy-MM-dd"));
                      }
                      const activeUsers = rankingUserStats.filter(u => u.total > 0).slice(0, 8);
                      const dailyMap: Record<string, Record<string, number>> = {};
                      dateKeys.forEach(dk => { dailyMap[dk] = {}; activeUsers.forEach(u => { dailyMap[dk][u.name] = 0; }); });
                      rankingDbTickets.forEach(t => {
                        const creator = t.created_by_name || "Unknown";
                        if (!activeUsers.find(u => u.name === creator)) return;
                        try {
                          const dk = format(startOfDay(new Date(t.created_iso)), "yyyy-MM-dd");
                          if (dailyMap[dk] && dailyMap[dk][creator] !== undefined) dailyMap[dk][creator]++;
                        } catch {}
                      });
                      const chartData = dateKeys.map(dk => {
                        const entry: any = { date: format(new Date(dk), "dd/MM") };
                        activeUsers.forEach(u => { entry[u.name] = dailyMap[dk][u.name] || 0; });
                        return entry;
                      });
                      const colors = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--warning))", "hsl(142 76% 36%)", "hsl(280 60% 55%)", "hsl(200 80% 50%)", "hsl(30 90% 55%)", "hsl(340 70% 50%)"];
                      const chartConfig: ChartConfig = {};
                      activeUsers.forEach((u, i) => { chartConfig[u.name] = { label: u.name, color: colors[i % colors.length] }; });
                      return (
                        <ChartContainer config={chartConfig} className="h-[250px] sm:h-[300px] w-full">
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} className="text-muted-foreground" />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                            {activeUsers.map((u, i) => (
                              <Line key={u.name} type="monotone" dataKey={u.name} stroke={colors[i % colors.length]} strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                            ))}
                          </LineChart>
                        </ChartContainer>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ===== TAB 3: List Regional Office ===== */}
        <TabsContent value="regional-office" className="space-y-4">
          {dateFilter}
          <RegionalOfficeTab tickets={filteredTickets} />
        </TabsContent>
      </Tabs>

      {/* KPI Drill-down Sheet */}
      <Sheet open={!!kpiSheet} onOpenChange={(open) => !open && setKpiSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
          {kpiSheet && (() => {
            const list = kpiSheet.tickets;
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base sm:text-lg">
                    {kpiSheet.title}
                  </SheetTitle>
                  <SheetDescription className="text-xs sm:text-sm">
                    {list.length} incident {periodPreset !== "all" && `• Filter: ${trendPeriodLabel}`}
                  </SheetDescription>
                </SheetHeader>
                {/* Summary mini cards */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  <div className="p-2 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm sm:text-lg font-bold">{list.length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Total</p>
                  </div>
                  <div className="p-2 rounded-lg bg-success/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-success">{list.filter((t: any) => t.status === "Resolved").length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</p>
                  </div>
                  <div className="p-2 rounded-lg bg-warning/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-warning">{list.filter((t: any) => t.status === "Pending" || t.status === "On Progress").length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-2 rounded-lg bg-destructive/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-destructive">{list.filter((t: any) => t.status === "Critical").length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Critical</p>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-250px)] mt-4">
                  <div className="space-y-3 pr-2">
                    {list.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Tidak ada incident</p>
                    ) : list.map((ticket: any) => (
                      <Card key={ticket.id} className="shadow-sm">
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-xs sm:text-sm truncate">{ticket.ticketId || ticket.id}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {ticket.createdAt}{ticket.createdByName ? ` • ${ticket.createdByName}` : ""}
                                  {ticket.serpo ? ` • ${ticket.serpo}` : ""}
                                </p>
                              </div>
                              <StatusBadge status={ticket.status} />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 text-[10px] sm:text-xs">
                              <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                              <div><span className="text-muted-foreground">Service ID:</span><p className="font-medium font-mono truncate">{ticket.serviceId}</p></div>
                              <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                              <div><span className="text-muted-foreground">Hostname:</span><p className="font-medium font-mono text-[9px] truncate">{ticket.hostname}</p></div>
                            </div>
                            <div className="pt-1.5 border-t">
                              <p className="text-[10px] font-mono p-1.5 bg-muted/50 rounded break-all">{ticket.ticketResult}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* Team Drill-down Sheet */}
      <Sheet open={!!teamDrillSheet} onOpenChange={(open) => !open && setTeamDrillSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
          {teamDrillSheet && (() => {
            const { teams } = teamDrillSheet;
            const totalIncidents = teams.reduce((s, t) => s + t.tickets.length, 0);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base sm:text-lg">👥 Tim Aktif</SheetTitle>
                  <SheetDescription className="text-xs sm:text-sm">
                    {teams.length} tim • {totalIncidents} incident {periodPreset !== "all" && `• ${trendPeriodLabel}`}
                  </SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-primary">{teams.filter(t => t.category === "RITEL").length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Tim Ritel</p>
                  </div>
                  <div className="p-2 rounded-lg bg-warning/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-warning">{teams.filter(t => t.category === "FEEDER").length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Tim Serpo</p>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-280px)] mt-4">
                  <div className="space-y-2 pr-2">
                    {teams.map((team) => {
                      const isExpanded = expandedDrillTeam === team.team;
                      const resolved = team.tickets.filter((t: any) => t.status === "Resolved").length;
                      const pending = team.tickets.filter((t: any) => t.status === "Pending" || t.status === "On Progress").length;
                      const critical = team.tickets.filter((t: any) => t.status === "Critical").length;
                      return (
                        <div key={team.team} className="rounded-lg border overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/50 transition-colors text-left"
                            onClick={() => setExpandedDrillTeam(isExpanded ? null : team.team)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={cn("text-[8px] px-1.5 py-0 shrink-0", team.category === "RITEL" ? "bg-primary/10 text-primary border-primary/20" : "bg-warning/10 text-warning border-warning/20")}>
                                  {team.category === "RITEL" ? "🏠 Ritel" : "🏬 Serpo"}
                                </Badge>
                                <p className="text-xs sm:text-sm font-semibold truncate">{team.team}</p>
                              </div>
                              <div className="flex gap-1.5 mt-1">
                                <span className="text-[9px] text-muted-foreground">{team.tickets.length} incident</span>
                                {resolved > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-success/10 text-success border-success/20">✅ {resolved}</Badge>}
                                {pending > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-warning/10 text-warning border-warning/20">⏳ {pending}</Badge>}
                                {critical > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">🔴 {critical}</Badge>}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                          </button>
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-2 space-y-2">
                              {team.tickets.map((ticket: any) => (
                                <Card key={ticket.id} className="shadow-sm">
                                  <CardContent className="p-2.5">
                                    <div className="space-y-1.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-[10px] sm:text-xs truncate">{ticket.ticketId || ticket.id}</p>
                                          <p className="text-[9px] text-muted-foreground">{ticket.createdAt}{ticket.createdByName ? ` • ${ticket.createdByName}` : ""}</p>
                                        </div>
                                        <StatusBadge status={ticket.status} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-[9px] sm:text-[10px]">
                                        <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                                        <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* User Drill-down Sheet */}
      <Sheet open={!!userDrillSheet} onOpenChange={(open) => !open && setUserDrillSheet(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
          {userDrillSheet && (() => {
            const { users } = userDrillSheet;
            const totalIncidents = users.reduce((s, u) => s + u.tickets.length, 0);
            return (
              <>
                <SheetHeader>
                  <SheetTitle className="text-base sm:text-lg">👤 User Aktif</SheetTitle>
                  <SheetDescription className="text-xs sm:text-sm">
                    {users.length} user aktif • {totalIncidents} incident {periodPreset !== "all" && `• ${trendPeriodLabel}`}
                  </SheetDescription>
                </SheetHeader>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-primary">{users.length}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">User</p>
                  </div>
                  <div className="p-2 rounded-lg bg-success/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-success">{users.reduce((s, u) => s + u.tickets.filter((t: any) => t.status === "Resolved").length, 0)}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</p>
                  </div>
                  <div className="p-2 rounded-lg bg-warning/10 text-center">
                    <p className="text-sm sm:text-lg font-bold text-warning">{users.reduce((s, u) => s + u.tickets.filter((t: any) => t.status === "Pending" || t.status === "On Progress").length, 0)}</p>
                    <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-280px)] mt-4">
                  <div className="space-y-2 pr-2">
                    {users.map((user) => {
                      const isExpanded = expandedDrillUser === user.name;
                      const resolved = user.tickets.filter((t: any) => t.status === "Resolved").length;
                      const pending = user.tickets.filter((t: any) => t.status === "Pending" || t.status === "On Progress").length;
                      const critical = user.tickets.filter((t: any) => t.status === "Critical").length;
                      return (
                        <div key={user.name} className="rounded-lg border overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/50 transition-colors text-left"
                            onClick={() => setExpandedDrillUser(isExpanded ? null : user.name)}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-semibold truncate">👤 {user.name}</p>
                              <div className="flex gap-1.5 mt-1">
                                <span className="text-[9px] text-muted-foreground">{user.tickets.length} incident</span>
                                {resolved > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-success/10 text-success border-success/20">✅ {resolved}</Badge>}
                                {pending > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-warning/10 text-warning border-warning/20">⏳ {pending}</Badge>}
                                {critical > 0 && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-destructive/10 text-destructive border-destructive/20">🔴 {critical}</Badge>}
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                          </button>
                          {isExpanded && (
                            <div className="border-t bg-muted/20 p-2 space-y-2">
                              {user.tickets.map((ticket: any) => (
                                <Card key={ticket.id} className="shadow-sm">
                                  <CardContent className="p-2.5">
                                    <div className="space-y-1.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-[10px] sm:text-xs truncate">{ticket.ticketId || ticket.id}</p>
                                          <p className="text-[9px] text-muted-foreground">{ticket.createdAt}{ticket.serpo ? ` • ${ticket.serpo}` : ""}</p>
                                        </div>
                                        <StatusBadge status={ticket.status} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-1 text-[9px] sm:text-[10px]">
                                        <div><span className="text-muted-foreground">Customer:</span><p className="font-medium truncate">{ticket.customerName}</p></div>
                                        <div><span className="text-muted-foreground">Constraint:</span><p className="font-medium truncate">{ticket.constraint}</p></div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
