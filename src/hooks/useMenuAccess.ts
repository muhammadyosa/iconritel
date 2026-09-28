import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getDefaultPaths } from "@/lib/menuAccess";

// Satu channel realtime bersama untuk semua pemakai hook (ref-counted),
// mencegah channel ganda dengan nama sama.
const channels = new Map<string, { count: number; remove: () => void }>();

function subscribe(userId: string, qc: QueryClient) {
  const existing = channels.get(userId);
  if (existing) {
    existing.count++;
  } else {
    const channel = supabase
      .channel(`menu-access-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_menu_access", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["menu-access", userId] })
      )
      .subscribe();
    channels.set(userId, { count: 1, remove: () => supabase.removeChannel(channel) });
  }
  return () => {
    const entry = channels.get(userId);
    if (!entry) return;
    entry.count--;
    if (entry.count <= 0) {
      entry.remove();
      channels.delete(userId);
    }
  };
}

/**
 * Akses menu efektif user aktif:
 * - kalau Admin sudah men-checklist menu untuk user ini -> pakai checklist itu
 * - kalau belum ada checklist -> fallback ke akses default sesuai role
 */
export function useMenuAccess() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { role, isLoading: isRoleLoading } = useUserRole();

  const { data: customPaths, isLoading, refetch } = useQuery({
    queryKey: ["menu-access", user?.id ?? null],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string[] | null> => {
      const { data, error } = await supabase
        .from("user_menu_access")
        .select("path")
        .eq("user_id", user!.id);
      if (error || !data || data.length === 0) return null;
      return data.map((r) => r.path);
    },
  });

  useEffect(() => {
    if (!user) return;
    return subscribe(user.id, qc);
  }, [user, qc]);

  const allowedPaths = customPaths ?? getDefaultPaths(role);
  const canAccess = useCallback((path: string) => allowedPaths.includes(path), [allowedPaths]);

  return {
    allowedPaths,
    hasCustomAccess: customPaths != null,
    canAccess,
    isLoading: (!!user && isLoading) || isRoleLoading,
    refresh: refetch,
  };
}
