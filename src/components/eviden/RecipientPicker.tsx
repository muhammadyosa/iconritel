import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface Recipient { user_id: string; display_name: string; email: string; team: string }

export function RecipientPicker({ open, onOpenChange, value, onSelect }: { open: boolean; onOpenChange: (o: boolean) => void; value: Recipient | null; onSelect: (r: Recipient) => void }) {
  const [q, setQ] = useState("");
  const { data = [], isLoading } = useQuery({
    queryKey: ["eviden-recipients"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("eviden_recipients");
      if (error) throw error;
      return (data ?? []) as Recipient[];
    },
  });
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? data.filter((r) => `${r.display_name} ${r.email} ${r.team}`.toLowerCase().includes(s)) : data;
  }, [data, q]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>To User</DialogTitle>
          <DialogDescription>Pilih satu user penerima. Satu laporan hanya untuk satu penerima.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, username, atau team" className="pl-8" />
        </div>
        <div className="max-h-[50vh] overflow-y-auto -mx-1 space-y-0.5">
          {isLoading && <p className="text-xs text-muted-foreground p-3">Memuat user…</p>}
          {!isLoading && list.length === 0 && <p className="text-xs text-muted-foreground p-3">User tidak ditemukan</p>}
          {list.map((r) => (
            <button key={r.user_id} type="button" onClick={() => { onSelect(r); onOpenChange(false); }}
              className={cn("w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left hover:bg-muted", value?.user_id === r.user_id && "bg-primary/10")}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{r.display_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{r.email.split("@")[0]}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{r.team}</Badge>
              {value?.user_id === r.user_id && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
