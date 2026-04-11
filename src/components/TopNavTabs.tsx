import { useLocation, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenTabs } from "@/contexts/TabContext";
import { useRef, useState, useEffect, useCallback } from "react";

export function TopNavTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTabs, closeTab, reorderTabs } = useOpenTabs();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const didMove = useRef(false);

  // Wheel horizontal scroll
  const onWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollLeft += e.deltaY || e.deltaX;
    }
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

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    didMove.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.dataTransfer.effectAllowed = "move";
    // Make drag image semi-transparent
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIndex !== null && index !== dragIndex) {
      setDragOverIndex(index);
      didMove.current = true;
    }
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      reorderTabs(dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // Touch drag-to-reorder
  const touchDrag = useRef<{ index: number; startX: number; scrollLeft: number } | null>(null);
  const [touchOverIndex, setTouchOverIndex] = useState<number | null>(null);
  const touchDidMove = useRef(false);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    touchDrag.current = {
      index,
      startX: e.touches[0].clientX,
      scrollLeft: el.scrollLeft,
    };
    touchDidMove.current = false;
    setTouchOverIndex(null);
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDrag.current || !scrollRef.current) return;
    const x = e.touches[0].clientX;
    const dx = Math.abs(x - touchDrag.current.startX);
    if (dx > 10) touchDidMove.current = true;

    // Find which tab element is under the touch point
    const tabs = scrollRef.current.querySelectorAll("[data-tab-index]");
    for (let i = 0; i < tabs.length; i++) {
      const rect = tabs[i].getBoundingClientRect();
      if (x >= rect.left && x <= rect.right) {
        setTouchOverIndex(i);
        break;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDrag.current && touchOverIndex !== null && touchDrag.current.index !== touchOverIndex && touchDidMove.current) {
      reorderTabs(touchDrag.current.index, touchOverIndex);
    }
    touchDrag.current = null;
    setTouchOverIndex(null);
  }, [touchOverIndex, reorderTabs]);

  if (openTabs.length === 0) return null;

  const activeDragOver = dragOverIndex ?? touchOverIndex;
  const activeDragFrom = dragIndex ?? touchDrag.current?.index ?? null;

  return (
    <div className="border-b bg-muted/30">
      <div
        ref={scrollRef}
        className="flex items-stretch overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        onWheel={onWheel}
      >
        {openTabs.map((tab, index) => {
          const isActive = location.pathname === tab.path;
          const isBeingDragged = activeDragFrom === index;
          const isDropTarget = activeDragOver === index;

          return (
            <div
              key={tab.path}
              data-active={isActive}
              data-tab-index={index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={() => {
                if (!didMove.current) navigate(tab.path);
              }}
              className={cn(
                "group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 cursor-grab border-r border-border/50 text-xs font-medium whitespace-nowrap transition-all select-none flex-shrink-0",
                isActive
                  ? "bg-background text-foreground border-b-2 border-b-primary"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                isBeingDragged && "opacity-40",
                isDropTarget && "border-l-2 border-l-primary bg-primary/10"
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
