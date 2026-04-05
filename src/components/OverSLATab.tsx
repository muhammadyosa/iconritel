import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Ticket } from "@/types/ticket";
import { StatusBadge } from "@/components/StatusBadge";
import { DurationCell } from "@/components/DurationCell";
import { RegionBadge } from "@/components/RegionBadge";
import { AlertTriangle, Clock, Search, Timer, TrendingUp, ChevronRight } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const SLA_MS = 8 * 60 * 60 * 1000;

const REGION_COLORS = [
  "hsl(217, 91%, 45%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 55%)",
  "hsl(262, 80%, 55%)",
  "hsl(180, 70%, 40%)",
  "hsl(330, 75%, 50%)",
  "hsl(25, 95%, 53%)",
  "hsl(195, 85%, 45%)",
  "hsl(55, 80%, 45%)",
];

function formatDuration(ms: number): string {
  if (ms < 0) ms = 0;
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} HARI`);
  if (hours > 0) parts.push(`${hours} JAM`);
  parts.push(`${minutes} MENIT`);
  return parts.join(" ");
}

type CardType = "total" | "critical" | "onProgress" | "pending";

interface OverSLATabProps {
  tickets: Ticket[];
  getTicketRegion: (serpo: string) => string;
}

export function OverSLATab({ tickets, getTicketRegion }: OverSLATabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [activeCard, setActiveCard] = useState<CardType | null>(null);

  // Filter: over SLA (>= 8h) OR Pending
  const overSLATickets = useMemo(() => {
    return tickets.filter((t) => {
      if (t.status === "Pending") return true;
      if (t.status === "Resolved") return false;
      const elapsed = Date.now() - new Date(t.createdISO).getTime();
      return elapsed >= SLA_MS;
    });
  }, [tickets]);

  // Search filter
  const filteredTickets = useMemo(() => {
    if (!searchQuery.trim()) return overSLATickets;
    const q = searchQuery.toLowerCase();

    return overSLATickets.filter((t) => {
      if (searchField === "all") {
        return (
          t.id.toLowerCase().includes(q) ||
          t.constraint.toLowerCase().includes(q) ||
          t.serpo.toLowerCase().includes(q) ||
          getTicketRegion(t.serpo).toLowerCase().includes(q) ||
          t.status.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q)
        );
      }
      switch (searchField) {
        case "ticketId": return t.id.toLowerCase().includes(q);
        case "constraint": return t.constraint.toLowerCase().includes(q);
        case "serpo": return t.serpo.toLowerCase().includes(q);
        case "region": return getTicketRegion(t.serpo).toLowerCase().includes(q);
        case "status": return t.status.toLowerCase().includes(q);
        default: return true;
      }
    });
  }, [overSLATickets, searchQuery, searchField, getTicketRegion]);

  // Sort by duration descending
  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const endA = a.status === "Pending" && a.resolvedAt ? new Date(a.resolvedAt).getTime() : Date.now();
      const endB = b.status === "Pending" && b.resolvedAt ? new Date(b.resolvedAt).getTime() : Date.now();
      const durA = endA - new Date(a.createdISO).getTime();
      const durB = endB - new Date(b.createdISO).getTime();
      return durB - durA;
    });
  }, [filteredTickets]);

  // Region chart data
  const regionData = useMemo(() => {
    const map: Record<string, { overSLA: number; pending: number }> = {};
    overSLATickets.forEach((t) => {
      const region = getTicketRegion(t.serpo);
      if (!map[region]) map[region] = { overSLA: 0, pending: 0 };
      if (t.status === "Pending") {
        map[region].pending++;
      } else {
        map[region].overSLA++;
      }
    });
    return Object.entries(map)
      .map(([name, val]) => ({ name, ...val, total: val.overSLA + val.pending }))
      .sort((a, b) => b.total - a.total);
  }, [overSLATickets, getTicketRegion]);

  // Pie data
  const pieData = useMemo(() => {
    return regionData.map((r) => ({ name: r.name, value: r.total }));
  }, [regionData]);

  // Stats
  const stats = useMemo(() => {
    const critical = overSLATickets.filter((t) => t.status === "Critical").length;
    const onProgress = overSLATickets.filter((t) => t.status === "On Progress").length;
    const pending = overSLATickets.filter((t) => t.status === "Pending").length;
    return { total: overSLATickets.length, critical, onProgress, pending };
  }, [overSLATickets]);

  // Drill-down tickets for card
  const cardDrillDown = useMemo(() => {
    if (!activeCard) return [];
    switch (activeCard) {
      case "total": return overSLATickets;
      case "critical": return overSLATickets.filter((t) => t.status === "Critical");
      case "onProgress": return overSLATickets.filter((t) => t.status === "On Progress");
      case "pending": return overSLATickets.filter((t) => t.status === "Pending");
    }
  }, [activeCard, overSLATickets]);

  // Region breakdown for drill-down
  const cardRegionBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    cardDrillDown.forEach((t) => {
      const r = getTicketRegion(t.serpo);
      map[r] = (map[r] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cardDrillDown, getTicketRegion]);

  // Constraint breakdown for drill-down
  const cardConstraintBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    cardDrillDown.forEach((t) => {
      map[t.constraint] = (map[t.constraint] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [cardDrillDown]);

  const cardLabels: Record<CardType, { label: string; emoji: string; color: string; bgColor: string; borderColor: string }> = {
    total: { label: "Total Over SLA", emoji: "⚠️", color: "text-orange-400", bgColor: "bg-orange-500/10 hover:bg-orange-500/15", borderColor: "border-orange-500/20 hover:border-orange-500/40" },
    critical: { label: "Critical", emoji: "🔴", color: "text-red-400", bgColor: "bg-red-500/10 hover:bg-red-500/15", borderColor: "border-red-500/20 hover:border-red-500/40" },
    onProgress: { label: "On Progress", emoji: "🔵", color: "text-blue-400", bgColor: "bg-blue-500/10 hover:bg-blue-500/15", borderColor: "border-blue-500/20 hover:border-blue-500/40" },
    pending: { label: "Pending", emoji: "🟡", color: "text-amber-400", bgColor: "bg-amber-500/10 hover:bg-amber-500/15", borderColor: "border-amber-500/20 hover:border-amber-500/40" },
  };

  const cardIcons: Record<CardType, React.ReactNode> = {
    total: <AlertTriangle className="h-4 w-4 text-orange-400" />,
    critical: <Timer className="h-4 w-4 text-red-400" />,
    onProgress: <Clock className="h-4 w-4 text-blue-400" />,
    pending: <AlertTriangle className="h-4 w-4 text-amber-400" />,
  };

  const cardValues: Record<CardType, number> = {
    total: stats.total,
    critical: stats.critical,
    onProgress: stats.onProgress,
    pending: stats.pending,
  };

  return (
    <div className="space-y-3">
      {/* Stats Cards - Interactive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["total", "critical", "onProgress", "pending"] as CardType[]).map((type) => {
          const cfg = cardLabels[type];
          return (
            <motion.div
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className={cn(
                  "shadow-sm border cursor-pointer transition-all duration-200",
                  cfg.bgColor, cfg.borderColor
                )}
                onClick={() => setActiveCard(type)}
              >
                <CardContent className="p-2 sm:p-3 flex items-center gap-2">
                  <div className={cn("p-1.5 rounded-lg", cfg.bgColor)}>
                    {cardIcons[type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{cfg.label}</p>
                    <p className={cn("text-base sm:text-lg font-bold", cfg.color)}>{cardValues[type]}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
        {/* Pie Chart */}
        <Card className="shadow-sm border">
          <CardHeader className="py-1.5 sm:py-2 px-2 sm:px-3 border-b bg-muted/30">
            <CardTitle className="text-xs sm:text-sm">🗺️ Proporsi Over SLA per Region</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {pieData.length > 0 ? (
              <div className="h-[200px] sm:h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={REGION_COLORS[i % REGION_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [`${value} incident`, "Jumlah"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-xs py-8">Tidak ada data</p>
            )}
            {/* Legend */}
            <div className="grid grid-cols-2 gap-1 mt-2">
              {regionData.map((r, i) => (
                <div key={r.name} className="flex items-center gap-1.5 text-[9px] sm:text-[10px]">
                  <div
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: REGION_COLORS[i % REGION_COLORS.length] }}
                  />
                  <span className="truncate">{r.name}</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 ml-auto">{r.total}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card className="shadow-sm border">
          <CardHeader className="py-1.5 sm:py-2 px-2 sm:px-3 border-b bg-muted/30">
            <CardTitle className="text-xs sm:text-sm">📊 Over SLA & Pending per Region</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {regionData.length > 0 ? (
              <div className="h-[200px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={regionData} layout="vertical" margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" tick={{ fontSize: 9 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={80}
                      tick={{ fontSize: 9 }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      formatter={(value: number, name: string) => [
                        value,
                        name === "overSLA" ? "Over SLA" : "Pending",
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 10 }}
                      formatter={(value) => (value === "overSLA" ? "Over SLA" : "Pending")}
                    />
                    <Bar dataKey="overSLA" stackId="a" fill="hsl(0, 84%, 55%)" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="pending" stackId="a" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground text-xs py-8">Tidak ada data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="shadow-sm border">
        <CardHeader className="py-1.5 sm:py-2 px-2 sm:px-3 border-b bg-muted/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <CardTitle className="text-xs sm:text-sm">📢 List Over SLA & Pending ({sortedTickets.length})</CardTitle>
            <div className="flex gap-1">
              <Select value={searchField} onValueChange={setSearchField}>
                <SelectTrigger className="h-6 sm:h-7 text-[9px] sm:text-[10px] w-[90px] sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="ticketId">Incident ID</SelectItem>
                  <SelectItem value="constraint">Constraint</SelectItem>
                  <SelectItem value="serpo">Serpo</SelectItem>
                  <SelectItem value="region">Region</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Cari..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-6 sm:h-7 text-[9px] sm:text-[10px] pl-6 w-[130px] sm:w-[160px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-1.5 sm:p-2">
          <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[50vh] sm:max-h-[55vh]">
            <Table className="min-w-[700px]">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="h-5 sm:h-6">
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">No</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Incident ID</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Constraint</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Serpo/Tim</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Region</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Durasi</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Status</TableHead>
                  <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">Dibuat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">
                      ✅ Tidak ada incident Over SLA atau Pending
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedTickets.map((ticket, idx) => (
                    <TableRow key={ticket.id} className="h-6 sm:h-7 hover:bg-muted/40 cursor-pointer">
                      <TableCell className="px-1 py-0.5 text-[8px] sm:text-[9px] text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="px-1 py-0.5 font-mono text-[9px] sm:text-[10px] font-medium">{ticket.id}</TableCell>
                      <TableCell className="px-1 py-0.5 text-[9px] sm:text-[10px]">
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] px-1 py-0">
                          {ticket.constraint}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-[9px] sm:text-[10px]">{ticket.serpo}</TableCell>
                      <TableCell className="px-1 py-0.5">
                        <RegionBadge region={getTicketRegion(ticket.serpo)} />
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <DurationCell
                          createdISO={ticket.createdISO}
                          status={ticket.status}
                          resolvedAt={ticket.resolvedAt}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-0.5">
                        <StatusBadge status={ticket.status} />
                      </TableCell>
                      <TableCell className="px-1 py-0.5 text-[8px] sm:text-[9px] text-muted-foreground whitespace-nowrap">
                        {ticket.createdAt}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Dialog */}
      <Dialog open={activeCard !== null} onOpenChange={(open) => !open && setActiveCard(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              {activeCard && cardLabels[activeCard].emoji} {activeCard && cardLabels[activeCard].label}
              <Badge variant="secondary" className="text-xs">{cardDrillDown.length} Incident</Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Detail incident berdasarkan status yang dipilih
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Region Breakdown */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Distribusi per Region
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {cardRegionBreakdown.map((r) => (
                  <div key={r.name} className="flex items-center justify-between bg-muted/40 rounded-md px-2 py-1.5">
                    <RegionBadge region={r.name} />
                    <Badge variant="outline" className="text-[9px] font-bold">{r.count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Constraint Breakdown */}
            <div>
              <h4 className="text-[10px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                📋 Top Constraint
              </h4>
              <div className="flex flex-wrap gap-1">
                {cardConstraintBreakdown.slice(0, 8).map((c) => (
                  <Badge key={c.name} variant="outline" className="text-[8px] sm:text-[9px] px-1.5 py-0.5 gap-1">
                    {c.name}
                    <span className="font-bold text-primary">{c.count}</span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Ticket list */}
            <ScrollArea className="max-h-[40vh]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow className="h-6">
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">ID</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Constraint</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Region</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Durasi</TableHead>
                      <TableHead className="px-1.5 py-0.5 text-[8px] sm:text-[9px] bg-muted/80">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cardDrillDown.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-xs">
                          Tidak ada data
                        </TableCell>
                      </TableRow>
                    ) : (
                      cardDrillDown.map((t) => (
                        <TableRow key={t.id} className="h-6 hover:bg-muted/40">
                          <TableCell className="px-1.5 py-0.5 font-mono text-[9px] font-medium">{t.id}</TableCell>
                          <TableCell className="px-1.5 py-0.5 text-[9px]">{t.constraint}</TableCell>
                          <TableCell className="px-1.5 py-0.5">
                            <RegionBadge region={getTicketRegion(t.serpo)} />
                          </TableCell>
                          <TableCell className="px-1.5 py-0.5">
                            <DurationCell createdISO={t.createdISO} status={t.status} resolvedAt={t.resolvedAt} />
                          </TableCell>
                          <TableCell className="px-1.5 py-0.5">
                            <StatusBadge status={t.status} />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
