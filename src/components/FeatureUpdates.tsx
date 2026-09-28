import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Keep this list in sync with features actually available in the app.
const UPDATES = [
  {
    id: "2026-09-29-search-labels",
    title: "Pencarian & nama daftar",
    details: "Global Search memprioritaskan Incident Management, lalu Team, AKV, FAT, FDT, OLT, UPE, dan BNG. Nama daftar FDT, UPE, dan BNG kini lebih seragam.",
  },
  {
    id: "2026-09-29-dashboard-activity",
    title: "Dashboard & Activity",
    details: "Recent Activity tersedia di header. Report Shift kini berada di samping Daily Trends & SLA Compliance pada Dashboard Overview.",
  },
  {
    id: "2026-09-29-report-pending",
    title: "Report Pending",
    details: "Filter Region, ekspor PDF, pembaruan otomatis, serta tombol Copy dan BLAST tersedia untuk data Incident Pending.",
  },
] as const;

const LATEST_UPDATE = UPDATES[0].id;

export function FeatureUpdates() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const storageKey = user ? `feature-updates-seen:${user.id}` : null;
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeen(storageKey ? localStorage.getItem(storageKey) : LATEST_UPDATE);
    } catch {
      setSeen(LATEST_UPDATE);
    }
  }, [storageKey]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && storageKey) {
      setSeen(LATEST_UPDATE);
      try { localStorage.setItem(storageKey, LATEST_UPDATE); } catch { /* Storage may be unavailable. */ }
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full text-muted-foreground hover:bg-transparent"
          aria-label="Pengumuman pembaruan fitur"
          title="Pembaruan fitur"
        >
          <span aria-hidden="true" className="text-base leading-none">📢</span>
          {seen !== null && seen !== LATEST_UPDATE && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" aria-label="Pembaruan belum dibaca" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(92vw,380px)] p-0 overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold text-sm">📢 Pembaruan fitur</h2>
          <p className="text-xs text-muted-foreground">Yang baru dan kegunaannya di web ini.</p>
        </div>
        <div className="max-h-[min(65vh,440px)] overflow-y-auto divide-y">
          {UPDATES.map((update) => (
            <div key={update.id} className="px-4 py-3">
              <h3 className="text-xs font-semibold text-foreground">{update.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{update.details}</p>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}