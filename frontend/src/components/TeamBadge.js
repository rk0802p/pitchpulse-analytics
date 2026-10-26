import React, { useState } from 'react';
import { Shield, ChevronRight } from 'lucide-react';

export const TeamBadge = ({ team, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  const teamObj = typeof team === 'string' ? { name: team, logo: '' } : (team || {});
  const teamName = teamObj.name || '';

  const getInitials = (name) => {
    if (!name) return 'FC';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const hasLogo = Boolean(teamObj.logo && !imgError);

  return (
    <div
      className="bg-pitch-card hover:bg-slate-800/90 border border-pitch-border hover:border-emerald-500/50 p-4 rounded-xl flex flex-col items-center justify-between text-center cursor-pointer transform hover:-translate-y-1 transition-all duration-200 group shadow-sm min-h-[140px]"
      onClick={onSelect}
    >
      <div className="w-14 h-14 rounded-xl bg-pitch-surface border border-slate-700/60 flex items-center justify-center mb-2.5 group-hover:border-emerald-500/40 group-hover:bg-emerald-500/5 transition-all shadow-inner">
        {hasLogo ? (
          <img
            src={teamObj.logo}
            alt={teamName}
            onError={() => setImgError(true)}
            className="h-10 w-10 object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-emerald-400 font-bold font-mono text-xs tracking-wider">
            <Shield className="w-5 h-5 mb-0.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span>{getInitials(teamName)}</span>
          </div>
        )}
      </div>

      <div className="w-full">
        <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 mb-1">
          {teamName}
        </p>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-500 group-hover:text-emerald-400/80 font-mono transition-colors">
          <span>Squad Roster</span>
          <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default TeamBadge;
