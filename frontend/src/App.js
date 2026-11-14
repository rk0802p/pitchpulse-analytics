import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppLayout from './components/layout/AppLayout';
import TerraceHomeView from './components/dashboard/TerraceHomeView';
import LeaderboardsView from './components/leaderboards/LeaderboardsView';
import ComparisonMatrix from './components/compare/ComparisonMatrix';
import PlayerProfileView from './components/profile/PlayerProfileView';
import PlayerExplorerView from './components/explorer/PlayerExplorerView';
import SquadBrowserView from './components/squad/SquadBrowserView';
import DataManagementView from './components/data/DataManagementView';
import PlotAnyMetricView from './components/charts/PlotAnyMetricView';
import api from './services/api';
import { parseHash } from './utils/hashRoute';

function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState(() => {
    return parseHash(window.location.hash).tab;
  });

  // Season State
  const [activeSeason, setActiveSeason] = useState('2024-2025');
  const [availableSeasons, setAvailableSeasons] = useState([{ id: '2024-2025', name: '2024/25 Regular Season' }]);
  const [isSwitchingSeason, setIsSwitchingSeason] = useState(false);

  // Global League / Competition Filter
  const [selectedComp, setSelectedComp] = useState('');

  // Metadata & Stats
  const [metadata, setMetadata] = useState(null);
  const [topScorer, setTopScorer] = useState(null);
  const [topAssister, setTopAssister] = useState(null);
  const [topProgression, setTopProgression] = useState(null);

  // Global Players & Squads for Global Search Palette
  const [allPlayers, setAllPlayers] = useState([]);
  const [squadsList, setSquadsList] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  // Player Explorer State
  const [explorerPlayers, setExplorerPlayers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('');
  const [minMinutes, setMinMinutes] = useState(0);
  const [sortBy, setSortBy] = useState('Gls');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  // Comparison State
  const [compareList, setCompareList] = useState([]);

  // Selected Player Profile State
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Squad Browser State
  const [selectedSquadDetail, setSelectedSquadDetail] = useState(null);

  // Sync hash changes with navigation and load deep-linked player
  useEffect(() => {
    const handleHashChange = () => {
      const { tab, param } = parseHash(window.location.hash);
      if (tab === 'profile') {
        const rawParam = param ? param.trim() : '';
        if (!rawParam || rawParam === 'undefined' || rawParam === 'null') {
          setCurrentTab('explorer');
          window.location.hash = '#explorer';
          return;
        }
        setCurrentTab('profile');
        api.getPlayers({ season: activeSeason, search: rawParam, limit: 1 })
          .then(res => {
            const p = res?.data?.[0] || res?.[0];
            if (p) {
              setSelectedPlayer(p);
            } else {
              api.getPlayer(rawParam, activeSeason)
                .then(pRes => {
                  const iden = pRes?.data?.identity || pRes?.identity;
                  if (iden) {
                    setSelectedPlayer({
                      id: iden.id,
                      Player: iden.name,
                      Squad: iden.squad,
                      Comp: iden.competition,
                      Pos: iden.position,
                      Age: iden.age,
                      Min: iden.minutes
                    });
                  } else {
                    setCurrentTab('explorer');
                    window.location.hash = '#explorer';
                  }
                }).catch(() => {
                  setCurrentTab('explorer');
                  window.location.hash = '#explorer';
                });
            }
          }).catch(() => {
            setCurrentTab('explorer');
            window.location.hash = '#explorer';
          });
      } else if (['dashboard', 'explorer', 'plots', 'leaderboards', 'compare', 'browse', 'data'].includes(tab)) {
        setCurrentTab(tab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    // Initial check on load
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeSeason]);

  // Load Seasons on Mount
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

  // Load Metadata, Top Performers, Squads, and Global Players
  useEffect(() => {
    api.getMetadata(activeSeason)
      .then(res => {
        if (res?.success && res.data) {
          setMetadata(res.data);
        }
      })
      .catch(err => console.error("Error loading metadata:", err));

    // Top scorer
    api.getPlayers({ season: activeSeason, sort_by: 'Gls', order: 'desc', limit: 1 })
      .then(res => {
        const p = res?.data?.[0] || res?.[0];
        if (p) setTopScorer(p);
      }).catch(() => {});

    // Top assister
    api.getPlayers({ season: activeSeason, sort_by: 'Ast', order: 'desc', limit: 1 })
      .then(res => {
        const p = res?.data?.[0] || res?.[0];
        if (p) setTopAssister(p);
      }).catch(() => {});

    // Top progression
    api.getPlayers({ season: activeSeason, sort_by: 'PrgC', order: 'desc', limit: 1 })
      .then(res => {
        const p = res?.data?.[0] || res?.[0];
        if (p) setTopProgression(p);
      }).catch(() => {});

    // Load squad names
    api.getTeams(undefined, activeSeason)
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setSquadsList(res.data);
        } else if (Array.isArray(res)) {
          setSquadsList(res);
        }
      }).catch(() => {});

    // Global player search pool (top 500 players by minutes)
    api.getPlayers({ season: activeSeason, limit: 500, sort_by: 'Min', order: 'desc' })
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setAllPlayers(res.data);
        } else if (Array.isArray(res)) {
          setAllPlayers(res);
        }
      }).catch(() => {});

    // Executive Dashboard Analytics
    api.getDashboard(selectedComp || undefined, activeSeason)
      .then(res => {
        const d = res?.data || res;
        if (d) setDashboardData(d);
      })
      .catch(err => console.error("Error loading dashboard data:", err));

  }, [activeSeason, selectedComp]);

  // Fetch Explorer Players
  useEffect(() => {
    if (currentTab !== 'explorer') return;
    setLoadingExplorer(true);
    api.getPlayers({
      season: activeSeason,
      page: pagination.page,
      limit: pagination.limit,
      search: searchQuery,
      competition: selectedComp || undefined,
      position: selectedPos || undefined,
      squad: selectedSquad || undefined,
      min_minutes: minMinutes || undefined,
      sort_by: sortBy,
      order: sortOrder
    })
      .then(res => {
        if (res?.success) {
          setExplorerPlayers(res.data || []);
          if (res.pagination) setPagination(res.pagination);
        } else if (Array.isArray(res)) {
          setExplorerPlayers(res);
        }
      })
      .catch(err => console.error("Error fetching explorer players:", err))
      .finally(() => setLoadingExplorer(false));
  }, [currentTab, activeSeason, pagination.page, pagination.limit, searchQuery, selectedComp, selectedPos, selectedSquad, minMinutes, sortBy, sortOrder]);

  const handleSelectPlayer = (player) => {
    if (!player) return;
    let resolvedPlayer = player;
    let identifier = '';

    if (typeof player === 'string' || typeof player === 'number') {
      const strVal = String(player).trim();
      if (!strVal || strVal === 'undefined' || strVal === 'null') return;
      identifier = strVal;
      const found = allPlayers.find(p => String(p.id || p.Rk) === strVal || p.Player?.toLowerCase() === strVal.toLowerCase());
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
    if (!compareList.some(p => (p.id || p.Player) === (player.id || player.Player))) {
      setCompareList([...compareList, player]);
    }
    setCurrentTab('compare');
    window.location.hash = '#compare';
  };

  const handleRemoveFromCompare = (player) => {
    setCompareList(compareList.filter(p => (p.id || p.Player) !== (player.id || player.Player)));
  };

  const handleSelectSquad = (squadName) => {
    setSelectedSquadDetail(squadName);
    setCurrentTab('browse');
    window.location.hash = '#browse';
  };

  const handleSwitchSeason = (seasonId) => {
    if (!seasonId || seasonId === activeSeason) return;
    setIsSwitchingSeason(true);
    setActiveSeason(seasonId);
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
      availableSeasons={availableSeasons}
      onSelectSeason={handleSwitchSeason}
      isSwitchingSeason={isSwitchingSeason}
      selectedComp={selectedComp}
      onSelectComp={setSelectedComp}
      onSelectPlayer={handleSelectPlayer}
      onSelectSquad={handleSelectSquad}
      allPlayers={allPlayers}
      allSquads={squadsList}
    >
      {/* 1. Overview (Dashboard) */}
      {currentTab === 'dashboard' && (
        <TerraceHomeView
          metadata={metadata}
          dashboardData={dashboardData}
          topScorer={topScorer}
          topAssister={topAssister}
          topProgression={topProgression}
          onNavigate={(tab) => {
            setCurrentTab(tab);
            window.location.hash = `#${tab}`;
          }}
          onSelectPlayer={handleSelectPlayer}
          onSelectTeam={(team) => {
            const name = typeof team === 'string' ? team : (team.name || team.Squad || team.Team);
            handleSelectSquad(name);
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
          onPageChange={(page) => setPagination(p => ({ ...p, page }))}
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
            setPagination(p => ({ ...p, page: 1 }));
          }}
          selectedComp={selectedComp}
          onCompChange={(comp) => {
            setSelectedComp(comp);
            setPagination(p => ({ ...p, page: 1 }));
          }}
          selectedPos={selectedPos}
          onPosChange={(pos) => {
            setSelectedPos(pos);
            setPagination(p => ({ ...p, page: 1 }));
          }}
          selectedSquad={selectedSquad}
          onSquadChange={(sq) => {
            setSelectedSquad(sq);
            setPagination(p => ({ ...p, page: 1 }));
          }}
          minMinutes={minMinutes}
          onMinMinutesChange={(min) => {
            setMinMinutes(min);
            setPagination(p => ({ ...p, page: 1 }));
          }}
          onSelectPlayer={handleSelectPlayer}
          onAddToCompare={handleAddToCompare}
          compareList={compareList}
          onOpenCompare={() => {
            setCurrentTab('compare');
            window.location.hash = '#compare';
          }}
          squadsList={squadsList}
          activeSeason={activeSeason}
        />
      )}

      {/* 2.5 Scatter Plot Tool */}
      {currentTab === 'plots' && (
        <PlotAnyMetricView
          activeSeason={activeSeason}
          onSelectPlayer={handleSelectPlayer}
        />
      )}

      {/* 3. Leaderboards */}
      {currentTab === 'leaderboards' && (
        <LeaderboardsView
          activeSeason={activeSeason}
          onSelectPlayer={handleSelectPlayer}
          onAddToCompare={handleAddToCompare}
          compareList={compareList}
          selectedComp={selectedComp}
        />
      )}

      {/* 4. Head-to-Head Comparison */}
      {currentTab === 'compare' && (
        <ComparisonMatrix
          players={compareList}
          onRemovePlayer={handleRemoveFromCompare}
          onAddPlayer={handleAddToCompare}
          allAvailablePlayers={allPlayers.length > 0 ? allPlayers : explorerPlayers}
          onSelectPlayer={handleSelectPlayer}
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

    </AppLayout>
  );
}

export default App;
