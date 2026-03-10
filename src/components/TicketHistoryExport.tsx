import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface HistoryRecord {
  date: string;
  ritel: number;
  feeder: number;
  total: number;
  created: number;
  in_progress: number;
  resolved: number;
}

export function TicketHistoryExport() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");

  useEffect(() => {
    fetchHistory();
  }, [days]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(days));
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("daily_ticket_history")
        .select("date, ritel, feeder, total, created, in_progress, resolved")
        .gte("date", cutoffStr)
        .order("date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching history:", err);
      toast.error("Gagal memuat data historis");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const buildExportData = () =>
    records.map((r) => ({
      Tanggal: formatDate(r.date),
      "Tanggal (ISO)": r.date,
      Ritel: r.ritel,
      Feeder: r.feeder,
      Total: r.total,
      "On Progress": r.in_progress,
      Resolved: r.resolved,
    }));

  const handleExportExcel = () => {
    if (records.length === 0) return toast.error("Tidak ada data untuk di-export");
    const ws = XLSX.utils.json_to_sheet(buildExportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Histori Tiket");
    XLSX.writeFile(wb, `histori-tiket-${days}hari-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  };

  const handleExportCSV = () => {
    if (records.length === 0) return toast.error("Tidak ada data untuk di-export");
    const ws = XLSX.utils.json_to_sheet(buildExportData());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `histori-tiket-${days}hari-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("File CSV berhasil diunduh");
  };

  const totalRitel = records.reduce((s, r) => s + r.ritel, 0);
  const totalFeeder = records.reduce((s, r) => s + r.feeder, 0);
  const totalAll = records.reduce((s, r) => s + r.total, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                📊 Daily Incident History
              </CardTitle>
              <CardDescription>
                Data historis incident tersimpan permanen di cloud — tidak hilang saat browser di-clear
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="14">14 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={records.length === 0}>
                    <FileDown className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportCSV}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-primary">{totalRitel}</p>
              <p className="text-[10px] text-muted-foreground">Total Ritel</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-destructive">{totalFeeder}</p>
              <p className="text-[10px] text-muted-foreground">Total Feeder</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{totalAll}</p>
              <p className="text-[10px] text-muted-foreground">Total Semua</p>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Memuat data...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Belum ada data historis tiket
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border max-h-[50vh]">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
                  <TableRow>
                    <TableHead className="text-xs">Tanggal</TableHead>
                    <TableHead className="text-xs text-center">Ritel</TableHead>
                    <TableHead className="text-xs text-center">Feeder</TableHead>
                    <TableHead className="text-xs text-center">Total</TableHead>
                    <TableHead className="text-xs text-center">On Progress</TableHead>
                    <TableHead className="text-xs text-center">Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.date}>
                      <TableCell className="text-xs font-medium">{formatDate(r.date)}</TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="secondary" className="text-[10px]">{r.ritel}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        <Badge variant="destructive" className="text-[10px]">{r.feeder}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center font-semibold">{r.total}</TableCell>
                      <TableCell className="text-xs text-center">{r.in_progress}</TableCell>
                      <TableCell className="text-xs text-center">{r.resolved}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-3">
            {records.length} data ditemukan • Terakhir {days} hari
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
