import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import App from './App';
import AppLayout from './components/layout/AppLayout';
import LeagueBanner from './components/LeagueBanner';
import PlayerCard from './components/PlayerCard';
import TeamBadge from './components/TeamBadge';
import ComparisonRadarChart from './components/compare/ComparisonRadarChart';
import ComparisonMatrix from './components/compare/ComparisonMatrix';
import LeaderboardsView from './components/leaderboards/LeaderboardsView';
import PlayerProfileView from './components/profile/PlayerProfileView';
import DataManagementView from './components/data/DataManagementView';
import ProgressionMatrixChart from './components/dashboard/ProgressionMatrixChart';
import PageHeader from './components/common/PageHeader';

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
            { id: '2023-2024', name: '2023/24 Historical Season', is_active: false, is_baseline: false, dataset_status: 'verified_historical', status_label: 'Verified Historical', records_count: 2852 },
            { id: '2024-2025', name: '2024/25 Regular Season (Baseline)', is_active: true, is_baseline: true, dataset_status: 'verified_historical', status_label: 'Reference Baseline', records_count: 2854 },
            { id: '2025-2026', name: '2025/26 Algorithmic Projection', is_active: false, is_baseline: false, is_projection: true, dataset_status: 'projection', status_label: 'Algorithmic Projection', records_count: 2854 }
          ]
        })
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
  render(<App />);

  expect(screen.getAllByText(/PitchPulse/i).length).toBeGreaterThan(0);
  expect(screen.getByText(/European Football Intelligence/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Player Explorer/i).length).toBeGreaterThan(0);

  await waitFor(() => {
    expect(screen.getAllByText(/Premier League/i).length).toBeGreaterThan(0);
  });
});

test('renders Dashboard charts: Finishing Efficiency and Attacking Scatter Matrix', async () => {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/Finishing Efficiency vs Expected Goals/i)).toBeInTheDocument();
  });
  expect(screen.getByText(/Attacking Output Matrix/i)).toBeInTheDocument();
  expect(screen.getByText(/Ball Progression Leaders/i)).toBeInTheDocument();
  expect(screen.getByText(/Patrik Schick/i)).toBeInTheDocument();
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

test('renders ComparisonRadarChart with radar dimensions and players', () => {
  const dummyRadar = [
    { dimension: 'Finishing (Gls/90)', key: 'Gls_90', values: { '1': 0.85, '2': 0.45 }, scores: { '1': 95, '2': 60 } },
    { dimension: 'Creation (Ast/90)', key: 'Ast_90', values: { '1': 0.35, '2': 0.50 }, scores: { '1': 70, '2': 90 } },
  ];
  const dummyPlayers = [
    { id: 1, Player: 'Erling Haaland', Squad: 'Manchester City' },
    { id: 2, Player: 'Bukayo Saka', Squad: 'Arsenal' }
  ];
  render(<ComparisonRadarChart radarData={dummyRadar} players={dummyPlayers} />);
  expect(screen.getByText(/Head-to-Head Scouting Radar/i)).toBeInTheDocument();
  expect(screen.getByText('Erling Haaland')).toBeInTheDocument();
  expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
});

test('renders ComparisonMatrix with category leader stars and metric rows', () => {
  const dummyData = {
    players: [
      { id: 1, Player: 'Erling Haaland', Squad: 'Manchester City' },
      { id: 2, Player: 'Bukayo Saka', Squad: 'Arsenal' }
    ],
    metrics: [
      { key: 'Gls', label: 'Goals', category: 'total', values: { '1': 25, '2': 10 }, leaders: ['1'], best_value: 25 },
      { key: 'Ast', label: 'Assists', category: 'total', values: { '1': 3, '2': 8 }, leaders: ['2'], best_value: 8 }
    ]
  };
  render(<ComparisonMatrix comparisonData={dummyData} />);
  expect(screen.getByText(/Statistical Benchmark Matrix/i)).toBeInTheDocument();
  expect(screen.getByText('Goals')).toBeInTheDocument();
  expect(screen.getByText('Assists')).toBeInTheDocument();
  expect(screen.getByText('25')).toBeInTheDocument();
});

