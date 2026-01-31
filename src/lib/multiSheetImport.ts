import * as XLSX from "xlsx";
import { ExcelRecord } from "@/types/ticket";
import { OLT } from "@/types/olt";
import { FAT } from "@/types/fat";
import { FDT } from "@/types/fdt";
import { saveExcelData, saveOLTData, saveFATData, saveAKVData } from "./indexedDB";
import { AKV } from "@/types/akv";

// Types for each data category
export interface UPERecord {
  id: string;
  hostnameOLT: string;
  hostnameUPE: string;
  createdAt: string;
}

export interface BNGRecord {
  id: string;
  ipRadius: string;
  hostnameRadius: string;
  ipBng: string;
  hostnameBng: string;
  npe: string;
  vlan: string;
  hostnameOlt: string;
  upe: string;
  portUpe: string;
  kotaKabupaten: string;
  createdAt: string;
}

export interface ImportResult {
  userRecords: ExcelRecord[];
  oltRecords: OLT[];
  fatRecords: FAT[];
  upeRecords: UPERecord[];
  bngRecords: BNGRecord[];
  fdtRecords: FDT[];
  akvRecords: AKV[];
  summary: {
    user: number;
    olt: number;
    fat: number;
    upe: number;
    bng: number;
    fdt: number;
    akv: number;
    totalSheets: number;
    processedSheets: string[];
    skippedSheets: string[];
  };
}

// Sheet detection patterns - prioritized by specificity (most specific first)
const SHEET_PATTERNS = {
  akv: ["list akv user", "list_akv_user", "listakv user", "listakvuser", "akv user", "akvuser", "data akv user", "data akv", "list akv"],
  olt: ["list olt", "listolt", "list_olt", "data olt", "sheet list olt", "daftar olt", "master olt", "inventory olt"],
  fat: ["list fat", "listfat", "list_fat", "data fat", "sheet list fat", "daftar fat", "master fat"],
  fdt: ["list fdt", "listfdt", "list_fdt", "data fdt", "sheet list fdt", "daftar fdt", "master fdt"],
  upe: ["list upe", "listupe", "list_upe", "data upe", "sheet list upe", "daftar upe", "master upe"],
  bng: ["list bng", "listbng", "list_bng", "data bng", "sheet list bng", "daftar bng", "master bng"],
  user: ["list user", "listuser", "list_user", "data user", "pelanggan", "customer", "daftar pelanggan"],
};

