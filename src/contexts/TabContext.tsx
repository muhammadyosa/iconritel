import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface OpenTab {
  title: string;
  path: string;
  emoji: string;
  pinned?: boolean;
}

const STORAGE_KEY = "noc-open-tabs";
const PINNED_KEY = "noc-pinned-tabs";

export const pathMap: Record<string, OpenTab> = {
  "/": { title: "Dashboard", path: "/", emoji: "🖥️" },
  "/tickets": { title: "Incident Management", path: "/tickets", emoji: "🎫" },
  "/teams": { title: "List Team", path: "/teams", emoji: "👥" },
  "/akv": { title: "List AKV User", path: "/akv", emoji: "🗂️" },
  "/fat": { title: "List FAT", path: "/fat", emoji: "📍" },
  "/fdt": { title: "Data FDT", path: "/fdt", emoji: "📦" },
  "/olt": { title: "List OLT", path: "/olt", emoji: "📟" },
  "/upe": { title: "Data UPE", path: "/upe", emoji: "🔗" },
  "/bng": { title: "Data BNG", path: "/bng", emoji: "🛰" },
  "/notes": { title: "List Configure", path: "/notes", emoji: "📖" },
  "/auto-config": { title: "List Auto Config", path: "/auto-config", emoji: "💻" },
  "/report": { title: "Report", path: "/report", emoji: "📝" },
  "/settings": { title: "Settings", path: "/settings", emoji: "🛠" },
};

interface TabContextType {
  openTabs: OpenTab[];
  closeTab: (e: React.MouseEvent, path: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  togglePin: (path: string) => void;
  pinnedPaths: Set<string>;
  activeTransition: string | null;
}

const TabContext = createContext<TabContextType>({
  openTabs: [],
  closeTab: () => {},
  reorderTabs: () => {},
  togglePin: () => {},
  pinnedPaths: new Set(),
  activeTransition: null,
});

export const useOpenTabs = () => useContext(TabContext);

function loadTabs(): OpenTab[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTabs(tabs: OpenTab[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

function loadPinned(): Set<string> {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function savePinned(pinned: Set<string>) {
  localStorage.setItem(PINNED_KEY, JSON.stringify([...pinned]));
}

function sortWithPins(tabs: OpenTab[], pinned: Set<string>): OpenTab[] {
  const pinnedTabs = tabs.filter(t => pinned.has(t.path));
  const unpinnedTabs = tabs.filter(t => !pinned.has(t.path));
  return [...pinnedTabs, ...unpinnedTabs];
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(loadTabs);
  const [pinnedPaths, setPinnedPaths] = useState<Set<string>>(loadPinned);
  const [activeTransition, setActiveTransition] = useState<string | null>(null);
  const prevPath = React.useRef(location.pathname);

  // Trigger transition animation on path change
  useEffect(() => {
    if (prevPath.current !== location.pathname) {
      setActiveTransition(location.pathname);
      const timer = setTimeout(() => setActiveTransition(null), 200);
      prevPath.current = location.pathname;
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  useEffect(() => {
    const tabInfo = pathMap[location.pathname];
    if (!tabInfo) return;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.path === tabInfo.path)) return prev;
      const next = sortWithPins([...prev, tabInfo], pinnedPaths);
      saveTabs(next);
      return next;
    });
  }, [location.pathname, pinnedPaths]);

  const closeTab = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      e.preventDefault();
      // Cannot close pinned tabs
      if (pinnedPaths.has(path)) return;
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.path !== path);
        saveTabs(next);
        if (location.pathname === path) {
          const target = next.length > 0 ? next[next.length - 1].path : "/";
          setTimeout(() => navigate(target), 0);
        }
        return next;
      });
    },
    [location.pathname, navigate, pinnedPaths]
  );

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setOpenTabs((prev) => {
      // Don't allow moving unpinned tabs into pinned zone or vice versa
      const pinnedCount = prev.filter(t => pinnedPaths.has(t.path)).length;
      const fromPinned = fromIndex < pinnedCount;
      const toPinned = toIndex < pinnedCount;
      if (fromPinned !== toPinned) return prev;

      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveTabs(next);
      return next;
    });
  }, [pinnedPaths]);

  const togglePin = useCallback((path: string) => {
    setPinnedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      savePinned(next);
      // Re-sort tabs
      setOpenTabs((tabs) => {
        const sorted = sortWithPins(tabs, next);
        saveTabs(sorted);
        return sorted;
      });
      return next;
    });
  }, []);

  return (
    <TabContext.Provider value={{ openTabs, closeTab, reorderTabs, togglePin, pinnedPaths, activeTransition }}>
      {children}
    </TabContext.Provider>
  );
}