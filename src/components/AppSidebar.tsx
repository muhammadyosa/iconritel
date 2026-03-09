import iconnetLogo from "@/assets/iconnet-logo.png";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

const menuItems = [
  { title: "Dashboard", icon: null, path: "/", emoji: "🖥️" },
  { title: "Ticket Management", icon: null, path: "/tickets", emoji: "🎫" },
  { title: "List Team", icon: null, path: "/teams", emoji: "👥" },
  { title: "List AKV User", icon: null, path: "/akv", emoji: "🗂️" },
  { title: "List FAT", icon: null, path: "/fat", emoji: "📍" },
  { title: "List FDT", icon: null, path: "/fdt", emoji: "📦" },
  { title: "List OLT", icon: null, path: "/olt", emoji: "📟" },
  { title: "List UPE", icon: null, path: "/upe", emoji: "🔗" },
  { title: "List BNG", icon: null, path: "/bng", emoji: "🛰" },
  { title: "Report", icon: null, path: "/report", emoji: "📝" },
  { title: "Settings", icon: null, path: "/settings", emoji: "🛠" },
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

      if (!error && pendingCount !== null) {
        setCount(pendingCount);
      }
    };

    fetchCount();

    // Listen for realtime changes on profiles
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

  return { count, isAdmin };
}

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";
  const { count: pendingCount, isAdmin } = usePendingUserCount();

  return (
    <Sidebar className={collapsed ? "w-[52px]" : "w-56 sm:w-60"} collapsible="icon">
      <SidebarContent className="flex flex-col overflow-x-hidden">
        {/* Header Logo Section */}
        <div className={`border-b border-sidebar-border flex-shrink-0 ${collapsed ? "py-3 px-1" : "p-3 sm:p-4"}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={iconnetLogo} 
                alt="Iconnet" 
                className="h-10 sm:h-12 w-auto flex-shrink-0 object-contain" 
              />
              <div className="space-y-0.5 min-w-0 flex-1">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">NOC RITEL</p>
                <p className="text-xs text-sidebar-foreground/70">Iconnet</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center w-full">
              <img 
                src={iconnetLogo} 
                alt="Iconnet" 
                className="h-7 w-7 object-contain flex-shrink-0" 
              />
            </div>
          )}
        </div>

        <SidebarGroup className="flex-1 overflow-x-hidden">
          {!collapsed && <SidebarGroupLabel className="px-3 text-xs">Menu</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className={`gap-0.5 ${collapsed ? "items-center px-0" : "px-2"}`}>
              {menuItems.map((item) => {
                const showBadge = item.path === "/settings" && isAdmin && pendingCount > 0;
                return (
                  <SidebarMenuItem key={item.title} className={collapsed ? "w-full flex justify-center" : "w-full"}>
                    <SidebarMenuButton asChild className={collapsed ? "h-8 w-8 min-w-8 p-0 !justify-center" : "h-9 justify-start"}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center rounded-md transition-all duration-300 ease-out ${
                            collapsed 
                              ? "h-8 w-8 min-w-8 !justify-center hover:scale-110" 
                              : "gap-3 px-3 py-2 w-full !justify-start hover:translate-x-1 hover:scale-[1.02]"
                          } ${
                            isActive
                              ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                              : "hover:bg-sidebar-accent/50 hover:shadow-sm"
                          }`
                        }
                      >
                        <span className={`relative text-sm leading-none flex-shrink-0 ${collapsed ? "text-center" : "w-5"}`}>
                          {item.emoji}
                          {showBadge && collapsed && (
                            <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                              {pendingCount}
                            </span>
                          )}
                        </span>
                        {!collapsed && (
                          <span className="text-sm truncate flex-1 text-left flex items-center gap-2">
                            {item.title}
                            {showBadge && (
                              <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                                {pendingCount}
                              </span>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer Section */}
        <div className="mt-auto border-t border-sidebar-border flex-shrink-0">
          <div className={`${collapsed ? "py-2 px-1 flex justify-center" : "p-3"}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className={`text-sidebar-foreground hover:bg-sidebar-accent ${
                collapsed ? "h-8 w-8 min-w-8" : "h-9 w-full justify-start gap-3 px-2"
              }`}
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
  );
}
