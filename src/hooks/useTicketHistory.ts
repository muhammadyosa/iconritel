import { useState, useEffect, useCallback, useRef } from "react";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";
import { supabase } from "@/integrations/supabase/client";

export interface DailyTicketRecord {
  date: string;
  ritel: number;
  feeder: number;
  total: number;
  created: number;
  inProgress: number;
  resolved: number;
  slaOk: number;
  ticketIds: string[];
}

export interface DailyCategoryRecord {
  date: string;
  constraint_type: string;
  count: number;
}

export interface TicketHistory {
  records: DailyTicketRecord[];
  categoryRecords: DailyCategoryRecord[];
  lastUpdated: string;
}

export function useTicketHistory(tickets: Ticket[]) {
  const [history, setHistory] = useState<TicketHistory>({ records: [], categoryRecords: [], lastUpdated: "" });
  const isSyncing = useRef(false);
  const lastTicketSignature = useRef("");

  // Load history from cloud on mount
  useEffect(() => {
    const loadCloudHistory = async () => {
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = thirtyDaysAgo.toISOString().split('T')[0];

        const [histRes, catRes] = await Promise.all([
          supabase
            .from("daily_ticket_history")
            .select("date, ritel, feeder, total, created, in_progress, resolved, sla_ok")
            .gte("date", cutoff)
            .order("date", { ascending: true }),
          supabase
            .from("daily_category_history")
            .select("date, constraint_type, count")
            .gte("date", cutoff)
            .order("date", { ascending: true }),
        ]);

        const records: DailyTicketRecord[] = (histRes.data || []).map((r) => ({
          date: r.date,
          ritel: r.ritel,
          feeder: r.feeder,
          total: r.total,
          created: r.created,
          inProgress: r.in_progress,
          resolved: r.resolved,
          slaOk: r.sla_ok ?? 0,
          ticketIds: [],
        }));

        const categoryRecords: DailyCategoryRecord[] = (catRes.data || []).map((r) => ({
          date: r.date,
          constraint_type: r.constraint_type,
          count: r.count,
        }));

        if (records.length > 0 || categoryRecords.length > 0) {
          setHistory({ records, categoryRecords, lastUpdated: new Date().toISOString() });
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

    const signature = tickets.map(t => `${t.id}:${t.status}`).sort().join(",");
    if (signature === lastTicketSignature.current) return;
    lastTicketSignature.current = signature;

    const today = new Date().toISOString().split('T')[0];

    // Build counts by date
    const ticketsByDate: Record<string, {
      ritel: number; feeder: number; total: number;
      created: number; inProgress: number; resolved: number; slaOk: number;
      ticketIds: string[];
    }> = {};

    // Build category counts by date+constraint
    const categoryByDateConstraint: Record<string, Record<string, number>> = {};

    tickets.forEach((ticket) => {
      const ticketDate = new Date(ticket.createdISO).toISOString().split('T')[0];
      if (!ticketsByDate[ticketDate]) {
        ticketsByDate[ticketDate] = { ritel: 0, feeder: 0, total: 0, created: 0, inProgress: 0, resolved: 0, slaOk: 0, ticketIds: [] };
      }
      const d = ticketsByDate[ticketDate];
      d.total++;
      d.created++;
      d.ticketIds.push(ticket.id);
      if (ticket.status === "On Progress" || ticket.status === "Critical" || ticket.status === "Pending") {
        d.inProgress++;
      } else if (ticket.status === "Resolved") {
        d.resolved++;
        // Check SLA compliance
        if (ticket.resolvedAt) {
          const resMs = new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdISO).getTime();
          if (resMs <= 24 * 60 * 60 * 1000) {
            d.slaOk++;
          }
        }
      }
      if (FEEDER_CONSTRAINTS_SET.has(ticket.constraint)) {
        d.feeder++;
      } else {
        d.ritel++;
      }

      // Category tracking
      if (!categoryByDateConstraint[ticketDate]) {
        categoryByDateConstraint[ticketDate] = {};
      }
      categoryByDateConstraint[ticketDate][ticket.constraint] = (categoryByDateConstraint[ticketDate][ticket.constraint] || 0) + 1;
    });

    setHistory((prev) => {
      const existingRecords = new Map(prev.records.map(r => [r.date, r]));

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
            slaOk: Math.max(existing.slaOk, data.slaOk),
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
            slaOk: data.slaOk,
            ticketIds: data.ticketIds,
          });
        }
      });

      // Merge category records
      const existingCatMap = new Map<string, DailyCategoryRecord>();
      prev.categoryRecords.forEach(r => existingCatMap.set(`${r.date}:${r.constraint_type}`, r));

      Object.entries(categoryByDateConstraint).forEach(([date, constraints]) => {
        Object.entries(constraints).forEach(([constraint, count]) => {
          const key = `${date}:${constraint}`;
          const existing = existingCatMap.get(key);
          if (existing && date < today) {
            existingCatMap.set(key, { date, constraint_type: constraint, count: Math.max(existing.count, count) });
          } else {
            existingCatMap.set(key, { date, constraint_type: constraint, count });
          }
        });
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];

      const newRecords = Array.from(existingRecords.values())
        .filter(r => r.date >= cutoffDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      const newCatRecords = Array.from(existingCatMap.values())
        .filter(r => r.date >= cutoffDate);

      return { records: newRecords, categoryRecords: newCatRecords, lastUpdated: new Date().toISOString() };
    });

    // Sync to cloud
    if (!isSyncing.current) {
      isSyncing.current = true;
      const syncToCloud = async () => {
        try {
          const dates = Object.keys(ticketsByDate);
          if (dates.length === 0) { isSyncing.current = false; return; }

          const { data: cloudData } = await supabase
            .from("daily_ticket_history")
            .select("date, ritel, feeder, total, created, in_progress, resolved, sla_ok")
            .in("date", dates);

          const cloudMap = new Map((cloudData || []).map(r => [r.date, r]));

          const upserts: Array<{
            date: string; ritel: number; feeder: number; total: number;
            created: number; in_progress: number; resolved: number; sla_ok: number;
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
            const finalSlaOk = isPast && cloud ? Math.max(cloud.sla_ok ?? 0, data.slaOk) : data.slaOk;

            if (!cloud ||
              cloud.ritel !== finalRitel || cloud.feeder !== finalFeeder ||
              cloud.total !== finalTotal || cloud.created !== finalCreated ||
              cloud.in_progress !== finalInProgress || cloud.resolved !== finalResolved ||
              (cloud.sla_ok ?? 0) !== finalSlaOk) {
              upserts.push({
                date, ritel: finalRitel, feeder: finalFeeder,
                total: finalTotal, created: finalCreated,
                in_progress: finalInProgress, resolved: finalResolved,
                sla_ok: finalSlaOk,
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

          // Sync category data
          const allCatEntries: Array<{ date: string; constraint_type: string; count: number }> = [];
          Object.entries(categoryByDateConstraint).forEach(([date, constraints]) => {
            Object.entries(constraints).forEach(([constraint, count]) => {
              allCatEntries.push({ date, constraint_type: constraint, count });
            });
          });

          if (allCatEntries.length > 0) {
            // Get existing cloud category data
            const { data: cloudCatData } = await supabase
              .from("daily_category_history")
              .select("date, constraint_type, count")
              .in("date", dates);

            const cloudCatMap = new Map((cloudCatData || []).map(r => [`${r.date}:${r.constraint_type}`, r]));

            const catUpserts: Array<{ date: string; constraint_type: string; count: number }> = [];
            allCatEntries.forEach(({ date, constraint_type, count }) => {
              const key = `${date}:${constraint_type}`;
              const cloud = cloudCatMap.get(key);
              const isPast = date < today;
              const finalCount = isPast && cloud ? Math.max(cloud.count, count) : count;

              if (!cloud || cloud.count !== finalCount) {
                catUpserts.push({ date, constraint_type, count: finalCount });
              }
            });

            if (catUpserts.length > 0) {
              const { error } = await supabase
                .from("daily_category_history")
                .upsert(catUpserts, { onConflict: "date,constraint_type" });
              if (error && import.meta.env.DEV) {
                console.error("Error syncing category history:", error);
              }
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

  // Get trend data with SLA info (for Monthly Analytics)
  const getTrendChartData = useCallback((days: number = 7) => {
    const result: Array<{
      day: string; isoDate: string; dayNum: number;
      total: number; resolved: number; slaOk: number;
    }> = [];
    const today = new Date();
    const recordMap = new Map(history.records.map(r => [r.date, r]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isoDate = date.toISOString().split('T')[0];
      const displayDay = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const record = recordMap.get(isoDate);

      result.push({
        day: displayDay, isoDate, dayNum: date.getDate(),
        total: record?.total || 0,
        resolved: record?.resolved || 0,
        slaOk: record?.slaOk || 0,
      });
    }
    return result;
  }, [history.records]);

  // Get category data aggregated over a date range (for Monthly Analytics)
  const getCategoryData = useCallback((filter: string, customDate?: string) => {
    const today = new Date();
    let filteredRecords: DailyCategoryRecord[];

    if (filter === "today") {
      const todayStr = today.toISOString().split('T')[0];
      filteredRecords = history.categoryRecords.filter(r => r.date === todayStr);
    } else if (filter === "custom" && customDate) {
      filteredRecords = history.categoryRecords.filter(r => r.date === customDate);
    } else if (filter === "all") {
      filteredRecords = history.categoryRecords;
    } else {
      const days = Number(filter);
      const start = new Date(today);
      start.setDate(start.getDate() - days + 1);
      const startStr = start.toISOString().split('T')[0];
      filteredRecords = history.categoryRecords.filter(r => r.date >= startStr);
    }

    // Aggregate by constraint
    const map = new Map<string, number>();
    filteredRecords.forEach(r => {
      map.set(r.constraint_type, (map.get(r.constraint_type) || 0) + r.count);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [history.categoryRecords]);

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
    setHistory({ records: [], categoryRecords: [], lastUpdated: "" });
    try {
      await Promise.all([
        supabase.from("daily_ticket_history").delete().neq("date", "1900-01-01"),
        supabase.from("daily_category_history").delete().neq("date", "1900-01-01"),
      ]);
    } catch (err) {
      if (import.meta.env.DEV) console.error("Error clearing cloud history:", err);
    }
  }, []);

  return {
    history,
    getChartData,
    getTrendChartData,
    getCategoryData,
    getTicketsForDate,
    getTicketsForDateByStatus,
    clearHistory,
  };
}
