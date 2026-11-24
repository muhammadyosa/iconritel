import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Search, ArrowUpDown, Inbox } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useEvidenList } from "@/hooks/useEviden";
import { EVIDEN_STATUSES, evidenStats, formatMinutes, responseMinutes, type EvidenListRow, type EvidenStatus } from "@/lib/eviden";
import { toLocalDateStr } from "@/lib/dateUtils";
import { EvaluationForm } from "@/components/eviden/EvaluationForm";
import { EvaluationDetail } from "@/components/eviden/EvaluationDetail";
import { StatusBadge } from "@/components/eviden/StatusBadge";

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-");
const PIE = ["hsl(var(--primary))", "hsl(var(--accent-foreground))", "hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-3">
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="h-48">{children}</div>
    </Card>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex flex-col items-center justify-center gap-1 py-10 text-xs text-muted-foreground"><Inbox className="h-6 w-6" />{text}</div>;
}

function DashboardView({ rows }: { rows: EvidenListRow[] }) {
  const s = useMemo(() => evidenStats(rows), [rows]);
  const statusData = EVIDEN_STATUSES.map((st) => ({ name: st, value: s.byStatus[st] })).filter((x) => x.value > 0);
  const respByTeam = useMemo(() => {
    const m = new Map<string, number[]>();
    rows.forEach((r) => { const t = responseMinutes(r); if (t != null) m.set(r.recipient_team || "-", [...(m.get(r.recipient_team || "-") ?? []), t]); });
    return [...m.entries()].map(([name, v]) => ({ name, minutes: Math.round(v.reduce((a, b) => a + b, 0) / v.length) }));
  }, [rows]);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        <Kpi label="Total Evaluation" value={s.total} />
        {EVIDEN_STATUSES.map((st) => <Kpi key={st} label={st} value={s.byStatus[st]} />)}
        <Kpi label="Pending Response" value={s.pending} />
      </div>
      {rows.length === 0 ? <Card><Empty text="Belum ada evaluasi" /></Card> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ChartCard title="Evaluation Trend">
            <ResponsiveContainer><LineChart data={s.trend}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="date" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} /><Tooltip /><Line type="monotone" dataKey="count" name="Evaluasi" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Evaluation by Team">
            <ResponsiveContainer><BarChart data={s.byTeam}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} /><Tooltip /><Bar dataKey="count" name="Evaluasi" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Status Distribution">
            <ResponsiveContainer><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70}>{statusData.map((d) => <Cell key={d.name} fill={PIE[EVIDEN_STATUSES.indexOf(d.name as EvidenStatus)]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Top Evaluated Users">
            <ResponsiveContainer><BarChart data={s.topUsers} layout="vertical"><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" name="Evaluasi" fill="hsl(var(--warning))" radius={[0, 3, 3, 0]} /></BarChart></ResponsiveContainer>
          </ChartCard>
          <ChartCard title={`Average Response Time · ${formatMinutes(s.avgResponseMinutes)}`}>
            <ResponsiveContainer><BarChart data={respByTeam}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={32} /><Tooltip formatter={(v: number) => formatMinutes(v)} /><Bar dataKey="minutes" name="Rata-rata" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}

const PAGE = 10;
type SortKey = "date" | "status" | "recipient";

function ManagementView({ rows, onOpen, onNew }: { rows: EvidenListRow[]; onOpen: (id: string) => void; onNew: () => void }) {
  const [q, setQ] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [user, setUser] = useState("all"); const [team, setTeam] = useState("all"); const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("date"); const [asc, setAsc] = useState(false); const [page, setPage] = useState(1);
  const users = useMemo(() => [...new Set(rows.map((r) => r.recipient_name || "-"))].sort(), [rows]);
  const teams = useMemo(() => [...new Set(rows.map((r) => r.recipient_team || "-"))].sort(), [rows]);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = rows.filter((r) => {
      const d = toLocalDateStr(new Date(r.sent_at ?? r.created_at));
      if (from && d < from) return false; if (to && d > to) return false;
      if (user !== "all" && (r.recipient_name || "-") !== user) return false;
      if (team !== "all" && (r.recipient_team || "-") !== team) return false;
      if (status !== "all" && r.status !== status) return false;
      return !s || `${r.code} ${r.problem} ${r.customer_information} ${r.recipient_name} ${r.sender_name}`.toLowerCase().includes(s);
    });
    const key = (r: EvidenListRow) => sort === "date" ? (r.sent_at ?? r.created_at) : sort === "status" ? r.status : (r.recipient_name ?? "");
    out.sort((a, b) => key(a).localeCompare(key(b)) * (asc ? 1 : -1));
    return out;
  }, [rows, q, from, to, user, team, status, sort, asc]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages);
  const view = filtered.slice((cur - 1) * PAGE, cur * PAGE);
  const toggleSort = (k: SortKey) => { if (sort === k) setAsc(!asc); else { setSort(k); setAsc(false); } };
  const reset = () => setPage(1);

  return (
    <Card className="p-3 space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); reset(); }} placeholder="Cari ID, problem, customer, user" className="pl-8 h-9" />
        </div>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); reset(); }} className="h-9 w-[140px]" aria-label="Dari tanggal" />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); reset(); }} className="h-9 w-[140px]" aria-label="Sampai tanggal" />
        <Select value={user} onValueChange={(v) => { setUser(v); reset(); }}><SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="User" /></SelectTrigger><SelectContent><SelectItem value="all">Semua user</SelectItem>{users.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
        <Select value={team} onValueChange={(v) => { setTeam(v); reset(); }}><SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="Team" /></SelectTrigger><SelectContent><SelectItem value="all">Semua team</SelectItem>{teams.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); reset(); }}><SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{EVIDEN_STATUSES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select>
        <Button size="sm" onClick={onNew}><Plus className="h-3.5 w-3.5 mr-1" />New Evaluation</Button>
      </div>
      {filtered.length === 0 ? <Empty text="Tidak ada evaluasi yang cocok" /> : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground border-b border-border">
                <tr className="text-left">
                  <th className="py-2 pr-2">ID</th>
                  <th className="py-2 pr-2"><button className="inline-flex items-center gap-1" onClick={() => toggleSort("date")}>Tanggal<ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="py-2 pr-2"><button className="inline-flex items-center gap-1" onClick={() => toggleSort("recipient")}>Recipient<ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="py-2 pr-2">Team</th><th className="py-2 pr-2">Problem</th><th className="py-2 pr-2">Sender</th>
                  <th className="py-2 pr-2"><button className="inline-flex items-center gap-1" onClick={() => toggleSort("status")}>Status<ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="py-2 pr-2">Waktu Jawab</th><th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {view.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/40">
                    <td className="py-2 pr-2 font-mono">{r.code}</td>
                    <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(r.sent_at)}</td>
                    <td className="py-2 pr-2">{r.recipient_name}</td>
                    <td className="py-2 pr-2">{r.recipient_team}</td>
                    <td className="py-2 pr-2 max-w-[260px] truncate" title={r.problem}>{r.problem}</td>
                    <td className="py-2 pr-2">{r.sender_name}</td>
                    <td className="py-2 pr-2"><StatusBadge status={r.status} /></td>
                    <td className="py-2 pr-2 whitespace-nowrap">{formatMinutes(responseMinutes(r))}</td>
                    <td className="py-2 text-right"><Button size="sm" variant="ghost" className="h-7" onClick={() => onOpen(r.id)}>Detail</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">{view.map((r) => <RowCard key={r.id} r={r} onOpen={onOpen} />)}</div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filtered.length} evaluasi</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7" disabled={cur <= 1} onClick={() => setPage(cur - 1)}>Prev</Button>
              <span>{cur}/{pages}</span>
              <Button size="sm" variant="outline" className="h-7" disabled={cur >= pages} onClick={() => setPage(cur + 1)}>Next</Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

function RowCard({ r, onOpen }: { r: EvidenListRow; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(r.id)} className="w-full text-left rounded-md border border-border p-2.5 hover:bg-muted/40">
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs">{r.code}</span><StatusBadge status={r.status} /></div>
      <p className="text-sm mt-1 line-clamp-2">{r.problem}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{r.sender_name} → {r.recipient_name} · {fmtDate(r.sent_at)}</p>
    </button>
  );
}

function MyEvaluationView({ rows, onOpen }: { rows: EvidenListRow[]; onOpen: (id: string) => void }) {
  const [status, setStatus] = useState<string>("all");
  const list = status === "all" ? rows : rows.filter((r) => r.status === status);
  return (
    <Card className="p-3 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {["all", ...EVIDEN_STATUSES].map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className="h-7 text-[11px]" onClick={() => setStatus(s)}>
            {s === "all" ? "Semua" : s} ({s === "all" ? rows.length : rows.filter((r) => r.status === s).length})
          </Button>
        ))}
      </div>
      {list.length === 0 ? <Empty text="Tidak ada evaluasi untuk Anda" /> : <div className="grid gap-2 md:grid-cols-2">{list.map((r) => <RowCard key={r.id} r={r} onOpen={onOpen} />)}</div>}
    </Card>
  );
}

