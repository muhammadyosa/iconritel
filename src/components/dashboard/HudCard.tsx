import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HudCardProps {
  children: ReactNode;
  className?: string;
  variant?: "cyan" | "magenta" | "green" | "orange" | "purple";
  glowIntensity?: "sm" | "md" | "lg";
  onClick?: () => void;
  animate?: boolean;
}

export function HudCard({
  children,
  className,
  variant = "cyan",
  glowIntensity = "sm",
  onClick,
  animate = true,
}: HudCardProps) {
  const variantStyles = {
    cyan: {
      border: "border-hud-cyan/40",
      glow: "shadow-hud-sm hover:shadow-hud-md",
      corner: "bg-hud-cyan",
      accent: "text-hud-cyan",
    },
    magenta: {
      border: "border-hud-magenta/40",
      glow: "shadow-[0_0_8px_hsl(var(--hud-magenta)/0.4)] hover:shadow-[0_0_16px_hsl(var(--hud-magenta)/0.5)]",
      corner: "bg-hud-magenta",
      accent: "text-hud-magenta",
    },
    green: {
      border: "border-hud-green/40",
      glow: "shadow-[0_0_8px_hsl(var(--hud-green)/0.4)] hover:shadow-[0_0_16px_hsl(var(--hud-green)/0.5)]",
      corner: "bg-hud-green",
      accent: "text-hud-green",
    },
    orange: {
      border: "border-hud-orange/40",
      glow: "shadow-[0_0_8px_hsl(var(--hud-orange)/0.4)] hover:shadow-[0_0_16px_hsl(var(--hud-orange)/0.5)]",
      corner: "bg-hud-orange",
      accent: "text-hud-orange",
    },
    purple: {
      border: "border-hud-purple/40",
      glow: "shadow-[0_0_8px_hsl(var(--hud-purple)/0.4)] hover:shadow-[0_0_16px_hsl(var(--hud-purple)/0.5)]",
      corner: "bg-hud-purple",
      accent: "text-hud-purple",
    },
  };

  const styles = variantStyles[variant];

  const content = (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-hud-background/80 backdrop-blur-sm",
        styles.border,
        styles.glow,
        onClick && "cursor-pointer",
        "transition-all duration-300",
        className
      )}
      onClick={onClick}
    >
      {/* Corner accents */}
      <div className={cn("absolute top-0 left-0 w-3 h-0.5", styles.corner)} />
      <div className={cn("absolute top-0 left-0 w-0.5 h-3", styles.corner)} />
      <div className={cn("absolute top-0 right-0 w-3 h-0.5", styles.corner)} />
      <div className={cn("absolute top-0 right-0 w-0.5 h-3", styles.corner)} />
      <div className={cn("absolute bottom-0 left-0 w-3 h-0.5", styles.corner)} />
      <div className={cn("absolute bottom-0 left-0 w-0.5 h-3", styles.corner)} />
      <div className={cn("absolute bottom-0 right-0 w-3 h-0.5", styles.corner)} />
      <div className={cn("absolute bottom-0 right-0 w-0.5 h-3", styles.corner)} />

      {/* Scanline overlay */}
      <div className="absolute inset-0 bg-hud-scanline pointer-events-none opacity-50" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        whileHover={{ scale: onClick ? 1.02 : 1 }}
        whileTap={onClick ? { scale: 0.98 } : undefined}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
