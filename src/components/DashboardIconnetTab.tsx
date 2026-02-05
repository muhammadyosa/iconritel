import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Copy, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

const getDefaultDate = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return `${day}/${month.toString().padStart(2, '0')}/${year}`;
};

export function DashboardIconnetTab() {
  const [data, setData] = useState<DashboardData>({
    resumeAllTime: "15.00",
    resumeAllDate: getDefaultDate(),
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
    resumeGangguanDate: getDefaultDate(),
    totalGangguan: "",
    sumselGangguan: "",
    bangkaBelitungGangguan: "",
    bengkuluGangguan: "",
    jambiGangguan: "",
    lampungGangguan: "",
  });

  const updateField = (field: keyof DashboardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const generateOutput = () => {
    const formatValue = (val: string) => val.trim() || "-";
    
    return `Resume All pukul ${formatValue(data.resumeAllTime)}
Gangguan Retail SBS Tanggal ${formatValue(data.resumeAllDate)}

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
Retail SBS = ${formatValue(data.retailSbsHari)} hari
Gangguan Retail SBS Tanggal ${formatValue(data.resumeGangguanDate)}
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
      resumeAllDate: getDefaultDate(),
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
      resumeGangguanDate: getDefaultDate(),
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
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-primary rounded-full" />
            <h3 className="font-semibold text-lg">Resume All</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resumeAllTime">Pukul</Label>
              <Input
                id="resumeAllTime"
                placeholder="15.00"
                value={data.resumeAllTime}
                onChange={(e) => updateField("resumeAllTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resumeAllDate">Tanggal (D/MM/YYYY)</Label>
              <Input
                id="resumeAllDate"
                placeholder="4/02/2026"
                value={data.resumeAllDate}
                onChange={(e) => updateField("resumeAllDate", e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Dengan Penyebaran :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sumselAll" className="text-xs">Sumsel</Label>
                <Input
                  id="sumselAll"
                  placeholder="-"
                  value={data.sumselAll}
                  onChange={(e) => updateField("sumselAll", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bangkaBelitungAll" className="text-xs">Bangka Belitung</Label>
                <Input
                  id="bangkaBelitungAll"
                  placeholder="-"
                  value={data.bangkaBelitungAll}
                  onChange={(e) => updateField("bangkaBelitungAll", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bengkuluAll" className="text-xs">Bengkulu</Label>
                <Input
                  id="bengkuluAll"
                  placeholder="-"
                  value={data.bengkuluAll}
                  onChange={(e) => updateField("bengkuluAll", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="jambiAll" className="text-xs">Jambi</Label>
                <Input
                  id="jambiAll"
                  placeholder="-"
                  value={data.jambiAll}
                  onChange={(e) => updateField("jambiAll", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lampungAll" className="text-xs">Lampung</Label>
                <Input
                  id="lampungAll"
                  placeholder="-"
                  value={data.lampungAll}
                  onChange={(e) => updateField("lampungAll", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="posisiNocRitel">Posisi NOC Ritel SBU</Label>
              <Input
                id="posisiNocRitel"
                placeholder="-"
                value={data.posisiNocRitel}
                onChange={(e) => updateField("posisiNocRitel", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="posisiTiketOutbond" className="text-xs">Posisi Tiket Outbond, Back office, dll</Label>
              <Input
                id="posisiTiketOutbond"
                placeholder="-"
                value={data.posisiTiketOutbond}
                onChange={(e) => updateField("posisiTiketOutbond", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalTiket">Total Tiket</Label>
              <Input
                id="totalTiket"
                placeholder="-"
                value={data.totalTiket}
                onChange={(e) => updateField("totalTiket", e.target.value)}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Resume Gangguan Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 bg-destructive rounded-full" />
            <h3 className="font-semibold text-lg">Resume Gangguan</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="resumeGangguanTime">Pukul</Label>
              <Input
                id="resumeGangguanTime"
                placeholder="15.00"
                value={data.resumeGangguanTime}
                onChange={(e) => updateField("resumeGangguanTime", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retailSbsHari">Retail SBS (hari)</Label>
              <Input
                id="retailSbsHari"
                placeholder="-"
                value={data.retailSbsHari}
                onChange={(e) => updateField("retailSbsHari", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resumeGangguanDate">Tanggal (D/MM/YYYY)</Label>
              <Input
                id="resumeGangguanDate"
                placeholder="4/02/2026"
                value={data.resumeGangguanDate}
                onChange={(e) => updateField("resumeGangguanDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalGangguan">Total Gangguan</Label>
              <Input
                id="totalGangguan"
                placeholder="-"
                value={data.totalGangguan}
                onChange={(e) => updateField("totalGangguan", e.target.value)}
              />
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Dengan Penyebaran :</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sumselGangguan" className="text-xs">Sumsel</Label>
                <Input
                  id="sumselGangguan"
                  placeholder="-"
                  value={data.sumselGangguan}
                  onChange={(e) => updateField("sumselGangguan", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bangkaBelitungGangguan" className="text-xs">Bangka Belitung</Label>
                <Input
                  id="bangkaBelitungGangguan"
                  placeholder="-"
                  value={data.bangkaBelitungGangguan}
                  onChange={(e) => updateField("bangkaBelitungGangguan", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="bengkuluGangguan" className="text-xs">Bengkulu</Label>
                <Input
                  id="bengkuluGangguan"
                  placeholder="-"
                  value={data.bengkuluGangguan}
                  onChange={(e) => updateField("bengkuluGangguan", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="jambiGangguan" className="text-xs">Jambi</Label>
                <Input
                  id="jambiGangguan"
                  placeholder="-"
                  value={data.jambiGangguan}
                  onChange={(e) => updateField("jambiGangguan", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lampungGangguan" className="text-xs">Lampung</Label>
                <Input
                  id="lampungGangguan"
                  placeholder="-"
                  value={data.lampungGangguan}
                  onChange={(e) => updateField("lampungGangguan", e.target.value)}
                />
              </div>
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
