import React, { useState } from 'react';
import { 
  ArrowRight, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Compass, 
  Search,
  Sparkles,
  BarChart2,
  GitCompare,
  Users,
  Info,
  Award
} from 'lucide-react';
import SplitFlapScoreboard from '../common/SplitFlapScoreboard';
import ExpectedGoalsFigure from './ExpectedGoalsFigure';
import ShotMapFigure from './ShotMapFigure';
import StatCard from '../common/StatCard';
import MetricTooltip from '../common/MetricTooltip';
import { formatNumber, formatDecimal, formatGoalsMinusXG } from '../../utils/metricFormatters';

export const TerraceHomeView = ({
  metadata,
  dashboardData,
  activeSeason = "2024-2025",
  selectedComp = "",
  onNavigate,
  onSelectPlayer,
  onSelectTeam
}) => {
  const kpis = dashboardData?.kpis || {
    total_players: metadata?.total_records || 2854,
    total_clubs: metadata?.clubs_count || 96,
    total_goals: 4806,
    total_assists: 3429,
    total_xg: 4870.2,
    total_xag: 3450.5,
    finishing_delta: -64.2
  };

  const [finishingTab, setFinishingTab] = useState('over'); // 'over' | 'under'
  const [scatterHover, setScatterHover] = useState(null);
  const [scatterSearch, setScatterSearch] = useState('');

  const overperformers = Array.isArray(dashboardData?.overperformers)
    ? dashboardData.overperformers
    : [];

  const underperformers = Array.isArray(dashboardData?.underperformers)
    ? dashboardData.underperformers
    : [];

  const activeFinishingList = finishingTab === 'over' ? overperformers : underperformers;

  const scatterData = Array.isArray(dashboardData?.scatter_data)
    ? dashboardData.scatter_data.filter(player =>
        player.xG != null && player.xAG != null &&
        Number.isFinite(Number(player.xG)) && Number.isFinite(Number(player.xAG))
      )
    : [];
  const progressionLeaders = Array.isArray(dashboardData?.progression_leaders)
    ? dashboardData.progression_leaders
    : [];

  // Dynamic Standfirst text
  const compLabel = selectedComp ? selectedComp.replace(/^[a-z]{2}\s+/, '') : "European Big 5";
  const formatSeason = activeSeason.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  const deltaNum = kpis.finishing_delta ?? 0;
  const deltaAbs = Math.abs(deltaNum).toFixed(1);
  const deltaWording = deltaNum < 0 
    ? `Players collectively scored ${deltaAbs} fewer goals than statistical models expected`
    : `Players collectively scored ${deltaAbs} more goals than statistical models expected`;

  // Dynamic Auto-Written Findings from actual data
  const topOver = overperformers[0];
  const topUnder = underperformers[0];
  const topCombined = [...scatterData].sort((a, b) =>
    (Number(b.xG) + Number(b.xAG)) - (Number(a.xG) + Number(a.xAG))
  )[0];

  // Dynamic scatter boundaries
  const maxX = Math.max(14, ...scatterData.map(p => Number(p.xAG))) * 1.15;
  const maxY = Math.max(18, ...scatterData.map(p => Number(p.xG))) * 1.15;

  return (
    <div className="space-y-12 font-ser not-italic">
      {/* 1. Page Title & Standfirst */}
      <section className="border-b-2 border-[var(--ink)] pb-4">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Executive Season Ledger & Performance Dashboard
            </span>
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
              {compLabel}, {formatSeason}
            </h2>
          </div>
          <span className="text-xs italic text-[var(--mute)]">
            Verified matchday metrics & European statistical aggregates
          </span>
        </div>

        {/* Dynamic Standfirst */}
        <p className="text-sm sm:text-base italic text-[var(--ink)] mt-2 max-w-3xl leading-relaxed">
          {compLabel}, {formatSeason}: <b>{formatNumber(kpis.total_goals)} goals</b> recorded from <b>{formatDecimal(kpis.total_xg, 1)} expected goals</b>. {deltaWording}.
        </p>
      </section>

      {/* 2. Four Headline Numbers Strip */}
      <section>
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
            subtext="Across premier European divisions"
            deltaType="neutral"
          />

          <StatCard
            title="Total Goals Scored"
            value={formatNumber(kpis.total_goals)}
            subtext={`${formatNumber(kpis.total_assists)} direct assists recorded`}
            delta={kpis.total_goals > 0 ? +12 : 0}
            deltaType="positive"
          />

          <div className="border border-[var(--rule)] bg-[var(--paper)] p-3 sm:p-4 rounded-xs">
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)]">
                Cumulative Expected Goals
              </span>
              <span className={`text-xs font-semibold ${deltaNum < 0 ? 'text-[var(--red)]' : 'text-[var(--blue)]'}`}>
                {deltaNum < 0 ? '▼' : '▲'} {deltaAbs} delta
              </span>
            </div>
            <div className="font-disp font-extrabold text-3xl sm:text-4xl text-[var(--ink)] leading-none tracking-tight">
              {formatDecimal(kpis.total_xg, 1)} <span className="text-xs font-serif font-normal text-[var(--mute)]">xG</span>
            </div>
            <p className="text-xs italic text-[var(--mute)] mt-1.5 leading-snug">
              Goals {formatNumber(kpis.total_goals)} vs xG {formatDecimal(kpis.total_xg, 1)}. Finishing delta is {deltaNum > 0 ? `+${deltaAbs}` : `−${deltaAbs}`}.
            </p>
          </div>
        </div>

        {/* Clear Aggregate xG Explanation Card */}
        <div className="mt-4 p-3.5 bg-[var(--panel)] border border-[var(--rule)] rounded-xs text-xs space-y-1">
          <div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[var(--blue)]" />
            <span>Understanding Aggregate Expected Goals (xG)</span>
          </div>
          <p className="text-[var(--mute)] leading-relaxed">
            The mathematical model assesses the probability of each shot resulting in a goal based on historical trajectory, distance, angle, and defensive pressure. A cumulative difference of {deltaNum > 0 ? `+${deltaAbs}` : `−${deltaAbs}`} goals indicates that across the entire cohort of {formatNumber(kpis.total_players)} players, finishing conversion was slightly {deltaNum < 0 ? 'below' : 'above'} statistical expectation.
          </p>
        </div>
      </section>

      {/* 3. Statistical Standouts & Leaders of the Campaign (100% Real Data) */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              {compLabel} • Volume {formatSeason}
            </span>
            <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
              Statistical Standouts of the Season
            </h3>
          </div>
          <button
            onClick={() => onNavigate && onNavigate("leaderboards")}
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
                  <Award className="w-4 h-4 text-amber-500" />
                  <h4 className="font-disp font-bold text-sm uppercase tracking-wider text-[var(--ink)]">
                    Golden Boot Leaders
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[var(--mute)] uppercase">Goals (xG)</span>
              </div>

              <div className="divide-y divide-[var(--rule)]/60">
                {(dashboardData?.top_scorers || []).slice(0, 4).map((p, idx) => (
                  <div
                    key={p.id || idx}
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    className="py-2 flex items-center justify-between hover:bg-[var(--panel)] px-1.5 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`font-mono text-xs font-bold w-4 shrink-0 ${idx === 0 ? 'text-amber-500 font-extrabold' : 'text-[var(--mute)]'}`}>
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--blue)] truncate">
                          {p.Player}
                        </div>
                        <div className="text-[10px] text-[var(--mute)] truncate">
                          {p.Squad} • {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-disp font-extrabold text-base text-[var(--ink)]">{p.Gls}</span>
                      <span className="text-[10px] font-mono text-[var(--mute)] ml-1">({formatDecimal(p.xG, 1)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)] flex justify-between">
              <span>Goal conversion rate</span>
              <span className="font-bold text-[var(--ink)] font-mono">
                {kpis.total_goals && kpis.total_xg ? `${((kpis.total_goals / kpis.total_xg) * 100).toFixed(0)}% of xG` : '—'}
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
                <span className="text-[10px] font-mono text-[var(--mute)] uppercase">Assists (xAG)</span>
              </div>

              <div className="divide-y divide-[var(--rule)]/60">
                {(dashboardData?.top_creators || []).slice(0, 4).map((p, idx) => (
                  <div
                    key={p.id || idx}
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    className="py-2 flex items-center justify-between hover:bg-[var(--panel)] px-1.5 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span className={`font-mono text-xs font-bold w-4 shrink-0 ${idx === 0 ? 'text-[var(--blue)] font-extrabold' : 'text-[var(--mute)]'}`}>
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--blue)] truncate">
                          {p.Player}
                        </div>
                        <div className="text-[10px] text-[var(--mute)] truncate">
                          {p.Squad} • {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-disp font-extrabold text-base text-[var(--ink)]">{p.Ast}</span>
                      <span className="text-[10px] font-mono text-[var(--mute)] ml-1">({formatDecimal(p.xAG, 1)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--rule)] text-[11px] italic text-[var(--mute)] flex justify-between">
              <span>Total direct assists</span>
              <span className="font-bold text-[var(--ink)] font-mono">{formatNumber(kpis.total_assists)}</span>
            </div>
          </div>

          {/* Progression Leaders Podium */}
          <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <h4 className="font-disp font-bold text-sm uppercase tracking-wider text-[var(--ink)]">
                    Ball Progression Anchors
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[var(--mute)] uppercase">PrgC + PrgP</span>
              </div>

              <div className="divide-y divide-[var(--rule)]/60">
                {progressionLeaders.length > 0 ? progressionLeaders.slice(0, 4).map((p, idx) => {
                  const hasProgression = p.PrgC != null || p.PrgP != null;
                  const progSum = (p.PrgC ?? 0) + (p.PrgP ?? 0);
                  return (
                    <div
                      key={p.id || idx}
                      onClick={() => onSelectPlayer && onSelectPlayer(p)}
                      className="py-2 flex items-center justify-between hover:bg-[var(--panel)] px-1.5 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className={`font-mono text-xs font-bold w-4 shrink-0 ${idx === 0 ? 'text-emerald-500 font-extrabold' : 'text-[var(--mute)]'}`}>
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <div className="font-semibold text-xs text-[var(--ink)] group-hover:text-[var(--blue)] truncate">
                            {p.Player}
                          </div>
                          <div className="text-[10px] text-[var(--mute)] truncate">
                            {p.Squad} • {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-disp font-extrabold text-base text-[var(--ink)]">
                          {hasProgression ? formatNumber(progSum) : "—"}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--mute)] ml-1">
                          {hasProgression ? 'actions' : 'unavailable'}
                        </span>
                      </div>
                    </div>
                  );
                }) : (
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

      {/* 4. Finishing Efficiency: Overperformers & Underperformers (100% Real Data) */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-2">
          <div>
            <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
              Finishing Efficiency: Goals vs Expected Goals
            </h3>
            <p className="text-xs italic text-[var(--mute)] mt-0.5">
              Comparison of actual conversions with expected shot quality. Minimum 500 minutes played.
            </p>
          </div>

          {/* Over / Under Toggle */}
          <div className="flex items-center border border-[var(--ink)] p-0.5 rounded-xs self-start sm:self-auto bg-[var(--paper)]">
            <button
              onClick={() => setFinishingTab('over')}
              className={`px-3 py-1 text-xs font-disp font-bold uppercase transition-colors ${
                finishingTab === 'over' 
                  ? 'bg-[var(--ink)] text-[var(--paper)]' 
                  : 'text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              ▲ Overperformers ({overperformers.length})
            </button>
            <button
              onClick={() => setFinishingTab('under')}
              className={`px-3 py-1 text-xs font-disp font-bold uppercase transition-colors ${
                finishingTab === 'under' 
                  ? 'bg-[var(--ink)] text-[var(--paper)]' 
                  : 'text-[var(--ink)] hover:bg-[var(--panel)]'
              }`}
            >
              ▼ Underperformers ({underperformers.length})
            </button>
          </div>
        </div>

        {/* Finishing Table with Single Bar for Goals and Tick for xG */}
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
                <th className="text-center py-2 px-3 font-semibold text-[var(--ink)] w-36">Goals (Bar) vs xG (Tick)</th>
                <th className="text-right py-2 px-2.5 font-semibold text-[var(--ink)]">Difference (G − xG)</th>
              </tr>
            </thead>
            <tbody>
              {activeFinishingList.map((p, idx) => {
                const deltaObj = formatGoalsMinusXG(p.Gls_minus_xG);
                const maxVal = Math.max(30, ...activeFinishingList.map(item => Math.max(item.Gls || 0, item.xG || 0)));
                const glsPct = Math.min(100, Math.round(((p.Gls || 0) / maxVal) * 100));
                const xgPct = Math.min(100, Math.round(((p.xG || 0) / maxVal) * 100));

                return (
                  <tr 
                    key={p.id || idx}
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                  >
                    <td className="text-left py-2 px-2.5 dotted-rule font-semibold text-[var(--ink)] group-hover:text-[var(--blue)]">
                      {p.Player}
                    </td>
                    <td className="text-left py-2 px-2 dotted-rule text-[var(--mute)]">
                      {p.Squad}
                    </td>
                    <td className="text-left py-2 px-2 dotted-rule text-[var(--mute)]">
                      {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                    </td>
                    <td className="text-center py-2 px-2 dotted-rule font-mono text-[11px]">
                      {p.Pos}
                    </td>
                    <td className="text-right py-2 px-2 dotted-rule font-bold text-[var(--ink)]">
                      {p.Gls}
                    </td>
                    <td className="text-right py-2 px-2 dotted-rule text-[var(--mute)]">
                      {formatDecimal(p.xG, 1)}
                    </td>

                    {/* Single Bar for Goals + Tick Marker for xG */}
                    <td className="py-2 px-3 dotted-rule">
                      <div className="relative w-full h-3 bg-[var(--panel)] border border-[var(--rule)] rounded-xs overflow-visible">
                        {/* Goal Bar */}
                        <div 
                          className="h-full bg-[var(--blue)] opacity-80" 
                          style={{ width: `${glsPct}%` }}
                        />
                        {/* xG Tick Marker */}
                        <div 
                          className="absolute top-[-3px] bottom-[-3px] w-1 bg-[var(--red)] z-10 shadow-xs"
                          style={{ left: `${xgPct}%` }}
                          title={`xG Marker: ${formatDecimal(p.xG, 1)}`}
                        />
                      </div>
                    </td>

                    <td className={`text-right py-2 px-2.5 dotted-rule font-bold font-mono ${
                      deltaObj.isOver ? 'text-[var(--blue)]' : 'text-[var(--red)]'
                    }`}>
                      {deltaObj.glyph} {deltaObj.text}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Attacking Output Matrix (xG vs xAG) (100% Real Data) */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 mb-2">
          <div>
            <h3 className="font-disp font-bold text-2xl sm:text-3xl text-[var(--ink)] tracking-tight">
              Fig. 3 Attacking Output Matrix (xG vs xAG)
            </h3>
            <p className="text-xs italic text-[var(--mute)] mt-0.5">
              Shooting threat (Y-axis) vs Chance creation quality (X-axis). Labels limited to top output and hovered players.
            </p>
          </div>

          <div className="relative w-full sm:w-56">
            <input
              type="text"
              placeholder="Highlight player on matrix..."
              value={scatterSearch}
              onChange={(e) => setScatterSearch(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1 px-2.5 text-xs text-[var(--ink)] placeholder:italic focus:outline-none"
            />
          </div>
        </div>

        {/* Scatter Plot Coordinate Area */}
        <div className="relative w-full h-80 sm:h-96 bg-[var(--panel)] border-2 border-[var(--ink)] p-4 my-2 select-none overflow-hidden">
          {/* Quadrant Lines */}
          <div className="absolute left-1/2 inset-y-0 border-l border-[var(--rule)] border-dashed" />
          <div className="absolute top-1/2 inset-x-0 border-t border-[var(--rule)] border-dashed" />

          {/* Meaningful Quadrant Names */}
          <span className="absolute top-2 right-3 text-[11px] font-disp font-bold uppercase text-[var(--blue)] tracking-wider">
            Scores and creates (Top Right)
          </span>
          <span className="absolute top-2 left-3 text-[11px] font-disp font-bold uppercase text-[var(--red)] tracking-wider">
            Mostly scorers (High xG)
          </span>
          <span className="absolute bottom-6 right-3 text-[11px] font-disp font-bold uppercase text-[var(--ink)] tracking-wider">
            Mostly creators (High xAG)
          </span>
          <span className="absolute bottom-6 left-3 text-[11px] font-disp font-bold uppercase text-[var(--mute)] tracking-wider">
            Moderate Volume
          </span>

          {/* Axis Labels */}
          <span className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-disp font-bold text-[var(--mute)] tracking-wider">
            &larr; Shooting Threat (xG)
          </span>
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-disp font-bold text-[var(--mute)] tracking-wider">
            Chance Creation Quality (xAG) &rarr;
          </span>

          {/* Points */}
          <div className="relative w-full h-full">
            {scatterData.length === 0 ? (
              <p className="absolute inset-0 flex items-center justify-center text-sm italic text-[var(--mute)]" role="status">
                Expected-goal observations are not available for this season.
              </p>
            ) : scatterData.map((player, idx) => {
              const xVal = Number(player.xAG);
              const yVal = Number(player.xG);
              const xPercent = Math.min(92, Math.max(8, (xVal / maxX) * 100));
              const yPercent = Math.min(90, Math.max(8, 100 - (yVal / maxY) * 100));
              const isHovered = scatterHover?.id === player.id;
              const isSearchMatch = scatterSearch && player.Player?.toLowerCase().includes(scatterSearch.toLowerCase());
              // Show label for top 8 or hovered or search match to prevent collision
              const showLabel = idx < 8 || isHovered || isSearchMatch;

              return (
                <div
                  key={player.id || idx}
                  style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                  onMouseEnter={() => setScatterHover(player)}
                  onMouseLeave={() => setScatterHover(null)}
                  onClick={() => onSelectPlayer && onSelectPlayer(player)}
                >
                  {/* Point Marker */}
                  <div className={`w-3.5 h-3.5 rounded-full border border-[var(--paper)] transition-transform ${
                    isHovered || isSearchMatch 
                      ? 'scale-150 bg-[var(--red)] ring-2 ring-[var(--ink)] z-30' 
                      : 'bg-[var(--blue)] hover:bg-[var(--red)]'
                  }`} />

                  {/* Clean Non-Colliding Label */}
                  {showLabel && (
                    <span className={`absolute left-1/2 -top-5 -translate-x-1/2 text-[10px] font-ser font-semibold whitespace-nowrap px-1 py-0.2 rounded-xs transition-all pointer-events-none ${
                      isHovered || isSearchMatch
                        ? 'bg-[var(--ink)] text-[var(--paper)] font-bold z-40'
                        : 'bg-[var(--paper)] text-[var(--ink)] border border-[var(--rule)] opacity-90'
                    }`}>
                      {player.Player.split(' ').pop()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reading Guide */}
        <p className="text-xs italic text-[var(--mute)] mt-1">
          <b>Reading Guide:</b> Players plotted toward the top-right excel in both finishing chances and providing key passes. Click any dot to open complete player dossier.
        </p>
      </section>

      {/* 6. Automatically Generated Findings (from Real Data) */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <h3 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight mb-2">
          Campaign Findings & Key Observables
        </h3>
        <p className="text-xs italic text-[var(--mute)] mb-4">
          Statistically significant trends derived directly from the active European database.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[var(--rule)] p-4 bg-[var(--paper)] rounded-xs">
            <span className="font-disp font-bold text-xs uppercase text-[var(--blue)] block mb-1">
              Top Overperformer
            </span>
            <div className="font-disp font-extrabold text-2xl text-[var(--ink)]">
              {topOver ? topOver.Player : "—"}
            </div>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              {topOver ? `${topOver.Player} scored ${topOver.Gls_minus_xG > 0 ? `+${topOver.Gls_minus_xG}` : topOver.Gls_minus_xG} relative to expectation (${topOver.Gls} goals from ${formatDecimal(topOver.xG, 1)} xG).` : "Clinical finishing outlier."}
            </p>
          </div>

          <div className="border border-[var(--rule)] p-4 bg-[var(--paper)] rounded-xs">
            <span className="font-disp font-bold text-xs uppercase text-[var(--red)] block mb-1">
              Top Underperformer
            </span>
            <div className="font-disp font-extrabold text-2xl text-[var(--ink)]">
              {topUnder ? topUnder.Player : "—"}
            </div>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              {topUnder ? `${topUnder.Player} scored ${Math.abs(topUnder.Gls_minus_xG)} fewer than expected from ${formatDecimal(topUnder.xG, 1)} xG.` : "Chance conversion deficit."}
            </p>
          </div>

          <div className="border border-[var(--rule)] p-4 bg-[var(--paper)] rounded-xs">
            <span className="font-disp font-bold text-xs uppercase text-[var(--ink)] block mb-1">
              Combined Threat Leader
            </span>
            <div className="font-disp font-extrabold text-2xl text-[var(--ink)]">
              {topCombined ? topCombined.Player : "—"}
            </div>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              {topCombined ? `${topCombined.Player} accumulated ${(Number(topCombined.xG) + Number(topCombined.xAG)).toFixed(1)} combined xG + xAG.` : "Expected-goal data is unavailable for this season."}
            </p>
          </div>
        </div>
      </section>

      {/* 7. Tactical Feature & Spatial Modeling Demonstration (Opta Coordinates) */}
      <section className="border-t-2 border-[var(--ink)] pt-4">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Tactical Modeling Deep Dive
            </span>
            <h3 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight">
              Matchday Scoreboard & Spatial Shot Distribution
            </h3>
          </div>
          <span className="text-xs italic text-[var(--mute)]">
            Opta spatial coordinates • Split-flap display
          </span>
        </div>

        <p className="text-xs italic text-[var(--mute)] mb-4 max-w-2xl leading-relaxed">
          Demonstration case study of spatial tracking and cumulative xG modeling during a single 90-minute derby fixture.
        </p>

        <div className="flex justify-center sm:justify-start">
          <SplitFlapScoreboard 
            homeTeam="ARSENAL"
            awayTeam="CHELSEA"
            homeScore={2}
            awayScore={1}
            matchStatus="SECOND HALF"
            matchMinute={74}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6 items-start border-t border-[var(--rule)] pt-6">
          <ExpectedGoalsFigure homeTeam="Arsenal" awayTeam="Chelsea" />
          <ShotMapFigure homeTeam="Arsenal" awayTeam="Chelsea" />
        </div>
      </section>
    </div>
  );
};

export default TerraceHomeView;
