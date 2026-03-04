import { Users, Eye, CalendarIcon, X, Monitor, TrendingUp, TrendingDown, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell as RechartsCell } from "recharts";
import { useState, useMemo } from "react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
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
import type { DateRange } from "react-day-picker";

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
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [periodPreset, setPeriodPreset] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("team-stats");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [statsSheetTeam, setStatsSheetTeam] = useState<{ team: string; category: "ritel" | "feeder" } | null>(null);
  const [statusSheet, setStatusSheet] = useState<{ category: "ritel" | "feeder"; status: "Resolved" | "Pending" | "Critical" } | null>(null);
  const [nocStatusSheet, setNocStatusSheet] = useState<{ status: "Resolved" | "Pending" | "Critical" } | null>(null);
  const [nocUserSheet, setNocUserSheet] = useState<string | null>(null);

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

    return {
      ritel: toSorted(ritelStats),
      feeder: toSorted(feederStats),
      ritelTotal: Object.values(ritelStats).reduce((s, v) => s + v.total, 0),
      feederTotal: Object.values(feederStats).reduce((s, v) => s + v.total, 0),
      ritelResolved: Object.values(ritelStats).reduce((s, v) => s + v.resolved, 0),
      feederResolved: Object.values(feederStats).reduce((s, v) => s + v.resolved, 0),
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

  const nocTotals = useMemo(() => {
    const t = { total: 0, resolved: 0, pending: 0, critical: 0 };
    userStats.forEach(u => { t.total += u.total; t.resolved += u.resolved; t.pending += u.pending; t.critical += u.critical; });
    return t;
  }, [userStats]);

  // Date filter component (shared)
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
          {filteredTickets.length} tiket
        </Badge>
      )}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">👥 List Team</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Statistik ticket per tim dan aktivitas user NOC</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="team-stats" className="text-xs sm:text-sm gap-1.5">
            👥 Team Ritel/Serpo
          </TabsTrigger>
          <TabsTrigger value="team-noc" className="text-xs sm:text-sm gap-1.5">
            💻 Team NOC
          </TabsTrigger>
        </TabsList>

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
                      <p className="text-sm">Belum ada data tim. Buat tiket untuk melihat statistik tim.</p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="shadow-card border-l-4 border-l-primary">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Tim Aktif</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{teamStatsByCategory.ritel.length + teamStatsByCategory.feeder.length}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20">{teamStatsByCategory.ritel.length} Ritel</Badge>
                      <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">{teamStatsByCategory.feeder.length} Serpo</Badge>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-card border-l-4 border-l-muted-foreground">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Insident</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{teamStatsByCategory.ritelTotal + teamStatsByCategory.feederTotal}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card border-l-4 border-l-success">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Resolved</p>
                    <p className="text-lg sm:text-2xl font-bold text-success mt-1">{teamStatsByCategory.ritelResolved + teamStatsByCategory.feederResolved}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card border-l-4 border-l-destructive">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Resolution Rate</p>
                    <p className="text-lg sm:text-2xl font-bold text-primary mt-1">
                      {(teamStatsByCategory.ritelTotal + teamStatsByCategory.feederTotal) > 0
                        ? Math.round(((teamStatsByCategory.ritelResolved + teamStatsByCategory.feederResolved) / (teamStatsByCategory.ritelTotal + teamStatsByCategory.feederTotal)) * 100)
                        : 0}%
                    </p>
                  </CardContent>
                </Card>
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
                            Tiket {statusFilter}
                          </SheetTitle>
                          <SheetDescription className="text-xs sm:text-sm">
                            {filteredList.length} tiket dengan status {statusFilter}
                          </SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                          <div className="space-y-3 pr-2">
                            {filteredList.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-8">Tidak ada tiket {statusFilter}</p>
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
                <Card className="shadow-card border-l-4 border-l-primary">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total User Aktif</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{userStats.length}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card border-l-4 border-l-muted-foreground">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Incident</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{nocTotals.total}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card border-l-4 border-l-success">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Resolved</p>
                    <p className="text-lg sm:text-2xl font-bold text-success mt-1">{nocTotals.resolved}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card border-l-4 border-l-destructive">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Resolution Rate</p>
                    <p className="text-lg sm:text-2xl font-bold text-primary mt-1">
                      {nocTotals.total > 0 ? Math.round((nocTotals.resolved / nocTotals.total) * 100) : 0}%
                    </p>
                  </CardContent>
                </Card>
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
                            {filteredList.length} tiket berstatus {statusFilter}
                          </SheetDescription>
                        </SheetHeader>
                        <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                          <div className="space-y-3 pr-2">
                            {filteredList.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada tiket {statusFilter}</p>
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
                  <CardTitle className="flex items-center justify-between text-sm sm:text-base">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-accent text-accent-foreground text-[10px] px-2">NOC</Badge>
                      <span>Ranking User NOC</span>
                      <Badge variant="secondary" className="text-[10px]">{userStats.length} user</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground font-normal">
                      {nocTotals.total} insident • {nocTotals.resolved} resolved
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="min-w-[560px]">
                      <ScrollArea className={userStats.length > 8 ? "h-[420px]" : ""}>
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
                            {userStats.map((u, i) => {
                              const rate = u.total > 0 ? Math.round((u.resolved / u.total) * 100) : 0;
                              return (
                                <TableRow
                                  key={u.name}
                                  className="cursor-pointer transition-colors hover:bg-accent/5"
                                  onClick={() => setNocUserSheet(u.name)}
                                >
                                  <TableCell className="text-xs font-medium text-muted-foreground py-2">{i + 1}</TableCell>
                                  <TableCell className="py-2">
                                    <span className="text-xs sm:text-sm font-semibold truncate block max-w-[140px] sm:max-w-[200px]">{u.name}</span>
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
