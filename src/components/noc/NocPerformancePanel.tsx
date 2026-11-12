import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, LabelList, ComposedChart, XAxis, YAxis } from "recharts";
import { CalendarIcon, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toLocalDateStr, parseLocalDateStr } from "@/lib/dateUtils";
import { useIncidentArchive, periodFetchRange } from "@/hooks/useIncidentArchive";
import {
  buildPeriod, previousPeriod, computeKpis, trendIndicator, dailyBuckets, weeklyBuckets, monthlyBuckets, productivityRanking,
  topCategories, rankUsers, formatDuration, durationMs, type PeriodKind, type UserPerformance, type TrendLabel,
} from "@/lib/nocAnalytics";
import { exportNocPdf } from "./nocPdf";

const cfg: ChartConfig = {
  created: { label: "Created", color: "hsl(var(--primary))" },
  resolved: { label: "Resolved", color: "hsl(var(--success))" },
  progress: { label: "On Progress", color: "hsl(var(--warning))" },
  handled: { label: "Handled", color: "hsl(var(--chart-4))" },
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
  Excellent: "bg-success/15 text-success border-success/30",
  "Very Good": "bg-primary/10 text-primary border-primary/30",
  Good: "bg-accent/15 text-accent-foreground border-accent/30",
  Average: "bg-warning/10 text-warning border-warning/30",
  "Needs Improvement": "bg-destructive/10 text-destructive border-destructive/30",
};

