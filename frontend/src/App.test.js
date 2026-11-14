import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import SplitFlapScoreboard from './components/common/SplitFlapScoreboard';
import ExpectedGoalsFigure from './components/dashboard/ExpectedGoalsFigure';
import ShotMapFigure from './components/dashboard/ShotMapFigure';
import LeagueTableAlmanac from './components/leaderboards/LeagueTableAlmanac';
import DataTable from './components/common/DataTable';
import StatCard from './components/common/StatCard';
import PlayerProfileView from './components/profile/PlayerProfileView';
import ComparisonMatrix from './components/compare/ComparisonMatrix';
import LeaderboardsView from './components/leaderboards/LeaderboardsView';
import SquadBrowserView from './components/squad/SquadBrowserView';
import DataManagementView from './components/data/DataManagementView';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/health')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { status: 'healthy', dataset_ready: true } })
      });
    }
    if (url.includes('/api/seasons')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: '2024-2025', name: '2024/25 Regular Season', is_active: true, dataset_status: 'verified_historical' }
          ]
        })
      });
    }
    if (url.includes('/api/metadata')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { season: '2024-2025', total_players: 2854, clubs_count: 96, total_goals: 4806, total_assists: 3429, total_minutes: 3459684 }
        })
      });
    }
    if (url.includes('/api/players')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: [
            { id: 1, Player: 'Erling Haaland', Squad: 'Manchester City', Pos: 'FW', Gls: 25, Ast: 3, xG: 22.4, xAG: 3.2, PrgC: 45, PrgP: 30, PrgR: 90, Min: 2400, MP: 28 },
            { id: 2, Player: 'Bukayo Saka', Squad: 'Arsenal', Pos: 'FW', Gls: 12, Ast: 14, xG: 10.5, xAG: 12.1, PrgC: 80, PrgP: 95, PrgR: 120, Min: 2200, MP: 26 }
          ],
          pagination: { page: 1, limit: 25, total: 2, total_pages: 1 }
        })
      });
    }
    if (url.includes('/api/teams')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City']
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

const flushAsyncEffects = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};

