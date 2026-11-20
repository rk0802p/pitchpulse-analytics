import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TerraceHomeView from './TerraceHomeView';
import { computeMedian } from './AttackingOutputMatrix';

const emptyDashboardData = {
  kpis: {
    total_players: 0,
    total_clubs: 0,
    total_goals: 0,
    total_assists: 0,
    total_xg: 0,
    total_xag: 0,
    finishing_delta: 0,
  },
  top_scorers: [
    { id: 5, Player: 'Season Top Scorer', Squad: 'Example FC', Gls: 9, Min: 900 },
  ],
  top_creators: [],
  overperformers: [],
  underperformers: [],
  progression_leaders: [],
  scatter_data: [
    {
      id: 6,
      Player: 'Untracked xG Player',
      Squad: 'Example FC',
      Gls: 9,
      Ast: 3,
      xG: null,
      xAG: 0,
    },
  ],
  league_efficiency: [],
  club_efficiency: [],
};

const fullDashboardData = {
  kpis: {
    total_players: 2854,
    total_clubs: 96,
    total_goals: 4806,
    total_assists: 3429,
    total_xg: 4870.2,
    total_xag: 3450.5,
    finishing_delta: -64.2,
    has_xg: true,
    has_progression: true,
  },
  top_scorers: [
    { id: 101, Player: 'Mohamed Salah', Squad: 'Liverpool', Comp: 'eng Premier League', Gls: 29, xG: 25.2, Min: 3300 },
  ],
  top_creators: [
    { id: 101, Player: 'Mohamed Salah', Squad: 'Liverpool', Comp: 'eng Premier League', Ast: 18, xAG: 14.2, Min: 3300 },
  ],
  overperformers: [
    { id: 101, Player: 'Mohamed Salah', Squad: 'Liverpool', Comp: 'eng Premier League', Pos: 'FW', Gls: 29, xG: 25.2, Gls_minus_xG: 3.8, Min: 3300 },
  ],
  underperformers: [
    { id: 102, Player: 'Test Misses', Squad: 'Chelsea', Comp: 'eng Premier League', Pos: 'FW', Gls: 8, xG: 14.5, Gls_minus_xG: -6.5, Min: 2200 },
  ],
  progression_leaders: [
    { id: 103, Player: 'Bruno Fernandes', Squad: 'Manchester Utd', Comp: 'eng Premier League', PrgC: 85, PrgP: 280, Min: 3100 },
  ],
  scatter_data: [
    { id: 101, Player: 'Mohamed Salah', Squad: 'Liverpool', Comp: 'eng Premier League', Pos: 'FW', Gls: 29, Ast: 18, xG: 25.2, xAG: 14.2, Gls_minus_xG: 3.8, Min: 3300 },
    { id: 104, Player: 'Cole Palmer', Squad: 'Chelsea', Comp: 'eng Premier League', Pos: 'MF', Gls: 15, Ast: 8, xG: 16.4, xAG: 11.1, Gls_minus_xG: -1.4, Min: 3100 },
  ],
  scatter_medians: { xAG: 12.65, xG: 20.8 },
  league_efficiency: [
    {
      id: 'premier-league',
      raw_name: 'eng Premier League',
      name: 'Premier League',
      short_name: 'EPL',
      clubs_count: 20,
      players_count: 574,
      goals: 1115,
      assists: 810,
      xg: 1120.4,
      finishing_delta: -5.4,
      conversion_pct: 99.5,
      goals_per_club: 55.8,
      top_scorer: { id: 101, Player: 'Mohamed Salah', Squad: 'Liverpool', Gls: 29 },
    },
  ],
  club_efficiency: [
    {
      squad: 'Liverpool',
      comp: 'eng Premier League',
      competition_name: 'Premier League',
      short_league: 'EPL',
      players_count: 25,
      goals: 86,
      assists: 64,
      xg: 82.1,
      finishing_delta: 3.9,
      conversion_pct: 104.8,
      shared_xg_excluded_count: 0,
      top_scorer: { id: 101, Player: 'Mohamed Salah', Squad: 'Liverpool', Gls: 29 },
    },
  ],
};

test('computeMedian computes odd, even, and empty medians accurately', () => {
  expect(computeMedian([])).toBe(0);
  expect(computeMedian([10, 2, 6])).toBe(6);
  expect(computeMedian([1, 2, 3, 4])).toBe(2.5);
});

test('empty or untracked chart data shows unavailable states instead of substitute stats', () => {
  render(<TerraceHomeView dashboardData={emptyDashboardData} activeSeason="2025-2026" />);

  expect(screen.getByText(/progressive action metrics .* not tracked or unavailable/i)).toBeInTheDocument();
  expect(screen.getByText(/expected-goal observations are not available/i)).toBeInTheDocument();
  expect(screen.queryByText('Mohamed Salah')).not.toBeInTheDocument();
  expect(screen.queryByText('Patrik Schick')).not.toBeInTheDocument();
  expect(screen.queryByText('xG Player')).not.toBeInTheDocument();
  expect(within(screen.getByTestId('progression-panel')).queryByText('Season Top Scorer')).not.toBeInTheDocument();
});

