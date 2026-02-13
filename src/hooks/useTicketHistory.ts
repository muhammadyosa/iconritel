import { useState, useEffect, useCallback, useRef } from "react";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";

export interface DailyTicketRecord {
  date: string; // ISO date string (YYYY-MM-DD)
  ritel: number;
  feeder: number;
  total: number;
  created: number;
  inProgress: number;
  resolved: number;
  ticketIds: string[]; // local-only reference, not persisted to cloud
}

export interface TicketHistory {
  records: DailyTicketRecord[];
  lastUpdated: string;
}

export function useTicketHistory(tickets: Ticket[]) {
  const [history, setHistory] = useState<TicketHistory>({ records: [], lastUpdated: "" });
  const isSyncing = useRef(false);
  const lastTicketSignature = useRef("");

  // Load history from cloud on mount
  useEffect(() => {
    const loadCloudHistory = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const { data, error } = await supabase
          .from("daily_ticket_history")
          .select("date, ritel, feeder, total, created, in_progress, resolved")
          .gte("date", cutoff)
          .order("date", { ascending: true });

        if (error) {
          if (import.meta.env.DEV) console.error("Error loading cloud history:", error);
          return;
        }

        if (data && data.length > 0) {
          const records: DailyTicketRecord[] = data.map((r) => ({
            date: r.date,
            ritel: r.ritel,
            feeder: r.feeder,
            total: r.total,
            created: r.created,
            inProgress: r.in_progress,
            resolved: r.resolved,
            ticketIds: [],
          }));
          setHistory({ records, lastUpdated: new Date().toISOString() });
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error("Error loading cloud history:", err);
      }
    };

    loadCloudHistory();
  }, []);

  // Sync ticket counts to cloud when tickets change
  useEffect(() => {
    if (tickets.length === 0) return;

    // Create a signature to avoid redundant syncs
    const signature = tickets.map(t => `${t.id}:${t.status}`).sort().join(",");
    if (signature === lastTicketSignature.current) return;
    lastTicketSignature.current = signature;

    const today = new Date().toISOString().split('T')[0];

    // Build counts by date from current tickets
    const ticketsByDate: Record<string, {
      ritel: number; feeder: number; total: number;
      created: number; inProgress: number; resolved: number;
      ticketIds: string[];
    }> = {};

    tickets.forEach((ticket) => {
      const ticketDate = new Date(ticket.createdISO).toISOString().split('T')[0];
      if (!ticketsByDate[ticketDate]) {
        ticketsByDate[ticketDate] = { ritel: 0, feeder: 0, total: 0, created: 0, inProgress: 0, resolved: 0, ticketIds: [] };
      }
      const d = ticketsByDate[ticketDate];
      d.total++;
      d.created++;
      d.ticketIds.push(ticket.id);
      if (ticket.status === "On Progress" || ticket.status === "Critical" || ticket.status === "Pending") {
        d.inProgress++;
      } else if (ticket.status === "Resolved") {
        d.resolved++;
      }
      if (FEEDER_CONSTRAINTS_SET.has(ticket.constraint)) {
        d.feeder++;
      } else {
        d.ritel++;
      }
    });

    setHistory((prev) => {
      const existingRecords = new Map(prev.records.map(r => [r.date, r]));

      // Merge: preserve peak counts for past dates
      Object.entries(ticketsByDate).forEach(([date, data]) => {
        const existing = existingRecords.get(date);
        if (existing && date < today) {
          existingRecords.set(date, {
            date,
            ritel: Math.max(existing.ritel, data.ritel),
            feeder: Math.max(existing.feeder, data.feeder),
            total: Math.max(existing.total, data.total),
            created: Math.max(existing.created, data.created),
            inProgress: Math.max(existing.inProgress, data.inProgress),
            resolved: Math.max(existing.resolved, data.resolved),
            ticketIds: data.ticketIds.length >= existing.ticketIds.length ? data.ticketIds : existing.ticketIds,
          });
        } else {
          existingRecords.set(date, {
            date,
            ritel: data.ritel,
            feeder: data.feeder,
            total: data.total,
            created: data.created,
            inProgress: data.inProgress,
            resolved: data.resolved,
            ticketIds: data.ticketIds,
          });
        }
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

      const newRecords = Array.from(existingRecords.values())
        .filter(r => r.date >= cutoffDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      return { records: newRecords, lastUpdated: new Date().toISOString() };
    });

    // Sync to cloud (upsert changed dates)
    if (!isSyncing.current) {
      isSyncing.current = true;
      const syncToCloud = async () => {
        try {
          // Get current cloud data first to compare
          const dates = Object.keys(ticketsByDate);
          if (dates.length === 0) { isSyncing.current = false; return; }

          const { data: cloudData } = await supabase
            .from("daily_ticket_history")
            .select("date, ritel, feeder, total, created, in_progress, resolved")
            .in("date", dates);

          const cloudMap = new Map((cloudData || []).map(r => [r.date, r]));

          const upserts: Array<{
            date: string; ritel: number; feeder: number; total: number;
            created: number; in_progress: number; resolved: number;
          }> = [];

          Object.entries(ticketsByDate).forEach(([date, data]) => {
            const cloud = cloudMap.get(date);
            const isPast = date < today;

            const finalRitel = isPast && cloud ? Math.max(cloud.ritel, data.ritel) : data.ritel;
            const finalFeeder = isPast && cloud ? Math.max(cloud.feeder, data.feeder) : data.feeder;
            const finalTotal = isPast && cloud ? Math.max(cloud.total, data.total) : data.total;
            const finalCreated = isPast && cloud ? Math.max(cloud.created, data.created) : data.created;
            const finalInProgress = isPast && cloud ? Math.max(cloud.in_progress, data.inProgress) : data.inProgress;
            const finalResolved = isPast && cloud ? Math.max(cloud.resolved, data.resolved) : data.resolved;

            // Only upsert if values differ from cloud
            if (!cloud ||
              cloud.ritel !== finalRitel || cloud.feeder !== finalFeeder ||
              cloud.total !== finalTotal || cloud.created !== finalCreated ||
              cloud.in_progress !== finalInProgress || cloud.resolved !== finalResolved) {
              upserts.push({
                date, ritel: finalRitel, feeder: finalFeeder,
                total: finalTotal, created: finalCreated,
                in_progress: finalInProgress, resolved: finalResolved,
              });
            }
          });

          if (upserts.length > 0) {
            const { error } = await supabase
              .from("daily_ticket_history")
              .upsert(upserts, { onConflict: "date" });
            if (error && import.meta.env.DEV) {
              console.error("Error syncing history to cloud:", error);
            }
          }
        } catch (err) {
          if (import.meta.env.DEV) console.error("Cloud sync error:", err);
        } finally {
          isSyncing.current = false;
        }
      };
      syncToCloud();
    }
  }, [tickets]);

  // Get data for chart (last N days)
  const getChartData = useCallback((days: number = 7) => {
    const result: Array<{
      date: string; isoDate: string;
      ritel: number; feeder: number; total: number;
      created: number; inProgress: number; resolved: number;
    }> = [];
    const today = new Date();
    const recordMap = new Map(history.records.map(r => [r.date, r]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isoDate = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const record = recordMap.get(isoDate);

      result.push({
        date: displayDate, isoDate,
        ritel: record?.ritel || 0,
        feeder: record?.feeder || 0,
        total: record?.total || 0,
        created: record?.created || 0,
        inProgress: record?.inProgress || 0,
        resolved: record?.resolved || 0,
      });
    }
    return result;
  }, [history.records]);

  // Get tickets for a specific date and category
  const getTicketsForDate = useCallback((isoDate: string, category?: "RITEL" | "FEEDER") => {
    return tickets.filter((ticket) => {
      const ticketDate = new Date(ticket.createdISO).toISOString().split('T')[0];
      if (ticketDate !== isoDate) return false;
      if (category) {
        const isFeeder = FEEDER_CONSTRAINTS_SET.has(ticket.constraint);
        return category === "FEEDER" ? isFeeder : !isFeeder;
      }
      return true;
    });
  }, [tickets]);

  // Get tickets for a specific date and status
  const getTicketsForDateByStatus = useCallback((isoDate: string, status: "created" | "inProgress" | "resolved") => {
    return tickets.filter((ticket) => {
      const ticketDate = new Date(ticket.createdISO).toISOString().split('T')[0];
      if (ticketDate !== isoDate) return false;
      if (status === "created") return true;
      if (status === "inProgress") return ticket.status === "On Progress" || ticket.status === "Critical" || ticket.status === "Pending";
      if (status === "resolved") return ticket.status === "Resolved";
      return true;
    });
  }, [tickets]);

  // Clear history
  const clearHistory = useCallback(async () => {
    setHistory({ records: [], lastUpdated: "" });
    try {
      await supabase.from("daily_ticket_history").delete().neq("date", "1900-01-01");
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error clearing cloud history:", err);
    }
  }, []);

  return {
    history,
    getChartData,
    getTicketsForDate,
    getTicketsForDateByStatus,
    clearHistory,
  };
}
