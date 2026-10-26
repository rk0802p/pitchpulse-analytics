/**
 * Centralized API client for Sports Analytics Dashboard.
 * Configurable via REACT_APP_API_URL environment variable.
 */

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000/api').replace(/\/+$/, '');

class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP error ${response.status}: ${response.statusText}`;
      throw new ApiError(errorMsg, response.status, data?.details);
    }

    return data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    // Network errors (e.g. server offline or CORS failure)
    throw new ApiError(
      `Unable to connect to the Analytics API at ${API_BASE_URL}. Ensure the backend server is running.`,
      0,
      err.message
    );
  }
}

export const api = {
  baseUrl: API_BASE_URL,

  getHealth: () => request('/health'),
  getMetadata: () => request('/metadata'),
  getMetrics: () => request('/metrics'),

  getCompetitions: () => request('/competitions'),

  getTeams: (competition) => {
    const query = competition ? `?competition=${encodeURIComponent(competition)}` : '';
    return request(`/teams${query}`);
  },

  getPlayers: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString();
    return request(`/players${queryString ? `?${queryString}` : ''}`);
  },

  getPlayer: (id) => request(`/players/${encodeURIComponent(id)}`),

  comparePlayers: (playerIds) => {
    return request('/players/compare', {
      method: 'POST',
      body: JSON.stringify({ player_ids: playerIds })
    });
  },

  getLeaderboards: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value);
      }
    });
    const queryString = queryParams.toString();
    return request(`/leaderboards${queryString ? `?${queryString}` : ''}`);
  },

  // Backward compatibility methods
  getLegacyLeagues: () => request('/leagues'),
  getLegacyTeams: (league) => request(`/teams/${encodeURIComponent(league)}`),
  getLegacyPlayersByTeam: (league, team) => request(`/players/${encodeURIComponent(league)}/${encodeURIComponent(team)}`)
};

export default api;
