import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "operator" | "reviewer";

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>("operator");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole("operator");
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
          setRole("operator");
        } else {
          setRole((data?.role as AppRole) || "operator");
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error fetching user role:", error);
        }
        setRole("operator");
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isOperator = role === "operator";

  return {
    role,
    isAdmin,
    isOperator,
    isLoading,
  };
}
