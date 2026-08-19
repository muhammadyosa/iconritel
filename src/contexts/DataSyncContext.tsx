import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useCloudTicketsInternal } from "@/hooks/useCloudTickets";
import {
  loadExcelData,
  loadOLTData,
  loadRegionalTeamData,
  saveExcelData,
  saveOLTData,
  saveRegionalTeamData,
} from "@/lib/indexedDB";
import { onDataSync } from "@/lib/dataSyncEvents";
import { isGitHubBackupConfigured, writeJsonFile, GITHUB_SETTINGS_EVENT } from "@/lib/githubBackup";
import type { ExcelRecord, Ticket } from "@/types/ticket";
import type { OLT } from "@/types/olt";
import type { RegionalTeamRecord } from "@/types/regionalTeam";

export type SyncState = "loading" | "synced" | "syncing" | "offline" | "error";

type CloudTickets = ReturnType<typeof useCloudTicketsInternal>;

export interface DataSyncContextValue extends CloudTickets {
  /** Master data slices, shared across every menu. */
  excelData: ExcelRecord[];
  oltData: OLT[];
  regionalTeamData: RegionalTeamRecord[];

  /** Writers persist to IndexedDB and broadcast to all mounted menus + tabs. */
  setExcelData: (data: ExcelRecord[]) => Promise<void>;
  setOltData: (data: OLT[]) => Promise<void>;
  setRegionalTeamData: (data: RegionalTeamRecord[]) => Promise<void>;

  /** Sync/connection status for the header indicator. */
  syncState: SyncState;
  isOnline: boolean;
  isInitialLoading: boolean;
  lastSyncedAt: Date | null;

  refreshAll: () => Promise<void>;

  /** Hybrid mode: push a versioned JSON snapshot to the GitHub repo. */
  githubConfigured: boolean;
  isBackingUp: boolean;
  backupToGitHub: () => Promise<void>;
}

const DataSyncContext = createContext<DataSyncContextValue | null>(null);

const PENDING_BACKUP_KEY = "noc_pending_github_backup";

