import React from 'react';
import { Trophy, ChevronRight } from 'lucide-react';

export const LeagueBanner = ({ league, onSelect }) => {
  const cleanName = league.name?.replace(/^[a-z]{2,3}\s/, '') || league.name;
  const rawPrefix = league.name?.match(/^[a-z]{2,3}/)?.[0] || 'EU';

  return (
    <div
      className="bg-pitch-card hover:bg-slate-800 border border-pitch-border hover:border-emerald-500/50 p-5 rounded-xl cursor-pointer transform hover:-translate-y-1 transition-all duration-200 group flex items-center justify-between shadow-sm"
      onClick={onSelect}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
            {rawPrefix.toUpperCase()}
          </span>
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors mt-0.5">
            {cleanName}
          </h3>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
    </div>
  );
};

export default LeagueBanner;
