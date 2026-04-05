import { useEffect } from "react";

/**
 * Syncs sidebar submenu clicks with a page's active tab state.
 * Listens for the "sidebar-tab-select" custom event dispatched by AppSidebar.
 */
export function useSidebarTabSync(
  pagePath: string,
  setTab: (tabValue: string) => void
) {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.path === pagePath && detail?.tabValue) {
        setTab(detail.tabValue);
      }
    };
    window.addEventListener("sidebar-tab-select", handler);
    return () => window.removeEventListener("sidebar-tab-select", handler);
  }, [pagePath, setTab]);
}
