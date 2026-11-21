import React, { useState } from 'react';

const SERIES_PALETTE = [
  { stroke: 'var(--blue, #1d4ed8)', fill: 'rgba(29, 78, 216, 0.16)', dot: '#1d4ed8', name: 'Primary' },
  { stroke: 'var(--signal, #c92a2a)', fill: 'rgba(201, 42, 42, 0.16)', dot: '#c92a2a', name: 'Comparison 1' },
  { stroke: '#15803d', fill: 'rgba(21, 128, 61, 0.16)', dot: '#15803d', name: 'Comparison 2' }
];

const readNumericPct = (seriesItem, dim) => {
  const raw = seriesItem?.values?.[dim.key] ?? seriesItem?.values?.[dim.label];
  if (raw === null || raw === undefined || raw === '') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? Math.max(0, Math.min(100, num)) : null;
};

export default function RadarChart({
  dimensions = [
    { key: 'goals_per_90', label: 'Goals/90', group: 'Scoring' },
    { key: 'xg_per_90', label: 'xG/90', group: 'Scoring' },
    { key: 'assists_per_90', label: 'Assists/90', group: 'Creating' },
    { key: 'xag_per_90', label: 'xAG/90', group: 'Creating' },
    { key: 'prgc_per_90', label: 'Carries/90', group: 'Progressing' },
    { key: 'prgp_per_90', label: 'Passes/90', group: 'Progressing' }
  ],
  series = [],
  size = 460,
  title = 'Scouting Radar Profile',
  subtitle = 'Percentiles relative to positional peers (min 270 mins)'
}) {
  const [hoveredMetric, setHoveredMetric] = useState(null);

  // Filter out untracked dimensions rather than imputing a fake 50th percentile
  const activeSeries = series.slice(0, 3);
  const trackedDimensions = dimensions.filter((dim) =>
    activeSeries.some((s) => readNumericPct(s, dim) !== null)
  );
  const omittedDimensions = dimensions.filter(
    (dim) => !trackedDimensions.some((t) => t.key === dim.key)
  );

  const center = size / 2;
  const radius = size * 0.32;
  const n = trackedDimensions.length;
  const angleStep = n > 0 ? (2 * Math.PI) / n : 0;
  const levels = [25, 50, 75, 100];

  const getCoordinates = (index, pct) => {
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

        {/* Series Legend */}
        {activeSeries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {activeSeries.map((s, idx) => {
              const pal = SERIES_PALETTE[idx % SERIES_PALETTE.length];
              return (
                <div key={s.name || idx} className="flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                  <span
                    className="w-3 h-3 rounded-full border"
                    style={{ borderColor: pal.stroke, backgroundColor: pal.fill }}
                  />
                  <span>{s.name}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {trackedDimensions.length === 0 ? (
        <div className="py-12 px-4 text-center border border-dashed border-[var(--rule)] text-xs italic text-[var(--mute)]">
          Insufficient tracked percentile metrics in this season to plot a scouting radar (minimum 270 minutes and tracked rate metrics required).
        </div>
      ) : trackedDimensions.length < 3 ? (
        /* Honest horizontal percentile bars when fewer than 3 axes exist (e.g., Pre-xG seasons) */
        <div className="space-y-3 py-3">
          {trackedDimensions.map((dim) => (
            <div key={dim.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold uppercase text-[var(--ink)]">{dim.label}</span>
              </div>
              {activeSeries.map((s, sIdx) => {
                const val = readNumericPct(s, dim);
                const pal = SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
                return (
                  <div key={`${dim.key}-${s.name || sIdx}`} className="flex items-center gap-2 text-xs font-mono">
                    <div className="flex-1 h-2.5 bg-[var(--panel)] border border-[var(--rule)] overflow-hidden">
                      {val !== null && (
                        <div
                          className="h-full"
                          style={{ width: `${val}%`, backgroundColor: pal.dot }}
                        />
                      )}
                    </div>
                    <span className="w-10 text-right font-bold tabular-nums text-[var(--ink)]">
                      {val !== null ? `${Math.round(val)}%` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="relative w-full max-w-[460px] mx-auto aspect-square flex items-center justify-center select-none">
          <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible" role="img" aria-label={title}>
            {/* Concentric rings at 25, 50, 75, 100 */}
            {levels.map((lvl) => {
              const polygonPoints = trackedDimensions
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
            {trackedDimensions.map((dim, i) => {
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
                  <text
                    x={lbl.x}
                    y={lbl.y + 4}
                    textAnchor={textAnchor}
                    className={`fill-[var(--ink)] font-disp font-bold text-[11px] uppercase tracking-wider cursor-pointer ${
                      hoveredMetric === dim.label ? 'underline' : ''
                    }`}
                    onMouseEnter={() => setHoveredMetric(dim.label)}
                    onMouseLeave={() => setHoveredMetric(null)}
                  >
                    {dim.label}
                  </text>
                </g>
              );
            })}

            {/* Radar Series Polygons (only plotting series with valid values on all tracked axes) */}
            {activeSeries.map((s, sIdx) => {
              const pal = SERIES_PALETTE[sIdx % SERIES_PALETTE.length];
              const vals = trackedDimensions.map((dim) => readNumericPct(s, dim));
              const allTrackedPresent = vals.every((v) => v !== null);
              const pts = vals.map((val, i) => (val !== null ? getCoordinates(i, val) : null));
              const polygonStr = allTrackedPresent
                ? pts.map((p) => `${p.x},${p.y}`).join(' ')
                : null;

              return (
                <g key={`series-${s.name || sIdx}`}>
                  {polygonStr && (
                    <polygon
                      points={polygonStr}
                      fill={pal.fill}
                      stroke={pal.stroke}
                      strokeWidth={2}
                      strokeLinejoin="round"
                    />
                  )}

                  {pts.map((pt, i) => {
                    if (!pt || vals[i] === null) return null;
                    const val = Math.round(vals[i]);
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
      )}

      {omittedDimensions.length > 0 && (
        <div className="pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)]">
          Untracked in this season (omitted rather than estimated):{' '}
          {omittedDimensions.map((d) => d.label).join(', ')}.
        </div>
      )}
    </div>
  );
}
