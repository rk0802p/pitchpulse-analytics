import React from 'react';
import { Calendar, Shield } from 'lucide-react';
import SeasonSelector from './SeasonSelector';

export const PageHeader = ({
  title,
  subtitle,
  season = "",
  competition = null,
  actions = null,
  badge = null,
  activeSeason = null,
  availableSeasons = [],
  onSelectSeason = null,
  isSwitchingSeason = false
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-pitch-border mb-8">
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Interactive Season Dropdown when handler provided, otherwise fallback to static badge */}
          {onSelectSeason && availableSeasons.length > 0 ? (
            <SeasonSelector
              variant="header"
              align="left"
              activeSeason={activeSeason || season}
              availableSeasons={availableSeasons}
              onSelectSeason={onSelectSeason}
              isSwitchingSeason={isSwitchingSeason}
            />
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-3.5 h-3.5" />
              {season ? `Season ${season}` : "Selected Season"}
            </span>
          )}

          {competition && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              {competition}
            </span>
          )}
          {badge}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1 max-w-3xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
