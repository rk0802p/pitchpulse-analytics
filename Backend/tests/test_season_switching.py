import unittest
import os
import sys

# Ensure Backend directory is in path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api import create_app
from services.season_service import season_service
from services.data_loader import data_loader
from services.baseline_verifier import verify_baseline_integrity

class TestSeasonSwitchingAndIntegrity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def setUp(self):
        # Reset to baseline default
        season_service.set_active_season('2024-2025')
        data_loader.load_season('2024-2025')

    def tearDown(self):
        season_service.set_active_season('2024-2025')
        data_loader.load_season('2024-2025')

    def test_01_season_registry_loading(self):
        """Test 1: Season registry loads with extended provenance metadata."""
        response = self.client.get('/api/seasons')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get('success'))
        seasons = data.get('data', [])
        self.assertGreaterEqual(len(seasons), 4)

        # Verify all expected seasons exist with extended schema
        season_map = {s['id']: s for s in seasons}
        self.assertIn('2023-2024', season_map)
        self.assertIn('2024-2025', season_map)
        self.assertIn('2025-2026', season_map)
        self.assertIn('2026-2027', season_map)

        # Check extended metadata fields
        s2425 = season_map['2024-2025']
        self.assertEqual(s2425['dataset_status'], 'verified_historical')
        self.assertTrue(s2425['is_baseline'])
        self.assertFalse(s2425['is_projection'])

        # Check synthetic seasons
        s2526 = season_map['2025-2026']
        self.assertEqual(s2526['dataset_status'], 'projection')
        self.assertTrue(s2526['is_projection'])
        self.assertIn('Projection', s2526['status_label'])

        s2627 = season_map['2026-2027']
        self.assertEqual(s2627['dataset_status'], 'projection')
        self.assertTrue(s2627['is_projection'])

    def test_02_switching_between_two_valid_seasons(self):
        """Test 2: Switching between 2024-2025 and 2023-2024 updates active season."""
        # Switch to 2023-2024
        post_res = self.client.post('/api/seasons/active', json={'season': '2023-2024'})
        self.assertEqual(post_res.status_code, 200)
        post_data = post_res.get_json()
        self.assertEqual(post_data['data']['active_season'], '2023-2024')
        self.assertEqual(season_service.get_active_season(), '2023-2024')

        # Verify active endpoint returns 2023-2024
        active_res = self.client.get('/api/seasons/active')
        self.assertEqual(active_res.status_code, 200)
        self.assertEqual(active_res.get_json()['data']['active_season'], '2023-2024')

        # Switch back to 2024-2025
        post_back = self.client.post('/api/seasons/active', json={'season': '2024-2025'})
        self.assertEqual(post_back.status_code, 200)
        self.assertEqual(season_service.get_active_season(), '2024-2025')

    def test_03_switching_to_invalid_season_returns_404(self):
        """Test 3: Switching to unknown or invalid season returns 404."""
        res = self.client.post('/api/seasons/active', json={'season': '1990-1991'})
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data.get('success'))
        # Active season remains unchanged
        self.assertEqual(season_service.get_active_season(), '2024-2025')

    def test_04_activating_already_cached_season_updates_active_refs(self):
        """Test 4: Activating an already cached season updates _df, _records, and _by_id."""
        # Pre-cache both seasons
        data_loader.load_season('2024-2025')
        data_loader.load_season('2023-2024')

        # Switch active season to 2023-2024
        season_service.set_active_season('2023-2024')
        # Call load_season which triggers early return branch
        data_loader.load_season('2023-2024')

        # Verify primary active references were updated to 2023-2024
        active_df = data_loader.get_dataframe()
        self.assertEqual(len(active_df), 2852)
        top_active_scorer = active_df.sort_values(by='Gls', ascending=False).iloc[0]
        self.assertEqual(top_active_scorer['Player'], 'Harry Kane')
        self.assertEqual(top_active_scorer['Gls'], 36)

    def test_05_player_results_for_each_selected_season(self):
        """Test 5: Explicit season parameter returns distinct season-specific players and stats."""
        # In 2023-2024: Harry Kane top scorer (36 goals)
        res_2324 = self.client.get('/api/players?season=2023-2024&sort_by=Gls&order=desc&limit=1')
        self.assertEqual(res_2324.status_code, 200)
        p_2324 = res_2324.get_json()['data'][0]
        self.assertEqual(p_2324['Player'], 'Harry Kane')
        self.assertEqual(p_2324['Gls'], 36)
        self.assertEqual(p_2324['Squad'], 'Bayern Munich')

        # In 2024-2025: Kylian Mbappe top scorer (31 goals)
        res_2425 = self.client.get('/api/players?season=2024-2025&sort_by=Gls&order=desc&limit=1')
        self.assertEqual(res_2425.status_code, 200)
        p_2425 = res_2425.get_json()['data'][0]
        self.assertEqual(p_2425['Player'], 'Kylian Mbappé')
        self.assertEqual(p_2425['Gls'], 31)
        self.assertEqual(p_2425['Squad'], 'Real Madrid')

    def test_06_season_propagation_across_all_endpoints(self):
        """Test 6: Season parameter propagates across dashboard, leaderboards, compare, and profile."""
        # 1. Dashboard
        dash_res = self.client.get('/api/dashboard?season=2023-2024')
        self.assertEqual(dash_res.status_code, 200)
        dash_data = dash_res.get_json()['data']
        self.assertEqual(dash_data['kpis']['total_players'], 2852)
        self.assertEqual(dash_data['top_scorers'][0]['Player'], 'Harry Kane')

        # 2. Leaderboards
        lead_res = self.client.get('/api/leaderboards?season=2023-2024&metric=Gls&limit=5')
        self.assertEqual(lead_res.status_code, 200)
        lead_data = lead_res.get_json()['data']
        self.assertEqual(lead_data[0]['player'], 'Harry Kane')
        self.assertEqual(lead_data[0]['value'], 36)

        # 3. Player Comparison
        comp_res = self.client.post('/api/players/compare', json={'player_ids': [1], 'season': '2023-2024'})
        self.assertEqual(comp_res.status_code, 200)
        comp_data = comp_res.get_json()
        self.assertEqual(comp_data['players'][0]['Rk'], 1)

        # 4. Player Profile
        prof_res = self.client.get('/api/players/1?season=2023-2024')
        self.assertEqual(prof_res.status_code, 200)
        prof_data = prof_res.get_json()['data']
        self.assertIn('identity', prof_data)

    def test_07_unknown_season_returns_404_on_all_routes(self):
        """Test 7: Routes do not silently fallback to default when unknown season is requested."""
        bad_season = 'season-does-not-exist'

        routes_to_test = [
            f'/api/players?season={bad_season}',
            f'/api/players/1?season={bad_season}',
            f'/api/dashboard?season={bad_season}',
            f'/api/leaderboards?season={bad_season}',
            f'/api/competitions?season={bad_season}',
            f'/api/teams?competition=premier-league&season={bad_season}',
            f'/api/metadata?season={bad_season}'
        ]

        for route in routes_to_test:
            with self.subTest(route=route):
                res = self.client.get(route)
                self.assertEqual(res.status_code, 404, f"Expected 404 for route '{route}', got {res.status_code}")

        # Test POST compare with bad season
        cmp_res = self.client.post('/api/players/compare', json={'player_ids': [1], 'season': bad_season})
        self.assertEqual(cmp_res.status_code, 404)

    def test_08_season_display_alias_resolution(self):
        """Test 8: Display aliases like '2024/25', '24/25', '2024-25' resolve to '2024-2025'."""
        aliases = ['2024/25', '24/25', '2024-25', '2024-2025']
        for alias in aliases:
            resolved = season_service.resolve_season(alias)
            self.assertEqual(resolved, '2024-2025', f"Alias '{alias}' failed to resolve to '2024-2025'")
            self.assertTrue(season_service.season_exists(alias))

            # API route with alias returns 200
            res = self.client.get(f'/api/players?season={alias}&limit=1')
            self.assertEqual(res.status_code, 200, f"API failed for alias '{alias}'")

    def test_09_simulated_backend_restart(self):
        """Test 9: Simulated cold start reload maintains baseline and loads cleanly."""
        data_loader._is_initialized = False
        data_loader._seasons_df = {}
        data_loader._seasons_records = {}
        data_loader._seasons_by_id = {}
        data_loader._df = None

        data_loader.initialize()
        self.assertTrue(data_loader._is_initialized)
        self.assertEqual(len(data_loader.get_dataframe()), 2854)

    def test_10_baseline_cryptographic_integrity(self):
        """Test 10: Reference 2024/25 baseline integrity remains completely intact."""
        res = verify_baseline_integrity()
        self.assertEqual(res['status'], 'verified')
        self.assertEqual(res['sha256'], '7dbea8fdd43b9cf09eef5a18632953d9079d0f10bd11532da3337d937213e7e0')
        self.assertEqual(res['record_count'], 2854)
        self.assertEqual(res['totals']['goals'], 4806)
        self.assertEqual(res['totals']['assists'], 3429)

if __name__ == '__main__':
    unittest.main()
