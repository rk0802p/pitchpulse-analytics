import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Target, 
  Zap, 
  Users, 
  Filter, 
  ArrowUpDown, 
  GitCompare,
  Medal,
  Award
} from 'lucide-react';
import api from '../../services/api';
import MetricTooltip from '../common/MetricTooltip';
import { 
  formatMinutes, 
  formatDecimal, 
  formatNumber, 
  formatGoalsMinusXG 
} from '../../utils/metricFormatters';

export const LeaderboardsView = ({
  activeSeason = "2024-2025",
  onSelectPlayer,
  onAddToCompare,
  compareList = []
}) => {
  const [metric, setMetric] = useState('Gls'); // Gls, Ast, xG, xAG, G+A, PrgC, PrgP, PrgR, Gls_90
  const [isPer90, setIsPer90] = useState(false);
  const [selectedComp, setSelectedComp] = useState('');
  const [selectedPos, setSelectedPos] = useState('');
  const [minMinutes, setMinMinutes] = useState(500);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(false);

  const metrics = [
    { id: "Gls", per90Id: "Gls_90", label: "Goals (Gls)", title: "Top Scorers" },
    { id: "Ast", per90Id: "Ast_90", label: "Assists (Ast)", title: "Chief Playmakers" },
    { id: "xG", per90Id: "xG_90", label: "Expected Goals (xG)", title: "Shot Threat Leaders" },
    { id: "xAG", per90Id: "xAG_90", label: "Expected Assists (xAG)", title: "Chance Creation Quality" },
    { id: "G+A", per90Id: "G+A_90", label: "Goals + Assists (G+A)", title: "Goal Contribution Leaders" },
    { id: "PrgC", per90Id: "PrgC", label: "Prog. Carries (PrgC)", title: "Progressive Carry Leaders" },
    { id: "PrgP", per90Id: "PrgP", label: "Prog. Passes (PrgP)", title: "Progressive Passing Leaders" },
    { id: "PrgR", per90Id: "PrgR", label: "Prog. Receptions (PrgR)", title: "Target & Receiving Leaders" },
  ];

  const activeMetricObj = metrics.find(m => m.id === metric) || metrics[0];
  const queryMetric = isPer90 && activeMetricObj.per90Id ? activeMetricObj.per90Id : activeMetricObj.id;

  const formatSeason = activeSeason.replace('-', '/').replace(/20(\d{2})\/20(\d{2})/, '$1/$2');
  const compLabel = selectedComp ? selectedComp.replace(/^[a-z]{2}\s+/, '') : "European Big 5";

  useEffect(() => {
    setLoading(true);
    api.getPlayers({
      season: activeSeason,
      competition: selectedComp,
      position: selectedPos,
      min_minutes: minMinutes,
      sort_by: queryMetric,
      order: 'desc',
      limit: 20
    })
      .then(res => {
        const data = res?.data || (Array.isArray(res) ? res : []);
        setLeaders(data);
      })
      .catch(err => {
        console.error("Failed to load leaders:", err);
        setLeaders([]);
      })
      .finally(() => setLoading(false));
  }, [activeSeason, queryMetric, selectedComp, selectedPos, minMinutes]);

  // Compute standard tie rankings (e.g. 1, 2, 2 -> 1, T-2, T-2)
  const rankedLeaders = leaders.map((player, idx) => {
    const val = player[queryMetric];
    const prev = leaders[idx - 1];
    const next = leaders[idx + 1];
    const isTie = (prev && prev[queryMetric] === val) || (next && next[queryMetric] === val);

    // Calculate actual rank
    let actualRank = idx + 1;
    if (prev && prev[queryMetric] === val) {
      // Find index of the first tied player
      let firstTieIdx = idx;
      while (firstTieIdx > 0 && leaders[firstTieIdx - 1][queryMetric] === val) {
        firstTieIdx--;
      }
      actualRank = firstTieIdx + 1;
    }

    const rankText = isTie ? `T-${actualRank}` : `${actualRank}`;
    return { ...player, rankDisplay: rankText, rankNum: actualRank };
  });

  const podium = rankedLeaders.slice(0, 3);
  const remaining = rankedLeaders.slice(3, 20);

  return (
    <div className="space-y-8 font-ser not-italic">
      {/* 1. Header & Title */}
      <div className="border-b-2 border-[var(--ink)] pb-3">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
              Continental League Podiums & Leaderboards
            </span>
            <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
              {activeMetricObj.title}, {formatSeason}
            </h2>
          </div>
          <span className="text-xs italic text-[var(--mute)]">
            {compLabel} • Minimum {formatMinutes(minMinutes)}
          </span>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {metrics.map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`font-disp font-bold text-xs uppercase px-3 py-1.5 border transition-colors whitespace-nowrap ${
                metric === m.id
                  ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]'
                  : 'bg-[var(--paper)] text-[var(--ink)] border-[var(--rule)] hover:bg-[var(--panel)]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Filters Bar & Per-90 Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-[var(--rule)] text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* League filter */}
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(e.target.value)}
              className="border border-[var(--ink)] bg-[var(--paper)] py-1 px-2 text-xs"
            >
              <option value="">All Big 5 Leagues</option>
              <option value="eng Premier League">Premier League</option>
              <option value="es La Liga">La Liga</option>
              <option value="it Serie A">Serie A</option>
              <option value="de Bundesliga">Bundesliga</option>
              <option value="fr Ligue 1">Ligue 1</option>
            </select>

            {/* Position filter */}
            <select
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
              className="border border-[var(--ink)] bg-[var(--paper)] py-1 px-2 text-xs"
            >
              <option value="">All Positions</option>
              <option value="FW">Forwards (FW)</option>
              <option value="MF">Midfielders (MF)</option>
              <option value="DF">Defenders (DF)</option>
            </select>

            {/* Minimum minutes filter */}
            <select
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="border border-[var(--ink)] bg-[var(--paper)] py-1 px-2 text-xs"
            >
              <option value="0">Min Minutes: 0m</option>
              <option value="270">Min Minutes: 270m</option>
              <option value="500">Min Minutes: 500m</option>
              <option value="900">Min Minutes: 900m</option>
              <option value="1500">Min Minutes: 1,500m</option>
            </select>
          </div>

          {/* Per-90 toggle button */}
          <div className="flex items-center gap-1.5 border border-[var(--ink)] p-0.5 rounded-xs bg-[var(--panel)]">
            <button
              onClick={() => setIsPer90(false)}
              className={`px-2.5 py-0.5 text-xs font-semibold ${!isPer90 ? 'bg-[var(--paper)] text-[var(--ink)] shadow-xs' : 'text-[var(--mute)]'}`}
            >
              Totals
            </button>
            <button
              onClick={() => setIsPer90(true)}
              className={`px-2.5 py-0.5 text-xs font-semibold ${isPer90 ? 'bg-[var(--paper)] text-[var(--ink)] shadow-xs' : 'text-[var(--mute)]'}`}
            >
              Per 90
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center italic text-[var(--mute)]">
          Consulting European statistical ledger...
        </div>
      ) : leaders.length === 0 ? (
        <div className="py-16 text-center italic text-[var(--mute)] border border-dashed border-[var(--rule)]">
          No players match these filters. Try lowering the minimum minutes threshold.
        </div>
      ) : (
        <>
          {/* 2. Top 3 Podium Presentation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {podium.map((p, pIdx) => {
              const mainVal = p[queryMetric];
              const isSelected = compareList.some(c => (c.id || c.Player) === (p.id || p.Player));
              const medalColors = [
                'text-[var(--amber)] border-[var(--amber)]', // 1st
                'text-[var(--mute)] border-[var(--rule)]',    // 2nd
                'text-[var(--red)] border-[var(--red)]'      // 3rd
              ];

              return (
                <div 
                  key={p.id || pIdx}
                  onClick={() => onSelectPlayer && onSelectPlayer(p)}
                  className={`border-2 border-[var(--ink)] bg-[var(--paper)] p-4 rounded-xs shadow-sm hover:bg-[var(--panel)] cursor-pointer transition-all relative ${
                    pIdx === 0 ? 'md:-translate-y-1' : ''
                  }`}
                >
                  <div className="flex items-baseline justify-between border-b border-[var(--rule)] pb-2 mb-3">
                    <span className="font-disp font-extrabold text-2xl text-[var(--ink)]">
                      {p.rankDisplay}
                    </span>
                    <span className="text-xs uppercase font-disp font-bold px-1.5 py-0.5 bg-[var(--panel)] border border-[var(--rule)]">
                      {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                    </span>
                  </div>

                  {/* Player and Club */}
                  <h3 className="font-disp font-extrabold text-3xl text-[var(--ink)] leading-none hover:text-[var(--blue)]">
                    {p.Player}
                  </h3>
                  <div className="text-xs italic text-[var(--mute)] mt-0.5">
                    {p.Squad} • <span className="font-mono">{p.Pos}</span>
                  </div>

                  {/* Hero Metric Number */}
                  <div className="my-4 pt-2 border-t border-dotted border-[var(--rule)]">
                    <span className="font-disp font-extrabold text-5xl text-[var(--ink)] leading-none block">
                      {isPer90 ? formatDecimal(mainVal, 2) : formatNumber(mainVal)}
                    </span>
                    <span className="text-xs font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
                      {isPer90 ? `${activeMetricObj.label} / 90` : activeMetricObj.label}
                    </span>
                  </div>

                  {/* 3 Supporting Figures: Mins, xG, Assists */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--rule)] text-xs font-ser">
                    <div>
                      <span className="text-[10px] text-[var(--mute)] block">Minutes</span>
                      <span className="font-semibold text-[var(--ink)] font-mono">
                        {p.Min ? formatMinutes(p.Min) : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--mute)] block">xG</span>
                      <span className="font-semibold text-[var(--ink)] font-mono">
                        {formatDecimal(p.xG, 1)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--mute)] block">Assists</span>
                      <span className="font-semibold text-[var(--ink)] font-mono">
                        {p.Ast ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Compare Action */}
                  <div className="mt-3 pt-2 border-t border-[var(--rule)] flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCompare && onAddToCompare(p);
                      }}
                      className={`text-xs px-2.5 py-1 border rounded-xs font-ser ${
                        isSelected 
                          ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' 
                          : 'hover:bg-[var(--panel)] border-[var(--rule)] text-[var(--ink)]'
                      }`}
                    >
                      {isSelected ? '✓ In Compare' : '+ Add to Compare'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3. Ranks 4 to 20 Presentation */}
          {remaining.length > 0 && (
            <div className="space-y-3 pt-4 border-t-2 border-[var(--ink)]">
              <h3 className="font-disp font-bold text-2xl text-[var(--ink)] tracking-tight">
                Ranks 4 through {rankedLeaders.length}
              </h3>

              <div className="overflow-x-auto border-t border-[var(--ink)]">
                <table className="w-full min-w-[700px] border-collapse text-xs font-ser">
                  <thead>
                    <tr className="border-b border-[var(--ink)]">
                      <th className="text-left py-2 px-2.5 w-14 font-semibold text-[var(--ink)]">Rank</th>
                      <th className="text-left py-2 px-2.5 font-semibold text-[var(--ink)]">Player & Club</th>
                      <th className="text-left py-2 px-2 font-semibold text-[var(--ink)]">League</th>
                      <th className="text-center py-2 px-2 font-semibold text-[var(--ink)]">Pos</th>
                      <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Playing Time</th>
                      <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">xG</th>
                      <th className="text-right py-2 px-2 font-semibold text-[var(--ink)]">Assists</th>
                      <th className="text-right py-2 px-3 font-semibold text-[var(--ink)] text-sm">{activeMetricObj.label}</th>
                      <th className="text-center py-2 px-2 w-24 font-semibold text-[var(--ink)]">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {remaining.map((p) => {
                      const mainVal = p[queryMetric];
                      const isSelected = compareList.some(c => (c.id || c.Player) === (p.id || p.Player));

                      return (
                        <tr
                          key={p.id || p.Player}
                          onClick={() => onSelectPlayer && onSelectPlayer(p)}
                          className="hover:bg-[var(--panel)] cursor-pointer transition-colors group"
                        >
                          <td className="py-2.5 px-2.5 dotted-rule font-disp font-bold text-sm text-[var(--mute)]">
                            {p.rankDisplay}
                          </td>
                          <td className="py-2.5 px-2.5 dotted-rule">
                            <span className="font-semibold text-[var(--ink)] group-hover:text-[var(--blue)] block">
                              {p.Player}
                            </span>
                            <span className="text-[11px] text-[var(--mute)] block font-normal">
                              {p.Squad}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 dotted-rule text-[var(--mute)]">
                            {p.Comp?.replace(/^[a-z]{2}\s+/, '')}
                          </td>
                          <td className="py-2.5 px-2 dotted-rule text-center font-mono text-[11px]">
                            {p.Pos}
                          </td>
                          <td className="py-2.5 px-2 dotted-rule text-right font-mono">
                            {p.Min ? formatMinutes(p.Min) : '—'}
                          </td>
                          <td className="py-2.5 px-2 dotted-rule text-right text-[var(--mute)] font-mono">
                            {formatDecimal(p.xG, 1)}
                          </td>
                          <td className="py-2.5 px-2 dotted-rule text-right font-mono font-semibold">
                            {p.Ast ?? 0}
                          </td>
                          <td className="py-2.5 px-3 dotted-rule text-right font-disp font-bold text-xl text-[var(--ink)]">
                            {isPer90 ? formatDecimal(mainVal, 2) : formatNumber(mainVal)}
                          </td>
                          <td className="py-2.5 px-2 dotted-rule text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCompare && onAddToCompare(p);
                              }}
                              className={`text-[10px] px-2 py-0.5 border rounded-xs ${
                                isSelected ? 'bg-[var(--ink)] text-[var(--paper)] font-bold' : 'border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)]'
                              }`}
                            >
                              {isSelected ? '✓ In Compare' : '+ Compare'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaderboardsView;
