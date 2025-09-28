import React from 'react';
import './PlayerCardStyles.css';

const getRoleColor = (position) => {
  if (!position) return 'border-gray-500';
  if (position.includes('FW')) return 'border-fw-red';
  if (position.includes('MF')) return 'border-mf-blue';
  if (position.includes('DF')) return 'border-df-green';
  if (position.includes('GK')) return 'border-gk-yellow';
  return 'border-gray-500';
};

const PlayerCard = ({ player }) => {
  const roleColor = getRoleColor(player.Pos);

  return (
    <div className="player-card-container">
      <div className={`player-card border-4 ${roleColor}`}>
        <div className="card-front">
          <div className="player-image-placeholder bg-gray-700 h-32 w-32 rounded-full mx-auto mt-4"></div>
          <h3 className="player-name text-center font-bebas-neue text-2xl mt-4">{player.Player}</h3>
          <div className="player-stats text-center mt-4">
            <div className="grid grid-cols-3 gap-4 text-white">
                <div>
                    <p className="font-bold text-xl">{player.Gls}</p>
                    <p className="text-sm">Goals</p>
                </div>
                <div>
                    <p className="font-bold text-xl">{player.Ast}</p>
                    <p className="text-sm">Assists</p>
                </div>
                <div>
                    <p className="font-bold text-xl">{player.MP}</p>
                    <p className="text-sm">Played</p>
                </div>
            </div>
          </div>
        </div>
        <div className="card-back p-4 text-white">
            <h4 className="font-bebas-neue text-xl mb-4">Advanced Stats</h4>
            <div className="space-y-2">
                <p><strong>Minutes:</strong> {player.Min}</p>
                <p><strong>Starts:</strong> {player.Starts}</p>
                <p><strong>Yellow Cards:</strong> {player.CrdY}</p>
                <p><strong>Red Cards:</strong> {player.CrdR}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerCard;