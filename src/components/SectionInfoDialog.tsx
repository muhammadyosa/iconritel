import { Info, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InfoTone = "default" | "success" | "warning" | "destructive" | "primary";

export interface InfoMetric {
  label: string;
  value: string | number;
  hint?: string;
  tone?: InfoTone;
  /** When provided, the metric becomes clickable and the dialog auto-closes after invocation */
  onClick?: () => void;
}

export interface InfoBullet {
  label: string;
  value?: string | number;
  tone?: InfoTone;
  /** When provided, the bullet becomes clickable and the dialog auto-closes after invocation */
  onClick?: () => void;
}

export interface InfoSection {
  heading: string;
  emoji?: string;
  metrics?: InfoMetric[];
  bullets?: InfoBullet[];
  paragraph?: string;
}

interface SectionInfoDialogProps {
  title: string;
  emoji?: string;
  description?: string;
  insight?: { tone: "success" | "warning" | "destructive" | "primary"; text: string };
  sections: InfoSection[];
  triggerClassName?: string;
  triggerTitle?: string;
  footer?: ReactNode;
  /** Optional controlled open state — useful for "Kembali ke ringkasan" flow */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const toneText: Record<InfoTone, string> = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

const toneBg: Record<InfoTone, string> = {
  default: "bg-muted/30 border-border/40",
  primary: "bg-primary/5 border-primary/20",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  destructive: "bg-destructive/5 border-destructive/20",
};

const toneHover: Record<InfoTone, string> = {
  default: "hover:bg-muted/60 hover:border-border/70",
  primary: "hover:bg-primary/10 hover:border-primary/40",
  success: "hover:bg-success/10 hover:border-success/40",
  warning: "hover:bg-warning/10 hover:border-warning/40",
  destructive: "hover:bg-destructive/10 hover:border-destructive/40",
};

const insightBg = {
  primary: "bg-primary/10 border-primary/30 text-primary",
  success: "bg-success/10 border-success/30 text-success",
  warning: "bg-warning/10 border-warning/30 text-warning",
  destructive: "bg-destructive/10 border-destructive/30 text-destructive",
} as const;

export function SectionInfoDialog({
  title,
  emoji,
  description,
  insight,
  sections,
  triggerClassName,
  triggerTitle = "Lihat detail informasi",
  footer,
  open,
  onOpenChange,
}: SectionInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={triggerTitle}
          title={triggerTitle}
          className={cn(
            "h-6 w-6 sm:h-7 sm:w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors shrink-0",
            triggerClassName
          )}
        >
          <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-4 sm:px-5 pt-4 pb-2 border-b bg-muted/20">
          <DialogTitle className="text-sm sm:text-base flex items-center gap-2">
            {emoji && <span className="text-base sm:text-lg">{emoji}</span>}
            <span>{title}</span>
            <span className="ml-auto text-[9px] sm:text-[10px] font-normal text-muted-foreground bg-background/60 border border-border/40 rounded-full px-2 py-0.5">
              Realtime
            </span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-[10px] sm:text-xs text-muted-foreground leading-snug">
              {description}
            </DialogDescription>
          )}
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-1">
            💡 Klik metrik atau item untuk membuka daftar incident terkait.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh]">
          <div className="px-4 sm:px-5 py-3 space-y-3">
            {insight && (
              <div className={cn("rounded-lg border px-3 py-2 text-[10px] sm:text-xs leading-relaxed font-medium", insightBg[insight.tone])}>
                {insight.text}
              </div>
            )}

            {sections.map((sec, idx) => (
              <div key={idx} className="space-y-1.5">
                <h4 className="text-[10px] sm:text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {sec.emoji && <span>{sec.emoji}</span>}
                  {sec.heading}
                </h4>

                {sec.paragraph && (
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">{sec.paragraph}</p>
                )}

                {sec.metrics && sec.metrics.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {sec.metrics.map((m, i) => {
                      const tone = m.tone || "default";
                      const clickable = !!m.onClick;
                      const inner = (
                        <div className={cn(
                          "relative rounded-md border p-2 text-left w-full transition-all",
                          toneBg[tone],
                          clickable && cn("cursor-pointer active:scale-[0.97]", toneHover[tone])
                        )}>
                          <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-between gap-1">
                            <span className="truncate">{m.label}</span>
                            {clickable && <ChevronRight className="h-2.5 w-2.5 opacity-50 shrink-0" />}
                          </div>
                          <div className={cn("text-sm sm:text-base font-bold tabular-nums leading-tight mt-0.5", toneText[tone])}>{m.value}</div>
                          {m.hint && (
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground/80 mt-0.5">{m.hint}</div>
                          )}
                        </div>
                      );
                      if (clickable) {
                        return (
                          <DialogClose key={i} asChild>
                            <button type="button" onClick={m.onClick} className="block">
                              {inner}
                            </button>
                          </DialogClose>
                        );
                      }
                      return <div key={i}>{inner}</div>;
                    })}
                  </div>
                )}

                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-1 text-[10px] sm:text-xs">
                    {sec.bullets.map((b, i) => {
                      const tone = b.tone || "default";
                      const clickable = !!b.onClick;
                      const row = (
                        <div className={cn(
                          "flex items-center justify-between gap-2 px-2 py-1 rounded border bg-muted/10 transition-all",
                          "border-border/30",
                          clickable && cn("cursor-pointer active:scale-[0.99]", toneHover[tone])
                        )}>
                          <span className="text-foreground/80 truncate flex-1 flex items-center gap-1">
                            {b.label}
                          </span>
                          {b.value !== undefined && (
                            <span className={cn("font-bold tabular-nums shrink-0", toneText[tone])}>{b.value}</span>
                          )}
                          {clickable && <ChevronRight className="h-3 w-3 opacity-50 shrink-0" />}
                        </div>
                      );
                      if (clickable) {
                        return (
                          <li key={i}>
                            <DialogClose asChild>
                              <button type="button" onClick={b.onClick} className="block w-full text-left">
                                {row}
                              </button>
                            </DialogClose>
                          </li>
                        );
                      }
                      return <li key={i}>{row}</li>;
                    })}
                  </ul>
                )}
              </div>
            ))}

            {footer && <div className="pt-1">{footer}</div>}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Shared insight builder — keeps tone logic consistent across all sections