// Column mapping for each sheet type
const COLUMN_MAPPINGS = {
  user: {
    customer: ["Customer Name", "customer", "nama pelanggan", "nama", "pelanggan"],
    service: ["Service ID", "service", "id service", "service_id"],
    hostname: ["Hostname OLT", "hostname", "hostname_olt", "olt"],
    fat: ["ID FAT", "fat", "fat_id", "id_fat"],
    sn: ["SN ONT", "sn", "sn_ont", "ont"],
  },
  olt: {
    provinsi: ["PROVINSI", "Provinsi", "provinsi", "province", "nama provinsi", "NAMA PROVINSI"],
    idOlt: ["ID OLT", "id olt", "ID_OLT", "OLT ID", "olt id", "OLT_ID", "idolt", "IDOLT"],
    hostnameOlt: ["HOSTNAME OLT", "Hostname OLT", "hostname olt", "hostname_olt", "HOSTNAME_OLT", "hostnameolt"],
    hostnameUpe: ["HOSTNAME UPE", "Hostname UPE", "hostname upe", "hostname_upe", "HOSTNAME_UPE", "hostnameupe"],
    ipNmsOlt: ["IP NMS OLT", "ip nms olt", "IP_NMS_OLT", "ip_nms_olt", "IPNMSOLT", "ipnmsolt", "IP NMS", "ip nms"],
    tikorOlt: ["TIKOR OLT", "Tikor OLT", "tikor olt", "TIKOR_OLT", "tikor_olt", "tikorolt", "TIKOR", "Tikor", "tikor", "koordinat"],
  },
  fat: {
    provinsi: ["Provinsi", "provinsi", "province", "nama provinsi", "PROVINSI", "Nama Provinsi", "NAMA PROVINSI"],
    fatId: ["ID FAT", "id fat", "ID_FAT", "FAT ID", "fat id", "FAT_ID", "fat", "fat_id", "id_fat", "IDFAT", "idfat"],
    hostname: ["Hostname OLT", "hostname olt", "HOSTNAME OLT", "hostname", "hostname_olt", "olt", "HOSTNAME_OLT", "Hostname", "HOSTNAME"],
    tikor: ["Tikor FAT", "tikor fat", "TIKOR FAT", "Tikor", "tikor", "TIKOR", "koordinat", "Koordinat", "KOORDINAT", "coordinate", "tikor_fat", "TIKOR_FAT"],
  },
  upe: {
    hostnameOLT: ["Hostname OLT", "hostname_olt", "olt", "hostname olt", "HOSTNAME OLT"],
    hostnameUPE: ["Hostname UPE", "hostname_upe", "upe", "hostname upe", "HOSTNAME UPE"],
  },
  bng: {
    ipRadius: ["IP RADIUS", "ip radius", "ip_radius", "ipradius"],
    hostnameRadius: ["HOSTNAME RADIUS", "hostname radius", "hostname_radius"],
    ipBng: ["IP BNG", "ip bng", "ip_bng", "ipbng"],
    hostnameBng: ["HOSTNAME BNG", "hostname bng", "hostname_bng"],
    npe: ["NPE", "npe"],
    vlan: ["VLAN", "vlan", "vlan_id"],
    hostnameOlt: ["HOSTNAME OLT", "hostname olt", "hostname_olt", "olt"],
    upe: ["UPE", "upe", "hostname upe"],
    portUpe: ["PORT UPE", "port upe", "port_upe", "port"],
    kotaKabupaten: ["KOTA/KABUPATEN", "kota/kabupaten", "kota", "kabupaten", "kota kabupaten"],
  },
  fdt: {
    provinsi: ["NAMA PROVINSI", "Nama Provinsi", "nama provinsi", "PROVINSI", "Provinsi", "provinsi"],
    area: ["NAMA AREA", "Nama Area", "nama area", "AREA", "Area", "area"],
    idFdt: ["ID FDT", "id fdt", "ID_FDT", "FDT ID", "fdt id", "FDT_ID", "idfdt", "IDFDT"],
    tikor: ["TIKOR", "Tikor", "tikor", "KOORDINAT", "Koordinat", "koordinat", "TIKOR FDT", "tikor fdt"],
  },
  akv: {
    provinsi: ["Provinsi", "provinsi", "PROVINSI", "province"],
    customer: ["Customer", "customer", "CUSTOMER", "nama customer", "nama pelanggan"],
    serviceId: ["Service ID", "service id", "SERVICE ID", "service_id", "serviceid"],
    tikor: ["Tikor", "tikor", "TIKOR", "koordinat", "Koordinat"],
    contact: ["Contact", "contact", "CONTACT", "kontak", "phone", "telepon", "hp"],
    address: ["Address", "address", "ADDRESS", "alamat", "Alamat", "ALAMAT"],
  },
};

// Helper to find column value with multiple possible headers
function getColumnValue(row: any, possibleHeaders: string[]): string {
  const keys = Object.keys(row);
  
  for (const header of possibleHeaders) {
    // Check exact match first
    if (row[header] !== undefined && row[header] !== null) {
      return String(row[header]).trim();
    }
    
    // Check case-insensitive match
    for (const key of keys) {
      if (key.toLowerCase() === header.toLowerCase()) {
        return String(row[key] ?? "").trim();
      }
    }
    
    // Check if header contains the key (partial match)
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedKey === normalizedHeader || normalizedKey.includes(normalizedHeader) || normalizedHeader.includes(normalizedKey)) {
        return String(row[key] ?? "").trim();
      }
    }
  }
  return "";
}

