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
                  <CardHeader className="py-2 sm:py-3 px-3 sm:px-4 border-b bg-primary/5">
                    <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                      <Badge className="bg-primary text-primary-foreground text-[9px] sm:text-[10px] px-1.5 sm:px-2">RITEL</Badge>
                      Statistik Incident Ritel
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {teamStatsByCategory.ritel.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                          <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
                            <p className="text-base sm:text-xl font-bold text-success">{teamStatsByCategory.ritelResolved}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</p>
                          </div>
                          <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
                            <p className="text-base sm:text-xl font-bold text-warning">{teamStatsByCategory.ritelTotal - teamStatsByCategory.ritelResolved - teamStatsByCategory.ritel.reduce((s, t) => s + t.critical, 0)}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
                          </div>
                          <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10">
                            <p className="text-base sm:text-xl font-bold text-destructive">{teamStatsByCategory.ritel.reduce((s, t) => s + t.critical, 0)}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Critical</p>
                          </div>
                        </div>
                        <ChartContainer config={chartConfig} className="h-[140px] sm:h-[180px] w-full">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Resolved", value: teamStatsByCategory.ritelResolved, fill: "hsl(var(--success))" },
                                { name: "Pending", value: teamStatsByCategory.ritelTotal - teamStatsByCategory.ritelResolved - teamStatsByCategory.ritel.reduce((s, t) => s + t.critical, 0), fill: "hsl(var(--warning))" },
                                { name: "Critical", value: teamStatsByCategory.ritel.reduce((s, t) => s + t.critical, 0), fill: "hsl(var(--destructive))" },
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              fontSize={10}
                            >
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ChartContainer>
                        {/* Top 5 Ritel teams mini ranking */}
                        <div className="space-y-1 sm:space-y-1.5">
                          <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Top 5 Tim Ritel</p>
                          {teamStatsByCategory.ritel.slice(0, 5).map((t, i) => {
                            const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                            return (
                              <div key={t.team} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground w-3 sm:w-4">{i + 1}</span>
                                <span className="text-[9px] sm:text-xs font-medium truncate flex-1 min-w-0">{t.team}</span>
                                <span className="text-[9px] sm:text-[10px] font-mono shrink-0">{t.total}</span>
                                <Progress value={rate} className="h-1 sm:h-1.5 w-10 sm:w-16 shrink-0" />
                                <span className={cn("text-[8px] sm:text-[9px] font-bold w-6 sm:w-7 text-right shrink-0", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Belum ada data Ritel</p>
                    )}
                  </CardContent>
                </Card>

                {/* Serpo/Feeder Incident Stats */}
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="py-2 sm:py-3 px-3 sm:px-4 border-b bg-warning/5">
                    <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
                      <Badge className="bg-warning text-warning-foreground text-[9px] sm:text-[10px] px-1.5 sm:px-2">FEEDER</Badge>
                      Statistik Incident Serpo
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-4">
                    {teamStatsByCategory.feeder.length > 0 ? (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                          <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
                            <p className="text-base sm:text-xl font-bold text-success">{teamStatsByCategory.feederResolved}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</p>
                          </div>
                          <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
                            <p className="text-base sm:text-xl font-bold text-warning">{teamStatsByCategory.feederTotal - teamStatsByCategory.feederResolved - teamStatsByCategory.feeder.reduce((s, t) => s + t.critical, 0)}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Pending</p>
                          </div>
                          <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10">
                            <p className="text-base sm:text-xl font-bold text-destructive">{teamStatsByCategory.feeder.reduce((s, t) => s + t.critical, 0)}</p>
                            <p className="text-[8px] sm:text-[10px] text-muted-foreground">Critical</p>
                          </div>
                        </div>
                        <ChartContainer config={chartConfig} className="h-[140px] sm:h-[180px] w-full">
                          <PieChart>
                            <Pie
                              data={[
                                { name: "Resolved", value: teamStatsByCategory.feederResolved, fill: "hsl(var(--success))" },
                                { name: "Pending", value: teamStatsByCategory.feederTotal - teamStatsByCategory.feederResolved - teamStatsByCategory.feeder.reduce((s, t) => s + t.critical, 0), fill: "hsl(var(--warning))" },
                                { name: "Critical", value: teamStatsByCategory.feeder.reduce((s, t) => s + t.critical, 0), fill: "hsl(var(--destructive))" },
                              ].filter(d => d.value > 0)}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={55}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              fontSize={10}
                            >
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </PieChart>
                        </ChartContainer>
                        {/* Top 5 Serpo teams mini ranking */}
                        <div className="space-y-1 sm:space-y-1.5">
                          <p className="text-[9px] sm:text-xs font-semibold text-muted-foreground">Top 5 Tim Serpo</p>
                          {teamStatsByCategory.feeder.slice(0, 5).map((t, i) => {
                            const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                            return (
                              <div key={t.team} className="flex items-center gap-1.5 sm:gap-2">
                                <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground w-3 sm:w-4">{i + 1}</span>
                                <span className="text-[9px] sm:text-xs font-medium truncate flex-1 min-w-0">{t.team}</span>
                                <span className="text-[9px] sm:text-[10px] font-mono shrink-0">{t.total}</span>
                                <Progress value={rate} className="h-1 sm:h-1.5 w-10 sm:w-16 shrink-0" />
                                <span className={cn("text-[8px] sm:text-[9px] font-bold w-6 sm:w-7 text-right shrink-0", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-6">Belum ada data Serpo</p>
                    )}
                  </CardContent>
                </Card>
              </div>

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
                    <ScrollArea className={teamStatsByCategory.ritel.length > 5 ? "h-[420px]" : ""}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-[10px] sm:text-xs w-8">#</TableHead>
                            <TableHead className="text-[10px] sm:text-xs">Nama Tim</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center">Total</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center text-success">Resolved</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center text-warning">Pending</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center text-destructive">Critical</TableHead>
                            <TableHead className="text-[10px] sm:text-xs w-[120px] sm:w-[160px]">Progress</TableHead>
                            <TableHead className="text-[10px] sm:text-xs w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamStatsByCategory.ritel.map((t, i) => {
                            const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                            return (
                              <TableRow
                                key={t.team}
                                className={cn("cursor-pointer transition-colors", selectedTeam === t.team && "bg-primary/5")}
                                onClick={() => setSelectedTeam(t.team)}
                              >
                                <TableCell className="text-xs font-medium text-muted-foreground">{i + 1}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px]">{t.team}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-bold">{t.total}</TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-medium text-success">{t.resolved}</TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-medium text-warning">{t.pending}</TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-medium text-destructive">{t.critical}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={rate} className="h-2 flex-1" />
                                    <span className={cn("text-[10px] sm:text-xs font-bold min-w-[32px] text-right", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setSelectedTeam(t.team); }}>
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                                      <SheetHeader>
                                        <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
                                          <Badge className="bg-primary text-primary-foreground text-[10px]">RITEL</Badge>
                                          {t.team}
                                        </SheetTitle>
                                        <SheetDescription className="text-xs sm:text-sm">
                                          {t.total} total insident • {t.resolved} resolved • Rate: {rate}%
                                        </SheetDescription>
                                      </SheetHeader>
                                      <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                                        <div className="space-y-3 pr-2">
                                          {t.tickets.map((ticket: any) => (
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
                                    </SheetContent>
                                  </Sheet>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
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
                    <ScrollArea className={teamStatsByCategory.feeder.length > 5 ? "h-[420px]" : ""}>
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="text-[10px] sm:text-xs w-8">#</TableHead>
                            <TableHead className="text-[10px] sm:text-xs">Nama Tim</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center">Total</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center text-success">Resolved</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center text-warning">Pending</TableHead>
                            <TableHead className="text-[10px] sm:text-xs text-center text-destructive">Critical</TableHead>
                            <TableHead className="text-[10px] sm:text-xs w-[120px] sm:w-[160px]">Progress</TableHead>
                            <TableHead className="text-[10px] sm:text-xs w-8"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamStatsByCategory.feeder.map((t, i) => {
                            const rate = t.total > 0 ? Math.round((t.resolved / t.total) * 100) : 0;
                            return (
                              <TableRow
                                key={t.team}
                                className={cn("cursor-pointer transition-colors", selectedTeam === t.team && "bg-warning/5")}
                                onClick={() => setSelectedTeam(t.team)}
                              >
                                <TableCell className="text-xs font-medium text-muted-foreground">{i + 1}</TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span className="text-xs sm:text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px]">{t.team}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-bold">{t.total}</TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-medium text-success">{t.resolved}</TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-medium text-warning">{t.pending}</TableCell>
                                <TableCell className="text-center text-xs sm:text-sm font-medium text-destructive">{t.critical}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Progress value={rate} className="h-2 flex-1" />
                                    <span className={cn("text-[10px] sm:text-xs font-bold min-w-[32px] text-right", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Sheet>
                                    <SheetTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); setSelectedTeam(t.team); }}>
                                        <Eye className="h-3.5 w-3.5" />
                                      </Button>
                                    </SheetTrigger>
                                    <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                                      <SheetHeader>
                                        <SheetTitle className="text-base sm:text-lg flex items-center gap-2">
                                          <Badge className="bg-warning text-warning-foreground text-[10px]">FEEDER</Badge>
                                          {t.team}
                                        </SheetTitle>
                                        <SheetDescription className="text-xs sm:text-sm">
                                          {t.total} total insident • {t.resolved} resolved • Rate: {rate}%
                                        </SheetDescription>
                                      </SheetHeader>
                                      <ScrollArea className="h-[calc(100vh-150px)] mt-4">
                                        <div className="space-y-3 pr-2">
                                          {t.tickets.map((ticket: any) => (
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
                                                    <div><span className="text-muted-foreground">Type:</span><p className="font-medium truncate">
                                                      {ticket.constraint === "OLT DOWN" ? ticket.hostname :
                                                       ticket.constraint === "PORT DOWN" ? (ticket.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || "PORT INFO") :
                                                       ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT LOW RX" ? ticket.fatId :
                                                       ticket.constraint}
                                                    </p></div>
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
                                    </SheetContent>
                                  </Sheet>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
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
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
              {/* Summary Cards */}
              <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="shadow-card">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total User Aktif</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{userStats.length}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Incident</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">{filteredTickets.length}</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Top Creator</p>
                    <p className="text-sm sm:text-base font-bold mt-1 truncate">{userStats[0]?.name || "-"}</p>
                    <p className="text-[10px] text-muted-foreground">{userStats[0]?.total || 0} tiket</p>
                  </CardContent>
                </Card>
                <Card className="shadow-card">
                  <CardContent className="p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Rata-rata/User</p>
                    <p className="text-lg sm:text-2xl font-bold mt-1">
                      {userStats.length > 0 ? Math.round(filteredTickets.length / userStats.length) : 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Bar Chart per User */}
              <Card className="shadow-card lg:col-span-2 overflow-hidden">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
                    Statistik Incident per User
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-6 pt-0">
                  <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] w-full">
                    <BarChart
                      data={userStats}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                      barCategoryGap="20%"
                      barGap={2}
                      onClick={(data) => {
                        if (data?.activePayload?.[0]?.payload?.name) {
                          setSelectedUser(data.activePayload[0].payload.name);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                      />
                       <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                       />
                      <ChartTooltip
                        content={<ChartTooltipContent labelFormatter={(v) => `User: ${v}`} />}
                      />
                      <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
                      <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} cursor="pointer" maxBarSize={16} />
                      <Bar dataKey="resolved" name="Resolved" fill="hsl(var(--success))" radius={[0, 3, 3, 0]} cursor="pointer" maxBarSize={16} />
                      <Bar dataKey="pending" name="Pending" fill="hsl(var(--warning))" radius={[0, 3, 3, 0]} cursor="pointer" maxBarSize={16} />
                      <Bar dataKey="critical" name="Critical" fill="hsl(var(--destructive))" radius={[0, 3, 3, 0]} cursor="pointer" maxBarSize={16} />
                    </BarChart>
                  </ChartContainer>
                  <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2">
                    Klik pada bar untuk melihat detail incident user
                  </p>
                </CardContent>
              </Card>

              {/* Detail Panel per User */}
              <Card className="shadow-card">
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="truncate">{selectedUser ? `Detail: ${selectedUser}` : "Detail User"}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  {(() => {
                    const userData = userStats.find(u => u.name === selectedUser);
                    if (!userData) {
                      return (
                        <div className="text-center text-muted-foreground py-6 sm:py-8">
                          <Monitor className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                          <p className="text-xs sm:text-sm">Klik pada grafik untuk melihat detail user</p>
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">Total Incidents:</span>
                            <span className="font-bold">{userData.total}</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-success">Resolved:</span>
                            <span className="font-medium text-success">{userData.resolved}</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-warning">In Progress/Pending:</span>
                            <span className="font-medium text-warning">{userData.pending}</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-destructive">Critical:</span>
                            <span className="font-medium text-destructive">{userData.critical}</span>
                          </div>
                          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                            <div className="flex justify-between text-xs sm:text-sm font-medium">
                              <span>Resolution Rate:</span>
                              <span className="text-primary">
                                {userData.total > 0
                                  ? Math.round((userData.resolved / userData.total) * 100)
                                  : 0}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <Sheet>
                          <SheetTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full mt-3 sm:mt-4 text-xs sm:text-sm">
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              Lihat Detail Incidents
                            </Button>
                          </SheetTrigger>
                          <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                            <SheetHeader>
                              <SheetTitle className="text-base sm:text-lg">Detail Incidents - {selectedUser}</SheetTitle>
                              <SheetDescription className="text-xs sm:text-sm">
                                Daftar semua incident yang dibuat oleh {selectedUser}
                              </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="h-[calc(100vh-150px)] sm:h-[calc(100vh-120px)] mt-4 sm:mt-6">
                              <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                                {userData.tickets.map((ticket: any) => (
                                  <Card key={ticket.id} className="shadow-sm">
                                    <CardContent className="p-3 sm:pt-4">
                                      <div className="space-y-2 sm:space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="min-w-0 flex-1">
                                            <p className="font-bold text-xs sm:text-sm truncate">{ticket.ticketId || ticket.id}</p>
                                            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                              {ticket.createdAt} • {ticket.serpo}
                                            </p>
                                          </div>
                                          <div className="flex flex-col gap-1 flex-shrink-0">
                                            <StatusBadge status={ticket.status} />
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] sm:text-xs ${
                                                ticket.category === "FEEDER"
                                                  ? "bg-warning/10 text-warning border-warning/20"
                                                  : "bg-primary/10 text-primary border-primary/20"
                                              }`}
                                            >
                                              {ticket.category}
                                            </Badge>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs">
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">Customer:</span>
                                            <p className="font-medium truncate">{ticket.customerName}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">Service ID:</span>
                                            <p className="font-medium font-mono truncate">{ticket.serviceId}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">Constraint:</span>
                                            <p className="font-medium truncate">{ticket.constraint}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">Serpo:</span>
                                            <p className="font-medium truncate">{ticket.serpo}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">Hostname:</span>
                                            <p className="font-medium font-mono text-[9px] sm:text-[10px] truncate">{ticket.hostname}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">FAT ID:</span>
                                            <p className="font-medium font-mono truncate">{ticket.fatId}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">SN ONT:</span>
                                            <p className="font-medium font-mono truncate">{ticket.snOnt}</p>
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-muted-foreground">Ticket ID:</span>
                                            <p className="font-medium font-mono truncate">{ticket.ticketId}</p>
                                          </div>
                                        </div>

                                        <div className="pt-2 border-t">
                                          <span className="text-[10px] sm:text-xs text-muted-foreground">Ticket Result:</span>
                                          <p className="text-[10px] sm:text-xs font-mono mt-1 p-1.5 sm:p-2 bg-muted/50 rounded break-all">
                                            {ticket.ticketResult}
                                          </p>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </ScrollArea>
                          </SheetContent>
                        </Sheet>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>

              {/* Table Ranking */}
              <div className="lg:col-span-3">
                <Card className="shadow-card">
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                      🏆 Ranking User
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0">
                    <ScrollArea className="h-[320px] sm:h-[380px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs w-8">#</TableHead>
                            <TableHead className="text-xs">User</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                            <TableHead className="text-xs text-right">Resolved</TableHead>
                            <TableHead className="text-xs text-right">Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userStats.map((u, i) => (
                            <TableRow
                              key={u.name}
                              className={cn("cursor-pointer", selectedUser === u.name && "bg-muted")}
                              onClick={() => setSelectedUser(u.name)}
                            >
                              <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                              <TableCell className="text-xs font-medium truncate max-w-[100px]">{u.name}</TableCell>
                              <TableCell className="text-xs text-right font-bold">{u.total}</TableCell>
                              <TableCell className="text-xs text-right text-success">{u.resolved}</TableCell>
                              <TableCell className="text-xs text-right text-primary font-medium">
                                {u.total > 0 ? Math.round((u.resolved / u.total) * 100) : 0}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
