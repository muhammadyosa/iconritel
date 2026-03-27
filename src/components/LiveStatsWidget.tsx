import { useMemo } from "react";
import { useCloudTickets } from "@/hooks/useCloudTickets";
import { FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { motion } from "framer-motion";

export function LiveStatsWidget() {
  const { tickets, isLoading } = useCloudTickets();

  const stats = useMemo(() => {
    if (!tickets.length) return null;
    const total = tickets.length;
    const onProgress = tickets.filter(t => t.status === "On Progress").length;
    const critical = tickets.filter(t => t.status === "Critical").length;
    const resolved = tickets.filter(t => t.status === "Resolved").length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;
    return { total, onProgress, critical, resolved, resolutionRate };
  }, [tickets]);

  if (isLoading || !stats) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="hidden md:flex items-center gap-3 text-[10px] font-medium"
    >
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/50">
        <span className="text-muted-foreground">Incident</span>
        <span className="font-bold text-foreground tabular-nums">{stats.total}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
        <span className="text-destructive tabular-nums">{stats.critical}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-primary tabular-nums">{stats.onProgress}</span>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
        <span className="text-success tabular-nums">{stats.resolutionRate}%</span>
        <span className="text-muted-foreground">resolved</span>
      </div>
    </motion.div>
  );
}