// Helper to detect sheet type based on name or content
function detectSheetType(sheetName: string, sampleData: any[]): keyof typeof SHEET_PATTERNS | null {
  const normalizedName = sheetName.toLowerCase().trim().replace(/\s+/g, ' ');
  
  // Priority order for matching (most specific first)
  const priorityOrder: (keyof typeof SHEET_PATTERNS)[] = ['akv', 'fdt', 'olt', 'fat', 'upe', 'bng', 'user'];
  
  // Check by exact or close name patterns first
  for (const type of priorityOrder) {
    const patterns = SHEET_PATTERNS[type];
    for (const pattern of patterns) {
      // Exact match or starts with pattern
      if (normalizedName === pattern || normalizedName.startsWith(pattern) || normalizedName.includes(pattern)) {
        return type;
      }
    }
  }
  
  // If name doesn't match, try to detect by column headers
  if (sampleData.length > 0) {
    const headers = Object.keys(sampleData[0]).map(h => h.toLowerCase().trim());
    
    // Check for AKV-specific columns (has Customer + Service ID + Contact/Address)
    const hasCustomer = headers.some(h => h.includes("customer") && !h.includes("name"));
    const hasServiceId = headers.some(h => h.includes("service id") || h.includes("service_id") || h.includes("serviceid"));
    const hasContact = headers.some(h => h.includes("contact") || h.includes("kontak") || h.includes("phone") || h.includes("hp"));
    const hasAddressAkv = headers.some(h => h.includes("address") || h.includes("alamat"));
    if (hasCustomer && hasServiceId && (hasContact || hasAddressAkv)) {
      return "akv";
    }
    
    // Check for BNG-specific columns (most specific)
    if (headers.some(h => h.includes("bng") || h.includes("vlan") || h.includes("port upe") || h.includes("radius"))) {
      return "bng";
    }
    
    // Check for FDT-specific columns (has ID FDT and Area)
    const hasFdtId = headers.some(h => h.includes("id fdt") || h.includes("id_fdt") || h.includes("fdt id") || h === "idfdt");
    const hasArea = headers.some(h => h.includes("area") || h.includes("nama area"));
    if (hasFdtId && hasArea) {
      return "fdt";
    }
    
    // Check for OLT-specific columns (has ID OLT, IP NMS OLT, TIKOR OLT)
    const hasIdOlt = headers.some(h => h.includes("id olt") || h.includes("id_olt") || h.includes("idolt") || h === "id olt");
    const hasIpNmsOlt = headers.some(h => h.includes("ip nms") || h.includes("ip_nms") || h.includes("ipnms"));
    const hasTikorOlt = headers.some(h => 
      (h.includes("tikor") && h.includes("olt")) || 
      h === "tikor olt" || 
      h === "tikor_olt"
    );
    const hasHostnameOlt = headers.some(h => h.includes("hostname olt") || h.includes("hostname_olt") || h.includes("hostnameolt"));
    const hasHostnameUpe = headers.some(h => h.includes("hostname upe") || h.includes("hostname_upe") || h.includes("hostnameupe"));
    const hasProvinsi = headers.some(h => h.includes("provinsi"));
    
    // OLT sheet: has provinsi, id olt, hostname olt, hostname upe, ip nms, tikor olt
    if (hasProvinsi && hasIdOlt && hasHostnameOlt && (hasIpNmsOlt || hasTikorOlt || hasHostnameUpe)) {
      return "olt";
    }
    
    // Alternative OLT detection: has at least 3 OLT-specific columns
    const oltColumnCount = [hasIdOlt, hasIpNmsOlt, hasTikorOlt, hasHostnameOlt && hasHostnameUpe].filter(Boolean).length;
    if (oltColumnCount >= 2 && hasHostnameOlt) {
      return "olt";
    }
    
    // Check for FAT-specific columns (has ID FAT and Tikor)
    const hasFatId = headers.some(h => h.includes("id fat") || h.includes("id_fat") || h.includes("fat id") || h === "idfat");
    const hasTikorFat = headers.some(h => 
      (h.includes("tikor") && !h.includes("olt")) || 
      h === "tikor" || h === "tikor fat"
    );
    if (hasProvinsi && hasFatId) {
      return "fat";
    }
    
    // Check for UPE-specific columns (simpler - just hostname olt + hostname upe without OLT identifiers)
    if (hasHostnameOlt && hasHostnameUpe && !hasIdOlt && !hasIpNmsOlt && !hasTikorOlt) {
      return "upe";
    }
    
    // Check for User data (has Customer Name + Service ID + SN ONT)
    const hasCustomerName = headers.some(h => h.includes("customer name") || h.includes("nama pelanggan"));
    const hasSn = headers.some(h => h.includes("sn") || h.includes("ont"));
    if (hasCustomerName || (headers.some(h => h.includes("service")) && hasSn)) {
      return "user";
    }
  }
  
  return null;
}

