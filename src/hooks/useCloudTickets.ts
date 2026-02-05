import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "@/types/ticket";
import { toast } from "sonner";

const SLA_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DbTicket {
  id: string;
  ticket_id: string;
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
  created_by_user_id: string | null;
  created_by_name: string | null;
}

// Type for inserting tickets (excludes auto-generated id)
interface DbTicketInsert {
  ticket_id: string;
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
  created_iso: string;
  created_by_user_id?: string;
  created_by_name?: string;
}

function dbToTicket(db: DbTicket): Ticket {
  return {
    id: db.ticket_id,
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
    createdByUserId: db.created_by_user_id || undefined,
    createdByName: db.created_by_name || undefined,
  };
}

function ticketToDb(ticket: Ticket): DbTicketInsert {
  // IMPORTANT: Never write to the UUID primary key column `id`.
  // The app-level Ticket.id is a user-provided string, and is stored in `ticket_id`.
  return {
    ticket_id: ticket.id,
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
    created_by_user_id: ticket.createdByUserId,
    created_by_name: ticket.createdByName,
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
            const deletedTicketId = (payload.old as { ticket_id: string }).ticket_id;
            setTickets((prev) => prev.filter((t) => t.id !== deletedTicketId));
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
      const dbData: DbTicketInsert = ticketToDb(ticket);

      // Extra guard: ensure we never accidentally send a string ticket id into the UUID PK column.
      // (Helps avoid "invalid input syntax for type uuid" errors if any future refactor spreads objects.)
      delete (dbData as unknown as { id?: unknown }).id;

      const { error } = await supabase.from("tickets").insert(dbData as never);

      if (error) throw error;
      // Realtime will handle updating the list
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error adding ticket:", error);
      }

      // Show a more actionable message (still generic enough for end users).
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Unknown error";
      toast.error(`Gagal menyimpan tiket ke database: ${message}`);
      throw error;
    }
  }, []);

  const updateTicket = useCallback(async (id: string, updates: Partial<Ticket>) => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.id !== undefined) dbUpdates.ticket_id = updates.id;
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

      const { error } = await (supabase
        .from("tickets")
        .update(dbUpdates as never)
        .eq("ticket_id" as never, id) as unknown as Promise<{ error: Error | null }>);

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
      const { error } = await (supabase
        .from("tickets")
        .delete()
        .eq("ticket_id" as never, id) as unknown as Promise<{ error: Error | null }>);

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
