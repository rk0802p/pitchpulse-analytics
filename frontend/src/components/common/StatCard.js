import React from 'react';

export const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  badge = null,
  badgeType = "neutral", // "positive", "negative", "neutral", "accent"
  accentColor = "emerald"
}) => {
  const badgeColors = {
    positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    negative: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    accent: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    neutral: "bg-slate-700/50 text-slate-300 border-slate-600/50"
  };

  const iconColors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20"
  };

  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 hover:border-slate-700 transition-all duration-200 relative overflow-hidden group shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconColors[accentColor] || iconColors.emerald}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white font-sans">
          {value !== undefined && value !== null ? value : "—"}
        </span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeColors[badgeType] || badgeColors.neutral}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-slate-400 mt-1.5 font-normal">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default StatCard;
