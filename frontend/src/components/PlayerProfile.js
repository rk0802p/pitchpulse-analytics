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
        
        <div className="player-header">
          <h2>{playerInfo.Player}</h2>
          <div className="player-details">
            <span>{playerInfo.Pos}</span>
            <span>{playerInfo.Squad}</span>
            <span>{playerInfo.Comp}</span>
            <span>Age: {playerInfo.Age}</span>
            <span>{playerInfo.Nation}</span>
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
              <div className="overview-stats">
                <div className="stat-highlight">
                  <div className="stat-number">{statistics.goals || 0}</div>
                  <div className="stat-label">Goals</div>
                </div>
                <div className="stat-highlight">
                  <div className="stat-number">{statistics.assists || 0}</div>
                  <div className="stat-label">Assists</div>
                </div>
                <div className="stat-highlight">
                  <div className="stat-number">{statistics.matches_played || 0}</div>
                  <div className="stat-label">Matches</div>
                </div>
                <div className="stat-highlight">
                  <div className="stat-number">{Math.round((statistics.minutes || 0) / 90)}</div>
                  <div className="stat-label">90s Played</div>
                </div>
                <div className="stat-highlight">
                  <div className="stat-number">{statistics.starts || 0}</div>
                  <div className="stat-label">Starts</div>
                </div>
                <div className="stat-highlight">
                  <div className="stat-number">{(statistics.yellow_cards || 0) + (statistics.red_cards || 0)}</div>
                  <div className="stat-label">Cards</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="statistics-section">
              <div className="stats-grid">
                <div className="stats-cards">
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.Gls || 0}</div>
                    <div className="stat-label">Goals</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.Ast || 0}</div>
                    <div className="stat-label">Assists</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.MP || 0}</div>
                    <div className="stat-label">Matches</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.Starts || 0}</div>
                    <div className="stat-label">Starts</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.Min || 0}</div>
                    <div className="stat-label">Minutes</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.CrdY || 0}</div>
                    <div className="stat-label">Yellow Cards</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.CrdR || 0}</div>
                    <div className="stat-label">Red Cards</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{playerInfo.xG?.toFixed(1) || 0}</div>
                    <div className="stat-label">Expected Goals</div>
                  </div>
                </div>
                <div className="radar-chart">
                  <h4>Performance Radar</h4>
                  <Radar data={radarData} options={radarOptions} />
                </div>
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