test('renders LeaderboardsView with podium cards and rankings', () => {
  const dummyLeaders = [
    { id: 1, rank: 1, player: 'Erling Haaland', squad: 'Man City', competition: 'Premier League', value: 25, matches: 20, minutes: 1800, xg: 22.1, assists: 3 },
    { id: 2, rank: 2, player: 'Robert Lewandowski', squad: 'Barcelona', competition: 'La Liga', value: 22, matches: 22, minutes: 1900, xg: 19.5, assists: 2 },
    { id: 3, rank: 3, player: 'Harry Kane', squad: 'Bayern Munich', competition: 'Bundesliga', value: 20, matches: 19, minutes: 1700, xg: 18.2, assists: 6 },
    { id: 4, rank: 4, player: 'Cole Palmer', squad: 'Chelsea', competition: 'Premier League', value: 14, matches: 21, minutes: 1850, xg: 11.0, assists: 9 }
  ];
  const dummyComps = [{ id: 'premier-league', name: 'Premier League' }];

  render(
    <LeaderboardsView
      leaders={dummyLeaders}
      activeMetric="Gls"
      onSelectMetric={jest.fn()}
      activeComp=""
      onSelectComp={jest.fn()}
      competitions={dummyComps}
    />
  );

  expect(screen.getByText('Erling Haaland')).toBeInTheDocument();
  expect(screen.getByText('Robert Lewandowski')).toBeInTheDocument();
  expect(screen.getByText('Harry Kane')).toBeInTheDocument();
  expect(screen.getByText('Cole Palmer')).toBeInTheDocument();
});

test('renders PlayerProfileView with identity and percentiles', () => {
  const dummyProfile = {
    identity: { id: 1, name: 'Bukayo Saka', squad: 'Arsenal', competition: 'Premier League', position: 'FW', nation: 'ENG', age: 23 },
    playing_time: { minutes: 2100, matches_played: 25, starts: 24, ninetys: 23.3 },
    scoring: { goals: 10, expected_goals: 9.4, finishing_differential: 0.6 },
    playmaking: { assists: 8, expected_assisted_goals: 7.8, goals_plus_assists: 18 },
    progression: { progressive_carries: 45, progressive_passes: 62, progressive_receptions: 110 },
    discipline: { yellow_cards: 2, red_cards: 0 },
    per_90_rates: { goals_per_90: 0.43, xg_per_90: 0.40, assists_per_90: 0.34, xag_per_90: 0.33, yellow_cards_per_90: 0.09, red_cards_per_90: 0 },
    percentiles: {
      comparison_position: 'FW',
      peer_sample_size: 450,
      goals_per_90: { value: 0.43, percentile: 88 },
      xg_per_90: { value: 0.40, percentile: 85 },
      assists_per_90: { value: 0.34, percentile: 94 },
      xag_per_90: { value: 0.33, percentile: 92 },
      progressive_carries: { value: 45, percentile: 78 },
      progressive_passes: { value: 62, percentile: 82 },
      progressive_receptions: { value: 110, percentile: 89 }
    }
  };

  render(<PlayerProfileView profile={dummyProfile} onBack={jest.fn()} onCompare={jest.fn()} />);
  expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
  expect(screen.getByText(/Back to Player Explorer/i)).toBeInTheDocument();
  expect(screen.getByText(/Positional Peer Percentile Benchmark/i)).toBeInTheDocument();
  expect(screen.getByText(/Arsenal/i)).toBeInTheDocument();
});

test('renders DataManagementView with baseline status and season registry', async () => {
  render(<DataManagementView activeSeason="2024-2025" onSeasonChange={jest.fn()} />);

  expect(screen.getByText(/Dataset Registry & Versioned Storage/i)).toBeInTheDocument();
  expect(screen.getByText(/Reference 2024\/25 Baseline/i)).toBeInTheDocument();
  expect(screen.getByText(/Verify Baseline Integrity/i)).toBeInTheDocument();
  expect(screen.getByText(/Import & Verify Season Dataset/i)).toBeInTheDocument();
  await waitFor(() => {
    expect(screen.getByText(/7dbea8fdd43b9cf09eef5a18632953d9079d0f10bd11532da3337d937213e7e0/i)).toBeInTheDocument();
  });
});

