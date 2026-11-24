import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEvidenNotifications, useInvalidateEviden } from "@/hooks/useEviden";

/** Lonceng notifikasi Eviden NOC (hanya notifikasi milik user sendiri). */
export function EvidenNotifications() {
  const { data = [] } = useEvidenNotifications();
  const invalidate = useInvalidateEviden();
  const navigate = useNavigate();
  const unread = data.filter((n) => !n.read_at).length;
  const markAll = async () => {
    await supabase.from("noc_evaluation_notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    invalidate();
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label={`Notifikasi Eviden NOC${unread ? `, ${unread} belum dibaca` : ""}`}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold">🔍 Notifikasi Eviden NOC</p>
          {unread > 0 && <button className="text-[11px] text-primary" onClick={markAll}>Tandai dibaca</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {data.length === 0 && <p className="text-xs text-muted-foreground p-4 text-center">Belum ada notifikasi</p>}
          {data.map((n) => (
            <button key={n.id} type="button" className={`w-full text-left px-3 py-2 border-b border-border/50 hover:bg-muted ${n.read_at ? "opacity-70" : ""}`}
              onClick={async () => {
                if (!n.read_at) { await supabase.from("noc_evaluation_notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id); invalidate(); }
                navigate(n.link);
              }}>
              <p className="text-xs font-medium flex items-center gap-1.5">{!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}{n.title}</p>
              {n.summary && <p className="text-[11px] text-muted-foreground line-clamp-2">{n.summary}</p>}
              <p className="text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
