import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Activity, Plus, CheckCircle, Clock, Trash2, Edit, RefreshCw, Loader2, ExternalLink, Search, X, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Ticket } from "@/types/ticket";

interface RecentItem {
  id: string;
  type: "incident" | "shift";
  title: string;
  detail: string;
  status?: string;
  timestamp: string;
  userName?: string;
  raw?: any;
}

type FilterCategory = "all" | "incident" | "shift";

const FILTER_OPTIONS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "incident", label: "Incident" },
  { value: "shift", label: "Shift" },
];

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getStatusIcon(status?: string) {
  if (!status) return { icon: <FileText className="h-3 w-3" />, color: "text-muted-foreground", bg: "bg-muted" };
  switch (status) {
    case "Resolved":
      return { icon: <CheckCircle className="h-3 w-3" />, color: "text-success", bg: "bg-success/15" };
    case "On Progress":
      return { icon: <Clock className="h-3 w-3" />, color: "text-primary", bg: "bg-primary/15" };
    case "Pending":
      return { icon: <AlertTriangle className="h-3 w-3" />, color: "text-warning", bg: "bg-warning/15" };
    case "Critical":
      return { icon: <AlertTriangle className="h-3 w-3" />, color: "text-destructive", bg: "bg-destructive/15" };
    default:
      return { icon: <Activity className="h-3 w-3" />, color: "text-muted-foreground", bg: "bg-muted" };
  }
}

export function RecentActivity() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, shiftsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("shift_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      const ticketItems: RecentItem[] = (ticketsRes.data || []).map((t) => ({
        id: t.id,
        type: "incident" as const,
        title: t.customer_name || t.ticket_id,
        detail: `${t.constraint_type} • ${t.serpo} • ${t.hostname}`,
        status: t.status,
        timestamp: t.created_at,
        userName: t.created_by_name || undefined,
        raw: t,
      }));

      const shiftItems: RecentItem[] = (shiftsRes.data || []).map((s) => ({
        id: s.id,
        type: "shift" as const,
        title: `Shift ${s.shift.charAt(0).toUpperCase() + s.shift.slice(1)}`,
        detail: [
          s.olt_down && `OLT: ${s.olt_down}`,
          s.port_down && `Port: ${s.port_down}`,
          s.fat_loss && `FAT: ${s.fat_loss}`,
          s.issues && `Issues: ${s.issues}`,
        ].filter(Boolean).join(" • ") || "Tidak ada kendala",
        status: undefined,
        timestamp: s.created_at,
        userName: s.officer,
        raw: s,
      }));

      const combined = [...ticketItems, ...shiftItems].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setItems(combined);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching recent activity:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const ticketChannel = supabase
      .channel("recent-activity-tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        fetchData();
      })
      .subscribe();

    const shiftChannel = supabase
      .channel("recent-activity-shifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_reports" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(shiftChannel);
    };
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (filter !== "all") {
      result = result.filter((item) => item.type === filter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.detail.toLowerCase().includes(q) ||
          (item.userName || "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [items, filter, searchQuery]);

  const handleItemClick = useCallback(async (item: RecentItem) => {
    if (item.type !== "incident" || !item.raw) return;

    setLoadingTicket(true);
    setTicketDialogOpen(true);

    try {
      const data = item.raw;
      const ticket: Ticket = {
        id: data.id,
        serviceId: data.service_id,
        customerName: data.customer_name,
        serpo: data.serpo,
        hostname: data.hostname,
        fatId: data.fat_id,
        snOnt: data.sn_ont,
        constraint: data.constraint_type,
        category: data.category,
        ticketResult: data.ticket_result,
        status: data.status as "On Progress" | "Resolved" | "Pending" | "Critical",
        createdAt: data.created_at,
        createdISO: data.created_iso,
        createdByName: data.created_by_name || undefined,
        createdByUserId: data.created_by_user_id || undefined,
        resolvedAt: data.resolved_at || undefined,
      };
      setSelectedTicket(ticket);
    } catch {
      setSelectedTicket(null);
    } finally {
      setLoadingTicket(false);
    }
  }, []);

  return (
    <>
      <Card className="overflow-hidden border h-full">
        <CardHeader className="py-2.5 px-3 sm:px-4 border-b bg-muted/20 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Recent Activity
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={loading}
              className="h-7 w-7"
              title="Refresh"
            >
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          </div>
          {/* Filter chips */}
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium transition-colors border ${
                  filter === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, detail, atau constraint..."
              className="h-7 text-[10px] sm:text-[11px] pl-7 pr-7 bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs">Memuat aktivitas...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada aktivitas</p>
            </div>
          ) : (
            <ScrollArea className="h-[40vh] xs:h-[45vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh]">
              <div className="divide-y divide-border/50">
                {filteredItems.map((item, idx) => {
                  const isIncident = item.type === "incident";
                  const iconInfo = isIncident
                    ? getStatusIcon(item.status)
                    : { icon: <FileText className="h-3 w-3" />, color: "text-warning", bg: "bg-warning/15" };

                  return (
                    <motion.div
                      key={`${item.type}-${item.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors ${
                        isIncident ? "cursor-pointer hover:bg-primary/5" : "hover:bg-muted/30"
                      }`}
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${iconInfo.bg}`}>
                        <span className={iconInfo.color}>{iconInfo.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-foreground truncate max-w-[140px] sm:max-w-[180px]">
                            {item.title}
                          </span>
                          {isIncident && item.status && (
                            <StatusBadge status={item.status as any} />
                          )}
                          {isIncident && (
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />
                          )}
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2 leading-tight">
                          {item.detail}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {item.userName && (
                            <span className="text-[8px] sm:text-[9px] text-muted-foreground/70">
                              oleh {item.userName}
                            </span>
                          )}
                          <span className="text-[8px] sm:text-[9px] text-muted-foreground/60">
                            • {getTimeAgo(item.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* Type Badge */}
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[7px] sm:text-[8px] px-1.5 py-0 h-4 ${
                          isIncident ? "text-primary border-primary/30" : "text-warning border-warning/30"
                        }`}
                      >
                        {isIncident ? "Incident" : "Shift"}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Detail Incident
            </DialogTitle>
          </DialogHeader>
          {loadingTicket ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2 text-primary" />
              <span className="text-sm text-muted-foreground">Memuat data...</span>
            </div>
          ) : selectedTicket ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">{selectedTicket.serviceId}</span>
                <StatusBadge status={selectedTicket.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {[
                  { label: "Customer", value: selectedTicket.customerName },
                  { label: "Service ID", value: selectedTicket.serviceId },
                  { label: "Hostname", value: selectedTicket.hostname },
                  { label: "FAT ID", value: selectedTicket.fatId },
                  { label: "SN ONT", value: selectedTicket.snOnt },
                  { label: "Serpo", value: selectedTicket.serpo },
                  { label: "Kategori", value: selectedTicket.category },
                  { label: "Constraint", value: selectedTicket.constraint },
                ].map((field) => (
                  <div key={field.label}>
                    <span className="text-muted-foreground block text-[10px]">{field.label}</span>
                    <span className="font-medium text-foreground truncate block">{field.value || "-"}</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Hasil Tindak Lanjut</span>
                <p className="text-[11px] text-foreground mt-0.5">{selectedTicket.ticketResult || "-"}</p>
              </div>
              {selectedTicket.createdByName && (
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  Created by <span className="font-medium text-foreground">{selectedTicket.createdByName}</span>
                  {" • "}
                  {new Date(selectedTicket.createdISO).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Data incident tidak ditemukan</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
