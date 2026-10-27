import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  GitCompare, 
  Layers, 
  Menu, 
  X, 
  Search, 
  Database, 
  ChevronDown, 
  Check,
  RefreshCw,
  
  
  Calendar
} from 'lucide-react';
import api from '../../services/api';
export const AppLayout = ({ 
  children, 
  currentTab = "dashboard", 
  onNavigate,
  activeSeason = "2025-2026",
  availableSeasons = [],
  onSelectSeason,
  isSwitchingSeason = false
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const dropdownRef = useRef(null);
  useEffect(() => {
    // Check API health on layout mount
    api.getHealth()
      .then(res => {
        setApiOnline(res?.success || false);
      })
      .catch(() => {
        setApiOnline(false);
      });
  }, []);
  // Close season dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setSeasonDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSeasonDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "explorer", label: "Player Explorer", icon: Users },
    { id: "leaderboards", label: "Leaderboards", icon: BarChart3 },
    { id: "compare", label: "Comparison", icon: GitCompare },
    { id: "browse", label: "Squad Browser", icon: Layers },
    { id: "data", label: "Dataset Registry", icon: Database },
  ];
  const handleNavClick = (tabId) => {
    if (onNavigate) {
      onNavigate(tabId);
    }
    setMobileMenuOpen(false);
  };
  const handleSeasonSelect = (seasonId) => {
    if (isSwitchingSeason) return;
    if (onSelectSeason) {
      onSelectSeason(seasonId);
    }
    setSeasonDropdownOpen(false);
  };
  const formatSeasonName = (id) => {
    if (!id) return '2025/26';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  };
  const activeSeasonMeta = availableSeasons.find(s => (s.id || s) === activeSeason) || {};
  const isActiveProjection = activeSeasonMeta.is_projection || activeSeasonMeta.dataset_status === 'projection';
    const renderSeasonOption = (s) => {
    const sId = s.id || s;
    const sName = s.name || s.display_name || sId;
    const isSelected = sId === activeSeason;
            return (
      <button
        key={sId}
        role="option"
        aria-selected={isSelected}
        disabled={isSwitchingSeason}
        onClick={() => handleSeasonSelect(sId)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-left text-xs transition-colors border-b border-pitch-border/30 last:border-b-0 ${
          isSelected 
            ? 'text-emerald-400 font-bold bg-emerald-500/10' 
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        } ${isSwitchingSeason ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="truncate font-medium">{sName}</span>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {s.status_label || (s.dataset_status === 'verified_historical' ? 'Historical Season' : 'Completed Season')}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
            <span>{sId}</span>
            {s.records_count ? <span>• {Number(s.records_count).toLocaleString()} players</span> : null}
          </div>
        </div>
        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
      </button>
    );
  };
  return (
    <div className="min-h-screen bg-pitch-dark text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-pitch-surface border-b border-pitch-border sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            ⚽
          </div>
          <span className="font-bold text-base tracking-tight text-white">
            PitchPulse <span className="text-emerald-400 text-xs font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">Analytics</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Season Pill - Opens season selector */}
          <button
            onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
            disabled={isSwitchingSeason}
            aria-label="Select active football season"
            aria-expanded={seasonDropdownOpen}
            className={`px-2.5 py-1 bg-pitch-card hover:bg-slate-800 border border-pitch-border rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors ${
              isActiveProjection ? 'text-amber-400 border-amber-500/40' : 'text-emerald-400'
            } ${isSwitchingSeason ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            {isSwitchingSeason ? (
              <RefreshCw className="w-3 h-3 text-emerald-400 animate-spin" />
            ) : (
              <Database className="w-3 h-3 text-emerald-400" />
            )}
            <span>{formatSeasonName(activeSeason)}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>
      {/* Mobile Season Selector Modal Backdrop */}
      {seasonDropdownOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:hidden">
          <div className="w-full max-w-sm bg-pitch-surface border border-pitch-border rounded-2xl shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-pitch-border flex items-center justify-between bg-pitch-card">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Select Season</h3>
              </div>
              <button
                onClick={() => setSeasonDropdownOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Close season modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto divide-y divide-pitch-border/30">
              {availableSeasons.map(renderSeasonOption)}
            </div>
            <div className="p-3 border-t border-pitch-border/60 bg-pitch-surface flex items-center justify-between">
              <button
                onClick={() => {
                  handleNavClick("data");
                  setSeasonDropdownOpen(false);
                }}
                className="text-xs text-slate-400 hover:text-emerald-400 font-mono"
              >
                Dataset Registry &rarr;
              </button>
              <button
                onClick={() => setSeasonDropdownOpen(false)}
                className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-pitch-surface border-r border-pitch-border flex flex-col justify-between
        transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-0 hidden md:flex'}
      `}>
        {/* Brand */}
        <div>
          <div className="p-6 border-b border-pitch-border/80 hidden md:flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl shadow-sm">
              ⚽
            </div>
            <div>
              <h2 className="font-bold text-base text-white leading-tight tracking-tight">
                PitchPulse
              </h2>
              <p className="text-xs text-slate-400 font-mono tracking-wide">
                EUROPEAN BIG 5
              </p>
            </div>
          </div>
          {/* Nav List */}
          <nav className="p-4 space-y-1">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 font-mono">
              Intelligence
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left
                    ${isActive 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'}
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
        {/* Sidebar Footer */}
        <div className="p-4 border-t border-pitch-border/80 bg-pitch-surface/60">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-mono text-[11px]">API ENGINE</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
              <span className={apiOnline ? 'text-emerald-400 font-mono text-[11px]' : 'text-rose-400 font-mono text-[11px]'}>
                {apiOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-pitch-card border border-pitch-border text-[11px] text-slate-400 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Active Season</span>
              <span className="text-emerald-400 font-mono font-semibold">{activeSeason}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Status</span>
              <span className="text-emerald-300 font-mono text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                {activeSeasonMeta.status_label || (activeSeasonMeta.dataset_status === 'verified_historical' ? 'Historical Data' : 'Completed Season')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Coverage</span>
              <span className="text-slate-300">5 Competitions</span>
            </div>
          </div>
        </div>
      </aside>
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <div className="hidden md:flex items-center justify-between px-8 py-3.5 bg-pitch-surface/80 backdrop-blur border-b border-pitch-border sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-400 bg-pitch-card px-2.5 py-1 rounded-md border border-pitch-border">
              {currentTab === 'data' ? 'DATASET REGISTRY' : currentTab.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-400">
              Premier League · La Liga · Serie A · Bundesliga · Ligue 1
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Season Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setSeasonDropdownOpen(!seasonDropdownOpen)}
                disabled={isSwitchingSeason}
                aria-label="Select season"
                aria-haspopup="listbox"
                aria-expanded={seasonDropdownOpen}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/40 text-xs transition-colors ${
                  isSwitchingSeason ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isSwitchingSeason ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                ) : (
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className="text-slate-400">Season:</span>
                <span className="font-mono font-bold text-white">{activeSeason}</span>
                {isActiveProjection && (
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Proj
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
              {/* Dropdown Menu */}
              {seasonDropdownOpen && (
                <div 
                  role="listbox" 
                  aria-label="Available football seasons"
                  className="absolute right-0 mt-1.5 w-80 sm:w-92 max-w-[calc(100vw-2rem)] bg-pitch-card border border-pitch-border rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn overflow-hidden"
                >
                  <div className="px-3 py-1.5 border-b border-pitch-border/60 text-[10px] font-mono uppercase tracking-wider text-slate-500 flex justify-between items-center">
                    <span>Switch Active Season</span>
                    {isSwitchingSeason && (
                      <span className="text-emerald-400 flex items-center gap-1 normal-case font-sans text-xs">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Loading...
                      </span>
                    )}
                  </div>
                  <div className="max-h-[min(520px,75vh)] overflow-y-auto py-1">
                    {availableSeasons.map(renderSeasonOption)}
                  </div>
                  <div className="border-t border-pitch-border/60 px-3 py-1.5 bg-pitch-surface/40 flex justify-between items-center">
                    <button
                      onClick={() => {
                        handleNavClick("data");
                        setSeasonDropdownOpen(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 font-mono transition-colors"
                    >
                      Manage Datasets &rarr;
                    </button>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {availableSeasons.length} seasons
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => handleNavClick("explorer")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border text-xs text-slate-300 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span>Search players...</span>
            </button>
          </div>
        </div>
        {/* Viewport Content */}
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
export default AppLayout;
