import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ArchivedIncident, HandlingEvent, Period } from "@/lib/nocAnalytics";

const PAGE = 1000;

async function pageAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 200000; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

/** Permanent incident archive + recorded handling events covering [from, to] (plus open backlog). */
export function useIncidentArchive(from: Date, to: Date) {
  const qc = useQueryClient();
  const key = ["incident-archive", from.toISOString(), to.toISOString()];
  const query = useQuery({
    queryKey: key,
    staleTime: 60_000,
    queryFn: async () => {
      const f = from.toISOString(), t = to.toISOString();
      const [rows, events] = await Promise.all([
        pageAll((a, b) => supabase.from("incident_archive")
          .select("ticket_id, constraint_type, category, serpo, status, ticket_result, created_at, created_by_user_id, created_by_name, resolved_at, resolved_by_user_id, resolved_by_name, reopen_count")
          .lte("created_at", t)
          .or(`resolved_at.is.null,resolved_at.gte.${f},status.neq.Resolved`)
          .order("created_at", { ascending: true }).range(a, b)),
        pageAll((a, b) => supabase.from("ticket_status_history")
          .select("ticket_id, changed_by_user_id, changed_by_name, created_at")
          .not("old_status", "is", null).gte("created_at", f).lte("created_at", t)
          .order("created_at", { ascending: true }).range(a, b)),
      ]);
      const incidents: ArchivedIncident[] = rows.map((r) => ({
        ticketId: r.ticket_id, constraint: r.constraint_type || "", category: r.category || "", serpo: r.serpo || "",
        status: r.status, description: r.ticket_result || "", createdAt: r.created_at,
        createdByUserId: r.created_by_user_id, createdByName: r.created_by_name,
        resolvedAt: r.resolved_at, resolvedByUserId: r.resolved_by_user_id, resolvedByName: r.resolved_by_name,
        reopenCount: r.reopen_count,
      }));
      const handling: HandlingEvent[] = events.map((e) => ({ ticketId: e.ticket_id, userId: e.changed_by_user_id, userName: e.changed_by_name, at: e.created_at }));
      return { incidents, handling };
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`incident-archive-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "incident_archive" }, () => qc.invalidateQueries({ queryKey: ["incident-archive"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return query;
}

export function periodFetchRange(p: Period, prev: Period) {
  return { from: prev.start < p.start ? prev.start : p.start, to: p.end };
}
