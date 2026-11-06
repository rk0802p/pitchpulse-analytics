import React, { useState, useEffect, useMemo } from 'react';
import { 
  Shield, 
  Users, 
  Trophy, 
  Sparkles, 
  ArrowLeft, 
  Search, 
  ExternalLink,
  GitCompare,
  TrendingUp,
  Activity
} from 'lucide-react';
import api from '../../services/api';
import MetricTooltip from '../common/MetricTooltip';
import { 
  formatMinutes, 
  formatDecimal, 
  formatGoalsMinusXG, 
  formatNumber 
} from '../../utils/metricFormatters';

const LEAGUES = [
  { id: '', label: 'All Leagues', short: 'All' },
  { id: 'eng Premier League', label: 'Premier League', short: 'EPL' },
  { id: 'es La Liga', label: 'La Liga', short: 'La Liga' },
  { id: 'it Serie A', label: 'Serie A', short: 'Serie A' },
  { id: 'de Bundesliga', label: 'Bundesliga', short: 'Bundesliga' },
  { id: 'fr Ligue 1', label: 'Ligue 1', short: 'Ligue 1' },
];

export const SquadBrowserView = ({
  activeSeason = "2024-2025",
  initialSquad = null,
  initialLeague = "",
  onSelectPlayer,
  onAddToCompare,
  compareList = []
}) => {
  const [selectedLeague, setSelectedLeague] = useState(initialLeague);
  const [clubs, setClubs] = useState([]);
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

  // Fetch clubs when activeSeason or selectedLeague changes
  useEffect(() => {
    setLoadingClubs(true);
    api.getTeams(selectedLeague || undefined, activeSeason)
      .then(res => {
        let list = [];
        if (res?.success && Array.isArray(res.data)) {
          list = res.data;
        } else if (Array.isArray(res)) {
          list = res;
        }
        setClubs(list);
        // If current selectedClub not in new list, reset it unless all leagues
        if (selectedClub && selectedLeague && !list.includes(selectedClub)) {
          // keep it if found
        }
      })
      .catch(err => {
        console.error("Failed to load clubs:", err);
        setClubs([]);
      })
      .finally(() => setLoadingClubs(false));
  }, [selectedLeague, activeSeason]);

  // Fetch squad roster when selectedClub or activeSeason changes
  useEffect(() => {
    if (!selectedClub) {
      setSquadRoster([]);
      return;
    }
    setLoadingRoster(true);
    api.getPlayers({ 
      season: activeSeason, 
      squad: selectedClub, 
      limit: 100, 
      sort_by: 'Min', 
      order: 'desc' 
    })
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setSquadRoster(res.data);
        } else if (Array.isArray(res)) {
          setSquadRoster(res);
        } else {
          setSquadRoster([]);
        }
      })
      .catch(err => {
        console.error("Failed to load squad roster:", err);
        setSquadRoster([]);
      })
      .finally(() => setLoadingRoster(false));
  }, [selectedClub, activeSeason]);

  // Filtered clubs by search
  const filteredClubs = useMemo(() => {
    if (!clubSearch.trim()) return clubs;
    const q = clubSearch.toLowerCase();
    return clubs.filter(c => {
      const name = typeof c === 'string' ? c : (c.name || c.Squad || c.Team || '');
      return name.toLowerCase().includes(q);
    });
  }, [clubs, clubSearch]);

  // Squad Aggregate Stats
  const squadStats = useMemo(() => {
    if (!squadRoster || squadRoster.length === 0) {
      return {
        size: 0,
        goals: 0,
        assists: 0,
        xG: 0,
        xAG: 0,
        minutes: 0,
        topScorer: null,
        topCreator: null,
        league: null
      };
    }

    let goals = 0;
    let assists = 0;
    let xG = 0;
    let xAG = 0;
    let minutes = 0;
    let maxGls = -1;
    let topScorer = null;
    let maxAst = -1;
    let topCreator = null;
    let league = squadRoster[0]?.Comp || '';

    squadRoster.forEach(p => {
      const g = Number(p.Gls) || 0;
      const a = Number(p.Ast) || 0;
      const x = Number(p.xG) || 0;
      const xa = Number(p.xAG) || 0;
      const m = Number(p.Min) || 0;

      goals += g;
      assists += a;
      xG += x;
      xAG += xa;
      minutes += m;

      if (g > maxGls && g > 0) {
        maxGls = g;
        topScorer = p;
      }
      if (a > maxAst && a > 0) {
        maxAst = a;
        topCreator = p;
      }
    });

    return {
      size: squadRoster.length,
      goals,
      assists,
      xG: parseFloat(xG.toFixed(1)),
      xAG: parseFloat(xAG.toFixed(1)),
      goalsMinusXG: parseFloat((goals - xG).toFixed(1)),
      minutes,
      topScorer,
      topCreator,
      league
    };
  }, [squadRoster]);

  // Position Groups: GK, DF, MF, FW
  const positionGroups = useMemo(() => {
    const groups = {
      GK: { label: 'Goalkeepers', players: [] },
      DF: { label: 'Defenders', players: [] },
      MF: { label: 'Midfielders', players: [] },
      FW: { label: 'Forwards & Attackers', players: [] }
    };

    squadRoster.forEach(p => {
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
    return compareList.some(p => (p.id || p.Player) === id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b-2 border-[var(--ink)] pb-3 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)]">
            Club Registry & First-Team Almanac • {activeSeason}
          </div>
          <h1 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-1">
            Squad Browser
          </h1>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Pick a league and club to inspect roster composition, positional tiers, and individual playing records.
          </p>
        </div>

        {/* League Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1 border border-[var(--ink)] p-1 bg-[var(--paper)]">
          {LEAGUES.map(l => {
            const active = selectedLeague === l.id;
            return (
              <button
                key={l.id}
                onClick={() => {
                  setSelectedLeague(l.id);
                  setSelectedClub(null);
                }}
                className={`px-2.5 py-1 text-xs font-mono transition-colors ${
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
        /* Club Selection Grid */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[var(--panel)] p-3 border border-[var(--rule)]">
            <span className="text-xs font-mono text-[var(--mute)] uppercase">
              {filteredClubs.length} Clubs registered in {selectedLeague ? selectedLeague.replace(/^[a-z]{2}\s+/, '') : 'Big 5 Leagues'}
            </span>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={clubSearch}
                onChange={(e) => setClubSearch(e.target.value)}
                placeholder="Search club name..."
                className="w-full bg-[var(--paper)] border border-[var(--rule)] px-2.5 py-1 text-xs font-ser text-[var(--ink)] placeholder:italic focus:outline-none focus:border-[var(--ink)]"
              />
              <Search className="w-3 h-3 absolute right-2.5 top-2 text-[var(--mute)] pointer-events-none" />
            </div>
          </div>

          {loadingClubs ? (
            <div className="p-12 text-center text-xs font-mono text-[var(--mute)]">
              Loading club index...
            </div>
          ) : filteredClubs.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-[var(--rule)] text-xs text-[var(--mute)] italic">
              No clubs found matching your search.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filteredClubs.map(c => {
                const name = typeof c === 'string' ? c : (c.name || c.Squad || c.Team);
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedClub(name)}
                    className="p-3 text-left border border-[var(--rule)] bg-[var(--paper)] hover:bg-[var(--panel)] hover:border-[var(--ink)] transition-all group flex flex-col justify-between h-24"
                  >
                    <div className="font-disp font-bold text-base text-[var(--ink)] leading-snug group-hover:text-[var(--accent)] line-clamp-2">
                      {name}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-[var(--mute)] border-t border-[var(--rule)] pt-1">
                      <span>Inspect squad</span>
                      <span className="text-[var(--ink)] group-hover:translate-x-0.5 transition-transform">&rarr;</span>
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
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedClub(null)}
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase text-[var(--ink)] hover:text-[var(--accent)] border border-[var(--ink)] px-2.5 py-1 bg-[var(--paper)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Club Directory
            </button>

            {/* Club quick switcher dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--mute)] hidden sm:inline">Switch Club:</span>
              <select
                value={selectedClub}
                onChange={(e) => setSelectedClub(e.target.value)}
                className="bg-[var(--paper)] border border-[var(--ink)] px-2 py-1 text-xs font-ser text-[var(--ink)] focus:outline-none"
              >
                {clubs.map(c => {
                  const name = typeof c === 'string' ? c : (c.name || c.Squad || c.Team);
                  return <option key={name} value={name}>{name}</option>;
                })}
              </select>
            </div>
          </div>

          {/* Club Header Summary Card (Section 6.6 Specification) */}
          <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-4 border-b border-[var(--rule)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border border-[var(--ink)] bg-[var(--panel)]">
                    {squadStats.league ? squadStats.league.replace(/^[a-z]{2}\s+/, '') : 'European League'}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--mute)]">
                    {activeSeason} Official Campaign
                  </span>
                </div>
                <h2 className="font-disp font-black text-3xl sm:text-5xl text-[var(--ink)] tracking-tight">
                  {selectedClub}
                </h2>
              </div>

              {/* Club Totals Strip (League, squad size, total goals, total xG, goals minus xG) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Squad Size</div>
                  <div className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5">
                    {squadStats.size} <span className="text-[10px] font-normal text-[var(--mute)]">players</span>
                  </div>
                </div>

                <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Total Goals</div>
                  <div className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5">
                    {squadStats.goals}
                  </div>
                </div>

                <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--mute)] flex items-center gap-1">
                    Total xG
                    <MetricTooltip metricKey="xG" />
                  </div>
                  <div className="font-mono font-bold text-xl text-[var(--ink)] mt-0.5">
                    {formatDecimal(squadStats.xG)}
                  </div>
                </div>

                <div className="border border-[var(--rule)] p-2.5 bg-[var(--panel)]">
                  <div className="text-[10px] font-mono uppercase text-[var(--mute)] flex items-center gap-1">
                    Goals − xG
                    <MetricTooltip metricKey="G-xG" />
                  </div>
                  {(() => {
                    const delta = formatGoalsMinusXG(squadStats.goalsMinusXG);
                    return (
                      <div className={`font-mono font-bold text-xl mt-0.5 ${
                        delta.isOver ? 'text-[var(--blue)]' : delta.isUnder ? 'text-[var(--red)]' : 'text-[var(--ink)]'
                      }`}>
                        {delta.glyph} {delta.text}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Top Scorer & Top Creator Spotlight Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Top Scorer */}
              {squadStats.topScorer ? (
                <div 
                  onClick={() => onSelectPlayer && onSelectPlayer(squadStats.topScorer)}
                  className="p-3 border border-[var(--ink)] bg-[var(--panel)] hover:bg-[var(--paper)] cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent)]">
                      ⚡
                    </div>
                    <div>
                      <div className="text-[10px] font-mono uppercase text-[var(--accent)] font-bold">
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
                    <div className="font-mono font-black text-2xl text-[var(--ink)]">
                      {squadStats.topScorer.Gls}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--mute)]">
                      Goals ({formatDecimal(squadStats.topScorer.xG)} xG)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 border border-dashed border-[var(--rule)] text-xs text-[var(--mute)] italic flex items-center">
                  No recorded goals in active season records.
                </div>
              )}

              {/* Top Creator */}
              {squadStats.topCreator ? (
                <div 
                  onClick={() => onSelectPlayer && onSelectPlayer(squadStats.topCreator)}
                  className="p-3 border border-[var(--ink)] bg-[var(--panel)] hover:bg-[var(--paper)] cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-[var(--ink)] bg-[var(--paper)] flex items-center justify-center font-mono font-bold text-xs text-[var(--blue)]">
                      ✦
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
                    <div className="font-mono font-black text-2xl text-[var(--ink)]">
                      {squadStats.topCreator.Ast}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--mute)]">
                      Assists ({formatDecimal(squadStats.topCreator.xAG)} xAG)
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 border border-dashed border-[var(--rule)] text-xs text-[var(--mute)] italic flex items-center">
                  No recorded assists in active season records.
                </div>
              )}
            </div>
          </div>

          {/* Positional Groups (Section 6.6: GK, DF, MF, FW) */}
          {loadingRoster ? (
            <div className="p-12 text-center text-xs font-mono text-[var(--mute)]">
              Compiling squad roster...
            </div>
          ) : (
            <div className="space-y-6">
              {['GK', 'DF', 'MF', 'FW'].map(posKey => {
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
                        <tbody className="divide-y divide-[var(--rule)] font-mono">
                          {group.players.map((player) => {
                            const isTopScorer = squadStats.topScorer && (player.id || player.Player) === (squadStats.topScorer.id || squadStats.topScorer.Player);
                            const isTopCreator = squadStats.topCreator && (player.id || player.Player) === (squadStats.topCreator.id || squadStats.topCreator.Player);
                            const isCompared = isPlayerCompared(player);

                            return (
                              <tr 
                                key={player.id || player.Player}
                                onClick={() => onSelectPlayer && onSelectPlayer(player)}
                                className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                              >
                                {/* Name + Badges */}
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-disp font-bold text-sm text-[var(--ink)] group-hover:text-[var(--accent)] font-sans">
                                      {player.Player}
                                    </span>
                                    {isTopScorer && (
                                      <span className="text-[9px] font-mono px-1 py-0.2 bg-[var(--panel)] border border-[var(--accent)] text-[var(--accent)] uppercase font-bold" title="Club's leading goalscorer">
                                        ⚡ Top Scorer
                                      </span>
                                    )}
                                    {isTopCreator && (
                                      <span className="text-[9px] font-mono px-1 py-0.2 bg-[var(--panel)] border border-[var(--blue)] text-[var(--blue)] uppercase font-bold" title="Club's leading assist provider">
                                        ✦ Top Creator
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* Position */}
                                <td className="py-2 px-2 text-center text-xs text-[var(--mute)]">
                                  {player.Pos}
                                </td>

                                {/* Age */}
                                <td className="py-2 px-2 text-right text-xs text-[var(--ink)]">
                                  {player.Age || '—'}
                                </td>

                                {/* Appearances / MP */}
                                <td className="py-2 px-2 text-right text-xs text-[var(--ink)]">
                                  {player.MP || '—'}
                                </td>

                                {/* Minutes */}
                                <td className="py-2 px-3 text-right text-xs text-[var(--mute)]">
                                  {formatMinutes(player.Min)}
                                </td>

                                {/* Goals */}
                                <td className="py-2 px-2 text-right text-sm font-bold text-[var(--ink)]">
                                  {player.Gls || 0}
                                </td>

                                {/* Assists */}
                                <td className="py-2 px-2 text-right text-xs text-[var(--ink)]">
                                  {player.Ast || 0}
                                </td>

                                {/* xG */}
                                <td className="py-2 px-2 text-right text-xs text-[var(--mute)]">
                                  {formatDecimal(player.xG)}
                                </td>

                                {/* xAG */}
                                <td className="py-2 px-2 text-right text-xs text-[var(--mute)]">
                                  {formatDecimal(player.xAG)}
                                </td>

                                {/* Actions */}
                                <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={() => onAddToCompare && onAddToCompare(player)}
                                      className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                                        isCompared
                                          ? 'border-[var(--accent)] bg-[var(--panel)] text-[var(--accent)] font-bold'
                                          : 'border-[var(--rule)] text-[var(--mute)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                                      }`}
                                      title={isCompared ? "Player in comparison" : "Add to comparison"}
                                    >
                                      {isCompared ? "In Compare" : "+ Compare"}
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
        </div>
      )}
    </div>
  );
};

export default SquadBrowserView;
