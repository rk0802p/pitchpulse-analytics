import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AppLayout from './components/layout/AppLayout';
import TerraceHomeView from './components/dashboard/TerraceHomeView';
import LeaderboardsView from './components/leaderboards/LeaderboardsView';
import ComparisonMatrix from './components/compare/ComparisonMatrix';
import PlayerProfileView from './components/profile/PlayerProfileView';
import DataManagementView from './components/data/DataManagementView';
import DataTable from './components/common/DataTable';
import api from './services/api';
import { 
  Search, 
  Filter, 
  RotateCcw, 
  Plus, 
  Users, 
  ArrowLeft 
} from 'lucide-react';

function App() {
  // Navigation & View State
  const [currentTab, setCurrentTab] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '').split('/')[0];
    return ['dashboard', 'explorer', 'leaderboards', 'compare', 'browse', 'profile', 'data'].includes(hash)
      ? hash
      : 'dashboard';
  });

  // Season State
  const [activeSeason, setActiveSeason] = useState('2024-2025');
  const [availableSeasons, setAvailableSeasons] = useState([{ id: '2024-2025', name: '2024/25 Regular Season' }]);
  const [isSwitchingSeason, setIsSwitchingSeason] = useState(false);

  // Metadata & Stats
  const [metadata, setMetadata] = useState(null);
  const [topScorer, setTopScorer] = useState(null);
  const [topAssister, setTopAssister] = useState(null);
  const [topProgression, setTopProgression] = useState(null);

  // Player Explorer State
  const [explorerPlayers, setExplorerPlayers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [selectedSquad, setSelectedSquad] = useState('');
  const [sortBy, setSortBy] = useState('Gls');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loadingExplorer, setLoadingExplorer] = useState(false);

  // Comparison State
  const [compareList, setCompareList] = useState([]);

  // Selected Player Profile State
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // Squad Browser State
  const [squadsList, setSquadsList] = useState([]);
  const [selectedSquadDetail, setSelectedSquadDetail] = useState(null);
  const [squadRoster, setSquadRoster] = useState([]);
  const [loadingSquadRoster, setLoadingSquadRoster] = useState(false);

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

  // Load Metadata & Top Performers
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
    api.getTeams(activeSeason)
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setSquadsList(res.data);
        } else if (Array.isArray(res)) {
          setSquadsList(res);
        }
      }).catch(() => {});

  }, [activeSeason]);

  // Fetch Explorer Players
  useEffect(() => {
    if (currentTab !== 'explorer') return;
    setLoadingExplorer(true);
    api.getPlayers({
      season: activeSeason,
      page: pagination.page,
      limit: pagination.limit,
      search: searchQuery,
      position: selectedPos,
      squad: selectedSquad,
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
  }, [currentTab, activeSeason, pagination.page, pagination.limit, searchQuery, selectedPos, selectedSquad, sortBy, sortOrder]);

  const handleSelectPlayer = (player) => {
    setSelectedPlayer(player);
    setCurrentTab('profile');
    window.location.hash = `#profile/${player.id || player.Player}`;
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
    setLoadingSquadRoster(true);
    api.getPlayers({ season: activeSeason, squad: squadName, limit: 50, sort_by: 'Min', order: 'desc' })
      .then(res => {
        if (res?.success && Array.isArray(res.data)) {
          setSquadRoster(res.data);
        } else if (Array.isArray(res)) {
          setSquadRoster(res);
        }
      })
      .catch(() => setSquadRoster([]))
      .finally(() => setLoadingSquadRoster(false));
  };

  // Explorer Table Columns
  const explorerColumns = [
    {
      key: "Player",
      label: "Player Name",
      render: (val, row) => (
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-[var(--ink)]">{val}</span>
            <span className="text-[11px] text-[var(--mute)] ml-2">{row.Squad || row.Team} • {row.Pos}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddToCompare(row);
            }}
            className="text-[10px] italic border border-[var(--rule)] px-1.5 py-0.5 hover:border-[var(--ink)]"
            title="Add to Comparison"
          >
            + Compare
          </button>
        </div>
      )
    },
    { key: "Pos", label: "Pos" },
    { key: "Squad", label: "Club" },
    { key: "Age", label: "Age" },
    { key: "90s", label: "90s" },
    { key: "Gls", label: "Gls" },
    { key: "xG", label: "xG" },
    { key: "Ast", label: "Ast" },
    { key: "xAG", label: "xAG" },
    { key: "PrgC", label: "PrgC" },
    { key: "PrgP", label: "PrgP" },
    { key: "PrgR", label: "PrgR" },
  ];

  return (
    <AppLayout
      currentTab={currentTab}
      onNavigate={(tab) => {
        setCurrentTab(tab);
        window.location.hash = `#${tab}`;
      }}
      activeSeason={activeSeason}
      availableSeasons={availableSeasons}
      onSelectSeason={setActiveSeason}
      isSwitchingSeason={isSwitchingSeason}
    >
      {/* Front Page / Homepage */}
      {currentTab === 'dashboard' && (
        <TerraceHomeView
          metadata={metadata}
          topScorer={topScorer}
          topAssister={topAssister}
          topProgression={topProgression}
          onNavigate={(tab) => {
            setCurrentTab(tab);
            window.location.hash = `#${tab}`;
          }}
          onSelectPlayer={handleSelectPlayer}
          onSelectTeam={(team) => {
            handleSelectSquad(team.name || team.Squad || team.Team);
            setCurrentTab('browse');
            window.location.hash = '#browse';
          }}
        />
      )}

      {/* Leaderboards */}
      {currentTab === 'leaderboards' && (
        <LeaderboardsView
          activeSeason={activeSeason}
          onSelectPlayer={handleSelectPlayer}
        />
      )}

      {/* Player Ledger (Explorer) */}
      {currentTab === 'explorer' && (
        <div className="space-y-6">
          <div className="border-b-2 border-[var(--ink)] pb-3">
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none">
              The Complete Player Ledger
            </h2>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              Search, filter, and cross-reference registered player statistics in Vol. {activeSeason}.
            </p>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by player or club name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-3 pr-8 text-xs font-ser text-[var(--ink)] placeholder:italic focus:outline-none focus:bg-[var(--panel)]"
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--mute)]" />
              </div>

              <div>
                <select
                  value={selectedPos}
                  onChange={(e) => {
                    setSelectedPos(e.target.value);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs font-ser text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
                >
                  <option value="">All Positions</option>
                  <option value="FW">Forwards (FW)</option>
                  <option value="MF">Midfielders (MF)</option>
                  <option value="DF">Defenders (DF)</option>
                  <option value="GK">Goalkeepers (GK)</option>
                </select>
              </div>

              <div>
                <select
                  value={selectedSquad}
                  onChange={(e) => {
                    setSelectedSquad(e.target.value);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs font-ser text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
                >
                  <option value="">All Squads / Clubs</option>
                  {squadsList.map(sq => {
                    const name = typeof sq === 'string' ? sq : sq.name || sq.Squad || sq.Team;
                    return <option key={name} value={name}>{name}</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          <DataTable
            columns={explorerColumns}
            data={explorerPlayers}
            loading={loadingExplorer}
            title="Player Statistical Index"
            subtitle="Click row to inspect complete player dossier"
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
            pagination={pagination}
            onPageChange={(page) => setPagination(p => ({ ...p, page }))}
            onRowClick={handleSelectPlayer}
          />
        </div>
      )}

      {/* Squad Directory (Browse) */}
      {currentTab === 'browse' && (
        <div className="space-y-6">
          <div className="border-b-2 border-[var(--ink)] pb-3">
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none">
              Club Squad Directory
            </h2>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              Select a club to review complete first-team roster and individual playing minutes.
            </p>
          </div>

          {selectedSquadDetail ? (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedSquadDetail(null)}
                className="flex items-center gap-1.5 text-xs italic text-[var(--ink)] hover:text-[var(--blue)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Club List
              </button>
              <h3 className="font-disp font-bold text-3xl text-[var(--ink)] border-b border-[var(--ink)] pb-1">
                {selectedSquadDetail} • Full Squad Register
              </h3>
              <DataTable
                columns={explorerColumns}
                data={squadRoster}
                loading={loadingSquadRoster}
                title={`${selectedSquadDetail} First-Team Statistics`}
                onRowClick={handleSelectPlayer}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {squadsList.map((sq, idx) => {
                const name = typeof sq === 'string' ? sq : sq.name || sq.Squad || sq.Team;
                return (
                  <div
                    key={name || idx}
                    onClick={() => handleSelectSquad(name)}
                    className="border border-[var(--rule)] bg-[var(--paper)] hover:bg-[var(--panel)] p-4 rounded-sm cursor-pointer hover:border-[var(--ink)] transition-colors"
                  >
                    <div className="font-disp font-bold text-xl text-[var(--ink)]">
                      {name}
                    </div>
                    <span className="text-xs italic text-[var(--mute)]">
                      Inspect Squad Roster &rarr;
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Head-to-Head Compare */}
      {currentTab === 'compare' && (
        <ComparisonMatrix
          players={compareList}
          onRemovePlayer={handleRemoveFromCompare}
          onAddPlayer={(p) => setCompareList([...compareList, p])}
          allAvailablePlayers={explorerPlayers}
        />
      )}

      {/* Player Dossier / Profile */}
      {currentTab === 'profile' && (
        <PlayerProfileView
          player={selectedPlayer}
          onBack={() => setCurrentTab('explorer')}
          onCompare={handleAddToCompare}
          activeSeason={activeSeason}
        />
      )}

      {/* Dataset Registry */}
      {currentTab === 'data' && (
        <DataManagementView
          activeSeason={activeSeason}
          availableSeasons={availableSeasons}
          onSeasonActivated={setActiveSeason}
        />
      )}

    </AppLayout>
  );
}

export default App;
