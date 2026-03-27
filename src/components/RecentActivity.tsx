import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Activity, Plus, CheckCircle, Clock, Trash2, Edit, Upload, Download, RefreshCw, Loader2, ExternalLink, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getActionLabel } from "@/hooks/useActivityLog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { Ticket, FEEDER_CONSTRAINTS_SET, generateTicketFormat } from "@/types/ticket";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  detail: string | null;
  created_at: string;
  profile?: {
    display_name: string | null;
    email: string;
  };
}

type FilterCategory = "all" | "incident" | "shift" | "admin";

const FILTER_OPTIONS: { value: FilterCategory; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "incident", label: "Incident" },
  { value: "shift", label: "Shift" },
  { value: "admin", label: "Admin" },
];

const ACTION_ICONS: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  create_ticket: { icon: <Plus className="h-3 w-3" />, color: "text-success", bg: "bg-success/15" },
  update_ticket: { icon: <Edit className="h-3 w-3" />, color: "text-primary", bg: "bg-primary/15" },
  delete_ticket: { icon: <Trash2 className="h-3 w-3" />, color: "text-destructive", bg: "bg-destructive/15" },
  resolve_ticket: { icon: <CheckCircle className="h-3 w-3" />, color: "text-success", bg: "bg-success/15" },
  import_tickets: { icon: <Upload className="h-3 w-3" />, color: "text-accent", bg: "bg-accent/15" },
  export_data: { icon: <Download className="h-3 w-3" />, color: "text-muted-foreground", bg: "bg-muted" },
  bulk_delete_tickets: { icon: <Trash2 className="h-3 w-3" />, color: "text-destructive", bg: "bg-destructive/15" },
  login: { icon: <Activity className="h-3 w-3" />, color: "text-primary", bg: "bg-primary/15" },
  create_shift_report: { icon: <Plus className="h-3 w-3" />, color: "text-warning", bg: "bg-warning/15" },
  update_shift_report: { icon: <Edit className="h-3 w-3" />, color: "text-warning", bg: "bg-warning/15" },
  delete_shift_report: { icon: <Trash2 className="h-3 w-3" />, color: "text-destructive", bg: "bg-destructive/15" },
  change_role: { icon: <Activity className="h-3 w-3" />, color: "text-accent", bg: "bg-accent/15" },
  edit_username: { icon: <Edit className="h-3 w-3" />, color: "text-primary", bg: "bg-primary/15" },
  approve_user: { icon: <CheckCircle className="h-3 w-3" />, color: "text-success", bg: "bg-success/15" },
  revoke_user: { icon: <Trash2 className="h-3 w-3" />, color: "text-destructive", bg: "bg-destructive/15" },
};

function getActionCategory(action: string): "incident" | "shift" | "admin" | "system" {
  if (action.includes("ticket") || action.includes("incident")) return "incident";
  if (action.includes("shift")) return "shift";
  if (action.includes("role") || action.includes("user")) return "admin";
  return "system";
}

function getCategoryLabel(cat: string): string {
  if (cat === "incident") return "Incident";
  if (cat === "shift") return "Shift";
  if (cat === "admin") return "Admin";
  return "System";
}

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

function extractTicketId(detail: string | null): string | null {
  if (!detail) return null;
  // Try to extract ticket_id patterns like "IN123456" or from detail text
  const match = detail.match(/(?:IN\d+|ticket[_\s]?id[:\s]*([^\s,]+))/i);
  if (match) return match[0];
  return null;
}

