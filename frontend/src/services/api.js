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
  
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
  getMetadata: (season) => request(`/metadata${season ? `?season=${encodeURIComponent(season)}` : ''}`),
  getMetrics: () => request('/metrics'),

  // Multi-season storage endpoints
  getSeasons: () => request('/seasons'),
  getActiveSeason: () => request('/seasons/active'),
  setActiveSeason: (season) => request('/seasons/active', {
    method: 'POST',
    body: JSON.stringify({ season })
  }),
  getSeasonDetails: (id) => request(`/seasons/${encodeURIComponent(id)}`),
  getSeasonPresets: () => request('/seasons/presets'),
  verifyBaseline: () => request('/seasons/baseline/verify'),
  importSeason: (formDataOrData) => {
    const isForm = typeof FormData !== 'undefined' && formDataOrData instanceof FormData;
    return request('/seasons/import', {
      method: 'POST',
      body: isForm ? formDataOrData : JSON.stringify(formDataOrData)
    });
  },

  getDashboard: (competition, season) => {
    const params = new URLSearchParams();
    if (competition) params.append('competition', competition);
    if (season) params.append('season', season);
    const qs = params.toString();
    return request(`/dashboard${qs ? `?${qs}` : ''}`);
  },

  getCompetitions: (season) => {
    const query = season ? `?season=${encodeURIComponent(season)}` : '';
    return request(`/competitions${query}`);
  },

  getTeams: (competition, season) => {
    const params = new URLSearchParams();
    if (competition) params.append('competition', competition);
    if (season) params.append('season', season);
    const qs = params.toString();
    return request(`/teams${qs ? `?${qs}` : ''}`);
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

  getPlayer: (id, season) => {
    const query = season ? `?season=${encodeURIComponent(season)}` : '';
    return request(`/players/${encodeURIComponent(id)}${query}`);
  },

  comparePlayers: (playerIds, season) => {
    return request('/players/compare', {
      method: 'POST',
      body: JSON.stringify({ player_ids: playerIds, season })
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

  getLegacyTeams: async (league, season) => {
    // 1. Query param is decoded reliably across serverless WSGI environments (Vercel)
    try {
      const query = `/teams?competition=${encodeURIComponent(league)}${season ? `&season=${encodeURIComponent(season)}` : ''}`;
      const queryRes = await request(query);
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
    const pathQuery = `/teams/${encodeURIComponent(league)}${season ? `?season=${encodeURIComponent(season)}` : ''}`;
    const pathRes = await request(pathQuery);
    if (Array.isArray(pathRes)) return pathRes;
    if (pathRes?.success && Array.isArray(pathRes.data)) return pathRes.data;
    return [];
  },

  getLegacyPlayersByTeam: async (league, team, season) => {
    // 1. Query param endpoint fallback with all=true
    try {
      const query = `/players?competition=${encodeURIComponent(league)}&team=${encodeURIComponent(team)}&all=true${season ? `&season=${encodeURIComponent(season)}` : ''}`;
      const queryRes = await request(query);
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
    const pathQuery = `/players/${encodeURIComponent(league)}/${encodeURIComponent(team)}${season ? `?season=${encodeURIComponent(season)}` : ''}`;
    const pathRes = await request(pathQuery);
    if (Array.isArray(pathRes)) return pathRes;
    if (pathRes?.success && Array.isArray(pathRes.data)) return pathRes.data;
    return [];
  }
};

export default api;
