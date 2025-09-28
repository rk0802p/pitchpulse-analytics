import React from 'react';

const TeamBadge = ({ team, onSelect }) => {
  return (
    <div
      className="flex flex-col items-center justify-center text-center cursor-pointer transform hover:scale-110 transition-transform"
      onClick={onSelect}
    >
      <img src={team.logo} alt={team.name} className="h-24 w-24 object-contain" />
      <p className="mt-2 text-white font-oswald">{team.name}</p>
    </div>
  );
};

export default TeamBadge;
