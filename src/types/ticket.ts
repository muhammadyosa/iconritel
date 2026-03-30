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
export const FEEDER_CONSTRAINTS = [
  "FAT BAD RX",
  "FAT LOSS",
  "PORT DOWN",
  "OLT DOWN",
  "CABLE PROBLEM (FEEDER)",
];

export const ALL_CONSTRAINTS = [...RITEL_CONSTRAINTS, ...FEEDER_CONSTRAINTS];

export const FEEDER_CONSTRAINTS_SET = new Set(FEEDER_CONSTRAINTS);

// Generate ticket result format based on constraint
export function generateTicketFormat(
  constraint: string,
  customerName: string,
  serpo: string,
  fatId: string,
  hostname: string,
  snOnt: string,
  portText?: string
): string {
  // FEEDER Format
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
  
  if (constraint === "CABLE PROBLEM (FEEDER)") {
    return `[PROACTIVE NOC RETAIL] CABLE PROBLEM UNDER - ${serpo}`;
  }
  
  // INTERMITTENT - lowercase in format
  if (constraint === "INTERMITTENT") {
    return `${customerName} // INTERMITTENT - ${serpo} // ${fatId} // ${hostname} // ${snOnt} //`;
  }
  
  // RITEL Format (default) - includes CABLE PROBLEM
  return `${customerName} // ${constraint} - ${serpo} // ${fatId} // ${hostname} // ${snOnt} //`;
}
