import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  LabelList,
} from 'recharts';
import { formatDecimal } from '../../utils/metricFormatters';

export const computeMedian = (values) => {
  const nums = (values || [])
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 1 ? nums[mid] : Number(((nums[mid - 1] + nums[mid]) / 2).toFixed(2));
};

const shortLastName = (fullName) => {
  if (!fullName) return '';
  const parts = String(fullName).trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

const MatrixTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  const combined = Number(p.xG || 0) + Number(p.xAG || 0);
  const delta = Number.isFinite(Number(p.Gls_minus_xG))
    ? Number(p.Gls_minus_xG)
    : Number.isFinite(Number(p.Gls)) && Number.isFinite(Number(p.xG))
    ? Number(p.Gls) - Number(p.xG)
    : null;

  return (
    <div
      className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5 shadow-md text-xs font-ser"
      style={{ minWidth: 215 }}
    >
      <div className="border-b border-[var(--rule)] pb-1.5 mb-1.5">
        <div className="font-disp font-extrabold text-sm text-[var(--ink)] leading-tight">
          {p.Player}
        </div>
        <div className="text-[11px] italic text-[var(--mute)]">
          {p.Squad} · {p.Pos || '—'} · {p.Comp ? p.Comp.replace(/^[a-z]{2}\s+/, '') : ''}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
        <span className="text-[var(--mute)]">Expected Goals</span>
        <span className="text-right font-bold text-[var(--ink)]">{formatDecimal(p.xG, 2)}</span>

        <span className="text-[var(--mute)]">Expected Assists</span>
        <span className="text-right font-bold text-[var(--ink)]">{formatDecimal(p.xAG, 2)}</span>

        <span className="text-[var(--mute)]">Combined (xG+xAG)</span>
        <span className="text-right font-bold text-[var(--blue)]">{combined.toFixed(2)}</span>

        <span className="text-[var(--mute)]">Actual G / A</span>
        <span className="text-right font-semibold text-[var(--ink)]">
          {p.Gls ?? '—'} / {p.Ast ?? '—'}
        </span>

        {delta !== null && (
          <>
            <span className="text-[var(--mute)]">Finishing (G − xG)</span>
            <span
              className={`text-right font-bold ${
                delta > 0.2 ? 'text-[var(--blue)]' : delta < -0.2 ? 'text-[var(--red)]' : 'text-[var(--ink)]'
              }`}
            >
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
            </span>
          </>
        )}
      </div>
      <div className="mt-1.5 pt-1 border-t border-[var(--rule)] text-[10px] italic text-[var(--mute)]">
        Click dot to open player dossier
      </div>
    </div>
  );
};

