import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarFloatingTrigger() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <button
      onClick={toggleSidebar}
      className="fixed z-30 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-200 hover:shadow-xl"
      style={{ left: collapsed ? 44 : "calc(var(--sidebar-width, 15rem) - 16px)" }}
      aria-label="Toggle sidebar"
    >
      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );
}
