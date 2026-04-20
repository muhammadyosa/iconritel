import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TicketStatusHistoryEntry {
  id: string;
  ticketId: string;
  oldStatus: string | null;
  newStatus: string;
  reason: string | null;
  changedByUserId: string | null;
  changedByName: string | null;
  createdAt: string;
}

interface DbRow {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  reason: string | null;
  changed_by_user_id: string | null;
  changed_by_name: string | null;
  created_at: string;
}

function dbToEntry(row: DbRow): TicketStatusHistoryEntry {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    reason: row.reason,
    changedByUserId: row.changed_by_user_id,
    changedByName: row.changed_by_name,
    createdAt: row.created_at,
  };
}

export async function logTicketStatusChange(params: {
  ticketId: string;
  oldStatus: string | null;
  newStatus: string;
  reason?: string | null;
  changedByUserId?: string | null;
  changedByName?: string | null;
}): Promise<void> {
  try {
    await supabase.from("ticket_status_history" as never).insert({
      ticket_id: params.ticketId,
      old_status: params.oldStatus,
      new_status: params.newStatus,
      reason: params.reason || null,
      changed_by_user_id: params.changedByUserId || null,
      changed_by_name: params.changedByName || null,
    } as never);
  } catch (err) {
    if (import.meta.env.DEV) console.error("Error logging status change:", err);
  }
}

export function useTicketStatusHistory(ticketId: string | undefined, enabled = true) {
  const [entries, setEntries] = useState<TicketStatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchEntries = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    try {
      const { data, error } = await (supabase
        .from("ticket_status_history" as never)
        .select("*")
        .eq("ticket_id" as never, ticketId)
        .order("created_at", { ascending: false }) as unknown as Promise<{ data: DbRow[] | null; error: Error | null }>);
      if (error) throw error;
      setEntries((data || []).map(dbToEntry));
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error fetching status history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!enabled || !ticketId) return;
    fetchEntries();

    const channel = supabase
      .channel(`status-history-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_status_history",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const entry = dbToEntry(payload.new as DbRow);
          setEntries((prev) => {
            if (prev.some((e) => e.id === entry.id)) return prev;
            return [entry, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, enabled, fetchEntries]);

  return { entries, isLoading, refetch: fetchEntries };
}
