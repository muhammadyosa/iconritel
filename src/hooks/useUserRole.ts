import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "noc" | "superior" | "reviewer" | "cs" | "intern";

export async function fetchUserRole(userId: string): Promise<AppRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  // Jangan ubah kegagalan pembacaan menjadi peran NOC: selain menyembunyikan
  // masalah, fallback tersebut dapat tersimpan di cache selama lima menit.
  if (error) throw error;
  return (data?.role as AppRole) || "noc";
}

/**
 * Role user aktif. Memakai cache React Query bersama sehingga banyak komponen
 * yang memanggil hook ini hanya memicu SATU request ke database.
 */
export function useUserRole() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["user-role", user?.id ?? null],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
    queryFn: () => fetchUserRole(user!.id),
  });

  useEffect(() => {
    if (isError) {
      toast.error("Hak akses gagal dimuat. Coba lagi atau masuk kembali.", {
        id: "user-role-load-error",
        duration: Infinity,
        action: { label: "Coba lagi", onClick: () => void refetch() },
      });
    } else if (data) {
      toast.dismiss("user-role-load-error");
    }
  }, [data, isError, refetch]);

  const role: AppRole = data ?? "noc";

  return {
    role,
    isAdmin: role === "admin",
    isNOC: role === "noc",
    isReviewer: role === "reviewer",
    isIntern: role === "intern",
    isLoading: !!user && isLoading,
    isError,
    refetch,
  };
}
