import { RITEL_CONSTRAINTS } from "@/types/ticket";

export type SurveillanceCategory = "AKSES" | "DISTRIBUSI" | "BACKBONE" | "FEEDER";

export interface SurveillanceIncident {
  queue: number;
  category: SurveillanceCategory;
  customerName: string;
  incidentId: string;
  departure: string;
  completion: string;
}

export interface SurveillanceCategorySetting {
  startTime?: string;
  intervalHours?: number;
  completionHours?: number;
}

export interface SurveillanceQueueSetting {
  departure?: string;
}

export interface SurveillanceOptions {
  access?: SurveillanceCategorySetting;
  infrastructure?: SurveillanceCategorySetting;
  queueSettings?: Record<number, SurveillanceQueueSetting>;
}

const DEFAULT_START_TIME = "08:00";
const DEFAULT_INTERVAL_HOURS = 2;
const CATEGORY_PATTERN = /\bFTTH\s+(AKSES|DISTRIBUSI|BACKBONE|FEEDER)\b\s*[:\-–]?\s*/i;

function startMinutes(value: string | undefined): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? "");
  if (!match) return 8 * 60;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return 8 * 60;
  return hours * 60 + minutes;
}

function completionLabel(hours: number | undefined, fallback: number): string {
  const value = hours !== undefined && Number.isFinite(hours) && hours > 0 ? hours : fallback;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value)} jam`;
}

function extractAccessCustomer(description: string): string {
  const technicalPatterns = [
    /\/\/|\s+[-–—]\s+/,
    /\b(?:LINK\s+LOSS|LINK\s+DOWN|FAT(?:\b|_)|FDT(?:\b|_)|SPLT(?:\b|_)|OLT\b|SN\s*ONT\b|HOSTNAME\b|SERPO\b)/i,
    /\b[A-Z0-9._-]*-(?:OLT|UPE|NPE|BNG)-\d+\b/i,
    /\b\d+\s*(?:HARI|JAM|MENIT)\b/i,
    ...RITEL_CONSTRAINTS.map((constraint) => new RegExp(`\\b${constraint.replace(/ /g, "\\s+")}\\b`, "i")),
  ];
  const end = technicalPatterns.reduce((index, pattern) => {
    const match = pattern.exec(description);
    return match ? Math.min(index, match.index) : index;
  }, description.length);
  return description.slice(0, end).replace(/^[\s:*\-–—]+|[\s:*\-–—]+$/g, "").trim();
}

export function surveillanceDeparture(
  queue: number,
  startTime = DEFAULT_START_TIME,
  intervalHours = DEFAULT_INTERVAL_HOURS,
): string {
  const interval = Number.isFinite(intervalHours) ? Math.max(0, intervalHours) : DEFAULT_INTERVAL_HOURS;
  const elapsed = Math.max(0, queue - 1) * interval * 60;
  const totalMinutes = ((startMinutes(startTime) + Math.round(elapsed)) % 1440 + 1440) % 1440;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
}

/** Read the queue report as a stream: one queue may contain several incidents. */
export function parseSurveillance(
  raw: string,
  options: SurveillanceOptions = {},
): { incidents: SurveillanceIncident[]; warnings: string[] } {
  const incidents: SurveillanceIncident[] = [];
  const warnings: string[] = [];
  let queue: number | undefined;
  let incidentId = "";
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line) continue;
    if (/^(?:LIST\s+TIKET|TIM\s*:)/i.test(line)) {
      queue = undefined;
      incidentId = "";
      continue;
    }

    const queueMatch = /\bANTRIAN\s*(?:KE\s*)?[-–:]?\s*(\d+)\b/i.exec(line);
    if (queueMatch) {
      queue = Number(queueMatch[1]);
      incidentId = "";
      if (!Number.isSafeInteger(queue) || queue < 1) {
        warnings.push(`Baris ${index + 1}: nomor antrian tidak valid.`);
        queue = undefined;
      }
    }

    const categoryMatch = CATEGORY_PATTERN.exec(line);
    const prefix = categoryMatch ? line.slice(0, categoryMatch.index) : line;
    const idMatch = /\b(?:ID\s*(?:INSIDEN|INCIDENT)|(?:INSIDEN|INCIDENT|INSIDENT)(?:\s*ID)?)\s*[:#-]?\s*(\d+)\b/i.exec(prefix)
      ?? /^\s*\*?(\d{6,})\*?\s*$/.exec(prefix)
      ?? /(?:^|\s)(\d{6,})(?=\s|$)/.exec(prefix);
    if (idMatch) incidentId = idMatch[1];
    if (!categoryMatch) continue;

    const category = categoryMatch[1].toUpperCase() as SurveillanceCategory;
    const description = line.slice(categoryMatch.index + categoryMatch[0].length).trim();
    const customerName = category === "AKSES" ? extractAccessCustomer(description) : description;
    if (!queue || !incidentId || !customerName) {
      warnings.push(`Baris ${index + 1}: ${!queue ? "nomor antrian" : !incidentId ? "ID incident" : "deskripsi tiket"} tidak ditemukan.`);
      incidentId = "";
      continue;
    }

    const categorySetting = category === "AKSES" ? options.access : options.infrastructure;
    const defaultCompletion = category === "AKSES" ? 2 : 4;
    const defaultInterval = category === "AKSES" ? 2 : 4;
    incidents.push({
      queue,
      category,
      customerName,
      incidentId,
      departure: options.queueSettings?.[queue]?.departure || surveillanceDeparture(
        queue,
        categorySetting?.startTime ?? DEFAULT_START_TIME,
        categorySetting?.intervalHours ?? defaultInterval,
      ),
      completion: completionLabel(categorySetting?.completionHours, defaultCompletion),
    });
    incidentId = "";
  }

  return { incidents, warnings };
}

export function formatSurveillance(incidents: SurveillanceIncident[]): string {
  return incidents.map((incident) => [
    `Nama User : ${incident.customerName}`,
    `Tim : Antrian ke - ${incident.queue}`,
    `Id Insiden : ${incident.incidentId}`,
    `Estimasi Berangkat (jam): ${incident.departure}`,
    `Estimasi Penyelesaian (jam): ${incident.completion}`,
  ].join("\n")).join("\n\n");
}
