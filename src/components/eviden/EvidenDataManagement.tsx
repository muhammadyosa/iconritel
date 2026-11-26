import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Eye, Loader2, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { deleteEvidenSelection, fetchEvidenManagement, useEvidenManagement, type ManagementFilters, type ManagementRow } from "@/hooks/useEvidenManagement";
import { EVIDEN_STATUSES, type EvidenStatus } from "@/lib/eviden";
import { selectFilteredIds, toggleEvaluationSelection, visiblePageSelection } from "@/lib/evidenManagement";
import { EvaluationDetail } from "./EvaluationDetail";
import { StatusBadge } from "./StatusBadge";

const initialFilters: ManagementFilters = { search: "", status: "", team: "", from: "", to: "", sort: "created_at", direction: "desc", page: 1, size: 25 };
const fmt = (date?: string | null) => date ? `${new Date(date).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" })} WIB` : "—";
type Deletion = { ids: string[]; count: number } | { batch_id: string; count: number };

export function EvidenDataManagement() {
  const { isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Deletion | null>(null);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const lock = useRef(false);
  const selectionVersion = useRef(0);
  const query = useEvidenManagement(filters);
  const data = query.data;
  const rows = data?.rows ?? [];
  const invalidDates = !!(filters.from && filters.to && filters.from > filters.to);
  const disabled = busy || selecting || query.isFetching || invalidDates;
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / filters.size));
  const pendingCount = (data?.pending ?? []).reduce((sum, p) => sum + p.count, 0);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => ({ ...f, search, page: 1 })), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (data && filters.page > pages) setFilters((f) => ({ ...f, page: pages }));
  }, [data, filters.page, pages]);

  const update = (patch: Partial<ManagementFilters>) => {
    selectionVersion.current++;
    setSelected(new Set());
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
  };
  const allFiltered = async () => {
    const version = selectionVersion.current;
    setSelecting(true);
    try {
      const result = await fetchEvidenManagement(filters, true);
      if (version === selectionVersion.current) setSelected(selectFilteredIds(result.ids));
    } catch { toast.error("Gagal memilih hasil filter. Coba lagi."); }
    finally { setSelecting(false); }
  };
  const togglePage = () => {
    const all = visiblePageSelection(selected, rows) === true;
    const next = new Set(selected);
    rows.forEach((r) => { if (all) next.delete(r.id); else next.add(r.id); });
    setSelected(next);
  };
  const performDelete = async () => {
    if (!confirm || lock.current || !isAdmin) return;
    lock.current = true; setBusy(true);
    try {
      const input = "batch_id" in confirm ? { batch_id: confirm.batch_id } : { ids: confirm.ids };
      const result = await deleteEvidenSelection(input);
      toast.success(`${result.count} evaluasi dan seluruh data terkait berhasil dihapus`);
      setSelected(new Set()); setConfirm(null); setDetail(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Penghapusan gagal"); }
    finally {
      lock.current = false; setBusy(false);
      await Promise.all(["eviden-management", "eviden-list", "eviden-detail", "eviden-notifications"].map((key) => qc.invalidateQueries({ queryKey: [key] })));
    }
  };
  const sortHeader = (key: string, label: string) => <Button variant="ghost" size="sm" className="h-8 px-0 text-xs gap-1" onClick={() => setFilters((f) => ({ ...f, sort: key, direction: f.sort === key && f.direction === "asc" ? "desc" : "asc", page: 1 }))} disabled={busy}>
    {label}{filters.sort === key && (filters.direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
  </Button>;
  const status = (r: ManagementRow) => r.status === "DRAFT" ? <Badge variant="outline">DRAFT</Badge> : <StatusBadge status={r.status as EvidenStatus} />;
  const actions = (r: ManagementRow) => <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Buka ${r.code}`} title="Buka detail" onClick={() => setDetail(r.id)} disabled={busy}><Eye className="h-4 w-4" /></Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Hapus ${r.code}`} title={r.deletion_batch_id ? "Penghapusan tertunda" : "Hapus evaluasi"} disabled={disabled || !!r.deletion_batch_id} onClick={() => setConfirm({ ids: [r.id], count: 1 })}><Trash2 className="h-4 w-4" /></Button>
  </div>;
  const audit = useMemo(() => (data?.audit ?? []).map((a) => {
    try { return { ...a, info: JSON.parse(a.detail) as { admin_name?: string; completed_by_name?: string; count: number; ids: string[]; completed_at?: string } }; }
    catch { return null; }
  }).filter((a) => a !== null), [data?.audit]);

  if (!isAdmin) return null;
  return <section className="space-y-4 min-w-0" aria-label="Data Management Eviden NOC">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
      <div><h2 className="text-base font-semibold">🔍 Eviden NOC</h2><div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground"><span>{data?.total ?? 0} hasil filter</span><span>{selected.size} dipilih</span>{pendingCount > 0 && <span className="text-warning">{pendingCount} penghapusan tertunda</span>}</div></div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy || query.isFetching} onClick={() => query.refetch()}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${query.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
        <Button size="sm" variant="destructive" disabled={disabled || selected.size === 0} onClick={() => setConfirm({ ids: [...selected], count: selected.size })}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Delete Selected ({selected.size})</Button>
      </div>
    </div>
    <fieldset disabled={busy || selecting} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <div className="space-y-1.5"><Label className="text-xs" htmlFor="eviden-search">Pencarian</Label><div className="relative"><Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" /><Input id="eviden-search" value={search} className="pl-8" placeholder="ID, pengirim, penerima, problem" onChange={(e) => { selectionVersion.current++; setSelected(new Set()); setSearch(e.target.value); }} /></div></div>
      <div className="space-y-1.5"><Label className="text-xs">Status</Label><Select value={filters.status || "all"} onValueChange={(v) => update({ status: v === "all" ? "" : v })} disabled={busy || selecting}><SelectTrigger aria-label="Filter status evaluasi"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{["DRAFT", ...EVIDEN_STATUSES].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label className="text-xs">Tim</Label><Select value={filters.team || "all"} onValueChange={(v) => update({ team: v === "all" ? "" : v })} disabled={busy || selecting}><SelectTrigger aria-label="Filter tim evaluasi"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua tim</SelectItem>{data?.teams.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1.5"><Label className="text-xs" htmlFor="eviden-from">Tanggal mulai (WIB)</Label><Input id="eviden-from" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} /></div>
      <div className="space-y-1.5"><Label className="text-xs" htmlFor="eviden-to">Tanggal akhir (WIB)</Label><Input id="eviden-to" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} /></div>
    </fieldset>
    {invalidDates && <p role="alert" className="text-xs text-destructive">Tanggal akhir harus sama atau setelah tanggal mulai.</p>}
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={allFiltered} disabled={disabled || search !== filters.search || !data?.total}>{selecting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}Select All hasil filter ({data?.total ?? 0})</Button>
      <Button variant="ghost" size="sm" disabled={busy || selecting || !selected.size} onClick={() => setSelected(new Set())}>Batal pilih</Button>
      <Button variant="ghost" size="sm" disabled={busy || selecting} onClick={() => { selectionVersion.current++; setSearch(""); setFilters(initialFilters); setSelected(new Set()); }}>Reset filter</Button>
      <Select value={`${filters.sort}:${filters.direction}`} onValueChange={(v) => { const [sort, direction] = v.split(":"); setFilters((f) => ({ ...f, sort, direction, page: 1 })); }} disabled={busy}><SelectTrigger className="w-full sm:w-48 sm:ml-auto" aria-label="Urutan evaluasi"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="created_at:desc">Tanggal terbaru</SelectItem><SelectItem value="created_at:asc">Tanggal terlama</SelectItem><SelectItem value="answered_at:desc">Jawaban terbaru</SelectItem><SelectItem value="code:asc">ID A–Z</SelectItem><SelectItem value="status:asc">Status A–Z</SelectItem></SelectContent></Select>
    </div>
    {data?.pending.map((p) => <div key={p.batch_id} className="flex flex-wrap justify-between items-center gap-2 border border-warning/30 bg-warning/10 rounded-md p-3 text-xs"><span>{p.count} evaluasi menunggu penyelesaian penghapusan · {fmt(p.created_at)}</span><Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ batch_id: p.batch_id, count: p.count })}>Lanjutkan penghapusan</Button></div>)}
    {query.isError && <div role="alert" className="text-sm text-destructive py-3">Gagal memuat evaluasi. <Button size="sm" variant="outline" onClick={() => query.refetch()}>Coba lagi</Button></div>}
    {query.isLoading && <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat evaluasi…</div>}
    {!query.isLoading && !query.isError && !rows.length && <p className="text-center py-10 text-sm text-muted-foreground">Tidak ada evaluasi yang sesuai filter.</p>}
    {!!rows.length && <>
      <div className="hidden lg:block overflow-x-auto border-y border-border">
        <Table className="text-xs"><TableHeader><TableRow><TableHead className="w-10"><Checkbox aria-label="Pilih halaman ini" checked={visiblePageSelection(selected, rows)} onCheckedChange={togglePage} disabled={disabled} /></TableHead><TableHead>{sortHeader("code", "ID")}</TableHead><TableHead>{sortHeader("created_at", "Tanggal")}</TableHead><TableHead>{sortHeader("sender_name", "Pengirim")}</TableHead><TableHead>{sortHeader("recipient_name", "Penerima")}</TableHead><TableHead>{sortHeader("recipient_team", "Tim")}</TableHead><TableHead>{sortHeader("problem", "Problem")}</TableHead><TableHead>{sortHeader("status", "Status")}</TableHead><TableHead>{sortHeader("answered_at", "Tanggal jawaban")}</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>{rows.map((r) => <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}><TableCell><Checkbox aria-label={`Pilih ${r.code}`} checked={selected.has(r.id)} onCheckedChange={() => setSelected(toggleEvaluationSelection(selected, r.id))} disabled={disabled} /></TableCell><TableCell className="font-medium whitespace-nowrap" title={r.id}>{r.code}</TableCell><TableCell className="min-w-32">{fmt(r.created_at)}</TableCell><TableCell className="min-w-28">{r.sender_name || "—"}</TableCell><TableCell className="min-w-28">{r.recipient_name || "—"}</TableCell><TableCell>{r.recipient_team || "—"}</TableCell><TableCell className="max-w-64"><p className="line-clamp-3 break-words" title={r.problem}>{r.problem}</p></TableCell><TableCell>{status(r)}{r.deletion_batch_id && <p className="text-warning mt-1">Penghapusan tertunda</p>}</TableCell><TableCell className="min-w-32">{fmt(r.answered_at)}</TableCell><TableCell>{actions(r)}</TableCell></TableRow>)}</TableBody></Table>
      </div>
      <div className="lg:hidden space-y-2">{rows.map((r) => <article key={r.id} className="border border-border rounded-md p-3 space-y-2"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><Checkbox aria-label={`Pilih ${r.code}`} checked={selected.has(r.id)} disabled={disabled} onCheckedChange={() => setSelected(toggleEvaluationSelection(selected, r.id))} /><span className="text-xs font-semibold" title={r.id}>{r.code}</span></div>{actions(r)}</div><div className="flex flex-wrap gap-2 items-center">{status(r)}<Badge variant="outline">{r.recipient_team || "—"}</Badge>{r.deletion_batch_id && <span className="text-warning text-xs">Penghapusan tertunda</span>}</div><dl className="grid grid-cols-2 gap-2 text-xs"><div><dt className="text-muted-foreground">Pengirim</dt><dd className="break-words">{r.sender_name || "—"}</dd></div><div><dt className="text-muted-foreground">Penerima</dt><dd className="break-words">{r.recipient_name || "—"}</dd></div><div><dt className="text-muted-foreground">Tanggal</dt><dd>{fmt(r.created_at)}</dd></div><div><dt className="text-muted-foreground">Tanggal jawaban</dt><dd>{fmt(r.answered_at)}</dd></div></dl><p className="text-xs line-clamp-3 break-words">{r.problem}</p></article>)}</div>
    </>}
    <div className="flex flex-wrap justify-between items-center gap-2 text-xs text-muted-foreground">
      <span>Halaman {filters.page} dari {pages} · {data?.total ?? 0} evaluasi</span><div className="flex items-center gap-2"><Select value={String(filters.size)} onValueChange={(v) => setFilters((f) => ({ ...f, size: Number(v), page: 1 }))} disabled={busy}><SelectTrigger className="w-20 h-8" aria-label="Jumlah per halaman"><SelectValue /></SelectTrigger><SelectContent>{[10, 25, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent></Select><Button variant="outline" size="icon" className="h-8 w-8" title="Halaman sebelumnya" aria-label="Halaman sebelumnya" disabled={disabled || filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" title="Halaman berikutnya" aria-label="Halaman berikutnya" disabled={disabled || filters.page >= pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}><ChevronRight className="h-4 w-4" /></Button></div>
    </div>
    <details className="border-t border-border pt-3 text-xs"><summary className="cursor-pointer font-medium">Riwayat penghapusan ({audit.length})</summary><div className="mt-3 space-y-3">{!audit.length && <p className="text-muted-foreground">Belum ada penghapusan.</p>}{audit.map((a) => <details key={a.id} className="border-b border-border pb-2"><summary className="cursor-pointer break-words">{a.action === "EVIDEN DELETE COMPLETED" ? "Selesai" : "Tertunda"} · {a.info.completed_by_name || a.info.admin_name || a.user_id} · {a.info.count} evaluasi · {fmt(a.info.completed_at || a.created_at)}</summary><p className="text-muted-foreground mt-1 break-all">ID: {a.info.ids?.join(", ")}</p></details>)}</div></details>
    <EvaluationDetail id={detail} onClose={() => setDetail(null)} readOnly />
    <Dialog open={!!confirm} onOpenChange={(open) => { if (!open && !busy) setConfirm(null); }}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Hapus permanen {confirm?.count ?? 0} evaluasi?</DialogTitle><DialogDescription>Seluruh jawaban, riwayat revisi, foto eviden, notifikasi, dan activity log evaluasi terpilih akan dihapus. Evaluasi lain tidak terpengaruh. Tindakan ini tidak dapat dibatalkan; catatan penghapusan Admin tetap disimpan.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={busy} onClick={() => setConfirm(null)}>Batal</Button><Button variant="destructive" disabled={busy} onClick={performDelete}>{busy && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}{busy ? "Menghapus foto dan evaluasi…" : `Hapus permanen (${confirm?.count ?? 0})`}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}