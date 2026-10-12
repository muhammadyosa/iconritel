export interface Ticket {
  id: string;
  serviceId: string;
  customerName: string;
  serpo: string;
  hostname: string;
  fatId: string;
  snOnt: string;
  constraint: string;
  category: string;
  ticketResult: string;
  status: "On Progress" | "Critical" | "Resolved" | "Pending";
  createdAt: string;
  createdISO: string;
  createdByUserId?: string;
  createdByName?: string;
  resolvedAt?: string; // ISO timestamp when ticket was resolved
  resolvedByUserId?: string;
  resolvedByName?: string;
  pendingReason?: string;
  contactUser?: string;
  pendingAt?: string;
  pendingByName?: string;
  pendingByUserId?: string;
}

export interface ExcelRecord {
  customer?: string;
  service?: string;
  hostname?: string;
  fat?: string;
  sn?: string;
  [key: string]: any;
}

// RITEL Constraints - masuk bucket RITEL
export const RITEL_CONSTRAINTS = [
  "LINK LOSS",
  "BAD RX",
  "ONT PROBLEM",
  "GANGGUAN ICONPLAY",
  "GANGGUAN BERULANG",
  "PENGECEKAN BERSAMA",
  "CABLE PROBLEM",
  "INTERMITTENT",
  "RELOKASI ONT",
  "NO INET",
  "INET SLOW",
];

// FEEDER Constraints - masuk bucket FEEDER (PROACTIVE NOC RETAIL)
// Urut rapi per kelompok perangkat (FAT → PORT → OLT → UPE → LINK → TRAFFIC → LAINNYA),
// masing-masing DOWN sebelum BAD RX, dan varian SEGMEN setelah induknya.
export const FEEDER_CONSTRAINTS = [
  "FAT LOSS",
  "FAT BAD RX",
  "PORT DOWN",
  "PORT BAD RX",
  "OLT DOWN",
  "OLT BAD RX",
  "OLT BAD RX SEGMEN",
  "UPE DOWN",
  "UPE BAD RX",
  "UPE BAD RX SEGMEN",
  "LINK DOWN",
  "LINK BAD RX",
  "FULL TRAFFIC SEGMENT",
  "FULL TRAFFIC",
  "INTERMITTENT UPE/OLT",
  "CABLE PROBLEM (FEEDER)",
];

export const ALL_CONSTRAINTS = [...RITEL_CONSTRAINTS, ...FEEDER_CONSTRAINTS];

export const FEEDER_CONSTRAINTS_SET = new Set(FEEDER_CONSTRAINTS);

export interface TrafficDetails {
  destination: string;
  impactHostname: string;
  impactPort: string;
  linkHostname: string;
}

export const emptyTrafficDetails = (): TrafficDetails => ({
  destination: "", impactHostname: "", impactPort: "", linkHostname: "",
});

/** Restore traffic-specific inputs from the persisted incident result, without schema changes. */
export function parseTrafficDetails(constraint: string, result: string, hostname: string, serpo: string): TrafficDetails {
  const details = emptyTrafficDetails();
  if (constraint === "OLT BAD RX SEGMEN" || constraint === "UPE BAD RX SEGMEN") {
    const prefix = `[PROAKTIF NOC RETAIL] ${constraint} - ${hostname} - TO - `;
    const suffix = ` - ${serpo}`;
    if (result.startsWith(prefix) && result.endsWith(suffix)) details.destination = result.slice(prefix.length, -suffix.length);
  }
  if (constraint === "FULL TRAFFIC") {
    const prefix = `[PROAKTIF NOC RETAIL] FULL TRAFFIC - UNDER OLT - ${hostname} - TO - `;
    const suffix = ` - ${serpo}`;
    if (result.startsWith(prefix) && result.endsWith(suffix)) details.destination = result.slice(prefix.length, -suffix.length);
  }
  if (constraint === "FULL TRAFFIC SEGMENT") {
    const prefix = `[PROACTIVE NOC RETAIL] FULL TRAFFIC SEGMENT - ${hostname} TO `;
    const suffix = `): DOWN - ${serpo}`;
    if (result.startsWith(prefix) && result.endsWith(suffix)) {
      const body = result.slice(prefix.length, -suffix.length);
      const impactAt = body.indexOf(" IMPACT ");
      const linkAt = body.lastIndexOf("(LINK TO ");
      if (impactAt >= 0 && linkAt > impactAt) {
        details.destination = body.slice(0, impactAt);
        const impact = body.slice(impactAt + 8, linkAt);
        const spaceAt = impact.indexOf(" ");
        details.impactHostname = spaceAt < 0 ? impact : impact.slice(0, spaceAt);
        details.impactPort = spaceAt < 0 ? "" : impact.slice(spaceAt + 1);
        details.linkHostname = body.slice(linkAt + 9);
      }
    }
  }
  return details;
}