export function NocPerformancePanel({ variant }: { variant: "incident" | "team" }) {
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(() => toLocalDateStr(new Date()));
  const [customEnd, setCustomEnd] = useState(() => toLocalDateStr(new Date()));
  const [userFilter, setUserFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [trendGrain, setTrendGrain] = useState<"daily" | "weekly" | "monthly">("daily");
  const [detail, setDetail] = useState<UserPerformance | null>(null);
  const [exporting, setExporting] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(() => ({
    from: parseLocalDateStr(anchor), to: parseLocalDateStr(customEnd),
  }));

  const selectCustomRange = (range: DateRange | undefined) => {
    setCustomRange(range);
    // Match Ranking User NOC: clearing uses its seven-day fallback;
    // selecting only a start applies that single day immediately.
    const fallback = new Date();
    fallback.setDate(fallback.getDate() - 7);
    const from = range?.from ?? fallback;
    setAnchor(toLocalDateStr(from));
    setCustomEnd(toLocalDateStr(range?.to ?? from));
  };

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
      monthly: monthlyBuckets(incidents, period, now), categories: topCategories(incidents, period), productivity: productivityRanking(users),
    };
  }, [incidents, handling, period, prev]);

  const teamUsers = useMemo(() => {
    const q = teamFilter.trim().toUpperCase();
    return a.users.filter((u) => (userFilter === "all" || u.key === userFilter) && (!q || u.teams.some((t) => t.toUpperCase().includes(q))));
  }, [a.users, userFilter, teamFilter]);

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
      {variant === "team" && kind === "custom" ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="default" className="h-6 text-[10px] px-2.5 gap-1">
                <CalendarIcon className="h-3 w-3" />
                {customRange?.from
                  ? customRange.to && customRange.to.getTime() !== customRange.from.getTime()
                    ? `${format(customRange.from, "dd MMM", { locale: localeId })} - ${format(customRange.to, "dd MMM", { locale: localeId })}`
                    : format(customRange.from, "dd MMM yyyy", { locale: localeId })
                  : "Pilih Tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" selected={customRange} onSelect={selectCustomRange}
                disabled={(date) => date > new Date()} numberOfMonths={1} initialFocus
                className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      ) : (
        <>
          <Input type="date" aria-label="Tanggal periode" value={anchor} onChange={(e) => {
            if (!e.target.value) return;
            setAnchor(e.target.value);
            if (variant === "team") setCustomRange({ from: parseLocalDateStr(e.target.value), to: parseLocalDateStr(customEnd) });
          }} className="h-7 w-[140px] text-[11px]" />
          {kind === "custom" && <Input type="date" aria-label="Tanggal akhir" value={customEnd} onChange={(e) => e.target.value && setCustomEnd(e.target.value)} className="h-7 w-[140px] text-[11px]" />}
        </>
      )}
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
                <div key={k.t} className="rounded-xl border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{k.t}</p>
                  <p className={`text-xl font-bold tabular-nums leading-tight ${k.c}`}>{k.v}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{k.s}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="Created vs Resolved & Backlog" extra={
                <div className="flex gap-1">{(["daily", "weekly", "monthly"] as const).map((g) => (
                  <Button key={g} size="sm" variant={trendGrain === g ? "secondary" : "ghost"} className="h-6 px-2 text-[10px]" aria-pressed={trendGrain === g} onClick={() => setTrendGrain(g)}>{g === "daily" ? "Harian" : g === "weekly" ? "Mingguan" : "Bulanan"}</Button>
                ))}</div>
              }>
                <ChartContainer config={cfg} className="h-[220px] w-full">
                  <ComposedChart data={trendGrain === "monthly" ? a.monthly : trendGrain === "weekly" ? a.weekly : a.daily}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} />
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
              <ChartCard title="📈 Rekap Progress Incident" extra={
                <div className="flex gap-1">{(["daily", "weekly", "monthly"] as const).map((g) => (
                  <Button key={g} size="sm" variant={trendGrain === g ? "secondary" : "ghost"} className="h-6 px-2 text-[10px]" aria-pressed={trendGrain === g} onClick={() => setTrendGrain(g)}>{g === "daily" ? "Harian" : g === "weekly" ? "Mingguan" : "Bulanan"}</Button>
                ))}</div>
              }>
                <ChartContainer config={cfg} className="h-[240px] w-full">
                  <LineChart data={trendGrain === "monthly" ? a.monthly : trendGrain === "weekly" ? a.weekly : a.daily}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="progress" stroke="var(--color-progress)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} /></LineChart>
                </ChartContainer>
              </ChartCard>
              <ChartCard title="👥 Rekap Produktivitas NOC" extra={<Badge variant="outline" className="text-[10px]">{period.label}</Badge>}>
                {a.productivity.length === 0 ? <p className="text-xs text-muted-foreground text-center py-10">Belum ada data pada periode ini</p> : (
                <ChartContainer config={cfg} className="w-full" style={{ height: Math.max(200, a.productivity.length * 34 + 50) }}>
                  <BarChart data={a.productivity} layout="vertical" margin={{ left: 8, right: 24 }}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="created" fill="var(--color-created)" radius={[0, 3, 3, 0]}><LabelList dataKey="created" position="right" className="fill-foreground" fontSize={9} /></Bar>
                    <Bar dataKey="handled" fill="var(--color-handled)" radius={[0, 3, 3, 0]}><LabelList dataKey="handled" position="right" className="fill-foreground" fontSize={9} /></Bar>
                    <Bar dataKey="resolved" fill="var(--color-resolved)" radius={[0, 3, 3, 0]}><LabelList dataKey="resolved" position="right" className="fill-foreground" fontSize={9} /></Bar></BarChart>
                </ChartContainer>)}
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

        <ChartCard title="Ranking User NOC" extra={<Badge variant="outline" className="text-[10px]">Created 50% + Resolved 50%</Badge>}>
          <p className="text-[10px] text-muted-foreground mb-1">Nilai tiap indikator = jumlah user ÷ jumlah tertinggi periode ini × 100. Diurutkan dari skor tertinggi; klik nama untuk detail.</p>
          <div className="hidden sm:block overflow-x-auto"><div className="min-w-[580px]">
            <Table>
              <TableHeader><TableRow>{["#", "Nama User", "Created", "Resolved", "Outstanding", "Rate", "Kategori"].map((h) => <TableHead key={h} className="h-8 text-[10px] uppercase tracking-wide">{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {teamUsers.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">Belum ada data pada periode ini</TableCell></TableRow> :
                  teamUsers.map((u, i) => {
                    const max = Math.max(u.created, u.handled, u.resolved, 1);
                    return (
                    <TableRow key={u.key} className="hover:bg-muted/30">
                      <TableCell className="py-1.5 w-8"><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>{i + 1}</span></TableCell>
                      <TableCell className="py-1.5 min-w-[160px]">
                        <Button variant="link" className="h-auto p-0 text-xs font-semibold" onClick={() => setDetail(u)}>{u.name}</Button>
                        <div className="mt-1 space-y-0.5" aria-label={`Created ${u.created}, Handled ${u.handled}, Resolved ${u.resolved}`}>
                          {([["bg-primary", u.created], ["bg-warning", u.handled], ["bg-success", u.resolved]] as const).map(([c, v], k) => (
                            <div key={k} className="h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${c}`} style={{ width: `${(v / max) * 100}%` }} /></div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-1.5 text-xs tabular-nums text-primary">{u.created}</TableCell>
                      <TableCell className="py-1.5 text-xs tabular-nums text-success font-semibold">{u.resolved}</TableCell>
                      <TableCell className="py-1.5 text-xs tabular-nums text-destructive">{u.outstanding}</TableCell>
                      <TableCell className="py-1.5 text-xs tabular-nums">{u.resolutionRate}%</TableCell>
                      <TableCell className="py-1.5"><Badge variant="outline" className={`text-[9px] whitespace-nowrap ${tierClass[u.tier]}`}>{u.tier} · {u.score}</Badge></TableCell>
                    </TableRow>);
                  })}
              </TableBody>
            </Table>
          </div></div>
          <div className="sm:hidden space-y-2">
            {teamUsers.length === 0 ? <p className="text-center text-xs text-muted-foreground py-6">Belum ada data pada periode ini</p> : teamUsers.map((u, i) => {
              const max = Math.max(u.created, u.handled, u.resolved, 1);
              return (
                <article key={u.key} className="rounded-lg border bg-card p-2.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i < 3 ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>{i + 1}</span>
                      <Button variant="link" className="h-auto min-w-0 p-0 text-xs font-semibold whitespace-normal text-left" onClick={() => setDetail(u)}>{u.name}</Button>
                    </div>
                    <Badge variant="outline" className={`text-[9px] whitespace-nowrap ${tierClass[u.tier]}`}>{u.tier} · {u.score}</Badge>
                  </div>
                  <div className="space-y-0.5" aria-label={`Created ${u.created}, Handled ${u.handled}, Resolved ${u.resolved}`}>
                    {([["bg-primary", u.created], ["bg-warning", u.handled], ["bg-success", u.resolved]] as const).map(([c, v], k) => (
                      <div key={k} className="h-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${c}`} style={{ width: `${(v / max) * 100}%` }} /></div>
                    ))}
                  </div>
                  <dl className="grid grid-cols-4 gap-1 text-center">
                    <div className="rounded bg-primary/5 p-1.5"><dt className="text-[8px] uppercase text-muted-foreground">Created</dt><dd className="text-xs font-semibold text-primary">{u.created}</dd></div>
                    <div className="rounded bg-success/5 p-1.5"><dt className="text-[8px] uppercase text-muted-foreground">Resolved</dt><dd className="text-xs font-semibold text-success">{u.resolved}</dd></div>
                    <div className="rounded bg-destructive/5 p-1.5"><dt className="text-[8px] uppercase text-muted-foreground">Outstanding</dt><dd className="text-xs font-semibold text-destructive">{u.outstanding}</dd></div>
                    <div className="rounded bg-muted/50 p-1.5"><dt className="text-[8px] uppercase text-muted-foreground">Rate</dt><dd className="text-xs font-semibold">{u.resolutionRate}%</dd></div>
                  </dl>
                </article>
              );
            })}
          </div>
          <div className="flex gap-3 mt-1 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-full bg-primary" />Created</span><span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-full bg-warning" />Handled</span><span className="flex items-center gap-1"><i className="h-1.5 w-3 rounded-full bg-success" />Resolved</span></div>
        </ChartCard>
      </CardContent>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[90vh] overflow-auto p-3 sm:p-6">
          {detail && (() => {
            const prevU = a.prevUsers.find((u) => u.key === detail.key);
            const userTrendLabel: TrendLabel = !prevU ? "Stable" : detail.score - prevU.score >= 5 ? "Improving" : prevU.score - detail.score >= 5 ? "Needs Attention" : "Stable";
            const activity = handling.filter((e) => (e.userId || e.userName?.trim().toLowerCase() || "unassigned") === detail.key).slice(-30).reverse();
            const history = [...detail.createdIncidents, ...detail.resolvedIncidents]
              .filter((i, index, list) => list.findIndex((x) => x.ticketId === i.ticketId) === index)
              .sort((x, y) => new Date(y.resolvedAt || y.createdAt).getTime() - new Date(x.resolvedAt || x.createdAt).getTime());
            return (
              <>
                <DialogHeader><DialogTitle className="flex flex-wrap items-center gap-2 text-sm">👤 {detail.name}
                  <Badge variant="outline" className={`text-[10px] ${tierClass[detail.tier]}`}>{detail.tier} · {detail.score}</Badge>
                  <Badge variant="outline" className={`text-[10px] ${trendClass[userTrendLabel]}`}>{userTrendLabel}</Badge></DialogTitle></DialogHeader>
                <p className="text-xs text-muted-foreground">Tim: {detail.teams.join(", ") || "-"} · {period.label}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg border bg-primary/5 p-2 text-center"><p className="text-[9px] uppercase text-muted-foreground">Created</p><p className="text-lg font-bold text-primary">{detail.created}</p><p className="text-[10px]">Nilai: <b>{detail.createdScore}/100</b></p><p className="text-[9px] text-muted-foreground">Bobot 50%</p></div>
                  <div className="rounded-lg border bg-success/5 p-2 text-center"><p className="text-[9px] uppercase text-muted-foreground">Resolved</p><p className="text-lg font-bold text-success">{detail.resolved}</p><p className="text-[10px]">Nilai: <b>{detail.resolvedScore}/100</b></p><p className="text-[9px] text-muted-foreground">Bobot 50%</p></div>
                  <div className="rounded-lg border bg-accent/10 p-2 text-center"><p className="text-[9px] uppercase text-muted-foreground">Skor Akhir</p><p className="text-lg font-bold">{detail.score}/100</p><p className="text-[10px] font-semibold">{detail.tier}</p><p className="text-[9px] text-muted-foreground">Created 50% + Resolved 50%</p></div>
                </div>
                <p className="text-[10px] text-muted-foreground">Skor = (Nilai Created × 50%) + (Nilai Resolved × 50%). Normalisasi memakai nilai tertinggi user pada periode yang sama.</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[["Handled", detail.handled], ["Avg Resolution", formatDuration(detail.avgResolutionMs)], ["SLA", detail.slaPct === null ? "—" : `${detail.slaPct}%`], ["Outstanding", detail.outstanding]].map(([l, v]) => (
                    <div key={l as string} className="rounded border p-1.5 text-center"><p className="text-[9px] text-muted-foreground">{l}</p><p className="text-sm font-bold">{v}</p></div>
                  ))}
                </div>
                <h4 className="text-xs font-semibold">📈 Tren Produktivitas</h4>
                <ChartContainer config={{ created: cfg.created, handled: { label: "Handled", color: "hsl(var(--warning))" }, resolved: cfg.resolved }} className="h-[200px] w-full">
                  <ComposedChart data={userTrend(detail, kind === "year" ? "monthly" : "daily")}><CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" /><XAxis dataKey="label" tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 9 }} /><ChartTooltip content={<ChartTooltipContent />} /><ChartLegend content={<ChartLegendContent />} />
                    <Line dataKey="created" stroke="var(--color-created)" dot={false} /><Line dataKey="handled" stroke="var(--color-handled)" dot={false} /><Line dataKey="resolved" stroke="var(--color-resolved)" dot={false} /></ComposedChart>
                </ChartContainer>
                <h4 className="text-xs font-semibold">📋 Riwayat Incident ({history.length})</h4>
                <div className="max-h-[260px] overflow-auto rounded border"><div className="min-w-[860px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted z-10"><TableRow>{["ID Incident", "Type", "Customer", "Status", "Create By", "Created At", "Resolved By", "Resolved At", "Durasi"].map((h) => <TableHead key={h} className="h-7 px-2 text-[9px] uppercase whitespace-nowrap">{h}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {history.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">Belum ada riwayat incident pada periode ini.</TableCell></TableRow> : history.map((i) => (
                        <TableRow key={i.ticketId}>
                          <TableCell className="px-2 py-1 text-[10px] font-semibold whitespace-nowrap">{i.ticketId}{i.reopenCount ? <span className="text-warning"> ↻{i.reopenCount}</span> : null}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] whitespace-nowrap">{i.constraint || "-"}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] max-w-[160px] truncate" title={i.customer || i.hostname}>{i.customer || i.hostname || "-"}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px]">{i.status}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] whitespace-nowrap">{i.createdByName || "-"}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] whitespace-nowrap">{new Date(i.createdAt).toLocaleString("id-ID")}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] whitespace-nowrap">{i.resolvedByName || "-"}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] whitespace-nowrap">{i.resolvedAt ? new Date(i.resolvedAt).toLocaleString("id-ID") : "-"}</TableCell>
                          <TableCell className="px-2 py-1 text-[10px] whitespace-nowrap">{formatDuration(durationMs(i))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div></div>
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
    <div className="rounded-xl border bg-card p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5"><h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>{extra}</div>
      {children}
    </div>
  );
}
