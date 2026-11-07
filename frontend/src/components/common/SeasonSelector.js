import React, { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, Check, RefreshCw, Calendar, AlertTriangle } from 'lucide-react';

/**
 * Reusable, accessible Season / Year Selector component.
 * Can be rendered in headers, navbars, sidebars, or filter bars.
 * Includes quarantine and governance badging for unverified datasets.
 */
export const SeasonSelector = ({
  activeSeason = "2024-2025",
  availableSeasons = [],
  onSelectSeason,
  isSwitchingSeason = false,
  variant = "header", // "header" | "navbar" | "compact" | "badge"
  align, // "left" | "right" (defaults based on variant)
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
  const isQuarantined = activeMeta.is_quarantined || activeMeta.dataset_status === 'quarantined';
  const isProjection = activeMeta.is_projection || activeMeta.dataset_status === 'projection' || isQuarantined;

  // Resolved dropdown horizontal alignment
  const resolvedAlign = align || (variant === 'navbar' ? 'right' : 'left');
  const alignClass = resolvedAlign === 'right' ? 'right-0' : 'left-0';

  // Variants styling
  const buttonStyles = {
    header: `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider border transition-all cursor-pointer shadow-sm ${
      isProjection
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25 hover:border-amber-500/50'
        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 hover:border-emerald-500/50'
    } ${isOpen ? (isProjection ? 'ring-2 ring-amber-500/30 border-amber-500/60' : 'ring-2 ring-emerald-500/30 border-emerald-500/60') : ''}`,
    navbar: `flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/40 text-xs text-slate-200 transition-all cursor-pointer shadow-sm ${
      isProjection ? 'border-amber-500/40 text-amber-300' : ''
    } ${isOpen ? 'ring-2 ring-emerald-500/30 border-emerald-500/60' : ''}`,
    compact: `w-full flex items-center justify-between p-2 rounded-lg bg-pitch-surface hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/40 text-xs transition-all cursor-pointer ${
      isOpen ? 'border-emerald-500/60' : ''
    }`,
    badge: `inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold border transition-all cursor-pointer ${
      isProjection 
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
    } ${isOpen ? 'ring-2 ring-emerald-500/30' : ''}`
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
        className={`${buttonStyles[variant] || buttonStyles.header} ${
          isSwitchingSeason ? 'opacity-60 cursor-not-allowed' : ''
        }`}
      >
        {isSwitchingSeason ? (
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
        ) : isQuarantined ? (
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        ) : variant === 'header' || variant === 'badge' ? (
          <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        ) : (
          <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        )}
        <span className="font-mono font-bold">
          {variant === 'header' ? `Season ${formatSeasonShort(activeSeason)}` : formatSeasonShort(activeSeason)}
        </span>
        {isQuarantined && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/25 text-amber-300 font-mono">
            Quarantine
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div 
          role="listbox"
          aria-label="Available football seasons"
          className={`absolute ${alignClass} mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-pitch-surface/98 backdrop-blur-md border border-pitch-border rounded-xl shadow-2xl z-50 animate-fadeIn overflow-hidden`}
        >
          {/* Dropdown Header */}
          <div className="px-3.5 py-2.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex justify-between items-center bg-pitch-card border-b border-pitch-border/60">
            <span className="flex items-center gap-1.5 font-semibold">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Switch Season / Year
            </span>
            {isSwitchingSeason && (
              <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-sans normal-case">
                <RefreshCw className="w-3 h-3 animate-spin" /> Switching...
              </span>
            )}
          </div>

          {/* Season Options List */}
          <div className="max-h-[min(520px,75vh)] overflow-y-auto py-1 divide-y divide-pitch-border/20">
            {availableSeasons.map((s) => {
              const sId = s.id || s;
              const sName = s.name || s.display_name || sId;
              const isSelected = sId === activeSeason;
              const isItemQuarantined = s.is_quarantined || s.dataset_status === 'quarantined';

              return (
                <button
                  key={sId}
                  role="option"
                  type="button"
                  aria-selected={isSelected}
                  disabled={isSwitchingSeason}
                  onClick={() => handleSelect(sId)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors ${
                    isSelected
                      ? (isItemQuarantined ? 'bg-amber-500/15 text-amber-300 font-bold border-l-2 border-amber-400 pl-3' : 'bg-emerald-500/15 text-emerald-400 font-bold border-l-2 border-emerald-400 pl-3')
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border-l-2 border-transparent pl-3'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-xs ${isSelected ? (isItemQuarantined ? 'text-amber-300' : 'text-emerald-400') : 'text-slate-200'}`}>
                        {sName}
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0 border ${
                        isItemQuarantined
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {s.status_label || (isItemQuarantined ? 'Quarantined / Provisional' : 'Historical Season')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-2">
                      <span className="text-slate-500 font-bold">{sId}</span>
                      {s.records_count ? <span>• {Number(s.records_count).toLocaleString()} players</span> : null}
                    </div>
                  </div>
                  {isSelected && <Check className={`w-4 h-4 shrink-0 ml-1 ${isItemQuarantined ? 'text-amber-400' : 'text-emerald-400'}`} />}
                </button>
              );
            })}
          </div>

          {/* Dropdown Footer */}
          <div className="px-3.5 py-2 bg-pitch-card/60 border-t border-pitch-border/60 flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-emerald-400" />
              {availableSeasons.length} seasons available
            </span>
            <span className="text-slate-500">PitchPulse Multi-Season</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeasonSelector;
