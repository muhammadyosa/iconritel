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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "@/hooks/useActivityLog";
import { cn } from "@/lib/utils";

import { subDays, startOfDay } from "date-fns";

interface UserHistoryRow {
  id: string;
  date: string;
  user_name: string;
  user_id: string | null;
  total_created: number;
  total_resolved: number;
  created_at: string;
}

type PeriodFilter = "7d" | "14d" | "30d";

export function TeamNOCManagement() {
  const { logActivity } = useActivityLog();
  const [data, setData] = useState<UserHistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>("30d");

  const periodDays = period === "7d" ? 7 : period === "14d" ? 14 : 30;

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

  const filteredData = useMemo(() => {
    const cutoff = startOfDay(subDays(new Date(), periodDays)).toISOString().split("T")[0];
    return data.filter(row => row.date >= cutoff);
  }, [data, periodDays]);

  const userSummary = useMemo(() => {
    const map: Record<string, { name: string; total_created: number; total_resolved: number; days: number }> = {};
    filteredData.forEach((row) => {
      const key = row.user_id || row.user_name.trim().toLowerCase();
      if (!map[key]) {
        map[key] = {
          name: row.user_name,
          total_created: 0,
          total_resolved: 0,
          days: 0,
        };
      }

      map[key].name = row.user_name || map[key].name;
      map[key].total_created += row.total_created;
      map[key].total_resolved += row.total_resolved;
      map[key].days++;
    });
    return Object.values(map)
      .map((s) => ({
        name: s.name,
        total_created: s.total_created,
        total_resolved: Math.min(s.total_resolved, s.total_created),
        days: s.days,
      }))
      .sort((a, b) => b.total_created - a.total_created);
  }, [filteredData]);

  const totals = useMemo(() => ({
    users: userSummary.length,
    records: filteredData.length,
    created: userSummary.reduce((s, u) => s + u.total_created, 0),
    resolved: userSummary.reduce((s, u) => s + u.total_resolved, 0),
  }), [userSummary, filteredData]);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
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
    if (filteredData.length === 0) return toast.error("Tidak ada data untuk diexport");
    const ws = XLSX.utils.json_to_sheet(filteredData.map(r => ({
      Tanggal: r.date,
      "Nama User": r.user_name,
      "Total Created": r.total_created,
      "Total Resolved": r.total_resolved,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "User History");
    XLSX.writeFile(wb, `ranking_user_noc_${period}_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Data berhasil diexport");
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-2">
        <CardHeader>
          <CardTitle className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
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
            </div>
            {/* Period Filter */}
            <div className="flex items-center gap-1.5">
              {(["7d", "14d", "30d"] as const).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? "default" : "outline"}
                  className="h-7 text-[11px] px-3"
                  onClick={() => setPeriod(p)}
                >
                  {p === "7d" ? "7 Hari" : p === "14d" ? "14 Hari" : "30 Hari"}
                </Button>
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {totals.created} incident • {totals.resolved} resolved
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <div className="text-2xl font-bold text-primary">{totals.users}</div>
              <div className="text-xs text-muted-foreground">Total User</div>
            </div>
            <div className="p-3 rounded-lg bg-accent/10 text-center">
              <div className="text-2xl font-bold">{totals.records}</div>
              <div className="text-xs text-muted-foreground">Total Records</div>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <div className="text-2xl font-bold text-success">{totals.created}</div>
              <div className="text-xs text-muted-foreground">Total Created</div>
            </div>
            <div className="p-3 rounded-lg bg-warning/10 text-center">
              <div className="text-2xl font-bold text-warning">{totals.resolved}</div>
              <div className="text-xs text-muted-foreground">Total Resolved</div>
            </div>
          </div>

          <ScrollArea className={userSummary.length > 10 ? "h-[400px]" : ""}>
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="text-xs w-8">#</TableHead>
                  <TableHead className="text-xs">Nama User</TableHead>
                  <TableHead className="text-xs text-center">Total Created</TableHead>
                  <TableHead className="text-xs text-center">Total Resolved</TableHead>
                  <TableHead className="text-xs text-center">Progress</TableHead>
                  <TableHead className="text-xs text-center">Hari Aktif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Belum ada data history dalam {periodDays} hari terakhir
                    </TableCell>
                  </TableRow>
                ) : userSummary.map((u, i) => {
                  const rate = u.total_created > 0 ? Math.round((u.total_resolved / u.total_created) * 100) : 0;
                  return (
                    <TableRow key={u.name}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{u.name}</TableCell>
                      <TableCell className="text-center text-sm font-bold">{u.total_created}</TableCell>
                      <TableCell className="text-center text-sm font-bold text-success">{u.total_resolved}</TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <Progress value={rate} className="h-2 flex-1" />
                          <span className={cn("text-[10px] font-bold min-w-[32px] text-right", rate >= 70 ? "text-success" : rate >= 40 ? "text-warning" : "text-destructive")}>{rate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">{u.days}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

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