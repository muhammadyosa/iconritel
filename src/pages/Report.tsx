import { useState, useEffect } from "react";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { useRealtimeDate } from "@/hooks/useRealtimeDate";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { FileText, Download, ClipboardList, Trash2, RefreshCw, Loader2, CalendarIcon, Search } from "lucide-react";
import { format, parse } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { z } from "zod";
import { Ticket } from "@/types/ticket";
import { DashboardIconnetTab } from "@/components/DashboardIconnetTab";
import { useUserRole } from "@/hooks/useUserRole";
import { StatusBadge } from "@/components/StatusBadge";
import { TicketDetailDialog } from "@/components/TicketDetailDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCloudShiftReports, ShiftReportInput } from "@/hooks/useCloudShiftReports";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  ticketCount: string;
}

const Report = () => {
  // Realtime date hook
  const realtimeDate = useRealtimeDate();
  
  const [shiftReport, setShiftReport] = useState({
    date: realtimeDate,
    shift: "pagi",
    officer: "",
    oltDown: "",
    portDown: "",
    fatLoss: "",
    issues: "",
    notes: "",
  });
  
  // Keep date in sync with realtime
  useEffect(() => {
    setShiftReport(prev => ({ ...prev, date: realtimeDate }));
  }, [realtimeDate]);

  // Cloud shift reports hook
  const { 
    reports: cloudReports, 
    isLoading: isLoadingReports, 
    fetchReports, 
    addReport, 
    getFormattedReports 
  } = useCloudShiftReports();
  
  // Cloud tickets for pending count badge
  const { tickets: allCloudTickets, isLoading: isLoadingTickets, updateTicket, deleteTicket } = useCloudTickets();
  const pendingCloudTickets = allCloudTickets.filter(t => t.status === "Pending");
  const pendingCount = pendingCloudTickets.length;

  // User role for permission-based UI
  const { isAdmin } = useUserRole();
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for SLA Report
  const [slaInput, setSlaInput] = useState("");
  const [slaResult, setSlaResult] = useState("");
  const [parsedSlaTickets, setParsedSlaTickets] = useState<SLATicket[]>([]);

  const handleShiftReportSubmit = async () => {
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

    setIsSubmitting(true);
    
    // Save to cloud database
    const reportInput: ShiftReportInput = {
      date: shiftReport.date,
      shift: shiftReport.shift,
      officer: shiftReport.officer,
      oltDown: shiftReport.oltDown,
      portDown: shiftReport.portDown,
      fatLoss: shiftReport.fatLoss,
      issues: shiftReport.issues,
      notes: shiftReport.notes,
    };
    
    const success = await addReport(reportInput);
    setIsSubmitting(false);

    if (success) {
      // Reset form with realtime date
      setShiftReport({
        date: realtimeDate,
        shift: "pagi",
        officer: "",
        oltDown: "",
        portDown: "",
        fatLoss: "",
        issues: "",
        notes: "",
      });
    }
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
      // Split by tab character - keep empty parts to preserve column positions
      const parts = line.split("\t").map(p => p.trim());
      
      // Filter out empty parts but track original positions
      const nonEmptyParts = parts.filter(p => p);
      
      if (nonEmptyParts.length >= 3) {
        // Format: DURATION \t TICKET_ID \t TYPE \t DESCRIPTION \t TICKET_COUNT
        const duration = nonEmptyParts[0];
        const ticketId = nonEmptyParts[1];
        
        // Check if type and description are separate or combined
        let type = "";
        let description = "";
        let ticketCount = "";
        
        if (nonEmptyParts.length >= 4) {
          type = nonEmptyParts[2];
          description = nonEmptyParts[3];
          // Get ticket count from column 5 (index 4) if exists
          ticketCount = nonEmptyParts[4] || "";
        } else {
          // Type and description might be in one field
          const combined = nonEmptyParts[2];
          // Try to extract type (FTTH AKSES, FTTH DISTRIBUSI, FTTH FEEDER, FTTH BACKBONE)
          const typeMatch = combined.match(/^(FTTH\s+(?:AKSES|DISTRIBUSI|FEEDER|BACKBONE))\s*[-–]?\s*/i);
          if (typeMatch) {
            type = typeMatch[1];
            description = combined.substring(typeMatch[0].length).trim();
          } else {
            type = combined;
            description = "";
          }
          ticketCount = nonEmptyParts[3] || "";
        }

        tickets.push({ duration, ticketId, type, description, ticketCount });
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

    // Sort by duration descending (longest first)
    const parseDurationToMinutes = (dur: string): number => {
      // Handle HH:MM:SS or H:MM:SS format first
      const timeMatch = dur.match(/(\d+):(\d+):(\d+)/);
      if (timeMatch) {
        return parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) + parseInt(timeMatch[3]) / 60;
      }
      // Handle HH:MM format (no seconds)
      const hmMatch = dur.match(/^(\d+):(\d+)$/);
      if (hmMatch) {
        return parseInt(hmMatch[1]) * 60 + parseInt(hmMatch[2]);
      }
      // Handle text-based durations like "2d 5h 30m", "7 jam", "45 menit"
      let total = 0;
      const dayMatch = dur.match(/(\d+)\s*(?:d|day|hari)/i);
      const hourMatch = dur.match(/(\d+)\s*(?:h|jam|hour)/i);
      const minMatch = dur.match(/(\d+)\s*(?:m|min|menit)/i);
      if (dayMatch) total += parseInt(dayMatch[1]) * 1440;
      if (hourMatch) total += parseInt(hourMatch[1]) * 60;
      if (minMatch) total += parseInt(minMatch[1]);
      return total;
    };

    tickets.sort((a, b) => parseDurationToMinutes(b.duration) - parseDurationToMinutes(a.duration));

    setParsedSlaTickets(tickets);

    // Generate formatted output
    const formattedOutput = tickets.map(ticket => {
      return `${ticket.duration}
${ticket.ticketId}
${ticket.type}\t${ticket.description}
TIKET TERKAIT : ${ticket.ticketCount}
UPDATE : 
KENDALA :`;
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
    const formattedReports = getFormattedReports();
    if (formattedReports.length === 0) {
      toast({
        title: "Tidak ada data",
        description: "Belum ada report shift untuk diekspor.",
        variant: "destructive",
      });
      return;
    }

    const text = formattedReports
      .map(
        (r) =>
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">📝 Report</h1>
        <p className="text-muted-foreground text-[11px] sm:text-sm">
          Kelola report shift dan update ticket
        </p>
      </div>

      <Tabs defaultValue="shift" className="w-full">
        <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-auto min-w-full sm:min-w-0 gap-1 h-auto flex-wrap sm:flex-nowrap p-1">
            <TabsTrigger value="shift" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">🗣️ Report Shift</TabsTrigger>
            <TabsTrigger value="sla" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">⏰ SLA 7 JAM</TabsTrigger>
            <TabsTrigger value="pending" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap relative">
              📋 Pending
              {pendingCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold min-w-[18px] h-[18px] px-1">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="dashboard-iconnet" className="text-[11px] sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">📊 Iconnet</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="shift" className="space-y-3 sm:space-y-4">
          {/* Header Info Card */}
          <Card className="border-primary/20">
            <CardHeader className="pb-3 pt-4 px-3 sm:px-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg">🗣️ Report Shift</CardTitle>
                  <CardDescription className="text-[11px] sm:text-sm mt-0.5">
                    Buat laporan shift harian untuk monitoring NOC
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={exportShiftReport} disabled={isLoadingReports} className="h-8 text-xs px-2.5">
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export
                  </Button>
                  <Button variant="ghost" size="sm" onClick={fetchReports} disabled={isLoadingReports} title="Refresh data" className="h-8 w-8 p-0">
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoadingReports ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
              {/* Shift Info Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">📅 Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 w-full justify-start text-left text-sm font-normal",
                          !shiftReport.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-60" />
                        {shiftReport.date
                          ? format(parse(shiftReport.date, "yyyy-MM-dd", new Date()), "dd MMMM yyyy", { locale: idLocale })
                          : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={shiftReport.date ? parse(shiftReport.date, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setShiftReport({ ...shiftReport, date: format(date, "yyyy-MM-dd") });
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">⏰ Shift</Label>
                  <Select
                    value={shiftReport.shift}
                    onValueChange={(value) =>
                      setShiftReport({ ...shiftReport, shift: value })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pagi">🌅 Pagi</SelectItem>
                      <SelectItem value="siang">☀️ Siang</SelectItem>
                      <SelectItem value="malam">🌙 Malam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">👤 Petugas</Label>
                  <Input
                    className="h-9 text-sm"
                    placeholder="Nama petugas shift"
                    value={shiftReport.officer}
                    onChange={(e) =>
                      setShiftReport({ ...shiftReport, officer: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Incident Reports Section */}
              <div className="space-y-3">
                <h3 className="text-xs sm:text-sm font-semibold text-primary flex items-center gap-1.5">
                  📟 Ringkasan Shift
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1.5 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 sm:p-3">
                    <Label htmlFor="oltDown" className="text-xs font-medium flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center rounded bg-destructive/10 text-destructive text-[10px] font-semibold px-1.5 py-0.5">OLT DOWN</span>
                    </Label>
                    <Textarea
                      id="oltDown"
                      placeholder="Laporan OLT yang mengalami down..."
                      rows={2}
                      className="text-sm resize-none bg-background/80"
                      value={shiftReport.oltDown}
                      onChange={(e) =>
                        setShiftReport({ ...shiftReport, oltDown: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-2.5 sm:p-3">
                    <Label htmlFor="portDown" className="text-xs font-medium flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-semibold px-1.5 py-0.5">PORT DOWN</span>
                    </Label>
                    <Textarea
                      id="portDown"
                      placeholder="Laporan port yang mengalami down..."
                      rows={2}
                      className="text-sm resize-none bg-background/80"
                      value={shiftReport.portDown}
                      onChange={(e) =>
                        setShiftReport({ ...shiftReport, portDown: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-2.5 sm:p-3">
                    <Label htmlFor="fatLoss" className="text-xs font-medium flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center rounded bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5">FAT LOSS</span>
                    </Label>
                    <Textarea
                      id="fatLoss"
                      placeholder="Laporan FAT loss..."
                      rows={2}
                      className="text-sm resize-none bg-background/80"
                      value={shiftReport.fatLoss}
                      onChange={(e) =>
                        setShiftReport({ ...shiftReport, fatLoss: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Additional Notes Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="issues" className="text-xs font-medium flex items-center gap-1.5">
                    ⚠️ Kendala / Masalah
                  </Label>
                  <Textarea
                    id="issues"
                    placeholder="Kendala atau masalah yang ditemui..."
                    rows={3}
                    className="text-sm resize-none"
                    value={shiftReport.issues}
                    onChange={(e) =>
                      setShiftReport({ ...shiftReport, issues: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes" className="text-xs font-medium flex items-center gap-1.5">
                    📝 Catatan
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Catatan tambahan..."
                    rows={3}
                    className="text-sm resize-none"
                    value={shiftReport.notes}
                    onChange={(e) =>
                      setShiftReport({ ...shiftReport, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button onClick={handleShiftReportSubmit} disabled={isSubmitting} className="w-full sm:w-auto h-10">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Menyimpan..." : "Simpan Report"}
              </Button>
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

        <TabsContent value="pending" className="space-y-4">
          <PendingTicketsList 
            pendingTickets={pendingCloudTickets}
            isLoading={isLoadingTickets}
            updateTicket={updateTicket}
            deleteTicket={deleteTicket}
          />
        </TabsContent>

        <TabsContent value="dashboard-iconnet" className="space-y-4">
          <DashboardIconnetTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Team definitions by region
const TEAM_REGIONS: Record<string, string[]> = {
  LAMPUNG: [
    "SIB PESAWARAN", "SIB PRINGSEWU", "GSP TANGGAMUS", "INTERNAL LAMPUNG",
    "TTM LAMPUNG TENGAH", "SIB BANDAR LAMPUNG", "SERPO TEGINENENG", "SERPO SUTAMI",
    "SERPO RAJABASA", "SERPO PRINGSEWU", "SERPO MENGGALA", "SERPO RUMBIA",
    "SERPO KOTA BUMI", "SERPO KALIANDA", "SERPO PAHAWANG"
  ],
  SUMSEL: [
    "REG7 PALEMBANG 1", "REG7 PALEMBANG 2", "REG7 PALEMBANG 3", "INTERNAL SUMSEL",
    "IKR OKU TIMUR", "TTM INDRALAYA", "INTERNAL LAHAT", "GSP LUBUK LINGGAU",
    "GSP PRABU PANGKUL", "SIB BANYUASIN", "SIB MUARA ENIM - TJ ENIM", "SIB PAGARALAM",
    "SIB LAHAT", "SIB EMPAT LAWANG", "SERPO PALEMBANG KOTA", "SERPO LAHAT",
    "SERPO PAGAR ALAM", "SERPO BUKIT ASAM", "SERPO PRABUMULIH", "SERPO LINGGAU",
    "SERPO MARTAPURA", "SERPO SEKAYU", "SERPO TUGUMULYO", "SERPO BATURAJA",
    "SERPO SUNGAI LILIN", "SERPO BETUNG", "SERPO KAYU AGUNG", "SERPO INDRALAYA",
    "SERPO TEBING", "SERPO BELITANG", "SERPO DEMANG", "SERPO MASKAREBET", "SERPO JAKABARING"
  ],
  JAMBI: [
    "INTERNAL JAMBI", "TTM SAROLANGUN", "TTM MERANGIN", "GSP MUARA BULIAN",
    "GSP JAMBI 2", "GSP SUNGAI PENUH", "GSP TEBO", "SERPO BUNGO",
    "SERPO PAYOSELINCAH", "SERPO JAMBI KOTA", "SERPO SAROLANGUN",
    "SERPO MUARA BULIAN", "SERPO BANGKO", "SERPO SUNGAI PENUH",
    "SERPO TEBO", "SERPO KUALA TUNGKAL"
  ],
  BENGKULU: [
    "GSP BENGKULU 1", "GSP BENGKULU 2", "SIB LEBONG", "TTM KAUR BINTUHAN",
    "SIB CURUP", "GSP MANNA-KAUR", "GSP MUKO-MUKO", "GSP BENTENG-MUARABANGKAHULU",
    "SERPO SUKAMERINDU", "SERPO ARGA MAKMUR", "SERPO MANNA", "SERPO PEKALONGAN",
    "SERPO MUKO-MUKO", "SERPO KAUR"
  ],
  BANGKA: [
    "BANGKA REG 7", "TTM SUNGAI LIAT", "SIB BELITUNG", "SIB BANGKA BARAT",
    "BHMA MUNTOK", "BHMA TOBOALI", "TTM TOBOALI", "SERPO KOBA (Tarapti)",
    "SERPO PANGKAL PINANG", "SERPO KOBA", "SERPO KELAPA", "SERPO MANGGAR",
    "SERPO BELITUNG", "SERPO SUNGAI LIAT"
  ],
};

// Interface for parsed pending ticket
interface ParsedPendingTicket {
  duration: string;
  durationMinutes: number;
  ticketId: string;
  type: string;
  description: string;
  team: string;
  region: string;
}

// Function to extract team from description
function extractTeam(description: string): { team: string; region: string } {
  const normalizedDesc = description.toUpperCase();
  
  for (const [region, teams] of Object.entries(TEAM_REGIONS)) {
    for (const team of teams) {
      if (normalizedDesc.includes(team.toUpperCase())) {
        return { team, region };
      }
    }
  }
  
  return { team: "UNKNOWN", region: "LAINNYA" };
}

// Function to parse duration to minutes for sorting
function parseDurationToMinutes(duration: string): number {
  let total = 0;
  const dayMatch = duration.match(/(\d+)\s*HARI/i);
  const hourMatch = duration.match(/(\d+)\s*JAM/i);
  const minuteMatch = duration.match(/(\d+)\s*MENIT/i);
  
  if (dayMatch) total += parseInt(dayMatch[1]) * 24 * 60;
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minuteMatch) total += parseInt(minuteMatch[1]);
  
  return total;
}

// Component for Pending Tickets List
interface PendingTicketsListProps {
  pendingTickets: Ticket[];
  isLoading: boolean;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
}

function PendingTicketsList({ pendingTickets, isLoading, updateTicket, deleteTicket }: PendingTicketsListProps) {
  const [pendingInput, setPendingInput] = useState("");
  const [pendingResult, setPendingResult] = useState("");
  const [parsedPendingTickets, setParsedPendingTickets] = useState<ParsedPendingTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingSearchField, setPendingSearchField] = useState("all");
  const [pendingSearchQuery, setPendingSearchQuery] = useState("");
  
  // User role for permission-based UI
  const { isAdmin, isReviewer } = useUserRole();

  const handleUpdateStatus = async (id: string, newStatus: Ticket["status"]) => {
    try {
      await updateTicket(id, { status: newStatus });
      toast({
        title: "Status diperbarui",
        description: `Incident berhasil diubah ke ${newStatus}`,
      });
    } catch {
      toast({
        title: "Gagal update",
        description: "Tidak dapat memperbarui status incident.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTicket = async (id: string) => {
    try {
      await deleteTicket(id);
      toast({
        title: "Incident dihapus",
        description: "Incident berhasil dihapus dari sistem.",
      });
    } catch {
      toast({
        title: "Gagal hapus",
        description: "Tidak dapat menghapus incident.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Parse pending input and generate formatted output
  const handlePendingGenerate = () => {
    if (!pendingInput.trim()) {
      toast({
        title: "Input kosong",
        description: "Mohon masukkan data tiket.",
        variant: "destructive",
      });
      return;
    }

    const lines = pendingInput.trim().split("\n").filter(line => line.trim());
    const parsedTickets: ParsedPendingTicket[] = [];

    for (const line of lines) {
      // Split by tab character
      const parts = line.split("\t").map(p => p.trim()).filter(p => p);
      
      if (parts.length >= 3) {
        const duration = parts[0];
        const durationMinutes = parseDurationToMinutes(duration);
        
        // Handle different formats
        let ticketId = "";
        let type = "";
        let description = "";
        
        if (parts.length >= 4) {
          ticketId = parts[1];
          type = parts[2];
          description = parts.slice(3).join(" ");
        } else {
          // Format: DURATION \t TICKET_ID TYPE \t DESCRIPTION
          // or: DURATION \t TICKET_ID \t TYPE+DESCRIPTION
          const secondPart = parts[1];
          const ticketMatch = secondPart.match(/^(\d+)/);
          if (ticketMatch) {
            ticketId = ticketMatch[1];
            const rest = secondPart.substring(ticketId.length).trim();
            if (rest) {
              type = rest;
            } else {
              type = parts[2] || "";
            }
          } else {
            ticketId = parts[1];
            type = parts[2] || "";
          }
          description = parts.slice(2).join(" ");
        }

        const { team, region } = extractTeam(description);

        parsedTickets.push({ 
          duration, 
          durationMinutes,
          ticketId, 
          type, 
          description,
          team,
          region
        });
      }
    }

    if (parsedTickets.length === 0) {
      toast({
        title: "Format tidak valid",
        description: "Pastikan format input sesuai: DURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI",
        variant: "destructive",
      });
      return;
    }

    setParsedPendingTickets(parsedTickets);

    // Group tickets by team
    const ticketsByTeam: Record<string, ParsedPendingTicket[]> = {};
    for (const ticket of parsedTickets) {
      if (!ticketsByTeam[ticket.team]) {
        ticketsByTeam[ticket.team] = [];
      }
      ticketsByTeam[ticket.team].push(ticket);
    }

    // Sort tickets within each team by duration (highest first)
    for (const team in ticketsByTeam) {
      ticketsByTeam[team].sort((a, b) => b.durationMinutes - a.durationMinutes);
    }

    // Generate formatted output grouped by team
    const today = new Date();
    const dateStr = today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).toUpperCase();

    const teamOrder = Object.keys(ticketsByTeam).sort((a, b) => {
      // Get max duration for each team for sorting
      const maxA = Math.max(...ticketsByTeam[a].map(t => t.durationMinutes));
      const maxB = Math.max(...ticketsByTeam[b].map(t => t.durationMinutes));
      return maxB - maxA;
    });

    let formattedOutput = "";
    for (const team of teamOrder) {
      const teamTickets = ticketsByTeam[team];
      formattedOutput += `LIST TIKET YANG BELUM DI KERJAKAN TANGGAL ${dateStr}\n`;
      formattedOutput += `TIM: ${team}\n\n`;
      
      for (const ticket of teamTickets) {
        formattedOutput += `${ticket.duration}\n`;
        formattedOutput += `${ticket.ticketId}\n`;
        formattedOutput += `${ticket.type}\t${ticket.description}\n\n`;
      }
      formattedOutput += "\n";
    }

    setPendingResult(formattedOutput.trim());

    toast({
      title: "Format berhasil",
      description: `${parsedTickets.length} tiket dikelompokkan ke ${teamOrder.length} tim.`,
    });
  };

  const handlePendingCopy = () => {
    if (!pendingResult) {
      toast({
        title: "Tidak ada hasil",
        description: "Generate format terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    navigator.clipboard.writeText(pendingResult).then(() => {
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

  const handlePendingClear = () => {
    setPendingInput("");
    setPendingResult("");
    setParsedPendingTickets([]);
  };

  return (
    <div className="space-y-4">
      {/* Parser Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📋Format Tiket Belum Dikerjakan
          </CardTitle>
          <CardDescription>
            Parse dan kelompokkan tiket berdasarkan tim terkait
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Section */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pendingInput" className="flex items-center gap-2">
                  <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">INPUT</span>
                  Data Tiket
                </Label>
                <Textarea
                  id="pendingInput"
                  placeholder={`Paste data tiket dengan format (pisahkan dengan TAB):
DURASI[TAB]ID_TIKET[TAB]TYPE[TAB]DESKRIPSI

Contoh:
1 HARI 2 JAM 57 MENIT	26012107781	FTTH AKSES	RESTI LINK LOSS - SIB PESAWARAN...
4 JAM 45 MENIT	26012108073	FTTH AKSES	SISWANTO ONT PROBLEM - TTM LAMPUNG TENGAH...`}
                  rows={8}
                  className="font-mono text-xs"
                  value={pendingInput}
                  onChange={(e) => setPendingInput(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button onClick={handlePendingGenerate} className="flex-1 min-w-[120px]">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate
                </Button>
                <Button variant="outline" onClick={handlePendingClear} className="flex-1 min-w-[80px]">
                  Clear
                </Button>
              </div>

              {/* Parsed tickets preview */}
              {parsedPendingTickets.length > 0 && (
                <div className="border rounded-lg p-3 bg-muted/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    📊 {parsedPendingTickets.length} Tiket Terdeteksi:
                  </p>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {parsedPendingTickets.map((ticket, idx) => (
                      <div key={idx} className="text-xs flex items-start gap-2 p-1.5 bg-background rounded border">
                        <span className="font-mono text-destructive whitespace-nowrap">{ticket.duration}</span>
                        <span className="font-mono font-medium">{ticket.ticketId}</span>
                        <span className="text-primary font-medium">{ticket.team}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Output Section */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pendingResult" className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">HASIL</span>
                  Format per Tim
                </Label>
                <Textarea
                  id="pendingResult"
                  placeholder="Hasil format akan muncul di sini..."
                  rows={8}
                  className="font-mono text-xs"
                  value={pendingResult}
                  readOnly
                />
              </div>
              
              <Button 
                variant="secondary" 
                onClick={handlePendingCopy} 
                disabled={!pendingResult}
                className="w-full"
              >
                <Download className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>

          {/* Team Reference */}
          <div className="border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-medium mb-2">🗺️ Daftar Tim per Region:</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
              <div>
                <span className="font-semibold text-primary">LAMPUNG:</span>
                <span className="text-muted-foreground"> SIB PESAWARAN, TTM LAMPUNG TENGAH, dll</span>
              </div>
              <div>
                <span className="font-semibold text-primary">SUMSEL:</span>
                <span className="text-muted-foreground"> REG7 PALEMBANG, SIB BANYUASIN, dll</span>
              </div>
              <div>
                <span className="font-semibold text-primary">JAMBI:</span>
                <span className="text-muted-foreground"> INTERNAL JAMBI, GSP TEBO, dll</span>
              </div>
              <div>
                <span className="font-semibold text-primary">BENGKULU:</span>
                <span className="text-muted-foreground"> GSP BENGKULU, SIB CURUP, dll</span>
              </div>
              <div>
                <span className="font-semibold text-primary">BANGKA:</span>
                <span className="text-muted-foreground"> BANGKA REG 7, SIB BELITUNG, dll</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Pending Tickets Table - matching List Incident style */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-2 sm:px-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-1.5">
                <ClipboardList className="h-4 w-4" />
                Incident Pending di Sistem
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-xs mt-0.5">
                {pendingTickets.length} incident pending — klik baris untuk detail
              </CardDescription>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="p-1.5 sm:p-2">
          {/* Search filter */}
          <div className="flex flex-col xs:flex-row gap-1.5 sm:gap-2 xs:items-end mb-1.5">
            <div className="w-full xs:w-28 sm:w-40">
              <Label className="text-[9px] sm:text-[10px]">Search By</Label>
              <Select value={pendingSearchField} onValueChange={setPendingSearchField}>
                <SelectTrigger className="h-6 sm:h-7 text-[9px] sm:text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="ticketId">Incident ID</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                  <SelectItem value="customerType">Customer/Type</SelectItem>
                  <SelectItem value="serviceId">Service ID</SelectItem>
                  <SelectItem value="constraint">Constraint</SelectItem>
                  <SelectItem value="serpo">Serpo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-[9px] sm:text-[10px]">Pencarian</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Cari..."
                  value={pendingSearchQuery}
                  onChange={(e) => setPendingSearchQuery(e.target.value)}
                  className="h-6 sm:h-7 text-[10px] sm:text-xs pl-7"
                />
              </div>
            </div>
          </div>

          {(() => {
            const q = pendingSearchQuery.toLowerCase();
            const filtered = q ? pendingTickets.filter((t) => {
              switch (pendingSearchField) {
                case "ticketId": return t.id.toLowerCase().includes(q);
                case "category": return t.category.toLowerCase().includes(q);
                case "customerType": return (t.customerName + " " + t.constraint).toLowerCase().includes(q);
                case "serviceId": return t.serviceId.toLowerCase().includes(q);
                case "constraint": return t.constraint.toLowerCase().includes(q);
                case "serpo": return t.serpo.toLowerCase().includes(q);
                default: return (t.id + t.customerName + t.serviceId + t.constraint + t.serpo + t.category + t.hostname).toLowerCase().includes(q);
              }
            }) : pendingTickets;

            return filtered.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">{pendingTickets.length === 0 ? "Tidak ada incident pending" : "Tidak ditemukan"}</p>
              <p className="text-[10px]">{pendingTickets.length === 0 ? "Semua incident sudah dalam proses atau selesai" : "Coba ubah kata kunci pencarian"}</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto overflow-y-auto max-h-[40vh] sm:max-h-[50vh] md:max-h-[55vh]">
              <Table className="min-w-[550px]">
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow className="h-5">
                    <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">🎫 Incident ID</TableHead>
                    <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">📦 Type</TableHead>
                    <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👤 Customer/Type</TableHead>
                    <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👨‍💼 Service ID</TableHead>
                    <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">👥 Serpo</TableHead>
                    <TableHead className="px-1 py-0.5 text-[8px] sm:text-[9px] whitespace-nowrap bg-muted/80">⚙️ Status</TableHead>
                    
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((ticket) => (
                    <TableRow 
                      key={ticket.id} 
                      className="h-6 sm:h-7 cursor-pointer hover:bg-muted/70"
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setDetailOpen(true);
                      }}
                    >
                      <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] font-medium">{ticket.id}</TableCell>
                      <TableCell className="px-1 sm:px-1.5 py-0.5">
                        <div>
                          <Badge
                            className={`text-[7px] sm:text-[8px] px-1 py-0 h-3 sm:h-3.5 ${
                              ticket.category === "FEEDER"
                                ? "bg-warning text-warning-foreground"
                                : "bg-primary text-primary-foreground"
                            }`}
                          >
                            {ticket.category}
                          </Badge>
                          <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5 truncate max-w-[80px] sm:max-w-none">
                            {ticket.constraint}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">
                        {ticket.category === "FEEDER" ? (
                          ticket.constraint === "OLT DOWN" ? (
                            <span className="font-medium">{ticket.hostname}</span>
                          ) :
                          ticket.constraint === "PORT DOWN" ? (
                            <div>
                              <div className="font-medium text-[9px] sm:text-[10px]">{ticket.ticketResult.match(/PORT - (.*?) - DOWN/)?.[1] || "PORT"}</div>
                              <div className="text-muted-foreground text-[7px] sm:text-[8px]">{ticket.hostname}</div>
                            </div>
                          ) :
                          ticket.constraint === "FAT LOSS" || ticket.constraint === "FAT BAD RX" ? (
                            <div>
                              <div className="font-medium text-[9px] sm:text-[10px]">{ticket.fatId}</div>
                              <div className="text-muted-foreground text-[7px] sm:text-[8px]">{ticket.hostname}</div>
                            </div>
                          ) : ticket.constraint
                        ) : ticket.customerName}
                      </TableCell>
                      <TableCell className="px-1 sm:px-1.5 py-0.5 font-mono text-[9px] sm:text-[10px]">{ticket.serviceId}</TableCell>
                      <TableCell className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px]">{ticket.serpo}</TableCell>
                      <TableCell className="px-1 sm:px-1.5 py-0.5">
                        <div>
                          <StatusBadge status={ticket.status} />
                          <div className="text-[7px] sm:text-[8px] text-muted-foreground mt-0.5">
                            {ticket.createdAt}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
          })()}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedTicket && (
        <TicketDetailDialog
          ticket={selectedTicket}
          isAdmin={isAdmin}
          isReviewer={isReviewer}
          updateTicket={updateTicket}
          deleteTicket={deleteTicket}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}

export default Report;
