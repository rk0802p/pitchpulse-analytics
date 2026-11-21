import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  TrendingUp,
  Sparkles,
  Award,
} from 'lucide-react';
import StatCard from '../common/StatCard';
import TopLeagueEfficiencyShowcase from './TopLeagueEfficiencyShowcase';
import AttackingOutputMatrix from './AttackingOutputMatrix';
import { formatNumber, formatDecimal, formatGoalsMinusXG } from '../../utils/metricFormatters';

const formatAggregateXg = (val) => {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
};

const KpiSkeleton = ({ label }) => (
  <div className="border border-[var(--rule)] bg-[var(--paper)] p-3 sm:p-4 rounded-xs">
    <div className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] mb-2">
      {label}
    </div>
    <div className="h-9 w-28 bg-[var(--panel)] border border-[var(--rule)]/70 mb-2" />
    <div className="h-3 w-40 bg-[var(--panel)]" />
  </div>
);

export const TerraceHomeView = ({
  metadata,
  dashboardData,
  activeSeason = '2024-2025',
  selectedComp = '',
  loading = false,
  onNavigate,
  onSelectPlayer,
  onSelectTeam,
  onSelectComp,
}) => {
  const [finishingTab, setFinishingTab] = useState('over'); // 'over' | 'under'

  const isLoading = loading || !dashboardData;
  const kpis = dashboardData?.kpis || null;

  const overperformers = useMemo(
    () => (Array.isArray(dashboardData?.overperformers) ? dashboardData.overperformers : []),
    [dashboardData]
  );
  const underperformers = useMemo(
    () => (Array.isArray(dashboardData?.underperformers) ? dashboardData.underperformers : []),
    [dashboardData]
  );
  const activeFinishingList = finishingTab === 'over' ? overperformers : underperformers;

  const scatterData = useMemo(
    () =>
      Array.isArray(dashboardData?.scatter_data)
        ? dashboardData.scatter_data.filter(
            (player) =>
              player &&
              player.xG != null &&
              player.xAG != null &&
              Number.isFinite(Number(player.xG)) &&
              Number.isFinite(Number(player.xAG))
          )
        : [],
    [dashboardData]
  );

  const progressionLeaders = useMemo(
    () => (Array.isArray(dashboardData?.progression_leaders) ? dashboardData.progression_leaders : []),
    [dashboardData]
  );

  const leagueEfficiency = useMemo(
    () => (Array.isArray(dashboardData?.league_efficiency) ? dashboardData.league_efficiency : []),
    [dashboardData]
  );
  const clubEfficiency = useMemo(
    () => (Array.isArray(dashboardData?.club_efficiency) ? dashboardData.club_efficiency : []),
    [dashboardData]
  );

  const hasXg = useMemo(() => {
    if (!kpis) return false;
    if (typeof kpis.has_xg === 'boolean') return kpis.has_xg;
    if (kpis.total_xg === null || kpis.total_xg === undefined) return false;
    return Number(kpis.total_xg) > 0 || scatterData.length > 0;
  }, [kpis, scatterData.length]);

  const compLabel = selectedComp ? selectedComp.replace(/^[a-z]{2,3}\s+/, '') : 'European Big 5';
  const formatSeason = activeSeason.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');

  const deltaNum = hasXg && kpis && Number.isFinite(Number(kpis.finishing_delta))
    ? Number(kpis.finishing_delta)
    : null;
  const deltaAbs = deltaNum !== null ? Math.abs(deltaNum).toFixed(1) : null;
  const deltaWording =
    deltaNum === null
      ? null
      : deltaNum < 0
      ? `Players collectively scored ${deltaAbs} fewer goals than statistical models expected.`
      : deltaNum > 0
      ? `Players collectively scored ${deltaAbs} more goals than statistical models expected.`
      : `Aggregate goals matched statistical expectation.`;

  const conversionPct =
    hasXg && kpis && Number(kpis.total_xg) > 0
      ? ((Number(kpis.total_goals) / Number(kpis.total_xg)) * 100).toFixed(1)
      : null;

  const topOver = overperformers[0] || null;
  const topUnder = underperformers[0] || null;
  const topCombined = useMemo(() => {
    if (scatterData.length === 0) return null;
    return [...scatterData].sort(
      (a, b) => Number(b.xG) + Number(b.xAG) - (Number(a.xG) + Number(a.xAG))
    )[0];
  }, [scatterData]);

  const topScorers = Array.isArray(dashboardData?.top_scorers) ? dashboardData.top_scorers : [];
  const topCreators = Array.isArray(dashboardData?.top_creators) ? dashboardData.top_creators : [];

  return (
    <div className="space-y-10 font-ser not-italic">
      {/* 1. Page Title & Dynamic Standfirst */}
      <section className="border-b-2 border-[var(--ink)] pb-4">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Executive Season Ledger &amp; Performance Overview
            </span>
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
              {compLabel}, {formatSeason}
            </h2>
          </div>
          <span className="text-xs italic text-[var(--mute)]">
            {metadata?.total_records
              ? `${formatNumber(metadata.total_records)} verified league records · Big 5 archive`
              : 'Verified matchday metrics & European statistical aggregates'}
          </span>
        </div>

        {/* Dynamic Standfirst */}
        {isLoading ? (
          <div className="h-5 w-3/4 max-w-2xl bg-[var(--panel)] mt-3" aria-hidden="true" />
        ) : hasXg ? (
          <p className="text-sm sm:text-base italic text-[var(--ink)] mt-2.5 max-w-3xl leading-relaxed">
            {compLabel}, {formatSeason}: <b className="tabular-nums">{formatNumber(kpis.total_goals)} goals</b> recorded from{' '}
            <b className="tabular-nums">{formatAggregateXg(kpis.total_xg)} expected goals</b> ({conversionPct}% conversion).{' '}
            {deltaWording}
          </p>
        ) : (
          <p className="text-sm sm:text-base italic text-[var(--ink)] mt-2.5 max-w-3xl leading-relaxed">
            {compLabel}, {formatSeason}: <b className="tabular-nums">{formatNumber(kpis.total_goals)} goals</b> and{' '}
            <b className="tabular-nums">{formatNumber(kpis.total_assists)} direct assists</b> recorded across{' '}
            <b className="tabular-nums">{formatNumber(kpis.total_clubs)} clubs</b>. Expected-goal (xG) models are not tracked in this historical archive.
          </p>
        )}
      </section>

      {/* 2. Four Live Headline KPIs (zero fake deltas, zero stale fallback numbers) */}
      <section aria-label="Season Headline Metrics">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" role="status" aria-label="Loading season KPIs">
            <KpiSkeleton label="Registered Players" />
            <KpiSkeleton label="Active Clubs" />
            <KpiSkeleton label="Total Goals Scored" />
            <KpiSkeleton label="Cumulative Expected Goals" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Registered Players"
              value={formatNumber(kpis.total_players)}
              subtext="First-team squads with recorded minutes"
              deltaType="neutral"
            />

            <StatCard
              title="Active Clubs"
              value={formatNumber(kpis.total_clubs)}
              subtext={selectedComp ? `Clubs in ${compLabel}` : 'Across Europe’s top 5 divisions'}
              deltaType="neutral"
            />

            <StatCard
              title="Total Goals Scored"
              value={formatNumber(kpis.total_goals)}
              subtext={`${formatNumber(kpis.total_assists)} direct assists recorded`}
              deltaType="neutral"
            />

            <div className="border border-[var(--rule)] bg-[var(--paper)] p-3 sm:p-4 rounded-xs">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)]">
                  Cumulative Expected Goals
                </span>
                {hasXg && deltaNum !== null ? (
                  <span
                    className={`text-xs font-mono font-semibold tabular-nums ${
                      deltaNum < 0 ? 'text-[var(--red)]' : deltaNum > 0 ? 'text-[var(--blue)]' : 'text-[var(--mute)]'
                    }`}
                  >
                    {deltaNum < 0 ? '▼' : deltaNum > 0 ? '▲' : '—'} {deltaAbs} delta
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--mute)] uppercase">
                    Pre-xG
                  </span>
                )}
              </div>

              {hasXg ? (
                <>
                  <div className="font-disp font-extrabold text-3xl sm:text-4xl text-[var(--ink)] leading-none tracking-tight tabular-nums">
                    {formatAggregateXg(kpis.total_xg)}{' '}
                    <span className="text-xs font-serif font-normal text-[var(--mute)]">xG</span>
                  </div>
                  <p className="text-xs italic text-[var(--mute)] mt-1.5 leading-snug">
                    Goals {formatNumber(kpis.total_goals)} vs xG {formatAggregateXg(kpis.total_xg)} · Finishing delta{' '}
                    {deltaNum !== null && deltaNum > 0 ? `+${deltaAbs}` : `−${deltaAbs}`}.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-disp font-extrabold text-3xl sm:text-4xl text-[var(--mute)] leading-none tracking-tight">
                    Untracked
                  </div>
                  <p className="text-xs italic text-[var(--mute)] mt-1.5 leading-snug">
                    Pre-xG archive · Expected-goal tracking begins in 2014/15.
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 3. Real Top-League & Club Efficiency Showcase (replaces fictional Arsenal vs Chelsea match widget) */}
      <TopLeagueEfficiencyShowcase
        leagueEfficiency={leagueEfficiency}
        clubEfficiency={clubEfficiency}
        hasXg={hasXg}
        activeSeason={activeSeason}
        selectedComp={selectedComp}
        loading={isLoading}
        onSelectComp={onSelectComp}
        onSelectTeam={onSelectTeam}
        onSelectPlayer={onSelectPlayer}
        onNavigate={onNavigate}
      />

      {/* 4. Statistical Standouts & Leaders of the Campaign */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              {compLabel} · Volume {formatSeason}
            </span>
            <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
              Statistical Standouts of the Season
            </h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('leaderboards')}
            className="text-xs font-bold font-disp uppercase text-[var(--blue)] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Complete League Leaderboards</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top Goalscorers Podium */}
          <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[var(--accent)]" />
                  <h4 className="font-disp font-bold text-sm uppercase tracking-wider text-[var(--ink)]">
                    Golden Boot Leaders
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[var(--mute)] uppercase">
                  {hasXg ? 'Goals (xG)' : 'Goals'}
                </span>
              </div>

              <div className="divide-y divide-[var(--rule)]/60">
                {topScorers.slice(0, 4).map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    className="w-full text-left py-2 flex items-center justify-between hover:bg-[var(--panel)] px-1.5 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`font-mono text-xs font-bold w-4 shrink-0 ${
                          idx === 0 ? 'text-[var(--accent)] font-extrabold' : 'text-[var(--mute)]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--blue)] truncate">
                          {p.Player}
                        </div>
                        <div className="text-[10px] text-[var(--mute)] truncate">
                          {p.Squad}
                          {p.Comp ? ` · ${p.Comp.replace(/^[a-z]{2,3}\s+/, '')}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <span className="font-disp font-extrabold text-base text-[var(--ink)]">{p.Gls}</span>
                      {hasXg && p.xG != null && (
                        <span className="text-[10px] font-mono text-[var(--mute)] ml-1">
                          ({formatDecimal(p.xG, 1)})
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)] flex justify-between">
              <span>Goal conversion rate</span>
              <span className="font-bold text-[var(--ink)] font-mono tabular-nums">
                {conversionPct ? `${conversionPct}% of xG` : 'Pre-xG'}
              </span>
            </div>
          </div>

          {/* Top Creators Podium */}
          <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--blue)]" />
                  <h4 className="font-disp font-bold text-sm uppercase tracking-wider text-[var(--ink)]">
                    Playmaking Masters
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[var(--mute)] uppercase">
                  {hasXg ? 'Assists (xAG)' : 'Assists'}
                </span>
              </div>

              <div className="divide-y divide-[var(--rule)]/60">
                {topCreators.slice(0, 4).map((p, idx) => (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    className="w-full text-left py-2 flex items-center justify-between hover:bg-[var(--panel)] px-1.5 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`font-mono text-xs font-bold w-4 shrink-0 ${
                          idx === 0 ? 'text-[var(--blue)] font-extrabold' : 'text-[var(--mute)]'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--blue)] truncate">
                          {p.Player}
                        </div>
                        <div className="text-[10px] text-[var(--mute)] truncate">
                          {p.Squad}
                          {p.Comp ? ` · ${p.Comp.replace(/^[a-z]{2,3}\s+/, '')}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 tabular-nums">
                      <span className="font-disp font-extrabold text-base text-[var(--ink)]">{p.Ast}</span>
                      {hasXg && p.xAG != null && (
                        <span className="text-[10px] font-mono text-[var(--mute)] ml-1">
                          ({formatDecimal(p.xAG, 1)})
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)] flex justify-between">
              <span>Total direct assists</span>
              <span className="font-bold text-[var(--ink)] font-mono tabular-nums">
                {kpis ? formatNumber(kpis.total_assists) : '—'}
              </span>
            </div>
          </div>

          {/* Progression Leaders Podium */}
          <div
            data-testid="progression-panel"
            className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[var(--green)]" />
                  <h4 className="font-disp font-bold text-sm uppercase tracking-wider text-[var(--ink)]">
                    Ball Progression Anchors
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[var(--mute)] uppercase">PrgC + PrgP</span>
              </div>

              <div className="divide-y divide-[var(--rule)]/60">
                {progressionLeaders.length > 0 ? (
                  progressionLeaders.slice(0, 4).map((p, idx) => {
                    const hasProgression = p.PrgC != null || p.PrgP != null;
                    const progSum = (p.PrgC ?? 0) + (p.PrgP ?? 0);
                    return (
                      <button
                        key={p.id || idx}
                        type="button"
                        data-testid={`progression-row-${p.id || idx}`}
                        onClick={() => onSelectPlayer && onSelectPlayer(p)}
                        className="w-full text-left py-2 flex items-center justify-between hover:bg-[var(--panel)] px-1.5 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span
                            className={`font-mono text-xs font-bold w-4 shrink-0 ${
                              idx === 0 ? 'text-[var(--green)] font-extrabold' : 'text-[var(--mute)]'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--blue)] truncate">
                              {p.Player}
                            </div>
                            <div className="text-[10px] text-[var(--mute)] truncate">
                              {p.Squad}
                              {p.Comp ? ` · ${p.Comp.replace(/^[a-z]{2,3}\s+/, '')}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <span className="font-disp font-extrabold text-base text-[var(--ink)]">
                            {hasProgression ? formatNumber(progSum) : '—'}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--mute)] ml-1">
                            {hasProgression ? 'actions' : 'unavailable'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="py-4 text-xs italic text-[var(--mute)]" role="status">
                    Progressive action metrics (PrgC &amp; PrgP) are not tracked or unavailable for this season.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)] flex justify-between">
              <span>Deep progression threshold</span>
              <span className="font-bold text-[var(--ink)] font-mono">≥ 10 yards</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recharts Interactive Attacking Output Matrix (xG vs xAG) */}
      <AttackingOutputMatrix
        scatterData={scatterData}
        scatterMedians={dashboardData?.scatter_medians || null}
        loading={isLoading}
        onSelectPlayer={onSelectPlayer}
      />

      {/* 6. Finishing Efficiency: Overperformers & Underperformers */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-2">
          <div>
            <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
              Finishing Efficiency: Goals vs Expected Goals
            </h3>
            <p className="text-xs italic text-[var(--mute)] mt-0.5">
              Actual goals compared against shot-quality expectation. Minimum 500 minutes played.
            </p>
          </div>

          <div
            role="group"
            aria-label="Finishing efficiency cohort"
            className="flex items-center border border-[var(--ink)] p-0.5 rounded-xs self-start sm:self-auto bg-[var(--paper)]"
          >
            <button
              type="button"
              onClick={() => setFinishingTab('over')}
              className={`px-3 py-1 text-xs font-disp font-bold uppercase transition-colors cursor-pointer ${
                finishingTab === 'over'
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              ▲ Overperformers ({overperformers.length})
            </button>
            <button
              type="button"
              onClick={() => setFinishingTab('under')}
              className={`px-3 py-1 text-xs font-disp font-bold uppercase transition-colors cursor-pointer ${
                finishingTab === 'under'
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              ▼ Underperformers ({underperformers.length})
            </button>
          </div>
        </div>

        {activeFinishingList.length === 0 ? (
          <div
            role="status"
            className="mt-3 border border-dashed border-[var(--rule)] bg-[var(--panel)] p-6 text-center text-xs italic text-[var(--mute)]"
          >
            Expected-goal finishing deltas are not available for this season or filter.
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[var(--ink)] mt-3">
            <table className="w-full min-w-[650px] border-collapse text-xs font-ser">
              <thead>
                <tr className="border-b border-[var(--ink)]">
                  <th className="text-left py-2 px-2.5 font-semibold text-[var(--ink)]">Player</th>
                  <th className="text-left py-2 px-2 font-semibold text-[var(--ink)]">Club</th>
                  <th className="text-left py-2 px-2 font-semibold text-[var(--ink)]">League</th>
                  <th className="text-center py-2 px-2 font-semibold text-[var(--ink)]">Pos</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Goals</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">xG</th>
                  <th className="text-center py-2 px-3 font-semibold text-[var(--ink)] w-36">
                    Goals (Bar) vs xG (Tick)
                  </th>
                  <th className="text-right py-2 px-2.5 font-semibold text-[var(--ink)]">
                    Difference (G − xG)
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeFinishingList.map((p, idx) => {
                  const deltaObj = formatGoalsMinusXG(p.Gls_minus_xG);
                  const maxVal = Math.max(
                    30,
                    ...activeFinishingList.map((item) => Math.max(item.Gls || 0, item.xG || 0))
                  );
                  const glsPct = Math.min(100, Math.round(((p.Gls || 0) / maxVal) * 100));
                  const xgPct = Math.min(100, Math.round(((p.xG || 0) / maxVal) * 100));

                  return (
                    <tr
                      key={p.id || idx}
                      className="hover:bg-[var(--panel)] transition-colors group"
                    >
                      <td className="text-left py-2 px-2.5 dotted-rule">
                        <button
                          type="button"
                          onClick={() => onSelectPlayer && onSelectPlayer(p)}
                          className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] hover:underline cursor-pointer text-left"
                        >
                          {p.Player}
                        </button>
                      </td>
                      <td className="text-left py-2 px-2 dotted-rule text-[var(--mute)]">
                        {p.Squad}
                      </td>
                      <td className="text-left py-2 px-2 dotted-rule text-[var(--mute)]">
                        {p.Comp?.replace(/^[a-z]{2,3}\s+/, '')}
                      </td>
                      <td className="text-center py-2 px-2 dotted-rule font-mono text-[11px]">
                        {p.Pos}
                      </td>
                      <td className="text-right py-2 px-2 dotted-rule font-bold font-mono tabular-nums text-[var(--ink)]">
                        {p.Gls}
                      </td>
                      <td className="text-right py-2 px-2 dotted-rule font-mono tabular-nums text-[var(--mute)]">
                        {formatDecimal(p.xG, 1)}
                      </td>

                      <td className="py-2 px-3 dotted-rule">
                        <div className="relative w-full h-3 bg-[var(--panel)] border border-[var(--rule)] rounded-xs overflow-visible">
                          <div
                            className="h-full bg-[var(--blue)] opacity-80"
                            style={{ width: `${glsPct}%` }}
                          />
                          <div
                            className="absolute top-[-3px] bottom-[-3px] w-1 bg-[var(--red)] z-10"
                            style={{ left: `${xgPct}%` }}
                            title={`xG Marker: ${formatDecimal(p.xG, 1)}`}
                          />
                        </div>
                      </td>

                      <td
                        className={`text-right py-2 px-2.5 dotted-rule font-bold font-mono tabular-nums ${
                          deltaObj.isOver ? 'text-[var(--blue)]' : 'text-[var(--red)]'
                        }`}
                      >
                        {deltaObj.glyph} {deltaObj.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 7. Automatically Generated Campaign Findings */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <h3 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight mb-1">
          Campaign Findings &amp; Key Observables
        </h3>
        <p className="text-xs italic text-[var(--mute)] mb-4">
          Outlier profiles derived directly from the active {formatSeason} dataset.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[var(--rule)] p-4 bg-[var(--paper)] rounded-xs">
            <span className="font-disp font-bold text-xs uppercase text-[var(--blue)] block mb-1">
              Top Overperformer
            </span>
            {topOver ? (
              <button
                type="button"
                onClick={() => onSelectPlayer && onSelectPlayer(topOver)}
                className="font-disp font-extrabold text-2xl text-[var(--ink)] hover:text-[var(--blue)] hover:underline text-left cursor-pointer"
              >
                {topOver.Player}
              </button>
            ) : (
              <div className="font-disp font-extrabold text-2xl text-[var(--ink)]">—</div>
            )}
            <p className="text-xs italic text-[var(--mute)] mt-1">
              {topOver
                ? `${topOver.Player} scored ${
                    topOver.Gls_minus_xG > 0 ? `+${topOver.Gls_minus_xG}` : topOver.Gls_minus_xG
                  } relative to expectation (${topOver.Gls} goals from ${formatDecimal(topOver.xG, 1)} xG).`
                : 'Expected-goal finishing deltas are unavailable for this season.'}
            </p>
          </div>

          <div className="border border-[var(--rule)] p-4 bg-[var(--paper)] rounded-xs">
            <span className="font-disp font-bold text-xs uppercase text-[var(--red)] block mb-1">
              Top Underperformer
            </span>
            {topUnder ? (
              <button
                type="button"
                onClick={() => onSelectPlayer && onSelectPlayer(topUnder)}
                className="font-disp font-extrabold text-2xl text-[var(--ink)] hover:text-[var(--blue)] hover:underline text-left cursor-pointer"
              >
                {topUnder.Player}
              </button>
            ) : (
              <div className="font-disp font-extrabold text-2xl text-[var(--ink)]">—</div>
            )}
            <p className="text-xs italic text-[var(--mute)] mt-1">
              {topUnder
                ? `${topUnder.Player} scored ${Math.abs(topUnder.Gls_minus_xG)} fewer than expected from ${formatDecimal(
                    topUnder.xG,
                    1
                  )} xG.`
                : 'Expected-goal finishing deltas are unavailable for this season.'}
            </p>
          </div>

          <div className="border border-[var(--rule)] p-4 bg-[var(--paper)] rounded-xs">
            <span className="font-disp font-bold text-xs uppercase text-[var(--ink)] block mb-1">
              Combined Threat Leader
            </span>
            {topCombined ? (
              <button
                type="button"
                onClick={() => onSelectPlayer && onSelectPlayer(topCombined)}
                className="font-disp font-extrabold text-2xl text-[var(--ink)] hover:text-[var(--blue)] hover:underline text-left cursor-pointer"
              >
                {topCombined.Player}
              </button>
            ) : (
              <div className="font-disp font-extrabold text-2xl text-[var(--ink)]">—</div>
            )}
            <p className="text-xs italic text-[var(--mute)] mt-1">
              {topCombined
                ? `${topCombined.Player} accumulated ${(
                    Number(topCombined.xG) + Number(topCombined.xAG)
                  ).toFixed(1)} combined xG + xAG.`
                : 'Expected-goal data is unavailable for this season.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TerraceHomeView;