export function RecentActivity() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { display_name: string | null; email: string }>>({});
  const [filter, setFilter] = useState<FilterCategory>("all");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [loadingTicket, setLoadingTicket] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      
      if (data && data.length > 0) {
        setLogs(data);
        
        const userIds = [...new Set(data.map((l) => l.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, email")
          .in("user_id", userIds);
        
        if (profiles) {
          const map: Record<string, { display_name: string | null; email: string }> = {};
          profiles.forEach((p) => {
            map[p.user_id] = { display_name: p.display_name, email: p.email };
          });
          setProfileMap(map);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching activity logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel("recent-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_activity_logs" }, () => {
        fetchLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const enrichedLogs = useMemo(() => {
    const mapped = logs.map((log) => ({
      ...log,
      profile: profileMap[log.user_id] || { display_name: null, email: "Unknown" },
    }));

    if (filter === "all") return mapped;
    return mapped.filter((log) => {
      const cat = getActionCategory(log.action);
      if (filter === "admin") return cat === "admin" || cat === "system";
      return cat === filter;
    });
  }, [logs, profileMap, filter]);

  const handleActivityClick = useCallback(async (log: ActivityLog) => {
    const isIncidentAction = getActionCategory(log.action) === "incident";
    if (!isIncidentAction || log.action === "bulk_delete_tickets" || log.action === "import_tickets" || log.action === "export_data" || log.action === "delete_ticket") return;

    setLoadingTicket(true);
    setTicketDialogOpen(true);

    try {
      // Try to find ticket by detail info
      let query = supabase.from("tickets").select("*");
      
      if (log.detail) {
        // Try matching by ticket_id in detail
        const ticketIdMatch = log.detail.match(/IN\d+/i);
        if (ticketIdMatch) {
          query = query.eq("ticket_id", ticketIdMatch[0]);
        } else {
          // Try matching by customer name or service id in detail
          query = query.or(`customer_name.ilike.%${log.detail.substring(0, 30)}%,ticket_id.ilike.%${log.detail.substring(0, 20)}%`);
        }
      }

      const { data } = await query.limit(1).maybeSingle();
      
      if (data) {
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
      } else {
        setSelectedTicket(null);
      }
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
              onClick={fetchLogs}
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
        </CardHeader>
        <CardContent className="p-0">
          {loading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs">Memuat aktivitas...</span>
            </div>
          ) : enrichedLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Belum ada aktivitas</p>
            </div>
          ) : (
            <ScrollArea className="h-[40vh] xs:h-[45vh] sm:h-[50vh] md:h-[55vh] lg:h-[60vh]">
              <div className="divide-y divide-border/50">
                {enrichedLogs.map((log, idx) => {
                  const actionInfo = ACTION_ICONS[log.action] || { icon: <Activity className="h-3 w-3" />, color: "text-muted-foreground", bg: "bg-muted" };
                  const userName = log.profile?.display_name || log.profile?.email?.split("@")[0] || "User";
                  const cat = getActionCategory(log.action);
                  const isClickable = cat === "incident" && !["bulk_delete_tickets", "import_tickets", "export_data", "delete_ticket"].includes(log.action);

                  return (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className={`flex items-start gap-2.5 px-3 py-2.5 transition-colors ${
                        isClickable ? "cursor-pointer hover:bg-primary/5" : "hover:bg-muted/30"
                      }`}
                      onClick={() => isClickable && handleActivityClick(log)}
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 shrink-0 rounded-full p-1.5 ${actionInfo.bg}`}>
                        <span className={actionInfo.color}>{actionInfo.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] sm:text-[11px] font-semibold text-foreground truncate max-w-[100px] sm:max-w-[140px]">
                            {userName}
                          </span>
                          <span className="text-[9px] sm:text-[10px] text-muted-foreground">
                            {getActionLabel(log.action)}
                          </span>
                          {isClickable && (
                            <ExternalLink className="h-2.5 w-2.5 text-muted-foreground/50" />
                          )}
                        </div>
                        {log.detail && (
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2 leading-tight">
                            {log.detail}
                          </p>
                        )}
                        <span className="text-[8px] sm:text-[9px] text-muted-foreground/60 mt-0.5 block">
                          {getTimeAgo(log.created_at)}
                        </span>
                      </div>

                      {/* Action Badge */}
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[7px] sm:text-[8px] px-1.5 py-0 h-4 ${actionInfo.color} border-current/20`}
                      >
                        {getCategoryLabel(cat)}
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
                ].map((item) => (
                  <div key={item.label}>
                    <span className="text-muted-foreground block text-[10px]">{item.label}</span>
                    <span className="font-medium text-foreground truncate block">{item.value || "-"}</span>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Hasil Tindak Lanjut</span>
                <p className="text-[11px] text-foreground mt-0.5">{selectedTicket.ticketResult || "-"}</p>
              </div>
              {selectedTicket.createdByName && (
                <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
                  Create by <span className="font-medium text-foreground">{selectedTicket.createdByName}</span>
                  {" • "}
                  {new Date(selectedTicket.createdISO).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">Data incident tidak ditemukan</p>
              <p className="text-[10px] mt-1">Incident mungkin sudah dihapus</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
