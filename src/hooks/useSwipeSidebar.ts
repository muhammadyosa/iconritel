import { useEffect, useRef, useCallback } from "react";
import { useSidebar } from "@/components/ui/sidebar";

const SWIPE_THRESHOLD = 50; // minimum px to trigger
const EDGE_ZONE = 30; // px from left edge to start detecting

/**
 * Hook that opens the mobile sidebar on a left-edge swipe-right gesture,
 * and closes it on a swipe-left gesture when open.
 */
export function useSwipeToOpenSidebar() {
  const { isMobile, openMobile, setOpenMobile } = useSidebar();
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isEdgeSwipe = useRef(false);

  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isMobile) return;
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
      // Only consider edge swipes when sidebar is closed
      isEdgeSwipe.current = !openMobile && touch.clientX <= EDGE_ZONE;
    },
    [isMobile, openMobile],
  );

  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!isMobile || !touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;

      // Ignore vertical-dominant swipes
      if (Math.abs(dy) > Math.abs(dx)) {
        touchStart.current = null;
        return;
      }

      // Swipe right from edge → open
      if (isEdgeSwipe.current && dx > SWIPE_THRESHOLD) {
        setOpenMobile(true);
      }
      // Swipe left while open → close
      if (openMobile && dx < -SWIPE_THRESHOLD) {
        setOpenMobile(false);
      }

      touchStart.current = null;
    },
    [isMobile, openMobile, setOpenMobile],
  );

  useEffect(() => {
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchEnd]);
}
