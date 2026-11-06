import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  X, 
  Check, 
  Share2, 
  Copy, 
  ArrowLeftRight,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  formatMinutes, 
  formatDecimal, 
  formatGoalsMinusXG, 
  formatNumber 
} from '../../utils/metricFormatters';

export const ComparisonMatrix = ({
  players = [],
  onRemovePlayer,
  onAddPlayer,
  allAvailablePlayers = [],
  activeSeason = "2024-2025"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copiedVerdict, setCopiedVerdict] = useState(false);
  const [compareTab, setCompareTab] = useState('raw'); // 'raw' | 'per90' | 'percentiles'

  const searchResults = searchTerm.trim().length > 1
    ? allAvailablePlayers.filter(p => 
        p.Player?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !players.some(sel => (sel.id || sel.Player) === (p.id || p.Player))
      ).slice(0, 6)
    : [];

  const rawMetrics = [
    { key: "Gls", label: "Goals Scored (Gls)", category: "Scoring" },
    { key: "xG", label: "Expected Goals (xG)", category: "Scoring", isDecimal: true },
    { key: "Gls_minus_xG", label: "Goals vs xG (G − xG)", category: "Scoring", isDelta: true },
    { key: "Ast", label: "Assists (Ast)", category: "Playmaking" },
    { key: "xAG", label: "Expected Assists (xAG)", category: "Playmaking", isDecimal: true },
    { key: "PrgC", label: "Progressive Carries", category: "Progression" },
    { key: "PrgP", label: "Progressive Passes", category: "Progression" },
    { key: "PrgR", label: "Progressive Receptions", category: "Progression" },
    { key: "MP", label: "Matches (Apps)", category: "Time" },
    { key: "Min", label: "Minutes Played", category: "Time", isMinutes: true },
  ];

  const per90Metrics = [
    { key: "Gls_90", label: "Goals / 90", isDecimal: true },
    { key: "xG_90", label: "Shot Threat (xG / 90)", isDecimal: true },
    { key: "Ast_90", label: "Assists / 90", isDecimal: true },
    { key: "xAG_90", label: "Creation Quality (xAG / 90)", isDecimal: true },
  ];

  // Dynamic data-driven verdict line (Section 6.5)
  const generateComparisonVerdict = () => {
    if (players.length < 2) return null;
    const p1 = players[0];
    const p2 = players[1];

    const p1Goals = Number(p1.Gls) || 0;
    const p2Goals = Number(p2.Gls) || 0;
    const p1Ast = Number(p1.Ast) || 0;
    const p2Ast = Number(p2.Ast) || 0;
    const p1Xg = Number(p1.xG) || 0;
    const p2Xg = Number(p2.xG) || 0;
    const p1Prg = (Number(p1.PrgC) || 0) + (Number(p1.PrgP) || 0);
    const p2Prg = (Number(p2.PrgC) || 0) + (Number(p2.PrgP) || 0);

    const parts = [];

    if (p1Goals > p2Goals && p1Xg >= p2Xg) {
      parts.push(`${p1.Player} leads on goalscoring and shot threat (${p1Goals} Gls / ${formatDecimal(p1Xg, 1)} xG vs ${p2Goals} / ${formatDecimal(p2Xg, 1)})`);
    } else if (p2Goals > p1Goals && p2Xg >= p1Xg) {
      parts.push(`${p2.Player} leads on goalscoring and shot threat (${p2Goals} Gls / ${formatDecimal(p2Xg, 1)} xG vs ${p1Goals} / ${formatDecimal(p1Xg, 1)})`);
    }

    if (p1Ast > p2Ast) {
      parts.push(`${p1.Player} provides greater creative output (${p1Ast} assists vs ${p2Ast})`);
    } else if (p2Ast > p1Ast) {
      parts.push(`${p2.Player} provides greater creative output (${p2Ast} assists vs ${p1Ast})`);
    }

    if (p1Prg > p2Prg + 15) {
      parts.push(`${p1.Player} carries more progressive territory (${p1Prg} vs ${p2Prg} actions)`);
    } else if (p2Prg > p1Prg + 15) {
      parts.push(`${p2.Player} carries more progressive territory (${p2Prg} vs ${p1Prg} actions)`);
    }

    return parts.length > 0 ? parts.join("; ") + "." : "Both players post highly comparable output across attacking categories.";
  };

  const verdict = generateComparisonVerdict();

  const handleCopySummary = () => {
    if (!verdict) return;
    navigator.clipboard.writeText(`PitchPulse Comparison (${players.map(p => p.Player).join(' vs ')}): ${verdict}`);
    setCopiedVerdict(true);
    setTimeout(() => setCopiedVerdict(false), 2000);
  };

  return (
    <div className="space-y-8 font-ser not-italic">
      {/* 1. Comparison Header & Search Bar */}
      <div className="border-b-2 border-[var(--ink)] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-disp font-bold text-xs uppercase tracking-widest text-[var(--mute)]">
            Head-to-Head Scouting Dossier
          </span>
          <h2 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-0.5">
            Player Comparison
          </h2>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Juxtapose 2 to 4 players by volume totals, rates per 90, and positional percentile ranks.
          </p>
        </div>

        {/* Autocomplete Player Add */}
        <div className="relative w-full md:w-80">
          <div className="relative">
            <input
              type="text"
              placeholder="Search player to add to dossier..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              disabled={players.length >= 4}
              className="w-full border border-[var(--ink)] bg-[var(--paper)] py-1.5 px-3 pr-8 text-xs font-ser text-[var(--ink)] placeholder:italic focus:outline-none focus:bg-[var(--panel)] disabled:opacity-50"
            />
            <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-[var(--mute)]" />
          </div>

          {dropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-[var(--paper)] border-2 border-[var(--ink)] shadow-xl z-50 text-xs">
              {searchResults.map(p => (
                <div
                  key={p.id || p.Player}
                  onClick={() => {
                    if (onAddPlayer) onAddPlayer(p);
                    setSearchTerm('');
                    setDropdownOpen(false);
                  }}
                  className="px-3 py-2 hover:bg-[var(--panel)] cursor-pointer flex justify-between items-center border-b border-[var(--rule)] last:border-b-0"
                >
                  <div>
                    <span className="font-bold text-[var(--ink)]">{p.Player}</span>
                    <span className="text-[11px] text-[var(--mute)] block">{p.Squad || p.Team} • {p.Pos}</span>
                  </div>
                  <span className="font-disp font-bold text-xs uppercase text-[var(--blue)]">+ Add</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="py-20 text-center italic text-[var(--mute)] border-2 border-dashed border-[var(--rule)] p-8">
          <Users className="w-10 h-10 mx-auto text-[var(--mute)] mb-2 opacity-50" />
          <p className="text-base font-semibold text-[var(--ink)] not-italic">Add two to four players to compare them.</p>
          <p className="text-xs mt-1">Use the search box above or click "+ Compare" in the Player Explorer table.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 2. Data-Driven Verdict Card */}
          {verdict && (
            <div className="p-3.5 bg-[var(--panel)] border border-[var(--ink)] rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-disp font-bold uppercase tracking-wider text-[var(--blue)] text-[11px] block">
                  Scouting Verdict:
                </span>
                <p className="italic text-[var(--ink)] leading-snug">
                  {verdict}
                </p>
              </div>
              <button
                onClick={handleCopySummary}
                className="self-start sm:self-auto border border-[var(--rule)] hover:border-[var(--ink)] px-2.5 py-1 text-xs italic bg-[var(--paper)] text-[var(--ink)] rounded-xs shrink-0 flex items-center gap-1"
              >
                {copiedVerdict ? <Check className="w-3 h-3 text-[var(--blue)]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedVerdict ? 'Copied' : 'Copy Verdict'}</span>
              </button>
            </div>
          )}

          {/* 3. View Mode Toggle (Totals vs Rates per 90) */}
          <div className="flex items-center justify-between border-b border-[var(--rule)] pb-2 text-xs">
            <div className="flex gap-2">
              <button
                onClick={() => setCompareTab('raw')}
                className={`font-disp font-bold text-xs uppercase px-3 py-1 border transition-colors ${
                  compareTab === 'raw' 
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' 
                    : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                Volume Totals
              </button>
              <button
                onClick={() => setCompareTab('per90')}
                className={`font-disp font-bold text-xs uppercase px-3 py-1 border transition-colors ${
                  compareTab === 'per90' 
                    ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' 
                    : 'border-[var(--rule)] text-[var(--ink)] hover:bg-[var(--panel)]'
                }`}
              >
                Standardised Rates / 90
              </button>
            </div>
            <span className="text-[11px] italic text-[var(--mute)] hidden sm:inline">
              ★ Marks the cohort leader for each metric
            </span>
          </div>

          {/* 4. Comparison Table */}
          <div className="overflow-x-auto border-t border-[var(--ink)]">
            <table className="w-full min-w-[650px] border-collapse text-xs font-ser">
              <thead>
                <tr className="border-b-2 border-[var(--ink)] bg-[var(--panel)]">
                  <th className="text-left py-3 px-3 font-disp font-bold text-xs uppercase text-[var(--mute)] w-1/3">
                    Metric Category
                  </th>
                  {players.map((p, idx) => (
                    <th key={p.id || idx} className="text-center py-3 px-3 relative border-l border-[var(--rule)]">
                      <button
                        onClick={() => onRemovePlayer && onRemovePlayer(p)}
                        className="absolute top-2 right-2 text-[var(--mute)] hover:text-[var(--red)] p-0.5"
                        title="Remove player"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="font-disp font-extrabold text-2xl text-[var(--ink)] leading-none mt-1">
                        {p.Player}
                      </div>
                      <div className="text-[11px] italic text-[var(--mute)] mt-0.5 font-normal">
                        {p.Squad || p.Team} • {p.Pos}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(compareTab === 'raw' ? rawMetrics : per90Metrics).map((m) => {
                  const numValues = players.map(p => {
                    const raw = p[m.key];
                    if (raw === null || raw === undefined) return -Infinity;
                    return Number(raw) || 0;
                  });
                  const maxVal = Math.max(...numValues);

                  return (
                    <tr key={m.key} className="hover:bg-[var(--panel)] transition-colors">
                      <td className="text-left py-2.5 px-3 dotted-rule font-medium text-[var(--ink)]">
                        {m.label}
                      </td>

                      {players.map((p, pIdx) => {
                        const rawVal = p[m.key];
                        const numVal = Number(rawVal) || 0;
                        const isBest = numValues.length > 1 && numVal === maxVal && maxVal > 0;

                        return (
                          <td 
                            key={p.id || pIdx} 
                            className={`text-center py-2.5 px-3 dotted-rule border-l border-[var(--rule)] ${
                              isBest ? 'bg-[var(--paper)] font-bold text-[var(--blue)]' : 'text-[var(--ink)]'
                            }`}
                          >
                            <span className="font-disp text-lg">
                              {m.isMinutes 
                                ? formatMinutes(rawVal)
                                : m.isDelta
                                ? formatGoalsMinusXG(rawVal).text
                                : m.isDecimal
                                ? formatDecimal(rawVal, m.key.includes('90') ? 2 : 1)
                                : rawVal ?? '—'}
                            </span>
                            {isBest && (
                              <span className="ml-1 text-[11px] font-bold text-[var(--blue)]" title="Cohort Leader">
                                ★
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonMatrix;
