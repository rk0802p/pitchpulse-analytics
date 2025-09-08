import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [playersData, setPlayersData] = useState([]);
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [playersOfTeam, setPlayersOfTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/`);
        setApiStatus(response.data);
      } catch (err) {
        setApiStatus('API is not running');
      }
    };

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/players`);
        setPlayersData(response.data);
        const uniqueLeagues = [...new Set(response.data.map(player => player.league))];
        setLeagues(uniqueLeagues);
      } catch (err) {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedLeague) {
      const filteredTeams = [...new Set(playersData.filter(player => player.league === selectedLeague).map(player => player.squad))];
      setTeams(filteredTeams);
      setSelectedTeam('');
      setPlayersOfTeam([]);
    }
  }, [selectedLeague, playersData]);

  useEffect(() => {
    if (selectedTeam) {
      const filteredPlayers = playersData.filter(player => player.squad === selectedTeam);
      setPlayersOfTeam(filteredPlayers);
    }
  }, [selectedTeam, playersData]);

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Football Analysis Platform</h1>
        <p>API Status: {apiStatus}</p>
      </header>
      <main>
        <div className="filters">
          <div className="filter-item">
            <label htmlFor="league-select">Choose a league:</label>
            <select id="league-select" value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}>
              <option value="">--Please choose a league--</option>
              {leagues.map(league => (
                <option key={league} value={league}>{league}</option>
              ))}
            </select>
          </div>
          {selectedLeague && (
            <div className="filter-item">
              <label htmlFor="team-select">Choose a team:</label>
              <select id="team-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                <option value="">--Please choose a team--</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {error && <div className="error">{error}</div>}
        {selectedTeam && (
          <div className="players-list">
            <h2>Players of {selectedTeam}</h2>
            <ul>
              {playersOfTeam.map(player => (
                <li key={player.rk}>{player.player} ({player.pos})</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
