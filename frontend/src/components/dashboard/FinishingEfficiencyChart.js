import React, { useState } from 'react';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

export const FinishingEfficiencyChart = ({
  overperformers = [],
  underperformers = [],
  onPlayerClick
}) => {
  const [viewMode, setViewMode] = useState('over'); // 'over' | 'under'
  const activeList = viewMode === 'over' ? overperformers : underperformers;

  const maxVal = Math.max(
    ...activeList.flatMap(p => [p.Gls || 0, p.xG || 0, 1]),
    20
  );

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      {/* Header & Controls */}
      <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-pitch-border">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Finishing Efficiency vs Expected Goals (xG)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Compares actual goals scored with mathematical shot quality estimates (Min 500 mins)
          </p>
        </div>

        <div className="flex items-center p-0.5 rounded-lg bg-pitch-surface border border-pitch-border flex-shrink-0">
          <button
            onClick={() => setViewMode('over')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'over'
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Overperformers
          </button>
          <button
            onClick={() => setViewMode('under')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'under'
                ? 'bg-rose-500/20 text-rose-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingDown className="w-3 h-3 text-rose-400" />
            Underperformers
          </button>
        </div>
      </div>

      {/* Visual Bars List */}
      <div className="space-y-3.5 my-2">
        {activeList.map((player) => {
          const glsPct = Math.min(100, Math.round((player.Gls / maxVal) * 100));
          const xgPct = Math.min(100, Math.round((player.xG / maxVal) * 100));
          const delta = player.Gls_minus_xG;
          const isOver = delta > 0;

          return (
            <div
              key={player.id}
              onClick={() => onPlayerClick && onPlayerClick(player.id)}
              className="p-2.5 rounded-lg bg-pitch-surface/60 hover:bg-slate-800/60 border border-pitch-border/50 cursor-pointer transition-colors group"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                    {player.Player}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {player.Squad} · <span className="text-slate-500">{player.Pos}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-200 font-bold">{player.Gls} Gls</span>
                  <span className="text-slate-400">({player.xG} xG)</span>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                      isOver
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {isOver ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Stacked comparison bar */}
              <div className="space-y-1">
                {/* Actual Goals bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden flex">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOver ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${glsPct}%` }}
                    title={`Goals: ${player.Gls}`}
                  />
                </div>
                {/* Expected Goals bar */}
                <div className="w-full bg-slate-800/50 rounded-full h-1 overflow-hidden flex">
                  <div
                    className="h-full rounded-full bg-cyan-400/80 transition-all duration-500"
                    style={{ width: `${xgPct}%` }}
                    title={`Expected Goals: ${player.xG}`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend & Footnote */}
      <div className="pt-3 border-t border-pitch-border/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Goals Scored
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-1.5 rounded bg-cyan-400" /> Expected (xG)
          </span>
        </div>
        <span className="text-slate-500">Min 500 mins</span>
      </div>
    </div>
  );
};

export default FinishingEfficiencyChart;
