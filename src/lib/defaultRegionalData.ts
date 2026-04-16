const loadXLSX = () => import("xlsx");
import { RegionalTeamRecord } from "@/types/regionalTeam";
import { loadRegionalTeamData, saveRegionalTeamData } from "./indexedDB";

// Region name normalization map
const REGION_NAME_MAP: Record<string, string> = {
  "SUMATERA SELATAN": "SUMATERA SELATAN",
  "SUMATERA BARAT": "SUMBAR",
  "SUMATERA UTARA": "SUMUT",
  "KALIMANTAN BARAT": "KALBAR",
  "KALIMANTAN TIMUR": "KALTIM",
  "KALIMANTAN SELATAN": "KALSEL",
  "SULAWESI SELATAN": "SULSEL",
  "SULAWESI UTARA": "SULUT",
};

const normalizeRegionName = (name: string): string => {
  const upper = name.trim().toUpperCase();
  return REGION_NAME_MAP[upper] || upper;
};

// OLT hostname detection helper
const isOltHostname = (val: string) => {
  const v = val.trim().toUpperCase();
  return v.startsWith("SBS-") || v.startsWith("ALL OLT");
};

// Process Regional Team sheet (same logic as multiSheetImport)
async function processRegionalTeamSheet(sheet: any): Promise<RegionalTeamRecord[]> {
  const XLSX = await loadXLSX();
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
      currentRegion = normalizeRegionName(cell0);
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
  try {
    // Cache-bust to always pick up latest file
    const response = await fetch(`/data/List_Team_Region.xlsx?v=${Date.now()}`, { cache: "no-cache" });
    if (!response.ok) {
      const existing = await loadRegionalTeamData();
      return existing;
    }

    const arrayBuffer = await response.arrayBuffer();
    const XLSX = await loadXLSX();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Parse ALL sheets, not just the first one
    const allRecords: RegionalTeamRecord[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const records = await processRegionalTeamSheet(sheet);
      allRecords.push(...records);
    }

    // Clear old data and save fresh records
    if (allRecords.length > 0) {
      await saveRegionalTeamData(allRecords);
    }

    return allRecords;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error loading default regional team data:", error);
    }
    return [];
  }
}
