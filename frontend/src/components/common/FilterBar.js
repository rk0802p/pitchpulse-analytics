import React from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';

export const FilterBar = ({
  search = "",
  onSearchChange,
  competition = "",
  onCompetitionChange,
  position = "",
  onPositionChange,
  minMinutes = 0,
  onMinMinutesChange,
  competitions = [],
  onReset
}) => {
  const positions = [
    { id: "", label: "All Pos" },
    { id: "FW", label: "Forwards" },
    { id: "MF", label: "Midfielders" },
    { id: "DF", label: "Defenders" },
    { id: "GK", label: "Goalkeepers" }
  ];

  const minutePresets = [
    { value: 0, label: "All Mins" },
    { value: 450, label: "450+ (5+ apps)" },
    { value: 900, label: "900+ (10+ apps)" },
    { value: 1500, label: "1500+ (Regulars)" }
  ];

  const hasActiveFilters = Boolean(search || competition || position || minMinutes > 0);

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-4 mb-6 space-y-4">
      {/* Top Row: Search & Competition Dropdown */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search player or squad (e.g. Saka, Real Madrid, Isak)..."
            className="w-full bg-pitch-surface border border-pitch-border focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/50 rounded-lg pl-10 pr-9 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Competition Dropdown */}
        <div className="w-full md:w-56">
          <select
            value={competition}
            onChange={(e) => onCompetitionChange(e.target.value)}
            className="w-full bg-pitch-surface border border-pitch-border focus:border-emerald-500/60 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none cursor-pointer"
          >
            <option value="">All Competitions (5 Leagues)</option>
            {competitions.map((comp) => (
              <option key={comp.id || comp.raw_name} value={comp.id || comp.raw_name}>
                {comp.name || comp.raw_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bottom Row: Position Pills & Min Minutes presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-pitch-border/60">
        {/* Position Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Role:</span>
          {positions.map((pos) => {
            const isActive = position === pos.id;
            return (
              <button
                key={pos.id}
                onClick={() => onPositionChange(pos.id)}
                className={`
                  px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                  ${isActive 
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs' 
                    : 'bg-pitch-surface hover:bg-slate-800 text-slate-400 border border-pitch-border'}
                `}
              >
                {pos.label}
              </button>
            );
          })}
        </div>

        {/* Min Minutes Filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 mr-1 hidden sm:inline">Playing Time:</span>
          {minutePresets.map((preset) => {
            const isActive = minMinutes === preset.value;
            return (
              <button
                key={preset.value}
                onClick={() => onMinMinutesChange(preset.value)}
                className={`
                  px-2 py-1 rounded-md text-xs font-mono transition-colors
                  ${isActive 
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 shadow-xs' 
                    : 'bg-pitch-surface hover:bg-slate-800 text-slate-400 border border-pitch-border'}
                `}
              >
                {preset.label}
              </button>
            );
          })}

          {hasActiveFilters && onReset && (
            <button
              onClick={onReset}
              className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 transition-colors"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
