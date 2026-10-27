import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, Check, RefreshCw, AlertTriangle, Lock, Calendar } from 'lucide-react';

/**
 * Reusable, accessible Season / Year Selector component.
 * Can be rendered in headers, navbars, sidebars, or filter bars.
 */
export const SeasonSelector = ({
  activeSeason = "2024-2025",
  availableSeasons = [],
  onSelectSeason,
  isSwitchingSeason = false,
  variant = "navbar", // "navbar" | "header" | "compact" | "badge"
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const formatSeasonShort = (id) => {
    if (!id) return '2024/25';
    return id.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  };

  const handleSelect = (seasonId) => {
    if (isSwitchingSeason) return;
    if (onSelectSeason && seasonId !== activeSeason) {
      onSelectSeason(seasonId);
    }
    setIsOpen(false);
  };

  const activeMeta = availableSeasons.find(s => (s.id || s) === activeSeason) || {};
  const isProjection = activeMeta.is_projection || activeMeta.dataset_status === 'projection';
  const isBaseline = activeMeta.is_baseline;

  // Variants styling
  const buttonStyles = {
    header: `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer shadow-sm ${
      isProjection
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50'
        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50'
    }`,
    navbar: `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/40 text-xs text-slate-200 transition-all cursor-pointer shadow-sm ${
      isProjection ? 'border-amber-500/40' : ''
    }`,
    compact: `w-full flex items-center justify-between p-2 rounded-lg bg-pitch-surface hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/40 text-xs transition-all cursor-pointer`,
    badge: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-all cursor-pointer ${
      isProjection 
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
    }`
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingSeason}
        aria-label="Select season"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${buttonStyles[variant] || buttonStyles.navbar} ${
          isSwitchingSeason ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {isSwitchingSeason ? (
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
        ) : variant === 'header' || variant === 'badge' ? (
          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}

        <span className="font-mono font-bold">
          {variant === 'header' ? `Season ${formatSeasonShort(activeSeason)}` : formatSeasonShort(activeSeason)}
        </span>

        {isBaseline && variant !== 'badge' && (
          <span className="text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hidden sm:inline-block">
            Baseline
          </span>
        )}
        {isProjection && variant !== 'badge' && (
          <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Projection
          </span>
        )}

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div 
          role="listbox"
          aria-label="Available football seasons"
          className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-72 max-w-[90vw] bg-pitch-surface border border-pitch-border rounded-xl shadow-2xl py-1.5 z-50 animate-fadeIn divide-y divide-pitch-border/40"
        >
          {/* Dropdown Header */}
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex justify-between items-center bg-pitch-card">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-emerald-400" /> Switch Season / Year
            </span>
            {isSwitchingSeason && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-sans normal-case">
                <RefreshCw className="w-3 h-3 animate-spin" /> Switching...
              </span>
            )}
          </div>

          {/* Season Options List */}
          <div className="max-h-72 overflow-y-auto py-1 divide-y divide-pitch-border/20">
            {availableSeasons.map((s) => {
              const sId = s.id || s;
              const sName = s.name || s.display_name || sId;
              const isSelected = sId === activeSeason;
              const isProj = s.is_projection || s.dataset_status === 'projection';
              const isBase = s.is_baseline;

              return (
                <button
                  key={sId}
                  role="option"
                  type="button"
                  aria-selected={isSelected}
                  disabled={isSwitchingSeason}
                  onClick={() => handleSelect(sId)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate font-medium">{sName}</span>
                      {isBase && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Baseline
                        </span>
                      )}
                      {isProj && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                          <AlertTriangle className="w-2.5 h-2.5" /> Projection
                        </span>
                      )}
                      {!isBase && !isProj && (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          Historical
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                      <span>{sId}</span>
                      {s.records_count ? <span>• {Number(s.records_count).toLocaleString()} players</span> : null}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3 py-1.5 bg-pitch-card/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>{availableSeasons.length} seasons available</span>
            <span className="text-slate-400">PitchPulse Multi-Season</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonSelector;
