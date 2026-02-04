import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface HudHeaderProps {
  title: string;
  subtitle?: string;
}

export function HudHeader({ title, subtitle }: HudHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Background grid pattern */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-hud-cyan/5 via-transparent to-hud-magenta/5" />
        <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hud-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="hsl(var(--hud-cyan))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hud-grid)" />
        </svg>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {/* Animated icon */}
        <motion.div
          className="relative"
          animate={{
            boxShadow: [
              "0 0 10px hsl(var(--hud-cyan)/0.3)",
              "0 0 20px hsl(var(--hud-cyan)/0.5)",
              "0 0 10px hsl(var(--hud-cyan)/0.3)",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-12 w-12 rounded-lg bg-hud-background border border-hud-cyan/40 flex items-center justify-center">
            <Activity className="h-6 w-6 text-hud-cyan" />
          </div>
          {/* Corner accents */}
          <div className="absolute -top-0.5 -left-0.5 w-2 h-0.5 bg-hud-cyan" />
          <div className="absolute -top-0.5 -left-0.5 w-0.5 h-2 bg-hud-cyan" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-0.5 bg-hud-cyan" />
          <div className="absolute -top-0.5 -right-0.5 w-0.5 h-2 bg-hud-cyan" />
          <div className="absolute -bottom-0.5 -left-0.5 w-2 h-0.5 bg-hud-cyan" />
          <div className="absolute -bottom-0.5 -left-0.5 w-0.5 h-2 bg-hud-cyan" />
          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-0.5 bg-hud-cyan" />
          <div className="absolute -bottom-0.5 -right-0.5 w-0.5 h-2 bg-hud-cyan" />
        </motion.div>

        <div>
          <motion.h1
            className="text-2xl sm:text-3xl font-bold tracking-wide"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span className="text-hud-cyan drop-shadow-[0_0_8px_hsl(var(--hud-cyan)/0.5)]">
              {title.split(" ")[0]}
            </span>{" "}
            <span className="text-foreground/90">
              {title.split(" ").slice(1).join(" ")}
            </span>
          </motion.h1>
          {subtitle && (
            <motion.p
              className="text-sm text-muted-foreground/70 mt-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-hud-green animate-pulse" />
                {subtitle}
              </span>
            </motion.p>
          )}
        </div>
      </div>

      {/* Decorative line */}
      <motion.div
        className="h-px bg-gradient-to-r from-hud-cyan via-hud-cyan/50 to-transparent"
        initial={{ scaleX: 0, originX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
    </motion.div>
  );
}
