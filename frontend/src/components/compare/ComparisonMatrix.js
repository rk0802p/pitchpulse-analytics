import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  X, 
  Check, 
  ArrowLeftRight,
  TrendingUp,
  Shield,
  Activity
} from 'lucide-react';
import { formatMetricValue } from '../../utils/metricFormatters';

export const ComparisonMatrix = ({
  players = [],
  onRemovePlayer,
  onAddPlayer,
  allAvailablePlayers = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const metrics = [
    { key: "Gls", label: "Goals", isBetter: "high" },
    { key: "xG", label: "Expected Goals (xG)", isBetter: "high" },
    { key: "Ast", label: "Assists", isBetter: "high" },
    { key: "xAG", label: "Expected Assists (xAG)", isBetter: "high" },
    { key: "PrgC", label: "Progressive Carries", isBetter: "high" },
    { key: "PrgP", label: "Progressive Passes", isBetter: "high" },
    { key: "PrgR", label: "Progressive Receptions", isBetter: "high" },
    { key: "Min", label: "Minutes Played", isBetter: "high" },
    { key: "90s", label: "90s Played", isBetter: "high" },
  ];

  const searchResults = searchTerm.trim().length > 1
    ? allAvailablePlayers.filter(p => 
        p.Player?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !players.some(sel => sel.id === p.id || sel.Player === p.Player)
      ).slice(0, 6)
    : [];

  return (
    <div className="space-y-8 font-ser not-italic">
      {/* Editorial Header */}
      <div className="border-b-2 border-[var(--ink)] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
            Comparative Dossier
          </span>
          <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none">
            Head-to-Head Player Comparison
          </h2>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Juxtaposing attacking, creative, and spatial metrics across matched cohorts.
          </p>
        </div>

        {/* Player Search Autocomplete */}
        <div className="relative w-full md:w-72">
          <div className="relative">
            <input
              type="text"
              placeholder="Search player to add..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-3 pr-8 text-xs font-ser text-[var(--ink)] placeholder:italic focus:outline-none focus:bg-[var(--panel)]"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--mute)]" />
          </div>

          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-xl z-50 text-xs">
              {searchResults.map(p => (
                <div
                  key={p.id || p.Player}
                  onClick={() => {
                    if (onAddPlayer) onAddPlayer(p);
                    setSearchTerm('');
                    setDropdownOpen(false);
                  }}
                  className="px-3 py-2 hover:bg-[var(--panel)] cursor-pointer flex justify-between items-center border-b border-[var(--rule)] last:border-b-0"
                >
                  <div>
                    <span className="font-bold text-[var(--ink)]">{p.Player}</span>
                    <span className="text-[var(--mute)] text-[11px] block">{p.Squad || p.Team} • {p.Pos}</span>
                  </div>
                  <span className="font-disp font-bold text-[var(--blue)]">+ ADD</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="py-16 text-center text-[var(--mute)] italic border border-dashed border-[var(--rule)]">
          <p className="text-lg">No players selected for comparison.</p>
          <p className="text-xs mt-1">Select players from the Player Ledger or use the search field above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-[var(--ink)]">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[var(--ink)]">
                <th className="text-left py-3 px-3 font-disp font-bold text-xs uppercase text-[var(--mute)] w-1/3">
                  Metric Description
                </th>
                {players.map((p, idx) => (
                  <th key={p.id || idx} className="text-center py-3 px-3 relative bg-[var(--panel)] border-l border-[var(--rule)]">
                    <button
                      onClick={() => onRemovePlayer && onRemovePlayer(p)}
                      className="absolute top-2 right-2 text-[var(--mute)] hover:text-[var(--red)]"
                      title="Remove from comparison"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="font-disp font-extrabold text-2xl text-[var(--ink)] leading-none mt-1">
                      {p.Player}
                    </div>
                    <div className="text-xs italic text-[var(--mute)] font-ser font-normal mt-0.5">
                      {p.Squad || p.Team} • {p.Pos}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => {
                // Find max value across players for this metric
                const values = players.map(p => Number(p[m.key]) || 0);
                const maxVal = Math.max(...values);

                return (
                  <tr key={m.key} className="hover:bg-[var(--panel)] transition-colors">
                    <td className="text-left py-2.5 px-3 dotted-rule font-medium text-xs sm:text-sm text-[var(--ink)]">
                      {m.label}
                    </td>
                    {players.map((p, idx) => {
                      const val = p[m.key];
                      const numVal = Number(val) || 0;
                      const isBest = values.length > 1 && numVal === maxVal && maxVal > 0;

                      return (
                        <td 
                          key={p.id || idx} 
                          className={`text-center py-2.5 px-3 dotted-rule border-l border-[var(--rule)] ${
                            isBest ? 'font-bold text-[var(--blue)] bg-[var(--paper)]' : 'text-[var(--ink)]'
                          }`}
                        >
                          <span className="font-disp text-lg">
                            {formatMetricValue(m.key, val)}
                          </span>
                          {isBest && <span className="text-[10px] ml-1 font-bold text-[var(--blue)]">★</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ComparisonMatrix;
