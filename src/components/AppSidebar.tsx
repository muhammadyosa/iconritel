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
    <Sidebar className={collapsed ? "w-12 sm:w-14" : "w-56 sm:w-64"} collapsible="icon">
      <SidebarContent>
        <div className="p-2 sm:p-4 border-b border-sidebar-border">
        {!collapsed ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <img src={iconnetLogo} alt="Iconnet" className="h-8 sm:h-12 w-auto" />
              <div className="space-y-0.5 min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-sidebar-foreground truncate">NOC RITEL</p>
                <p className="text-[10px] sm:text-xs text-sidebar-foreground/70">Iconnet</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center">
              <img src={iconnetLogo} alt="Iconnet" className="h-5 w-5 sm:h-6 sm:w-6 object-contain" />
            </div>
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `transition-all duration-200 ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground scale-[1.02]"
                            : "hover:bg-sidebar-accent/50 hover:scale-[1.02] hover:translate-x-1"
                        }`
                      }
                    >
                      {item.emoji ? (
                        <span className="text-sm sm:text-base transition-transform duration-200 group-hover:scale-110">{item.emoji}</span>
                      ) : item.icon ? (
                        <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform duration-200 group-hover:scale-110" />
                      ) : null}
                      {!collapsed && <span className="text-xs sm:text-sm truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto border-t border-sidebar-border">
          <div className="p-2 sm:p-4">
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "default"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent text-xs sm:text-sm"
            >
              <span className="text-sm sm:text-base">{theme === "dark" ? "☀️" : "🌙"}</span>
              {!collapsed && <span className="ml-1 sm:ml-2 truncate">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
            </Button>
          </div>
          {!collapsed && (
            <div className="px-2 sm:px-4 pb-2 sm:pb-4 text-center">
              <p className="text-[10px] sm:text-xs text-sidebar-foreground/50">
                © RZ Corp. All Rights Reserved
              </p>
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
