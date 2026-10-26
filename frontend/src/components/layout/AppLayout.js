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
  Check
} from 'lucide-react';
import api from '../../services/api';

export const AppLayout = ({ 
  children, 
  currentTab = "dashboard", 
  onNavigate,
  activeSeason = "2024-2025",
  availableSeasons = [],
  onSelectSeason
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

  // Close season dropdown on click outside
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
    if (onSelectSeason) {
      onSelectSeason(seasonId);
    }
    setSeasonDropdownOpen(false);
  };

  const formatSeasonName = (id) => {
    if (!id) return '2024/25';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
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
          {/* Mobile Season Pill */}
          <button
            onClick={() => handleNavClick("data")}
            className="px-2 py-1 bg-pitch-card border border-pitch-border rounded text-[11px] font-mono text-emerald-400"
          >
            {formatSeasonName(activeSeason)}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

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
          <div className="p-2.5 rounded-lg bg-pitch-card border border-pitch-border text-[11px] text-slate-400 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Active Season</span>
              <span className="text-emerald-400 font-mono font-semibold">{activeSeason}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Storage Mode</span>
              <span className="text-slate-300 font-mono">Versioned Local</span>
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
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/40 text-xs transition-colors"
              >
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Season:</span>
                <span className="font-mono font-bold text-white">{activeSeason}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {/* Dropdown Menu */}
              {seasonDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-60 bg-pitch-card border border-pitch-border rounded-xl shadow-xl py-1.5 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 border-b border-pitch-border/60 text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    Switch Active Season
                  </div>
                  <div className="max-h-60 overflow-y-auto py-1">
                    {availableSeasons.map((s) => {
                      const isSelected = (s.id || s) === activeSeason;
                      const sId = s.id || s;
                      const sName = s.name || sId;
                      return (
                        <button
                          key={sId}
                          onClick={() => handleSeasonSelect(sId)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-slate-800/80 ${
                            isSelected ? 'text-emerald-400 font-bold bg-emerald-500/10' : 'text-slate-300'
                          }`}
                        >
                          <div>
                            <div>{sName}</div>
                            <span className="text-[10px] text-slate-500 font-mono">{sId}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-pitch-border/60 px-3 py-1.5 bg-pitch-surface/40">
                    <button
                      onClick={() => {
                        handleNavClick("data");
                        setSeasonDropdownOpen(false);
                      }}
                      className="text-[11px] text-slate-400 hover:text-emerald-400 font-mono transition-colors block w-full text-left"
                    >
                      Manage Datasets &rarr;
                    </button>
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
