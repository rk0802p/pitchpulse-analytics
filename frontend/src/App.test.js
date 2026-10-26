import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import LeagueBanner from './components/LeagueBanner';
import PlayerCard from './components/PlayerCard';
import TeamBadge from './components/TeamBadge';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { status: 'healthy', dataset_ready: true } })
      });
    }
    if (url.includes('/api/metadata')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { season: '2024-2025', total_records: 2854, competitions_count: 5, clubs_count: 96 }
        })
      });
    }
    if (url.includes('/api/dashboard')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            kpis: {
              total_players: 2854,
              total_clubs: 96,
              total_goals: 4806,
              total_assists: 3200,
              total_xg: 4870.2,
              total_xag: 3450.5,
              finishing_delta: -64.2
            },
            top_scorers: [
              { id: 1, Player: 'Erling Haaland', Squad: 'Manchester City', Comp: 'eng Premier League', competition_name: 'Premier League', Gls: 25, xG: 22.4 }
            ],
            overperformers: [
              { id: 2, Player: 'Patrik Schick', Squad: 'Leverkusen', Pos: 'FW', Gls: 21, xG: 12.7, Gls_minus_xG: 8.3 }
            ],
            underperformers: [
              { id: 3, Player: 'Hugo Ekitike', Squad: 'Eint Frankfurt', Pos: 'FW', Gls: 15, xG: 21.6, Gls_minus_xG: -6.6 }
            ],
            scatter_data: [
              { id: 1, Player: 'Erling Haaland', Squad: 'Manchester City', Pos: 'FW', xG: 22.4, xAG: 3.5, Gls: 25, Ast: 3 }
            ],
            progression_leaders: [
              { id: 4, Player: 'Florian Wirtz', Squad: 'Leverkusen', Pos: 'MF', PrgC: 110, PrgP: 135 }
            ]
          }
        })
      });
    }
    if (url.includes('/api/competitions')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 'premier-league', name: 'Premier League', code: 'ENG', teams_count: 20, players_count: 569, total_goals: 850 },
            { id: 'la-liga', name: 'La Liga', code: 'ESP', teams_count: 20, players_count: 583, total_goals: 780 }
          ]
        })
      });
    }
    if (url.includes('/api/leaderboards')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 1, rank: 1, player: 'Erling Haaland', squad: 'Manchester City', competition: 'Premier League', value: 25, xg: 22.4 }
          ]
        })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders PitchPulse Analytics navigation and European Football Intelligence dashboard', async () => {
  await act(async () => {
    render(<App />);
  });

  expect(screen.getAllByText(/PitchPulse/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/European Football Intelligence/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Player Explorer/i).length).toBeGreaterThan(0);

  await waitFor(() => {
    expect(screen.getAllByText(/Premier League/i).length).toBeGreaterThan(0);
  });
});

test('renders Dashboard charts: Finishing Efficiency and Attacking Scatter Matrix', async () => {
  await act(async () => {
    render(<App />);
  });

  await waitFor(() => {
    expect(screen.getByText(/Finishing Efficiency vs Expected Goals/i)).toBeInTheDocument();
    expect(screen.getByText(/Attacking Output Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/Ball Progression Leaders/i)).toBeInTheDocument();
    expect(screen.getByText(/Patrik Schick/i)).toBeInTheDocument();
  });
});

test('renders LeagueBanner with clean league name', () => {
  const mockSelect = jest.fn();
  render(<LeagueBanner league={{ name: 'eng Premier League' }} onSelect={mockSelect} />);
  expect(screen.getByText('Premier League')).toBeInTheDocument();
});

test('renders TeamBadge with fallback crest initials', () => {
  const mockSelect = jest.fn();
  render(<TeamBadge team={{ name: 'Arsenal' }} onSelect={mockSelect} />);
  expect(screen.getByText('Arsenal')).toBeInTheDocument();
  expect(screen.getByText('ARS')).toBeInTheDocument();
});

test('renders PlayerCard with player stats and advanced metrics', () => {
  const dummyPlayer = {
    Rk: 1,
    Player: 'Bukayo Saka',
    Squad: 'Arsenal',
    Pos: 'FW',
    Gls: 10,
    Ast: 8,
    MP: 25,
    Min: 2100,
    xG: 9.4,
    xAG: 7.8,
    PrgC: 45,
    PrgP: 62,
    CrdY: 2,
    CrdR: 0,
  };
  render(<PlayerCard player={dummyPlayer} />);
  expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();
  expect(screen.getByText('25')).toBeInTheDocument();
});
