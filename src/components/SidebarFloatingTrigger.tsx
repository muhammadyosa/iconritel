import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarFloatingTrigger() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <button
          onClick={toggleSidebar}
          className="fixed z-30 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full border-2 border-sidebar-border bg-sidebar-background text-sidebar-foreground/70 shadow-lg flex items-center justify-center hover:scale-110 hover:text-sidebar-foreground hover:shadow-xl hover:border-sidebar-primary active:scale-90 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            left: collapsed ? 46 : "calc(250px - 14px)",
            transition: "left 0.3s cubic-bezier(0.4,0,0.2,1), transform 0.2s ease, box-shadow 0.2s ease",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={8}
        className="text-xs"
      >
        {collapsed ? "Expand" : "Collapse"}
      </TooltipContent>
    </Tooltip>
  );
}
