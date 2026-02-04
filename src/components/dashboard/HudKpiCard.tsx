import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HudCard } from "./HudCard";

interface HudKpiCardProps {
  title: string;
  value: number | string;
  emoji: string;
  variant?: "cyan" | "magenta" | "green" | "orange" | "purple";
  onClick?: () => void;
  index?: number;
}

export function HudKpiCard({
  title,
  value,
  emoji,
  variant = "cyan",
  onClick,
  index = 0,
}: HudKpiCardProps) {
  const variantTextColors = {
    cyan: "text-hud-cyan",
    magenta: "text-hud-magenta",
    green: "text-hud-green",
    orange: "text-hud-orange",
    purple: "text-hud-purple",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <HudCard variant={variant} onClick={onClick} className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Emoji with glow effect */}
          <div className="relative">
            <span className="text-2xl sm:text-3xl relative z-10">{emoji}</span>
            <div className={cn(
              "absolute inset-0 blur-md opacity-50",
              variantTextColors[variant]
            )} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground/80 uppercase tracking-wider font-medium truncate">
              {title}
            </p>
          </div>

          {/* Value with animated counter effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
            className={cn(
              "text-xl sm:text-2xl md:text-3xl font-bold font-mono",
              variantTextColors[variant]
            )}
          >
            {value}
          </motion.div>
        </div>

        {/* Animated pulse line */}
        <motion.div
          className={cn(
            "h-0.5 mt-2 rounded-full opacity-60",
            variant === "cyan" && "bg-gradient-to-r from-transparent via-hud-cyan to-transparent",
            variant === "magenta" && "bg-gradient-to-r from-transparent via-hud-magenta to-transparent",
            variant === "green" && "bg-gradient-to-r from-transparent via-hud-green to-transparent",
            variant === "orange" && "bg-gradient-to-r from-transparent via-hud-orange to-transparent",
            variant === "purple" && "bg-gradient-to-r from-transparent via-hud-purple to-transparent"
          )}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: index * 0.1 + 0.3 }}
        />
      </HudCard>
    </motion.div>
  );
}
