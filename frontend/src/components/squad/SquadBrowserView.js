import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Search,
  Bookmark,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';
import MetricTooltip from '../common/MetricTooltip';
import ClubEfficiencyScatter from './ClubEfficiencyScatter';
import SquadAgeMinutesChart from './SquadAgeMinutesChart';
import {
  formatMinutes,
  formatDecimal,
  formatGoalsMinusXG,
} from '../../utils/metricFormatters';
import { isPlayerInShortlist } from '../../utils/shortlistStore';

const LEAGUES = [
  { id: '', label: 'All Leagues', short: 'All' },
  { id: 'eng Premier League', label: 'Premier League', short: 'EPL' },
  { id: 'es La Liga', label: 'La Liga', short: 'La Liga' },
  { id: 'it Serie A', label: 'Serie A', short: 'Serie A' },
  { id: 'de Bundesliga', label: 'Bundesliga', short: 'Bundesliga' },
  { id: 'fr Ligue 1', label: 'Ligue 1', short: 'Ligue 1' },
];

const CLUB_SORTS = [
  { id: 'goals', label: 'Goals' },
  { id: 'xg', label: 'xG' },
  { id: 'delta', label: 'G − xG' },
  { id: 'age', label: 'Avg Age' },
  { id: 'alpha', label: 'A–Z' },
];

