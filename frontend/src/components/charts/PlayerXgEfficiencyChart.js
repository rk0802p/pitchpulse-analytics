import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Search, TrendingUp, RotateCcw } from 'lucide-react';
import api from '../../services/api';

const FEATURED_PLAYERS = [
  'Kylian Mbappé',
  'Mohamed Salah',
  'Erling Haaland',
  'Harry Kane',
  'Robert Lewandowski',
  'Lionel Messi',
];

const formatSigned = (val, decimals = 2) => {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  const n = Number(val);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}`;
};

const formatNum = (val, decimals = 2) => {
  if (val === null || val === undefined || !Number.isFinite(Number(val))) return '—';
  return Number(val).toFixed(decimals);
};

const CustomTooltip = ({ active, payload, mode }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;

  const isPer90 = mode === 'per90';
  const xVal = isPer90 ? d.xG_90 : d.xG;
  const yVal = isPer90 ? d.Gls_90 : d.Gls;
  const delta = isPer90
    ? (Number.isFinite(d.Gls_90) && Number.isFinite(d.xG_90) ? d.Gls_90 - d.xG_90 : null)
    : d.Gls_minus_xG;
  const isOver = delta !== null && delta > 0.05;
  const isUnder = delta !== null && delta < -0.05;

  return (
    <div
      className="border-2 border-[var(--ink)] bg-[var(--paper)] px-3.5 py-2.5 shadow-md text-xs font-ser"
      style={{ minWidth: 225 }}
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-[var(--rule)] pb-1.5 mb-2">
        <span className="font-disp font-extrabold text-sm text-[var(--ink)]">
          Vol. {d.season}
        </span>
        <span className="font-mono text-[11px] text-[var(--mute)]">
          {d.Min?.toLocaleString() || 0} min · {d.MP || 0} MP
        </span>
      </div>

      <div className="text-[11px] text-[var(--ink)] font-semibold mb-0.5">
        {d.Squad}
      </div>
      <div className="text-[11px] italic text-[var(--mute)] mb-2">
        {d.competition_name}
        {d.spells_count > 1 ? ` (${d.spells_count} club spells combined)` : ''}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] border-t border-[var(--rule)] pt-2">
        <span className="text-[var(--mute)]">{isPer90 ? 'Goals / 90' : 'Actual Goals'}</span>
        <span className="text-right font-bold text-[var(--ink)]">
          {isPer90 ? formatNum(yVal, 2) : yVal}
        </span>

        <span className="text-[var(--mute)]">{isPer90 ? 'xG / 90' : 'Expected Goals'}</span>
        <span className="text-right font-bold text-[var(--ink)]">
          {formatNum(xVal, 2)}
        </span>

        <span className="text-[var(--mute)]">{isPer90 ? 'Delta / 90' : 'Goals − xG'}</span>
        <span
          className={`text-right font-bold ${
            isOver ? 'text-[var(--blue)]' : isUnder ? 'text-[var(--red)]' : 'text-[var(--ink)]'
          }`}
        >
          {formatSigned(delta, 2)}
        </span>

        <span className="text-[var(--mute)]">Conversion</span>
        <span className="text-right font-semibold text-[var(--ink)]">
          {d.efficiency_pct !== null && d.efficiency_pct !== undefined
            ? `${d.efficiency_pct.toFixed(1)}%`
            : '—'}
        </span>
      </div>
    </div>
  );
};

export default function PlayerXgEfficiencyChart({
  playerId = null,
  playerName = null,
  activeSeason = '2024-2025',
  preloadedHistory = null,
  allowPlayerSwitch = false,
  onSelectSeason = null,
}) {
  const [selectedQuery, setSelectedQuery] = useState(playerId || playerName || 'Kylian Mbappé');
  const [searchInput, setSearchInput] = useState('');
  const [searchMatches, setSearchMatches] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const [historyData, setHistoryData] = useState(preloadedHistory);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [selectedSeasons, setSelectedSeasons] = useState([]);
  const [metricMode, setMetricMode] = useState('totals'); // 'totals' | 'per90'

  // Sync external player props when controlled (e.g. PlayerProfileView)
  useEffect(() => {
    if (!allowPlayerSwitch) {
      if (playerId || playerName) {
        setSelectedQuery(playerId || playerName);
      }
    }
  }, [playerId, playerName, allowPlayerSwitch]);

  // Sync preloaded history if passed from parent
  useEffect(() => {
    if (preloadedHistory) {
      setHistoryData(preloadedHistory);
    }
  }, [preloadedHistory]);

  // Fetch player multi-season history when not preloaded or when user switches player
  useEffect(() => {
    if (!selectedQuery) return;
    if (preloadedHistory && !allowPlayerSwitch) return;
    if (typeof api.getPlayerHistory !== 'function') return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getPlayerHistory(selectedQuery, { season: activeSeason })
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data || res;
        if (payload?.seasons) {
          setHistoryData(payload);
        } else {
          setHistoryData(null);
          setError('No multi-season history available for this player.');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setHistoryData(null);
        setError(err?.message || 'Unable to load player xG history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedQuery, activeSeason, preloadedHistory, allowPlayerSwitch]);

  // Initialize selected seasons whenever a new player's history loads (default to all xG-tracked seasons)
  useEffect(() => {
    if (!historyData?.seasons) {
      setSelectedSeasons([]);
      return;
    }
    const tracked = historyData.seasons
      .filter((s) => s.is_xg_tracked)
      .map((s) => s.season);
    setSelectedSeasons(tracked);
  }, [historyData]);

  // Live player search when standalone selector is enabled
  useEffect(() => {
    if (!allowPlayerSwitch || typeof api.getPlayers !== 'function') return undefined;
    const term = searchInput.trim();
    if (term.length < 2) {
      setSearchMatches([]);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      api
        .getPlayers({ search: term, season: activeSeason, limit: 8, sort_by: 'Gls', order: 'desc' })
        .then((res) => {
          const items = Array.isArray(res?.data) ? res.data : [];
          // Deduplicate by player name
          const seen = new Set();
          const unique = [];
          for (const item of items) {
            const key = (item.Player || '').toLowerCase();
            if (key && !seen.has(key)) {
              seen.add(key);
              unique.push(item);
            }
          }
          setSearchMatches(unique);
        })
        .catch(() => setSearchMatches([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput, activeSeason, allowPlayerSwitch]);

  const allSeasons = useMemo(() => historyData?.seasons || [], [historyData]);
  const trackedSeasons = useMemo(
    () => allSeasons.filter((s) => s.is_xg_tracked),
    [allSeasons]
  );
  const untrackedSeasons = useMemo(
    () => allSeasons.filter((s) => !s.is_xg_tracked),
    [allSeasons]
  );

  const toggleSeason = useCallback((seasonId) => {
    setSelectedSeasons((prev) =>
      prev.includes(seasonId)
        ? prev.filter((s) => s !== seasonId)
        : [...prev, seasonId].sort()
    );
  }, []);

  const selectPreset = useCallback(
    (preset) => {
      const ids = trackedSeasons.map((s) => s.season);
      if (preset === 'all') setSelectedSeasons(ids);
      else if (preset === 'last5') setSelectedSeasons(ids.slice(-5));
      else if (preset === 'last3') setSelectedSeasons(ids.slice(-3));
    },
    [trackedSeasons]
  );

  // Build Recharts scatter dataset from selected seasons
  const chartPoints = useMemo(() => {
    const selectedSet = new Set(selectedSeasons);
    return trackedSeasons
      .filter((s) => selectedSet.has(s.season))
      .map((s) => ({
        ...s,
        xVal: metricMode === 'per90' ? s.xG_90 : s.xG,
        yVal: metricMode === 'per90' ? s.Gls_90 : s.Gls,
        zVal: Math.max(90, s.Min || 90),
      }))
      .filter((p) => Number.isFinite(p.xVal) && Number.isFinite(p.yVal));
  }, [trackedSeasons, selectedSeasons, metricMode]);

  // Square axis domain [0, axisMax] so the y = x parity line sits on an exact 45-degree diagonal
  const axisMax = useMemo(() => {
    if (chartPoints.length === 0) return metricMode === 'per90' ? 1.2 : 30;
    const rawMax = Math.max(
      ...chartPoints.map((p) => Math.max(p.xVal || 0, p.yVal || 0))
    );
    if (metricMode === 'per90') {
      return Math.max(0.5, Math.ceil((rawMax + 0.12) * 5) / 5);
    }
    const step = rawMax > 25 ? 5 : rawMax > 10 ? 2 : 1;
    return Math.max(5, Math.ceil((rawMax + step * 0.75) / step) * step);
  }, [chartPoints, metricMode]);

  // Aggregate efficiency KPIs across selected seasons
  const summary = useMemo(() => {
    if (chartPoints.length === 0) {
      return { seasonsCount: 0, totalGoals: 0, totalXg: 0, delta: 0, conversionPct: null, totalMinutes: 0 };
    }
    const totalGoals = chartPoints.reduce((acc, p) => acc + (p.Gls || 0), 0);
    const totalXg = chartPoints.reduce((acc, p) => acc + (p.xG || 0), 0);
    const totalMinutes = chartPoints.reduce((acc, p) => acc + (p.Min || 0), 0);
    const delta = totalGoals - totalXg;
    const conversionPct = totalXg > 0 ? (totalGoals / totalXg) * 100 : null;
    return {
      seasonsCount: chartPoints.length,
      totalGoals,
      totalXg,
      delta,
      conversionPct,
      totalMinutes,
    };
  }, [chartPoints]);

  const getPointFill = (entry) => {
    const delta =
      metricMode === 'per90'
        ? (entry.Gls_90 || 0) - (entry.xG_90 || 0)
        : entry.Gls_minus_xG || 0;
    const threshold = metricMode === 'per90' ? 0.04 : 0.4;
    if (delta > threshold) return 'var(--blue)';
    if (delta < -threshold) return 'var(--red)';
    return 'var(--ink)';
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const cleaned = searchInput.trim();
    if (!cleaned) return;
    setSelectedQuery(cleaned);
    setSearchOpen(false);
  };

  const displayName = historyData?.player_name || playerName || selectedQuery;

  return (
    <section
      aria-label="Player Expected Goals vs Actual Goals Efficiency Scatter Plot"
      className="border border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-6 rounded-xs space-y-5 font-ser"
    >
      {/* Header Row */}
      <div className="border-b border-[var(--ink)] pb-3 flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-disp font-bold uppercase tracking-widest text-[var(--mute)]">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--blue)]" />
            <span>Recharts Efficiency Ledger · xG vs. Actual Goals</span>
          </div>
          <h3 className="font-disp font-extrabold text-2xl sm:text-3xl text-[var(--ink)] leading-tight mt-0.5">
            {displayName} — Multi-Season Finishing Efficiency
          </h3>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Each marker plots one league campaign. Points above the dashed diagonal (Goals = xG) outperformed chance quality; bubble area scales with minutes played.
          </p>
        </div>

        {/* Mode Toggle: Totals vs Per-90 */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMetricMode('totals')}
            className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
              metricMode === 'totals'
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                : 'border-[var(--rule)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--ink)]'
            }`}
          >
            Season Totals
          </button>
          <button
            type="button"
            onClick={() => setMetricMode('per90')}
            className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
              metricMode === 'per90'
                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                : 'border-[var(--rule)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--ink)]'
            }`}
          >
            Per 90 Rates
          </button>
        </div>
      </div>

      {/* Optional Player Switcher (for standalone Scatter Plots tab) */}
      {allowPlayerSwitch && (
        <div className="bg-[var(--panel)] border border-[var(--rule)] p-3.5 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search any player across 2012–2026 (e.g. Vinicius, Lautaro, Messi)..."
                aria-label="Search player for xG efficiency scatter plot"
                className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--paper)] pl-8 pr-20 py-1.5 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[var(--mute)] absolute left-2.5 top-2" />
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-2.5 text-[11px] font-mono uppercase bg-[var(--ink)] text-[var(--paper)] hover:opacity-90"
              >
                Plot
              </button>

              {searchOpen && searchMatches.length > 0 && (
                <div
                  role="listbox"
                  className="absolute z-30 left-0 right-0 top-full mt-0.5 border border-[var(--ink)] bg-[var(--paper)] shadow-lg max-h-56 overflow-y-auto"
                >
                  {searchMatches.map((m) => (
                    <button
                      key={`${m.id}-${m.Player}`}
                      type="button"
                      onClick={() => {
                        setSelectedQuery(m.Player);
                        setSearchInput(m.Player);
                        setSearchOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--panel)] flex items-center justify-between border-b border-[var(--rule)] last:border-b-0"
                    >
                      <span className="font-semibold text-[var(--ink)]">{m.Player}</span>
                      <span className="text-[11px] text-[var(--mute)]">
                        {m.Squad} · {m.Gls}G
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-disp font-bold uppercase tracking-wider text-[var(--mute)] mr-1">
                Quick Profiles:
              </span>
              {FEATURED_PLAYERS.map((name) => {
                const isCurrent = displayName?.toLowerCase() === name.toLowerCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedQuery(name);
                      setSearchInput('');
                      setSearchOpen(false);
                    }}
                    className={`px-2 py-0.5 text-[11px] border transition-colors ${
                      isCurrent
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                        : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Multi-Season Selection Controls */}
      {allSeasons.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-disp font-bold uppercase tracking-wider text-[var(--ink)]">
              Select Seasons to Plot ({selectedSeasons.length} of {trackedSeasons.length} xG-tracked)
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => selectPreset('all')}
                className="px-2 py-0.5 border border-[var(--rule)] bg-[var(--panel)] hover:border-[var(--ink)] text-[var(--ink)]"
              >
                All xG
              </button>
              {trackedSeasons.length > 5 && (
                <button
                  type="button"
                  onClick={() => selectPreset('last5')}
                  className="px-2 py-0.5 border border-[var(--rule)] bg-[var(--panel)] hover:border-[var(--ink)] text-[var(--ink)]"
                >
                  Last 5
                </button>
              )}
              {trackedSeasons.length > 3 && (
                <button
                  type="button"
                  onClick={() => selectPreset('last3')}
                  className="px-2 py-0.5 border border-[var(--rule)] bg-[var(--panel)] hover:border-[var(--ink)] text-[var(--ink)]"
                >
                  Last 3
                </button>
              )}
              <button
                type="button"
                onClick={() => selectPreset('all')}
                title="Reset season selection"
                className="p-1 border border-[var(--rule)] bg-[var(--panel)] hover:border-[var(--ink)] text-[var(--mute)] hover:text-[var(--ink)]"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {allSeasons.map((rec) => {
              const isTracked = rec.is_xg_tracked;
              const isSelected = selectedSeasons.includes(rec.season);
              const isActive = rec.season === activeSeason;
              return (
                <button
                  key={rec.season}
                  type="button"
                  disabled={!isTracked}
                  onClick={() => toggleSeason(rec.season)}
                  title={
                    isTracked
                      ? `${rec.season} (${rec.Squad}): ${rec.Gls} goals vs ${formatNum(rec.xG, 2)} xG`
                      : `${rec.season} (${rec.Squad}): xG not tracked in source archive`
                  }
                  className={`px-2.5 py-1 text-[11px] font-mono border transition-colors ${
                    !isTracked
                      ? 'border-dashed border-[var(--rule)] bg-transparent text-[var(--mute)] opacity-55 cursor-not-allowed'
                      : isSelected
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-semibold'
                      : 'border-[var(--rule)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--ink)]'
                  } ${isActive && isTracked ? 'ring-1 ring-[var(--blue)] ring-offset-1' : ''}`}
                >
                  {rec.season_short}
                  {!isTracked ? ' · no xG' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Summary Strip across Selected Seasons */}
      {!loading && !error && chartPoints.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="border border-[var(--rule)] bg-[var(--panel)] px-3.5 py-2.5">
            <span className="block text-[10px] font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Selected Campaigns
            </span>
            <div className="font-disp font-extrabold text-2xl text-[var(--ink)] tabular-nums leading-tight mt-0.5">
              {summary.seasonsCount}
            </div>
            <span className="text-[11px] font-mono text-[var(--mute)]">
              {summary.totalMinutes.toLocaleString()} total mins
            </span>
          </div>

          <div className="border border-[var(--rule)] bg-[var(--panel)] px-3.5 py-2.5">
            <span className="block text-[10px] font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Actual Goals Scored
            </span>
            <div className="font-disp font-extrabold text-2xl text-[var(--ink)] tabular-nums leading-tight mt-0.5">
              {summary.totalGoals}
            </div>
            <span className="text-[11px] font-mono text-[var(--mute)]">
              {summary.totalMinutes > 0
                ? `${((summary.totalGoals / summary.totalMinutes) * 90).toFixed(2)} per 90`
                : '—'}
            </span>
          </div>

          <div className="border border-[var(--rule)] bg-[var(--panel)] px-3.5 py-2.5">
            <span className="block text-[10px] font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Expected Goals (xG)
            </span>
            <div className="font-disp font-extrabold text-2xl text-[var(--ink)] tabular-nums leading-tight mt-0.5">
              {summary.totalXg.toFixed(1)}
            </div>
            <span className="text-[11px] font-mono text-[var(--mute)]">
              {summary.totalMinutes > 0
                ? `${((summary.totalXg / summary.totalMinutes) * 90).toFixed(2)} per 90`
                : '—'}
            </span>
          </div>

          <div className="border border-[var(--rule)] bg-[var(--panel)] px-3.5 py-2.5">
            <span className="block text-[10px] font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Finishing Efficiency
            </span>
            <div
              className={`font-disp font-extrabold text-2xl tabular-nums leading-tight mt-0.5 ${
                summary.delta > 0.4
                  ? 'text-[var(--blue)]'
                  : summary.delta < -0.4
                  ? 'text-[var(--red)]'
                  : 'text-[var(--ink)]'
              }`}
            >
              {formatSigned(summary.delta, 1)}
            </div>
            <span className="text-[11px] font-mono text-[var(--mute)]">
              {summary.conversionPct !== null
                ? `${summary.conversionPct.toFixed(1)}% G/xG ratio`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Recharts Scatter Canvas */}
      {loading ? (
        <div className="h-[360px] border border-[var(--rule)] bg-[var(--panel)] flex items-center justify-center animate-pulse">
          <span className="font-mono text-xs text-[var(--mute)]">
            Loading multi-season xG records for {selectedQuery}...
          </span>
        </div>
      ) : error ? (
        <div className="border border-[var(--rule)] bg-[var(--panel)] p-8 text-center text-xs text-[var(--red)]">
          {error}
        </div>
      ) : chartPoints.length === 0 ? (
        <div className="border border-dashed border-[var(--rule)] bg-[var(--panel)] p-10 text-center text-xs italic text-[var(--mute)]">
          {trackedSeasons.length === 0
            ? `No tracked Expected Goals (xG) records exist for ${displayName} in the archive.`
            : 'Select at least one xG-tracked season above to plot efficiency.'}
        </div>
      ) : (
        <div className="border border-[var(--rule)] bg-[var(--panel)]/40 pt-4 pr-4 pb-2 pl-1">
          <div className="w-full h-[370px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 22, right: 28, bottom: 26, left: 12 }}>
                <CartesianGrid stroke="var(--rule)" strokeDasharray="3 3" strokeOpacity={0.75} />
                <XAxis
                  type="number"
                  dataKey="xVal"
                  name={metricMode === 'per90' ? 'xG per 90' : 'Expected Goals (xG)'}
                  domain={[0, axisMax]}
                  tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: 'monospace' }}
                  stroke="var(--ink)"
                  label={{
                    value:
                      metricMode === 'per90'
                        ? 'Expected Goals per 90 (xG/90)'
                        : 'Expected Goals (xG)',
                    position: 'insideBottom',
                    offset: -14,
                    fill: 'var(--ink)',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="yVal"
                  name={metricMode === 'per90' ? 'Goals per 90' : 'Actual Goals'}
                  domain={[0, axisMax]}
                  tick={{ fill: 'var(--mute)', fontSize: 11, fontFamily: 'monospace' }}
                  stroke="var(--ink)"
                  label={{
                    value:
                      metricMode === 'per90'
                        ? 'Actual Goals per 90 (Gls/90)'
                        : 'Actual Goals Scored (Gls)',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 4,
                    style: { textAnchor: 'middle', fill: 'var(--ink)', fontSize: 11, fontWeight: 700 },
                  }}
                />
                <ZAxis type="number" dataKey="zVal" range={[95, 340]} name="Minutes" />

                {/* Diagonal Efficiency Parity Reference Line: y = x (Goals = xG) */}
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: axisMax, y: axisMax },
                  ]}
                  stroke="var(--ink)"
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                  strokeOpacity={0.65}
                  ifOverflow="extendDomain"
                />

                <Tooltip
                  cursor={{ stroke: 'var(--mute)', strokeDasharray: '3 3' }}
                  content={<CustomTooltip mode={metricMode} />}
                />

                <Scatter
                  name={`${displayName} Seasons`}
                  data={chartPoints}
                  isAnimationActive={true}
                  animationDuration={450}
                  onClick={(node) => {
                    if (onSelectSeason && node?.season) {
                      onSelectSeason(node.season);
                    }
                  }}
                >
                  {chartPoints.map((entry) => {
                    const isCurrent = entry.season === activeSeason;
                    return (
                      <Cell
                        key={entry.season}
                        fill={getPointFill(entry)}
                        fillOpacity={isCurrent ? 0.95 : 0.78}
                        stroke={isCurrent ? 'var(--ink)' : 'var(--paper)'}
                        strokeWidth={isCurrent ? 2.5 : 1.5}
                        style={{ cursor: onSelectSeason ? 'pointer' : 'default' }}
                      />
                    );
                  })}
                  <LabelList
                    dataKey="season_short"
                    position="top"
                    offset={9}
                    style={{
                      fill: 'var(--ink)',
                      fontSize: 10,
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Editorial Legend & Provenance Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-[var(--rule)] text-[11px] text-[var(--mute)]">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--blue)]" />
                Overperforming xG (G &gt; xG)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[var(--red)]" />
                Underperforming xG (G &lt; xG)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-dashed border-[var(--ink)] opacity-70" />
                Parity line (Goals = xG)
              </span>
            </div>

            {untrackedSeasons.length > 0 && (
              <span className="italic">
                Excluded (xG not tracked): {untrackedSeasons.map((s) => s.season_short).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
