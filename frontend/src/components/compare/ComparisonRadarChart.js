import React, { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

const PLAYER_COLORS = [
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.22)', dot: 'bg-emerald-500', text: 'text-emerald-400' },
  { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.22)', dot: 'bg-cyan-500', text: 'text-cyan-400' },
  { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.22)', dot: 'bg-rose-500', text: 'text-rose-400' },
  { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.22)', dot: 'bg-amber-500', text: 'text-amber-400' },
  { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.22)', dot: 'bg-purple-500', text: 'text-purple-400' }
];

export const ComparisonRadarChart = ({
  radarData = [],
  players = []
}) => {
  const [hoveredVertex, setHoveredVertex] = useState(null);

  if (!radarData || radarData.length === 0 || !players || players.length === 0) {
    return null;
  }

  // SVG Geometry
  const size = 440;
  const center = size / 2;
  const radius = 135;
  const numAxes = radarData.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Concentric web levels (20%, 40%, 60%, 80%, 100%)
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (angle, dist) => {
    // Offset by -PI/2 so first axis points directly up
    const rad = angle - Math.PI / 2;
    return {
      x: center + dist * Math.cos(rad),
      y: center + dist * Math.sin(rad)
    };
  };

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm flex flex-col items-center">
      {/* Chart Header */}
      <div className="w-full flex items-center justify-between mb-2 pb-3 border-b border-pitch-border">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="font-bold text-white text-sm">Head-to-Head Scouting Radar</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          <span>Percentiles vs European Peers (Min 270m)</span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full overflow-visible select-none"
        >
          {/* Background Concentric Polygon Rings */}
          {levels.map((lvl) => {
            const points = radarData.map((_, i) => {
              const { x, y } = getCoordinates(i * angleStep, radius * lvl);
              return `${x},${y}`;
            }).join(' ');

            return (
              <g key={`ring-${lvl}`}>
                <polygon
                  points={points}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray={lvl === 1.0 ? 'none' : '3 3'}
                  opacity={lvl === 1.0 ? 0.7 : 0.4}
                />
                {/* Level label on top axis */}
                <text
                  x={center + 4}
                  y={center - radius * lvl + 10}
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {Math.round(lvl * 100)}%
                </text>
              </g>
            );
          })}

          {/* Radial Spokes from Center to Outer Rim */}
          {radarData.map((dim, i) => {
            const { x, y } = getCoordinates(i * angleStep, radius);
            const labelCoord = getCoordinates(i * angleStep, radius + 28);
            
            // Text anchor calculation based on position
            const rad = i * angleStep - Math.PI / 2;
            const cos = Math.cos(rad);
            let textAnchor = 'middle';
            if (cos > 0.25) textAnchor = 'start';
            else if (cos < -0.25) textAnchor = 'end';

            return (
              <g key={`axis-${dim.key}`}>
                <line
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <text
                  x={labelCoord.x}
                  y={labelCoord.y + (Math.sin(rad) > 0.4 ? 4 : -2)}
                  textAnchor={textAnchor}
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="sans-serif"
                  className="tracking-tight"
                >
                  {dim.dimension}
                </text>
              </g>
            );
          })}

          {/* Player Radar Polygons */}
          {players.map((p, pIdx) => {
            const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
            const pKey = p.comparison_key || String(p.id);
            const pIdStr = String(p.id);

            const polygonPoints = radarData.map((dim, i) => {
              const isTracked = dim.is_tracked?.[pKey] ?? dim.is_tracked?.[pIdStr] ?? (dim.values?.[pKey] !== null && dim.values?.[pKey] !== undefined);
              const score = isTracked ? (dim.scores?.[pKey] ?? dim.scores?.[pIdStr] ?? 0) : 0;
              const clampedDist = isTracked ? ((Math.max(6, Math.min(100, score)) / 100) * radius) : (radius * 0.04);
              const { x, y } = getCoordinates(i * angleStep, clampedDist);
              return `${x},${y}`;
            }).join(' ');

            return (
              <g key={`polygon-${pKey}`}>
                <polygon
                  points={polygonPoints}
                  fill={color.fill}
                  stroke={color.stroke}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />

                {/* Vertex Dots */}
                {radarData.map((dim, i) => {
                  const isTracked = dim.is_tracked?.[pKey] ?? dim.is_tracked?.[pIdStr] ?? (dim.values?.[pKey] !== null && dim.values?.[pKey] !== undefined);
                  const score = isTracked ? (dim.scores?.[pKey] ?? dim.scores?.[pIdStr]) : null;
                  const rawVal = isTracked ? (dim.values?.[pKey] ?? dim.values?.[pIdStr] ?? 0) : 'Untracked';
                  const clampedDist = isTracked ? ((Math.max(6, Math.min(100, score ?? 0)) / 100) * radius) : (radius * 0.04);
                  const { x, y } = getCoordinates(i * angleStep, clampedDist);

                  return (
                    <circle
                      key={`vertex-${pKey}-${dim.key}`}
                      cx={x}
                      cy={y}
                      r={isTracked ? 4.5 : 3.5}
                      fill={isTracked ? color.stroke : '#334155'}
                      stroke={isTracked ? '#0f172a' : '#64748b'}
                      strokeWidth="1.5"
                      className="cursor-pointer transition-transform hover:scale-150"
                      onMouseEnter={() => setHoveredVertex({
                        player: p.Player,
                        dimension: dim.dimension,
                        rawVal,
                        score: score !== null && score !== undefined ? `${score}th percentile` : 'Untracked in this era',
                        isTracked,
                        color: isTracked ? color.stroke : '#64748b'
                      })}
                      onMouseLeave={() => setHoveredVertex(null)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredVertex && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-pitch-border rounded-lg px-3 py-1.5 shadow-xl pointer-events-none text-center">
            <div className="flex items-center gap-1.5 justify-center mb-0.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: hoveredVertex.color }}></span>
              <span className="text-xs font-bold text-white">{hoveredVertex.player}</span>
            </div>
            <div className="text-[11px] text-slate-300 font-mono">
              {hoveredVertex.dimension}: <strong className="text-emerald-400">{hoveredVertex.rawVal}</strong> ({hoveredVertex.score})
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-3 border-t border-pitch-border/60 w-full">
        {players.map((p, pIdx) => {
          const color = PLAYER_COLORS[pIdx % PLAYER_COLORS.length];
          return (
            <div key={p.comparison_key || p.id} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${color.dot} shadow-xs`}></span>
              <span className="text-xs font-semibold text-slate-200">{p.Player}</span>
              <span className="text-[10px] text-slate-400 font-mono">({p.Squad}{p.season ? ` · ${p.season}` : ''})</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ComparisonRadarChart;
