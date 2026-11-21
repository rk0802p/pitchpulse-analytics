import React, { useState } from 'react';
import {
  Search,
  X,
  Download,
  Check,
  Link2,
  Bookmark,
} from 'lucide-react';
import api from '../../services/api';
import MetricTooltip from '../common/MetricTooltip';
import {
  formatMinutes,
  formatDecimal,
  formatGoalsMinusXG,
  formatNumber,
} from '../../utils/metricFormatters';
import {
  AGE_RANGE_PRESETS,
  getAgeRangeBounds,
  isPlayerInShortlist,
} from '../../utils/shortlistStore';
import { serializeExplorerHash } from '../../utils/hashRoute';

export const PlayerExplorerView = ({
  players = [],
  loading = false,
  pagination,
  onPageChange,
  sortBy = 'Gls',
  sortOrder = 'desc',
  onSort,
  searchQuery = '',
  onSearchChange,
  selectedComp = '',
  onCompChange,
  selectedPos = '',
  onPosChange,
  selectedSquad = '',
  onSquadChange,
  minMinutes = 0,
  onMinMinutesChange,
  ageRange = '',
  onAgeRangeChange,
  statMode = 'totals',
  onStatModeChange,
  onSelectPlayer,
  onAddToCompare,
  compareList = [],
  onOpenCompare,
  shortlist = [],
  onToggleShortlist,
  squadsList = [],
  activeSeason = '2024-2025',
}) => {
  const [density, setDensity] = useState('comfortable'); // 'comfortable' | 'compact'
  const [localStatMode, setLocalStatMode] = useState(statMode);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportNote, setExportNote] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const effectiveMode = onStatModeChange ? statMode : localStatMode;
  const isPer90 = effectiveMode === 'per90';

  const handleModeSwitch = (nextMode) => {
    setLocalStatMode(nextMode);
    if (onStatModeChange) onStatModeChange(nextMode);
    if (onSort) {
      const rateMap = {
        Gls: 'Gls_90',
        xG: 'xG_90',
        Ast: 'Ast_90',
        xAG: 'xAG_90',
        PrgC: 'PrgC_90',
        PrgP: 'PrgP_90',
      };
      const reverseMap = Object.fromEntries(Object.entries(rateMap).map(([k, v]) => [v, k]));
      if (nextMode === 'per90' && rateMap[sortBy]) {
        onSort(rateMap[sortBy]);
      } else if (nextMode === 'totals' && reverseMap[sortBy]) {
        onSort(reverseMap[sortBy]);
      }
    }
  };

  const ageLabel = AGE_RANGE_PRESETS[ageRange]?.label || ageRange;

  // Active filters for chips
  const activeFilters = [];
  if (selectedComp) activeFilters.push({ key: 'comp', label: `League: ${selectedComp.replace(/^[a-z]{2,3}\s+/, '')}`, clear: () => onCompChange && onCompChange('') });
  if (selectedPos) activeFilters.push({ key: 'pos', label: `Pos: ${selectedPos}`, clear: () => onPosChange && onPosChange('') });
  if (selectedSquad) activeFilters.push({ key: 'squad', label: `Club: ${selectedSquad}`, clear: () => onSquadChange && onSquadChange('') });
  if (minMinutes && minMinutes > 0) activeFilters.push({ key: 'min', label: `Min ${minMinutes}m`, clear: () => onMinMinutesChange && onMinMinutesChange(0) });
  if (ageRange) activeFilters.push({ key: 'age', label: `Age: ${ageLabel}`, clear: () => onAgeRangeChange && onAgeRangeChange('') });
  if (searchQuery) activeFilters.push({ key: 'search', label: `"${searchQuery}"`, clear: () => onSearchChange && onSearchChange('') });

  const exportCSV = async () => {
    if ((!players || players.length === 0) && !pagination?.total) return;
    setExportingCsv(true);
    setExportNote('');

    try {
      let rowsToExport = players;
      // Fetch full filtered cohort from backend (all=true) when available
      if (api && typeof api.getPlayers === 'function') {
        const { ageMin, ageMax } = getAgeRangeBounds(ageRange);
        const res = await api.getPlayers({
          season: activeSeason,
          search: searchQuery || undefined,
          competition: selectedComp || undefined,
          position: selectedPos || undefined,
          squad: selectedSquad || undefined,
          min_minutes: minMinutes || undefined,
          age_min: ageMin ?? undefined,
          age_max: ageMax ?? undefined,
          sort_by: sortBy,
          order: sortOrder,
          all: 'true',
        });
        if (res?.success && Array.isArray(res.data) && res.data.length > 0) {
          rowsToExport = res.data;
        }
      }

      const escapeCell = (val) => {
        if (val === null || val === undefined || Number.isNaN(val)) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = [
        'Player', 'Club', 'League', 'Pos', 'Age', 'Apps', 'Minutes',
        'Goals', 'Goals/90', 'xG', 'xG/90', 'G - xG',
        'Assists', 'Assists/90', 'xAG', 'xAG/90', 'PrgC', 'PrgC/90', 'PrgP', 'PrgP/90',
      ];
      const csvRows = rowsToExport.map((p) => [
        escapeCell(p.Player ?? ''),
        escapeCell(p.Squad || p.Team || ''),
        escapeCell(p.Comp ?? ''),
        escapeCell(p.Pos ?? ''),
        escapeCell(p.Age),
        escapeCell(p.MP),
        escapeCell(p.Min),
        escapeCell(p.Gls),
        escapeCell(p.Gls_90),
        escapeCell(p.xG),
        escapeCell(p.xG_90),
        escapeCell(p.Gls_minus_xG),
        escapeCell(p.Ast),
        escapeCell(p.Ast_90),
        escapeCell(p.xAG),
        escapeCell(p.xAG_90),
        escapeCell(p.PrgC),
        escapeCell(p.PrgC_90),
        escapeCell(p.PrgP),
        escapeCell(p.PrgP_90),
      ].join(','));

      const csvBlob = new Blob([[headers.join(','), ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pitchpulse_player_ledger_${activeSeason}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNote(`Exported ${formatNumber(rowsToExport.length)} rows`);
      setTimeout(() => setExportNote(''), 3000);
    } catch {
      setExportNote('Export failed');
      setTimeout(() => setExportNote(''), 3000);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleCopyShareLink = () => {
    const hash = serializeExplorerHash({
      season: activeSeason,
      comp: selectedComp,
      pos: selectedPos,
      squad: selectedSquad,
      min: minMinutes,
      age: ageRange,
      q: searchQuery,
      mode: effectiveMode,
      sort: sortBy,
      order: sortOrder,
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}${hash}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const columns = [
    { key: 'Player', label: 'Player & Club', tooltip: 'Player identity, club, and league competition' },
    { key: 'Pos', label: 'Pos', tooltip: 'Primary tactical position' },
    { key: 'Age', label: 'Age', tooltip: 'Age in years' },
    { key: 'MP', label: 'Apps', tooltip: 'Official league match appearances' },
    { key: 'Min', label: 'Mins', tooltip: 'Total minutes played in the campaign' },
    { key: isPer90 ? 'Gls_90' : 'Gls', label: isPer90 ? 'Gls/90' : 'Goals', tooltip: isPer90 ? 'Goals scored per 90 minutes' : 'Total goals scored' },
    { key: isPer90 ? 'xG_90' : 'xG', label: isPer90 ? 'xG/90' : 'xG', tooltip: isPer90 ? 'Expected goals per 90 minutes' : 'Cumulative expected goals' },
    { key: 'Gls_minus_xG', label: 'G - xG', tooltip: 'Goals minus expected goals: positive values denote clinical overperformance' },
    { key: isPer90 ? 'Ast_90' : 'Ast', label: isPer90 ? 'Ast/90' : 'Assists', tooltip: isPer90 ? 'Assists per 90 minutes' : 'Total assists directly leading to a goal' },
    { key: isPer90 ? 'xAG_90' : 'xAG', label: isPer90 ? 'xAG/90' : 'xAG', tooltip: isPer90 ? 'Expected assisted goals per 90 minutes' : 'Expected assisted goals: chance creation quality' },
    { key: isPer90 ? 'PrgC_90' : 'PrgC', label: isPer90 ? 'PrgC/90' : 'PrgC', tooltip: isPer90 ? 'Progressive carries per 90 minutes' : 'Progressive carries: ball carries advancing 10+ yards toward goal' },
    { key: isPer90 ? 'PrgP_90' : 'PrgP', label: isPer90 ? 'PrgP/90' : 'PrgP', tooltip: isPer90 ? 'Progressive passes per 90 minutes' : 'Progressive passes: completed passes advancing 10+ yards toward goal' },
    { key: 'actions', label: 'Actions', sortable: false, tooltip: 'Save to shortlist or add to comparison dossier' },
  ];

  const computePer90 = (p, rateKey, rawKey) => {
    const direct = p[rateKey];
    if (direct !== null && direct !== undefined && Number.isFinite(Number(direct))) return Number(direct);
    const raw = p[rawKey];
    const mins = Number(p.Min) || 0;
    if (raw === null || raw === undefined || !Number.isFinite(Number(raw)) || mins <= 0) return null;
    return (Number(raw) / mins) * 90;
  };

  const clubCountLabel = squadsList.length > 0 ? squadsList.length : 96;

  return (
    <div className="space-y-6 font-ser not-italic">
      {/* 1. Header & Title */}
      <div className="border-b-2 border-[var(--ink)] pb-3">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Player Registry &amp; Scouting Ledger
            </span>
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
              Player Explorer
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Totals / Per-90 Rate Toggle */}
            <div className="inline-flex items-center border border-[var(--ink)] p-0.5 bg-[var(--panel)]" role="group" aria-label="Stat display mode">
              <button
                type="button"
                onClick={() => handleModeSwitch('totals')}
                className={`px-2.5 py-0.5 text-xs font-mono transition-colors ${
                  !isPer90 ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                Totals
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('per90')}
                className={`px-2.5 py-0.5 text-xs font-mono transition-colors ${
                  isPer90 ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                Per 90
              </button>
            </div>

            <div className="text-xs italic text-[var(--mute)] tabular-nums">
              Showing {pagination?.total ? formatNumber(pagination.total) : formatNumber(players.length)} registered players
            </div>
          </div>
        </div>
        <p className="text-xs italic text-[var(--mute)] mt-1">
          Search, filter, and cross-reference registered player statistics in Vol. {activeSeason}.
        </p>

        {/* 2. Comprehensive Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 mt-4">
          {/* Player / Club search */}
          <div className="relative">
            <input
              type="text"
              aria-label="Filter players by name, club, or league"
              placeholder="Search player, club, or league..."
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-3 pr-8 text-xs text-[var(--ink)] placeholder:italic focus:outline-none focus:bg-[var(--panel)]"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--mute)] pointer-events-none" />
          </div>

          {/* Position Selector */}
          <div>
            <select
              aria-label="Filter by position"
              value={selectedPos}
              onChange={(e) => onPosChange && onPosChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              <option value="">All Positions</option>
              <option value="FW">Forwards (FW)</option>
              <option value="MF">Midfielders (MF)</option>
              <option value="DF">Defenders (DF)</option>
              <option value="GK">Goalkeepers (GK)</option>
            </select>
          </div>

          {/* Club Selector (Dynamic Count) */}
          <div>
            <select
              aria-label="Filter by club"
              value={selectedSquad}
              onChange={(e) => onSquadChange && onSquadChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              <option value="">All Clubs ({clubCountLabel})</option>
              {squadsList.map((sq) => {
                const name = typeof sq === 'string' ? sq : sq.name || sq.Squad || sq.Team;
                return <option key={name} value={name}>{name}</option>;
              })}
            </select>
          </div>

          {/* Age Range Selector */}
          <div>
            <select
              aria-label="Filter by age bracket"
              value={ageRange}
              onChange={(e) => onAgeRangeChange && onAgeRangeChange(e.target.value)}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              {Object.entries(AGE_RANGE_PRESETS).map(([key, preset]) => (
                <option key={key || 'all'} value={key}>{preset.label}</option>
              ))}
            </select>
          </div>

          {/* Minimum Minutes Selector */}
          <div>
            <select
              aria-label="Filter by minimum minutes"
              value={minMinutes || 0}
              onChange={(e) => onMinMinutesChange && onMinMinutesChange(Number(e.target.value))}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-2 text-xs text-[var(--ink)] focus:outline-none focus:bg-[var(--panel)]"
            >
              <option value="0">Min Minutes: 0m</option>
              <option value="270">Min Minutes: 270m (3 apps)</option>
              <option value="500">Min Minutes: 500m</option>
              <option value="900">Min Minutes: 900m (10 apps)</option>
              <option value="1500">Min Minutes: 1,500m (Regulars)</option>
            </select>
          </div>

          {/* Table Controls (Density, Share, Full CSV Export) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
              className="flex-1 border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1.5 text-xs italic text-[var(--ink)] text-center truncate"
              title="Toggle row density"
            >
              {density === 'comfortable' ? 'Compact' : 'Spacious'}
            </button>
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1.5 text-xs text-[var(--ink)] flex items-center justify-center gap-1"
              title="Copy shareable filtered ledger URL"
              aria-label="Copy shareable filter link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[var(--blue)]" /> : <Link2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={exportCSV}
              disabled={exportingCsv}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1.5 text-xs italic text-[var(--ink)] flex items-center justify-center gap-1 disabled:opacity-50"
              title="Export all matching filtered rows to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportingCsv ? '...' : 'CSV'}</span>
            </button>
          </div>
        </div>

        {/* Inline Export / Share Confirmation or Active Filter Chips */}
        {(activeFilters.length > 0 || exportNote || copiedLink) && (
          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilters.length > 0 && (
                <>
                  <span className="text-[var(--mute)] text-[11px] italic mr-1">Active filters:</span>
                  {activeFilters.map((f) => (
                    <span
                      key={f.key}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--panel)] border border-[var(--rule)] rounded-xs text-[11px] text-[var(--ink)]"
                    >
                      <span>{f.label}</span>
                      <button type="button" onClick={f.clear} aria-label={`Remove ${f.label} filter`} className="hover:text-[var(--red)]">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      if (onCompChange) onCompChange('');
                      if (onPosChange) onPosChange('');
                      if (onSquadChange) onSquadChange('');
                      if (onMinMinutesChange) onMinMinutesChange(0);
                      if (onAgeRangeChange) onAgeRangeChange('');
                      if (onSearchChange) onSearchChange('');
                    }}
                    className="text-[11px] underline text-[var(--mute)] hover:text-[var(--ink)] ml-1"
                  >
                    Clear all
                  </button>
                </>
              )}
            </div>
            {(exportNote || copiedLink) && (
              <span className="text-[11px] font-mono text-[var(--blue)] font-semibold">
                {copiedLink ? 'Shareable filter URL copied' : exportNote}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Data Table */}
      <div className="overflow-x-auto border-t border-[var(--ink)]">
        <table className="w-full min-w-[920px] border-collapse text-xs font-ser">
          <thead>
            <tr className="border-b border-[var(--ink)]">
              {columns.map((col, idx) => {
                const isSortActive = sortBy === col.key;
                const isFirst = idx === 0;
                const isActions = col.key === 'actions';
                const isNumeric = !isFirst && !isActions && col.key !== 'Pos';

                return (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && onSort && onSort(col.key)}
                    className={`py-2 px-2.5 font-semibold text-xs whitespace-nowrap select-none ${
                      isFirst ? 'text-left sticky left-0 bg-[var(--paper)] z-10' : isActions ? 'text-center' : isNumeric ? 'text-right' : 'text-left'
                    } ${col.sortable !== false ? 'cursor-pointer hover:text-[var(--blue)]' : ''} ${
                      isSortActive ? 'text-[var(--red)] underline decoration-2 underline-offset-4' : 'text-[var(--ink)]'
                    }`}
                  >
                    <MetricTooltip metricKey={col.label} title={col.tooltip}>
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {isSortActive && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
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
                <td colSpan={columns.length} className="text-center py-12 italic text-[var(--mute)]">
                  Consulting European player ledger archive...
                </td>
              </tr>
            ) : players.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 italic text-[var(--mute)]">
                  No players match these filters. Try lowering the minimum minutes or clearing the age/position filter.
                </td>
              </tr>
            ) : (
              players.map((p, idx) => {
                const paddingClass = density === 'compact' ? 'py-1 px-2' : 'py-2 px-2.5';
                const deltaObj = formatGoalsMinusXG(p.Gls_minus_xG);
                const isSelectedInCompare = compareList.some((c) => (c.id || c.Player) === (p.id || p.Player));
                const isSaved = isPlayerInShortlist(shortlist, p, activeSeason);

                const glsDisp = isPer90 ? formatDecimal(computePer90(p, 'Gls_90', 'Gls'), 2) : (p.Gls ?? 0);
                const xgDisp = isPer90 ? formatDecimal(computePer90(p, 'xG_90', 'xG'), 2) : formatDecimal(p.xG, 1);
                const astDisp = isPer90 ? formatDecimal(computePer90(p, 'Ast_90', 'Ast'), 2) : (p.Ast ?? 0);
                const xagDisp = isPer90 ? formatDecimal(computePer90(p, 'xAG_90', 'xAG'), 2) : formatDecimal(p.xAG, 1);
                const prgcVal = isPer90 ? computePer90(p, 'PrgC_90', 'PrgC') : p.PrgC;
                const prgpVal = isPer90 ? computePer90(p, 'PrgP_90', 'PrgP') : p.PrgP;

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
                        {p.Squad || p.Team} • {p.Comp?.replace(/^[a-z]{2,3}\s+/, '')}
                      </span>
                    </td>

                    {/* 2. Position */}
                    <td className={`${paddingClass} dotted-rule text-left font-mono text-[11px]`}>
                      {p.Pos}
                    </td>

                    {/* 3. Age */}
                    <td className={`${paddingClass} dotted-rule text-right tabular-nums`}>
                      {p.Age || '—'}
                    </td>

                    {/* 4. Appearances */}
                    <td className={`${paddingClass} dotted-rule text-right tabular-nums`}>
                      {p.MP || 0}
                    </td>

                    {/* 5. Minutes */}
                    <td className={`${paddingClass} dotted-rule text-right font-mono tabular-nums`}>
                      {p.Min ? formatMinutes(p.Min) : '—'}
                    </td>

                    {/* 6. Goals / Gls_90 */}
                    <td className={`${paddingClass} dotted-rule text-right font-bold text-[var(--ink)] tabular-nums`}>
                      {glsDisp}
                    </td>

                    {/* 7. xG / xG_90 */}
                    <td className={`${paddingClass} dotted-rule text-right text-[var(--mute)] tabular-nums`}>
                      {xgDisp}
                    </td>

                    {/* 8. G - xG */}
                    <td className={`text-right ${paddingClass} dotted-rule font-bold font-mono tabular-nums ${
                      deltaObj.isOver ? 'text-[var(--blue)]' : deltaObj.isUnder ? 'text-[var(--red)]' : 'text-[var(--mute)]'
                    }`}>
                      {deltaObj.glyph} {deltaObj.text}
                    </td>

                    {/* 9. Assists / Ast_90 */}
                    <td className={`${paddingClass} dotted-rule text-right font-semibold tabular-nums`}>
                      {astDisp}
                    </td>

                    {/* 10. xAG / xAG_90 */}
                    <td className={`${paddingClass} dotted-rule text-right text-[var(--mute)] tabular-nums`}>
                      {xagDisp}
                    </td>

                    {/* 11. PrgC / PrgC_90 */}
                    <td className={`${paddingClass} dotted-rule text-right font-mono tabular-nums ${prgcVal === null || prgcVal === undefined ? 'text-[var(--mute)]' : ''}`}>
                      {prgcVal !== null && prgcVal !== undefined ? (isPer90 ? formatDecimal(prgcVal, 2) : prgcVal) : '—'}
                    </td>

                    {/* 12. PrgP / PrgP_90 */}
                    <td className={`${paddingClass} dotted-rule text-right font-mono tabular-nums ${prgpVal === null || prgpVal === undefined ? 'text-[var(--mute)]' : ''}`}>
                      {prgpVal !== null && prgpVal !== undefined ? (isPer90 ? formatDecimal(prgpVal, 2) : prgpVal) : '—'}
                    </td>

                    {/* 13. Shortlist + Compare Actions */}
                    <td className={`${paddingClass} dotted-rule text-center whitespace-nowrap`}>
                      <div className="inline-flex items-center gap-1">
                        {onToggleShortlist && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleShortlist(p);
                            }}
                            aria-label={isSaved ? `Remove ${p.Player} from shortlist` : `Save ${p.Player} to shortlist`}
                            title={isSaved ? 'Saved in Shortlist' : 'Save to Shortlist'}
                            className={`p-1 border transition-colors ${
                              isSaved
                                ? 'border-[var(--blue)] text-[var(--blue)] bg-[var(--panel)]'
                                : 'border-[var(--rule)] text-[var(--mute)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                            }`}
                          >
                            <Bookmark className="w-3 h-3" fill={isSaved ? 'currentColor' : 'none'} />
                          </button>
                        )}
                        <button
                          type="button"
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
                          {isSelectedInCompare ? '✓ Compare' : '+ Compare'}
                        </button>
                      </div>
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
          <div className="tabular-nums">
            Showing page {pagination.page} of {pagination.total_pages} ({formatNumber(pagination.total)} players registered)
          </div>
          <div className="flex items-center gap-2 not-italic">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2 py-1 rounded-xs disabled:opacity-30 disabled:pointer-events-none"
            >
              &larr; Previous
            </button>
            <span className="font-serif italic px-2 tabular-nums">
              Folio {pagination.page}
            </span>
            <button
              type="button"
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
            {compareList.map((p) => (
              <span key={p.id || p.Player} className="text-xs font-semibold px-2 py-0.5 bg-[var(--panel)] border border-[var(--rule)] rounded-xs whitespace-nowrap">
                {p.Player.split(' ').pop()}
              </span>
            ))}
          </div>

          <button
            type="button"
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