// Generate ticket result format based on constraint
export function generateTicketFormat(
  constraint: string,
  customerName: string,
  serpo: string,
  fatId: string,
  hostname: string,
  snOnt: string,
  portText?: string,
  forceFeeder?: boolean,
  traffic: TrafficDetails = emptyTrafficDetails()
): string {
  // Manual FEEDER override: when user picks FEEDER tim with a custom (manual) constraint
  // that is not in the predefined FEEDER_CONSTRAINTS list, build PROACTIVE NOC RETAIL format.
  if (
    forceFeeder &&
    constraint &&
    !FEEDER_CONSTRAINTS_SET.has(constraint)
  ) {
    return `[PROACTIVE NOC RETAIL] ${constraint.toUpperCase()} - ${hostname} - ${serpo}`;
  }

  // FEEDER Format
  if (constraint === "OLT BAD RX SEGMEN" || constraint === "UPE BAD RX SEGMEN") {
    const sourcePlaceholder = constraint === "OLT BAD RX SEGMEN" ? "[OLT]" : "[UPE]";
    return `[PROAKTIF NOC RETAIL] ${constraint} - ${hostname.trim() || sourcePlaceholder} - TO - ${traffic.destination.trim() || "[UPE TUJUAN]"} - ${serpo}`;
  }
  if (constraint === "FULL TRAFFIC SEGMENT") {
    return `[PROACTIVE NOC RETAIL] FULL TRAFFIC SEGMENT - ${hostname || "[UPE]"} TO ${traffic.destination.trim() || "[NPE]"} IMPACT ${traffic.impactHostname.trim() || "[UPE IMPACT]"} ${traffic.impactPort.trim() || "[PORT]"}(LINK TO ${traffic.linkHostname.trim() || "[UPE LINK TUJUAN]"}): DOWN - ${serpo}`;
  }
  if (constraint === "FULL TRAFFIC") {
    return `[PROAKTIF NOC RETAIL] FULL TRAFFIC - UNDER OLT - ${hostname || "[OLT/UPE]"} - TO - ${traffic.destination.trim() || "[OLT/UPE TUJUAN]"} - ${serpo}`;
  }

  if (constraint === "FAT BAD RX") {
    return `[PROACTIVE NOC RETAIL] FAT BAD RX - ${fatId} - UNDER - ${hostname} - ${serpo}`;
  }
  
  if (constraint === "FAT LOSS") {
    return `[PROACTIVE NOC RETAIL] FAT LOSS - ${fatId} - UNDER - ${hostname} - ${serpo}`;
  }
  
  if (constraint === "PORT DOWN") {
    const portInfo = portText || "[TEXT]";
    return `[PROACTIVE NOC RETAIL] PORT - ${portInfo} - DOWN UNDER - ${hostname} - ${serpo}`;
  }
  
  if (constraint === "OLT DOWN") {
    return `[PROACTIVE NOC RETAIL] OLT DOWN UNDER - ${hostname} - ${serpo}`;
  }
  
  if (constraint === "OLT BAD RX") {
    return `[PROACTIVE NOC RETAIL] OLT BAD RX UNDER - ${hostname} - ${serpo}`;
  }
  
  if (constraint === "PORT BAD RX") {
    const portInfo = portText || "[TEXT]";
    return `[PROACTIVE NOC RETAIL] PORT - ${portInfo} - BAD RX UNDER - ${hostname} - ${serpo}`;
  }
  
  if (constraint === "CABLE PROBLEM (FEEDER)") {
    return `[PROACTIVE NOC RETAIL] CABLE PROBLEM (FEEDER) - ${hostname} - ${serpo}`;
  }

  if (constraint === "UPE DOWN") {
    return `[PROACTIVE NOC RETAIL] UPE DOWN UNDER - ${hostname} - ${serpo}`;
  }

  if (constraint === "UPE BAD RX") {
    return `[PROACTIVE NOC RETAIL] UPE BAD RX UNDER - ${hostname} - ${serpo}`;
  }

  if (constraint === "LINK DOWN") {
    const hostnameB = portText || "[HOSTNAME UPE TUJUAN]";
    return `[PROACTIVE NOC RETAIL] LINK DOWN UNDER - ${hostname} - TO - ${hostnameB} - ${serpo}`;
  }

  if (constraint === "LINK BAD RX") {
    const hostnameB = portText || "[HOSTNAME UPE TUJUAN]";
    return `[PROACTIVE NOC RETAIL] LINK BAD RX UNDER - ${hostname} - TO - ${hostnameB} - ${serpo}`;
  }

  if (constraint === "INTERMITTENT UPE/OLT") {
    const hostnameB = portText || "[HOSTNAME OLT/UPE TUJUAN]";
    return `[PROACTIVE NOC RETAIL] INTERMITTENT UNDER - ${hostname} - TO - ${hostnameB} - ${serpo}`;
  }
  
  // INTERMITTENT - lowercase in format
  if (constraint === "INTERMITTENT") {
    return `${customerName} // INTERMITTENT - ${serpo} // ${fatId} // ${hostname} // ${snOnt} //`;
  }
  
  // RITEL Format (default) - includes CABLE PROBLEM
  return `${customerName} // ${constraint} - ${serpo} // ${fatId} // ${hostname} // ${snOnt} //`;
}
