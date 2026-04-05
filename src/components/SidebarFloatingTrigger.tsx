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
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <button
          onClick={toggleSidebar}
          className="fixed z-30 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-background text-muted-foreground shadow-sm flex items-center justify-center hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all duration-200"
          style={{
            left: collapsed ? 40 : "calc(14rem - 12px)",
            transition: "left 0.2s ease-out",
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={6} className="text-xs">
        {collapsed ? "Expand" : "Collapse"}
      </TooltipContent>
    </Tooltip>
  );
}
