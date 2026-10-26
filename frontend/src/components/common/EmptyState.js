import React from 'react';
import { SearchX, RotateCcw } from 'lucide-react';

export const EmptyState = ({
  title = "No data found",
  message = "Try adjusting your search queries or clearing your filters.",
  onReset = null,
  resetText = "Reset Filters",
  icon: Icon = SearchX
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-pitch-card/50 border border-pitch-border rounded-xl my-6">
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{message}</p>
      {onReset && (
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-pitch-card hover:bg-pitch-card-hover border border-pitch-border hover:border-emerald-500/50 text-slate-200 text-sm font-medium transition-colors"
        >
          <RotateCcw className="w-4 h-4 text-emerald-400" />
          {resetText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
