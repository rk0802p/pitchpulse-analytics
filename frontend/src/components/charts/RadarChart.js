import React, { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

const SERIES_PALETTE = [
  { stroke: 'var(--blue, #1d4ed8)', fill: 'rgba(29, 78, 216, 0.16)', dot: '#1d4ed8', name: 'Primary' },
  { stroke: 'var(--signal, #c92a2a)', fill: 'rgba(201, 42, 42, 0.16)', dot: '#c92a2a', name: 'Comparison 1' },
  { stroke: '#15803d', fill: 'rgba(21, 128, 61, 0.16)', dot: '#15803d', name: 'Comparison 2' }
];

export default function RadarChart({
  dimensions = [
    { key: 'goals_per_90', label: 'Goals/90', group: 'Scoring' },
    { key: 'xg_per_90', label: 'xG/90', group: 'Scoring' },
    { key: 'assists_per_90', label: 'Assists/90', group: 'Creating' },
    { key: 'xag_per_90', label: 'xAG/90', group: 'Creating' },
    { key: 'prgc_per_90', label: 'Carries/90', group: 'Progressing' },
    { key: 'prgp_per_90', label: 'Passes/90', group: 'Progressing' }
  ],
  series = [], // [{ name: 'Player Name', values: { goals_per_90: 85, ... } }]
  size = 460,
  title = 'Scouting Radar Profile',
  subtitle = 'Percentiles relative to positional peers (min 270 mins)'
}) {
  const [hoveredMetric, setHoveredMetric] = useState(null);

  const center = size / 2;
  const radius = size * 0.32;
  const n = dimensions.length;
  const angleStep = (2 * Math.PI) / n;

  // Concentric web levels: 25%, 50%, 75%, 100%
  const levels = [25, 50, 75, 100];

  const getCoordinates = (index, pct) => {
    // Start from 12 o'clock (-PI/2)
    const angle = index * angleStep - Math.PI / 2;
    const dist = (Math.max(0, Math.min(100, pct)) / 100) * radius;
    return {
      x: center + dist * Math.cos(angle),
      y: center + dist * Math.sin(angle)
    };
  };

  const getLabelCoordinates = (index) => {
    const angle = index * angleStep - Math.PI / 2;
    const labelDist = radius + 36;
    return {
      x: center + labelDist * Math.cos(angle),
      y: center + labelDist * Math.sin(angle)
    };
  };

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 rounded-xs space-y-3 font-ser">
      <div className="border-b border-[var(--ink)] pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs italic text-[var(--mute)] mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Series Legend at top right */}
        {series.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {series.slice(0, 3).map((s, idx) => {
              const pal = SERIES_PALETTE[idx % SERIES_PALETTE.length];
              return (
                <div key={s.name || idx} className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                  <span className="w-3 h-3 rounded-full border" style={{ borderColor: pal.stroke, backgroundColor: pal.fill }} />
                  <span>{s.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="relative w-full max-w-[460px] mx-auto aspect-square flex items-center justify-center select-none">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible" role="img" aria-label={title}>
          {/* Concentric rings at 25, 50, 75, 100 */}
          {levels.map((lvl) => {
            const polygonPoints = dimensions
              .map((_, i) => {
                const pt = getCoordinates(i, lvl);
                return `${pt.x},${pt.y}`;
              })
              .join(' ');

            const isMedian = lvl === 50;

            return (
              <g key={`lvl-${lvl}`}>
                <polygon
                  points={polygonPoints}
                  fill="none"
                  stroke="var(--rule)"
                  strokeWidth={isMedian ? 1.6 : 0.8}
                  strokeDasharray={isMedian ? 'none' : '3 3'}
                  opacity={isMedian ? 0.9 : 0.6}
                />
                {/* Ring Percentile Tag at top vertex */}
                <text
                  x={center + 4}
                  y={center - (lvl / 100) * radius + 10}
                  className="fill-[var(--mute)] text-[9px] font-mono italic"
                >
                  {lvl}%{isMedian ? ' (med)' : ''}
                </text>
              </g>
            );
          })}

          {/* Spokes radiating from center */}
          {dimensions.map((dim, i) => {
            const end = getCoordinates(i, 100);
            const lbl = getLabelCoordinates(i);
            const angle = i * angleStep - Math.PI / 2;
            const cos = Math.cos(angle);
            const textAnchor = Math.abs(cos) < 0.15 ? 'middle' : cos > 0 ? 'start' : 'end';

            return (
              <g key={`spoke-${dim.key}`}>
                <line
                  x1={center}
                  y1={center}
                  x2={end.x}
                  y2={end.y}
                  stroke="var(--rule)"
                  strokeWidth="0.8"
                />
                {/* Horizontal, non-rotated labels */}
                <text
                  x={lbl.x}
                  y={lbl.y + 4}
                  textAnchor={textAnchor}
                  className="fill-[var(--ink)] font-disp font-bold text-[11px] uppercase tracking-wider cursor-pointer"
                  onMouseEnter={() => setHoveredMetric(dim.label)}
                  onMouseLeave={() => setHoveredMetric(null)}
                >
                  {dim.label}
                </text>
              </g>
            );
          })}

          {/* Radar Series Polygons (up to 3 players) */}
          {series.slice(0, 3).map((s, sIdx) => {
            const pal = SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
            const pts = dimensions.map((dim, i) => {
              const val = s.values?.[dim.key] ?? s.values?.[dim.label] ?? 50;
              return getCoordinates(i, val);
            });
            const polygonStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

            return (
              <g key={`series-${s.name || sIdx}`}>
                <polygon
                  points={polygonStr}
                  fill={pal.fill}
                  stroke={pal.stroke}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />

                {/* Vertex Dots & Percentile Numbers next to each vertex */}
                {pts.map((pt, i) => {
                  const val = Math.round(s.values?.[dimensions[i].key] ?? s.values?.[dimensions[i].label] ?? 50);
                  const angle = i * angleStep - Math.PI / 2;
                  const offsetX = Math.cos(angle) * 12;
                  const offsetY = Math.sin(angle) * 12;

                  return (
                    <g key={`pt-${sIdx}-${i}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={4}
                        fill={pal.dot}
                        stroke="var(--paper)"
                        strokeWidth={1.5}
                      />
                      {/* Percentile value displayed next to vertex */}
                      <text
                        x={pt.x + offsetX}
                        y={pt.y + offsetY + 3}
                        textAnchor="middle"
                        className="fill-[var(--ink)] font-mono text-[9px] font-bold"
                        style={{
                          paintOrder: 'stroke fill',
                          stroke: 'var(--paper)',
                          strokeWidth: '2.5px'
                        }}
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