test('renders PitchPulse editorial masthead, split-flap scoreboard, and almanac layout', async () => {
  render(<App />);

  expect(screen.getAllByText(/PitchPulse/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/PitchPulse Analytics/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/Statistical ledger of Europe's top 5 leagues/i)).toBeInTheDocument();

  // Verify scoreboard and editorial figures
  expect(await screen.findByText(/Expected goals, minute by minute/i)).toBeInTheDocument();
  expect(await screen.findByText(/Every shot, one goal at the top/i)).toBeInTheDocument();
  await flushAsyncEffects();
});

test('renders SplitFlapScoreboard with team names', () => {
  render(
    <SplitFlapScoreboard
      homeTeam="ARSENAL"
      awayTeam="CHELSEA"
      homeScore={2}
      awayScore={1}
    />
  );
  expect(screen.getAllByText(/A/i).length).toBeGreaterThan(0);
});

test('renders ExpectedGoalsFigure and ShotMapFigure', () => {
  render(<ExpectedGoalsFigure homeTeam="Arsenal" awayTeam="Chelsea" />);
  expect(screen.getByText(/Fig. 1 Expected goals/i)).toBeInTheDocument();

  render(<ShotMapFigure homeTeam="Arsenal" awayTeam="Chelsea" />);
  expect(screen.getByText(/Fig. 2 Every shot/i)).toBeInTheDocument();
});

test('renders LeagueTableAlmanac with sortable standings', () => {
  render(<LeagueTableAlmanac />);
  expect(screen.getByText(/Division Standings & Expected Performance/i)).toBeInTheDocument();
  expect(screen.getByText('Arsenal')).toBeInTheDocument();
  expect(screen.getByText('Liverpool')).toBeInTheDocument();
});

test('renders DataTable with custom title and density controls', () => {
  const dummyCols = [
    { key: 'Player', label: 'Player Name' },
    { key: 'Gls', label: 'Goals' }
  ];
  const dummyData = [
    { Player: 'Bukayo Saka', Gls: 12 }
  ];

  render(
    <DataTable
      columns={dummyCols}
      data={dummyData}
      title="Sample Statistical Ledger"
    />
  );

  expect(screen.getByText('Sample Statistical Ledger')).toBeInTheDocument();
  expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
  expect(screen.getByText('12')).toBeInTheDocument();
});

test('renders StatCard with sparkline and delta indicators', () => {
  render(
    <StatCard
      title="Leading Marksman"
      value={25}
      subtext="Erling Haaland (Man City)"
      delta={2.4}
      deltaType="positive"
      sparklineData={[10, 15, 20, 25]}
    />
  );

  expect(screen.getByText('Leading Marksman')).toBeInTheDocument();
  expect(screen.getByText('25')).toBeInTheDocument();
  expect(screen.getByText(/Erling Haaland/i)).toBeInTheDocument();
});

test('renders PlayerProfileView with complete dossier and 3 percentile groups', async () => {
  const dummyPlayer = {
    Player: 'Bukayo Saka',
    Squad: 'Arsenal',
    Pos: 'FW',
    Nation: 'ENG',
    Age: 23,
    Gls: 12,
    Ast: 14,
    xG: 10.5,
    xAG: 12.1,
    PrgC: 80,
    PrgP: 95,
    PrgR: 120,
    Min: 2200,
    MP: 26,
    CrdY: 3,
    CrdR: 0,
    '90s': 24.4
  };

  render(<PlayerProfileView player={dummyPlayer} />);
  expect(screen.getAllByText('Bukayo Saka').length).toBeGreaterThan(0);
  expect(screen.getByText(/Scoring Output/i)).toBeInTheDocument();
  expect(screen.getByText(/Chance Creation/i)).toBeInTheDocument();
  expect(screen.getByText(/Ball Progression/i)).toBeInTheDocument();
  await flushAsyncEffects();
});

test('renders ComparisonMatrix side by side with scouting verdict', () => {
  const dummyPlayers = [
    { id: 1, Player: 'Erling Haaland', Squad: 'Man City', Pos: 'FW', Gls: 25, Ast: 3, xG: 22.4, xAG: 3.2, PrgC: 45, PrgP: 30, PrgR: 90, Min: 2400 },
    { id: 2, Player: 'Bukayo Saka', Squad: 'Arsenal', Pos: 'FW', Gls: 12, Ast: 14, xG: 10.5, xAG: 12.1, PrgC: 80, PrgP: 95, PrgR: 120, Min: 2200 }
  ];

  render(<ComparisonMatrix players={dummyPlayers} />);
  expect(screen.getByText(/Player Comparison/i)).toBeInTheDocument();
  expect(screen.getByText('Erling Haaland')).toBeInTheDocument();
  expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
  expect(screen.getByText(/Scouting Verdict:/i)).toBeInTheDocument();
});

test('renders LeaderboardsView with metric picker and podium', async () => {
  render(<LeaderboardsView activeSeason="2024-2025" />);
  expect(screen.getByText(/Continental League Podiums & Leaderboards/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Goals/i).length).toBeGreaterThan(0);
  await flushAsyncEffects();
});

test('renders SquadBrowserView with league filter and club index', async () => {
  render(<SquadBrowserView activeSeason="2024-2025" />);
  expect(screen.getByText(/Squad Browser/i)).toBeInTheDocument();
  expect(screen.getByText(/Club Registry & First-Team Almanac/i)).toBeInTheDocument();
  await flushAsyncEffects();
});

test('renders DataManagementView with high-density archive table and validation checks', async () => {
  render(<DataManagementView activeSeason="2024-2025" />);
  expect(screen.getByText(/Dataset Registry/i)).toBeInTheDocument();
  expect(screen.getByText(/Historical Season Ledger/i)).toBeInTheDocument();
  expect(screen.getByText(/Validation Checks Explained/i)).toBeInTheDocument();
  expect(screen.getByText(/Dataset Changelog/i)).toBeInTheDocument();
  await flushAsyncEffects();
});
