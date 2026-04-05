import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function SidebarFloatingTrigger() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <button
      onClick={toggleSidebar}
      className="fixed z-30 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border-2 border-border bg-background text-muted-foreground shadow-md flex items-center justify-center hover:scale-110 hover:bg-accent hover:text-accent-foreground hover:shadow-lg hover:border-primary/40 active:scale-90 transition-all duration-200"
      style={{ left: collapsed ? 40 : "calc(var(--sidebar-width, 15rem) - 14px)" }}
      aria-label="Toggle sidebar"
    >
      {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
    </button>
  );
}
