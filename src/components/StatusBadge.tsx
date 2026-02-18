import { Badge } from "@/components/ui/badge";

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
    <Badge className={`${variants[status] || variants["Pending"]} text-[8px] px-1.5 py-0 h-4 font-medium`}>
      {displayLabel}
    </Badge>
  );
}
