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
    />
  );
  fireEvent.mouseEnter(screen.getByRole('button', { name: /Player 1/ }));
  expect(screen.getByText(/Assists: 0\.4806/)).toBeInTheDocument();
});

test('uses integer axes in steps of three for goals and assists', () => {
  render(
    <ScatterPlot
      points={[player(1, 0, 0), player(2, 31, 18)]}
      medians={{ x: 3, y: 2 }}
      xLabel="Goals (Gls)"
      yLabel="Assists (Ast)"
      xTickStep={3}
      yTickStep={3}
    />
  );

  expect(screen.getAllByText('33').length).toBeGreaterThan(0);
  expect(screen.getAllByText('21').length).toBeGreaterThan(0);
  expect(screen.getAllByText('30').length).toBeGreaterThan(0);
  expect(screen.queryByText('4.69')).not.toBeInTheDocument();
});

test('caps configured axes at 50 and reports values plotted at the edge', () => {
  render(
    <ScatterPlot
      points={[player(1, 10, 12), player(2, 55, 60)]}
      medians={{ x: 32.5, y: 36 }}
      xTickStep={3}
      yTickStep={3}
      xMax={50}
      yMax={50}
    />
  );

  const beyondLimit = screen.getByRole('button', { name: /Player 2/ });
  expect(Number(beyondLimit.getAttribute('cx'))).toBeLessThan(780);
  expect(Number(beyondLimit.getAttribute('cy'))).toBeGreaterThan(0);
  expect(screen.getByRole('status')).toHaveTextContent('exceed the fixed axis maximum');
  expect(screen.getAllByText('50').length).toBeGreaterThan(0);
});

test('discloses that table view is limited to the first 100 plotted players', () => {
  const points = Array.from({ length: 101 }, (_, index) => player(index + 1, index, index));
  render(<ScatterPlot points={points} />);
  fireEvent.click(screen.getByRole('button', { name: /View Table/ }));
  expect(screen.getByRole('status')).toHaveTextContent('Showing the first 100 of 101 plotted players');
});
