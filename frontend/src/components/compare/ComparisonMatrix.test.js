import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComparisonMatrix, { generateMultiPlayerVerdict } from './ComparisonMatrix';
import api from '../../services/api';

jest.mock('../../services/api', () => ({
  getPlayers: jest.fn(),
  comparePlayers: jest.fn(),
}));

const samplePlayers = [
  { id: 1, Player: 'Mohamed Salah', Squad: 'Liverpool', Pos: 'FW', Age: 32, MP: 38, Min: 3300, Gls: 29, xG: 25.1, npxG: 18.0, Gls_minus_xG: 3.9, Ast: 18, xAG: 14.2, PrgC: 120, PrgP: 140, PrgR: 410, Gls_90: 0.79, xG_90: 0.68, Ast_90: 0.49, xAG_90: 0.39 },
  { id: 2, Player: 'Kylian Mbappé', Squad: 'Real Madrid', Pos: 'FW', Age: 26, MP: 34, Min: 2900, Gls: 31, xG: 25.9, npxG: 20.4, Gls_minus_xG: 5.1, Ast: 3, xAG: 7.7, PrgC: 150, PrgP: 100, PrgR: 350, Gls_90: 0.96, xG_90: 0.8, Ast_90: 0.09, xAG_90: 0.24 },
  { id: 3, Player: 'Pedri', Squad: 'Barcelona', Pos: 'MF', Age: 22, MP: 36, Min: 2800, Gls: 4, xG: 3.2, npxG: 3.2, Gls_minus_xG: 0.8, Ast: 5, xAG: 7.1, PrgC: 90, PrgP: 360, PrgR: 180, Gls_90: 0.13, xG_90: 0.1, Ast_90: 0.16, xAG_90: 0.23 },
];

describe('ComparisonMatrix & generateMultiPlayerVerdict', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.comparePlayers.mockResolvedValue({
      success: true,
      players: samplePlayers,
      metrics: [],
      radar: [
        { dimension: 'Goals/90', key: 'Gls_90', values: { '1': 0.79, '2': 0.96, '3': 0.13 }, scores: { '1': 95, '2': 99, '3': 38 }, is_tracked: { '1': true, '2': true, '3': true } },
        { dimension: 'xG/90', key: 'xG_90', values: { '1': 0.68, '2': 0.8, '3': 0.1 }, scores: { '1': 92, '2': 98, '3': 30 }, is_tracked: { '1': true, '2': true, '3': true } },
        { dimension: 'Assists/90', key: 'Ast_90', values: { '1': 0.49, '2': 0.09, '3': 0.16 }, scores: { '1': 99, '2': 35, '3': 62 }, is_tracked: { '1': true, '2': true, '3': true } },
        { dimension: 'Prog. Passes', key: 'PrgP', values: { '1': 140, '2': 100, '3': 360 }, scores: { '1': 84, '2': 68, '3': 99 }, is_tracked: { '1': true, '2': true, '3': true } },
      ],
    });
    api.getPlayers.mockResolvedValue({
      success: true,
      data: [{ id: 99, Player: 'Cole Palmer', Squad: 'Chelsea', Pos: 'MF', Min: 3000, Gls: 15 }],
    });
  });

  test('generateMultiPlayerVerdict highlights leaders across all 3 players (never ignoring player 3)', () => {
    const verdict = generateMultiPlayerVerdict(samplePlayers);
    expect(verdict).toContain('Kylian Mbappé');
    expect(verdict).toContain('Mohamed Salah');
    expect(verdict).toContain('Pedri');
  });

  test('renders Recharts Radar, Efficiency Chart, and Positional Percentiles tab from backend compare payload', async () => {
    render(
      <ComparisonMatrix
        players={samplePlayers}
        activeSeason="2024-2025"
        onRemovePlayer={jest.fn()}
        onAddPlayer={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(api.comparePlayers).toHaveBeenCalledWith([1, 2, 3], '2024-2025');
    });

    expect(screen.getByTestId('compare-radar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('compare-efficiency-chart')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Positional Percentiles/i }));
    await waitFor(() => {
      expect(screen.getAllByText(/99th/).length).toBeGreaterThanOrEqual(3);
    });
  });

  test('queries full-database API when searching to add a player', async () => {
    const onAddPlayer = jest.fn();
    render(
      <ComparisonMatrix
        players={samplePlayers.slice(0, 2)}
        activeSeason="2024-2025"
        onAddPlayer={onAddPlayer}
        onRemovePlayer={jest.fn()}
      />
    );

    const input = screen.getByLabelText(/Search full player archive/i);
    fireEvent.change(input, { target: { value: 'Palmer' } });

    await waitFor(() => {
      expect(api.getPlayers).toHaveBeenCalledWith(
        expect.objectContaining({ season: '2024-2025', search: 'Palmer' })
      );
    });

    const item = await screen.findByText('Cole Palmer');
    fireEvent.click(item);
    expect(onAddPlayer).toHaveBeenCalledWith(expect.objectContaining({ Player: 'Cole Palmer' }));
  });
});
