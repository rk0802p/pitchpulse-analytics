import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  Zap, 
  Users, 
  Filter, 
  ArrowUpDown, 
  GitCompare,
  Medal,
  Award,
  Sparkles,
  Info
} from 'lucide-react';
import api from '../../services/api';
import MetricTooltip from '../common/MetricTooltip';
import { 
  formatMinutes, 
  formatDecimal, 
  formatNumber, 
  formatGoalsMinusXG 
} from '../../utils/metricFormatters';

export const LeaderboardsView = ({
  activeSeason = "2024-2025",
  untrackedMetrics = [],
  onSelectPlayer,
  onAddToCompare,
  compareList = []
}) => {
  const [viewMode, setViewMode] = useState('metrics'); // 'metrics' | 'index'
  const [metric, setMetric] = useState('Gls'); // Gls, Ast, xG, xAG, G+A, PrgC, PrgP, PrgR, Gls_90
  const [isPer90, setIsPer90] = useState(false);
  const [selectedComp, setSelectedComp] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [minMinutes, setMinMinutes] = useState(500);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Performance Index State
  const [indexRole, setIndexRole] = useState('forwards'); // forwards, midfielders, defenders, wingers
  const [indexData, setIndexData] = useState(null);
  const [indexLoading, setIndexLoading] = useState(false);

  const metrics = [
    { id: "Gls", per90Id: "Gls_90", label: "Goals (Gls)", title: "Top Scorers" },
    { id: "Ast", per90Id: "Ast_90", label: "Assists (Ast)", title: "Chief Playmakers" },
    { id: "xG", per90Id: "xG_90", label: "Expected Goals (xG)", title: "Shot Threat Leaders" },
    { id: "xAG", per90Id: "xAG_90", label: "Expected Assists (xAG)", title: "Chance Creation Quality" },
    { id: "G+A", per90Id: "G+A_90", label: "Goals + Assists (G+A)", title: "Goal Contribution Leaders" },
    { id: "PrgC", per90Id: "PrgC_90", label: "Prog. Carries (PrgC)", title: "Progressive Carry Leaders" },
    { id: "PrgP", per90Id: "PrgP_90", label: "Prog. Passes (PrgP)", title: "Progressive Passing Leaders" },
    { id: "PrgR", per90Id: "PrgR_90", label: "Prog. Receptions (PrgR)", title: "Target & Receiving Leaders" },
  ];

  const activeMetricObj = metrics.find(m => m.id === metric) || metrics[0];
  const queryMetric = isPer90 && activeMetricObj.per90Id ? activeMetricObj.per90Id : activeMetricObj.id;
  const metricUnavailable = (metricId) => untrackedMetrics.includes(metricId) || untrackedMetrics.includes(metricId.replace(/_90$/, ''));

  useEffect(() => {
    if (metricUnavailable(metric) || (isPer90 && metricUnavailable(queryMetric))) { setMetric('Gls'); setIsPer90(false); }
  }, [untrackedMetrics, metric, isPer90, queryMetric]);

  const formatSeason = activeSeason.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  const compLabel = selectedComp ? selectedComp.replace(/^[a-z]{2}\s+/, '') : "European Big 5";

  // Fetch Category Leaders
  useEffect(() => {
    if (viewMode !== 'metrics') return;
    setLoading(true);
    api.getPlayers({
      season: activeSeason,
      competition: selectedComp,
      position: selectedPos,
      min_minutes: minMinutes,
      sort_by: queryMetric,
      order: 'desc',
      limit: 20
    })
      .then(res => {
        const data = res?.data || (Array.isArray(res) ? res : []);
        setLeaders(data);
      })
      .catch(err => {
        console.error("Failed to load leaders:", err);
        setLeaders([]);
      })
      .finally(() => setLoading(false));
  }, [activeSeason, queryMetric, selectedComp, selectedPos, minMinutes, viewMode]);

  // Fetch Weighted Performance Index
  useEffect(() => {
    if (viewMode !== 'index') return;
    setIndexLoading(true);
    api.getPerformanceIndex({
      season: activeSeason,
      role: indexRole,
      competition: selectedComp,
      min_minutes: minMinutes,
      limit: 25
    })
      .then(res => {
        if (res) {
          setIndexData(res);
        }
      })
      .catch(err => {
        console.error("Failed to load performance index:", err);
        setIndexData(null);
      })
      .finally(() => setIndexLoading(false));
  }, [activeSeason, indexRole, selectedComp, minMinutes, viewMode]);

  // Compute standard tie rankings (e.g. 1, 2, 2 -> 1, T-2, T-2)
  const rankedLeaders = leaders.map((player, idx) => {
    const val = player[queryMetric];
    const prev = leaders[idx - 1];
    const next = leaders[idx + 1];
    const isTie = (prev && prev[queryMetric] === val) || (next && next[queryMetric] === val);

    let actualRank = idx + 1;
    if (prev && prev[queryMetric] === val) {
      let firstTieIdx = idx;
      while (firstTieIdx > 0 && leaders[firstTieIdx - 1][queryMetric] === val) {
        firstTieIdx--;
      }
      actualRank = firstTieIdx + 1;
    }

    const rankText = isTie ? `T-${actualRank}` : `${actualRank}`;
    return { ...player, rankDisplay: rankText, rankNum: actualRank };
  });

  const podium = rankedLeaders.slice(0, 3);
  const remaining = rankedLeaders.slice(3, 20);

  return (
    <div className="space-y-8 font-ser not-italic">
      {/* 1. Header & Title */}
      <div className="border-b-2 border-[var(--ink)] pb-3">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Continental League Podiums & Leaderboards
            </span>
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
              {viewMode === 'index' ? 'Performance Index Ratings' : activeMetricObj.title}, {formatSeason}
            </h2>
          </div>
          <span className="text-xs italic text-[var(--mute)]">
            {compLabel} • Minimum {formatMinutes(minMinutes)}
          </span>
        </div>

        {/* View Mode Toggle: Category Leaders vs Performance Index */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('metrics')}
            className={`font-disp font-bold text-xs uppercase px-4 py-2 border transition-colors cursor-pointer ${
              viewMode === 'metrics'
                ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--panel)]'
            }`}
          >
            Category Stat Leaders
          </button>
          <button
            onClick={() => setViewMode('index')}
            className={`font-disp font-bold text-xs uppercase px-4 py-2 border transition-colors cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'index'
                ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--panel)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Weighted Performance Index</span>
          </button>
        </div>

        {/* Category Metric Selector Buttons (when in metrics mode) */}
        {viewMode === 'metrics' && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {metrics.map(m => (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                disabled={metricUnavailable(m.id)}
                title={metricUnavailable(m.id) ? `${m.label} is not tracked for ${formatSeason}. Choose a tracked metric.` : ''}
                className={`font-disp font-bold text-xs uppercase px-3 py-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
                  metric === m.id
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--panel)]'
                }`}
              >
                {m.label}{metricUnavailable(m.id) ? ' (not tracked)' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Role Selector Buttons (when in index mode) */}
        {viewMode === 'index' && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {[
              { id: 'forwards', label: 'Forwards Index (FW)' },
              { id: 'midfielders', label: 'Midfielders Index (MF)' },
              { id: 'defenders', label: 'Defenders Index (DF)' },
              { id: 'wingers', label: 'Wingers / Attacking MF' }
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setIndexRole(r.id)}
                className={`font-disp font-bold text-xs uppercase px-3 py-1.5 border transition-colors whitespace-nowrap cursor-pointer ${
                  indexRole === r.id
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                    : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--panel)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--rule)] text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* League filter */}
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(e.target.value)}
              className="border border-[var(--ink)] bg-[var(--paper)] py-1 px-2 text-xs"
            >
              <option value="">All Big 5 Leagues</option>
              <option value="eng Premier League">Premier League</option>
              <option value="es La Liga">La Liga</option>
              <option value="it Serie A">Serie A</option>
              <option value="de Bundesliga">Bundesliga</option>
              <option value="fr Ligue 1">Ligue 1</option>
            </select>

            {/* Position filter (in metrics mode) */}
            {viewMode === 'metrics' && (
              <select
                value={selectedPos}
                onChange={(e) => setSelectedPos(e.target.value)}
                className="border border-[var(--ink)] bg-[var(--paper)] py-1 px-2 text-xs"
              >
                <option value="">All Positions</option>
                <option value="FW">Forwards (FW)</option>
                <option value="MF">Midfielders (MF)</option>
                <option value="DF">Defenders (DF)</option>
              </select>
            )}

            {/* Minimum minutes filter */}
            <select
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="border border-[var(--ink)] bg-[var(--paper)] py-1 px-2 text-xs"
            >
              <option value="0">Min Minutes: 0m</option>
              <option value="270">Min Minutes: 270m</option>
              <option value="500">Min Minutes: 500m</option>
              <option value="900">Min Minutes: 900m</option>
              <option value="1500">Min Minutes: 1,500m</option>
            </select>
          </div>

          {/* Per-90 toggle button (only in metrics mode) */}
          {viewMode === 'metrics' && (
            <div className="flex items-center gap-1.5 border border-[var(--ink)] p-0.5 rounded-xs bg-[var(--panel)]">
              <button
                onClick={() => setIsPer90(false)}
                className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                  !isPer90 ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'text-[var(--mute)]'
                }`}
              >
                Total
              </button>
              <button
                onClick={() => setIsPer90(true)}
                className={`px-2 py-0.5 text-xs font-mono transition-colors ${
                  isPer90 ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'text-[var(--mute)]'
                }`}
              >
                Per 90
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW MODE: WEIGHTED PERFORMANCE INDEX */}
      {viewMode === 'index' && (
        <div className="space-y-6">
          {/* Public Weights & Formula Disclosure */}
          {indexData?.weights && (
            <div className="border border-[var(--ink)] bg-[var(--paper)] p-4 rounded-xs text-xs font-ser space-y-2">
              <div className="flex items-center gap-2 text-[var(--ink)] font-bold font-disp uppercase tracking-wider">
                <Info className="w-4 h-4 text-[var(--blue)]" />
                <span>Published Weights Formulation · {indexData.role?.toUpperCase()}</span>
              </div>
              <p className="text-xs italic text-[var(--mute)]">
                Performance ratings are computed by z-score standardisation within the positional pool (clipped to [-3, 3]), weighted by the published formula below, and scaled 0–100 percentile rank:
              </p>
              <div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
                {Object.entries(indexData.weights).map(([k, w]) => (
                  <span key={k} className="border border-[var(--rule)] bg-[var(--panel)] px-2 py-1">
                    <strong>{k}</strong>: {(w * 100).toFixed(0)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Performance Index Table */}
          {indexLoading ? (
            <div className="py-16 text-center border border-[var(--rule)] bg-[var(--paper)] animate-pulse">
              <span className="font-disp font-bold text-lg text-[var(--ink)]">Computing Performance Ratings...</span>
            </div>
          ) : indexData?.leaders ? (
            <div className="overflow-x-auto border-t border-[var(--ink)]">
              <table className="w-full min-w-[700px] border-collapse text-xs font-ser">
                <thead>
                  <tr className="border-b border-[var(--ink)]">
                    <th className="text-left py-2 px-2.5 w-14 font-semibold text-[var(--ink)]">Rank</th>
                    <th className="text-left py-2 px-2.5 font-semibold text-[var(--ink)]">Player & Club</th>
                    <th className="text-left py-2 px-2 font-semibold text-[var(--ink)]">League</th>
                    <th className="text-center py-2 px-2 font-semibold text-[var(--ink)]">Pos</th>
                    <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Age</th>
                    <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Minutes</th>
                    <th className="text-right py-2 px-3 font-semibold text-[var(--ink)] text-sm">Rating (0–100)</th>
                    <th className="text-center py-2 px-2 w-24 font-semibold text-[var(--ink)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {indexData.leaders.map((p, idx) => {
                    const rating = Number(p.performance_index || 0);
                    const isSelected = compareList.some(c => (c.id || c.Player) === (p.id || p.Player));

                    return (
                      <tr
                        key={p.id || p.Player}
                        onClick={() => onSelectPlayer && onSelectPlayer(p)}
                        className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                      >
                        <td className="py-2.5 px-2.5 dotted-rule font-disp font-bold text-sm text-[var(--mute)]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-2.5 dotted-rule">
                          <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] block">
                            {p.Player}
                          </span>
                          <span className="text-[11px] text-[var(--mute)] block font-normal">
                            {p.Squad}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 dotted-rule text-[var(--mute)]">
                          {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                        </td>
                        <td className="py-2.5 px-2 dotted-rule text-center font-mono text-[11px]">
                          {p.Pos}
                        </td>
                        <td className="py-2.5 px-2 dotted-rule text-right font-mono">
                          {p.Age || '—'}
                        </td>
                        <td className="py-2.5 px-2 dotted-rule text-right font-mono">
                          {p.Min ? formatMinutes(p.Min) : '—'}
                        </td>
                        <td className="py-2.5 px-3 dotted-rule text-right font-disp font-bold text-xl text-[var(--ink)]">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-[var(--paper)] h-2 border border-[var(--rule)] overflow-hidden hidden sm:block">
                              <div className="h-full bg-[var(--blue)]" style={{ width: `${rating}%` }} />
                            </div>
                            <span>{rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-2 dotted-rule text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToCompare && onAddToCompare(p);
                            }}
                            className={`text-[10px] px-2 py-0.5 border rounded-xs ${
                              isSelected ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]'
                            }`}
                          >
                            {isSelected ? '✓ In Compare' : '+ Compare'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* VIEW MODE: CATEGORY STAT LEADERS */}
      {viewMode === 'metrics' && (
        <>
          {loading ? (
            <div className="py-24 text-center border border-[var(--rule)] bg-[var(--paper)] animate-pulse">
              <span className="font-disp font-bold text-xl text-[var(--ink)]">Inspecting Continental Podiums...</span>
            </div>
          ) : (
            <>
              {/* 2. Podium (Top 3) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {podium.map((p, idx) => {
                  const val = p[queryMetric];
                  const isSelected = compareList.some(c => (c.id || c.Player) === (p.id || p.Player));

                  return (
                    <div
                      key={p.id || p.Player}
                      onClick={() => onSelectPlayer && onSelectPlayer(p)}
                      className={`relative border-2 border-[var(--ink)] p-5 bg-[var(--paper)] hover:bg-[var(--panel)] transition-all cursor-pointer rounded-xs flex flex-col justify-between ${
                        idx === 0 ? 'md:-translate-y-2 shadow-md' : ''
                      }`}
                    >
                      {/* Rank badge */}
                      <div className="flex items-center justify-between mb-3 border-b border-[var(--ink)] pb-2">
                        <span className="font-disp font-black text-2xl text-[var(--ink)]">
                          {idx === 0 ? '1st' : idx === 1 ? '2nd' : '3rd'}
                        </span>
                        <span className="text-xs uppercase font-disp font-bold tracking-widest text-[var(--mute)]">
                          {p.Pos} • {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                        </span>
                      </div>

                      {/* Main figure */}
                      <div className="mb-4">
                        <div className="font-disp font-black text-6xl text-[var(--ink)] leading-none">
                          {isPer90 ? formatDecimal(val, 2) : formatNumber(val)}
                        </div>
                        <span className="text-xs italic text-[var(--mute)] block mt-1">
                          {activeMetricObj.label} {isPer90 ? 'per 90' : 'season total'}
                        </span>
                      </div>

                      {/* Player info */}
                      <div className="mb-4">
                        <h3 className="font-disp font-extrabold text-2xl text-[var(--ink)] leading-tight">
                          {p.Player}
                        </h3>
                        <span className="text-sm font-semibold text-[var(--ink)] block mt-0.5">
                          {p.Squad}
                        </span>
                      </div>

                      {/* 3 Supporting Figures: Mins, xG, Assists */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--rule)] text-xs font-ser">
                        <div>
                          <span className="text-[10px] text-[var(--mute)] block">Minutes</span>
                          <span className="font-semibold text-[var(--ink)] font-mono">
                            {p.Min ? formatMinutes(p.Min) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--mute)] block">xG</span>
                          <span className="font-semibold text-[var(--ink)] font-mono">
                            {formatDecimal(p.xG, 1)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[var(--mute)] block">Assists</span>
                          <span className="font-semibold text-[var(--ink)] font-mono">
                            {p.Ast ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Compare Action */}
                      <div className="mt-3 pt-2 border-t border-[var(--rule)] flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCompare && onAddToCompare(p);
                          }}
                          className={`text-xs px-2.5 py-1 border rounded-xs font-ser ${
                            isSelected 
                              ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' 
                              : 'hover:bg-[var(--panel)] border-[var(--rule)] text-[var(--ink)]'
                          }`}
                        >
                          {isSelected ? '✓ In Compare' : '+ Add to Compare'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 3. Ranks 4 to 20 Presentation */}
              {remaining.length > 0 && (
                <div className="space-y-3 pt-4 border-t-2 border-[var(--ink)]">
                  <h3 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight">
                    Ranks 4 through {rankedLeaders.length}
                  </h3>

                  <div className="overflow-x-auto border-t border-[var(--ink)]">
                    <table className="w-full min-w-[700px] border-collapse text-xs font-ser">
                      <thead>
                        <tr className="border-b border-[var(--ink)]">
                          <th className="text-left py-2 px-2.5 w-14 font-semibold text-[var(--ink)]">Rank</th>
                          <th className="text-left py-2 px-2.5 font-semibold text-[var(--ink)]">Player & Club</th>
                          <th className="text-left py-2 px-2 font-semibold text-[var(--ink)]">League</th>
                          <th className="text-center py-2 px-2 font-semibold text-[var(--ink)]">Pos</th>
                          <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Playing Time</th>
                          <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">xG</th>
                          <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Assists</th>
                          <th className="text-right py-2 px-3 font-semibold text-[var(--ink)] text-sm">{activeMetricObj.label}{isPer90 ? " / 90" : ""}</th>
                          <th className="text-center py-2 px-2 w-24 font-semibold text-[var(--ink)]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {remaining.map((p) => {
                          const mainVal = p[queryMetric];
                          const isSelected = compareList.some(c => (c.id || c.Player) === (p.id || p.Player));

                          return (
                            <tr
                              key={p.id || p.Player}
                              onClick={() => onSelectPlayer && onSelectPlayer(p)}
                              className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                            >
                              <td className="py-2.5 px-2.5 dotted-rule font-disp font-bold text-sm text-[var(--mute)]">
                                {p.rankDisplay}
                              </td>
                              <td className="py-2.5 px-2.5 dotted-rule">
                                <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] block">
                                  {p.Player}
                                </span>
                                <span className="text-[11px] text-[var(--mute)] block font-normal">
                                  {p.Squad}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 dotted-rule text-[var(--mute)]">
                                {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                              </td>
                              <td className="py-2.5 px-2 dotted-rule text-center font-mono text-[11px]">
                                {p.Pos}
                              </td>
                              <td className="py-2.5 px-2 dotted-rule text-right font-mono">
                                {p.Min ? formatMinutes(p.Min) : '—'}
                              </td>
                              <td className="py-2.5 px-2 dotted-rule text-right text-[var(--mute)] font-mono">
                                {formatDecimal(p.xG, 1)}
                              </td>
                              <td className="py-2.5 px-2 dotted-rule text-right font-mono font-semibold">
                                {p.Ast ?? 0}
                              </td>
                              <td className="py-2.5 px-3 dotted-rule text-right font-disp font-bold text-xl text-[var(--ink)]">
                                {isPer90 ? formatDecimal(mainVal, 2) : formatNumber(mainVal)}
                              </td>
                              <td className="py-2.5 px-2 dotted-rule text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToCompare && onAddToCompare(p);
                                  }}
                                  className={`text-[10px] px-2 py-0.5 border rounded-xs ${
                                    isSelected ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]'
                                  }`}
                                >
                                  {isSelected ? '✓ In Compare' : '+ Compare'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardsView;
