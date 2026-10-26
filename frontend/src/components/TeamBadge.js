import React, { useState } from 'react';
import { Shield } from 'lucide-react';

export const TeamBadge = ({ team, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'FC';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  const hasLogo = Boolean(team?.logo && !imgError);

  return (
    <div
      className="bg-pitch-card hover:bg-slate-800/80 border border-pitch-border hover:border-emerald-500/50 p-4 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transform hover:-translate-y-1 transition-all duration-200 group shadow-sm"
      onClick={onSelect}
    >
      <div className="w-16 h-16 rounded-xl bg-pitch-surface border border-slate-700/60 flex items-center justify-center mb-3 group-hover:border-emerald-500/40 transition-colors shadow-inner">
        {hasLogo ? (
          <img
            src={team.logo}
            alt={team.name}
            onError={() => setImgError(true)}
            className="h-12 w-12 object-contain"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-emerald-400 font-bold font-mono text-sm tracking-wider">
            <Shield className="w-6 h-6 mb-0.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
            <span>{getInitials(team?.name)}</span>
          </div>
        )}
      </div>
      <p className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
        {team.name}
      </p>
    </div>
  );
};

export default TeamBadge;
