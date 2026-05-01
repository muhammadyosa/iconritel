import { useMemo, useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { HighlightText } from "@/components/HighlightText";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, LineChart, Line, Cell } from "recharts";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { TrendingUp, Clock, CheckCircle, BarChart3, ArrowLeft, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { toLocalDateStr, parseLocalDateStr } from "@/lib/dateUtils";
import { classifySla, isSlaOkResolved, isSlaBreachedResolved, SLA_THRESHOLD_MS } from "@/lib/sla";

interface MonthlyAnalyticsProps {
  tickets: Ticket[];
  getTrendChartData?: (days: number) => Array<{ day: string; isoDate: string; dayNum: number; total: number; resolved: number; slaOk: number }>;
  getCategoryData?: (filter: string, customDate?: string) => Array<{ name: string; value: number }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  "LINK LOSS": "hsl(217, 91%, 60%)",
  "BAD RX": "hsl(0, 84%, 60%)",
  "ONT PROBLEM": "hsl(38, 92%, 50%)",
  "FAT LOSS": "hsl(142, 71%, 45%)",
  "PORT DOWN": "hsl(280, 70%, 55%)",
  "OLT DOWN": "hsl(200, 80%, 50%)",
  "GANGGUAN ICONPLAY": "hsl(340, 75%, 55%)",
  "GANGGUAN BERULANG": "hsl(30, 80%, 50%)",
  "PENGECEKAN BERSAMA": "hsl(170, 60%, 45%)",
  "CABLE PROBLEM": "hsl(260, 50%, 55%)",
  "INTERMITTENT": "hsl(315, 60%, 50%)",
  "FAT BAD RX": "hsl(15, 85%, 55%)",
  "CABLE PROBLEM (FEEDER)": "hsl(190, 70%, 45%)",
};
const FALLBACK_COLORS = [
  "hsl(217, 91%, 60%)", "hsl(0, 84%, 60%)", "hsl(38, 92%, 50%)",
  "hsl(142, 71%, 45%)", "hsl(200, 80%, 50%)", "hsl(280, 70%, 55%)",
  "hsl(340, 75%, 55%)", "hsl(30, 80%, 50%)",
];

export function MonthlyAnalytics({ tickets, getTrendChartData, getCategoryData: getCategoryDataFromHistory }: MonthlyAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [trendFilter, setTrendFilter] = useState<string>("7");
  const [trendCustomDate, setTrendCustomDate] = useState<string>(() => toLocalDateStr(new Date()));
  const [categoryFilter, setCategoryFilter] = useState<string>("today");
  const [categoryCustomDate, setCategoryCustomDate] = useState<string>(() => toLocalDateStr(new Date()));

  // Drill-down state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillTickets, setDrillTickets] = useState<Ticket[]>([]);
  const [drillSelectedTicket, setDrillSelectedTicket] = useState<Ticket | null>(null);

  // KPI detail dialog state
  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);
  const [kpiDetailType, setKpiDetailType] = useState<"total" | "resolved" | "avg" | "sla" | null>(null);

  // KPI detail filters (segment, status, categories) — applied to "Lihat N Incident"
  const [kpiSegment, setKpiSegment] = useState<"all" | "ritel" | "feeder">("all");
  const [kpiStatus, setKpiStatus] = useState<"all" | "resolved" | "unresolved">("all");
  const [kpiSla, setKpiSla] = useState<"all" | "ontime" | "breached">("all");
  const [kpiCategories, setKpiCategories] = useState<Set<string>>(new Set());

  // Drill source — when set, drill list is computed realtime from monthTickets
  const [drillSource, setDrillSource] = useState<{
    kind: "kpi";
    type: "total" | "resolved" | "avg" | "sla";
    segment: "all" | "ritel" | "feeder";
    status: "all" | "resolved" | "unresolved";
    sla: "all" | "ontime" | "breached";
    categories: string[];
  } | null>(null);

  // Team SLA breakdown — search & sort controls (within KPI SLA dialog)
  type TeamSlaSortKey = "rate-asc" | "rate-desc" | "breach-desc" | "ok-desc" | "resolved-desc" | "team-asc";
  const [teamSlaSearch, setTeamSlaSearch] = useState("");
  const [teamSlaSort, setTeamSlaSort] = useState<TeamSlaSortKey>("rate-asc");


  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      options.push({ value, label });
    }
    return options;
  }, []);

  const monthTickets = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    return tickets.filter((t) => {
      const d = new Date(t.createdISO);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });
  }, [tickets, selectedMonth]);

  const kpis = useMemo(() => {
    const resolved = monthTickets.filter((t) => t.status === "Resolved" && t.resolvedAt);
    const totalResolutionMs = resolved.reduce(
      (sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdISO).getTime()),
      0,
    );
    const avgResolutionMs = resolved.length > 0 ? totalResolutionMs / resolved.length : 0;
    const avgResolutionHours = Math.round((avgResolutionMs / (1000 * 60 * 60)) * 10) / 10;

    // Format avg as "Xh Ym" (or "Ym" when <1h) — easier to read than "0.3h"
    let avgResolutionLabel = "—";
    if (resolved.length > 0) {
      const totalMinutes = Math.round(avgResolutionMs / 60000);
      const h = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      avgResolutionLabel = h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
    }

    // SLA Rate: compliance among RESOLVED tickets (standard ITIL definition).
    // Showing slaOk/total inflates failure when most tickets are still in progress.
    const slaCompliant = resolved.filter(isSlaOkResolved).length;
    const slaRate = resolved.length > 0 ? Math.round((slaCompliant / resolved.length) * 100) : 0;
    const slaRateLabel = resolved.length > 0 ? `${slaRate}%` : "—";

    const ritel = monthTickets.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
    const feeder = monthTickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
    const resolutionRate = monthTickets.length > 0 ? Math.round((resolved.length / monthTickets.length) * 100) : 0;

    return {
      total: monthTickets.length,
      resolved: resolved.length,
      avgResolutionHours,
      avgResolutionLabel,
      slaRate,
      slaRateLabel,
      slaCompliant,
      ritel,
      feeder,
      resolutionRate,
    };
  }, [monthTickets]);

  const selectedMonthLabel = monthOptions.find((o) => o.value === selectedMonth)?.label || selectedMonth;

  const categoryFilteredTickets = useMemo(() => {
    const today = new Date();
    if (categoryFilter === "all") return tickets;
    if (categoryFilter === "custom") {
      return tickets.filter((t) => toLocalDateStr(new Date(t.createdISO)) === categoryCustomDate);
    }
    if (categoryFilter === "today") {
      const todayStr = toLocalDateStr(today);
      return tickets.filter((t) => toLocalDateStr(new Date(t.createdISO)) === todayStr);
    }
    const days = Number(categoryFilter);
    const start = new Date(today);
    start.setDate(start.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return tickets.filter((t) => new Date(t.createdISO) >= start);
  }, [tickets, categoryFilter, categoryCustomDate]);

  const categoryData = useMemo(() => {
    // Use cloud-persisted historical data if available
    if (getCategoryDataFromHistory) {
      return getCategoryDataFromHistory(categoryFilter, categoryCustomDate);
    }
    // Fallback to live tickets
    const map = new Map<string, number>();
    categoryFilteredTickets.forEach((t) => {
      map.set(t.constraint, (map.get(t.constraint) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [categoryFilteredTickets, getCategoryDataFromHistory, categoryFilter, categoryCustomDate]);

  const dailyTrend = useMemo(() => {
    const today = new Date();
    
    // Use cloud-persisted historical data if available
    if (getTrendChartData) {
      if (trendFilter === "custom") {
        const customD = parseLocalDateStr(trendCustomDate);
        return getTrendChartData(1).length > 0
          ? [getTrendChartData(Math.max(1, Math.ceil((today.getTime() - customD.getTime()) / (1000 * 60 * 60 * 24)) + 1))
              .find(d => d.isoDate === trendCustomDate) || {
                day: customD.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                isoDate: trendCustomDate, dayNum: customD.getDate(),
                total: 0, resolved: 0, slaOk: 0,
              }]
          : [];
      }
      if (trendFilter === "all") {
        // Use max available history (30 days)
        return getTrendChartData(30).filter(d => d.total > 0 || true);
      }
      const days = Number(trendFilter);
      return getTrendChartData(days);
    }

    // Fallback to live tickets (LOCAL date for WIB accuracy)
    const data: { day: string; isoDate: string; dayNum: number; total: number; resolved: number; slaOk: number }[] = [];
    
    let days: number;
    if (trendFilter === "all") {
      const earliest = tickets.reduce((min, t) => {
        const d = new Date(t.createdISO);
        return d < min ? d : min;
      }, today);
      days = Math.max(1, Math.ceil((today.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    } else if (trendFilter === "custom") {
      const customD = parseLocalDateStr(trendCustomDate);
      const isoDate = trendCustomDate;
      const displayDay = customD.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const dayTickets = tickets.filter((t) => toLocalDateStr(new Date(t.createdISO)) === isoDate);
      const resolvedDay = dayTickets.filter((t) => t.status === "Resolved");
      const slaOk = resolvedDay.filter(isSlaOkResolved).length;
      return [{ day: displayDay, isoDate, dayNum: customD.getDate(), total: dayTickets.length, resolved: resolvedDay.length, slaOk }];
    } else {
      days = Number(trendFilter);
    }

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isoDate = toLocalDateStr(date);
      const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      
      const dayTickets = tickets.filter((t) => toLocalDateStr(new Date(t.createdISO)) === isoDate);
      const resolvedDay = dayTickets.filter((t) => t.status === "Resolved");
      const slaOk = resolvedDay.filter(isSlaOkResolved).length;
      data.push({ day: displayDay, isoDate, dayNum: date.getDate(), total: dayTickets.length, resolved: resolvedDay.length, slaOk });
    }
    return data;
  }, [tickets, trendFilter, trendCustomDate, getTrendChartData]);

  const trendConfig: ChartConfig = {
    total: { label: "Total", color: "hsl(var(--primary))" },
    resolved: { label: "Resolved", color: "hsl(142, 71%, 45%)" },
    slaOk: { label: "SLA OK", color: "hsl(200, 80%, 50%)" },
  };

  // Drill-down handlers
  const handleCategoryClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.name) {
      const constraint = data.activePayload[0].payload.name;
      const filtered = categoryFilteredTickets.filter((t) => t.constraint === constraint);
      setDrillSelectedTicket(null);
      setDrillSource(null);
      setDrillTickets(filtered);
      const filterLabel = categoryFilter === "all" ? "Semua Data" : categoryFilter === "custom" ? categoryCustomDate : categoryFilter === "today" ? "Hari ini" : `${categoryFilter} Hari`;
      setDrillTitle(`📊 ${constraint} — ${filtered.length} incident (${filterLabel})`);
      setDrillOpen(true);
    }
  };

  const handleTrendDotClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.isoDate) {
      const { isoDate, day } = data.activePayload[0].payload;
      const filtered = tickets.filter((t) => {
        const tDate = toLocalDateStr(new Date(t.createdISO));
        return tDate === isoDate;
      });
      setDrillSelectedTicket(null);
      setDrillSource(null);
      setDrillTickets(filtered);
      setDrillTitle(`📅 ${day} — ${filtered.length} incident`);
      setDrillOpen(true);
    }
  };

  const handleExportPDF = useCallback(async () => {
    try {
      toast.loading("Generating PDF...", { id: "pdf-export" });
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let y = 12;

      // === HEADER BRANDING ===
      doc.setFillColor(30, 64, 144);
      doc.rect(0, 0, pageWidth, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("PLN ICON PLUS", margin, y + 6);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Network Operation Center — Retail", margin, y + 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN PERFORMA BULANAN", pageWidth - margin, y + 6, { align: "right" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(selectedMonthLabel, pageWidth - margin, y + 12, { align: "right" });
      y = 34;
      doc.setFillColor(46, 134, 222);
      doc.rect(0, 28, pageWidth, 1.5, "F");

      // === KPI SUMMARY ===
      y += 2;
      doc.setTextColor(30, 64, 144);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Ringkasan KPI", margin, y);
      y += 6;

      const kpiBoxWidth = (pageWidth - margin * 2 - 9) / 4;
      const kpiItems = [
        { label: "Total Incident", value: String(kpis.total), sub: `R:${kpis.ritel} | F:${kpis.feeder}`, color: [30, 64, 144] as const },
        { label: "Resolved", value: String(kpis.resolved), sub: `${kpis.resolutionRate}%`, color: [39, 174, 96] as const },
        { label: "Avg Resolusi", value: kpis.avgResolutionLabel, sub: kpis.resolved > 0 ? `n=${kpis.resolved}` : "n/a", color: [243, 156, 18] as const },
        { label: "SLA Rate", value: kpis.slaRateLabel, sub: kpis.resolved > 0 ? `${kpis.slaCompliant}/${kpis.resolved} OK` : "n/a", color: (kpis.resolved === 0 ? [140, 140, 140] : kpis.slaRate >= 80 ? [39, 174, 96] : [231, 76, 60]) as readonly [number, number, number] },
      ];

      kpiItems.forEach((kpi, i) => {
        const x = margin + i * (kpiBoxWidth + 3);
        doc.setFillColor(245, 247, 252);
        doc.roundedRect(x, y, kpiBoxWidth, 20, 2, 2, "F");
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.rect(x, y, kpiBoxWidth, 1.5, "F");
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(kpi.label, x + kpiBoxWidth / 2, y + 5.5, { align: "center" });
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(kpi.value, x + kpiBoxWidth / 2, y + 13, { align: "center" });
        doc.setTextColor(140, 140, 140);
        doc.setFontSize(6);
        doc.setFont("helvetica", "normal");
        doc.text(kpi.sub, x + kpiBoxWidth / 2, y + 17.5, { align: "center" });
      });
      y += 28;

      // === CATEGORY TABLE ===
      doc.setTextColor(30, 64, 144);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Incident Category", margin, y);
      y += 3;

      if (categoryData.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["No", "Kategori", "Tipe", "Jumlah", "%"]],
          body: categoryData.map((cat, i) => [
            String(i + 1), cat.name,
            FEEDER_CONSTRAINTS_SET.has(cat.name) ? "Feeder" : "Ritel",
            String(cat.value),
            `${tickets.length > 0 ? Math.round((cat.value / tickets.length) * 100) : 0}%`,
          ]),
          headStyles: { fillColor: [30, 64, 144], fontSize: 7, cellPadding: 2 },
          bodyStyles: { fontSize: 7, cellPadding: 1.8 },
          alternateRowStyles: { fillColor: [245, 247, 252] },
          columnStyles: { 0: { cellWidth: 10, halign: "center" }, 3: { cellWidth: 18, halign: "center" }, 4: { cellWidth: 16, halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // === DAILY TREND TABLE ===
      if (y > 230) { doc.addPage(); y = 14; }
      doc.setTextColor(30, 64, 144);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Daily Trends & SLA", margin, y);
      y += 3;

      const trendRows = dailyTrend.filter((d) => d.total > 0);
      if (trendRows.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Tgl", "Total", "Resolved", "SLA OK", "SLA %"]],
          body: trendRows.map((d) => [
            d.day, String(d.total), String(d.resolved), String(d.slaOk),
            `${d.total > 0 ? Math.round((d.slaOk / d.total) * 100) : 0}%`,
          ]),
          headStyles: { fillColor: [30, 64, 144], fontSize: 7, cellPadding: 2 },
          bodyStyles: { fontSize: 7, cellPadding: 1.5 },
          alternateRowStyles: { fillColor: [245, 247, 252] },
          columnStyles: { 0: { cellWidth: 12, halign: "center" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" }, 4: { halign: "center" } },
        });
        y = (doc as any).lastAutoTable.finalY + 6;
      }

      // === TICKET LIST ===
      if (y > 200) { doc.addPage(); y = 14; }
      doc.setTextColor(30, 64, 144);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Daftar Incident (${monthTickets.length})`, margin, y);
      y += 3;

      if (monthTickets.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["No", "ID", "Customer/Host", "Kendala", "Status", "Tanggal"]],
          body: monthTickets.map((t, i) => [
            String(i + 1), t.id,
            FEEDER_CONSTRAINTS_SET.has(t.constraint) ? t.hostname : t.customerName,
            t.constraint, t.status,
            new Date(t.createdISO).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
          ]),
          headStyles: { fillColor: [30, 64, 144], fontSize: 6.5, cellPadding: 1.8 },
          bodyStyles: { fontSize: 6, cellPadding: 1.5 },
          alternateRowStyles: { fillColor: [245, 247, 252] },
          columnStyles: { 0: { cellWidth: 8, halign: "center" }, 4: { cellWidth: 20, halign: "center" }, 5: { cellWidth: 20, halign: "center" } },
          didParseCell: (data: any) => {
            if (data.section === "body" && data.column.index === 4) {
              const s = data.cell.raw;
              if (s === "Resolved") data.cell.styles.textColor = [39, 174, 96];
              else if (s === "Critical") data.cell.styles.textColor = [231, 76, 60];
              else if (s === "On Progress") data.cell.styles.textColor = [243, 156, 18];
            }
          },
        });
      }

      // === FOOTER ===
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        const footerY = doc.internal.pageSize.getHeight() - 8;
        doc.setFillColor(245, 247, 252);
        doc.rect(0, footerY - 3, pageWidth, 12, "F");
        doc.setDrawColor(30, 64, 144);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(6);
        doc.text(`PLN ICON PLUS — Laporan ${selectedMonthLabel}`, margin, footerY + 1);
        doc.text(`Hal ${p}/${totalPages}`, pageWidth - margin, footerY + 1, { align: "right" });
        doc.text(`Dicetak: ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, footerY + 1, { align: "center" });
      }

      doc.save(`Laporan-Performa-${selectedMonth}-PLN-IconPlus.pdf`);
      toast.success("PDF berhasil diunduh!", { id: "pdf-export" });
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Gagal generate PDF", { id: "pdf-export" });
    }
  }, [monthTickets, kpis, categoryData, dailyTrend, selectedMonth, selectedMonthLabel]);

  // Custom Y-axis tick with emoji-style for category chart
  const CustomCategoryTick = ({ x, y, payload }: any) => {
    const isFeeder = FEEDER_CONSTRAINTS_SET.has(payload.value);
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={-8} y={-7} textAnchor="end" fontSize={12} className="select-none">
          {isFeeder ? "🏬" : "🏠"}
        </text>
        <text x={-8} y={7} textAnchor="end" fontSize={8} fill="hsl(var(--muted-foreground))">
          {payload.value.length > 14 ? payload.value.slice(0, 14) + "…" : payload.value}
        </text>
      </g>
    );
  };

  // Apply KPI filters to a base list — used both inside the dialog and the drill list
  const applyKpiFilters = useCallback((list: Ticket[], categoriesSet: Set<string>) => {
    return list.filter((t) => {
      if (kpiSegment === "ritel" && FEEDER_CONSTRAINTS_SET.has(t.constraint)) return false;
      if (kpiSegment === "feeder" && !FEEDER_CONSTRAINTS_SET.has(t.constraint)) return false;
      if (kpiStatus === "resolved" && t.status !== "Resolved") return false;
      if (kpiStatus === "unresolved" && t.status === "Resolved") return false;
      if (kpiSla !== "all") {
        const cls = classifySla(t);
        if (kpiSla === "ontime" && cls !== "ontime") return false;
        if (kpiSla === "breached" && cls !== "breached") return false;
      }
      if (categoriesSet.size > 0 && !categoriesSet.has(t.constraint)) return false;
      return true;
    });
  }, [kpiSegment, kpiStatus, kpiSla, classifySla]);

  // ===== KPI Detail computation =====
  const kpiDetail = useMemo(() => {
    if (!kpiDetailType) return null;
    const total = monthTickets.length;
    const resolved = monthTickets.filter((t) => t.status === "Resolved");
    const unresolved = monthTickets.filter((t) => t.status !== "Resolved");
    const slaOk = monthTickets.filter(isSlaOkResolved);
    const slaBreached = monthTickets.filter(isSlaBreachedResolved);

    if (kpiDetailType === "total") {
      const byStatus = new Map<string, number>();
      const byCategory = new Map<string, number>();
      monthTickets.forEach((t) => {
        byStatus.set(t.status, (byStatus.get(t.status) || 0) + 1);
        byCategory.set(t.constraint, (byCategory.get(t.constraint) || 0) + 1);
      });
      return {
        title: `🗃️ Total Incident — ${selectedMonthLabel}`,
        emoji: "🗃️",
        tone: "primary" as const,
        summary: `Total ${total} incident tercatat (${kpis.ritel} Ritel, ${kpis.feeder} Feeder).`,
        metrics: [
          { label: "Total", value: total, tone: "primary" as const },
          { label: "🏠 Ritel", value: kpis.ritel, tone: "primary" as const },
          { label: "🏬 Feeder", value: kpis.feeder, tone: "primary" as const },
          { label: "✅ Resolved", value: resolved.length, tone: "success" as const },
          { label: "⏳ Belum", value: unresolved.length, tone: "warning" as const },
        ],
        breakdownTitle: "Distribusi Status & Kategori",
        statusBreakdown: Array.from(byStatus.entries()).sort((a, b) => b[1] - a[1]),
        categoryBreakdown: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
        basePool: monthTickets,
        tickets: applyKpiFilters(monthTickets, kpiCategories),
      };
    }
    if (kpiDetailType === "resolved") {
      const rate = total > 0 ? Math.round((resolved.length / total) * 100) : 0;
      const ritelRes = resolved.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
      const feederRes = resolved.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
      const byResolver = new Map<string, number>();
      resolved.forEach((t) => {
        const name = t.resolvedByName || "Tidak diketahui";
        byResolver.set(name, (byResolver.get(name) || 0) + 1);
      });
      return {
        title: `✅ Resolved Incident — ${selectedMonthLabel}`,
        emoji: "✅",
        tone: "success" as const,
        summary: `${resolved.length} dari ${total} incident telah diselesaikan (${rate}%).`,
        metrics: [
          { label: "Resolved", value: resolved.length, tone: "success" as const },
          { label: "Resolution Rate", value: `${rate}%`, tone: "success" as const },
          { label: "🏠 Ritel", value: ritelRes, tone: "primary" as const },
          { label: "🏬 Feeder", value: feederRes, tone: "primary" as const },
          { label: "⏳ Pending", value: unresolved.length, tone: "warning" as const },
        ],
        breakdownTitle: "Top Resolver",
        statusBreakdown: Array.from(byResolver.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
        categoryBreakdown: [],
        basePool: resolved,
        tickets: applyKpiFilters(resolved, kpiCategories),
      };
    }
    if (kpiDetailType === "avg") {
      const durations = resolved
        .filter((t) => t.resolvedAt)
        .map((t) => ({
          ticket: t,
          hours: (new Date(t.resolvedAt!).getTime() - new Date(t.createdISO).getTime()) / 3600000,
        }));
      const fast = durations.filter((d) => d.hours <= 4).length;
      const medium = durations.filter((d) => d.hours > 4 && d.hours <= 24).length;
      const slow = durations.filter((d) => d.hours > 24).length;
      const longest = [...durations].sort((a, b) => b.hours - a.hours).slice(0, 5);
      const fastest = [...durations].sort((a, b) => a.hours - b.hours).slice(0, 5);
      const avgPool = durations.map((d) => d.ticket);
      return {
        title: `⏱️ Rata-rata Waktu Resolusi — ${selectedMonthLabel}`,
        emoji: "⏱️",
        tone: "warning" as const,
        summary: `Rata-rata waktu resolusi: ${kpis.avgResolutionHours} jam dari ${resolved.length} incident yang diselesaikan.`,
        metrics: [
          { label: "Avg Waktu", value: `${kpis.avgResolutionHours}h`, tone: "warning" as const },
          { label: "⚡ ≤ 4 jam", value: fast, tone: "success" as const },
          { label: "🕐 4–24 jam", value: medium, tone: "primary" as const },
          { label: "🐢 > 24 jam", value: slow, tone: "destructive" as const },
          { label: "Sample", value: durations.length, tone: "default" as const },
        ],
        breakdownTitle: "🐢 Resolusi Terlama (Top 5)",
        statusBreakdown: longest.map((d) => [`${d.ticket.id} — ${d.ticket.constraint}`, `${d.hours.toFixed(1)}h`] as [string, string | number]),
        categoryBreakdown: fastest.map((d) => [`${d.ticket.id} — ${d.ticket.constraint}`, `${d.hours.toFixed(1)}h`] as [string, string | number]),
        breakdownTitle2: "⚡ Resolusi Tercepat (Top 5)",
        basePool: avgPool,
        tickets: applyKpiFilters(avgPool, kpiCategories),
      };
    }
    if (kpiDetailType === "sla") {
      // SLA Rate is computed against RESOLVED tickets (consistent with the KPI card)
      const slaPct = resolved.length > 0 ? Math.round((slaOk.length / resolved.length) * 100) : 0;
      const slaPctLabel = resolved.length > 0 ? `${slaPct}%` : "—";
      const breachByCat = new Map<string, number>();
      slaBreached.forEach((t) => breachByCat.set(t.constraint, (breachByCat.get(t.constraint) || 0) + 1));

      // === SLA Rate per Tim (grouped by serpo) ===
      // For each team: total resolved, SLA OK count, breach count, and rate %.
      const teamMap = new Map<string, { resolved: number; ok: number; breach: number }>();
      resolved.forEach((t) => {
        const team = (t.serpo || "TANPA TIM").trim() || "TANPA TIM";
        const cur = teamMap.get(team) || { resolved: 0, ok: 0, breach: 0 };
        cur.resolved += 1;
        if (isSlaOkResolved(t)) cur.ok += 1;
        else if (isSlaBreachedResolved(t)) cur.breach += 1;
        teamMap.set(team, cur);
      });
      const teamSlaBreakdown = Array.from(teamMap.entries())
        .map(([team, s]) => ({
          team,
          resolved: s.resolved,
          ok: s.ok,
          breach: s.breach,
          rate: s.resolved > 0 ? Math.round((s.ok / s.resolved) * 100) : 0,
        }))
        .sort((a, b) => b.rate - a.rate || b.resolved - a.resolved);

      return {
        title: `📈 SLA Compliance — ${selectedMonthLabel}`,
        emoji: "📈",
        tone: (resolved.length === 0 ? "primary" : slaPct >= 80 ? "success" : "destructive") as "success" | "destructive" | "primary",
        summary: resolved.length > 0
          ? `${slaOk.length} dari ${resolved.length} incident yang sudah resolved memenuhi SLA (≤ 24 jam). Tingkat kepatuhan: ${slaPct}%.`
          : `Belum ada incident resolved bulan ini, sehingga SLA Rate belum dapat dihitung.`,
        metrics: [
          { label: "SLA Rate", value: slaPctLabel, tone: (resolved.length === 0 ? "default" : slaPct >= 80 ? "success" : "destructive") as "success" | "destructive" | "default" },
          { label: "✅ SLA OK", value: slaOk.length, tone: "success" as const },
          { label: "❌ Breach", value: slaBreached.length, tone: "destructive" as const },
          { label: "⏳ Belum selesai", value: unresolved.length, tone: "warning" as const },
          { label: "Total", value: total, tone: "primary" as const },
        ],
        breakdownTitle: "Kategori dengan SLA Breach Terbanyak",
        statusBreakdown: Array.from(breachByCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8),
        categoryBreakdown: [],
        teamSlaBreakdown,
        basePool: slaBreached,
        tickets: applyKpiFilters(slaBreached, kpiCategories),
      };
    }
    return null;
  }, [kpiDetailType, monthTickets, kpis, selectedMonthLabel, applyKpiFilters, kpiCategories]);

  // Available categories for the filter, derived from the current KPI base pool (realtime)
  const kpiAvailableCategories = useMemo(() => {
    if (!kpiDetail) return [] as string[];
    const set = new Set<string>();
    (kpiDetail as any).basePool?.forEach((t: Ticket) => set.add(t.constraint));
    return Array.from(set).sort();
  }, [kpiDetail]);

  // Auto-prune selected categories that are no longer present in the realtime pool
  // (keeps the chip selection consistent without requiring the user to close the dialog)
  useEffect(() => {
    if (!kpiDetailOpen || kpiCategories.size === 0) return;
    const available = new Set(kpiAvailableCategories);
    let changed = false;
    const next = new Set<string>();
    kpiCategories.forEach((c) => {
      if (available.has(c)) next.add(c);
      else changed = true;
    });
    if (changed) setKpiCategories(next);
  }, [kpiAvailableCategories, kpiDetailOpen, kpiCategories]);

  // When the user changes the selected month, KPI cards / charts / tables must
  // all reflect the new month immediately. Close any open drill / KPI dialog
  // and clear snapshot drill state so a stale list from the previous month
  // can never be shown.
  useEffect(() => {
    setDrillOpen(false);
    setKpiDetailOpen(false);
    setDrillSelectedTicket(null);
    setDrillSource(null);
    setDrillTickets([]);
    setDrillTitle("");
    setTeamSlaSearch("");
    setTeamSlaSort("rate-asc");
  }, [selectedMonth]);

  // Realtime-derived drill list when source = "kpi"
  const realtimeDrillTickets = useMemo(() => {
    if (!drillSource || drillSource.kind !== "kpi") return null;
    // Recompute base pool for the active type from current monthTickets
    const resolved = monthTickets.filter((t) => t.status === "Resolved");
    const slaBreached = monthTickets.filter(isSlaBreachedResolved);
    let pool: Ticket[] = monthTickets;
    if (drillSource.type === "resolved") pool = resolved;
    else if (drillSource.type === "sla") pool = slaBreached;
    else if (drillSource.type === "avg") {
      pool = resolved.filter((t) => t.resolvedAt);
    }
    const cats = new Set(drillSource.categories);
    return pool.filter((t) => {
      if (drillSource.segment === "ritel" && FEEDER_CONSTRAINTS_SET.has(t.constraint)) return false;
      if (drillSource.segment === "feeder" && !FEEDER_CONSTRAINTS_SET.has(t.constraint)) return false;
      if (drillSource.status === "resolved" && t.status !== "Resolved") return false;
      if (drillSource.status === "unresolved" && t.status === "Resolved") return false;
      if (drillSource.sla !== "all") {
        const cls = classifySla(t);
        if (drillSource.sla === "ontime" && cls !== "ontime") return false;
        if (drillSource.sla === "breached" && cls !== "breached") return false;
      }
      if (cats.size > 0 && !cats.has(t.constraint)) return false;
      return true;
    });
  }, [drillSource, monthTickets, classifySla]);

  // Effective drill list (realtime when from KPI, snapshot for chart drill-downs)
  const effectiveDrillTickets = realtimeDrillTickets ?? drillTickets;

  const openKpiDetail = (type: "total" | "resolved" | "avg" | "sla") => {
    setKpiDetailType(type);
    setKpiSegment("all");
    setKpiStatus("all");
    setKpiSla("all");
    setKpiCategories(new Set());
    setKpiDetailOpen(true);
  };

  const openTicketsFromKpi = () => {
    if (!kpiDetail || !kpiDetailType) return;
    setDrillSelectedTicket(null);
    setDrillSource({
      kind: "kpi",
      type: kpiDetailType,
      segment: kpiSegment,
      status: kpiStatus,
      sla: kpiSla,
      categories: Array.from(kpiCategories),
    });
    setDrillTitle(`${kpiDetail.emoji} Incident terkait`);
    setKpiDetailOpen(false);
    setDrillOpen(true);
  };

  const toggleKpiCategory = (cat: string) => {
    setKpiCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };


  return (
    <div className="space-y-3">
      {/* Header - matches Status Distribution / Category Trend style */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          Monthly Performance Analysis
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] sm:text-xs px-2 sm:px-3"
            onClick={handleExportPDF}
            disabled={monthTickets.length === 0}
          >
            <FileDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[120px] sm:w-[170px] h-7 text-[10px] sm:text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Summary - compact cards with glow effect matching Dashboard KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {([
          {
            type: "total" as const,
            emoji: "🗃️", title: "Total Incident", value: kpis.total,
            sub: `🏠 ${kpis.ritel} • 🏬 ${kpis.feeder}`,
            bgClass: "bg-primary/8 hover:bg-primary/15", borderClass: "border-primary/30 hover:border-primary/50",
            valueClass: "text-primary", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--primary)/0.3)]",
            tooltip: "Total incident bulan ini (Ritel + Feeder). Klik untuk detail.",
          },
          {
            type: "resolved" as const,
            emoji: "✅", title: "Resolved", value: kpis.resolved,
            sub: kpis.total > 0 ? `${kpis.resolutionRate}% selesai` : "Belum ada data",
            bgClass: "bg-success/8 hover:bg-success/15", borderClass: "border-success/30 hover:border-success/50",
            valueClass: "text-success", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--success)/0.3)]",
            tooltip: "Incident dengan status Resolved. Klik untuk detail.",
          },
          {
            type: "avg" as const,
            emoji: "⏱️", title: "Avg Resolusi", value: kpis.avgResolutionLabel,
            sub: kpis.resolved > 0 ? `dari ${kpis.resolved} resolved` : "Belum ada resolved",
            bgClass: "bg-warning/8 hover:bg-warning/15", borderClass: "border-warning/30 hover:border-warning/50",
            valueClass: "text-warning", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--warning)/0.3)]",
            tooltip: "Rata-rata waktu penyelesaian incident. Klik untuk detail.",
          },
          {
            type: "sla" as const,
            emoji: "📈", title: "SLA Rate", value: kpis.slaRateLabel,
            sub: kpis.resolved > 0 ? `${kpis.slaCompliant}/${kpis.resolved} ≤ 24h` : "Belum ada resolved",
            bgClass: kpis.resolved === 0
              ? "bg-muted/30 hover:bg-muted/50"
              : kpis.slaRate >= 80 ? "bg-success/8 hover:bg-success/15" : "bg-destructive/8 hover:bg-destructive/15",
            borderClass: kpis.resolved === 0
              ? "border-muted-foreground/20 hover:border-muted-foreground/40"
              : kpis.slaRate >= 80 ? "border-success/30 hover:border-success/50" : "border-destructive/30 hover:border-destructive/50",
            valueClass: kpis.resolved === 0
              ? "text-muted-foreground"
              : kpis.slaRate >= 80 ? "text-success" : "text-destructive",
            glowClass: kpis.resolved === 0
              ? ""
              : kpis.slaRate >= 80 ? "hover:shadow-[0_0_15px_-4px_hsl(var(--success)/0.3)]" : "hover:shadow-[0_0_15px_-4px_hsl(var(--destructive)/0.3)]",
            tooltip: "Tingkat kepatuhan SLA (≤24 jam) di antara incident yang sudah resolved. Klik untuk detail.",
          },
        ]).map((card, i) => (
          <button
            key={i}
            type="button"
            onClick={() => openKpiDetail(card.type)}
            className={`text-left rounded-lg border p-2 sm:p-2.5 transition-all duration-300 cursor-pointer active:scale-[0.97] ${card.bgClass} ${card.borderClass} ${card.glowClass}`}
            title={card.tooltip}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm sm:text-base">{card.emoji}</span>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate">{card.title}</p>
            </div>
            <p className={`text-xl sm:text-2xl font-bold tabular-nums text-center leading-tight ${card.valueClass}`}>{card.value}</p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 text-center mt-0.5 truncate">{card.sub}</p>
          </button>
        ))}
      </div>

      {/* Charts - matching Status Distribution / Category Trend card style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Category Breakdown */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
             <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
                <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                Incident Category
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-7 text-[10px] sm:text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hari ini</SelectItem>
                    <SelectItem value="all">Semua Data</SelectItem>
                    <SelectItem value="7">7 Hari</SelectItem>
                    <SelectItem value="14">14 Hari</SelectItem>
                    <SelectItem value="30">30 Hari</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {categoryFilter === "custom" && (
                  <input
                    type="date"
                    value={categoryCustomDate}
                    onChange={(e) => setCategoryCustomDate(e.target.value)}
                    className="h-7 text-[10px] sm:text-xs px-2 rounded-md border border-input bg-background"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {categoryData.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data</p>
            ) : (
              <>
                <ChartContainer
                  config={{ value: { label: "Jumlah" } }}
                  className="h-[180px] xs:h-[190px] sm:h-[210px] md:h-[240px] w-full transition-all duration-300"
                >
                  <BarChart
                    data={categoryData}
                    layout="vertical"
                    margin={{ top: 8, right: 15, left: 5, bottom: 8 }}
                    barCategoryGap="20%"
                    onClick={handleCategoryClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={<CustomCategoryTick />} width={80} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} cursor="pointer" maxBarSize={24}>
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[entry.name] || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-1">
                  Klik bar untuk detail
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                Daily Trends & SLA Compliance
              </CardTitle>
              <div className="flex items-center gap-1.5">
                <Select value={trendFilter} onValueChange={setTrendFilter}>
                  <SelectTrigger className="w-[100px] sm:w-[120px] h-7 text-[10px] sm:text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Data</SelectItem>
                    <SelectItem value="7">7 Hari</SelectItem>
                    <SelectItem value="14">14 Hari</SelectItem>
                    <SelectItem value="30">30 Hari</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {trendFilter === "custom" && (
                  <input
                    type="date"
                    value={trendCustomDate}
                    onChange={(e) => setTrendCustomDate(e.target.value)}
                    className="h-7 text-[10px] sm:text-xs px-2 rounded-md border border-input bg-background"
                  />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-3">
            {dailyTrend.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tidak ada data</p>
            ) : (
              <>
                <ChartContainer config={trendConfig} className="h-[180px] xs:h-[190px] sm:h-[210px] md:h-[240px] w-full transition-all duration-300">
                  <LineChart
                    data={dailyTrend}
                    margin={{ top: 5, right: 15, left: 5, bottom: 5 }}
                    onClick={handleTrendDotClick}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={dailyTrend.length > 14 ? 3 : dailyTrend.length > 7 ? 1 : 0} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={25} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ r: 2, cursor: "pointer" }} activeDot={{ r: 5, cursor: "pointer" }} />
                    <Line type="monotone" dataKey="resolved" stroke="var(--color-resolved)" strokeWidth={2} dot={{ r: 2, cursor: "pointer" }} activeDot={{ r: 5, cursor: "pointer" }} />
                    <Line type="monotone" dataKey="slaOk" stroke="var(--color-slaOk)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  </LineChart>
                </ChartContainer>
                <div className="flex items-center justify-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-2.5 h-0.5 rounded bg-primary inline-block" /> Total
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-2.5 h-0.5 rounded inline-block" style={{ background: "hsl(142, 71%, 45%)" }} /> Resolved
                  </span>
                  <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span className="w-2.5 h-0.5 rounded inline-block border-dashed border-t" style={{ borderColor: "hsl(200, 80%, 50%)" }} /> SLA OK
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-0.5">
                  Klik titik untuk detail
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down Dialog */}
      <Dialog open={drillOpen} onOpenChange={(open) => { setDrillOpen(open); if (!open) setDrillSelectedTicket(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-4">
          <DialogHeader className="flex-shrink-0">
            {drillSelectedTicket ? (
              <DialogTitle className="flex items-center gap-2 text-sm">
                <Button variant="default" size="sm" className="rounded-full h-7 px-3 text-xs" onClick={() => setDrillSelectedTicket(null)}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> Kembali
                </Button>
                <span className="truncate">Detail Incident</span>
              </DialogTitle>
            ) : (
              <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
                <span className="truncate">{drillTitle}</span>
                <span className="ml-auto text-[10px] font-bold text-primary tabular-nums shrink-0">
                  {effectiveDrillTickets.length}
                </span>
                {drillSource?.kind === "kpi" && (
                  <span className="text-[9px] font-normal text-muted-foreground bg-success/10 border border-success/30 text-success rounded-full px-2 py-0.5 shrink-0">
                    ● Live
                  </span>
                )}
              </DialogTitle>
            )}
          </DialogHeader>

          <div className="mt-2 flex-1 overflow-auto min-h-0">
            <AnimatePresence mode="wait">
              {drillSelectedTicket ? (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={drillSelectedTicket.status} />
                    <Badge variant="outline" className="text-[10px]">{drillSelectedTicket.constraint}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{drillSelectedTicket.category}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {[
                      { label: "ID Incident", value: drillSelectedTicket.id },
                      { label: "Service ID", value: drillSelectedTicket.serviceId },
                      { label: "Customer", value: drillSelectedTicket.customerName },
                      { label: "Hostname", value: drillSelectedTicket.hostname },
                      { label: "SERPO", value: drillSelectedTicket.serpo },
                      { label: "ID FAT", value: drillSelectedTicket.fatId },
                      { label: "SN ONT", value: drillSelectedTicket.snOnt },
                      { label: "Dibuat", value: drillSelectedTicket.createdAt },
                      { label: "Oleh", value: drillSelectedTicket.createdByName || "-" },
                    ].map((item) => (
                      <div key={item.label} className="bg-muted/40 rounded p-1.5">
                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        <p className="font-medium text-[11px] break-all">{item.value || "-"}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted/40 rounded p-2">
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Incident Result:</p>
                    <p className="text-xs font-mono whitespace-pre-wrap break-all">{drillSelectedTicket.ticketResult}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-1.5"
                >
                  {effectiveDrillTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Tidak ada incident</p>
                  ) : (
                    effectiveDrillTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setDrillSelectedTicket(ticket)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <StatusBadge status={ticket.status} />
                            <span className="text-[10px] font-medium text-muted-foreground">{ticket.constraint}</span>
                          </div>
                          <p className="text-xs font-medium truncate">
                            {FEEDER_CONSTRAINTS_SET.has(ticket.constraint) ? ticket.hostname : ticket.customerName}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-[10px] font-mono text-muted-foreground">{ticket.id}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(ticket.createdISO).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex justify-end pt-2 border-t mt-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => setDrillOpen(false)}>Tutup</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* KPI Detail Dialog */}
      <Dialog open={kpiDetailOpen} onOpenChange={setKpiDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {kpiDetail && (
            <>
              <DialogHeader className="px-4 sm:px-5 pt-4 pb-2 border-b bg-muted/20 flex-shrink-0">
                <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
                  <span className="truncate">{kpiDetail.title}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium text-success bg-success/10 border border-success/30 rounded-full px-2 py-0.5 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                    Realtime
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-auto px-4 sm:px-5 py-3 space-y-3 min-h-0">
                {/* Insight summary */}
                <div className={`rounded-lg border px-3 py-2 text-[11px] sm:text-xs leading-relaxed font-medium ${
                  kpiDetail.tone === "success" ? "bg-success/10 border-success/30 text-success" :
                  kpiDetail.tone === "destructive" ? "bg-destructive/10 border-destructive/30 text-destructive" :
                  kpiDetail.tone === "warning" ? "bg-warning/10 border-warning/30 text-warning" :
                  "bg-primary/10 border-primary/30 text-primary"
                }`}>
                  💡 {kpiDetail.summary}
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {kpiDetail.metrics.map((m, i) => {
                    const toneColor =
                      m.tone === "success" ? "text-success border-success/20 bg-success/5" :
                      m.tone === "destructive" ? "text-destructive border-destructive/20 bg-destructive/5" :
                      m.tone === "warning" ? "text-warning border-warning/20 bg-warning/5" :
                      m.tone === "primary" ? "text-primary border-primary/20 bg-primary/5" :
                      "text-foreground border-border/40 bg-muted/30";
                    return (
                      <div key={i} className={`rounded-md border p-2 ${toneColor}`}>
                        <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground truncate">{m.label}</div>
                        <div className="text-base sm:text-lg font-bold tabular-nums leading-tight mt-0.5">{m.value}</div>
                      </div>
                    );
                  })}
                </div>

                {/* === Filter Section === */}
                <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1.5">
                      🔎 Filter Incident
                    </h4>
                    {(kpiSegment !== "all" || kpiStatus !== "all" || kpiSla !== "all" || kpiCategories.size > 0) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          setKpiSegment("all");
                          setKpiStatus("all");
                          setKpiSla("all");
                          setKpiCategories(new Set());
                        }}
                      >
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* Segment Ritel/Feeder */}
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Segment</p>
                    <div className="flex flex-wrap gap-1">
                      {([
                        { v: "all", label: "Semua", emoji: "🌐" },
                        { v: "ritel", label: "Ritel", emoji: "🏠" },
                        { v: "feeder", label: "Feeder", emoji: "🏬" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setKpiSegment(opt.v)}
                          className={`px-2 py-1 rounded-md border text-[10px] transition-all ${
                            kpiSegment === opt.v
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background border-border/50 hover:bg-muted text-foreground/80"
                          }`}
                        >
                          {opt.emoji} {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Status — hanya relevan saat basePool berisi campuran (mis. "total") */}
                  {kpiDetailType === "total" && (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Status</p>
                      <div className="flex flex-wrap gap-1">
                        {([
                          { v: "all", label: "Semua", cls: "bg-primary text-primary-foreground border-primary" },
                          { v: "resolved", label: "✅ Resolved", cls: "bg-success text-success-foreground border-success" },
                          { v: "unresolved", label: "⏳ Belum", cls: "bg-warning text-warning-foreground border-warning" },
                        ] as const).map((opt) => (
                          <button
                            key={opt.v}
                            type="button"
                            onClick={() => setKpiStatus(opt.v)}
                            className={`px-2 py-1 rounded-md border text-[10px] transition-all ${
                              kpiStatus === opt.v
                                ? `${opt.cls} shadow-sm`
                                : "bg-background border-border/50 hover:bg-muted text-foreground/80"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SLA — applies to every KPI type. 24-jam threshold sesuai konvensi SLA Compliance. */}
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground">SLA</p>
                    <div className="flex flex-wrap gap-1">
                      {([
                        { v: "all", label: "Semua", cls: "bg-primary text-primary-foreground border-primary" },
                        { v: "ontime", label: "✅ On Time", cls: "bg-success text-success-foreground border-success" },
                        { v: "breached", label: "⛔ Breached", cls: "bg-destructive text-destructive-foreground border-destructive" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.v}
                          type="button"
                          onClick={() => setKpiSla(opt.v)}
                          className={`px-2 py-1 rounded-md border text-[10px] transition-all ${
                            kpiSla === opt.v
                              ? `${opt.cls} shadow-sm`
                              : "bg-background border-border/50 hover:bg-muted text-foreground/80"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-muted-foreground/70">
                      Threshold 24 jam · Breached mencakup resolved &gt; 24 jam dan unresolved yang sudah lewat batas.
                    </p>
                  </div>

                  {/* Categories */}
                  {kpiAvailableCategories.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                        <span>Kategori Kendala {kpiCategories.size > 0 && `(${kpiCategories.size} dipilih)`}</span>
                        <span className="text-muted-foreground/60 normal-case">Klik untuk pilih multi</span>
                      </p>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-auto">
                        {kpiAvailableCategories.map((cat) => {
                          const active = kpiCategories.has(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => toggleKpiCategory(cat)}
                              className={`px-2 py-0.5 rounded-full border text-[9px] transition-all ${
                                active
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background border-border/50 hover:bg-muted text-foreground/70"
                              }`}
                            >
                              {FEEDER_CONSTRAINTS_SET.has(cat) ? "🏬" : "🏠"} {cat}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <span className="text-[10px] text-muted-foreground">Hasil filter</span>
                    <span className="text-[11px] font-bold text-primary tabular-nums">
                      {kpiDetail.tickets.length} incident
                    </span>
                  </div>
                </div>

                {/* Breakdown 1 */}
                {kpiDetail.statusBreakdown.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-foreground">{kpiDetail.breakdownTitle}</h4>
                    <ul className="space-y-1 text-[10px] sm:text-xs">
                      {kpiDetail.statusBreakdown.map(([label, value], i) => (
                        <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-border/30 bg-muted/10">
                          <span className="text-foreground/80 truncate flex-1">{label}</span>
                          <span className="font-bold tabular-nums shrink-0 text-primary">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Breakdown 2 (avg only) */}
                {kpiDetailType === "avg" && kpiDetail.categoryBreakdown.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-foreground">{(kpiDetail as any).breakdownTitle2}</h4>
                    <ul className="space-y-1 text-[10px] sm:text-xs">
                      {kpiDetail.categoryBreakdown.map(([label, value], i) => (
                        <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-border/30 bg-muted/10">
                          <span className="text-foreground/80 truncate flex-1">{label}</span>
                          <span className="font-bold tabular-nums shrink-0 text-success">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Top category breakdown for total */}
                {kpiDetailType === "total" && kpiDetail.categoryBreakdown.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-foreground">Top Kategori Kendala</h4>
                    <ul className="space-y-1 text-[10px] sm:text-xs">
                      {kpiDetail.categoryBreakdown.map(([label, value], i) => (
                        <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-border/30 bg-muted/10">
                          <span className="text-foreground/80 truncate flex-1 flex items-center gap-1">
                            <span>{FEEDER_CONSTRAINTS_SET.has(label) ? "🏬" : "🏠"}</span>
                            {label}
                          </span>
                          <span className="font-bold tabular-nums shrink-0 text-primary">{value}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* SLA Rate per Tim — only for SLA card */}
                {kpiDetailType === "sla" && (kpiDetail as any).teamSlaBreakdown?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1.5">
                      👥 SLA Rate per Tim (≤ 24 jam)
                      <span className="text-[9px] font-normal text-muted-foreground">basis: resolved</span>
                    </h4>
                    <ul className="space-y-1 text-[10px] sm:text-xs max-h-56 overflow-auto pr-1">
                      {((kpiDetail as any).teamSlaBreakdown as Array<{ team: string; resolved: number; ok: number; breach: number; rate: number }>).map((row) => {
                        const tone =
                          row.rate >= 80 ? "text-success border-success/30 bg-success/5" :
                          row.rate >= 50 ? "text-warning border-warning/30 bg-warning/5" :
                          "text-destructive border-destructive/30 bg-destructive/5";
                        return (
                          <li
                            key={row.team}
                            className="rounded border border-border/30 bg-muted/10 px-2 py-1.5 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground/90 truncate flex-1">{row.team}</span>
                              <span className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${tone}`}>
                                {row.rate}%
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[9px] text-muted-foreground tabular-nums">
                              <span>✅ {row.ok} OK</span>
                              <span>❌ {row.breach} Breach</span>
                              <span className="ml-auto">n={row.resolved}</span>
                            </div>
                            {/* Mini progress bar */}
                            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className={
                                  row.rate >= 80 ? "h-full bg-success" :
                                  row.rate >= 50 ? "h-full bg-warning" :
                                  "h-full bg-destructive"
                                }
                                style={{ width: `${row.rate}%` }}
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-[9px] text-muted-foreground/70">
                      Tim diambil dari field SERPO. Persentase = SLA OK / Resolved per tim.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center gap-2 px-4 sm:px-5 py-2 border-t bg-muted/10 flex-shrink-0">
                <Button
                  variant="default"
                  size="sm"
                  className="text-xs"
                  onClick={openTicketsFromKpi}
                  disabled={!kpiDetail.tickets || kpiDetail.tickets.length === 0}
                >
                  Lihat {kpiDetail.tickets.length} Incident
                </Button>
                <Button variant="outline" size="sm" onClick={() => setKpiDetailOpen(false)}>Tutup</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
