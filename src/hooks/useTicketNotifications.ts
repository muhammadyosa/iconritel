import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface DbTicketPayload {
  ticket_id: string;
  customer_name: string;
  constraint_type: string;
  status: string;
  hostname: string;
}

interface DbProfilePayload {
  email: string;
  display_name: string | null;
  is_approved: boolean;
}

export function useTicketNotifications() {
  const initializedRef = useRef(false);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Skip first load to avoid notifications for existing data
    if (!initializedRef.current) {
      initializedRef.current = true;
    }

    const channel = supabase
      .channel("ticket-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tickets" },
        (payload) => {
          if (!initializedRef.current) return;
          const t = payload.new as DbTicketPayload;
          toast.info("🆕 Incident Baru Masuk", {
            description: `${t.constraint_type} — ${t.customer_name || t.hostname}`,
            duration: 6000,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tickets" },
        (payload) => {
          if (!initializedRef.current) return;
          const newData = payload.new as DbTicketPayload;
          const oldData = payload.old as Partial<DbTicketPayload>;

          if (oldData.status && oldData.status !== newData.status) {
            const emoji = newData.status === "Resolved" ? "✅" : newData.status === "Critical" ? "🔴" : "🔄";
            toast(`${emoji} Status Berubah: ${newData.status}`, {
              description: `${newData.constraint_type} — ${newData.customer_name || newData.hostname}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Separate channel for admin-only new user notifications
  useEffect(() => {
    if (!isAdmin) return;

    const profileChannel = supabase
      .channel("new-user-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const profile = payload.new as DbProfilePayload;
          if (!profile.is_approved) {
            toast.warning("👤 User Baru Mendaftar", {
              description: `${profile.display_name || profile.email} menunggu persetujuan`,
              duration: 10000,
              action: {
                label: "Buka Settings",
                onClick: () => {
                  window.location.href = "/settings";
                },
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [isAdmin]);
}