// Process User sheet
function processUserSheet(data: any[]): ExcelRecord[] {
  return data
    .map((row) => ({
      customer: getColumnValue(row, COLUMN_MAPPINGS.user.customer),
      service: getColumnValue(row, COLUMN_MAPPINGS.user.service),
      hostname: getColumnValue(row, COLUMN_MAPPINGS.user.hostname),
      fat: getColumnValue(row, COLUMN_MAPPINGS.user.fat),
      sn: getColumnValue(row, COLUMN_MAPPINGS.user.sn),
    }))
    .filter((r) => r.customer || r.service || r.hostname || r.fat || r.sn);
}

// Process OLT sheet
function processOLTSheet(data: any[]): OLT[] {
  return data
    .map((row, index) => ({
      id: `olt-${Date.now()}-${index}`,
      provinsi: getColumnValue(row, COLUMN_MAPPINGS.olt.provinsi),
      idOlt: getColumnValue(row, COLUMN_MAPPINGS.olt.idOlt),
      hostnameOlt: getColumnValue(row, COLUMN_MAPPINGS.olt.hostnameOlt),
      hostnameUpe: getColumnValue(row, COLUMN_MAPPINGS.olt.hostnameUpe),
      ipNmsOlt: getColumnValue(row, COLUMN_MAPPINGS.olt.ipNmsOlt),
      tikorOlt: getColumnValue(row, COLUMN_MAPPINGS.olt.tikorOlt),
      createdAt: new Date().toISOString(),
    }))
    .filter((r) => r.provinsi || r.idOlt || r.hostnameOlt || r.hostnameUpe || r.ipNmsOlt || r.tikorOlt);
}

// Process FAT sheet
function processFATSheet(data: any[]): FAT[] {
  return data
    .map((row, index) => ({
      id: `fat-${Date.now()}-${index}`,
      provinsi: getColumnValue(row, COLUMN_MAPPINGS.fat.provinsi),
      fatId: getColumnValue(row, COLUMN_MAPPINGS.fat.fatId),
      hostname: getColumnValue(row, COLUMN_MAPPINGS.fat.hostname),
      tikor: getColumnValue(row, COLUMN_MAPPINGS.fat.tikor),
      createdAt: new Date().toISOString(),
    }))
    .filter((r) => r.provinsi || r.fatId || r.hostname || r.tikor);
}

// Process UPE sheet
function processUPESheet(data: any[]): UPERecord[] {
  return data
    .map((row, index) => ({
      id: `upe-${Date.now()}-${index}`,
      hostnameOLT: getColumnValue(row, COLUMN_MAPPINGS.upe.hostnameOLT),
      hostnameUPE: getColumnValue(row, COLUMN_MAPPINGS.upe.hostnameUPE),
      createdAt: new Date().toISOString(),
    }))
    .filter((r) => r.hostnameOLT || r.hostnameUPE);
}

// Process BNG sheet
function processBNGSheet(data: any[]): BNGRecord[] {
  return data
    .map((row, index) => ({
      id: `bng-${Date.now()}-${index}`,
      ipRadius: getColumnValue(row, COLUMN_MAPPINGS.bng.ipRadius),
      hostnameRadius: getColumnValue(row, COLUMN_MAPPINGS.bng.hostnameRadius),
      ipBng: getColumnValue(row, COLUMN_MAPPINGS.bng.ipBng),
      hostnameBng: getColumnValue(row, COLUMN_MAPPINGS.bng.hostnameBng),
      npe: getColumnValue(row, COLUMN_MAPPINGS.bng.npe),
      vlan: getColumnValue(row, COLUMN_MAPPINGS.bng.vlan),
      hostnameOlt: getColumnValue(row, COLUMN_MAPPINGS.bng.hostnameOlt),
      upe: getColumnValue(row, COLUMN_MAPPINGS.bng.upe),
      portUpe: getColumnValue(row, COLUMN_MAPPINGS.bng.portUpe),
      kotaKabupaten: getColumnValue(row, COLUMN_MAPPINGS.bng.kotaKabupaten),
      createdAt: new Date().toISOString(),
    }))
    .filter((r) => r.ipRadius || r.hostnameBng || r.hostnameOlt);
}

// Process FDT sheet
function processFDTSheet(data: any[]): FDT[] {
  return data
    .map((row, index) => ({
      id: `fdt-${Date.now()}-${index}`,
      provinsi: getColumnValue(row, COLUMN_MAPPINGS.fdt.provinsi),
      area: getColumnValue(row, COLUMN_MAPPINGS.fdt.area),
      idFDT: getColumnValue(row, COLUMN_MAPPINGS.fdt.idFdt),
      tikor: getColumnValue(row, COLUMN_MAPPINGS.fdt.tikor),
      createdAt: new Date().toISOString(),
    }))
    .filter((r) => r.provinsi || r.area || r.idFDT || r.tikor);
}

