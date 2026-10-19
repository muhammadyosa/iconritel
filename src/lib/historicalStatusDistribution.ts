import type { Ticket } from "@/types/ticket";

export interface StatusHistoryRow {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  created_at: string;
  changed_by_name: string | null;
  reason: string | null;
}

const isStatus = (value: string): value is Ticket["status"] =>
  ["On Progress", "Critical", "Resolved", "Pending"].includes(value);

/** One incident per ID, with its latest recorded status; never sum status transitions. */
export function mergeHistoricalIncidents(events: StatusHistoryRow[], live: Ticket[]): Ticket[] {
  const grouped = new Map<string, { first: StatusHistoryRow; creation?: StatusHistoryRow; last: StatusHistoryRow }>();
  for (const event of events) {
    if (!isStatus(event.new_status)) continue;
    const group = grouped.get(event.ticket_id);
    if (!group) {
      grouped.set(event.ticket_id, { first: event, creation: event.old_status === null ? event : undefined, last: event });
      continue;
    }
    if (event.created_at < group.first.created_at) group.first = event;
    if (event.old_status === null && (!group.creation || event.created_at < group.creation.created_at)) group.creation = event;
    if (event.created_at > group.last.created_at || (event.created_at === group.last.created_at && event.id > group.last.id)) group.last = event;
  }
  const result = new Map<string, Ticket>();
  for (const [id, group] of grouped) {
    const { last } = group;
    if (!isStatus(last.new_status)) continue;
    const creation = group.creation ?? group.first;
    const notes = [
      "Riwayat incident — data operasional sudah tidak tersedia.",
      group.creation ? "Tanggal dibuat berdasarkan catatan pembuatan." : "Tanggal berdasarkan catatan pertama yang tersedia; catatan pembuatan tidak tersedia.",
      `Status terakhir: ${last.new_status}`,
      `Dicatat: ${new Date(last.created_at).toLocaleString("id-ID")}`,
      last.changed_by_name ? `Oleh: ${last.changed_by_name}` : "",
      last.reason ? `Catatan: ${last.reason}` : "",
    ].filter(Boolean).join("\n");
    result.set(id, {
      id, status: last.new_status, createdISO: creation.created_at,
      createdAt: new Date(creation.created_at).toLocaleString("id-ID"),
      serviceId: "-", customerName: "-", serpo: "-", hostname: "-", fatId: "-", snOnt: "-",
      constraint: "RIWAYAT", category: "-", ticketResult: notes,
      createdByName: group.creation?.changed_by_name ?? undefined,
      resolvedAt: last.new_status === "Resolved" ? last.created_at : undefined,
      resolvedByName: last.new_status === "Resolved" ? last.changed_by_name ?? undefined : undefined,
    });
  }
  // Prefer complete operational fields and newest realtime status when still present.
  for (const ticket of live) result.set(ticket.id, ticket);
  return [...result.values()].sort((a, b) => b.createdISO.localeCompare(a.createdISO));
}