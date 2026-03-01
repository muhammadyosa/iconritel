import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

interface MonthlyAnalyticsProps {
  tickets: Ticket[];
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

export function MonthlyAnalytics({ tickets }: MonthlyAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [trendDays, setTrendDays] = useState<number>(7);

  // Drill-down state
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillTitle, setDrillTitle] = useState("");
  const [drillTickets, setDrillTickets] = useState<Ticket[]>([]);
  const [drillSelectedTicket, setDrillSelectedTicket] = useState<Ticket | null>(null);

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
    const resolved = monthTickets.filter((t) => t.status === "Resolved");
    const totalResolutionMs = resolved.reduce((sum, t) => {
      if (t.resolvedAt) {
        return sum + (new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime());
      }
      return sum;
    }, 0);
    const avgResolutionMs = resolved.length > 0 ? totalResolutionMs / resolved.length : 0;
    const avgResolutionHours = Math.round((avgResolutionMs / (1000 * 60 * 60)) * 10) / 10;

    const slaCompliant = monthTickets.filter((t) => {
      if (t.status === "Resolved" && t.resolvedAt) {
        const resMs = new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime();
        return resMs <= 24 * 60 * 60 * 1000;
      }
      return false;
    }).length;
    const slaRate = monthTickets.length > 0 ? Math.round((slaCompliant / monthTickets.length) * 100) : 0;

    const ritel = monthTickets.filter((t) => !FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
    const feeder = monthTickets.filter((t) => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;

    return { total: monthTickets.length, resolved: resolved.length, avgResolutionHours, slaRate, slaCompliant, ritel, feeder };
  }, [monthTickets]);

  const selectedMonthLabel = monthOptions.find((o) => o.value === selectedMonth)?.label || selectedMonth;

  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      map.set(t.constraint, (map.get(t.constraint) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [tickets]);

  const dailyTrend = useMemo(() => {
    const today = new Date();
    const data: { day: string; isoDate: string; dayNum: number; total: number; resolved: number; slaOk: number }[] = [];
    
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isoDate = date.toISOString().split('T')[0];
      const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      
      const dayTickets = tickets.filter((t) => {
        const tDate = new Date(t.createdISO).toISOString().split('T')[0];
        return tDate === isoDate;
      });
      const resolvedDay = dayTickets.filter((t) => t.status === "Resolved");
      const slaOk = resolvedDay.filter((t) => {
        if (t.resolvedAt) {
          const ms = new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime();
          return ms <= 24 * 60 * 60 * 1000;
        }
        return false;
      }).length;
      data.push({ day: displayDay, isoDate, dayNum: date.getDate(), total: dayTickets.length, resolved: resolvedDay.length, slaOk });
    }
    return data;
  }, [tickets, trendDays]);

  const trendConfig: ChartConfig = {
    total: { label: "Total", color: "hsl(var(--primary))" },
    resolved: { label: "Resolved", color: "hsl(142, 71%, 45%)" },
    slaOk: { label: "SLA OK", color: "hsl(200, 80%, 50%)" },
  };

