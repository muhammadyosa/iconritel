import { Users, Eye, CalendarIcon, X } from "lucide-react";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts";
import { useState } from "react";
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

export default function Teams() {
  const { tickets, isLoading } = useCloudTickets();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [periodPreset, setPeriodPreset] = useState<string>("all");

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

  const teamStats = filteredTickets.reduce((acc, ticket) => {
    if (!ticket.serpo) return acc;
    if (!acc[ticket.serpo]) {
      acc[ticket.serpo] = {
        total: 0,
        resolved: 0,
        pending: 0,
        critical: 0,
        tickets: [],
      };
    }
    acc[ticket.serpo].total++;
    acc[ticket.serpo].tickets.push(ticket);
    if (ticket.status === "Resolved") acc[ticket.serpo].resolved++;
    if (ticket.status === "Pending" || ticket.status === "On Progress")
      acc[ticket.serpo].pending++;
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

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">👥 List Team</h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Statistik ticket per tim dalam bentuk grafik batang</p>
      </div>

      {/* Date Filter */}
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
            <SelectItem value="custom">Kustom</SelectItem>
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

      {Object.keys(teamStats).length === 0 ? (
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
        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Bar Chart */}
          <Card className="shadow-card lg:col-span-2 overflow-hidden">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                Statistik Ticket per Tim
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 sm:p-6 pt-0">
              <ChartContainer config={chartConfig} className="h-[300px] sm:h-[400px] md:h-[500px] w-full transition-all duration-500 ease-out">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                  barCategoryGap="20%"
                  barGap={2}
                  onClick={(data) => {
                    if (data?.activePayload?.[0]?.payload?.team) {
                      setSelectedTeam(data.activePayload[0].payload.team);
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
                    dataKey="team"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => `Tim: ${value}`}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
                  <Bar 
                    dataKey="total" 
                    name="Total"
                    fill="hsl(var(--primary))" 
                    radius={[0, 3, 3, 0]}
                    cursor="pointer"
                    maxBarSize={16}
                  />
                  <Bar 
                    dataKey="resolved" 
                    name="Resolved"
                    fill="hsl(var(--success))" 
                    radius={[0, 3, 3, 0]}
                    cursor="pointer"
                    maxBarSize={16}
                  />
                  <Bar 
                    dataKey="pending" 
                    name="Pending"
                    fill="hsl(var(--warning))" 
                    radius={[0, 3, 3, 0]}
                    cursor="pointer"
                    maxBarSize={16}
                  />
                  <Bar 
                    dataKey="critical" 
                    name="Critical"
                    fill="hsl(var(--destructive))" 
                    radius={[0, 3, 3, 0]}
                    cursor="pointer"
                    maxBarSize={16}
                  />
                </BarChart>
              </ChartContainer>
              <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2">
                Klik pada bar untuk melihat detail tickets tim
              </p>
            </CardContent>
          </Card>

          {/* Detail Panel */}
          <Card className="shadow-card">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="truncate">{selectedTeam ? `Detail: ${selectedTeam}` : "Detail Tim"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              {selectedTeamData ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Total Tickets:</span>
                      <span className="font-bold">{selectedTeamData.total}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-success">Resolved:</span>
                      <span className="font-medium text-success">{selectedTeamData.resolved}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-warning">In Progress/Pending:</span>
                      <span className="font-medium text-warning">{selectedTeamData.pending}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-destructive">Critical:</span>
                      <span className="font-medium text-destructive">{selectedTeamData.critical}</span>
                    </div>
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                      <div className="flex justify-between text-xs sm:text-sm font-medium">
                        <span>Resolution Rate:</span>
                        <span className="text-primary">
                          {selectedTeamData.total > 0
                            ? Math.round((selectedTeamData.resolved / selectedTeamData.total) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full mt-3 sm:mt-4 text-xs sm:text-sm">
                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Lihat Detail Tickets
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-full sm:max-w-lg md:max-w-2xl p-3 sm:p-6">
                      <SheetHeader>
                        <SheetTitle className="text-base sm:text-lg">Detail Tickets - {selectedTeam}</SheetTitle>
                        <SheetDescription className="text-xs sm:text-sm">
                          Daftar semua tickets yang ditangani oleh tim {selectedTeam}
                        </SheetDescription>
                      </SheetHeader>
                      <ScrollArea className="h-[calc(100vh-150px)] sm:h-[calc(100vh-120px)] mt-4 sm:mt-6">
                        <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                          {selectedTeamData.tickets.map((ticket) => (
                            <Card key={ticket.id} className="shadow-sm">
                              <CardContent className="p-3 sm:pt-4">
                                <div className="space-y-2 sm:space-y-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-bold text-xs sm:text-sm truncate">{ticket.id}</p>
                                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                                        {ticket.createdAt}{ticket.createdByName ? ` • Create by ${ticket.createdByName}` : ""}
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
                                      <span className="text-muted-foreground">Customer/Type:</span>
                                      <p className="font-medium truncate">
                                        {ticket.category === "FEEDER" ? (
                                          ticket.constraint === "OLT DOWN" ? ticket.hostname :
                                          ticket.constraint === "PORT DOWN" ? (ticket.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || "PORT INFO") :
                                          ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT LOW RX" ? ticket.fatId :
                                          ticket.constraint
                                        ) : ticket.customerName}
                                      </p>
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
                                      <span className="text-muted-foreground">Hostname:</span>
                                      <p className="font-medium font-mono text-[9px] sm:text-[10px] truncate">
                                        {ticket.hostname}
                                      </p>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-muted-foreground">FAT ID:</span>
                                      <p className="font-medium font-mono truncate">{ticket.fatId}</p>
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-muted-foreground">SN ONT:</span>
                                      <p className="font-medium font-mono truncate">{ticket.snOnt}</p>
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
              ) : (
                <div className="text-center text-muted-foreground py-6 sm:py-8">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                  <p className="text-xs sm:text-sm">Klik pada grafik untuk melihat detail tim</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
