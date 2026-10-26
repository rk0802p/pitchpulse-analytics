import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  GitCompare, 
  Layers, 
  Menu, 
  X, 
  Activity, 
  ExternalLink,
  Search
} from 'lucide-react';
import api from '../../services/api';

export const AppLayout = ({ 
  children, 
  currentTab = "dashboard", 
  onNavigate 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    // Check API health on layout mount
    api.getHealth()
      .then(res => {
        setApiOnline(res?.success || false);
      })
      .catch(() => {
        setApiOnline(false);
      });

    api.getMetadata()
      .then(res => {
        if (res?.success) setMetadata(res.data);
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { id: "dashboard", label: "Overview", icon: LayoutDashboard },
    { id: "explorer", label: "Player Explorer", icon: Users },
    { id: "leaderboards", label: "Leaderboards", icon: BarChart3 },
    { id: "compare", label: "Comparison", icon: GitCompare },
    { id: "browse", label: "Squad Browser", icon: Layers },
  ];

  const handleNavClick = (tabId) => {
    if (onNavigate) {
      onNavigate(tabId);
    }
    setMobileMenuOpen(false);
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
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
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
            <div className="flex justify-between">
              <span className="text-slate-500">Season</span>
              <span className="text-slate-300 font-medium">2024/25 Regular</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Records</span>
              <span className="text-slate-300 font-mono">2,854 Players</span>
            </div>
            <div className="flex justify-between">
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
              {currentTab.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-400">
              Premier League · La Liga · Serie A · Bundesliga · Ligue 1
            </span>
          </div>

          <div className="flex items-center gap-3">
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
