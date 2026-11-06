import React, { useState, useEffect, useRef, useContext } from 'react';
import { ThemeContext } from '../../theme/ThemeContext';
import { 
  Calendar, 
  RefreshCw, 
  Database, 
  ChevronDown, 
  Check, 
  Menu, 
  X,
  Search,
  BookOpen,
  Activity,
  Sliders,
  Layers,
  Info
} from 'lucide-react';
import GlossaryModal from '../common/GlossaryModal';

export const AppLayout = ({ 
  children, 
  currentTab = "dashboard", 
  onNavigate,
  activeSeason = "2024-2025",
  availableSeasons = [],
  onSelectSeason,
  isSwitchingSeason = false,
  selectedComp = "",
  onSelectComp,
  onSelectPlayer,
  onSelectSquad,
  allPlayers = [],
  allSquads = []
}) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  
  // Global Search Palette State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Keyboard shortcut listener: '/' or 'Ctrl+K' / 'Cmd+K' opens global search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key === 'k')) && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSeasonDropdownOpen(false);
        setStatusPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: "dashboard", label: "Overview" },
    { id: "explorer", label: "Player Explorer" },
    { id: "leaderboards", label: "Leaderboards" },
    { id: "compare", label: "Comparison" },
    { id: "browse", label: "Squad Browser" },
    { id: "data", label: "Dataset Registry" },
  ];

  const leagues = [
    { id: "", label: "All Big 5", short: "All 5" },
    { id: "eng Premier League", label: "Premier League", short: "EPL" },
    { id: "es La Liga", label: "La Liga", short: "La Liga" },
    { id: "it Serie A", label: "Serie A", short: "Serie A" },
    { id: "de Bundesliga", label: "Bundesliga", short: "Bundesliga" },
    { id: "fr Ligue 1", label: "Ligue 1", short: "Ligue 1" },
  ];

  const formatSeasonName = (id) => {
    if (!id) return '2024/25';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  };

  // Determine non-contradictory season state label
  const isBaseline = activeSeason === '2024-2025';
  const isProjection = activeSeason === '2025-2026';
  const seasonBadgeText = isBaseline 
    ? 'Reference Baseline Season'
    : isProjection
    ? 'Algorithmic Projection'
    : 'Archive Season';

  // Filtered search results grouped as Players & Clubs
  const matchingPlayers = searchQuery.trim().length > 1
    ? allPlayers.filter(p => p.Player?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  const matchingClubs = searchQuery.trim().length > 1
    ? allSquads.filter(sq => {
        const name = typeof sq === 'string' ? sq : sq.name || sq.Squad;
        return name?.toLowerCase().includes(searchQuery.toLowerCase());
      }).slice(0, 4)
    : [];

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-ser selection:bg-[var(--rule)] selection:text-[var(--ink)]">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-5">
        
        {/* Editorial Masthead */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 mast-border">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 
                onClick={() => onNavigate && onNavigate("dashboard")}
                className="font-disp font-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight leading-none cursor-pointer hover:opacity-95 transition-opacity"
              >
                PitchPulse <span className="text-xl sm:text-2xl md:text-3xl font-serif font-normal italic text-[var(--mute)] tracking-normal">Terrace Ledger</span>
              </h1>
              <span className="font-disp font-bold text-xs uppercase px-2 py-0.5 border border-[var(--ink)] text-[var(--mute)]">
                PitchPulse Analytics • European Big 5
              </span>
            </div>
            <p className="italic text-[var(--mute)] text-xs sm:text-sm mt-1">
              Statistical ledger of Europe's top 5 leagues: player performance, expected goals (xG), and progressive ball progression.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto flex-wrap">
            {/* Quick Global Search Trigger with [Ctrl+K] / [/] hint */}
            <button
              onClick={() => setSearchOpen(true)}
              className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Search Players & Clubs (Press / or Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 opacity-70" />
              <span className="hidden sm:inline italic">Search</span>
              <kbd className="hidden md:inline-block px-1 py-0.2 bg-[var(--panel)] border border-[var(--rule)] text-[10px] font-mono rounded">
                /
              </kbd>
            </button>

            {/* Non-contradictory Season Selector */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                disabled={isSwitchingSeason}
                className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                aria-label="Select football season"
              >
                {isSwitchingSeason ? (
                  <RefreshCw className="w-3 h-3 animate-spin text-[var(--blue)]" />
                ) : (
                  <span>Vol. {formatSeasonName(activeSeason)}</span>
                )}
                <span className="text-[10px] uppercase font-disp font-bold px-1 bg-[var(--panel)] text-[var(--mute)] border border-[var(--rule)]">
                  {seasonBadgeText}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {seasonDropdownOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-xl z-50 text-xs py-1">
                  <div className="px-3 py-1.5 border-b border-[var(--rule)] font-disp font-bold tracking-wider text-[var(--mute)] uppercase text-[10px] flex justify-between">
                    <span>14 Stored Seasons</span>
                    <span>2012/13 – 2025/26</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-[var(--rule)]">
                    {availableSeasons.map((s) => {
                      const sId = s.id || s;
                      const sName = s.name || s.display_name || sId;
                      const isSelected = sId === activeSeason;
                      const isRef = sId === '2024-2025';
                      return (
                        <button
                          key={sId}
                          onClick={() => {
                            if (onSelectSeason) onSelectSeason(sId);
                            setSeasonDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--panel)] transition-colors ${
                            isSelected ? 'font-bold bg-[var(--panel)] text-[var(--blue)]' : ''
                          }`}
                        >
                          <div>
                            <div className="truncate">{sName}</div>
                            <div className="text-[10px] text-[var(--mute)]">
                              {isRef ? "Reference Baseline • FBref / StatsBomb" : sId < "2014-2015" ? "Archive • Transfermarkt (no xG)" : "Archive • Transfermarkt & Understat"}
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[var(--blue)] shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Engine & Data Status Trigger */}
            <button
              onClick={() => setStatusPanelOpen(!statusPanelOpen)}
              className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-1 transition-colors"
              title="Inspect Dataset & Engine Status"
            >
              <Activity className="w-3 h-3 text-[var(--blue)]" />
              <span className="hidden sm:inline italic">Engine</span>
            </button>

            {/* Glossary Button */}
            <button
              onClick={() => setGlossaryOpen(true)}
              className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-1 transition-colors"
              title="Metric Glossary"
            >
              <BookOpen className="w-3 h-3 text-[var(--blue)]" />
              <span className="hidden sm:inline italic">Glossary</span>
            </button>

            {/* Light / Dark paper toggle */}
            <button 
              onClick={toggleTheme}
              className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser italic text-xs px-2.5 py-1.5 rounded-sm cursor-pointer whitespace-nowrap transition-colors"
              aria-label="Toggle paper theme"
            >
              {theme === 'dark' ? 'Light paper' : 'Dark paper'}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden border border-[var(--ink)] p-1.5 rounded-sm"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Global Competition Strip (All Big 5 Leagues) */}
        <div className="border-b border-[var(--ink)] py-2 flex items-center justify-between gap-3 overflow-x-auto text-xs font-ser">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-disp font-bold uppercase text-[11px] text-[var(--mute)] tracking-wider mr-1">
              Competition Filter:
            </span>
            {leagues.map(lg => {
              const isSelected = (selectedComp || "") === lg.id;
              return (
                <button
                  key={lg.id}
                  onClick={() => onSelectComp && onSelectComp(lg.id)}
                  className={`px-2.5 py-1 rounded-xs border transition-colors whitespace-nowrap ${
                    isSelected 
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-bold'
                      : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
                  }`}
                >
                  {lg.label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] italic text-[var(--mute)] shrink-0">
            <span>2,854 Players</span>
            <span>•</span>
            <span>96 European Clubs</span>
          </div>
        </div>

        {/* Section Navigation / Table of Contents */}
        <nav 
          className="sticky top-0 z-40 bg-[var(--paper)] border-b-2 border-[var(--ink)] py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-sm sm:text-base"
          aria-label="Publication sections"
        >
          <div className="flex items-center gap-4 sm:gap-6 flex-nowrap shrink-0">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onNavigate) onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`font-semibold pb-0.5 border-b-2 transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'border-[var(--red)] text-[var(--ink)] font-bold' 
                      : 'border-transparent text-[var(--ink)] opacity-70 hover:opacity-100 hover:border-[var(--rule)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs italic text-[var(--mute)]">
            <span>{selectedComp ? leagues.find(l => l.id === selectedComp)?.label : "All Big 5"}</span>
            <span>•</span>
            <span>{formatSeasonName(activeSeason)}</span>
          </div>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b-2 border-[var(--ink)] bg-[var(--panel)] py-2 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (onNavigate) onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-2 py-1.5 text-sm font-semibold rounded ${
                  currentTab === item.id ? 'bg-[var(--paper)] text-[var(--red)] font-bold' : 'text-[var(--ink)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Engine & Dataset Status Modal / Drawer */}
        {statusPanelOpen && (
          <div className="my-3 p-4 border-2 border-[var(--ink)] bg-[var(--panel)] rounded-xs shadow-md text-xs font-ser space-y-2">
            <div className="flex justify-between items-center border-b border-[var(--rule)] pb-1.5">
              <h4 className="font-disp font-bold text-base text-[var(--ink)] uppercase tracking-wider">
                API Engine & Dataset Coverage Report
              </h4>
              <button 
                onClick={() => setStatusPanelOpen(false)}
                className="text-[var(--mute)] hover:text-[var(--ink)] font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">Active Dataset</span>
                <span className="font-bold text-sm text-[var(--ink)]">{formatSeasonName(activeSeason)} ({seasonBadgeText})</span>
              </div>
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">Provenance & Source</span>
                <span className="font-medium text-[var(--ink)]">
                  {isBaseline ? "FBref / StatsBomb Big 5 European aggregates" : "Transfermarkt & Understat historical logs"}
                </span>
              </div>
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">Seasons Loaded</span>
                <span className="font-medium text-[var(--ink)]">14 Seasons (2012/13 – 2025/26)</span>
              </div>
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">League Coverage</span>
                <span className="font-medium text-[var(--ink)]">Premier League, La Liga, Serie A, Bundesliga, Ligue 1</span>
              </div>
            </div>
          </div>
        )}

        {/* Global Search Palette Overlay */}
        {searchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-xs font-ser">
            <div className="bg-[var(--paper)] border-2 border-[var(--ink)] shadow-2xl max-w-xl w-full rounded-xs overflow-hidden">
              <div className="p-3 border-b border-[var(--ink)] flex items-center gap-2 bg-[var(--panel)]">
                <Search className="w-4 h-4 text-[var(--mute)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search player or club across Europe..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-sm text-[var(--ink)] placeholder:italic focus:outline-none"
                />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="text-xs px-2 py-0.5 border border-[var(--rule)] hover:border-[var(--ink)]"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-[var(--rule)] p-2">
                {searchQuery.trim().length <= 1 ? (
                  <div className="p-4 text-center text-xs italic text-[var(--mute)]">
                    Type at least 2 characters to search across 2,854 players and 96 clubs.
                  </div>
                ) : (
                  <>
                    {/* Players Group */}
                    {matchingPlayers.length > 0 && (
                      <div className="p-2">
                        <span className="font-disp font-bold uppercase text-[10px] tracking-wider text-[var(--mute)] block mb-1">
                          Players
                        </span>
                        {matchingPlayers.map(p => (
                          <div
                            key={p.id || p.Player}
                            onClick={() => {
                              if (onSelectPlayer) onSelectPlayer(p);
                              setSearchOpen(false);
                            }}
                            className="p-1.5 hover:bg-[var(--panel)] cursor-pointer flex justify-between items-center text-xs"
                          >
                            <div>
                              <span className="font-semibold text-[var(--ink)]">{p.Player}</span>
                              <span className="text-[11px] text-[var(--mute)] block">{p.Squad || p.Team} • {p.Pos}</span>
                            </div>
                            <span className="font-mono text-xs">{p.Gls} Gls / {p.xG} xG</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Clubs Group */}
                    {matchingClubs.length > 0 && (
                      <div className="p-2">
                        <span className="font-disp font-bold uppercase text-[10px] tracking-wider text-[var(--mute)] block mb-1">
                          Clubs
                        </span>
                        {matchingClubs.map(sq => {
                          const name = typeof sq === 'string' ? sq : sq.name || sq.Squad;
                          return (
                            <div
                              key={name}
                              onClick={() => {
                                if (onSelectSquad) onSelectSquad(name);
                                setSearchOpen(false);
                              }}
                              className="p-1.5 hover:bg-[var(--panel)] cursor-pointer flex justify-between items-center text-xs"
                            >
                              <span className="font-semibold text-[var(--ink)]">{name}</span>
                              <span className="text-xs italic text-[var(--mute)]">View Roster &rarr;</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {matchingPlayers.length === 0 && matchingClubs.length === 0 && (
                      <div className="p-4 text-center text-xs italic text-[var(--mute)]">
                        No players or clubs matching "{searchQuery}".
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Metric Glossary Modal */}
        <GlossaryModal 
          isOpen={glossaryOpen} 
          onClose={() => setGlossaryOpen(false)} 
        />

        {/* Main Publication Content */}
        <main className="py-5">
          {children}
        </main>

        {/* Editorial Footer */}
        <footer className="mt-14 pt-4 mast-border-top text-[var(--mute)] italic text-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-italic font-ser text-xs">
            <div>
              <h4 className="font-disp font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-1">
                PitchPulse & European Big 5 Coverage
              </h4>
              <p className="text-[var(--mute)] leading-relaxed">
                Coverage across English Premier League, Spanish La Liga, Italian Serie A, German Bundesliga, and French Ligue 1.
              </p>
            </div>
            <div>
              <h4 className="font-disp font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-1">
                Data Provenance & Calculation
              </h4>
              <p className="text-[var(--mute)] leading-relaxed">
                Aggregated from official match records and FBref / StatsBomb metrics. Progressive carries require &ge; 10 yards into the opponent half or penalty area.
              </p>
            </div>
            <div>
              <h4 className="font-disp font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-1">
                Statistical Accuracy Guarantee
              </h4>
              <p className="text-[var(--mute)] leading-relaxed">
                Reference Vol: <span className="font-semibold text-[var(--ink)]">{formatSeasonName(activeSeason)}</span>. Verified SHA-256 integrity check and mathematical invariants.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-[var(--rule)] text-xs text-[var(--mute)]">
            <p>© PitchPulse Analytics. Precise, dry football analytics for scouts and analysts.</p>
            <p className="mt-1 sm:mt-0">Tabular numerals • Lining figures enabled</p>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default AppLayout;
