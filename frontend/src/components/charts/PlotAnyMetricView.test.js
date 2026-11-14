import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../services/api';
import PlotAnyMetricView from './PlotAnyMetricView';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getScatterChart: jest.fn() }
}));

const chart = (points) => ({
  points,
  points_count: points.length,
  medians: { x: 2, y: 1 },
  tracking_status: points.length ? 'tracked' : 'no_eligible_observations',
  pool: { n: points.length }
});

const point = (id, Player) => ({
  id, Player, Squad: 'Example FC', Comp: 'eng Premier League', Pos: 'FW',
  Age: 22, Min: 1200, x: 4, y: 2
});

beforeEach(() => {
  api.getScatterChart.mockReset();
  window.location.hash = '#plots?x=Gls&y=Ast&pos=FW&mins=500';
});

test('uses the plotted point count and requests the age filter', async () => {
  api.getScatterChart
    .mockResolvedValueOnce(chart([point(1, 'First Player'), point(2, 'Second Player')]))
    .mockResolvedValueOnce(chart([point(1, 'First Player')]));

  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  expect(await screen.findByText(/Plotted: 2 players/)).toBeInTheDocument();
  expect(screen.queryByText('48')).not.toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('e.g. 23 (U23)'), { target: { value: '23' } });
  await waitFor(() => expect(api.getScatterChart).toHaveBeenCalledTimes(2));
  expect(await screen.findByText(/Plotted: 1 player/)).toBeInTheDocument();
  expect(api.getScatterChart.mock.calls[1][0]).toMatchObject({ age_max: 23 });
  expect(screen.getByText(/age ≤ 23/)).toBeInTheDocument();
});

test('ignores an older request that resolves after the current filters', async () => {
  let resolveOld;
  let resolveCurrent;
  api.getScatterChart
    .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockImplementationOnce(() => new Promise((resolve) => { resolveCurrent = resolve; }));

  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  fireEvent.change(screen.getByPlaceholderText('e.g. 23 (U23)'), { target: { value: '23' } });
  await waitFor(() => expect(api.getScatterChart).toHaveBeenCalledTimes(2));

  await act(async () => { resolveOld(chart([point(1, 'Stale Player')])); });
  expect(screen.queryByRole('button', { name: /Stale Player/ })).not.toBeInTheDocument();

  await act(async () => { resolveCurrent(chart([point(2, 'Current Player')])); });
  expect(await screen.findByText(/Plotted: 1 player/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Current Player/ })).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByText(/Computing Positional Coordinates/)).not.toBeInTheDocument());
});

test('debounces rapid age filter changes and keeps the previous plot while updating', async () => {
  api.getScatterChart
    .mockResolvedValueOnce(chart([point(1, 'Original Player')]))
    .mockResolvedValueOnce(chart([point(2, 'Filtered Player')]));
  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  expect(await screen.findByRole('button', { name: /Original Player/ })).toBeInTheDocument();
  const age = screen.getByPlaceholderText('e.g. 23 (U23)');
  fireEvent.change(age, { target: { value: '23' } });
  fireEvent.change(age, { target: { value: '22' } });
  fireEvent.change(age, { target: { value: '21' } });
  expect(screen.getByRole('button', { name: /Original Player/ })).toBeInTheDocument();
  await waitFor(() => expect(api.getScatterChart).toHaveBeenCalledTimes(2));
  expect(await screen.findByRole('button', { name: /Filtered Player/ })).toBeInTheDocument();
  expect(api.getScatterChart.mock.calls[1][0]).toMatchObject({ age_max: 21 });
});

test('mounting a query link selects the linked metric pair', async () => {
  window.location.hash = '#plots?x=Gls&y=Ast&pos=FW&mins=500';
  api.getScatterChart.mockResolvedValue(chart([point(1, 'Linked Player')]));
  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  await screen.findByRole('button', { name: /Linked Player/ });
  expect(api.getScatterChart.mock.calls[0][0]).toMatchObject({ x: 'Gls', y: 'Ast', position: 'FW' });
});
