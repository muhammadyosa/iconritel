import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { ALL_MENUS } from "@/lib/menuAccess";
import { cn } from "@/lib/utils";

const PRIORITY = ["/", "/tickets", "/report", "/teams", "/settings"];
const SHORT: Record<string, string> = {
  "/": "Dashboard",
  "/tickets": "Incident",
  "/report": "Report",
  "/teams": "Team",
  "/settings": "Settings",
};

/** Navigasi bawah bergaya aplikasi native, hanya tampil di layar kecil. */
export function MobileBottomNav() {
  const { allowedPaths } = useMenuAccess();
  const { setOpenMobile } = useSidebar();

  const items = PRIORITY.filter((p) => allowedPaths.includes(p))
    .slice(0, 4)
    .map((p) => ALL_MENUS.find((m) => m.path === p)!)
    .filter(Boolean);

  return (
    <nav
      aria-label="Navigasi utama"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-14">
        {items.map((m) => (
          <li key={m.path}>
            <NavLink
              to={m.path}
              end={m.path === "/"}
              className={({ isActive }) =>
                cn(
                  "flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors active:scale-95",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <span className="text-lg leading-none" aria-hidden>{m.emoji}</span>
              <span>{SHORT[m.path] ?? m.title}</span>
            </NavLink>
          </li>
        ))}
        {Array.from({ length: 4 - items.length }).map((_, i) => <li key={`e${i}`} />)}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex h-full w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground active:scale-95"
            aria-label="Buka semua menu"
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
