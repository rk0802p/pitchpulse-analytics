import React from 'react';

const LeagueBanner = ({ league, onSelect }) => {
  return (
    <div
      className="h-24 bg-gray-800 text-white flex items-center justify-center text-2xl font-bebas-neue cursor-pointer transform hover:scale-105 transition-transform"
      onClick={onSelect}
    >
      {league.name}
    </div>
  );
};

export default LeagueBanner;
