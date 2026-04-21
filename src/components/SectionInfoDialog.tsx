import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InfoMetric {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive" | "primary";
}

export interface InfoSection {
  heading: string;
  emoji?: string;
  metrics?: InfoMetric[];
  bullets?: { label: string; value?: string | number; tone?: InfoMetric["tone"] }[];
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
}

const toneText = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
} as const;

const toneBg = {
  default: "bg-muted/30 border-border/40",
  primary: "bg-primary/5 border-primary/20",
  success: "bg-success/5 border-success/20",
  warning: "bg-warning/5 border-warning/20",
  destructive: "bg-destructive/5 border-destructive/20",
} as const;

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
}: SectionInfoDialogProps) {
  return (
    <Dialog>
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
                      return (
                        <div key={i} className={cn("rounded-md border p-2", toneBg[tone])}>
                          <div className="text-[8px] sm:text-[9px] uppercase tracking-wider text-muted-foreground">{m.label}</div>
                          <div className={cn("text-sm sm:text-base font-bold tabular-nums leading-tight mt-0.5", toneText[tone])}>{m.value}</div>
                          {m.hint && (
                            <div className="text-[8px] sm:text-[9px] text-muted-foreground/80 mt-0.5">{m.hint}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-1 text-[10px] sm:text-xs">
                    {sec.bullets.map((b, i) => {
                      const tone = b.tone || "default";
                      return (
                        <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded border border-border/30 bg-muted/10">
                          <span className="text-foreground/80 truncate">{b.label}</span>
                          {b.value !== undefined && (
                            <span className={cn("font-bold tabular-nums shrink-0", toneText[tone])}>{b.value}</span>
                          )}
                        </li>
                      );
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
