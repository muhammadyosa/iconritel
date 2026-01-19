import { useState, useEffect, useCallback } from "react";
import { Ticket, FEEDER_CONSTRAINTS_SET } from "@/types/ticket";

const HISTORY_STORAGE_KEY = "ticket_daily_history";

export interface DailyTicketRecord {
  date: string; // ISO date string (YYYY-MM-DD)
  ritel: number;
  feeder: number;
  total: number;
  ticketIds: string[]; // Store ticket IDs for reference
}

export interface TicketHistory {
  records: DailyTicketRecord[];
  lastUpdated: string;
}

export function useTicketHistory(tickets: Ticket[]) {
  const [history, setHistory] = useState<TicketHistory>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { records: [], lastUpdated: "" };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading ticket history:", error);
      }
      return { records: [], lastUpdated: "" };
    }
  });

  // Update history whenever tickets change
  useEffect(() => {
    if (tickets.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Build a map of all ticket creation dates
    const ticketsByDate: Record<string, { ritel: number; feeder: number; total: number; ticketIds: string[] }> = {};
    
    tickets.forEach((ticket) => {
      const ticketDate = new Date(ticket.createdISO).toISOString().split('T')[0];
      
      if (!ticketsByDate[ticketDate]) {
        ticketsByDate[ticketDate] = { ritel: 0, feeder: 0, total: 0, ticketIds: [] };
      }
      
      ticketsByDate[ticketDate].total++;
      ticketsByDate[ticketDate].ticketIds.push(ticket.id);
      
      if (FEEDER_CONSTRAINTS_SET.has(ticket.constraint)) {
        ticketsByDate[ticketDate].feeder++;
      } else {
        ticketsByDate[ticketDate].ritel++;
      }
    });

    setHistory((prev) => {
      // Merge existing history with new data
      const existingRecords = new Map(prev.records.map(r => [r.date, r]));
      
      // Update with current ticket data
      Object.entries(ticketsByDate).forEach(([date, data]) => {
        existingRecords.set(date, {
          date,
          ritel: data.ritel,
          feeder: data.feeder,
          total: data.total,
          ticketIds: data.ticketIds,
        });
      });
      
      // Convert back to array and sort by date
      const newRecords = Array.from(existingRecords.values())
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Keep only last 30 days of history
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      const filteredRecords = newRecords.filter(r => r.date >= cutoffDate);
      
      const newHistory = {
        records: filteredRecords,
        lastUpdated: new Date().toISOString(),
      };
      
      // Save to localStorage
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error saving ticket history:", error);
        }
      }
      
      return newHistory;
    });
  }, [tickets]);

  // Get data for chart (last N days)
  const getChartData = useCallback((days: number = 7) => {
    const result: Array<{ date: string; isoDate: string; ritel: number; feeder: number; total: number }> = [];
    const today = new Date();
    
    // Create a map for quick lookup
    const recordMap = new Map(history.records.map(r => [r.date, r]));
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isoDate = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      
      const record = recordMap.get(isoDate);
      
      result.push({
        date: displayDate,
        isoDate,
        ritel: record?.ritel || 0,
        feeder: record?.feeder || 0,
        total: record?.total || 0,
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

  // Clear history (for use with "Hapus Semua Data")
  const clearHistory = useCallback(() => {
    setHistory({ records: [], lastUpdated: "" });
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }, []);

  return {
    history,
    getChartData,
    getTicketsForDate,
    clearHistory,
  };
}

