import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Clock, AlertTriangle, CheckCircle2, Zap, Activity } from "lucide-react";
import { motion } from "framer-motion";
import { Ticket } from "@/types/ticket";
import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ActivityFeedProps {
  tickets: Ticket[];
  shiftReports?: Array<{ id: string; date: string; shift: string; officer: string; createdAt: string }>;
}

interface FeedItem {
  id: string;
  type: "incident_new" | "incident_resolved" | "incident_critical" | "shift_report";
  title: string;
  description: string;
  timestamp: Date;
  status?: string;
  constraint?: string;
}

export function ActivityFeed({ tickets, shiftReports = [] }: ActivityFeedProps) {
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];

    // Recent tickets (created in last 7 days)
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    tickets.forEach(t => {
      const created = new Date(t.createdISO);
      if (created < weekAgo) return;

      if (t.status === "Resolved" && t.resolvedAt) {
        items.push({
          id: `resolved-${t.id}`,
          type: "incident_resolved",
          title: `Incident resolved`,
          description: `${t.constraint} — ${t.hostname || t.customerName}`,
          timestamp: new Date(t.resolvedAt),
          status: t.status,
          constraint: t.constraint,
        });
      }

      if (t.status === "Critical") {
        items.push({
          id: `critical-${t.id}`,
          type: "incident_critical",
          title: `Critical incident`,
          description: `${t.constraint} — ${t.hostname || t.customerName}`,
          timestamp: created,
          status: t.status,
          constraint: t.constraint,
        });
      } else {
        items.push({
          id: `new-${t.id}`,
          type: "incident_new",
          title: `Incident baru`,
          description: `${t.constraint} — ${t.hostname || t.customerName}`,
          timestamp: created,
          status: t.status,
          constraint: t.constraint,
        });
      }
    });

    // Shift reports
    shiftReports.forEach(sr => {
      const date = sr.createdAt ? new Date(sr.createdAt) : new Date(sr.date);
      if (date < weekAgo) return;
      items.push({
        id: `sr-${sr.id}`,
        type: "shift_report",
        title: `Shift Report`,
        description: `${sr.shift} — ${sr.officer}`,
        timestamp: date,
      });
    });

    return items
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15);
  }, [tickets, shiftReports]);

  const getIcon = (type: FeedItem["type"]) => {
    switch (type) {
      case "incident_resolved": return <CheckCircle2 className="h-3 w-3 text-success" />;
      case "incident_critical": return <AlertTriangle className="h-3 w-3 text-destructive" />;
      case "incident_new": return <Zap className="h-3 w-3 text-primary" />;
      case "shift_report": return <Clock className="h-3 w-3 text-accent-foreground" />;
    }
  };

  const getLineColor = (type: FeedItem["type"]) => {
    switch (type) {
      case "incident_resolved": return "bg-success";
      case "incident_critical": return "bg-destructive";
      case "incident_new": return "bg-primary";
      case "shift_report": return "bg-muted-foreground";
    }
  };

  const formatTime = (date: Date) => {
    if (!isValid(date)) return "";
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: idLocale });
    } catch {
      return "";
    }
  };

  if (feedItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <Card className="overflow-hidden border">
        <CardHeader className="py-2 px-3 sm:px-4 border-b bg-muted/20">
          <CardTitle className="flex items-center gap-1.5 text-xs sm:text-sm">
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            Aktivitas Terbaru
            <Badge variant="secondary" className="ml-auto text-[9px] px-1.5">
              7 hari
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[320px] overflow-y-auto">
            {feedItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex gap-3 px-3 sm:px-4 py-2 hover:bg-muted/30 transition-colors border-b border-border/30 last:border-0"
              >
                {/* Timeline line */}
                <div className="flex flex-col items-center pt-0.5">
                  <div className={`h-5 w-5 rounded-full flex items-center justify-center ${
                    item.type === "incident_critical" ? "bg-destructive/15" :
                    item.type === "incident_resolved" ? "bg-success/15" :
                    item.type === "shift_report" ? "bg-muted" :
                    "bg-primary/15"
                  }`}>
                    {getIcon(item.type)}
                  </div>
                  {idx < feedItems.length - 1 && (
                    <div className={`w-px flex-1 mt-1 ${getLineColor(item.type)} opacity-20`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-[11px] font-semibold truncate">{item.title}</span>
                    {item.status && <StatusBadge status={item.status as "On Progress" | "Critical" | "Resolved" | "Pending"} />}
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </p>
                  <span className="text-[8px] sm:text-[9px] text-muted-foreground/60 mt-0.5 block">
                    {formatTime(item.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
