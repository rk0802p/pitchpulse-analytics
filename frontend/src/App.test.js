import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import App from './App';
import LeagueBanner from './components/LeagueBanner';
import PlayerCard from './components/PlayerCard';

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/leagues')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(['eng Premier League', 'es La Liga']),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders Select a League heading and loads leagues', async () => {
  await act(async () => {
    render(<App />);
  });

  const heading = screen.getByText(/Select a League/i);
  expect(heading).toBeInTheDocument();

  await waitFor(() => {
    expect(screen.getByText('eng Premier League')).toBeInTheDocument();
  });
});

test('renders LeagueBanner with league name', () => {
  const mockSelect = jest.fn();
  render(<LeagueBanner league={{ name: 'eng Premier League' }} onSelect={mockSelect} />);
  expect(screen.getByText('eng Premier League')).toBeInTheDocument();
});

test('renders PlayerCard with player stats', () => {
  const dummyPlayer = {
    Rk: 1,
    Player: 'Bukayo Saka',
    Pos: 'FW',
    Gls: 10,
    Ast: 8,
    MP: 25,
    Min: 2100,
    Starts: 24,
    CrdY: 2,
    CrdR: 0,
  };
  render(<PlayerCard player={dummyPlayer} />);
  expect(screen.getByText('Bukayo Saka')).toBeInTheDocument();
  expect(screen.getByText('10')).toBeInTheDocument();
  expect(screen.getByText('8')).toBeInTheDocument();
  expect(screen.getByText('25')).toBeInTheDocument();
});
