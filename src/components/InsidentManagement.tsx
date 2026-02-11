import { useState, useMemo, useCallback, useRef } from "react";
import { Trash2, RefreshCw, ClipboardList, Clock, AlertTriangle, CheckCircle, Loader2, Timer, FileDown, Download, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { Ticket } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

const STATUS_OPTIONS = ["All", "On Progress", "Critical", "Resolved", "Pending"] as const;

function getTimeRemaining(resolvedAt: string): string {
  const resolvedTime = new Date(resolvedAt).getTime();
  const deleteAt = resolvedTime + 8 * 60 * 60 * 1000;
  const remaining = deleteAt - Date.now();
  if (remaining <= 0) return "Segera dihapus";
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}j ${minutes}m`;
}

export function InsidentManagement() {
  const { tickets, isLoading, refetch, addTicket } = useCloudTickets();
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | "status">("selected");
  const [deleteStatusFilter, setDeleteStatusFilter] = useState<string>("Resolved");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTickets = useMemo(() => {
    if (statusFilter === "All") return tickets;
    return tickets.filter((t) => t.status === statusFilter);
  }, [tickets, statusFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = tickets.length;
    const onProgress = tickets.filter((t) => t.status === "On Progress").length;
    const critical = tickets.filter((t) => t.status === "Critical").length;
    const resolved = tickets.filter((t) => t.status === "Resolved").length;
    const pending = tickets.filter((t) => t.status === "Pending").length;

    // Avg resolution time for resolved tickets
    let avgResolutionMs = 0;
    const resolvedTickets = tickets.filter((t) => t.status === "Resolved" && t.resolvedAt);
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.createdISO).getTime();
        const resolved = new Date(t.resolvedAt!).getTime();
        return sum + (resolved - created);
      }, 0);
      avgResolutionMs = totalMs / resolvedTickets.length;
    }
    const avgHours = Math.floor(avgResolutionMs / (1000 * 60 * 60));
    const avgMinutes = Math.floor((avgResolutionMs % (1000 * 60 * 60)) / (1000 * 60));

    return { total, onProgress, critical, resolved, pending, avgResolution: `${avgHours}j ${avgMinutes}m` };
  }, [tickets]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTickets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTickets.map((t) => t.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      let idsToDelete: string[] = [];

      if (deleteTarget === "selected") {
        idsToDelete = Array.from(selectedIds);
      } else {
        idsToDelete = tickets
          .filter((t) => t.status === deleteStatusFilter)
          .map((t) => t.id);
      }

      if (idsToDelete.length === 0) {
        toast.info("Tidak ada insident untuk dihapus");
        return;
      }

      // Delete in batches
      const batchSize = 50;
      for (let i = 0; i < idsToDelete.length; i += batchSize) {
        const batch = idsToDelete.slice(i, i + batchSize);
        const { error } = await supabase
          .from("tickets")
          .delete()
          .in("ticket_id" as never, batch as never);
        if (error) throw error;
      }

      toast.success(`${idsToDelete.length} insident berhasil dihapus`);
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      refetch();
    } catch (error) {
      toast.error("Gagal menghapus insident");
      if (import.meta.env.DEV) console.error("Bulk delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.info("Pilih insident yang ingin dihapus terlebih dahulu");
      return;
    }
    setDeleteTarget("selected");
    setShowDeleteDialog(true);
  };

  const openDeleteByStatus = () => {
    setDeleteTarget("status");
    setShowDeleteDialog(true);
  };

  const deleteCount =
    deleteTarget === "selected"
      ? selectedIds.size
      : tickets.filter((t) => t.status === deleteStatusFilter).length;

  const buildExportData = useCallback((data: typeof tickets) => {
    return data.map((t, idx) => ({
      "No": idx + 1,
      "Ticket ID": t.id,
      "Customer": t.customerName,
      "Service ID": t.serviceId,
      "Hostname": t.hostname,
      "FAT ID": t.fatId,
      "SN ONT": t.snOnt,
      "SERPO": t.serpo,
      "Kendala": t.constraint,
      "Kategori": t.category,
      "Status": t.status,
      "Create by": t.createdByName || "-",
      "Dibuat": t.createdAt,
      "Hasil": t.ticketResult,
    }));
  }, []);

  const handleExportExcel = useCallback(() => {
    const data = buildExportData(filteredTickets);
    if (data.length === 0) { toast.info("Tidak ada data untuk diexport"); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Insident");
    ws["!cols"] = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, ...data.map((r) => String((r as any)[key]).length).slice(0, 50)) + 2,
    }));
    XLSX.writeFile(wb, `Insident_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${data.length} insident berhasil diexport ke Excel`);
  }, [filteredTickets, buildExportData]);

  const handleExportCSV = useCallback(() => {
    const data = buildExportData(filteredTickets);
    if (data.length === 0) { toast.info("Tidak ada data untuk diexport"); return; }
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Insident_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${data.length} insident berhasil diexport ke CSV`);
  }, [filteredTickets, buildExportData]);

  const handleImportFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws);
      if (rows.length === 0) { toast.error("File tidak memiliki data"); return; }

      let successCount = 0;
      for (const row of rows) {
        try {
          await addTicket({
            id: row["Ticket ID"] || `IMP-${Date.now()}-${successCount}`,
            serviceId: row["Service ID"] || "-",
            customerName: row["Customer"] || "-",
            serpo: row["SERPO"] || "-",
            hostname: row["Hostname"] || "-",
            fatId: row["FAT ID"] || "-",
            snOnt: row["SN ONT"] || "-",
            constraint: row["Kendala"] || "-",
            category: row["Kategori"] || "RITEL",
            ticketResult: row["Hasil"] || "-",
            status: (row["Status"] as any) || "On Progress",
            createdAt: row["Dibuat"] || new Date().toLocaleString("id-ID"),
            createdISO: new Date().toISOString(),
          });
          successCount++;
        } catch { /* skip failed rows */ }
      }
      toast.success(`${successCount} insident berhasil diimport`);
      refetch();
    } catch (error) {
      toast.error("Gagal mengimport file");
      if (import.meta.env.DEV) console.error("Import error:", error);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [addTicket, refetch]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "On Progress": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">On Progress</Badge>;
      case "Critical": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Critical</Badge>;
      case "Resolved": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Resolved</Badge>;
      case "Pending": return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">Pending</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Memuat data insident...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">On Progress</p>
                <p className="text-lg font-bold text-blue-400">{stats.onProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-lg font-bold text-red-400">{stats.critical}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-lg font-bold text-green-400">{stats.resolved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-lg font-bold text-yellow-400">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Resolusi</p>
                <p className="text-lg font-bold">{stats.avgResolution}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-delete Info */}
      <Card className="bg-muted/20 border-dashed">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Trash2 className="h-4 w-4" />
            <span>
              <strong>Auto-delete:</strong> Insident berstatus <Badge variant="outline" className="text-xs mx-1">Resolved</Badge> 
              otomatis dihapus <strong>8 jam</strong> setelah waktu penyelesaian.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s === "All" ? "Semua Status" : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleImportFile}
          className="hidden"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isImporting}>
              <FileDown className="h-3.5 w-3.5 mr-1.5" />
              {isImporting ? "Importing..." : "Export / Import"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="bg-popover border shadow-lg z-50">
            <DropdownMenuItem onClick={handleExportExcel} disabled={filteredTickets.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel / CSV
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Import Excel / CSV
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        <Button
          variant="destructive"
          size="sm"
          onClick={openDeleteSelected}
          disabled={selectedIds.size === 0}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Hapus Terpilih ({selectedIds.size})
        </Button>

        <Button variant="destructive" size="sm" onClick={openDeleteByStatus}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Hapus per Status
        </Button>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[55vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredTickets.length > 0 && selectedIds.size === filteredTickets.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs">No</TableHead>
                  <TableHead className="text-xs">Ticket ID</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Kendala</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Create by</TableHead>
                  <TableHead className="text-xs">Dibuat</TableHead>
                  <TableHead className="text-xs">Auto-Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Tidak ada insident ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.slice(0, 200).map((ticket, idx) => (
                    <TableRow key={ticket.id} className={selectedIds.has(ticket.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(ticket.id)}
                          onCheckedChange={() => toggleSelect(ticket.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-mono">{ticket.id}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate">{ticket.customerName}</TableCell>
                      <TableCell className="text-xs">{ticket.constraint}</TableCell>
                      <TableCell>{statusBadge(ticket.status)}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{ticket.createdByName || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ticket.createdAt}</TableCell>
                      <TableCell className="text-xs">
                        {ticket.status === "Resolved" && ticket.resolvedAt ? (
                          <span className="text-orange-400 font-medium">{getTimeRemaining(ticket.resolvedAt)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredTickets.length > 200 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Menampilkan 200 dari {filteredTickets.length} insident
            </p>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Konfirmasi Hapus Insident
            </DialogTitle>
            <DialogDescription className="space-y-3">
              {deleteTarget === "selected" ? (
                <p>
                  Anda akan menghapus <strong>{deleteCount}</strong> insident yang dipilih secara permanen.
                </p>
              ) : (
                <div className="space-y-3">
                  <p>Hapus semua insident berdasarkan status:</p>
                  <Select value={deleteStatusFilter} onValueChange={setDeleteStatusFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Resolved">Resolved ({stats.resolved})</SelectItem>
                      <SelectItem value="Critical">Critical ({stats.critical})</SelectItem>
                      <SelectItem value="On Progress">On Progress ({stats.onProgress})</SelectItem>
                      <SelectItem value="Pending">Pending ({stats.pending})</SelectItem>
                    </SelectContent>
                  </Select>
                  <p>
                    Total <strong>{deleteCount}</strong> insident akan dihapus permanen.
                  </p>
                </div>
              )}
              <p className="font-medium text-destructive">Tindakan ini tidak dapat dibatalkan!</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting || deleteCount === 0}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                `Ya, Hapus ${deleteCount} Insident`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