test('genuine zero progression remains a zero and is never replaced with goals or minutes', () => {
  const data = {
    ...emptyDashboardData,
    progression_leaders: [
      {
        id: 7,
        Player: 'Zero Progressor',
        Squad: 'Example FC',
        Comp: 'eng Premier League',
        Gls: 9,
        Min: 900,
        PrgC: 0,
        PrgP: 0,
      },
    ],
  };

  render(<TerraceHomeView dashboardData={data} />);

  const row = screen.getByTestId('progression-row-7');
  expect(within(row).getByText('0', { exact: true })).toBeInTheDocument();
  expect(within(row).getByText('actions')).toBeInTheDocument();
  expect(within(row).queryByText('9')).not.toBeInTheDocument();
  expect(within(row).queryByText('recorded')).not.toBeInTheDocument();
});

test('a genuine zero xG and xAG player remains a plotted interactive point', () => {
  const onSelectPlayer = jest.fn();
  const player = {
    id: 8,
    Player: 'Zero Chance Player',
    Squad: 'Example FC',
    Comp: 'eng Premier League',
    Pos: 'FW',
    Gls: 5,
    Ast: 2,
    xG: 0,
    xAG: 0,
  };

  render(
    <TerraceHomeView
      dashboardData={{ ...emptyDashboardData, scatter_data: [player] }}
      onSelectPlayer={onSelectPlayer}
    />
  );

  expect(screen.queryByText(/expected-goal observations are not available/i)).not.toBeInTheDocument();
  const playerPoint = screen.getByTestId('dashboard-scatter-point-8');
  expect(within(playerPoint).getByText('Zero Chance Player')).toBeInTheDocument();
  fireEvent.click(playerPoint);
  expect(onSelectPlayer).toHaveBeenCalledWith(player);
});

test('renders real Top-League Efficiency Showcase without fictional Arsenal/Chelsea widget or fake +12 delta', () => {
  const onSelectComp = jest.fn();
  const onSelectTeam = jest.fn();

  render(
    <TerraceHomeView
      dashboardData={fullDashboardData}
      activeSeason="2024-2025"
      onSelectComp={onSelectComp}
      onSelectTeam={onSelectTeam}
    />
  );

  // Zero fictional matchday scoreboard or hardcoded +12 delta
  expect(screen.queryByText(/Matchday Scoreboard/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Expected goals, minute by minute/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Every shot, one goal at the top/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/▲ 12/)).not.toBeInTheDocument();

  // Real Top-League Efficiency Showcase present and interactive
  const showcase = screen.getByLabelText(/Top-League Efficiency Showcase/i);
  expect(within(showcase).getByText(/Top-League Efficiency Showcase/i)).toBeInTheDocument();
  fireEvent.click(within(showcase).getByRole('button', { name: /Premier League/i }));
  expect(onSelectComp).toHaveBeenCalledWith('eng Premier League');

  // Toggle to Top Clubs
  fireEvent.click(within(showcase).getByRole('button', { name: /Top Clubs/i }));
  fireEvent.click(within(showcase).getByRole('button', { name: /Liverpool/i }));
  expect(onSelectTeam).toHaveBeenCalledWith('Liverpool');
});

test('loading state renders skeletons without flashing hardcoded 2024-2025 fallback KPIs', () => {
  render(<TerraceHomeView dashboardData={null} loading={true} activeSeason="2025-2026" />);

  expect(screen.getByLabelText(/Loading season KPIs/i)).toBeInTheDocument();
  expect(screen.queryByText('2,854')).not.toBeInTheDocument();
  expect(screen.queryByText('4,806')).not.toBeInTheDocument();
  expect(screen.queryByText('4,870.2')).not.toBeInTheDocument();
});

test('pre-xG season renders Untracked instead of fake 0.0 xG', () => {
  const preXgData = {
    ...emptyDashboardData,
    kpis: {
      total_players: 2650,
      total_clubs: 98,
      total_goals: 4920,
      total_assists: 3500,
      total_xg: null,
      total_xag: null,
      finishing_delta: null,
      has_xg: false,
      has_progression: false,
    },
    scatter_data: [],
    league_efficiency: [
      {
        id: 'premier-league',
        raw_name: 'eng Premier League',
        name: 'Premier League',
        short_name: 'EPL',
        clubs_count: 20,
        players_count: 520,
        goals: 1063,
        assists: 740,
        xg: null,
        finishing_delta: null,
        conversion_pct: null,
        goals_per_club: 53.2,
        top_scorer: { id: 1, Player: 'Robin van Persie', Squad: 'Manchester Utd', Gls: 26 },
      },
    ],
  };

  render(<TerraceHomeView dashboardData={preXgData} activeSeason="2012-2013" />);

  expect(screen.getByText('Untracked')).toBeInTheDocument();
  expect(screen.getByText(/Expected-goal observations are not available/i)).toBeInTheDocument();
  expect(screen.getByText(/Expected-goal finishing deltas are not available/i)).toBeInTheDocument();
});
