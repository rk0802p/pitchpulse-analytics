import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import TerraceHomeView from './TerraceHomeView';

const emptyDashboardData = {
  kpis: {
    total_players: 0,
    total_clubs: 0,
    total_goals: 0,
    total_assists: 0,
    total_xg: 0,
    total_xag: 0,
    finishing_delta: 0
  },
  top_scorers: [
    { id: 5, Player: 'Season Top Scorer', Squad: 'Example FC', Gls: 9, Min: 900 }
  ],
  top_creators: [],
  overperformers: [],
  underperformers: [],
  progression_leaders: [],
  scatter_data: [{
    id: 6,
    Player: 'Untracked xG Player',
    Squad: 'Example FC',
    Gls: 9,
    Ast: 3,
    xG: null,
    xAG: 0
  }]
};

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
    progression_leaders: [{
      id: 7,
      Player: 'Zero Progressor',
      Squad: 'Example FC',
      Comp: 'eng Premier League',
      Gls: 9,
      Min: 900,
      PrgC: 0,
      PrgP: 0
    }]
  };

  render(<TerraceHomeView dashboardData={data} />);

  const row = screen.getByTestId('progression-row-7');
  expect(within(row).getByText('0', { exact: true })).toBeInTheDocument();
  expect(within(row).getByText('actions')).toBeInTheDocument();
  expect(within(row).queryByText('9')).not.toBeInTheDocument();
  expect(within(row).queryByText('recorded')).not.toBeInTheDocument();
});

test('a genuine zero xG and xAG player remains a plotted scatter point', () => {
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
    xAG: 0
  };

  render(
    <TerraceHomeView
      dashboardData={{ ...emptyDashboardData, scatter_data: [player] }}
      onSelectPlayer={onSelectPlayer}
    />
  );

  expect(screen.queryByText(/expected-goal observations are not available/i)).not.toBeInTheDocument();
  const playerPoint = screen.getByTestId('dashboard-scatter-point-8');
  expect(playerPoint).toHaveStyle({ left: '8%', top: '90%' });
  fireEvent.click(playerPoint);
  expect(onSelectPlayer).toHaveBeenCalledWith(player);
});
