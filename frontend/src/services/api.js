/**
 * Centralized API client for Sports Analytics Dashboard.
 * Configurable via REACT_APP_API_URL environment variable.
 */

const getApiBaseUrl = () => {
  const envUrl = process.env.REACT_APP_API_URL;
  if (envUrl && !envUrl.includes('your-backend-url')) {
    return envUrl.replace(/\/+$/, '');
  }
  // Production Vercel or cloud domain
  if (typeof window !== 'undefined' && window.location.hostname && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://sports-analytics-backend.vercel.app/api';
  }
  return 'http://127.0.0.1:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

export class ApiError extends Error {
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

  getDashboard: (competition) => {
    const query = competition ? `?competition=${encodeURIComponent(competition)}` : '';
    return request(`/dashboard${query}`);
  },

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

  // Backward compatibility methods with smart envelope unwrapping & serverless query fallback
  getLegacyLeagues: async () => {
    const res = await request('/leagues');
    if (Array.isArray(res)) return res;
    if (res?.success && Array.isArray(res.data)) return res.data;
    return [];
  },

  getLegacyTeams: async (league) => {
    // 1. Query param is decoded reliably across serverless WSGI environments (Vercel)
    try {
      const queryRes = await request(`/teams?competition=${encodeURIComponent(league)}`);
      if (queryRes?.success && Array.isArray(queryRes.data) && queryRes.data.length > 0) {
        return queryRes.data;
      }
      if (Array.isArray(queryRes) && queryRes.length > 0) {
        return queryRes;
      }
    } catch {
      // Fallback to legacy path endpoint
    }

    // 2. Direct path endpoint fallback
    const pathRes = await request(`/teams/${encodeURIComponent(league)}`);
    if (Array.isArray(pathRes)) return pathRes;
    if (pathRes?.success && Array.isArray(pathRes.data)) return pathRes.data;
    return [];
  },

  getLegacyPlayersByTeam: async (league, team) => {
    // 1. Query param endpoint fallback with all=true
    try {
      const queryRes = await request(`/players?competition=${encodeURIComponent(league)}&team=${encodeURIComponent(team)}&all=true`);
      if (queryRes?.success && Array.isArray(queryRes.data) && queryRes.data.length > 0) {
        return queryRes.data;
      }
      if (Array.isArray(queryRes) && queryRes.length > 0) {
        return queryRes;
      }
    } catch {
      // Fallback
    }

    // 2. Direct path endpoint fallback
    const pathRes = await request(`/players/${encodeURIComponent(league)}/${encodeURIComponent(team)}`);
    if (Array.isArray(pathRes)) return pathRes;
    if (pathRes?.success && Array.isArray(pathRes.data)) return pathRes.data;
    return [];
  }
};

export default api;
