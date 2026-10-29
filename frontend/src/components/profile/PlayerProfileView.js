import React from 'react';
import { 
  ArrowLeft,
Target, 
  Sparkles, 
  Zap, 
  AlertTriangle,
  GitCompare,
  Check,
Award
} from 'lucide-react';
import StatCard from '../common/StatCard';

export const PlayerProfileView = ({
  profile,
  onBack,
  onCompare,
  isCompared = false
}) => {
  if (!profile) return null;

  const { identity, playing_time, scoring, playmaking, progression, discipline, per_90_rates, percentiles } = profile;

  const getInitials = (name) => {
    if (!name) return 'PL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getPercentileColor = (pct) => {
    if (pct >= 85) return 'bg-emerald-500 text-emerald-400';
    if (pct >= 65) return 'bg-cyan-500 text-cyan-400';
    if (pct >= 40) return 'bg-blue-500 text-blue-400';
    return 'bg-slate-500 text-slate-400';
  };

  const percentileMetrics = [
    { key: 'goals_per_90', label: 'Goals / 90' },
    { key: 'xg_per_90', label: 'Shot Threat (xG/90)' },
    { key: 'assists_per_90', label: 'Assists / 90' },
    { key: 'xag_per_90', label: 'Chance Quality (xAG/90)' },
    { key: 'progressive_carries', label: 'Prog. Carries (PrgC)' },
    { key: 'progressive_passes', label: 'Prog. Passes (PrgP)' },
    { key: 'progressive_receptions', label: 'Prog. Receptions (PrgR)' }
  ];

  return (
    <div className="space-y-6">
      {/* Back & Actions Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pitch-card hover:bg-slate-800 border border-pitch-border text-xs font-medium text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-emerald-400" /> Back to Player Explorer
        </button>

        <button
          onClick={() => onCompare && onCompare(profile.raw_record)}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isCompared
              ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
              : 'bg-pitch-card hover:bg-slate-800 border border-pitch-border text-slate-200'
          }`}
        >
          {isCompared ? <Check className="w-3.5 h-3.5" /> : <GitCompare className="w-3.5 h-3.5 text-emerald-400" />}
          {isCompared ? 'In Comparison Workspace' : 'Add to Comparison'}
        </button>
      </div>

      {/* Quarantined Dataset Record Notice */}
      {profile.is_quarantined && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-amber-200 block">
              Quarantined / Provisional Dataset Record ({profile.season})
            </span>
            <p className="text-amber-300/80 mt-1 leading-relaxed">
              {profile.quarantine_reason || 'This player record belongs to a provisional/composite dataset and is isolated from authoritative historical benchmarks.'}
            </p>
          </div>
        </div>
      )}

      {/* Hero Dossier Card */}
      <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Identity info */}
          <div className="flex items-start md:items-center gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-pitch-surface border-2 border-emerald-500/30 text-emerald-400 font-bold font-mono text-2xl flex items-center justify-center shadow-inner flex-shrink-0">
              {getInitials(identity.name)}
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {identity.position}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {identity.nation}
                </span>
                {identity.age && (
                  <span className="text-xs text-slate-400 font-mono">
                    Age {identity.age} {identity.born ? `(b. ${identity.born})` : ''}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                {identity.name}
              </h1>

              <div className="flex items-center gap-2 mt-1 text-sm text-slate-400 flex-wrap">
                <span className="text-white font-medium">{identity.squad}</span>
                <span>·</span>
                <span className="text-emerald-400 font-medium">{identity.competition}</span>
                <span>·</span>
                <span className="text-slate-500">Record #{identity.rk}</span>
              </div>
            </div>
          </div>

          {/* Quick Context Pill */}
          <div className="bg-pitch-surface/80 border border-pitch-border p-3.5 rounded-xl flex items-center gap-4 text-xs font-mono flex-shrink-0">
            <div>
              <span className="text-slate-500 block">PLAYING TIME</span>
              <span className="text-white font-bold text-sm">{playing_time.minutes} mins</span>
            </div>
            <div className="border-l border-pitch-border pl-4">
              <span className="text-slate-500 block">MATCHES</span>
              <span className="text-white font-bold text-sm">{playing_time.matches_played} ({playing_time.starts} starts)</span>
            </div>
            <div className="border-l border-pitch-border pl-4">
              <span className="text-slate-500 block">OUTPUT</span>
              <span className="text-emerald-400 font-bold text-sm">{scoring.goals}G + {playmaking.assists}A</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Goals Scored"
          value={scoring.goals}
          subtext={(scoring.expected_goals ?? scoring.xg) > 0 ? `Expected (xG): ${scoring.expected_goals ?? scoring.xg}` : 'Standard Goals Output'}
          badge={(scoring.expected_goals ?? scoring.xg) > 0 ? ((scoring.finishing_differential ?? scoring.goals_minus_xg ?? 0) > 0 ? `+${scoring.finishing_differential ?? scoring.goals_minus_xg} Over xG` : `${scoring.finishing_differential ?? scoring.goals_minus_xg ?? 0} Diff`) : 'Goals Scored'}
          badgeType={(scoring.expected_goals ?? scoring.xg) > 0 ? ((scoring.finishing_differential ?? scoring.goals_minus_xg ?? 0) > 0 ? "positive" : "negative") : "neutral"}
          icon={Target}
          accentColor="rose"
        />
        <StatCard
          title="Chance Creation"
          value={playmaking.assists}
          subtext={(playmaking.expected_assisted_goals ?? playmaking.xag) > 0 ? `Expected Assists (xAG): ${playmaking.expected_assisted_goals ?? playmaking.xag}` : `${playmaking.goals_plus_assists} Total G+A`}
          badge={`${playmaking.goals_plus_assists} G+A`}
          badgeType="accent"
          icon={Sparkles}
          accentColor="blue"
        />
        <StatCard
          title="Ball Progression"
          value={(progression.progressive_carries > 0 || progression.progressive_passes > 0) ? progression.progressive_carries : "N/A"}
          subtext={(progression.progressive_carries > 0 || progression.progressive_passes > 0) ? `Progressive Passes: ${progression.progressive_passes}` : "Spatial tracking unrecorded in this era"}
          badge={(progression.progressive_carries > 0 || progression.progressive_passes > 0) ? "PrgC & PrgP" : "Untracked"}
          badgeType={(progression.progressive_carries > 0 || progression.progressive_passes > 0) ? "accent" : "neutral"}
          icon={Zap}
          accentColor="purple"
        />
        <StatCard
          title="Disciplinary Record"
          value={`${discipline.yellow_cards} Y / ${discipline.red_cards} R`}
          subtext={`${playing_time.ninetys ?? playing_time.nineties ?? 0} total 90s played`}
          badge={discipline.red_cards > 0 ? "Red Card Received" : "Clean Record"}
          badgeType={discipline.red_cards > 0 ? "negative" : "neutral"}
          icon={AlertTriangle}
          accentColor="amber"
        />
      </div>

      {/* Positional Peer Percentile Benchmark */}
      {percentiles && (
        <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-pitch-border flex-wrap gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Positional Peer Percentile Benchmark
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated against {percentiles.peer_sample_size} {percentiles.comparison_position} peers across Europe (Min 270 mins)
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Scouting Radar Metrics
            </span>
          </div>

          <div className="space-y-4">
            {percentileMetrics.map((item) => {
              const metricData = percentiles[item.key];
              if (!metricData) return null;
              const isUntracked = metricData.is_tracked === false || metricData.percentile === null || metricData.percentile === undefined;
              const pct = isUntracked ? 0 : metricData.percentile;
              const barClass = isUntracked ? 'bg-slate-700 text-slate-500' : getPercentileColor(pct);

              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-medium">{item.label}</span>
                      {!isUntracked && metricData.sample_size && metricData.sample_size < percentiles.peer_sample_size && (
                        <span className="text-[10px] text-slate-500 font-mono" title={`Evaluated against ${metricData.sample_size} peers with tracking`}>
                          (N={metricData.sample_size})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{isUntracked ? '—' : metricData.value}</span>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${isUntracked ? 'bg-slate-800 text-slate-400 border border-slate-700/60' : barClass.split(' ')[1]}`}>
                        {metricData.insufficient_sample ? 'Sample < 10' : (isUntracked ? 'Untracked in era' : `${pct}th percentile`)}
                      </span>
                    </div>
                  </div>
                  {/* Percentile bar */}
                  <div className="w-full bg-pitch-surface rounded-full h-2 overflow-hidden border border-pitch-border/50">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isUntracked ? 'bg-slate-800/40' : barClass.split(' ')[0]}`}
                      style={{ width: isUntracked ? '0%' : `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standardized Per 90 Minutes Output */}
      <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 pb-2 border-b border-pitch-border font-mono flex items-center justify-between">
          <span>Standardized Output Rates (Per 90 Minutes)</span>
          <span className="text-xs text-slate-400 lowercase font-normal">rates normalized by total minutes</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl bg-pitch-surface border border-pitch-border text-center">
            <span className="text-xs text-slate-400 block mb-1">Goals / 90</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {per_90_rates.goals_per_90 !== null && per_90_rates.goals_per_90 !== undefined ? per_90_rates.goals_per_90 : 'N/A'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-pitch-surface border border-pitch-border text-center">
            <span className="text-xs text-slate-400 block mb-1">xG / 90</span>
            {per_90_rates.xg_per_90 !== null && per_90_rates.xg_per_90 !== undefined ? (
              <span className="text-2xl font-bold font-mono text-cyan-400">{per_90_rates.xg_per_90}</span>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold font-mono text-slate-500">N/A</span>
                <span className="text-[10px] text-slate-500 font-mono">untracked</span>
              </div>
            )}
          </div>
          <div className="p-3.5 rounded-xl bg-pitch-surface border border-pitch-border text-center">
            <span className="text-xs text-slate-400 block mb-1">Assists / 90</span>
            <span className="text-2xl font-bold font-mono text-blue-400">
              {per_90_rates.assists_per_90 !== null && per_90_rates.assists_per_90 !== undefined ? per_90_rates.assists_per_90 : 'N/A'}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-pitch-surface border border-pitch-border text-center">
            <span className="text-xs text-slate-400 block mb-1">xAG / 90</span>
            {per_90_rates.xag_per_90 !== null && per_90_rates.xag_per_90 !== undefined ? (
              <span className="text-2xl font-bold font-mono text-purple-400">{per_90_rates.xag_per_90}</span>
            ) : (
              <div className="flex flex-col items-center">
                <span className="text-2xl font-bold font-mono text-slate-500">N/A</span>
                <span className="text-[10px] text-slate-500 font-mono">untracked</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileView;
