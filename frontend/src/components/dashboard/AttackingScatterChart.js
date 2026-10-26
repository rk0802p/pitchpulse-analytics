import React, { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

export const AttackingScatterChart = ({
  data = [],
  onPlayerClick
}) => {
  const [hoveredPlayer, setHoveredPlayer] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 text-center text-slate-400">
        No attacking data available.
      </div>
    );
  }

  // Determine axes scale
  const maxX = Math.max(...data.map(p => p.xAG || 0), 10);
  const maxY = Math.max(...data.map(p => p.xG || 0), 15);

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3 pb-3 border-b border-pitch-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Attacking Output Matrix (xG vs xAG)
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Shooting threat (Y-axis) vs Chance creation quality (X-axis) across Europe
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-pitch-surface px-2.5 py-1 rounded-md border border-pitch-border">
          Top 25 Outliers
        </div>
      </div>

      {/* Scatter Coordinate Area */}
      <div className="relative w-full h-72 bg-pitch-surface/80 rounded-xl border border-pitch-border/80 p-4 my-2 overflow-hidden select-none">
        {/* Quadrant lines */}
        <div className="absolute left-1/2 inset-y-0 border-l border-slate-700/40 border-dashed" />
        <div className="absolute top-1/2 inset-x-0 border-t border-slate-700/40 border-dashed" />

        {/* Quadrant Labels */}
        <span className="absolute top-2 right-3 text-[10px] font-mono font-semibold uppercase text-emerald-400/70 tracking-wider">
          Complete Attackers (xG + xAG)
        </span>
        <span className="absolute top-2 left-3 text-[10px] font-mono font-semibold uppercase text-rose-400/70 tracking-wider">
          Pure Poachers (High xG)
        </span>
        <span className="absolute bottom-6 right-3 text-[10px] font-mono font-semibold uppercase text-blue-400/70 tracking-wider">
          Elite Creators (High xAG)
        </span>

        {/* Plot points */}
        <div className="relative w-full h-full">
          {data.map((player) => {
            const xPercent = Math.min(92, Math.max(6, (player.xAG / maxX) * 100));
            const yPercent = Math.min(88, Math.max(8, 100 - (player.xG / maxY) * 100));
            const isHovered = hoveredPlayer?.id === player.id;

            return (
              <div
                key={player.id}
                style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 group"
                onMouseEnter={() => setHoveredPlayer(player)}
                onMouseLeave={() => setHoveredPlayer(null)}
                onClick={() => onPlayerClick && onPlayerClick(player.id)}
              >
                {/* Node point */}
                <div
                  className={`
                    w-4 h-4 rounded-full border-2 transition-all duration-150 flex items-center justify-center shadow-md
                    ${isHovered 
                      ? 'scale-150 bg-emerald-400 border-white ring-4 ring-emerald-500/30 z-20' 
                      : 'bg-pitch-card border-emerald-400/80 hover:border-white'}
                  `}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                {/* Always show short name for prominent outliers */}
                {(player.xG > 12 || player.xAG > 6 || isHovered) && (
                  <span className={`
                    absolute left-1/2 -top-5 -translate-x-1/2 text-[10px] font-mono font-bold whitespace-nowrap px-1 py-0.2 rounded transition-all
                    ${isHovered ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-300 bg-pitch-dark/80 border border-slate-700/60'}
                  `}>
                    {player.Player.split(' ').pop()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover Card / Detail bar */}
      <div className="p-2.5 rounded-lg bg-pitch-surface border border-pitch-border flex items-center justify-between min-h-[46px] text-xs">
        {hoveredPlayer ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{hoveredPlayer.Player}</span>
              <span className="text-slate-400 font-mono">({hoveredPlayer.Squad})</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-400 font-bold">{hoveredPlayer.Gls} Goals</span>
              <span className="text-slate-400">({hoveredPlayer.xG} xG)</span>
              <span className="text-blue-400 font-bold">{hoveredPlayer.Ast} Assists</span>
              <span className="text-slate-400">({hoveredPlayer.xAG} xAG)</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Info className="w-4 h-4 text-slate-500" />
            <span>Hover over any player node to inspect xG and xAG chance creation metrics. Click to view profile.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttackingScatterChart;
