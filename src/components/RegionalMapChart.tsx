import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface RegionMapData {
  region: string;
  totalIncidents: number;
  resolved: number;
  pending: number;
  critical: number;
  totalHostnames: number;
  totalMitra: number;
}

interface RegionalMapChartProps {
  data: RegionMapData[];
  onRegionClick?: (region: string) => void;
}

// Simplified SVG paths for Sumatra provinces + nearby islands
// These are approximate shapes positioned relative to each other
const REGION_PATHS: Record<string, { path: string; labelX: number; labelY: number }> = {
  "ACEH":    { path: "M120,20 L160,15 L180,35 L175,65 L155,80 L130,70 L110,50 Z", labelX: 148, labelY: 45 },
  "SUMUT":   { path: "M130,70 L155,80 L175,65 L185,90 L180,120 L160,135 L135,130 L120,110 L115,85 Z", labelX: 150, labelY: 100 },
  "RIAU":    { path: "M160,135 L180,120 L210,115 L240,125 L245,155 L230,175 L200,180 L175,170 L160,150 Z", labelX: 200, labelY: 148 },
  "KEPRI":   { path: "M260,130 L280,125 L295,135 L290,155 L270,160 L255,150 Z", labelX: 275, labelY: 142 },
  "SUMBAR":  { path: "M120,110 L135,130 L160,150 L155,175 L140,190 L115,185 L105,160 L110,135 Z", labelX: 133, labelY: 158 },
  "JAMBI":   { path: "M155,175 L175,170 L200,180 L210,200 L195,220 L170,215 L150,200 Z", labelX: 178, labelY: 195 },
  "BENGKULU": { path: "M105,160 L115,185 L140,190 L150,200 L145,225 L130,245 L110,240 L95,215 L90,185 Z", labelX: 120, labelY: 210 },
  "SUMSEL":  { path: "M150,200 L170,215 L195,220 L215,230 L225,255 L210,275 L180,280 L155,270 L140,250 L130,245 L145,225 Z", labelX: 178, labelY: 248 },
  "BABEL":   { path: "M240,220 L260,215 L275,225 L275,250 L260,260 L240,250 Z", labelX: 258, labelY: 238 },
  "LAMPUNG": { path: "M140,250 L155,270 L180,280 L185,305 L170,325 L145,320 L125,300 L120,275 Z", labelX: 152, labelY: 292 },
};

// Aliases for region name matching
const REGION_ALIASES: Record<string, string[]> = {
  "ACEH": ["ACEH", "NAD"],
  "SUMUT": ["SUMUT", "SUMATERA UTARA", "MEDAN"],
  "RIAU": ["RIAU", "PEKANBARU"],
  "KEPRI": ["KEPRI", "KEPULAUAN RIAU", "BATAM"],
  "SUMBAR": ["SUMBAR", "SUMATERA BARAT", "PADANG"],
  "JAMBI": ["JAMBI"],
  "BENGKULU": ["BENGKULU"],
  "SUMSEL": ["SUMSEL", "SUMATERA SELATAN", "PALEMBANG"],
  "BABEL": ["BABEL", "BANGKA BELITUNG", "BANGKA"],
  "LAMPUNG": ["LAMPUNG"],
};

function matchRegion(dataRegion: string): string | null {
  const upper = dataRegion.trim().toUpperCase();
  for (const [key, aliases] of Object.entries(REGION_ALIASES)) {
    if (aliases.some(a => upper.includes(a) || a.includes(upper))) return key;
  }
  return null;
}

function getHeatColor(incidents: number, maxIncidents: number): string {
  if (incidents === 0) return "hsl(var(--muted))";
  const ratio = incidents / Math.max(maxIncidents, 1);
  if (ratio > 0.7) return "hsl(0, 84%, 55%)";      // high - red
  if (ratio > 0.4) return "hsl(38, 92%, 50%)";      // medium - orange/yellow
  if (ratio > 0.15) return "hsl(45, 93%, 58%)";     // low-med - yellow
  return "hsl(142, 76%, 45%)";                        // low - green
}

