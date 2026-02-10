import { useState, useEffect, useRef } from "react";
import { Ticket, ExcelRecord } from "@/types/ticket";
import { toast } from "sonner";
import { loadExcelData, saveExcelData } from "@/lib/indexedDB";

const STORAGE_KEY = "noc_tickets";
const AUTO_CHECK_INTERVAL = 60 * 1000; // Check every minute
const SLA_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error loading tickets from localStorage:", error);
      }
      return [];
    }
  });

  // Excel data persists in IndexedDB
  const [excelData, setExcelData] = useState<ExcelRecord[]>([]);
  const [isLoadingExcel, setIsLoadingExcel] = useState(true);
  
  // Track if initial cleanup has run
  const hasRunInitialCheck = useRef(false);

  // Load Excel data from IndexedDB on mount
  useEffect(() => {
    loadExcelData()
      .then((data) => {
        setExcelData(data);
        setIsLoadingExcel(false);
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error("Error loading Excel data from IndexedDB:", error);
        }
        setIsLoadingExcel(false);
      });
  }, []);

  // Auto-cleanup and SLA check - runs on mount and periodically
  useEffect(() => {
    const runChecks = () => {
      const now = new Date().getTime();
      
      setTickets((prev) => {
        let hasChanges = false;
        let deletedCount = 0;
        
        // First, filter out resolved tickets older than 24 hours since resolved
        const afterCleanup = prev.filter((ticket) => {
          if (ticket.status === "Resolved" && ticket.resolvedAt) {
            const resolvedAge = now - new Date(ticket.resolvedAt).getTime();
            if (resolvedAge >= SLA_THRESHOLD_MS) {
              deletedCount++;
              hasChanges = true;
              return false;
            }
          }
          return true;
        });
        
        // Then, update non-resolved tickets to Critical if over SLA
        const afterSLAUpdate = afterCleanup.map((ticket) => {
          if (ticket.status !== "Resolved" && ticket.status !== "Critical") {
            const ticketAge = now - new Date(ticket.createdISO).getTime();
            if (ticketAge >= SLA_THRESHOLD_MS) {
              hasChanges = true;
              return { ...ticket, status: "Critical" as const };
            }
          }
          return ticket;
        });
        
        // Show toast only on subsequent checks, not initial mount
        if (deletedCount > 0 && hasRunInitialCheck.current) {
          toast.info(`${deletedCount} tiket resolved (>24h) dihapus otomatis`);
        }
        
        hasRunInitialCheck.current = true;
        
        return hasChanges ? afterSLAUpdate : prev;
      });
    };

    // Run immediately on mount
    runChecks();
    
    // Set up interval for periodic checks
    const intervalId = setInterval(runChecks, AUTO_CHECK_INTERVAL);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Save tickets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error saving tickets to localStorage:", error);
      }
      if (error instanceof DOMException && error.name === "QuotaExceededError") {
        toast.error(
          "Storage penuh! Silakan export dan hapus tiket lama untuk membuat ruang."
        );
      }
    }
  }, [tickets]);

  const addTicket = (ticket: Ticket) => {
    setTickets((prev) => [ticket, ...prev]);
  };

  const updateTicket = (id: string, updates: Partial<Ticket>) => {
    setTickets((prev) =>
      prev.map((ticket) => {
        if (ticket.id !== id) return ticket;
        const merged = { ...ticket, ...updates };
        // Track when ticket is resolved
        if (updates.status === "Resolved" && ticket.status !== "Resolved") {
          merged.resolvedAt = new Date().toISOString();
        } else if (updates.status && updates.status !== "Resolved") {
          merged.resolvedAt = undefined;
        }
        return merged;
      })
    );
  };

  const deleteTicket = (id: string) => {
    setTickets((prev) => prev.filter((ticket) => ticket.id !== id));
  };

  const importExcelData = async (data: ExcelRecord[]) => {
    try {
      await saveExcelData(data);
      setExcelData(data);
      toast.success("Data Excel berhasil disimpan secara permanen!");
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error saving Excel data to IndexedDB:", error);
      }
      toast.error("Gagal menyimpan data Excel.");
    }
  };

  return {
    tickets,
    excelData,
    isLoadingExcel,
    addTicket,
    updateTicket,
    deleteTicket,
    importExcelData,
  };
}
