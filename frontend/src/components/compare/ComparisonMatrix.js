import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  X,
  Check,
  Copy,
  Link2,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import api from '../../services/api';
import {
  formatMinutes,
  formatDecimal,
  formatGoalsMinusXG,
} from '../../utils/metricFormatters';
import { serializeCompareHash } from '../../utils/hashRoute';
import { isPlayerInShortlist } from '../../utils/shortlistStore';
import CompareRadarChart, { COMPARE_PALETTE } from './CompareRadarChart';
import CompareEfficiencyChart from './CompareEfficiencyChart';

/**
 * Pure multi-player scouting verdict covering all 2 to 4 players in the dossier.
 */
export function generateMultiPlayerVerdict(players = []) {
  if (!Array.isArray(players) || players.length < 2) return null;

  const parts = [];
  const validNum = (v) => v !== null && v !== undefined && Number.isFinite(Number(v));

  // 1. Top goalscorer (and xG context when tracked)
  const byGoals = [...players].sort((a, b) => (Number(b.Gls) || 0) - (Number(a.Gls) || 0));
  const topScorer = byGoals[0];
  const secondScorer = byGoals[1];
  if ((Number(topScorer.Gls) || 0) > (Number(secondScorer.Gls) || 0)) {
    const xgText = validNum(topScorer.xG) ? ` from ${formatDecimal(topScorer.xG, 1)} xG` : '';
    parts.push(
      `${topScorer.Player} paces the ${players.length}-player group in goalscoring (${topScorer.Gls} Gls${xgText} vs ${secondScorer.Player}'s ${secondScorer.Gls})`
    );
  } else if ((Number(topScorer.Gls) || 0) > 0) {
    parts.push(`${topScorer.Player} and ${secondScorer.Player} share the scoring lead (${topScorer.Gls} Gls each)`);
  }

  // 2. Most clinical finisher (G - xG) when tracked
  const xgPlayers = players.filter((p) => validNum(p.Gls_minus_xG));
  if (xgPlayers.length >= 2) {
    const byDelta = [...xgPlayers].sort((a, b) => Number(b.Gls_minus_xG) - Number(a.Gls_minus_xG));
    const bestFin = byDelta[0];
    const deltaVal = Number(bestFin.Gls_minus_xG);
    if (deltaVal > 0.5 && deltaVal > Number(byDelta[1].Gls_minus_xG)) {
      parts.push(
        `${bestFin.Player} is the sharpest finisher (+${formatDecimal(deltaVal, 1)} G − xG)`
      );
    }
  }

  // 3. Chief creator (Assists / xAG)
  const byAst = [...players].sort((a, b) => (Number(b.Ast) || 0) - (Number(a.Ast) || 0));
  if ((Number(byAst[0].Ast) || 0) > (Number(byAst[1].Ast) || 0)) {
    const xagSuffix = validNum(byAst[0].xAG) ? ` (${formatDecimal(byAst[0].xAG, 1)} xAG)` : '';
    parts.push(
      `${byAst[0].Player} leads creative output with ${byAst[0].Ast} assists${xagSuffix}`
    );
  }

  // 4. Ball progression anchor (PrgC + PrgP) when tracked
  const progPlayers = players.filter((p) => validNum(p.PrgC) && validNum(p.PrgP));
  if (progPlayers.length >= 2) {
    const byProg = [...progPlayers].sort(
      (a, b) => (Number(b.PrgC) + Number(b.PrgP)) - (Number(a.PrgC) + Number(a.PrgP))
    );
    const topProg = Number(byProg[0].PrgC) + Number(byProg[0].PrgP);
    const secondProg = Number(byProg[1].PrgC) + Number(byProg[1].PrgP);
    if (topProg > secondProg + 15) {
      parts.push(
        `${byProg[0].Player} drives the most progressive territory (${topProg} vs ${secondProg} PrgC+PrgP)`
      );
    }
  }

  return parts.length > 0
    ? `${parts.join('; ')}.`
    : `All ${players.length} players post closely matched output across tracked attacking categories.`;
}

