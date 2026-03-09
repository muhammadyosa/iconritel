import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "create_ticket"
  | "update_ticket"
  | "delete_ticket"
  | "resolve_ticket"
  | "create_shift_report"
  | "update_shift_report"
  | "delete_shift_report"
  | "change_role"
  | "edit_username"
  | "import_tickets"
  | "export_data"
  | "login"
  | "bulk_delete_tickets"
  | "approve_user"
  | "revoke_user";

const ACTION_LABELS: Record<ActivityAction, string> = {
  create_ticket: "Membuat tiket",
  update_ticket: "Mengupdate tiket",
  delete_ticket: "Menghapus tiket",
  resolve_ticket: "Menyelesaikan tiket",
  create_shift_report: "Membuat laporan shift",
  update_shift_report: "Mengupdate laporan shift",
  delete_shift_report: "Menghapus laporan shift",
  change_role: "Mengubah role user",
  edit_username: "Mengedit username",
  import_tickets: "Mengimport tiket",
  export_data: "Mengexport data",
  approve_user: "Menyetujui user",
  revoke_user: "Mencabut akses user",
  login: "Login ke sistem",
  bulk_delete_tickets: "Menghapus tiket massal",
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action as ActivityAction] || action;
}

export function useActivityLog() {
  const logActivity = useCallback(async (action: ActivityAction, detail?: string) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;
      if (!userId) return;

      await supabase.from("user_activity_logs").insert({
        user_id: userId,
        action,
        detail: detail || null,
      } as never);
    } catch (error) {
      // Silently fail - activity logging is not critical
      if (import.meta.env.DEV) {
        console.error("Error logging activity:", error);
      }
    }
  }, []);

  return { logActivity };
}
