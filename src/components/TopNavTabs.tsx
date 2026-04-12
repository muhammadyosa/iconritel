import { useLocation, useNavigate } from "react-router-dom";
import { X, Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOpenTabs } from "@/contexts/TabContext";
import { useRef, useState, useEffect, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

export function TopNavTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { openTabs, closeTab, reorderTabs, togglePin, pinnedPaths } = useOpenTabs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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

  // Desktop drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isMobile) { e.preventDefault(); return; }
    setDragIndex(index);
    didMove.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.dataTransfer.effectAllowed = "move";
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2);
  };

  const handleDrag = (e: React.DragEvent) => {
    if (dragIndex === null) return;
    const dx = Math.abs(e.clientX - dragStartPos.current.x);
    const dy = Math.abs(e.clientY - dragStartPos.current.y);
    if (dx > 5 || dy > 5) didMove.current = true;
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
  const touchDrag = useRef<{ index: number; startX: number; active: boolean } | null>(null);
  const [touchOverIndex, setTouchOverIndex] = useState<number | null>(null);
  const touchDidMove = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    touchDidMove.current = false;
    setTouchOverIndex(null);
    const startX = e.touches[0].clientX;
    touchDrag.current = { index, startX, active: false };
    if (isMobile) {
      longPressTimer.current = setTimeout(() => {
        if (touchDrag.current) {
          touchDrag.current.active = true;
          if (navigator.vibrate) navigator.vibrate(30);
        }
      }, 400);
    } else {
      touchDrag.current.active = true;
    }
  };

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchDrag.current || !scrollRef.current) return;
    const x = e.touches[0].clientX;
    const dx = Math.abs(x - touchDrag.current.startX);
    if (dx > 10) {
      touchDidMove.current = true;
      if (longPressTimer.current && !touchDrag.current.active) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    if (!touchDrag.current.active) return;
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
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (touchDrag.current?.active && touchOverIndex !== null && touchDrag.current.index !== touchOverIndex && touchDidMove.current) {
      reorderTabs(touchDrag.current.index, touchOverIndex);
    }
    touchDrag.current = null;
    setTouchOverIndex(null);
  }, [touchOverIndex, reorderTabs]);

  if (openTabs.length === 0) return null;

  const activeDragOver = dragOverIndex ?? touchOverIndex;
  const activeDragFrom = dragIndex ?? (touchDrag.current?.active ? touchDrag.current.index : null);

  const renderTab = (tab: typeof openTabs[0], index: number) => {
    const isActive = location.pathname === tab.path;
    const isBeingDragged = activeDragFrom === index;
    const isDropTarget = activeDragOver === index;
    const isPinned = pinnedPaths.has(tab.path);

    const tabContent = (
      <div
        data-active={isActive}
        data-tab-index={index}
        draggable={!isMobile}
        onDragStart={(e) => handleDragStart(e, index)}
        onDrag={handleDrag}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragEnd={handleDragEnd}
        onTouchStart={(e) => handleTouchStart(e, index)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => { didMove.current = false; }}
        onClick={(e) => {
          if (!didMove.current && !touchDidMove.current) {
            e.stopPropagation();
            navigate(tab.path);
          }
        }}
        className={cn(
          "group flex items-center gap-1 border-r border-border/50 font-medium whitespace-nowrap transition-all select-none flex-shrink-0",
          isMobile
            ? "pl-2.5 pr-1 py-2 text-[11px] min-h-[36px]"
            : "pl-3 pr-1.5 py-1.5 text-xs cursor-grab",
          isActive
            ? "bg-background text-foreground border-b-2 border-b-primary"
            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground active:bg-accent/60",
          isBeingDragged && "opacity-40",
          isDropTarget && "border-l-2 border-l-primary bg-primary/10",
          isPinned && "bg-primary/5"
        )}
      >
        {isPinned && (
          <Pin className="h-2.5 w-2.5 text-primary/60 flex-shrink-0 -rotate-45" />
        )}
        <span className="text-xs leading-none">{tab.emoji}</span>
        <span className={cn(
          "truncate",
          isMobile ? "max-w-[90px]" : "max-w-[120px] sm:max-w-none"
        )}>{tab.title}</span>
        {!isPinned && (
          <button
            onClick={(e) => closeTab(e, tab.path)}
            className={cn(
              "ml-0.5 rounded-sm transition-colors flex-shrink-0",
              isMobile ? "p-1 -mr-0.5" : "p-0.5",
              "hover:bg-destructive/20 hover:text-destructive active:bg-destructive/30",
              isActive ? "opacity-70 hover:opacity-100" : isMobile ? "opacity-50" : "opacity-0 group-hover:opacity-70"
            )}
          >
            <X className={cn(isMobile ? "h-3.5 w-3.5" : "h-3 w-3")} />
          </button>
        )}
      </div>
    );

    // Context menu for pin/unpin (desktop)
    if (!isMobile) {
      return (
        <ContextMenu key={tab.path}>
          <ContextMenuTrigger asChild>
            {tabContent}
          </ContextMenuTrigger>
          <ContextMenuContent className="w-40">
            <ContextMenuItem onClick={() => togglePin(tab.path)}>
              <Pin className="h-3.5 w-3.5 mr-2" />
              {isPinned ? "Unpin Tab" : "Pin Tab"}
            </ContextMenuItem>
            {!isPinned && (
              <ContextMenuItem onClick={(e) => closeTab(e as any, tab.path)}>
                <X className="h-3.5 w-3.5 mr-2" />
                Close Tab
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      );
    }

    return <React.Fragment key={tab.path}>{tabContent}</React.Fragment>;
  };

  return (
    <div className="border-b bg-muted/30">
      <div
        ref={scrollRef}
        className="flex items-stretch overflow-x-auto scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onWheel={onWheel}
      >
        {openTabs.map((tab, index) => renderTab(tab, index))}
      </div>
    </div>
  );
}
