#!/usr/bin/env python3
"""
PitchPulse Season Injector for 2025/26 and 2026/27.
Generates realistic season progressions with age dynamics, player development trajectories,
and strict canonical 37-column validation.
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import numpy as np
import pandas as pd

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from services.dataset_importer import DatasetImporter

def generate_season_df(base_df, year_offset, seed, season_name):
    np.random.seed(seed)
    df = base_df.copy()

    # 1. Age progression
    df['Age'] = df['Age'] + year_offset

    # 2. Performance trajectory multiplier based on age
    def get_mult(age):
        if pd.isna(age):
            return 1.0
        if age <= 22:
            return float(np.random.uniform(1.08, 1.25))
        elif age <= 28:
            return float(np.random.uniform(0.95, 1.08))
        elif age <= 32:
            return float(np.random.uniform(0.88, 1.02))
        else:
            return float(np.random.uniform(0.75, 0.95))

    multipliers = np.array([get_mult(a) for a in df['Age']], dtype=float)

    # Highlight stars with realistic career development trajectories
    star_boosts = {
        'Lamine Yamal': 1.45 if year_offset == 1 else 1.80,
        'Erling Haaland': 1.15 if year_offset == 1 else 1.22,
        'Florian Wirtz': 1.20 if year_offset == 1 else 1.30,
        'Cole Palmer': 1.15 if year_offset == 1 else 1.22,
        'Bukayo Saka': 1.12 if year_offset == 1 else 1.20,
        'Vinicius Junior': 1.14 if year_offset == 1 else 1.25,
        'Jude Bellingham': 1.15 if year_offset == 1 else 1.25,
        'Jamal Musiala': 1.18 if year_offset == 1 else 1.28
    }

    for i, p_name in enumerate(df['Player']):
        for star, boost in star_boosts.items():
            if star.lower() in str(p_name).lower():
                multipliers[i] = boost

    # Scale minutes and matches
    df['Min'] = np.clip((df['Min'] * np.random.uniform(0.90, 1.08, size=len(df))).round(), 10, 3420).astype(int)
    df['90s'] = (df['Min'] / 90.0).round(1)
    nineties = df['90s'].apply(lambda x: x if x > 0 else 1.0)
    has_min = df['90s'] > 0

    # Counting stats
    df['Gls'] = np.clip((df['Gls'] * multipliers + np.random.normal(0, 0.4, size=len(df))).round(), 0, 50).astype(int)
    df['Ast'] = np.clip((df['Ast'] * multipliers + np.random.normal(0, 0.4, size=len(df))).round(), 0, 35).astype(int)
    df['PK'] = np.clip((df['PK'] * np.random.uniform(0.8, 1.2, size=len(df))).round(), 0, df['Gls']).astype(int)
    df['PKatt'] = np.maximum(df['PK'], (df['PK'] + np.random.choice([0, 1], size=len(df), p=[0.8, 0.2])).astype(int))
    df['G-PK'] = df['Gls'] - df['PK']
    df['G+A'] = df['Gls'] + df['Ast']

    df['CrdY'] = np.clip((df['CrdY'] * np.random.uniform(0.8, 1.2, size=len(df))).round(), 0, 18).astype(int)
    df['CrdR'] = np.clip((df['CrdR'] * np.random.uniform(0.7, 1.3, size=len(df))).round(), 0, 4).astype(int)

    # Advanced stats
    df['xG'] = np.clip((df['Gls'] * np.random.uniform(0.88, 1.05, size=len(df))).round(1), 0.0, 45.0)
    df['npxG'] = np.clip((df['xG'] - df['PK'] * 0.79).round(1), 0.0, 45.0)
    df['xAG'] = np.clip((df['Ast'] * np.random.uniform(0.88, 1.10, size=len(df))).round(1), 0.0, 30.0)
    df['npxG+xAG'] = (df['npxG'] + df['xAG']).round(2)

    # Progression
    df['PrgC'] = np.clip((df['PrgC'] * multipliers).round(), 0, 220).astype(int)
    df['PrgP'] = np.clip((df['PrgP'] * multipliers).round(), 0, 350).astype(int)
    df['PrgR'] = np.clip((df['PrgR'] * multipliers).round(), 0, 400).astype(int)

    # Per-90 Rates
    df['Gls_90'] = np.where(has_min, (df['Gls'] / nineties).round(2), 0.0)
    df['Ast_90'] = np.where(has_min, (df['Ast'] / nineties).round(2), 0.0)
    df['G+A_90'] = np.where(has_min, (df['G+A'] / nineties).round(2), 0.0)
    df['G-PK_90'] = np.where(has_min, (df['G-PK'] / nineties).round(2), 0.0)
    df['G+A-PK_90'] = np.where(has_min, ((df['G-PK'] + df['Ast']) / nineties).round(2), 0.0)
    df['xG_90'] = np.where(has_min, (df['xG'] / nineties).round(2), 0.0)
    df['xAG_90'] = np.where(has_min, (df['xAG'] / nineties).round(2), 0.0)
    df['xG+xAG_90'] = (df['xG_90'] + df['xAG_90']).round(2)
    df['npxG_90'] = np.where(has_min, (df['npxG'] / nineties).round(2), 0.0)
    df['npxG+xAG_90'] = (df['npxG_90'] + df['xAG_90']).round(2)

    df['Rk'] = range(1, len(df) + 1)
    return df

def main():
    base_path = os.path.join(BACKEND_DIR, 'data', 'seasons', '2024-2025', 'top5-players24-25.csv')
    df_base = pd.read_csv(base_path)

    print("Generating 2025-2026 season dataset...")
    df_2526 = generate_season_df(df_base, year_offset=1, seed=42, season_name='2025-2026')

    print("Generating 2026-2027 season dataset...")
    df_2627 = generate_season_df(df_base, year_offset=2, seed=84, season_name='2026-2027')

    importer = DatasetImporter(strict=True)

    temp_2526 = os.path.join(BACKEND_DIR, 'data', 'temp_2526_inject.csv')
    temp_2627 = os.path.join(BACKEND_DIR, 'data', 'temp_2627_inject.csv')

    df_2526.to_csv(temp_2526, index=False)
    df_2627.to_csv(temp_2627, index=False)

    try:
        print("Importing season 2025-2026...")
        res_2526 = importer.import_file(
            file_path=temp_2526,
            season='2025-2026',
            source_name='PitchPulse Football Intelligence (2025/26 Season Projections)',
            output_format='both',
            dry_run=False
        )
        print(f"  ✓ Season 2025-2026 registered with {res_2526['records_count']:,} players.")

        print("Importing season 2026-2027...")
        res_2627 = importer.import_file(
            file_path=temp_2627,
            season='2026-2027',
            source_name='PitchPulse Football Intelligence (2026/27 Season Projections)',
            output_format='both',
            dry_run=False
        )
        print(f"  ✓ Season 2026-2027 registered with {res_2627['records_count']:,} players.")

        print("\nAll seasons injected successfully!")
        return 0
    finally:
        if os.path.exists(temp_2526):
            os.remove(temp_2526)
        if os.path.exists(temp_2627):
            os.remove(temp_2627)

if __name__ == '__main__':
    sys.exit(main())
