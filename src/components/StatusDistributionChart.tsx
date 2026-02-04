import { motion } from "framer-motion";
import { Ticket } from "@/types/ticket";

interface StatusDistributionChartProps {
  tickets: Ticket[];
  onStatusClick: (status: string, tickets: Ticket[]) => void;
}

interface StatusConfig {
  key: "On Progress" | "Critical" | "Resolved" | "Pending";
  label: string;
  emoji: string;
  color: string;
  bgGradient: string;
  glowColor: string;
}

const statusConfigs: StatusConfig[] = [
  {
    key: "On Progress",
    label: "On Progres",
    emoji: "⚙️",
    color: "hsl(217, 91%, 60%)",
    bgGradient: "from-blue-500/20 via-blue-400/10 to-transparent",
    glowColor: "shadow-blue-500/30",
  },
  {
    key: "Critical",
    label: "Kritis",
    emoji: "🚨",
    color: "hsl(0, 84%, 60%)",
    bgGradient: "from-red-500/20 via-red-400/10 to-transparent",
    glowColor: "shadow-red-500/30",
  },
  {
    key: "Resolved",
    label: "Selesai",
    emoji: "✅",
    color: "hsl(142, 71%, 45%)",
    bgGradient: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    glowColor: "shadow-emerald-500/30",
  },
  {
    key: "Pending",
    label: "Tertunda",
    emoji: "⏳",
    color: "hsl(38, 92%, 50%)",
    bgGradient: "from-amber-500/20 via-amber-400/10 to-transparent",
    glowColor: "shadow-amber-500/30",
  },
];

// Circular Progress Ring Component
const CircularProgress = ({ 
  percentage, 
  color, 
  size = 56,
  strokeWidth = 5 
}: { 
  percentage: number; 
  color: string; 
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] sm:text-xs font-bold text-foreground">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

// Vector Wave Pattern
const WavePattern = ({ color }: { color: string }) => (
  <svg 
    className="absolute bottom-0 left-0 right-0 h-8 opacity-30" 
    viewBox="0 0 100 20" 
    preserveAspectRatio="none"
  >
    <motion.path
      d="M0 10 Q25 0 50 10 T100 10 V20 H0 Z"
      fill={color}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    />
  </svg>
);

// Hexagon Shape for decoration
const HexagonDecor = ({ color, className }: { color: string; className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="none"
  >
    <motion.path
      d="M12 2L21 7V17L12 22L3 17V7L12 2Z"
      stroke={color}
      strokeWidth="1"
      strokeOpacity="0.3"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeOut" }}
    />
  </svg>
);

export function StatusDistributionChart({ tickets, onStatusClick }: StatusDistributionChartProps) {
  const total = tickets.length || 1;
  
  const statusData = statusConfigs.map(config => {
    const count = tickets.filter(t => t.status === config.key).length;
    const percentage = (count / total) * 100;
    return { ...config, count, percentage };
  });

  // Sort by count descending for visual hierarchy
  const sortedData = [...statusData].sort((a, b) => b.count - a.count);
  
  // Find the max for scaling bars
  const maxCount = Math.max(...statusData.map(s => s.count), 1);

  return (
    <div className="space-y-3">
      {/* Top Stats Summary - Circular Infographic Style */}
      <div className="grid grid-cols-4 gap-2">
        {statusData.map((status, index) => (
          <motion.div
            key={status.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            onClick={() => onStatusClick(status.key, tickets.filter(t => t.status === status.key))}
            className={`
              relative cursor-pointer rounded-xl overflow-hidden
              bg-gradient-to-br ${status.bgGradient}
              border border-white/10 backdrop-blur-sm
              hover:shadow-lg ${status.glowColor}
              transition-all duration-300 hover:scale-[1.02]
              group
            `}
          >
            <div className="relative z-10 p-2 sm:p-3 flex flex-col items-center text-center">
              {/* Emoji */}
              <span className="text-lg sm:text-xl mb-1">{status.emoji}</span>
              
              {/* Circular Progress */}
              <CircularProgress 
                percentage={status.percentage} 
                color={status.color}
                size={48}
                strokeWidth={4}
              />
              
              {/* Label & Count */}
              <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium mt-1.5 leading-tight">
                {status.label}
              </p>
              <motion.p 
                className="text-base sm:text-lg font-bold"
                style={{ color: status.color }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.5 + index * 0.1 }}
              >
                {status.count}
              </motion.p>
            </div>

            {/* Decorative hexagon */}
            <HexagonDecor 
              color={status.color} 
              className="absolute -top-2 -right-2 w-12 h-12 opacity-50 group-hover:opacity-80 transition-opacity"
            />
            
            {/* Wave decoration */}
            <WavePattern color={status.color} />
          </motion.div>
        ))}
      </div>

      {/* Visual Bar Distribution */}
      <div className="space-y-2 p-2 rounded-xl bg-muted/20 border border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
            Distribusi Visual
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-muted-foreground/30 to-transparent" />
        </div>
        
        {sortedData.map((status, index) => {
          const barWidth = (status.count / maxCount) * 100;
          
          return (
            <motion.div
              key={status.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              onClick={() => onStatusClick(status.key, tickets.filter(t => t.status === status.key))}
              className="group cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {/* Label */}
                <div className="w-24 sm:w-28 flex items-center gap-1.5 shrink-0">
                  <span className="text-sm">{status.emoji}</span>
                  <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                    {status.label}
                  </span>
                </div>
                
                {/* Bar Container */}
                <div className="flex-1 h-6 sm:h-7 bg-muted/40 rounded-full overflow-hidden relative">
                  {/* Animated Bar */}
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full flex items-center justify-end pr-2 sm:pr-3"
                    style={{ 
                      background: `linear-gradient(90deg, ${status.color}dd, ${status.color})`,
                      boxShadow: `0 0 20px ${status.color}40`
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(barWidth, 8)}%` }}
                    transition={{ duration: 0.8, delay: 0.8 + index * 0.15, ease: "easeOut" }}
                  >
                    {/* Value inside bar */}
                    <span className="text-[10px] sm:text-xs font-bold text-white drop-shadow-md">
                      {status.count}
                    </span>
                  </motion.div>
                  
                  {/* Shine effect */}
                  <motion.div
                    className="absolute inset-y-0 left-0 w-full"
                    style={{
                      background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
                    }}
                    initial={{ x: "-100%" }}
                    animate={{ x: "200%" }}
                    transition={{ 
                      duration: 1.5, 
                      delay: 1.2 + index * 0.1,
                      repeat: Infinity,
                      repeatDelay: 3
                    }}
                  />
                </div>
                
                {/* Percentage */}
                <span 
                  className="w-10 text-right text-[10px] sm:text-xs font-semibold shrink-0"
                  style={{ color: status.color }}
                >
                  {status.percentage.toFixed(0)}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Total Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2 }}
        className="flex items-center justify-center gap-3 pt-2 border-t border-muted/30"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary to-primary/60 animate-pulse" />
          <span className="text-[10px] sm:text-xs text-muted-foreground">
            Total Tiket:
          </span>
          <span className="text-sm sm:text-base font-bold text-foreground">
            {tickets.length}
          </span>
        </div>
        <div className="h-4 w-px bg-muted-foreground/30" />
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Klik untuk detail</span>
          <motion.span
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            →
          </motion.span>
        </div>
      </motion.div>
    </div>
  );
}