  // Drill-down handlers
  const handleCategoryClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.name) {
      const constraint = data.activePayload[0].payload.name;
      const filtered = tickets.filter((t) => t.constraint === constraint);
      setDrillSelectedTicket(null);
      setDrillTickets(filtered);
      setDrillTitle(`📊 ${constraint} — ${filtered.length} tiket`);
      setDrillOpen(true);
    }
  };

  const handleTrendDotClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload?.isoDate) {
      const { isoDate, day } = data.activePayload[0].payload;
      const filtered = tickets.filter((t) => {
        const tDate = new Date(t.createdISO).toISOString().split('T')[0];
        return tDate === isoDate;
      });
      setDrillSelectedTicket(null);
      setDrillTickets(filtered);
      setDrillTitle(`📅 ${day} — ${filtered.length} tiket`);
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
        { label: "Total Tiket", value: String(kpis.total), sub: `R:${kpis.ritel} | F:${kpis.feeder}`, color: [30, 64, 144] as const },
        { label: "Resolved", value: String(kpis.resolved), sub: `${kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0}%`, color: [39, 174, 96] as const },
        { label: "Avg Resolusi", value: `${kpis.avgResolutionHours}h`, sub: "rata-rata", color: [243, 156, 18] as const },
        { label: "SLA Rate", value: `${kpis.slaRate}%`, sub: `${kpis.slaCompliant} OK`, color: (kpis.slaRate >= 80 ? [39, 174, 96] : [231, 76, 60]) as readonly [number, number, number] },
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
      doc.text("Tiket per Kategori", margin, y);
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
      doc.text("Tren Harian & SLA", margin, y);
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
      doc.text(`Daftar Tiket (${monthTickets.length})`, margin, y);
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

  

  return (
    <div className="space-y-3">
      {/* Header - matches Status Distribution / Category Trend style */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
          <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          Analisis Performa Bulanan
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
        {[
          {
            emoji: "🗃️", title: "Total Tiket", value: kpis.total,
            bgClass: "bg-primary/8 hover:bg-primary/15", borderClass: "border-primary/30 hover:border-primary/50",
            valueClass: "text-primary", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--primary)/0.3)]",
          },
          {
            emoji: "✅", title: "Resolved", value: kpis.resolved,
            bgClass: "bg-success/8 hover:bg-success/15", borderClass: "border-success/30 hover:border-success/50",
            valueClass: "text-success", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--success)/0.3)]",
          },
          {
            emoji: "⏱️", title: "Avg Resolusi", value: `${kpis.avgResolutionHours}h`,
            bgClass: "bg-warning/8 hover:bg-warning/15", borderClass: "border-warning/30 hover:border-warning/50",
            valueClass: "text-warning", glowClass: "hover:shadow-[0_0_15px_-4px_hsl(var(--warning)/0.3)]",
          },
          {
            emoji: "📈", title: "SLA Rate", value: `${kpis.slaRate}%`,
            bgClass: kpis.slaRate >= 80 ? "bg-success/8 hover:bg-success/15" : "bg-destructive/8 hover:bg-destructive/15",
            borderClass: kpis.slaRate >= 80 ? "border-success/30 hover:border-success/50" : "border-destructive/30 hover:border-destructive/50",
            valueClass: kpis.slaRate >= 80 ? "text-success" : "text-destructive",
            glowClass: kpis.slaRate >= 80 ? "hover:shadow-[0_0_15px_-4px_hsl(var(--success)/0.3)]" : "hover:shadow-[0_0_15px_-4px_hsl(var(--destructive)/0.3)]",
          },
        ].map((card, i) => (
          <div key={i} className={`rounded-lg border p-2 sm:p-2.5 transition-all duration-300 cursor-default ${card.bgClass} ${card.borderClass} ${card.glowClass}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-sm sm:text-base">{card.emoji}</span>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium truncate">{card.title}</p>
            </div>
            <p className={`text-xl sm:text-2xl font-bold tabular-nums text-center ${card.valueClass}`}>{card.value}</p>
            
          </div>
        ))}
      </div>

      {/* Charts - matching Status Distribution / Category Trend card style */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
        {/* Category Breakdown */}
        <Card className="overflow-hidden border">
          <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
            <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              Tiket per Kategori
            </CardTitle>
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
                Tren Harian & SLA Compliance
              </CardTitle>
              <Select value={trendDays.toString()} onValueChange={(v) => setTrendDays(Number(v))}>
                <SelectTrigger className="w-[90px] h-7 text-[10px]">
                  <SelectValue placeholder="Rentang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Hari</SelectItem>
                  <SelectItem value="14">14 Hari</SelectItem>
                  <SelectItem value="30">30 Hari</SelectItem>
                </SelectContent>
              </Select>
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
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval={trendDays > 14 ? 3 : trendDays > 7 ? 1 : 0} />
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
                <span className="truncate">Detail Tiket</span>
              </DialogTitle>
            ) : (
              <DialogTitle className="text-sm sm:text-base">{drillTitle}</DialogTitle>
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
                      { label: "ID Tiket", value: drillSelectedTicket.id },
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
                    <p className="text-[10px] font-semibold text-muted-foreground mb-1">Ticket Result:</p>
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
                  {drillTickets.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Tidak ada tiket</p>
                  ) : (
                    drillTickets.map((ticket) => (
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
    </div>
  );
}
