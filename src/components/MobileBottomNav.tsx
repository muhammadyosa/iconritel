import { NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { ALL_MENUS } from "@/lib/menuAccess";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/UserMenu";

const SLOTS = ["/", "/tickets", "menu", "/teams", "user"];
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

  return (
    <nav
      aria-label="Navigasi utama"
      className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border/60 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 h-14">
        {SLOTS.map((slot) => {
          if (slot === "user") return <li key={slot}><UserMenu variant="bottom" /></li>;
          if (slot === "menu") return (
            <li key={slot}>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setOpenMobile(true)}
                className="flex h-full w-full rounded-none p-0 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground active:scale-95"
                aria-label="Buka semua menu"
              >
                <Menu className="h-5 w-5" />
                <span>Menu</span>
              </Button>
            </li>
          );
          const m = ALL_MENUS.find((menu) => menu.path === slot);
          if (!m || !allowedPaths.includes(slot)) return <li key={slot} />;
          return (
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
          );
        })}
      </ul>
    </nav>
  );
}
