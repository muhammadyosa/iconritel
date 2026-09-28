import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "noc" | "superior" | "reviewer" | "cs" | "intern";

/**
 * Role user aktif. Memakai cache React Query bersama sehingga banyak komponen
 * yang memanggil hook ini hanya memicu SATU request ke database.
 */
export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-role", user?.id ?? null],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRole> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) {
        if (import.meta.env.DEV) console.error("Error fetching user role:", error);
        return "noc";
      }
      return ((data?.role as AppRole) || "noc");
    },
  });

  const role: AppRole = data ?? "noc";

  return {
    role,
    isAdmin: role === "admin",
    isNOC: role === "noc",
    isReviewer: role === "reviewer",
    isIntern: role === "intern",
    isLoading: !!user && isLoading,
  };
}
