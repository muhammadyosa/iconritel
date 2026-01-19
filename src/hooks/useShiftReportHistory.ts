import { useState, useEffect, useCallback } from "react";

const HISTORY_STORAGE_KEY = "shift_report_daily_history";

export interface DailyShiftReportRecord {
  date: string; // ISO date string (YYYY-MM-DD)
  displayDate: string; // Human-readable date
  reportCount: number;
  shifts: {
    shift: string;
    officer: string;
    createdAt: string;
  }[];
  reportIds: string[];
}

export interface ShiftReportHistory {
  records: DailyShiftReportRecord[];
  lastUpdated: string;
}

interface ShiftReport {
  id: string;
  date: string;
  shift: string;
  officer: string;
  oltDown?: string;
  portDown?: string;
  fatLoss?: string;
  summary?: string;
  issues: string;
  notes: string;
  createdAt: string;
}

export function useShiftReportHistory(shiftReports: ShiftReport[]) {
  const [history, setHistory] = useState<ShiftReportHistory>(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { records: [], lastUpdated: "" };
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading shift report history:", error);
      }
      return { records: [], lastUpdated: "" };
    }
  });

  // Update history whenever shift reports change
  useEffect(() => {
    if (shiftReports.length === 0) return;

    // Build a map of all shift report dates
    const reportsByDate: Record<string, { 
      reportCount: number; 
      shifts: { shift: string; officer: string; createdAt: string }[];
      reportIds: string[];
      displayDate: string;
    }> = {};

    shiftReports.forEach((report) => {
      const reportDate = new Date(report.date).toISOString().split('T')[0];
      const displayDate = new Date(report.date).toLocaleDateString("id-ID", {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      if (!reportsByDate[reportDate]) {
        reportsByDate[reportDate] = { 
          reportCount: 0, 
          shifts: [],
          reportIds: [],
          displayDate,
        };
      }

      reportsByDate[reportDate].reportCount++;
      reportsByDate[reportDate].reportIds.push(report.id);
      reportsByDate[reportDate].shifts.push({
        shift: report.shift,
        officer: report.officer,
        createdAt: report.createdAt,
      });
    });

    setHistory((prev) => {
      // Merge existing history with new data
      const existingRecords = new Map(prev.records.map(r => [r.date, r]));

      // Update with current report data
      Object.entries(reportsByDate).forEach(([date, data]) => {
        existingRecords.set(date, {
          date,
          displayDate: data.displayDate,
          reportCount: data.reportCount,
          shifts: data.shifts,
          reportIds: data.reportIds,
        });
      });

      // Convert back to array and sort by date (newest first)
      const newRecords = Array.from(existingRecords.values())
        .sort((a, b) => b.date.localeCompare(a.date));

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
          console.error("Error saving shift report history:", error);
        }
      }

      return newHistory;
    });
  }, [shiftReports]);

  // Get data for chart or listing (last N days)
  const getChartData = useCallback((days: number = 7) => {
    const result: Array<{ date: string; isoDate: string; reportCount: number; displayDate: string }> = [];
    const today = new Date();

    // Create a map for quick lookup
    const recordMap = new Map(history.records.map(r => [r.date, r]));

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const isoDate = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const fullDisplayDate = date.toLocaleDateString('id-ID', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });

      const record = recordMap.get(isoDate);

      result.push({
        date: displayDate,
        isoDate,
        reportCount: record?.reportCount || 0,
        displayDate: fullDisplayDate,
      });
    }

    return result;
  }, [history.records]);

  // Get reports for a specific date
  const getReportsForDate = useCallback((isoDate: string) => {
    return shiftReports.filter((report) => {
      const reportDate = new Date(report.date).toISOString().split('T')[0];
      return reportDate === isoDate;
    });
  }, [shiftReports]);

  // Get all history records with summary
  const getHistoryRecords = useCallback(() => {
    return history.records;
  }, [history.records]);

  // Clear history (for use with "Hapus Semua Data")
  const clearHistory = useCallback(() => {
    setHistory({ records: [], lastUpdated: "" });
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  }, []);

  return {
    history,
    getChartData,
    getReportsForDate,
    getHistoryRecords,
    clearHistory,
  };
}
