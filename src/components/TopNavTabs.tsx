import { NavLink, useLocation } from "react-router-dom";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Incident Management", path: "/tickets", emoji: "🎫" },
  { title: "List Team", path: "/teams", emoji: "👥" },
  { title: "List AKV User", path: "/akv", emoji: "🗂️" },
  { title: "List FAT", path: "/fat", emoji: "📍" },
  { title: "Data FDT", path: "/fdt", emoji: "📦" },
  { title: "List OLT", path: "/olt", emoji: "📟" },
  { title: "Data UPE", path: "/upe", emoji: "🔗" },
  { title: "Data BNG", path: "/bng", emoji: "🛰" },
  { title: "List Configure", path: "/notes", emoji: "📖" },
  { title: "Report", path: "/report", emoji: "📝" },
  { title: "Settings", path: "/settings", emoji: "🛠" },
];

const internAllowed = new Set(["/", "/tickets", "/teams"]);

export function TopNavTabs() {
  const location = useLocation();
  const { role } = useUserRole();

  const filteredItems = role === "intern"
    ? navItems.filter((item) => internAllowed.has(item.path))
    : navItems;

  return (
    <div className="border-b bg-background/80 backdrop-blur-sm">
      <ScrollArea className="w-full">
        <div className="flex items-center gap-0.5 px-1 sm:px-2 py-1 w-max min-w-full">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all",
                  "hover:bg-accent/60 hover:text-accent-foreground",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30 shadow-sm"
                    : "text-muted-foreground"
                )}
              >
                <span className="text-xs sm:text-sm">{item.emoji}</span>
                <span className="hidden xs:inline">{item.title}</span>
                <span className="xs:hidden">{item.title.split(" ").slice(-1)[0]}</span>
              </NavLink>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
