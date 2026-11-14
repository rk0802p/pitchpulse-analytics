import React from 'react';
import { render, screen } from '@testing-library/react';
import DataQualityBadge from './DataQualityBadge';

test('shows a partial-snapshot badge with an accessible Dataset Registry link', () => {
  render(<DataQualityBadge metadata={{ partial_competitions: { 'it Serie A': { matchweek: 33, of: 38 } }, notes: 'Partial source snapshot.' }} />);
  const link = screen.getByRole('link', { name: /partial snapshot.*Partial source snapshot/i });
  expect(link).toHaveAttribute('href', '#data');
  expect(link).toHaveAttribute('title', expect.stringContaining('Partial source snapshot'));
});
