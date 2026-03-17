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

// SVG paths for Sumbagsel provinces (Jambi, Bengkulu, Sumsel, Babel, Lampung)
const REGION_PATHS: Record<string, { path: string; labelX: number; labelY: number }> = {
  "JAMBI":    { path: "M60,30 L130,20 L180,40 L190,80 L170,120 L120,130 L70,110 L45,70 Z", labelX: 118, labelY: 70 },
  "BENGKULU": { path: "M45,70 L70,110 L120,130 L110,170 L90,210 L55,230 L30,200 L20,150 L25,100 Z", labelX: 68, labelY: 155 },
  "SUMSEL":  { path: "M120,130 L170,120 L220,130 L250,160 L245,210 L220,250 L170,260 L120,240 L100,210 L90,210 L110,170 Z", labelX: 170, labelY: 190 },
  "BABEL":   { path: "M270,120 L310,110 L340,130 L345,175 L320,200 L285,195 L265,165 Z", labelX: 305, labelY: 155 },
  "LAMPUNG": { path: "M100,210 L120,240 L170,260 L175,300 L155,340 L115,345 L75,320 L55,280 L55,230 Z", labelX: 115, labelY: 285 },
};

const REGION_ALIASES: Record<string, string[]> = {
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
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">🗺️ Peta Daerah Sumbagsel</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">Heat map incident wilayah Sumatera Bagian Selatan</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-1">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Map SVG */}
          <div className="flex-1 flex justify-center items-center">
            <svg
              viewBox="0 0 370 370"
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
