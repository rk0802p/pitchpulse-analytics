import React, { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from './components/layout/AppLayout';
import TerraceHomeView from './components/dashboard/TerraceHomeView';
import LeaderboardsView from './components/leaderboards/LeaderboardsView';
import ComparisonMatrix from './components/compare/ComparisonMatrix';
import PlayerProfileView from './components/profile/PlayerProfileView';
import PlayerExplorerView from './components/explorer/PlayerExplorerView';
import SquadBrowserView from './components/squad/SquadBrowserView';
import DataManagementView from './components/data/DataManagementView';
import PlotAnyMetricView from './components/charts/PlotAnyMetricView';
import ShortlistDrawer from './components/common/ShortlistDrawer';
import api from './services/api';
import {
  parseHash,
  parseExplorerQuery,
  serializeExplorerHash,
  parseCompareQuery,
  serializeCompareHash,
} from './utils/hashRoute';
import {
  loadShortlist,
  saveShortlist,
  toggleShortlistItem,
  updateShortlistItem,
  removeShortlistItem,
  loadSavedCompare,
  saveSavedCompare,
  getAgeRangeBounds,
} from './utils/shortlistStore';

function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState(() => {
    return parseHash(window.location.hash).tab;
  });

  // Season State
  const [activeSeason, setActiveSeason] = useState('2024-2025');
  const [availableSeasons, setAvailableSeasons] = useState([
    { id: '2024-2025', name: '2024/25 Regular Season' },
  ]);
  const [seasonQuality, setSeasonQuality] = useState(null);
  const [isSwitchingSeason, setIsSwitchingSeason] = useState(false);

  // Global League / Competition Filter
  const [selectedComp, setSelectedComp] = useState('');

  // Metadata & Stats
  const [metadata, setMetadata] = useState(null);
  const [topScorer, setTopScorer] = useState(null);
  const [topAssister, setTopAssister] = useState(null);
  const [topProgression, setTopProgression] = useState(null);

  // Global Players & Squads for Global Search Palette + Scoped Explorer Club Dropdown
  const [allPlayers, setAllPlayers] = useState([]);
  const [squadsList, setSquadsList] = useState([]);
  const [explorerSquads, setExplorerSquads] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Player Explorer State
  const [explorerPlayers, setExplorerPlayers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('');
  const [minMinutes, setMinMinutes] = useState(0);
  const [ageRange, setAgeRange] = useState('');
  const [statMode, setStatMode] = useState('totals'); // 'totals' | 'per90'
  const [sortBy, setSortBy] = useState('Gls');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  // Comparison State (persisted in localStorage)
  const [compareList, setCompareList] = useState(() => loadSavedCompare());

  // Scout Shortlist State (persisted in localStorage)
  const [shortlist, setShortlist] = useState(() => loadShortlist());
  const [shortlistOpen, setShortlistOpen] = useState(false);

  // Selected Player Profile State
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Squad Browser State
  const [selectedSquadDetail, setSelectedSquadDetail] = useState(null);

  // Track last hydrated compare hash so we don't re-fetch needlessly
  const lastCompareHydrateRef = useRef('');

  // Persist shortlist & compare list to localStorage
  useEffect(() => {
    saveShortlist(shortlist);
  }, [shortlist]);

  useEffect(() => {
    saveSavedCompare(compareList);
  }, [compareList]);

  // Sync hash changes with navigation and hydrate deep-linked profile / explorer / compare
  useEffect(() => {
    let cancelled = false;

    const handleHashChange = () => {
      const rawHash = window.location.hash;
      const { tab, param } = parseHash(rawHash);

      if (tab === 'profile') {
        const rawParam = param ? param.trim() : '';
        if (!rawParam || rawParam === 'undefined' || rawParam === 'null') {
          setCurrentTab('explorer');
          window.location.hash = '#explorer';
          return;
        }
        setCurrentTab('profile');
        api
          .getPlayer(rawParam, activeSeason)
          .then((pRes) => {
            if (cancelled) return;
            const raw = pRes?.data?.raw_record;
            const iden = pRes?.data?.identity || pRes?.identity;
            if (raw) {
              setSelectedPlayer(raw);
            } else if (iden) {
              setSelectedPlayer({
                id: iden.id,
                Player: iden.name,
                Squad: iden.squad,
                Comp: iden.competition,
                Pos: iden.position,
                Age: iden.age,
                Min: iden.minutes,
                season: activeSeason,
              });
            } else {
              setSelectedPlayer({ Player: rawParam, season: activeSeason });
            }
          })
          .catch(() => {
            if (cancelled) return;
            api
              .getPlayers({ season: activeSeason, search: rawParam, limit: 1 })
              .then((res) => {
                if (cancelled) return;
                const p = res?.data?.[0] || res?.[0];
                if (p) {
                  setSelectedPlayer(p);
                } else {
                  setSelectedPlayer({ Player: rawParam, season: activeSeason });
                }
              })
              .catch(() => {
                if (!cancelled) setSelectedPlayer({ Player: rawParam, season: activeSeason });
              });
          });
      } else if (tab === 'explorer') {
        setCurrentTab('explorer');
        if (rawHash.includes('?')) {
          const parsed = parseExplorerQuery(rawHash);
          if (parsed.season && parsed.season !== activeSeason) {
            setActiveSeason(parsed.season);
          }
          if (parsed.q !== undefined) setSearchQuery(parsed.q);
          if (parsed.comp !== undefined) setSelectedComp(parsed.comp);
          if (parsed.pos !== undefined) setSelectedPos(parsed.pos);
          if (parsed.squad !== undefined) setSelectedSquad(parsed.squad);
          if (parsed.min !== undefined) setMinMinutes(parsed.min);
          if (parsed.age !== undefined) setAgeRange(parsed.age);
          if (parsed.mode !== undefined) setStatMode(parsed.mode);
          if (parsed.sort) setSortBy(parsed.sort);
          if (parsed.order) setSortOrder(parsed.order);
        }
      } else if (tab === 'compare') {
        setCurrentTab('compare');
        if (rawHash.includes('?')) {
          const parsed = parseCompareQuery(rawHash);
          const targetSeason = parsed.season || activeSeason;
          if (parsed.season && parsed.season !== activeSeason) {
            setActiveSeason(parsed.season);
          }
          const sig = `${targetSeason}:${parsed.ids.join(',')}`;
          if (parsed.ids.length >= 2 && lastCompareHydrateRef.current !== sig) {
            lastCompareHydrateRef.current = sig;
            api
              .comparePlayers(parsed.ids, targetSeason)
              .then((res) => {
                if (cancelled) return;
                const payload = res?.data || res;
                if (Array.isArray(payload?.players) && payload.players.length > 0) {
                  setCompareList(payload.players.slice(0, 4));
                }
              })
              .catch(() => {});
          }
        }
      } else if (['dashboard', 'plots', 'leaderboards', 'browse', 'data'].includes(tab)) {
        setCurrentTab(tab);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => {
      cancelled = true;
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [activeSeason]);

  // Keep Explorer URL hash in sync with active filters (via replaceState to avoid hashchange loops)
  useEffect(() => {
    if (currentTab !== 'explorer') return;
    const nextHash = serializeExplorerHash({
      season: activeSeason,
      q: searchQuery,
      comp: selectedComp,
      pos: selectedPos,
      squad: selectedSquad,
      min: minMinutes,
      age: ageRange,
      mode: statMode,
      sort: sortBy,
      order: sortOrder,
    });
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [
    currentTab,
    activeSeason,
    searchQuery,
    selectedComp,
    selectedPos,
    selectedSquad,
    minMinutes,
    ageRange,
    statMode,
    sortBy,
    sortOrder,
  ]);

  // Keep Compare URL hash in sync when comparing >= 2 players
  useEffect(() => {
    if (currentTab !== 'compare') return;
    const ids = compareList.map((p) => p.id || p.Rk || p.Player).filter(Boolean);
    const nextHash =
      ids.length >= 2
        ? serializeCompareHash({ season: activeSeason, ids })
        : '#compare';
    if (window.location.hash !== nextHash) {
      window.history.replaceState(null, '', nextHash);
    }
  }, [currentTab, activeSeason, compareList]);

  // Load Seasons on Mount
  useEffect(() => {
    api
      .getSeasons()
      .then((res) => {
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          setAvailableSeasons(res.data);
          // Only override default if no deep-link season was already parsed
          const active = res.data.find((s) => s.is_active);
          if (active && !window.location.hash.includes('season=')) {
            setActiveSeason(active.id);
          }
        }
      })
      .catch((err) => console.error('Error loading seasons:', err));
  }, []);

  // Load Season-Scoped Metadata, Quality, Squads, and Global Search Pool
  useEffect(() => {
    let cancelled = false;
    setSeasonQuality(null);

    api
      .getSeasonQuality(activeSeason)
      .then((res) => {
        if (!cancelled) setSeasonQuality(res?.data || null);
      })
      .catch(() => {
        if (!cancelled) setSeasonQuality(null);
      });

    api
      .getMetadata(activeSeason)
      .then((res) => {
        if (!cancelled && res?.success && res.data) {
          setMetadata(res.data);
        }
      })
      .catch((err) => console.error('Error loading metadata:', err));

    api
      .getTeams(undefined, activeSeason)
      .then((res) => {
        if (cancelled) return;
        const list =
          res?.success && Array.isArray(res.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
        setSquadsList(list);
      })
      .catch(() => {});

    api
      .getPlayers({ season: activeSeason, limit: 500, sort_by: 'Min', order: 'desc' })
      .then((res) => {
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setAllPlayers(res.data);
        } else if (Array.isArray(res)) {
          setAllPlayers(res);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [activeSeason]);

  // Load league-scoped clubs list for Explorer dropdown ("All Clubs (20)" for EPL, "All Clubs (96)" for Big 5)
  useEffect(() => {
    let cancelled = false;
    api
      .getTeams(selectedComp || undefined, activeSeason)
      .then((res) => {
        if (cancelled) return;
        const list =
          res?.success && Array.isArray(res.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
        setExplorerSquads(list);
        setSelectedSquad((prev) => (prev && !list.includes(prev) ? '' : prev));
      })
      .catch(() => {
        if (!cancelled) setExplorerSquads(squadsList);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSeason, selectedComp, squadsList]);

  // Load Executive Dashboard Analytics & Top Performers
  useEffect(() => {
    let cancelled = false;
    setLoadingDashboard(true);
    api
      .getDashboard(selectedComp || undefined, activeSeason)
      .then((res) => {
        if (cancelled) return;
        const d = res?.data || res;
        if (d) {
          setDashboardData(d);
          setTopScorer(d.top_scorers?.[0] || null);
          setTopAssister(d.top_creators?.[0] || null);
          setTopProgression(d.progression_leaders?.[0] || null);
        }
      })
      .catch((err) => console.error('Error loading dashboard data:', err))
      .finally(() => {
        if (!cancelled) setLoadingDashboard(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSeason, selectedComp]);

  // Fetch Explorer Players (with age_min / age_max bounds)
  useEffect(() => {
    if (currentTab !== 'explorer') return;
    let cancelled = false;
    setLoadingExplorer(true);
    const { ageMin, ageMax } = getAgeRangeBounds(ageRange);

    api
      .getPlayers({
        season: activeSeason,
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery,
        competition: selectedComp || undefined,
        position: selectedPos || undefined,
        squad: selectedSquad || undefined,
        min_minutes: minMinutes || undefined,
        age_min: ageMin ?? undefined,
        age_max: ageMax ?? undefined,
        sort_by: sortBy,
        order: sortOrder,
      })
      .then((res) => {
        if (cancelled) return;
        if (res?.success) {
          setExplorerPlayers(res.data || []);
          if (res.pagination) setPagination(res.pagination);
        } else if (Array.isArray(res)) {
          setExplorerPlayers(res);
        }
      })
      .catch((err) => console.error('Error fetching explorer players:', err))
      .finally(() => {
        if (!cancelled) setLoadingExplorer(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentTab,
    activeSeason,
    pagination.page,
    pagination.limit,
    searchQuery,
    selectedComp,
    selectedPos,
    selectedSquad,
    minMinutes,
    ageRange,
    sortBy,
    sortOrder,
  ]);

  const handleSelectPlayer = (player) => {
    if (!player) return;
    let resolvedPlayer = player;
    let identifier = '';

    if (typeof player === 'string' || typeof player === 'number') {
      const strVal = String(player).trim();
      if (!strVal || strVal === 'undefined' || strVal === 'null') return;
      identifier = strVal;
      const found = allPlayers.find(
        (p) =>
          String(p.id || p.Rk) === strVal ||
          p.Player?.toLowerCase() === strVal.toLowerCase()
      );
      resolvedPlayer = found || { id: player, Player: strVal };
    } else {
      const pId = player.id || player.record_id || player.Rk;
      const pName = player.Player || player.name;
      identifier = String(pName || pId || '').trim();
      if (!identifier || identifier === 'undefined' || identifier === 'null') {
        identifier = String(pId || '');
      }
    }

    setSelectedPlayer(resolvedPlayer);
    setCurrentTab('profile');
    if (identifier && identifier !== 'undefined' && identifier !== 'null') {
      window.location.hash = `#profile/${encodeURIComponent(identifier)}`;
    }
  };

  const handleAddToCompare = (player) => {
    setCompareList((prev) => {
      const targetId = player.id || player.Player;
      if (prev.some((p) => (p.id || p.Player) === targetId)) return prev;
      return [...prev, player].slice(0, 4);
    });
    setCurrentTab('compare');
    window.location.hash = '#compare';
  };

  const handleRemoveFromCompare = (player) => {
    setCompareList((prev) =>
      prev.filter((p) => (p.id || p.Player) !== (player.id || player.Player))
    );
  };

  const handleReplaceComparePlayers = useCallback((nextPlayers) => {
    if (!Array.isArray(nextPlayers)) return;
    setCompareList(nextPlayers.slice(0, 4));
  }, []);

  const handleToggleShortlist = useCallback(
    (player, seasonOverride) => {
      const s = seasonOverride || player?.season || activeSeason;
      setShortlist((prev) => toggleShortlistItem(prev, player, s));
    },
    [activeSeason]
  );

  const handleUpdateShortlistItem = useCallback((key, patch) => {
    setShortlist((prev) => updateShortlistItem(prev, key, patch));
  }, []);

  const handleRemoveShortlistItem = useCallback((key) => {
    setShortlist((prev) => removeShortlistItem(prev, key));
  }, []);

  const handleClearShortlist = useCallback(() => {
    setShortlist([]);
  }, []);

  const handleCompareBatchFromShortlist = useCallback((items) => {
    if (!Array.isArray(items) || items.length < 2) return;
    const mapped = items.slice(0, 4).map((item) => ({
      id: item.id,
      Player: item.Player,
      Squad: item.Squad,
      Comp: item.Comp,
      Pos: item.Pos,
      Age: item.Age,
      Min: item.Min,
      Gls: item.Gls,
      Ast: item.Ast,
      xG: item.xG,
      xAG: item.xAG,
      season: item.season,
    }));
    setCompareList(mapped);
    setShortlistOpen(false);
    setCurrentTab('compare');
    window.location.hash = '#compare';
  }, []);

  const handleSelectSquad = (squadName) => {
    setSelectedSquadDetail(squadName);
    setCurrentTab('browse');
    window.location.hash = '#browse';
  };

  const handleSwitchSeason = (seasonId) => {
    if (!seasonId || seasonId === activeSeason) return;
    setIsSwitchingSeason(true);
    setActiveSeason(seasonId);
    setPagination((p) => ({ ...p, page: 1 }));
    api.setActiveSeason(seasonId).catch(() => {});
    setTimeout(() => {
      setIsSwitchingSeason(false);
    }, 150);
  };

  return (
    <AppLayout
      currentTab={currentTab}
      onNavigate={(tab) => {
        setCurrentTab(tab);
        window.location.hash = `#${tab}`;
      }}
      activeSeason={activeSeason}
      seasonQuality={seasonQuality}
      availableSeasons={availableSeasons}
      onSelectSeason={handleSwitchSeason}
      isSwitchingSeason={isSwitchingSeason}
      selectedComp={selectedComp}
      onSelectComp={(comp) => {
        setSelectedComp(comp);
        setPagination((p) => ({ ...p, page: 1 }));
      }}
      searchQuery={searchQuery}
      onSearchChange={(q) => {
        setSearchQuery(q);
        setPagination((p) => ({ ...p, page: 1 }));
      }}
      onSubmitSearch={(q) => {
        if (q !== undefined) setSearchQuery(q);
        setPagination((p) => ({ ...p, page: 1 }));
        setCurrentTab('explorer');
        window.location.hash = '#explorer';
      }}
      onSelectPlayer={handleSelectPlayer}
      onSelectSquad={handleSelectSquad}
      allPlayers={allPlayers}
      allSquads={squadsList}
      shortlistCount={shortlist.length}
      onOpenShortlist={() => setShortlistOpen(true)}
    >
      {/* 1. Overview (Dashboard) */}
      {currentTab === 'dashboard' && (
        <TerraceHomeView
          metadata={metadata}
          dashboardData={dashboardData}
          loading={loadingDashboard}
          topScorer={topScorer}
          topAssister={topAssister}
          topProgression={topProgression}
          onNavigate={(tab) => {
            setCurrentTab(tab);
            window.location.hash = `#${tab}`;
          }}
          onSelectPlayer={handleSelectPlayer}
          onSelectTeam={(team) => {
            const name =
              typeof team === 'string' ? team : team.name || team.Squad || team.Team;
            handleSelectSquad(name);
          }}
          onSelectComp={(comp) => {
            setSelectedComp(comp);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          selectedComp={selectedComp}
          activeSeason={activeSeason}
        />
      )}

      {/* 2. Player Explorer (Ledger) */}
      {currentTab === 'explorer' && (
        <PlayerExplorerView
          players={explorerPlayers}
          loading={loadingExplorer}
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={(k) => {
            if (sortBy === k) {
              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              setSortBy(k);
              setSortOrder('desc');
            }
          }}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          selectedComp={selectedComp}
          onCompChange={(comp) => {
            setSelectedComp(comp);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          selectedPos={selectedPos}
          onPosChange={(pos) => {
            setSelectedPos(pos);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          selectedSquad={selectedSquad}
          onSquadChange={(sq) => {
            setSelectedSquad(sq);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          minMinutes={minMinutes}
          onMinMinutesChange={(min) => {
            setMinMinutes(min);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          ageRange={ageRange}
          onAgeRangeChange={(range) => {
            setAgeRange(range);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          statMode={statMode}
          onStatModeChange={setStatMode}
          onSelectPlayer={handleSelectPlayer}
          onAddToCompare={handleAddToCompare}
          compareList={compareList}
          onOpenCompare={() => {
            setCurrentTab('compare');
            window.location.hash = '#compare';
          }}
          shortlist={shortlist}
          onToggleShortlist={handleToggleShortlist}
          squadsList={explorerSquads.length > 0 ? explorerSquads : squadsList}
          activeSeason={activeSeason}
        />
      )}

      {/* 2.5 Scatter Plot Tool */}
      {currentTab === 'plots' && (
        <PlotAnyMetricView
          activeSeason={activeSeason}
          seasonQuality={seasonQuality}
          onSelectPlayer={handleSelectPlayer}
        />
      )}

      {/* 3. Leaderboards */}
      {currentTab === 'leaderboards' && (
        <LeaderboardsView
          activeSeason={activeSeason}
          untrackedMetrics={seasonQuality?.untracked_metrics || []}
          onSelectPlayer={handleSelectPlayer}
          onAddToCompare={handleAddToCompare}
          compareList={compareList}
          shortlist={shortlist}
          onToggleShortlist={handleToggleShortlist}
          selectedComp={selectedComp}
        />
      )}

      {/* 4. Head-to-Head Comparison */}
      {currentTab === 'compare' && (
        <ComparisonMatrix
          players={compareList}
          onRemovePlayer={handleRemoveFromCompare}
          onAddPlayer={handleAddToCompare}
          onReplacePlayers={handleReplaceComparePlayers}
          allAvailablePlayers={allPlayers.length > 0 ? allPlayers : explorerPlayers}
          onSelectPlayer={handleSelectPlayer}
          shortlist={shortlist}
          onToggleShortlist={handleToggleShortlist}
          activeSeason={activeSeason}
        />
      )}

      {/* 5. Squad Browser */}
      {currentTab === 'browse' && (
        <SquadBrowserView
          activeSeason={activeSeason}
          initialSquad={selectedSquadDetail}
          initialLeague={selectedComp}
          onSelectPlayer={handleSelectPlayer}
          onAddToCompare={handleAddToCompare}
          compareList={compareList}
          shortlist={shortlist}
          onToggleShortlist={handleToggleShortlist}
        />
      )}

      {/* 6. Player Dossier / Profile */}
      {currentTab === 'profile' && (
        <PlayerProfileView
          player={selectedPlayer}
          onBack={() => {
            setCurrentTab('explorer');
            window.location.hash = '#explorer';
          }}
          onCompare={handleAddToCompare}
          onSelectPlayer={handleSelectPlayer}
          onSelectSeason={handleSwitchSeason}
          shortlist={shortlist}
          onToggleShortlist={handleToggleShortlist}
          activeSeason={activeSeason}
        />
      )}

      {/* 7. Dataset Registry */}
      {currentTab === 'data' && (
        <DataManagementView
          activeSeason={activeSeason}
          availableSeasons={availableSeasons}
          onSeasonActivated={handleSwitchSeason}
        />
      )}

      {/* Global Slide-Over Scout Shortlist Drawer */}
      <ShortlistDrawer
        isOpen={shortlistOpen}
        onClose={() => setShortlistOpen(false)}
        shortlist={shortlist}
        onUpdateItem={handleUpdateShortlistItem}
        onRemoveItem={handleRemoveShortlistItem}
        onClearAll={handleClearShortlist}
        onSelectPlayer={(item) => {
          setShortlistOpen(false);
          if (item.season && item.season !== activeSeason) {
            setActiveSeason(item.season);
          }
          handleSelectPlayer(item);
        }}
        onAddToCompare={(item) => {
          setShortlistOpen(false);
          handleAddToCompare(item);
        }}
        onCompareBatch={handleCompareBatchFromShortlist}
      />
    </AppLayout>
  );
}

export default App;
