import iconnetLogo from "@/assets/iconnet-logo.png";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

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
  { title: "List Configure", path: "/notes", emoji: "📖" },
  { title: "Report", path: "/report", emoji: "📝" },
  { title: "Settings", path: "/settings", emoji: "🛠" },
];

function usePendingUserCount() {
  const { isAdmin } = useUserRole();
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    setVisible(false);

    const fetchCount = async () => {
      const { count: pendingCount, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false);

      if (!error && pendingCount !== null) {
        setCount(pendingCount);
        setVisible(true);
      }
    };

    fetchCount();

    const channel = supabase
      .channel("pending-users-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  return { count, isAdmin, visible };
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";
  const { count: pendingCount, isAdmin } = usePendingUserCount();
  const { isIntern, isNOC } = useUserRole();
  

  const visibleMenuItems = useMemo(() => {
    const INTERN_PATHS = new Set(["/", "/tickets", "/teams"]);
    const ADMIN_NOC_ONLY_PATHS = new Set(["/notes"]);
    return menuItems.filter((item) => {
      if (isIntern && !INTERN_PATHS.has(item.path)) return false;
      if (ADMIN_NOC_ONLY_PATHS.has(item.path) && !isAdmin && !isNOC) return false;
      return true;
    });
  }, [isIntern, isAdmin, isNOC]);



  const renderMenuItem = (item: typeof menuItems[0]) => {
    const showBadge = item.path === "/settings" && isAdmin && pendingCount > 0;

    const linkContent = (
      <NavLink
        to={item.path}
        className={({ isActive }) =>
          `flex items-center rounded-lg transition-all duration-300 ease-out group/link ${
            collapsed
              ? "h-10 w-10 justify-center"
              : "gap-3 px-3 py-2.5 w-full hover:translate-x-0.5"
          } ${
            isActive
              ? "bg-sidebar-foreground/15 text-sidebar-foreground shadow-sm"
              : "text-sidebar-foreground/70 hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
          }`
        }
      >
        <span className={`relative text-base leading-none flex-shrink-0 transition-transform duration-200 group-hover/link:scale-110 ${collapsed ? "" : "w-5 text-center"}`}>
          {item.emoji}
          {showBadge && collapsed && (
            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center animate-pulse">
              {pendingCount}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="text-sm font-medium truncate flex-1 text-left flex items-center gap-2">
            {item.title}
            {showBadge && (
              <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </span>
        )}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.title} delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="w-full flex justify-center">
              {linkContent}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={12}
            className="bg-sidebar-background text-sidebar-foreground border-sidebar-border font-medium text-xs px-3 py-1.5 rounded-md shadow-lg"
          >
            {item.emoji} {item.title}
            {showBadge && (
              <span className="ml-1.5 text-destructive-foreground bg-destructive rounded-full px-1.5 py-0.5 text-[10px] font-bold">
                {pendingCount}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div key={item.title} className="w-full">
        {linkContent}
      </div>
    );
  };

  return (
    <Sidebar
      className={`${collapsed ? "w-[60px]" : "w-[250px]"} transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]`}
      collapsible="icon"
    >
      <SidebarContent className="flex flex-col overflow-x-hidden bg-sidebar-background">
        {/* Header Logo */}
        <div className={`flex-shrink-0 border-b border-sidebar-foreground/10 ${collapsed ? "py-4 px-2" : "p-4"}`}>
          {!collapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0">
                <img
                  src={iconnetLogo}
                  alt="Iconnet"
                  className="h-7 w-7 object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-sidebar-foreground tracking-wide truncate">NOC RITEL</p>
                <p className="text-[11px] text-sidebar-foreground/60 font-medium">Iconnet Platform</p>
              </div>
            </div>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center">
                    <img
                      src={iconnetLogo}
                      alt="Iconnet"
                      className="h-6 w-6 object-contain"
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12} className="bg-sidebar-background text-sidebar-foreground border-sidebar-border font-bold text-xs">
                NOC RITEL - Iconnet
              </TooltipContent>
            </Tooltip>
          )}
        </div>



        {/* Menu Label */}
        {!collapsed && (
          <div className="px-4 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Menu
            </span>
          </div>
        )}

        {/* Menu Items */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide ${collapsed ? "px-1.5 space-y-1" : "px-2 space-y-0.5"}`}>
          {visibleMenuItems.map(renderMenuItem)}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-sidebar-foreground/10 flex-shrink-0">
          <div className={`${collapsed ? "py-3 px-2" : "p-3"}`}>
            {collapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="w-full flex justify-center"
                  >
                    <div className="h-9 w-9 rounded-lg bg-sidebar-foreground/10 flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/15 transition-all duration-200">
                      <span className="text-base leading-none">
                        {theme === "dark" ? "☀️" : "🌙"}
                      </span>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="bg-sidebar-background text-sidebar-foreground border-sidebar-border text-xs">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full h-10 justify-start gap-3 px-3 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-foreground/10 transition-all duration-200"
              >
                <span className="text-base leading-none flex-shrink-0">
                  {theme === "dark" ? "☀️" : "🌙"}
                </span>
                <span className="text-sm font-medium truncate">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              </Button>
            )}
          </div>
          {!collapsed && (
            <div className="px-3 pb-3 text-center">
              <p className="text-[10px] text-sidebar-foreground/30 font-medium">© RZ Corp</p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
