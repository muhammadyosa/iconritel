import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, XAxis, YAxis } from "recharts";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toLocalDateStr, parseLocalDateStr } from "@/lib/dateUtils";
import { useIncidentArchive, periodFetchRange } from "@/hooks/useIncidentArchive";
import {
  buildPeriod, previousPeriod, computeKpis, trendIndicator, dailyBuckets, weeklyBuckets, monthlyBuckets,
  topCategories, rankUsers, formatDuration, durationMs, type PeriodKind, type UserPerformance, type TrendLabel,
} from "@/lib/nocAnalytics";
import { exportNocPdf } from "./nocPdf";

const cfg: ChartConfig = {
  created: { label: "Created", color: "hsl(var(--primary))" },
  resolved: { label: "Resolved", color: "hsl(var(--success))" },
  backlog: { label: "Backlog", color: "hsl(var(--destructive))" },
  slaPct: { label: "SLA %", color: "hsl(var(--warning))" },
  avgHours: { label: "Avg jam", color: "hsl(var(--warning))" },
};
const trendClass: Record<TrendLabel, string> = {
  Improving: "bg-success/15 text-success border-success/30",
  Stable: "bg-primary/10 text-primary border-primary/30",
  "Needs Attention": "bg-destructive/10 text-destructive border-destructive/30",
};
const tierClass: Record<UserPerformance["tier"], string> = {
  "Top Performer": "bg-success/15 text-success border-success/30",
  "High Performance": "bg-primary/10 text-primary border-primary/30",
  Average: "bg-warning/10 text-warning border-warning/30",
  "Needs Improvement": "bg-destructive/10 text-destructive border-destructive/30",
};
type SortKey = "score" | "resolved" | "sla" | "duration" | "rate";

