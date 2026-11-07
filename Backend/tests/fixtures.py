"""
PitchPulse Hermetic Test Fixture Builder.
Generates isolated, reproducible in-memory or temporary disk datasets
strictly adhering to the 37-column canonical schema.
"""

import os
import tempfile
import pandas as pd
import numpy as np

CANONICAL_COLUMNS = [
    'Rk', 'Player', 'Nation', 'Pos', 'Squad', 'Comp', 'Age', 'Born',
    'MP', 'Starts', 'Min', '90s', 'Gls', 'Ast', 'G+A', 'G-PK', 'PK', 'PKatt',
    'CrdY', 'CrdR', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'PrgC', 'PrgP', 'PrgR',
    'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90', 'xG_90', 'xAG_90',
    'xG+xAG_90', 'npxG_90', 'npxG+xAG_90'
]

def build_hermetic_season_df(num_rows=60, season_id="2098-2099", seed=42):
    """
    Constructs a synthetic, self-consistent DataFrame of player statistics
    covering all 5 Big Five leagues and major positions.
    """
    rng = np.random.default_rng(seed)
    comps = [
        "eng Premier League", "es La Liga", "it Serie A",
        "de Bundesliga", "fr Ligue 1"
    ]
    positions = ["FW", "MF", "DF", "GK", "FW,MF", "MF,FW", "DF,MF"]
    squads = [f"Club {chr(65 + (i % 26))}{i // 26}" for i in range(20)]

    records = []
    for rk in range(1, num_rows + 1):
        comp = comps[rk % len(comps)]
        pos = positions[rk % len(positions)]
        squad = squads[rk % len(squads)]
        born = int(rng.integers(1990, 2006))
        age = round(2024.0 - born + float(rng.uniform(0.1, 0.9)), 1)
        mp = int(rng.integers(5, 38))
        starts = int(rng.integers(0, mp + 1))
        minutes = int(starts * rng.integers(60, 90) + (mp - starts) * rng.integers(10, 30))
        minutes = max(90, minutes)
        nineties = round(minutes / 90.0, 1)

        gls = int(rng.integers(0, 25)) if "FW" in pos else (int(rng.integers(0, 10)) if "MF" in pos else int(rng.integers(0, 3)))
        pk = int(rng.integers(0, min(5, gls + 1)))
        g_pk = gls - pk
        pkatt = pk + int(rng.integers(0, 2))
        ast = int(rng.integers(0, 15)) if "MF" in pos or "FW" in pos else int(rng.integers(0, 4))
        g_plus_a = gls + ast

        crdy = int(rng.integers(0, 8))
        crdr = int(rng.integers(0, 2))

        xg = round(float(gls * rng.uniform(0.7, 1.3)), 2)
        npxg = round(max(0.0, float(xg - (pk * 0.79))), 2)
        xag = round(float(ast * rng.uniform(0.6, 1.4)), 2)
        npxg_xag = round(npxg + xag, 2)

        prgc = int(rng.integers(5, 120))
        prgp = int(rng.integers(10, 180))
        prgr = int(rng.integers(10, 200))

        gls_90 = round((gls / minutes) * 90.0, 2)
        ast_90 = round((ast / minutes) * 90.0, 2)
        ga_90 = round((g_plus_a / minutes) * 90.0, 2)
        g_pk_90 = round((g_pk / minutes) * 90.0, 2)
        ga_pk_90 = round(((g_pk + ast) / minutes) * 90.0, 2)
        xg_90 = round((xg / minutes) * 90.0, 2)
        xag_90 = round((xag / minutes) * 90.0, 2)
        xg_xag_90 = round((xg_90 + xag_90), 2)
        npxg_90 = round((npxg / minutes) * 90.0, 2)
        npxg_xag_90 = round((npxg_90 + xag_90), 2)

        row = {
            'Rk': rk,
            'Player': f"Hermetic Player {rk:03d}",
            'Nation': "ENG",
            'Pos': pos,
            'Squad': squad,
            'Comp': comp,
            'Age': age,
            'Born': born,
            'MP': mp,
            'Starts': starts,
            'Min': minutes,
            '90s': nineties,
            'Gls': gls,
            'Ast': ast,
            'G+A': g_plus_a,
            'G-PK': g_pk,
            'PK': pk,
            'PKatt': pkatt,
            'CrdY': crdy,
            'CrdR': crdr,
            'xG': xg,
            'npxG': npxg,
            'xAG': xag,
            'npxG+xAG': npxg_xag,
            'PrgC': prgc,
            'PrgP': prgp,
            'PrgR': prgr,
            'Gls_90': gls_90,
            'Ast_90': ast_90,
            'G+A_90': ga_90,
            'G-PK_90': g_pk_90,
            'G+A-PK_90': ga_pk_90,
            'xG_90': xg_90,
            'xAG_90': xag_90,
            'xG+xAG_90': xg_xag_90,
            'npxG_90': npxg_90,
            'npxG+xAG_90': npxg_xag_90
        }
        records.append(row)

    df = pd.DataFrame(records)
    return df[CANONICAL_COLUMNS]

class HermeticSeasonFixture:
    """Context manager for creating a fully isolated temporary season dataset directory."""
    def __init__(self, season_id="2097-2098", num_rows=60):
        self.season_id = season_id
        self.num_rows = num_rows
        self.temp_dir = None
        self.season_dir = None

    def __enter__(self):
        self.temp_dir = tempfile.mkdtemp(prefix=f"pp_fixture_{self.season_id}_")
        self.season_dir = os.path.join(self.temp_dir, self.season_id)
        os.makedirs(self.season_dir, exist_ok=True)

        df = build_hermetic_season_df(num_rows=self.num_rows, season_id=self.season_id)
        csv_path = os.path.join(self.season_dir, f"top5-players-{self.season_id}.csv")
        df.to_csv(csv_path, index=False)
        self.df = df
        self.csv_path = csv_path
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        import shutil
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)