// ============================================================

export interface InsightInput {
  total: number;
  resolved: number;
  pending: number;       // includes "Pending" status only OR everything not resolved (caller decides)
  critical: number;
  rate: number;          // 0-100, resolution percentage
  contextLabel?: string; // e.g. "incident", "Top 20"
  emptyText?: string;    // optional override for empty state
}

export function buildInsight({
  total,
  resolved,
  pending,
  critical,
  rate,
  contextLabel = "incident",
  emptyText,
}: InsightInput): { tone: "success" | "warning" | "destructive" | "primary"; text: string } {
  // Empty state — always success/clean
  if (total === 0) {
    return {
      tone: "success",
      text: emptyText || `✅ Belum ada ${contextLabel} terdeteksi. Layanan dalam kondisi stabil.`,
    };
  }

  const criticalPct = (critical / total) * 100;
  const pendingPct = (pending / total) * 100;

  // Priority order: Critical > Pending > Low rate > High rate > Neutral
  if (criticalPct >= 40) {
    return {
      tone: "destructive",
      text: `🚨 ${critical} dari ${total} ${contextLabel} (${Math.round(criticalPct)}%) berstatus Critical. Eskalasi prioritas tinggi diperlukan.`,
    };
  }
  if (criticalPct >= 20) {
    return {
      tone: "destructive",
      text: `⚠️ ${critical} ${contextLabel} (${Math.round(criticalPct)}%) berstatus Critical. Pantau dan percepat penanganan.`,
    };
  }
  if (pendingPct >= 40) {
    return {
      tone: "warning",
      text: `⏳ Tingkat Pending tinggi (${Math.round(pendingPct)}%). Tinjau alasan pending dan rencana resolusi.`,
    };
  }
  if (rate < 30 && total >= 5) {
    return {
      tone: "warning",
      text: `📉 Resolution rate baru ${rate}%. Percepat penanganan ${total - resolved} ${contextLabel} yang belum selesai.`,
    };
  }
  if (rate >= 70) {
    return {
      tone: "success",
      text: `✅ Performa sangat baik dengan resolution rate ${rate}%. Pertahankan ritme penanganan.`,
    };
  }
  return {
    tone: "primary",
    text: `📊 Total ${total} ${contextLabel} aktif dengan resolution rate ${rate}%.`,
  };
}
