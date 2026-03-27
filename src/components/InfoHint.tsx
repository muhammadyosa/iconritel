import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface InfoHintProps {
  text: string;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function InfoHint({ text, side = "top", className = "" }: InfoHintProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center h-4 w-4 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors ${className}`}
          aria-label="Info"
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[220px] text-[10px] leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
