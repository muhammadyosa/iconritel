import iconnetLogo from "@/assets/iconnet-logo.png";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { useDebouncedCallback } from "@/hooks/useDebouncedCallback";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  { title: "Dashboard", path: "/", emoji: "🖥️" },
  { title: "Incident Management", path: "/tickets", emoji: "🎫" },
  { title: "List Team", path: "/teams", emoji: "👥" },
  { title: "List AKV User", path: "/akv", emoji: "🗂️" },
  { title: "List FAT", path: "/fat", emoji: "📍" },
  { title: "List FDT", path: "/fdt", emoji: "📦" },
  { title: "List OLT", path: "/olt", emoji: "📟" },
  { title: "List UPE", path: "/upe", emoji: "🔗" },
  { title: "List BNG", path: "/bng", emoji: "🛰" },
  { title: "List Config", path: "/auto-config", emoji: "💻" },
  { title: "List Note NOC", path: "/notes", emoji: "📖" },
  { title: "Report", path: "/report", emoji: "📝" },
  { title: "Settings", path: "/settings", emoji: "🛠" },
] as const;

const INTERN_PATHS = new Set(["/", "/tickets", "/teams", "/report"]);
const ADMIN_NOC_ONLY_PATHS = new Set(["/notes", "/auto-config"]);

function usePendingUserCount() {
  const { isAdmin } = useUserRole();
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    const { count: c, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_approved", false);
    if (!error && c !== null) setCount(c);
  }, []);

  const { debounced: debouncedFetchCount } = useDebouncedCallback(fetchCount, 300);

  useEffect(() => {
    if (!isAdmin) return;

    fetchCount();

    const channel = supabase
      .channel("pending-users-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        debouncedFetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, fetchCount, debouncedFetchCount]);

  return { count, isAdmin };
}

// Memoized menu item to prevent unnecessary re-renders
const MenuItem = memo(function MenuItem({
  item,
  collapsed,
  showBadge,
  badgeCount,
}: {
  item: typeof menuItems[number];
  collapsed: boolean;
  showBadge: boolean;
  badgeCount: number;
}) {
  const link = (
    <NavLink
      to={item.path}
      className={({ isActive }) =>
        `group relative flex items-center rounded-lg transition-all duration-200 ${
          collapsed
            ? "h-10 w-10 justify-center"
            : "gap-2.5 px-2.5 py-2 w-full"
        } ${
          isActive
            ? "bg-sidebar-accent text-sidebar-foreground shadow-xs font-semibold"
            : "text-sidebar-foreground/65 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-sidebar-primary transition-all duration-200 ${
              isActive ? "h-5 opacity-100" : "h-0 opacity-0"
            }`}
          />
          <span className={`relative text-sm leading-none flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${collapsed ? "" : "w-5 text-center"}`}>
            {item.emoji}
            {showBadge && collapsed && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center animate-pulse">
                {badgeCount}
              </span>
            )}
          </span>
          {!collapsed && (
            <span className="text-[13px] truncate flex-1 text-left flex items-center gap-1.5 animate-[fadeSlideIn_0.2s_ease-out]">
              {item.title}
              {showBadge && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {badgeCount}
                </span>
              )}
            </span>
          )}
        </>
      )}
    </NavLink>
  );


  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <div className="flex justify-center">{link}</div>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10} className="bg-popover text-popover-foreground border text-xs px-2.5 py-1 rounded shadow-md">
          {item.emoji} {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  return link;
});

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";
  const { count: pendingCount, isAdmin } = usePendingUserCount();
  

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const { allowedPaths, isLoading: isAccessLoading } = useMenuAccess();

  const visibleMenuItems = useMemo(() => {
    if (isAccessLoading) return menuItems.filter((item) => INTERN_PATHS.has(item.path));
    return menuItems.filter((item) => allowedPaths.includes(item.path));
  }, [allowedPaths, isAccessLoading]);

  return (
    <Sidebar
      className={`${collapsed ? "w-[52px]" : "w-56"} transition-[width] duration-200 ease-out will-change-[width]`}
      collapsible="icon"
    >
      <SidebarContent className="flex flex-col overflow-x-hidden bg-gradient-sidebar border-r border-sidebar-border">
        {/* Logo */}
        <div className={`flex-shrink-0 border-b border-sidebar-border/70 ${collapsed ? "py-3 px-1.5" : "p-3"}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-foreground/10 flex-shrink-0">
                <img src={iconnetLogo} alt="Iconnet" className="h-6 w-6 object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">NOC RITEL</p>
                <p className="text-[10px] text-sidebar-foreground/50">Iconnet</p>
              </div>
            </div>

          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <img src={iconnetLogo} alt="Iconnet" className="h-7 w-7 object-contain" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="bg-popover text-popover-foreground border text-xs font-bold">
                NOC RITEL
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Menu */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">Menu</span>
          </div>
        )}

        <nav className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide ${collapsed ? "px-1.5 py-1.5 space-y-1" : "px-2 pb-2 space-y-0.5"}`}>

          {visibleMenuItems.map((item) => (
            <MenuItem
              key={item.path}
              item={item}
              collapsed={collapsed}
              showBadge={item.path === "/settings" && isAdmin && pendingCount > 0}
              badgeCount={pendingCount}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-foreground/10 flex-shrink-0">
          <div className={collapsed ? "py-2 px-1.5" : "p-2"}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button onClick={toggleTheme} aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"} className="w-full flex justify-center">
                    <div className="h-9 w-9 rounded-md flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors duration-150">
                      <span className="text-sm">{theme === "dark" ? "☀️" : "🌙"}</span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="bg-popover text-popover-foreground border text-xs">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-colors duration-150"
              >
                <span className="text-sm flex-shrink-0">{theme === "dark" ? "☀️" : "🌙"}</span>
                <span className="text-[13px] truncate">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            )}
          </div>
          {!collapsed && (
            <div className="px-3 pb-2 text-center">
              <p className="text-[9px] text-sidebar-foreground/25">© RZ Corp</p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
