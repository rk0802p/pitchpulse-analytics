import React from 'react';

export const StatCardSkeleton = () => (
  <div className="bg-pitch-card border border-pitch-border rounded-xl p-5 animate-pulse">
    <div className="flex items-center justify-between mb-3">
      <div className="h-3 w-20 bg-slate-700/60 rounded"></div>
      <div className="h-8 w-8 bg-slate-700/50 rounded-lg"></div>
    </div>
    <div className="h-7 w-28 bg-slate-700 rounded mb-2"></div>
    <div className="h-3 w-36 bg-slate-800 rounded"></div>
  </div>
);

export const TableRowSkeleton = ({ columns = 6 }) => (
  <tr className="border-b border-pitch-border/50 animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-4 px-4">
        <div className={`h-4 bg-slate-700/60 rounded ${i === 0 ? 'w-32' : 'w-16'}`}></div>
      </td>
    ))}
  </tr>
);

export const CardGridSkeleton = ({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-pitch-card border border-pitch-border rounded-xl p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-slate-700"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-700 rounded w-3/4"></div>
            <div className="h-3 bg-slate-800 rounded w-1/2"></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-pitch-border">
          <div className="h-8 bg-slate-700/50 rounded"></div>
          <div className="h-8 bg-slate-700/50 rounded"></div>
          <div className="h-8 bg-slate-700/50 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

export default StatCardSkeleton;
