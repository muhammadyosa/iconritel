import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { HudCard } from "./HudCard";
import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface HudChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: ReactNode;
  variant?: "cyan" | "magenta" | "green" | "orange" | "purple";
  headerAction?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function HudChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  variant = "cyan",
  headerAction,
  footer,
  className,
}: HudChartCardProps) {
  const variantStyles = {
    cyan: {
      icon: "text-hud-cyan",
      border: "border-hud-cyan/30",
      glow: "drop-shadow-[0_0_4px_hsl(var(--hud-cyan)/0.5)]",
    },
    magenta: {
      icon: "text-hud-magenta",
      border: "border-hud-magenta/30",
      glow: "drop-shadow-[0_0_4px_hsl(var(--hud-magenta)/0.5)]",
    },
    green: {
      icon: "text-hud-green",
      border: "border-hud-green/30",
      glow: "drop-shadow-[0_0_4px_hsl(var(--hud-green)/0.5)]",
    },
    orange: {
      icon: "text-hud-orange",
      border: "border-hud-orange/30",
      glow: "drop-shadow-[0_0_4px_hsl(var(--hud-orange)/0.5)]",
    },
    purple: {
      icon: "text-hud-purple",
      border: "border-hud-purple/30",
      glow: "drop-shadow-[0_0_4px_hsl(var(--hud-purple)/0.5)]",
    },
  };

  const styles = variantStyles[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={className}
    >
      <HudCard variant={variant} animate={false}>
        {/* Header */}
        <div className={cn(
          "flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-b",
          styles.border
        )}>
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={cn("relative", styles.glow)}>
                <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", styles.icon)} />
              </div>
            )}
            <div>
              <h3 className={cn(
                "text-xs sm:text-sm font-semibold tracking-wide uppercase",
                styles.icon
              )}>
                {title}
              </h3>
              {subtitle && (
                <p className="text-[9px] sm:text-[10px] text-muted-foreground/70">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction}
        </div>

        {/* Content */}
        <div className="p-2 sm:p-3">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className={cn(
            "px-3 py-2 border-t text-center",
            styles.border
          )}>
            {footer}
          </div>
        )}
      </HudCard>
    </motion.div>
  );
}
