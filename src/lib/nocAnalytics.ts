/**
 * NOC performance analytics — pure functions shared by Dashboard, Team NOC and PDF.
 * Period rules: Created by createdAt, Resolved by resolvedAt, duration = resolvedAt - createdAt,
 * Outstanding = created on/before period end and not resolved by period end. Weeks run Monday–Sunday
 * in the browser's local time zone (WIB for operators).
 */
import { SLA_THRESHOLD_MS } from "@/lib/sla";

export interface ArchivedIncident {
  ticketId: string;
  constraint: string;
  category: string;
  serpo: string;
  status: string;
  description: string;
  createdAt: string;
  createdByUserId: string | null;
  createdByName: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolvedByName: string | null;
  reopenCount: number;
  customer?: string;
  hostname?: string;
}

export interface HandlingEvent { ticketId: string; userId: string | null; userName: string | null; at: string }

export type PeriodKind = "week" | "month" | "year" | "custom";
export interface Period { kind: PeriodKind; start: Date; end: Date; label: string }

const DAY = 86400000;
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const fmt = (d: Date) => d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export function weekStart(d: Date): Date {
  const s = sod(d);
  const dow = (s.getDay() + 6) % 7; // Monday = 0
  s.setDate(s.getDate() - dow);
  return s;
}

export function buildPeriod(kind: PeriodKind, anchor: Date, customEnd?: Date): Period {
  if (kind === "week") {
    const start = weekStart(anchor);
    const end = eod(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6));
    return { kind, start, end, label: `Minggu ${fmt(start)} – ${fmt(end)}` };
  }
  if (kind === "month") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = eod(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0));
    return { kind, start, end, label: start.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) };
  }
  if (kind === "year") {
    const start = new Date(anchor.getFullYear(), 0, 1);
    const end = eod(new Date(anchor.getFullYear(), 11, 31));
    return { kind, start, end, label: `Tahun ${anchor.getFullYear()}` };
  }
  const a = sod(anchor), b = eod(customEnd ?? anchor);
  const [start, end] = a <= b ? [a, b] : [sod(customEnd!), eod(anchor)];
  return { kind, start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

export function previousPeriod(p: Period): Period {
  if (p.kind === "week") return buildPeriod("week", new Date(p.start.getTime() - 7 * DAY));
  if (p.kind === "month") return buildPeriod("month", new Date(p.start.getFullYear(), p.start.getMonth() - 1, 1));
  if (p.kind === "year") return buildPeriod("year", new Date(p.start.getFullYear() - 1, 0, 1));
  const days = Math.round((sod(p.end).getTime() - p.start.getTime()) / DAY) + 1;
  const s = new Date(p.start); s.setDate(s.getDate() - days);
  const e = new Date(p.start); e.setDate(e.getDate() - 1);
  return buildPeriod("custom", s, e);
}

const t = (s: string | null) => (s ? new Date(s).getTime() : NaN);
const inP = (s: string | null, p: Period) => { const v = t(s); return v >= p.start.getTime() && v <= p.end.getTime(); };
export const durationMs = (i: ArchivedIncident) => (i.resolvedAt ? Math.max(0, t(i.resolvedAt) - t(i.createdAt)) : NaN);
export const isResolvedIn = (i: ArchivedIncident, p: Period) => i.status === "Resolved" && inP(i.resolvedAt, p);
export const isCreatedIn = (i: ArchivedIncident, p: Period) => inP(i.createdAt, p);
export function isOutstandingAt(i: ArchivedIncident, end: Date): boolean {
  if (t(i.createdAt) > end.getTime()) return false;
  if (i.status === "Resolved" && i.resolvedAt && t(i.resolvedAt) <= end.getTime()) return false;
  return true;
}

export interface Kpis {
  created: number; resolved: number; outstanding: number; onProgress: number;
  avgResolutionMs: number; slaPct: number | null; slaOk: number;
}

export function computeKpis(list: ArchivedIncident[], p: Period, now = new Date()): Kpis {
  const created = list.filter((i) => isCreatedIn(i, p));
  const resolved = list.filter((i) => isResolvedIn(i, p));
  const endRef = p.end.getTime() > now.getTime() ? now : p.end;
  const outstanding = list.filter((i) => isOutstandingAt(i, endRef));
  const durations = resolved.map(durationMs);
  const slaOk = durations.filter((d) => d <= SLA_THRESHOLD_MS).length;
  return {
    created: created.length,
    resolved: resolved.length,
    outstanding: outstanding.length,
    onProgress: created.filter((i) => i.status === "On Progress").length,
    avgResolutionMs: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    slaPct: resolved.length ? Math.round((slaOk / resolved.length) * 100) : null,
    slaOk,
  };
}

export type TrendLabel = "Improving" | "Stable" | "Needs Attention";
/** Compare SLA, resolution balance and speed against the previous period. */
export function trendIndicator(cur: Kpis, prev: Kpis): TrendLabel {
  let score = 0;
  if (cur.slaPct !== null && prev.slaPct !== null) score += cur.slaPct - prev.slaPct >= 3 ? 1 : prev.slaPct - cur.slaPct >= 3 ? -1 : 0;
  const ratio = (k: Kpis) => (k.created ? k.resolved / k.created : 1);
  score += ratio(cur) - ratio(prev) >= 0.05 ? 1 : ratio(prev) - ratio(cur) >= 0.05 ? -1 : 0;
  if (cur.avgResolutionMs && prev.avgResolutionMs) {
    score += cur.avgResolutionMs <= prev.avgResolutionMs * 0.9 ? 1 : cur.avgResolutionMs >= prev.avgResolutionMs * 1.1 ? -1 : 0;
  }
  return score >= 1 ? "Improving" : score <= -1 ? "Needs Attention" : "Stable";
}

export interface Bucket { key: string; label: string; start: Date; end: Date; created: number; resolved: number; onProgress: number; backlog: number; slaPct: number | null; avgHours: number }

function bucketStats(list: ArchivedIncident[], key: string, label: string, start: Date, end: Date, now: Date): Bucket {
  const p: Period = { kind: "custom", start, end, label };
  const k = computeKpis(list, p, now);
  return { key, label, start, end, created: k.created, resolved: k.resolved, onProgress: k.onProgress, backlog: k.outstanding, slaPct: k.slaPct, avgHours: Math.round((k.avgResolutionMs / 3600000) * 10) / 10 };
}

export function dailyBuckets(list: ArchivedIncident[], p: Period, now = new Date()): Bucket[] {
  const out: Bucket[] = [];
  const last = Math.min(p.end.getTime(), eod(now).getTime());
  for (let d = new Date(p.start); d.getTime() <= last && out.length < 400; d.setDate(d.getDate() + 1)) {
    const s = sod(d);
    out.push(bucketStats(list, s.toISOString(), s.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }), s, eod(s), now));
  }
  return out;
}

