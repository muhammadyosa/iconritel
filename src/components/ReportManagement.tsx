import { useState, useMemo } from "react";
import { Trash2, RefreshCw, Loader2, Calendar, Clock, User, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { toast } from "sonner";
import { useCloudShiftReports } from "@/hooks/useCloudShiftReports";

const SHIFT_FILTER_OPTIONS = ["All", "pagi", "siang", "malam"] as const;

const shiftLabel = (shift: string) => {
  switch (shift) {
    case "pagi": return "🌅 Pagi";
    case "siang": return "☀️ Siang";
    case "malam": return "🌙 Malam";
    default: return shift;
  }
};

const shiftBadge = (shift: string) => {
  switch (shift) {
    case "pagi":
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">🌅 Pagi</Badge>;
    case "siang":
      return <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-xs">☀️ Siang</Badge>;
    case "malam":
      return <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-xs">🌙 Malam</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{shift}</Badge>;
  }
};

export function ReportManagement() {
  const { reports, isLoading, fetchReports, deleteReport, deleteAllReports } = useCloudShiftReports();
  const [shiftFilter, setShiftFilter] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<"selected" | "shift" | "all">("selected");
  const [deleteShiftFilter, setDeleteShiftFilter] = useState<string>("pagi");

  const filteredReports = useMemo(() => {
    if (shiftFilter === "All") return reports;
    return reports.filter((r) => r.shift === shiftFilter);
  }, [reports, shiftFilter]);

  // Stats
  const stats = useMemo(() => {
    const total = reports.length;
    const pagi = reports.filter((r) => r.shift === "pagi").length;
    const siang = reports.filter((r) => r.shift === "siang").length;
    const malam = reports.filter((r) => r.shift === "malam").length;

    // Count reports with incidents
    const withIncidents = reports.filter(
      (r) => r.olt_down || r.port_down || r.fat_loss || r.issues
    ).length;

    // Unique dates
    const uniqueDates = new Set(reports.map((r) => r.date)).size;

    return { total, pagi, siang, malam, withIncidents, uniqueDates };
  }, [reports]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredReports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReports.map((r) => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      if (deleteTarget === "all") {
        const success = await deleteAllReports();
        if (success) {
          setSelectedIds(new Set());
          setShowDeleteDialog(false);
        }
        return;
      }

      let idsToDelete: string[] = [];
      if (deleteTarget === "selected") {
        idsToDelete = Array.from(selectedIds);
      } else {
        idsToDelete = reports
          .filter((r) => r.shift === deleteShiftFilter)
          .map((r) => r.id);
      }

      if (idsToDelete.length === 0) {
        toast.info("Tidak ada report untuk dihapus");
        return;
      }

      let successCount = 0;
      for (const id of idsToDelete) {
        const success = await deleteReport(id);
        if (success) successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} report shift berhasil dihapus`);
      }
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
    } catch (error) {
      toast.error("Gagal menghapus report");
      if (import.meta.env.DEV) console.error("Bulk delete error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteSelected = () => {
    if (selectedIds.size === 0) {
      toast.info("Pilih report yang ingin dihapus terlebih dahulu");
      return;
    }
    setDeleteTarget("selected");
    setShowDeleteDialog(true);
  };

  const openDeleteByShift = () => {
    setDeleteTarget("shift");
    setShowDeleteDialog(true);
  };

  const openDeleteAll = () => {
    setDeleteTarget("all");
    setShowDeleteDialog(true);
  };

  const deleteCount =
    deleteTarget === "selected"
      ? selectedIds.size
      : deleteTarget === "all"
      ? reports.length
      : reports.filter((r) => r.shift === deleteShiftFilter).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Memuat data report shift...</span>
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
              <FileText className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Report</p>
                <p className="text-lg font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌅</span>
              <div>
                <p className="text-xs text-muted-foreground">Pagi</p>
                <p className="text-lg font-bold text-amber-400">{stats.pagi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-sky-500/10 border-sky-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">☀️</span>
              <div>
                <p className="text-xs text-muted-foreground">Siang</p>
                <p className="text-lg font-bold text-sky-400">{stats.siang}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-indigo-500/10 border-indigo-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🌙</span>
              <div>
                <p className="text-xs text-muted-foreground">Malam</p>
                <p className="text-lg font-bold text-indigo-400">{stats.malam}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <div>
                <p className="text-xs text-muted-foreground">Ada Insiden</p>
                <p className="text-lg font-bold text-destructive">{stats.withIncidents}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Hari Unik</p>
                <p className="text-lg font-bold">{stats.uniqueDates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={shiftFilter} onValueChange={setShiftFilter}>
          <SelectTrigger className="w-[160px] h-8 text-sm">
            <SelectValue placeholder="Filter Shift" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Semua Shift</SelectItem>
            <SelectItem value="pagi">🌅 Pagi</SelectItem>
            <SelectItem value="siang">☀️ Siang</SelectItem>
            <SelectItem value="malam">🌙 Malam</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={() => fetchReports()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>

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

        <Button variant="destructive" size="sm" onClick={openDeleteByShift}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Hapus per Shift
        </Button>

        <Button variant="destructive" size="sm" onClick={openDeleteAll}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Hapus Semua
        </Button>
      </div>

      {/* Reports Table */}
      <Card>
        <CardContent className="p-0">
          <div className="max-h-[55vh] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filteredReports.length > 0 && selectedIds.size === filteredReports.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs">No</TableHead>
                  <TableHead className="text-xs">Tanggal</TableHead>
                  <TableHead className="text-xs">Shift</TableHead>
                  <TableHead className="text-xs">Petugas</TableHead>
                  <TableHead className="text-xs">📟 OLT Down</TableHead>
                  <TableHead className="text-xs">🔌 Port Down</TableHead>
                  <TableHead className="text-xs">⛓️‍💥 FAT Loss</TableHead>
                  <TableHead className="text-xs">⚠️ Masalah</TableHead>
                  <TableHead className="text-xs">📝 Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Tidak ada report shift ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReports.slice(0, 200).map((report, idx) => (
                    <TableRow key={report.id} className={selectedIds.has(report.id) ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(report.id)}
                          onCheckedChange={() => toggleSelect(report.id)}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="text-xs font-medium">
                        {new Date(report.date).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{shiftBadge(report.shift)}</TableCell>
                      <TableCell className="text-xs max-w-[100px] truncate">{report.officer}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{report.olt_down || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{report.port_down || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{report.fat_loss || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{report.issues || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[120px] truncate">{report.notes || "—"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredReports.length > 200 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Menampilkan 200 dari {filteredReports.length} report
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
              Konfirmasi Hapus Report Shift
            </DialogTitle>
            <DialogDescription className="space-y-3">
              {deleteTarget === "selected" ? (
                <p>
                  Anda akan menghapus <strong>{deleteCount}</strong> report shift yang dipilih secara permanen.
                </p>
              ) : deleteTarget === "all" ? (
                <p>
                  Anda akan menghapus <strong>semua {deleteCount}</strong> report shift secara permanen.
                </p>
              ) : (
                <div className="space-y-3">
                  <p>Hapus semua report berdasarkan shift:</p>
                  <Select value={deleteShiftFilter} onValueChange={setDeleteShiftFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pagi">🌅 Pagi ({stats.pagi})</SelectItem>
                      <SelectItem value="siang">☀️ Siang ({stats.siang})</SelectItem>
                      <SelectItem value="malam">🌙 Malam ({stats.malam})</SelectItem>
                    </SelectContent>
                  </Select>
                  <p>
                    Total <strong>{deleteCount}</strong> report akan dihapus permanen.
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
                `Ya, Hapus ${deleteCount} Report`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