export default function EvidenNoc() {
  const { user } = useAuth();
  const { data: rows = [], isLoading, isError, refetch } = useEvidenList();
  const [params, setParams] = useSearchParams();
  const openId = params.get("id");
  const [newOpen, setNewOpen] = useState(false);
  const isAdmin = rows.some((r) => r.viewer_kind === "admin");
  const mine = rows.filter((r) => r.recipient_user_id === user?.id);
  const open = (id: string) => setParams({ id });
  const close = () => { params.delete("id"); setParams(params); };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">🔍 Eviden NOC</h1>
        <p className="text-xs text-muted-foreground">Evaluasi internal privat: satu laporan untuk satu penerima, pengirim tampil sebagai ANONYMOUS.{isAdmin && " Anda melihat semua data sebagai Admin."}</p>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
          <TabsTrigger value="manage">🗂️ Evaluation Management</TabsTrigger>
          <TabsTrigger value="mine">📥 My Evaluation{mine.filter((r) => ["SENT", "REVISION REQUESTED"].includes(r.status)).length > 0 && ` (${mine.filter((r) => ["SENT", "REVISION REQUESTED"].includes(r.status)).length})`}</TabsTrigger>
        </TabsList>
        {isLoading ? <div className="grid gap-2 mt-3"><Skeleton className="h-16" /><Skeleton className="h-48" /></div>
          : isError ? <Card className="p-4 mt-3 text-sm">Gagal memuat evaluasi. <Button size="sm" variant="link" onClick={() => refetch()}>Coba lagi</Button></Card>
          : (<>
            <TabsContent value="dashboard"><DashboardView rows={rows} /></TabsContent>
            <TabsContent value="manage"><ManagementView rows={rows} onOpen={open} onNew={() => setNewOpen(true)} /></TabsContent>
            <TabsContent value="mine"><MyEvaluationView rows={mine} onOpen={open} /></TabsContent>
          </>)}
      </Tabs>
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-3 sm:p-4">
          <DialogHeader className="sr-only"><DialogTitle>New Evaluation</DialogTitle><DialogDescription>Kirim evaluasi baru</DialogDescription></DialogHeader>
          <EvaluationForm onSent={() => setNewOpen(false)} />
        </DialogContent>
      </Dialog>
      <EvaluationDetail id={openId} onClose={close} />
    </div>
  );
}
