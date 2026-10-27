import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import FinishingEfficiencyChart from './components/dashboard/FinishingEfficiencyChart';
import AttackingScatterChart from './components/dashboard/AttackingScatterChart';
import ProgressionMatrixChart from './components/dashboard/ProgressionMatrixChart';
import PlayerProfileView from './components/profile/PlayerProfileView';
import ComparisonRadarChart from './components/compare/ComparisonRadarChart';
import ComparisonMatrix from './components/compare/ComparisonMatrix';
import LeaderboardsView from './components/leaderboards/LeaderboardsView';
import DataManagementView from './components/data/DataManagementView';
import api from './services/api';

import {
  Trophy,
  Users,
  Target,
  Zap,
  ArrowRight,
  Shield,
  ArrowLeft,
  X,
  Plus,
  Search,
  LayoutGrid,
  List
} from 'lucide-react';

const unwrapList = (response) => {
  if (Array.isArray(response)) return response;
  if (response?.success && Array.isArray(response.data)) return response.data;
  if (response?.data && Array.isArray(response.data)) return response.data;
  return [];
};

function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0];
    return ['dashboard', 'explorer', 'leaderboards', 'compare', 'browse', 'profile', 'data'].includes(hash)
      ? hash
      : 'dashboard';
  });

  // Season Management State & Authoritative Sequence Tracking
  const [activeSeason, setActiveSeason] = useState('2025-2026');
  const [availableSeasons, setAvailableSeasons] = useState([{ id: '2025-2026', name: '2025/26 Historical Season' }]);
  const [isSwitchingSeason, setIsSwitchingSeason] = useState(false);
  const [seasonSwitchError, setSeasonSwitchError] = useState(null);
  const activeSeasonRef = useRef(activeSeason);

  useEffect(() => {
    activeSeasonRef.current = activeSeason;
  }, [activeSeason]);

  const formatSeasonName = useCallback((id) => {
    if (!id) return '2025/26';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  }, []);

  const formatSeasonShort = useCallback((id) => {
    if (!id) return '25/26';
    const m = id.match(/\d{2}(\d{2})[/-]\d{2}(\d{2})/);
    if (m) return `${m[1]}/${m[2]}`;
    return id;
  }, []);

  // Global Metadata & Competitions
  const [competitions, setCompetitions] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  // Dashboard State
  const [dashboardComp, setDashboardComp] = useState('');
  const [dashboardData, setDashboardData] = useState(null);

  // Explorer State
  const [explorerPlayers, setExplorerPlayers] = useState([]);
  const [explorerPagination, setExplorerPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComp, setSelectedComp] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [minMinutes, setMinMinutes] = useState(0);
  const [sortBy, setSortBy] = useState('Gls');
  const [sortOrder, setSortOrder] = useState('desc');
  const [rateMode, setRateMode] = useState(false);
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  // Leaderboards State
  const [leaderboardMetric, setLeaderboardMetric] = useState('Gls');
  const [leaderboardComp, setLeaderboardComp] = useState('');
  const [leaderboardPos, setLeaderboardPos] = useState('');
  const [leaderboardMinMin, setLeaderboardMinMin] = useState(0);
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
  const [loadingLegacyTeams, setLoadingLegacyTeams] = useState(false);
  const [loadingLegacyPlayers, setLoadingLegacyPlayers] = useState(false);
  const [clubSearchQuery, setClubSearchQuery] = useState('');
  const [playerSquadSearchQuery, setPlayerSquadSearchQuery] = useState('');
  const [selectedSquadPos, setSelectedSquadPos] = useState('ALL');
  const [squadViewMode, setSquadViewMode] = useState('cards');

  // Sync hash routing
  useEffect(() => {
    const handleHashChange = () => {
      const parts = window.location.hash.replace(/^#\/?/, '').split('/');
      const tab = parts[0];
      if (['dashboard', 'explorer', 'leaderboards', 'compare', 'browse', 'profile', 'data'].includes(tab)) {
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

  // Load stored seasons on mount
  useEffect(() => {
    api.getSeasons()
      .then(res => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setAvailableSeasons(res.data);
          const active = res.data.find(s => s.is_active);
          if (active) setActiveSeason(active.id);
        }
      })
      .catch(err => console.error("Error loading seasons:", err));
  }, []);

  const handleSeasonChange = async (seasonId) => {
    if (!seasonId || seasonId === activeSeason || isSwitchingSeason) return;
    const previousSeason = activeSeason;
    setIsSwitchingSeason(true);
    setSeasonSwitchError(null);

    try {
      const res = await api.setActiveSeason(seasonId);
      if (!res?.success) {
        throw new Error(res?.error || `Failed to activate season ${seasonId}`);
      }

      // Update authoritative state only after backend confirms success
      setActiveSeason(seasonId);

      // Reset incompatible season-dependent state
      setExplorerPagination(prev => ({ ...prev, page: 1 }));
      setCompareList([]);
      setComparisonData(null);
      setSelectedLegacyTeam(null);
      setLegacyTeams([]);
      setLegacyPlayers([]);
      setClubSearchQuery('');
      setPlayerSquadSearchQuery('');

      // Refresh seasons registry list
      const seasonsRes = await api.getSeasons().catch(() => null);
      if (seasonsRes?.success && Array.isArray(seasonsRes.data)) {
        setAvailableSeasons(seasonsRes.data);
      }
    } catch (err) {
      console.error("Error setting active season:", err);
      setSeasonSwitchError({
        failedSeason: seasonId,
        previousSeason,
        message: err.message || `Failed to activate season ${seasonId}. Reverted to previous season.`
      });
      // State remains previousSeason (rollback guaranteed)
    } finally {
      setIsSwitchingSeason(false);
    }
  };

  // Fetch initial metadata and competitions with activeSeason
  const fetchInitialData = useCallback(async () => {
    setGlobalError(null);
    const reqSeason = activeSeason;
    try {
      const [compRes, metaRes] = await Promise.all([
        api.getCompetitions(reqSeason).catch(() => ({ success: false, data: [] })),
        api.getMetadata(reqSeason).catch(() => ({ success: false, data: null }))
      ]);

      if (activeSeasonRef.current === reqSeason) {
        if (compRes?.success) setCompetitions(compRes.data);
        if (metaRes?.success) setMetadata(metaRes.data);
      }
    } catch (err) {
      if (activeSeasonRef.current === reqSeason) {
        setGlobalError(err.message);
      }
    }
  }, [activeSeason]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch Dashboard Analytics with request sequencing
  const fetchDashboardData = useCallback(async () => {
    const reqSeason = activeSeason;
    try {
      const res = await api.getDashboard(dashboardComp, reqSeason);
      if (res?.success && activeSeasonRef.current === reqSeason) {
        setDashboardData(res.data);
      }
    } catch (err) {
      if (activeSeasonRef.current === reqSeason) {
        console.error("Error fetching dashboard analytics:", err);
      }
    }
  }, [dashboardComp, activeSeason]);

  useEffect(() => {
    if (currentTab === 'dashboard') {
      fetchDashboardData();
    }
  }, [currentTab, fetchDashboardData]);

  // Fetch Explorer Players with request sequencing
  const fetchExplorerPlayers = useCallback(async () => {
    setLoadingExplorer(true);
    const reqSeason = activeSeason;
    try {
      const res = await api.getPlayers({
        search: searchQuery,
        competition: selectedComp,
        position: selectedPos,
        min_minutes: minMinutes,
        sort_by: sortBy,
        order: sortOrder,
        page: explorerPagination.page,
        limit: explorerPagination.limit,
        season: reqSeason
      });
      if (res?.success && activeSeasonRef.current === reqSeason) {
        setExplorerPlayers(res.data);
        if (res.pagination) {
          setExplorerPagination(res.pagination);
        }
      }
    } catch (err) {
      if (activeSeasonRef.current === reqSeason) {
        console.error("Error fetching explorer players:", err);
      }
    } finally {
      if (activeSeasonRef.current === reqSeason) {
        setLoadingExplorer(false);
      }
    }
  }, [searchQuery, selectedComp, selectedPos, minMinutes, sortBy, sortOrder, explorerPagination.page, explorerPagination.limit, activeSeason]);

  useEffect(() => {
    if (currentTab === 'explorer') {
      fetchExplorerPlayers();
    }
  }, [currentTab, fetchExplorerPlayers]);

  // Fetch Leaderboards with request sequencing
  const fetchLeaderboards = useCallback(async () => {
    setLoadingLeaders(true);
    const reqSeason = activeSeason;
    try {
      const res = await api.getLeaderboards({
        metric: leaderboardMetric,
        competition: leaderboardComp,
        position: leaderboardPos,
        min_minutes: leaderboardMinMin,
        limit: 20,
        season: reqSeason
      });
      if (res?.success && activeSeasonRef.current === reqSeason) {
        setLeaderboardLeaders(res.data);
      }
    } catch (err) {
      if (activeSeasonRef.current === reqSeason) {
        console.error("Error fetching leaderboards:", err);
      }
    } finally {
      if (activeSeasonRef.current === reqSeason) {
        setLoadingLeaders(false);
      }
    }
  }, [leaderboardMetric, leaderboardComp, leaderboardPos, leaderboardMinMin, activeSeason]);

  useEffect(() => {
    if (currentTab === 'leaderboards' || currentTab === 'dashboard') {
      fetchLeaderboards();
    }
  }, [currentTab, fetchLeaderboards]);

  // Fetch Comparison Data with activeSeason
  useEffect(() => {
    if (currentTab === 'compare' && compareList.length > 0) {
      setLoadingCompare(true);
      const reqSeason = activeSeason;
      const ids = compareList.map(p => p.id || p.Rk);
      api.comparePlayers(ids, reqSeason)
        .then(res => {
          if (res?.success && activeSeasonRef.current === reqSeason) {
            setComparisonData(res);
          }
        })
        .catch(err => {
          if (activeSeasonRef.current === reqSeason) {
            console.error("Error comparing players:", err);
          }
        })
        .finally(() => {
          if (activeSeasonRef.current === reqSeason) {
            setLoadingCompare(false);
          }
        });
    }
  }, [currentTab, compareList, activeSeason]);

  // Fetch Player Profile with activeSeason
  useEffect(() => {
    if (currentTab === 'profile' && profilePlayerId) {
      setLoadingProfile(true);
      const reqSeason = activeSeason;
      api.getPlayer(profilePlayerId, reqSeason)
        .then(res => {
          if (res?.success && activeSeasonRef.current === reqSeason) {
            setPlayerProfile(res.data);
          }
        })
        .catch(err => {
          if (activeSeasonRef.current === reqSeason) {
            console.error("Error loading profile:", err);
          }
        })
        .finally(() => {
          if (activeSeasonRef.current === reqSeason) {
            setLoadingProfile(false);
          }
        });
    }
  }, [currentTab, profilePlayerId, activeSeason]);

  // Classic Browser Handlers with activeSeason
  useEffect(() => {
    if (currentTab === 'browse') {
      api.getLegacyLeagues(activeSeason)
        .then(data => {
          setLegacyLeagues(unwrapList(data));
        })
        .catch(err => setGlobalError(err.message));
    }
  }, [currentTab, activeSeason]);

  const handleLegacyLeagueSelect = async (league) => {
    setSelectedLegacyLeague(league);
    setSelectedLegacyTeam(null);
    setLegacyTeams([]);
    setLegacyPlayers([]);
    setClubSearchQuery('');
    setLoadingLegacyTeams(true);
    const reqSeason = activeSeason;
    try {
      const response = await api.getLegacyTeams(league, reqSeason);
      if (activeSeasonRef.current === reqSeason) {
        setLegacyTeams(unwrapList(response));
      }
    } catch (err) {
      if (activeSeasonRef.current === reqSeason) {
        setGlobalError(err.message);
      }
    } finally {
      if (activeSeasonRef.current === reqSeason) {
        setLoadingLegacyTeams(false);
      }
    }
  };

  const handleLegacyTeamSelect = async (team) => {
    setSelectedLegacyTeam(team);
    setLegacyPlayers([]);
    setPlayerSquadSearchQuery('');
    setSelectedSquadPos('ALL');
    setLoadingLegacyPlayers(true);
    const reqSeason = activeSeason;
    try {
      const response = await api.getLegacyPlayersByTeam(selectedLegacyLeague, team, reqSeason);
      if (activeSeasonRef.current === reqSeason) {
        setLegacyPlayers(unwrapList(response));
      }
    } catch (err) {
      if (activeSeasonRef.current === reqSeason) {
        setGlobalError(err.message);
      }
    } finally {
      if (activeSeasonRef.current === reqSeason) {
        setLoadingLegacyPlayers(false);
      }
    }
  };

  const filteredClubs = useMemo(() => {
    if (!clubSearchQuery.trim()) return legacyTeams;
    const q = clubSearchQuery.trim().toLowerCase();
    return legacyTeams.filter(t => (typeof t === 'string' ? t : t?.name || '').toLowerCase().includes(q));
  }, [legacyTeams, clubSearchQuery]);

  const filteredSquadPlayers = useMemo(() => {
    return legacyPlayers.filter(p => {
      const matchesPos = selectedSquadPos === 'ALL' || (p.Pos && p.Pos.includes(selectedSquadPos));
      const matchesSearch = !playerSquadSearchQuery.trim() || 
        (p.Player && p.Player.toLowerCase().includes(playerSquadSearchQuery.trim().toLowerCase()));
      return matchesPos && matchesSearch;
    });
  }, [legacyPlayers, selectedSquadPos, playerSquadSearchQuery]);

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

  // Columns for Explorer Table (Dynamic: Totals vs Per-90 Rates)
  const explorerColumns = rateMode ? [
    { key: 'Player', label: 'Player & Club', sortable: true },
    { key: 'Pos', label: 'Pos', sortable: true },
    { key: 'Min', label: 'Mins', sortable: true, align: 'right' },
    { key: 'Gls_90', label: 'Goals/90', sortable: true, align: 'right' },
    { key: 'xG_90', label: 'xG/90', sortable: true, align: 'right' },
    { key: 'Ast_90', label: 'Ast/90', sortable: true, align: 'right' },
    { key: 'xAG_90', label: 'xAG/90', sortable: true, align: 'right' },
    { key: 'xG+xAG_90', label: 'xG+xAG/90', sortable: true, align: 'right' },
    { key: 'PrgC', label: 'PrgC', sortable: true, align: 'right' },
    { key: 'PrgP', label: 'PrgP', sortable: true, align: 'right' },
  ] : [
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
    <AppLayout 
        currentTab={currentTab} 
        onNavigate={navigateTo}
        activeSeason={activeSeason}
        availableSeasons={availableSeasons}
        onSelectSeason={handleSeasonChange}
        isSwitchingSeason={isSwitchingSeason}
      >
      {/* Season Switch Error Notification */}
      {seasonSwitchError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <X className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm text-white">Season Switch Failed</div>
              <div className="text-xs text-rose-300 font-mono mt-0.5">{seasonSwitchError.message}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSeasonChange(seasonSwitchError.failedSeason)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Retry Switch
            </button>
            <button
              onClick={() => setSeasonSwitchError(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
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
            subtitle={`${formatSeasonName(activeSeason)} Big 5 league metrics, expected outputs, progression dynamics, and player ratings.`}
            season={formatSeasonName(activeSeason)}
            activeSeason={activeSeason}
            availableSeasons={availableSeasons}
            onSelectSeason={handleSeasonChange}
            isSwitchingSeason={isSwitchingSeason}
            actions={
              <button
                onClick={() => navigateTo('explorer')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold text-sm transition-colors shadow-sm"
              >
                Open Player Explorer <ArrowRight className="w-4 h-4" />
              </button>
            }
          />

          {/* Competition Filter Selector Bar */}
          <div className="bg-pitch-card border border-pitch-border rounded-xl p-3 mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto">
              <span className="text-xs font-mono text-slate-400 mr-1 flex items-center gap-1.5 flex-shrink-0">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" /> Competition:
              </span>
              <button
                onClick={() => setDashboardComp('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  dashboardComp === ''
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-pitch-surface text-slate-400 hover:text-white border border-pitch-border'
                }`}
              >
                All 5 Leagues
              </button>
              {competitions.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => setDashboardComp(comp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    dashboardComp === comp.id
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                      : 'bg-pitch-surface text-slate-400 hover:text-white border border-pitch-border'
                  }`}
                >
                  {comp.name}
                </button>
              ))}
            </div>

            <div className="text-xs font-mono text-slate-400 hidden lg:block">
              {dashboardData?.kpis?.total_clubs || 96} Clubs · {dashboardData?.kpis?.total_players || 2854} Players
            </div>
          </div>

          {/* Responsive KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Players Monitored"
              value={dashboardData?.kpis?.total_players || metadata?.total_records || "2,854"}
              subtext={dashboardComp ? `${dashboardData?.kpis?.total_clubs} Clubs Monitored` : "Across Big 5 European Leagues"}
              icon={Users}
              badge={dashboardComp ? "Filtered" : "Top 5 Leagues"}
              accentColor="emerald"
            />
            <StatCard
              title="Monitored Clubs"
              value={dashboardData?.kpis?.total_clubs || 96}
              subtext="ENG, ESP, ITA, GER, FRA"
              icon={Trophy}
              badge={`${dashboardData?.kpis?.total_clubs || 96} Squads`}
              accentColor="blue"
            />
            <StatCard
              title="Goals Scored"
              value={dashboardData?.kpis?.total_goals?.toLocaleString() || "4,806"}
              subtext={`Assists: ${dashboardData?.kpis?.total_assists?.toLocaleString() || "3,200+"}`}
              icon={Target}
              badge={`Full ${formatSeasonShort(activeSeason)}`}
              accentColor="rose"
            />
            <StatCard
              title="Cumulative xG"
              value={dashboardData?.kpis?.total_xg ? `${dashboardData.kpis.total_xg.toLocaleString()}` : "4,870"}
              subtext={`Finishing: ${dashboardData?.kpis?.finishing_delta > 0 ? `+${dashboardData.kpis.finishing_delta}` : dashboardData?.kpis?.finishing_delta || '0'} Goals`}
              icon={Zap}
              badge={dashboardData?.kpis?.finishing_delta >= 0 ? "Overperforming xG" : "Underperforming xG"}
              badgeType={dashboardData?.kpis?.finishing_delta >= 0 ? "positive" : "negative"}
              accentColor="purple"
            />
          </div>

          {/* Analytics Charts Grid - Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <FinishingEfficiencyChart
              overperformers={dashboardData?.overperformers || []}
              underperformers={dashboardData?.underperformers || []}
              onPlayerClick={(id) => navigateTo('profile', id)}
            />
            <AttackingScatterChart
              data={dashboardData?.scatter_data || []}
              onPlayerClick={(id) => navigateTo('profile', id)}
            />
          </div>

          {/* Analytics Charts Grid - Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <ProgressionMatrixChart
              progressionLeaders={dashboardData?.progression_leaders || []}
              onPlayerClick={(id) => navigateTo('profile', id)}
            />

            {/* Standout Scorers & Creators */}
            <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-pitch-border">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-400" />
                    <h3 className="font-bold text-white text-sm">Top Goal Scorers</h3>
                  </div>
                  <button
                    onClick={() => {
                      setLeaderboardMetric('Gls');
                      navigateTo('leaderboards');
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Leaderboards &rarr;
                  </button>
                </div>
                <div className="space-y-2.5">
                  {(dashboardData?.top_scorers || []).slice(0, 5).map((l, i) => (
                    <div
                      key={l.id || i}
                      onClick={() => navigateTo('profile', l.id)}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-pitch-surface/60 hover:bg-slate-800 border border-pitch-border/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center font-mono font-bold text-xs text-slate-500">#{i + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-white hover:text-emerald-400 transition-colors">{l.Player}</p>
                          <p className="text-xs text-slate-400">{l.Squad} · {l.competition_name || l.Comp}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold font-mono text-emerald-400">{l.Gls} <span className="text-xs text-slate-400 font-normal">Gls</span></p>
                        <p className="text-xs font-mono text-slate-400">{l.xG} xG</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-pitch-border/60 mt-4 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono">Ranked by Total Output</span>
                <button
                  onClick={() => navigateTo('explorer')}
                  className="text-xs text-slate-300 hover:text-emerald-400 font-medium flex items-center gap-1"
                >
                  Browse all 2,854 players <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Analytical Provenance & Model Limitations Banner */}
          <div className="bg-pitch-card/60 border border-pitch-border rounded-xl p-5 shadow-sm text-xs text-slate-400 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-pitch-border/60">
              <span className="font-mono font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-400" /> Data Provenance & Model Notes
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {formatSeasonName(activeSeason)} Regular Season Coverage
              </span>
            </div>
            <p>
              This analytics engine models player-level aggregates across the Big 5 European leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1).
              Expected Goals (xG) and Expected Assisted Goals (xAG) evaluate chance quality based on historical shot profiles.
            </p>
            <p className="text-slate-500">
              * Note: Player records reflect distinct spells per club. Performance evaluations must account for minutes played, tactical roles, and competition strength.
            </p>
          </div>
        </div>
      )}

      {/* VIEW: PLAYER EXPLORER */}
      {currentTab === 'explorer' && (
        <div>
          <PageHeader
            title="Player Explorer"
            subtitle={`Search, filter, and inspect ${metadata?.total_records ? Number(metadata.total_records).toLocaleString() : '2,854'} player records. Filter by role, minutes threshold, and sorting metric.`}
            season={formatSeasonName(activeSeason)}
            activeSeason={activeSeason}
            availableSeasons={availableSeasons}
            onSelectSeason={handleSeasonChange}
            isSwitchingSeason={isSwitchingSeason}
            actions={
              <div className="flex items-center gap-2">
                <div className="flex items-center p-0.5 rounded-lg bg-pitch-card border border-pitch-border">
                  <button
                    onClick={() => {
                      setRateMode(false);
                      setSortBy('Gls');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      !rateMode
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Totals (Output)
                  </button>
                  <button
                    onClick={() => {
                      setRateMode(true);
                      setSortBy('Gls_90');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      rateMode
                        ? 'bg-cyan-500/20 text-cyan-400 font-bold shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Per 90 (Rates)
                  </button>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedComp('');
                    setSelectedPos('');
                    setMinMinutes(0);
                    setSortBy(rateMode ? 'Gls_90' : 'Gls');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-pitch-border text-xs text-slate-300 hover:text-white bg-pitch-card hover:bg-slate-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
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
            season={formatSeasonName(activeSeason)}
            activeSeason={activeSeason}
            availableSeasons={availableSeasons}
            onSelectSeason={handleSeasonChange}
            isSwitchingSeason={isSwitchingSeason}
          />

          <LeaderboardsView
            leaders={leaderboardLeaders}
            loading={loadingLeaders}
            activeMetric={leaderboardMetric}
            onSelectMetric={setLeaderboardMetric}
            activeComp={leaderboardComp}
            onSelectComp={setLeaderboardComp}
            activePosition={leaderboardPos}
            onSelectPosition={setLeaderboardPos}
            minMinutes={leaderboardMinMin}
            onSelectMinMinutes={setLeaderboardMinMin}
            competitions={competitions}
            onPlayerClick={(id) => navigateTo('profile', id)}
            onCompareToggle={toggleComparePlayer}
            isCompared={(id) => compareList.some(p => (p.id || p.Rk) === id)}
            season={formatSeasonName(activeSeason)}
          />
        </div>
      )}

      {/* VIEW: COMPARISON */}
      {currentTab === 'compare' && (
        <div>
          <PageHeader
            title="Player Comparison Workspace"
            subtitle="Side-by-side performance benchmarks, scoring, progression, and rates."
            season={formatSeasonName(activeSeason)}
            activeSeason={activeSeason}
            availableSeasons={availableSeasons}
            onSelectSeason={handleSeasonChange}
            isSwitchingSeason={isSwitchingSeason}
            actions={
              <div className="flex items-center gap-2">
                {compareList.length > 0 && (
                  <button
                    onClick={() => setCompareList([])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-rose-950/40 hover:border-rose-500/40 border border-pitch-border text-xs text-rose-400 font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear All
                  </button>
                )}
                <button
                  onClick={() => navigateTo('explorer')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Player
                </button>
              </div>
            }
          />

          {compareList.length === 0 ? (
            <EmptyState
              title="No players selected for comparison"
              message="Browse the Player Explorer or Leaderboards and click the compare button to select up to 5 players for side-by-side analysis."
              onReset={() => navigateTo('explorer')}
              resetText="Go to Player Explorer"
            />
          ) : (
            <div className="space-y-6">
              {/* Selected Players Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {compareList.map((p, idx) => {
                  const borderColors = [
                    'border-emerald-500/40 hover:border-emerald-500',
                    'border-cyan-500/40 hover:border-cyan-500',
                    'border-rose-500/40 hover:border-rose-500',
                    'border-amber-500/40 hover:border-amber-500',
                    'border-purple-500/40 hover:border-purple-500'
                  ];
                  const dotColors = [
                    'bg-emerald-500',
                    'bg-cyan-500',
                    'bg-rose-500',
                    'bg-amber-500',
                    'bg-purple-500'
                  ];

                  return (
                    <div
                      key={p.id || p.Rk}
                      className={`bg-pitch-card border rounded-xl p-4 relative shadow-sm transition-all ${borderColors[idx % borderColors.length]}`}
                    >
                      <button
                        onClick={() => toggleComparePlayer(p)}
                        className="absolute top-3 right-3 text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Remove from comparison"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-pitch-surface border border-pitch-border flex items-center justify-center relative">
                          <span className="font-bold font-mono text-white text-xs">
                            {p.Player?.substring(0, 2).toUpperCase()}
                          </span>
                          <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${dotColors[idx % dotColors.length]} border-2 border-slate-900`}></span>
                        </div>
                        <div
                          onClick={() => navigateTo('profile', p.id || p.Rk)}
                          className="pr-6 cursor-pointer hover:text-emerald-400"
                        >
                          <h4 className="font-bold text-white text-sm truncate">{p.Player}</h4>
                          <p className="text-xs text-slate-400 truncate">{p.Squad} · <span className="text-slate-500 font-mono">{p.Pos}</span></p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2.5 border-t border-pitch-border/60 font-mono">
                        <div>
                          <span className="text-slate-500 block text-[10px]">GOALS</span>
                          <span className="font-bold text-white">{p.Gls}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">xG</span>
                          <span className="font-bold text-cyan-400">{p.xG}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">AST</span>
                          <span className="font-bold text-white">{p.Ast}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {loadingCompare ? (
                <div className="p-16 text-center text-slate-400">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-sm font-mono">Calculating head-to-head comparison metrics...</p>
                </div>
              ) : comparisonData?.metrics ? (
                <div className="space-y-6">
                  {/* Radar Chart Visual */}
                  <ComparisonRadarChart
                    radarData={comparisonData.radar}
                    players={comparisonData.players}
                  />

                  {/* Benchmark Matrix */}
                  <ComparisonMatrix
                    comparisonData={comparisonData}
                    onPlayerClick={(id) => navigateTo('profile', id)}
                  />
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
            subtitle="Explore clubs and players through interactive 3D analytics cards and scouting tables."
            season={formatSeasonName(activeSeason)}
            activeSeason={activeSeason}
            availableSeasons={availableSeasons}
            onSelectSeason={handleSeasonChange}
            isSwitchingSeason={isSwitchingSeason}
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
              {/* League Header with Search & Badge Count */}
              <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-white">
                          {selectedLegacyLeague.replace(/^[a-z]{2,3}\s/, '')}
                        </h2>
                        <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-pitch-border">
                          {selectedLegacyLeague.split(' ')[0].toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">
                        {loadingLegacyTeams ? 'Loading club registry...' : `${legacyTeams.length} Clubs Competing in ${formatSeasonName(activeSeason)} Season`}
                      </p>
                    </div>
                  </div>

                  {/* Club Search Bar */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-72">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search clubs (e.g. Madrid, Barca)..."
                        value={clubSearchQuery}
                        onChange={(e) => setClubSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-pitch-surface border border-pitch-border rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                      />
                      {clubSearchQuery && (
                        <button
                          onClick={() => setClubSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clubs Content: Loading / Empty / Grid */}
              {loadingLegacyTeams ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="bg-pitch-card border border-pitch-border rounded-xl p-5 animate-pulse flex flex-col items-center">
                      <div className="w-14 h-14 rounded-xl bg-slate-700/60 mb-3"></div>
                      <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : legacyTeams.length === 0 ? (
                <EmptyState
                  title="No Clubs Available"
                  message={`Unable to load clubs for ${selectedLegacyLeague.replace(/^[a-z]{2,3}\s/, '')}. Please check backend connectivity.`}
                  onReset={() => handleLegacyLeagueSelect(selectedLegacyLeague)}
                  resetText="Retry Loading Clubs"
                />
              ) : filteredClubs.length === 0 ? (
                <EmptyState
                  title="No clubs matched"
                  message={`No clubs in ${selectedLegacyLeague.replace(/^[a-z]{2,3}\s/, '')} match "${clubSearchQuery}".`}
                  onReset={() => setClubSearchQuery('')}
                  resetText="Clear Search"
                />
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredClubs.map((team) => {
                    const teamName = typeof team === 'string' ? team : team.name;
                    return (
                      <TeamBadge
                        key={teamName}
                        team={{ name: teamName, logo: team?.logo || '' }}
                        onSelect={() => handleLegacyTeamSelect(teamName)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Club Header & Controls */}
              <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 mb-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <button
                      onClick={() => setSelectedLegacyTeam(null)}
                      className="text-xs text-slate-400 hover:text-emerald-400 font-mono mb-2 inline-flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to {selectedLegacyLeague.replace(/^[a-z]{2,3}\s/, '')} Clubs
                    </button>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-white">{selectedLegacyTeam}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {legacyPlayers.length} Squad Players
                      </span>
                    </div>
                  </div>

                  {/* Filter & View Mode Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Position Filter Pills */}
                    <div className="flex items-center bg-pitch-surface border border-pitch-border rounded-lg p-1 text-xs font-mono">
                      {['ALL', 'FW', 'MF', 'DF', 'GK'].map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setSelectedSquadPos(pos)}
                          className={`px-2.5 py-1 rounded-md transition-colors ${
                            selectedSquadPos === pos
                              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>

                    {/* Search inside squad */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search player..."
                        value={playerSquadSearchQuery}
                        onChange={(e) => setPlayerSquadSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 bg-pitch-surface border border-pitch-border rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60 w-40"
                      />
                    </div>

                    {/* View Switcher: Cards vs Table */}
                    <div className="flex items-center bg-pitch-surface border border-pitch-border rounded-lg p-1">
                      <button
                        onClick={() => setSquadViewMode('cards')}
                        className={`p-1.5 rounded transition-colors ${
                          squadViewMode === 'cards' ? 'bg-pitch-card text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Card Grid View"
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSquadViewMode('table')}
                        className={`p-1.5 rounded transition-colors ${
                          squadViewMode === 'table' ? 'bg-pitch-card text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Roster Table View"
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Display */}
              {loadingLegacyPlayers ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="bg-pitch-card border border-pitch-border rounded-xl p-5 animate-pulse">
                      <div className="h-4 w-32 bg-slate-700/60 rounded mb-2"></div>
                      <div className="h-3 w-20 bg-slate-800 rounded mb-4"></div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="h-8 bg-slate-700/40 rounded"></div>
                        <div className="h-8 bg-slate-700/40 rounded"></div>
                        <div className="h-8 bg-slate-700/40 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : legacyPlayers.length === 0 ? (
                <EmptyState
                  title="No Players Found"
                  message={`Unable to load squad roster for ${selectedLegacyTeam}.`}
                  onReset={() => handleLegacyTeamSelect(selectedLegacyTeam)}
                  resetText="Retry Loading Squad"
                />
              ) : filteredSquadPlayers.length === 0 ? (
                <EmptyState
                  title="No Players Matched"
                  message="No players match the selected filters."
                  onReset={() => {
                    setPlayerSquadSearchQuery('');
                    setSelectedSquadPos('ALL');
                  }}
                  resetText="Clear Filters"
                />
              ) : squadViewMode === 'cards' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredSquadPlayers.map((player) => (
                    <PlayerCard
                      key={player.Rk || player.id}
                      player={player}
                      onSelectProfile={(p) => navigateTo('profile', p.id || p.Rk)}
                      onCompare={(p) => toggleComparePlayer(p)}
                      isCompared={compareList.some(c => (c.id || c.Rk) === (player.id || player.Rk))}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-pitch-border bg-pitch-surface/60 text-slate-400 font-mono uppercase tracking-wider">
                          <th className="py-3 px-4">Player</th>
                          <th className="py-3 px-3">Pos</th>
                          <th className="py-3 px-3">Age</th>
                          <th className="py-3 px-3 text-right">Apps</th>
                          <th className="py-3 px-3 text-right">Mins</th>
                          <th className="py-3 px-3 text-right">Goals</th>
                          <th className="py-3 px-3 text-right">xG</th>
                          <th className="py-3 px-3 text-right">Assists</th>
                          <th className="py-3 px-3 text-right">xAG</th>
                          <th className="py-3 px-3 text-right">PrgC</th>
                          <th className="py-3 px-3 text-right">PrgP</th>
                          <th className="py-3 px-4 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-pitch-border/40">
                        {filteredSquadPlayers.map((p) => {
                          const pId = p.id || p.Rk;
                          const isComp = compareList.some(c => (c.id || c.Rk) === pId);
                          return (
                            <tr key={pId} className="hover:bg-slate-800/40 transition-colors">
                              <td className="py-3 px-4 font-medium text-white">
                                <button
                                  onClick={() => navigateTo('profile', pId)}
                                  className="hover:text-emerald-400 hover:underline text-left font-semibold"
                                >
                                  {p.Player}
                                </button>
                                <span className="block text-[10px] text-slate-400 font-mono">{p.Nation || ''}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                                  p.Pos?.includes('FW') ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' :
                                  p.Pos?.includes('MF') ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' :
                                  p.Pos?.includes('DF') ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                                  'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}>
                                  {p.Pos}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-300 font-mono">{p.Age || '-'}</td>
                              <td className="py-3 px-3 text-right text-slate-300 font-mono">{p.MP || 0}</td>
                              <td className="py-3 px-3 text-right text-slate-300 font-mono font-medium">{p.Min?.toLocaleString() || 0}</td>
                              <td className="py-3 px-3 text-right text-emerald-400 font-mono font-bold">{p.Gls || 0}</td>
                              <td className="py-3 px-3 text-right text-slate-300 font-mono">{Number(p.xG || 0).toFixed(1)}</td>
                              <td className="py-3 px-3 text-right text-cyan-400 font-mono font-bold">{p.Ast || 0}</td>
                              <td className="py-3 px-3 text-right text-slate-300 font-mono">{Number(p.xAG || 0).toFixed(1)}</td>
                              <td className="py-3 px-3 text-right text-slate-300 font-mono">{p.PrgC || 0}</td>
                              <td className="py-3 px-3 text-right text-slate-300 font-mono">{p.PrgP || 0}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => navigateTo('profile', pId)}
                                    className="px-2 py-1 rounded bg-pitch-surface hover:bg-slate-700 text-slate-300 hover:text-white border border-pitch-border text-[11px] transition-colors"
                                  >
                                    Dossier
                                  </button>
                                  <button
                                    onClick={() => toggleComparePlayer(p)}
                                    className={`px-2 py-1 rounded text-[11px] transition-colors border ${
                                      isComp
                                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                                        : 'bg-pitch-surface hover:bg-slate-700 text-slate-300 hover:text-white border-pitch-border'
                                    }`}
                                  >
                                    {isComp ? 'Compared' : '+ Compare'}
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
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: PLAYER PROFILE */}
      {currentTab === 'profile' && (
        <div>
          {loadingProfile ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-mono">Loading player dossier...</p>
            </div>
          ) : playerProfile ? (
            <PlayerProfileView
              profile={playerProfile}
              onBack={() => navigateTo('explorer')}
              onCompare={() => toggleComparePlayer(playerProfile.raw_record)}
              isCompared={compareList.some(p => (p.id || p.Rk) === playerProfile.identity.id)}
            />
          ) : (
            <EmptyState
              title="Player not found"
              message={`Could not locate the requested player record in the ${formatSeasonName(activeSeason)} dataset.`}
              onReset={() => navigateTo('explorer')}
              resetText="Return to Explorer"
            />
          )}
        </div>
      )}

      {/* VIEW: DATASET MANAGEMENT */}
      {currentTab === 'data' && (
        <DataManagementView
          activeSeason={activeSeason}
          onSeasonChange={handleSeasonChange}
        />
      )}
    </AppLayout>
  );
}

export default App;
