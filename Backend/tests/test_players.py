import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

class TestPlayersEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_get_players_paginated_default(self):
        res = self.client.get('/api/players?season=2024-2025')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']), 50)
        self.assertEqual(data['pagination']['total'], 2854)
        self.assertEqual(data['pagination']['page'], 1)
        self.assertEqual(data['pagination']['limit'], 50)
        self.assertTrue(data['pagination']['has_next'])
        self.assertFalse(data['pagination']['has_prev'])

    def test_search_player_by_name(self):
        res = self.client.get('/api/players?search=Saka')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreater(len(data['data']), 0)
        first = data['data'][0]
        self.assertIn('Saka', first['Player'])
        self.assertEqual(first['Squad'], 'Arsenal')

    def test_filter_by_competition_and_squad(self):
        res = self.client.get('/api/players?competition=premier-league&squad=Arsenal')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        for p in data['data']:
            self.assertEqual(p['Squad'], 'Arsenal')
            self.assertEqual(p['Comp'], 'eng Premier League')

    def test_filter_by_position_and_min_minutes(self):
        res = self.client.get('/api/players?position=FW&min_minutes=1000&sort_by=xG&order=desc')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertGreater(len(data['data']), 0)
        for p in data['data']:
            self.assertIn('FW', p['Pos'])
            self.assertGreaterEqual(p['Min'], 1000)

        # Check descending sort
        xgs = [p['xG'] for p in data['data']]
        self.assertEqual(xgs, sorted(xgs, reverse=True))

    def test_get_player_profile_by_id(self):
        res = self.client.get('/api/players/1')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        profile = data['data']
        self.assertIn('identity', profile)
        self.assertIn('playing_time', profile)
        self.assertIn('scoring', profile)
        self.assertIn('playmaking', profile)
        self.assertIn('progression', profile)
        self.assertIn('discipline', profile)
        self.assertIn('per_90_rates', profile)
        self.assertIn('percentiles', profile)
        self.assertEqual(profile['identity']['id'], 1)

    def test_get_player_profile_not_found(self):
        res = self.client.get('/api/players/999999')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertIn('error', data)

    def test_legacy_player_by_team(self):
        res = self.client.get('/api/players/eng Premier League/Arsenal')
        self.assertEqual(res.status_code, 200)
        players = res.get_json()
        self.assertIsInstance(players, list)
        self.assertGreater(len(players), 0)
        self.assertEqual(players[0]['Squad'], 'Arsenal')

    def test_legacy_player_profile(self):
        res = self.client.get('/api/player/1')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('player', data)
        self.assertIn('statistics', data)

    def test_legacy_players_url_encoded(self):
        res = self.client.get('/api/players/es%20La%20Liga/Real%20Madrid')
        self.assertEqual(res.status_code, 200)
        players = res.get_json()
        self.assertIsInstance(players, list)
        self.assertGreater(len(players), 0)
        self.assertEqual(players[0]['Squad'], 'Real Madrid')

    def test_historical_player_profile_untracked_metrics(self):
        # In 2018-2019, progression metrics (PrgC, PrgP, PrgR) were untracked in historical Understat datasets
        res = self.client.get('/api/players/1?season=2018-2019')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        profile = data['data']
        self.assertEqual(profile['season'], '2018-2019')
        
        # Check progression untracked flags in percentiles
        pcts = profile['percentiles']
        self.assertFalse(pcts['progressive_carries']['is_tracked'])
        self.assertIsNone(pcts['progressive_carries']['percentile'])
        self.assertFalse(pcts['progressive_passes']['is_tracked'])
        self.assertIsNone(pcts['progressive_passes']['percentile'])
        
        # Check scoring has genuine Understat xG metrics
        self.assertTrue(pcts['xg_per_90']['is_tracked'])
        self.assertIsNotNone(pcts['xg_per_90']['percentile'])


    def test_kane_2025_2026_rates_and_percentiles(self):
        """Verify Harry Kane in 2025-2026 has dynamically derived xG/xAG rates,
        correct 100th percentile for xG/90 (not 0 at 0th pct), and untracked progression."""
        res = self.client.get('/api/players/1507?season=2025-2026')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        profile = data['data']
        self.assertEqual(profile['identity']['name'], 'Harry Kane')

        rates = profile['per_90_rates']
        self.assertEqual(rates['goals_per_90'], 1.36)
        self.assertEqual(rates['assists_per_90'], 0.19)
        self.assertEqual(rates['xg_per_90'], 0.94)
        self.assertEqual(rates['xag_per_90'], 0.14)

        pcts = profile['percentiles']
        # Goals / 90: 1.36 at 100th percentile
        self.assertTrue(pcts['goals_per_90']['is_tracked'])
        self.assertEqual(pcts['goals_per_90']['percentile'], 100)
        self.assertEqual(pcts['goals_per_90']['value'], 1.36)

        # Shot Threat (xG/90): 0.94 at 100th percentile (was 0 at 0th pct in bug report)
        self.assertTrue(pcts['xg_per_90']['is_tracked'])
        self.assertEqual(pcts['xg_per_90']['percentile'], 100)
        self.assertEqual(pcts['xg_per_90']['value'], 0.94)

        # Assists / 90: 0.19 at 73rd percentile
        self.assertTrue(pcts['assists_per_90']['is_tracked'])
        self.assertEqual(pcts['assists_per_90']['percentile'], 73)
        self.assertEqual(pcts['assists_per_90']['value'], 0.19)

        # Creation Quality (xAG/90): 0.14 at 75th percentile (was 0 at 0th pct in bug report)
        self.assertTrue(pcts['xag_per_90']['is_tracked'])
        self.assertEqual(pcts['xag_per_90']['percentile'], 75)
        self.assertEqual(pcts['xag_per_90']['value'], 0.14)

        # Progression metrics untracked for Bundesliga in 2025-2026 dataset
        for prog_key in ['progressive_carries', 'progressive_passes', 'progressive_receptions']:
            self.assertFalse(pcts[prog_key]['is_tracked'])
            self.assertIsNone(pcts[prog_key]['percentile'])
            self.assertIsNone(pcts[prog_key]['value'])

        self.assertEqual(pcts['peer_sample_size'], 574)

    def test_kane_2024_2025_complete_tracking(self):
        """Verify Harry Kane in 2024-2025 has all 7 benchmark metrics tracked and populated."""
        res = self.client.get('/api/players/1318?season=2024-2025')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        profile = data['data']
        self.assertEqual(profile['identity']['name'], 'Harry Kane')

        rates = profile['per_90_rates']
        self.assertEqual(rates['goals_per_90'], 0.98)
        self.assertEqual(rates['xg_per_90'], 0.77)
        self.assertEqual(rates['assists_per_90'], 0.34)
        self.assertEqual(rates['xag_per_90'], 0.20)
        self.assertEqual(rates['progressive_carries_per_90'], 1.10)
        self.assertEqual(rates['progressive_passes_per_90'], 3.67)
        self.assertEqual(rates['progressive_receptions_per_90'], 5.41)

        pcts = profile['percentiles']
        for metric_key in ['goals_per_90', 'xg_per_90', 'assists_per_90', 'xag_per_90',
                           'progressive_carries', 'progressive_passes', 'progressive_receptions']:
            self.assertTrue(pcts[metric_key]['is_tracked'], f"{metric_key} should be tracked in 2024-2025")
            self.assertIsNotNone(pcts[metric_key]['percentile'])
            self.assertIsNotNone(pcts[metric_key]['value'])

        self.assertEqual(pcts['progressive_carries']['value'], 29)
        self.assertEqual(pcts['progressive_passes']['value'], 97)
        self.assertEqual(pcts['progressive_receptions']['value'], 143)
        self.assertEqual(pcts['peer_sample_size'], 749)

    def test_messi_2018_2019_profile(self):
        """Verify Lionel Messi in 2018-2019 has high xG/xAG percentiles and untracked spatial progression."""
        res = self.client.get('/api/players/1?season=2018-2019')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        profile = data['data']
        self.assertEqual(profile['identity']['name'], 'Lionel Messi')

        rates = profile['per_90_rates']
        self.assertEqual(rates['goals_per_90'], 1.20)
        self.assertEqual(rates['xg_per_90'], 0.86)
        self.assertEqual(rates['assists_per_90'], 0.46)
        self.assertEqual(rates['xag_per_90'], 0.51)

        pcts = profile['percentiles']
        self.assertEqual(pcts['goals_per_90']['percentile'], 100)
        self.assertEqual(pcts['xg_per_90']['percentile'], 99)
        self.assertEqual(pcts['assists_per_90']['percentile'], 98)
        self.assertEqual(pcts['xag_per_90']['percentile'], 100)
        self.assertFalse(pcts['progressive_carries']['is_tracked'])

    def test_ronaldo_2012_2013_profile(self):
        """Verify Cristiano Ronaldo in 2012-2013 has tracked traditional metrics and untracked xG."""
        res = self.client.get('/api/players/2?season=2012-2013')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        profile = data['data']
        self.assertEqual(profile['identity']['name'], 'Cristiano Ronaldo')

        rates = profile['per_90_rates']
        self.assertEqual(rates['goals_per_90'], 1.13)
        self.assertEqual(rates['assists_per_90'], 0.36)
        self.assertIsNone(rates['xg_per_90'])

        pcts = profile['percentiles']
        self.assertTrue(pcts['goals_per_90']['is_tracked'])
        self.assertEqual(pcts['goals_per_90']['percentile'], 100)
        self.assertTrue(pcts['assists_per_90']['is_tracked'])
        self.assertEqual(pcts['assists_per_90']['percentile'], 89)
        self.assertFalse(pcts['xg_per_90']['is_tracked'])
        self.assertFalse(pcts['progressive_carries']['is_tracked'])

    def test_dynamic_per_90_rate_calculation_logic(self):
        """Verify DataLoader rate derivation handles zero minutes, zero counts, and valid counts."""
        import pandas as pd
        from services.data_loader import DataLoader
        loader = DataLoader()
        dummy_df = pd.DataFrame([
            {'Rk': 1, 'Player': 'Active Scorer', 'Nation': 'ENG', 'Pos': 'FW', 'Squad': 'Arsenal', 'Comp': 'eng Premier League', 'Age': 25, 'Born': 1999, 'Min': 1800, 'Gls': 20, 'xG': 15.0, 'Gls_90': 0.0, 'xG_90': 0.0},
            {'Rk': 2, 'Player': 'Zero Minutes', 'Nation': 'FRA', 'Pos': 'FW', 'Squad': 'Arsenal', 'Comp': 'eng Premier League', 'Age': 20, 'Born': 2004, 'Min': 0, 'Gls': 0, 'xG': 0.0, 'Gls_90': 0.0, 'xG_90': 0.0},
            {'Rk': 3, 'Player': 'Zero Scorer', 'Nation': 'GER', 'Pos': 'FW', 'Squad': 'Arsenal', 'Comp': 'eng Premier League', 'Age': 28, 'Born': 1996, 'Min': 900, 'Gls': 0, 'xG': 0.0, 'Gls_90': 0.0, 'xG_90': 0.0},
        ])
        norm_df = loader._normalize_dataset(dummy_df)

        p1 = norm_df[norm_df['Player'] == 'Active Scorer'].iloc[0]
        self.assertEqual(p1['Gls_90'], 1.0)
        self.assertEqual(p1['xG_90'], 0.75)
        self.assertEqual(p1['90s'], 20.0)

        p2 = norm_df[norm_df['Player'] == 'Zero Minutes'].iloc[0]
        self.assertEqual(p2['Gls_90'], 0.0)
        self.assertEqual(p2['xG_90'], 0.0)
        self.assertEqual(p2['90s'], 0.0)

        p3 = norm_df[norm_df['Player'] == 'Zero Scorer'].iloc[0]
        self.assertEqual(p3['Gls_90'], 0.0)
        self.assertEqual(p3['xG_90'], 0.0)
        self.assertEqual(p3['90s'], 10.0)

if __name__ == '__main__':
    unittest.main()
