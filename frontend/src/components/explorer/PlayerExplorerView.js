import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  X, 
  SlidersHorizontal, 
  ArrowUpDown,
  Download,
  GitCompare,
  Check
} from 'lucide-react';
import MetricTooltip from '../common/MetricTooltip';
import { 
  formatMinutes, 
  formatDecimal, 
  formatGoalsMinusXG, 
  formatNumber,
  nullSafeComparator 
} from '../../utils/metricFormatters';

export const PlayerExplorerView = ({
  players = [],
  loading = false,
  pagination,
  onPageChange,
  sortBy = 'Gls',
  sortOrder = 'desc',
  onSort,
  searchQuery,
  onSearchChange,
  selectedComp,
  onCompChange,
  selectedPos,
  onPosChange,
  selectedSquad,
  onSquadChange,
  minMinutes,
  onMinMinutesChange,
  ageRange,
  onAgeRangeChange,
  onSelectPlayer,
  onAddToCompare,
  compareList = [],
  onOpenCompare,
  squadsList = [],
  activeSeason = "2024-2025"
}) => {
  // Density toggle
  const [density, setDensity] = useState('comfortable'); // 'comfortable' | 'compact'
  const [hiddenCols, setHiddenCols] = useState([]);
  const [showColPicker, setShowColPicker] = useState(false);

  // Active filters for chips
  const activeFilters = [];
  if (selectedComp) activeFilters.push({ key: 'comp', label: `League: ${selectedComp.replace(/^[a-z]{2}\s+/, '')}`, clear: () => onCompChange('') });
  if (selectedPos) activeFilters.push({ key: 'pos', label: `Pos: ${selectedPos}`, clear: () => onPosChange('') });
  if (selectedSquad) activeFilters.push({ key: 'squad', label: `Club: ${selectedSquad}`, clear: () => onSquadChange('') });
  if (minMinutes && minMinutes > 0) activeFilters.push({ key: 'min', label: `Min ${minMinutes}m`, clear: () => onMinMinutesChange(0) });
  if (ageRange) activeFilters.push({ key: 'age', label: `Age: ${ageRange}`, clear: () => onAgeRangeChange && onAgeRangeChange('') });
  if (searchQuery) activeFilters.push({ key: 'search', label: `"${searchQuery}"`, clear: () => onSearchChange('') });

  const exportCSV = () => {
    if (!players || players.length === 0) return;
    const headers = ["Player", "Club", "League", "Pos", "Age", "Apps", "Minutes", "Goals", "xG", "G - xG", "Assists", "xAG", "PrgC", "PrgP"];
    const rows = players.map(p => [
      `"${p.Player || ''}"`,
      `"${p.Squad || p.Team || ''}"`,
      `"${p.Comp || ''}"`,
      `"${p.Pos || ''}"`,
      p.Age || '',
      p.MP || '',
      p.Min || '',
      p.Gls || 0,
      p.xG || 0,
      p.Gls_minus_xG || 0,
      p.Ast || 0,
      p.xAG || 0,
      p.PrgC || 0,
      p.PrgP || 0
    ].join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `pitchpulse_player_ledger_${activeSeason}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { key: "Player", label: "Player & Club", tooltip: "Player identity, club, and league competition" },
    { key: "Pos", label: "Pos", tooltip: "Primary tactical position" },
    { key: "Age", label: "Age", tooltip: "Age in years" },
    { key: "MP", label: "Apps", tooltip: "Official league match appearances" },
    { key: "Min", label: "Mins", tooltip: "Total minutes played in the campaign" },
    { key: "Gls", label: "Goals", tooltip: "Total goals scored" },
    { key: "xG", label: "xG", tooltip: "Cumulative expected goals" },
    { key: "Gls_minus_xG", label: "G - xG", tooltip: "Goals minus expected goals: positive values denote clinical overperformance" },
    { key: "Ast", label: "Assists", tooltip: "Total assists directly leading to a goal" },
    { key: "xAG", label: "xAG", tooltip: "Expected assisted goals: chance creation quality" },
    { key: "PrgC", label: "PrgC", tooltip: "Progressive carries: ball carries advancing 10+ yards toward goal" },
    { key: "PrgP", label: "PrgP", tooltip: "Progressive passes: completed passes advancing 10+ yards toward goal" },
    { key: "compare", label: "Compare", sortable: false, tooltip: "Add player to comparison dossier" }
  ];

  const visibleColumns = columns.filter(c => !hiddenCols.includes(c.key));

  return (
    <div className="space-y-6 font-ser not-italic">
      {/* 1. Header & Title */}
      <div className="border-b-2 border-[var(--ink)] pb-3">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Player Registry & Spatial Database
            </span>
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
              Player Explorer
            </h2>
          </div>
          <div className="text-xs italic text-[var(--mute)]">
            Showing {pagination?.total ? formatNumber(pagination.total) : formatNumber(players.length)} registered players
          </div>
        </div>
        <p className="text-xs italic text-[var(--mute)] mt-1">
          Search, filter, and cross-reference registered player statistics in Vol. {activeSeason}.
        </p>

        {/* 2. Comprehensive Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mt-4">
          {/* Player / Club search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search player or club..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-3 pr-8 text-xs text-[var(--ink)] placeholder:italic focus:outline-none focus:bg-[var(--panel)]"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--mute)]" />
          </div>

          {/* Position Selector */}
          <div>
            <select
              value={selectedPos}
              onChange={(e) => onPosChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              <option value="">All Positions</option>
              <option value="FW">Forwards (FW)</option>
              <option value="MF">Midfielders (MF)</option>
              <option value="DF">Defenders (DF)</option>
              <option value="GK">Goalkeepers (GK)</option>
            </select>
          </div>

          {/* Club Selector */}
          <div>
            <select
              value={selectedSquad}
              onChange={(e) => onSquadChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              <option value="">All Clubs (96)</option>
              {squadsList.map(sq => {
                const name = typeof sq === 'string' ? sq : sq.name || sq.Squad || sq.Team;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          {/* Minimum Minutes Selector */}
          <div>
            <select
              value={minMinutes || 0}
              onChange={(e) => onMinMinutesChange(Number(e.target.value))}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              <option value="0">Min Minutes: 0m</option>
              <option value="270">Min Minutes: 270m (3 apps)</option>
              <option value="500">Min Minutes: 500m</option>
              <option value="900">Min Minutes: 900m (10 apps)</option>
              <option value="1500">Min Minutes: 1,500m (Regulars)</option>
            </select>
          </div>

          {/* Table Controls (Density & Export) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDensity(d => d === 'comfortable' ? 'compact' : 'comfortable')}
              className="flex-1 border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1.5 text-xs italic text-[var(--ink)] text-center"
            >
              {density === 'comfortable' ? 'Compact' : 'Comfortable'}
            </button>
            <button
              onClick={exportCSV}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1.5 text-xs italic text-[var(--ink)] flex items-center justify-center gap-1"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Active Filter Chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
            <span className="text-[var(--mute)] text-[11px] italic mr-1">Active filters:</span>
            {activeFilters.map(f => (
              <span 
                key={f.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--panel)] border border-[var(--rule)] rounded-xs text-[11px] text-[var(--ink)]"
              >
                <span>{f.label}</span>
                <button onClick={f.clear} className="hover:text-[var(--red)]">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <button 
              onClick={() => {
                onCompChange('');
                onPosChange('');
                onSquadChange('');
                onMinMinutesChange(0);
                onSearchChange('');
              }}
              className="text-[11px] underline text-[var(--mute)] hover:text-[var(--ink)] ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Data Table */}
      <div className="overflow-x-auto border-t border-[var(--ink)]">
        <table className="w-full min-w-[900px] border-collapse text-xs font-ser">
          <thead>
            <tr className="border-b border-[var(--ink)]">
              {visibleColumns.map((col, idx) => {
                const isSortActive = sortBy === col.key;
                const isFirst = idx === 0;
                const isCompare = col.key === 'compare';
                const isNumeric = !isFirst && !isCompare && col.key !== 'Pos';

                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && onSort && onSort(col.key)}
                    className={`py-2 px-2.5 font-semibold text-xs whitespace-nowrap select-none ${
                      isFirst ? 'text-left sticky left-0 bg-[var(--paper)]' : isCompare ? 'text-center' : isNumeric ? 'text-right' : 'text-left'
                    } ${col.sortable !== false ? 'cursor-pointer hover:text-[var(--blue)]' : ''} ${
                      isSortActive ? 'text-[var(--red)] underline decoration-2 underline-offset-4' : 'text-[var(--ink)]'
                    }`}
                  >
                    <MetricTooltip metricKey={col.label} title={col.tooltip}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {isSortActive && (
                          <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                        )}
                      </span>
                    </MetricTooltip>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-12 italic text-[var(--mute)]">
                  Consulting European player ledger archive...
                </td>
              </tr>
            ) : players.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-12 italic text-[var(--mute)]">
                  No players match these filters. Try lowering the minimum minutes or clearing the position filter.
                </td>
              </tr>
            ) : (
              players.map((p, idx) => {
                const paddingClass = density === 'compact' ? 'py-1 px-2' : 'py-2 px-2.5';
                const deltaObj = formatGoalsMinusXG(p.Gls_minus_xG);
                const isSelectedInCompare = compareList.some(c => (c.id || c.Player) === (p.id || p.Player));

                return (
                  <tr 
                    key={p.id || p.Player || idx}
                    onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                  >
                    {/* 1. Player & Club */}
                    <td className={`${paddingClass} dotted-rule whitespace-nowrap text-left sticky left-0 bg-[var(--paper)] group-hover:bg-[var(--panel)] font-semibold`}>
                      <span className="text-[var(--ink)] group-hover:text-[var(--blue)] block">
                        {p.Player}
                      </span>
                      <span className="text-[10px] text-[var(--mute)] block font-normal">
                        {p.Squad || p.Team} • {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                      </span>
                    </td>

                    {/* 2. Position */}
                    <td className={`${paddingClass} dotted-rule text-left font-mono text-[11px]`}>
                      {p.Pos}
                    </td>

                    {/* 3. Age */}
                    <td className={`${paddingClass} dotted-rule text-right`}>
                      {p.Age || '—'}
                    </td>

                    {/* 4. Appearances */}
                    <td className={`${paddingClass} dotted-rule text-right`}>
                      {p.MP || 0}
                    </td>

                    {/* 5. Minutes */}
                    <td className={`${paddingClass} dotted-rule text-right font-mono`}>
                      {p.Min ? formatMinutes(p.Min) : '—'}
                    </td>

                    {/* 6. Goals */}
                    <td className={`${paddingClass} dotted-rule text-right font-bold text-[var(--ink)]`}>
                      {p.Gls ?? 0}
                    </td>

                    {/* 7. xG */}
                    <td className={`${paddingClass} dotted-rule text-right text-[var(--mute)]`}>
                      {formatDecimal(p.xG, 1)}
                    </td>

                    {/* 8. G - xG */}
                    <td className={`text-right ${paddingClass} dotted-rule font-bold font-mono ${
                      deltaObj.isOver ? 'text-[var(--blue)]' : deltaObj.isUnder ? 'text-[var(--red)]' : 'text-[var(--mute)]'
                    }`}>
                      {deltaObj.glyph} {deltaObj.text}
                    </td>

                    {/* 9. Assists */}
                    <td className={`${paddingClass} dotted-rule text-right font-semibold`}>
                      {p.Ast ?? 0}
                    </td>

                    {/* 10. xAG */}
                    <td className={`${paddingClass} dotted-rule text-right text-[var(--mute)]`}>
                      {formatDecimal(p.xAG, 1)}
                    </td>

                    {/* 11. PrgC */}
                    <td className={`${paddingClass} dotted-rule text-right font-mono`}>
                      {p.PrgC ?? 0}
                    </td>

                    {/* 12. PrgP */}
                    <td className={`${paddingClass} dotted-rule text-right font-mono`}>
                      {p.PrgP ?? 0}
                    </td>

                    {/* 13. Compare Button */}
                    <td className={`${paddingClass} dotted-rule text-center`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToCompare && onAddToCompare(p);
                        }}
                        className={`text-[10px] px-2 py-0.5 border rounded-xs transition-colors ${
                          isSelectedInCompare
                            ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)] font-bold'
                            : 'border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]'
                        }`}
                        title="Add to comparison"
                      >
                        {isSelectedInCompare ? '✓ In Compare' : '+ Compare'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--ink)] pt-3 text-xs italic text-[var(--mute)]">
          <div>
            Showing page {pagination.page} of {pagination.total_pages} ({formatNumber(pagination.total)} players registered)
          </div>
          <div className="flex items-center gap-2 not-italic">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1 rounded-xs disabled:opacity-30 disabled:pointer-events-none"
            >
              &larr; Previous
            </button>
            <span className="font-serif italic px-2">
              Folio {pagination.page}
            </span>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1 rounded-xs disabled:opacity-30 disabled:pointer-events-none"
            >
              Next &rarr;
            </button>
          </div>
        </div>
      )}

      {/* 5. Visible Compare Tray at the bottom */}
      {compareList.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-2xl px-4 py-2.5 rounded-xs flex items-center gap-4 max-w-xl w-[92%] justify-between">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] shrink-0">
              {compareList.length} Selected:
            </span>
            {compareList.map(p => (
              <span key={p.id || p.Player} className="text-xs font-semibold px-2 py-0.5 bg-[var(--panel)] border border-[var(--rule)] rounded-xs whitespace-nowrap">
                {p.Player.split(' ').pop()}
              </span>
            ))}
          </div>

          <button
            onClick={onOpenCompare}
            className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-disp font-bold text-xs uppercase tracking-wider px-3 py-1.5 hover:opacity-90 whitespace-nowrap"
          >
            Open Comparison ({compareList.length}) &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerExplorerView;
