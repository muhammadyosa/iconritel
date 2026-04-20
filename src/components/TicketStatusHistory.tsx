import { History, ArrowRight, Plus } from "lucide-react";
import { useTicketStatusHistory } from "@/hooks/useTicketStatusHistory";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

interface TicketStatusHistoryProps {
  ticketId: string;
  enabled?: boolean;
}

export function TicketStatusHistory({ ticketId, enabled = true }: TicketStatusHistoryProps) {
  const { entries, isLoading } = useTicketStatusHistory(ticketId, enabled);

  return (
    <div className="pt-3 border-t">
      <div className="flex items-center gap-2 mb-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Riwayat Perubahan Status</span>
        {entries.length > 0 && (
          <span className="text-xs text-muted-foreground">({entries.length})</span>
        )}
      </div>

      {isLoading && entries.length === 0 ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs italic text-muted-foreground p-3 bg-muted/30 rounded-lg">
          Belum ada riwayat perubahan status tercatat.
        </p>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {entries.map((e) => (
            <div
              key={e.id}
              className="p-2.5 bg-muted/30 border border-border/50 rounded-lg text-xs space-y-1"
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                {e.oldStatus ? (
                  <>
                    <StatusBadge status={e.oldStatus as never} />
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <StatusBadge status={e.newStatus as never} />
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 text-muted-foreground" />
                    <StatusBadge status={e.newStatus as never} />
                    <span className="text-[10px] text-muted-foreground italic">(dibuat)</span>
                  </>
                )}
              </div>
              {e.reason && (
                <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words pl-1 border-l-2 border-amber-500/40 ml-0.5 pl-2">
                  💬 {e.reason}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium">{e.changedByName || "Sistem"}</span>
                {" • "}
                {new Date(e.createdAt).toLocaleString("id-ID")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
