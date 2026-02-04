import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "@/types/ticket";
import { toast } from "sonner";

const SLA_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DbTicket {
  id: string;
  service_id: string;
  customer_name: string;
  serpo: string;
  hostname: string;
  fat_id: string;
  sn_ont: string;
  constraint_type: string;
  category: string;
  ticket_result: string;
  status: string;
  created_at: string;
  created_iso: string;
}

function dbToTicket(db: DbTicket): Ticket {
  return {
    id: db.id,
    serviceId: db.service_id,
    customerName: db.customer_name,
    serpo: db.serpo,
    hostname: db.hostname,
    fatId: db.fat_id,
    snOnt: db.sn_ont,
    constraint: db.constraint_type,
    category: db.category,
    ticketResult: db.ticket_result,
    status: db.status as Ticket["status"],
    createdAt: new Date(db.created_at).toLocaleString("id-ID"),
    createdISO: db.created_iso,
  };
}

function ticketToDb(ticket: Ticket): Omit<DbTicket, "created_at"> {
  return {
    id: ticket.id,
    service_id: ticket.serviceId,
    customer_name: ticket.customerName,
    serpo: ticket.serpo,
    hostname: ticket.hostname,
    fat_id: ticket.fatId,
    sn_ont: ticket.snOnt,
    constraint_type: ticket.constraint,
    category: ticket.category,
    ticket_result: ticket.ticketResult,
    status: ticket.status,
    created_iso: ticket.createdISO,
  };
}

export function useCloudTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tickets from database
  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date().getTime();
      const processedTickets = (data || []).map((db) => {
        const ticket = dbToTicket(db as DbTicket);
        // Check SLA for non-resolved tickets
        if (ticket.status !== "Resolved" && ticket.status !== "Critical") {
          const ticketAge = now - new Date(ticket.createdISO).getTime();
          if (ticketAge >= SLA_THRESHOLD_MS) {
            return { ...ticket, status: "Critical" as const };
          }
        }
        return ticket;
      });

      setTickets(processedTickets);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching tickets:", error);
      }
      toast.error("Gagal memuat tiket dari database");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("tickets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newTicket = dbToTicket(payload.new as DbTicket);
            setTickets((prev) => [newTicket, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedTicket = dbToTicket(payload.new as DbTicket);
            setTickets((prev) =>
              prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
            );
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id;
            setTickets((prev) => prev.filter((t) => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  const addTicket = useCallback(async (ticket: Ticket) => {
    try {
      const dbData = ticketToDb(ticket);
      const { error } = await supabase.from("tickets").insert(dbData);

      if (error) throw error;
      // Realtime will handle updating the list
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding ticket:", error);
      }
      toast.error("Gagal menyimpan tiket ke database");
      throw error;
    }
  }, []);

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    try {
      const dbUpdates: Partial<DbTicket> = {};
      if (updates.serviceId !== undefined) dbUpdates.service_id = updates.serviceId;
      if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
      if (updates.serpo !== undefined) dbUpdates.serpo = updates.serpo;
      if (updates.hostname !== undefined) dbUpdates.hostname = updates.hostname;
      if (updates.fatId !== undefined) dbUpdates.fat_id = updates.fatId;
      if (updates.snOnt !== undefined) dbUpdates.sn_ont = updates.snOnt;
      if (updates.constraint !== undefined) dbUpdates.constraint_type = updates.constraint;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.ticketResult !== undefined) dbUpdates.ticket_result = updates.ticketResult;
      if (updates.status !== undefined) dbUpdates.status = updates.status;

      const { error } = await supabase
        .from("tickets")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
      // Realtime will handle updating the list
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error updating ticket:", error);
      }
      toast.error("Gagal mengupdate tiket");
      throw error;
    }
  }, []);

  const deleteTicket = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);

      if (error) throw error;
      // Realtime will handle updating the list
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error deleting ticket:", error);
      }
      toast.error("Gagal menghapus tiket");
      throw error;
    }
  }, []);

  return {
    tickets,
    isLoading,
    addTicket,
    updateTicket,
    deleteTicket,
    refetch: fetchTickets,
  };
}
