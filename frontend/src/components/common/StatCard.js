import React from 'react';
import { formatMetricValue } from '../../utils/metricFormatters';

export const StatCard = ({
  title,
  value,
  delta,
  deltaType = "neutral", // positive, negative, neutral
  subtext,
  sparklineData = [],
  metricKey,
  onClick
}) => {
  const isPositive = deltaType === "positive" || (typeof delta === 'number' && delta > 0);
  const isNegative = deltaType === "negative" || (typeof delta === 'number' && delta < 0);

  const formattedVal = metricKey && typeof value === 'number'
    ? formatMetricValue(metricKey, value)
    : value ?? '—';

  return (
    <div 
      onClick={onClick}
      className={`border border-[var(--rule)] bg-[var(--paper)] hover:bg-[var(--panel)] p-3 sm:p-4 rounded-sm transition-all not-italic ${
        onClick ? 'cursor-pointer hover:border-[var(--ink)]' : ''
      }`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)]">
          {title}
        </span>
        {delta !== undefined && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 ${
            isPositive ? 'text-[var(--blue)]' : isNegative ? 'text-[var(--red)]' : 'text-[var(--mute)]'
          }`}>
            {isPositive ? '▲' : isNegative ? '▼' : '—'} {Math.abs(delta)}
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-3 mt-1">
        <div className="font-disp font-extrabold text-3xl sm:text-4xl text-[var(--ink)] leading-none tracking-tight">
          {formattedVal}
        </div>

        {/* Minimal inline sparkline */}
        {sparklineData && sparklineData.length > 1 && (
          <div className="w-16 h-6 shrink-0 opacity-80">
            <svg viewBox="0 0 60 20" className="w-full h-full overflow-visible">
              <polyline
                fill="none"
                stroke="var(--ink)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={sparklineData.map((val, idx) => {
                  const min = Math.min(...sparklineData);
                  const max = Math.max(...sparklineData);
                  const range = max - min || 1;
                  const x = (idx / (sparklineData.length - 1)) * 56 + 2;
                  const y = 18 - ((val - min) / range) * 16;
                  return `${x},${y}`;
                }).join(" ")}
              />
            </svg>
          </div>
        )}
      </div>

      {subtext && (
        <div className="text-xs italic text-[var(--mute)] mt-1.5 font-ser">
          {subtext}
        </div>
      )}
    </div>
  );
};

export default StatCard;
