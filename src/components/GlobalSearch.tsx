import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Loader2, X, ArrowRight } from "lucide-react";
import {
  CommandDialog,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { ALL_MENUS } from "@/lib/menuAccess";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HighlightText } from "@/components/HighlightText";
import { loadSearchData, searchAll, type CategoryResult } from "@/lib/globalSearch";

interface Hit {
  ticket_id: string;
  customer_name: string;
  status: string;
  serpo: string;
  service_id: string;
  hostname: string;
}

const PER_CATEGORY = 5;

/** Pencarian global (Ctrl/⌘+K): menu, Incident, dan seluruh data list (AKV, FAT, FDT, OLT, UPE, BNG). */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [dataReady, setDataReady] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const navigate = useNavigate();
  const { allowedPaths } = useMenuAccess();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Muat ulang data list tiap dialog dibuka (agar hasil import terbaru ikut)
  useEffect(() => {
    if (!open) return;
    setDataReady(false);
    loadSearchData().finally(() => setDataReady(true));
  }, [open]);

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (!dataReady) return;
    setResults(searchAll(term, allowedPaths, PER_CATEGORY));
  }, [term, dataReady, allowedPaths]);

  useEffect(() => {
    const clean = term.replace(/[%,()]/g, "");
    if (!open || clean.length < 3 || !allowedPaths.includes("/tickets")) {
      setHits([]);
      setLoadingTickets(false);
      return;
    }
    let cancelled = false;
    setLoadingTickets(true);
    supabase
      .from("tickets")
      .select("ticket_id, customer_name, status, serpo, service_id, hostname")
      .or(`ticket_id.ilike.%${clean}%,customer_name.ilike.%${clean}%,service_id.ilike.%${clean}%,hostname.ilike.%${clean}%,sn_ont.ilike.%${clean}%,fat_id.ilike.%${clean}%`)
      .order("created_at", { ascending: false })
      .limit(PER_CATEGORY)
      .then(({ data }) => {
        if (cancelled) return;
        setHits((data as Hit[]) ?? []);
        setLoadingTickets(false);
      });
    return () => { cancelled = true; };
  }, [term, open, allowedPaths]);

  const menus = useMemo(() => {
    const l = term.toLowerCase();
    return ALL_MENUS.filter((m) => allowedPaths.includes(m.path) && (!l || m.title.toLowerCase().includes(l)));
  }, [allowedPaths, term]);

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };

  const pending = q.trim() !== term || !dataReady || loadingTickets;
  const searching = term.length >= 2;
  const nothing = searching && !pending && results.length === 0 && hits.length === 0 && menus.length === 0;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-9 gap-2 text-muted-foreground"
        aria-label="Cari (Ctrl+K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden lg:inline text-xs">Cari…</span>
        <kbd className="hidden lg:inline rounded border border-border bg-muted px-1.5 text-[10px]">Ctrl K</kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setQ(""); }}
        shouldFilter={false}
        contentClassName="w-[calc(100vw-1rem)] max-w-3xl top-[8%] translate-y-0 sm:top-[10%]"
      >
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari Service ID, customer, hostname, FAT ID, IP, Incident ID…"
            className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            aria-label="Kata kunci pencarian global"
          />
          {pending && searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Memuat" />}
          {q && (
            <button type="button" onClick={() => setQ("")} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Hapus pencarian">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <CommandList className="max-h-[70vh] sm:max-h-[60vh]">
          {!searching && (
            <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">
              Ketik minimal 2 karakter untuk mencari di AKV, FAT, FDT, OLT, UPE, BNG & Incident.
            </p>
          )}
          {nothing && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Tidak ditemukan hasil untuk "<span className="font-semibold text-foreground">{term}</span>".
            </div>
          )}
          {searching && pending && results.length === 0 && hits.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Mencari…</div>
          )}

          {hits.length > 0 && (
            <CommandGroup heading="🎫 Incident">
              {hits.map((h) => (
                <CommandItem key={h.ticket_id} value={`inc-${h.ticket_id}`} onSelect={() => { navigator.clipboard?.writeText(h.ticket_id).catch(() => {}); toast.success(`Incident ID ${h.ticket_id} disalin`); go("/tickets"); }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <HighlightText className="font-mono text-xs" text={h.ticket_id} query={term} />
                      <HighlightText className="truncate" text={h.customer_name} query={term} />
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      <HighlightText text={`${h.service_id} · ${h.hostname}`} query={term} />
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{h.status} · {h.serpo}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.map(({ category: c, total, hits: rows }) => (
            <CommandGroup key={c.id} heading={`${c.emoji} ${c.title} · ${total} hasil`}>
              {rows.map((r) => (
                <CommandItem key={`${c.id}-${r.id}`} value={`${c.id}-${r.id}`} onSelect={() => go(`${c.path}?q=${encodeURIComponent(r.jumpValue)}`)}>
                  <div className="min-w-0 flex-1">
                    <HighlightText className="block truncate text-sm font-medium" text={r.title} query={term} />
                    <div className="truncate text-[11px] text-muted-foreground">
                      {r.subtitle && <HighlightText text={r.subtitle} query={term} />}
                    </div>
                  </div>
                  <span className="ml-2 hidden max-w-[45%] shrink-0 truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
                    {r.matchLabel}: <HighlightText text={r.matchValue} query={term} />
                  </span>
                </CommandItem>
              ))}
              {total > rows.length && (
                <CommandItem value={`${c.id}-all`} onSelect={() => go(`${c.path}?q=${encodeURIComponent(term)}`)} className="text-xs text-primary">
                  Lihat semua {total} hasil di {c.title} <ArrowRight className="ml-1 !h-3 !w-3" />
                </CommandItem>
              )}
            </CommandGroup>
          ))}

          {menus.length > 0 && (
            <CommandGroup heading="Menu">
              {menus.map((m) => (
                <CommandItem key={m.path} value={`menu-${m.path}`} onSelect={() => go(m.path)}>
                  <span className="mr-2" aria-hidden>{m.emoji}</span>
                  <HighlightText text={m.title} query={term} />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
