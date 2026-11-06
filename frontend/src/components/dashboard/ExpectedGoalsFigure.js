import React from 'react';

export const ExpectedGoalsFigure = ({ 
  homeTeam = "Arsenal", 
  awayTeam = "Chelsea",
  shots = []
}) => {
  // If no specific shots provided, default to realistic match narrative
  const defaultShots = [
    { t: "h", m: 4, xg: 0.04, g: 0 },
    { t: "h", m: 9, xg: 0.11, g: 0 },
    { t: "a", m: 12, xg: 0.06, g: 0 },
    { t: "h", m: 15, xg: 0.07, g: 0 },
    { t: "a", m: 21, xg: 0.03, g: 0 },
    { t: "h", m: 23, xg: 0.34, g: 1 },
    { t: "h", m: 27, xg: 0.05, g: 0 },
    { t: "h", m: 34, xg: 0.12, g: 0 },
    { t: "a", m: 38, xg: 0.38, g: 1 },
    { t: "h", m: 41, xg: 0.03, g: 0 },
    { t: "a", m: 44, xg: 0.08, g: 0 },
    { t: "h", m: 46, xg: 0.06, g: 0 },
    { t: "a", m: 49, xg: 0.05, g: 0 },
    { t: "h", m: 51, xg: 0.41, g: 1 },
    { t: "h", m: 55, xg: 0.09, g: 0 },
    { t: "h", m: 58, xg: 0.15, g: 0 },
    { t: "a", m: 60, xg: 0.17, g: 0 },
    { t: "h", m: 63, xg: 0.05, g: 0 },
    { t: "a", m: 64, xg: 0.07, g: 0 },
    { t: "h", m: 72, xg: 0.28, g: 0 }
  ];

  const matchShots = shots.length > 0 ? shots : defaultShots;
  const W = 560, H = 220, ml = 34, mr = 110, mt = 12, mb = 28;
  const pw = W - ml - mr, ph = H - mt - mb;

  let hCum = 0, aCum = 0;
  matchShots.forEach(s => {
    if (s.t === 'h') hCum += s.xg;
    else aCum += s.xg;
  });

  const ymax = Math.max(2, Math.ceil(Math.max(hCum, aCum) * 2) / 2);
  const X = (m) => ml + (m / 90) * pw;
  const Y = (v) => mt + ph - (v / ymax) * ph;

  // Build grid
  const gridLines = [];
  for (let v = 0; v <= ymax + 0.01; v += 0.5) {
    gridLines.push(
      <g key={v} className="ax">
        <line x1={ml} x2={ml + pw} y1={Y(v)} y2={Y(v)} stroke="var(--rule)" strokeWidth="1" />
        <text x={ml - 6} y={Y(v) + 4} textAnchor="end" fill="var(--mute)" className="italic text-[11px] font-ser">
          {v.toFixed(1)}
        </text>
      </g>
    );
  }

  // Build team paths
  const buildTeamPath = (teamKey) => {
    let cum = 0;
    let d = `M ${X(0)} ${Y(0)}`;
    const goals = [];

    matchShots
      .filter(s => s.t === teamKey)
      .sort((a, b) => a.m - b.m)
      .forEach(s => {
        cum += s.xg;
        d += ` H ${X(s.m).toFixed(1)} V ${Y(cum).toFixed(1)}`;
        if (s.g) {
          goals.push({ m: s.m, xg: cum });
        }
      });

    d += ` H ${X(90).toFixed(1)}`;
    return { d, cum, goals };
  };

  const homeData = buildTeamPath('h');
  const awayData = buildTeamPath('a');

  return (
    <div className="fig not-italic">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)]">
          Fig. 1 Expected goals, minute by minute
        </h3>
      </div>
      <p className="text-xs text-[var(--mute)] italic mb-3">
        <b>{homeTeam}</b> ({homeData.cum.toFixed(2)} xG) vs <b>{awayTeam}</b> ({awayData.cum.toFixed(2)} xG). Step line indicates chance accumulation.
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-w-[560px] font-ser" role="img" aria-label="Cumulative expected goals chart">
          {/* Y Axis Grid */}
          {gridLines}

          {/* X Axis Marks */}
          {[0, 15, 30, 45, 60, 75, 90].map(m => (
            <text 
              key={m} 
              x={X(m)} 
              y={H - 8} 
              textAnchor="middle" 
              fill="var(--mute)" 
              className="text-[11px] font-ser italic"
            >
              {m}{m === 45 ? ' HT' : ''}
            </text>
          ))}
          {/* Half time rule */}
          <line 
            x1={X(45)} 
            x2={X(45)} 
            y1={mt} 
            y2={mt + ph} 
            stroke="var(--mute)" 
            strokeDasharray="3 4" 
          />

          {/* Home line (Blue) */}
          <path 
            d={homeData.d} 
            fill="none" 
            stroke="var(--blue)" 
            strokeWidth="2.4" 
            strokeLinejoin="miter" 
          />
          {/* Home Goals */}
          {homeData.goals.map((g, idx) => (
            <g key={idx}>
              <circle 
                cx={X(g.m)} 
                cy={Y(g.xg)} 
                r="5" 
                fill="var(--blue)" 
                stroke="var(--paper)" 
                strokeWidth="2" 
              />
              <text 
                x={X(g.m)} 
                y={Y(g.xg) - 8} 
                textAnchor="middle" 
                fill="var(--ink)" 
                className="text-[10px] font-ser italic font-bold"
              >
                {g.m}’
              </text>
            </g>
          ))}

          {/* Away line (Red) */}
          <path 
            d={awayData.d} 
            fill="none" 
            stroke="var(--red)" 
            strokeWidth="2.4" 
            strokeLinejoin="miter" 
          />
          {/* Away Goals */}
          {awayData.goals.map((g, idx) => (
            <g key={idx}>
              <circle 
                cx={X(g.m)} 
                cy={Y(g.xg)} 
                r="5" 
                fill="var(--red)" 
                stroke="var(--paper)" 
                strokeWidth="2" 
              />
              <text 
                x={X(g.m)} 
                y={Y(g.xg) + 16} 
                textAnchor="middle" 
                fill="var(--ink)" 
                className="text-[10px] font-ser italic font-bold"
              >
                {g.m}’
              </text>
            </g>
          ))}

          {/* End Labels */}
          <text 
            x={X(90) + 8} 
            y={Y(homeData.cum) + 4} 
            fill="var(--blue)" 
            className="text-[12px] font-ser font-semibold"
          >
            {homeTeam.slice(0, 10)} {homeData.cum.toFixed(2)}
          </text>
          <text 
            x={X(90) + 8} 
            y={Y(awayData.cum) + (Math.abs(Y(homeData.cum) - Y(awayData.cum)) < 14 ? 16 : 4)} 
            fill="var(--red)" 
            className="text-[12px] font-ser font-semibold"
          >
            {awayTeam.slice(0, 10)} {awayData.cum.toFixed(2)}
          </text>
        </svg>
      </div>
    </div>
  );
};

export default ExpectedGoalsFigure;
