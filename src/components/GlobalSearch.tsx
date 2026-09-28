import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { ALL_MENUS } from "@/lib/menuAccess";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Hit {
  ticket_id: string;
  customer_name: string;
  status: string;
  serpo: string;
}

/** Pencarian global (Ctrl/⌘+K): lompat ke menu atau cari Incident. */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
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

  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, "");
    if (!open || term.length < 3 || !allowedPaths.includes("/tickets")) {
      setHits([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("tickets")
        .select("ticket_id, customer_name, status, serpo")
        .or(`ticket_id.ilike.%${term}%,customer_name.ilike.%${term}%,service_id.ilike.%${term}%,hostname.ilike.%${term}%`)
        .order("created_at", { ascending: false })
        .limit(8);
      setHits((data as Hit[]) ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, open, allowedPaths]);

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };

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
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Cari menu, Incident ID, customer, service ID…" value={q} onValueChange={setQ} />
        <CommandList>
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>
          {hits.length > 0 && (
            <CommandGroup heading="Incident">
              {hits.map((h) => (
                <CommandItem key={h.ticket_id} value={`inc ${h.ticket_id} ${h.customer_name}`} onSelect={() => { navigator.clipboard?.writeText(h.ticket_id).catch(() => {}); toast.success(`Incident ID ${h.ticket_id} disalin`); go("/tickets"); }}>
                  <span className="font-mono text-xs mr-2">{h.ticket_id}</span>
                  <span className="truncate">{h.customer_name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{h.status} · {h.serpo}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Menu">
            {ALL_MENUS.filter((m) => allowedPaths.includes(m.path)).map((m) => (
              <CommandItem key={m.path} value={m.title} onSelect={() => go(m.path)}>
                <span className="mr-2" aria-hidden>{m.emoji}</span>
                {m.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
