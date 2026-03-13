import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "noc" | "reviewer" | "intern";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("noc");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole("noc");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          if (import.meta.env.DEV) {
            console.error("Error fetching user role:", error);
          }
          setRole("noc");
        } else {
          setRole((data?.role as AppRole) || "noc");
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching user role:", error);
        }
        setRole("noc");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isNOC = role === "noc";
  const isReviewer = role === "reviewer";
  const isIntern = role === "intern";

  return {
    role,
    isAdmin,
    isNOC,
    isReviewer,
    isIntern,
    isLoading,
  };
}
