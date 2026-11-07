import React from 'react';

const ordinal = (n) => {
  const num = Math.round(n);
  const rem100 = num % 100;
  const rem10 = num % 10;
  if (rem100 >= 11 && rem100 <= 13) return `${num}th`;
  if (rem10 === 1) return `${num}st`;
  if (rem10 === 2) return `${num}nd`;
  if (rem10 === 3) return `${num}rd`;
  return `${num}th`;
};

const normalizeGroupName = (g) => {
  if (!g) return 'General Output';
  if (/scoring/i.test(g)) return 'Scoring Output';
  if (/creat/i.test(g)) return 'Chance Creation';
  if (/prog/i.test(g)) return 'Ball Progression';
  return g;
};

export default function PercentileTable({
  percentilesData = [], // [{ metric, label, value, percentile, group }]
  poolDescription = 'Compared against Big 5 positional peers (min 270 minutes)',
  sampleSize = 749,
  position = 'FW'
}) {
  // Group rows
  const groups = percentilesData.reduce((acc, row) => {
    const grp = normalizeGroupName(row.group);
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(row);
    return acc;
  }, {});

  // Sort within each group by percentile descending
  Object.keys(groups).forEach((g) => {
    groups[g].sort((a, b) => b.percentile - a.percentile);
  });

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 rounded-xs space-y-4 font-ser">
      {/* Pool Header */}
      <div className="border-b border-[var(--ink)] pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)]">
            Positional Percentile Benchmark
          </h3>
          <p className="text-xs italic text-[var(--mute)] mt-0.5">
            {poolDescription}
          </p>
        </div>
        <div className="text-xs font-mono text-[var(--mute)] bg-[var(--panel)] px-2.5 py-1 border border-[var(--rule)]">
          Pool: {sampleSize} {position}s
        </div>
      </div>

      {/* Grouped Table */}
      <div className="space-y-6">
        {Object.entries(groups).map(([groupName, rows]) => (
          <div key={groupName} className="space-y-2">
            <h4 className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] border-b border-[var(--rule)] pb-1">
              {groupName}
            </h4>

            <div className="space-y-2.5">
              {rows.map((r) => {
                const pct = Math.max(0, Math.min(100, Math.round(r.percentile)));
                return (
                  <div key={r.metric} className="grid grid-cols-12 items-center gap-3 text-xs">
                    {/* Label */}
                    <div className="col-span-4 sm:col-span-3 font-semibold text-[var(--ink)] truncate" title={r.label}>
                      {r.label}
                    </div>

                    {/* Progress Track with 50% Median Tick */}
                    <div className="col-span-4 sm:col-span-5 relative flex items-center">
                      <div className="w-full bg-[var(--panel)] h-3 border border-[var(--rule)] relative overflow-hidden">
                        <div
                          className="h-full bg-[var(--blue)] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                        {/* 50% Median tick */}
                        <div
                          className="absolute top-0 bottom-0 w-[1px] bg-[var(--ink)] z-10"
                          style={{ left: '50%' }}
                          title="Pool Median (50th percentile)"
                        />
                      </div>
                    </div>

                    {/* Value */}
                    <div className="col-span-2 text-right font-mono font-bold text-[var(--ink)]">
                      {typeof r.value === 'number' ? r.value.toFixed(2) : r.value}
                    </div>

                    {/* Ordinal Rank */}
                    <div className="col-span-2 text-right font-mono text-[11px] italic text-[var(--mute)]">
                      {ordinal(pct)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