export function NocPerformancePanel({ variant }: { variant: "incident" | "team" }) {
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(() => toLocalDateStr(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toLocalDateStr(new Date()));
  const [sort, setSort] = useState<SortKey>("score");
  const [userFilter, setUserFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [trendGrain, setTrendGrain] = useState<"daily" | "weekly" | "monthly">("daily");
  const [detail, setDetail] = useState<UserPerformance | null>(null);
  const [exporting, setExporting] = useState(false);

  const period = useMemo(() => buildPeriod(kind, parseLocalDateStr(anchor), parseLocalDateStr(customEnd)), [kind, anchor, customEnd]);
  const prev = useMemo(() => previousPeriod(period), [period]);
  const range = periodFetchRange(period, prev);
  const { data, isLoading, error } = useIncidentArchive(range.from, range.to);
  const incidents = data?.incidents ?? [];
  const handling = data?.handling ?? [];

  const a = useMemo(() => {
    const now = new Date();
    const kpis = computeKpis(incidents, period, now);
    const prevKpis = computeKpis(incidents, prev, now);
    const users = rankUsers(incidents, handling, period, now);
    return {
      kpis, prevKpis, trend: trendIndicator(kpis, prevKpis), users,
      prevUsers: rankUsers(incidents, handling, prev, now),
      daily: dailyBuckets(incidents, period, now), weekly: weeklyBuckets(incidents, period, now),
      monthly: monthlyBuckets(incidents, period, now), categories: topCategories(incidents, period),
    };
  }, [incidents, handling, period, prev]);

  const teamUsers = useMemo(() => {
    const q = teamFilter.trim().toUpperCase();
    const list = a.users.filter((u) => (userFilter === "all" || u.key === userFilter) && (!q || u.teams.some((t) => t.toUpperCase().includes(q))));
    const val = (u: UserPerformance) => sort === "resolved" ? u.resolved : sort === "sla" ? (u.slaPct ?? -1) : sort === "rate" ? u.resolutionRate : sort === "duration" ? -(u.avgResolutionMs || Infinity) : u.score;
    return [...list].sort((x, y) => val(y) - val(x));
  }, [a.users, sort, userFilter, teamFilter]);

  const delta = (c: number, p: number) => (p ? `${c >= p ? "+" : ""}${Math.round(((c - p) / p) * 100)}% vs sebelumnya` : "vs sebelumnya: -");

  const doExport = async () => {
    setExporting(true);
    try { await exportNocPdf({ period, ...a, incidents }); toast.success("PDF berhasil diunduh"); }
    catch { toast.error("Gagal membuat PDF"); }
    finally { setExporting(false); }
  };

  const userTrend = (u: UserPerformance | null, grain: typeof trendGrain) => {
    const buckets = grain === "monthly" ? a.monthly : grain === "weekly" ? a.weekly : a.daily;
    return buckets.map((b) => {
      const inB = (s: string | null) => !!s && new Date(s) >= b.start && new Date(s) <= b.end;
      const match = (id: string | null, name: string | null) => !u || (id || name?.trim().toLowerCase() || "unassigned") === u.key;
      return {
        label: b.label,
        created: incidents.filter((i) => inB(i.createdAt) && match(i.createdByUserId, i.createdByName)).length,
        handled: new Set(handling.filter((e) => inB(e.at) && match(e.userId, e.userName)).map((e) => e.ticketId)).size,
        resolved: incidents.filter((i) => i.status === "Resolved" && inB(i.resolvedAt) && match(i.resolvedByUserId, i.resolvedByName)).length,
      };
    });
  };
  const selectedUser = userFilter === "all" ? null : a.users.find((u) => u.key === userFilter) ?? null;

  const filters = (
    <div className="flex flex-wrap items-center gap-1.5">
      {(["week", "month", "year", "custom"] as const).map((k) => (
        <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} className="h-7 text-[11px]" aria-pressed={kind === k} onClick={() => setKind(k)}>
          {k === "week" ? "Mingguan" : k === "month" ? "Bulanan" : k === "year" ? "Tahunan" : "Custom"}
        </Button>
      ))}
      <Input type="date" aria-label="Tanggal periode" value={anchor} onChange={(e) => e.target.value && setAnchor(e.target.value)} className="h-7 w-[140px] text-[11px]" />
      {kind === "custom" && <Input type="date" aria-label="Tanggal akhir" value={customEnd} onChange={(e) => e.target.value && setCustomEnd(e.target.value)} className="h-7 w-[140px] text-[11px]" />}
      <Button size="sm" variant="outline" className="h-7 text-[11px] ml-auto" onClick={doExport} disabled={exporting || isLoading}>
        {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <FileDown className="h-3 w-3 mr-1" />} Export PDF
      </Button>
    </div>
  );

  const kpiCards = [
    { t: "Total Created", v: a.kpis.created, s: delta(a.kpis.created, a.prevKpis.created), c: "text-primary" },
    { t: "Total Resolved", v: a.kpis.resolved, s: delta(a.kpis.resolved, a.prevKpis.resolved), c: "text-success" },
    { t: "Outstanding", v: a.kpis.outstanding, s: "terbuka di akhir periode", c: "text-destructive" },
    { t: "On Progress", v: a.kpis.onProgress, s: "dari incident periode ini", c: "text-warning" },
    { t: "Avg Resolution", v: formatDuration(a.kpis.avgResolutionMs), s: `sebelumnya ${formatDuration(a.prevKpis.avgResolutionMs)}`, c: "text-warning" },
    { t: "SLA Achievement", v: a.kpis.slaPct === null ? "—" : `${a.kpis.slaPct}%`, s: `${a.kpis.slaOk}/${a.kpis.resolved} ≤ 24 jam`, c: (a.kpis.slaPct ?? 0) >= 80 ? "text-success" : "text-destructive" },
  ];

  return (
    <Card className="overflow-hidden border">
      <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20 space-y-2">
        <CardTitle className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          {variant === "incident" ? "📊 Analitik Incident" : "🏆 Performa Team NOC"}
          <Badge variant="outline" className="text-[10px]">{period.label}</Badge>
          <Badge variant="outline" className={`text-[10px] ${trendClass[a.trend]}`}>{a.trend}</Badge>
          {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </CardTitle>
        {filters}
      </CardHeader>
      <CardContent className="p-2 sm:p-3 space-y-3">
        {error && <p className="text-xs text-destructive">Gagal memuat arsip incident.</p>}
        <p className="text-[10px] text-muted-foreground">Sumber: arsip incident permanen (aktif sejak 11 Nov 2026). Incident yang terhapus sebelum tanggal itu tidak memiliki detail lengkap.</p>

        {variant === "incident" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {kpiCards.map((k) => (
                <div key={k.t} className="rounded-lg border p-2 bg-card">
                  <p className="text-[10px] text-muted-foreground">{k.t}</p>
                  <p className={`text-lg font-bold tabular-nums ${k.c}`}>{k.v}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{k.s}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="Created vs Resolved & Backlog (harian)">
                <ChartContainer config={cfg} className="h-[220px] w-full">
                  <ComposedChart data={a.daily}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="created" fill="var(--color-created)" /><Bar dataKey="resolved" fill="var(--color-resolved)" /><Line dataKey="backlog" stroke="var(--color-backlog)" dot={false} strokeWidth={2} /></ComposedChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Weekly Performance (Senin–Minggu)">
                <ChartContainer config={cfg} className="h-[220px] w-full">
                  <ComposedChart data={a.weekly}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 9 }} /><YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="l" dataKey="created" fill="var(--color-created)" /><Bar yAxisId="l" dataKey="resolved" fill="var(--color-resolved)" /><Line yAxisId="r" dataKey="slaPct" stroke="var(--color-slaPct)" strokeWidth={2} /></ComposedChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Monthly Performance">
                <ChartContainer config={cfg} className="h-[220px] w-full">
                  <ComposedChart data={a.monthly}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis yAxisId="l" allowDecimals={false} tick={{ fontSize: 9 }} /><YAxis yAxisId="r" orientation="right" tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
                    <Bar yAxisId="l" dataKey="created" fill="var(--color-created)" /><Bar yAxisId="l" dataKey="resolved" fill="var(--color-resolved)" /><Bar yAxisId="l" dataKey="backlog" fill="var(--color-backlog)" /><Line yAxisId="r" dataKey="avgHours" stroke="var(--color-avgHours)" strokeWidth={2} /></ComposedChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="Kategori incident terbanyak">
                <ChartContainer config={{ value: { label: "Incident", color: "hsl(var(--primary))" } }} className="h-[220px] w-full">
                  <BarChart data={a.categories} layout="vertical" margin={{ left: 40 }}><XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 8 }} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="value" fill="var(--color-value)" /></BarChart>
                </ChartContainer>
              </ChartCard>
            </div>
          </>
        )}

        <ChartCard title={variant === "incident" ? "Team Performance (Top 8 user)" : "Trend Incident per User"} extra={variant === "team" && (
          <div className="flex flex-wrap gap-1.5">
            <Select value={userFilter} onValueChange={setUserFilter}><SelectTrigger className="h-7 w-[150px] text-[11px]" aria-label="Filter user"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Semua user</SelectItem>{a.users.map((u) => <SelectItem key={u.key} value={u.key}>{u.name}</SelectItem>)}</SelectContent></Select>
            <Input placeholder="Filter tim" value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="h-7 w-[120px] text-[11px]" />
            <Select value={trendGrain} onValueChange={(v) => setTrendGrain(v as typeof trendGrain)}><SelectTrigger className="h-7 w-[110px] text-[11px]" aria-label="Skala tren"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Harian</SelectItem><SelectItem value="weekly">Mingguan</SelectItem><SelectItem value="monthly">Bulanan</SelectItem></SelectContent></Select>
          </div>
        )}>
          <ChartContainer config={{ created: cfg.created, handled: { label: "Handled", color: "hsl(var(--warning))" }, resolved: cfg.resolved }} className="h-[220px] w-full">
            {variant === "team" ? (
              <ComposedChart data={userTrend(selectedUser, trendGrain)}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={false} /><Line dataKey="handled" stroke="var(--color-handled)" strokeWidth={2} dot={false} /><Line dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2} dot={false} /></ComposedChart>
            ) : (
              <BarChart data={a.users.slice(0, 8)}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="created" fill="var(--color-created)" /><Bar dataKey="handled" fill="var(--color-handled)" /><Bar dataKey="resolved" fill="var(--color-resolved)" /></BarChart>
            )}
          </ChartContainer>
        </ChartCard>

        {variant === "team" && (
          <ChartCard title="Ranking User NOC" extra={
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}><SelectTrigger className="h-7 w-[150px] text-[11px]" aria-label="Urutkan ranking"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="score">Skor performa</SelectItem><SelectItem value="resolved">Resolved</SelectItem><SelectItem value="sla">SLA</SelectItem><SelectItem value="duration">Durasi tercepat</SelectItem><SelectItem value="rate">Resolution Rate</SelectItem></SelectContent></Select>
          }>
            <p className="text-[10px] text-muted-foreground mb-1">Skor: 40% SLA, 25% kecepatan, 20% resolution rate, 15% beban kerja. Klik nama untuk detail.</p>
            <div className="overflow-x-auto"><div className="min-w-[860px]">
              <Table>
                <TableHeader><TableRow>{["#", "Nama User", "Tim", "Created", "Handled", "Resolved", "Avg Durasi", "SLA", "Outstanding", "Rate", "Kategori"].map((h) => <TableHead key={h} className="text-[10px]">{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>
                  {teamUsers.length === 0 ? <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-6">Belum ada data pada periode ini</TableCell></TableRow> :
                    teamUsers.map((u, i) => (
                      <TableRow key={u.key}>
                        <TableCell className="text-xs">{i + 1}</TableCell>
                        <TableCell><Button variant="link" className="h-auto p-0 text-xs font-semibold" onClick={() => setDetail(u)}>{u.name}</Button></TableCell>
                        <TableCell className="text-[10px] max-w-[140px] truncate">{u.teams.join(", ") || "-"}</TableCell>
                        <TableCell className="text-xs">{u.created}</TableCell><TableCell className="text-xs">{u.handled}</TableCell>
                        <TableCell className="text-xs text-success font-semibold">{u.resolved}</TableCell>
                        <TableCell className="text-xs">{formatDuration(u.avgResolutionMs)}</TableCell>
                        <TableCell className="text-xs">{u.slaPct === null ? "—" : `${u.slaPct}%`}</TableCell>
                        <TableCell className="text-xs text-destructive">{u.outstanding}</TableCell>
                        <TableCell className="text-xs">{u.resolutionRate}%</TableCell>
                        <TableCell><Badge variant="outline" className={`text-[9px] whitespace-nowrap ${tierClass[u.tier]}`}>{u.tier} · {u.score}</Badge></TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div></div>
          </ChartCard>
        )}
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          {detail && (() => {
            const prevU = a.prevUsers.find((u) => u.key === detail.key);
            const userTrendLabel: TrendLabel = !prevU ? "Stable" : detail.score - prevU.score >= 5 ? "Improving" : prevU.score - detail.score >= 5 ? "Needs Attention" : "Stable";
            const activity = handling.filter((e) => (e.userId || e.userName?.trim().toLowerCase() || "unassigned") === detail.key).slice(-30).reverse();
            return (
              <>
                <DialogHeader><DialogTitle className="flex flex-wrap items-center gap-2 text-sm">👤 {detail.name}
                  <Badge variant="outline" className={`text-[10px] ${tierClass[detail.tier]}`}>{detail.tier} · {detail.score}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${trendClass[userTrendLabel]}`}>{userTrendLabel}</Badge></DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">Tim: {detail.teams.join(", ") || "-"} · {period.label}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[["Created", detail.created], ["Handled", detail.handled], ["Resolved", detail.resolved], ["Avg", formatDuration(detail.avgResolutionMs)], ["SLA", detail.slaPct === null ? "—" : `${detail.slaPct}%`], ["Outstanding", detail.outstanding]].map(([l, v]) => (
                    <div key={l as string} className="rounded border p-1.5 text-center"><p className="text-[9px] text-muted-foreground">{l}</p><p className="text-sm font-bold">{v}</p></div>
                  ))}
                </div>
                <ChartContainer config={{ created: cfg.created, handled: { label: "Handled", color: "hsl(var(--warning))" }, resolved: cfg.resolved }} className="h-[180px] w-full">
                  <ComposedChart data={userTrend(detail, kind === "year" ? "monthly" : "daily")}><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
                    <Line dataKey="created" stroke="var(--color-created)" dot={false} /><Line dataKey="handled" stroke="var(--color-handled)" dot={false} /><Line dataKey="resolved" stroke="var(--color-resolved)" dot={false} /></ComposedChart>
                </ChartContainer>
                <h4 className="text-xs font-semibold">✅ Incident yang diselesaikan ({detail.resolvedIncidents.length})</h4>
                <div className="space-y-1 max-h-[200px] overflow-auto">
                  {detail.resolvedIncidents.map((i) => (
                    <div key={i.ticketId} className="rounded border p-1.5 text-[10px] flex justify-between gap-2">
                      <span className="truncate"><b>{i.ticketId}</b> · {i.constraint}{i.reopenCount ? ` · dibuka ulang ${i.reopenCount}x` : ""}</span>
                      <span className="shrink-0 text-muted-foreground">{new Date(i.resolvedAt!).toLocaleString("id-ID")} · {formatDuration(durationMs(i))}</span>
                    </div>
                  ))}
                </div>
                <h4 className="text-xs font-semibold">♻️ Riwayat aktivitas penanganan</h4>
                <div className="space-y-1 max-h-[160px] overflow-auto">
                  {activity.length === 0 ? <p className="text-[10px] text-muted-foreground">Belum ada aktivitas tercatat.</p> : activity.map((e, idx) => (
                    <p key={idx} className="text-[10px]"><b>{e.ticketId}</b> · {new Date(e.at).toLocaleString("id-ID")}</p>
                  ))}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ChartCard({ title, extra, children }: { title: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1"><h4 className="text-[11px] font-semibold">{title}</h4>{extra}</div>
      {children}
    </div>
  );
}