// Process AKV sheet
function processAKVSheet(data: any[]): AKV[] {
  return data
    .map((row, index) => ({
      id: `akv-${Date.now()}-${index}`,
      provinsi: getColumnValue(row, COLUMN_MAPPINGS.akv.provinsi),
      customer: getColumnValue(row, COLUMN_MAPPINGS.akv.customer),
      serviceId: getColumnValue(row, COLUMN_MAPPINGS.akv.serviceId),
      tikor: getColumnValue(row, COLUMN_MAPPINGS.akv.tikor),
      contact: getColumnValue(row, COLUMN_MAPPINGS.akv.contact),
      address: getColumnValue(row, COLUMN_MAPPINGS.akv.address),
      createdAt: new Date().toISOString(),
    }))
    .filter((r) => r.provinsi || r.customer || r.serviceId || r.tikor || r.contact || r.address);
}

// Main function to import multi-sheet Excel file
export async function importMultiSheetExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        const result: ImportResult = {
          userRecords: [],
          oltRecords: [],
          fatRecords: [],
          upeRecords: [],
          bngRecords: [],
          fdtRecords: [],
          akvRecords: [],
          summary: {
            user: 0,
            olt: 0,
            fat: 0,
            upe: 0,
            bng: 0,
            fdt: 0,
            akv: 0,
            totalSheets: workbook.SheetNames.length,
            processedSheets: [],
            skippedSheets: [],
          },
        };
        
        // Process each sheet
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
          
          if (jsonData.length === 0) {
            result.summary.skippedSheets.push(`${sheetName} (empty)`);
            continue;
          }
          
          const sheetType = detectSheetType(sheetName, jsonData);
          
          if (!sheetType) {
            result.summary.skippedSheets.push(`${sheetName} (unknown format)`);
            continue;
          }
          
          switch (sheetType) {
            case "user":
              result.userRecords = processUserSheet(jsonData);
              result.summary.user = result.userRecords.length;
              result.summary.processedSheets.push(`${sheetName} → User (${result.userRecords.length})`);
              break;
              
            case "olt":
              result.oltRecords = processOLTSheet(jsonData);
              result.summary.olt = result.oltRecords.length;
              result.summary.processedSheets.push(`${sheetName} → OLT (${result.oltRecords.length})`);
              break;
              
            case "fat":
              result.fatRecords = processFATSheet(jsonData);
              result.summary.fat = result.fatRecords.length;
              result.summary.processedSheets.push(`${sheetName} → FAT (${result.fatRecords.length})`);
              break;
              
            case "upe":
              result.upeRecords = processUPESheet(jsonData);
              result.summary.upe = result.upeRecords.length;
              result.summary.processedSheets.push(`${sheetName} → UPE (${result.upeRecords.length})`);
              break;
              
            case "bng":
              result.bngRecords = processBNGSheet(jsonData);
              result.summary.bng = result.bngRecords.length;
              result.summary.processedSheets.push(`${sheetName} → BNG (${result.bngRecords.length})`);
              break;
              
            case "fdt":
              result.fdtRecords = processFDTSheet(jsonData);
              result.summary.fdt = result.fdtRecords.length;
              result.summary.processedSheets.push(`${sheetName} → FDT (${result.fdtRecords.length})`);
              break;
              
            case "akv":
              result.akvRecords = processAKVSheet(jsonData);
              result.summary.akv = result.akvRecords.length;
              result.summary.processedSheets.push(`${sheetName} → AKV (${result.akvRecords.length})`);
              break;
          }
        }
        
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Gagal membaca file"));
    };
    
    reader.readAsBinaryString(file);
  });
}

// Get available sheets from Excel file
export async function getExcelSheets(file: File): Promise<{ name: string; rowCount: number; type: string | null }[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        
        const sheets = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
          const type = detectSheetType(sheetName, jsonData);
          
          return {
            name: sheetName,
            rowCount: jsonData.length,
            type: type,
          };
        });
        
        resolve(sheets);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Gagal membaca file"));
    };
    
    reader.readAsBinaryString(file);
  });
}
