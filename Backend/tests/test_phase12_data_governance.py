"""
PitchPulse Analytics — Phase 12 Data Governance, Quarantine & Data Integrity Test Suite

Verifies:
- 2025-2026 quarantine policy & metadata enforcement
- Historical club counts invariants across all completed seasons
- Explicit era-based metric tracking rules (pre-xG, early xG, modern tracking, quarantined projection)
- Strict differentiation of genuine zeros vs null/untracked statistics
- Quarantine advisory notices in dashboard analytics
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app
from services.season_service import season_service
from services.metric_registry import is_metric_tracked_in_era, get_metric_registry, get_metric_info
from services.analytics_service import get_dashboard_analytics, get_leaderboard
from services.player_service import get_player_profile
from services.data_loader import data_loader

class TestPhase12DataGovernance(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_default_active_season_is_authentic_baseline(self):
        """Authoritative default season must be the verified completed 2024-2025 baseline, not 2025-2026."""
        active = season_service.get_active_season()
        self.assertEqual(active, '2024-2025', "Default active season must be 2024-2025 authentic baseline")
        self.assertFalse(season_service.is_season_quarantined(active), "Default season must not be quarantined")

    def test_2025_2026_quarantine_policy(self):
        """2025-2026 dataset must be quarantined from authoritative rankings."""
        self.assertTrue(season_service.is_season_quarantined('2025-2026'))
        
        # Check API seasons list endpoint
        res = self.client.get('/api/seasons')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        
        season_2025 = next((s for s in data['data'] if s['id'] == '2025-2026'), None)
        self.assertIsNotNone(season_2025)
        self.assertTrue(season_2025.get('is_quarantined'), "2025-2026 must have is_quarantined: True")
        self.assertEqual(season_2025.get('dataset_status'), 'quarantined')
        self.assertIn('Quarantined', season_2025.get('status_label', ''))
        self.assertIsNotNone(season_2025.get('quarantine_reason'))
        self.assertIn('197 clubs', season_2025.get('quarantine_reason', ''))

    def test_historical_seasons_club_count_invariants(self):
        """Every completed historical season must have exactly 98 clubs (pre-2023) or 96 clubs (2023-2025)."""
        seasons = season_service.list_seasons()
        for s in seasons:
            s_id = s['id']
            if s_id in ['2012-2013', '2013-2014', '2014-2015', '2015-2016', '2016-2017', 
                        '2017-2018', '2018-2019', '2019-2020', '2020-2021', '2021-2022', '2022-2023']:
                self.assertEqual(s['clubs_count'], 98, f"Season {s_id} must have exactly 98 clubs")
            elif s_id in ['2023-2024', '2024-2025']:
                self.assertEqual(s['clubs_count'], 96, f"Season {s_id} must have exactly 96 clubs")
            elif s_id == '2025-2026':
                self.assertGreater(s['clubs_count'], 96, "2025-2026 composite dataset exhibits squad inflation anomaly")

    def test_explicit_era_metric_tracking(self):
        """Evaluates explicit era-based tracking rules from documented provenance."""
        # 1. 2012-2013 (Pre-xG Era): standard stats tracked; xG and PrgC untracked
        self.assertTrue(is_metric_tracked_in_era('Gls', '2012-2013'))
        self.assertTrue(is_metric_tracked_in_era('Ast', '2012-2013'))
        self.assertFalse(is_metric_tracked_in_era('xG', '2012-2013'))
        self.assertFalse(is_metric_tracked_in_era('PrgC', '2012-2013'))
        self.assertFalse(is_metric_tracked_in_era('PrgR', '2012-2013'))

        # 2. 2015-2016 (Early xG Era): Understat xG tracked; progression untracked
        self.assertTrue(is_metric_tracked_in_era('Gls', '2015-2016'))
        self.assertTrue(is_metric_tracked_in_era('xG', '2015-2016'))
        self.assertFalse(is_metric_tracked_in_era('PrgC', '2015-2016'))
        self.assertFalse(is_metric_tracked_in_era('PrgP', '2015-2016'))

        # 3. 2024-2025 (Modern Era): All metrics tracked
        self.assertTrue(is_metric_tracked_in_era('Gls', '2024-2025'))
        self.assertTrue(is_metric_tracked_in_era('xG', '2024-2025'))
        self.assertTrue(is_metric_tracked_in_era('PrgC', '2024-2025'))
        self.assertTrue(is_metric_tracked_in_era('PrgR', '2024-2025'))

        # 4. 2025-2026 (Quarantined Era): Progression untracked in EPL, Bundesliga, and La Liga
        self.assertFalse(is_metric_tracked_in_era('PrgC', '2025-2026', 'eng Premier League'))
        self.assertFalse(is_metric_tracked_in_era('PrgC', '2025-2026', 'de Bundesliga'))
        self.assertFalse(is_metric_tracked_in_era('PrgC', '2025-2026', 'es La Liga'))
        self.assertTrue(is_metric_tracked_in_era('PrgC', '2025-2026', 'it Serie A'))
        self.assertFalse(is_metric_tracked_in_era('PrgR', '2025-2026'))

    def test_quarantine_notice_in_dashboard_analytics(self):
        """Dashboard analytics endpoint must include quarantine notice for quarantined seasons."""
        dash_2025 = get_dashboard_analytics(season='2025-2026')
        self.assertTrue(dash_2025['is_quarantined'])
        self.assertIsNotNone(dash_2025['quarantine_notice'])
        self.assertEqual(dash_2025['quarantine_notice']['status'], 'quarantined')

        dash_2024 = get_dashboard_analytics(season='2024-2025')
        self.assertFalse(dash_2024['is_quarantined'])
        self.assertIsNone(dash_2024['quarantine_notice'])

    def test_null_vs_genuine_zero_in_player_profile(self):
        """Verifies that genuine 0 goals receives valid mid-rank percentile, while untracked metric is None."""
        # Check historical player without progression
        # In 2012-2013, Lionel Messi has 46 gls, but PrgC is untracked
        df_12 = data_loader.get_dataframe(season='2012-2013')
        messi_rk = int(df_12[df_12['Player'] == 'Lionel Messi'].iloc[0]['Rk'])
        prof = get_player_profile(messi_rk, season='2012-2013')
        
        self.assertIsNotNone(prof)
        # Goals must be tracked
        self.assertTrue(prof['percentiles']['goals_per_90']['is_tracked'])
        self.assertIsNotNone(prof['percentiles']['goals_per_90']['percentile'])
        
        # Progressive carries must be untracked
        self.assertFalse(prof['percentiles']['progressive_carries']['is_tracked'])
        self.assertIsNone(prof['percentiles']['progressive_carries']['percentile'])
        self.assertEqual(prof['percentiles']['progressive_carries']['sample_size'], 0)

    def test_quarantine_metadata_across_all_endpoints(self):
        """Phase 12.1: Verifies that player profile, leaderboards, comparisons, and player list endpoints all expose quarantine metadata."""
        # 1. Player Profile endpoint
        res = self.client.get('/api/players/1?season=2025-2026')
        self.assertEqual(res.status_code, 200)
        p = res.get_json()['data']
        self.assertTrue(p['is_quarantined'])
        self.assertEqual(p['dataset_status'], 'quarantined')
        self.assertIsNotNone(p['quarantine_reason'])

        # Profile in authentic 2024-2025 baseline must be clean
        res_auth = self.client.get('/api/players/1?season=2024-2025')
        self.assertEqual(res_auth.status_code, 200)
        p_auth = res_auth.get_json()['data']
        self.assertFalse(p_auth['is_quarantined'])
        self.assertEqual(p_auth['dataset_status'], 'verified_historical')

        # 2. Leaderboards endpoint
        res_lead = self.client.get('/api/leaderboards?season=2025-2026')
        self.assertEqual(res_lead.status_code, 200)
        lead_meta = res_lead.get_json()['metadata']
        self.assertTrue(lead_meta['is_quarantined'])
        self.assertEqual(lead_meta['dataset_status'], 'quarantined')

        # 3. Comparison endpoint
        res_comp = self.client.post('/api/players/compare', json={'player_ids': [1, 2], 'season': '2025-2026'})
        self.assertEqual(res_comp.status_code, 200)
        comp_data = res_comp.get_json()
        self.assertTrue(comp_data['is_quarantined'])
        self.assertEqual(comp_data['dataset_status'], 'quarantined')

        # 4. Players List endpoint
        res_list = self.client.get('/api/players?season=2025-2026')
        self.assertEqual(res_list.status_code, 200)
        list_meta = res_list.get_json()['metadata']
        self.assertTrue(list_meta['is_quarantined'])
        self.assertEqual(list_meta['dataset_status'], 'quarantined')

if __name__ == '__main__':
    unittest.main()
