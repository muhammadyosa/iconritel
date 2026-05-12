import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DayRow = {
  date: string;
  truthTotal: number;
  truthCreated: number;
  truthResolved: number;
  truthUsers: number;
  dailyTotal: number;
  dailyCreated: number;
  dailyResolved: number;
  userRows: number;
  userResolvedSum: number;
};

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

export default function AuditHistory() {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<DayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  const startStr = useMemo(() => ymd(year, month, 1), [year, month]);
  const daysInMonth = useMemo(() => new Date(year, month + 1, 0).getDate(), [year, month]);
  const endStr = useMemo(() => ymd(year, month, daysInMonth), [year, month, daysInMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Source of truth: ticket_status_history (paginated)
      const truthByDate = new Map<string, { total: Set<string>; created: number; resolved: Set<string>; users: Set<string> }>();
      const startISO = `${startStr}T00:00:00+07:00`;
      // end-exclusive: next day after endStr
      const endDate = new Date(year, month, daysInMonth + 1);
      const endISO = `${ymd(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())}T00:00:00+07:00`;

      const PAGE = 1000;
      let from = 0;
      // safety cap to avoid infinite loops
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase
          .from("ticket_status_history")
          .select("ticket_id, created_at, old_status, new_status, changed_by_user_id")
          .gte("created_at", startISO)
          .lt("created_at", endISO)
          .order("created_at", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;

        for (const ev of data) {
          // Convert created_at to WIB date string
          const d = new Date(ev.created_at as string);
          // shift to WIB by adding 7h then take UTC date parts
          const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
          const dateStr = `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`;
          let bucket = truthByDate.get(dateStr);
          if (!bucket) {
            bucket = { total: new Set(), created: 0, resolved: new Set(), users: new Set() };
            truthByDate.set(dateStr, bucket);
          }
          bucket.total.add(ev.ticket_id as string);
          if (ev.old_status === null) bucket.created += 1;
          if (ev.new_status === "Resolved") bucket.resolved.add(ev.ticket_id as string);
          if (ev.changed_by_user_id) bucket.users.add(ev.changed_by_user_id as string);
        }
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const { data: dailyData, error: e2 } = await supabase
        .from("daily_ticket_history")
        .select("date, total, created, resolved")
        .gte("date", startStr)
        .lte("date", endStr);
      if (e2) throw e2;

      const { data: userDaily, error: e3 } = await supabase
        .from("daily_user_ticket_history")
        .select("date, user_id, total_resolved")
        .gte("date", startStr)
        .lte("date", endStr);
      if (e3) throw e3;

      const dailyMap = new Map<string, { total: number; created: number; resolved: number }>();
      (dailyData || []).forEach((r: any) => dailyMap.set(r.date, { total: r.total, created: r.created, resolved: r.resolved }));

      const userMap = new Map<string, { count: number; resolvedSum: number }>();
      (userDaily || []).forEach((r: any) => {
        const cur = userMap.get(r.date) || { count: 0, resolvedSum: 0 };
        cur.count += 1;
        cur.resolvedSum += r.total_resolved || 0;
        userMap.set(r.date, cur);
      });

      const out: DayRow[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = ymd(year, month, day);
        const t = truthByDate.get(dateStr);
        const d = dailyMap.get(dateStr);
        const u = userMap.get(dateStr);
        out.push({
          date: dateStr,
          truthTotal: t ? t.total.size : 0,
          truthCreated: t ? t.created : 0,
          truthResolved: t ? t.resolved.size : 0,
          truthUsers: t ? t.users.size : 0,
          dailyTotal: d?.total ?? 0,
          dailyCreated: d?.created ?? 0,
          dailyResolved: d?.resolved ?? 0,
          userRows: u?.count ?? 0,
          userResolvedSum: u?.resolvedSum ?? 0,
        });
      }
      setRows(out);
    } catch (err: any) {
      toast.error("Gagal memuat audit", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [year, month, daysInMonth, startStr, endStr]);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  const recompute = async () => {
    setRecomputing(true);
    try {
      const { data, error } = await supabase.rpc("recompute_daily_history", {
        start_date: startStr,
        end_date: endStr,
      });
      if (error) throw error;
      toast.success("Backfill selesai", { description: JSON.stringify(data) });
      await load();
    } catch (err: any) {
      toast.error("Gagal recompute", { description: err.message });
    } finally {
      setRecomputing(false);
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!isAdmin) {
    return <div className="p-6 text-center text-muted-foreground">Hanya admin yang dapat mengakses halaman audit.</div>;
  }

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());

  const okCount = rows.filter(r => r.truthTotal > 0 && r.truthTotal === r.dailyTotal && r.truthResolved === r.dailyResolved).length;
  const emptyCount = rows.filter(r => r.dailyTotal === 0 && r.truthTotal === 0).length;
  const mismatchCount = rows.length - okCount - emptyCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">🧾 Audit Daily History</h1>
          <p className="text-xs text-muted-foreground">
            Membandingkan agregat dari <code>ticket_status_history</code> (sumber kebenaran) terhadap Daily Incident & Daily User History.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="h-9 rounded-md border bg-background px-2 text-sm" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 4 }, (_, i) => now.getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Muat Ulang
          </Button>
          <Button size="sm" onClick={recompute} disabled={recomputing}>
            {recomputing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : "🛠"} Recompute Bulan Ini
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">✅ Cocok</div>
          <div className="text-2xl font-bold text-green-600">{okCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">⚠️ Tidak cocok / kurang</div>
          <div className="text-2xl font-bold text-amber-600">{mismatchCount}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">⬜ Tanpa data</div>
          <div className="text-2xl font-bold text-muted-foreground">{emptyCount}</div>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Truth Total</TableHead>
              <TableHead className="text-right">Daily Total</TableHead>
              <TableHead className="text-right">Truth Resolved</TableHead>
              <TableHead className="text-right">Daily Resolved</TableHead>
              <TableHead className="text-right">Truth Users</TableHead>
              <TableHead className="text-right">User Rows</TableHead>
              <TableHead className="text-right">User Resolved Σ</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const isFuture = !isCurrentMonth ? false : r.date > todayStr;
              const empty = r.truthTotal === 0 && r.dailyTotal === 0;
              const mismatch = !empty && (r.truthTotal !== r.dailyTotal || r.truthResolved !== r.dailyResolved || r.truthUsers !== r.userRows);
              return (
                <TableRow key={r.date} className={mismatch ? "bg-amber-50 dark:bg-amber-900/20" : empty && !isFuture ? "bg-muted/40" : ""}>
                  <TableCell className="font-mono text-xs">{r.date}</TableCell>
                  <TableCell className="text-right">{r.truthTotal}</TableCell>
                  <TableCell className={`text-right ${r.dailyTotal !== r.truthTotal ? "text-amber-600 font-semibold" : ""}`}>{r.dailyTotal}</TableCell>
                  <TableCell className="text-right">{r.truthResolved}</TableCell>
                  <TableCell className={`text-right ${r.dailyResolved !== r.truthResolved ? "text-amber-600 font-semibold" : ""}`}>{r.dailyResolved}</TableCell>
                  <TableCell className="text-right">{r.truthUsers}</TableCell>
                  <TableCell className={`text-right ${r.userRows !== r.truthUsers ? "text-amber-600 font-semibold" : ""}`}>{r.userRows}</TableCell>
                  <TableCell className="text-right">{r.userResolvedSum}</TableCell>
                  <TableCell>
                    {isFuture ? (
                      <Badge variant="outline">—</Badge>
                    ) : empty ? (
                      <Badge variant="secondary">Kosong</Badge>
                    ) : mismatch ? (
                      <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Tidak cocok</Badge>
                    ) : (
                      <Badge className="bg-green-600 hover:bg-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <p className="text-[11px] text-muted-foreground">
        Backfill otomatis berjalan setiap malam pukul 00:15 WIB dan merekap 35 hari terakhir. Tombol <strong>Recompute Bulan Ini</strong> menjalankan ulang manual untuk bulan yang sedang dipilih.
      </p>
    </div>
  );
}
