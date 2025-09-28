import React, { useState, useEffect } from 'react';
import LeagueBanner from './components/LeagueBanner';
import TeamBadge from './components/TeamBadge';
import PlayerCard from './components/PlayerCard';

const API_URL = 'http://127.0.0.1:5000/api';

function App() {
  const [leagues, setLeagues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeagues = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/leagues`);
        const data = await response.json();
        setLeagues(data);
      } catch (error) {
        setError(error);
      }
      setLoading(false);
    };
    fetchLeagues();
  }, []);

  const handleLeagueSelect = async (league) => {
    setSelectedLeague(league);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/teams/${league}`);
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      setError(error);
    }
    setLoading(false);
  };

  const handleTeamSelect = async (team) => {
    setSelectedTeam(team);
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/players/${selectedLeague}/${team}`);
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      setError(error);
    }
    setLoading(false);
  };

  const handleBackToLeagues = () => {
    setSelectedLeague(null);
    setSelectedTeam(null);
    setTeams([]);
    setPlayers([]);
  };

  const handleBackToTeams = () => {
    setSelectedTeam(null);
    setPlayers([]);
  };
  
  const backgroundClass = selectedLeague ? 'bg-grass-dark' : 'bg-grass-light';

  return (
    <div className={`App ${backgroundClass} min-h-screen transition-colors duration-500`}>
      <div className="container mx-auto p-4">
        {loading && <p className="text-white text-center">Loading...</p>}
        {error && <p className="text-red-500 text-center">Error: {error.message}</p>}
        
        {!selectedLeague ? (
          <div>
            <h1 className="text-4xl font-bebas-neue text-center text-white mb-8">Select a League</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leagues.map((league) => (
                <LeagueBanner key={league} league={{name: league}} onSelect={() => handleLeagueSelect(league)} />
              ))}
            </div>
          </div>
        ) : !selectedTeam ? (
          <div>
            <button onClick={handleBackToLeagues} className="text-white font-bold mb-4">
              &larr; Back to Leagues
            </button>
            <h1 className="text-4xl font-bebas-neue text-center text-white mb-8">Select a Team</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {teams.map((team) => (
                <TeamBadge key={team} team={{name: team, logo: ''}} onSelect={() => handleTeamSelect(team)} />
              ))}
            </div>
          </div>
        ) : (
          <div>
            <button onClick={handleBackToTeams} className="text-white font-bold mb-4">
              &larr; Back to Teams
            </button>
            <h1 className="text-4xl font-bebas-neue text-center text-white mb-8">{selectedTeam}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map((player) => (
                <PlayerCard key={player.Rk} player={player} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
