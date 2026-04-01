import { useState, useEffect, useMemo, useCallback } from "react";
import { Trash2, RefreshCw, Users, Trophy, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import * as XLSX from "xlsx";

interface UserHistoryRow {
  id: string;
  date: string;
  user_name: string;
  user_id: string | null;
  total_created: number;
  total_resolved: number;
  created_at: string;
}

export function TeamNOCManagement() {
  const { logActivity } = useActivityLog();
  const [data, setData] = useState<UserHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from("daily_user_ticket_history")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      setData((rows || []) as UserHistoryRow[]);
    } catch (err) {
      toast.error("Gagal memuat data history user");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const userSummary = useMemo(() => {
    const map: Record<string, { total_created: number; total_resolved: number; days: number }> = {};
    data.forEach((row) => {
      if (!map[row.user_name]) map[row.user_name] = { total_created: 0, total_resolved: 0, days: 0 };
      map[row.user_name].total_created += row.total_created;
      map[row.user_name].total_resolved += row.total_resolved;
      map[row.user_name].days++;
    });
    return Object.entries(map)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.total_created - a.total_created);
  }, [data]);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      // Delete all records (admin only via RLS)
      const { error } = await supabase
        .from("daily_user_ticket_history")
        .delete()
        .gte("date", "2000-01-01");
      if (error) throw error;
      setData([]);
      toast.success("Data history user NOC berhasil dihapus");
      logActivity("delete_user_history", "Menghapus semua data history ranking user NOC");
    } catch (err) {
      toast.error("Gagal menghapus data");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) return toast.error("Tidak ada data untuk diexport");
    const ws = XLSX.utils.json_to_sheet(data.map(r => ({
      Tanggal: r.date,
      "Nama User": r.user_name,
      "Total Created": r.total_created,
      "Total Resolved": r.total_resolved,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User History");
    XLSX.writeFile(wb, `ranking_user_noc_history_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Data berhasil diexport");
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Ranking User NOC - Data History
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={fetchData} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Hapus Semua
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <div className="text-2xl font-bold text-primary">{userSummary.length}</div>
              <div className="text-xs text-muted-foreground">Total User</div>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 text-center">
              <div className="text-2xl font-bold">{data.length}</div>
              <div className="text-xs text-muted-foreground">Total Records</div>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <div className="text-2xl font-bold text-success">{userSummary.reduce((s, u) => s + u.total_created, 0)}</div>
              <div className="text-xs text-muted-foreground">Total Created</div>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 text-center">
              <div className="text-2xl font-bold text-warning">{userSummary.reduce((s, u) => s + u.total_resolved, 0)}</div>
              <div className="text-xs text-muted-foreground">Total Resolved</div>
            </div>
          </div>

          {/* User Summary Table */}
          <ScrollArea className={userSummary.length > 10 ? "h-[400px]" : ""}>
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Nama User</TableHead>
                  <TableHead className="text-xs text-center">Total Created</TableHead>
                  <TableHead className="text-xs text-center">Total Resolved</TableHead>
                  <TableHead className="text-xs text-center">Hari Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      Belum ada data history
                    </TableCell>
                  </TableRow>
                ) : userSummary.map((u, i) => (
                  <TableRow key={u.name}>
                    <TableCell className="text-xs">{i + 1}</TableCell>
                    <TableCell className="text-sm font-medium">{u.name}</TableCell>
                    <TableCell className="text-center text-sm font-bold">{u.total_created}</TableCell>
                    <TableCell className="text-center text-sm font-bold text-success">{u.total_resolved}</TableCell>
                    <TableCell className="text-center text-sm">{u.days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Hapus Semua Data History
            </DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus semua data history ranking user NOC? Data ini digunakan untuk menghitung total incident per user di halaman Team.
              <br /><br />
              <strong className="text-destructive">Tindakan ini tidak dapat dibatalkan!</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isDeleting}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteAll} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Ya, Hapus Semua"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
