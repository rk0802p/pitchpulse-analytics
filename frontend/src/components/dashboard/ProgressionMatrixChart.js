import React from 'react';
import { Zap } from 'lucide-react';

export const ProgressionMatrixChart = ({
  progressionLeaders = [],
  onPlayerClick,
  season = ""
}) => {
  const maxTotal = Math.max(...progressionLeaders.map(p => (p.PrgC || 0) + (p.PrgP || 0)), 100);

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-pitch-border">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Ball Progression Leaders (Carries vs Passes)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Players who consistently advance play &gt;10 yards towards the opponent goal
          </p>
        </div>

        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
          Progression
        </span>
      </div>

      {/* List */}
      <div className="space-y-3 my-1">
        {progressionLeaders.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            Progressive action metrics (PrgC &amp; PrgP) were untracked during this era.
          </div>
        ) : (
          progressionLeaders.map((player) => {
            const carry = player.PrgC || 0;
            const pass = player.PrgP || 0;
            const carryPct = Math.min(100, Math.round((carry / maxTotal) * 100));
            const passPct = Math.min(100 - carryPct, Math.round((pass / maxTotal) * 100));

            return (
              <div
                key={player.id}
                onClick={() => onPlayerClick && onPlayerClick(player.id)}
                className="p-2.5 rounded-lg bg-pitch-surface/60 hover:bg-slate-800/60 border border-pitch-border/50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-white group-hover:text-purple-400 transition-colors flex items-center gap-1">
                    {player.Player}
                    <span className="text-slate-500 text-[10px]">({player.Squad})</span>
                  </span>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="text-purple-400 font-bold">{carry} Carries</span>
                    <span className="text-blue-400 font-bold">{pass} Passes</span>
                  </div>
                </div>

                {/* Dual Stacked Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex gap-0.5">
                  <div
                    className="h-full bg-purple-500 rounded-l-full transition-all duration-500"
                    style={{ width: `${carryPct}%` }}
                    title={`${carry} Progressive Carries`}
                  />
                  <div
                    className="h-full bg-blue-500 rounded-r-full transition-all duration-500"
                    style={{ width: `${passPct}%` }}
                    title={`${pass} Progressive Passes`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-pitch-border/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Progressive Carries (PrgC)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Progressive Passes (PrgP)
          </span>
        </div>
        <span className="text-slate-500">{season ? `${season} Regular Season` : "Regular Season"}</span>
      </div>
    </div>
  );
};

export default ProgressionMatrixChart;
