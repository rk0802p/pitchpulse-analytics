import React from 'react';

export const ChartPanel = ({
  title,
  subtitle,
  icon: Icon,
  controls = null,
  children
}) => {
  return (
    <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
      <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-pitch-border/60">
        <div>
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-emerald-400" />}
            <h3 className="text-sm font-semibold text-white tracking-tight">
              {title}
            </h3>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
        {controls && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {controls}
          </div>
        )}
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        {children}
      </div>
    </div>
  );
};

export default ChartPanel;
