import React, { useState } from 'react';
import { 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  SlidersHorizontal,
  Info 
} from 'lucide-react';
import { formatMetricValue } from '../../utils/metricFormatters';

export const DataTable = ({
  columns = [],
  data = [],
  onRowClick,
  title = "Statistical Ledger",
  subtitle,
  tableId = "tbl-1",
  sortBy,
  sortOrder = 'desc',
  onSort,
  pagination,
  onPageChange,
  loading = false,
  emptyMessage = "No match records found."
}) => {
  const [density, setDensity] = useState('comfortable'); // 'comfortable' or 'compact'
  const [hiddenCols, setHiddenCols] = useState([]);
  const [showColPicker, setShowColPicker] = useState(false);

  const toggleColumn = (key) => {
    setHiddenCols(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const visibleColumns = columns.filter(c => !hiddenCols.includes(c.key));

  const exportCSV = () => {
    if (!data || data.length === 0) return;
    const headers = visibleColumns.map(c => `"${c.label}"`).join(",");
    const rows = data.map(row => 
      visibleColumns.map(c => {
        const val = row[c.key];
        return `"${val !== undefined && val !== null ? val : ''}"`;
      }).join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title.toLowerCase().replace(/\s+/g, '_')}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="my-6">
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-t-2 border-[var(--ink)] pt-3 pb-2">
        <div>
          <h3 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs italic text-[var(--mute)] mt-0.5 max-w-xl">
              {subtitle}
            </p>
          )}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
          <button
            onClick={() => setDensity(d => d === 'comfortable' ? 'compact' : 'comfortable')}
            className="border border-[var(--rule)] hover:border-[var(--ink)] bg-transparent px-2.5 py-1 rounded-sm text-[var(--ink)] italic"
            title="Toggle Row Spacing"
          >
            {density === 'comfortable' ? 'Compact' : 'Comfortable'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className="border border-[var(--rule)] hover:border-[var(--ink)] bg-transparent px-2.5 py-1 rounded-sm text-[var(--ink)] italic flex items-center gap-1"
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Columns</span>
            </button>

            {showColPicker && (
              <div className="absolute right-0 mt-1 w-48 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-lg p-2 z-50 text-xs">
                <div className="font-disp font-bold uppercase text-[var(--mute)] pb-1 mb-1 border-b border-[var(--rule)]">
                  Toggle Columns
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {columns.map(c => (
                    <label key={c.key} className="flex items-center gap-2 cursor-pointer py-0.5 hover:bg-[var(--panel)] px-1">
                      <input
                        type="checkbox"
                        checked={!hiddenCols.includes(c.key)}
                        onChange={() => toggleColumn(c.key)}
                        className="rounded accent-[var(--blue)]"
                      />
                      <span className="truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={exportCSV}
            className="border border-[var(--rule)] hover:border-[var(--ink)] bg-transparent px-2.5 py-1 rounded-sm text-[var(--ink)] italic flex items-center gap-1"
            title="Export CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto border-t border-[var(--ink)]">
        <table className="w-full min-w-[700px] border-collapse font-ser text-sm">
          <thead>
            <tr className="border-b border-[var(--ink)]">
              {visibleColumns.map((col, idx) => {
                const isSortActive = sortBy === col.key;
                const isNumeric = col.isNumeric !== false && typeof data[0]?.[col.key] === 'number';
                return (
                  <th
                    key={col.key || idx}
                    onClick={() => col.sortable !== false && onSort && onSort(col.key)}
                    title={col.tooltip || col.title || col.label}
                    className={`py-2 px-2.5 font-semibold text-xs whitespace-nowrap select-none ${
                      idx === 0 ? 'text-left sticky left-0 bg-[var(--paper)]' : isNumeric ? 'text-right' : 'text-left'
                    } ${col.sortable !== false ? 'cursor-pointer hover:text-[var(--blue)]' : ''} ${
                      isSortActive ? 'text-[var(--red)] underline decoration-2 underline-offset-4' : 'text-[var(--ink)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {isSortActive && (
                        <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-12 italic text-[var(--mute)]">
                  Consulting ledger archive...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length} className="text-center py-12 italic text-[var(--mute)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => {
                const paddingClass = density === 'compact' ? 'py-1 px-2 text-xs' : 'py-2 px-2.5 text-sm';
                return (
                  <tr 
                    key={row.id || row.Player || rIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className="hover:bg-[var(--panel)] transition-colors cursor-pointer group"
                  >
                    {visibleColumns.map((col, cIdx) => {
                      const val = row[col.key];
                      const isFirst = cIdx === 0;
                      const isNumeric = col.isNumeric !== false && typeof val === 'number';

                      return (
                        <td
                          key={col.key || cIdx}
                          className={`${paddingClass} dotted-rule whitespace-nowrap ${
                            isFirst ? 'text-left sticky left-0 bg-[var(--paper)] group-hover:bg-[var(--panel)] font-semibold' : isNumeric ? 'text-right' : 'text-left'
                          }`}
                        >
                          {col.render ? (
                            col.render(val, row)
                          ) : (
                            val !== undefined && val !== null ? String(val) : '—'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--ink)] pt-3 text-xs italic text-[var(--mute)]">
          <div>
            Showing page {pagination.page} of {pagination.total_pages} ({pagination.total} records recorded)
          </div>
          <div className="flex items-center gap-2 not-italic">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              className="border border-[var(--rule)] hover:border-[var(--ink)] p-1 rounded-sm disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-serif italic px-2">
              Folio {pagination.page}
            </span>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              className="border border-[var(--rule)] hover:border-[var(--ink)] p-1 rounded-sm disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
