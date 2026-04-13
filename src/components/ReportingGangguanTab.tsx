import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { RegionalTeamRecord } from "@/types/regionalTeam";
import { Copy, RotateCcw, Image as ImageIcon } from "lucide-react";
import html2canvas from "html2canvas";
import { toast } from "@/hooks/use-toast";
import { useRealtimeDate } from "@/hooks/useRealtimeDate";
import iconnetLogo from "@/assets/iconnet-logo-full.png";
import plnLogo from "@/assets/pln-icon-plus.png";
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
  const [pukul, setPukul] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}.00`;
  });

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
    const serpoUpper = ticket.serpo.toUpperCase();
    if (mitraToRegion[serpoUpper]) return mitraToRegion[serpoUpper];
    for (const [mitra, region] of Object.entries(mitraToRegion)) {
      if (serpoUpper.includes(mitra) || mitra.includes(serpoUpper)) return region;
    }
    const reg = getTicketRegion(ticket.hostname, ticket.serpo);
    if (reg && reg !== "-") {
      const key = Object.entries(REGION_FULL_NAMES).find(
        ([, full]) => full === reg.toUpperCase()
      )?.[0];
      if (key) return key;
    }
    return "";
  };

  // Calculate data from tickets - CORPORATE = FEEDER tickets
  const { tiketLama, tiketBaru } = useMemo(() => {
    const today = realtimeDate;
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
        if (isFeeder) {
          // FEEDER incidents go to CORPORATE column
          target[region].corporate += 1;
        } else {
          target[region].ritel += 1;
        }
      }
    });

    // Calculate totals
    REGIONS.forEach((r) => {
      lama[r].total = lama[r].ritel + lama[r].corporate + lama[r].close;
      baru[r].total = baru[r].ritel + baru[r].corporate + baru[r].close;
    });

    return { tiketLama: lama, tiketBaru: baru };
  }, [tickets, realtimeDate, mitraToRegion]);

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
    const greeting = getGreeting();
    const filledMembers = teamMembers.filter((m) => m.trim());

    let output = `${greeting}\n\n`;
    output += `Berikut Resume Laporan Gangguan Layanan ICONNET ${formattedDate} Pukul  ${pukul} WIB\n\n`;
    output += `${teamName.padEnd(34)}: ${teamCount} ORANG\n`;
    output += `${"Nama".padEnd(34)}: ${filledMembers[0] || ""}\n`;
    for (let i = 1; i < filledMembers.length; i++) {
      output += `${" ".repeat(34)}: ${filledMembers[i]}\n`;
    }

    output += `\n${"=".repeat(60)}\n`;
    output += `${"TIKET AGING SBS".padStart(37)}\n`;
    output += `${"=".repeat(60)}\n`;

    output += `${"Tiket Lama".padStart(35)}\n`;
    output += `${"─".repeat(60)}\n`;
    output += `${"WILAYAH".padEnd(15)}${"TOTAL".padStart(8)}${"RITEL".padStart(10)}${"CORPORATE".padStart(12)}${"CLOSE".padStart(8)}\n`;
    output += `${"─".repeat(60)}\n`;
    REGIONS.forEach((r) => {
      const d = tiketLama[r];
      output += `${r.padEnd(15)}${String(d.total).padStart(8)}${String(d.ritel).padStart(10)}${String(d.corporate).padStart(12)}${String(d.close).padStart(8)}\n`;
    });

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

    navigator.clipboard.writeText(output).then(() => {
      toast({ title: "Berhasil disalin", description: "Report gangguan telah disalin ke clipboard." });
    }).catch(() => {
      toast({ title: "Gagal menyalin", variant: "destructive" });
    });
  };

  const handleReset = () => {
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
          <CardTitle className="text-sm sm:text-base">📋 Info Tim</CardTitle>
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
          {/* Team members in clean rows */}
          <div>
            <Label className="text-[10px] text-muted-foreground mb-1.5 block">Nama Anggota</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {teamMembers.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-4 shrink-0 text-right">{i + 1}.</span>
                  <Input
                    className="h-8 text-xs flex-1"
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
          {/* Preview content - always light for export and readability */}
          <div ref={previewRef} className="bg-white text-gray-900 p-4 rounded-lg">
            {/* Header preview with logos */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between">
                <img src={iconnetLogo} alt="Iconnet" className="h-8 sm:h-10 object-contain" />
                <p className="text-sm sm:text-base font-bold text-blue-700">{getGreeting()}</p>
                <img src={plnLogo} alt="PLN Icon Plus" className="h-8 sm:h-10 object-contain" />
              </div>
              <p className="text-[10px] sm:text-xs text-gray-600 text-center">
                Berikut Resume Laporan Gangguan Layanan ICONNET {formattedDate} Pukul {pukul} WIB
              </p>
            </div>
            {/* Team info - tabular layout */}
            <div className="text-[10px] sm:text-xs max-w-md mx-auto mt-2 mb-3">
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="text-gray-700 py-0.5 align-top whitespace-nowrap pr-1">{teamName}</td>
                    <td className="text-gray-700 py-0.5 align-top w-3">:</td>
                    <td className="font-semibold text-gray-900 py-0.5">{teamCount} ORANG</td>
                  </tr>
                  {teamMembers.filter(m => m.trim()).map((m, i) => (
                    <tr key={i}>
                      <td className="text-gray-700 py-0.5 align-top whitespace-nowrap pr-1">{i === 0 ? "Nama" : ""}</td>
                      <td className="text-gray-700 py-0.5 align-top w-3">:</td>
                      <td className="text-gray-900 py-0.5">{m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TIKET AGING SBS */}
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Title */}
              <div className="bg-blue-700 text-white text-center py-1.5 text-[11px] sm:text-xs font-bold tracking-wider">
                TIKET AGING SBS
              </div>

              {/* Tiket Lama */}
              <div className="bg-blue-100 text-blue-900 text-center py-1 text-[10px] sm:text-xs font-semibold border-b border-gray-300">
                Tiket Lama
              </div>
              <table className="w-full text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">WILAYAH</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">TOTAL</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">RITEL</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">CORPORATE</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">CLOSE</th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map((r) => (
                    <tr key={`lama-${r}`} className="border-b border-gray-200">
                      <td className="py-1.5 px-2 sm:px-3 font-medium text-left text-gray-900">{r}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center font-semibold text-gray-900">{tiketLama[r].total}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center text-gray-800">{tiketLama[r].ritel}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center text-gray-800">{tiketLama[r].corporate}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center text-gray-800">{tiketLama[r].close}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tiket Baru */}
              <div className="bg-blue-100 text-blue-900 text-center py-1 text-[10px] sm:text-xs font-semibold border-y border-gray-300">
                Tiket Baru
              </div>
              <table className="w-full text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">WILAYAH</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">TOTAL</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">RITEL</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">CORPORATE</th>
                    <th className="py-1.5 px-2 sm:px-3 text-center font-bold text-gray-700">CLOSE</th>
                  </tr>
                </thead>
                <tbody>
                  {REGIONS.map((r) => (
                    <tr key={`baru-${r}`} className="border-b border-gray-200">
                      <td className="py-1.5 px-2 sm:px-3 font-medium text-left text-gray-900">{r}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center font-semibold text-gray-900">{tiketBaru[r].total}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center text-gray-800">{tiketBaru[r].ritel}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center text-gray-800">{tiketBaru[r].corporate}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center text-gray-800">{tiketBaru[r].close}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t-2 border-blue-400">
                <table className="w-full text-[10px] sm:text-xs">
                  <tbody>
                    <tr className="bg-blue-50">
                      <td className="py-1.5 px-2 sm:px-3 font-bold text-left text-blue-900">Total Gangguan</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center font-bold text-blue-900">{grandTotal.total}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center font-bold text-blue-800">{grandTotal.ritel}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center font-bold text-blue-800">{grandTotal.corporate}</td>
                      <td className="py-1.5 px-2 sm:px-3 text-center font-bold text-blue-800">{grandTotal.close}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
