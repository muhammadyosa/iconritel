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

// Geographically accurate SVG paths for Sumbagsel provinces
// Based on real map coordinates, scaled and positioned
const REGION_PATHS: Record<string, { path: string; labelX: number; labelY: number; labelName: string }> = {
  "JAMBI": {
    path: `M95,28 C100,25 108,22 116,20 C124,18 132,18 140,20
           C148,22 155,26 162,30 C168,34 174,38 180,44
           C184,48 186,54 188,60 C190,66 190,72 188,78
           C186,84 182,88 176,92 C170,96 164,98 156,100
           C148,102 140,104 132,106 C124,108 116,108 108,106
           C100,104 94,100 88,94 C82,88 78,82 76,74
           C74,66 74,58 76,50 C78,42 82,36 88,32 Z`,
    labelX: 132, labelY: 58, labelName: "Jambi"
  },
  "BENGKULU": {
    path: `M30,100 C36,92 44,86 52,80 C60,76 68,74 76,74
           C74,82 78,88 82,94 C88,100 94,104 100,106
           C98,114 94,122 90,130 C86,138 80,146 74,154
           C68,162 62,170 56,178 C50,186 44,192 38,198
           C32,204 26,208 20,206 C14,204 10,198 8,190
           C6,182 6,172 8,162 C10,152 14,142 18,132
           C22,122 26,112 30,100 Z`,
    labelX: 50, labelY: 145, labelName: "Bengkulu"
  },
  "SUMSEL": {
    path: `M100,106 C108,106 116,108 124,108 C132,106 140,104 148,102
           C156,100 164,98 170,96 C176,92 182,88 188,78
           C194,82 200,88 206,94 C212,100 216,108 220,116
           C224,124 226,132 226,140 C226,148 224,156 220,164
           C216,172 210,178 204,184 C198,190 190,194 182,196
           C174,198 166,200 158,200 C150,200 142,198 134,194
           C126,190 120,184 114,178 C108,172 104,164 100,156
           C96,148 94,140 92,132 C90,124 90,116 92,112
           C94,108 96,106 100,106 Z`,
    labelX: 158, labelY: 148, labelName: "Sumatera Selatan"
  },
  "BABEL": {
    // Bangka island
    path: `M242,72 C250,68 258,68 264,72 C270,76 274,82 276,90
           C278,98 278,106 276,114 C274,122 270,128 264,132
           C258,136 252,136 246,134 C240,132 236,126 234,118
           C232,110 232,102 234,94 C236,86 238,78 242,72 Z
           M254,148 C260,144 266,144 270,148 C274,152 276,158 274,164
           C272,170 268,174 262,176 C256,178 250,176 246,172
           C242,168 240,162 242,156 C244,150 248,146 254,148 Z`,
    labelX: 258, labelY: 100, labelName: "Bangka Belitung"
  },
  "LAMPUNG": {
    path: `M92,132 C94,140 96,148 100,156 C104,164 108,172 114,178
           C120,184 126,190 134,194 C142,198 150,200 158,200
           C160,208 160,216 158,224 C156,232 152,240 146,246
           C140,252 132,258 124,262 C116,266 108,268 100,266
           C92,264 84,258 78,250 C72,242 68,234 64,224
           C60,214 56,206 54,198 C52,194 50,190 50,186
           C50,182 52,180 56,178 C60,176 64,172 68,168
           C74,160 80,152 84,144 C88,138 90,134 92,132 Z`,
    labelX: 108, labelY: 222, labelName: "Lampung"
  },
};

