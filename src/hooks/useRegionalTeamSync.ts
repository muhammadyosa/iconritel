import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { saveRegionalTeamData } from "@/lib/indexedDB";
import { emitRegionalTeamUpdated } from "@/lib/defaultRegionalData";
import type { RegionalTeamRecord } from "@/types/regionalTeam";
import { toast } from "sonner";

const LOCAL_REGIONAL_UPLOAD_KEY = "iconnet_last_regional_team_upload";
const LAST_APPLIED_KEY = "iconnet_last_regional_team_applied_id";

/**
 * Subscribes to master_data_uploads realtime inserts so every signed-in user
 * automatically receives the latest 🗺 List Team Region without manual refresh.
 *
 * The uploader embeds the parsed records inside `summary.records`, so other
 * clients can apply them directly to IndexedDB without waiting for a file
 * download or page reload.
 */
export function useRegionalTeamSync() {
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      appliedRef.current = localStorage.getItem(LAST_APPLIED_KEY);
    } catch {}

    const applyRow = async (row: any) => {
      try {
        if (!row || !row.id) return;
        if (appliedRef.current === row.id) return;
        const summary = row.summary || {};
        if (summary.kind !== "regional_team") return;
        const records: RegionalTeamRecord[] | undefined = summary.records;
        if (!Array.isArray(records) || records.length === 0) return;

        await saveRegionalTeamData(records);

        const meta = {
          uploaded_by_name: row.uploaded_by_name,
          created_at: row.created_at,
          total_records: row.total_records,
          file_name: row.file_name,
        };
        try {
          localStorage.setItem(LOCAL_REGIONAL_UPLOAD_KEY, JSON.stringify(meta));
          localStorage.setItem(LAST_APPLIED_KEY, row.id);
        } catch {}
        appliedRef.current = row.id;

        emitRegionalTeamUpdated();
        toast.success(
          `🗺 List Team Region diperbarui (${records.length.toLocaleString()} data)`,
          { description: `Oleh ${row.uploaded_by_name}` }
        );
      } catch (err) {
        if (import.meta.env.DEV) console.error("Regional sync apply failed:", err);
      }
    };

    // Catch-up on mount: pull the latest server row and apply if newer than local
    (async () => {
      try {
        const { data } = await supabase
          .from("master_data_uploads")
          .select("id, uploaded_by_name, created_at, total_records, file_name, summary")
          .filter("summary->>kind", "eq", "regional_team")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) await applyRow(data);
      } catch {}
    })();

    const channel = supabase
      .channel("regional-team-sync")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "master_data_uploads" },
        (payload) => {
          applyRow(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
