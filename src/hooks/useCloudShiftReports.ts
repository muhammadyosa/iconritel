import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface CloudShiftReport {
  id: string;
  created_at: string;
  date: string;
  shift: string;
  officer: string;
  olt_down: string | null;
  port_down: string | null;
  fat_loss: string | null;
  issues: string | null;
  notes: string | null;
}

export interface ShiftReportInput {
  date: string;
  shift: string;
  officer: string;
  oltDown: string;
  portDown: string;
  fatLoss: string;
  issues: string;
  notes: string;
}

export function useCloudShiftReports() {
  const [reports, setReports] = useState<CloudShiftReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all shift reports
  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("shift_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching shift reports:", error);
      }
      toast({
        title: "Gagal memuat data",
        description: "Tidak dapat memuat shift reports dari server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Add a new shift report
  const addReport = useCallback(async (input: ShiftReportInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from("shift_reports").insert({
        date: input.date,
        shift: input.shift,
        officer: input.officer,
        olt_down: input.oltDown,
        port_down: input.portDown,
        fat_loss: input.fatLoss,
        issues: input.issues,
        notes: input.notes,
      });

      if (error) throw error;
      
      toast({
        title: "Report shift tersimpan",
        description: "Report shift berhasil disimpan ke cloud.",
      });
      
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding shift report:", error);
      }
      toast({
        title: "Gagal menyimpan",
        description: "Tidak dapat menyimpan shift report ke server.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Delete a shift report
  const deleteReport = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("shift_reports")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Report dihapus",
        description: "Report shift berhasil dihapus.",
      });
      
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting shift report:", error);
      }
      toast({
        title: "Gagal menghapus",
        description: "Tidak dapat menghapus shift report.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Update a shift report
  const updateReport = useCallback(async (id: string, input: ShiftReportInput): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("shift_reports")
        .update({
          date: input.date,
          shift: input.shift,
          officer: input.officer,
          olt_down: input.oltDown,
          port_down: input.portDown,
          fat_loss: input.fatLoss,
          issues: input.issues,
          notes: input.notes,
        })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Report diperbarui",
        description: "Report shift berhasil diperbarui.",
      });
      
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating shift report:", error);
      }
      toast({
        title: "Gagal memperbarui",
        description: "Tidak dapat memperbarui shift report.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Delete all shift reports
  const deleteAllReports = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("shift_reports")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

      if (error) throw error;
      
      toast({
        title: "Semua report dihapus",
        description: "Semua shift report berhasil dihapus.",
      });
      
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting all shift reports:", error);
      }
      toast({
        title: "Gagal menghapus",
        description: "Tidak dapat menghapus semua shift report.",
        variant: "destructive",
      });
      return false;
    }
  }, []);

  // Setup realtime subscription
  useEffect(() => {
    fetchReports();

    const channel = supabase
      .channel("shift-reports-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shift_reports",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReports((prev) => [payload.new as CloudShiftReport, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setReports((prev) =>
              prev.map((report) =>
                report.id === (payload.new as CloudShiftReport).id
                  ? (payload.new as CloudShiftReport)
                  : report
              )
            );
          } else if (payload.eventType === "DELETE") {
            setReports((prev) =>
              prev.filter((report) => report.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  // Convert CloudShiftReport to format compatible with ShiftReportCard
  const getFormattedReports = useCallback(() => {
    return reports.map((report) => ({
      id: report.id,
      date: report.date,
      shift: report.shift,
      officer: report.officer,
      oltDown: report.olt_down || "",
      portDown: report.port_down || "",
      fatLoss: report.fat_loss || "",
      issues: report.issues || "",
      notes: report.notes || "",
      createdAt: report.created_at,
    }));
  }, [reports]);

  return {
    reports,
    isLoading,
    fetchReports,
    addReport,
    updateReport,
    deleteReport,
    deleteAllReports,
    getFormattedReports,
  };
}