// Context borders (neighboring provinces, shown faded)
const CONTEXT_PATHS = [
  // Sumatera Barat (northwest)
  { path: "M95,28 C88,32 82,36 78,42 C76,50 74,58 76,74 C68,74 60,76 52,80 C44,86 36,92 30,100 C24,96 18,90 14,82 C10,74 10,64 12,54 C14,44 20,36 28,30 C36,24 46,20 56,18 C66,16 76,18 86,22 C90,24 92,26 95,28 Z", label: "Sumbar", lx: 48, ly: 55 },
  // Riau (north)
  { path: "M95,28 C92,26 90,24 86,22 C76,18 66,16 56,18 C60,12 68,8 78,6 C88,4 98,4 108,6 C118,8 126,12 134,16 C140,18 148,22 140,20 C132,18 124,18 116,20 C108,22 100,25 95,28 Z", label: "Riau", lx: 100, ly: 12 },
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

// Choropleth color scale — continuous gradient from green to red
function getChoroplethColor(value: number, min: number, max: number): string {
  if (value === 0) return "#c8d6e5"; // no data grey
  const range = Math.max(max - min, 1);
  const ratio = (value - min) / range;

  // Green → Yellow → Orange → Red
  if (ratio <= 0.25) return `hsl(${120 - ratio * 120}, 65%, 48%)`;
  if (ratio <= 0.5)  return `hsl(${90 - (ratio - 0.25) * 200}, 75%, 50%)`;
  if (ratio <= 0.75) return `hsl(${40 - (ratio - 0.5) * 80}, 85%, 50%)`;
  return `hsl(${20 - (ratio - 0.75) * 80}, 80%, 48%)`;
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

  const incidentValues = useMemo(() => data.map(d => d.totalIncidents).filter(v => v > 0), [data]);
  const minInc = useMemo(() => Math.min(...incidentValues, 0), [incidentValues]);
  const maxInc = useMemo(() => Math.max(...incidentValues, 1), [incidentValues]);
  const hoveredData = hoveredRegion ? regionDataMap[hoveredRegion] : null;

  // Build gradient bar stops
  const gradientStops = [0, 0.25, 0.5, 0.75, 1].map(r => ({
    offset: `${r * 100}%`,
    color: getChoroplethColor(minInc + r * (maxInc - minInc), minInc, maxInc),
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-3 sm:p-4 pb-1">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">🛰️ Peta Choropleth Sumbagsel</CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">Distribusi jumlah incident per wilayah Sumatera Bagian Selatan</CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-4 pt-1">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Map */}
          <div className="flex-1 flex justify-center items-center">
            <svg
              viewBox="-15 -5 310 285"
              className="w-full max-w-[380px] sm:max-w-[440px] h-auto"
              style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.12))" }}
            >
              <defs>
                {/* Ocean */}
                <radialGradient id="ocean" cx="60%" cy="40%" r="80%">
                  <stop offset="0%" stopColor="#dce9f4" />
                  <stop offset="100%" stopColor="#b4cfe0" />
                </radialGradient>
                {/* Satellite texture */}
                <filter id="satTex">
                  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" seed="3" stitchTiles="stitch" result="n" />
                  <feColorMatrix type="saturate" values="0" in="n" result="gn" />
                  <feBlend in="SourceGraphic" in2="gn" mode="soft-light" />
                </filter>
                {/* Land shadow */}
                <filter id="lShadow" x="-8%" y="-8%" width="120%" height="120%">
                  <feDropShadow dx="1.5" dy="2.5" stdDeviation="2.5" floodColor="#1a2a3a" floodOpacity="0.25" />
                </filter>
                {/* Hover glow */}
                <filter id="hGlow" x="-10%" y="-10%" width="125%" height="125%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                {/* Choropleth gradient for legend */}
                <linearGradient id="chorGrad" x1="0" y1="0" x2="1" y2="0">
                  {gradientStops.map((s, i) => (
                    <stop key={i} offset={s.offset} stopColor={s.color} />
                  ))}
                </linearGradient>
              </defs>

              {/* Ocean bg */}
              <rect x="-15" y="-5" width="310" height="285" rx="8" fill="url(#ocean)" className="dark:fill-[#141e2a]" />

              {/* Subtle wave pattern */}
              {[30, 90, 150, 210].map(y => (
                <path key={`w-${y}`} d={`M-15,${y} Q60,${y - 6} 140,${y} Q220,${y + 6} 295,${y}`}
                  fill="none" stroke="#a8c4d8" strokeWidth="0.3" opacity="0.3" className="dark:stroke-[#2a3a4a]" />
              ))}

              {/* Context provinces (faded) */}
              {CONTEXT_PATHS.map((ctx, i) => (
                <g key={i}>
                  <path d={ctx.path} fill="#c8ced6" stroke="#a0a8b4" strokeWidth="0.6" opacity="0.35"
                    filter="url(#satTex)" className="dark:fill-[#2e3a48] dark:stroke-[#4a5668]" />
                  <text x={ctx.lx} y={ctx.ly} textAnchor="middle" fill="#8090a0" fontSize="6"
                    fontStyle="italic" opacity="0.5" fontWeight="500">{ctx.label}</text>
                </g>
              ))}

              {/* Sea labels */}
              <text x="230" y="55" fill="#6a8eaa" fontSize="5.5" fontStyle="italic" opacity="0.5"
                transform="rotate(20,230,55)" fontWeight="500">Selat Bangka</text>
              <text x="140" y="270" fill="#6a8eaa" fontSize="5.5" fontStyle="italic" opacity="0.5"
                fontWeight="500">Selat Sunda</text>
              <text x="-8" y="220" fill="#6a8eaa" fontSize="5.5" fontStyle="italic" opacity="0.5"
                transform="rotate(-75,-8,220)" fontWeight="500">Samudra Hindia</text>
              <text x="260" y="170" fill="#6a8eaa" fontSize="5.5" fontStyle="italic" opacity="0.5"
                transform="rotate(90,260,170)" fontWeight="500">Laut Jawa</text>

              {/* Main regions */}
              {Object.entries(REGION_PATHS).map(([regionKey, { path, labelX, labelY, labelName }]) => {
                const rd = regionDataMap[regionKey];
                const inc = rd?.totalIncidents || 0;
                const isHov = hoveredRegion === regionKey;
                const fill = getChoroplethColor(inc, minInc, maxInc);

                return (
                  <g
                    key={regionKey}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredRegion(regionKey)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={() => rd && onRegionClick?.(rd.region)}
                    filter={isHov ? "url(#hGlow)" : "url(#lShadow)"}
                  >
                    <path
                      d={path}
                      fill={fill}
                      stroke={isHov ? "#fff" : "#556677"}
                      strokeWidth={isHov ? 2 : 0.8}
                      strokeLinejoin="round"
                      filter="url(#satTex)"
                      style={{
                        transition: "all 0.25s ease",
                        transform: isHov ? "scale(1.025)" : "scale(1)",
                        transformOrigin: `${labelX}px ${labelY}px`,
                        opacity: isHov ? 1 : 0.92,
                      }}
                      className={cn(inc === 0 && "dark:fill-[#354050]")}
                    />

                    {/* Region name */}
                    {labelName.split(" ").length > 1 && labelName.length > 10 ? (
                      // Multi-line for long names
                      labelName.split(" ").reduce((lines: string[], word) => {
                        const last = lines[lines.length - 1];
                        if (last && (last + " " + word).length <= 12) {
                          lines[lines.length - 1] = last + " " + word;
                        } else {
                          lines.push(word);
                        }
                        return lines;
                      }, []).map((line, li, arr) => (
                        <text key={li} x={labelX} y={labelY - ((arr.length - 1) * 5) + li * 10}
                          textAnchor="middle" className="pointer-events-none select-none"
                          fill="#1a1a2e" fontSize={isHov ? 8 : 7} fontWeight={isHov ? 800 : 700}
                          style={{ textShadow: "0 0 6px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.9)" }}>
                          {line}
                        </text>
                      ))
                    ) : (
                      <text x={labelX} y={labelY}
                        textAnchor="middle" className="pointer-events-none select-none"
                        fill="#1a1a2e" fontSize={isHov ? 8.5 : 7.5} fontWeight={isHov ? 800 : 700}
                        style={{ textShadow: "0 0 6px rgba(255,255,255,0.9), 0 0 6px rgba(255,255,255,0.9)" }}>
                        {labelName}
                      </text>
                    )}

                    {/* Incident value badge */}
                    {inc > 0 && (
                      <g>
                        <rect x={labelX - 14} y={labelY + (labelName.length > 10 ? 8 : 5)} width="28" height="12" rx="6"
                          fill="rgba(0,0,0,0.6)" />
                        <text x={labelX} y={labelY + (labelName.length > 10 ? 16 : 13)}
                          textAnchor="middle" className="pointer-events-none select-none"
                          fill="#fff" fontSize="6.5" fontWeight="700">
                          {inc}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Compass */}
              <g transform="translate(270,18)">
                <circle r="13" fill="rgba(255,255,255,0.9)" stroke="#8899aa" strokeWidth="0.6" />
                <polygon points="0,-9 -2.5,-3 2.5,-3" fill="#c0392b" />
                <polygon points="0,9 -2.5,3 2.5,3" fill="#bdc3c7" />
                <line x1="-8" y1="0" x2="8" y2="0" stroke="#bdc3c7" strokeWidth="0.4" />
                <line x1="0" y1="-9" x2="0" y2="9" stroke="#bdc3c7" strokeWidth="0.4" />
                <text textAnchor="middle" y="-1" fill="#c0392b" fontSize="5.5" fontWeight="900">N</text>
                <text textAnchor="middle" y="8" fill="#95a5a6" fontSize="4" fontWeight="600">S</text>
                <text x="-1" y="3" textAnchor="end" fill="#95a5a6" fontSize="3.5" fontWeight="600">W</text>
                <text x="1" y="3" textAnchor="start" fill="#95a5a6" fontSize="3.5" fontWeight="600">E</text>
              </g>

              {/* Choropleth gradient legend bar */}
              <g transform="translate(10,260)">
                <text y="-4" fill="#5a6577" fontSize="5" fontWeight="600">Rendah</text>
                <text x="100" y="-4" textAnchor="end" fill="#5a6577" fontSize="5" fontWeight="600">Tinggi</text>
                <rect x="0" y="0" width="100" height="8" rx="4" fill="url(#chorGrad)" stroke="#8899aa" strokeWidth="0.3" />
                <text y="16" fill="#7a8a9a" fontSize="4.5">{minInc || 0}</text>
                <text x="100" y="16" textAnchor="end" fill="#7a8a9a" fontSize="4.5">{maxInc}</text>
              </g>

              {/* Scale bar */}
              <g transform="translate(180,268)">
                <line x1="0" y1="0" x2="50" y2="0" stroke="#5a6577" strokeWidth="0.8" />
                <line x1="0" y1="-2.5" x2="0" y2="2.5" stroke="#5a6577" strokeWidth="0.6" />
                <line x1="50" y1="-2.5" x2="50" y2="2.5" stroke="#5a6577" strokeWidth="0.6" />
                <text x="25" y="8" textAnchor="middle" fill="#5a6577" fontSize="4.5">~150 km</text>
              </g>
            </svg>
          </div>

          {/* Detail panel */}
          <div className="lg:w-[190px] space-y-3">
            {/* Hover detail */}
            {hoveredData ? (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl p-3 border border-border shadow-md space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getChoroplethColor(hoveredData.totalIncidents, minInc, maxInc) }} />
                  <p className="text-xs font-bold text-foreground">{hoveredData.region}</p>
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: "Total Incident", value: hoveredData.totalIncidents, color: "text-foreground", bold: true },
                    { label: "Resolved", value: hoveredData.resolved, color: "text-success" },
                    { label: "Pending", value: hoveredData.pending, color: "text-warning" },
                    { label: "Critical", value: hoveredData.critical, color: "text-destructive" },
                    { label: "Total OLT", value: hoveredData.totalHostnames, color: "text-foreground" },
                    { label: "Total Mitra", value: hoveredData.totalMitra, color: "text-foreground" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="text-[9px] text-muted-foreground">{item.label}</span>
                      <span className={cn("text-[10px] font-bold tabular-nums", item.color,
                        item.bold && "text-sm")}>{item.value}</span>
                    </div>
                  ))}
                </div>
                {hoveredData.totalIncidents > 0 && (
                  <div className="pt-1 border-t border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-muted-foreground">Resolved Rate</span>
                      <span className="text-[10px] font-bold text-success">
                        {Math.round((hoveredData.resolved / hoveredData.totalIncidents) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="bg-muted/30 rounded-xl p-4 border border-dashed border-border/50">
                <p className="text-[10px] text-muted-foreground text-center italic leading-relaxed">
                  🖱️ Arahkan cursor ke peta untuk melihat detail wilayah
                </p>
              </div>
            )}

            {/* Stats summary */}
            <div className="bg-muted/20 rounded-lg p-2.5 border border-border/30 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ringkasan</p>
              {[
                { label: "Total Wilayah", value: Object.keys(regionDataMap).length },
                { label: "Total Incident", value: data.reduce((s, d) => s + d.totalIncidents, 0) },
                { label: "Avg per Wilayah", value: Math.round(data.reduce((s, d) => s + d.totalIncidents, 0) / Math.max(Object.keys(regionDataMap).length, 1)) },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-[9px] text-muted-foreground">{item.label}</span>
                  <span className="text-[9px] font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
