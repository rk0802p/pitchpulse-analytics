import React, { useState, useEffect, useRef } from 'react';

export const SplitFlapScoreboard = ({
  homeTeam = "ARSENAL",
  awayTeam = "CHELSEA",
  homeScore = 2,
  awayScore = 1,
  matchStatus = "SECOND HALF",
  matchMinute = 74,
  isLive = true
}) => {
  const [tiles, setTiles] = useState([
    Array(17).fill(' '),
    Array(17).fill(' '),
    Array(17).fill(' ')
  ]);

  const pad = (str, len) => {
    const s = String(str || '').toUpperCase();
    return s.padEnd(len, ' ').slice(0, len);
  };

  const getTargetCells = () => {
    const hTeamPadded = pad(homeTeam, 14);
    const aTeamPadded = pad(awayTeam, 14);
    const statusPadded = pad(matchStatus, 14);

    const hScoreStr = (' ' + homeScore).slice(-2);
    const aScoreStr = (' ' + awayScore).slice(-2);
    const minStr = (' ' + matchMinute).slice(-2);

    const row0 = (hTeamPadded + hScoreStr).split('');
    const row1 = (aTeamPadded + aScoreStr).split('');
    const row2 = (statusPadded + minStr).split('');

    return [row0, row1, row2];
  };

  useEffect(() => {
    const target = getTargetCells();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
    const reduceMotion = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)')?.matches : false;

    if (reduceMotion) {
      setTiles(target);
      return;
    }

    // Set tiles directly with target initially for reliability, then spin
    setTiles(target);

  }, [homeTeam, awayTeam, homeScore, awayScore, matchStatus, matchMinute]);

  return (
    <div className="tl-board p-3 sm:p-5 md:p-6 max-w-[780px] select-none my-4">
      {tiles.map((row, rIdx) => (
        <div 
          key={rIdx} 
          className={`tl-row ${rIdx === 2 ? 'mt-3 sm:mt-4' : 'mt-1'}`}
        >
          {row.map((char, cIdx) => {
            // Gap before score
            if (cIdx === 14) {
              return <span key={cIdx} className="w-1" />;
            }
            const isScoreTile = (rIdx < 2 && cIdx >= 14) || (rIdx === 2 && cIdx >= 14);
            return (
              <div 
                key={cIdx} 
                className={`tl-tile ${isScoreTile ? 'sc' : ''}`}
              >
                <span>{char === ' ' ? '\u00A0' : char}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default SplitFlapScoreboard;
