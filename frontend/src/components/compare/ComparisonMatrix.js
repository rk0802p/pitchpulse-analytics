import React from 'react';
import { Target, Zap, Clock, ShieldAlert, Award } from 'lucide-react';


export const ComparisonMatrix = ({
  comparisonData,
  onPlayerClick
}) => {
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

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 bg-pitch-surface border-b border-pitch-border flex items-center justify-between">
        <div>
          <h3 className="font-bold text-sm text-white">Statistical Benchmark Matrix</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Green highlights indicate category leaders across selected players
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
          <Award className="w-3.5 h-3.5" />
          <span>★ Category Leader</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-pitch-surface/60 text-xs font-mono uppercase text-slate-400 border-b border-pitch-border">
            <tr>
              <th className="py-3 px-4 min-w-[200px]">Metric</th>
              {players.map((p) => (
                <th
                  key={p.id}
                  onClick={() => onPlayerClick && onPlayerClick(p.id)}
                  className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors min-w-[120px]"
                >
                  <span className="block font-bold text-slate-200">{p.Player}</span>
                  <span className="text-[10px] text-slate-500 font-mono normal-case block truncate">
                    {p.Squad}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-pitch-border/60">
            {categories.map((cat) => {
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
                        const pIdStr = String(p.id);
                        const val = row.values?.[pIdStr];
                        const isLeader = row.leaders && row.leaders.includes(pIdStr) && players.length > 1;

                        return (
                          <td
                            key={p.id}
                            className={`py-2.5 px-4 text-right font-mono text-xs transition-colors ${
                              isLeader
                                ? 'bg-emerald-500/10 text-emerald-400 font-bold'
                                : 'text-slate-200'
                            }`}
                          >
                            <span className="inline-flex items-center justify-end gap-1">
                              {val !== undefined && val !== null ? val : '—'}
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
    </div>
  );
};

export default ComparisonMatrix;
