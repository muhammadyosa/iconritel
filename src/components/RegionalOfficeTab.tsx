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
  const [selectedTeam, setSelectedTeam] = useState<RegionalTeamRecord | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Ticket | null>(null);
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
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5 xs:gap-2 sm:gap-3">
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
              <CardContent className="p-2 xs:p-2.5 sm:p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5 xs:space-y-1 min-w-0 flex-1">
                    <p className="text-[9px] xs:text-[10px] sm:text-xs text-muted-foreground font-medium flex items-center gap-1">
                      <card.icon className="h-2.5 xs:h-3 w-2.5 xs:w-3 flex-shrink-0" />
                      <span className="truncate">{card.label}</span>
                    </p>
                    <p className="text-base xs:text-lg sm:text-2xl font-bold leading-none">{card.value}</p>
                    <p className="text-[8px] xs:text-[9px] sm:text-[10px] text-muted-foreground truncate">{card.sub}</p>
                  </div>
                  <span className="text-base xs:text-lg sm:text-xl flex-shrink-0">{card.emoji}</span>
                </div>
                <ChevronRight className="absolute right-1 bottom-1 h-2.5 w-2.5 xs:h-3 xs:w-3 text-muted-foreground/40" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      {regionalData.some(r => r.totalIncidents > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
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
                className="h-[220px] xs:h-[260px] sm:h-[320px] w-full"
              >
                <BarChart
                  data={regionalData.filter(r => r.totalIncidents > 0).slice(0, 10)}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                  barCategoryGap="20%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 9 }} />
                  <YAxis type="category" dataKey="region" width={70} tick={{ fontSize: 8 }} />
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
                    <ChartContainer config={pieConfig} className="h-[200px] xs:h-[230px] sm:h-[260px] w-full max-w-[340px]">
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
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 mb-3">
          <h3 className="text-xs xs:text-sm sm:text-base font-semibold flex items-center gap-2">
            🗺 Regional Office ({regionalData.length})
          </h3>
          <div className="flex items-center gap-2 w-full xs:w-auto xs:max-w-[200px] sm:max-w-xs">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <Input placeholder="Cari region..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs flex-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
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
                  <div className="bg-gradient-to-r from-primary/8 to-transparent px-2 py-1.5 xs:px-3 xs:py-2 sm:px-4 sm:py-2.5 border-b border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0">
                      <MapPin className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-primary flex-shrink-0" />
                      <span className="font-bold text-[11px] xs:text-xs sm:text-sm truncate">{r.region}</span>
                    </div>
                    <ChevronRight className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  <CardContent className="p-2 xs:p-3 sm:p-4 space-y-2 xs:space-y-3">
                    {/* Key metrics row */}
                    <div className="grid grid-cols-3 gap-1 xs:gap-2">
                      <div className="text-center">
                        <div className="text-[9px] xs:text-[10px] text-muted-foreground">Mitra</div>
                        <div className="text-xs xs:text-sm sm:text-base font-bold">{r.totalMitra}</div>
                        <div className="flex justify-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1 py-0 h-auto">R:{r.ritelMitra}</Badge>
                          <Badge variant="secondary" className="text-[7px] sm:text-[8px] px-1 py-0 h-auto">F:{r.feederMitra}</Badge>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] xs:text-[10px] text-muted-foreground">OLT</div>
                        <div className="text-xs xs:text-sm sm:text-base font-bold">{r.totalHostnames}</div>
                        <div className="text-[7px] xs:text-[8px] text-muted-foreground mt-0.5">hostname</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] xs:text-[10px] text-muted-foreground">Incident</div>
                        <div className={cn("text-xs xs:text-sm sm:text-base font-bold", r.totalIncidents > 0 ? "text-warning" : "text-success")}>
                          {r.totalIncidents}
                        </div>
                        <div className="text-[7px] xs:text-[8px] text-muted-foreground mt-0.5">
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

                    {/* Scrollable Team List inside card */}
                    <div className="border-t border-border/40 pt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> Daftar Tim ({r.teams.length})
                        </span>
                        <span className="text-[8px] text-muted-foreground italic">scroll ↓</span>
                      </div>
                      <ScrollArea className="h-[100px] xs:h-[120px] sm:h-[140px] rounded-md border border-border/30 bg-muted/20">
                        <div className="p-1.5 space-y-0.5">
                          {r.teams.map((t, tIdx) => {
                            const teamHostSet = new Set(t.hostnames.map(h => h.trim().toUpperCase()));
                            const teamInc = r.incidentTickets.filter(tk => teamHostSet.has(tk.hostname.trim().toUpperCase()));
                            const hasIncident = teamInc.length > 0;
                            return (
                              <div
                                key={`${t.mitraName}-${tIdx}`}
                                className={cn(
                                  "flex items-center justify-between px-2 py-1.5 rounded-md text-[9px] sm:text-[10px] transition-colors",
                                  hasIncident
                                    ? "bg-destructive/5 hover:bg-destructive/10 cursor-pointer border border-transparent hover:border-destructive/20"
                                    : "bg-muted/30 hover:bg-muted/50"
                                )}
                                onClick={() => {
                                  if (hasIncident) {
                                    setSelectedRegion(r);
                                    setSelectedTeam(t);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <Badge
                                    variant={t.serpoType === "RITEL" ? "default" : "secondary"}
                                    className="text-[6px] sm:text-[7px] px-1 py-0 h-auto flex-shrink-0"
                                  >
                                    {t.serpoType === "RITEL" ? "R" : "F"}
                                  </Badge>
                                  <span className="font-medium truncate">{t.mitraName}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className="text-[8px] text-muted-foreground">{t.hostnames.length} OLT</span>
                                  {hasIncident ? (
                                    <Badge variant="destructive" className="text-[6px] sm:text-[7px] px-1 py-0 h-auto ml-1">
                                      {teamInc.length} <ChevronRight className="h-2 w-2 ml-0.5 inline" />
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[6px] sm:text-[7px] px-1 py-0 h-auto text-success border-success/30 ml-1">✓</Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
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
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[85vh] overflow-y-auto p-3 sm:p-6">
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

      {/* Region Detail Dialog */}
      <Dialog open={!!selectedRegion} onOpenChange={(open) => { if (!open) { setSelectedRegion(null); setSelectedTeam(null); setSelectedIncident(null); } }}>
        <DialogContent className="max-w-[98vw] xs:max-w-[95vw] sm:max-w-lg md:max-w-xl p-0 gap-0 max-h-[92vh] sm:max-h-[90vh] flex flex-col">
          {selectedRegion && !selectedTeam && !selectedIncident && (
            <>
              {/* Fixed Header */}
              <div className="p-4 pb-3 border-b border-border/50 flex-shrink-0">
                <DialogHeader>
                  <DialogTitle className="text-sm sm:text-base flex items-center gap-2 pr-8">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" /> {selectedRegion.region}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs">
                    {selectedRegion.totalMitra} Mitra · {selectedRegion.totalHostnames} OLT · {selectedRegion.totalIncidents} Incident
                  </DialogDescription>
                </DialogHeader>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mt-3">
                  <Card className="p-1.5 sm:p-2 text-center bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground">Ritel</div>
                    <div className="text-sm sm:text-lg font-bold">{selectedRegion.ritelMitra}</div>
                  </Card>
                  <Card className="p-1.5 sm:p-2 text-center bg-gradient-to-br from-accent/10 to-transparent border-accent/20">
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground">Feeder</div>
                    <div className="text-sm sm:text-lg font-bold">{selectedRegion.feederMitra}</div>
                  </Card>
                  <Card className="p-1.5 sm:p-2 text-center bg-gradient-to-br from-success/10 to-transparent border-success/20">
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground">Resolved</div>
                    <div className="text-sm sm:text-lg font-bold text-success">{selectedRegion.resolved}</div>
                  </Card>
                  <Card className="p-1.5 sm:p-2 text-center bg-gradient-to-br from-destructive/10 to-transparent border-destructive/20">
                    <div className="text-[8px] sm:text-[10px] text-muted-foreground">Critical</div>
                    <div className="text-sm sm:text-lg font-bold text-destructive">{selectedRegion.critical}</div>
                  </Card>
                </div>

                {selectedRegion.totalIncidents > 0 && (
                  <div className="space-y-1 mt-3">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Resolution Rate</span>
                      <span className="font-bold">{Math.round((selectedRegion.resolved / selectedRegion.totalIncidents) * 100)}%</span>
                    </div>
                    <Progress value={Math.round((selectedRegion.resolved / selectedRegion.totalIncidents) * 100)} className="h-2" />
                  </div>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {/* Teams List */}
                  <div>
                    <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Daftar Tim ({selectedRegion.teams.length})
                    </h4>
                    <div className="overflow-x-auto">
                      <Table className="text-[10px] sm:text-xs min-w-[420px]">
                        <TableHeader>
                          <TableRow className="h-7 bg-muted/30 sticky top-0">
                            <TableHead className="px-1.5 py-1 w-14">Tipe</TableHead>
                            <TableHead className="px-1.5 py-1">Nama Mitra</TableHead>
                            <TableHead className="px-1.5 py-1 text-center w-10">OLT</TableHead>
                             <TableHead className="px-1.5 py-1">Tim</TableHead>
                             <TableHead className="px-1.5 py-1 text-right w-14">Inc</TableHead>
                           </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRegion.teams.map((t, idx) => {
                            const teamHostnamesSet = new Set(t.hostnames.map(h => h.trim().toUpperCase()));
                            const teamIncidents = selectedRegion.incidentTickets.filter(
                              tk => teamHostnamesSet.has(tk.hostname.trim().toUpperCase())
                            );
                            return (
                              <TableRow
                                key={`${t.mitraName}-${idx}`}
                                className="h-8 cursor-pointer hover:bg-primary/5 transition-colors"
                                onClick={() => setSelectedTeam(t)}
                              >
                                <TableCell className="px-1.5 py-0.5">
                                  <Badge variant={t.serpoType === "RITEL" ? "default" : "secondary"} className="text-[7px] sm:text-[8px] px-1.5">
                                    {t.serpoType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="px-1.5 py-0.5 font-medium">{t.mitraName}</TableCell>
                                <TableCell className="px-1.5 py-0.5 text-center font-bold">{t.hostnames.length}</TableCell>
                                <TableCell className="px-1.5 py-0.5">{t.teamMember || "-"}</TableCell>
                                <TableCell className="px-1.5 py-0.5 text-right">
                                  {teamIncidents.length > 0 ? (
                                    <Badge variant="destructive" className="text-[7px] sm:text-[8px] px-1.5">
                                      {teamIncidents.length}
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1.5 text-success border-success/30">✓</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Incidents */}
                  {selectedRegion.incidentTickets.length > 0 ? (
                    <div>
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning" /> Incidents ({selectedRegion.incidentTickets.length})
                      </h4>
                      <div className="overflow-x-auto max-h-[40vh] overflow-y-auto rounded-md border border-border/30">
                        <Table className="text-[10px] sm:text-xs min-w-[460px]">
                          <TableHeader>
                            <TableRow className="h-7 bg-muted/30 sticky top-0 z-10">
                              <TableHead className="px-1.5 py-1">Incident ID</TableHead>
                              <TableHead className="px-1.5 py-1">Hostname</TableHead>
                              <TableHead className="px-1.5 py-1">Pelanggan</TableHead>
                              <TableHead className="px-1.5 py-1 text-right">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedRegion.incidentTickets.map((t) => (
                              <TableRow
                                key={t.id}
                                className="h-8 cursor-pointer hover:bg-primary/5 transition-colors"
                                onClick={() => setSelectedIncident(t)}
                              >
                                <TableCell className="px-1.5 py-0.5 font-mono text-[9px]">{t.serviceId}</TableCell>
                                <TableCell className="px-1.5 py-0.5 font-mono text-[9px] max-w-[160px] truncate">{t.hostname}</TableCell>
                                <TableCell className="px-1.5 py-0.5 truncate max-w-[100px]">{t.customerName}</TableCell>
                                <TableCell className="px-1.5 py-0.5 text-right"><StatusBadge status={t.status} /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-success bg-success/5 rounded-lg px-3 py-3 justify-center">
                      <Shield className="h-3.5 w-3.5" />
                      <span className="font-medium">Tidak ada incident di regional ini</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Team Detail Sub-view */}
          {selectedRegion && selectedTeam && !selectedIncident && (
            <>
              <div className="p-4 pb-3 border-b border-border/50 flex-shrink-0">
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:underline mb-2"
                >
                  ← Kembali ke {selectedRegion.region}
                </button>
                <DialogHeader>
                  <DialogTitle className="text-sm sm:text-base flex items-center gap-2 pr-8">
                    <Users className="h-4 w-4 text-primary flex-shrink-0" /> {selectedTeam.mitraName}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs">
                    {selectedTeam.serpoType} · {selectedTeam.serpoName} · {selectedTeam.hostnames.length} OLT
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 space-y-4">
                  {(() => {
                    const teamHostnamesSet = new Set(selectedTeam.hostnames.map(h => h.trim().toUpperCase()));
                    const teamIncidents = selectedRegion.incidentTickets.filter(
                      tk => teamHostnamesSet.has(tk.hostname.trim().toUpperCase())
                    );
                    const teamResolved = teamIncidents.filter(t => t.status === "Resolved").length;
                    const teamCritical = teamIncidents.filter(t => t.status === "Critical").length;
                    const teamPending = teamIncidents.length - teamResolved - teamCritical;

                    return (
                      <>
                        {/* Team Info Cards */}
                        <div className="grid grid-cols-2 gap-2">
                          <Card className="p-3 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
                            <div className="text-[9px] text-muted-foreground mb-0.5">Tipe Serpo</div>
                            <div className="text-xs font-bold">{selectedTeam.serpoType}</div>
                          </Card>
                          <Card className="p-3 bg-gradient-to-br from-accent/5 to-transparent border-accent/20">
                            <div className="text-[9px] text-muted-foreground mb-0.5">Nama Serpo</div>
                            <div className="text-xs font-bold truncate">{selectedTeam.serpoName}</div>
                          </Card>
                          <Card className="p-3 bg-gradient-to-br from-secondary to-transparent">
                            <div className="text-[9px] text-muted-foreground mb-0.5">Tim Member</div>
                            <div className="text-xs font-bold">{selectedTeam.teamMember || "-"}</div>
                          </Card>
                          <Card className="p-3 bg-gradient-to-br from-warning/5 to-transparent border-warning/20">
                            <div className="text-[9px] text-muted-foreground mb-0.5">Total OLT</div>
                            <div className="text-xs font-bold">{selectedTeam.hostnames.length}</div>
                          </Card>
                        </div>

                        {/* Incident Summary for this Mitra */}
                        {teamIncidents.length > 0 && (
                          <div className="rounded-lg border border-warning/20 bg-gradient-to-br from-warning/5 to-transparent p-3 space-y-2">
                            <h4 className="text-xs font-semibold flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                              Incident Mitra ({teamIncidents.length})
                            </h4>
                            <div className="flex gap-1.5 flex-wrap">
                              {teamResolved > 0 && <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-success/30 text-success">✓ {teamResolved} Resolved</Badge>}
                              {teamPending > 0 && <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-warning/30 text-warning">◌ {teamPending} Pending</Badge>}
                              {teamCritical > 0 && <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-auto border-destructive/30 text-destructive">✕ {teamCritical} Critical</Badge>}
                            </div>
                          </div>
                        )}

                        {/* Hostname List */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <Server className="h-3.5 w-3.5" /> Daftar OLT Hostname ({selectedTeam.hostnames.length})
                          </h4>
                          <div className="space-y-1">
                            {selectedTeam.hostnames.map((h, i) => {
                              const relatedIncidents = selectedRegion.incidentTickets.filter(
                                t => t.hostname.trim().toUpperCase() === h.trim().toUpperCase()
                              );
                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-lg bg-muted/30 transition-colors text-[10px] sm:text-xs",
                                    relatedIncidents.length > 0 ? "hover:bg-destructive/10 cursor-pointer border border-transparent hover:border-destructive/20" : "hover:bg-muted/60"
                                  )}
                                  onClick={() => {
                                    if (relatedIncidents.length === 1) {
                                      setSelectedIncident(relatedIncidents[0]);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Server className={cn("h-3 w-3 flex-shrink-0", relatedIncidents.length > 0 ? "text-warning" : "text-muted-foreground")} />
                                    <span className="font-mono truncate">{h}</span>
                                  </div>
                                  {relatedIncidents.length > 0 ? (
                                    <Badge variant="destructive" className="text-[7px] sm:text-[8px] px-1.5 flex-shrink-0">
                                      {relatedIncidents.length} incident
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[7px] sm:text-[8px] px-1.5 flex-shrink-0 text-success border-success/30">✓</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Related Incidents Table */}
                        {teamIncidents.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-warning" /> Detail Incident ({teamIncidents.length})
                            </h4>
                            <div className="overflow-x-auto">
                              <Table className="text-[10px] sm:text-xs min-w-[400px]">
                                <TableHeader>
                                  <TableRow className="h-7 bg-muted/30">
                                    <TableHead className="px-1.5 py-1">Service ID</TableHead>
                                    <TableHead className="px-1.5 py-1">Hostname</TableHead>
                                    <TableHead className="px-1.5 py-1">Kendala</TableHead>
                                    <TableHead className="px-1.5 py-1 text-right">Status</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {teamIncidents.map((t) => (
                                    <TableRow
                                      key={t.id}
                                      className="h-8 cursor-pointer hover:bg-primary/5 transition-colors"
                                      onClick={() => setSelectedIncident(t)}
                                    >
                                      <TableCell className="px-1.5 py-0.5 font-mono text-[9px]">{t.serviceId}</TableCell>
                                      <TableCell className="px-1.5 py-0.5 font-mono text-[9px] max-w-[120px] truncate">{t.hostname}</TableCell>
                                      <TableCell className="px-1.5 py-0.5 truncate max-w-[100px]">{t.constraint || "-"}</TableCell>
                                      <TableCell className="px-1.5 py-0.5 text-right"><StatusBadge status={t.status} /></TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </>
          )}

          {/* Incident Detail Sub-view */}
          {selectedRegion && selectedIncident && (
            <>
              <div className="p-4 pb-3 border-b border-border/50 flex-shrink-0">
                <button
                  onClick={() => {
                    if (selectedTeam) {
                      setSelectedIncident(null);
                    } else {
                      setSelectedIncident(null);
                    }
                  }}
                  className="flex items-center gap-1 text-[10px] sm:text-xs text-primary hover:underline mb-2"
                >
                  ← Kembali ke {selectedTeam ? selectedTeam.mitraName : selectedRegion.region}
                </button>
                <DialogHeader>
                  <DialogTitle className="text-sm sm:text-base flex items-center gap-2 pr-8">
                    <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" /> Detail Incident
                  </DialogTitle>
                  <DialogDescription className="text-[10px] sm:text-xs">
                    {selectedIncident.serviceId}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">{selectedIncident.customerName}</span>
                    <StatusBadge status={selectedIncident.status} />
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: "Service ID", value: selectedIncident.serviceId, icon: "🆔" },
                      { label: "Hostname", value: selectedIncident.hostname, icon: "📡" },
                      { label: "FAT ID", value: selectedIncident.fatId, icon: "📍" },
                      { label: "SN ONT", value: selectedIncident.snOnt, icon: "🔌" },
                      { label: "SERPO", value: selectedIncident.serpo, icon: "🏢" },
                      { label: "Kategori", value: selectedIncident.category, icon: "📂" },
                      { label: "Kendala", value: selectedIncident.constraint, icon: "⚠️" },
                      { label: "Hasil", value: selectedIncident.ticketResult, icon: "📋" },
                      { label: "Dibuat", value: selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleString("id-ID") : "-", icon: "📅" },
                    ].map((field) => (
                      <div key={field.label} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                        <span className="text-xs flex-shrink-0">{field.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] text-muted-foreground">{field.label}</div>
                          <div className="text-[10px] sm:text-xs font-medium break-all">{field.value || "-"}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
