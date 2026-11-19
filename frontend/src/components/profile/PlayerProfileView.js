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
import PlayerXgEfficiencyChart from '../charts/PlayerXgEfficiencyChart';

export const PlayerProfileView = ({
  player,
  onBack,
  onCompare,
  onSelectPlayer,
  onSelectSeason,
  activeSeason = "2024-2025"
}) => {
  const [profileData, setProfileData] = useState(null);
  const [notInSeason, setNotInSeason] = useState(false);
  const [percentilesList, setPercentilesList] = useState([]);
  const [peerPoolInfo, setPeerPoolInfo] = useState({ size: 0, position: 'FW' });
  const [scatterFinishingData, setScatterFinishingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [careerHistoryData, setCareerHistoryData] = useState(null);
  const [careerHistory, setCareerHistory] = useState([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const playerObj = (player && typeof player === 'object') ? player : {};
  const rawId = playerObj.id || playerObj.record_id || playerObj.Rk || (typeof player === 'number' || typeof player === 'string' ? player : null);
  const seasonMatchesPlayer = !playerObj.season || playerObj.season === activeSeason;
  const fallbackName = playerObj.Player || playerObj.name || (typeof player === 'string' && player !== 'undefined' ? player : null);
  // Avoid passing a numeric CSV row Rk from another season, which would resolve to a different player
  const lookupKey = seasonMatchesPlayer && rawId && rawId !== 'undefined' && rawId !== 'null'
    ? rawId
    : (fallbackName || rawId || null);
  const playerId = profileData?.identity?.id || lookupKey;
  const playerName = fallbackName || profileData?.identity?.name || "Player Profile";

  // Load detailed profile, percentiles, and finishing scatter plot
  useEffect(() => {
    if (!lookupKey) return;
    let cancelled = false;
    setLoading(true);
    setNotInSeason(false);
    setProfileData(null);
    setPercentilesList([]);

    // 1. Core player profile for activeSeason
    api.getPlayer(lookupKey, activeSeason)
      .then(res => {
        if (cancelled) return;
        const data = res?.success && res.data ? res.data : (res?.player ? res : null);
        if (data) {
          setProfileData(data);
          setNotInSeason(false);
          const resolvedId = data?.identity?.id || lookupKey;
          const resolvedPos = (data?.identity?.position || playerObj.Pos || '').split(',')[0] || undefined;

          // 2. Positional percentiles from dedicated endpoint
          api.getPlayerPercentiles(resolvedId, { season: activeSeason })
            .then(pRes => {
              if (cancelled) return;
              const payload = pRes?.data || pRes;
              if (payload?.percentiles) {
                setPercentilesList(Array.isArray(payload.percentiles) ? payload.percentiles : []);
                if (payload.peer_sample_size || payload.pool) {
                  setPeerPoolInfo({
                    size: payload.peer_sample_size || payload.pool?.sample_size || 0,
                    position: payload.comparison_position || payload.pool?.position || resolvedPos || 'FW'
                  });
                }
              }
            })
            .catch(() => {});

          // 3. Finishing scatter plot with parity line for this player's position
          api.getScatterChart({
            season: activeSeason,
            x: 'Gls_90',
            y: 'xG_90',
            position: resolvedPos,
            min_minutes: 500
          }).then(sRes => {
            if (cancelled) return;
            const payload = sRes?.data || sRes;
            if (payload?.points) setScatterFinishingData(payload);
          }).catch(() => {});
        } else {
          setNotInSeason(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfileData(null);
          setNotInSeason(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // 4. Fetch full multi-season career history (2012-2013 to 2025-2026) from dedicated history endpoint
    const historyQuery = fallbackName || lookupKey;
    api.getPlayerHistory(historyQuery, { season: activeSeason })
      .then(res => {
        if (cancelled) return;
        const payload = res?.data || res;
        if (payload?.seasons) {
          setCareerHistoryData(payload);
          setCareerHistory([...payload.seasons].sort((a, b) => b.season.localeCompare(a.season)));
        } else {
          setCareerHistoryData(null);
          setCareerHistory([]);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCareerHistoryData(null);
          setCareerHistory([]);
        }
      });

    return () => { cancelled = true; };
  }, [lookupKey, fallbackName, activeSeason]);

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

  if (notInSeason && !loading) {
    return (
      <div className="space-y-6 font-ser not-italic">
        <div className="flex items-center justify-between border-b border-[var(--ink)] pb-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs italic text-[var(--ink)] hover:text-[var(--blue)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Player Ledger</span>
          </button>
        </div>

        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 space-y-4">
          <div className="text-[11px] font-mono uppercase tracking-widest text-[var(--mute)]">
            Season Availability Notice · {activeSeason}
          </div>
          <h2 className="font-disp font-extrabold text-3xl text-[var(--ink)] leading-tight">
            {careerHistoryData?.player_name || playerName}
          </h2>
          <p className="text-sm text-[var(--mute)]">
            No Big 5 European league appearances recorded for this player in <strong className="text-[var(--ink)]">{activeSeason}</strong>.
          </p>
          {careerHistory.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-mono uppercase text-[var(--mute)]">
                Jump to an archived season ({careerHistory.length} available):
              </div>
              <div className="flex flex-wrap gap-2">
                {careerHistory.map((row) => (
                  <button
                    key={row.season}
                    onClick={() => onSelectSeason && onSelectSeason(row.season)}
                    className="border border-[var(--ink)] bg-[var(--panel)] hover:bg-[var(--ink)] hover:text-[var(--paper)] px-3 py-1 text-xs font-mono transition-colors cursor-pointer"
                  >
                    {row.season} · {row.Squad} ({row.Gls}G)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {careerHistoryData && (
          <PlayerXgEfficiencyChart
            playerId={fallbackName || lookupKey}
            playerName={careerHistoryData.player_name || playerName}
            activeSeason={activeSeason}
            preloadedHistory={careerHistoryData}
            allowPlayerSwitch={false}
          />
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
    expected_goals: safePlayer.expected_goals !== undefined ? safePlayer.expected_goals : (safePlayer.xG ?? null),
    assists: safePlayer.assists ?? safePlayer.Ast ?? 0,
    expected_assists: safePlayer.expected_assists !== undefined ? safePlayer.expected_assists : (safePlayer.xAG ?? null),
    progressive_carries: safePlayer.progressive_carries !== undefined ? safePlayer.progressive_carries : (safePlayer.PrgC ?? null),
    progressive_passes: safePlayer.progressive_passes !== undefined ? safePlayer.progressive_passes : (safePlayer.PrgP ?? null),
    progressive_receptions: safePlayer.progressive_receptions !== undefined ? safePlayer.progressive_receptions : (safePlayer.PrgR ?? null),
    yellow_cards: safePlayer.yellow_cards ?? safePlayer.CrdY ?? 0,
    red_cards: safePlayer.red_cards ?? safePlayer.CrdR ?? 0,
    minutes: safePlayer.minutes ?? safePlayer.Min ?? 0,
    nineties: safePlayer.nineties ?? safePlayer['90s'] ?? 0
  };

  const per90 = profileData?.per_90_rates || {
    goals_per_90: player?.Gls_90 ?? (totals.minutes > 0 ? (totals.goals / totals.minutes) * 90 : 0),
    xg_per_90: player?.xG_90 ?? null,
    assists_per_90: player?.Ast_90 ?? (totals.minutes > 0 ? (totals.assists / totals.minutes) * 90 : 0),
    xag_per_90: player?.xAG_90 ?? null,
  };

  const isSharedSeasonXg = Boolean(profileData?.raw_record?.shared_season_xg || profileData?.raw_record?._shared_season_xg || playerObj.shared_season_xg);
  const hasTrackedXg = totals.expected_goals !== null && totals.expected_goals !== undefined && !isSharedSeasonXg;
  const deltaObj = hasTrackedXg
    ? formatGoalsMinusXG(totals.goals - totals.expected_goals)
    : { glyph: '·', text: isSharedSeasonXg ? 'Unsplit transfer xG' : 'xG not tracked', isOver: false, isUnder: false };
  const hasProg = totals.progressive_carries !== null && totals.progressive_carries !== undefined &&
    totals.progressive_passes !== null && totals.progressive_passes !== undefined;
  const progTotal = hasProg ? totals.progressive_carries + totals.progressive_passes : null;
  const gaTotal = (totals.goals || 0) + (totals.assists || 0);

  const autoSummary = generateProfileSummary(profileData?.raw_record || player);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Fallback percentiles data if dedicated endpoint not yet populated
  const defaultPercentilesData = [
    { metric: 'Gls_90', label: 'Goals / 90', group: 'Scoring', value: per90.goals_per_90, percentile: profileData?.percentiles?.goals_per_90?.percentile ?? null },
    { metric: 'xG_90', label: 'Expected Goals / 90', group: 'Scoring', value: hasTrackedXg ? per90.xg_per_90 : null, percentile: profileData?.percentiles?.xg_per_90?.percentile ?? null },
    { metric: 'Ast_90', label: 'Assists / 90', group: 'Creating', value: per90.assists_per_90, percentile: profileData?.percentiles?.assists_per_90?.percentile ?? null },
    { metric: 'xAG_90', label: 'Expected Assisted Goals / 90', group: 'Creating', value: per90.xag_per_90, percentile: profileData?.percentiles?.xag_per_90?.percentile ?? null },
    { metric: 'PrgC_90', label: 'Progressive Carries / 90', group: 'Progressing', value: totals.progressive_carries != null && totals.nineties > 0 ? (totals.progressive_carries / totals.nineties) : null, percentile: profileData?.percentiles?.progressive_carries?.percentile ?? null },
    { metric: 'PrgP_90', label: 'Progressive Passes / 90', group: 'Progressing', value: totals.progressive_passes != null && totals.nineties > 0 ? (totals.progressive_passes / totals.nineties) : null, percentile: profileData?.percentiles?.progressive_passes?.percentile ?? null }
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
            <span>
              {hasTrackedXg
                ? `${deltaObj.glyph} ${deltaObj.text} vs xG (${formatDecimal(totals.expected_goals, 1)} xG)`
                : 'xG not tracked for this season'}
            </span>
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
            {progTotal !== null ? progTotal : '—'}
          </div>
          <div className="text-xs text-[var(--mute)] mt-2">
            <span>
              {hasProg
                ? `${totals.progressive_carries} carries + ${totals.progressive_passes} passes`
                : 'Progression not tracked in this season'}
            </span>
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

      {/* 5. Multi-Season Recharts xG vs Actual Goals Efficiency Scatter Plot */}
      <PlayerXgEfficiencyChart
        playerId={playerId}
        playerName={identity.name}
        activeSeason={activeSeason}
        preloadedHistory={careerHistoryData}
        allowPlayerSwitch={false}
      />

      {/* 5b. Positional Finishing Scatter Plot with Highlighted Dot & Parity Line */}
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
