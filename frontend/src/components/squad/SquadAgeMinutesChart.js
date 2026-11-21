import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  Cell,
} from 'recharts';
import { formatMinutes } from '../../utils/metricFormatters';

const POS_COLORS = {
  FW: { color: 'var(--red, #c92a2a)', label: 'Forwards (FW)' },
  MF: { color: 'var(--blue, #1d4ed8)', label: 'Midfielders (MF)' },
  DF: { color: 'var(--ink, #141414)', label: 'Defenders (DF)' },
  GK: { color: 'var(--green, #15803d)', label: 'Goalkeepers (GK)' },
};

const getPrimaryPos = (posStr) => {
  const s = String(posStr || '').toUpperCase();
  if (s.includes('GK')) return 'GK';
  if (s.includes('DF')) return 'DF';
  if (s.includes('MF')) return 'MF';
  return 'FW';
};

const SquadAgeTooltip = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0]?.payload;
  if (!p) return null;

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2 text-xs font-ser shadow-lg">
      <div className="font-disp font-bold text-sm text-[var(--ink)]">{p.Player}</div>
      <div className="text-[11px] font-mono text-[var(--mute)] border-b border-[var(--rule)] pb-1 mb-1">
        {p.Pos} • Age {p.Age}
      </div>
      <div className="space-y-0.5 font-mono text-[11px] tabular-nums">
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mute)]">Minutes:</span>
          <span className="font-bold text-[var(--ink)]">{formatMinutes(p.Min)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[var(--mute)]">Output:</span>
          <span className="font-bold text-[var(--ink)]">{p.Gls ?? 0} Gls • {p.Ast ?? 0} Ast</span>
        </div>
      </div>
    </div>
  );
};

export const SquadAgeMinutesChart = ({
  roster = [],
  clubName = '',
  weightedAvgAge = null,
  onSelectPlayer,
}) => {
  const points = (roster || [])
    .filter((p) => Number.isFinite(Number(p.Age)) && Number(p.Age) > 14 && Number.isFinite(Number(p.Min)))
    .map((p) => ({
      ...p,
      ageNum: Number(p.Age),
      minNum: Number(p.Min) || 0,
      posGroup: getPrimaryPos(p.Pos),
    }));

  if (points.length === 0) return null;

  const minAge = Math.max(16, Math.floor(Math.min(...points.map((p) => p.ageNum)) - 1));
  const maxAge = Math.min(43, Math.ceil(Math.max(...points.map((p) => p.ageNum)) + 1));

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-4">
      <div className="border-b border-[var(--rule)] pb-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)] block">
            Squad Age Profile &amp; Playing-Time Distribution
          </span>
          <h3 className="font-disp font-extrabold text-xl text-[var(--ink)] leading-tight">
            {clubName} — Age vs. Minutes Played
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          {Object.entries(POS_COLORS).map(([key, info]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: info.color }} />
              <span>{key}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="h-[235px] w-full mt-2" data-testid="squad-age-minutes-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 20, left: 4 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="var(--rule)" />
            <ReferenceArea
              x1={24}
              x2={28}
              fill="var(--blue, #1d4ed8)"
              fillOpacity={0.07}
              label={{
                value: 'Prime (24–28)',
                position: 'insideTop',
                fill: 'var(--mute)',
                fontSize: 10,
              }}
            />
            {weightedAvgAge && (
              <ReferenceLine
                x={weightedAvgAge}
                stroke="var(--ink)"
                strokeDasharray="4 4"
                label={{
                  value: `Avg ${weightedAvgAge}`,
                  position: 'insideBottomRight',
                  fill: 'var(--ink)',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
            <XAxis
              type="number"
              dataKey="ageNum"
              name="Age"
              domain={[minAge, maxAge]}
              allowDecimals={false}
              tick={{ fill: 'var(--mute)', fontSize: 11 }}
              label={{
                value: 'Player Age (Years)',
                position: 'insideBottom',
                offset: -12,
                fill: 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <YAxis
              type="number"
              dataKey="minNum"
              name="Minutes"
              tick={{ fill: 'var(--mute)', fontSize: 11 }}
              label={{
                value: 'Minutes Played',
                angle: -90,
                position: 'insideLeft',
                offset: 6,
                fill: 'var(--ink)',
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Tooltip content={<SquadAgeTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              data={points}
              isAnimationActive={false}
              onClick={(entry) => {
                const target = entry?.payload || entry;
                if (target?.Player && onSelectPlayer) onSelectPlayer(target);
              }}
              style={{ cursor: 'pointer' }}
            >
              {points.map((pt) => (
                <Cell
                  key={pt.id || pt.Player}
                  fill={POS_COLORS[pt.posGroup]?.color || 'var(--ink)'}
                  fillOpacity={0.85}
                  stroke="var(--paper)"
                  strokeWidth={1}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[11px] italic text-[var(--mute)] mt-1 flex items-center justify-between flex-wrap gap-2">
        <span>Shaded band indicates prime age window (24–28). Click any dot to open the player's dossier.</span>
        {weightedAvgAge && (
          <span className="font-mono text-[var(--ink)] font-semibold">
            Minutes-weighted avg age: {weightedAvgAge} yrs
          </span>
        )}
      </div>
    </div>
  );
};

export default SquadAgeMinutesChart;
