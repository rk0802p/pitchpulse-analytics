import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5000';

// Enhanced Diagnostic Component
const DiagnosticComponent = () => {
  const [diagnostics, setDiagnostics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      const results = {};
      
      // Test 1: Check if backend is accessible
      try {
        const statusResponse = await axios.get(`${API_BASE_URL}/api/`);
        results.backendStatus = {
          success: true,
          data: statusResponse.data,
          status: statusResponse.status
        };
      } catch (error) {
        results.backendStatus = {
          success: false,
          error: error.message,
          details: error.response?.data || 'No response'
        };
      }

      // Test 2: Check debug endpoint
      try {
        const debugResponse = await axios.get(`${API_BASE_URL}/api/debug`);
        results.debugInfo = {
          success: true,
          data: debugResponse.data,
          status: debugResponse.status
        };
      } catch (error) {
        results.debugInfo = {
          success: false,
          error: error.message
        };
      }

      // Test 3: Check leagues endpoint
      try {
        const leaguesResponse = await axios.get(`${API_BASE_URL}/api/leagues`);
        results.leaguesEndpoint = {
          success: true,
          dataLength: leaguesResponse.data.length,
          data: leaguesResponse.data,
          status: leaguesResponse.status
        };
      } catch (error) {
        results.leaguesEndpoint = {
          success: false,
          error: error.message,
          details: error.response?.data || 'No response'
        };
      }

      setDiagnostics(results);
      setLoading(false);
    };

    runDiagnostics();
  }, []);

  if (loading) {
    return <div style={{padding: '20px', textAlign: 'center'}}>🔍 Running diagnostics...</div>;
  }

  return (
    <div style={{ padding: '20px', backgroundColor: '#f5f5f5', margin: '20px', borderRadius: '8px' }}>
      <h2>🔍 API Diagnostics</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Backend Status:</h3>
        <div style={{ 
          padding: '10px', 
          backgroundColor: diagnostics.backendStatus?.success ? '#d4edda' : '#f8d7da',
          borderRadius: '5px',
          color: diagnostics.backendStatus?.success ? '#155724' : '#721c24'
        }}>
          {diagnostics.backendStatus?.success ? (
            <>✅ Backend accessible: {JSON.stringify(diagnostics.backendStatus.data)}</>
          ) : (
            <>❌ Backend failed: {diagnostics.backendStatus?.error}</>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>File System Check:</h3>
        <div style={{ 
          padding: '10px', 
          backgroundColor: diagnostics.debugInfo?.success ? '#d4edda' : '#f8d7da',
          borderRadius: '5px',
          color: diagnostics.debugInfo?.success ? '#155724' : '#721c24'
        }}>
          {diagnostics.debugInfo?.success ? (
            <details>
              <summary>✅ File system accessible</summary>
              <pre style={{fontSize: '12px', marginTop: '10px'}}>
                {JSON.stringify(diagnostics.debugInfo.data, null, 2)}
              </pre>
            </details>
          ) : (
            <>❌ Debug failed: {diagnostics.debugInfo?.error}</>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Leagues Data:</h3>
        <div style={{ 
          padding: '10px', 
          backgroundColor: diagnostics.leaguesEndpoint?.success ? '#d4edda' : '#f8d7da',
          borderRadius: '5px',
          color: diagnostics.leaguesEndpoint?.success ? '#155724' : '#721c24'
        }}>
          {diagnostics.leaguesEndpoint?.success ? (
            <>
              ✅ Found {diagnostics.leaguesEndpoint.dataLength} leagues: 
              <br/>
              <strong>{JSON.stringify(diagnostics.leaguesEndpoint.data)}</strong>
            </>
          ) : (
            <>
              ❌ Leagues failed: {diagnostics.leaguesEndpoint?.error}
              <br/>
              Details: {JSON.stringify(diagnostics.leaguesEndpoint?.details)}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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
      </header>
      
      {/* Diagnostic component - remove this after testing */}
      <DiagnosticComponent />
      
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
                      <div key={player.Rk || index} className="player-card">
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
    </div>
  );
}

export default App;