import type { Bucket, Kpis, Period, TrendLabel, UserPerformance, ArchivedIncident } from "@/lib/nocAnalytics";
import { durationMs, formatDuration, isCreatedIn, isResolvedIn } from "@/lib/nocAnalytics";

interface PdfInput {
  period: Period; kpis: Kpis; prevKpis: Kpis; trend: TrendLabel;
  daily: Bucket[]; weekly: Bucket[]; monthly: Bucket[];
  categories: { name: string; value: number }[];
  users: UserPerformance[]; incidents: ArchivedIncident[];
}

const fmtDT = (s: string | null) => (s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

export async function exportNocPdf(d: PdfInput) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14;
  let y = 0;

  doc.setFillColor(30, 64, 144); doc.rect(0, 0, W, 26, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
  doc.text("PLN ICON PLUS — NOC RETAIL", M, 11);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text(`Laporan Performa Incident & Team NOC · ${d.period.label}`, M, 18);
  doc.text(`Dibuat ${new Date().toLocaleString("id-ID")}`, W - M, 18, { align: "right" });
  y = 34;

  const section = (title: string) => {
    if (y > H - 40) { doc.addPage(); y = 18; }
    doc.setTextColor(30, 64, 144); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.text(title, M, y); y += 5;
    doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  };
  const table = (head: string[], body: (string | number)[][]) => {
    autoTable(doc, { startY: y, head: [head], body, margin: { left: M, right: M }, styles: { fontSize: 7, cellPadding: 1.4, overflow: "linebreak" }, headStyles: { fillColor: [30, 64, 144] } });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
  };
  const bars = (title: string, rows: Bucket[]) => {
    const h = 46;
    if (y + h + 10 > H - 12) { doc.addPage(); y = 18; }
    doc.setFontSize(8); doc.setTextColor(60, 60, 60); doc.text(title, M, y); y += 3;
    const max = Math.max(1, ...rows.flatMap((r) => [r.created, r.resolved, r.backlog]));
    const slot = (W - 2 * M) / Math.max(1, rows.length), bw = Math.max(0.6, Math.min(4, slot / 4));
    doc.setDrawColor(200, 200, 200); doc.line(M, y + h, W - M, y + h);
    rows.forEach((r, i) => {
      const x = M + i * slot + slot / 2 - bw * 1.5;
      ([[r.created, [46, 134, 222]], [r.resolved, [39, 174, 96]], [r.backlog, [231, 76, 60]]] as const).forEach(([v, c], j) => {
        const bh = (v / max) * h; doc.setFillColor(c[0], c[1], c[2]); doc.rect(x + j * bw, y + h - bh, bw, bh, "F");
      });
      if (rows.length <= 16 || i % Math.ceil(rows.length / 16) === 0) { doc.setFontSize(5.5); doc.text(r.label, M + i * slot + slot / 2, y + h + 3.5, { align: "center" }); }
    });
    y += h + 6; doc.setFontSize(6.5);
    doc.setTextColor(46, 134, 222); doc.text("■ Created", M, y); doc.setTextColor(39, 174, 96); doc.text("■ Resolved", M + 20, y); doc.setTextColor(231, 76, 60); doc.text("■ Backlog", M + 42, y);
    y += 7; doc.setTextColor(40, 40, 40);
  };

  section("1. Executive Summary & KPI");
  const k = d.kpis, p = d.prevKpis;
  doc.text(`Status tren: ${d.trend}. Created ${k.created} (sebelumnya ${p.created}), Resolved ${k.resolved} (sebelumnya ${p.resolved}), SLA ${k.slaPct ?? "-"}% (sebelumnya ${p.slaPct ?? "-"}%).`, M, y, { maxWidth: W - 2 * M }); y += 6;
  table(["KPI", "Periode ini", "Periode sebelumnya"], [
    ["Total Created", k.created, p.created], ["Total Resolved", k.resolved, p.resolved],
    ["Outstanding (akhir periode)", k.outstanding, p.outstanding], ["On Progress", k.onProgress, p.onProgress],
    ["Average Resolution Time", formatDuration(k.avgResolutionMs), formatDuration(p.avgResolutionMs)],
    ["SLA Achievement (≤24 jam)", k.slaPct === null ? "-" : `${k.slaPct}%`, p.slaPct === null ? "-" : `${p.slaPct}%`],
  ]);

  section("2. Created vs Resolved & Backlog");
  bars("Harian", d.daily);
  section("3. Performa Mingguan, Bulanan & Harian");
  if (d.monthly.length > 1) bars("Bulanan", d.monthly);
  bars("Mingguan (Senin–Minggu)", d.weekly);
  table(["Minggu", "Rentang", "Created", "Resolved", "Backlog", "SLA", "Avg Durasi (jam)"],
    d.weekly.map((w) => [w.label, `${w.start.toLocaleDateString("id-ID")} – ${w.end.toLocaleDateString("id-ID")}`, w.created, w.resolved, w.backlog, w.slaPct === null ? "-" : `${w.slaPct}%`, w.avgHours]));
  if (d.monthly.length > 1) table(["Bulan", "Created", "Resolved", "Backlog", "SLA", "Avg Durasi (jam)"], d.monthly.map((m) => [m.label, m.created, m.resolved, m.backlog, m.slaPct === null ? "-" : `${m.slaPct}%`, m.avgHours]));

  section("4. SLA & Kategori Incident");
  table(["Kategori", "Jumlah", "%"], d.categories.map((c) => [c.name, c.value, k.created ? `${Math.round((c.value / k.created) * 100)}%` : "-"]));

  section("5–6. Team Performance, Ranking User NOC & Top 5 Performer");
  table(["#", "User", "Tim", "Created", "Resolved", "Avg", "SLA", "Outst.", "Rate", "Skor", "Kategori"],
    d.users.map((u, i) => [i + 1, u.name, u.teams.join(", ") || "-", u.created, u.resolved, formatDuration(u.avgResolutionMs), u.slaPct === null ? "-" : `${u.slaPct}%`, u.outstanding, `${u.resolutionRate}%`, u.score, u.tier]));
  table(["Top 5", "User", "Resolved", "SLA", "Skor"], d.users.slice(0, 5).map((u, i) => [i + 1, u.name, u.resolved, u.slaPct === null ? "-" : `${u.slaPct}%`, u.score]));

  section("7. Daftar Incident");
  const list = d.incidents.filter((i) => isCreatedIn(i, d.period) || isResolvedIn(i, d.period));
  table(["ID Incident", "Deskripsi/Kategori", "Status", "Create By", "Created At", "Resolved By", "Resolved At", "Durasi"],
    list.map((i) => [i.ticketId, `${i.constraint}${i.description ? ` — ${i.description.slice(0, 90)}` : ""}`, i.status, i.createdByName || "-", fmtDT(i.createdAt), i.resolvedAt ? i.resolvedByName || "Unassigned" : "-", fmtDT(i.resolvedAt), i.resolvedAt ? formatDuration(durationMs(i)) : "-"]));

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(7); doc.setTextColor(140, 140, 140);
    doc.text(`Halaman ${i} dari ${pages}`, W - M, H - 6, { align: "right" });
    doc.text("ICONRITEL · NOC Performance", M, H - 6);
  }
  doc.save(`laporan_noc_${d.period.kind}_${d.period.start.toISOString().slice(0, 10)}.pdf`);
}