/** Monday–Sunday weeks overlapping the period, clipped to it, labelled Week 1..n. */
export function weeklyBuckets(list: ArchivedIncident[], p: Period, now = new Date()): Bucket[] {
  const out: Bucket[] = [];
  for (let s = weekStart(p.start); s <= p.end && out.length < 60; s = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)) {
    const start = s < p.start ? p.start : s;
    const wEnd = eod(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6));
    const end = wEnd > p.end ? p.end : wEnd;
    if (start.getTime() > now.getTime()) break;
    out.push(bucketStats(list, start.toISOString(), `Week ${out.length + 1}`, start, end, now));
  }
  return out;
}

export function monthlyBuckets(list: ArchivedIncident[], p: Period, now = new Date()): Bucket[] {
  const out: Bucket[] = [];
  for (let m = new Date(p.start.getFullYear(), p.start.getMonth(), 1); m <= p.end && out.length < 60; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    if (m.getTime() > now.getTime()) break;
    const start = m < p.start ? p.start : m;
    const mEnd = eod(new Date(m.getFullYear(), m.getMonth() + 1, 0));
    out.push(bucketStats(list, m.toISOString(), m.toLocaleDateString("id-ID", { month: "short", year: "2-digit" }), start, mEnd > p.end ? p.end : mEnd, now));
  }
  return out;
}

/** Users sorted by total productivity (created + handled + resolved), ties by resolved. */
export function productivityRanking(users: UserPerformance[]) {
  return users.map((u) => ({ name: u.name, created: u.created, handled: u.handled, resolved: u.resolved, total: u.created + u.handled + u.resolved }))
    .filter((u) => u.total > 0).sort((a, b) => b.total - a.total || b.resolved - a.resolved);
}

