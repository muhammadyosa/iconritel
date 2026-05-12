import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { toLocalDateStr } from "@/lib/dateUtils";
import { isSlaOkResolved } from "@/lib/sla";

/**
 * Automatic reconciliation: rebuilds dashboard metric history (daily_ticket_history,
 * daily_category_history, daily_user_ticket_history) directly from the live tickets
 * table, which is the single source of truth.
 *
 * Any drift introduced by manual edits, deletions, conflicting concurrent writes,
 * or auto-cleanup of resolved tickets gets corrected on the next pass.
 *
 * Strategy: for every date present in the current ticket set we OVERWRITE the
 * corresponding history rows with values computed from the live tickets, so the
 * persisted metrics always equal a recomputation from source.
 */
export function useMetricsReconciliation(tickets: Ticket[], isLoading: boolean) {
  const inFlight = useRef(false);
  const lastSignature = useRef("");

  const reconcileNow = useCallback(async (force = false) => {
    if (inFlight.current) return;
    if (!tickets || tickets.length === 0) return;

    // Cheap signature so identical state doesn't re-run constantly.
    const sig = tickets
      .map((t) => `${t.id}:${t.status}:${t.resolvedAt || ""}`)
      .sort()
      .join("|");
    if (!force && sig === lastSignature.current) return;
    lastSignature.current = sig;

    inFlight.current = true;
    try {
      // ---- Aggregate per-date totals ----
      type DateAgg = {
        ritel: number; feeder: number; total: number; created: number;
        in_progress: number; resolved: number; sla_ok: number;
      };
      const byDate: Record<string, DateAgg> = {};
      const byDateConstraint: Record<string, Record<string, number>> = {};
      const byDateUser: Record<string, Record<string, {
        user_name: string; user_id: string | null;
        total_created: number; total_resolved: number;
      }>> = {};

      tickets.forEach((t) => {
        const date = toLocalDateStr(new Date(t.createdISO));
        if (!byDate[date]) byDate[date] = {
          ritel: 0, feeder: 0, total: 0, created: 0,
          in_progress: 0, resolved: 0, sla_ok: 0,
        };
        const d = byDate[date];
        d.total++; d.created++;

        if (t.status === "Resolved") {
          d.resolved++;
          if (isSlaOkResolved(t)) d.sla_ok++;
        } else if (t.status === "On Progress" || t.status === "Pending" || t.status === "Critical") {
          d.in_progress++;
        }
        if (FEEDER_CONSTRAINTS_SET.has(t.constraint)) d.feeder++; else d.ritel++;

        // Category
        if (!byDateConstraint[date]) byDateConstraint[date] = {};
        byDateConstraint[date][t.constraint] = (byDateConstraint[date][t.constraint] || 0) + 1;

        // Per-user
        const userName = (t.createdByName || "").trim();
        if (userName) {
          const userKey = (t.createdByUserId || userName.toLowerCase());
          if (!byDateUser[date]) byDateUser[date] = {};
          if (!byDateUser[date][userKey]) byDateUser[date][userKey] = {
            user_name: userName,
            user_id: t.createdByUserId || null,
            total_created: 0,
            total_resolved: 0,
          };
          const u = byDateUser[date][userKey];
          u.total_created++;
          if (t.status === "Resolved") u.total_resolved++;
        }
      });

      const dates = Object.keys(byDate);
      if (dates.length === 0) return;

      // ---- 1) daily_ticket_history (authoritative overwrite for dates we computed) ----
      const ticketUpserts = Object.entries(byDate).map(([date, v]) => ({
        date,
        ritel: v.ritel,
        feeder: v.feeder,
        total: v.total,
        created: v.created,
        in_progress: v.in_progress,
        resolved: v.resolved,
        sla_ok: v.sla_ok,
      }));
      if (ticketUpserts.length > 0) {
        await supabase
          .from("daily_ticket_history")
          .upsert(ticketUpserts, { onConflict: "date" });
      }

      // ---- 2) daily_category_history (overwrite present + remove stale) ----
      const catUpserts: Array<{ date: string; constraint_type: string; count: number }> = [];
      const presentKeys = new Set<string>();
      Object.entries(byDateConstraint).forEach(([date, byC]) => {
        Object.entries(byC).forEach(([constraint, count]) => {
          catUpserts.push({ date, constraint_type: constraint, count });
          presentKeys.add(`${date}:${constraint}`);
        });
      });
      if (catUpserts.length > 0) {
        await supabase
          .from("daily_category_history")
          .upsert(catUpserts, { onConflict: "date,constraint_type" });
      }
      // Zero-out (set count=0) any cloud rows for these dates that no longer exist in source
      const { data: existingCats } = await supabase
        .from("daily_category_history")
        .select("date, constraint_type, count")
        .in("date", dates);
      const stale = (existingCats || []).filter(r => !presentKeys.has(`${r.date}:${r.constraint_type}`) && r.count !== 0);
      if (stale.length > 0) {
        await supabase
          .from("daily_category_history")
          .upsert(stale.map(r => ({ date: r.date, constraint_type: r.constraint_type, count: 0 })), { onConflict: "date,constraint_type" });
      }

      // ---- 3) daily_user_ticket_history (authoritative per-user/date overwrite) ----
      const { data: existingUserRows } = await supabase
        .from("daily_user_ticket_history")
        .select("id, date, user_name, total_created, total_resolved")
        .in("date", dates);

      const existingMap = new Map<string, { id: string; total_created: number; total_resolved: number }>();
      (existingUserRows || []).forEach((r) => {
        existingMap.set(`${r.date}:${r.user_name.trim().toLowerCase()}`, {
          id: r.id,
          total_created: r.total_created,
          total_resolved: r.total_resolved,
        });
      });

      const userInserts: Array<Record<string, unknown>> = [];
      const userUpdates: Array<{ id: string; total_created: number; total_resolved: number }> = [];
      const seenKeys = new Set<string>();

      Object.entries(byDateUser).forEach(([date, users]) => {
        Object.values(users).forEach((u) => {
          const key = `${date}:${u.user_name.trim().toLowerCase()}`;
          seenKeys.add(key);
          const existing = existingMap.get(key);
          if (existing) {
            if (existing.total_created !== u.total_created || existing.total_resolved !== u.total_resolved) {
              userUpdates.push({ id: existing.id, total_created: u.total_created, total_resolved: u.total_resolved });
            }
          } else {
            userInserts.push({
              date, user_name: u.user_name, user_id: u.user_id,
              total_created: u.total_created, total_resolved: u.total_resolved,
            });
          }
        });
      });

      // Zero-out user rows that no longer have any tickets in the source for that date
      (existingUserRows || []).forEach((r) => {
        const key = `${r.date}:${r.user_name.trim().toLowerCase()}`;
        if (!seenKeys.has(key) && (r.total_created !== 0 || r.total_resolved !== 0)) {
          userUpdates.push({ id: r.id, total_created: 0, total_resolved: 0 });
        }
      });

      if (userInserts.length > 0) {
        await supabase.from("daily_user_ticket_history").insert(userInserts as never);
      }
      // Sequential updates (small batches expected)
      for (const up of userUpdates) {
        await supabase
          .from("daily_user_ticket_history")
          .update({ total_created: up.total_created, total_resolved: up.total_resolved } as never)
          .eq("id", up.id);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("Metrics reconciliation error:", err);
    } finally {
      inFlight.current = false;
    }
  }, [tickets]);

  // Run on mount + whenever ticket signature changes (debounced via state) + every 5 minutes.
  useEffect(() => {
    if (isLoading) return;
    const debounce = setTimeout(() => { reconcileNow(false); }, 1500);
    const interval = setInterval(() => { reconcileNow(true); }, 5 * 60 * 1000);
    return () => { clearTimeout(debounce); clearInterval(interval); };
  }, [reconcileNow, isLoading]);

  return { reconcileNow };
}
