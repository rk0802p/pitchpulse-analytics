import unittest
import pandas as pd
import numpy as np
from services.data_loader import data_loader
from services.player_service import search_players, merge_player_spells
from services.metric_registry import is_metric_tracked_in_era, get_metric_registry
from services.validation_service import validate_metric

class TestProgressionRates(unittest.TestCase):
    def setUp(self):
        data_loader.initialize()

    def test_metric_definitions_and_aliases(self):
        self.assertEqual(validate_metric('PrgC_90'), 'PrgC_90')
        self.assertEqual(validate_metric('PrgP_90'), 'PrgP_90')
        self.assertEqual(validate_metric('PrgR_90'), 'PrgR_90')
        self.assertEqual(validate_metric('prgc_90'), 'PrgC_90')
        self.assertEqual(validate_metric('prgp_90'), 'PrgP_90')
        self.assertEqual(validate_metric('prgr_90'), 'PrgR_90')

    def test_metric_tracked_in_era(self):
        # 2024-2025: All progression metrics and per-90s tracked
        self.assertTrue(is_metric_tracked_in_era('PrgC', '2024-2025'))
        self.assertTrue(is_metric_tracked_in_era('PrgC_90', '2024-2025'))
        self.assertTrue(is_metric_tracked_in_era('PrgP_90', '2024-2025'))
        self.assertTrue(is_metric_tracked_in_era('PrgR_90', '2024-2025'))

        # 2012-2013 (Pre-xG Era): Progression rates untracked
        self.assertFalse(is_metric_tracked_in_era('PrgC_90', '2012-2013'))
        self.assertFalse(is_metric_tracked_in_era('PrgP_90', '2012-2013'))
        self.assertFalse(is_metric_tracked_in_era('PrgR_90', '2012-2013'))

        # 2015-2016 (Early xG Era): Progression rates untracked
        self.assertFalse(is_metric_tracked_in_era('PrgC_90', '2015-2016'))
        self.assertFalse(is_metric_tracked_in_era('PrgP_90', '2015-2016'))

    def test_dynamic_calculation_in_2024_2025(self):
        df = data_loader.get_dataframe('2024-2025')
        self.assertIn('PrgC_90', df.columns)
        self.assertIn('PrgP_90', df.columns)
        self.assertIn('PrgR_90', df.columns)

        # Check Pedri
        pedri_rows = df[df['Player'].str.contains('Pedri', na=False)]
        self.assertGreater(len(pedri_rows), 0)
        pedri = pedri_rows.iloc[0]
        expected_prgp_90 = round((float(pedri['PrgP']) / float(pedri['Min'])) * 90.0, 2)
        self.assertEqual(pedri['PrgP_90'], expected_prgp_90)
        self.assertAlmostEqual(pedri['PrgP_90'], 11.25, delta=0.05)

        # Check Takefusa Kubo
        kubo_rows = df[df['Player'].str.contains('Takefusa Kubo', na=False)]
        self.assertGreater(len(kubo_rows), 0)
        kubo = kubo_rows.iloc[0]
        expected_prgc_90 = round((float(kubo['PrgC']) / float(kubo['Min'])) * 90.0, 2)
        self.assertEqual(kubo['PrgC_90'], expected_prgc_90)
        self.assertAlmostEqual(kubo['PrgC_90'], 5.05, delta=0.05)

    def test_search_players_sorting_by_progression_rate(self):
        players, total = search_players(
            season='2024-2025',
            competition='es La Liga',
            position='MF',
            min_minutes=1500,
            sort_by='PrgP_90',
            order='desc',
            limit=10
        )
        self.assertGreater(len(players), 0)
        # Rates must be in descending order
        rates = [p['PrgP_90'] for p in players if p.get('PrgP_90') is not None]
        self.assertEqual(rates, sorted(rates, reverse=True))
        # Top rate should be around 10-12 per 90, NOT raw 360
        self.assertLess(rates[0], 25.0)
        self.assertGreater(rates[0], 5.0)

    def test_merge_player_spells_recalculates_prog_rates(self):
        sample_df = pd.DataFrame([
            {
                'player_id': 'test-player-1998',
                'Player': 'Test Player',
                'Squad': 'Club A',
                'Comp': 'eng Premier League',
                'Min': 900,
                'PrgC': 30,
                'PrgP': 50,
                'PrgR': 40,
                'Gls': 2, 'Ast': 1, 'xG': 1.5, 'xAG': 1.2
            },
            {
                'player_id': 'test-player-1998',
                'Player': 'Test Player',
                'Squad': 'Club B',
                'Comp': 'es La Liga',
                'Min': 900,
                'PrgC': 30,
                'PrgP': 50,
                'PrgR': 40,
                'Gls': 1, 'Ast': 2, 'xG': 1.0, 'xAG': 1.8
            }
        ])
        merged = merge_player_spells(sample_df)
        self.assertEqual(len(merged), 1)
        row = merged.iloc[0]
        self.assertEqual(row['Min'], 1800)
        self.assertEqual(row['PrgC'], 60)
        self.assertEqual(row['PrgP'], 100)
        self.assertEqual(row['PrgR'], 80)
        # (60 / 1800) * 90 = 3.00
        self.assertEqual(row['PrgC_90'], 3.0)
        # (100 / 1800) * 90 = 5.00
        self.assertEqual(row['PrgP_90'], 5.0)
        # (80 / 1800) * 90 = 4.00
        self.assertEqual(row['PrgR_90'], 4.0)

if __name__ == '__main__':
    unittest.main()
