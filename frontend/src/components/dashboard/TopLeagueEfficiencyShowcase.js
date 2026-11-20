import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ArrowRight } from 'lucide-react';
import { formatNumber } from '../../utils/metricFormatters';

const formatXg = (val) => {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const EfficiencyTooltip = ({ active, payload, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const title = mode === 'leagues' ? row.name : row.squad;
  const subtitle =
    mode === 'leagues'
      ? `${row.clubs_count} clubs · ${formatNumber(row.players_count)} players`
      : `${row.competition_name} · ${row.players_count} players`;

  const hasXg = row.xg !== null && row.xg !== undefined && Number.isFinite(Number(row.xg));
  const delta = hasXg ? Number(row.finishing_delta) : null;

  return (
    <div
      className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3 py-2.5 shadow-md text-xs font-ser"
      style={{ minWidth: 210 }}
    >
      <div className="border-b border-[var(--rule)] pb-1.5 mb-1.5">
        <div className="font-disp font-extrabold text-sm text-[var(--ink)]">{title}</div>
        <div className="text-[11px] italic text-[var(--mute)]">{subtitle}</div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
        <span className="text-[var(--mute)]">Goals Scored</span>
        <span className="text-right font-bold text-[var(--ink)]">{formatNumber(row.goals)}</span>

        <span className="text-[var(--mute)]">Expected Goals</span>
        <span className="text-right font-bold text-[var(--blue)]">
          {hasXg ? formatXg(row.xg) : 'Untracked'}
        </span>

        {hasXg && (
          <>
            <span className="text-[var(--mute)]">Delta (G − xG)</span>
            <span
              className={`text-right font-bold ${
                delta > 0 ? 'text-[var(--blue)]' : delta < 0 ? 'text-[var(--red)]' : 'text-[var(--ink)]'
              }`}
            >
              {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
            </span>

            <span className="text-[var(--mute)]">Conversion</span>
            <span className="text-right font-semibold text-[var(--ink)]">
              {row.conversion_pct != null ? `${Number(row.conversion_pct).toFixed(1)}%` : '—'}
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export const TopLeagueEfficiencyShowcase = ({
  leagueEfficiency = [],
  clubEfficiency = [],
  hasXg = true,
  activeSeason = '2024-2025',
  selectedComp = '',
  loading = false,
  onSelectComp,
  onSelectTeam,
  onSelectPlayer,
  onNavigate,
}) => {
  const [viewMode, setViewMode] = useState(selectedComp ? 'clubs' : 'leagues');

  useEffect(() => {
    setViewMode(selectedComp ? 'clubs' : 'leagues');
  }, [selectedComp]);

  const safeLeagues = useMemo(
    () => (Array.isArray(leagueEfficiency) ? leagueEfficiency : []),
    [leagueEfficiency]
  );
  const safeClubs = useMemo(
    () => (Array.isArray(clubEfficiency) ? clubEfficiency : []),
    [clubEfficiency]
  );

  const activeRows = viewMode === 'leagues' ? safeLeagues : safeClubs;
  const chartHasXg = useMemo(
    () => hasXg && activeRows.some((r) => r.xg !== null && r.xg !== undefined && Number.isFinite(Number(r.xg))),
    [hasXg, activeRows]
  );

  const chartData = useMemo(() => {
    return activeRows.map((row) => ({
      ...row,
      _label:
        viewMode === 'leagues'
          ? row.short_name || row.name
          : row.squad?.length > 13
          ? `${row.squad.slice(0, 12)}…`
          : row.squad,
    }));
  }, [activeRows, viewMode]);

  const anySharedXgExcluded = useMemo(
    () => viewMode === 'clubs' && safeClubs.some((c) => (c.shared_xg_excluded_count || 0) > 0),
    [viewMode, safeClubs]
  );

  const formatSeason = activeSeason.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  const compLabel = selectedComp ? selectedComp.replace(/^[a-z]{2}\s+/, '') : 'European Big 5';

  return (
    <section
      aria-label="Top-League Efficiency Showcase"
      className="border-t-2 border-[var(--ink)] pt-4"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-4">
        <div>
          <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
            Live Season Conversion Benchmark · Vol. {formatSeason}
          </span>
          <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
            Top-League Efficiency Showcase
          </h3>
          <p className="text-xs italic text-[var(--mute)] mt-0.5">
            {viewMode === 'leagues'
              ? `Actual goals scored versus model expected goals across Europe's five top divisions. Click any division to scope the ledger.`
              : `Highest-scoring clubs in ${compLabel} compared against aggregate chance quality. Click any club to inspect its full squad.`}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <div
            role="group"
            aria-label="Efficiency showcase granularity"
            className="flex items-center border border-[var(--ink)] p-0.5 bg-[var(--paper)]"
          >
            <button
              type="button"
              onClick={() => setViewMode('leagues')}
              className={`px-3 py-1 text-xs font-disp font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                viewMode === 'leagues'
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              Big 5 Leagues
            </button>
            <button
              type="button"
              onClick={() => setViewMode('clubs')}
              className={`px-3 py-1 text-xs font-disp font-bold uppercase tracking-wide transition-colors cursor-pointer ${
                viewMode === 'clubs'
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              Top Clubs ({safeClubs.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="grid grid-cols-1 xl:grid-cols-12 gap-6"
          role="status"
          aria-label="Loading league efficiency showcase"
        >
          <div className="xl:col-span-5 h-[290px] border border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center">
            <span className="font-mono text-xs text-[var(--mute)]">Aggregating league efficiency…</span>
          </div>
          <div className="xl:col-span-7 h-[290px] border border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center">
            <span className="font-mono text-xs text-[var(--mute)]">Compiling conversion ledger…</span>
          </div>
        </div>
      ) : activeRows.length === 0 ? (
        <div className="border border-dashed border-[var(--rule)] bg-[var(--panel)] p-8 text-center text-xs italic text-[var(--mute)]">
          No aggregate efficiency records are available for this selection.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
          {/* Left: Recharts Goals vs xG Grouped Bar Chart */}
          <div className="xl:col-span-5 border border-[var(--rule)] bg-[var(--paper)] p-3.5 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-2 mb-3">
              <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--ink)]">
                {chartHasXg ? 'Goals vs. Expected Goals (xG)' : 'Total Goals Scored (Pre-xG Era)'}
              </span>
              <div className="flex items-center gap-3 text-[11px] font-mono text-[var(--mute)]">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-2.5 h-2.5 bg-[var(--ink)]" />
                  Goals
                </span>
                {chartHasXg ? (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 bg-[var(--blue)]" />
                    xG
                  </span>
                ) : (
                  <span className="italic">xG untracked</span>
                )}
              </div>
            </div>

            <div className="w-full h-[270px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={240}>
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 12, bottom: viewMode === 'clubs' ? 24 : 14, left: 0 }}
                  barGap={3}
                >
                  <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="_label"
                    tick={{ fill: 'var(--ink)', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="var(--ink)"
                    interval={0}
                    angle={viewMode === 'clubs' ? -24 : 0}
                    textAnchor={viewMode === 'clubs' ? 'end' : 'middle'}
                    height={viewMode === 'clubs' ? 54 : 26}
                  />
                  <YAxis
                    tick={{ fill: 'var(--mute)', fontSize: 10, fontFamily: 'monospace' }}
                    stroke="var(--ink)"
                    width={42}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--panel)', opacity: 0.7 }}
                    content={<EfficiencyTooltip mode={viewMode} />}
                  />
                  <Bar
                    dataKey="goals"
                    name="Goals"
                    fill="var(--ink)"
                    isAnimationActive={false}
                    radius={[1, 1, 0, 0]}
                  />
                  {chartHasXg && (
                    <Bar
                      dataKey="xg"
                      name="Expected Goals (xG)"
                      fill="var(--blue)"
                      isAnimationActive={false}
                      radius={[1, 1, 0, 0]}
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 pt-2 border-t border-[var(--rule)] flex items-center justify-between text-[11px] italic text-[var(--mute)]">
              <span>
                {!chartHasXg
                  ? 'Pre-xG archive · Expected-goal models begin in 2014/15'
                  : viewMode === 'leagues'
                  ? 'Transfer-deduplicated league totals'
                  : 'Ranked by total goals in active scope'}
              </span>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('browse')}
                  className="not-italic font-disp font-bold uppercase text-[var(--blue)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Squad Browser</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Right: Authoritative Tabular Efficiency Ledger */}
          <div className="xl:col-span-7 border border-[var(--rule)] bg-[var(--paper)] flex flex-col justify-between overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-xs font-ser">
                <thead>
                  <tr className="border-b-2 border-[var(--ink)] bg-[var(--panel)]">
                    <th className="text-left py-2.5 px-3 font-disp font-bold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                      {viewMode === 'leagues' ? 'Division' : 'Club'}
                    </th>
                    <th className="text-right py-2.5 px-2 font-disp font-bold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                      Goals
                    </th>
                    <th className="text-right py-2.5 px-2 font-disp font-bold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                      xG
                    </th>
                    <th className="text-right py-2.5 px-2 font-disp font-bold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                      G − xG
                    </th>
                    <th className="text-right py-2.5 px-2 font-disp font-bold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                      Conv.
                    </th>
                    <th className="text-left py-2.5 px-3 font-disp font-bold uppercase tracking-wider text-[11px] text-[var(--ink)]">
                      Top Scorer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeRows.map((row, idx) => {
                    const rowHasXg = row.xg !== null && row.xg !== undefined && Number.isFinite(Number(row.xg));
                    const delta = rowHasXg ? Number(row.finishing_delta) : null;
                    const isSelectedLeague =
                      viewMode === 'leagues' && selectedComp && row.raw_name === selectedComp;

                    return (
                      <tr
                        key={viewMode === 'leagues' ? row.id || idx : `${row.squad}-${idx}`}
                        className={`border-b border-[var(--rule)] last:border-b-0 transition-colors ${
                          isSelectedLeague ? 'bg-[var(--panel)]' : 'hover:bg-[var(--panel)]/60'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          {viewMode === 'leagues' ? (
                            <button
                              type="button"
                              onClick={() =>
                                onSelectComp &&
                                onSelectComp(isSelectedLeague ? '' : row.raw_name)
                              }
                              className="text-left group cursor-pointer"
                            >
                              <div className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] group-hover:underline">
                                {row.name}
                              </div>
                              <div className="text-[10px] font-mono text-[var(--mute)]">
                                {row.clubs_count} clubs · {row.goals_per_club} G/club
                              </div>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectTeam && onSelectTeam(row.squad)}
                              className="text-left group cursor-pointer"
                            >
                              <div className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] group-hover:underline">
                                {row.squad}
                              </div>
                              <div className="text-[10px] font-mono text-[var(--mute)]">
                                {row.short_league}
                              </div>
                            </button>
                          )}
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono font-bold tabular-nums text-[var(--ink)]">
                          {formatNumber(row.goals)}
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[var(--mute)]">
                          {rowHasXg ? formatXg(row.xg) : '—'}
                        </td>

                        <td
                          className={`py-2.5 px-2 text-right font-mono font-bold tabular-nums ${
                            delta === null
                              ? 'text-[var(--mute)]'
                              : delta > 0
                              ? 'text-[var(--blue)]'
                              : delta < 0
                              ? 'text-[var(--red)]'
                              : 'text-[var(--ink)]'
                          }`}
                        >
                          {delta === null
                            ? '—'
                            : delta > 0
                            ? `▲ +${delta.toFixed(1)}`
                            : delta < 0
                            ? `▼ ${delta.toFixed(1)}`
                            : '0.0'}
                        </td>

                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-[var(--ink)]">
                          {row.conversion_pct != null ? `${Number(row.conversion_pct).toFixed(1)}%` : '—'}
                        </td>

                        <td className="py-2.5 px-3">
                          {row.top_scorer ? (
                            <button
                              type="button"
                              onClick={() => onSelectPlayer && onSelectPlayer(row.top_scorer)}
                              className="text-left group cursor-pointer"
                            >
                              <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] group-hover:underline">
                                {row.top_scorer.Player}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--mute)] ml-1.5 tabular-nums">
                                ({row.top_scorer.Gls}G)
                              </span>
                            </button>
                          ) : (
                            <span className="text-[var(--mute)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {anySharedXgExcluded && (
              <div className="px-3 py-2 border-t border-[var(--rule)] bg-[var(--panel)]/50 text-[11px] italic text-[var(--mute)]">
                Note: Mid-season transfer rows with shared full-season xG are excluded from single-club xG totals to prevent double-counting.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default TopLeagueEfficiencyShowcase;
