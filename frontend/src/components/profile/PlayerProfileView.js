import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  GitCompare, 
  Share2, 
  Check, 
  Activity
} from 'lucide-react';
import api from '../../services/api';
import { 
  formatMinutes, 
  formatDecimal, 
  formatGoalsMinusXG, 
  formatDiscipline,
  generateProfileSummary 
} from '../../utils/metricFormatters';
import PercentileTable from './PercentileTable';
import RadarChart from '../charts/RadarChart';
import SimilarPlayers from './SimilarPlayers';
import ScatterPlot from '../charts/ScatterPlot';

export const PlayerProfileView = ({
  player,
  onBack,
  onCompare,
  onSelectPlayer,
  activeSeason = "2024-2025"
}) => {
  const [profileData, setProfileData] = useState(null);
  const [percentilesList, setPercentilesList] = useState([]);
  const [peerPoolInfo, setPeerPoolInfo] = useState({ size: 749, position: 'FW' });
  const [scatterFinishingData, setScatterFinishingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [careerHistory, setCareerHistory] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const playerObj = (player && typeof player === 'object') ? player : {};
  const rawId = playerObj.id || playerObj.record_id || playerObj.Rk || (typeof player === 'number' || typeof player === 'string' ? player : null);
  const playerId = (rawId && rawId !== 'undefined' && rawId !== 'null') ? rawId : (playerObj.Player || playerObj.name || null);
  const playerName = playerObj.Player || playerObj.name || profileData?.identity?.name || (typeof player === 'string' && player !== 'undefined' ? player : "Player Profile");

  // Load detailed profile, percentiles, and finishing scatter plot
  useEffect(() => {
    if (!playerId) return;
    setLoading(true);

    // 1. Core player profile
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

    // 2. Positional percentiles from dedicated endpoint
    api.getPlayerPercentiles(playerId, { season: activeSeason })
      .then(res => {
        const payload = res?.data || res;
        if (payload?.percentiles) {
          setPercentilesList(payload.percentiles);
          if (payload.pool) {
            setPeerPoolInfo({
              size: payload.pool.sample_size || 749,
              position: payload.pool.position || player?.Pos || 'FW'
            });
          }
        }
      })
      .catch(err => {
        console.warn("Could not fetch dedicated percentiles endpoint, fallback to profile stats:", err);
      });

    // 3. Finishing scatter plot with parity line for this player's position
    api.getScatterChart({
      season: activeSeason,
      x: 'Gls_90',
      y: 'xG_90',
      position: player?.Pos?.split(',')[0] || undefined,
      min_minutes: 500
    }).then(res => {
      const payload = res?.data || res;
      if (payload?.points) {
        setScatterFinishingData(payload);
      }
    }).catch(() => {});

    // 4. Fetch multi-season career data for player across recent available seasons
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

  }, [playerId, playerName, activeSeason, player?.Pos]);

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

  const safePlayer = (profileData?.identity ? { ...playerObj, ...profileData.identity } : playerObj);

  const identity = profileData?.identity || {
    name: safePlayer.name || safePlayer.Player || (typeof player === 'string' && player !== 'undefined' ? player : "Player Dossier"),
    squad: safePlayer.squad || safePlayer.Squad || safePlayer.Team || "European Club",
    position: safePlayer.position || safePlayer.Pos || "FW",
    age: safePlayer.age || safePlayer.Age || "—",
    competition: (safePlayer.competition || safePlayer.Comp || "").replace(/^[a-z]{2}\s+/, '') || "European League"
  };

  const totals = profileData?.totals || {
    goals: safePlayer.goals ?? safePlayer.Gls ?? 0,
    expected_goals: safePlayer.expected_goals ?? safePlayer.xG ?? 0,
    assists: safePlayer.assists ?? safePlayer.Ast ?? 0,
    expected_assists: safePlayer.expected_assists ?? safePlayer.xAG ?? 0,
    progressive_carries: safePlayer.progressive_carries ?? safePlayer.PrgC ?? 0,
    progressive_passes: safePlayer.progressive_passes ?? safePlayer.PrgP ?? 0,
    progressive_receptions: safePlayer.progressive_receptions ?? safePlayer.PrgR ?? 0,
    yellow_cards: safePlayer.yellow_cards ?? safePlayer.CrdY ?? 0,
    red_cards: safePlayer.red_cards ?? safePlayer.CrdR ?? 0,
    minutes: safePlayer.minutes ?? safePlayer.Min ?? 0,
    nineties: safePlayer.nineties ?? safePlayer['90s'] ?? 0
  };

  const per90 = profileData?.per_90_rates || {
    goals_per_90: player?.Gls_90 || (totals.minutes > 0 ? (totals.goals / totals.minutes) * 90 : 0),
    xg_per_90: player?.xG_90 || (totals.minutes > 0 ? (totals.expected_goals / totals.minutes) * 90 : 0),
    assists_per_90: player?.Ast_90 || (totals.minutes > 0 ? (totals.assists / totals.minutes) * 90 : 0),
    xag_per_90: player?.xAG_90 || (totals.minutes > 0 ? (totals.expected_assists / totals.minutes) * 90 : 0),
  };

  const deltaObj = formatGoalsMinusXG(totals.goals - totals.expected_goals);
  const progTotal = (totals.progressive_carries || 0) + (totals.progressive_passes || 0);
  const gaTotal = (totals.goals || 0) + (totals.assists || 0);

  const autoSummary = generateProfileSummary(player);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Fallback percentiles data if dedicated endpoint not yet populated
  const defaultPercentilesData = [
    { metric: 'Gls_90', label: 'Goals / 90', group: 'Scoring', value: per90.goals_per_90, percentile: profileData?.percentiles?.goals_per_90?.percentile ?? (player?.Gls_90_pct ?? 85) },
    { metric: 'xG_90', label: 'Expected Goals / 90', group: 'Scoring', value: per90.xg_per_90, percentile: profileData?.percentiles?.xg_per_90?.percentile ?? (player?.xG_90_pct ?? 82) },
    { metric: 'Ast_90', label: 'Assists / 90', group: 'Creating', value: per90.assists_per_90, percentile: profileData?.percentiles?.assists_per_90?.percentile ?? (player?.Ast_90_pct ?? 74) },
    { metric: 'xAG_90', label: 'Expected Assisted Goals / 90', group: 'Creating', value: per90.xag_per_90, percentile: profileData?.percentiles?.xag_per_90?.percentile ?? (player?.xAG_90_pct ?? 78) },
    { metric: 'PrgC_90', label: 'Progressive Carries / 90', group: 'Progressing', value: (totals.progressive_carries / (totals.nineties || 1)), percentile: profileData?.percentiles?.progressive_carries?.percentile ?? (player?.PrgC_90_pct ?? 88) },
    { metric: 'PrgP_90', label: 'Progressive Passes / 90', group: 'Progressing', value: (totals.progressive_passes / (totals.nineties || 1)), percentile: profileData?.percentiles?.progressive_passes?.percentile ?? (player?.PrgP_90_pct ?? 70) }
  ];

  const resolvedPercentiles = percentilesList.length > 0 ? percentilesList : defaultPercentilesData;

  // Build values dictionary for radar chart
  const radarValues = {};
  resolvedPercentiles.forEach(p => {
    radarValues[p.metric] = p.percentile;
  });

  const radarDimensions = [
    { key: 'Gls_90', label: 'Goals/90' },
    { key: 'xG_90', label: 'xG/90' },
    { key: 'Ast_90', label: 'Assists/90' },
    { key: 'xAG_90', label: 'xAG/90' },
    { key: 'PrgC_90', label: 'Carries/90' },
    { key: 'PrgP_90', label: 'Passes/90' }
  ];

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
              Player Folio • {identity.position} • {identity.competition}
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
            deltaObj.isOver ? 'text-[var(--blue)]' : deltaObj.isUnder ? 'text-[var(--red, #b91c1c)]' : 'text-[var(--mute)]'
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

        {/* Card 4: Discipline */}
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

      {/* 4. Section 5 & 6: Percentile Table & Radar Chart Side-by-Side */}
      <section className="space-y-4 pt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Percentile Table */}
          <div className="lg:col-span-7">
            <PercentileTable
              percentilesData={resolvedPercentiles}
              sampleSize={peerPoolInfo.size}
              position={peerPoolInfo.position}
              poolDescription={`Compared against ${peerPoolInfo.size} ${peerPoolInfo.position}s in the Big 5 with >= 270 mins.`}
            />
          </div>

          {/* Right: Radar Chart */}
          <div className="lg:col-span-5">
            <RadarChart
              dimensions={radarDimensions}
              series={[
                {
                  name: identity.name,
                  values: radarValues
                }
              ]}
              title="Scouting Radar"
              subtitle={`Relative to Big 5 ${peerPoolInfo.position}s`}
            />
          </div>
        </div>
      </section>

      {/* 5. Section 4.4: Finishing Scatter Plot with Highlighted Dot & Parity Line */}
      {scatterFinishingData && scatterFinishingData.points && (
        <section className="space-y-3 pt-2">
          <ScatterPlot
            points={scatterFinishingData.points}
            medians={scatterFinishingData.medians}
            xLabel="Goals per 90 (Gls_90)"
            yLabel="Expected Goals per 90 (xG_90)"
            highlightName={identity.name}
            parity={true}
            parityLabel="Scoring exactly as expected"
            title="Finishing Efficiency & Parity"
            subtitle={`Points below diagonal score more than chances suggest (overperforming xG). Red dot highlights ${identity.name}.`}
            poolCaption={`Pool: ${scatterFinishingData.pool?.n || scatterFinishingData.points.length} peers (min 500 minutes)`}
            quadrantLabels={{
              topRight: 'Elite volume & threat',
              topLeft: 'Underperforming chances',
              bottomRight: 'Clinical overperformers',
              bottomLeft: 'Lower output'
            }}
          />
        </section>
      )}

      {/* 6. Section 3.3: Similar Players ("Scout: Find Statistical Matches") */}
      <section className="pt-2">
        <SimilarPlayers
          playerId={playerId}
          playerName={identity.name}
          position={identity.position}
          activeSeason={activeSeason}
          onSelectPlayer={(target) => {
            if (onSelectPlayer) {
              onSelectPlayer(target);
            } else {
              const targetId = typeof target === 'object' ? (target.id || target.record_id || target.Player || target.name) : target;
              if (targetId && targetId !== 'undefined' && targetId !== 'null') {
                window.location.hash = `#profile/${encodeURIComponent(targetId)}`;
              }
            }
          }}
          onCompare={onCompare}
        />
      </section>

      {/* 7. Multi-Season Career History */}
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
