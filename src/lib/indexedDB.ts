import { ExcelRecord } from "@/types/ticket";
import { OLT } from "@/types/olt";
import { FAT } from "@/types/fat";

const DB_NAME = "NOC_Database";
const STORE_NAME = "excel_data";
const OLT_STORE_NAME = "olt_data";
const FAT_STORE_NAME = "fat_data";
const UPE_STORE_NAME = "upe_data";
const BNG_STORE_NAME = "bng_data";
const DB_VERSION = 5;

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(OLT_STORE_NAME)) {
        db.createObjectStore(OLT_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(FAT_STORE_NAME)) {
        db.createObjectStore(FAT_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(UPE_STORE_NAME)) {
        db.createObjectStore(UPE_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(BNG_STORE_NAME)) {
        db.createObjectStore(BNG_STORE_NAME);
      }
    };
  });
}

export async function saveExcelData(data: ExcelRecord[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(data, "excel_records");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadExcelData(): Promise<ExcelRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get("excel_records");

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error loading Excel data from IndexedDB:", error);
    }
    return [];
  }
}

export async function clearExcelData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete("excel_records");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// OLT Data functions
export async function saveOLTData(data: OLT[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OLT_STORE_NAME], "readwrite");
    const store = transaction.objectStore(OLT_STORE_NAME);
    const request = store.put(data, "olt_records");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadOLTData(): Promise<OLT[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OLT_STORE_NAME], "readonly");
      const store = transaction.objectStore(OLT_STORE_NAME);
      const request = store.get("olt_records");

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error loading OLT data from IndexedDB:", error);
    }
    return [];
  }
}

export async function clearOLTData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OLT_STORE_NAME], "readwrite");
    const store = transaction.objectStore(OLT_STORE_NAME);
    const request = store.delete("olt_records");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// FAT Data functions
export async function saveFATData(data: FAT[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAT_STORE_NAME], "readwrite");
    const store = transaction.objectStore(FAT_STORE_NAME);
    const request = store.put(data, "fat_records");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function loadFATData(): Promise<FAT[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([FAT_STORE_NAME], "readonly");
      const store = transaction.objectStore(FAT_STORE_NAME);
      const request = store.get("fat_records");

      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error("Error loading FAT data from IndexedDB:", error);
    }
    return [];
  }
}

export async function clearFATData(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FAT_STORE_NAME], "readwrite");
    const store = transaction.objectStore(FAT_STORE_NAME);
    const request = store.delete("fat_records");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all data from all stores including localStorage
export async function clearAllData(): Promise<void> {
  const db = await openDB();
  
  const clearStore = (storeName: string, key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  };

  // Clear IndexedDB stores
  await Promise.all([
    clearStore(STORE_NAME, "excel_records"),
    clearStore(OLT_STORE_NAME, "olt_records"),
    clearStore(FAT_STORE_NAME, "fat_records"),
    clearStore(UPE_STORE_NAME, "upe_records"),
    clearStore(BNG_STORE_NAME, "bng_records"),
  ]);

  // Clear localStorage data (Report data, tickets, history, etc.)
  localStorage.removeItem("shiftReports");
  localStorage.removeItem("ticketUpdates");
  localStorage.removeItem("noc_tickets");
  localStorage.removeItem("ticket_daily_history");
  localStorage.removeItem("shift_report_daily_history");
}
