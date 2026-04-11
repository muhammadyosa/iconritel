import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenTabs } from "@/contexts/TabContext";
import { useRef, useState, useEffect, useCallback } from "react";

export function TopNavTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTabs, closeTab } = useOpenTabs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  // Mouse drag to scroll
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragState.current = { startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    el.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX);
  }, [isDragging]);

  const onMouseUp = useCallback(() => setIsDragging(false), []);

  // Wheel horizontal scroll
  const onWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollLeft += e.deltaY || e.deltaX;
    }
  }, []);

  // Touch swipe support
  const touchState = useRef({ startX: 0, scrollLeft: 0 });
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    touchState.current = { startX: e.touches[0].pageX, scrollLeft: el.scrollLeft };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    const x = e.touches[0].pageX;
    el.scrollLeft = touchState.current.scrollLeft - (x - touchState.current.startX);
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const activeTab = el.querySelector('[data-active="true"]') as HTMLElement | null;
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, [location.pathname, openTabs.length]);

  if (openTabs.length === 0) return null;

  return (
    <div className="border-b bg-muted/30">
      <div
        ref={scrollRef}
        className={cn(
          "flex items-stretch overflow-x-auto scrollbar-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {openTabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <div
              key={tab.path}
              data-active={isActive}
              onClick={() => { if (!isDragging) navigate(tab.path); }}
              className={cn(
                "group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 cursor-pointer border-r border-border/50 text-xs font-medium whitespace-nowrap transition-all select-none flex-shrink-0",
                isActive
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              )}
            >
              <span className="text-xs">{tab.emoji}</span>
              <span className="max-w-[120px] sm:max-w-none truncate">{tab.title}</span>
              <button
                onClick={(e) => closeTab(e, tab.path)}
                className={cn(
                  "ml-1 p-0.5 rounded-sm transition-colors",
                  "hover:bg-destructive/20 hover:text-destructive",
                  isActive ? "opacity-70 hover:opacity-100" : "opacity-0 group-hover:opacity-70"
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
