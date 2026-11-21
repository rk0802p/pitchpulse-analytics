import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { formatDecimal, formatGoalsMinusXG } from '../../utils/metricFormatters';

const ClubTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const c = payload[0]?.payload;
  if (!c) return null;
  const delta = c.finishing_delta !== null && c.finishing_delta !== undefined
    ? formatGoalsMinusXG(c.finishing_delta)
    : null;

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-xs font-ser shadow-lg max-w-[230px]">
      <div className="font-disp font-bold text-base text-[var(--ink)] leading-tight">
        {c.squad}
      </div>
      <div className="text-[11px] italic text-[var(--mute)] border-b border-[var(--rule)] pb-1 mb-1.5">
        {c.short_league} • Avg Age {c.avg_age ?? '—'} • {c.players_count} players
      </div>
      <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mute)]">Goals Scored:</span>
          <span className="font-bold text-[var(--ink)]">{c.goals}</span>
        </div>
        {c.xg !== null && c.xg !== undefined && (
          <>
            <div className="flex justify-between gap-4">
              <span className="text-[var(--mute)]">Expected Goals (xG):</span>
              <span className="font-bold text-[var(--blue)]">{formatDecimal(c.xg, 1)}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-[var(--rule)]">
              <span className="text-[var(--mute)]">Finishing (G − xG):</span>
              <span className={`font-bold ${delta?.isOver ? 'text-[var(--blue)]' : delta?.isUnder ? 'text-[var(--red)]' : 'text-[var(--ink)]'}`}>
                {delta ? `${delta.glyph} ${delta.text}` : '—'}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="mt-1.5 text-[10px] italic text-[var(--blue)]">
        Click dot to inspect club dossier &rarr;
      </div>
    </div>
  );
};

export const ClubEfficiencyScatter = ({
  clubs = [],
  activeSeason = '2024-2025',
  leagueLabel = 'Big 5 Leagues',
  onSelectClub,
}) => {
  if (!clubs || clubs.length === 0) return null;

  const xgClubs = clubs.filter((c) => c.xg !== null && c.xg !== undefined && Number.isFinite(Number(c.xg)));
  const hasXg = xgClubs.length >= 3;

  if (!hasXg) {
    // Graceful Pre-xG Era Fallback: Top 12 Clubs by Goals Scored
    const topClubs = [...clubs].sort((a, b) => b.goals - a.goals).slice(0, 12);
    return (
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-4">
        <div className="border-b border-[var(--rule)] pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)] block">
              Club Scoring Output · Vol. {activeSeason} (Pre-xG Era)
            </span>
            <h3 className="font-disp font-extrabold text-xl text-[var(--ink)]">
              Highest-Scoring Clubs — {leagueLabel}
            </h3>
          </div>
          <span className="text-[11px] italic text-[var(--mute)]">
            xG was not tracked in {activeSeason}; showing actual goals by club
          </span>
        </div>
        <div className="h-[240px] w-full mt-3" data-testid="club-efficiency-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topClubs} margin={{ top: 8, right: 12, left: -12, bottom: 28 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="var(--rule)" vertical={false} />
              <XAxis
                dataKey="squad"
                interval={0}
                angle={-22}
                textAnchor="end"
                height={48}
                tick={{ fill: 'var(--ink)', fontSize: 10 }}
              />
              <YAxis tick={{ fill: 'var(--mute)', fontSize: 11 }} allowDecimals={false} />
              <Tooltip content={<ClubTooltip />} cursor={{ fill: 'var(--panel)', opacity: 0.6 }} />
              <Bar
                dataKey="goals"
                fill="var(--ink)"
                maxBarSize={28}
                isAnimationActive={false}
                onClick={(entry) => entry?.squad && onSelectClub && onSelectClub(entry.squad)}
                style={{ cursor: 'pointer' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  const maxVal = Math.max(
    ...xgClubs.map((c) => Math.max(Number(c.xg) || 0, Number(c.goals) || 0))
  );
  const minVal = Math.min(
    ...xgClubs.map((c) => Math.min(Number(c.xg) || 0, Number(c.goals) || 0))
  );
  const domainMin = Math.max(0, Math.floor((minVal - 4) / 10) * 10);
  const domainMax = Math.ceil((maxVal + 5) / 10) * 10;

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-4">
      <div className="border-b border-[var(--rule)] pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)] block">
            Club Finishing Efficiency Matrix · Vol. {activeSeason}
          </span>
          <h3 className="font-disp font-extrabold text-xl text-[var(--ink)] leading-tight">
            Team Expected Goals (xG) vs. Actual Goals — {leagueLabel}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-[var(--blue)]" />
            <span>Overperforming xG</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-[var(--red)]" />
            <span>Underperforming xG</span>
          </span>
        </div>
      </div>

      <div className="h-[260px] w-full mt-2" data-testid="club-efficiency-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--rule)" />
            <XAxis
              type="number"
              dataKey="xg"
              name="Expected Goals"
              domain={[domainMin, domainMax]}
              tick={{ fill: 'var(--mute)', fontSize: 11 }}
              label={{
                value: 'Club Expected Goals (xG)',
                position: 'insideBottom',
                offset: -12,
                fill: 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <YAxis
              type="number"
              dataKey="goals"
              name="Actual Goals"
              domain={[domainMin, domainMax]}
              tick={{ fill: 'var(--mute)', fontSize: 11 }}
              label={{
                value: 'Actual Goals',
                angle: -90,
                position: 'insideLeft',
                offset: 14,
                fill: 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <ReferenceLine
              segment={[
                { x: domainMin, y: domainMin },
                { x: domainMax, y: domainMax },
              ]}
              stroke="var(--ink)"
              strokeDasharray="4 4"
              strokeOpacity={0.5}
            />
            <Tooltip content={<ClubTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={xgClubs}
              isAnimationActive={false}
              onClick={(entry) => {
                const squadName = entry?.squad || entry?.payload?.squad;
                if (squadName && onSelectClub) onSelectClub(squadName);
              }}
              style={{ cursor: 'pointer' }}
            >
              {xgClubs.map((c) => {
                const over = (Number(c.finishing_delta) || 0) >= 0;
                return (
                  <Cell
                    key={`${c.squad}-${c.comp}`}
                    fill={over ? 'var(--blue, #1d4ed8)' : 'var(--red, #c92a2a)'}
                    fillOpacity={0.82}
                    stroke="var(--paper)"
                    strokeWidth={1}
                  />
                );
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[11px] italic text-[var(--mute)] mt-1 flex items-center justify-between flex-wrap gap-2">
        <span>Clubs above the dashed diagonal convert above expected goals. Click any dot to open that club's squad dossier.</span>
        <span className="font-mono">{xgClubs.length} clubs plotted</span>
      </div>
    </div>
  );
};

export default ClubEfficiencyScatter;
