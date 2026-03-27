import { useMemo } from "react";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";

const PAGE_CONFIG: Record<string, { label: string; emoji: string }> = {
  "/tickets": { label: "Incident Management", emoji: "🎫" },
  "/teams": { label: "Tim & Regional", emoji: "👥" },
  "/report": { label: "Shift Report", emoji: "📝" },
  "/fat": { label: "FAT Management", emoji: "📦" },
  "/fdt": { label: "FDT Management", emoji: "📡" },
  "/olt": { label: "OLT Devices", emoji: "🖧" },
  "/notes": { label: "Catatan", emoji: "📋" },
};

export function QuickStatsBanner() {
  const { pathname } = useLocation();
  const { tickets } = useCloudTickets();
  const config = PAGE_CONFIG[pathname];

  const stats = useMemo(() => {
    if (!tickets.length) return null;
    const total = tickets.length;
    const critical = tickets.filter(t => t.status === "Critical").length;
    const resolved = tickets.filter(t => t.status === "Resolved").length;
    const onProgress = tickets.filter(t => t.status === "On Progress").length;
    const feeder = tickets.filter(t => FEEDER_CONSTRAINTS_SET.has(t.constraint)).length;
    const ritel = total - feeder;
    return { total, critical, resolved, onProgress, feeder, ritel };
  }, [tickets]);

  // Only show on specific pages, not on dashboard
  if (!config || pathname === "/" || !stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 rounded-lg bg-muted/30 border border-border/40 mb-3 text-[10px] sm:text-[11px]"
    >
      <span className="font-semibold text-foreground flex items-center gap-1">
        {config.emoji} {config.label}
      </span>
      <span className="text-muted-foreground/40 hidden sm:inline">|</span>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-muted-foreground">
          Total <strong className="text-foreground">{stats.total}</strong>
        </span>
        {stats.critical > 0 && (
          <span className="text-destructive flex items-center gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
            {stats.critical} critical
          </span>
        )}
        <span className="text-primary">{stats.onProgress} progres</span>
        <span className="text-success">{stats.resolved} resolved</span>
      </div>
    </motion.div>
  );
}
