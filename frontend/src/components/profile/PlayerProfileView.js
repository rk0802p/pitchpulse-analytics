import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Share2, 
  GitCompare, 
  Star, 
  Shield, 
  Target, 
  Zap, 
  Activity 
} from 'lucide-react';
import { formatMetricValue } from '../../utils/metricFormatters';

export const PlayerProfileView = ({
  player,
  onBack,
  onCompare,
  activeSeason = "2024-2025"
}) => {
  if (!player) {
    return (
      <div className="py-12 text-center text-[var(--mute)] italic font-ser">
        <p>No player record selected in this ledger volume.</p>
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-1 border border-[var(--ink)] px-3 py-1 text-sm rounded-sm hover:bg-[var(--panel)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Player Ledger
          </button>
        )}
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('overview');

  // Key metrics breakdown
  const statsList = [
    { label: "Matches (90s)", value: player['90s'] ?? player.Matches ?? '—', key: '90s' },
    { label: "Goals", value: player.Gls ?? 0, key: 'Gls' },
    { label: "Assists", value: player.Ast ?? 0, key: 'Ast' },
    { label: "Expected Goals (xG)", value: player.xG ?? 0, key: 'xG' },
    { label: "Expected Assists (xAG)", value: player.xAG ?? 0, key: 'xAG' },
    { label: "Prog. Carries (PrgC)", value: player.PrgC ?? 0, key: 'PrgC' },
    { label: "Prog. Passes (PrgP)", value: player.PrgP ?? 0, key: 'PrgP' },
    { label: "Prog. Receptions (PrgR)", value: player.PrgR ?? 0, key: 'PrgR' },
  ];

  return (
    <div className="space-y-8 font-ser not-italic">
      {/* Top Navigation */}
      <div className="flex items-center justify-between border-b border-[var(--ink)] pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs italic text-[var(--ink)] hover:text-[var(--blue)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Player Ledger</span>
        </button>

        <div className="flex items-center gap-2">
          {onCompare && (
            <button
              onClick={() => onCompare(player)}
              className="border border-[var(--ink)] px-3 py-1 rounded-sm text-xs italic hover:bg-[var(--panel)] transition-colors flex items-center gap-1"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Head-to-Head Compare</span>
            </button>
          )}
        </div>
      </div>

      {/* Editorial Player Dossier Header */}
      <div className="border-b-2 border-[var(--ink)] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-disp tracking-widest text-[var(--mute)] mb-1">
              Player Folio • {player.Pos || "Midfielder"} • {player.Nation || "International"}
            </div>
            <h1 className="font-disp font-extrabold text-5xl sm:text-6xl text-[var(--ink)] leading-none">
              {player.Player}
            </h1>
            <div className="flex items-center gap-3 text-sm italic text-[var(--mute)] mt-2">
              <span className="font-semibold text-[var(--ink)] not-italic">
                {player.Squad || player.Team || "Club Squad"}
              </span>
              <span>•</span>
              <span>Age {player.Age || "—"}</span>
              <span>•</span>
              <span>Vol. {activeSeason}</span>
            </div>
          </div>

          {/* Quick Headshot or Monogram */}
          <div className="w-20 h-20 rounded-full border-2 border-[var(--ink)] bg-[var(--panel)] flex items-center justify-center font-disp font-extrabold text-3xl text-[var(--ink)] self-start md:self-auto">
            {player.Player?.split(' ').map(n => n[0]).join('').slice(0, 2) || "PL"}
          </div>
        </div>
      </div>

      {/* Headline Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statsList.slice(0, 4).map((stat) => (
          <div key={stat.label} className="border border-[var(--rule)] bg-[var(--paper)] p-3 rounded-sm">
            <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] block mb-1">
              {stat.label}
            </span>
            <span className="font-disp font-extrabold text-3xl text-[var(--ink)]">
              {typeof stat.value === 'number' ? formatMetricValue(stat.key, stat.value) : stat.value}
            </span>
          </div>
        ))}
      </div>

      {/* In-depth Statistical Ledger */}
      <div className="space-y-4">
        <div className="border-b border-[var(--ink)] pb-2 flex items-baseline justify-between">
          <h3 className="font-disp font-bold text-2xl text-[var(--ink)]">
            Complete Match & Progression Register
          </h3>
          <span className="text-xs italic text-[var(--mute)]">
            Per-90 and cumulative totals
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-[var(--rule)] p-4 rounded-sm">
            <h4 className="font-disp font-bold text-lg text-[var(--ink)] uppercase tracking-wider mb-3 border-b border-[var(--rule)] pb-1">
              Attacking & Chance Creation
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between dotted-rule py-1">
                <span>Goals Scored (Gls)</span>
                <span className="font-semibold">{player.Gls ?? 0}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Expected Goals (xG)</span>
                <span className="font-semibold">{formatMetricValue('xG', player.xG)}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Assists (Ast)</span>
                <span className="font-semibold">{player.Ast ?? 0}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Expected Assists (xAG)</span>
                <span className="font-semibold">{formatMetricValue('xAG', player.xAG)}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Goals per 90 (G/90)</span>
                <span className="font-semibold">{player.Gls_per90 ? Number(player.Gls_per90).toFixed(2) : '—'}</span>
              </div>
            </div>
          </div>

          <div className="border border-[var(--rule)] p-4 rounded-sm">
            <h4 className="font-disp font-bold text-lg text-[var(--ink)] uppercase tracking-wider mb-3 border-b border-[var(--rule)] pb-1">
              Possession, Progression & Spatial Influence
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between dotted-rule py-1">
                <span>Progressive Carries (PrgC)</span>
                <span className="font-semibold">{player.PrgC ?? 0}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Progressive Passes (PrgP)</span>
                <span className="font-semibold">{player.PrgP ?? 0}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Progressive Passes Received (PrgR)</span>
                <span className="font-semibold">{player.PrgR ?? 0}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>Total Minutes Played</span>
                <span className="font-semibold">{player.Min ? Number(player.Min).toLocaleString() : '—'}</span>
              </div>
              <div className="flex justify-between dotted-rule py-1">
                <span>90s Completed</span>
                <span className="font-semibold">{player['90s'] ? Number(player['90s']).toFixed(1) : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerProfileView;
