import React, { useState } from 'react';
import { Target, Zap, Clock, ShieldAlert, Award, Download, Check } from 'lucide-react';

export const ComparisonMatrix = ({
  comparisonData,
  onPlayerClick
}) => {
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'per90' | 'total'
  const [copied, setCopied] = useState(false);

  if (!comparisonData || !comparisonData.metrics || !comparisonData.players) {
    return null;
  }

  const { players, metrics } = comparisonData;

  // Group metrics by category
  const categories = [
    { id: 'rate', label: 'Standardized Rates (Per 90 Minutes)', icon: Award },
    { id: 'expected', label: 'Expected Threat & Creation (xG / xAG)', icon: Zap },
    { id: 'differential', label: 'Finishing & Efficiency Differentials', icon: Target },
    { id: 'progression', label: 'Ball Progression (Carries & Passes)', icon: Zap },
    { id: 'total', label: 'Season Volume & Playing Time', icon: Clock },
    { id: 'discipline', label: 'Disciplinary Record', icon: ShieldAlert }
  ];

  // Filter categories based on view mode
  const displayedCategories = categories.filter(cat => {
    if (filterMode === 'per90') {
      return cat.id === 'rate';
    }
    if (filterMode === 'total') {
      return cat.id === 'total' || cat.id === 'discipline';
    }
    return true;
  });

  const handleExportCSV = () => {
    // Build CSV matching FBref Stathead export style
    const headerCols = ['Player', 'Season', 'Squad', 'Pos', 'Nation'];
    const metricCols = metrics.map(m => m.label);
    const csvHeader = [...headerCols, ...metricCols].map(c => `"${c}"`).join(',');

    const csvRows = players.map(p => {
      const pKey = p.comparison_key || String(p.id);
      const pIdStr = String(p.id);
      const rowInfo = [
        `"${p.Player || ''}"`,
        `"${p.season || ''}"`,
        `"${p.Squad || ''}"`,
        `"${p.Pos || ''}"`,
        `"${p.Nation || ''}"`
      ];
      const metricValues = metrics.map(m => {
        if (m.untracked && (m.untracked.includes(pKey) || m.untracked.includes(pIdStr))) {
          return '"Untracked"';
        }
        const val = m.values?.[pKey] ?? m.values?.[pIdStr] ?? 0;
        return typeof val === 'number' ? val : `"${val}"`;
      });
      return [...rowInfo, ...metricValues].join(',');
    });

    const fullCsv = [csvHeader, ...csvRows].join('\n');
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullCsv).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(err => {
        console.error("Failed to copy CSV:", err);
      });
    }
  };

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-pitch-surface border-b border-pitch-border flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm text-white">Statistical Benchmark Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Green highlights indicate category leaders across selected players
          </p>
        </div>

        {/* View Mode Controls (FBref Stathead style) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-slate-900/90 p-0.5 border border-pitch-border text-xs font-mono">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setFilterMode('per90')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'per90'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Toggle Per90 Stats
            </button>
            <button
              onClick={() => setFilterMode('total')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === 'total'
                  ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Totals / Volume
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono border border-pitch-border transition-colors shadow-sm"
            title="Export comparison data as CSV"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied CSV</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Export Data (CSV)</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-pitch-surface/60 text-xs font-mono uppercase text-slate-400 border-b border-pitch-border">
            <tr>
              <th className="py-3 px-4 min-w-[200px]">Metric</th>
              {players.map((p) => (
                <th
                  key={p.comparison_key || p.id}
                  onClick={() => onPlayerClick && onPlayerClick(p.id)}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors min-w-[120px]"
                >
                  <span className="block font-bold text-slate-200">{p.Player}</span>
                  <span className="text-[10px] text-slate-500 font-mono normal-case block truncate">
                    {p.Squad} {p.season ? `(${p.season})` : ''}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pitch-border/60">
            {displayedCategories.map((cat) => {
              const catMetrics = metrics.filter(m => m.category === cat.id);
              if (catMetrics.length === 0) return null;

              const Icon = cat.icon;

              return (
                <React.Fragment key={cat.id}>
                  {/* Category Section Header Row */}
                  <tr className="bg-slate-900/70 border-t-2 border-pitch-border">
                    <td
                      colSpan={players.length + 1}
                      className="py-2 px-4 text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        <span>{cat.label}</span>
                      </div>
                    </td>
                  </tr>

                  {/* Metric Rows */}
                  {catMetrics.map((row) => (
                    <tr key={row.key} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-medium text-slate-300 text-xs flex items-center justify-between">
                        <span>{row.label}</span>
                      </td>

                      {players.map((p) => {
                        const pKey = p.comparison_key || String(p.id);
                        const pIdStr = String(p.id);
                        const isUntracked = row.untracked && (row.untracked.includes(pKey) || row.untracked.includes(pIdStr));
                        const val = row.values?.[pKey] ?? row.values?.[pIdStr];
                        const isLeader = !isUntracked && row.leaders && (row.leaders.includes(pKey) || row.leaders.includes(pIdStr)) && players.length > 1;

                        return (
                          <td
                            key={p.comparison_key || p.id}
                            className={`py-2.5 px-4 text-right font-mono text-xs transition-colors ${
                              isLeader
                                ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                                : 'text-slate-200'
                            }`}
                          >
                            <span className="inline-flex items-center justify-end gap-1">
                              {isUntracked ? (
                                <span
                                  className="text-slate-500 underline decoration-dotted cursor-help"
                                  title="Statistic untracked in this historical era"
                                >
                                  Untracked*
                                </span>
                              ) : (
                                val !== undefined && val !== null ? val : '—'
                              )}
                              {isLeader && (
                                <span
                                  className="text-[10px] text-emerald-400"
                                  title="Metric Leader"
                                >
                                  ★
                                </span>
                              )}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FBref Stathead Style Coverage Disclaimer & Legend */}
      <div className="p-3 bg-pitch-surface/40 border-t border-pitch-border/60 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          <span>
            Totals reflect top 5 European domestic league play. An underline (*) indicates the data was untracked in that era (e.g. spatial progression prior to 2017).
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
          <Award className="w-3 h-3" />
          <span>★ Category Leader</span>
        </div>
      </div>
    </div>
  );
};

export default ComparisonMatrix;
