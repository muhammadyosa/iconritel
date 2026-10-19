import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StatusHistoryRow } from "@/lib/historicalStatusDistribution";

const key = ["status-distribution-history"];
const fields = "id, ticket_id, old_status, new_status, created_at, changed_by_name, reason";
const pageSize = 1000;

async function loadHistory(): Promise<StatusHistoryRow[]> {
  const first = await supabase.from("ticket_status_history").select(fields, { count: "exact" })
    .order("created_at").order("id").range(0, pageSize - 1);
  if (first.error) throw first.error;
  const result: StatusHistoryRow[] = first.data ?? [];
  const pages = Math.ceil((first.count ?? result.length) / pageSize);
  // Bounded parallel pagination avoids silently truncating history at the API row limit.
  for (let start = 1; start < pages; start += 6) {
    const batch = await Promise.all(Array.from({ length: Math.min(6, pages - start) }, async (_, offset) => {
      const index = start + offset;
      const response = await supabase.from("ticket_status_history").select(fields)
        .order("created_at").order("id").range(index * pageSize, (index + 1) * pageSize - 1);
      if (response.error) throw response.error;
      return response.data ?? [];
    }));
    result.push(...batch.flat());
  }
  return result;
}

export function useStatusDistributionHistory() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: loadHistory, staleTime: 60_000, refetchInterval: 60_000 });
  useEffect(() => {
    const channel = supabase.channel("dashboard-status-history")
      .on("postgres_changes", { event: "*", schema: "public", table: "ticket_status_history" },
        () => { void client.invalidateQueries({ queryKey: key }); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);
  return query;
}