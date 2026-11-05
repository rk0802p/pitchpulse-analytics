import { formatMetricValue } from '../utils/metricFormatters';
import React from 'react';
import './PlayerCard.css';
import { Sparkles } from 'lucide-react';

const getRoleBadge = (position) => {
  if (!position) return { label: 'POS', border: 'border-slate-600', text: 'text-slate-400' };
  if (position.includes('FW')) return { label: position, border: 'border-rose-500/40', text: 'text-rose-400', bg: 'bg-rose-500/10' };
  if (position.includes('MF')) return { label: position, border: 'border-blue-500/40', text: 'text-blue-400', bg: 'bg-blue-500/10' };
  if (position.includes('DF')) return { label: position, border: 'border-emerald-500/40', text: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  if (position.includes('GK')) return { label: position, border: 'border-amber-500/40', text: 'text-amber-400', bg: 'bg-amber-500/10' };
  return { label: position, border: 'border-slate-600', text: 'text-slate-400', bg: 'bg-slate-800' };
};

export const PlayerCard = ({ player, onSelectProfile, onCompare }) => {
  const role = getRoleBadge(player.Pos);

  const getInitials = (name) => {
    if (!name) return 'PL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="player-card-container">
      <div className={`player-card border-2 ${role.border} bg-pitch-card rounded-xl overflow-hidden shadow-md`}>
        {/* Card Front */}
        <div className="card-front p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${role.border} ${role.text} ${role.bg}`}>
                {role.label}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {player.Nation?.replace(/^[a-z]{2,3}\s/, '') || 'INT'}
              </span>
            </div>

            {/* Avatar Placeholder */}
            <div className="w-20 h-20 rounded-full bg-pitch-surface border border-slate-700/80 mx-auto flex items-center justify-center text-slate-300 font-bold text-xl shadow-inner my-2">
              {getInitials(player.Player)}
            </div>

            <h3 className="player-name text-center font-bold text-lg text-white truncate mt-2" title={player.Player}>
              {player.Player}
            </h3>
            <p className="text-xs text-center text-slate-400 truncate">
              {player.Squad}
            </p>
          </div>

          <div className="pt-3 border-t border-pitch-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-pitch-surface/60 p-2 rounded-lg border border-pitch-border/50">
                <p className="font-bold text-lg text-white font-mono">{player.Gls}</p>
                <p className="text-[10px] uppercase font-mono text-slate-400">Goals</p>
              </div>
              <div className="bg-pitch-surface/60 p-2 rounded-lg border border-pitch-border/50">
                <p className="font-bold text-lg text-white font-mono">{player.Ast}</p>
                <p className="text-[10px] uppercase font-mono text-slate-400">Assists</p>
              </div>
              <div className="bg-pitch-surface/60 p-2 rounded-lg border border-pitch-border/50">
                <p className="font-bold text-lg text-white font-mono">{player.MP}</p>
                <p className="text-[10px] uppercase font-mono text-slate-400">Apps</p>
              </div>
            </div>
            <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
              Hover to view xG & Progression
            </p>
          </div>
        </div>

        {/* Card Back */}
        <div className="card-back p-4 flex flex-col justify-between text-slate-200 bg-pitch-surface">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-pitch-border">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Advanced Profile
              </h4>
              <span className="text-xs font-mono text-slate-400">{player.Min} mins</span>
            </div>

            <div className="space-y-2 mt-3 text-xs">
              <div className="flex justify-between py-1 border-b border-pitch-border/40">
                <span className="text-slate-400">Expected Goals (xG)</span>
                <span className="font-mono text-white font-semibold">{formatMetricValue(player.xG)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-pitch-border/40">
                <span className="text-slate-400">Expected Assists (xAG)</span>
                <span className="font-mono text-white font-semibold">{formatMetricValue(player.xAG)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-pitch-border/40">
                <span className="text-slate-400">Prog. Carries (PrgC)</span>
                <span className="font-mono text-purple-400 font-semibold">{formatMetricValue(player.PrgC)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-pitch-border/40">
                <span className="text-slate-400">Prog. Passes (PrgP)</span>
                <span className="font-mono text-blue-400 font-semibold">{formatMetricValue(player.PrgP)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-pitch-border/40">
                <span className="text-slate-400">Prog. Receptions (PrgR)</span>
                <span className="font-mono text-emerald-400 font-semibold">{formatMetricValue(player.PrgR)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Yellow / Red Cards</span>
                <span className="font-mono text-amber-400 font-semibold">{player.CrdY} / {player.CrdR}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-pitch-border space-y-1.5">
            {onSelectProfile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectProfile(player);
                }}
                className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-xs font-medium transition-colors"
              >
                Deep Profile
              </button>
            )}
            {onCompare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCompare(player);
                }}
                className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Compare Player
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;