test('renders AppLayout season selector with badges and opens options on mobile pill click', async () => {
  const mockOnSelectSeason = jest.fn();
  const sampleSeasons = [
    { id: '2023-2024', name: '2023/24 Historical Season', is_baseline: false, dataset_status: 'verified_historical' },
    { id: '2024-2025', name: '2024/25 Regular Season', is_baseline: true, dataset_status: 'verified_historical' },
    { id: '2025-2026', name: '2025/26 Algorithmic Projection', is_projection: true, dataset_status: 'projection' }
  ];

  render(
    <AppLayout
      activeSeason="2024-2025"
      availableSeasons={sampleSeasons}
      onSelectSeason={mockOnSelectSeason}
    >
      <div>Content</div>
    </AppLayout>
  );

  // Check mobile season pill exists
  const mobilePill = screen.getByRole('button', { name: /Select active football season/i });
  expect(mobilePill).toBeInTheDocument();

  // Clicking mobile pill opens modal
  fireEvent.click(mobilePill);
  expect(screen.getByText(/Select Season/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Baseline/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Projection/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Historical/i).length).toBeGreaterThan(0);

  // Click a season option from matching list
  const historicalOptions = screen.getAllByRole('option', { name: /2023\/24 Historical Season/i });
  expect(historicalOptions.length).toBeGreaterThan(0);
  fireEvent.click(historicalOptions[0]);
  expect(mockOnSelectSeason).toHaveBeenCalledWith('2023-2024');

  await waitFor(() => {
    expect(screen.getByText(/ONLINE/i)).toBeInTheDocument();
  });
});

test('renders dynamic season labels in LeaderboardsView and ProgressionMatrixChart', () => {
  const dummyLeaders = [
    { id: 1, rank: 1, player: 'Kane', squad: 'Bayern', value: 36 },
    { id: 2, rank: 2, player: 'Guirassy', squad: 'Stuttgart', value: 28 },
    { id: 3, rank: 3, player: 'Haaland', squad: 'Man City', value: 27 },
    { id: 4, rank: 4, player: 'Mbappe', squad: 'PSG', value: 27 }
  ];

  render(
    <LeaderboardsView
      leaders={dummyLeaders}
      season="2023/24"
      onSelectMetric={jest.fn()}
      onSelectComp={jest.fn()}
      onSelectPosition={jest.fn()}
      onSelectMinMinutes={jest.fn()}
    />
  );
  expect(screen.getByText(/2023\/24 European Regular Season/i)).toBeInTheDocument();

  render(
    <ProgressionMatrixChart
      progressionLeaders={[]}
      season="2023/24"
    />
  );
  expect(screen.getByText(/2023\/24 Regular Season/i)).toBeInTheDocument();
});

test('renders interactive SeasonSelector in PageHeader and triggers onSelectSeason', () => {
  const mockSelect = jest.fn();
  const sampleSeasons = [
    { id: '2023-2024', name: '2023/24 Historical Season', is_baseline: false, dataset_status: 'verified_historical' },
    { id: '2024-2025', name: '2024/25 Regular Season', is_baseline: true, dataset_status: 'verified_historical' },
    { id: '2025-2026', name: '2025/26 Algorithmic Projection', is_projection: true, dataset_status: 'projection' }
  ];

  render(
    <PageHeader
      title="Test European Intelligence"
      activeSeason="2024-2025"
      availableSeasons={sampleSeasons}
      onSelectSeason={mockSelect}
    />
  );

  // The SeasonSelector button in PageHeader
  const seasonBtn = screen.getByRole('button', { name: /Select season/i });
  expect(seasonBtn).toBeInTheDocument();
  expect(seasonBtn).toHaveTextContent(/Season 24\/25/i);

  // Click to open dropdown
  fireEvent.click(seasonBtn);
  expect(screen.getByText(/Switch Season \/ Year/i)).toBeInTheDocument();

  // Select 2023/24 option
  const opt2324 = screen.getByRole('option', { name: /2023\/24 Historical Season/i });
  expect(opt2324).toBeInTheDocument();
  fireEvent.click(opt2324);

  expect(mockSelect).toHaveBeenCalledWith('2023-2024');
});

