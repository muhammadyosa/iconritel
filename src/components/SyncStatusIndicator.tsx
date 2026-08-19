import { useEffect, useState } from "react";
import { CheckCircle2, CloudOff, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDataSync } from "@/contexts/DataSyncContext";

function formatTime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Live connection + sync status shown in the app header. */
export function SyncStatusIndicator() {
  const { syncState, lastSyncedAt, refreshAll, githubConfigured } = useDataSync();
  const [, forceTick] = useState(0);

  // Re-render every 30s so the "Terakhir diperbarui" label stays truthful.
  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const config = {
    synced: {
      label: "Terhubung / Sinkron",
      className: "bg-success/10 text-success border-success/30",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    syncing: {
      label: "Menyinkronkan…",
      className: "bg-primary/10 text-primary border-primary/30",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    loading: {
      label: "Memuat data…",
      className: "bg-primary/10 text-primary border-primary/30",
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    },
    offline: {
      label: "Mode Offline",
      className: "bg-warning/10 text-warning border-warning/30",
      icon: <CloudOff className="h-3.5 w-3.5" />,
    },
    error: {
      label: "Gagal sinkron",
      className: "bg-destructive/10 text-destructive border-destructive/30",
      icon: <TriangleAlert className="h-3.5 w-3.5" />,
    },
  }[syncState];

  const busy = syncState === "syncing" || syncState === "loading";

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors",
              config.className
            )}
            role="status"
            aria-live="polite"
          >
            {config.icon}
            <span className="hidden sm:inline">{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-semibold">{config.label}</p>
          <p>Terakhir diperbarui: {formatTime(lastSyncedAt)}</p>
          <p className="text-muted-foreground">
            Backup GitHub: {githubConfigured ? "aktif" : "belum diatur"}
          </p>
        </TooltipContent>
      </Tooltip>

      <span className="hidden lg:inline text-[11px] text-muted-foreground whitespace-nowrap">
        Terakhir diperbarui: {formatTime(lastSyncedAt)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={() => void refreshAll()}
        disabled={busy}
        aria-label="Sinkronkan data sekarang"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
      </Button>
    </div>
  );
}
