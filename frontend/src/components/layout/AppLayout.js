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
  Compass,
  Trophy,
  BarChart2,
  GitCompare,
  Layers
} from 'lucide-react';
import api from '../../services/api';

export const AppLayout = ({ 
  children, 
  currentTab = "dashboard", 
  onNavigate,
  activeSeason = "2024-2025",
  availableSeasons = [],
  onSelectSeason,
  isSwitchingSeason = false
}) => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

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
    { id: "dashboard", label: "Front Page" },
    { id: "leaderboards", label: "League & Ranks" },
    { id: "explorer", label: "Player Ledger" },
    { id: "browse", label: "Squad Directory" },
    { id: "compare", label: "Head-to-Head" },
    { id: "data", label: "Dataset Registry" },
  ];

  const handleNavClick = (tabId) => {
    if (onNavigate) {
      onNavigate(tabId);
    }
    setMobileMenuOpen(false);
  };

  const formatSeasonName = (id) => {
    if (!id) return '2024/25';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  };

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] font-ser selection:bg-[var(--rule)] selection:text-[var(--ink)]">
      <div className="max-w-[1120px] mx-auto px-4 sm:px-6 md:px-8 py-4 sm:py-6">
        
        {/* Editorial Masthead */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 mast-border">
          <div>
            <div className="flex items-baseline gap-3">
              <h1 
                onClick={() => handleNavClick("dashboard")}
                className="font-disp font-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight leading-none cursor-pointer hover:opacity-90 transition-opacity"
              >
                Terrace Ledger
              </h1>
              <span className="hidden md:inline-block font-disp font-bold text-xs uppercase px-2 py-0.5 border border-[var(--ink)] text-[var(--mute)]">
                PitchPulse Analytics
              </span>
            </div>
            <p className="italic text-[var(--mute)] text-sm sm:text-base mt-1.5">
              A running record of matches, shots, expected goals & modern football analytics.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Season Selector in Almanac style */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                disabled={isSwitchingSeason}
                className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser italic text-xs sm:text-sm px-3 py-1.5 rounded-sm flex items-center gap-1.5 transition-colors disabled:opacity-50"
                aria-label="Select season"
              >
                {isSwitchingSeason ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Vol. {formatSeasonName(activeSeason)}</span>
                )}
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {seasonDropdownOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-md z-50 text-xs py-1">
                  <div className="px-3 py-1.5 border-b border-[var(--rule)] font-disp font-bold tracking-wider text-[var(--mute)] uppercase text-[10px]">
                    Available Editions
                  </div>
                  {availableSeasons.map((s) => {
                    const sId = s.id || s;
                    const sName = s.name || s.display_name || sId;
                    const isSelected = sId === activeSeason;
                    return (
                      <button
                        key={sId}
                        onClick={() => {
                          if (onSelectSeason) onSelectSeason(sId);
                          setSeasonDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[var(--panel)] transition-colors ${
                          isSelected ? 'font-bold bg-[var(--panel)]' : ''
                        }`}
                      >
                        <span className="truncate">{sName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--blue)]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dark paper / Light paper toggle */}
            <button 
              onClick={toggleTheme}
              className="border border-[var(--ink)] bg-transparent hover:bg-[var(--panel)] text-[var(--ink)] font-ser italic text-xs sm:text-sm px-3 py-1.5 rounded-sm cursor-pointer whitespace-nowrap transition-colors"
              aria-label="Toggle paper theme"
            >
              {theme === 'dark' ? 'Light paper' : 'Dark paper'}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden border border-[var(--ink)] p-1.5 rounded-sm"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Section Navigation / Table of Contents */}
        <nav 
          className="sticky top-0 z-40 bg-[var(--paper)] border-b border-[var(--ink)] py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-sm sm:text-base"
          aria-label="Publication sections"
        >
          <div className="flex items-center gap-4 sm:gap-6 flex-nowrap shrink-0">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
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

          <div className="hidden md:flex items-center gap-3 text-xs italic text-[var(--mute)] shrink-0">
            <span>Daily Matchday Edition</span>
            <span>•</span>
            <span>Verified Opta/FBref Data</span>
          </div>
        </nav>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b-2 border-[var(--ink)] bg-[var(--panel)] py-2 px-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full text-left px-2 py-1.5 text-sm font-semibold rounded ${
                  currentTab === item.id ? 'bg-[var(--paper)] text-[var(--red)] font-bold' : 'text-[var(--ink)]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Publication Content */}
        <main className="py-6">
          {children}
        </main>

        {/* Editorial Footer */}
        <footer className="mt-16 pt-4 mast-border-top text-[var(--mute)] italic text-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 not-italic font-ser text-xs">
            <div>
              <h4 className="font-disp font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-1">
                Terrace Ledger & FBref Index
              </h4>
              <p className="text-[var(--mute)] leading-relaxed">
                A statistical almanac documenting modern football, progressive passing, ball carries, and cumulative expected goals (xG).
              </p>
            </div>
            <div>
              <h4 className="font-disp font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-1">
                Data Provenance & Calculation
              </h4>
              <p className="text-[var(--mute)] leading-relaxed">
                FBref verified standard & progressive metric definitions. Progressive carries require &ge; 10 yards into the opponent half or penalty area.
              </p>
            </div>
            <div>
              <h4 className="font-disp font-bold text-sm text-[var(--ink)] uppercase tracking-wider mb-1">
                Edition Notes
              </h4>
              <p className="text-[var(--mute)] leading-relaxed">
                Active Volume: <span className="font-semibold text-[var(--ink)]">{formatSeasonName(activeSeason)}</span>. Typeset in Big Shoulders Display & Source Serif 4.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-[var(--rule)] text-xs text-[var(--mute)]">
            <p>© PitchPulse Analytics & Terrace Ledger. Designed for editorial football analysis.</p>
            <p className="mt-1 sm:mt-0">Lining figures • Tabular numerals enabled</p>
          </div>
        </footer>

      </div>
    </div>
  );
};

export default AppLayout;