export function DataSyncProvider({ children }: { children: React.ReactNode }) {
  const cloudTickets = useCloudTicketsInternal();

  const [excelData, setExcelDataState] = useState<ExcelRecord[]>([]);
  const [oltData, setOltDataState] = useState<OLT[]>([]);
  const [regionalTeamData, setRegionalTeamDataState] = useState<RegionalTeamRecord[]>([]);

  const [isMasterLoading, setIsMasterLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [githubConfigured, setGithubConfigured] = useState(isGitHubBackupConfigured());
  const [isBackingUp, setIsBackingUp] = useState(false);

  const ticketsRef = useRef<Ticket[]>(cloudTickets.tickets);
  ticketsRef.current = cloudTickets.tickets;

  // ---- Master data loading (IndexedDB = offline-first local cache) ----------
  const loadSlice = useCallback(async (key: "excel" | "olt" | "regional" | "all") => {
    try {
      if (key === "excel" || key === "all") setExcelDataState(await loadExcelData());
      if (key === "olt" || key === "all") setOltDataState(await loadOLTData());
      if (key === "regional" || key === "all") setRegionalTeamDataState(await loadRegionalTeamData());
      setHasError(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error("DataSync load failed:", error);
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadSlice("all");
      if (active) {
        setIsMasterLoading(false);
        setLastSyncedAt(new Date());
      }
    })();
    return () => {
      active = false;
    };
  }, [loadSlice]);

  // Any write anywhere in the app (or in another tab) refreshes the slice, so
  // switching menus never shows stale data and never needs a reload.
  useEffect(() => onDataSync((key) => void loadSlice(key)), [loadSlice]);

  // ---- Connectivity -------------------------------------------------------
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      void refreshAllRef.current?.();
    };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ---- Writers ------------------------------------------------------------
  const setExcelData = useCallback(async (data: ExcelRecord[]) => {
    setExcelDataState(data);
    await saveExcelData(data);
  }, []);

  const setOltData = useCallback(async (data: OLT[]) => {
    setOltDataState(data);
    await saveOLTData(data);
  }, []);

  const setRegionalTeamData = useCallback(async (data: RegionalTeamRecord[]) => {
    setRegionalTeamDataState(data);
    await saveRegionalTeamData(data);
  }, []);

  // ---- Refresh ------------------------------------------------------------
  const refreshAll = useCallback(async () => {
    setIsSyncing(true);
    try {
      await Promise.all([cloudTickets.refetch(), loadSlice("all")]);
      setLastSyncedAt(new Date());
      setHasError(false);
    } catch (error) {
      if (import.meta.env.DEV) console.error("DataSync refresh failed:", error);
      setHasError(true);
    } finally {
      setIsSyncing(false);
    }
  }, [cloudTickets, loadSlice]);

  const refreshAllRef = useRef<typeof refreshAll>();
  refreshAllRef.current = refreshAll;

  // Keep the timestamp honest: cloud realtime pushes update tickets on their
  // own, so stamp the clock whenever the ticket list settles.
  useEffect(() => {
    if (!cloudTickets.isLoading) setLastSyncedAt(new Date());
  }, [cloudTickets.isLoading, cloudTickets.tickets]);

  // ---- GitHub snapshot backup (hybrid) ------------------------------------
  useEffect(() => {
    const listener = () => setGithubConfigured(isGitHubBackupConfigured());
    window.addEventListener(GITHUB_SETTINGS_EVENT, listener);
    return () => window.removeEventListener(GITHUB_SETTINGS_EVENT, listener);
  }, []);

  const backupToGitHub = useCallback(async () => {
    if (!isGitHubBackupConfigured()) {
      toast.error("Konfigurasi GitHub belum lengkap", {
        description: "Isi token dan repositori lewat tombol Key di pojok kiri bawah.",
      });
      return;
    }
    if (!navigator.onLine) {
      try {
        localStorage.setItem(PENDING_BACKUP_KEY, "1");
      } catch {
        /* noop */
      }
      toast.warning("Mode offline — backup ditunda sampai koneksi kembali.");
      return;
    }

    setIsBackingUp(true);
    const stamp = new Date().toISOString();
    try {
      await writeJsonFile("data/tickets.json", ticketsRef.current, `chore(data): sync tickets ${stamp}`);
      await writeJsonFile("data/excel-data.json", excelData, `chore(data): sync excel ${stamp}`);
      await writeJsonFile("data/olt-data.json", oltData, `chore(data): sync olt ${stamp}`);
      await writeJsonFile(
        "data/regional-team.json",
        regionalTeamData,
        `chore(data): sync regional team ${stamp}`
      );
      try {
        localStorage.removeItem(PENDING_BACKUP_KEY);
      } catch {
        /* noop */
      }
      setLastSyncedAt(new Date());
      toast.success("Snapshot data berhasil dikirim ke GitHub");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (import.meta.env.DEV) console.error("GitHub backup failed:", message);
      toast.error("Backup ke GitHub gagal", { description: message.slice(0, 180) });
    } finally {
      setIsBackingUp(false);
    }
  }, [excelData, oltData, regionalTeamData]);

  // Flush a deferred backup once the connection returns.
  useEffect(() => {
    if (!isOnline || !githubConfigured) return;
    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_BACKUP_KEY) === "1";
    } catch {
      /* noop */
    }
    if (pending) void backupToGitHub();
  }, [isOnline, githubConfigured, backupToGitHub]);

  const isInitialLoading = isMasterLoading || cloudTickets.isLoading;

  const syncState: SyncState = !isOnline
    ? "offline"
    : isInitialLoading
      ? "loading"
      : isSyncing || isBackingUp
        ? "syncing"
        : hasError
          ? "error"
          : "synced";

  const value = useMemo<DataSyncContextValue>(
    () => ({
      ...cloudTickets,
      excelData,
      oltData,
      regionalTeamData,
      setExcelData,
      setOltData,
      setRegionalTeamData,
      syncState,
      isOnline,
      isInitialLoading,
      lastSyncedAt,
      refreshAll,
      githubConfigured,
      isBackingUp,
      backupToGitHub,
    }),
    [
      cloudTickets,
      excelData,
      oltData,
      regionalTeamData,
      setExcelData,
      setOltData,
      setRegionalTeamData,
      syncState,
      isOnline,
      isInitialLoading,
      lastSyncedAt,
      refreshAll,
      githubConfigured,
      isBackingUp,
      backupToGitHub,
    ]
  );

  return <DataSyncContext.Provider value={value}>{children}</DataSyncContext.Provider>;
}

export function useDataSync(): DataSyncContextValue {
  const ctx = useContext(DataSyncContext);
  if (!ctx) throw new Error("useDataSync must be used within a DataSyncProvider");
  return ctx;
}

/** Shared ticket state — a single cloud subscription behind the context. */
export function useCloudTickets(): CloudTickets {
  const { tickets, isLoading, addTicket, updateTicket, deleteTicket, refetch } = useDataSync();
  return { tickets, isLoading, addTicket, updateTicket, deleteTicket, refetch };
}
