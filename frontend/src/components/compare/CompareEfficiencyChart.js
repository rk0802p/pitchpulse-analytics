import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatDecimal, formatGoalsMinusXG } from '../../utils/metricFormatters';

const EfficiencyTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const delta = row.hasXg ? formatGoalsMinusXG(row.delta) : null;

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-xs font-ser shadow-lg">
      <div className="font-disp font-bold text-sm text-[var(--ink)] border-b border-[var(--rule)] pb-1 mb-1">
        {row.fullName}
      </div>
      <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mute)]">Actual Goals:</span>
          <span className="font-bold text-[var(--ink)]">{row.goals}</span>
        </div>
        {row.hasXg && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--mute)]">Expected Goals (xG):</span>
              <span className="font-bold text-[var(--blue)]">{formatDecimal(row.xg, 1)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-[var(--rule)]">
              <span className="text-[var(--mute)]">Finishing (G − xG):</span>
              <span className={`font-bold ${delta.isOver ? 'text-[var(--blue)]' : delta.isUnder ? 'text-[var(--red)]' : 'text-[var(--ink)]'}`}>
                {delta.glyph} {delta.text}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const CompareEfficiencyChart = ({ players = [], activeSeason = '2024-2025' }) => {
  if (!players || players.length < 2) return null;

  const hasAnyXg = players.some((p) => p.xG !== null && p.xG !== undefined && Number.isFinite(Number(p.xG)));

  const chartData = players.map((p) => {
    const gls = Number(p.Gls) || 0;
    const validXg = p.xG !== null && p.xG !== undefined && Number.isFinite(Number(p.xG));
    const xg = validXg ? Number(p.xG) : null;
    const parts = String(p.Player || '').trim().split(/\s+/);
    const shortName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    return {
      shortName,
      fullName: p.Player,
      goals: gls,
      xg: validXg ? Number(xg.toFixed(1)) : 0,
      hasXg: validXg,
      delta: validXg ? Number((gls - xg).toFixed(2)) : null,
    };
  });

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-4 flex flex-col justify-between">
      <div className="border-b border-[var(--rule)] pb-2.5 flex items-baseline justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)] block">
            Finishing Conversion · Vol. {activeSeason}
          </span>
          <h3 className="font-disp font-extrabold text-xl text-[var(--ink)] leading-tight">
            {hasAnyXg ? 'Actual Goals vs. Expected Goals (xG)' : 'Goals Scored Comparison'}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 inline-block bg-[var(--ink)]" />
            <span>Goals</span>
          </span>
          {hasAnyXg && (
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 inline-block bg-[var(--blue)]" />
              <span>xG</span>
            </span>
          )}
        </div>
      </div>

      <div className="h-[240px] w-full mt-3" data-testid="compare-efficiency-chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }} barGap={4}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="shortName"
              tick={{ fill: 'var(--ink)', fontSize: 11, fontWeight: 600 }}
              axisLine={{ stroke: 'var(--ink)' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--mute)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<EfficiencyTooltip />} cursor={{ fill: 'var(--panel)', opacity: 0.6 }} />
            <Bar dataKey="goals" name="Goals" fill="var(--ink)" maxBarSize={32} isAnimationActive={false} />
            {hasAnyXg && (
              <Bar dataKey="xg" name="xG" fill="var(--blue)" fillOpacity={0.85} maxBarSize={32} isAnimationActive={false} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compact Finishing Delta Strip */}
      <div className={`grid gap-2 mt-3 pt-2.5 border-t border-[var(--rule)] ${
        players.length === 2 ? 'grid-cols-2' : players.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'
      }`}>
        {chartData.map((row) => {
          const deltaObj = row.hasXg ? formatGoalsMinusXG(row.delta) : null;
          return (
            <div key={row.fullName} className="bg-[var(--panel)] border border-[var(--rule)] px-2.5 py-1.5 text-center">
              <div className="text-[11px] font-semibold text-[var(--ink)] truncate">{row.shortName}</div>
              <div className={`font-mono text-xs font-bold tabular-nums mt-0.5 ${
                !deltaObj
                  ? 'text-[var(--mute)]'
                  : deltaObj.isOver
                    ? 'text-[var(--blue)]'
                    : deltaObj.isUnder
                      ? 'text-[var(--red)]'
                      : 'text-[var(--ink)]'
              }`}>
                {deltaObj ? `${deltaObj.glyph} ${deltaObj.text} G−xG` : `${row.goals} Gls`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompareEfficiencyChart;
