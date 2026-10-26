import React from 'react';
import {
Crown,
Target, 
  Zap, 
  Sparkles, 
  Clock, 
  Award, 
  Filter,
  TrendingUp,
  GitCompare,
  ExternalLink
} from 'lucide-react';
import EmptyState from '../common/EmptyState';

const METRIC_TABS = [
  { id: 'Gls', label: 'Top Scorers (Goals)', icon: Target, category: 'Scoring' },
  { id: 'xG', label: 'Expected Goals (xG)', icon: Zap, category: 'Scoring' },
  { id: 'Gls_minus_xG', label: 'Finishing Overperformance', icon: TrendingUp, category: 'Scoring' },
  { id: 'Ast', label: 'Top Creators (Assists)', icon: Sparkles, category: 'Creation' },
  { id: 'xAG', label: 'Expected Assists (xAG)', icon: Zap, category: 'Creation' },
  { id: 'PrgC', label: 'Progressive Carries', icon: Award, category: 'Progression' },
  { id: 'PrgP', label: 'Progressive Passes', icon: Award, category: 'Progression' },
  { id: 'Gls_90', label: 'Goals / 90 (Rates)', icon: Target, category: 'Rates' },
  { id: 'Ast_90', label: 'Assists / 90 (Rates)', icon: Sparkles, category: 'Rates' },
  { id: 'Min', label: 'Minutes Played (Workhorses)', icon: Clock, category: 'Volume' }
];

const POSITION_FILTERS = [
  { id: '', label: 'All Positions' },
  { id: 'FW', label: 'Forwards (FW)' },
  { id: 'MF', label: 'Midfielders (MF)' },
  { id: 'DF', label: 'Defenders (DF)' }
];

const MINUTES_THRESHOLDS = [
  { value: 0, label: 'All Minutes' },
  { value: 270, label: '270+ mins' },
  { value: 500, label: '500+ mins' },
  { value: 900, label: '900+ mins (Regulars)' }
];

