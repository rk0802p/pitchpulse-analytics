import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from './components/layout/AppLayout';
import PageHeader from './components/common/PageHeader';
import StatCard from './components/common/StatCard';
import FilterBar from './components/common/FilterBar';
import DataTable from './components/common/DataTable';
import EmptyState from './components/common/EmptyState';
import ErrorBanner from './components/common/ErrorBanner';
import LeagueBanner from './components/LeagueBanner';
import TeamBadge from './components/TeamBadge';
import PlayerCard from './components/PlayerCard';
import api from './services/api';

import {
  Trophy,
  Users,
  Target,
  Sparkles,
  Zap,
  TrendingUp,
  ArrowRight,
  Shield,
  Layers,
  ArrowLeft,
  X,
  Plus
} from 'lucide-react';

function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0];
    return ['dashboard', 'explorer', 'leaderboards', 'compare', 'browse', 'profile'].includes(hash)
      ? hash
      : 'dashboard';
  });

  // Global Metadata & Competitions
  const [competitions, setCompetitions] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // Explorer State
  const [explorerPlayers, setExplorerPlayers] = useState([]);
  const [explorerPagination, setExplorerPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComp, setSelectedComp] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [minMinutes, setMinMinutes] = useState(0);
  const [sortBy, setSortBy] = useState('Gls');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  // Leaderboards State
  const [leaderboardMetric, setLeaderboardMetric] = useState('Gls');
  const [leaderboardComp, setLeaderboardComp] = useState('');
  const [leaderboardLeaders, setLeaderboardLeaders] = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  // Comparison State
  const [compareList, setCompareList] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Player Profile State
  const [profilePlayerId, setProfilePlayerId] = useState(null);
  const [playerProfile, setPlayerProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Classic Squad Browser State
  const [legacyLeagues, setLegacyLeagues] = useState([]);
  const [legacyTeams, setLegacyTeams] = useState([]);
  const [legacyPlayers, setLegacyPlayers] = useState([]);
  const [selectedLegacyLeague, setSelectedLegacyLeague] = useState(null);
  const [selectedLegacyTeam, setSelectedLegacyTeam] = useState(null);
  const [loadingLegacy, setLoadingLegacy] = useState(false);

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const parts = window.location.hash.replace(/^#\/?/, '').split('/');
      const tab = parts[0];
      if (['dashboard', 'explorer', 'leaderboards', 'compare', 'browse', 'profile'].includes(tab)) {
        setCurrentTab(tab);
        if (tab === 'profile' && parts[1]) {
          setProfilePlayerId(parts[1]);
        }
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab, param = null) => {
    setCurrentTab(tab);
    if (tab === 'profile' && param) {
      setProfilePlayerId(param);
      window.location.hash = `#profile/${param}`;
    } else {
      window.location.hash = `#${tab}`;
    }
  };

  // Fetch initial metadata and competitions
  const fetchInitialData = useCallback(async () => {
    setLoadingMeta(true);
    setGlobalError(null);
    try {
      const [compRes, metaRes] = await Promise.all([
        api.getCompetitions().catch(() => ({ success: false, data: [] })),
        api.getMetadata().catch(() => ({ success: false, data: null }))
      ]);

      if (compRes?.success) setCompetitions(compRes.data);
      if (metaRes?.success) setMetadata(metaRes.data);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch Explorer Players
  const fetchExplorerPlayers = useCallback(async () => {
    setLoadingExplorer(true);
    try {
      const res = await api.getPlayers({
        search: searchQuery,
        competition: selectedComp,
        position: selectedPos,
        min_minutes: minMinutes,
        sort_by: sortBy,
        order: sortOrder,
        page: explorerPagination.page,
        limit: explorerPagination.limit
      });
      if (res?.success) {
        setExplorerPlayers(res.data);
        if (res.pagination) {
          setExplorerPagination(res.pagination);
        }
      }
    } catch (err) {
      console.error("Error fetching explorer players:", err);
    } finally {
      setLoadingExplorer(false);
    }
  }, [searchQuery, selectedComp, selectedPos, minMinutes, sortBy, sortOrder, explorerPagination.page, explorerPagination.limit]);

  useEffect(() => {
    if (currentTab === 'explorer') {
      fetchExplorerPlayers();
    }
  }, [currentTab, fetchExplorerPlayers]);

  // Fetch Leaderboards
  const fetchLeaderboards = useCallback(async () => {
    setLoadingLeaders(true);
    try {
      const res = await api.getLeaderboards({
        metric: leaderboardMetric,
        competition: leaderboardComp,
        limit: 15
      });
      if (res?.success) {
        setLeaderboardLeaders(res.data);
      }
    } catch (err) {
      console.error("Error fetching leaderboards:", err);
    } finally {
      setLoadingLeaders(false);
    }
  }, [leaderboardMetric, leaderboardComp]);

  useEffect(() => {
    if (currentTab === 'leaderboards' || currentTab === 'dashboard') {
      fetchLeaderboards();
    }
  }, [currentTab, fetchLeaderboards]);

  // Fetch Comparison Data
  useEffect(() => {
    if (currentTab === 'compare' && compareList.length > 0) {
      setLoadingCompare(true);
      const ids = compareList.map(p => p.id || p.Rk);
      api.comparePlayers(ids)
        .then(res => {
          if (res?.success) setComparisonData(res);
        })
        .catch(err => {
          console.error("Error comparing players:", err);
        })
        .finally(() => setLoadingCompare(false));
    }
  }, [currentTab, compareList]);

  // Fetch Player Profile
  useEffect(() => {
    if (currentTab === 'profile' && profilePlayerId) {
      setLoadingProfile(true);
      api.getPlayer(profilePlayerId)
        .then(res => {
          if (res?.success) setPlayerProfile(res.data);
        })
        .catch(err => {
          console.error("Error loading profile:", err);
        })
        .finally(() => setLoadingProfile(false));
    }
  }, [currentTab, profilePlayerId]);

  // Classic Browser Handlers
  useEffect(() => {
    if (currentTab === 'browse' && legacyLeagues.length === 0) {
      setLoadingLegacy(true);
      api.getLegacyLeagues()
        .then(data => {
          setLegacyLeagues(Array.isArray(data) ? data : []);
        })
        .catch(err => setGlobalError(err.message))
        .finally(() => setLoadingLegacy(false));
    }
  }, [currentTab, legacyLeagues.length]);

  const handleLegacyLeagueSelect = async (league) => {
    setSelectedLegacyLeague(league);
    setSelectedLegacyTeam(null);
    setLegacyPlayers([]);
    setLoadingLegacy(true);
    try {
      const teams = await api.getLegacyTeams(league);
      setLegacyTeams(Array.isArray(teams) ? teams : []);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingLegacy(false);
    }
  };

  const handleLegacyTeamSelect = async (team) => {
    setSelectedLegacyTeam(team);
    setLoadingLegacy(true);
    try {
      const players = await api.getLegacyPlayersByTeam(selectedLegacyLeague, team);
      setLegacyPlayers(Array.isArray(players) ? players : []);
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoadingLegacy(false);
    }
  };

  // Compare actions
  const toggleComparePlayer = (player) => {
    const pId = player.id || player.Rk;
    setCompareList(prev => {
      const exists = prev.some(p => (p.id || p.Rk) === pId);
      if (exists) {
        return prev.filter(p => (p.id || p.Rk) !== pId);
      }
      if (prev.length >= 5) {
        alert("Maximum 5 players can be compared at once.");
        return prev;
      }
      return [...prev, player];
    });
  };

  // Sorting handler for Explorer
  const handleSortChange = (colKey) => {
    if (sortBy === colKey) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(colKey);
      setSortOrder('desc');
    }
  };

  // Columns for Explorer Table
  const explorerColumns = [
    { key: 'Player', label: 'Player & Club', sortable: true },
    { key: 'Pos', label: 'Pos', sortable: true },
    { key: 'Age', label: 'Age', sortable: true, align: 'right' },
    { key: 'MP', label: 'Apps', sortable: true, align: 'right' },
    { key: 'Min', label: 'Mins', sortable: true, align: 'right' },
    { key: 'Gls', label: 'Goals', sortable: true, align: 'right' },
    { key: 'xG', label: 'xG', sortable: true, align: 'right' },
    { key: 'Gls_minus_xG', label: 'Gls - xG', sortable: true, align: 'right' },
    { key: 'Ast', label: 'Ast', sortable: true, align: 'right' },
    { key: 'xAG', label: 'xAG', sortable: true, align: 'right' },
    { key: 'PrgC', label: 'PrgC', sortable: true, align: 'right' },
    { key: 'PrgP', label: 'PrgP', sortable: true, align: 'right' },
  ];

  return (
    <AppLayout currentTab={currentTab} onNavigate={navigateTo}>
      {globalError && (
        <ErrorBanner
          message="Analytics API Connection Notice"
          details={globalError}
          onRetry={fetchInitialData}
        />
      )}

      {/* Floating Compare Drawer Button if players selected */}
      {compareList.length > 0 && currentTab !== 'compare' && (
        <div className="fixed bottom-6 right-6 z-40 bg-pitch-card border border-emerald-500/50 rounded-xl p-3 shadow-2xl flex items-center gap-3 backdrop-blur animate-in slide-in-from-bottom-4">
          <div className="flex -space-x-2">
            {compareList.map((p, i) => (
              <div
                key={i}
                className="w-8 h-8 rounded-full bg-slate-800 border-2 border-pitch-card text-emerald-400 font-bold text-xs flex items-center justify-center font-mono shadow-sm"
                title={p.Player}
              >
                {p.Player?.substring(0, 1)}
              </div>
            ))}
          </div>
          <span className="text-xs text-slate-300 font-medium font-mono">
            {compareList.length}/5 Selected
          </span>
          <button
            onClick={() => navigateTo('compare')}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1"
          >
            Compare Now <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setCompareList([])}
            className="text-slate-400 hover:text-white p-1"
            title="Clear list"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW: DASHBOARD */}
      {currentTab === 'dashboard' && (
        <div>
          <PageHeader
            title="European Football Intelligence"
            subtitle="2024/25 Big 5 league metrics, expected outputs, progression dynamics, and player ratings."
            season="2024/25"
            actions={
              <button
                onClick={() => navigateTo('explorer')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors shadow-sm"
              >
                Open Player Explorer <ArrowRight className="w-4 h-4" />
              </button>
            }
          />

          {/* Headline Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Players Monitored"
              value={metadata?.total_records || "2,854"}
              subtext="Across Big 5 European Leagues"
              icon={Users}
              badge="Top 5 Leagues"
              accentColor="emerald"
            />
            <StatCard
              title="Competitions"
              value={competitions.length || "5"}
              subtext="ENG, ESP, ITA, GER, FRA"
              icon={Trophy}
              badge="96 Clubs"
              accentColor="blue"
            />
            <StatCard
              title="Goals & Assists Tracked"
              value={competitions.reduce((acc, c) => acc + (c.total_goals || 0), 0) || "3,200+"}
              subtext="Detailed with xG & xAG models"
              icon={Target}
              badge="Full 24/25"
              accentColor="rose"
            />
            <StatCard
              title="Progression Metrics"
              value="37 Columns"
              subtext="Carries, passes, per-90 rates"
              icon={Zap}
              badge="Advanced"
              accentColor="purple"
            />
          </div>

          {/* Competitions Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" /> Monitored Competitions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {competitions.map((comp) => (
                <div
                  key={comp.id}
                  onClick={() => {
                    setSelectedComp(comp.id);
                    navigateTo('explorer');
                  }}
                  className="bg-pitch-card hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition-all duration-200 group shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {comp.code}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">{comp.teams_count} Clubs</span>
                  </div>
                  <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                    {comp.name}
                  </h3>
                  <div className="text-xs text-slate-400 mt-2 flex justify-between font-mono">
                    <span>{comp.players_count} Players</span>
                    <span className="text-emerald-400 font-medium">{comp.total_goals} Gls</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Standout Leaders Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Scorers */}
            <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-pitch-border">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-400" />
                  <h3 className="font-bold text-white text-sm">Top Scorers (Goals vs xG)</h3>
                </div>
                <button
                  onClick={() => {
                    setLeaderboardMetric('Gls');
                    navigateTo('leaderboards');
                  }}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                >
                  View All &rarr;
                </button>
              </div>
              <div className="space-y-2.5">
                {leaderboardLeaders.slice(0, 5).map((l, i) => (
                  <div
                    key={l.id || i}
                    onClick={() => navigateTo('profile', l.id)}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-surface/60 hover:bg-slate-800 border border-pitch-border/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center font-mono font-bold text-xs text-slate-500">#{l.rank}</span>
                      <div>
                        <p className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">{l.player}</p>
                        <p className="text-xs text-slate-400">{l.squad} · {l.competition}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold font-mono text-emerald-400">{l.value} <span className="text-xs text-slate-400 font-normal">Gls</span></p>
                      <p className="text-xs font-mono text-slate-400">{l.xg} xG</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions & Analytics Insights */}
            <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-pitch-border">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-white text-sm">Analytics Capabilities</h3>
                </div>
                <div className="space-y-3">
                  <div
                    onClick={() => navigateTo('explorer')}
                    className="p-3 rounded-lg bg-pitch-surface/60 hover:bg-slate-800 border border-pitch-border/60 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-white">Full Player Explorer</h4>
                      <p className="text-xs text-slate-400">Search and sort 2,854 players by xG, xAG, per-90 rates, and progressive carries.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div
                    onClick={() => navigateTo('compare')}
                    className="p-3 rounded-lg bg-pitch-surface/60 hover:bg-slate-800 border border-pitch-border/60 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-white">Player Comparison Matrix</h4>
                      <p className="text-xs text-slate-400">Side-by-side production benchmarks, radar dimension scores, and metric deltas.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>

                  <div
                    onClick={() => navigateTo('browse')}
                    className="p-3 rounded-lg bg-pitch-surface/60 hover:bg-slate-800 border border-pitch-border/60 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-white">Club Squad Roster Browser</h4>
                      <p className="text-xs text-slate-400">Browse squad cards by league and team with 3D flip card profiles.</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-pitch-border/60 text-xs text-slate-500 font-mono flex items-center justify-between">
                <span>DATASET: 2024/25 REGULAR SEASON</span>
                <span className="text-emerald-400">AUTHENTIC RECONCILIATION</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: PLAYER EXPLORER */}
      {currentTab === 'explorer' && (
        <div>
          <PageHeader
            title="Player Explorer"
            subtitle="Search, filter, and inspect 2,854 player records. Filter by role, minutes threshold, and sorting metric."
            season="2024/25"
            actions={
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedComp('');
                  setSelectedPos('');
                  setMinMinutes(0);
                  setSortBy('Gls');
                }}
                className="px-3 py-1.5 rounded-lg border border-pitch-border text-xs text-slate-300 hover:text-white bg-pitch-card hover:bg-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            }
          />

          <FilterBar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            competition={selectedComp}
            onCompetitionChange={setSelectedComp}
            position={selectedPos}
            onPositionChange={setSelectedPos}
            minMinutes={minMinutes}
            onMinMinutesChange={setMinMinutes}
            competitions={competitions}
            onReset={() => {
              setSearchQuery('');
              setSelectedComp('');
              setSelectedPos('');
              setMinMinutes(0);
            }}
          />

          {loadingExplorer ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-mono">Filtering player database...</p>
            </div>
          ) : explorerPlayers.length === 0 ? (
            <EmptyState
              title="No players matched your filters"
              message="Try lowering the minimum minutes threshold or clearing search filters."
              onReset={() => {
                setSearchQuery('');
                setSelectedComp('');
                setSelectedPos('');
                setMinMinutes(0);
              }}
            />
          ) : (
            <DataTable
              columns={explorerColumns}
              data={explorerPlayers}
              sortBy={sortBy}
              order={sortOrder}
              onSort={handleSortChange}
              onRowClick={(row) => navigateTo('profile', row.id || row.Rk)}
              onAddToCompare={toggleComparePlayer}
              compareList={compareList}
              pagination={explorerPagination}
              onPageChange={(p) => setExplorerPagination(prev => ({ ...prev, page: p }))}
            />
          )}
        </div>
      )}

      {/* VIEW: LEADERBOARDS */}
      {currentTab === 'leaderboards' && (
        <div>
          <PageHeader
            title="Statistical Leaderboards"
            subtitle="Rank players across scoring, expected values, playmaking, and progression actions."
            season="2024/25"
          />

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: 'Gls', label: 'Goals', category: 'Scoring' },
              { id: 'xG', label: 'Expected Goals (xG)', category: 'Advanced' },
              { id: 'Gls_minus_xG', label: 'Finishing Overperf. (Gls - xG)', category: 'Finishing' },
              { id: 'Ast', label: 'Assists', category: 'Playmaking' },
              { id: 'xAG', label: 'Expected Assists (xAG)', category: 'Advanced' },
              { id: 'PrgC', label: 'Prog. Carries (PrgC)', category: 'Progression' },
              { id: 'PrgP', label: 'Prog. Passes (PrgP)', category: 'Progression' },
              { id: 'Min', label: 'Minutes Played', category: 'Time' },
            ].map((m) => {
              const isActive = leaderboardMetric === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setLeaderboardMetric(m.id)}
                  className={`
                    px-3.5 py-2 rounded-lg text-xs font-medium transition-all
                    ${isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-pitch-card hover:bg-slate-800 text-slate-300 border border-pitch-border'}
                  `}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* League Filter */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <span className="text-xs text-slate-500 mr-1">Competition:</span>
            <button
              onClick={() => setLeaderboardComp('')}
              className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                leaderboardComp === ''
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-pitch-card text-slate-400 border border-pitch-border'
              }`}
            >
              All 5 Leagues
            </button>
            {competitions.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setLeaderboardComp(comp.id)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                  leaderboardComp === comp.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-pitch-card text-slate-400 border border-pitch-border'
                }`}
              >
                {comp.name}
              </button>
            ))}
          </div>

          {/* Leaders List */}
          {loadingLeaders ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-mono">Loading rankings...</p>
            </div>
          ) : (
            <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-pitch-border/60">
                {leaderboardLeaders.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigateTo('profile', item.id)}
                    className="p-4 hover:bg-slate-800/40 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`
                        w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm
                        ${item.rank === 1 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                          item.rank === 2 ? 'bg-slate-400/20 text-slate-200 border border-slate-400/40' :
                          item.rank === 3 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40' :
                          'text-slate-500 font-normal'}
                      `}>
                        {item.rank}
                      </span>
                      <div>
                        <h4 className="font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-2">
                          {item.player}
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-pitch-surface border border-pitch-border text-slate-400">
                            {item.position}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          {item.squad} · <span className="text-slate-500">{item.competition}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-slate-500 block">Matches / Mins</span>
                        <span className="text-xs font-mono text-slate-300">{item.matches} apps · {item.minutes}m</span>
                      </div>

                      <div className="text-right min-w-[80px]">
                        <span className="text-xl font-bold font-mono text-emerald-400">
                          {typeof item.value === 'number' && item.metric?.includes('minus')
                            ? (item.value > 0 ? `+${item.value.toFixed(2)}` : item.value.toFixed(2))
                            : item.value}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          {item.metric}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: COMPARISON */}
      {currentTab === 'compare' && (
        <div>
          <PageHeader
            title="Player Comparison Workspace"
            subtitle="Side-by-side performance benchmarks, scoring, progression, and rates."
            season="2024/25"
            actions={
              <button
                onClick={() => navigateTo('explorer')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border text-xs text-slate-300 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                Add Player from Explorer
              </button>
            }
          />

          {compareList.length === 0 ? (
            <EmptyState
              title="No players selected for comparison"
              message="Browse the Player Explorer and click the '+' button to select up to 5 players for side-by-side analysis."
              onReset={() => navigateTo('explorer')}
              resetText="Go to Player Explorer"
            />
          ) : (
            <div>
              {/* Selected Players Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {compareList.map((p) => (
                  <div key={p.id || p.Rk} className="bg-pitch-card border border-pitch-border rounded-xl p-4 relative shadow-sm">
                    <button
                      onClick={() => toggleComparePlayer(p)}
                      className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1"
                      title="Remove from comparison"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono">
                        {p.Player?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="pr-6">
                        <h4 className="font-bold text-white text-sm truncate">{p.Player}</h4>
                        <p className="text-xs text-slate-400 truncate">{p.Squad}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2 border-t border-pitch-border">
                      <div>
                        <span className="text-slate-500 block text-[10px]">GOALS</span>
                        <span className="font-mono font-bold text-white">{p.Gls}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">xG</span>
                        <span className="font-mono font-bold text-emerald-400">{p.xG}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">AST</span>
                        <span className="font-mono font-bold text-white">{p.Ast}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Metrics Matrix */}
              {loadingCompare ? (
                <div className="p-12 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm font-mono">Calculating comparison matrix...</p>
                </div>
              ) : comparisonData?.metrics ? (
                <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
                  <div className="p-4 bg-pitch-surface border-b border-pitch-border flex items-center justify-between">
                    <h3 className="font-bold text-sm text-white">Statistical Benchmark Matrix</h3>
                    <span className="text-xs text-slate-400 font-mono">Normalized 2024/25 Records</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-pitch-surface/60 text-xs font-mono uppercase text-slate-400 border-b border-pitch-border">
                        <tr>
                          <th className="py-3 px-4">Metric</th>
                          {comparisonData.players.map((p) => (
                            <th key={p.id} className="py-3 px-4 text-right">
                              {p.Player}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pitch-border/60">
                        {comparisonData.metrics.map((row) => (
                          <tr key={row.key} className="hover:bg-slate-800/30">
                            <td className="py-3 px-4 font-medium text-slate-300">
                              {row.label}
                            </td>
                            {comparisonData.players.map((p) => {
                              const val = row.values[String(p.id)];
                              return (
                                <td key={p.id} className="py-3 px-4 text-right font-mono font-semibold text-white">
                                  {val !== undefined && val !== null ? val : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* VIEW: SQUAD BROWSER (Classic modernized) */}
      {currentTab === 'browse' && (
        <div>
          <PageHeader
            title="Club Squad Roster Browser"
            subtitle="Explore clubs and players through interactive 3D analytics cards."
            season="2024/25"
            actions={
              selectedLegacyLeague && (
                <button
                  onClick={() => {
                    setSelectedLegacyLeague(null);
                    setSelectedLegacyTeam(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border text-xs text-slate-300 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> All Leagues
                </button>
              )
            }
          />

          {!selectedLegacyLeague ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {legacyLeagues.map((league) => (
                  <LeagueBanner
                    key={league}
                    league={{ name: league }}
                    onSelect={() => handleLegacyLeagueSelect(league)}
                  />
                ))}
              </div>
            </div>
          ) : !selectedLegacyTeam ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Select a Club in {selectedLegacyLeague.replace(/^[a-z]{2,3}\s/, '')}
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {legacyTeams.map((team) => (
                  <TeamBadge
                    key={team}
                    team={{ name: team, logo: '' }}
                    onSelect={() => handleLegacyTeamSelect(team)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <button
                    onClick={() => setSelectedLegacyTeam(null)}
                    className="text-xs text-slate-400 hover:text-emerald-400 font-mono mb-1 inline-flex items-center gap-1"
                  >
                    &larr; Back to Clubs
                  </button>
                  <h2 className="text-2xl font-bold text-white">{selectedLegacyTeam}</h2>
                  <p className="text-xs text-slate-400 font-mono">{legacyPlayers.length} Players Monitored</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {legacyPlayers.map((player) => (
                  <PlayerCard
                    key={player.Rk || player.id}
                    player={player}
                    onSelectProfile={(p) => navigateTo('profile', p.id || p.Rk)}
                    onCompare={(p) => toggleComparePlayer(p)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: PLAYER PROFILE */}
      {currentTab === 'profile' && (
        <div>
          <button
            onClick={() => navigateTo('explorer')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white font-mono mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Explorer
          </button>

          {loadingProfile ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-mono">Loading player dossier...</p>
            </div>
          ) : playerProfile ? (
            <div className="space-y-6">
              {/* Profile Hero Card */}
              <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold font-mono text-2xl flex items-center justify-center">
                      {playerProfile.identity.name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {playerProfile.identity.position}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {playerProfile.identity.nation}
                        </span>
                      </div>
                      <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                        {playerProfile.identity.name}
                      </h1>
                      <p className="text-sm text-slate-400">
                        {playerProfile.identity.squad} · <span className="text-slate-300">{playerProfile.identity.competition}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleComparePlayer(playerProfile.raw_record)}
                      className="px-4 py-2 rounded-lg bg-pitch-surface hover:bg-slate-800 border border-pitch-border text-xs font-medium text-slate-200 transition-colors"
                    >
                      {compareList.some(p => (p.id || p.Rk) === playerProfile.identity.id) ? '✓ In Comparison' : '+ Compare'}
                    </button>
                  </div>
                </div>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  title="Goals Scored"
                  value={playerProfile.scoring.goals}
                  subtext={`xG: ${playerProfile.scoring.expected_goals}`}
                  badge={playerProfile.scoring.finishing_differential > 0 ? `+${playerProfile.scoring.finishing_differential} Diff` : `${playerProfile.scoring.finishing_differential} Diff`}
                  badgeType={playerProfile.scoring.finishing_differential > 0 ? "positive" : "negative"}
                  accentColor="rose"
                />
                <StatCard
                  title="Assists"
                  value={playerProfile.playmaking.assists}
                  subtext={`xAG: ${playerProfile.playmaking.expected_assisted_goals}`}
                  badge={`${playerProfile.playmaking.goals_plus_assists} G+A`}
                  badgeType="accent"
                  accentColor="blue"
                />
                <StatCard
                  title="Playing Time"
                  value={`${playerProfile.playing_time.minutes}m`}
                  subtext={`${playerProfile.playing_time.matches_played} apps (${playerProfile.playing_time.starts} starts)`}
                  badge={`${playerProfile.playing_time.ninetys} 90s`}
                  badgeType="neutral"
                  accentColor="emerald"
                />
                <StatCard
                  title="Progression"
                  value={playerProfile.progression.progressive_carries}
                  subtext={`Passes: ${playerProfile.progression.progressive_passes}`}
                  badge="PrgC"
                  badgeType="accent"
                  accentColor="purple"
                />
              </div>

              {/* Per-90 Rates Breakdown */}
              <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-pitch-border font-mono">
                  Rates Per 90 Minutes (Standardized Output)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-pitch-surface border border-pitch-border text-center">
                    <span className="text-xs text-slate-400 block mb-1">Goals / 90</span>
                    <span className="text-xl font-bold font-mono text-emerald-400">{playerProfile.per_90_rates.goals_per_90}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-pitch-surface border border-pitch-border text-center">
                    <span className="text-xs text-slate-400 block mb-1">xG / 90</span>
                    <span className="text-xl font-bold font-mono text-cyan-400">{playerProfile.per_90_rates.xg_per_90}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-pitch-surface border border-pitch-border text-center">
                    <span className="text-xs text-slate-400 block mb-1">Assists / 90</span>
                    <span className="text-xl font-bold font-mono text-blue-400">{playerProfile.per_90_rates.assists_per_90}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-pitch-surface border border-pitch-border text-center">
                    <span className="text-xs text-slate-400 block mb-1">xAG / 90</span>
                    <span className="text-xl font-bold font-mono text-purple-400">{playerProfile.per_90_rates.xag_per_90}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Player not found"
              message="Could not locate the requested player record."
              onReset={() => navigateTo('explorer')}
              resetText="Return to Explorer"
            />
          )}
        </div>
      )}
    </AppLayout>
  );
}

export default App;
