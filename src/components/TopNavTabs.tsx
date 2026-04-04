import { useLocation, useNavigate } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

interface OpenTab {
  title: string;
  path: string;
  emoji: string;
}

const STORAGE_KEY = "noc-open-tabs";

function loadTabs(): OpenTab[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveTabs(tabs: OpenTab[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
}

// Map path to tab info
const pathMap: Record<string, OpenTab> = {
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

export function TopNavTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(loadTabs);

  // When route changes, add tab if not already open
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
        // If closing active tab, navigate to last remaining or dashboard
        if (location.pathname === path) {
          const target = next.length > 0 ? next[next.length - 1].path : "/";
          setTimeout(() => navigate(target), 0);
        }
        return next;
      });
    },
    [location.pathname, navigate]
  );

  if (openTabs.length === 0) return null;

  return (
    <div className="border-b bg-muted/30">
      <ScrollArea className="w-full">
        <div className="flex items-stretch w-max min-w-full">
          {openTabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <div
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  "group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 cursor-pointer border-r border-border/50 text-xs font-medium whitespace-nowrap transition-all select-none",
                  isActive
                    ? "bg-background text-foreground border-b-2 border-b-primary"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                )}
              >
                <span className="text-xs">{tab.emoji}</span>
                <span className="max-w-[120px] sm:max-w-none truncate">{tab.title}</span>
                <button
                  onClick={(e) => closeTab(e, tab.path)}
                  className={cn(
                    "ml-1 p-0.5 rounded-sm transition-colors",
                    "hover:bg-destructive/20 hover:text-destructive",
                    isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70"
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
