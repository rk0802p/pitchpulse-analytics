import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import PlayerProfile from './components/PlayerProfile';
import PlayerComparison from './components/PlayerComparison';
import LeagueLeaders from './components/LeagueLeaders';

const API_BASE_URL = 'http://localhost:5000';

function App() {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiStatus, setApiStatus] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  // Modal states
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerComparison, setShowPlayerComparison] = useState(false);
  const [showLeagueLeaders, setShowLeagueLeaders] = useState(false);

  // Load initial data (API status and leagues)
  useEffect(() => {
    const initializeApp = async () => {
      setLoading(true);
      setError(null);

      try {
        // Check API status
        const statusResponse = await axios.get(`${API_BASE_URL}/api/`);
        setApiStatus(statusResponse.data);

        // Load leagues
        const leaguesResponse = await axios.get(`${API_BASE_URL}/api/leagues`);
        
        if (leaguesResponse.data.error) {
          setError(`Backend Error: ${leaguesResponse.data.message || leaguesResponse.data.error}`);
          return;
        }

        setLeagues(leaguesResponse.data);
        console.log('Loaded leagues:', leaguesResponse.data);

      } catch (err) {
        console.error('Initialization error:', err);
        setError(`Failed to initialize: ${err.message}`);
        setApiStatus('API connection failed');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Load teams when league is selected
  useEffect(() => {
    const loadTeams = async () => {
      if (!selectedLeague) {
        setTeams([]);
        setSelectedTeam('');
        setPlayers([]);
        return;
      }

      setLoadingTeams(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/teams/${encodeURIComponent(selectedLeague)}`);
        setTeams(response.data);
        setSelectedTeam(''); // Reset team selection
        setPlayers([]); // Reset players
        console.log(`Loaded teams for ${selectedLeague}:`, response.data);
      } catch (err) {
        console.error('Error loading teams:', err);
        setError(`Failed to load teams for ${selectedLeague}: ${err.message}`);
      } finally {
        setLoadingTeams(false);
      }
    };

    loadTeams();
  }, [selectedLeague]);

  // Load players when team is selected
  useEffect(() => {
    const loadPlayers = async () => {
      if (!selectedLeague || !selectedTeam) {
        setPlayers([]);
        return;
      }

      setLoadingPlayers(true);
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/players/${encodeURIComponent(selectedLeague)}/${encodeURIComponent(selectedTeam)}`
        );
        setPlayers(response.data);
        console.log(`Loaded players for ${selectedTeam}:`, response.data);
      } catch (err) {
        console.error('Error loading players:', err);
        setError(`Failed to load players for ${selectedTeam}: ${err.message}`);
      } finally {
        setLoadingPlayers(false);
      }
    };

    loadPlayers();
  }, [selectedLeague, selectedTeam]);

  // Handler functions
  const handlePlayerClick = useCallback((player) => {
    setSelectedPlayer(player);
  }, []);

  const closePlayerProfile = useCallback(() => {
    setSelectedPlayer(null);
  }, []);

  const handleShowPlayerComparison = useCallback(() => {
    setShowPlayerComparison(true);
  }, []);

  const closePlayerComparison = useCallback(() => {
    setShowPlayerComparison(false);
  }, []);

  const handleShowLeagueLeaders = useCallback(() => {
    setShowLeagueLeaders(true);
  }, []);

  const closeLeagueLeaders = useCallback(() => {
    setShowLeagueLeaders(false);
  }, []);

  if (loading) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>Football Analysis Platform</h1>
          <p>Loading...</p>
        </header>
        <div className="loading">
          <div className="spinner"></div>
          <h2>Initializing Application...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>Football Analysis Platform</h1>
        <p>API Status: {apiStatus}</p>
        
        {/* Navigation buttons */}
        <div className="tab-nav">
          <button onClick={handleShowPlayerComparison}>
            🔍 Compare Players
          </button>
          <button onClick={handleShowLeagueLeaders}>
            🏆 League Leaders
          </button>
        </div>
      </header>
      
      <main className="main-content">
        {error && (
          <div className="error">
            <h2>⚠️ Error</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Refresh Page</button>
          </div>
        )}

        {/* Step 1: League Selection */}
        <div className="selection-step">
          <h2>🏆 Select a League</h2>
          <div className="leagues-grid">
            {leagues.map(league => (
              <div 
                key={league}
                className={`league-card ${selectedLeague === league ? 'selected' : ''}`}
                onClick={() => setSelectedLeague(league)}
              >
                <h3>{league}</h3>
                {selectedLeague === league && <div className="selected-indicator">✓ Selected</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Step 2: Team Selection */}
        {selectedLeague && (
          <div className="selection-step">
            <h2>🏟️ Select a Team from {selectedLeague}</h2>
            {loadingTeams ? (
              <div className="loading-inline">
                <div className="spinner"></div>
                <span>Loading teams...</span>
              </div>
            ) : (
              <div className="teams-grid">
                {teams.map(team => (
                  <div 
                    key={team}
                    className={`team-card ${selectedTeam === team ? 'selected' : ''}`}
                    onClick={() => setSelectedTeam(team)}
                  >
                    <h4>{team}</h4>
                    {selectedTeam === team && <div className="selected-indicator">✓ Selected</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Players Display */}
        {selectedLeague && selectedTeam && (
          <div className="selection-step">
            <h2>👥 Players in {selectedTeam} ({selectedLeague})</h2>
            {loadingPlayers ? (
              <div className="loading-inline">
                <div className="spinner"></div>
                <span>Loading players...</span>
              </div>
            ) : (
              <div className="players-section">
                {players.length > 0 ? (
                  <div className="players-grid">
                    {players.map((player, index) => (
                      <div 
                        key={player.Rk || index} 
                        className="player-card"
                        onClick={() => handlePlayerClick(player)}
                      >
                        <div className="player-header">
                          <h4>{player.Player || 'Unknown Player'}</h4>
                          <span className="player-position">{player.Pos || 'N/A'}</span>
                        </div>
                        <div className="player-stats">
                          <div className="stat-item">
                            <span className="stat-label">Age:</span>
                            <span className="stat-value">{player.Age || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Nationality:</span>
                            <span className="stat-value">{player.Nation || 'N/A'}</span>
                          </div>
                          <div className="stat-item">
                            <span className="stat-label">Born:</span>
                            <span className="stat-value">{player.Born || 'N/A'}</span>
                          </div>
                          {player.MP && (
                            <div className="stat-item">
                              <span className="stat-label">Matches:</span>
                              <span className="stat-value">{player.MP}</span>
                            </div>
                          )}
                          {player.Starts && (
                            <div className="stat-item">
                              <span className="stat-label">Starts:</span>
                              <span className="stat-value">{player.Starts}</span>
                            </div>
                          )}
                          {player.Min && (
                            <div className="stat-item">
                              <span className="stat-label">Minutes:</span>
                              <span className="stat-value">{player.Min}</span>
                            </div>
                          )}
                          {player.Gls !== undefined && (
                            <div className="stat-item">
                              <span className="stat-label">Goals:</span>
                              <span className="stat-value">{player.Gls}</span>
                            </div>
                          )}
                          {player.Ast !== undefined && (
                            <div className="stat-item">
                              <span className="stat-label">Assists:</span>
                              <span className="stat-value">{player.Ast}</span>
                            </div>
                          )}
                        </div>
                        <button className="analysis-button">
                          📊 Analyze Player
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-data">
                    <p>No players found for {selectedTeam}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedPlayer && (
        <PlayerProfile 
          player={selectedPlayer} 
          onClose={closePlayerProfile} 
        />
      )}
      
      {showPlayerComparison && (
        <PlayerComparison 
          onClose={closePlayerComparison} 
        />
      )}
      
      {showLeagueLeaders && (
        <LeagueLeaders 
          onClose={closeLeagueLeaders} 
        />
      )}
    </div>
  );
}

export default App;