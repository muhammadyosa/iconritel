import { Badge } from "@/components/ui/badge";

const REGION_COLORS: Record<string, string> = {
  "SUMATERA SELATAN": "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "BENGKULU": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  "LAMPUNG": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "JAMBI": "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  "BABEL": "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  "SUMBAR": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  "SUMUT": "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "KALBAR": "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
  "KALTIM": "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  "KALSEL": "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30",
  "SULSEL": "bg-lime-500/15 text-lime-700 dark:text-lime-400 border-lime-500/30",
  "SULUT": "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
};

const DEFAULT_COLOR = "bg-muted text-muted-foreground border-border";

interface RegionBadgeProps {
  region: string;
}

export function RegionBadge({ region }: RegionBadgeProps) {
  if (!region || region === "-") {
    return <span className="text-[8px] sm:text-[9px] text-muted-foreground">-</span>;
  }

  const colorClass = REGION_COLORS[region.toUpperCase()] || DEFAULT_COLOR;

  return (
    <Badge
      variant="outline"
      className={`${colorClass} text-[7px] sm:text-[8px] px-1.5 py-0 h-4 font-medium whitespace-nowrap border`}
    >
      {region}
    </Badge>
  );
}
