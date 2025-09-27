import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Line, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const API_BASE_URL = 'http://localhost:5000';

const PlayerProfile = ({ player, onClose }) => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPlayerProfile = useCallback(async () => {
    if (!player?.Rk) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_BASE_URL}/api/player/${player.Rk}`);
      
      if (response.data.success) {
        setPlayerData(response.data);
      } else {
        setError(response.data.error || 'Failed to fetch player data');
      }
    } catch (err) {
      console.error('Error fetching player profile:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch player data');
    } finally {
      setLoading(false);
    }
  }, [player?.Rk]);

  useEffect(() => {
    fetchPlayerProfile();
  }, [fetchPlayerProfile]);

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content player-profile-modal">
          <div className="loading">
            <div className="spinner"></div>
            <h2>Loading player profile...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content player-profile-modal">
          <div className="error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!playerData) {
    return (
      <div className="modal-overlay">
        <div className="modal-content player-profile-modal">
          <div className="error">
            <h2>No Data</h2>
            <p>No player data available</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const { player: playerInfo, statistics } = playerData;

  // Helpers
  const asNumber = (val, digits = null) => {
    const num = Number(val ?? 0);
    if (Number.isNaN(num)) return 0;
    return digits == null ? num : Number(num.toFixed(digits));
  };



  // Prepare radar chart data
  const radarData = {
    labels: ['Goals', 'Assists', 'Matches', 'Minutes', 'Starts', 'Cards'],
    datasets: [
      {
        label: playerInfo.Player,
        data: [
          statistics.goals || 0,
          statistics.assists || 0,
          statistics.matches_played || 0,
          Math.round((statistics.minutes || 0) / 100), // Scale down minutes
          statistics.starts || 0,
          (statistics.yellow_cards || 0) + (statistics.red_cards || 0)
        ],
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
      }
    ]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: Math.max(
          statistics.goals || 0,
          statistics.assists || 0,
          statistics.matches_played || 0,
          Math.round((statistics.minutes || 0) / 100),
          statistics.starts || 0,
          (statistics.yellow_cards || 0) + (statistics.red_cards || 0)
        ) + 5,
        ticks: {
          stepSize: 1
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold'
          },
          color: '#333'
        }
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.r;
            return `${label}: ${value}`;
          }
        }
      }
    }
  };

  // Prepare performance trends data (mock data for now)
  const performanceData = {
    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
    datasets: [
      {
        label: 'Goals',
        data: [0, 1, 0, 2, 1, 0],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Assists',
        data: [1, 0, 2, 0, 1, 1],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  const performanceOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Performance Trends (Last 6 Weeks)'
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content player-profile-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        {/* Clean Header */}
        <div className="player-header-clean">
          <div className="player-name-main">{playerInfo.Player}</div>
          <div className="player-chips">
            <span className="chip">{playerInfo.Pos}</span>
            <span className="chip">{playerInfo.Squad}</span>
            <span className="chip">{playerInfo.Comp}</span>
            <span className="chip">Age: {playerInfo.Age}</span>
            <span className="chip">{playerInfo.Nation}</span>
          </div>
        </div>

        <div className="player-tabs">
          <button 
            className={activeTab === 'overview' ? 'active' : ''} 
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={activeTab === 'statistics' ? 'active' : ''} 
            onClick={() => setActiveTab('statistics')}
          >
            Statistics
          </button>
          <button 
            className={activeTab === 'performance' ? 'active' : ''} 
            onClick={() => setActiveTab('performance')}
          >
            Performance
          </button>
        </div>

        <div className="player-content">
          {activeTab === 'overview' && (
            <div className="overview-section">
              {/* Top Stats Cards */}
              <div className="top-stats-grid">
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.Gls)}</div>
                  <div className="stat-label">Goals</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.Ast)}</div>
                  <div className="stat-label">Assists</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.MP)}</div>
                  <div className="stat-label">Matches</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.Starts)}</div>
                  <div className="stat-label">Starts</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.Min)}</div>
                  <div className="stat-label">Minutes</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo['90s'])}</div>
                  <div className="stat-label">90s</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.CrdY)}</div>
                  <div className="stat-label">Yellow</div>
                </div>
                <div className="stat-card-clean">
                  <div className="stat-number">{asNumber(playerInfo.CrdR)}</div>
                  <div className="stat-label">Red</div>
                </div>
              </div>

              {/* Progress Bar for Minutes */}
              <div className="progress-section">
                <div className="progress-header">
                  <span>Minutes Played</span>
                  <span>{asNumber(playerInfo.Min)} / 2700</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{width: `${Math.min((asNumber(playerInfo.Min) / 2700) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="statistics-section">
              {/* Playing Time */}
              <div className="stats-section">
                <h3 className="section-title">Playing Time</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Matches Played</span>
                    <span className="stat-value">{asNumber(playerInfo.MP)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Starts</span>
                    <span className="stat-value">{asNumber(playerInfo.Starts)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Minutes</span>
                    <span className="stat-value">{asNumber(playerInfo.Min)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">90s</span>
                    <span className="stat-value">{asNumber(playerInfo['90s'])}</span>
                  </div>
                </div>
              </div>

              {/* Goals & Assists */}
              <div className="stats-section">
                <h3 className="section-title">Goals & Assists</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Goals</span>
                    <span className="stat-value">{asNumber(playerInfo.Gls)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Assists</span>
                    <span className="stat-value">{asNumber(playerInfo.Ast)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">G + A</span>
                    <span className="stat-value">{asNumber(playerInfo['G+A'])}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Non-PK Goals</span>
                    <span className="stat-value">{asNumber(playerInfo['G-PK'])}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Penalty Goals</span>
                    <span className="stat-value">{asNumber(playerInfo.PK)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Penalty Attempts</span>
                    <span className="stat-value">{asNumber(playerInfo.PKatt)}</span>
                  </div>
                </div>
              </div>

              {/* Discipline */}
              <div className="stats-section">
                <h3 className="section-title">Discipline</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Yellow Cards</span>
                    <span className="stat-value">{asNumber(playerInfo.CrdY)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Red Cards</span>
                    <span className="stat-value">{asNumber(playerInfo.CrdR)}</span>
                  </div>
                </div>
              </div>

              {/* Expected Stats */}
              <div className="stats-section">
                <h3 className="section-title">Expected Stats (xG / xA)</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">xG</span>
                    <span className="stat-value">{asNumber(playerInfo.xG, 1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Non-PK xG</span>
                    <span className="stat-value">{asNumber(playerInfo.npxG, 1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">xA</span>
                    <span className="stat-value">{asNumber(playerInfo.xAG, 1)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Non-PK xG + xA</span>
                    <span className="stat-value">{asNumber(playerInfo['npxG+xAG'], 1)}</span>
                  </div>
                </div>
              </div>

              {/* Progression */}
              <div className="stats-section">
                <h3 className="section-title">Progression</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-label">Progressive Carries</span>
                    <span className="stat-value">{asNumber(playerInfo.PrgC)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Progressive Passes</span>
                    <span className="stat-value">{asNumber(playerInfo.PrgP)}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Progressive Receptions</span>
                    <span className="stat-value">{asNumber(playerInfo.PrgR)}</span>
                  </div>
                </div>
              </div>

              {/* Per-90 Metrics Table */}
              <div className="stats-section">
                <h3 className="section-title">Per-90 Metrics</h3>
                <div className="per90-table">
                  <div className="per90-row">
                    <span className="metric-name">Goals/90</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill attacking" 
                        style={{width: `${Math.min((asNumber(playerInfo.Gls_90) / 1.0) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{asNumber(playerInfo.Gls_90, 2)}</span>
                  </div>
                  <div className="per90-row">
                    <span className="metric-name">Assists/90</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill attacking" 
                        style={{width: `${Math.min((asNumber(playerInfo.Ast_90) / 1.0) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{asNumber(playerInfo.Ast_90, 2)}</span>
                  </div>
                  <div className="per90-row">
                    <span className="metric-name">xG/90</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill attacking" 
                        style={{width: `${Math.min((asNumber(playerInfo.xG_90) / 1.0) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{asNumber(playerInfo.xG_90, 2)}</span>
                  </div>
                  <div className="per90-row">
                    <span className="metric-name">xA/90</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill attacking" 
                        style={{width: `${Math.min((asNumber(playerInfo.xAG_90) / 1.0) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{asNumber(playerInfo.xAG_90, 2)}</span>
                  </div>
                  <div className="per90-row">
                    <span className="metric-name">Prog Carries/90</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill progression" 
                        style={{width: `${Math.min((asNumber(playerInfo.PrgC) / 10) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{asNumber(playerInfo.PrgC)}</span>
                  </div>
                  <div className="per90-row">
                    <span className="metric-name">Prog Passes/90</span>
                    <div className="metric-bar">
                      <div 
                        className="metric-fill progression" 
                        style={{width: `${Math.min((asNumber(playerInfo.PrgP) / 10) * 100, 100)}%`}}
                      ></div>
                    </div>
                    <span className="metric-value">{asNumber(playerInfo.PrgP)}</span>
                  </div>
                </div>
              </div>

              <div className="radar-chart">
                <h4>Performance Radar</h4>
                <Radar data={radarData} options={radarOptions} />
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="performance-trends">
              <div className="charts-grid">
                <div className="chart-container">
                  <h4>Goals & Assists Trend</h4>
                  <Line data={performanceData} options={performanceOptions} />
                </div>
                <div className="chart-container">
                  <h4>Performance Radar</h4>
                  <Radar data={radarData} options={radarOptions} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
