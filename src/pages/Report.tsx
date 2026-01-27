import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";
import { z } from "zod";

// Validation schemas for form inputs
const shiftReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal tidak valid"),
  shift: z.enum(["pagi", "siang", "malam"]),
  officer: z.string().trim().min(1, "Nama petugas wajib diisi").max(100, "Nama petugas maksimal 100 karakter"),
  oltDown: z.string().trim().max(2000, "Laporan OLT Down maksimal 2000 karakter"),
  portDown: z.string().trim().max(2000, "Laporan Port Down maksimal 2000 karakter"),
  fatLoss: z.string().trim().max(2000, "Laporan FAT Loss maksimal 2000 karakter"),
  issues: z.string().trim().max(5000, "Kendala/Masalah maksimal 5000 karakter"),
  notes: z.string().trim().max(5000, "Catatan maksimal 5000 karakter"),
});

// Interface for parsed SLA ticket
interface SLATicket {
  duration: string;
  ticketId: string;
  type: string;
  description: string;
}

const Report = () => {
  const [shiftReport, setShiftReport] = useState({
    date: new Date().toISOString().split("T")[0],
    shift: "pagi",
    officer: "",
    oltDown: "",
    portDown: "",
    fatLoss: "",
    issues: "",
    notes: "",
  });

  // State for SLA Report
  const [slaInput, setSlaInput] = useState("");
  const [slaResult, setSlaResult] = useState("");
  const [parsedSlaTickets, setParsedSlaTickets] = useState<SLATicket[]>([]);

  const handleShiftReportSubmit = () => {
    // Validate with Zod schema
    const result = shiftReportSchema.safeParse(shiftReport);
    if (!result.success) {
      toast({
        title: "Validasi gagal",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    if (!shiftReport.oltDown && !shiftReport.portDown && !shiftReport.fatLoss) {
      toast({
        title: "Data tidak lengkap",
        description: "Mohon lengkapi minimal satu ringkasan shift.",
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    const reports = JSON.parse(localStorage.getItem("shiftReports") || "[]");
    reports.push({
      ...shiftReport,
      id: `SHIFT-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("shiftReports", JSON.stringify(reports));

    toast({
      title: "Report shift tersimpan",
      description: "Report shift berhasil disimpan.",
    });

    // Reset form
    setShiftReport({
      date: new Date().toISOString().split("T")[0],
      shift: "pagi",
      officer: "",
      oltDown: "",
      portDown: "",
      fatLoss: "",
      issues: "",
      notes: "",
    });
  };

  // Parse SLA input and generate formatted output
  const handleSlaGenerate = () => {
    if (!slaInput.trim()) {
      toast({
        title: "Input kosong",
        description: "Mohon masukkan data tiket OVER SLA.",
        variant: "destructive",
      });
      return;
    }

    const lines = slaInput.trim().split("\n").filter(line => line.trim());
    const tickets: SLATicket[] = [];

    for (const line of lines) {
      // Split by tab character
      const parts = line.split("\t").map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 3) {
        // Format: DURATION \t TICKET_ID \t TYPE \t DESCRIPTION
        // or: DURATION \t TICKET_ID \t TYPE+DESCRIPTION (combined)
        const duration = parts[0];
        const ticketId = parts[1];
        
        // Check if type and description are separate or combined
        let type = "";
        let description = "";
        
        if (parts.length >= 4) {
          type = parts[2];
          description = parts.slice(3).join(" ");
        } else {
          // Type and description might be in one field
          const combined = parts[2];
          // Try to extract type (FTTH AKSES, FTTH DISTRIBUSI, FTTH FEEDER, FTTH BACKBONE)
          const typeMatch = combined.match(/^(FTTH\s+(?:AKSES|DISTRIBUSI|FEEDER|BACKBONE))\s*[-–]?\s*/i);
          if (typeMatch) {
            type = typeMatch[1];
            description = combined.substring(typeMatch[0].length).trim();
          } else {
            type = combined;
            description = "";
          }
        }

        tickets.push({ duration, ticketId, type, description });
      }
    }

    if (tickets.length === 0) {
      toast({
        title: "Format tidak valid",
        description: "Pastikan format input sesuai: DURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI",
        variant: "destructive",
      });
      return;
    }

    setParsedSlaTickets(tickets);

    // Generate formatted output
    const formattedOutput = tickets.map(ticket => {
      return `${ticket.duration}
${ticket.ticketId}
${ticket.type}\t${ticket.description}
TIKET TERKAIT : 
UPDATE : `;
    }).join("\n\n");

    setSlaResult(formattedOutput);

    toast({
      title: "Format berhasil",
      description: `${tickets.length} tiket OVER SLA berhasil diformat.`,
    });
  };

  const handleSlaCopy = () => {
    if (!slaResult) {
      toast({
        title: "Tidak ada hasil",
        description: "Generate format terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard.writeText(slaResult).then(() => {
      toast({
        title: "Berhasil disalin",
        description: "Hasil format telah disalin ke clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Gagal menyalin",
        description: "Tidak dapat menyalin ke clipboard.",
        variant: "destructive",
      });
    });
  };

  const handleSlaClear = () => {
    setSlaInput("");
    setSlaResult("");
    setParsedSlaTickets([]);
  };

  const exportShiftReport = () => {
    const reports = JSON.parse(localStorage.getItem("shiftReports") || "[]");
    if (reports.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Belum ada report shift untuk diekspor.",
        variant: "destructive",
      });
      return;
    }

    const text = reports
      .map(
        (r: any) =>
          `=== REPORT SHIFT ===
Tanggal: ${r.date}
Shift: ${r.shift.toUpperCase()}
Petugas: ${r.officer}

RINGKASAN SHIFT:

LAPORAN OLT DOWN:
${r.oltDown || "-"}

LAPORAN PORT DOWN:
${r.portDown || "-"}

LAPORAN FAT LOSS:
${r.fatLoss || "-"}

KENDALA/MASALAH:
${r.issues || "-"}

CATATAN:
${r.notes || "-"}

Dibuat: ${new Date(r.createdAt).toLocaleString("id-ID")}
-------------------
`
      )
      .join("\n");

    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Report_Shift_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();

    toast({
      title: "Export berhasil",
      description: "Report shift berhasil diekspor.",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">📝 Report</h1>
        <p className="text-muted-foreground">
          Kelola report shift dan update ticket
        </p>
      </div>

      <Tabs defaultValue="shift" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="shift">🗣️ Report Shift</TabsTrigger>
          <TabsTrigger value="sla">⏰ Report OVER SLA 7 JAM</TabsTrigger>
        </TabsList>

        <TabsContent value="shift" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>🗣️ Report Shift</CardTitle>
              <CardDescription>
                Buat laporan shift harian untuk monitoring NOC
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Tanggal</Label>
                  <Input
                    id="date"
                    type="date"
                    value={shiftReport.date}
                    onChange={(e) =>
                      setShiftReport({ ...shiftReport, date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shift">Shift</Label>
                  <Select
                    value={shiftReport.shift}
                    onValueChange={(value) =>
                      setShiftReport({ ...shiftReport, shift: value })
                    }
                  >
                    <SelectTrigger id="shift">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pagi">Pagi</SelectItem>
                      <SelectItem value="siang">Siang</SelectItem>
                      <SelectItem value="malam">Malam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officer">Petugas</Label>
                  <Input
                    id="officer"
                    placeholder="Nama petugas shift"
                    value={shiftReport.officer}
                    onChange={(e) =>
                      setShiftReport({ ...shiftReport, officer: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="font-semibold mb-3 text-primary">Ringkasan Shift</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="oltDown" className="flex items-center gap-2">
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">OLT DOWN</span>
                        Laporan OLT Down
                      </Label>
                      <Textarea
                        id="oltDown"
                        placeholder="Laporan OLT yang mengalami down..."
                        rows={3}
                        value={shiftReport.oltDown}
                        onChange={(e) =>
                          setShiftReport({ ...shiftReport, oltDown: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portDown" className="flex items-center gap-2">
                        <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">PORT DOWN</span>
                        Laporan Port Down
                      </Label>
                      <Textarea
                        id="portDown"
                        placeholder="Laporan port yang mengalami down..."
                        rows={3}
                        value={shiftReport.portDown}
                        onChange={(e) =>
                          setShiftReport({ ...shiftReport, portDown: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fatLoss" className="flex items-center gap-2">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">FAT LOSS</span>
                        Laporan FAT Loss
                      </Label>
                      <Textarea
                        id="fatLoss"
                        placeholder="Laporan FAT loss..."
                        rows={3}
                        value={shiftReport.fatLoss}
                        onChange={(e) =>
                          setShiftReport({ ...shiftReport, fatLoss: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issues">Kendala/Masalah</Label>
                <Textarea
                  id="issues"
                  placeholder="Kendala atau masalah yang ditemui..."
                  rows={3}
                  value={shiftReport.issues}
                  onChange={(e) =>
                    setShiftReport({ ...shiftReport, issues: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Catatan</Label>
                <Textarea
                  id="notes"
                  placeholder="Catatan tambahan..."
                  rows={2}
                  value={shiftReport.notes}
                  onChange={(e) =>
                    setShiftReport({ ...shiftReport, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleShiftReportSubmit}>
                  <FileText className="mr-2 h-4 w-4" />
                  Simpan Report
                </Button>
                <Button variant="outline" onClick={exportShiftReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-xl">⏰</span>
                Report Ticket OVER SLA 7 JAM
              </CardTitle>
              <CardDescription>
                Format tiket yang sudah melewati SLA 7 jam untuk laporan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Input Section */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="slaInput" className="flex items-center gap-2">
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">INPUT</span>
                      Data Tiket OVER SLA
                    </Label>
                    <Textarea
                      id="slaInput"
                      placeholder={`Paste data tiket dengan format (pisahkan dengan TAB):
DURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI

Contoh:
3 JAM 56 MENIT	26012107781	FTTH AKSES	RESTI LINK LOSS - SIB PESAWARAN...
5 JAM 53 MENIT	26012107738	FTTH DISTRIBUSI	(PROAKTIVE NOC RETAIL)...`}
                      rows={10}
                      className="font-mono text-xs"
                      value={slaInput}
                      onChange={(e) => setSlaInput(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={handleSlaGenerate} className="flex-1 min-w-[120px]">
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Format
                    </Button>
                    <Button variant="outline" onClick={handleSlaClear} className="flex-1 min-w-[80px]">
                      Clear
                    </Button>
                  </div>

                  {/* Parsed tickets preview */}
                  {parsedSlaTickets.length > 0 && (
                    <div className="border rounded-lg p-3 bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        📊 {parsedSlaTickets.length} Tiket Terdeteksi:
                      </p>
                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                        {parsedSlaTickets.map((ticket, idx) => (
                          <div key={idx} className="text-xs flex items-start gap-2 p-1.5 bg-background rounded border">
                            <span className="font-mono text-destructive whitespace-nowrap">{ticket.duration}</span>
                            <span className="font-mono font-medium">{ticket.ticketId}</span>
                            <span className="text-muted-foreground truncate">{ticket.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Output Section */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="slaResult" className="flex items-center gap-2">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">HASIL</span>
                      Format Report OVER SLA 7 JAM
                    </Label>
                    <Textarea
                      id="slaResult"
                      placeholder="Hasil format akan muncul di sini..."
                      rows={10}
                      className="font-mono text-xs"
                      value={slaResult}
                      readOnly
                    />
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    onClick={handleSlaCopy} 
                    disabled={!slaResult}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Copy
                  </Button>
                </div>
              </div>

              {/* Format Guide */}
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium mb-2">📋 Format Input yang Didukung:</p>
                <code className="text-[10px] text-muted-foreground block whitespace-pre-wrap">
{`DURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI

Contoh Input:
3 JAM 56 MENIT	26012107781	FTTH AKSES	RESTI LINK LOSS - SIB PESAWARAN SPLT_GDTA176...
5 JAM 53 MENIT	26012107738	FTTH DISTRIBUSI	(PROAKTIVE NOC RETAIL) SPLT_BDLA180...

Hasil Output:
3 JAM 56 MENIT
26012107781
FTTH AKSES	RESTI LINK LOSS - SIB PESAWARAN SPLT_GDTA176...
TIKET TERKAIT : 
UPDATE : `}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Report;
