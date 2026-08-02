import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { getDefaultPaths } from "@/lib/menuAccess";

/**
 * Akses menu efektif user aktif:
 * - kalau Admin sudah men-checklist menu untuk user ini -> pakai checklist itu
 * - kalau belum ada checklist -> fallback ke akses default sesuai role
 */
export function useMenuAccess() {
  const { user } = useAuth();
  const { role, isLoading: isRoleLoading } = useUserRole();
  const [customPaths, setCustomPaths] = useState<string[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccess = useCallback(async () => {
    if (!user) {
      setCustomPaths(null);
      setIsLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_menu_access")
      .select("path")
      .eq("user_id", user.id);

    if (error || !data || data.length === 0) {
      setCustomPaths(null);
    } else {
      setCustomPaths(data.map((r) => r.path));
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    setIsLoading(true);
    fetchAccess();
  }, [fetchAccess]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`menu-access-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_menu_access", filter: `user_id=eq.${user.id}` },
        () => { fetchAccess(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchAccess]);

  const allowedPaths = customPaths ?? getDefaultPaths(role);

  return {
    allowedPaths,
    hasCustomAccess: customPaths !== null,
    canAccess: (path: string) => allowedPaths.includes(path),
    isLoading: isLoading || isRoleLoading,
    refresh: fetchAccess,
  };
}
