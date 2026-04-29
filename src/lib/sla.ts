/**
 * Canonical SLA classification — single source of truth.
 *
 * Threshold: 24 hours from createdISO. Any UI that displays "Breached" /
 * "On Time" / "SLA OK" must derive its label from `classifySla` so KPI cards,
 * trend charts, drill-down dialogs, and history aggregates always agree.
 *
 * NOTE: The 8-hour constant in `useCloudTickets` / `useTickets` is the
 * auto-cleanup window for Resolved incidents and is unrelated to SLA.
 */
import type { Ticket } from "@/types/ticket";

export const SLA_THRESHOLD_MS = 24 * 60 * 60 * 1000;

export type SlaStatus = "ontime" | "breached" | "pending";

export const classifySla = (t: Ticket): SlaStatus => {
  if (t.status === "Resolved" && t.resolvedAt) {
    const dur = new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime();
    return dur <= SLA_THRESHOLD_MS ? "ontime" : "breached";
  }
  // Unresolved: breached if age already exceeds threshold, else still pending
  const age = Date.now() - new Date(t.createdISO).getTime();
  return age > SLA_THRESHOLD_MS ? "breached" : "pending";
};

/** True when ticket is over SLA AND still not Resolved (used for "Over SLA" KPI). */
export const isOverSlaUnresolved = (t: Ticket): boolean => {
  if (t.status === "Resolved") return false;
  return Date.now() - new Date(t.createdISO).getTime() > SLA_THRESHOLD_MS;
};

/** True when a Resolved ticket met SLA (resolved within 24h). */
export const isSlaOkResolved = (t: Ticket): boolean => {
  if (t.status !== "Resolved" || !t.resolvedAt) return false;
  return new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime() <= SLA_THRESHOLD_MS;
};

/** True when a Resolved ticket breached SLA (resolved after 24h). */
export const isSlaBreachedResolved = (t: Ticket): boolean => {
  if (t.status !== "Resolved" || !t.resolvedAt) return false;
  return new Date(t.resolvedAt).getTime() - new Date(t.createdISO).getTime() > SLA_THRESHOLD_MS;
};

/** Display label for SLA chip/badge — keep English per project terminology rule. */
export const SLA_LABEL: Record<SlaStatus, string> = {
  ontime: "On Time",
  breached: "Breached",
  pending: "Pending",
};