export const AttackingOutputMatrix = ({
  scatterData = [],
  scatterMedians = null,
  loading = false,
  onSelectPlayer,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const validPoints = useMemo(() => {
    if (!Array.isArray(scatterData)) return [];
    return scatterData
      .filter(
        (player) =>
          player &&
          player.xG != null &&
          player.xAG != null &&
          Number.isFinite(Number(player.xG)) &&
          Number.isFinite(Number(player.xAG))
      )
      .map((player, idx) => {
        const xAG = Number(player.xAG);
        const xG = Number(player.xG);
        return {
          ...player,
          _raw: player,
          _xAG: xAG,
          _xG: xG,
          _combined: Number((xG + xAG).toFixed(2)),
          _z: Math.max(90, Number(player.Min) || 900),
          _rank: idx,
          _shortLabel: shortLastName(player.Player),
        };
      });
  }, [scatterData]);

  const medianXag = useMemo(() => {
    if (scatterMedians && Number.isFinite(Number(scatterMedians.xAG))) {
      return Number(scatterMedians.xAG);
    }
    return computeMedian(validPoints.map((p) => p._xAG));
  }, [scatterMedians, validPoints]);

  const medianXg = useMemo(() => {
    if (scatterMedians && Number.isFinite(Number(scatterMedians.xG))) {
      return Number(scatterMedians.xG);
    }
    return computeMedian(validPoints.map((p) => p._xG));
  }, [scatterMedians, validPoints]);

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const decoratedPoints = useMemo(() => {
    return validPoints.map((p, idx) => {
      const isMatch =
        normalizedQuery.length > 0 &&
        (String(p.Player || '').toLowerCase().includes(normalizedQuery) ||
          String(p.Squad || '').toLowerCase().includes(normalizedQuery));
      const inTopRight = p._xAG >= medianXag && p._xG >= medianXg;
      const isScorer = p._xG >= medianXg && p._xAG < medianXag;
      const showLabel = isMatch || (!normalizedQuery && idx < 7);
      return {
        ...p,
        _isMatch: isMatch,
        _inTopRight: inTopRight,
        _isScorer: isScorer,
        _plotLabel: showLabel ? p._shortLabel : '',
      };
    });
  }, [validPoints, normalizedQuery, medianXag, medianXg]);

  const { maxX, maxY } = useMemo(() => {
    if (decoratedPoints.length === 0) return { maxX: 16, maxY: 24 };
    const topX = Math.max(...decoratedPoints.map((p) => p._xAG), medianXag, 1);
    const topY = Math.max(...decoratedPoints.map((p) => p._xG), medianXg, 1);
    return {
      maxX: Math.ceil((topX * 1.15) / 2) * 2,
      maxY: Math.ceil((topY * 1.15) / 2) * 2,
    };
  }, [decoratedPoints, medianXag, medianXg]);

  const matchCount = useMemo(
    () => (normalizedQuery ? decoratedPoints.filter((p) => p._isMatch).length : 0),
    [decoratedPoints, normalizedQuery]
  );

  // Accessible quick-jump list showing matching players or top 6 combined threat leaders
  const quickSelectPlayers = useMemo(() => {
    if (normalizedQuery) {
      return decoratedPoints.filter((p) => p._isMatch).slice(0, 6);
    }
    return decoratedPoints.slice(0, 6);
  }, [decoratedPoints, normalizedQuery]);

  return (
    <section
      aria-label="Attacking Output Matrix"
      className="border-t-2 border-[var(--ink)] pt-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
        <div>
          <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
            Interactive Recharts Coordinate Matrix · Cohort Medians
          </span>
          <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
            Attacking Output Matrix (xG vs xAG)
          </h3>
          <p className="text-xs italic text-[var(--mute)] mt-0.5">
            Shooting threat (Y-axis) plotted against expected assisted goals (X-axis) for top-output players (≥ 450 mins). Dashed crosshairs mark true cohort medians.
          </p>
        </div>

        <div className="w-full sm:w-64 shrink-0">
          <label htmlFor="overview-matrix-search" className="sr-only">
            Highlight player on attacking output matrix
          </label>
          <input
            id="overview-matrix-search"
            type="text"
            placeholder="Highlight player or club..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2.5 text-xs text-[var(--ink)] placeholder:italic focus:outline-none focus:ring-1 focus:ring-[var(--blue)]"
          />
          {normalizedQuery && (
            <div className="text-[11px] font-mono text-[var(--mute)] mt-1">
              {matchCount} {matchCount === 1 ? 'player' : 'players'} highlighted
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div
          className="h-[360px] border border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center"
          role="status"
          aria-label="Loading attacking output matrix"
        >
          <span className="font-mono text-xs text-[var(--mute)]">
            Computing xG / xAG cohort coordinates…
          </span>
        </div>
      ) : decoratedPoints.length === 0 ? (
        <div className="h-56 border border-dashed border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center px-6 text-center">
          <p className="text-sm italic text-[var(--mute)]" role="status">
            Expected-goal observations are not available for this season.
          </p>
        </div>
      ) : (
        <div className="border border-[var(--ink)] bg-[var(--paper)]">
          {/* Quadrant Guide Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-[var(--rule)] bg-[var(--panel)] text-[11px]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--blue)]" />
                Scores &amp; Creates (≥ Medians)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--mute)]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--red)]" />
                Primary Finishers (High xG)
              </span>
              <span className="inline-flex items-center gap-1.5 text-[var(--mute)]">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--ink)] opacity-65" />
                Creators / Supporting Volume
              </span>
            </div>
            <div className="font-mono tabular-nums text-[var(--ink)]">
              Median xAG: <strong>{medianXag.toFixed(1)}</strong> · Median xG:{' '}
              <strong>{medianXg.toFixed(1)}</strong>
            </div>
          </div>

          {/* Recharts Scatter Canvas */}
          <div className="w-full h-[360px] pt-3 pr-4 pb-2 pl-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={280}>
              <ScatterChart margin={{ top: 18, right: 26, bottom: 26, left: 10 }}>
                <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" strokeOpacity={0.75} />
                <XAxis
                  type="number"
                  dataKey="_xAG"
                  name="Expected Assisted Goals (xAG)"
                  domain={[0, maxX]}
                  tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: 'monospace' }}
                  stroke="var(--ink)"
                  label={{
                    value: 'Chance Creation Quality — Expected Assisted Goals (xAG)',
                    position: 'insideBottom',
                    offset: -14,
                    fill: 'var(--ink)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="_xG"
                  name="Expected Goals (xG)"
                  domain={[0, maxY]}
                  tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: 'monospace' }}
                  stroke="var(--ink)"
                  label={{
                    value: 'Shooting Threat — Expected Goals (xG)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 4,
                    style: { textAnchor: 'middle', fill: 'var(--ink)', fontSize: 11, fontWeight: 700 },
                  }}
                />
                <ZAxis type="number" dataKey="_z" range={[65, 220]} name="Minutes" />

                <ReferenceLine
                  x={medianXag}
                  stroke="var(--ink)"
                  strokeDasharray="5 4"
                  strokeOpacity={0.6}
                />
                <ReferenceLine
                  y={medianXg}
                  stroke="var(--ink)"
                  strokeDasharray="5 4"
                  strokeOpacity={0.6}
                />

                <Tooltip
                  cursor={{ stroke: 'var(--mute)', strokeDasharray: '3 3' }}
                  content={<MatrixTooltip />}
                />

                <Scatter
                  name="Attacking Cohort"
                  data={decoratedPoints}
                  isAnimationActive={false}
                  onClick={(node) => {
                    const target = node?._raw || node?.payload?._raw || node;
                    if (onSelectPlayer && target?.Player) {
                      onSelectPlayer(target);
                    }
                  }}
                >
                  {decoratedPoints.map((entry, idx) => {
                    let fill = 'var(--ink)';
                    if (entry._isMatch) fill = 'var(--accent)';
                    else if (entry._inTopRight) fill = 'var(--blue)';
                    else if (entry._isScorer) fill = 'var(--red)';

                    const dimmed = normalizedQuery.length > 0 && !entry._isMatch;
                    return (
                      <Cell
                        key={entry.id || `${entry.Player}-${idx}`}
                        fill={fill}
                        fillOpacity={dimmed ? 0.2 : entry._isMatch ? 1 : 0.85}
                        stroke={entry._isMatch ? 'var(--ink)' : 'var(--paper)'}
                        strokeWidth={entry._isMatch ? 2.2 : 1.2}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="_plotLabel"
                    position="top"
                    offset={8}
                    style={{
                      fill: 'var(--ink)',
                      stroke: 'none',
                      fontSize: 10.5,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontWeight: 600,
                      pointerEvents: 'none',
                    }}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible Quick-Select Strip for Top Threat / Search Matches */}
          {quickSelectPlayers.length > 0 && (
            <div className="border-t border-[var(--rule)] bg-[var(--panel)]/60 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-disp font-bold text-[10px] uppercase tracking-wider text-[var(--mute)] mr-1">
                  {normalizedQuery ? 'Matching Profiles:' : 'Top Combined Threat (xG + xAG):'}
                </span>
                {quickSelectPlayers.map((player, idx) => (
                  <button
                    key={player.id || idx}
                    type="button"
                    data-testid={`dashboard-scatter-point-${player.id || idx}`}
                    onClick={() => onSelectPlayer && onSelectPlayer(player._raw)}
                    className="inline-flex items-center gap-1.5 border border-[var(--rule)] bg-[var(--paper)] hover:border-[var(--ink)] hover:text-[var(--blue)] px-2 py-1 text-[11px] text-[var(--ink)] transition-colors cursor-pointer"
                  >
                    <span className="font-semibold">{player.Player}</span>
                    <span className="font-mono text-[10px] tabular-nums text-[var(--mute)]">
                      {formatDecimal(player.xG, 1)} xG · {formatDecimal(player.xAG, 1)} xAG
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs italic text-[var(--mute)] mt-1.5">
        <strong>Reading Guide:</strong> Players in the upper-right quadrant exceed cohort medians in both shooting volume (xG) and chance creation (xAG). Hover for full finishing splits or click any dot or profile chip to inspect their full dossier.
      </p>
    </section>
  );
};

export default AttackingOutputMatrix;
