import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SidebarFloatingTrigger() {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  // On mobile: show a hamburger menu button fixed top-left
  if (isMobile) {
    return (
      <>
        {/* Swipe hint indicator - thin line on left edge */}
        {!state.includes("open") && (
          <div
            className="fixed left-0 top-1/3 z-20 h-1/3 w-1 rounded-r-full bg-primary/25 animate-pulse pointer-events-none"
            aria-hidden="true"
          />
        )}
        <button
          onClick={toggleSidebar}
          className="fixed z-30 top-2.5 left-2 h-8 w-8 rounded-md border border-border bg-background/90 backdrop-blur-sm text-muted-foreground shadow-sm flex items-center justify-center hover:bg-accent hover:text-accent-foreground active:scale-95 transition-all duration-200 touch-target-sm"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </>
    );
  }

  // On desktop: floating toggle at sidebar edge
  return (
    <Tooltip delayDuration={400}>
      <TooltipTrigger asChild>
        <button
          onClick={toggleSidebar}
          className="fixed z-30 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-background text-muted-foreground shadow-sm flex items-center justify-center hover:scale-110 hover:bg-accent hover:text-accent-foreground active:scale-90 transition-all duration-200"
          style={{
            left: collapsed ? "calc(3rem - 12px)" : "calc(16rem - 12px)",
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
