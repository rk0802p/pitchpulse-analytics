import React from 'react';
import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from 'recharts';
import { formatDecimal } from '../../utils/metricFormatters';

export const COMPARE_PALETTE = [
  { stroke: 'var(--blue, #1d4ed8)', fill: 'var(--blue, #1d4ed8)', label: 'Series 1' },
  { stroke: 'var(--red, #c92a2a)', fill: 'var(--red, #c92a2a)', label: 'Series 2' },
  { stroke: 'var(--green, #15803d)', fill: 'var(--green, #15803d)', label: 'Series 3' },
  { stroke: 'var(--amber, #b45309)', fill: 'var(--amber, #b45309)', label: 'Series 4' },
];

const RadarTooltip = ({ active, payload, label, players, dimMap }) => {
  if (!active || !payload || payload.length === 0) return null;
  const dim = dimMap[label];
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-xs font-ser shadow-lg">
      <div className="font-disp font-bold text-sm text-[var(--ink)] border-b border-[var(--rule)] pb-1 mb-1.5">
        {label}
      </div>
      <div className="space-y-1">
        {players.map((p, idx) => {
          const idKey = String(p.id ?? idx);
          const pct = dim?.scores?.[idKey] ?? dim?.scores?.[p.comparison_key];
          const raw = dim?.values?.[idKey] ?? dim?.values?.[p.comparison_key];
          const pal = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
          return (
            <div key={idKey} className="flex items-center justify-between gap-4 font-mono text-[11px] tabular-nums">
              <span className="flex items-center gap-1.5 font-ser font-semibold text-[var(--ink)]">
                <span className="w-2 h-2 inline-block shrink-0" style={{ backgroundColor: pal.stroke }} />
                {p.Player}
              </span>
              <span className="text-[var(--ink)] font-bold">
                {pct !== null && pct !== undefined ? `${Math.round(pct)}th pct` : '—'}
                {raw !== null && raw !== undefined ? (
                  <span className="text-[var(--mute)] font-normal ml-1.5">
                    ({dim?.key?.includes('_90') ? formatDecimal(raw, 2) : formatDecimal(raw, 0)})
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CompareRadarChart = ({ players = [], radar = [], loading = false, activeSeason = '2024-2025' }) => {
  if (!players || players.length < 2) return null;

  const trackedDimensions = [];
  const excludedDimensions = [];

  (radar || []).forEach((dim) => {
    const allTracked = players.every((p) => {
      const idKey = String(p.id);
      const trackedFlag = dim.is_tracked?.[idKey] ?? dim.is_tracked?.[p.comparison_key];
      const score = dim.scores?.[idKey] ?? dim.scores?.[p.comparison_key];
      return trackedFlag !== false && score !== null && score !== undefined && Number.isFinite(Number(score));
    });
    if (allTracked) {
      trackedDimensions.push(dim);
    } else {
      excludedDimensions.push(dim.dimension);
    }
  });

  const dimMap = {};
  trackedDimensions.forEach((d) => {
    dimMap[d.dimension] = d;
  });

  const chartData = trackedDimensions.map((dim) => {
    const row = { dimension: dim.dimension };
    players.forEach((p, idx) => {
      const idKey = String(p.id ?? idx);
      const score = dim.scores?.[idKey] ?? dim.scores?.[p.comparison_key];
      row[`p_${idx}`] = Number.isFinite(Number(score)) ? Number(score) : 0;
    });
    return row;
  });

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-4 flex flex-col justify-between">
      <div className="border-b border-[var(--rule)] pb-2.5 flex flex-col gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)] block">
            Positional Percentile Radar · Vol. {activeSeason}
          </span>
          <h3 className="font-disp font-extrabold text-xl text-[var(--ink)] leading-tight">
            Multi-Player Scouting Profile
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {players.map((p, idx) => {
            const pal = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
            return (
              <span key={p.id || p.Player || idx} className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <span className="w-2.5 h-2.5 inline-block border border-[var(--ink)]" style={{ backgroundColor: pal.stroke }} />
                <span>{p.Player}</span>
              </span>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-[300px] flex items-center justify-center text-xs font-mono text-[var(--mute)] animate-pulse">
          Computing positional peer percentiles...
        </div>
      ) : trackedDimensions.length >= 3 ? (
        <div className="h-[300px] w-full mt-2" data-testid="compare-radar-chart">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart cx="50%" cy="50%" outerRadius="72%" data={chartData}>
              <PolarGrid stroke="var(--rule)" strokeDasharray="2 2" />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{ fill: 'var(--ink)', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tickCount={5}
                tick={{ fill: 'var(--mute)', fontSize: 9 }}
                axisLine={false}
              />
              <Tooltip content={<RadarTooltip players={players} dimMap={dimMap} />} />
              {players.map((p, idx) => {
                const pal = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
                return (
                  <Radar
                    key={p.id || p.Player || idx}
                    name={p.Player}
                    dataKey={`p_${idx}`}
                    stroke={pal.stroke}
                    fill={pal.fill}
                    fillOpacity={0.16}
                    strokeWidth={2}
                    dot={{ r: 3, fill: pal.stroke }}
                    isAnimationActive={false}
                  />
                );
              })}
            </RechartsRadarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="py-8 space-y-3" data-testid="compare-radar-fallback">
          <p className="text-xs italic text-[var(--mute)]">
            Fewer than three tracked radar dimensions exist in Vol. {activeSeason} (pre-xG / limited tracking archive). Showing tracked positional percentiles directly:
          </p>
          <div className="space-y-3">
            {trackedDimensions.map((dim) => (
              <div key={dim.key} className="space-y-1">
                <div className="text-xs font-bold text-[var(--ink)]">{dim.dimension}</div>
                {players.map((p, idx) => {
                  const idKey = String(p.id ?? idx);
                  const pct = dim.scores?.[idKey] ?? dim.scores?.[p.comparison_key] ?? 0;
                  const pal = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
                  return (
                    <div key={idKey} className="flex items-center gap-2 text-[11px] font-mono tabular-nums">
                      <span className="w-28 truncate text-[var(--ink)]">{p.Player}</span>
                      <div className="flex-1 h-2 bg-[var(--panel)] border border-[var(--rule)]">
                        <div className="h-full" style={{ width: `${pct}%`, backgroundColor: pal.stroke }} />
                      </div>
                      <span className="w-10 text-right font-bold">{Math.round(pct)}th</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {excludedDimensions.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)]">
          Untracked in Vol. {activeSeason} (omitted rather than imputed): {excludedDimensions.join(', ')}.
        </div>
      )}
    </div>
  );
};

export default CompareRadarChart;
