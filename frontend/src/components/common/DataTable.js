import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, Plus } from 'lucide-react';

export const DataTable = ({
  columns = [],
  data = [],
  sortBy = "Gls",
  order = "desc",
  onSort,
  onRowClick,
  onAddToCompare,
  compareList = [],
  pagination = null,
  onPageChange
}) => {
  const getSortIcon = (columnKey) => {
    if (sortBy !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />;
    }
    return order === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
    );
  };

  const getPositionBadge = (pos) => {
    if (!pos) return null;
    let colorClass = "bg-slate-700/60 text-slate-300 border-slate-600";
    if (pos.includes("FW")) colorClass = "bg-rose-500/15 text-rose-400 border-rose-500/30";
    else if (pos.includes("MF")) colorClass = "bg-blue-500/15 text-blue-400 border-blue-500/30";
    else if (pos.includes("DF")) colorClass = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    else if (pos.includes("GK")) colorClass = "bg-amber-500/15 text-amber-400 border-amber-500/30";

    return (
      <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${colorClass}`}>
        {pos}
      </span>
    );
  };

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-pitch-surface/90 border-b border-pitch-border text-xs uppercase text-slate-400 font-mono tracking-wider">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3.5 px-4 font-semibold ${col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none group' : ''}`}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                    <span>{col.label}</span>
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
              {onAddToCompare && (
                <th className="py-3.5 px-4 text-center font-semibold w-16">
                  Compare
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-pitch-border/60">
            {data.map((row, idx) => {
              const isCompared = compareList.some((p) => {
                const matchId = (p.id || p.Rk) === (row.id || row.Rk);
                if (!matchId) return false;
                if (p.season && row.season) {
                  return p.season === row.season;
                }
                return true;
              });
              return (
                <tr
                  key={row.id || row.Rk || idx}
                  className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => {
                    let cellContent = row[col.key];

                    if (col.key === 'Pos') {
                      cellContent = getPositionBadge(row.Pos);
                    } else if (col.key === 'Player') {
                      cellContent = (
                        <div>
                          <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {row.Player}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-500 transition-opacity" />
                          </div>
                          <div className="text-xs text-slate-400">
                            {row.Squad} · <span className="text-slate-500">{row.Comp?.replace(/^[a-z]{2,3}\s/, '') || row.league}</span>
                          </div>
                        </div>
                      );
                    } else if (col.key === 'Gls_minus_xG') {
                      const delta = row.Gls_minus_xG !== undefined ? row.Gls_minus_xG : (row.Gls - row.xG);
                      const isPositive = delta > 0;
                      cellContent = (
                        <span className={`font-mono font-medium ${isPositive ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                          {isPositive ? `+${delta.toFixed(2)}` : delta?.toFixed(2)}
                        </span>
                      );
                    } else if (typeof cellContent === 'number') {
                      cellContent = <span className="font-mono">{cellContent}</span>;
                    }

                    return (
                      <td
                        key={col.key}
                        className={`py-3.5 px-4 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        {cellContent !== undefined && cellContent !== null ? cellContent : '—'}
                      </td>
                    );
                  })}

                  {onAddToCompare && (
                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCompare(row);
                      }}
                    >
                      <button
                        className={`p-1.5 rounded-md border text-xs transition-colors ${
                          isCompared
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-pitch-surface hover:bg-slate-700 text-slate-400 hover:text-white border-pitch-border'
                        }`}
                        title={isCompared ? 'Selected for comparison' : 'Add to comparison'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && (
        <div className="px-5 py-3.5 bg-pitch-surface/70 border-t border-pitch-border flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-400 font-mono">
            Showing Page <span className="text-white font-semibold">{pagination.page}</span> of{" "}
            <span className="text-white font-semibold">{pagination.total_pages}</span> (
            <span className="text-emerald-400">{pagination.total}</span> players)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.has_prev}
              className="px-3 py-1.5 rounded-lg border border-pitch-border text-xs font-medium bg-pitch-card hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-300 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.has_next}
              className="px-3 py-1.5 rounded-lg border border-pitch-border text-xs font-medium bg-pitch-card hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-slate-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
