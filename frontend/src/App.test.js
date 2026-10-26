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
