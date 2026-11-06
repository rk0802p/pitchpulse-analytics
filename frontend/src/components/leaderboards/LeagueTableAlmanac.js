import React, { useState } from 'react';

export const LeagueTableAlmanac = ({ teams = [], onSelectTeam }) => {
  // Built from actual standard league data if teams prop passed, or comprehensive default
  const defaultStandings = [
    { rank: 1, name: "Liverpool", p: 28, w: 20, d: 7, l: 1, f: 65, a: 22, gd: 43, pts: 67, xgD: 34.2, luck: 8.8, form: "WWDWW" },
    { rank: 2, name: "Arsenal", p: 28, w: 18, d: 7, l: 3, f: 56, a: 24, gd: 32, pts: 61, xgD: 31.5, luck: 0.5, form: "DWWWL" },
    { rank: 3, name: "Nottingham Forest", p: 28, w: 15, d: 6, l: 7, f: 43, a: 31, gd: 12, pts: 51, xgD: 6.8, luck: 5.2, form: "WDDWW" },
    { rank: 4, name: "Manchester City", p: 28, w: 14, d: 5, l: 9, f: 54, a: 37, gd: 17, pts: 47, xgD: 24.1, luck: -7.1, form: "LWWLW" },
    { rank: 5, name: "Chelsea", p: 28, w: 13, d: 7, l: 8, f: 51, a: 38, gd: 13, pts: 46, xgD: 15.6, luck: -2.6, form: "DDWLD" },
    { rank: 6, name: "Newcastle United", p: 28, w: 13, d: 6, l: 9, f: 44, a: 35, gd: 9, pts: 45, xgD: 10.2, luck: -1.2, form: "LWDLW" },
    { rank: 7, name: "Aston Villa", p: 28, w: 12, d: 7, l: 9, f: 41, a: 42, gd: -1, pts: 43, xgD: -2.4, luck: 1.4, form: "DDDWL" },
    { rank: 8, name: "AFC Bournemouth", p: 28, w: 12, d: 7, l: 9, f: 43, a: 36, gd: 7, pts: 43, xgD: 5.4, luck: 1.6, form: "LLWDW" },
    { rank: 9, name: "Fulham", p: 28, w: 11, d: 8, l: 9, f: 41, a: 38, gd: 3, pts: 41, xgD: 1.2, luck: 1.8, form: "DLDDW" },
    { rank: 10, name: "Brighton", p: 28, w: 10, d: 10, l: 8, f: 42, a: 42, gd: 0, pts: 40, xgD: 3.8, luck: -3.8, form: "LLLWD" },
    { rank: 11, name: "Tottenham Hotspur", p: 28, w: 11, d: 4, l: 13, f: 52, a: 42, gd: 10, pts: 37, xgD: 14.5, luck: -4.5, form: "DLLLD" },
    { rank: 12, name: "Brentford", p: 28, w: 11, d: 4, l: 13, f: 48, a: 46, gd: 2, pts: 37, xgD: 4.1, luck: -2.1, form: "LLLDL" }
  ];

  const tableData = teams && teams.length > 0 ? teams : defaultStandings;

  const [sortKey, setSortKey] = useState("pts");
  const [sortDir, setSortDir] = useState(-1); // -1 desc, 1 asc

  const columns = [
    { key: "p", label: "P", title: "Played" },
    { key: "w", label: "W", title: "Won" },
    { key: "d", label: "D", title: "Drawn" },
    { key: "l", label: "L", title: "Lost" },
    { key: "f", label: "F", title: "Goals for" },
    { key: "a", label: "A", title: "Goals against" },
    { key: "gd", label: "GD", title: "Goal difference" },
    { key: "pts", label: "Pts", title: "Points" },
    { key: "xgD", label: "xGD", title: "Expected goal difference" },
    { key: "luck", label: "GD vs xGD", title: "Goal difference minus expected goal difference" },
  ];

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(-sortDir);
    } else {
      setSortKey(key);
      setSortDir(key === "a" ? 1 : -1);
    }
  };

  const sortedRows = [...tableData].sort((a, b) => {
    const valA = a[sortKey] ?? 0;
    const valB = b[sortKey] ?? 0;
    if (valA === valB) {
      return (b.pts ?? 0) - (a.pts ?? 0);
    }
    return (valA - valB) * sortDir;
  });

  const formatDelta = (val, dec = 0) => {
    if (val === undefined || val === null) return "—";
    const sign = val > 0 ? "+" : val < 0 ? "−" : "";
    return `${sign}${Math.abs(val).toFixed(dec)}`;
  };

  return (
    <div className="my-6">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-t-2 border-[var(--ink)] pt-3 pb-1">
        <h2 className="font-disp font-bold text-2xl sm:text-3xl tracking-tight text-[var(--ink)]">
          Table 1. Division Standings & Expected Performance
        </h2>
        <span className="text-xs italic text-[var(--mute)]">
          Select a heading to re-sort columns.
        </span>
      </div>
      <p className="text-xs text-[var(--mute)] italic mb-4 max-w-2xl">
        The last two columns compare actual scoreline goal difference against expected goal difference (xGD). A large positive figure indicates high finishing efficiency or fortunate opposition finishing.
      </p>

      <div className="overflow-x-auto border-t border-[var(--ink)]">
        <table className="w-full min-w-[680px] border-collapse font-ser text-sm">
          <thead>
            <tr className="border-b border-[var(--ink)]">
              <th className="text-left py-2 px-2.5 font-semibold text-xs text-[var(--ink)] sticky left-0 bg-[var(--paper)]">
                Club
              </th>
              {columns.map(col => {
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    title={col.title}
                    className={`py-2 px-2 text-right font-semibold text-xs cursor-pointer select-none whitespace-nowrap transition-colors ${
                      isActive ? 'text-[var(--red)] underline decoration-2 underline-offset-4' : 'text-[var(--ink)] hover:text-[var(--blue)]'
                    }`}
                  >
                    {col.label} {isActive && (sortDir === -1 ? '▼' : '▲')}
                  </th>
                );
              })}
              <th className="text-left py-2 px-2.5 font-semibold text-xs text-[var(--ink)]">
                Form
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((team, idx) => {
              const isEuropean = team.rank <= 4;
              const isRelegation = team.rank >= 18;
              return (
                <tr 
                  key={team.name || idx} 
                  onClick={() => onSelectTeam && onSelectTeam(team)}
                  className="hover:bg-[var(--panel)] transition-colors cursor-pointer group"
                >
                  <td className="text-left py-2 px-2.5 dotted-rule sticky left-0 bg-[var(--paper)] group-hover:bg-[var(--panel)] whitespace-nowrap">
                    <span className="inline-block w-6 text-xs text-[var(--mute)] font-sans">
                      {team.rank || idx + 1}
                    </span>
                    <span className="font-semibold text-[var(--ink)]">
                      {team.name}
                    </span>
                    {isEuropean && <span className="text-[var(--blue)] ml-1 font-bold">†</span>}
                    {isRelegation && <span className="text-[var(--red)] ml-1 font-bold">‡</span>}
                  </td>

                  <td className="text-right py-2 px-2 dotted-rule">{team.p}</td>
                  <td className="text-right py-2 px-2 dotted-rule">{team.w}</td>
                  <td className="text-right py-2 px-2 dotted-rule">{team.d}</td>
                  <td className="text-right py-2 px-2 dotted-rule">{team.l}</td>
                  <td className="text-right py-2 px-2 dotted-rule">{team.f}</td>
                  <td className="text-right py-2 px-2 dotted-rule">{team.a}</td>

                  <td className={`text-right py-2 px-2 dotted-rule font-medium ${
                    team.gd > 0 ? 'text-[var(--blue)]' : team.gd < 0 ? 'text-[var(--red)]' : ''
                  }`}>
                    {formatDelta(team.gd, 0)}
                  </td>

                  <td className="text-right py-2 px-2 dotted-rule font-bold text-[var(--ink)]">
                    {team.pts}
                  </td>

                  <td className={`text-right py-2 px-2 dotted-rule ${
                    team.xgD > 0 ? 'text-[var(--blue)]' : team.xgD < 0 ? 'text-[var(--red)]' : ''
                  }`}>
                    {formatDelta(team.xgD, 1)}
                  </td>

                  <td className={`text-right py-2 px-2 dotted-rule ${
                    team.luck > 1.5 ? 'text-[var(--blue)]' : team.luck < -1.5 ? 'text-[var(--red)]' : ''
                  }`}>
                    {formatDelta(team.luck, 1)}
                  </td>

                  <td className="text-left py-2 px-2.5 dotted-rule whitespace-nowrap">
                    <span className="font-mono text-xs tracking-wider">
                      {(team.form || "WWDWW").split("").map((c, i) => (
                        <span 
                          key={i} 
                          className={`inline-block w-4 text-center font-bold ${
                            c === 'W' ? 'text-[var(--blue)]' : c === 'L' ? 'text-[var(--red)]' : 'text-[var(--mute)]'
                          }`}
                        >
                          {c}
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-[var(--mute)] italic space-y-1">
        <p><span className="text-[var(--blue)] font-bold">†</span> Places in the European continental tournament.</p>
        <p><span className="text-[var(--red)] font-bold">‡</span> Relegation zone.</p>
      </div>
    </div>
  );
};

export default LeagueTableAlmanac;
