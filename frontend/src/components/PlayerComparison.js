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
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/leagues`);
      if (response.data) {
        // Get teams from the first league for simplicity
        const firstLeague = response.data[0];
        const teamsResponse = await axios.get(`${API_BASE_URL}/api/teams/${encodeURIComponent(firstLeague)}`);
        setTeams(teamsResponse.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError('Failed to fetch teams');
    }
  }, []);

  const fetchTeamPlayers = useCallback(async (team) => {
    if (!team) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get players from the first league for simplicity
      const leaguesResponse = await axios.get(`${API_BASE_URL}/api/leagues`);
      const firstLeague = leaguesResponse.data[0];
      
      const response = await axios.get(
        `${API_BASE_URL}/api/players/${encodeURIComponent(firstLeague)}/${encodeURIComponent(team)}`
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
  }, []);

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

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setSelectedPlayers([]);
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
    fetchTeams();
  }, [fetchTeams]);

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

          {selectedTeam && (
            <div className="players-selection">
              <h3>Select Players (Max 4)</h3>
              {loading ? (
                <div className="loading-inline">
                  <div className="spinner"></div>
                  <span>Loading players...</span>
                </div>
              ) : (
                <div className="players-grid">
                  {players.map(player => (
                    <div 
                      key={player.Rk}
                      className={`player-card ${selectedPlayers.some(p => p.Rk === player.Rk) ? 'selected' : ''}`}
                      onClick={() => togglePlayerSelection(player)}
                    >
                      <div className="player-header">
                        <h4>{player.Player}</h4>
                        <span className="player-position">{player.Pos}</span>
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

          {selectedPlayers.length > 0 && (
            <div className="selected-players">
              <h3>Selected Players ({selectedPlayers.length}/4)</h3>
              <div className="selected-players-list">
                {selectedPlayers.map(player => (
                  <div key={player.Rk} className="selected-player-card">
                    <span>{player.Player}</span>
                    <button 
                      className="remove-player"
                      onClick={() => removePlayer(player.Rk)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button 
                className="analysis-button"
                onClick={comparePlayers}
                disabled={selectedPlayers.length < 2 || loading}
              >
                {loading ? 'Comparing...' : 'Compare Players'}
              </button>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
};

export default PlayerComparison;
