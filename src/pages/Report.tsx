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

const ticketUpdateSchema = z.object({
  ticketId: z.string().trim().min(1, "ID Ticket wajib diisi").max(50, "ID Ticket maksimal 50 karakter"),
  update: z.string().trim().min(1, "Update wajib diisi").max(5000, "Update maksimal 5000 karakter"),
  status: z.string().optional(),
  resolvedBy: z.string().trim().max(100, "Nama petugas maksimal 100 karakter"),
});

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

  const [ticketUpdate, setTicketUpdate] = useState({
    ticketId: "",
    update: "",
    status: "",
    resolvedBy: "",
  });

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

  const handleTicketUpdateSubmit = () => {
    // Validate with Zod schema
    const result = ticketUpdateSchema.safeParse(ticketUpdate);
    if (!result.success) {
      toast({
        title: "Validasi gagal",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Save to localStorage
    const updates = JSON.parse(localStorage.getItem("ticketUpdates") || "[]");
    updates.push({
      ...ticketUpdate,
      id: `UPDATE-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem("ticketUpdates", JSON.stringify(updates));

    toast({
      title: "Update ticket tersimpan",
      description: "Update report ticket berhasil disimpan.",
    });

    // Reset form
    setTicketUpdate({
      ticketId: "",
      update: "",
      status: "",
      resolvedBy: "",
    });
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="shift">Report Shift</TabsTrigger>
          <TabsTrigger value="ticket">Update Report Ticket</TabsTrigger>
        </TabsList>

        <TabsContent value="shift" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Shift</CardTitle>
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

        <TabsContent value="ticket" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Update Report Ticket</CardTitle>
              <CardDescription>
                Buat update report untuk ticket yang sedang ditangani
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticketId">ID Ticket</Label>
                  <Input
                    id="ticketId"
                    placeholder="Masukkan ID ticket"
                    value={ticketUpdate.ticketId}
                    onChange={(e) =>
                      setTicketUpdate({ ...ticketUpdate, ticketId: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status Update</Label>
                  <Select
                    value={ticketUpdate.status}
                    onValueChange={(value) =>
                      setTicketUpdate({ ...ticketUpdate, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="On Progress">On Progres</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="update">Update/Progress</Label>
                <Textarea
                  id="update"
                  placeholder="Deskripsikan update atau progress penanganan ticket..."
                  rows={5}
                  value={ticketUpdate.update}
                  onChange={(e) =>
                    setTicketUpdate({ ...ticketUpdate, update: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolvedBy">Ditangani Oleh</Label>
                <Input
                  id="resolvedBy"
                  placeholder="Nama teknisi/petugas"
                  value={ticketUpdate.resolvedBy}
                  onChange={(e) =>
                    setTicketUpdate({ ...ticketUpdate, resolvedBy: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleTicketUpdateSubmit}>
                <FileText className="mr-2 h-4 w-4" />
                Simpan Update
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Report;