test('renders PlayerProfileView with complete stats and no undefined values in KPI cards', () => {
  const sampleProfile = {
    identity: {
      id: 1965,
      rk: 1965,
      name: 'Dani Olmo',
      position: 'MF,FW',
      nation: 'es ESP',
      squad: 'Barcelona',
      competition: 'La Liga',
      age: 26,
      born: 1998
    },
    playing_time: {
      matches_played: 25,
      starts: 13,
      minutes: 1212,
      nineties: 13.5
    },
    scoring: {
      goals: 10,
      xg: 7.2,
      goals_minus_xg: 2.8,
      npxg: 7.2
    },
    playmaking: {
      assists: 3,
      xag: 4.1,
      goals_plus_assists: 13
    },
    progression: {
      progressive_carries: 33,
      progressive_passes: 81,
      progressive_receptions: 55
    },
    discipline: {
      yellow_cards: 1,
      red_cards: 0
    },
    per_90_rates: {
      goals_per_90: 0.74,
      xg_per_90: 0.48,
      assists_per_90: 0.22,
      xag_per_90: 0.28
    },
    percentiles: {
      peer_sample_size: 1018,
      comparison_position: 'MF',
      goals_per_90: { value: 0.74, percentile: 99 },
      xg_per_90: { value: 0.48, percentile: 97 },
      assists_per_90: { value: 0.22, percentile: 81 },
      xag_per_90: { value: 0.28, percentile: 85 },
      progressive_carries: { value: 33, percentile: 65 },
      progressive_passes: { value: 81, percentile: 68 },
      progressive_receptions: { value: 55, percentile: 72 }
    }
  };

  render(
    <PlayerProfileView
      profile={sampleProfile}
      onBack={jest.fn()}
      onCompare={jest.fn()}
    />
  );

  // Check name & identity
  expect(screen.getByText('Dani Olmo')).toBeInTheDocument();
  expect(screen.getByText('Barcelona')).toBeInTheDocument();

  // Verify KPI cards contain real calculated values, NOT 'undefined'
  expect(screen.queryByText(/undefined Diff/i)).toBeNull();
  expect(screen.queryByText(/Expected \(xG\): undefined/i)).toBeNull();
  expect(screen.queryByText(/Expected Assists \(xAG\): undefined/i)).toBeNull();
  expect(screen.queryByText(/undefined total 90s played/i)).toBeNull();

  // Verify positive values are rendered
  expect(screen.getByText(/\+2.8 Over xG/i)).toBeInTheDocument();
  expect(screen.getByText(/Expected \(xG\): 7.2/i)).toBeInTheDocument();
  expect(screen.getByText(/Expected Assists \(xAG\): 4.1/i)).toBeInTheDocument();
  expect(screen.getByText(/13.5 total 90s played/i)).toBeInTheDocument();
});

test('full App season-switching integration: updates displayed data and does not accept fake seasons', async () => {
  render(<App />);

  // Wait for initial dashboard load
  await waitFor(() => {
    expect(screen.getByText(/European Football Intelligence/i)).toBeInTheDocument();
  });

  // Verify SeasonSelector exists in PageHeader
  const seasonSelectors = screen.getAllByRole('button', { name: /Select season/i });
  expect(seasonSelectors.length).toBeGreaterThan(0);
  const headerSelector = seasonSelectors[0];

  // Open dropdown
  fireEvent.click(headerSelector);
  expect(screen.getAllByText(/Switch.*Season/i).length).toBeGreaterThan(0);

  // Verify only genuine registered seasons appear, not arbitrary years
  expect(screen.getAllByRole('option', { name: /2024\/25 Regular Season/i })[0]).toBeInTheDocument();
  expect(screen.getAllByRole('option', { name: /2023\/24 Historical Season/i })[0]).toBeInTheDocument();
  expect(screen.queryByText(/1990\/91/i)).toBeNull();

  // Click 2023/24
  fireEvent.click(screen.getAllByRole('option', { name: /2023\/24 Historical Season/i })[0]);

  // Verify backend active season activation was requested
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/seasons/active'),
      expect.objectContaining({ method: 'POST' })
    );
  });
});
