import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import api from '../../services/api';
import PlotAnyMetricView from './PlotAnyMetricView';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { getScatterChart: jest.fn(), getScatterRange: jest.fn() }
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
  api.getScatterRange.mockReset();
  window.location.hash = '#plots?x=Gls&y=Ast&pos=FW&mins=500';
});

test('uses the plotted point count and requests the age filter', async () => {
  api.getScatterChart.mockImplementation((params) => Promise.resolve(
    params.age_max === 23
      ? chart([point(1, 'First Player')])
      : chart([point(1, 'First Player'), point(2, 'Second Player')])
  ));

  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  expect(await screen.findByText(/Plotted: 2 players/)).toBeInTheDocument();
  expect(screen.queryByText('48')).not.toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText('e.g. 23 (U23)'), { target: { value: '23' } });
  expect(await screen.findByText(/Plotted: 1 player/)).toBeInTheDocument();
  await waitFor(() => expect(api.getScatterChart.mock.calls.some(([params]) => params.age_max === 23)).toBe(true));
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

test('metric selectors expose combined totals and per-90 rates without a separate rate toggle', async () => {
  window.location.hash = '#plots?x=G%2BA&y=xG%2BxAG&pos=FW&mins=500';
  api.getScatterChart.mockResolvedValue(chart([point(1, 'Combined Player')]));
  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  await screen.findByRole('button', { name: /Combined Player/ });
  expect(api.getScatterChart.mock.calls[0][0]).toMatchObject({ x: 'G+A', y: 'xG+xAG' });
  expect(screen.getAllByRole('option', { name: 'Goals + Assists (G+A)' })).toHaveLength(2);
  expect(screen.getAllByRole('option', { name: 'Expected Goals + Expected Assisted Goals (xG+xAG)' })).toHaveLength(2);
  expect(screen.getAllByRole('option', { name: 'Goals per 90 (Gls_90)' })).toHaveLength(2);
  expect(screen.queryByLabelText('Totals / Per 90')).not.toBeInTheDocument();
});

test('legacy per-90 links select per-90 metrics explicitly', async () => {
  window.location.hash = '#plots?x=Gls&y=Ast&pos=FW&mins=500&perg=1';
  api.getScatterChart.mockResolvedValue(chart([point(1, 'Legacy Rate Player')]));
  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  await screen.findByRole('button', { name: /Legacy Rate Player/ });
  expect(api.getScatterChart.mock.calls[0][0]).toMatchObject({ x: 'Gls_90', y: 'Ast_90' });
  expect(window.location.hash).toContain('x=Gls_90');
  expect(window.location.hash).not.toContain('perg=1');
});

test('lock-scale URL state requests shared ranges with active filters and applies them', async () => {
  window.location.hash = '#plots?x=Gls&y=Ast&pos=FW&comp=es+La+Liga&mins=500&lock=1';
  api.getScatterChart.mockResolvedValue(chart([point(1, 'Range Player')]));
  api.getScatterRange.mockResolvedValue({ success: true, data: { x: { max: 50, signed: false }, y: { max: 24, signed: false } } });
  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  await screen.findByRole('button', { name: /Range Player/ });
  await waitFor(() => expect(api.getScatterRange).toHaveBeenCalled());
  expect(api.getScatterRange.mock.calls[0][0]).toMatchObject({ x: 'Gls', y: 'Ast', position: 'FW', competition: 'es La Liga', min_minutes: 500 });
  expect(screen.getAllByText('50').length).toBeGreaterThan(0);
});

test('lock-scale toggle updates the URL and explains dynamic fallback if range loading fails', async () => {
  window.location.hash = '#plots?x=Gls&y=Ast&pos=FW&mins=500';
  api.getScatterChart.mockResolvedValue(chart([point(1, 'Toggle Player')]));
  api.getScatterRange.mockRejectedValue(new Error('range unavailable'));
  render(<PlotAnyMetricView activeSeason="2024-2025" />);
  const lockToggle = screen.getByLabelText('Compare seasons: lock scale');
  fireEvent.click(lockToggle);
  await waitFor(() => expect(api.getScatterRange).toHaveBeenCalled());
  await waitFor(() => expect(lockToggle).toHaveAttribute('title', expect.stringContaining('using this season’s dynamic scale')));
  expect(window.location.hash).toContain('lock=1');
});

test('untracked progression shows alternative metrics', async () => {
  window.location.hash = '#plots?x=PrgC&y=PrgP&pos=FW&mins=500';
  api.getScatterChart.mockResolvedValue({ points: [], tracking_status: 'not_tracked' });
  render(<PlotAnyMetricView activeSeason="2025-2026" seasonQuality={{ untracked_metrics: ['PrgC', 'PrgP', 'PrgR'], untracked_metrics_reason: 'Progression unavailable.' }} />);
  expect(await screen.findByText('Not tracked for 2025-2026')).toBeInTheDocument();
  expect(screen.getByText('Progression unavailable.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Gls' }));
  await waitFor(() => expect(api.getScatterChart.mock.calls.some(([params]) => params.x === 'Gls' && params.y === 'Ast')).toBe(true));
});
