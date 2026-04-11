import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface OpenTab {
  title: string;
  path: string;
  emoji: string;
}

const STORAGE_KEY = "noc-open-tabs";

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
  "/report": { title: "Report", path: "/report", emoji: "📝" },
  "/settings": { title: "Settings", path: "/settings", emoji: "🛠" },
};

interface TabContextType {
  openTabs: OpenTab[];
  closeTab: (e: React.MouseEvent, path: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
}

const TabContext = createContext<TabContextType>({ openTabs: [], closeTab: () => {}, reorderTabs: () => {} });

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

export function TabProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(loadTabs);

  useEffect(() => {
    const tabInfo = pathMap[location.pathname];
    if (!tabInfo) return;
    setOpenTabs((prev) => {
      if (prev.some((t) => t.path === tabInfo.path)) return prev;
      const next = [...prev, tabInfo];
      saveTabs(next);
      return next;
    });
  }, [location.pathname]);

  const closeTab = useCallback(
    (e: React.MouseEvent, path: string) => {
      e.stopPropagation();
      e.preventDefault();
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
    [location.pathname, navigate]
  );

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setOpenTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      saveTabs(next);
      return next;
    });
  }, []);

  return (
    <TabContext.Provider value={{ openTabs, closeTab, reorderTabs }}>
      {children}
    </TabContext.Provider>
  );
}