export const LeaderboardsView = ({
  leaders = [],
  loading = false,
  activeMetric = 'Gls',
  onSelectMetric,
  activeComp = '',
  onSelectComp,
  activePosition = '',
  onSelectPosition,
  minMinutes = 0,
  onSelectMinMinutes,
  competitions = [],
  onPlayerClick,
  onCompareToggle,
  isCompared
}) => {
  const topThree = leaders.slice(0, 3);
  const remainingLeaders = leaders.slice(3);

  const getMetricFormat = (val, metric) => {
    if (val === undefined || val === null) return '0';
    if (typeof val === 'number') {
      if (metric.includes('minus')) {
        return val > 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
      }
      if (metric.includes('_90') || metric.includes('xG') || metric.includes('xAG')) {
        return val.toFixed(2);
      }
    }
    return val;
  };

  return (
    <div className="space-y-6">
      {/* Metric Categories Bar */}
      <div className="flex flex-wrap gap-2 pb-2">
        {METRIC_TABS.map((m) => {
          const isActive = activeMetric === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMetric(m.id)}
              className={`
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all
                ${isActive
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-pitch-card hover:bg-slate-800 text-slate-300 border border-pitch-border'}
              `}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-emerald-400'}`} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-pitch-card border border-pitch-border rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        {/* Competition Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" /> League:
          </span>
          <button
            onClick={() => onSelectComp('')}
            className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
              activeComp === ''
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                : 'bg-pitch-surface text-slate-400 border border-pitch-border hover:text-slate-200'
            }`}
          >
            All 5 Leagues
          </button>
          {competitions.map((comp) => (
            <button
              key={comp.id}
              onClick={() => onSelectComp(comp.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors whitespace-nowrap ${
                activeComp === comp.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold'
                  : 'bg-pitch-surface text-slate-400 border border-pitch-border hover:text-slate-200'
              }`}
            >
              {comp.name}
            </button>
          ))}
        </div>

        {/* Positional and Minutes Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-mono">Pos:</span>
            <select
              value={activePosition}
              onChange={(e) => onSelectPosition && onSelectPosition(e.target.value)}
              className="bg-pitch-surface border border-pitch-border rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {POSITION_FILTERS.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 font-mono">Min:</span>
            <select
              value={minMinutes}
              onChange={(e) => onSelectMinMinutes && onSelectMinMinutes(Number(e.target.value))}
              className="bg-pitch-surface border border-pitch-border rounded-md px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {MINUTES_THRESHOLDS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-mono">Querying European leaderboards...</p>
        </div>
      ) : leaders.length === 0 ? (
        <EmptyState
          title="No players meet criteria"
          message="Try lowering the minimum minutes threshold or selecting a different competition."
          onReset={() => {
            onSelectComp('');
            onSelectPosition('');
            onSelectMinMinutes(0);
          }}
          resetText="Reset Filters"
        />
      ) : (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          {topThree.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topThree.map((item, idx) => {
                const rank = idx + 1;
                const isGold = rank === 1;
                const isSilver = rank === 2;

                const borderColor = isGold
                  ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 to-pitch-card'
                  : isSilver
                  ? 'border-slate-400/40 bg-gradient-to-b from-slate-400/10 to-pitch-card'
                  : 'border-amber-700/40 bg-gradient-to-b from-amber-700/10 to-pitch-card';

                const badgeBg = isGold
                  ? 'bg-amber-500 text-slate-950'
                  : isSilver
                  ? 'bg-slate-300 text-slate-950'
                  : 'bg-amber-700 text-white';

                return (
                  <div
                    key={item.id}
                    className={`border rounded-xl p-5 relative shadow-md flex flex-col justify-between ${borderColor}`}
                  >
                    <div>
                      {/* Top Rank Badge & Action */}
                      <div className="flex items-center justify-between mb-3">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${badgeBg}`}>
                          {isGold ? <Crown className="w-4 h-4" /> : rank}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onCompareToggle && onCompareToggle(item)}
                            className={`p-1.5 rounded-md text-xs transition-colors ${
                              isCompared && isCompared(item.id)
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-slate-400 hover:text-white bg-pitch-surface'
                            }`}
                            title="Add to Comparison"
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Player Identity */}
                      <div
                        onClick={() => onPlayerClick && onPlayerClick(item.id)}
                        className="cursor-pointer group mb-4"
                      >
                        <h4 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                          {item.player}
                          <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.squad} · <span className="text-slate-300 font-mono text-[11px]">{item.competition}</span>
                        </p>
                      </div>

                      {/* Prominent Metric Display */}
                      <div className="bg-slate-900/60 border border-pitch-border rounded-lg p-3 text-center mb-4">
                        <span className="text-2xl font-extrabold font-mono text-emerald-400 block tracking-tight">
                          {getMetricFormat(item.value, activeMetric)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                          {activeMetric}
                        </span>
                      </div>
                    </div>

                    {/* Secondary Context */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-pitch-border/60 font-mono">
                      <div>
                        <span className="text-[10px] text-slate-500 block">MINS</span>
                        <span className="text-slate-300 font-bold">{item.minutes}m</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">xG</span>
                        <span className="text-cyan-400 font-bold">{item.xg}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">AST</span>
                        <span className="text-blue-400 font-bold">{item.assists}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ranks 4 to N Table */}
          {remainingLeaders.length > 0 && (
            <div className="bg-pitch-card border border-pitch-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-4 bg-pitch-surface border-b border-pitch-border flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono">
                  Rankings 4 – {leaders.length}
                </h4>
                <span className="text-xs text-slate-400 font-mono">2024/25 European Regular Season</span>
              </div>

              <div className="divide-y divide-pitch-border/60">
                {remainingLeaders.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3.5">
                      <span className="w-7 h-7 rounded-md bg-pitch-surface border border-pitch-border flex items-center justify-center font-mono font-bold text-xs text-slate-400">
                        {item.rank}
                      </span>
                      <div>
                        <h4
                          onClick={() => onPlayerClick && onPlayerClick(item.id)}
                          className="font-bold text-sm text-white hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-2"
                        >
                          {item.player}
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pitch-surface border border-pitch-border text-slate-400">
                            {item.position}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400">
                          {item.squad} · <span className="text-slate-500">{item.competition}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right hidden sm:block font-mono">
                        <span className="text-xs text-slate-300 block">{item.matches} apps · {item.minutes}m</span>
                        <span className="text-[11px] text-slate-500">
                          xG: {item.xg} · xAG: {item.xag}
                        </span>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <span className="text-lg font-bold font-mono text-emerald-400 block">
                          {getMetricFormat(item.value, activeMetric)}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">
                          {activeMetric}
                        </span>
                      </div>

                      <button
                        onClick={() => onCompareToggle && onCompareToggle(item)}
                        className={`p-1.5 rounded-md text-xs transition-colors hidden md:block ${
                          isCompared && isCompared(item.id)
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-slate-400 hover:text-white bg-pitch-surface'
                        }`}
                        title="Add to Comparison"
                      >
                        <GitCompare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardsView;
