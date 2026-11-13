#!/usr/bin/env python3
"""Read-only parity audit for season CSV, XLSX, Parquet, and DuckDB stores."""

import argparse
from collections import Counter
import json
from pathlib import Path
import sys

import duckdb
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))
from config import COMPETITIONS

SEASONS_DIR = BACKEND_DIR / 'data' / 'seasons'
PARQUET_DIR = BACKEND_DIR / 'data' / 'parquet'
DUCKDB_PATH = BACKEND_DIR / 'data' / 'pitchpulse.duckdb'

SUMMARY_METRICS = ('Gls', 'Ast', 'Min')
TRACKING_METRICS = ('xG', 'xAG', 'PrgC', 'PrgP', 'PrgR')
PLAYER_FIELDS = ('Player', 'Squad', 'Comp', 'Min', 'Gls', 'Ast', *TRACKING_METRICS)
PER90_FIELDS = ('Player', 'Squad', 'Comp', 'Min', 'Gls', 'Ast', 'PrgC', 'PrgP', 'PrgR')
COMPETITION_BY_NAME = {value['name']: raw for raw, value in COMPETITIONS.items()}


def _numeric(value):
    if pd.isna(value):
        return None
    return round(float(value), 8)


def frame_summary(frame, fields=PLAYER_FIELDS):
    """Return stable counts, totals, null counts, and a row-level multiset signature."""
    missing = [field for field in fields if field not in frame.columns]
    if missing:
        raise ValueError(f'Missing parity columns: {missing}')

    rows = []
    for row in frame.loc[:, list(fields)].itertuples(index=False, name=None):
        normalized = []
        for field, value in zip(fields, row):
            if field in ('Player', 'Squad', 'Comp', 'competition_name'):
                normalized.append(None if pd.isna(value) else str(value))
            else:
                normalized.append(_numeric(value))
        rows.append(tuple(normalized))

    metric_cols = [metric for metric in TRACKING_METRICS if metric in frame.columns and metric in fields]
    totals = {}
    for metric in SUMMARY_METRICS:
        if metric not in frame.columns:
            raise ValueError(f'Missing parity metric: {metric}')
        values = pd.to_numeric(frame[metric], errors='coerce')
        totals[metric] = int(values.sum())

    return {
        'rows': len(frame),
        'totals': totals,
        'nulls': {
            metric: int(frame[metric].isna().sum())
            for metric in metric_cols
        },
        'row_multiset': Counter(rows),
    }


def compare_frames(expected, actual, fields=PLAYER_FIELDS):
    left = frame_summary(expected, fields)
    right = frame_summary(actual, fields)
    mismatches = []
    for key in ('rows', 'totals', 'nulls', 'row_multiset'):
        if left[key] != right[key]:
            mismatches.append(key)
    return mismatches, right


def _resolve_manifest_file(season_dir, filename):
    if not filename:
        return None
    path = (season_dir / filename).resolve()
    if not path.is_relative_to(season_dir.resolve()):
        raise ValueError(f'Manifest file path escapes season directory: {filename}')
    return path


def _read_csv(path):
    try:
        return pd.read_csv(path, encoding='utf-8')
    except UnicodeDecodeError:
        return pd.read_csv(path, encoding='latin1')


def _fmt_total(value):
    return f'{value:,}'


def audit_season(season_dir, connection):
    manifest_path = season_dir / 'manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    files = manifest.get('files', {})
    csv_path = _resolve_manifest_file(season_dir, files.get('csv'))
    xlsx_path = _resolve_manifest_file(season_dir, files.get('excel'))
    if not csv_path or not csv_path.is_file():
        raise FileNotFoundError(f'{season_dir.name}: manifest CSV is missing')

    csv_frame = _read_csv(csv_path)
    parquet_path = PARQUET_DIR / f'{season_dir.name}.parquet'
    duck_players = connection.execute(
        'SELECT * FROM players WHERE season = ?', [season_dir.name]
    ).fetchdf()
    duck_per90 = connection.execute(
        '''SELECT Player, Squad, competition_name, Min, Gls, Ast, PrgC, PrgP, PrgR
           FROM per90_metrics WHERE season = ?''', [season_dir.name]
    ).fetchdf()
    duck_per90['Comp'] = duck_per90['competition_name'].map(COMPETITION_BY_NAME)
    expected_per90 = csv_frame[pd.to_numeric(csv_frame['Min'], errors='coerce') > 0]

    candidates = {
        'CSV': (csv_frame, PLAYER_FIELDS),
        'Parquet': (pd.read_parquet(parquet_path), PLAYER_FIELDS),
        'DuckDB players': (duck_players, PLAYER_FIELDS),
        'DuckDB per90_metrics': (duck_per90, PER90_FIELDS),
    }
    if xlsx_path and xlsx_path.is_file():
        candidates['XLSX'] = (pd.read_excel(xlsx_path), PLAYER_FIELDS)
    else:
        candidates['XLSX'] = (None, PLAYER_FIELDS)

    output = []
    for label, (frame, fields) in candidates.items():
        if frame is None:
            output.append((label, 'MISSING', None, None, None, None, None))
            continue
        expected = expected_per90 if label == 'DuckDB per90_metrics' else csv_frame
        differences, actual_summary = compare_frames(expected, frame, fields)
        status = 'OK' if not differences else 'FAIL(' + ','.join(differences) + ')'
        null_count = sum(actual_summary['nulls'].values())
        output.append((
            label,
            status,
            actual_summary['rows'],
            _fmt_total(actual_summary['totals']['Gls']),
            _fmt_total(actual_summary['totals']['Ast']),
            _fmt_total(actual_summary['totals']['Min']),
            null_count
        ))
    return output


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--season', help='Audit one canonical season, e.g. 2025-2026')
    args = parser.parse_args(argv)

    if not DUCKDB_PATH.is_file():
        parser.error(f'DuckDB database not found: {DUCKDB_PATH}')
    with duckdb.connect(str(DUCKDB_PATH), read_only=True) as connection:
        seasons = [SEASONS_DIR / args.season] if args.season else sorted(SEASONS_DIR.iterdir())
        print('season | store | rows | goals | assists | minutes | tracked_metric_nulls | parity')
        failures = 0
        for season_dir in seasons:
            if not season_dir.is_dir() or not (season_dir / 'manifest.json').is_file():
                continue
            for label, status, rows, goals, assists, minutes, null_count in audit_season(season_dir, connection):
                print(f'{season_dir.name} | {label} | {rows if rows is not None else "-"} | '
                      f'{goals if goals is not None else "-"} | {assists if assists is not None else "-"} | '
                      f'{minutes if minutes is not None else "-"} | {null_count if null_count is not None else "-"} | {status}')
                if status != 'OK':
                    failures += 1
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
