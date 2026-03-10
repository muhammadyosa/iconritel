import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ticket } from "@/types/ticket";
import { toast } from "sonner";

const SLA_THRESHOLD_MS = 8 * 60 * 60 * 1000; // 8 hours

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
  resolved_at: string | null;
}

interface ProfileData {
  user_id: string;
  display_name: string | null;
  email: string;
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
  resolved_at?: string | null;
}

function dbToTicket(db: DbTicket, profilesMap: Map<string, ProfileData>): Ticket {
  // Get the current display name from profiles, fallback to stored name
  let currentDisplayName = db.created_by_name || undefined;
  
  if (db.created_by_user_id) {
    const profile = profilesMap.get(db.created_by_user_id);
    if (profile) {
      currentDisplayName = profile.display_name || profile.email.split("@")[0];
    }
  }
  
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
    createdByName: currentDisplayName,
    resolvedAt: db.resolved_at || undefined,
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
    resolved_at: ticket.resolvedAt || null,
  };
}

export function useCloudTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const profilesMapRef = useRef<Map<string, ProfileData>>(new Map());

  // Fetch all profiles for mapping creator names
  const fetchProfiles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name, email");

      if (error) throw error;

      const map = new Map<string, ProfileData>();
      (data || []).forEach((profile) => {
        map.set(profile.user_id, profile as ProfileData);
      });
      profilesMapRef.current = map;
      return map;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error fetching profiles:", error);
      }
      return new Map<string, ProfileData>();
    }
  }, []);

  // Delete resolved tickets older than 24 hours from the database
  const cleanupResolvedTickets = useCallback(async () => {
    try {
      const cutoff = new Date(Date.now() - SLA_THRESHOLD_MS).toISOString();
      const { error } = await supabase
        .from("tickets")
        .delete()
        .eq("status" as never, "Resolved" as never)
        .not("resolved_at" as never, "is" as never, null as never)
        .lt("resolved_at" as never, cutoff as never) as unknown as { error: Error | null };

      if (error) {
        if (import.meta.env.DEV) {
          console.error("Error cleaning up resolved tickets:", error);
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("Error in cleanup:", error);
      }
    }
  }, []);

  // Fetch tickets from database
  const fetchTickets = useCallback(async () => {
    try {
      // Clean up old resolved tickets first
      await cleanupResolvedTickets();

      // Fetch profiles first to get current display names
      const currentProfilesMap = await fetchProfiles();

      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date().getTime();
      const processedTickets = (data || []).map((db) => {
        const ticket = dbToTicket(db as DbTicket, currentProfilesMap);
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
      toast.error("Gagal memuat incident dari database");
    } finally {
      setIsLoading(false);
    }
  }, [fetchProfiles, cleanupResolvedTickets]);

  // Subscribe to realtime changes + periodic cleanup
  useEffect(() => {
    fetchTickets();

    // Periodic cleanup every minute for resolved tickets > 24h
    const cleanupInterval = setInterval(() => {
      cleanupResolvedTickets().then(() => {
        // After cleanup, refetch to sync state
        fetchTickets();
      });
    }, 60 * 1000);

    const ticketsChannel = supabase
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
            const newTicket = dbToTicket(payload.new as DbTicket, profilesMapRef.current);
            setTickets((prev) => [newTicket, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updatedTicket = dbToTicket(payload.new as DbTicket, profilesMapRef.current);
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

    // Subscribe to profile changes to update creator names in real-time
    const profilesChannel = supabase
      .channel("profiles-realtime-tickets")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        () => {
          // Refetch all data when a profile is updated
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      clearInterval(cleanupInterval);
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(profilesChannel);
    };
  }, [fetchTickets, cleanupResolvedTickets]);

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
      toast.error(`Gagal menyimpan incident ke database: ${message}`);
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
      if (updates.status !== undefined) {
        dbUpdates.status = updates.status;
        // Set resolved_at when status changes to Resolved, clear it otherwise
        if (updates.status === "Resolved") {
          dbUpdates.resolved_at = new Date().toISOString();
        } else {
          dbUpdates.resolved_at = null;
        }
      }

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
      toast.error("Gagal mengupdate incident");
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