export function topCategories(list: ArchivedIncident[], p: Period, limit = 8) {
  const m = new Map<string, number>();
  list.filter((i) => isCreatedIn(i, p)).forEach((i) => m.set(i.constraint || "LAINNYA", (m.get(i.constraint || "LAINNYA") || 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, limit);
}

// ---------- User ranking ----------
export type PerformanceTier = "Top Performer" | "High Performance" | "Average" | "Needs Improvement";
export interface UserPerformance {
  key: string; name: string; teams: string[];
  created: number; handled: number; resolved: number; outstanding: number;
  avgResolutionMs: number; slaPct: number | null; resolutionRate: number; score: number; tier: PerformanceTier;
  resolvedIncidents: ArchivedIncident[];
}

export const UNASSIGNED = "Unassigned";
const keyOf = (id: string | null, name: string | null) => id || (name?.trim().toLowerCase() || "unassigned");

/**
 * Resolver identity = resolvedByUserId (fallback name, else Unassigned). Each incident counts once
 * per user even if reopened. Handled = distinct incidents with a recorded non-creation status change.
 * Score (0–100): 40% SLA, 25% speed vs 24h SLA, 20% resolution rate, 15% workload share.
 */
export function rankUsers(list: ArchivedIncident[], events: HandlingEvent[], p: Period, now = new Date()): UserPerformance[] {
  type Acc = { name: string; teams: Set<string>; created: Set<string>; handled: Set<string>; resolved: Map<string, ArchivedIncident>; outstanding: Set<string> };
  const map = new Map<string, Acc>();
  const get = (key: string, name: string) => {
    let a = map.get(key);
    if (!a) { a = { name, teams: new Set(), created: new Set(), handled: new Set(), resolved: new Map(), outstanding: new Set() }; map.set(key, a); }
    if (name && a.name === UNASSIGNED && key !== "unassigned") a.name = name;
    return a;
  };
  const endRef = p.end.getTime() > now.getTime() ? now : p.end;
  list.forEach((i) => {
    if (isCreatedIn(i, p) && (i.createdByUserId || i.createdByName)) {
      const a = get(keyOf(i.createdByUserId, i.createdByName), i.createdByName?.trim() || UNASSIGNED);
      a.created.add(i.ticketId);
      if (isOutstandingAt(i, endRef)) a.outstanding.add(i.ticketId);
      if (i.serpo) a.teams.add(i.serpo);
    }
    if (isResolvedIn(i, p)) {
      const a = get(keyOf(i.resolvedByUserId, i.resolvedByName), i.resolvedByName?.trim() || UNASSIGNED);
      a.resolved.set(i.ticketId, i);
      if (i.serpo) a.teams.add(i.serpo);
    }
  });
  events.forEach((e) => {
    if (!inP(e.at, p) || (!e.userId && !e.userName)) return;
    get(keyOf(e.userId, e.userName), e.userName?.trim() || UNASSIGNED).handled.add(e.ticketId);
  });
  const rows = [...map.entries()].map(([key, a]) => {
    const res = [...a.resolved.values()];
    const durs = res.map(durationMs);
    const ok = durs.filter((d) => d <= SLA_THRESHOLD_MS).length;
    const workload = new Set([...a.created, ...a.handled, ...a.resolved.keys()]).size;
    return {
      key, name: a.name, teams: [...a.teams].slice(0, 5),
      created: a.created.size, handled: a.handled.size, resolved: res.length, outstanding: a.outstanding.size,
      avgResolutionMs: durs.length ? durs.reduce((x, y) => x + y, 0) / durs.length : 0,
      slaPct: res.length ? Math.round((ok / res.length) * 100) : null,
      resolutionRate: workload ? Math.round((res.length / workload) * 100) : 0,
      workload, resolvedIncidents: res,
    };
  });
  const maxLoad = Math.max(1, ...rows.map((r) => r.workload));
  return rows
    .map(({ workload, ...r }) => {
      const sla = r.slaPct ?? 0;
      const speed = r.resolved ? Math.max(0, 100 - (r.avgResolutionMs / SLA_THRESHOLD_MS) * 100) : 0;
      const score = Math.round(0.4 * sla + 0.25 * speed + 0.2 * Math.min(100, r.resolutionRate) + 0.15 * (workload / maxLoad) * 100);
      const tier: PerformanceTier = score >= 80 ? "Top Performer" : score >= 65 ? "High Performance" : score >= 45 ? "Average" : "Needs Improvement";
      return { ...r, score, tier };
    })
    .sort((a, b) => b.score - a.score || b.resolved - a.resolved);
}

export function formatDuration(ms: number): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  const mins = Math.round(ms / 60000);
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60;
  return d ? `${d}h ${h}j` : h ? `${h}j ${m}m` : `${m}m`;
}
