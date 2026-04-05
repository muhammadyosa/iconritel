import iconnetLogo from "@/assets/iconnet-logo.png";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

// Submenu definitions - maps path to its internal tab sub-items
interface SubMenuItem {
  label: string;
  emoji: string;
  tabValue: string;
}

interface MenuItem {
  title: string;
  path: string;
  emoji: string;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  { title: "Dashboard", path: "/", emoji: "🖥️" },
  {
    title: "Incident Management", path: "/tickets", emoji: "🎫",
    subItems: [
      { label: "Preview Data", emoji: "📋", tabValue: "preview-data" },
      { label: "List Incident", emoji: "📑", tabValue: "daftar-ticket" },
    ],
  },
  {
    title: "List Team", path: "/teams", emoji: "👥",
    subItems: [
      { label: "Team Ritel/Serpo", emoji: "👥", tabValue: "team-stats" },
      { label: "Team NOC", emoji: "🧑‍💻", tabValue: "team-noc" },
      { label: "Regional Office", emoji: "🗺", tabValue: "regional-office" },
    ],
  },
  { title: "List AKV User", path: "/akv", emoji: "🗂️" },
  { title: "List FAT", path: "/fat", emoji: "📍" },
  { title: "List FDT", path: "/fdt", emoji: "📦" },
  { title: "List OLT", path: "/olt", emoji: "📟" },
  { title: "List UPE", path: "/upe", emoji: "🔗" },
  { title: "List BNG", path: "/bng", emoji: "🛰" },
  {
    title: "List Configure", path: "/notes", emoji: "📖",
    subItems: [
      { label: "BNG & UPE", emoji: "🛰", tabValue: "bng-upe" },
      { label: "Huawei", emoji: "📟", tabValue: "huawei" },
      { label: "Raisecom", emoji: "📟", tabValue: "raisecom" },
      { label: "Handling Incident", emoji: "📒", tabValue: "handling-incident" },
    ],
  },
  {
    title: "Report", path: "/report", emoji: "📝",
    subItems: [
      { label: "Report Shift", emoji: "🗣️", tabValue: "shift" },
      { label: "SLA 7 JAM", emoji: "⏰", tabValue: "sla" },
      { label: "Pending", emoji: "⏳", tabValue: "pending" },
      { label: "Iconnet", emoji: "📊", tabValue: "dashboard-iconnet" },
    ],
  },
  {
    title: "Settings", path: "/settings", emoji: "🛠",
    subItems: [
      { label: "Import", emoji: "📥", tabValue: "import" },
      { label: "Incidents", emoji: "🎫", tabValue: "incidents" },
      { label: "Reports", emoji: "📝", tabValue: "reports" },
      { label: "History", emoji: "📊", tabValue: "history" },
      { label: "Team NOC", emoji: "🧑‍💻", tabValue: "team-noc" },
      { label: "Users", emoji: "💻", tabValue: "users" },
      { label: "Info", emoji: "📌", tabValue: "info" },
    ],
  },
];