export default function RegionalMapChart({ data, onRegionClick }: RegionalMapChartProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

  const regionDataMap = useMemo(() => {
    const map: Record<string, RegionMapData> = {};
    data.forEach(d => {
      const key = matchRegion(d.region);
      if (key) map[key] = d;
    });
    return map;
  }, [data]);

  const maxIncidents = useMemo(() => Math.max(...data.map(d => d.totalIncidents), 1), [data]);

  const hoveredData = hoveredRegion ? regionDataMap[hoveredRegion] : null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-4 pb-1">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">🗺️ Peta Daerah Regional</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">Heat map incident per wilayah Sumatera</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-1">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Map SVG */}
          <div className="flex-1 flex justify-center items-center">
            <svg
              viewBox="60 0 260 340"
              className="w-full max-w-[320px] sm:max-w-[380px] h-auto"
              style={{ filter: "drop-shadow(0 2px 8px hsl(var(--foreground) / 0.1))" }}
            >
              {/* Water background */}
              <rect x="60" y="0" width="260" height="340" rx="12" fill="hsl(210, 60%, 95%)" className="dark:fill-[hsl(210,30%,15%)]" />
              
              {/* Grid lines for visual reference */}
              {[80, 140, 200, 260].map(x => (
                <line key={`vl-${x}`} x1={x} y1="0" x2={x} y2="340" stroke="hsl(210, 40%, 88%)" strokeWidth="0.3" className="dark:stroke-[hsl(210,20%,25%)]" />
              ))}
              {[60, 120, 180, 240, 300].map(y => (
                <line key={`hl-${y}`} x1="60" y1={y} x2="320" y2={y} stroke="hsl(210, 40%, 88%)" strokeWidth="0.3" className="dark:stroke-[hsl(210,20%,25%)]" />
              ))}

              {/* Region shapes */}
              {Object.entries(REGION_PATHS).map(([regionKey, { path, labelX, labelY }]) => {
                const regionData = regionDataMap[regionKey];
                const incidents = regionData?.totalIncidents || 0;
                const isHovered = hoveredRegion === regionKey;
                const fillColor = getHeatColor(incidents, maxIncidents);

                return (
                  <g
                    key={regionKey}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredRegion(regionKey)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => {
                      if (regionData && onRegionClick) onRegionClick(regionData.region);
                    }}
                  >
                    <path
                      d={path}
                      fill={fillColor}
                      stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--background))"}
                      strokeWidth={isHovered ? 2.5 : 1.2}
                      opacity={isHovered ? 1 : 0.85}
                      style={{
                        transition: "all 0.2s ease",
                        transform: isHovered ? `scale(1.03)` : "scale(1)",
                        transformOrigin: `${labelX}px ${labelY}px`,
                      }}
                    />
                    <text
                      x={labelX}
                      y={labelY - 5}
                      textAnchor="middle"
                      className="pointer-events-none select-none"
                      fill="hsl(var(--foreground))"
                      fontSize={isHovered ? 9 : 7}
                      fontWeight={isHovered ? 700 : 600}
                      style={{ textShadow: "0 0 4px hsl(var(--background)), 0 0 4px hsl(var(--background))" }}
                    >
                      {regionKey}
                    </text>
                    {incidents > 0 && (
                      <text
                        x={labelX}
                        y={labelY + 8}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        fill="hsl(var(--foreground))"
                        fontSize={7}
                        fontWeight={500}
                        style={{ textShadow: "0 0 3px hsl(var(--background)), 0 0 3px hsl(var(--background))" }}
                      >
                        {incidents} inc
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Compass */}
              <g transform="translate(290, 25)">
                <circle r="12" fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.8" />
                <text textAnchor="middle" y="4" fill="hsl(var(--foreground))" fontSize="10" fontWeight="700">N</text>
              </g>
            </svg>
          </div>

          {/* Info panel */}
          <div className="lg:w-[180px] space-y-2">
            {/* Legend */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground">Keterangan Warna</p>
              {[
                { color: "hsl(0, 84%, 55%)", label: "Tinggi (>70%)" },
                { color: "hsl(38, 92%, 50%)", label: "Sedang (40-70%)" },
                { color: "hsl(45, 93%, 58%)", label: "Rendah (15-40%)" },
                { color: "hsl(142, 76%, 45%)", label: "Minimal (<15%)" },
                { color: "hsl(var(--muted))", label: "Tidak ada data" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0 border border-border/50" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Hover detail */}
            {hoveredData && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-muted/50 rounded-lg p-2.5 border border-border/50 space-y-1"
              >
                <p className="text-xs font-bold text-foreground">{hoveredData.region}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  <span className="text-[9px] text-muted-foreground">Incident</span>
                  <span className="text-[9px] font-semibold text-foreground">{hoveredData.totalIncidents}</span>
                  <span className="text-[9px] text-muted-foreground">Resolved</span>
                  <span className="text-[9px] font-semibold text-success">{hoveredData.resolved}</span>
                  <span className="text-[9px] text-muted-foreground">Pending</span>
                  <span className="text-[9px] font-semibold text-warning">{hoveredData.pending}</span>
                  <span className="text-[9px] text-muted-foreground">Critical</span>
                  <span className="text-[9px] font-semibold text-destructive">{hoveredData.critical}</span>
                  <span className="text-[9px] text-muted-foreground">OLT</span>
                  <span className="text-[9px] font-semibold text-foreground">{hoveredData.totalHostnames}</span>
                  <span className="text-[9px] text-muted-foreground">Mitra</span>
                  <span className="text-[9px] font-semibold text-foreground">{hoveredData.totalMitra}</span>
                </div>
              </motion.div>
            )}

            {!hoveredData && (
              <div className="bg-muted/30 rounded-lg p-2.5 border border-dashed border-border/50">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center italic">
                  Arahkan cursor ke peta untuk melihat detail wilayah
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
