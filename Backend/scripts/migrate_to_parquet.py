#!/usr/bin/env python3
"""
Migration script: Convert all season CSV files to Parquet format and create DuckDB database.
Run once to prepare the high-performance columnar storage layer.
"""
import os
import sys
import logging
from pathlib import Path

import pandas as pd
import duckdb

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.data_loader import data_loader
from config import METRIC_DEFINITIONS, COMPETITIONS

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / 'data' / 'seasons'
PARQUET_DIR = BASE_DIR / 'data' / 'parquet'
DUCKDB_PATH = BASE_DIR / 'data' / 'pitchpulse.duckdb'

# Ensure output directories exist
PARQUET_DIR.mkdir(parents=True, exist_ok=True)

def get_season_files():
    """Find all season CSV files."""
    seasons = []
    for season_dir in sorted(DATA_DIR.iterdir()):
        if not season_dir.is_dir():
            continue
        csv_files = sorted(path for path in season_dir.glob('top5-players*.csv')
                           if path.name not in {'squad_verification.csv'})
        if csv_files:
            seasons.append((season_dir.name, csv_files[0]))
    return seasons

def normalize_dataframe(df, season_id):
    """Apply the same normalization as data_loader._normalize_dataset"""
    from services.data_loader import slugify
    from services.metric_registry import is_metric_tracked_in_era
    import numpy as np

    df = df.copy()

    # Handle missing demographic values
    if 'Nation' in df.columns:
        df['Nation'] = df['Nation'].fillna('Unknown')
    else:
        df['Nation'] = 'Unknown'

    def parse_age(x):
        if pd.isna(x) or x is None or x == '':
            return None
        s = str(x).strip()
        if '-' in s:
            parts = s.split('-')
            try:
                years = float(parts[0])
                days = float(parts[1]) if len(parts) > 1 and parts[1] else 0.0
                return round(years + (days / 365.25), 1)
            except (ValueError, TypeError):
                pass
        try:
            return float(s)
        except (ValueError, TypeError):
            return None

    df['Age'] = df['Age'].apply(parse_age)
    df['Born'] = df['Born'].apply(lambda x: None if pd.isna(x) else int(x))

    # Ensure standard match counts are clean ints
    int_cols = ['Rk', 'MP', 'Starts', 'Min', 'Gls', 'Ast', 'G+A', 'G-PK', 'PK', 'PKatt', 'CrdY', 'CrdR']
    for col in int_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

    # Progression metrics preserve nulls/missingness
    for col in ['PrgC', 'PrgP', 'PrgR']:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors='coerce')

    # DATA INTEGRITY: Enforce explicit NaN for metrics untracked in this season / competition era
    if season_id:
        for comp in df['Comp'].dropna().unique():
            comp_mask = df['Comp'] == comp
            for metric in ['PrgC', 'PrgP', 'PrgR', 'xG', 'xAG', 'npxG', 'npxG+xAG']:
                if metric in df.columns:
                    if not is_metric_tracked_in_era(metric, season_id, comp):
                        df.loc[comp_mask, metric] = np.nan

    float_cols = ['90s', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90', 'PrgC_90', 'PrgP_90', 'PrgR_90']
    for col in float_cols:
        if col in df.columns:
            if col in ['xG', 'npxG', 'xAG', 'npxG+xAG', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90', 'PrgC_90', 'PrgP_90', 'PrgR_90']:
                df[col] = pd.to_numeric(df[col], errors='coerce').round(2)
            else:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0).astype(float).round(2)

    # Phase 4: Standardize and calculate rate metrics dynamically from count totals whenever Min > 0
    has_minutes = df['Min'] > 0
    rate_derivations = [
        ('Gls', 'Gls_90'),
        ('Ast', 'Ast_90'),
        ('G+A', 'G+A_90'),
        ('G-PK', 'G-PK_90'),
        ('xG', 'xG_90'),
        ('xAG', 'xAG_90'),
        ('npxG', 'npxG_90'),
        ('npxG+xAG', 'npxG+xAG_90'),
        ('PrgC', 'PrgC_90'),
        ('PrgP', 'PrgP_90'),
        ('PrgR', 'PrgR_90')
    ]
    for total_col, rate_col in rate_derivations:
        if total_col in df.columns:
            if rate_col not in df.columns:
                df[rate_col] = np.nan
            df.loc[df[total_col].isna(), rate_col] = np.nan
            recalc_mask = has_minutes & (df[total_col] > 0) & ((df[rate_col] == 0.0) | df[rate_col].isna())
            df.loc[recalc_mask, rate_col] = ((df.loc[recalc_mask, total_col] / df.loc[recalc_mask, 'Min']) * 90.0).round(2)
            zero_mask = has_minutes & (df[total_col] == 0) & df[rate_col].isna()
            df.loc[zero_mask, rate_col] = 0.0
            min_zero_mask = (~has_minutes) & df[total_col].notna() & df[rate_col].isna()
            df.loc[min_zero_mask, rate_col] = 0.0

    if '90s' in df.columns:
        recalc_90s = has_minutes & ((df['90s'] == 0.0) | df['90s'].isna())
        df.loc[recalc_90s, '90s'] = (df.loc[recalc_90s, 'Min'] / 90.0).round(1)
    else:
        df['90s'] = 0.0
        df.loc[has_minutes, '90s'] = (df.loc[has_minutes, 'Min'] / 90.0).round(1)

    if 'G-PK' in df.columns and 'Ast' in df.columns and 'G+A-PK_90' in df.columns:
        recalc_gapk = has_minutes & ((df['G-PK'] > 0) | (df['Ast'] > 0)) & ((df['G+A-PK_90'] == 0.0) | df['G+A-PK_90'].isna())
        df.loc[recalc_gapk, 'G+A-PK_90'] = (((df.loc[recalc_gapk, 'G-PK'] + df.loc[recalc_gapk, 'Ast']) / df.loc[recalc_gapk, 'Min']) * 90.0).round(2)

    if 'xG_90' in df.columns and 'xAG_90' in df.columns and 'xG+xAG_90' in df.columns:
        recalc_xg_xag = has_minutes & ((df['xG_90'] > 0) | (df['xAG_90'] > 0)) & ((df['xG+xAG_90'] == 0.0) | df['xG+xAG_90'].isna())
        df.loc[recalc_xg_xag, 'xG+xAG_90'] = (df.loc[recalc_xg_xag, 'xG_90'].fillna(0) + df.loc[recalc_xg_xag, 'xAG_90'].fillna(0)).round(2)

    # Derived metrics
    if 'Gls' in df.columns and 'xG' in df.columns:
        df['Gls_minus_xG'] = (df['Gls'] - df['xG']).round(2)
        df['xG_minus_Gls'] = (df['xG'] - df['Gls']).round(2)
    if 'Ast' in df.columns and 'xAG' in df.columns:
        df['Ast_minus_xAG'] = (df['Ast'] - df['xAG']).round(2)

    # Stable identifiers and metadata
    df['id'] = df['Rk']
    df['record_id'] = df['Rk']
    df['player_slug'] = df['Player'].apply(slugify)

    def make_player_id(row):
        slug = slugify(row.get('Player', ''))
        born = row.get('Born')
        if pd.notna(born) and born:
            try:
                return f"{slug}-{int(born)}"
            except (ValueError, TypeError):
                pass
        return slug

    df['player_id'] = df.apply(make_player_id, axis=1)

    # Competition normalization
    def map_comp_info(comp_raw):
        info = COMPETITIONS.get(comp_raw, {})
        return pd.Series([
            info.get('id', slugify(comp_raw)),
            info.get('name', comp_raw),
            info.get('country', 'Unknown')
        ])

    df[['competition_id', 'competition_name', 'country']] = df['Comp'].apply(map_comp_info)
    df['league'] = df['competition_name']
    df['season'] = season_id
    df['comparison_key'] = df['Rk'].astype(str) + '@' + season_id

    return df

def migrate():
    """Main migration function."""
    seasons = get_season_files()
    logger.info(f"Found {len(seasons)} seasons to migrate")

    # Remove existing DuckDB file
    if DUCKDB_PATH.exists():
        DUCKDB_PATH.unlink()
        logger.info(f"Removed existing DuckDB: {DUCKDB_PATH}")

    conn = duckdb.connect(str(DUCKDB_PATH))

    # Create main table schema from first season
    first_season_id, first_csv = seasons[0]
    logger.info(f"Reading first season for schema: {first_season_id}")
    raw_df = pd.read_csv(first_csv, encoding='utf-8')
    norm_df = normalize_dataframe(raw_df, first_season_id)

    # Register the normalized dataframe and create table
    conn.register('temp_df', norm_df)
    conn.execute("CREATE TABLE players AS SELECT * FROM temp_df")
    conn.unregister('temp_df')
    logger.info(f"Created 'players' table with {len(norm_df)} rows from {first_season_id}")

    # Append remaining seasons
    for season_id, csv_path in seasons[1:]:
        logger.info(f"Processing {season_id}...")
        try:
            raw_df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            raw_df = pd.read_csv(csv_path, encoding='latin1')

        norm_df = normalize_dataframe(raw_df, season_id)
        conn.register('temp_df', norm_df)
        conn.execute("INSERT INTO players SELECT * FROM temp_df")
        conn.unregister('temp_df')
        logger.info(f"  Added {len(norm_df)} rows from {season_id}")

    # Write individual Parquet files per season (for edge caching / direct access)
    logger.info("Writing individual Parquet files per season...")
    for season_id, csv_path in seasons:
        try:
            raw_df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            raw_df = pd.read_csv(csv_path, encoding='latin1')

        norm_df = normalize_dataframe(raw_df, season_id)
        parquet_path = PARQUET_DIR / f"{season_id}.parquet"
        norm_df.to_parquet(parquet_path, compression='snappy')
        logger.info(f"  Wrote {len(norm_df)} rows to {parquet_path} ({parquet_path.stat().st_size / 1024:.1f} KB)")

    # Create useful indexes/views in DuckDB
    logger.info("Creating indexes and views...")
    conn.execute("CREATE INDEX idx_players_season ON players(season)")
    conn.execute("CREATE INDEX idx_players_comp ON players(competition_id)")
    conn.execute("CREATE INDEX idx_players_pos ON players(Pos)")
    conn.execute("CREATE INDEX idx_players_min ON players(Min)")
    conn.execute("CREATE INDEX idx_players_player_id ON players(player_id)")
    conn.execute("CREATE INDEX idx_players_season_comp ON players(season, competition_id)")

    # View for active season queries (most common)
    conn.execute("""
        CREATE VIEW active_season AS
        SELECT * FROM players
        WHERE season = (SELECT MAX(season) FROM players)
    """)

    # View for per-90 metrics (common queries) - quote columns with special chars
    conn.execute("""
        CREATE VIEW per90_metrics AS
        SELECT
            season, competition_id, competition_name, country,
            Player, Squad, Pos, Min, Gls, Ast, PrgC, PrgP, PrgR, "Gls_90", "Ast_90", "G+A_90", "xG_90", "xAG_90",
            "PrgC_90", "PrgP_90", "PrgR_90", "npxG_90", "npxG+xAG_90"
        FROM players
        WHERE Min > 0
    """)

    # Verify
    total_rows = conn.execute("SELECT COUNT(*) FROM players").fetchone()[0]
    seasons_count = conn.execute("SELECT COUNT(DISTINCT season) FROM players").fetchone()[0]
    logger.info(f"Migration complete!")
    logger.info(f"  Total rows: {total_rows}")
    logger.info(f"  Seasons: {seasons_count}")
    logger.info(f"  DuckDB size: {DUCKDB_PATH.stat().st_size / 1024 / 1024:.2f} MB")

    # Show size comparison
    total_csv_size = sum(p.stat().st_size for _, p in seasons)
    total_parquet_size = sum((PARQUET_DIR / f"{s}.parquet").stat().st_size for s, _ in seasons)
    logger.info(f"  Original CSV total: {total_csv_size / 1024 / 1024:.2f} MB")
    logger.info(f"  Parquet total: {total_parquet_size / 1024 / 1024:.2f} MB")
    logger.info(f"  Compression ratio: {total_csv_size / total_parquet_size:.1f}x")

    conn.close()

if __name__ == '__main__':
    migrate()
