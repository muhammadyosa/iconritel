import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, SlidersHorizontal, Wrench, X, type LucideIcon } from "lucide-react";

// Keep this list in sync with features actually available in the app.
// Newest version first — the header badge shows VERSIONS[0].version.
type ItemKind = "fitur" | "fungsi" | "perbaikan";

const KIND_META: Record<ItemKind, { label: string; icon: LucideIcon; className: string }> = {
  fitur: { label: "Fitur", icon: Sparkles, className: "bg-primary/10 text-primary" },
  fungsi: { label: "Fungsi", icon: SlidersHorizontal, className: "bg-success/10 text-success" },
  perbaikan: { label: "Perbaikan", icon: Wrench, className: "bg-warning/10 text-warning" },
};

type UpdateItem = { kind: ItemKind; text: string };

type UpdateVersion = {
  version: string;
  date: string;
  title: string;
  items: UpdateItem[];
};

const VERSIONS: UpdateVersion[] = [
  {
    version: "v2.4.0",
    date: "2026-09-29",
    title: "Pencarian Global & Nama Daftar",
    items: [
      { kind: "fitur", text: "Global Search kini mencari sekali jalan di Incident Management, Team, AKV, FAT, FDT, OLT, UPE, dan BNG." },
      { kind: "fungsi", text: "Hasil dikelompokkan per kategori dengan kata kunci disorot, dan bisa langsung membuka halaman terkait." },
      { kind: "perbaikan", text: "Nama daftar FDT, UPE, dan BNG kini lebih seragam." },
    ],
  },
  {
    version: "v2.3.0",
    date: "2026-09-29",
    title: "Dashboard & Activity",
    items: [
      { kind: "fitur", text: "Recent Activity tersedia di header dengan indikator waktu nyata." },
      { kind: "fitur", text: "Analisa singkat otomatis di bagian bawah grafik Daily Trends & SLA Compliance." },
      { kind: "fungsi", text: "Report Shift kini berada tepat di bawah Daily Trends & SLA Compliance pada Dashboard Overview." },
    ],
  },
  {
    version: "v2.2.0",
    date: "2026-09-29",
    title: "Report Pending & BLAST",
    items: [
      { kind: "fitur", text: "Filter Region, ekspor PDF, dan pembaruan otomatis untuk data Incident Pending." },
      { kind: "fungsi", text: "Tombol BLAST menyalinkan daftar pending per TIM, diurutkan dari pending terlama." },
      { kind: "perbaikan", text: "Tombol Copy menyalin daftar Incident Pending per baris maupun sekaligus." },
    ],
  },
  {
    version: "v2.1.0",
    date: "2026-09-28",
    title: "Report Shift & List Antrian",
    items: [
      { kind: "fitur", text: "Tab 📑 List Antrian pada menu Report untuk antrean tiket per TIM dan terminasi OLT." },
      { kind: "fungsi", text: "Report Shift otomatis terhapus setelah 3 hari sejak dibuat." },
      { kind: "perbaikan", text: "Format BLAST Incident Pending dirapatkan mengikuti standar pengumuman." },
    ],
  },
] as const;

const LATEST_VERSION = VERSIONS[0].version;

export function FeatureUpdates() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const storageKey = user ? `feature-updates-seen:${user.id}` : null;
  const [seen, setSeen] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSeen(storageKey ? localStorage.getItem(storageKey) : LATEST_VERSION);
    } catch {
      setSeen(LATEST_VERSION);
    }
  }, [storageKey]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && storageKey) {
      setSeen(LATEST_VERSION);
      try { localStorage.setItem(storageKey, LATEST_VERSION); } catch { /* Storage may be unavailable. */ }
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
          {seen !== null && seen !== LATEST_VERSION && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" aria-label="Pembaruan belum dibaca" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(94vw,440px)] p-0 overflow-hidden">
        <div className="relative border-b px-4 py-3.5">
          <div className="flex items-center gap-2 pr-8">
            <Sparkles className="h-4.5 w-4.5 h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
            <h2 className="font-semibold text-base leading-none">Apa yang Baru</h2>
            <span className="rounded-full border bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground leading-none">
              {LATEST_VERSION}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Ringkas fitur, menu, dan fungsi terbaru pada web ini.
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-7 w-7 rounded-full text-muted-foreground"
            aria-label="Tutup"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="max-h-[min(68vh,480px)] overflow-y-auto">
          {VERSIONS.map((version, index) => (
            <div key={version.version} className={index > 0 ? "border-t px-4 py-3.5" : "px-4 py-3.5"}>
              <div className="flex items-baseline gap-2">
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary leading-none flex-shrink-0">
                  {version.version}
                </span>
                <h3 className="text-sm font-semibold leading-snug min-w-0">{version.title}</h3>
                <span className="ml-auto text-[11px] text-muted-foreground flex-shrink-0">{version.date}</span>
              </div>
              <ul className="mt-2.5 space-y-2.5">
                {version.items.map((item, i) => {
                  const meta = KIND_META[item.kind];
                  const Icon = meta.icon;
                  return (
                    <li key={i} className="flex gap-2.5">
                      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md ${meta.className}`} aria-hidden="true">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground">{meta.label}: </span>
                        {item.text}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
