import React from 'react';

export const ShotMapFigure = ({
  homeTeam = "Arsenal",
  awayTeam = "Chelsea",
  shots = []
}) => {
  // Default shot coordinates normalized to pitch dimensions: 68m width, 52.5m (half pitch depth)
  const defaultShots = [
    { t: "h", x: 34, y: 7, xg: 0.34, g: 1 },
    { t: "h", x: 26, y: 14, xg: 0.11, g: 0 },
    { t: "h", x: 42, y: 18, xg: 0.07, g: 0 },
    { t: "h", x: 31, y: 10, xg: 0.41, g: 1 },
    { t: "h", x: 22, y: 22, xg: 0.05, g: 0 },
    { t: "h", x: 45, y: 15, xg: 0.12, g: 0 },
    { t: "h", x: 38, y: 11, xg: 0.15, g: 0 },
    { t: "h", x: 33, y: 8, xg: 0.28, g: 0 },
    { t: "a", x: 36, y: 9, xg: 0.38, g: 1 },
    { t: "a", x: 28, y: 19, xg: 0.06, g: 0 },
    { t: "a", x: 40, y: 24, xg: 0.08, g: 0 },
    { t: "a", x: 32, y: 16, xg: 0.17, g: 0 },
    { t: "a", x: 20, y: 28, xg: 0.03, g: 0 },
    { t: "a", x: 46, y: 21, xg: 0.07, g: 0 }
  ];

  const matchShots = shots.length > 0 ? shots : defaultShots;

  return (
    <div className="fig not-italic">
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)]">
          Fig. 2 Every shot, one goal at the top
        </h3>
      </div>
      <p className="text-xs text-[var(--mute)] italic mb-3">
        Bigger circles indicate higher xG chances. Solid filled markers represent goals.
      </p>

      <div className="max-w-[420px]">
        <svg viewBox="-4 -5 76 66" className="w-full h-auto font-ser" role="img" aria-label="Shot map figure">
          {/* Half pitch background */}
          <rect x="0" y="0" width="68" height="52.5" fill="var(--panel)" />
          
          {/* Pitch markings */}
          <g fill="none" stroke="var(--mute)" strokeWidth="0.4">
            <rect x="0" y="0" width="68" height="52.5" />
            {/* Penalty box */}
            <rect x="13.84" y="0" width="40.32" height="16.5" />
            {/* 6 yard box */}
            <rect x="24.84" y="0" width="18.32" height="5.5" />
            {/* Goal mouth */}
            <rect x="30.34" y="-1.8" width="7.32" height="1.8" stroke="var(--ink)" strokeWidth="0.6" />
            {/* Penalty spot */}
            <circle cx="34" cy="11" r="0.5" fill="var(--mute)" />
            {/* Penalty arc */}
            <path d="M 26.7 16.5 A 9.15 9.15 0 0 0 41.3 16.5" />
            {/* Center circle */}
            <path d="M 24.85 52.5 A 9.15 9.15 0 0 1 43.15 52.5" />
          </g>

          {/* Shot markers */}
          {matchShots.map((s, idx) => {
            const isHome = s.t === 'h';
            const color = isHome ? "var(--blue)" : "var(--red)";
            const radius = (0.9 + Math.sqrt(s.xg) * 2.8).toFixed(2);
            return (
              <circle
                key={idx}
                cx={s.x}
                cy={s.y}
                r={radius}
                fill={color}
                fillOpacity={s.g ? 1 : 0.18}
                stroke={color}
                strokeWidth="0.35"
              />
            );
          })}

          {/* Legend labels */}
          <text x="2" y="58" fill="var(--blue)" className="font-semibold text-[3.6px] font-ser">
            ● {homeTeam}
          </text>
          <text x="66" y="58" textAnchor="end" fill="var(--red)" className="font-semibold text-[3.6px] font-ser">
            {awayTeam} ●
          </text>
        </svg>
      </div>
    </div>
  );
};

export default ShotMapFigure;
