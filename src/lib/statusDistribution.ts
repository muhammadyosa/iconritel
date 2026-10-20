import type { Ticket } from "@/types/ticket";
import { toLocalDateStr } from "@/lib/dateUtils";

export type StatusPeriod = "today" | "week" | "month" | "all";
type StatusIncident = Pick<Ticket, "status" | "createdISO">;

/** Calendar periods, based on incident creation date, not last status change. */
export function filterStatusPeriod<T extends StatusIncident>(tickets: T[], period: StatusPeriod, now = new Date()): T[] {
  if (period === "all") return tickets;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week") start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === "month") start.setDate(1);
  const firstDate = toLocalDateStr(start);
  const lastDate = toLocalDateStr(now);
  return tickets.filter(ticket => {
    const created = new Date(ticket.createdISO);
    if (!Number.isFinite(created.getTime())) return false;
    const date = toLocalDateStr(created);
    return date >= firstDate && date <= lastDate;
  });
}

export function countIncidentStatuses(tickets: StatusIncident[]) {
  const counts: Record<Ticket["status"], number> = {
    "On Progress": 0, Critical: 0, Resolved: 0, Pending: 0,
  };
  for (const ticket of tickets) counts[ticket.status] += 1;
  return counts;
}

export function summarizeIncidentStatuses(tickets: StatusIncident[]) {
  const counts = countIncidentStatuses(tickets);
  const total = tickets.length;
  const statuses: Ticket["status"][] = ["On Progress", "Critical", "Resolved", "Pending"];
  const percentages = Object.fromEntries(
    statuses.map((status) => [status, total > 0 ? Math.round((counts[status] / total) * 100) : 0]),
  ) as Record<Ticket["status"], number>;
  const dominantStatus = total === 0
    ? null
    : statuses.reduce((dominant, status) => counts[status] > counts[dominant] ? status : dominant);

  return {
    counts,
    total,
    percentages,
    dominantStatus,
    resolutionRate: percentages.Resolved,
  };
}