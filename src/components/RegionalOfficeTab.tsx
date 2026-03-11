import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Info, Search, Server, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { loadOLTData } from "@/lib/indexedDB";
import { OLT } from "@/types/olt";
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

interface RegionalOfficeTabProps {
  tickets: Ticket[];
}

interface RegionalData {
  provinsi: string;
  oltCount: number;
  hostnames: string[];
  totalIncidents: number;
  resolved: number;
  pending: number;
  critical: number;
  incidentTickets: Ticket[];
}

export default function RegionalOfficeTab({ tickets }: RegionalOfficeTabProps) {
  const [oltData, setOltData] = useState<OLT[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<RegionalData | null>(null);

  useEffect(() => {
    loadOLTData()
      .then((data) => { setOltData(data); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  // Build hostname -> provinsi mapping and regional data (incident-driven)
  const regionalData = useMemo(() => {
    // Build hostname -> provinsi lookup from OLT data
    const hostnameToProv: Record<string, string> = {};
    const provOltCount: Record<string, number> = {};

    oltData.forEach((olt) => {
      const prov = (olt.provinsi || "").trim().toUpperCase();
      if (!prov) return;
      provOltCount[prov] = (provOltCount[prov] || 0) + 1;
      if (olt.hostnameOlt) {
        hostnameToProv[olt.hostnameOlt.trim().toUpperCase()] = prov;
      }
    });

    // Map tickets to provinsi via hostname — only create regions that have incidents
    const regionStats: Record<string, RegionalData> = {};

    tickets.forEach((ticket) => {
      const ticketHostname = (ticket.hostname || "").trim().toUpperCase();
      const prov = hostnameToProv[ticketHostname];
      if (!prov) return;

      if (!regionStats[prov]) {
        regionStats[prov] = {
          provinsi: prov,
          oltCount: provOltCount[prov] || 0,
          hostnames: [],
          totalIncidents: 0,
          resolved: 0,
          pending: 0,
          critical: 0,
          incidentTickets: [],
        };
      }
      regionStats[prov].totalIncidents++;
      regionStats[prov].incidentTickets.push(ticket);
      if (ticket.status === "Resolved") regionStats[prov].resolved++;
      else if (ticket.status === "Critical") regionStats[prov].critical++;
      else regionStats[prov].pending++;
    });

    return Object.values(regionStats).sort((a, b) => b.totalIncidents - a.totalIncidents);
  }, [oltData, tickets]);

  const filteredData = regionalData.filter((r) => {
    if (!searchQuery) return true;
    return r.provinsi.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const totalOLT = regionalData.reduce((s, r) => s + r.oltCount, 0);
  const totalIncidents = regionalData.reduce((s, r) => s + r.totalIncidents, 0);
  const totalResolved = regionalData.reduce((s, r) => s + r.resolved, 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Memuat data OLT...
        </CardContent>
      </Card>
    );
  }

  if (oltData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">🗺 List Regional Office</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>
              Belum ada data OLT. Import data melalui{" "}
              <Link to="/settings" className="text-primary underline hover:no-underline">Settings</Link>
              {" "}untuk menampilkan daftar Regional Office.
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground">Total Provinsi</div>
          <div className="text-lg sm:text-xl font-bold">{regionalData.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1"><Server className="h-3 w-3" /> Total OLT</div>
          <div className="text-lg sm:text-xl font-bold">{totalOLT.toLocaleString()}</div>
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
            Data regional berdasarkan Provinsi dari List OLT, disinkronkan dengan data Incident
          </CardDescription>
          <div className="mt-2 flex items-center gap-2 max-w-sm">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cari provinsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 sm:h-8 text-[10px] sm:text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-4 md:p-6 pt-0">
          <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[55vh] sm:max-h-[65vh]">
            <Table className="text-[10px] sm:text-xs min-w-[600px]">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow className="h-7 sm:h-9">
                  <TableHead className="px-2 py-1 w-8 text-center">#</TableHead>
                  <TableHead className="px-2 py-1">PROVINSI</TableHead>
                  <TableHead className="px-2 py-1 text-center">OLT</TableHead>
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
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-4">
                      Tidak ada data yang sesuai.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((r, i) => {
                    const rate = r.totalIncidents > 0 ? Math.round((r.resolved / r.totalIncidents) * 100) : 0;
                    return (
                      <TableRow
                        key={r.provinsi}
                        className="cursor-pointer transition-colors hover:bg-accent/5 h-7 sm:h-9"
                        onClick={() => setSelectedRegion(r)}
                      >
                        <TableCell className="text-center text-muted-foreground px-2 py-1">{i + 1}</TableCell>
                        <TableCell className="px-2 py-1 font-semibold">{r.provinsi}</TableCell>
                        <TableCell className="text-center px-2 py-1">
                          <Badge variant="secondary" className="text-[9px] sm:text-[10px]">{r.oltCount}</Badge>
                        </TableCell>
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
            Menampilkan {filteredData.length} dari {regionalData.length} provinsi
          </div>
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={!!selectedRegion} onOpenChange={(open) => { if (!open) setSelectedRegion(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedRegion && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">🗺 {selectedRegion.provinsi}</SheetTitle>
                <SheetDescription className="text-xs">
                  {selectedRegion.oltCount} OLT · {selectedRegion.totalIncidents} Incident
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
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

                {selectedRegion.incidentTickets.length > 0 ? (
                  <ScrollArea className="max-h-[50vh]">
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
