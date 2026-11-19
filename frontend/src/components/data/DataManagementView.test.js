import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DataManagementView from './DataManagementView';

const MOCK_SEASONS = [
  {
    id: '2024-2025',
    name: '2024/25 Regular Season',
    is_active: true,
    is_baseline: true,
    is_quarantined: false,
    dataset_status: 'verified_historical',
    records_count: 2854,
    clubs_count: 96,
    source: 'FBref / StatsBomb player-level aggregates',
  },
  {
    id: '2025-2026',
    name: '2025/26 Season',
    is_active: false,
    is_baseline: false,
    is_quarantined: false,
    dataset_status: 'verified_historical',
    records_count: 2611,
    clubs_count: 172,
    partial_competitions: { 'it Serie A': { matchweek: 33, of: 38 } },
    untracked_metrics: ['PrgC', 'PrgP', 'PrgR'],
    source: 'Composite dataset - top 5 European leagues 2025/26',
  },
];

beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/api/seasons/baseline/verify')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              verified: true,
              season: '2024-2025',
              csv_sha256: 'abc1234567890fedcba9876543210abcdef1234567890abcdef1234567890abc',
            },
          }),
      });
    }
    if (url.includes('/api/seasons/2025-2026')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              season: '2025-2026',
              csv_sha256: '999888777666555444333222111000aaabbbcccdddeeefff0001112223334445',
              sha256: '999888777666555444333222111000aaabbbcccdddeeefff0001112223334445',
              file_size_bytes: 284120,
              csv_filename: 'top5-players-2025-2026.csv',
              status_label: 'Historical Season',
              untracked_metrics: ['PrgC', 'PrgP', 'PrgR'],
            },
          }),
      });
    }
    if (url.includes('/api/seasons')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: MOCK_SEASONS }),
      });
    }
    if (url.includes('/api/metadata')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              season: '2024-2025',
              source: 'FBref / StatsBomb player-level aggregates',
              total_players: 2854,
              total_goals: 4806,
              total_assists: 3429,
              total_minutes: 3459684,
              total_teams: 96,
              total_competitions: 5,
            },
          }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true, data: {} }),
    });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('retires broken upload drawer and fake XLSX button while exposing truthful CSV/JSON exports', async () => {
  render(<DataManagementView activeSeason="2024-2025" />);

  expect(await screen.findByText('2025-2026')).toBeInTheDocument();
  expect(screen.queryByText(/Ingest Dataset/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/^XLSX$/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/QUARANTINED/i)).not.toBeInTheDocument();

  expect(screen.getByRole('button', { name: /Download 2025-2026 CSV dataset/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Download 2025-2026 JSON manifest/i })).toBeInTheDocument();
  expect(screen.getByText(/Verified · Partial Snapshot/i)).toBeInTheDocument();
});

test('displays live SHA-256 from baseline verification and per-season manifest', async () => {
  render(<DataManagementView activeSeason="2024-2025" />);

  expect(await screen.findByText('2025-2026')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Verify Baseline Invariant/i }));
  expect(await screen.findByText(/abc1234567…67890abc/i)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /View manifest for 2025-2026/i }));
  await waitFor(() => {
    expect(
      screen.getByText('999888777666555444333222111000aaabbbcccdddeeefff0001112223334445')
    ).toBeInTheDocument();
  });
});
