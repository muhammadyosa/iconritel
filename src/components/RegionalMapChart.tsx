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

// More geographically accurate SVG paths for Sumbagsel provinces
const REGION_PATHS: Record<string, { path: string; labelX: number; labelY: number; labelName: string }> = {
  "JAMBI": {
    path: "M48,18 C55,15 68,10 82,8 C96,6 108,12 118,18 C128,24 138,28 148,35 C155,40 160,48 162,58 C163,68 160,78 155,86 C150,94 142,100 134,104 C126,108 116,110 106,112 C96,114 86,115 76,112 C66,109 58,103 50,96 C42,89 36,80 32,70 C28,60 28,50 30,40 C32,30 38,22 48,18 Z",
    labelX: 98, labelY: 62, labelName: "Jambi"
  },
  "BENGKULU": {
    path: "M12,95 C18,85 26,78 32,70 C36,80 42,89 50,96 C58,103 66,109 76,112 C74,120 70,128 66,136 C62,144 56,152 50,160 C44,168 38,176 32,184 C26,192 22,198 18,206 C14,210 8,208 4,200 C0,192 -2,180 0,168 C2,156 4,144 6,132 C8,120 10,108 12,95 Z",
    labelX: 36, labelY: 150, labelName: "Bengkulu"
  },
  "SUMSEL": {
    path: "M76,112 C86,115 96,114 106,112 C116,110 126,108 134,104 C142,100 150,94 155,86 C162,90 170,96 178,100 C186,104 194,108 200,116 C206,124 210,134 212,144 C214,154 212,164 208,174 C204,184 198,192 190,198 C182,204 172,208 162,212 C152,216 142,218 132,218 C122,218 112,216 104,210 C96,204 90,196 84,188 C78,180 72,170 66,162 C62,154 58,148 56,144 C54,140 56,136 60,132 C64,128 70,124 74,118 C76,116 76,114 76,112 Z",
    labelX: 142, labelY: 158, labelName: "Sumatera\nSelatan"
  },
  "BABEL": {
    path: "M218,88 C226,84 236,82 244,86 C252,90 258,96 262,104 C266,112 268,122 266,132 C264,142 260,150 254,156 C248,162 240,166 232,164 C224,162 218,156 214,148 C210,140 208,130 210,120 C212,110 214,100 218,88 Z M240,146 C246,142 250,136 252,128 C250,132 246,138 240,142 Z",
    labelX: 242, labelY: 116, labelName: "Kep. Bangka\nBelitung"
  },
  "LAMPUNG": {
    path: "M56,144 C58,148 62,154 66,162 C72,170 78,180 84,188 C90,196 96,204 104,210 C112,216 122,218 132,218 C136,226 138,236 136,246 C134,256 128,264 122,272 C116,280 108,286 98,290 C88,294 78,294 68,290 C58,286 50,278 44,268 C38,258 34,246 30,236 C26,226 22,216 18,206 C22,198 26,192 32,184 C38,176 44,168 50,160 C54,154 56,148 56,144 Z",
    labelX: 82, labelY: 244, labelName: "Lampung"
  },
};

// Partial coastline hints (Sumatera Barat border)
const CONTEXT_PATHS = [
  // Sumatera Barat hint (northwest)
  { path: "M48,18 C40,14 30,12 22,16 C14,20 8,28 4,38 C0,48 -2,60 0,72 C2,82 6,90 12,95", label: "Sumatera\nBarat", lx: -2, ly: 52 },
];

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