export const ComparisonMatrix = ({
  players = [],
  onRemovePlayer,
  onAddPlayer,
  onReplacePlayers,
  allAvailablePlayers = [],
  onSelectPlayer,
  shortlist = [],
  onToggleShortlist,
  activeSeason = '2024-2025',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [asyncResults, setAsyncResults] = useState([]);
  const [searchingDb, setSearchingDb] = useState(false);
  const [copiedVerdict, setCopiedVerdict] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState(false);
  const [compareTab, setCompareTab] = useState('raw'); // 'raw' | 'per90' | 'percentiles'

  // Backend enriched comparison payload (real positional radar percentiles & aligned metrics)
  const [comparePayload, setComparePayload] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const searchBoxRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Full-database debounced search across all 2,800+ players in activeSeason
  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setAsyncResults([]);
      setSearchingDb(false);
      return;
    }

    let cancelled = false;
    setSearchingDb(true);
    const timer = setTimeout(() => {
      const excludeSelected = (list) =>
        list.filter((p) => !players.some((sel) => (sel.id || sel.Player) === (p.id || p.Player)));

      if (api && typeof api.getPlayers === 'function') {
        api
          .getPlayers({
            season: activeSeason,
            search: trimmed,
            sort_by: 'Min',
            order: 'desc',
            limit: 10,
          })
          .then((res) => {
            if (cancelled) return;
            const rows = res?.success && Array.isArray(res.data) ? res.data : Array.isArray(res) ? res : [];
            setAsyncResults(excludeSelected(rows).slice(0, 8));
          })
          .catch(() => {
            if (cancelled) return;
            const q = trimmed.toLowerCase();
            const fallback = allAvailablePlayers.filter(
              (p) =>
                p.Player?.toLowerCase().includes(q) ||
                (p.Squad || '').toLowerCase().includes(q)
            );
            setAsyncResults(excludeSelected(fallback).slice(0, 8));
          })
          .finally(() => {
            if (!cancelled) setSearchingDb(false);
          });
      } else {
        const q = trimmed.toLowerCase();
        const fallback = allAvailablePlayers.filter((p) => p.Player?.toLowerCase().includes(q));
        setAsyncResults(excludeSelected(fallback).slice(0, 8));
        setSearchingDb(false);
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm, activeSeason, players, allAvailablePlayers]);

  // Fetch backend /api/players/compare payload whenever 2+ players are selected
  const playerIdsKey = players.map((p) => `${p.id ?? p.Player}@${p.season || activeSeason}`).join('|');

  useEffect(() => {
    if (players.length < 2 || !api || typeof api.comparePlayers !== 'function') {
      setComparePayload(null);
      setLoadingCompare(false);
      return;
    }

    let cancelled = false;
    setLoadingCompare(true);
    const ids = players.map((p) => p.id ?? p.Player);

    api
      .comparePlayers(ids, activeSeason)
      .then((res) => {
        if (cancelled) return;
        if (res && (Array.isArray(res.radar) || Array.isArray(res.metrics))) {
          setComparePayload(res);
        } else {
          setComparePayload(null);
        }
      })
      .catch(() => {
        if (!cancelled) setComparePayload(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCompare(false);
      });

    return () => {
      cancelled = true;
    };
  }, [playerIdsKey, activeSeason, players.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer hydrated players from backend compare payload when lengths match
  const displayPlayers =
    comparePayload?.players && comparePayload.players.length === players.length
      ? comparePayload.players
      : players;

  const rawMetrics = [
    { key: 'Gls', label: 'Goals Scored (Gls)', category: 'Scoring' },
    { key: 'xG', label: 'Expected Goals (xG)', category: 'Scoring', isDecimal: true },
    { key: 'npxG', label: 'Non-Penalty xG (npxG)', category: 'Scoring', isDecimal: true },
    { key: 'Gls_minus_xG', label: 'Finishing Delta (G − xG)', category: 'Scoring', isDelta: true },
    { key: 'Ast', label: 'Assists (Ast)', category: 'Playmaking' },
    { key: 'xAG', label: 'Expected Assists (xAG)', category: 'Playmaking', isDecimal: true },
    { key: 'PrgC', label: 'Progressive Carries', category: 'Progression' },
    { key: 'PrgP', label: 'Progressive Passes', category: 'Progression' },
    { key: 'PrgR', label: 'Progressive Receptions', category: 'Progression' },
    { key: 'MP', label: 'Matches (Apps)', category: 'Time' },
    { key: 'Min', label: 'Minutes Played', category: 'Time', isMinutes: true },
  ];

  const per90Metrics = [
    { key: 'Gls_90', label: 'Goals / 90', isDecimal: true },
    { key: 'xG_90', label: 'Shot Threat (xG / 90)', isDecimal: true },
    { key: 'npxG_90', label: 'Non-Penalty xG / 90', isDecimal: true },
    { key: 'Ast_90', label: 'Assists / 90', isDecimal: true },
    { key: 'xAG_90', label: 'Creation Quality (xAG / 90)', isDecimal: true },
    { key: 'G+A_90', label: 'Goal Involvements (G+A / 90)', isDecimal: true },
  ];

  const verdict = generateMultiPlayerVerdict(displayPlayers);

  const handleCopySummary = () => {
    if (!verdict || !navigator.clipboard) return;
    navigator.clipboard
      .writeText(`PitchPulse Comparison (${displayPlayers.map((p) => p.Player).join(' vs ')}): ${verdict}`)
      .catch(() => {});
    setCopiedVerdict(true);
    setTimeout(() => setCopiedVerdict(false), 2000);
  };

  const handleCopyShareLink = () => {
    const hash = serializeCompareHash({
      season: activeSeason,
      ids: displayPlayers.map((p) => p.id ?? p.Player),
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}${hash}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleLoadTopPreset = (sortMetric = 'Gls', count = 3) => {
    if (!api || typeof api.getPlayers !== 'function') return;
    setLoadingPreset(true);
    api
      .getPlayers({ season: activeSeason, sort_by: sortMetric, order: 'desc', min_minutes: 900, limit: count })
      .then((res) => {
        const rows = res?.success && Array.isArray(res.data) ? res.data : [];
        if (rows.length >= 2) {
          if (onReplacePlayers) {
            onReplacePlayers(rows);
          } else if (onAddPlayer) {
            rows.forEach((p) => onAddPlayer(p));
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPreset(false));
  };

  return (
    <div className="space-y-7 font-ser not-italic">
      {/* 1. Header & Full-DB Search Bar */}
      <div className="border-b-2 border-[var(--ink)] pb-4 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
            Head-to-Head Scouting Dossier · Vol. {activeSeason}
          </span>
          <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
            Player Comparison
          </h2>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Search the full archive to juxtapose 2 to 4 players across volume totals, per-90 rates, and positional percentiles.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Full-DB Async Autocomplete Player Add */}
          <div className="relative w-full sm:w-80" ref={searchBoxRef}>
            <div className="relative">
              <input
                type="text"
                aria-label="Search full player archive to add to comparison"
                placeholder={
                  players.length >= 4
                    ? 'Maximum 4 players selected'
                    : 'Search full archive (2,800+ players)...'
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                disabled={players.length >= 4}
                className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-3 pr-8 text-xs font-ser text-[var(--ink)] placeholder:italic focus:outline-none focus:bg-[var(--panel)] disabled:opacity-50"
              />
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--mute)] pointer-events-none" />
            </div>

            {dropdownOpen && searchTerm.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-1 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-xl z-50 text-xs max-h-72 overflow-y-auto">
                {searchingDb ? (
                  <div className="px-3 py-3 text-center italic text-[var(--mute)]">
                    Searching full Vol. {activeSeason} archive...
                  </div>
                ) : asyncResults.length > 0 ? (
                  asyncResults.map((p) => (
                    <button
                      key={p.id || `${p.Player}-${p.Squad}`}
                      type="button"
                      onClick={() => {
                        if (onAddPlayer) onAddPlayer(p);
                        setSearchTerm('');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--panel)] flex justify-between items-center border-b border-[var(--rule)] last:border-b-0"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-[var(--ink)] block truncate">{p.Player}</span>
                        <span className="text-[11px] text-[var(--mute)] block truncate">
                          {p.Squad || p.Team} • {p.Pos} • {formatMinutes(p.Min)}
                        </span>
                      </div>
                      <span className="font-disp font-bold text-xs uppercase text-[var(--blue)] shrink-0">
                        + Add
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-3 text-center italic text-[var(--mute)]">
                    No matching players found in Vol. {activeSeason}.
                  </div>
                )}
              </div>
            )}
          </div>

          {displayPlayers.length >= 2 && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="border border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--panel)] px-3 py-1.5 text-xs font-mono uppercase text-[var(--ink)] flex items-center justify-center gap-1.5 shrink-0 transition-colors"
              title="Copy shareable comparison URL"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--blue)]" /> : <Link2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share Link'}</span>
            </button>
          )}
        </div>
      </div>

      {displayPlayers.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-[var(--rule)] p-8 bg-[var(--paper)] space-y-4">
          <Users className="w-10 h-10 mx-auto text-[var(--mute)] opacity-60" />
          <div>
            <p className="text-base font-bold text-[var(--ink)]">Add two to four players to build a comparison dossier.</p>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              Use the full-archive search box above, click "+ Compare" from any table, or load an instant Vol. {activeSeason} cohort below.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              disabled={loadingPreset}
              onClick={() => handleLoadTopPreset('Gls', 3)}
              className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-3.5 py-1.5 text-xs font-disp font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loadingPreset ? 'Loading...' : 'Compare Top 3 Goalscorers'}</span>
            </button>
            <button
              type="button"
              disabled={loadingPreset}
              onClick={() => handleLoadTopPreset('Ast', 3)}
              className="border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--panel)] px-3.5 py-1.5 text-xs font-disp font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Compare Top 3 Playmakers
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. Multi-Player Data-Driven Verdict Banner */}
          {verdict && (
            <div className="p-3.5 bg-[var(--panel)] border border-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-disp font-bold uppercase tracking-wider text-[var(--blue)] text-[11px] block">
                  Multi-Player Scouting Verdict ({displayPlayers.length} Players):
                </span>
                <p className="italic text-[var(--ink)] leading-snug">{verdict}</p>
              </div>
              <button
                type="button"
                onClick={handleCopySummary}
                className="self-start sm:self-auto border border-[var(--rule)] hover:border-[var(--ink)] px-2.5 py-1 text-xs italic bg-[var(--paper)] text-[var(--ink)] shrink-0 flex items-center gap-1"
              >
                {copiedVerdict ? <Check className="w-3 h-3 text-[var(--blue)]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedVerdict ? 'Copied' : 'Copy Verdict'}</span>
              </button>
            </div>
          )}

          {/* 3. Visual Charts Grid: Positional Percentile Radar + Goals vs xG Bar Chart */}
          {displayPlayers.length >= 2 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <CompareRadarChart
                players={displayPlayers}
                radar={comparePayload?.radar || []}
                loading={loadingCompare}
                activeSeason={activeSeason}
              />
              <CompareEfficiencyChart
                players={displayPlayers}
                activeSeason={activeSeason}
              />
            </div>
          )}

          {displayPlayers.length === 1 && (
            <div className="p-3 border border-dashed border-[var(--ink)] bg-[var(--panel)] text-xs italic text-[var(--mute)]">
              Add at least one more player using the search bar above to unlock the Positional Percentile Radar, Goals vs. xG Efficiency Chart, and Multi-Player Scouting Verdict.
            </div>
          )}

          {/* 4. View Mode Toggle (Totals | Per 90 | Positional Percentiles) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-2 text-xs">
            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Comparison metric view">
              <button
                type="button"
                role="tab"
                aria-selected={compareTab === 'raw'}
                onClick={() => setCompareTab('raw')}
                className={`font-disp font-bold text-xs uppercase px-3 py-1 border transition-colors ${
                  compareTab === 'raw'
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                    : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                Volume Totals
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={compareTab === 'per90'}
                onClick={() => setCompareTab('per90')}
                className={`font-disp font-bold text-xs uppercase px-3 py-1 border transition-colors ${
                  compareTab === 'per90'
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                    : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                Standardised Rates / 90
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={compareTab === 'percentiles'}
                onClick={() => setCompareTab('percentiles')}
                className={`font-disp font-bold text-xs uppercase px-3 py-1 border transition-colors ${
                  compareTab === 'percentiles'
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                    : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                Positional Percentiles
              </button>
            </div>
            <span className="text-[11px] italic text-[var(--mute)] hidden sm:inline">
              ★ Marks the cohort leader for each metric
            </span>
          </div>

          {/* 5. Comparison Matrix Table */}
          <div className="overflow-x-auto border-t border-[var(--ink)]">
            <table className="w-full min-w-[650px] border-collapse text-xs font-ser">
              <thead>
                <tr className="border-b-2 border-[var(--ink)] bg-[var(--panel)]">
                  <th className="text-left py-3 px-3 font-disp font-bold text-xs uppercase text-[var(--mute)] w-1/4">
                    Metric Category
                  </th>
                  {displayPlayers.map((p, idx) => {
                    const pal = COMPARE_PALETTE[idx % COMPARE_PALETTE.length];
                    const saved = isPlayerInShortlist(shortlist, p, activeSeason);
                    return (
                      <th key={p.id || idx} className="text-center py-3 px-3 relative border-l border-[var(--rule)]">
                        <div className="absolute top-2 right-2 flex items-center gap-1">
                          {onToggleShortlist && (
                            <button
                              type="button"
                              onClick={() => onToggleShortlist(p)}
                              className={`p-0.5 transition-colors ${saved ? 'text-[var(--blue)]' : 'text-[var(--mute)] hover:text-[var(--ink)]'}`}
                              aria-label={saved ? `Remove ${p.Player} from shortlist` : `Save ${p.Player} to shortlist`}
                              title={saved ? 'Saved in Shortlist' : 'Save to Shortlist'}
                            >
                              <Bookmark className="w-3.5 h-3.5" fill={saved ? 'currentColor' : 'none'} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onRemovePlayer && onRemovePlayer(p)}
                            className="text-[var(--mute)] hover:text-[var(--red)] p-0.5"
                            aria-label={`Remove ${p.Player} from comparison`}
                            title="Remove player"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="inline-flex items-center gap-1.5 mt-1">
                          <span className="w-2.5 h-2.5 inline-block shrink-0" style={{ backgroundColor: pal.stroke }} />
                          <button
                            type="button"
                            onClick={() => onSelectPlayer && onSelectPlayer(p)}
                            className="font-disp font-extrabold text-xl sm:text-2xl text-[var(--ink)] hover:text-[var(--blue)] leading-none text-left"
                          >
                            {p.Player}
                          </button>
                        </div>
                        <div className="text-[11px] italic text-[var(--mute)] mt-1 font-normal">
                          {p.Squad || p.Team} • {p.Pos} • Age {p.Age ?? '—'}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {compareTab === 'percentiles' ? (
                  (comparePayload?.radar || []).length > 0 ? (
                    comparePayload.radar.map((dim) => {
                      const scores = displayPlayers.map((p) => {
                        const val = dim.scores?.[String(p.id)] ?? dim.scores?.[p.comparison_key];
                        return val !== null && val !== undefined && Number.isFinite(Number(val)) ? Number(val) : -Infinity;
                      });
                      const maxScore = Math.max(...scores);

                      return (
                        <tr key={dim.key} className="hover:bg-[var(--panel)] transition-colors">
                          <td className="text-left py-2.5 px-3 dotted-rule font-medium text-[var(--ink)]">
                            <div>{dim.dimension}</div>
                            <span className="text-[10px] font-mono text-[var(--mute)]">vs. positional peers (≥270m)</span>
                          </td>
                          {displayPlayers.map((p, pIdx) => {
                            const idKey = String(p.id);
                            const pct = dim.scores?.[idKey] ?? dim.scores?.[p.comparison_key];
                            const raw = dim.values?.[idKey] ?? dim.values?.[p.comparison_key];
                            const tracked = pct !== null && pct !== undefined && Number.isFinite(Number(pct));
                            const isBest = tracked && scores.length > 1 && Number(pct) === maxScore && maxScore > 0;
                            const pal = COMPARE_PALETTE[pIdx % COMPARE_PALETTE.length];

                            return (
                              <td
                                key={p.id || pIdx}
                                className={`text-center py-2.5 px-3 dotted-rule border-l border-[var(--rule)] ${
                                  isBest ? 'bg-[var(--paper)] font-bold' : ''
                                }`}
                              >
                                {tracked ? (
                                  <div className="space-y-1 max-w-[160px] mx-auto">
                                    <div className="flex items-baseline justify-between font-mono text-xs tabular-nums">
                                      <span className={`font-disp text-base font-bold ${isBest ? 'text-[var(--blue)]' : 'text-[var(--ink)]'}`}>
                                        {Math.round(pct)}th{isBest ? ' ★' : ''}
                                      </span>
                                      <span className="text-[11px] text-[var(--mute)]">
                                        {dim.key.includes('_90') ? formatDecimal(raw, 2) : formatDecimal(raw, 0)}
                                      </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-[var(--panel)] border border-[var(--rule)] overflow-hidden">
                                      <div
                                        className="h-full"
                                        style={{ width: `${Math.max(2, Math.min(100, pct))}%`, backgroundColor: pal.stroke }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs text-[var(--mute)] italic">Untracked</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={displayPlayers.length + 1} className="py-8 text-center italic text-[var(--mute)]">
                        {loadingCompare
                          ? 'Computing positional peer percentiles...'
                          : 'Add at least 2 players to view positional percentile comparisons.'}
                      </td>
                    </tr>
                  )
                ) : (
                  (compareTab === 'raw' ? rawMetrics : per90Metrics).map((m) => {
                    const numValues = displayPlayers.map((p) => {
                      const raw = p[m.key];
                      if (raw === null || raw === undefined || !Number.isFinite(Number(raw))) return -Infinity;
                      return Number(raw);
                    });
                    const maxVal = Math.max(...numValues);

                    return (
                      <tr key={m.key} className="hover:bg-[var(--panel)] transition-colors">
                        <td className="text-left py-2.5 px-3 dotted-rule font-medium text-[var(--ink)]">
                          {m.label}
                        </td>

                        {displayPlayers.map((p, pIdx) => {
                          const rawVal = p[m.key];
                          const isValid = rawVal !== null && rawVal !== undefined && Number.isFinite(Number(rawVal));
                          const numVal = isValid ? Number(rawVal) : -Infinity;
                          const isBest =
                            isValid &&
                            numValues.length > 1 &&
                            numVal === maxVal &&
                            (m.isDelta ? maxVal > 0 : maxVal > 0);

                          return (
                            <td
                              key={p.id || pIdx}
                              className={`text-center py-2.5 px-3 dotted-rule border-l border-[var(--rule)] tabular-nums ${
                                isBest ? 'bg-[var(--paper)] font-bold text-[var(--blue)]' : 'text-[var(--ink)]'
                              }`}
                            >
                              <span className="font-disp text-lg">
                                {!isValid
                                  ? '—'
                                  : m.isMinutes
                                    ? formatMinutes(rawVal)
                                    : m.isDelta
                                      ? formatGoalsMinusXG(rawVal).text
                                      : m.isDecimal
                                        ? formatDecimal(rawVal, m.key.includes('90') ? 2 : 1)
                                        : rawVal}
                              </span>
                              {isBest && (
                                <span className="ml-1 text-[11px] font-bold text-[var(--blue)]" title="Cohort Leader">
                                  ★
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonMatrix;
