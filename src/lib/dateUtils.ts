/**
 * Date utilities for WIB / browser-local accuracy.
 *
 * IMPORTANT: Never use `new Date(x).toISOString().split('T')[0]` to bucket
 * tickets by day — it converts to UTC and shifts the calendar day for any
 * timezone east of UTC (WIB = UTC+7). Use `toLocalDateStr` instead so all
 * dashboard KPIs, trend charts, history aggregates, and drill-down dialogs
 * agree on the same local date.
 */

export const toLocalDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const todayLocalStr = (): string => toLocalDateStr(new Date());

/** Parse a YYYY-MM-DD string back into a local-midnight Date (no UTC drift). */
export const parseLocalDateStr = (iso: string): Date => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
