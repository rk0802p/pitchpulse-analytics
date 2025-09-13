import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE_URL = 'http://localhost:5000';

const PlayerComparison = ({ onClose }) => {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState('team'); // 'team' or 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const fetchLeagues = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/leagues`);
      if (response.data) {
        setLeagues(response.data);
      }
    } catch (err) {
      console.error('Error fetching leagues:', err);
      setError('Failed to fetch leagues');
    }
  }, []);

  const searchPlayers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/players`);
      if (response.data) {
        const allPlayers = response.data;
        const filtered = allPlayers.filter(player => 
          player.Player && player.Player.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filtered.slice(0, 20)); // Limit to 20 results
      }
    } catch (err) {
      console.error('Error searching players:', err);
      setError('Failed to search players');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeams = useCallback(async (league) => {
    if (!league) return;
    
    try {
      const teamsResponse = await axios.get(`${API_BASE_URL}/api/teams/${encodeURIComponent(league)}`);
      setTeams(teamsResponse.data);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to fetch teams');
    }
  }, []);

  const fetchTeamPlayers = useCallback(async (team) => {
    if (!team || !selectedLeague) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/players/${encodeURIComponent(selectedLeague)}/${encodeURIComponent(team)}`
      );
      
      if (response.data) {
        setPlayers(response.data);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
      setError('Failed to fetch players');
    } finally {
      setLoading(false);
    }
  }, [selectedLeague]);

  const comparePlayers = useCallback(async () => {
    if (selectedPlayers.length < 2) {
      setError('Please select at least 2 players to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/players/compare`, {
        player_ids: selectedPlayers.map(p => p.Rk)
      });

      if (response.data.success) {
        setComparisonData(response.data);
      } else {
        setError(response.data.error || 'Failed to compare players');
      }
    } catch (err) {
      console.error('Error comparing players:', err);
      setError(err.response?.data?.error || err.message || 'Failed to compare players');
    } finally {
      setLoading(false);
    }
  }, [selectedPlayers]);

  const handleLeagueSelect = (league) => {
    setSelectedLeague(league);
    setSelectedTeam('');
    setPlayers([]);
    // Don't reset selectedPlayers - keep them for comparison
    setComparisonData(null);
    fetchTeams(league);
  };

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    // Don't reset selectedPlayers - keep them for comparison
    setComparisonData(null);
    fetchTeamPlayers(team);
  };

  const togglePlayerSelection = (player) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.some(p => p.Rk === player.Rk);
      if (isSelected) {
        return prev.filter(p => p.Rk !== player.Rk);
      } else if (prev.length < 4) { // Limit to 4 players
        return [...prev, player];
      }
      return prev;
    });
  };

  const removePlayer = (playerId) => {
    setSelectedPlayers(prev => prev.filter(p => p.Rk !== playerId));
  };

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchMode === 'search' && searchQuery) {
        searchPlayers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchMode, searchPlayers]);

  // Prepare comparison chart data
  const prepareChartData = () => {
    if (!comparisonData) return null;

    const { players: comparedPlayers, comparison_data } = comparisonData;
    
    return {
      labels: comparedPlayers.map(p => p.Player),
      datasets: [
        {
          label: 'Goals',
          data: comparison_data.goals,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        },
        {
          label: 'Assists',
          data: comparison_data.assists,
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        },
        {
          label: 'Matches',
          data: comparison_data.matches,
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }
      ]
    };
  };

  const prepareRadarData = () => {
    if (!comparisonData) return null;

    const { players: comparedPlayers } = comparisonData;
    
    return {
      labels: ['Goals', 'Assists', 'Matches', 'Minutes', 'Starts'],
      datasets: comparedPlayers.map((player, index) => ({
        label: player.Player,
        data: [
          player.Gls || 0,
          player.Ast || 0,
          player.MP || 0,
          Math.round((player.Min || 0) / 100), // Scale down minutes
          player.Starts || 0
        ],
        backgroundColor: `rgba(${102 + index * 50}, ${126 + index * 30}, ${234 + index * 20}, 0.2)`,
        borderColor: `rgba(${102 + index * 50}, ${126 + index * 30}, ${234 + index * 20}, 1)`,
        borderWidth: 2,
        pointBackgroundColor: `rgba(${102 + index * 50}, ${126 + index * 30}, ${234 + index * 20}, 1)`,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: `rgba(${102 + index * 50}, ${126 + index * 30}, ${234 + index * 20}, 1)`
      }))
    };
  };

  const chartData = prepareChartData();
  const radarData = prepareRadarData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Player Comparison'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content player-comparison-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="comparison-header">
          <h2>Player Comparison</h2>
          <p>Compare up to 4 players across different metrics</p>
        </div>

        <div className="comparison-content">
          {error && (
            <div className="error">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Selected Players Section - Always visible */}
          {selectedPlayers.length > 0 && (
            <div className="selected-players-persistent">
              <h3>Selected Players ({selectedPlayers.length}/4)</h3>
              <div className="selected-players-list">
                {selectedPlayers.map(player => (
                  <div key={player.Rk} className="selected-player-card">
                    <div className="player-info">
                      <span className="player-name">{player.Player}</span>
                      <span className="player-details">{player.Squad} • {player.Comp}</span>
                    </div>
                    <button 
                      className="remove-player"
                      onClick={() => removePlayer(player.Rk)}
                      title="Remove player"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="selected-players-actions">
                <button 
                  className="compare-button"
                  onClick={comparePlayers}
                  disabled={selectedPlayers.length < 2 || loading}
                >
                  {loading ? 'Comparing...' : `Compare ${selectedPlayers.length} Players`}
                </button>
                <button 
                  className="clear-all-button"
                  onClick={() => setSelectedPlayers([])}
                  disabled={selectedPlayers.length === 0}
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          {/* Comparison Results - Show above player selection */}
          {comparisonData && (
            <div className="comparison-charts">
              <h3>Comparison Results</h3>
              <div className="charts-grid">
                <div className="chart-container">
                  <h4>Goals, Assists & Matches</h4>
                  {chartData && <Bar data={chartData} options={chartOptions} />}
                </div>
                <div className="chart-container">
                  <h4>Performance Radar</h4>
                  {radarData && <Radar data={radarData} options={radarOptions} />}
                </div>
              </div>
            </div>
          )}

          <div className="selection-mode">
            <h3>Choose Selection Mode</h3>
            <div className="mode-buttons">
              <button 
                className={searchMode === 'team' ? 'active' : ''}
                onClick={() => setSearchMode('team')}
              >
                🏟️ Select by Team
              </button>
              <button 
                className={searchMode === 'search' ? 'active' : ''}
                onClick={() => setSearchMode('search')}
              >
                🔍 Search Players
              </button>
            </div>
          </div>

          {searchMode === 'team' ? (
            <>
              <div className="league-selection">
                <h3>Select League</h3>
                <select 
                  value={selectedLeague} 
                  onChange={(e) => handleLeagueSelect(e.target.value)}
                >
                  <option value="">Choose a league...</option>
                  {leagues.map(league => (
                    <option key={league} value={league}>{league}</option>
                  ))}
                </select>
              </div>

              {selectedLeague && (
                <div className="team-selection">
                  <h3>Select Team</h3>
                  <select 
                    value={selectedTeam} 
                    onChange={(e) => handleTeamSelect(e.target.value)}
                  >
                    <option value="">Choose a team...</option>
                    {teams.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <div className="player-search">
              <h3>Search Players</h3>
              <input
                type="text"
                placeholder="Type player name to search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          )}

          {((searchMode === 'team' && selectedLeague && selectedTeam) || (searchMode === 'search' && searchResults.length > 0)) && (
            <div className="players-selection">
              <h3>Select Players (Max 4)</h3>
              {loading ? (
                <div className="loading-inline">
                  <div className="spinner"></div>
                  <span>Loading players...</span>
                </div>
              ) : (
                <div className="players-grid">
                  {(searchMode === 'search' ? searchResults : players).map(player => (
                    <div 
                      key={player.Rk}
                      className={`player-card ${selectedPlayers.some(p => p.Rk === player.Rk) ? 'selected' : ''}`}
                      onClick={() => togglePlayerSelection(player)}
                    >
                      <div className="player-header">
                        <h4>{player.Player}</h4>
                        <span className="player-position">{player.Pos}</span>
                        <span className="player-team">{player.Squad}</span>
                        <span className="player-league">{player.Comp}</span>
                      </div>
                      <div className="player-stats">
                        <div className="stat-item">
                          <span className="stat-label">Goals:</span>
                          <span className="stat-value">{player.Gls || 0}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Assists:</span>
                          <span className="stat-value">{player.Ast || 0}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Matches:</span>
                          <span className="stat-value">{player.MP || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerComparison;
