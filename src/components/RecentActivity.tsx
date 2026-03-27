import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, Plus, CheckCircle, Clock, Trash2, Edit, Upload, Download, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { getActionLabel } from "@/hooks/useActivityLog";

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

export function RecentActivity() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { display_name: string | null; email: string }>>({});

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
        
        // Fetch profiles for unique user_ids
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
    
    // Subscribe to realtime updates
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
    return logs.map((log) => ({
      ...log,
      profile: profileMap[log.user_id] || { display_name: null, email: "Unknown" },
    }));
  }, [logs, profileMap]);

  return (
    <Card className="overflow-hidden border h-full">
      <CardHeader className="py-3 px-3 sm:px-6 border-b bg-muted/20 flex flex-row items-center justify-between">
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

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.02 }}
                    className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors"
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
                      {log.action.includes("ticket") || log.action.includes("incident")
                        ? "Incident"
                        : log.action.includes("shift")
                        ? "Shift"
                        : log.action.includes("role") || log.action.includes("user")
                        ? "Admin"
                        : "System"}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