function usePendingUserCount() {
  const { isAdmin } = useUserRole();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCount = async () => {
      const { count: pendingCount, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_approved", false);
      if (!error && pendingCount !== null) setCount(pendingCount);
    };
    fetchCount();
    const channel = supabase
      .channel("pending-users-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchCount())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  return { count, isAdmin };
}

// Popover submenu for collapsed sidebar (hover)
function CollapsedSubmenu({ item, isActive, onNavigate }: { item: MenuItem; isActive: boolean; onNavigate: (path: string, tab?: string) => void }) {
  const [hovered, setHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    setHovered(true);
  };
  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setHovered(false), 150);
  };

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        onClick={() => onNavigate(item.path)}
        className={cn(
          "flex items-center justify-center h-9 w-9 rounded-md transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
        )}
      >
        <span className="text-sm leading-none">{item.emoji}</span>
      </button>
      {/* Popover submenu on hover */}
      {hovered && item.subItems && (
        <div className="absolute left-full top-0 ml-1.5 z-50 animate-scale-in origin-left">
          <div className="bg-popover border border-border rounded-lg shadow-xl py-1.5 min-w-[180px]">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 mb-1">
              {item.title}
            </div>
            {item.subItems.map((sub) => (
              <button
                key={sub.tabValue}
                onClick={() => { onNavigate(item.path, sub.tabValue); setHovered(false); }}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-popover-foreground hover:bg-accent/60 transition-colors"
              >
                <span className="text-xs">{sub.emoji}</span>
                <span>{sub.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Expanded sidebar dropdown menu item
function ExpandedMenuItem({ item, isActive, onNavigate, pendingCount, isAdmin }: {
  item: MenuItem; isActive: boolean; onNavigate: (path: string, tab?: string) => void; pendingCount: number; isAdmin: boolean;
}) {
  const [open, setOpen] = useState(isActive && !!item.subItems);
  const hasSubItems = !!item.subItems && item.subItems.length > 0;
  const showBadge = item.path === "/settings" && isAdmin && pendingCount > 0;

  // Auto-open dropdown when active
  useEffect(() => {
    if (isActive && hasSubItems) setOpen(true);
  }, [isActive, hasSubItems]);

  return (
    <div className="w-full">
      <button
        onClick={() => {
          if (hasSubItems) {
            setOpen((prev) => !prev);
            onNavigate(item.path);
          } else {
            onNavigate(item.path);
          }
        }}
        className={cn(
          "flex items-center w-full gap-3 px-3 py-2 rounded-md text-sm transition-all duration-200",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground hover:translate-x-0.5"
        )}
      >
        <span className="text-sm leading-none flex-shrink-0 w-5">{item.emoji}</span>
        <span className="truncate flex-1 text-left flex items-center gap-2">
          {item.title}
          {showBadge && (
            <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </span>
        {hasSubItems && (
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 flex-shrink-0",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Dropdown sub-items with smooth animation */}
      {hasSubItems && (
        <div
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            open ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="ml-4 mt-0.5 border-l-2 border-sidebar-accent/40 pl-2 space-y-0.5 py-0.5">
            {item.subItems!.map((sub) => (
              <button
                key={sub.tabValue}
                onClick={() => onNavigate(item.path, sub.tabValue)}
                className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-xs text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-all duration-200"
              >
                <span className="text-[11px] leading-none">{sub.emoji}</span>
                <span className="truncate">{sub.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";
  const { count: pendingCount, isAdmin } = usePendingUserCount();
  const { isIntern, isNOC, isReviewer } = useUserRole();
  const navigate = useNavigate();
  const location = useLocation();

  const visibleMenuItems = useMemo(() => {
    const INTERN_PATHS = new Set(["/", "/tickets", "/teams", "/akv", "/settings"]);
    const ADMIN_NOC_ONLY_PATHS = new Set(["/notes"]);
    return menuItems.filter((item) => {
      if (isIntern && !INTERN_PATHS.has(item.path)) return false;
      if (ADMIN_NOC_ONLY_PATHS.has(item.path) && !isAdmin && !isNOC && !isReviewer) return false;
      return true;
    });
  }, [isIntern, isAdmin, isNOC, isReviewer]);

  // Navigate and optionally set a tab value via custom event
  const handleNavigate = (path: string, tabValue?: string) => {
    navigate(path);
    if (tabValue) {
      // Dispatch a custom event that pages can listen to for tab switching
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("sidebar-tab-select", { detail: { path, tabValue } }));
      }, 50);
    }
  };

  return (
    <div className="relative">
      <Sidebar className={cn(collapsed ? "w-[52px]" : "w-56 sm:w-60", "transition-all duration-300 ease-out")} collapsible="icon">
        <SidebarContent className="flex flex-col overflow-x-hidden">
          {/* Header Logo */}
          <div className={cn("border-b border-sidebar-border flex-shrink-0", collapsed ? "py-3 px-1" : "p-3 sm:p-4")}>
            {!collapsed ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <img src={iconnetLogo} alt="Iconnet" className="h-10 sm:h-12 w-auto flex-shrink-0 object-contain" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-semibold text-sidebar-foreground truncate">NOC RITEL</p>
                  <p className="text-xs text-sidebar-foreground/70">Iconnet</p>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center w-full">
                <img src={iconnetLogo} alt="Iconnet" className="h-7 w-7 object-contain flex-shrink-0" />
              </div>
            )}
          </div>

          {/* Menu */}
          <SidebarGroup className="flex-1 overflow-x-hidden overflow-y-auto">
            {!collapsed && <SidebarGroupLabel className="px-3 text-xs">Menu</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className={cn("gap-0.5", collapsed ? "items-center px-0" : "px-2")}>
                {visibleMenuItems.map((item) => {
                  const isActive = location.pathname === item.path;

                  if (collapsed) {
                    return (
                      <SidebarMenuItem key={item.path} className="w-full flex justify-center">
                        <CollapsedSubmenu
                          item={item}
                          isActive={isActive}
                          onNavigate={handleNavigate}
                        />
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.path} className="w-full">
                      <ExpandedMenuItem
                        item={item}
                        isActive={isActive}
                        onNavigate={handleNavigate}
                        pendingCount={pendingCount}
                        isAdmin={isAdmin}
                      />
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Footer */}
          <div className="mt-auto border-t border-sidebar-border flex-shrink-0">
            <div className={cn(collapsed ? "py-2 px-1 flex justify-center" : "p-3")}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={cn(
                  "text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed ? "h-8 w-8 min-w-8" : "h-9 w-full justify-start gap-3 px-2"
                )}
              >
                <span className="text-sm leading-none flex-shrink-0">
                  {theme === "dark" ? "☀️" : "🌙"}
                </span>
                {!collapsed && (
                  <span className="text-sm truncate">
                    {theme === "dark" ? "Light Mode" : "Dark Mode"}
                  </span>
                )}
              </Button>
            </div>
            {!collapsed && (
              <div className="px-3 pb-3 text-center">
                <p className="text-xs text-sidebar-foreground/50">© RZ Corp</p>
              </div>
            )}
          </div>
        </SidebarContent>
      </Sidebar>
      {/* Floating Sidebar Trigger */}
      <SidebarTrigger
        className="absolute top-1/2 -translate-y-1/2 -right-3 z-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent active:scale-90 transition-all text-muted-foreground hover:text-foreground"
      />
    </div>
  );
}
