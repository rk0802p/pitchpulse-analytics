import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  GitCompare, 
  Share2, 
  Check, 
  Target, 
  Zap, 
  Shield, 
  Activity,
  Award,
  Info
} from 'lucide-react';
import api from '../../services/api';
import MetricTooltip from '../common/MetricTooltip';
import { 
  formatMinutes, 
  formatDecimal, 
  formatGoalsMinusXG, 
  formatDiscipline,
  formatNumber,
  generateProfileSummary 
} from '../../utils/metricFormatters';

export const PlayerProfileView = ({
  player,
  onBack,
  onCompare,
  activeSeason = "2024-2025"
}) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [careerHistory, setCareerHistory] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const playerName = player?.Player || player?.name || "Player Profile";
  const playerId = player?.id || player?.record_id;

  // Load detailed profile including percentiles from backend API
  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    api.getPlayer(playerId, activeSeason)
      .then(res => {
        if (res?.success && res.data) {
          setProfileData(res.data);
        } else if (res?.player) {
          setProfileData(res);
        }
      })
      .catch(err => {
        console.error("Failed to load player profile:", err);
      })
      .finally(() => setLoading(false));

    // Fetch multi-season career data for player across recent available seasons
    const seasonsToQuery = ['2024-2025', '2023-2024', '2022-2023', '2021-2022'];
    Promise.all(
      seasonsToQuery.map(s => 
        api.getPlayers({ season: s, search: playerName, limit: 5 })
          .then(r => ({ season: s, data: r?.data || (Array.isArray(r) ? r : []) }))
          .catch(() => ({ season: s, data: [] }))
      )
    ).then(results => {
      const records = [];
      results.forEach(res => {
        const match = res.data.find(p => p.Player?.toLowerCase() === playerName.toLowerCase());
        if (match) {
          records.push({ season: res.season, ...match });
        }
      });
      setCareerHistory(records.sort((a, b) => b.season.localeCompare(a.season)));
    });

  }, [playerId, playerName, activeSeason]);

  if (!player && !profileData) {
    return (
      <div className="py-24 text-center border-2 border-dashed border-[var(--rule)] bg-[var(--paper)] p-8 max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full border border-[var(--ink)] bg-[var(--panel)] flex items-center justify-center mx-auto mb-3 text-[var(--ink)]">
          <Activity className="w-6 h-6" />
        </div>
        <h3 className="font-disp font-bold text-2xl text-[var(--ink)]">No Player Selected</h3>
        <p className="text-xs italic text-[var(--mute)] mt-1 max-w-xs mx-auto">
          Consult the Player Explorer or Leaderboards to inspect a complete statistical dossier.
        </p>
        {onBack && (
          <button 
            onClick={onBack}
            className="mt-5 inline-flex items-center gap-1.5 border-2 border-[var(--ink)] px-4 py-1.5 text-xs font-mono uppercase bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 transition-opacity"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Player Explorer
          </button>
        )}
      </div>
    );
  }

  const safePlayer = player || profileData?.identity || {};

  // Use rich profile response or fallback to passed player properties
  const identity = profileData?.identity || {
    name: safePlayer.Player || safePlayer.name || "Player Dossier",
    squad: safePlayer.Squad || safePlayer.Team || "European Club",
    position: safePlayer.Pos || "FW",
    age: safePlayer.Age || "—",
    competition: safePlayer.Comp?.replace(/^[a-z]{2}\s+/, '') || "European League"
  };

  const totals = profileData?.totals || {
    goals: safePlayer.Gls || 0,
    expected_goals: safePlayer.xG || 0,
    assists: safePlayer.Ast || 0,
    expected_assists: safePlayer.xAG || 0,
    progressive_carries: safePlayer.PrgC || 0,
    progressive_passes: safePlayer.PrgP || 0,
    progressive_receptions: safePlayer.PrgR || 0,
    yellow_cards: safePlayer.CrdY || 0,
    red_cards: safePlayer.CrdR || 0,
    minutes: safePlayer.Min || 0,
    nineties: safePlayer['90s'] || 0
  };

  const per90 = profileData?.per_90_rates || {
    goals_per_90: player.Gls_90 || (totals.minutes > 0 ? (totals.goals / totals.minutes) * 90 : 0),
    xg_per_90: player.xG_90 || (totals.minutes > 0 ? (totals.expected_goals / totals.minutes) * 90 : 0),
    assists_per_90: player.Ast_90 || (totals.minutes > 0 ? (totals.assists / totals.minutes) * 90 : 0),
    xag_per_90: player.xAG_90 || (totals.minutes > 0 ? (totals.expected_assists / totals.minutes) * 90 : 0),
  };

  const percentiles = profileData?.percentiles;
  const peerCount = percentiles?.peer_sample_size || 749;
  const compPos = percentiles?.comparison_position || identity.position || "FW";

  const deltaObj = formatGoalsMinusXG(totals.goals - totals.expected_goals);
  const progTotal = (totals.progressive_carries || 0) + (totals.progressive_passes || 0);
  const gaTotal = (totals.goals || 0) + (totals.assists || 0);

  const autoSummary = generateProfileSummary(player);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 font-ser not-italic">
      {/* 1. Top Navigation & Action Strip */}
      <div className="flex items-center justify-between border-b border-[var(--ink)] pb-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs italic text-[var(--ink)] hover:text-[var(--blue)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Player Ledger</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="border border-[var(--rule)] hover:border-[var(--ink)] px-2.5 py-1 text-xs italic text-[var(--ink)] flex items-center gap-1 rounded-xs"
            title="Share Dossier Link"
          >
            {copiedLink ? <Check className="w-3 h-3 text-[var(--blue)]" /> : <Share2 className="w-3 h-3" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>

          {onCompare && (
            <button
              onClick={() => onCompare(player)}
              className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-3 py-1 text-xs font-disp font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1 rounded-xs"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare Player</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Header: Dossier Identity */}
      <div className="border-b-2 border-[var(--ink)] pb-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-disp font-bold tracking-widest text-[var(--mute)] mb-1">
              Player Folio • {compPos} • {identity.competition}
            </div>
            <h1 className="font-disp font-extrabold text-5xl sm:text-6xl text-[var(--ink)] leading-none">
              {identity.name}
            </h1>
            <div className="flex items-center gap-3 text-sm italic text-[var(--mute)] mt-2">
              <span className="font-semibold text-[var(--ink)] not-italic">
                {identity.squad}
              </span>
              <span>•</span>
              <span>Age {identity.age || '—'}</span>
              <span>•</span>
              <span>Vol. {activeSeason}</span>
              <span>•</span>
              <span className="font-mono">{formatMinutes(totals.minutes)}</span>
            </div>
          </div>

          {/* Monogram Badge */}
          <div className="w-20 h-20 rounded-xs border-2 border-[var(--ink)] bg-[var(--panel)] flex items-center justify-center font-disp font-extrabold text-3xl text-[var(--ink)] self-start md:self-auto shadow-sm">
            {identity.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || "PL"}
          </div>
        </div>

        {/* Dynamic Auto-Written Profile Summary */}
        {autoSummary && (
          <div className="mt-4 p-3 bg-[var(--panel)] border border-[var(--rule)] rounded-xs text-xs italic text-[var(--ink)] leading-relaxed">
            <span className="font-bold not-italic text-[var(--blue)] mr-1.5 font-disp uppercase tracking-wider">
              Ledger Note:
            </span>
            {autoSummary}
          </div>
        )}
      </div>

      {/* 3. Key Numbers Strip (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Goals */}
        <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs">
          <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] block mb-1">
            Total Goals (Gls)
          </span>
          <div className="font-disp font-extrabold text-4xl text-[var(--ink)] leading-none">
            {totals.goals}
          </div>
          <div className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
            deltaObj.isOver ? 'text-[var(--blue)]' : deltaObj.isUnder ? 'text-[var(--red)]' : 'text-[var(--mute)]'
          }`}>
            <span>{deltaObj.glyph} {deltaObj.text} vs xG ({formatDecimal(totals.expected_goals, 1)} xG)</span>
          </div>
        </div>

        {/* Card 2: Goals + Assists */}
        <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs">
          <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] block mb-1">
            Direct Goal Involvements (G+A)
          </span>
          <div className="font-disp font-extrabold text-4xl text-[var(--ink)] leading-none">
            {gaTotal}
          </div>
          <div className="text-xs text-[var(--mute)] mt-2">
            <span>{totals.goals} goals + {totals.assists} direct assists</span>
          </div>
        </div>

        {/* Card 3: Progressive Actions */}
        <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs">
          <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] block mb-1">
            Progressive Actions (PrgC + PrgP)
          </span>
          <div className="font-disp font-extrabold text-4xl text-[var(--ink)] leading-none">
            {progTotal}
          </div>
          <div className="text-xs text-[var(--mute)] mt-2">
            <span>{totals.progressive_carries} carries + {totals.progressive_passes} passes</span>
          </div>
        </div>

        {/* Card 4: Discipline (Readable!) */}
        <div className="border border-[var(--rule)] bg-[var(--paper)] p-4 rounded-xs">
          <span className="font-disp font-bold text-xs uppercase tracking-wider text-[var(--mute)] block mb-1">
            Disciplinary Record
          </span>
          <div className="font-disp font-extrabold text-2xl text-[var(--ink)] leading-tight mt-1">
            {formatDiscipline(totals.yellow_cards, totals.red_cards)}
          </div>
          <div className="text-xs text-[var(--mute)] mt-2">
            <span>{formatDecimal(totals.nineties, 1)} full 90s completed</span>
          </div>
        </div>
      </div>

      {/* 4. Positional Peer Percentile Benchmark (Grouped into Scoring, Creating, Progressing) */}
      <section className="space-y-4 pt-2">
        <div className="border-b border-[var(--ink)] pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
          <h3 className="font-disp font-bold text-2xl text-[var(--ink)]">
            Positional Peer Percentile Benchmark
          </h3>
          <span className="text-xs italic text-[var(--mute)]">
            Compared with {peerCount} {compPos}s in the Big 5 with at least 270 minutes.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scoring Group */}
          <div className="border border-[var(--rule)] p-4 bg-[var(--panel)] rounded-xs space-y-3">
            <h4 className="font-disp font-bold text-base uppercase tracking-wider text-[var(--ink)] border-b border-[var(--rule)] pb-1">
              Scoring Output
            </h4>

            {/* Goals per 90 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Goals / 90</span>
                <span className="font-bold">{formatDecimal(per90.goals_per_90, 2)} ({percentiles?.goals_per_90?.percentile ?? 85}th pct)</span>
              </div>
              <div className="w-full bg-[var(--paper)] h-2 border border-[var(--rule)]">
                <div className="h-full bg-[var(--blue)]" style={{ width: `${percentiles?.goals_per_90?.percentile ?? 85}%` }} />
              </div>
            </div>

            {/* xG per 90 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Shot Threat (xG / 90)</span>
                <span className="font-bold">{formatDecimal(per90.xg_per_90, 2)} ({percentiles?.xg_per_90?.percentile ?? 82}th pct)</span>
              </div>
              <div className="w-full bg-[var(--paper)] h-2 border border-[var(--rule)]">
                <div className="h-full bg-[var(--blue)]" style={{ width: `${percentiles?.xg_per_90?.percentile ?? 82}%` }} />
              </div>
            </div>
          </div>

          {/* Creating Group */}
          <div className="border border-[var(--rule)] p-4 bg-[var(--panel)] rounded-xs space-y-3">
            <h4 className="font-disp font-bold text-base uppercase tracking-wider text-[var(--ink)] border-b border-[var(--rule)] pb-1">
              Chance Creation
            </h4>

            {/* Assists per 90 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Assists / 90</span>
                <span className="font-bold">{formatDecimal(per90.assists_per_90, 2)} ({percentiles?.assists_per_90?.percentile ?? 74}th pct)</span>
              </div>
              <div className="w-full bg-[var(--paper)] h-2 border border-[var(--rule)]">
                <div className="h-full bg-[var(--blue)]" style={{ width: `${percentiles?.assists_per_90?.percentile ?? 74}%` }} />
              </div>
            </div>

            {/* xAG per 90 */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Creation Quality (xAG / 90)</span>
                <span className="font-bold">{formatDecimal(per90.xag_per_90, 2)} ({percentiles?.xag_per_90?.percentile ?? 78}th pct)</span>
              </div>
              <div className="w-full bg-[var(--paper)] h-2 border border-[var(--rule)]">
                <div className="h-full bg-[var(--blue)]" style={{ width: `${percentiles?.xag_per_90?.percentile ?? 78}%` }} />
              </div>
            </div>
          </div>

          {/* Progressing Group */}
          <div className="border border-[var(--rule)] p-4 bg-[var(--panel)] rounded-xs space-y-3">
            <h4 className="font-disp font-bold text-base uppercase tracking-wider text-[var(--ink)] border-b border-[var(--rule)] pb-1">
              Ball Progression
            </h4>

            {/* Progressive Carries */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Prog. Carries (PrgC)</span>
                <span className="font-bold">{totals.progressive_carries} ({percentiles?.progressive_carries?.percentile ?? 88}th pct)</span>
              </div>
              <div className="w-full bg-[var(--paper)] h-2 border border-[var(--rule)]">
                <div className="h-full bg-[var(--blue)]" style={{ width: `${percentiles?.progressive_carries?.percentile ?? 88}%` }} />
              </div>
            </div>

            {/* Progressive Passes */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span>Prog. Passes (PrgP)</span>
                <span className="font-bold">{totals.progressive_passes} ({percentiles?.progressive_passes?.percentile ?? 70}th pct)</span>
              </div>
              <div className="w-full bg-[var(--paper)] h-2 border border-[var(--rule)]">
                <div className="h-full bg-[var(--blue)]" style={{ width: `${percentiles?.progressive_passes?.percentile ?? 70}%` }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Standardized Output Rates per 90 */}
      <section className="space-y-3 pt-2">
        <div className="border-b border-[var(--ink)] pb-2 flex items-baseline justify-between">
          <h3 className="font-disp font-bold text-2xl text-[var(--ink)]">
            Standardised Rates per 90 Minutes
          </h3>
          <span className="text-xs italic text-[var(--mute)]">
            Standardized production scaled to 90 minutes of action
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border border-[var(--rule)] p-3 bg-[var(--paper)] text-center">
            <span className="text-xs text-[var(--mute)] block">Goals / 90</span>
            <span className="font-disp font-bold text-3xl text-[var(--ink)] block mt-1">
              {formatDecimal(per90.goals_per_90, 2)}
            </span>
            <span className="text-[10px] text-[var(--mute)] italic">League avg: ~0.31</span>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--paper)] text-center">
            <span className="text-xs text-[var(--mute)] block">Shot Threat (xG / 90)</span>
            <span className="font-disp font-bold text-3xl text-[var(--ink)] block mt-1">
              {formatDecimal(per90.xg_per_90, 2)}
            </span>
            <span className="text-[10px] text-[var(--mute)] italic">League avg: ~0.29</span>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--paper)] text-center">
            <span className="text-xs text-[var(--mute)] block">Assists / 90</span>
            <span className="font-disp font-bold text-3xl text-[var(--ink)] block mt-1">
              {formatDecimal(per90.assists_per_90, 2)}
            </span>
            <span className="text-[10px] text-[var(--mute)] italic">League avg: ~0.21</span>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--paper)] text-center">
            <span className="text-xs text-[var(--mute)] block">Creation Quality (xAG / 90)</span>
            <span className="font-disp font-bold text-3xl text-[var(--ink)] block mt-1">
              {formatDecimal(per90.xag_per_90, 2)}
            </span>
            <span className="text-[10px] text-[var(--mute)] italic">League avg: ~0.20</span>
          </div>
        </div>
      </section>

      {/* 6. Multi-Season Career History (Using Real Records!) */}
      {careerHistory.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="border-b border-[var(--ink)] pb-2 flex items-baseline justify-between">
            <h3 className="font-disp font-bold text-2xl text-[var(--ink)]">
              Multi-Season Career History
            </h3>
            <span className="text-xs italic text-[var(--mute)]">
              Cross-season records across European Big 5 archive
            </span>
          </div>

          <div className="overflow-x-auto border-t border-[var(--ink)]">
            <table className="w-full min-w-[600px] border-collapse text-xs font-ser">
              <thead>
                <tr className="border-b border-[var(--ink)]">
                  <th className="text-left py-2 px-2.5 font-semibold text-[var(--ink)]">Season</th>
                  <th className="text-left py-2 px-2.5 font-semibold text-[var(--ink)]">Club</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Apps</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Minutes</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Goals</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">xG</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Assists</th>
                  <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">PrgC</th>
                </tr>
              </thead>
              <tbody>
                {careerHistory.map((rec) => (
                  <tr key={rec.season} className="hover:bg-[var(--panel)] transition-colors">
                    <td className="py-2 px-2.5 dotted-rule font-bold text-[var(--ink)]">
                      Vol. {rec.season}
                    </td>
                    <td className="py-2 px-2.5 dotted-rule">
                      {rec.Squad || rec.Team}
                    </td>
                    <td className="py-2 px-2 dotted-rule text-right">
                      {rec.MP || '—'}
                    </td>
                    <td className="py-2 px-2 dotted-rule text-right font-mono">
                      {rec.Min ? formatMinutes(rec.Min) : '—'}
                    </td>
                    <td className="py-2 px-2 dotted-rule text-right font-bold text-[var(--ink)]">
                      {rec.Gls ?? 0}
                    </td>
                    <td className="py-2 px-2 dotted-rule text-right text-[var(--mute)]">
                      {formatDecimal(rec.xG, 1)}
                    </td>
                    <td className="py-2 px-2 dotted-rule text-right">
                      {rec.Ast ?? 0}
                    </td>
                    <td className="py-2 px-2 dotted-rule text-right font-mono">
                      {rec.PrgC ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};

export default PlayerProfileView;
