import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = 'http://localhost:5000';

const LeagueLeaders = ({ onClose }) => {
  const [leaders, setLeaders] = useState(null);
  const [activeCategory, setActiveCategory] = useState('goals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLeagueLeaders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/league-leaders`);
      
      if (response.data.success) {
        setLeaders(response.data.leaders);
      } else {
        setError(response.data.error || 'Failed to fetch league leaders');
      }
    } catch (err) {
      console.error('Error fetching league leaders:', err);
      setError(err.response?.data?.error || err.message || 'Failed to fetch league leaders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeagueLeaders();
  }, [fetchLeagueLeaders]);

  const categories = [
    { key: 'goals', label: 'Goals', icon: '⚽' },
    { key: 'assists', label: 'Assists', icon: '🎯' },
    { key: 'matches', label: 'Matches', icon: '🏃' },
    { key: 'minutes', label: 'Minutes', icon: '⏱️' }
  ];

  const prepareChartData = (category) => {
    if (!leaders || !leaders[category]) return null;

    const data = leaders[category].slice(0, 10); // Top 10
    const statKey = category === 'goals' ? 'Gls' : 
                   category === 'assists' ? 'Ast' :
                   category === 'matches' ? 'MP' : 'Min';

    return {
      labels: data.map(player => player.Player),
      datasets: [
        {
          label: categories.find(c => c.key === category)?.label || category,
          data: data.map(player => player[statKey] || 0),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 205, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(199, 199, 199, 0.8)',
            'rgba(83, 102, 255, 0.8)',
            'rgba(255, 99, 255, 0.8)',
            'rgba(99, 255, 132, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 205, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
            'rgba(255, 99, 255, 1)',
            'rgba(99, 255, 132, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: `Top 10 ${categories.find(c => c.key === activeCategory)?.label || activeCategory} Leaders`
      }
    },
    scales: {
      y: {
        beginAtZero: true
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content league-leaders-modal">
          <div className="loading">
            <div className="spinner"></div>
            <h2>Loading league leaders...</h2>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay">
        <div className="modal-content league-leaders-modal">
          <div className="error">
            <h2>Error</h2>
            <p>{error}</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!leaders) {
    return (
      <div className="modal-overlay">
        <div className="modal-content league-leaders-modal">
          <div className="error">
            <h2>No Data</h2>
            <p>No league leaders data available</p>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const currentLeaders = leaders[activeCategory] || [];
  const chartData = prepareChartData(activeCategory);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content league-leaders-modal" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="leaders-header">
          <h2>League Leaders</h2>
          <p>Top performers across different categories</p>
        </div>

        <div className="category-tabs">
          {categories.map(category => (
            <button
              key={category.key}
              className={activeCategory === category.key ? 'active' : ''}
              onClick={() => setActiveCategory(category.key)}
            >
              <span className="category-icon">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>

        <div className="leaderboard-section">
          <div className="leaderboard-table">
            <h3>
              {categories.find(c => c.key === activeCategory)?.icon} 
              {' '}
              {categories.find(c => c.key === activeCategory)?.label} Leaders
            </h3>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Position</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {currentLeaders.slice(0, 10).map((player, index) => {
                  const statKey = activeCategory === 'goals' ? 'Gls' : 
                                 activeCategory === 'assists' ? 'Ast' :
                                 activeCategory === 'matches' ? 'MP' : 'Min';
                  const value = player[statKey] || 0;
                  
                  return (
                    <tr key={player.Player} className={`rank-${index + 1}`}>
                      <td className="rank">{index + 1}</td>
                      <td className="player-name">{player.Player}</td>
                      <td className="team">{player.Squad}</td>
                      <td className="position">{player.Pos}</td>
                      <td className="stat-value">{value}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="leaderboard-chart">
            <h3>Visualization</h3>
            {chartData && <Bar data={chartData} options={chartOptions} />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeagueLeaders;

