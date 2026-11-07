import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, GitCompare, Info } from 'lucide-react';
import api from '../../services/api';

export default function SimilarPlayers({
  playerId,
  playerName = '',
  position = 'FW',
  activeSeason = '2024-2025',
  onSelectPlayer = null,
  onCompare = null
}) {
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(false);
  const [metricsUsed, setMetricsUsed] = useState([]);
  const [poolSize, setPoolSize] = useState(0);

  useEffect(() => {
    if (!playerId) return;
    setLoading(true);
    api.getSimilarPlayers(playerId, { season: activeSeason, n: 8 })
      .then((res) => {
        const payload = res?.data || res;
        const list = payload?.similar_players || (Array.isArray(payload) ? payload : (payload?.data || []));
        setSimilar(list);
        setMetricsUsed(payload?.metrics_used || []);
        setPoolSize(payload?.pool_size || list.length);
      })
      .catch((err) => {
        console.error('Failed to load similar players:', err);
      })
      .finally(() => setLoading(false));
  }, [playerId, activeSeason]);

  if (loading) {
    return (
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 rounded-xs animate-pulse font-ser">
        <div className="h-6 bg-[var(--panel)] w-1/3 mb-3"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-[var(--panel)] w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!similar || similar.length === 0) {
    return null;
  }

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 rounded-xs space-y-4 font-ser">
      {/* Header */}
      <div className="border-b border-[var(--ink)] pb-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--blue)]" />
            <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)]">
              Scout: Statistical Matches
            </h3>
          </div>
          <p className="text-xs italic text-[var(--mute)] mt-0.5">
            Players with the most similar statistical profile in European Big 5 ({position} peers, 500+ mins).
          </p>
        </div>

        <div className="text-xs font-mono text-[var(--mute)] bg-[var(--panel)] px-2.5 py-1 border border-[var(--rule)]">
          Pool: {poolSize} players
        </div>
      </div>

      {/* Metrics note */}
      {metricsUsed.length > 0 && (
        <div className="text-[11px] italic text-[var(--mute)] bg-[var(--panel)] p-2.5 border border-[var(--rule)] flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-[var(--mute)] shrink-0 mt-0.5" />
          <span>
            Similarity computed via standardized Euclidean distance across: <strong className="not-italic text-[var(--ink)]">{metricsUsed.join(', ')}</strong>. Scores are relative to the active positional pool.
          </span>
        </div>
      )}

      {/* Table of Matches */}
      <div className="overflow-x-auto border-t border-[var(--ink)]">
        <table className="w-full text-xs font-ser border-collapse">
          <thead>
            <tr className="border-b border-[var(--ink)]">
              <th className="py-2 px-2 text-left font-bold text-[var(--ink)]">Player</th>
              <th className="py-2 px-2 text-left font-bold text-[var(--ink)]">Club</th>
              <th className="py-2 px-2 text-left font-bold text-[var(--ink)]">Comp</th>
              <th className="py-2 px-2 text-center font-bold text-[var(--ink)]">Age</th>
              <th className="py-2 px-2 text-right font-bold text-[var(--ink)]">Minutes</th>
              <th className="py-2 px-3 text-right font-bold text-[var(--ink)]">Match Similarity</th>
              <th className="py-2 px-2 text-center font-bold text-[var(--ink)]">Action</th>
            </tr>
          </thead>
          <tbody>
            {similar.map((peer) => {
              const sim = Number(peer.similarity || 0);
              return (
                <tr key={peer.id || peer.Player} className="hover:bg-[var(--panel)] transition-colors">
                  <td className="py-2 px-2 dotted-rule font-bold text-[var(--ink)]">
                    <button
                      onClick={() => onSelectPlayer && onSelectPlayer(peer)}
                      className="hover:text-[var(--blue)] cursor-pointer text-left"
                    >
                      {peer.Player}
                    </button>
                  </td>
                  <td className="py-2 px-2 dotted-rule">{peer.Squad}</td>
                  <td className="py-2 px-2 dotted-rule text-[var(--mute)]">{peer.Comp}</td>
                  <td className="py-2 px-2 dotted-rule text-center font-mono">{peer.Age}</td>
                  <td className="py-2 px-2 dotted-rule text-right font-mono">{(peer.Min || 0).toLocaleString()}</td>
                  <td className="py-2 px-3 dotted-rule text-right font-mono">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-[var(--paper)] h-2 border border-[var(--rule)] overflow-hidden">
                        <div className="h-full bg-[var(--blue)]" style={{ width: `${Math.min(100, sim)}%` }} />
                      </div>
                      <span className="font-bold text-[var(--ink)]">{sim.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 dotted-rule text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {onCompare && (
                        <button
                          onClick={() => onCompare(peer)}
                          className="border border-[var(--rule)] hover:border-[var(--ink)] p-1 text-[var(--ink)]"
                          title="Compare with this player"
                        >
                          <GitCompare className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectPlayer && onSelectPlayer(peer)}
                        className="border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] px-2 py-0.5 text-[10px] font-disp font-bold uppercase tracking-wider hover:opacity-90 flex items-center gap-1"
                      >
                        <span>Folio</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