function getHeatColor(incidents: number, maxIncidents: number): { fill: string; className: string } {
  if (incidents === 0) return { fill: "#b0b8c4", className: "" }; // neutral grey
  const ratio = incidents / Math.max(maxIncidents, 1);
  if (ratio > 0.7) return { fill: "#e74c3c", className: "" };
  if (ratio > 0.4) return { fill: "#f39c12", className: "" };
  if (ratio > 0.15) return { fill: "#f1c40f", className: "" };
  return { fill: "#27ae60", className: "" };
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
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">🛰️ Peta Daerah Sumbagsel</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">Heat map incident wilayah Sumatera Bagian Selatan</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-1">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Map SVG */}
          <div className="flex-1 flex justify-center items-center">
            <svg
              viewBox="-30 -10 310 320"
              className="w-full max-w-[360px] sm:max-w-[420px] h-auto"
              style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
            >
              <defs>
                {/* Ocean gradient */}
                <radialGradient id="oceanGrad" cx="50%" cy="50%" r="70%">
                  <stop offset="0%" stopColor="#d4e6f1" />
                  <stop offset="100%" stopColor="#a9cce3" />
                </radialGradient>
                {/* Land texture filter */}
                <filter id="landShadow" x="-5%" y="-5%" width="110%" height="110%">
                  <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.2" />
                </filter>
                {/* Satellite-style noise texture */}
                <filter id="noise">
                  <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
                  <feColorMatrix type="saturate" values="0" in="noise" result="greyNoise" />
                  <feBlend in="SourceGraphic" in2="greyNoise" mode="multiply" result="textured" />
                  <feComponentTransfer in="textured">
                    <feFuncA type="linear" slope="1" />
                  </feComponentTransfer>
                </filter>
                {/* Hover glow */}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Ocean background */}
              <rect x="-30" y="-10" width="310" height="320" rx="8" fill="url(#oceanGrad)" className="dark:fill-[#1a2633]" />
              
              {/* Subtle lat/lon grid */}
              {[-10, 50, 110, 170, 230].map(x => (
                <line key={`vg-${x}`} x1={x} y1="-10" x2={x} y2="310" stroke="#b0c4d8" strokeWidth="0.2" opacity="0.4" />
              ))}
              {[20, 80, 140, 200, 260].map(y => (
                <line key={`hg-${y}`} x1="-30" y1={y} x2="280" y2={y} stroke="#b0c4d8" strokeWidth="0.2" opacity="0.4" />
              ))}

              {/* Context border regions (faded) */}
              {CONTEXT_PATHS.map((ctx, i) => (
                <g key={`ctx-${i}`}>
                  <path d={ctx.path} fill="#c8ced6" stroke="#9aa5b1" strokeWidth="0.8" opacity="0.4" className="dark:fill-[#3a4556] dark:stroke-[#5a6577]" />
                  {ctx.label.split("\n").map((line, li) => (
                    <text key={li} x={ctx.lx} y={ctx.ly + li * 10} textAnchor="middle" fill="#8899aa"
                      fontSize="6" fontWeight="500" fontStyle="italic" opacity="0.6">{line}</text>
                  ))}
                </g>
              ))}

              {/* Sea/strait labels */}
              <text x="220" y="60" fill="#7193b0" fontSize="6" fontStyle="italic" opacity="0.5" transform="rotate(15, 220, 60)">Selat Bangka</text>
              <text x="170" y="280" fill="#7193b0" fontSize="6" fontStyle="italic" opacity="0.5">Selat Sunda</text>
              <text x="-20" y="240" fill="#7193b0" fontSize="6" fontStyle="italic" opacity="0.5" transform="rotate(-70, -20, 240)">Samudra Hindia</text>

              {/* Main region shapes */}
              {Object.entries(REGION_PATHS).map(([regionKey, { path, labelX, labelY, labelName }]) => {
                const regionData = regionDataMap[regionKey];
                const incidents = regionData?.totalIncidents || 0;
                const isHovered = hoveredRegion === regionKey;
                const { fill } = getHeatColor(incidents, maxIncidents);
                const defaultFill = "#d5dce4";
                const actualFill = incidents > 0 ? fill : defaultFill;

                return (
                  <g
                    key={regionKey}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRegion(regionKey)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => {
                      if (regionData && onRegionClick) onRegionClick(regionData.region);
                    }}
                    filter={isHovered ? "url(#glow)" : "url(#landShadow)"}
                  >
                    {/* Land shape */}
                    <path
                      d={path}
                      fill={isHovered ? (incidents > 0 ? fill : "#ffd700") : actualFill}
                      stroke={isHovered ? "#2c3e50" : "#8899aa"}
                      strokeWidth={isHovered ? 1.8 : 1}
                      strokeLinejoin="round"
                      opacity={isHovered ? 1 : 0.92}
                      filter="url(#noise)"
                      style={{
                        transition: "all 0.25s ease",
                        transform: isHovered ? "scale(1.02)" : "scale(1)",
                        transformOrigin: `${labelX}px ${labelY}px`,
                      }}
                      className={cn("dark:stroke-[#5a6577]", !isHovered && incidents === 0 && "dark:fill-[#3d4a5c]")}
                    />
                    {/* Inner shadow for depth */}
                    <path
                      d={path}
                      fill="none"
                      stroke="rgba(0,0,0,0.08)"
                      strokeWidth="3"
                      strokeLinejoin="round"
                      clipPath={`url(#clip-${regionKey})`}
                      className="pointer-events-none"
                    />

                    {/* Region label */}
                    {labelName.split("\n").map((line, li) => (
                      <text
                        key={li}
                        x={labelX}
                        y={labelY - (labelName.split("\n").length - 1) * 5 + li * 11}
                        textAnchor="middle"
                        className="pointer-events-none select-none"
                        fill={isHovered ? "#1a1a2e" : "#2c3e50"}
                        fontSize={isHovered ? 9 : 7.5}
                        fontWeight={isHovered ? 800 : 600}
                        fontFamily="system-ui, -apple-system, sans-serif"
                        style={{
                          textShadow: "0 0 5px rgba(255,255,255,0.8), 0 0 5px rgba(255,255,255,0.8)",
                        }}
                      >
                        {line}
                      </text>
                    ))}

                    {/* Incident count badge */}
                    {incidents > 0 && (
                      <g>
                        <rect
                          x={labelX - 16}
                          y={labelY + (labelName.split("\n").length - 1) * 5 + 4}
                          width="32" height="13" rx="6.5"
                          fill={fill} opacity="0.9"
                          stroke="rgba(255,255,255,0.6)" strokeWidth="0.5"
                        />
                        <text
                          x={labelX}
                          y={labelY + (labelName.split("\n").length - 1) * 5 + 13}
                          textAnchor="middle"
                          className="pointer-events-none select-none"
                          fill="#fff"
                          fontSize={6.5}
                          fontWeight={700}
                        >
                          {incidents} inc
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Compass rose */}
              <g transform="translate(255, 15)">
                <circle r="14" fill="rgba(255,255,255,0.85)" stroke="#8899aa" strokeWidth="0.8" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="#c0392b" strokeWidth="0.6" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#8899aa" strokeWidth="0.4" />
                <polygon points="0,-10 -3,-4 3,-4" fill="#c0392b" />
                <polygon points="0,10 -3,4 3,4" fill="#8899aa" />
                <text textAnchor="middle" y="-2" fill="#c0392b" fontSize="6" fontWeight="800">N</text>
                <text textAnchor="middle" y="9" fill="#8899aa" fontSize="4.5" fontWeight="600">S</text>
              </g>

              {/* Scale bar */}
              <g transform="translate(10, 295)">
                <line x1="0" y1="0" x2="40" y2="0" stroke="#5a6577" strokeWidth="1" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="#5a6577" strokeWidth="0.8" />
                <line x1="40" y1="-3" x2="40" y2="3" stroke="#5a6577" strokeWidth="0.8" />
                <text x="20" y="8" textAnchor="middle" fill="#5a6577" fontSize="5" fontWeight="500">~100 km</text>
              </g>
            </svg>
          </div>

          {/* Info panel */}
          <div className="lg:w-[180px] space-y-2">
            {/* Legend */}
            <div className="space-y-1.5">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keterangan</p>
              {[
                { color: "#e74c3c", label: "Tinggi (>70%)" },
                { color: "#f39c12", label: "Sedang (40-70%)" },
                { color: "#f1c40f", label: "Rendah (15-40%)" },
                { color: "#27ae60", label: "Minimal (<15%)" },
                { color: "#d5dce4", label: "Tidak ada data" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3.5 h-3 rounded-[3px] flex-shrink-0 border border-border/30 shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Hover detail */}
            {hoveredData && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-lg p-2.5 border border-border shadow-sm space-y-1.5"
              >
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  📍 {hoveredData.region}
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                  {[
                    { label: "Incident", value: hoveredData.totalIncidents, color: "text-foreground" },
                    { label: "Resolved", value: hoveredData.resolved, color: "text-success" },
                    { label: "Pending", value: hoveredData.pending, color: "text-warning" },
                    { label: "Critical", value: hoveredData.critical, color: "text-destructive" },
                    { label: "OLT", value: hoveredData.totalHostnames, color: "text-foreground" },
                    { label: "Mitra", value: hoveredData.totalMitra, color: "text-foreground" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                      <span className={cn("text-[9px] font-bold tabular-nums", item.color)}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {!hoveredData && (
              <div className="bg-muted/30 rounded-lg p-3 border border-dashed border-border/50">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground text-center italic leading-relaxed">
                  🖱️ Arahkan cursor ke peta untuk melihat detail wilayah
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
