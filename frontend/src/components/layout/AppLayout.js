import React, { useState, useEffect, useRef, useContext } from 'react';
import { ThemeContext } from '../../theme/ThemeContext';
import {
  RefreshCw,
  ChevronDown,
  Check,
  Menu,
  X,
  Search,
  BookOpen,
  Database,
  ArrowRight,
  Bookmark,
} from 'lucide-react';
import GlossaryModal from '../common/GlossaryModal';
import DataQualityBadge from '../common/DataQualityBadge';
import api from '../../services/api';

const LEAGUES = [
  { id: '', label: 'All Big 5', short: 'All 5', aliases: ['all', 'big 5'] },
  { id: 'eng Premier League', label: 'Premier League', short: 'EPL', aliases: ['epl', 'england', 'english', 'premier'] },
  { id: 'es La Liga', label: 'La Liga', short: 'La Liga', aliases: ['laliga', 'spain', 'spanish', 'primera'] },
  { id: 'it Serie A', label: 'Serie A', short: 'Serie A', aliases: ['seriea', 'italy', 'italian'] },
  { id: 'de Bundesliga', label: 'Bundesliga', short: 'Bundesliga', aliases: ['buli', 'germany', 'german'] },
  { id: 'fr Ligue 1', label: 'Ligue 1', short: 'Ligue 1', aliases: ['ligue1', 'france', 'french'] },
];

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const AppLayout = ({
  children,
  currentTab = 'dashboard',
  onNavigate,
  activeSeason = '2024-2025',
  seasonQuality = null,
  availableSeasons = [],
  onSelectSeason,
  isSwitchingSeason = false,
  selectedComp = '',
  onSelectComp,
  searchQuery = '',
  onSearchChange,
  onSubmitSearch,
  onSelectPlayer,
  onSelectSquad,
  allPlayers = [],
  allSquads = [],
  shortlistCount = 0,
  onOpenShortlist,
}) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);

  // Top Search Bar State (controlled via searchQuery prop with local fallback)
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const [liveResults, setLiveResults] = useState([]);
  const [liveTotal, setLiveTotal] = useState(0);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const dropdownRef = useRef(null);
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const effectiveQuery = onSearchChange ? searchQuery : localQuery;
  const trimmedQuery = effectiveQuery.trim();

  const updateQuery = (nextVal) => {
    setLocalQuery(nextVal);
    if (onSearchChange) onSearchChange(nextVal);
  };

  // Keyboard shortcut listener: '/' or 'Ctrl+K' / 'Cmd+K' focuses top search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)
      ) {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          setSearchFocused(true);
        }
      }
      if (e.key === 'Escape') {
        setSearchFocused(false);
        setSeasonDropdownOpen(false);
        setStatusPanelOpen(false);
        if (searchInputRef.current) searchInputRef.current.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live search across the full season player dataset by name or league
  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setLiveResults([]);
      setLiveTotal(0);
      setLoadingSearch(false);
      return;
    }

    let cancelled = false;
    setLoadingSearch(true);
    const timer = setTimeout(() => {
      api
        .getPlayers({
          season: activeSeason,
          search: trimmedQuery,
          competition: selectedComp || undefined,
          sort_by: 'Gls',
          order: 'desc',
          limit: 8,
        })
        .then((res) => {
          if (cancelled) return;
          if (res?.success && Array.isArray(res.data)) {
            setLiveResults(res.data);
            setLiveTotal(res.pagination?.total ?? res.data.length);
          } else if (Array.isArray(res)) {
            setLiveResults(res.slice(0, 8));
            setLiveTotal(res.length);
          } else {
            setLiveResults([]);
            setLiveTotal(0);
          }
        })
        .catch(() => {
          if (cancelled) return;
          // Graceful fallback to in-memory player list if request fails
          const q = normalizeText(trimmedQuery);
          const fallback = allPlayers.filter(
            (p) =>
              normalizeText(p.Player).includes(q) ||
              normalizeText(p.Comp).includes(q) ||
              normalizeText(p.competition_name).includes(q) ||
              normalizeText(p.Squad).includes(q)
          );
          setLiveResults(fallback.slice(0, 8));
          setLiveTotal(fallback.length);
        })
        .finally(() => {
          if (!cancelled) setLoadingSearch(false);
        });
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, activeSeason, selectedComp, allPlayers]);

  const navItems = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'explorer', label: 'Player Explorer' },
    { id: 'plots', label: 'Scatter Plots' },
    { id: 'leaderboards', label: 'Leaderboards' },
    { id: 'compare', label: 'Comparison' },
    { id: 'browse', label: 'Squad Browser' },
    { id: 'data', label: 'Dataset Registry' },
  ];

  const formatSeasonName = (id) => {
    if (!id) return '2024/25';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  };

  const currentSeasonObj = availableSeasons.find((s) => (s.id || s) === activeSeason);
  const activeQuality = seasonQuality || currentSeasonObj;
  const isBaseline = activeSeason === '2024-2025';
  const hasPartialSnapshot = Boolean(
    activeQuality?.partial_competitions && Object.keys(activeQuality.partial_competitions).length > 0
  );
  const isPreXgSeason = activeSeason < '2014-2015';
  const seasonBadgeText = isBaseline
    ? 'Reference Baseline'
    : hasPartialSnapshot
      ? 'Partial Snapshot'
      : isPreXgSeason
        ? 'Pre-xG Archive'
        : 'Historical Archive';
  const activeProvenanceSource =
    currentSeasonObj?.source ||
    (isBaseline
      ? 'FBref / StatsBomb Big 5 aggregates'
      : isPreXgSeason
        ? 'Transfermarkt match logs (Pre-xG era)'
        : 'Transfermarkt & Understat historical logs');
  const activeUntrackedMetrics = Array.isArray(activeQuality?.untracked_metrics)
    ? activeQuality.untracked_metrics
    : [];
  const activeRecordsCount = currentSeasonObj?.records_count || (allPlayers?.length ? allPlayers.length : null);
  const activeClubsCount = currentSeasonObj?.clubs_count || (allSquads?.length ? allSquads.length : null);

  // Match Big 5 leagues against search query
  const normalizedQuery = normalizeText(trimmedQuery);
  const matchingLeagues =
    trimmedQuery.length >= 2
      ? LEAGUES.filter(
          (lg) =>
            lg.id &&
            (normalizeText(lg.label).includes(normalizedQuery) ||
              normalizeText(lg.id).includes(normalizedQuery) ||
              lg.aliases.some((alias) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias)))
        )
      : [];

  const matchingClubs =
    trimmedQuery.length >= 2
      ? allSquads
          .filter((sq) => {
            const name = typeof sq === 'string' ? sq : sq.name || sq.Squad;
            return normalizeText(name).includes(normalizedQuery);
          })
          .slice(0, 3)
      : [];

  const showSearchDropdown = searchFocused && trimmedQuery.length >= 2;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchFocused(false);
    if (onSubmitSearch) {
      onSubmitSearch(effectiveQuery);
    } else if (onNavigate) {
      onNavigate('explorer');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-ser selection:bg-[var(--rule)] selection:text-[var(--ink)]">
      <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 py-3 sm:py-5">
        {/* Editorial Masthead */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 mast-border">
          <div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1
                onClick={() => onNavigate && onNavigate('dashboard')}
                className="font-disp font-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight leading-none cursor-pointer hover:opacity-95 transition-opacity"
              >
                PitchPulse
              </h1>
              <span className="font-disp font-bold text-xs uppercase px-2 py-0.5 border border-[var(--ink)] text-[var(--mute)]">
                PitchPulse Analytics • European Big 5
              </span>
            </div>
            <p className="italic text-[var(--mute)] text-xs sm:text-sm mt-1">
              Statistical ledger of Europe's top 5 leagues: player performance, expected goals (xG), and progressive ball progression.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap lg:flex-nowrap shrink-0">
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
                              {isRef
                                ? 'Reference Baseline • FBref / StatsBomb'
                                : s.partial_competitions && Object.keys(s.partial_competitions).length > 0
                                  ? 'Partial Snapshot • Transfermarkt & Understat'
                                  : sId < '2014-2015'
                                    ? 'Pre-xG Archive • Transfermarkt'
                                    : 'Archive • Transfermarkt & Understat'}
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

            {/* Archive Provenance Trigger */}
            <button
              type="button"
              onClick={() => setStatusPanelOpen(!statusPanelOpen)}
              aria-expanded={statusPanelOpen}
              aria-label="Inspect dataset provenance"
              className={`border border-[var(--ink)] font-ser text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-1 transition-colors ${
                statusPanelOpen
                  ? 'bg-[var(--ink)] text-[var(--paper)]'
                  : 'bg-transparent hover:bg-[var(--panel)] text-[var(--ink)]'
              }`}
              title="Inspect active season provenance and coverage"
            >
              <Database className={`w-3 h-3 ${statusPanelOpen ? 'text-[var(--paper)]' : 'text-[var(--blue)]'}`} />
              <span className="hidden sm:inline italic">Provenance</span>
            </button>

            {/* Shortlist Drawer Trigger */}
            {onOpenShortlist && (
              <button
                type="button"
                onClick={onOpenShortlist}
                aria-label={`Open Scout Shortlist (${shortlistCount} saved)`}
                className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser text-xs px-2.5 py-1.5 rounded-sm flex items-center gap-1 transition-colors"
                title="Open Scout Shortlist"
              >
                <Bookmark className="w-3 h-3 text-[var(--blue)]" />
                <span className="hidden sm:inline italic">Shortlist</span>
                <span className="font-mono font-bold text-[11px] tabular-nums">({shortlistCount})</span>
              </button>
            )}

            {/* Glossary Button */}
            <button
              type="button"
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

        {/* Top Player & League Search Bar */}
        <section
          ref={searchContainerRef}
          className="relative border-b border-[var(--ink)] py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs font-ser"
          aria-label="Global player and league search"
        >
          <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--mute)] pointer-events-none" />
              <input
                ref={searchInputRef}
                type="search"
                value={effectiveQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  updateQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Search players by name or league (e.g. Mbappé, Salah, Premier League, La Liga)..."
                aria-label="Search players by name or league"
                className="w-full border border-[var(--ink)] bg-[var(--paper)] focus:bg-[var(--panel)] pl-9 pr-16 py-2 text-xs sm:text-sm text-[var(--ink)] placeholder:italic placeholder:text-[var(--mute)] focus:outline-none transition-colors"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {effectiveQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      updateQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="p-0.5 text-[var(--mute)] hover:text-[var(--ink)]"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--rule)] text-[10px] font-mono text-[var(--mute)]">
                  /
                </kbd>
              </div>
            </div>

            <button
              type="submit"
              className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 font-disp font-bold uppercase tracking-wider text-xs px-3.5 py-2 whitespace-nowrap transition-opacity"
            >
              Filter Players
            </button>
          </form>

          {/* Interactive Big 5 League Filter Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 md:pb-0 shrink-0">
            <span className="font-disp font-bold uppercase text-[10px] text-[var(--mute)] tracking-wider mr-0.5 whitespace-nowrap">
              League:
            </span>
            {LEAGUES.map((lg) => {
              const isSelected = selectedComp === lg.id;
              return (
                <button
                  key={lg.id || 'all'}
                  type="button"
                  onClick={() => onSelectComp && onSelectComp(lg.id)}
                  className={`px-2 py-1 border text-[11px] font-semibold tracking-wide whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]'
                      : 'border-[var(--rule)] bg-[var(--panel)] text-[var(--ink)] hover:border-[var(--ink)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {lg.short}
                </button>
              );
            })}
          </div>

          {/* Live Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-0.5 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-2xl z-50 max-h-[26rem] overflow-y-auto">
              {/* Matching Leagues */}
              {matchingLeagues.length > 0 && (
                <div className="p-2.5 border-b border-[var(--rule)] bg-[var(--panel)]">
                  <span className="font-disp font-bold uppercase text-[10px] tracking-wider text-[var(--mute)] block mb-1.5">
                    Filter by League
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingLeagues.map((lg) => (
                      <button
                        key={lg.id}
                        type="button"
                        onClick={() => {
                          if (onSelectComp) onSelectComp(lg.id);
                          updateQuery('');
                          setSearchFocused(false);
                          if (onNavigate) onNavigate('explorer');
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-[var(--ink)] bg-[var(--paper)] hover:bg-[var(--ink)] hover:text-[var(--paper)] text-xs font-semibold transition-colors"
                      >
                        <span>{lg.label}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Players */}
              <div className="p-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-disp font-bold uppercase text-[10px] tracking-wider text-[var(--mute)]">
                    Matching Players {liveTotal > 0 ? `(${liveTotal.toLocaleString()})` : ''}
                  </span>
                  {loadingSearch && (
                    <span className="text-[11px] italic text-[var(--mute)]">Searching archive...</span>
                  )}
                </div>

                {liveResults.length > 0 ? (
                  <div className="divide-y divide-[var(--rule)]">
                    {liveResults.map((p) => (
                      <button
                        key={p.id || p.Rk || `${p.Player}-${p.Squad}`}
                        type="button"
                        onClick={() => {
                          if (onSelectPlayer) onSelectPlayer(p);
                          setSearchFocused(false);
                        }}
                        className="w-full text-left py-2 px-2 hover:bg-[var(--panel)] flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm text-[var(--ink)] truncate">
                            {p.Player}
                          </div>
                          <div className="text-[11px] text-[var(--mute)] truncate">
                            {p.Squad} • {p.competition_name || p.Comp?.replace(/^[a-z]{2,3}\s+/, '')} • {p.Pos}
                          </div>
                        </div>
                        <div className="text-right font-mono text-[11px] shrink-0 text-[var(--ink)]">
                          <span className="font-bold">{p.Gls ?? 0} Gls</span>
                          <span className="text-[var(--mute)]"> • {p.Ast ?? 0} Ast</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : !loadingSearch ? (
                  <div className="py-4 text-center text-xs italic text-[var(--mute)]">
                    No players found matching "{trimmedQuery}"
                    {selectedComp ? ` in ${LEAGUES.find((l) => l.id === selectedComp)?.label}` : ''}.
                  </div>
                ) : null}
              </div>

              {/* Matching Clubs */}
              {matchingClubs.length > 0 && (
                <div className="p-2.5 border-t border-[var(--rule)]">
                  <span className="font-disp font-bold uppercase text-[10px] tracking-wider text-[var(--mute)] block mb-1">
                    Clubs
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {matchingClubs.map((sq) => {
                      const name = typeof sq === 'string' ? sq : sq.name || sq.Squad;
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            if (onSelectSquad) onSelectSquad(name);
                            setSearchFocused(false);
                          }}
                          className="px-2 py-1 border border-[var(--rule)] hover:border-[var(--ink)] bg-[var(--panel)] text-xs font-semibold"
                        >
                          {name} &rarr;
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Action to view all filtered results */}
              {liveTotal > 0 && (
                <div className="p-2 border-t border-[var(--ink)] bg-[var(--panel)] flex items-center justify-between">
                  <span className="text-[11px] italic text-[var(--mute)]">
                    Showing top {liveResults.length} of {liveTotal.toLocaleString()} matches in Vol. {formatSeasonName(activeSeason)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchFocused(false);
                      if (onSubmitSearch) onSubmitSearch(effectiveQuery);
                      else if (onNavigate) onNavigate('explorer');
                    }}
                    className="inline-flex items-center gap-1 font-disp font-bold uppercase tracking-wider text-xs text-[var(--blue)] hover:underline"
                  >
                    <span>View All in Player Explorer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Coverage Metadata Strip */}
        <div className="border-b border-[var(--rule)] py-1.5 flex items-center justify-between gap-3 text-[11px] italic text-[var(--mute)] font-ser">
          <span>
            Coverage: Premier League, La Liga, Serie A, Bundesliga, and Ligue 1
          </span>
          <div className="hidden sm:flex items-center gap-2 shrink-0 font-medium">
            <span>{activeRecordsCount ? `${Number(activeRecordsCount).toLocaleString()} Players` : '2,854+ Players'}</span>
            <span>•</span>
            <span>{activeClubsCount ? `${activeClubsCount} European Clubs` : '96+ European Clubs'}</span>
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

          {currentTab !== 'plots' && (
            <div className="hidden md:flex items-center gap-2 text-xs italic text-[var(--mute)]">
              <span>{selectedComp ? LEAGUES.find((l) => l.id === selectedComp)?.label : 'All Big 5'}</span>
              <span>•</span>
              <span>{formatSeasonName(activeSeason)}</span>
            </div>
          )}
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

        {/* Simplified Dataset Provenance Summary Panel */}
        {statusPanelOpen && (
          <div className="my-3 p-4 border-2 border-[var(--ink)] bg-[var(--panel)] text-xs font-ser space-y-3">
            <div className="flex justify-between items-center border-b border-[var(--rule)] pb-1.5 gap-3">
              <h4 className="font-disp font-bold text-base text-[var(--ink)] uppercase tracking-wider">
                Active Volume Provenance
              </h4>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatusPanelOpen(false);
                    if (onNavigate) onNavigate('data');
                  }}
                  className="inline-flex items-center gap-1 font-mono text-[11px] uppercase font-bold text-[var(--blue)] hover:underline"
                >
                  <span>Dataset Registry</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setStatusPanelOpen(false)}
                  aria-label="Close provenance panel"
                  className="text-[var(--mute)] hover:text-[var(--ink)] font-bold text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-0.5">
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">
                  Active Volume
                </span>
                <span className="font-bold text-sm text-[var(--ink)]">
                  Vol. {formatSeasonName(activeSeason)} · {seasonBadgeText}
                </span>
                <div className="text-[11px] text-[var(--mute)] mt-0.5">
                  {availableSeasons.length || 14} archived seasons (2012/13 – 2025/26)
                </div>
              </div>
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">
                  Source &amp; Attribution
                </span>
                <span className="font-medium text-[var(--ink)]">{activeProvenanceSource}</span>
              </div>
              <div>
                <span className="text-[var(--mute)] uppercase text-[10px] font-disp font-bold block">
                  Metric Tracking
                </span>
                <span className="font-medium text-[var(--ink)]">
                  {activeUntrackedMetrics.length > 0
                    ? `Untracked (null): ${activeUntrackedMetrics.join(', ')}`
                    : isPreXgSeason
                      ? 'Pre-xG era: xG, xAG, and progressive actions are null'
                      : isBaseline
                        ? 'All 37 canonical metrics tracked (incl. PrgC/PrgP/PrgR)'
                        : 'Goals, assists, minutes, and expected goals (xG/xAG) tracked'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Global Metric Glossary Modal */}
        <GlossaryModal isOpen={glossaryOpen} onClose={() => setGlossaryOpen(false)} />

        {/* Main Publication Content */}
        <main className="py-5">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[var(--mute)]">
            <DataQualityBadge metadata={activeQuality} />
            {activeQuality?.partial_competitions && Object.keys(activeQuality.partial_competitions).length > 0 && (
              <span>{activeQuality.quality_notes || activeQuality.notes}</span>
            )}
          </div>
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
