import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

type TicketStatus = "On Progress" | "Critical" | "Resolved" | "Pending";

interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const displayLabel = status === "On Progress" ? "Progres" : status;
  
  const variants = {
    "On Progress": "bg-warning text-warning-foreground",
    "Critical": "bg-destructive text-destructive-foreground",
    "Resolved": "bg-success text-success-foreground",
    "Pending": "bg-muted text-muted-foreground",
  };

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="inline-flex"
      >
        <Badge className={`${variants[status] || variants["Pending"]} text-[8px] px-1.5 py-0 h-4 font-medium`}>
          {displayLabel}
        </Badge>
      </motion.span>
    </AnimatePresence>
  );
}
