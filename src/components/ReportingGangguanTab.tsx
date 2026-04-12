import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { RegionalTeamRecord } from "@/types/regionalTeam";
import { Copy, RefreshCw, RotateCcw, Download, Image as ImageIcon } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";
import { useRealtimeDate } from "@/hooks/useRealtimeDate";
import { format, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REGIONS = ["SUMSEL", "BABEL", "BENGKULU", "JAMBI", "LAMPUNG"];
const REGION_FULL_NAMES: Record<string, string> = {
  SUMSEL: "SUMATERA SELATAN",
  BABEL: "BANGKA BELITUNG",
  BENGKULU: "BENGKULU",
  JAMBI: "JAMBI",
  LAMPUNG: "LAMPUNG",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "SELAMAT PAGI";
  if (hour >= 11 && hour < 15) return "SELAMAT SIANG";
  if (hour >= 15 && hour < 18) return "SELAMAT SORE";
  return "SELAMAT MALAM";
}

interface RegionData {
  total: number;
  ritel: number;
  corporate: number;
  close: number;
}

interface ReportingGangguanTabProps {
  tickets: Ticket[];
  regionalTeamData: RegionalTeamRecord[];
  getTicketRegion: (hostname: string, serpo: string) => string;
}

export function ReportingGangguanTab({
  tickets,
  regionalTeamData,
  getTicketRegion,
}: ReportingGangguanTabProps) {
  const realtimeDate = useRealtimeDate();

  // Manual fields
  const [teamName, setTeamName] = useState("Tim NOC Retail SBU Palembang");
  const [teamCount, setTeamCount] = useState("3");
  const [teamMembers, setTeamMembers] = useState<string[]>(["", "", ""]);
  const [serviceImpact, setServiceImpact] = useState("");
  const [noServiceImpact, setNoServiceImpact] = useState("");
  const [pukul, setPukul] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}.00`;
  });

  // Manual corporate overrides per region (tiket lama)
  const [corporateOld, setCorporateOld] = useState<Record<string, number>>(
    Object.fromEntries(REGIONS.map((r) => [r, 0]))
  );
  // Manual corporate overrides per region (tiket baru)
  const [corporateBaru, setCorporateBaru] = useState<Record<string, number>>(
    Object.fromEntries(REGIONS.map((r) => [r, 0]))
  );

  // Adjust team members array when count changes
  useEffect(() => {
    const count = parseInt(teamCount) || 0;
    setTeamMembers((prev) => {
      const newArr = [...prev];
      while (newArr.length < count) newArr.push("");
      return newArr.slice(0, count);
    });
  }, [teamCount]);

  // Build region mapping from serpo
  const mitraToRegion = useMemo(() => {
    const map: Record<string, string> = {};
    regionalTeamData.forEach((r) => {
      const regionKey = Object.entries(REGION_FULL_NAMES).find(
        ([, full]) => full === r.region.toUpperCase()
      )?.[0] || r.region.toUpperCase();
      map[r.mitraName.toUpperCase()] = regionKey;
    });
    return map;
  }, [regionalTeamData]);

  const getRegionForTicket = (ticket: Ticket): string => {
    // First try serpo match
    const serpoUpper = ticket.serpo.toUpperCase();
    if (mitraToRegion[serpoUpper]) return mitraToRegion[serpoUpper];
    // Try partial match
    for (const [mitra, region] of Object.entries(mitraToRegion)) {
      if (serpoUpper.includes(mitra) || mitra.includes(serpoUpper)) return region;
    }
    // Try from getTicketRegion
    const reg = getTicketRegion(ticket.hostname, ticket.serpo);
    if (reg && reg !== "-") {
      const key = Object.entries(REGION_FULL_NAMES).find(
        ([, full]) => full === reg.toUpperCase()
      )?.[0];
      if (key) return key;
    }
    return "";
  };

  // Calculate data from tickets
  const { tiketLama, tiketBaru } = useMemo(() => {
    const today = realtimeDate; // yyyy-MM-dd
    const lama: Record<string, RegionData> = {};
    const baru: Record<string, RegionData> = {};

    REGIONS.forEach((r) => {
      lama[r] = { total: 0, ritel: 0, corporate: 0, close: 0 };
      baru[r] = { total: 0, ritel: 0, corporate: 0, close: 0 };
    });

    tickets.forEach((t) => {
      const region = getRegionForTicket(t);
      if (!region || !REGIONS.includes(region)) return;

      const createdDate = t.createdISO?.substring(0, 10) || t.createdAt?.substring(0, 10);
      const isNewToday = createdDate === today;
      const target = isNewToday ? baru : lama;
      const isFeeder = FEEDER_CONSTRAINTS_SET.has(t.constraint);

      if (t.status === "Resolved") {
        target[region].close += 1;
      } else {
        if (!isFeeder) {
          target[region].ritel += 1;
        }
      }
    });

    // Apply corporate overrides and calculate totals
    REGIONS.forEach((r) => {
      lama[r].corporate = corporateOld[r] || 0;
      lama[r].total = lama[r].ritel + lama[r].corporate + lama[r].close;
      baru[r].corporate = corporateBaru[r] || 0;
      baru[r].total = baru[r].ritel + baru[r].corporate + baru[r].close;
    });

    return { tiketLama: lama, tiketBaru: baru };
  }, [tickets, realtimeDate, corporateOld, corporateBaru, mitraToRegion]);

  // Grand totals
  const totalLama = useMemo(() => {
    const t = { total: 0, ritel: 0, corporate: 0, close: 0 };
    REGIONS.forEach((r) => {
      t.total += tiketLama[r].total;
      t.ritel += tiketLama[r].ritel;
      t.corporate += tiketLama[r].corporate;
      t.close += tiketLama[r].close;
    });
    return t;
  }, [tiketLama]);

  const totalBaru = useMemo(() => {
    const t = { total: 0, ritel: 0, corporate: 0, close: 0 };
    REGIONS.forEach((r) => {
      t.total += tiketBaru[r].total;
      t.ritel += tiketBaru[r].ritel;
      t.corporate += tiketBaru[r].corporate;
      t.close += tiketBaru[r].close;
    });
    return t;
  }, [tiketBaru]);

  const grandTotal = {
    total: totalLama.total + totalBaru.total,
    ritel: totalLama.ritel + totalBaru.ritel,
    corporate: totalLama.corporate + totalBaru.corporate,
    close: totalLama.close + totalBaru.close,
  };

  // Format date display
  const formattedDate = useMemo(() => {
    try {
      const d = parse(realtimeDate, "yyyy-MM-dd", new Date());
      return format(d, "dd - MM - yyyy", { locale: idLocale });
    } catch {
      return realtimeDate;
    }
  }, [realtimeDate]);

  // Copy to clipboard
  const handleCopy = () => {
    const membersText = teamMembers
      .filter((m) => m.trim())
      .map((m, i) => `${" ".repeat(34)}: ${m}`)
      .join("\n");

    const greeting = getGreeting();

    let output = `${greeting}\n\n`;
    output += `Berikut Resume Laporan Gangguan Layanan ICONNET ${formattedDate} Pukul  ${pukul} WIB\n\n`;
    output += `${teamName}${" ".repeat(Math.max(1, 8))}  : ${teamCount} ORANG\n`;
    output += `Nama${" ".repeat(30)}: ${teamMembers[0] || ""}\n`;
    if (teamMembers.length > 1) {
      for (let i = 1; i < teamMembers.length; i++) {
        output += `${" ".repeat(34)}: ${teamMembers[i] || ""}\n`;
      }
    }

    output += `\n${"=".repeat(60)}\n`;
    output += `${"TIKET AGING SBS".padStart(37)}\n`;
    output += `${"=".repeat(60)}\n`;

    // Tiket Lama header
    output += `${"Tiket Lama".padStart(35)}\n`;
    output += `${"─".repeat(60)}\n`;
    output += `${"WILAYAH".padEnd(15)}${"TOTAL".padStart(8)}${"RITEL".padStart(10)}${"CORPORATE".padStart(12)}${"CLOSE".padStart(8)}\n`;
    output += `${"─".repeat(60)}\n`;
    REGIONS.forEach((r) => {
      const d = tiketLama[r];
      output += `${r.padEnd(15)}${String(d.total).padStart(8)}${String(d.ritel).padStart(10)}${String(d.corporate).padStart(12)}${String(d.close).padStart(8)}\n`;
    });

    // Tiket Baru header
    output += `${"─".repeat(60)}\n`;
    output += `${"Tiket Baru".padStart(35)}\n`;
    output += `${"─".repeat(60)}\n`;
    output += `${"WILAYAH".padEnd(15)}${"TOTAL".padStart(8)}${"RITEL".padStart(10)}${"CORPORATE".padStart(12)}${"CLOSE".padStart(8)}\n`;
    output += `${"─".repeat(60)}\n`;
    REGIONS.forEach((r) => {
      const d = tiketBaru[r];
      output += `${r.padEnd(15)}${String(d.total).padStart(8)}${String(d.ritel).padStart(10)}${String(d.corporate).padStart(12)}${String(d.close).padStart(8)}\n`;
    });

    output += `${"─".repeat(60)}\n`;
    output += `${"Total Gangguan".padEnd(15)}${String(grandTotal.total).padStart(8)}${String(grandTotal.ritel).padStart(10)}${String(grandTotal.corporate).padStart(12)}${String(grandTotal.close).padStart(8)}\n`;
    output += `Service Impact    : ${serviceImpact || "-"}\n`;
    output += `No. Service Impact: ${noServiceImpact || "-"}\n`;

    navigator.clipboard.writeText(output).then(() => {
      toast({ title: "Berhasil disalin", description: "Report gangguan telah disalin ke clipboard." });
    }).catch(() => {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    });
  };

  const handleReset = () => {
    setCorporateOld(Object.fromEntries(REGIONS.map((r) => [r, 0])));
    setCorporateBaru(Object.fromEntries(REGIONS.map((r) => [r, 0])));
    setServiceImpact("");
    setNoServiceImpact("");
    toast({ title: "Data manual direset" });
  };

  const previewRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportImage = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `Reporting_Gangguan_${realtimeDate}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast({ title: "Export berhasil", description: "Gambar berhasil didownload." });
    } catch {
      toast({ title: "Export gagal", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const cellClass = "text-center text-[10px] sm:text-xs py-1.5 px-1.5 sm:px-3";
  const headerCellClass = "text-center text-[10px] sm:text-xs font-bold py-1.5 px-1.5 sm:px-3";

  return (
    <div className="space-y-4">
      {/* Manual Input: Team Info */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
          <CardTitle className="text-sm sm:text-base">📋 Info Tim & Manual Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Nama Tim</Label>
              <Input className="h-8 text-xs" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Jumlah Orang</Label>
              <Input className="h-8 text-xs" type="number" min={1} max={10} value={teamCount} onChange={(e) => setTeamCount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Pukul (WIB)</Label>
              <Input className="h-8 text-xs" value={pukul} onChange={(e) => setPukul(e.target.value)} placeholder="15.00" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {teamMembers.map((m, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Nama Anggota {i + 1}</Label>
                <Input
                  className="h-8 text-xs"
                  value={m}
                  placeholder={`Anggota ${i + 1}`}
                  onChange={(e) => {
                    const newArr = [...teamMembers];
                    newArr[i] = e.target.value;
                    setTeamMembers(newArr);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Service Impact</Label>
              <Input className="h-8 text-xs" value={serviceImpact} onChange={(e) => setServiceImpact(e.target.value)} placeholder="Jumlah service impact" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">No. Service Impact</Label>
              <Input className="h-8 text-xs" value={noServiceImpact} onChange={(e) => setNoServiceImpact(e.target.value)} placeholder="Nomor service impact" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Table */}
      <Card className="border-primary/20">
        <CardHeader className="pb-2 pt-3 px-3 sm:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm sm:text-base">📊 Preview Reporting Gangguan</CardTitle>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={handleReset}>
                <RotateCcw className="h-3 w-3 mr-1" /> Reset
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={handleExportImage} disabled={isExporting}>
                <ImageIcon className="h-3 w-3 mr-1" /> {isExporting ? "Exporting..." : "Export PNG"}
              </Button>
              <Button variant="default" size="sm" className="h-7 text-[10px] px-2" onClick={handleCopy}>
                <Copy className="h-3 w-3 mr-1" /> Salin
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6 pb-4">
          {/* Header preview */}
          <div className="mb-3 text-center space-y-1">
            <p className="text-sm sm:text-base font-bold text-primary">{getGreeting()}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              Berikut Resume Laporan Gangguan Layanan ICONNET {formattedDate} Pukul {pukul} WIB
            </p>
            <div className="text-[10px] sm:text-xs text-left max-w-sm mx-auto mt-2 space-y-0.5">
              <p><span className="text-muted-foreground">{teamName}</span> : <strong>{teamCount} ORANG</strong></p>
              {teamMembers.filter(m => m.trim()).map((m, i) => (
                <p key={i}><span className="text-muted-foreground">{i === 0 ? "Nama" : ""}</span>{i === 0 ? "" : " "} <span className="ml-auto">: {m}</span></p>
              ))}
            </div>
          </div>

          {/* TIKET AGING SBS */}
          <div className="border rounded-lg overflow-hidden">
            {/* Title */}
            <div className="bg-primary text-primary-foreground text-center py-1.5 text-[11px] sm:text-xs font-bold tracking-wider">
              TIKET AGING SBS
            </div>

            {/* Tiket Lama */}
            <div className="bg-accent/50 text-center py-1 text-[10px] sm:text-xs font-semibold border-b">
              Tiket Lama
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className={headerCellClass}>WILAYAH</TableHead>
                  <TableHead className={headerCellClass}>TOTAL</TableHead>
                  <TableHead className={headerCellClass}>RITEL</TableHead>
                  <TableHead className={headerCellClass}>CORPORATE</TableHead>
                  <TableHead className={headerCellClass}>CLOSE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REGIONS.map((r) => (
                  <TableRow key={`lama-${r}`}>
                    <TableCell className={`${cellClass} font-medium text-left`}>{r}</TableCell>
                    <TableCell className={`${cellClass} font-semibold`}>{tiketLama[r].total}</TableCell>
                    <TableCell className={cellClass}>{tiketLama[r].ritel}</TableCell>
                    <TableCell className={cellClass}>
                      <Input
                        type="number"
                        min={0}
                        className="h-6 w-14 text-[10px] text-center mx-auto p-0"
                        value={corporateOld[r]}
                        onChange={(e) => setCorporateOld({ ...corporateOld, [r]: parseInt(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className={cellClass}>{tiketLama[r].close}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Tiket Baru */}
            <div className="bg-accent/50 text-center py-1 text-[10px] sm:text-xs font-semibold border-y">
              Tiket Baru
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className={headerCellClass}>WILAYAH</TableHead>
                  <TableHead className={headerCellClass}>TOTAL</TableHead>
                  <TableHead className={headerCellClass}>RITEL</TableHead>
                  <TableHead className={headerCellClass}>CORPORATE</TableHead>
                  <TableHead className={headerCellClass}>CLOSE</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {REGIONS.map((r) => (
                  <TableRow key={`baru-${r}`}>
                    <TableCell className={`${cellClass} font-medium text-left`}>{r}</TableCell>
                    <TableCell className={`${cellClass} font-semibold`}>{tiketBaru[r].total}</TableCell>
                    <TableCell className={cellClass}>{tiketBaru[r].ritel}</TableCell>
                    <TableCell className={cellClass}>
                      <Input
                        type="number"
                        min={0}
                        className="h-6 w-14 text-[10px] text-center mx-auto p-0"
                        value={corporateBaru[r]}
                        onChange={(e) => setCorporateBaru({ ...corporateBaru, [r]: parseInt(e.target.value) || 0 })}
                      />
                    </TableCell>
                    <TableCell className={cellClass}>{tiketBaru[r].close}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="border-t-2 border-primary/30">
              <Table>
                <TableBody>
                  <TableRow className="bg-accent/30 font-bold">
                    <TableCell className={`${cellClass} font-bold text-left`}>Total Gangguan</TableCell>
                    <TableCell className={`${cellClass} font-bold text-primary`}>{grandTotal.total}</TableCell>
                    <TableCell className={`${cellClass} font-bold`}>{grandTotal.ritel}</TableCell>
                    <TableCell className={`${cellClass} font-bold`}>{grandTotal.corporate}</TableCell>
                    <TableCell className={`${cellClass} font-bold`}>{grandTotal.close}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} className={`${cellClass} text-left font-medium`}>Service Impact</TableCell>
                    <TableCell colSpan={3} className={cellClass}>{serviceImpact || "-"}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={2} className={`${cellClass} text-left font-medium`}>No. Service Impact</TableCell>
                    <TableCell colSpan={3} className={cellClass}>{noServiceImpact || "-"}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
