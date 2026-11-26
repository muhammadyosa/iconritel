import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import type { EvidenListRow } from "@/lib/eviden";

export interface ManagementRow extends Omit<EvidenListRow, "status"> {
  status: EvidenListRow["status"] | "DRAFT";
  deletion_batch_id: string | null;
}
export interface ManagementFilters { search: string; status: string; team: string; from: string; to: string; sort: string; direction: string; page: number; size: number }
export interface ManagementData {
  rows: ManagementRow[]; total: number; ids: string[]; teams: string[];
  pending: { batch_id: string; count: number; created_at: string }[];
  audit: { id: string; user_id: string; action: string; detail: string; created_at: string }[];
}

export async function fetchEvidenManagement(filters: ManagementFilters, idsOnly = false): Promise<ManagementData> {
  const { data, error } = await supabase.rpc("eviden_admin_list", {
    _search: filters.search, _status: filters.status, _team: filters.team,
    _from: filters.from || undefined, _to: filters.to || undefined,
    _sort: filters.sort, _direction: filters.direction, _page: filters.page,
    _size: filters.size, _ids_only: idsOnly,
  });
  if (error) throw error;
  return data as unknown as ManagementData;
}

export function useEvidenManagement(filters: ManagementFilters) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  return useQuery({
    queryKey: ["eviden-management", user?.id, filters],
    enabled: !!user && isAdmin && !(filters.from && filters.to && filters.from > filters.to),
    queryFn: () => fetchEvidenManagement(filters),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export async function deleteEvidenSelection(input: { ids: string[] } | { batch_id: string }): Promise<{ count: number }> {
  const { data, error } = await supabase.functions.invoke("eviden-delete", { body: input });
  if (error) {
    let message = "Penghapusan belum selesai. Refresh lalu coba kembali.";
    if ("context" in error && error.context instanceof Response) {
      try { const result = await error.context.json(); if (typeof result.error === "string") message = result.error; } catch { /* network fallback */ }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}