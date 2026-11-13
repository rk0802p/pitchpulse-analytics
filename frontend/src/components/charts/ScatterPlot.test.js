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

test('discloses that table view is limited to the first 100 plotted players', () => {
  const points = Array.from({ length: 101 }, (_, index) => player(index + 1, index, index));
  render(<ScatterPlot points={points} />);
  fireEvent.click(screen.getByRole('button', { name: /View Table/ }));
  expect(screen.getByRole('status')).toHaveTextContent('Showing the first 100 of 101 plotted players');
});
