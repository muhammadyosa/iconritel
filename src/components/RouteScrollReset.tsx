import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteScrollReset() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset main scroll on route change
    document.querySelector("main")?.scrollTo({ top: 0 });
  }, [pathname]);

  return null;
}
