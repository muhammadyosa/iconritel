import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Info, Search, Server, AlertTriangle, CheckCircle, Users, MapPin, TrendingUp, ChevronRight, Layers, Shield, Zap, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { loadDefaultRegionalTeamData } from "@/lib/defaultRegionalData";
import { RegionalTeamRecord } from "@/types/regionalTeam";
import { Ticket } from "@/types/ticket";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell as RechartsCell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";

interface RegionalOfficeTabProps {
  tickets: Ticket[];
}

interface RegionalData {
  region: string;
  totalMitra: number;
  totalHostnames: number;
  ritelMitra: number;
  feederMitra: number;
  totalIncidents: number;
  resolved: number;
  pending: number;
  critical: number;
  incidentTickets: Ticket[];
  teams: RegionalTeamRecord[];
}

type SummaryCardType = "region" | "mitra" | "olt" | "incident" | "resolved";

const PIE_COLORS = [
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

export default function RegionalOfficeTab({ tickets }: RegionalOfficeTabProps) {
  const [teamData, setTeamData] = useState<RegionalTeamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<RegionalData | null>(null);
  const [activeSummaryCard, setActiveSummaryCard] = useState<SummaryCardType | null>(null);

  useEffect(() => {
    loadDefaultRegionalTeamData()
      .then((data) => { setTeamData(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const regionalData = useMemo(() => {
    const regionMap: Record<string, RegionalTeamRecord[]> = {};
    teamData.forEach((rec) => {
      const region = rec.region.trim().toUpperCase();
      if (!region) return;
      if (!regionMap[region]) regionMap[region] = [];
      regionMap[region].push(rec);
    });

    const hostnameToRegion: Record<string, string> = {};
    Object.entries(regionMap).forEach(([region, records]) => {
      records.forEach((rec) => {
        rec.hostnames.forEach((h) => {
          const normalized = h.trim().toUpperCase();
          if (normalized) hostnameToRegion[normalized] = region;
        });
      });
    });

    const stats: Record<string, RegionalData> = {};
    Object.entries(regionMap).forEach(([region, records]) => {
      const allHostnames = new Set<string>();
      let ritelCount = 0;
      let feederCount = 0;
      records.forEach((rec) => {
        rec.hostnames.forEach((h) => allHostnames.add(h.trim().toUpperCase()));
        if (rec.serpoType === "RITEL") ritelCount++;
        else if (rec.serpoType === "FEEDER") feederCount++;
      });
      stats[region] = {
        region, totalMitra: records.length, totalHostnames: allHostnames.size,
        ritelMitra: ritelCount, feederMitra: feederCount,
        totalIncidents: 0, resolved: 0, pending: 0, critical: 0,
        incidentTickets: [], teams: records,
      };
    });

    tickets.forEach((ticket) => {
      const ticketHostname = (ticket.hostname || "").trim().toUpperCase();
      const region = hostnameToRegion[ticketHostname];
      if (!region || !stats[region]) return;
      stats[region].totalIncidents++;
      stats[region].incidentTickets.push(ticket);
      if (ticket.status === "Resolved") stats[region].resolved++;
      else if (ticket.status === "Critical") stats[region].critical++;
      else stats[region].pending++;
    });

    return Object.values(stats).sort((a, b) => b.totalIncidents - a.totalIncidents);
  }, [teamData, tickets]);

  const filteredData = regionalData.filter((r) => {
    if (!searchQuery) return true;
    return r.region.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalHostnames = regionalData.reduce((s, r) => s + r.totalHostnames, 0);
  const totalMitra = regionalData.reduce((s, r) => s + r.totalMitra, 0);
  const totalIncidents = regionalData.reduce((s, r) => s + r.totalIncidents, 0);
  const totalResolved = regionalData.reduce((s, r) => s + r.resolved, 0);
  const totalPending = regionalData.reduce((s, r) => s + r.pending, 0);
  const totalCritical = regionalData.reduce((s, r) => s + r.critical, 0);
  const resolvedRate = totalIncidents > 0 ? Math.round((totalResolved / totalIncidents) * 100) : 0;

  // Find top region by incidents
  const topIncidentRegion = regionalData.length > 0 ? regionalData[0] : null;
  // Find best resolution rate
  const bestResolvedRegion = [...regionalData].filter(r => r.totalIncidents > 0)
    .sort((a, b) => (b.resolved / b.totalIncidents) - (a.resolved / a.totalIncidents))[0] || null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Memuat data Regional Team...
        </CardContent>
      </Card>
    );
  }

  if (teamData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">🗺 List Regional Office</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>
              Belum ada data Regional Team. Import data melalui{" "}
              <Link to="/settings" className="text-primary underline hover:no-underline">Settings</Link>
              {" "}(sheet &quot;List Team Region&quot;) untuk menampilkan daftar Regional Office.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summaryCards: { type: SummaryCardType; emoji: string; label: string; value: string | number; sub: string; colorClass: string; icon: typeof MapPin }[] = [
    { type: "region", emoji: "🗺", label: "Total Region", value: regionalData.length, sub: `${regionalData.filter(r => r.totalIncidents > 0).length} aktif incident`, colorClass: "from-primary/10 to-primary/5 border-primary/20", icon: MapPin },
    { type: "mitra", emoji: "👥", label: "Total Mitra", value: totalMitra.toLocaleString(), sub: `${regionalData.reduce((s, r) => s + r.ritelMitra, 0)} Ritel · ${regionalData.reduce((s, r) => s + r.feederMitra, 0)} Feeder`, colorClass: "from-accent/10 to-accent/5 border-accent/20", icon: Users },
    { type: "olt", emoji: "📡", label: "Total OLT", value: totalHostnames.toLocaleString(), sub: `avg ${regionalData.length > 0 ? Math.round(totalHostnames / regionalData.length) : 0}/region`, colorClass: "from-secondary to-secondary/50 border-border", icon: Server },
    { type: "incident", emoji: "⚠️", label: "Total Incident", value: totalIncidents.toLocaleString(), sub: `${totalCritical} critical · ${totalPending} pending`, colorClass: "from-warning/10 to-warning/5 border-warning/20", icon: AlertTriangle },
    { type: "resolved", emoji: "✅", label: "Resolved Rate", value: `${resolvedRate}%`, sub: `${totalResolved} of ${totalIncidents} resolved`, colorClass: "from-success/10 to-success/5 border-success/20", icon: CheckCircle },
  ];

  return (
    <div className="space-y-4">
      {/* Interactive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {summaryCards.map((card, idx) => (
          <motion.div
            key={card.type}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.25 }}
          >
            <Card
              className={cn(
                "relative overflow-hidden cursor-pointer border bg-gradient-to-br transition-all duration-200",
                "hover:shadow-elevated hover:scale-[1.02] active:scale-[0.98]",
                card.colorClass
              )}
              onClick={() => setActiveSummaryCard(card.type)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className="text-[10px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <card.icon className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{card.label}</span>
                    </p>
                    <p className="text-lg sm:text-2xl font-bold leading-none">{card.value}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{card.sub}</p>
                  </div>
                  <span className="text-lg sm:text-xl flex-shrink-0">{card.emoji}</span>
                </div>
                <ChevronRight className="absolute right-1.5 bottom-1.5 h-3 w-3 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      {regionalData.some(r => r.totalIncidents > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Bar Chart */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-1">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">📊 Distribusi Incident</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Status incident per wilayah regional</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 pt-1">
              <ChartContainer
                config={{
                  resolved: { label: "Resolved", color: "hsl(var(--success))" },
                  pending: { label: "Pending", color: "hsl(var(--warning))" },
                  critical: { label: "Critical", color: "hsl(var(--destructive))" },
                } satisfies ChartConfig}
                className="h-[280px] sm:h-[320px] w-full"
              >
                <BarChart
                  data={regionalData.filter(r => r.totalIncidents > 0).slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="region" width={100} tick={{ fontSize: 9 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="resolved" stackId="a" fill="hsl(var(--success))" name="Resolved" />
                  <Bar dataKey="pending" stackId="a" fill="hsl(var(--warning))" name="Pending" />
                  <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} name="Critical" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card>
            <CardHeader className="p-3 sm:p-4 pb-1">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">🥧 Proporsi Incident</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Persentase kontribusi incident per wilayah</CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 pt-1">
              {(() => {
                const pieData = regionalData.filter(r => r.totalIncidents > 0).map(r => ({ name: r.region, value: r.totalIncidents }));
                const pieConfig: ChartConfig = {};
                pieData.forEach((d, i) => { pieConfig[d.name] = { label: d.name, color: PIE_COLORS[i % PIE_COLORS.length] }; });
                const renderCustomLabel = ({ name, percent, cx, cy, midAngle, outerRadius }: any) => {
                  const RADIAN = Math.PI / 180;
                  const radius = outerRadius + 18;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  if (percent < 0.04) return null;
                  return (
                    <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central"
                      className="text-[8px] sm:text-[10px] font-semibold" style={{ textShadow: "0 0 3px hsl(var(--background))" }}>
                      {name} {(percent * 100).toFixed(0)}%
                    </text>
                  );
                };
                return (
                  <div className="flex flex-col items-center">
                    <ChartContainer config={pieConfig} className="h-[240px] sm:h-[260px] w-full max-w-[340px]">
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3}
                          dataKey="value" nameKey="name" label={renderCustomLabel}
                          labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                          strokeWidth={2} stroke="hsl(var(--background))">
                          {pieData.map((_, index) => (
                            <RechartsCell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-2">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-[9px] sm:text-[11px] font-medium text-foreground">{d.name} ({d.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Region Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            🗺 Regional Office ({regionalData.length})
          </h3>
          <div className="flex items-center gap-2 max-w-[200px] sm:max-w-xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <Input placeholder="Cari region..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredData.map((r, idx) => {
            const rate = r.totalIncidents > 0 ? Math.round((r.resolved / r.totalIncidents) * 100) : 0;
            return (
              <motion.div
                key={r.region}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03, duration: 0.2 }}
              >
                <Card
                  className="cursor-pointer transition-all duration-200 hover:shadow-elevated hover:border-primary/30 active:scale-[0.98] group overflow-hidden"
                  onClick={() => setSelectedRegion(r)}
                >
                  {/* Region header */}
                  <div className="bg-gradient-to-r from-primary/8 to-transparent px-3 py-2 sm:px-4 sm:py-2.5 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span className="font-bold text-xs sm:text-sm truncate">{r.region}</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  <CardContent className="p-3 sm:p-4 space-y-3">
                    {/* Key metrics row */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">Mitra</div>
                        <div className="text-sm sm:text-base font-bold">{r.totalMitra}</div>
                        <div className="flex justify-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1 py-0 h-auto">R:{r.ritelMitra}</Badge>
                          <Badge variant="secondary" className="text-[7px] sm:text-[8px] px-1 py-0 h-auto">F:{r.feederMitra}</Badge>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">OLT</div>
                        <div className="text-sm sm:text-base font-bold">{r.totalHostnames}</div>
                        <div className="text-[8px] text-muted-foreground mt-0.5">hostname</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-muted-foreground">Incident</div>
                        <div className={cn("text-sm sm:text-base font-bold", r.totalIncidents > 0 ? "text-warning" : "text-success")}>
                          {r.totalIncidents}
                        </div>
                        <div className="text-[8px] text-muted-foreground mt-0.5">
                          {r.totalIncidents > 0 ? `${r.critical} critical` : "clean"}
                        </div>
                      </div>
                    </div>

                    {/* Status breakdown */}
                    {r.totalIncidents > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Resolution Rate</span>
                          <span className={cn("font-bold", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>
                            {rate}%
                          </span>
                        </div>
                        <Progress value={rate} className="h-1.5" />
                        <div className="flex gap-1.5">
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-success/30 text-success">
                            ✓ {r.resolved}
                          </Badge>
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-warning/30 text-warning">
                            ◌ {r.pending}
                          </Badge>
                          {r.critical > 0 && (
                            <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-destructive/30 text-destructive">
                              ✕ {r.critical}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {r.totalIncidents === 0 && (
                      <div className="flex items-center gap-1.5 text-[10px] text-success bg-success/5 rounded px-2 py-1">
                        <Shield className="h-3 w-3" />
                        <span className="font-medium">Tidak ada incident aktif</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {filteredData.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">Tidak ada region yang sesuai.</div>
        )}

        <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground">
          Menampilkan {filteredData.length} dari {regionalData.length} region
        </div>
      </div>

      {/* Summary Card Drill-down Dialog */}
      <Dialog open={!!activeSummaryCard} onOpenChange={(open) => { if (!open) setActiveSummaryCard(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {activeSummaryCard === "region" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">🗺 Detail Region ({regionalData.length})</DialogTitle>
                <DialogDescription className="text-xs">Ringkasan seluruh wilayah regional yang terdaftar</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 mt-3">
                {regionalData.map((r) => (
                  <div key={r.region} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => { setActiveSummaryCard(null); setTimeout(() => setSelectedRegion(r), 200); }}>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold">{r.region}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px]">{r.totalMitra} mitra</Badge>
                      <Badge variant="outline" className="text-[9px]">{r.totalHostnames} OLT</Badge>
                      {r.totalIncidents > 0 && <Badge variant="destructive" className="text-[9px]">{r.totalIncidents}</Badge>}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeSummaryCard === "mitra" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">👥 Detail Mitra ({totalMitra})</DialogTitle>
                <DialogDescription className="text-xs">Distribusi mitra Ritel & Feeder per region</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] mt-3">
                <Table className="text-[10px] sm:text-xs">
                  <TableHeader>
                    <TableRow className="h-7">
                      <TableHead className="px-2 py-1">Region</TableHead>
                      <TableHead className="px-2 py-1 text-center">Ritel</TableHead>
                      <TableHead className="px-2 py-1 text-center">Feeder</TableHead>
                      <TableHead className="px-2 py-1 text-center">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regionalData.map((r) => (
                      <TableRow key={r.region} className="h-7 cursor-pointer hover:bg-accent/5"
                        onClick={() => { setActiveSummaryCard(null); setTimeout(() => setSelectedRegion(r), 200); }}>
                        <TableCell className="px-2 py-1 font-semibold">{r.region}</TableCell>
                        <TableCell className="px-2 py-1 text-center">{r.ritelMitra}</TableCell>
                        <TableCell className="px-2 py-1 text-center">{r.feederMitra}</TableCell>
                        <TableCell className="px-2 py-1 text-center font-bold">{r.totalMitra}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}

          {activeSummaryCard === "olt" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">📡 Detail OLT ({totalHostnames})</DialogTitle>
                <DialogDescription className="text-xs">Distribusi OLT hostname per region</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] mt-3">
                <Table className="text-[10px] sm:text-xs">
                  <TableHeader>
                    <TableRow className="h-7">
                      <TableHead className="px-2 py-1">Region</TableHead>
                      <TableHead className="px-2 py-1 text-center">OLT</TableHead>
                      <TableHead className="px-2 py-1 text-center">Mitra</TableHead>
                      <TableHead className="px-2 py-1">Avg/Mitra</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...regionalData].sort((a, b) => b.totalHostnames - a.totalHostnames).map((r) => (
                      <TableRow key={r.region} className="h-7 cursor-pointer hover:bg-accent/5"
                        onClick={() => { setActiveSummaryCard(null); setTimeout(() => setSelectedRegion(r), 200); }}>
                        <TableCell className="px-2 py-1 font-semibold">{r.region}</TableCell>
                        <TableCell className="px-2 py-1 text-center font-bold">{r.totalHostnames}</TableCell>
                        <TableCell className="px-2 py-1 text-center">{r.totalMitra}</TableCell>
                        <TableCell className="px-2 py-1">{r.totalMitra > 0 ? (r.totalHostnames / r.totalMitra).toFixed(1) : "0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}

          {activeSummaryCard === "incident" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">⚠️ Detail Incident ({totalIncidents})</DialogTitle>
                <DialogDescription className="text-xs">
                  {totalCritical} critical · {totalPending} pending · {totalResolved} resolved
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] mt-3">
                <div className="space-y-2">
                  {regionalData.filter(r => r.totalIncidents > 0).map((r) => {
                    const rate = Math.round((r.resolved / r.totalIncidents) * 100);
                    return (
                      <div key={r.region} className="p-2.5 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                        onClick={() => { setActiveSummaryCard(null); setTimeout(() => setSelectedRegion(r), 200); }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold">{r.region}</span>
                          <span className="text-xs font-bold">{r.totalIncidents} incident</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-1.5 flex-1" />
                          <span className={cn("text-[10px] font-bold", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                        </div>
                        <div className="flex gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-success/30 text-success">✓{r.resolved}</Badge>
                          <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-warning/30 text-warning">◌{r.pending}</Badge>
                          {r.critical > 0 && <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-destructive/30 text-destructive">✕{r.critical}</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          {activeSummaryCard === "resolved" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">✅ Resolution Rate ({resolvedRate}%)</DialogTitle>
                <DialogDescription className="text-xs">{totalResolved} dari {totalIncidents} incident terselesaikan</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] mt-3">
                <div className="space-y-2">
                  {[...regionalData].filter(r => r.totalIncidents > 0)
                    .sort((a, b) => (b.resolved / b.totalIncidents) - (a.resolved / a.totalIncidents))
                    .map((r, idx) => {
                      const rate = Math.round((r.resolved / r.totalIncidents) * 100);
                      return (
                        <div key={r.region} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => { setActiveSummaryCard(null); setTimeout(() => setSelectedRegion(r), 200); }}>
                          <span className="text-xs font-bold text-muted-foreground w-5">#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold truncate">{r.region}</span>
                              <span className={cn("text-xs font-bold", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                            </div>
                            <Progress value={rate} className="h-1.5" />
                          </div>
                        </div>
                      );
                    })}
                  {regionalData.filter(r => r.totalIncidents === 0).length > 0 && (
                    <div className="text-[10px] text-muted-foreground text-center pt-2 border-t">
                      {regionalData.filter(r => r.totalIncidents === 0).length} region tanpa incident
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Region Detail Sheet */}
      <Sheet open={!!selectedRegion} onOpenChange={(open) => { if (!open) setSelectedRegion(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRegion && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {selectedRegion.region}
                </SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedRegion.totalMitra} Mitra · {selectedRegion.totalHostnames} OLT · {selectedRegion.totalIncidents} Incident
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Card className="p-2 text-center bg-gradient-to-br from-primary/5 to-transparent">
                    <div className="text-[10px] text-muted-foreground">Ritel</div>
                    <div className="text-sm font-bold">{selectedRegion.ritelMitra}</div>
                  </Card>
                  <Card className="p-2 text-center bg-gradient-to-br from-accent/5 to-transparent">
                    <div className="text-[10px] text-muted-foreground">Feeder</div>
                    <div className="text-sm font-bold">{selectedRegion.feederMitra}</div>
                  </Card>
                  <Card className="p-2 text-center bg-gradient-to-br from-success/5 to-transparent">
                    <div className="text-[10px] text-muted-foreground">Resolved</div>
                    <div className="text-sm font-bold text-success">{selectedRegion.resolved}</div>
                  </Card>
                  <Card className="p-2 text-center bg-gradient-to-br from-destructive/5 to-transparent">
                    <div className="text-[10px] text-muted-foreground">Critical</div>
                    <div className="text-sm font-bold text-destructive">{selectedRegion.critical}</div>
                  </Card>
                </div>

                {selectedRegion.totalIncidents > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Resolution Rate</span>
                      <span className="font-bold">{Math.round((selectedRegion.resolved / selectedRegion.totalIncidents) * 100)}%</span>
                    </div>
                    <Progress value={Math.round((selectedRegion.resolved / selectedRegion.totalIncidents) * 100)} className="h-2" />
                  </div>
                )}

                {/* Teams List */}
                <div>
                  <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Daftar Tim ({selectedRegion.teams.length})
                  </h4>
                  <ScrollArea className="max-h-[30vh]">
                    <Table className="text-[10px] sm:text-xs">
                      <TableHeader>
                        <TableRow className="h-7">
                          <TableHead className="px-1.5 py-1">Tipe</TableHead>
                          <TableHead className="px-1.5 py-1">Nama Mitra</TableHead>
                          <TableHead className="px-1.5 py-1 text-center">OLT</TableHead>
                          <TableHead className="px-1.5 py-1">Tim</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedRegion.teams.map((t, idx) => (
                          <TableRow key={`${t.mitraName}-${idx}`} className="h-7">
                            <TableCell className="px-1.5 py-0.5">
                              <Badge variant={t.serpoType === "RITEL" ? "default" : "secondary"} className="text-[8px]">
                                {t.serpoType}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-1.5 py-0.5 font-medium truncate max-w-[140px]">{t.mitraName}</TableCell>
                            <TableCell className="px-1.5 py-0.5 text-center">{t.hostnames.length}</TableCell>
                            <TableCell className="px-1.5 py-0.5 truncate max-w-[100px]">{t.teamMember || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                {/* Incidents */}
                {selectedRegion.incidentTickets.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" /> Incidents ({selectedRegion.incidentTickets.length})
                    </h4>
                    <ScrollArea className="max-h-[30vh]">
                      <Table className="text-[10px] sm:text-xs">
                        <TableHeader>
                          <TableRow className="h-7">
                            <TableHead className="px-1.5 py-1">Incident ID</TableHead>
                            <TableHead className="px-1.5 py-1">Hostname</TableHead>
                            <TableHead className="px-1.5 py-1">Pelanggan</TableHead>
                            <TableHead className="px-1.5 py-1">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRegion.incidentTickets.map((t) => (
                            <TableRow key={t.id} className="h-7">
                              <TableCell className="px-1.5 py-0.5 font-mono">{t.serviceId}</TableCell>
                              <TableCell className="px-1.5 py-0.5 font-mono">{t.hostname}</TableCell>
                              <TableCell className="px-1.5 py-0.5 truncate max-w-[120px]">{t.customerName}</TableCell>
                              <TableCell className="px-1.5 py-0.5"><StatusBadge status={t.status} /></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Tidak ada incident di regional ini.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
