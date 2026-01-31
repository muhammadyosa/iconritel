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

export function AppSidebar() {
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-56 sm:w-60"} collapsible="icon">
      <SidebarContent>
        {/* Header Logo Section */}
        <div className={`border-b border-sidebar-border ${collapsed ? "p-2" : "p-3 sm:p-4"}`}>
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
            <div className="flex justify-center items-center h-10">
              <img 
                src={iconnetLogo} 
                alt="Iconnet" 
                className="h-8 w-8 object-contain" 
              />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-9">
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-2 py-2 rounded-md transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "hover:bg-sidebar-accent/50"
                        }`
                      }
                    >
                      <span className="text-base flex-shrink-0 w-5 text-center leading-none">
                        {item.emoji}
                      </span>
                      {!collapsed && (
                        <span className="text-sm truncate">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer Section */}
        <div className="mt-auto border-t border-sidebar-border">
          <div className={`${collapsed ? "p-2" : "p-3"}`}>
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent h-9"
            >
              <span className="text-base flex-shrink-0 w-5 text-center">
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
              {!collapsed && (
                <span className="ml-2 text-sm truncate">
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
