import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ScatterPlot from './ScatterPlot';

const player = (id, x, y) => ({ id, Player: `Player ${id}`, Squad: 'Example FC', Pos: 'FW', Min: 900, x, y });

test('plots signed values inside the chart instead of clipping negative values', () => {
  render(<ScatterPlot points={[player(1, -3, -1), player(2, -1, -4)]} medians={{ x: -2, y: -2.5 }} />);
  const first = screen.getByRole('button', { name: /Player 1/ });
  expect(Number(first.getAttribute('cx'))).toBeGreaterThan(0);
  expect(Number(first.getAttribute('cy'))).toBeGreaterThan(0);
  expect(Number(first.getAttribute('cx'))).toBeLessThan(780);
  expect(Number(first.getAttribute('cy'))).toBeLessThan(458);
});

test('shows an explicit empty state when there are no plotted observations', () => {
  render(<ScatterPlot points={[]} />);
  expect(screen.getByRole('status')).toHaveTextContent('No eligible observations');
});

test('shows per-90 coordinate precision in the point tooltip', () => {
  render(
    <ScatterPlot
      points={[{ ...player(1, 29, 18 * 90 / 3371), y: 18 * 90 / 3371 }]}
      medians={{ x: 29, y: 18 * 90 / 3371 }}
      xLabel="Goals (Gls)"
      yLabel="Assists per 90 (Ast_90)"
      yShort="Assists"
      yMetricId="Ast_90"
    />
  );
  fireEvent.mouseEnter(screen.getByRole('button', { name: /Player 1/ }));
  expect(screen.getByText(/Assists per 90: 0\.4806/)).toBeInTheDocument();
});

test('uses dynamic axes and descriptive metric labels', () => {
  render(
    <ScatterPlot
      points={[player(1, 0, 0), player(2, 31, 18)]}
      medians={{ x: 8, y: 8 }}
      xLabel="Goals (Gls)"
      yLabel="Assists (Ast)"
      xMetricId="Gls"
      yMetricId="Ast"
      xShort="Goals"
      yShort="Assists"
    />
  );

  expect(screen.queryByText('48')).not.toBeInTheDocument();
  expect(screen.getByText('Goals')).toBeInTheDocument();
  expect(screen.getByText('Assists')).toBeInTheDocument();
  expect(screen.getByRole('note')).toHaveTextContent(
    'Median guides: Goals (Gls) 8 · Assists (Ast) 8; tied values can lie on the guides.'
  );
});

test('keeps explicit legacy axis props available to other ScatterPlot callers', () => {
  render(
    <ScatterPlot
      points={[player(1, 10, 12), player(2, 55, 60)]}
      medians={{ x: 32.5, y: 36 }}
      xTickStep={8}
      yTickStep={8}
      xMax={48}
      yMax={48}
    />
  );

  const beyondLimit = screen.getByRole('button', { name: /Player 2/ });
  expect(Number(beyondLimit.getAttribute('cx'))).toBeLessThan(780);
  expect(Number(beyondLimit.getAttribute('cy'))).toBeGreaterThan(0);
  expect(screen.getAllByText('48').length).toBeGreaterThan(0);
});

test('tooltip names both plotted metrics and marks absent values n/a', () => {
  const p = { ...player(1, 8, 6), Comp: 'it Serie A', tooltip: { PrgC_90: 1.25, Gls_minus_xG: null } };
  render(<ScatterPlot points={[p]} xLabel="Progressive Carries (PrgC)" yLabel="Progressive Passes (PrgP)" xShort="Prog. carries" yShort="Prog. passes" xMetricId="PrgC" yMetricId="PrgP" />);
  fireEvent.mouseEnter(screen.getByRole('button', { name: /Player 1/ }));
  expect(screen.getByText(/Prog\. carries: 8 · Prog\. passes: 6/)).toBeInTheDocument();
  expect(screen.getByText(/Goals - xG: n\/a/)).toBeInTheDocument();
  expect(screen.getByText(/Competition: it Serie A/)).toBeInTheDocument();
});

test('discloses that table view is limited to the first 100 plotted players', () => {
  const points = Array.from({ length: 101 }, (_, index) => player(index + 1, index, index));
  render(<ScatterPlot points={points} />);
  fireEvent.click(screen.getByRole('button', { name: /View Table/ }));
  expect(screen.getByRole('status')).toHaveTextContent('Showing the first 100 of 101 plotted players');
});
