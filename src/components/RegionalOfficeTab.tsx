import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Info, Search, Server, AlertTriangle, CheckCircle, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { loadRegionalTeamData } from "@/lib/indexedDB";
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell as RechartsCell, ResponsiveContainer } from "recharts";

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

export default function RegionalOfficeTab({ tickets }: RegionalOfficeTabProps) {
  const [teamData, setTeamData] = useState<RegionalTeamRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<RegionalData | null>(null);

  useEffect(() => {
    loadRegionalTeamData()
      .then((data) => { setTeamData(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  // Build regional data from team records + match incidents
  const regionalData = useMemo(() => {
    // Group team records by region
    const regionMap: Record<string, RegionalTeamRecord[]> = {};
    teamData.forEach((rec) => {
      const region = rec.region.trim().toUpperCase();
      if (!region) return;
      if (!regionMap[region]) regionMap[region] = [];
      regionMap[region].push(rec);
    });

    // Build hostname -> region lookup (uppercase)
    const hostnameToRegion: Record<string, string> = {};
    Object.entries(regionMap).forEach(([region, records]) => {
      records.forEach((rec) => {
        rec.hostnames.forEach((h) => {
          const normalized = h.trim().toUpperCase();
          if (normalized) hostnameToRegion[normalized] = region;
        });
      });
    });

    // Build region stats
    const stats: Record<string, RegionalData> = {};
    
    // Initialize from team data
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
        region,
        totalMitra: records.length,
        totalHostnames: allHostnames.size,
        ritelMitra: ritelCount,
        feederMitra: feederCount,
        totalIncidents: 0,
        resolved: 0,
        pending: 0,
        critical: 0,
        incidentTickets: [],
        teams: records,
      };
    });

    // Map tickets to regions
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

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground">Total Region</div>
          <div className="text-lg sm:text-xl font-bold">{regionalData.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Total Mitra</div>
          <div className="text-lg sm:text-xl font-bold">{totalMitra.toLocaleString()}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3" /> Total OLT</div>
          <div className="text-lg sm:text-xl font-bold">{totalHostnames.toLocaleString()}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Total Incident</div>
          <div className="text-lg sm:text-xl font-bold">{totalIncidents.toLocaleString()}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Resolved</div>
          <div className="text-lg sm:text-xl font-bold text-success">
            {totalIncidents > 0 ? Math.round((totalResolved / totalIncidents) * 100) : 0}%
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="p-3 sm:p-4 md:p-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            🗺 List Regional Office
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-xs">
            Data regional berdasarkan List Team Region, disinkronkan dengan data Incident
          </CardDescription>
          <div className="mt-2 flex items-center gap-2 max-w-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari region..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6 pt-0">
          <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[55vh] sm:max-h-[65vh]">
            <Table className="text-[10px] sm:text-xs min-w-[700px]">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="h-7 sm:h-9">
                  <TableHead className="px-2 py-1 w-8 text-center">#</TableHead>
                  <TableHead className="px-2 py-1">REGION</TableHead>
                  <TableHead className="px-2 py-1 text-center">MITRA</TableHead>
                  <TableHead className="px-2 py-1 text-center">OLT</TableHead>
                  <TableHead className="px-2 py-1 text-center">RITEL</TableHead>
                  <TableHead className="px-2 py-1 text-center">FEEDER</TableHead>
                  <TableHead className="px-2 py-1 text-center">INCIDENT</TableHead>
                  <TableHead className="px-2 py-1 text-center text-success">RESOLVED</TableHead>
                  <TableHead className="px-2 py-1 text-center text-warning">PENDING</TableHead>
                  <TableHead className="px-2 py-1 text-center text-destructive">CRITICAL</TableHead>
                  <TableHead className="px-2 py-1 text-center">RATE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-4">
                      Tidak ada data yang sesuai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((r, i) => {
                    const rate = r.totalIncidents > 0 ? Math.round((r.resolved / r.totalIncidents) * 100) : 0;
                    return (
                      <TableRow
                        key={r.region}
                        className="cursor-pointer transition-colors hover:bg-accent/5 h-7 sm:h-9"
                        onClick={() => setSelectedRegion(r)}
                      >
                        <TableCell className="text-center text-muted-foreground px-2 py-1">{i + 1}</TableCell>
                        <TableCell className="px-2 py-1 font-semibold">{r.region}</TableCell>
                        <TableCell className="text-center px-2 py-1">
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px]">{r.totalMitra}</Badge>
                        </TableCell>
                        <TableCell className="text-center px-2 py-1">
                          <Badge variant="outline" className="text-[9px] sm:text-[10px]">{r.totalHostnames}</Badge>
                        </TableCell>
                        <TableCell className="text-center px-2 py-1 font-medium">{r.ritelMitra}</TableCell>
                        <TableCell className="text-center px-2 py-1 font-medium">{r.feederMitra}</TableCell>
                        <TableCell className="text-center px-2 py-1 font-bold">{r.totalIncidents}</TableCell>
                        <TableCell className="text-center px-2 py-1 text-success font-medium">{r.resolved}</TableCell>
                        <TableCell className="text-center px-2 py-1 text-warning font-medium">{r.pending}</TableCell>
                        <TableCell className="text-center px-2 py-1 text-destructive font-medium">{r.critical}</TableCell>
                        <TableCell className="px-2 py-1">
                          <div className="flex items-center gap-1.5">
                            <Progress value={rate} className="h-1.5 flex-1 min-w-[40px]" />
                            <span className={cn(
                              "text-[9px] sm:text-[10px] font-bold min-w-[28px] text-right",
                              rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive"
                            )}>{rate}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-2 text-[10px] sm:text-xs text-muted-foreground">
            Menampilkan {filteredData.length} dari {regionalData.length} region
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRegion} onOpenChange={(open) => { if (!open) setSelectedRegion(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRegion && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">🗺 {selectedRegion.region}</SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedRegion.totalMitra} Mitra · {selectedRegion.totalHostnames} OLT · {selectedRegion.totalIncidents} Incident
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <Card className="p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">Resolved</div>
                    <div className="text-sm font-bold text-success">{selectedRegion.resolved}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">Pending</div>
                    <div className="text-sm font-bold text-warning">{selectedRegion.pending}</div>
                  </Card>
                  <Card className="p-2 text-center">
                    <div className="text-[10px] text-muted-foreground">Critical</div>
                    <div className="text-sm font-bold text-destructive">{selectedRegion.critical}</div>
                  </Card>
                </div>

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
