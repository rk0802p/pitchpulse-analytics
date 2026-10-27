import React from 'react';
import { Zap } from 'lucide-react';

export const ProgressionMatrixChart = ({
  progressionLeaders = [],
  onPlayerClick,
  season = ""
}) => {
  const maxCarries = Math.max(...progressionLeaders.map(p => p.PrgC || 0), 100);

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
        {progressionLeaders.map((player) => {
          const carryPct = Math.min(100, Math.round((player.PrgC / maxCarries) * 100));

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
                  <span className="text-purple-400 font-bold">{player.PrgC} Carries</span>
                  <span className="text-blue-400 font-bold">{player.PrgP} Passes</span>
                </div>
              </div>

              {/* Dual Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${carryPct}%` }}
                />
              </div>
            </div>
          );
        })}
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