export const SquadBrowserView = ({
  activeSeason = '2024-2025',
  initialSquad = null,
  initialLeague = '',
  onSelectPlayer,
  onAddToCompare,
  compareList = [],
  shortlist = [],
  onToggleShortlist,
}) => {
  const [selectedLeague, setSelectedLeague] = useState(initialLeague);
  const [clubs, setClubs] = useState([]);
  const [clubSummaries, setClubSummaries] = useState([]);
  const [clubSort, setClubSort] = useState('goals');
  const [selectedClub, setSelectedClub] = useState(initialSquad);
  const [squadRoster, setSquadRoster] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [clubSearch, setClubSearch] = useState('');

  // Sync initial props
  useEffect(() => {
    if (initialLeague !== undefined) setSelectedLeague(initialLeague);
  }, [initialLeague]);

  useEffect(() => {
    if (initialSquad) setSelectedClub(initialSquad);
  }, [initialSquad]);

  // Fetch club efficiency rollups (and fallback to teams list if summary unavailable)
  useEffect(() => {
    let cancelled = false;
    setLoadingClubs(true);

    Promise.all([
      api.getClubSummary(selectedLeague || undefined, activeSeason).catch(() => null),
      api.getTeams(selectedLeague || undefined, activeSeason).catch(() => null),
    ])
      .then(([summaryRes, teamsRes]) => {
        if (cancelled) return;
        const summaryList =
          summaryRes?.success && Array.isArray(summaryRes.data)
            ? summaryRes.data
            : Array.isArray(summaryRes)
              ? summaryRes
              : [];

        const teamNames =
          teamsRes?.success && Array.isArray(teamsRes.data)
            ? teamsRes.data
            : Array.isArray(teamsRes)
              ? teamsRes
              : summaryList.map((c) => c.squad);

        setClubSummaries(summaryList);
        setClubs(teamNames);
      })
      .finally(() => {
        if (!cancelled) setLoadingClubs(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedLeague, activeSeason]);

  // Fetch squad roster when selectedClub or activeSeason changes
  useEffect(() => {
    if (!selectedClub) {
      setSquadRoster([]);
      return;
    }
    let cancelled = false;
    setLoadingRoster(true);
    api
      .getPlayers({
        season: activeSeason,
        squad: selectedClub,
        limit: 100,
        sort_by: 'Min',
        order: 'desc',
      })
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setSquadRoster(res.data);
        } else if (Array.isArray(res)) {
          setSquadRoster(res);
        } else {
          setSquadRoster([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load squad roster:', err);
        if (!cancelled) setSquadRoster([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingRoster(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClub, activeSeason]);

  // Build unified club cards from clubSummaries (or raw team names fallback)
  const directoryClubs = useMemo(() => {
    const base =
      clubSummaries.length > 0
        ? clubSummaries
        : clubs.map((c) => ({
            squad: typeof c === 'string' ? c : c.name || c.Squad || c.Team,
            short_league: '',
            goals: null,
            xg: null,
            finishing_delta: null,
            avg_age: null,
            players_count: null,
          }));

    const q = clubSearch.trim().toLowerCase();
    const filtered = q
      ? base.filter((c) => String(c.squad || '').toLowerCase().includes(q))
      : base;

    const sorted = [...filtered].sort((a, b) => {
      if (clubSort === 'alpha') {
        return String(a.squad || '').localeCompare(String(b.squad || ''));
      }
      if (clubSort === 'xg') {
        const av = a.xg !== null && a.xg !== undefined ? Number(a.xg) : -9999;
        const bv = b.xg !== null && b.xg !== undefined ? Number(b.xg) : -9999;
        return bv - av || (Number(b.goals) || 0) - (Number(a.goals) || 0);
      }
      if (clubSort === 'delta') {
        const av = a.finishing_delta !== null && a.finishing_delta !== undefined ? Number(a.finishing_delta) : -9999;
        const bv = b.finishing_delta !== null && b.finishing_delta !== undefined ? Number(b.finishing_delta) : -9999;
        return bv - av;
      }
      if (clubSort === 'age') {
        const av = a.avg_age !== null && a.avg_age !== undefined ? Number(a.avg_age) : 999;
        const bv = b.avg_age !== null && b.avg_age !== undefined ? Number(b.avg_age) : 999;
        return av - bv;
      }
      // Default: goals descending
      return (Number(b.goals) || 0) - (Number(a.goals) || 0) || String(a.squad || '').localeCompare(String(b.squad || ''));
    });

    return sorted;
  }, [clubSummaries, clubs, clubSearch, clubSort]);

  // Squad Aggregate Stats (excluding unsplit full-season transfer xG/xAG to avoid double-counting)
  const squadStats = useMemo(() => {
    if (!squadRoster || squadRoster.length === 0) {
      return {
        size: 0,
        goals: 0,
        assists: 0,
        xG: null,
        xAG: null,
        goalsMinusXG: null,
        weightedAvgAge: null,
        hasXg: false,
        sharedXgPlayers: [],
        minutes: 0,
        topScorer: null,
        topCreator: null,
        league: null,
      };
    }

    let goals = 0;
    let assists = 0;
    let xG = 0;
    let xAG = 0;
    let xGCount = 0;
    let goalsForXgDelta = 0;
    let minutes = 0;
    let ageWeightedSum = 0;
    let ageMinutesSum = 0;
    let maxGls = -1;
    let topScorer = null;
    let maxAst = -1;
    let topCreator = null;
    const league = squadRoster[0]?.Comp || '';
    const sharedXgPlayers = [];

    squadRoster.forEach((p) => {
      const g = Number(p.Gls) || 0;
      const a = Number(p.Ast) || 0;
      const isSharedXg = Boolean(p.shared_season_xg || p._shared_season_xg);
      const hasValidXg = p.xG !== null && p.xG !== undefined && Number.isFinite(Number(p.xG));
      const hasValidXag = p.xAG !== null && p.xAG !== undefined && Number.isFinite(Number(p.xAG));
      const m = Number(p.Min) || 0;
      const age = Number(p.Age);

      goals += g;
      assists += a;
      minutes += m;

      if (Number.isFinite(age) && age > 14 && age < 50 && m > 0) {
        ageWeightedSum += age * m;
        ageMinutesSum += m;
      }

      if (isSharedXg) {
        sharedXgPlayers.push(p.Player);
      } else {
        if (hasValidXg) {
          xG += Number(p.xG);
          goalsForXgDelta += g;
          xGCount += 1;
        }
        if (hasValidXag) {
          xAG += Number(p.xAG);
        }
      }

      if (g > maxGls && g > 0) {
        maxGls = g;
        topScorer = p;
      }
      if (a > maxAst && a > 0) {
        maxAst = a;
        topCreator = p;
      }
    });

    const hasXg = xGCount > 0;
    const roundedXg = hasXg ? parseFloat(xG.toFixed(1)) : null;
    const roundedXag = hasXg ? parseFloat(xAG.toFixed(1)) : null;
    const goalsMinusXG = hasXg ? parseFloat((goalsForXgDelta - xG).toFixed(1)) : null;
    const weightedAvgAge =
      ageMinutesSum > 0 ? parseFloat((ageWeightedSum / ageMinutesSum).toFixed(1)) : null;

    return {
      size: squadRoster.length,
      goals,
      assists,
      xG: roundedXg,
      xAG: roundedXag,
      goalsMinusXG,
      weightedAvgAge,
      hasXg,
      sharedXgPlayers,
      minutes,
      topScorer,
      topCreator,
      league,
    };
  }, [squadRoster]);

  // Position Groups: GK, DF, MF, FW
  const positionGroups = useMemo(() => {
    const groups = {
      GK: { label: 'Goalkeepers', players: [] },
      DF: { label: 'Defenders', players: [] },
      MF: { label: 'Midfielders', players: [] },
      FW: { label: 'Forwards & Attackers', players: [] },
    };

    squadRoster.forEach((p) => {
      const pos = (p.Pos || '').toUpperCase();
      if (pos.includes('GK')) {
        groups.GK.players.push(p);
      } else if (pos.includes('DF')) {
        groups.DF.players.push(p);
      } else if (pos.includes('MF')) {
        groups.MF.players.push(p);
      } else {
        groups.FW.players.push(p);
      }
    });

    return groups;
  }, [squadRoster]);

  const isPlayerCompared = (player) => {
    const id = player.id || player.Player;
    return compareList.some((p) => (p.id || p.Player) === id);
  };

  const activeLeagueLabel = selectedLeague
    ? selectedLeague.replace(/^[a-z]{2,3}\s+/, '')
    : 'Big 5 Leagues';

  const clubDropdownOptions = useMemo(() => {
    const list = clubs.map((c) => (typeof c === 'string' ? c : c.name || c.Squad || c.Team));
    if (selectedClub && !list.includes(selectedClub)) {
      return [selectedClub, ...list];
    }
    return list;
  }, [clubs, selectedClub]);

  const clubAbsentInSeason = Boolean(selectedClub && !loadingRoster && squadRoster.length === 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b-2 border-[var(--ink)] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)]">
            Club Registry &amp; First-Team Almanac • {activeSeason}
          </div>
          <h1 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-1">
            Squad Browser
          </h1>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Compare club finishing efficiency across {activeLeagueLabel}, then open any club dossier to inspect age distribution, positional depth, and playing records.
          </p>
        </div>

        {/* League Selector Tabs */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 border border-[var(--ink)] p-1 bg-[var(--paper)] shrink-0">
          {LEAGUES.map((l) => {
            const active = selectedLeague === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => {
                  setSelectedLeague(l.id);
                  setSelectedClub(null);
                }}
                className={`px-2.5 py-1 text-xs font-mono whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[var(--ink)] text-[var(--paper)] font-bold'
                    : 'text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                {l.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main View: Club Picker OR Squad Roster Details */}
      {!selectedClub ? (
        /* Club Directory + Club Efficiency Scatter */
        <div className="space-y-5">
          {/* Club xG vs. Actual Goals Scatter (with Pre-xG bar fallback) */}
          {!loadingClubs && clubSummaries.length > 0 && (
            <ClubEfficiencyScatter
              clubs={clubSummaries}
              activeSeason={activeSeason}
              leagueLabel={activeLeagueLabel}
              onSelectClub={(clubName) => setSelectedClub(clubName)}
            />
          )}

          {/* Directory Controls: Count, Sort Pills, Search */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-[var(--panel)] p-3 border border-[var(--rule)]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-[var(--mute)] uppercase">
                {directoryClubs.length} Clubs in {activeLeagueLabel}
              </span>

              <div className="flex items-center gap-1" role="group" aria-label="Sort clubs by">
                <span className="text-[10px] font-mono uppercase text-[var(--mute)] mr-0.5">
                  Sort:
                </span>
                {CLUB_SORTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setClubSort(s.id)}
                    className={`px-2 py-0.5 text-[11px] font-mono border transition-colors ${
                      clubSort === s.id
                        ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-bold'
                        : 'border-[var(--rule)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--ink)]'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full lg:w-64">
              <input
                type="text"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="Search club name..."
                aria-label="Search club name"
                className="w-full bg-[var(--paper)] border border-[var(--rule)] px-2.5 py-1 text-xs font-ser text-[var(--ink)] placeholder:italic focus:outline-none focus:border-[var(--ink)]"
              />
              <Search className="w-3 h-3 absolute right-2.5 top-2 text-[var(--mute)] pointer-events-none" />
            </div>
          </div>

          {loadingClubs ? (
            <div className="p-12 text-center text-xs font-mono text-[var(--mute)]">
              Loading club efficiency ledger...
            </div>
          ) : directoryClubs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--rule)] text-xs text-[var(--mute)] italic">
              No clubs found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {directoryClubs.map((c) => {
                const name = c.squad;
                const hasXg = c.xg !== null && c.xg !== undefined;
                const delta =
                  c.finishing_delta !== null && c.finishing_delta !== undefined
                    ? formatGoalsMinusXG(c.finishing_delta)
                    : null;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedClub(name)}
                    className="p-3.5 text-left border border-[var(--rule)] bg-[var(--paper)] hover:bg-[var(--panel)] hover:border-[var(--ink)] transition-all group flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-disp font-bold text-lg text-[var(--ink)] leading-snug group-hover:text-[var(--blue)] line-clamp-1">
                          {name}
                        </div>
                        {c.short_league && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-[var(--rule)] text-[var(--mute)] shrink-0">
                            {c.short_league}
                          </span>
                        )}
                      </div>
                      {c.top_scorer && (
                        <div className="text-[11px] italic text-[var(--mute)] mt-0.5 truncate">
                          Top scorer: {c.top_scorer.Player} ({c.top_scorer.Gls}G)
                        </div>
                      )}
                    </div>

                    {/* Club Stat Strip */}
                    {c.goals !== null && c.goals !== undefined && (
                      <div className="grid grid-cols-4 gap-1 border-t border-[var(--rule)] pt-2 font-mono text-[11px] tabular-nums">
                        <div>
                          <div className="text-[9px] uppercase text-[var(--mute)]">Gls</div>
                          <div className="font-bold text-[var(--ink)]">{c.goals}</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-[var(--mute)]">xG</div>
                          <div className="text-[var(--ink)]">
                            {hasXg ? formatDecimal(c.xg, 1) : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-[var(--mute)]">G−xG</div>
                          <div
                            className={`font-bold ${
                              delta?.isOver
                                ? 'text-[var(--blue)]'
                                : delta?.isUnder
                                  ? 'text-[var(--red)]'
                                  : 'text-[var(--mute)]'
                            }`}
                          >
                            {delta ? delta.text : '—'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-[var(--mute)]">Age</div>
                          <div className="text-[var(--ink)]">
                            {c.avg_age !== null && c.avg_age !== undefined ? c.avg_age : '—'}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--mute)] border-t border-[var(--rule)] pt-1.5">
                      <span>
                        {c.players_count ? `${c.players_count} players` : 'Inspect squad'}
                      </span>
                      <span className="text-[var(--ink)] group-hover:translate-x-0.5 transition-transform">
                        Inspect &rarr;
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Selected Squad Dossier */
        <div className="space-y-6">
          {/* Navigation Back */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setSelectedClub(null)}
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[var(--ink)] hover:text-[var(--blue)] border border-[var(--ink)] px-2.5 py-1 bg-[var(--paper)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Club Directory
            </button>

            {/* Club quick switcher dropdown */}
            <div className="flex items-center gap-2">
              <label htmlFor="squad-quick-switch" className="text-xs font-mono text-[var(--mute)] hidden sm:inline">
                Switch Club:
              </label>
              <select
                id="squad-quick-switch"
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="bg-[var(--paper)] border border-[var(--ink)] px-2 py-1 text-xs font-ser text-[var(--ink)] focus:outline-none"
              >
                {clubDropdownOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {clubAbsentInSeason ? (
            /* Graceful Season Availability Notice when club was relegated / absent */
            <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 space-y-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[var(--mute)]">
                <AlertCircle className="w-4 h-4 text-[var(--red)]" />
                <span>Season Availability Notice · Vol. {activeSeason}</span>
              </div>
              <h2 className="font-disp font-extrabold text-3xl text-[var(--ink)]">
                {selectedClub} — Not Present in Vol. {activeSeason}
              </h2>
              <p className="text-xs italic text-[var(--mute)] max-w-xl leading-relaxed">
                No European Big 5 first-team records exist for <strong>{selectedClub}</strong> in{' '}
                <strong>{activeSeason}</strong> (the club may have competed outside the top flight in this campaign or appeared under a different archived registration).
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedClub(null)}
                  className="inline-flex items-center gap-1.5 border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-3.5 py-1.5 text-xs font-mono uppercase font-bold hover:opacity-90"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Club Directory</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Club Header Summary Card */}
              <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-[var(--rule)]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border border-[var(--ink)] bg-[var(--panel)]">
                        {squadStats.league
                          ? squadStats.league.replace(/^[a-z]{2,3}\s+/, '')
                          : 'European League'}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--mute)]">
                        {activeSeason} Official Campaign
                      </span>
                    </div>
                    <h2 className="font-disp font-black text-3xl sm:text-5xl text-[var(--ink)] tracking-tight">
                      {selectedClub}
                    </h2>
                  </div>

                  {/* Club Totals Strip (5 KPI cards including weighted Avg Age) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Squad Size</div>
                      <div className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5 tabular-nums">
                        {squadStats.size}{' '}
                        <span className="text-[10px] font-normal text-[var(--mute)]">plyrs</span>
                      </div>
                    </div>

                    <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Avg Age</div>
                      <div
                        className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5 tabular-nums"
                        title="Minutes-weighted average squad age"
                      >
                        {squadStats.weightedAvgAge !== null ? squadStats.weightedAvgAge : '—'}
                        {squadStats.weightedAvgAge !== null && (
                          <span className="text-[10px] font-normal text-[var(--mute)]"> yrs</span>
                        )}
                      </div>
                    </div>

                    <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Total Goals</div>
                      <div className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5 tabular-nums">
                        {squadStats.goals}
                      </div>
                    </div>

                    <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--mute)] flex items-center gap-1">
                        Total xG
                        <MetricTooltip metricKey="xG" />
                      </div>
                      <div className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5 tabular-nums">
                        {squadStats.hasXg ? formatDecimal(squadStats.xG) : '—'}
                      </div>
                    </div>

                    <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                      <div className="text-[10px] font-mono uppercase text-[var(--mute)] flex items-center gap-1">
                        Goals − xG
                        <MetricTooltip metricKey="G-xG" />
                      </div>
                      {(() => {
                        if (!squadStats.hasXg) {
                          return (
                            <div className="font-mono font-bold text-xl mt-0.5 text-[var(--mute)]">
                              —
                            </div>
                          );
                        }
                        const delta = formatGoalsMinusXG(squadStats.goalsMinusXG);
                        return (
                          <div
                            className={`font-mono font-bold text-xl mt-0.5 tabular-nums ${
                              delta.isOver
                                ? 'text-[var(--blue)]'
                                : delta.isUnder
                                  ? 'text-[var(--red)]'
                                  : 'text-[var(--ink)]'
                            }`}
                          >
                            {delta.glyph} {delta.text}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {squadStats.sharedXgPlayers.length > 0 && (
                  <div className="pt-2.5 text-[11px] font-ser italic text-[var(--mute)] border-b border-[var(--rule)] pb-2.5">
                    Note: Club Total xG and Goals − xG exclude {squadStats.sharedXgPlayers.length}{' '}
                    mid-season transfer spell
                    {squadStats.sharedXgPlayers.length === 1 ? '' : 's'} (
                    {squadStats.sharedXgPlayers.join(', ')}) whose source xG/xAG reflects unsplit
                    full-season totals across multiple clubs.
                  </div>
                )}

                {/* Top Scorer & Top Creator Spotlight Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  {/* Top Scorer */}
                  {squadStats.topScorer ? (
                    <button
                      type="button"
                      onClick={() => onSelectPlayer && onSelectPlayer(squadStats.topScorer)}
                      className="w-full text-left p-3 border border-[var(--ink)] bg-[var(--panel)] hover:bg-[var(--paper)] cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center font-mono font-bold text-xs text-[var(--red)]">
                          G
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase text-[var(--red)] font-bold">
                            Club Top Scorer
                          </div>
                          <div className="font-disp font-bold text-base text-[var(--ink)]">
                            {squadStats.topScorer.Player}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--mute)]">
                            {squadStats.topScorer.Pos} • {squadStats.topScorer.Age} yrs
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-2xl text-[var(--ink)] tabular-nums">
                          {squadStats.topScorer.Gls}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--mute)]">
                          Goals ({formatDecimal(squadStats.topScorer.xG)} xG)
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="p-3 border border-dashed border-[var(--rule)] text-xs text-[var(--mute)] italic flex items-center">
                      No recorded goals in active season records.
                    </div>
                  )}

                  {/* Top Creator */}
                  {squadStats.topCreator ? (
                    <button
                      type="button"
                      onClick={() => onSelectPlayer && onSelectPlayer(squadStats.topCreator)}
                      className="w-full text-left p-3 border border-[var(--ink)] bg-[var(--panel)] hover:bg-[var(--paper)] cursor-pointer transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full border border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center font-mono font-bold text-xs text-[var(--blue)]">
                          A
                        </div>
                        <div>
                          <div className="text-[10px] font-mono uppercase text-[var(--blue)] font-bold">
                            Club Top Creator
                          </div>
                          <div className="font-disp font-bold text-base text-[var(--ink)]">
                            {squadStats.topCreator.Player}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--mute)]">
                            {squadStats.topCreator.Pos} • {squadStats.topCreator.Age} yrs
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-2xl text-[var(--ink)] tabular-nums">
                          {squadStats.topCreator.Ast}
                        </div>
                        <div className="text-[10px] font-mono text-[var(--mute)]">
                          Assists ({formatDecimal(squadStats.topCreator.xAG)} xAG)
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="p-3 border border-dashed border-[var(--rule)] text-xs text-[var(--mute)] italic flex items-center">
                      No recorded assists in active season records.
                    </div>
                  )}
                </div>
              </div>

              {/* Squad Age vs. Minutes Profile Chart */}
              {!loadingRoster && squadRoster.length > 0 && (
                <SquadAgeMinutesChart
                  roster={squadRoster}
                  clubName={selectedClub}
                  weightedAvgAge={squadStats.weightedAvgAge}
                  onSelectPlayer={onSelectPlayer}
                />
              )}

              {/* Positional Groups (GK, DF, MF, FW) */}
              {loadingRoster ? (
                <div className="p-12 text-center text-xs font-mono text-[var(--mute)]">
                  Compiling squad roster...
                </div>
              ) : (
                <div className="space-y-6">
                  {['GK', 'DF', 'MF', 'FW'].map((posKey) => {
                    const group = positionGroups[posKey];
                    if (!group || group.players.length === 0) return null;

                    return (
                      <div key={posKey} className="border border-[var(--ink)] bg-[var(--paper)]">
                        {/* Position Group Header */}
                        <div className="bg-[var(--panel)] px-4 py-2 border-b border-[var(--ink)] flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-disp font-bold text-lg text-[var(--ink)]">
                              {group.label}
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 bg-[var(--paper)] border border-[var(--rule)] text-[var(--mute)]">
                              {group.players.length} registered
                            </span>
                          </div>
                          <span className="text-[10px] font-mono uppercase text-[var(--mute)]">
                            Ordered by minutes played
                          </span>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs font-ser">
                            <thead>
                              <tr className="border-b border-[var(--rule)] text-[10px] font-mono uppercase text-[var(--mute)] bg-[var(--paper)]">
                                <th className="py-2 px-3 text-left">Player</th>
                                <th className="py-2 px-2 text-center">Pos</th>
                                <th className="py-2 px-2 text-right">Age</th>
                                <th className="py-2 px-2 text-right">
                                  <span className="inline-flex items-center gap-0.5">
                                    Apps
                                    <MetricTooltip metricKey="MP" />
                                  </span>
                                </th>
                                <th className="py-2 px-3 text-right">
                                  <span className="inline-flex items-center gap-0.5">
                                    Minutes
                                    <MetricTooltip metricKey="Min" />
                                  </span>
                                </th>
                                <th className="py-2 px-2 text-right font-bold text-[var(--ink)]">
                                  <span className="inline-flex items-center gap-0.5">
                                    Goals
                                    <MetricTooltip metricKey="Gls" />
                                  </span>
                                </th>
                                <th className="py-2 px-2 text-right">
                                  <span className="inline-flex items-center gap-0.5">
                                    Assists
                                    <MetricTooltip metricKey="Ast" />
                                  </span>
                                </th>
                                <th className="py-2 px-2 text-right">
                                  <span className="inline-flex items-center gap-0.5">
                                    xG
                                    <MetricTooltip metricKey="xG" />
                                  </span>
                                </th>
                                <th className="py-2 px-2 text-right">
                                  <span className="inline-flex items-center gap-0.5">
                                    xAG
                                    <MetricTooltip metricKey="xAG" />
                                  </span>
                                </th>
                                <th className="py-2 px-3 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--rule)] font-mono tabular-nums">
                              {group.players.map((player) => {
                                const isTopScorer =
                                  squadStats.topScorer &&
                                  (player.id || player.Player) ===
                                    (squadStats.topScorer.id || squadStats.topScorer.Player);
                                const isTopCreator =
                                  squadStats.topCreator &&
                                  (player.id || player.Player) ===
                                    (squadStats.topCreator.id || squadStats.topCreator.Player);
                                const isCompared = isPlayerCompared(player);
                                const isSaved = isPlayerInShortlist(shortlist, player, activeSeason);

                                return (
                                  <tr
                                    key={player.id || player.Player}
                                    onClick={() => onSelectPlayer && onSelectPlayer(player)}
                                    className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                                  >
                                    {/* Name + Badges */}
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-2">
                                        <span className="font-disp font-bold text-sm text-[var(--ink)] group-hover:text-[var(--blue)] font-sans">
                                          {player.Player}
                                        </span>
                                        {isTopScorer && (
                                          <span
                                            className="text-[9px] font-mono px-1 py-0.2 bg-[var(--panel)] border border-[var(--red)] text-[var(--red)] uppercase font-bold"
                                            title="Club's leading goalscorer"
                                          >
                                            Top Scorer
                                          </span>
                                        )}
                                        {isTopCreator && (
                                          <span
                                            className="text-[9px] font-mono px-1 py-0.2 bg-[var(--panel)] border border-[var(--blue)] text-[var(--blue)] uppercase font-bold"
                                            title="Club's leading assist provider"
                                          >
                                            Top Creator
                                          </span>
                                        )}
                                      </div>
                                    </td>

                                    <td className="py-2 px-2 text-center text-xs text-[var(--mute)]">
                                      {player.Pos}
                                    </td>
                                    <td className="py-2 px-2 text-right text-xs text-[var(--ink)]">
                                      {player.Age || '—'}
                                    </td>
                                    <td className="py-2 px-2 text-right text-xs text-[var(--ink)]">
                                      {player.MP || '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right text-xs text-[var(--mute)]">
                                      {formatMinutes(player.Min)}
                                    </td>
                                    <td className="py-2 px-2 text-right text-sm font-bold text-[var(--ink)]">
                                      {player.Gls || 0}
                                    </td>
                                    <td className="py-2 px-2 text-right text-xs text-[var(--ink)]">
                                      {player.Ast || 0}
                                    </td>
                                    <td
                                      className="py-2 px-2 text-right text-xs text-[var(--mute)]"
                                      title={
                                        player.shared_season_xg || player._shared_season_xg
                                          ? 'Unsplit full-season xG across multiple club spells — excluded from club xG total'
                                          : undefined
                                      }
                                    >
                                      {formatDecimal(player.xG)}
                                      {player.shared_season_xg || player._shared_season_xg ? '*' : ''}
                                    </td>
                                    <td
                                      className="py-2 px-2 text-right text-xs text-[var(--mute)]"
                                      title={
                                        player.shared_season_xg || player._shared_season_xg
                                          ? 'Unsplit full-season xAG across multiple club spells — excluded from club xAG total'
                                          : undefined
                                      }
                                    >
                                      {formatDecimal(player.xAG)}
                                      {player.shared_season_xg || player._shared_season_xg ? '*' : ''}
                                    </td>

                                    {/* Actions */}
                                    <td
                                      className="py-2 px-3 text-center"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div className="flex items-center justify-center gap-1.5">
                                        {onToggleShortlist && (
                                          <button
                                            type="button"
                                            onClick={() => onToggleShortlist(player, activeSeason)}
                                            aria-label={
                                              isSaved
                                                ? `Remove ${player.Player} from shortlist`
                                                : `Save ${player.Player} to shortlist`
                                            }
                                            className={`p-1 border transition-colors ${
                                              isSaved
                                                ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                                                : 'border-[var(--rule)] text-[var(--mute)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                                            }`}
                                            title={isSaved ? 'Saved to Shortlist' : 'Save to Shortlist'}
                                          >
                                            <Bookmark className="w-3 h-3" />
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => onAddToCompare && onAddToCompare(player)}
                                          className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                                            isCompared
                                              ? 'border-[var(--blue)] bg-[var(--panel)] text-[var(--blue)] font-bold'
                                              : 'border-[var(--rule)] text-[var(--mute)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                                          }`}
                                          title={
                                            isCompared ? 'Player in comparison' : 'Add to comparison'
                                          }
                                        >
                                          {isCompared ? 'In Compare' : '+ Compare'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SquadBrowserView;
