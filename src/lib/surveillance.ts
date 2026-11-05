import { RITEL_CONSTRAINTS } from "@/types/ticket";

export interface SurveillanceIncident {
  queue: number;
  customerName: string;
  incidentId: string;
  departure: string;
  completion: string;
}

export function surveillanceDeparture(queue: number): string {
  const hour = (8 + (queue - 1) * 2) % 24;
  return `${String(hour).padStart(2, "0")}:00`;
}

function extractCustomer(description: string): string {
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

/** Read the queue report as a stream: one queue may contain several incidents. */
export function parseSurveillance(raw: string): { incidents: SurveillanceIncident[]; warnings: string[] } {
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
    const category = /\bFTTH\s+AKSES\b\s*[:\-–]?\s*/i.exec(line);
    const prefix = category ? line.slice(0, category.index) : line;
    const idMatch = /\b(?:ID\s*(?:INSIDEN|INCIDENT)|(?:INSIDEN|INCIDENT|INSIDENT)(?:\s*ID)?)\s*[:#-]?\s*(\d+)\b/i.exec(prefix)
      ?? /^\s*\*?(\d{6,})\*?\s*$/.exec(prefix)
      ?? /(?:^|\s)(\d{6,})(?=\s|$)/.exec(prefix);
    if (idMatch) incidentId = idMatch[1];
    if (!category) continue;
    const name = extractCustomer(line.slice(category.index + category[0].length));
    if (!queue || !incidentId || !name) {
      warnings.push(`Baris ${index + 1}: ${!queue ? "nomor antrian" : !incidentId ? "ID incident" : "nama user"} tidak ditemukan.`);
      incidentId = "";
      continue;
    }
    incidents.push({ queue, customerName: name, incidentId, departure: surveillanceDeparture(queue), completion: "2 jam" });
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