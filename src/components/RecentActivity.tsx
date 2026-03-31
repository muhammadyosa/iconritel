import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Activity, CheckCircle, Clock, RefreshCw, Loader2, ExternalLink, Search, X, FileText, AlertTriangle, CalendarDays, User, Zap, Copy, CheckCheck, Circle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Ticket } from "@/types/ticket";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface UserOnlineInfo {
  displayName: string;
  lastOnline: string | null;
  isOnline: boolean;
  lastAction?: string;
  lastActionTime?: string;
}

interface RecentItem {
  id: string;
  type: "incident" | "shift";
  action: "created" | "resolved" | "in_progress" | "pending" | "critical" | "shift_report";
  title: string;
  detail: string;
  status?: string;
  timestamp: string;
  userName?: string;
  userId?: string;
  raw?: any;
}

type FilterCategory = "all" | "incident" | "shift";

const FILTER_OPTIONS: { value: FilterCategory; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "Semua", icon: <Activity className="h-3 w-3" /> },
  { value: "incident", label: "Incident", icon: <Zap className="h-3 w-3" /> },
  { value: "shift", label: "Shift", icon: <FileText className="h-3 w-3" /> },
];

function isUserOnline(lastOnline: string | null): boolean {
  if (!lastOnline) return false;
  const diff = Date.now() - new Date(lastOnline).getTime();
  return diff < 6 * 60 * 1000; // 6 minutes (matches 5-min heartbeat + buffer)
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin}m lalu`;
  if (diffHour < 24) return `${diffHour}j lalu`;
  if (diffDay < 7) return `${diffDay}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getActionInfo(action: RecentItem["action"]) {
  switch (action) {
    case "created":
      return { label: "Incident Dibuat", icon: <Zap className="h-3.5 w-3.5" />, color: "text-primary", bg: "bg-primary/10 ring-1 ring-primary/20" };
    case "resolved":
      return { label: "Incident Resolved", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-emerald-500", bg: "bg-emerald-500/10 ring-1 ring-emerald-500/20" };
    case "in_progress":
      return { label: "On Progress", icon: <Clock className="h-3.5 w-3.5" />, color: "text-blue-500", bg: "bg-blue-500/10 ring-1 ring-blue-500/20" };
    case "pending":
      return { label: "Pending", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-amber-500", bg: "bg-amber-500/10 ring-1 ring-amber-500/20" };
    case "critical":
      return { label: "Critical", icon: <AlertTriangle className="h-3.5 w-3.5" />, color: "text-destructive", bg: "bg-destructive/10 ring-1 ring-destructive/20" };
    case "shift_report":
      return { label: "Laporan Shift", icon: <FileText className="h-3.5 w-3.5" />, color: "text-amber-600", bg: "bg-amber-500/10 ring-1 ring-amber-500/20" };
    default:
      return { label: "Aktivitas", icon: <Activity className="h-3.5 w-3.5" />, color: "text-muted-foreground", bg: "bg-muted" };
  }
}

function getActionFromStatus(status: string): RecentItem["action"] {
  switch (status) {
    case "Resolved": return "resolved";
    case "On Progress": return "in_progress";
    case "Pending": return "pending";
    case "Critical": return "critical";
    default: return "created";
  }
}

export function RecentActivity() {
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback((text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      toast.success("Disalin ke clipboard");
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, shiftsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("shift_reports")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      const ticketItems: RecentItem[] = (ticketsRes.data || []).map((t) => {
        const action = getActionFromStatus(t.status);
        return {
          id: t.id,
          type: "incident" as const,
          action,
          title: t.customer_name || t.ticket_id,
          detail: `${t.constraint_type} • ${t.serpo}`,
          status: t.status,
          timestamp: t.status === "Resolved" && t.resolved_at ? t.resolved_at : t.created_at,
          userName: t.created_by_name || undefined,
          raw: t,
        };
      });

      const shiftItems: RecentItem[] = (shiftsRes.data || []).map((s) => {
        const issueCount = [s.olt_down, s.port_down, s.fat_loss, s.issues].filter(v => v && v.trim()).length;
        return {
          id: s.id,
          type: "shift" as const,
          action: "shift_report" as const,
          title: `Shift ${s.shift.charAt(0).toUpperCase() + s.shift.slice(1)}`,
          detail: issueCount > 0
            ? `${issueCount} kendala tercatat • ${new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
            : `Aman, tidak ada kendala • ${new Date(s.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`,
          status: undefined,
          timestamp: s.created_at,
          userName: s.officer,
          raw: s,
        };
      });

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
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => fetchData())
      .subscribe();

    const shiftChannel = supabase
      .channel("recent-activity-shifts")
      .on("postgres_changes", { event: "*", schema: "public", table: "shift_reports" }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ticketChannel);
      supabase.removeChannel(shiftChannel);
    };
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (filter !== "all") result = result.filter((item) => item.type === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((item) =>
        item.title.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        (item.userName || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, filter, searchQuery]);

  const counts = useMemo(() => ({
    all: items.length,
    incident: items.filter(i => i.type === "incident").length,
    shift: items.filter(i => i.type === "shift").length,
  }), [items]);

  const handleItemClick = useCallback((item: RecentItem) => {
    if (item.type === "incident" && item.raw) {
      setLoadingDetail(true);
      setTicketDialogOpen(true);
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
        status: data.status as any,
        createdAt: data.created_at,
        createdISO: data.created_iso,
        createdByName: data.created_by_name || undefined,
        createdByUserId: data.created_by_user_id || undefined,
        resolvedAt: data.resolved_at || undefined,
      };
      setSelectedTicket(ticket);
      setLoadingDetail(false);
    } else if (item.type === "shift" && item.raw) {
      setSelectedShift(item.raw);
      setShiftDialogOpen(true);
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
              <Badge variant="secondary" className="ml-1 text-[8px] px-1.5 py-0 h-4">{counts.all}</Badge>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
              disabled={loading}
              className="h-7 w-7"
              title="Refresh"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            </Button>
          </div>

          {/* Filter chips with counts */}
          <div className="flex gap-1 flex-wrap">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium transition-all border ${
                  filter === opt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:border-muted-foreground/30"
                }`}
              >
                {opt.icon}
                {opt.label}
                <span className={`ml-0.5 text-[8px] ${filter === opt.value ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
                  {counts[opt.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
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
              <p className="text-xs">{searchQuery ? "Tidak ditemukan" : "Belum ada aktivitas"}</p>
            </div>
          ) : (
            <ScrollArea className="h-[40vh] xs:h-[45vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh]">
              <AnimatePresence mode="popLayout">
                <div className="divide-y divide-border/40">
                  {filteredItems.map((item, idx) => {
                    const isIncident = item.type === "incident";
                    const actionInfo = getActionInfo(item.action);

                    return (
                      <motion.div
                        key={`${item.type}-${item.id}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.3) }}
                        className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-all hover:bg-accent/50 active:scale-[0.99] group"
                        onClick={() => handleItemClick(item)}
                      >
                        {/* Icon */}
                        <div className={`mt-0.5 shrink-0 rounded-full p-1.5 transition-transform group-hover:scale-110 ${actionInfo.bg}`}>
                          <span className={actionInfo.color}>{actionInfo.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] sm:text-[11px] font-semibold text-foreground truncate max-w-[160px] sm:max-w-[200px]">
                              {item.title}
                            </span>
                            {isIncident && item.status && <StatusBadge status={item.status as any} />}
                          </div>

                          {/* Action label */}
                          <p className={`text-[8px] sm:text-[9px] font-medium mt-0.5 ${actionInfo.color}`}>
                            {actionInfo.label}
                          </p>

                          <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-1 leading-tight">
                            {item.detail}
                          </p>

                          <div className="flex items-center gap-1.5 mt-0.5">
                            {item.userName && (
                              <span className="text-[8px] sm:text-[9px] text-muted-foreground/70 flex items-center gap-0.5">
                                <User className="h-2.5 w-2.5" />
                                {item.userName}
                              </span>
                            )}
                            <span className="text-[8px] sm:text-[9px] text-muted-foreground/50">
                              • {getTimeAgo(item.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Click hint */}
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors mt-1" />
                      </motion.div>
                    );
                  })}
                </div>
              </AnimatePresence>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Incident Detail Dialog */}
      <Dialog open={ticketDialogOpen} onOpenChange={setTicketDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Detail Incident
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
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
              <Separator />
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
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
                  <div key={field.label} className="group/field">
                    <span className="text-muted-foreground block text-[10px]">{field.label}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-foreground truncate block">{field.value || "-"}</span>
                      {field.value && (
                        <button
                          onClick={(e) => { e.stopPropagation(); copyToClipboard(field.value, field.label); }}
                          className="opacity-0 group-hover/field:opacity-100 transition-opacity"
                          title="Salin"
                        >
                          {copiedField === field.label ? (
                            <CheckCheck className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div>
                <span className="text-muted-foreground text-[10px] block">Hasil Tindak Lanjut</span>
                <div className="flex items-start gap-1 mt-0.5">
                  <p className="text-[11px] text-foreground flex-1">{selectedTicket.ticketResult || "-"}</p>
                  {selectedTicket.ticketResult && (
                    <button
                      onClick={() => copyToClipboard(selectedTicket.ticketResult, "result")}
                      title="Salin hasil"
                    >
                      {copiedField === "result" ? (
                        <CheckCheck className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              {(selectedTicket.createdByName || selectedTicket.resolvedAt) && (
                <>
                  <Separator />
                  <div className="text-[10px] text-muted-foreground space-y-0.5">
                    {selectedTicket.createdByName && (
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>Dibuat oleh <span className="font-medium text-foreground">{selectedTicket.createdByName}</span></span>
                        <span>• {new Date(selectedTicket.createdISO).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                    {selectedTicket.resolvedAt && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                        <span>Resolved: {new Date(selectedTicket.resolvedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                  </div>
                </>
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

      {/* Shift Detail Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              Detail Laporan Shift
            </DialogTitle>
          </DialogHeader>
          {selectedShift ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs">
                  Shift {selectedShift.shift?.charAt(0).toUpperCase() + selectedShift.shift?.slice(1)}
                </Badge>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(selectedShift.date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <Separator />
              <div className="space-y-2.5">
                {[
                  { label: "Petugas", value: selectedShift.officer, icon: <User className="h-3.5 w-3.5" /> },
                  { label: "OLT Down", value: selectedShift.olt_down, icon: <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> },
                  { label: "Port Down", value: selectedShift.port_down, icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> },
                  { label: "FAT Loss", value: selectedShift.fat_loss, icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> },
                  { label: "Issues", value: selectedShift.issues, icon: <Zap className="h-3.5 w-3.5 text-primary" /> },
                  { label: "Catatan", value: selectedShift.notes, icon: <FileText className="h-3.5 w-3.5 text-muted-foreground" /> },
                ].map((field) => (
                  <div key={field.label} className="group/field">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {field.icon}
                      <span className="text-[10px] font-medium text-muted-foreground">{field.label}</span>
                    </div>
                    <div className="flex items-start gap-1 pl-5">
                      <p className="text-[11px] text-foreground flex-1 whitespace-pre-wrap">
                        {field.value && field.value.trim() ? field.value : <span className="text-muted-foreground/50 italic">Tidak ada</span>}
                      </p>
                      {field.value && field.value.trim() && (
                        <button
                          onClick={() => copyToClipboard(field.value, field.label)}
                          className="opacity-0 group-hover/field:opacity-100 transition-opacity shrink-0"
                          title="Salin"
                        >
                          {copiedField === field.label ? (
                            <CheckCheck className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="text-[10px] text-muted-foreground">
                Dilaporkan: {new Date(selectedShift.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
