import * as XLSX from "xlsx";
import { RegionalTeamRecord } from "@/types/regionalTeam";
import { loadRegionalTeamData, saveRegionalTeamData } from "./indexedDB";

// OLT hostname detection helper
const isOltHostname = (val: string) => {
  const v = val.trim().toUpperCase();
  return v.startsWith("SBS-") || v.startsWith("ALL OLT");
};

// Process Regional Team sheet (same logic as multiSheetImport)
function processRegionalTeamSheet(sheet: XLSX.WorkSheet): RegionalTeamRecord[] {
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const records: RegionalTeamRecord[] = [];

  let currentRegion = "";
  let currentSerpoType = "";
  let currentSerpoName = "";
  let mitraNames: string[] = [];
  let mitraHostnames: Record<number, string[]> = {};
  let collectingHostnames = false;

  const flushMitra = () => {
    if (!currentRegion || mitraNames.length === 0) return;
    mitraNames.forEach((name, colIdx) => {
      if (!name || name === currentRegion) return;
      const hostnames = (mitraHostnames[colIdx] || []).filter(h => h.trim() !== "");
      if (hostnames.length === 0 && !name.trim()) return;
      records.push({
        id: `rt-${Date.now()}-${records.length}`,
        region: currentRegion,
        serpoType: currentSerpoType,
        serpoName: currentSerpoName,
        mitraName: name.trim(),
        hostnames,
        teamMember: "",
        createdAt: new Date().toISOString(),
      });
    });
  };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const cell0 = String(row[0] || "").trim();
    const cell1 = String(row[1] || "").trim();

    if (cell0.toUpperCase() === "NAMA TIM") {
      // First flush remaining mitra
      if (collectingHostnames) flushMitra();
      
      const batchSize = mitraNames.filter(n => n && n.trim() && n !== currentRegion).length;
      const startIdx = records.length - batchSize;
      let mitraIdx = 0;
      for (let c = 1; c < row.length; c++) {
        const member = String(row[c] || "").trim();
        if (member && startIdx + mitraIdx >= 0 && startIdx + mitraIdx < records.length) {
          records[startIdx + mitraIdx].teamMember = member;
        }
        mitraIdx++;
      }
      collectingHostnames = false;
      mitraNames = [];
      mitraHostnames = {};
      continue;
    }

    if (cell0.toUpperCase() === "SERPO") {
      if (collectingHostnames) flushMitra();
      collectingHostnames = false;
      mitraNames = [];
      mitraHostnames = {};
      currentSerpoName = cell1;
      if (cell1.toUpperCase().includes("RITEL")) currentSerpoType = "RITEL";
      else if (cell1.toUpperCase().includes("FEEDER")) currentSerpoType = "FEEDER";
      else currentSerpoType = cell1;
      continue;
    }

    if (cell0.toUpperCase() === "NAMA MITRA") {
      if (collectingHostnames) flushMitra();
      mitraNames = [];
      mitraHostnames = {};
      for (let c = 1; c < row.length; c++) {
        mitraNames.push(String(row[c] || "").trim());
        mitraHostnames[c - 1] = [];
      }
      collectingHostnames = true;
      continue;
    }

    if (collectingHostnames) {
      for (let c = 1; c < row.length && c - 1 < mitraNames.length; c++) {
        const val = String(row[c] || "").trim();
        if (val && (isOltHostname(val) || val.length > 3)) {
          mitraHostnames[c - 1].push(val);
        }
      }
      continue;
    }

    const nonEmptyCells = row.filter((c: any) => String(c || "").trim() !== "").length;
    if (nonEmptyCells <= 1 && cell0 && cell0 === cell0.toUpperCase() && cell0.length >= 3 && !cell0.includes("SERPO") && !cell0.includes("NAMA")) {
      if (collectingHostnames) flushMitra();
      currentRegion = cell0;
      collectingHostnames = false;
      mitraNames = [];
      mitraHostnames = {};
      continue;
    }
  }

  if (collectingHostnames) flushMitra();
  return records;
}

/**
 * Load default regional team data from bundled Excel file.
 * Only loads if IndexedDB has no existing data.
 * Returns the data (either from IndexedDB or freshly parsed).
 */
export async function loadDefaultRegionalTeamData(): Promise<RegionalTeamRecord[]> {
  // Check if data already exists in IndexedDB
  const existing = await loadRegionalTeamData();
  if (existing.length > 0) return existing;

  try {
    // Fetch the bundled Excel file
    const response = await fetch("/data/List_Team_Region.xlsx");
    if (!response.ok) return [];

    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Find the first sheet and parse it
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const records = processRegionalTeamSheet(sheet);

    // Save to IndexedDB for future use
    if (records.length > 0) {
      await saveRegionalTeamData(records);
    }

    return records;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error loading default regional team data:", error);
    }
    return [];
  }
}
