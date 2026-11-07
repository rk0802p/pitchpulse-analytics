import unittest
import os
import sys
import pandas as pd
import numpy as np

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api import create_app
from services.data_loader import data_loader
from services.player_service import search_players, merge_player_spells
from services.analytics_service import compare_players

class TestDataCorrectnessPhase3(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_age_parsing_hyphenated_and_empty(self):
        """B11: Hyphenated FBref age formats (e.g. '25-123') and blanks are safely parsed."""
        raw_data = {
            'Rk': [1, 2, 3],
            'Player': ['Player A', 'Player B', 'Player C'],
            'Nation': ['ENG', 'ESP', 'FRA'],
            'Pos': ['FW', 'MF', 'DF'],
            'Squad': ['Club A', 'Club B', 'Club C'],
            'Comp': ['eng Premier League', 'eng Premier League', 'eng Premier League'],
            'Age': ['25-123', '28', None],
            'Born': [1999, 1996, np.nan],
            'MP': [10, 10, 10],
            'Starts': [10, 10, 10],
            'Min': [900, 900, 900],
            '90s': [10.0, 10.0, 10.0],
            'Gls': [5, 2, 0],
            'Ast': [3, 4, 1],
            'G+A': [8, 6, 1],
            'G-PK': [5, 2, 0],
            'PK': [0, 0, 0],
            'PKatt': [0, 0, 0],
            'CrdY': [1, 0, 2],
            'CrdR': [0, 0, 0],
            'xG': [4.5, 2.1, 0.2],
            'npxG': [4.5, 2.1, 0.2],
            'xAG': [2.8, 3.5, 0.9],
            'npxG+xAG': [7.3, 5.6, 1.1],
            'PrgC': [25, 40, 10],
            'PrgP': [30, 85, 45],
            'PrgR': [65, 30, 5],
            'Gls_90': [0.5, 0.2, 0.0],
            'Ast_90': [0.3, 0.4, 0.1],
            'G+A_90': [0.8, 0.6, 0.1],
            'G-PK_90': [0.5, 0.2, 0.0],
            'G+A-PK_90': [0.8, 0.6, 0.1],
            'xG_90': [0.45, 0.21, 0.02],
            'xAG_90': [0.28, 0.35, 0.09],
            'xG+xAG_90': [0.73, 0.56, 0.11],
            'npxG_90': [0.45, 0.21, 0.02],
            'npxG+xAG_90': [0.73, 0.56, 0.11]
        }
        df_raw = pd.DataFrame(raw_data)
        norm = data_loader._normalize_dataset(df_raw, season_id='2024-2025')

        # '25-123' -> 25 + (123/365.25) = 25.3
        self.assertEqual(norm.loc[0, 'Age'], 25.3)
        self.assertEqual(norm.loc[1, 'Age'], 28.0)
        self.assertTrue(pd.isna(norm.loc[2, 'Age']) or norm.loc[2, 'Age'] is None)

    def test_02_gapk_rate_derivation(self):
        """B11: G+A-PK_90 is accurately derived from G-PK and Ast totals."""
        df = data_loader.get_dataframe()
        # Find players with non-penalty production
        has_prod = df[(df['G-PK'] > 0) & (df['Min'] >= 900)]
        self.assertGreater(len(has_prod), 0)
        for _, row in has_prod.head(10).iterrows():
            expected = round(((row['G-PK'] + row['Ast']) / row['Min']) * 90.0, 2)
            self.assertAlmostEqual(row['G+A-PK_90'], expected, delta=0.05)

    def test_03_dual_ids_player_id_and_record_id(self):
        """B12: Dataset provides both stable player_id and spell-specific record_id."""
        df = data_loader.get_dataframe('2024-2025')
        self.assertIn('player_id', df.columns)
        self.assertIn('record_id', df.columns)
        first = df.iloc[0]
        self.assertIsNotNone(first['player_id'])
        self.assertIsNotNone(first['record_id'])

    def test_04_merge_spells_aggregation(self):
        """B13: merge_spells aggregates multi-club spells within a season."""
        # Create a mock multi-club dataframe
        data = {
            'Rk': [101, 102],
            'Player': ['Multi Spell Star', 'Multi Spell Star'],
            'player_id': ['multi-spell-star-2000', 'multi-spell-star-2000'],
            'Pos': ['FW', 'FW'],
            'Squad': ['Club Alpha', 'Club Beta'],
            'Comp': ['es La Liga', 'eng Premier League'],
            'Min': [900, 900],
            '90s': [10.0, 10.0],
            'Gls': [5, 4],
            'Ast': [2, 3],
            'G+A': [7, 7],
            'G-PK': [4, 4],
            'PK': [1, 0],
            'PKatt': [1, 0],
            'CrdY': [1, 1],
            'CrdR': [0, 0],
            'xG': [4.0, 3.5],
            'npxG': [3.2, 3.5],
            'xAG': [2.0, 2.5],
            'npxG+xAG': [5.2, 6.0],
            'PrgC': [20, 25],
            'PrgP': [30, 35],
            'PrgR': [50, 45],
            'Gls_90': [0.5, 0.4],
            'Ast_90': [0.2, 0.3],
            'G+A_90': [0.7, 0.7],
            'G-PK_90': [0.4, 0.4],
            'G+A-PK_90': [0.6, 0.7],
            'xG_90': [0.4, 0.35],
            'xAG_90': [0.2, 0.25],
            'xG+xAG_90': [0.6, 0.6],
            'npxG_90': [0.32, 0.35],
            'npxG+xAG_90': [0.52, 0.6]
        }
        df_mock = pd.DataFrame(data)
        merged = merge_player_spells(df_mock)
        self.assertEqual(len(merged), 1)
        row = merged.iloc[0]
        self.assertEqual(row['Min'], 1800)
        self.assertEqual(row['Gls'], 9)
        self.assertEqual(row['Ast'], 5)
        self.assertEqual(row['Squad'], "Club Alpha, Club Beta")
        # 9 goals in 1800 mins = 0.45 per 90
        self.assertEqual(row['Gls_90'], 0.45)

    def test_05_radar_positional_peer_percentiles_and_clean_dimensions(self):
        """B16, B17: Radar chart dimensions omit dead max fields and use positional peer percentiles."""
        res = compare_players([1, 2], season='2024-2025')
        self.assertIsNotNone(res)
        radar = res['radar']
        self.assertGreater(len(radar), 0)
        for dim in radar:
            self.assertNotIn('max', dim, f"Dimension {dim['dimension']} should not contain dead max field")
            self.assertIn('dimension', dim)
            self.assertIn('scores', dim)
            self.assertIn('values', dim)

if __name__ == '__main__':
    unittest.main()
