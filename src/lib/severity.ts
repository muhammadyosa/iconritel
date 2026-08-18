/**
 * Severity classification for statistic labels (categories, statuses).
 * Returns theme-aware, high-contrast utility classes defined in index.css.
 */

export type SeverityLevel = "critical" | "warning" | "normal" | "good";

const CRITICAL_KEYWORDS = [
  "LINK LOSS",
  "LINK DOWN",
  "OLT DOWN",
  "UPE DOWN",
  "PORT DOWN",
  "FAT LOSS",
  "CRITICAL",
  "KRITIS",
  "DOWN",
  "LOSS",
];

const WARNING_KEYWORDS = [
  "BAD RX",
  "ONT PROBLEM",
  "PENDING",
  "TERTUNDA",
  "INTERMITTENT",
  "GANGGUAN BERULANG",
  "CABLE PROBLEM",
  "WARNING",
];

const GOOD_KEYWORDS = [
  "RESOLVED",
  "SELESAI",
  "SLA OK",
  "CLOSED",
  "PENGECEKAN BERSAMA",
];

const NORMAL_KEYWORDS = [
  "ON PROGRESS",
  "PROGRES",
  "TOTAL",
  "OPEN",
  "INSIDENT",
  "INCIDENT",
];

export function getSeverity(label: string, value?: number, max?: number): SeverityLevel {
  const l = (label || "").toUpperCase();

  if (GOOD_KEYWORDS.some((k) => l.includes(k))) return "good";
  if (NORMAL_KEYWORDS.some((k) => l.includes(k))) return "normal";
  if (CRITICAL_KEYWORDS.some((k) => l.includes(k))) return "critical";
  if (WARNING_KEYWORDS.some((k) => l.includes(k))) return "warning";

  // Fall back to volume-based severity when the label is unknown
  if (typeof value === "number" && typeof max === "number" && max > 0) {
    const ratio = value / max;
    if (ratio >= 0.66) return "critical";
    if (ratio >= 0.33) return "warning";
    return "normal";
  }
  return "normal";
}

export function severityTextClass(level: SeverityLevel): string {
  return `stat-${level}`;
}

export function severityBadgeClass(level: SeverityLevel): string {
  return `stat-badge-${level}`;
}

/** CSS color string bound to the active theme tokens (safe in both modes). */
export function severityColor(level: SeverityLevel): string {
  return `hsl(var(--severity-${level === "good" ? "good" : level}))`;
}

export function statTextClass(label: string, value?: number, max?: number): string {
  return severityTextClass(getSeverity(label, value, max));
}

export function statBadgeClass(label: string, value?: number, max?: number): string {
  return severityBadgeClass(getSeverity(label, value, max));
}
