import { useState, useEffect } from "react";
import { useRealtimeDate } from "@/hooks/useRealtimeDate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SHIFT_OPTIONS = [
  { value: "07.00", label: "07.00" },
  { value: "15.00", label: "15.00" },
  { value: "22.00", label: "22.00" },
];

const HARI_OPTIONS = [
  { value: "1", label: "1 Hari" },
  { value: "2", label: "2 Hari" },
  { value: "3", label: "3 Hari" },
  { value: "4", label: "4 Hari" },
];

interface DashboardData {
  // Resume All
  resumeAllTime: string;
  resumeAllDate: string;
  sumselAll: string;
  bangkaBelitungAll: string;
  bengkuluAll: string;
  jambiAll: string;
  lampungAll: string;
  posisiNocRitel: string;
  posisiTiketOutbond: string;
  totalTiket: string;
  // Resume Gangguan
  resumeGangguanTime: string;
  retailSbsHari: string;
  resumeGangguanDate: string;
  totalGangguan: string;
  sumselGangguan: string;
  bangkaBelitungGangguan: string;
  bengkuluGangguan: string;
  jambiGangguan: string;
  lampungGangguan: string;
}

const formatDateForDisplay = (dateString: string) => {
  if (!dateString) return "-";
  const date = new Date(dateString);
  const day = date.getDate();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export function DashboardIconnetTab() {
  // Realtime date hook
  const realtimeDate = useRealtimeDate();
  
  const [data, setData] = useState<DashboardData>({
    resumeAllTime: "15.00",
    resumeAllDate: realtimeDate,
    sumselAll: "",
    bangkaBelitungAll: "",
    bengkuluAll: "",
    jambiAll: "",
    lampungAll: "",
    posisiNocRitel: "",
    posisiTiketOutbond: "",
    totalTiket: "",
    resumeGangguanTime: "15.00",
    retailSbsHari: "",
    resumeGangguanDate: realtimeDate,
    totalGangguan: "",
    sumselGangguan: "",
    bangkaBelitungGangguan: "",
    bengkuluGangguan: "",
    jambiGangguan: "",
    lampungGangguan: "",
  });
  
  // Keep dates in sync with realtime
  useEffect(() => {
    setData(prev => ({
      ...prev,
      resumeAllDate: realtimeDate,
      resumeGangguanDate: realtimeDate,
    }));
  }, [realtimeDate]);

  // Auto-calculate NOC Ritel SBU = Sumsel + Babel + Bengkulu + Jambi + Lampung
  useEffect(() => {
    const sum = [data.sumselAll, data.bangkaBelitungAll, data.bengkuluAll, data.jambiAll, data.lampungAll]
      .reduce((acc, val) => acc + (parseInt(val) || 0), 0);
    const hasAnyValue = [data.sumselAll, data.bangkaBelitungAll, data.bengkuluAll, data.jambiAll, data.lampungAll]
      .some(v => v.trim() !== "");
    setData(prev => ({ ...prev, posisiNocRitel: hasAnyValue ? String(sum) : "" }));
  }, [data.sumselAll, data.bangkaBelitungAll, data.bengkuluAll, data.jambiAll, data.lampungAll]);

  // Auto-calculate Outbond dll = NOC Ritel SBU - Total
  useEffect(() => {
    const total = parseInt(data.totalTiket) || 0;
    const nocRitel = parseInt(data.posisiNocRitel) || 0;
    const hasAnyValue = data.totalTiket.trim() !== "" || data.posisiNocRitel.trim() !== "";
    setData(prev => ({ ...prev, posisiTiketOutbond: hasAnyValue ? String(nocRitel - total) : "" }));
  }, [data.totalTiket, data.posisiNocRitel]);

  // Auto-calculate Total Gangguan = Sumsel + Babel + Bengkulu + Jambi + Lampung
  useEffect(() => {
    const sum = [data.sumselGangguan, data.bangkaBelitungGangguan, data.bengkuluGangguan, data.jambiGangguan, data.lampungGangguan]
      .reduce((acc, val) => acc + (parseInt(val) || 0), 0);
    const hasAnyValue = [data.sumselGangguan, data.bangkaBelitungGangguan, data.bengkuluGangguan, data.jambiGangguan, data.lampungGangguan]
      .some(v => v.trim() !== "");
    setData(prev => ({ ...prev, totalGangguan: hasAnyValue ? String(sum) : "" }));
  }, [data.sumselGangguan, data.bangkaBelitungGangguan, data.bengkuluGangguan, data.jambiGangguan, data.lampungGangguan]);

  const updateField = (field: keyof DashboardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const generateOutput = () => {
    const formatValue = (val: string) => val.trim() || "-";
    const hariLabel = data.retailSbsHari ? HARI_OPTIONS.find(o => o.value === data.retailSbsHari)?.label.replace(" Hari", "") || "-" : "-";
    
    return `Resume All pukul ${formatValue(data.resumeAllTime)}
Gangguan Retail SBS Tanggal ${formatDateForDisplay(data.resumeAllDate)}

Dengan Penyebaran :
* Sumsel = ${formatValue(data.sumselAll)}
* Bangka Belitung = ${formatValue(data.bangkaBelitungAll)}
* Bengkulu = ${formatValue(data.bengkuluAll)}
* Jambi = ${formatValue(data.jambiAll)}
* Lampung = ${formatValue(data.lampungAll)}

Posisi NOC Ritel SBU = ${formatValue(data.posisiNocRitel)}
Posisi Tiket Outbond, Back office, Noc pusat, CM ritel dll = ${formatValue(data.posisiTiketOutbond)}
Total Tiket = ${formatValue(data.totalTiket)}

=================================
Resume Gangguan Pukul ${formatValue(data.resumeGangguanTime)}
Retail SBS = ${hariLabel} hari
Gangguan Retail SBS Tanggal ${formatDateForDisplay(data.resumeGangguanDate)}
Total gangguan = ${formatValue(data.totalGangguan)}

Dengan Penyebaran : 
* Sumsel = ${formatValue(data.sumselGangguan)}
* Bangka Belitung = ${formatValue(data.bangkaBelitungGangguan)}
* Bengkulu = ${formatValue(data.bengkuluGangguan)}
* Jambi = ${formatValue(data.jambiGangguan)}
* Lampung = ${formatValue(data.lampungGangguan)}`;
  };

  const handleCopy = () => {
    const output = generateOutput();
    navigator.clipboard.writeText(output).then(() => {
      toast({
        title: "Berhasil disalin",
        description: "Data Dashboard Iconnet telah disalin ke clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Gagal menyalin",
        description: "Tidak dapat menyalin ke clipboard.",
        variant: "destructive",
      });
    });
  };

  const handleClear = () => {
    setData({
      resumeAllTime: "15.00",
      resumeAllDate: realtimeDate,
      sumselAll: "",
      bangkaBelitungAll: "",
      bengkuluAll: "",
      jambiAll: "",
      lampungAll: "",
      posisiNocRitel: "",
      posisiTiketOutbond: "",
      totalTiket: "",
      resumeGangguanTime: "15.00",
      retailSbsHari: "",
      resumeGangguanDate: realtimeDate,
      totalGangguan: "",
      sumselGangguan: "",
      bangkaBelitungGangguan: "",
      bengkuluGangguan: "",
      jambiGangguan: "",
      lampungGangguan: "",
    });
    toast({
      title: "Data dihapus",
      description: "Form telah dikosongkan.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl">📊</span>
          Dashboard Iconnet
        </CardTitle>
        <CardDescription>
          Isi data resume gangguan untuk Dashboard Iconnet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Resume All Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-primary rounded-full" />
            <h3 className="font-semibold">Resume All</h3>
          </div>
          
          {/* Header Fields - Compact Inline */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">Pukul</span>
              <Select
                value={data.resumeAllTime}
                onValueChange={(value) => updateField("resumeAllTime", value)}
              >
                <SelectTrigger className="h-7 w-[70px] text-sm px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">Tanggal</span>
              <Input
                type="date"
                className="h-7 w-[130px] text-sm px-2"
                value={data.resumeAllDate}
                onChange={(e) => updateField("resumeAllDate", e.target.value)}
              />
            </div>
          </div>

          {/* Dengan Penyebaran - Compact Inline Layout */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Dengan Penyebaran :</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "sumselAll", label: "Sumsel", field: "sumselAll" as const },
                { id: "bangkaBelitungAll", label: "Babel", field: "bangkaBelitungAll" as const },
                { id: "bengkuluAll", label: "Bengkulu", field: "bengkuluAll" as const },
                { id: "jambiAll", label: "Jambi", field: "jambiAll" as const },
                { id: "lampungAll", label: "Lampung", field: "lampungAll" as const },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label} =</span>
                  <Input
                    id={item.id}
                    className="h-7 w-14 text-center text-sm px-1"
                    placeholder="-"
                    value={data[item.field]}
                    onChange={(e) => updateField(item.field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Posisi Section - Compact Inline */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-md px-2 py-1 border border-primary/20">
              <span className="text-xs font-medium text-primary whitespace-nowrap">NOC Ritel SBU =</span>
              <Input
                className="h-7 w-16 text-center text-sm px-1 font-semibold"
                placeholder="-"
                value={data.posisiNocRitel}
                readOnly
              />
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Total =</span>
              <Input
                className="h-7 w-16 text-center text-sm px-1"
                placeholder="-"
                value={data.totalTiket}
                onChange={(e) => updateField("totalTiket", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 bg-primary/10 rounded-md px-2 py-1 border border-primary/20">
              <span className="text-xs font-medium text-primary whitespace-nowrap">Outbond, dll =</span>
              <Input
                className="h-7 w-14 text-center text-sm px-1 font-semibold"
                placeholder="-"
                value={data.posisiTiketOutbond}
                readOnly
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Resume Gangguan Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-destructive rounded-full" />
            <h3 className="font-semibold">Resume Gangguan</h3>
          </div>

          {/* Header Fields - Compact Inline */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">Pukul</span>
              <Select
                value={data.resumeGangguanTime}
                onValueChange={(value) => updateField("resumeGangguanTime", value)}
              >
                <SelectTrigger className="h-7 w-[70px] text-sm px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">Retail SBS</span>
              <Select
                value={data.retailSbsHari}
                onValueChange={(value) => updateField("retailSbsHari", value)}
              >
                <SelectTrigger className="h-7 w-[80px] text-sm px-2">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {HARI_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-2 py-1">
              <span className="text-xs text-muted-foreground">Tanggal</span>
              <Input
                type="date"
                className="h-7 w-[130px] text-sm px-2"
                value={data.resumeGangguanDate}
                onChange={(e) => updateField("resumeGangguanDate", e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5 bg-destructive/10 rounded-md px-2 py-1 border border-destructive/20">
              <span className="text-xs font-medium text-destructive whitespace-nowrap">Total Gangguan =</span>
              <Input
                className="h-7 w-14 text-center text-sm px-1 font-semibold"
                placeholder="-"
                value={data.totalGangguan}
                readOnly
              />
            </div>
          </div>

          {/* Dengan Penyebaran - Compact Inline Layout */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Dengan Penyebaran :</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: "sumselGangguan", label: "Sumsel", field: "sumselGangguan" as const },
                { id: "bangkaBelitungGangguan", label: "Babel", field: "bangkaBelitungGangguan" as const },
                { id: "bengkuluGangguan", label: "Bengkulu", field: "bengkuluGangguan" as const },
                { id: "jambiGangguan", label: "Jambi", field: "jambiGangguan" as const },
                { id: "lampungGangguan", label: "Lampung", field: "lampungGangguan" as const },
              ].map((item) => (
                <div key={item.id} className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.label} =</span>
                  <Input
                    id={item.id}
                    className="h-7 w-14 text-center text-sm px-1"
                    placeholder="-"
                    value={data[item.field]}
                    onChange={(e) => updateField(item.field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            Salin ke Clipboard
          </Button>
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus Data
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <Label>Preview Output</Label>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono text-foreground">
              {generateOutput()}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
