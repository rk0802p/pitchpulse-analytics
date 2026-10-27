import unittest
import os
import sys
import shutil
import json
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import app
from services.season_service import season_service
from services.data_loader import data_loader
from services.dataset_importer import DatasetImporter

class TestSeasonStorage(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cls.seasons_dir = os.path.join(cls.backend_dir, 'data', 'seasons')
        cls.test_season_dir = os.path.join(cls.seasons_dir, '2099-2100')
        
        # Create a sample 2099-2100 dataset from baseline to test multi-season separation
        baseline_csv = os.path.join(cls.seasons_dir, '2024-2025', 'top5-players24-25.csv')
        df = pd.read_csv(baseline_csv)
        # Modify some values for 2099-2100 so we can distinguish it
        df_test = df.copy()
        df_test['Gls'] = df_test['Gls'] + 2
        df_test['Gls_90'] = (df_test['Gls'] / df_test['90s'].apply(lambda x: x if x > 0 else 1.0)).round(2)

        cls.importer = DatasetImporter(strict=True)
        temp_csv = os.path.join(cls.backend_dir, 'data', 'temp_2099.csv')
        df_test.to_csv(temp_csv, index=False)
        
        cls.importer.import_file(
            file_path=temp_csv,
            season='2099-2100',
            source_name='PitchPulse Test Fixture Season',
            output_format='both'
        )
        if os.path.exists(temp_csv):
            os.remove(temp_csv)

    @classmethod
    def tearDownClass(cls):
        # Clean up test season
        if os.path.exists(cls.test_season_dir):
            shutil.rmtree(cls.test_season_dir, ignore_errors=True)
        season_service.set_active_season('2024-2025')

    def test_01_list_seasons_endpoint(self):
        """GET /api/seasons returns all stored seasons with metadata."""
        res = self.client.get('/api/seasons')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        seasons = data['data']
        self.assertGreaterEqual(len(seasons), 2)

        season_ids = [s['id'] for s in seasons]
        self.assertIn('2024-2025', season_ids)
        self.assertIn('2099-2100', season_ids)

        # Baseline season check
        b24 = next(s for s in seasons if s['id'] == '2024-2025')
        self.assertFalse(b24['is_baseline'])
        self.assertEqual(b24['records_count'], 2854)

        # Test season check
        s_test = next(s for s in seasons if s['id'] == '2099-2100')
        self.assertEqual(s_test['records_count'], 2854)
        self.assertEqual(s_test['source'], 'PitchPulse Test Fixture Season')

    def test_02_get_active_season(self):
        """GET /api/seasons/active returns current active season."""
        res = self.client.get('/api/seasons/active')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertIn('active_season', data['data'])

    def test_03_switch_active_season(self):
        """POST /api/seasons/active updates the active season."""
        res = self.client.post('/api/seasons/active', json={'season': '2099-2100'})
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['active_season'], '2099-2100')

        # Verify active season changed
        self.assertEqual(season_service.get_active_season(), '2099-2100')

        # Reset back to 2024-2025
        res_reset = self.client.post('/api/seasons/active', json={'season': '2024-2025'})
        self.assertEqual(res_reset.status_code, 200)
        self.assertEqual(season_service.get_active_season(), '2024-2025')

    def test_04_query_specific_season_dashboard(self):
        """GET /api/dashboard?season=2024-2025 vs ?season=2099-2100 returns season-specific data."""
        res_24 = self.client.get('/api/dashboard?season=2024-2025')
        self.assertEqual(res_24.status_code, 200)
        data_24 = res_24.get_json()['data']

        res_test = self.client.get('/api/dashboard?season=2099-2100')
        self.assertEqual(res_test.status_code, 200)
        data_test = res_test.get_json()['data']

        # Total goals in test season should be higher due to the +2 goal offset
        self.assertGreater(data_test['kpis']['total_goals'], data_24['kpis']['total_goals'])

    def test_05_query_specific_season_players(self):
        """GET /api/players?season=... returns players from the requested season."""
        res = self.client.get('/api/players?season=2024-2025&limit=10')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']), 10)

    def test_06_query_season_details(self):
        """GET /api/seasons/2024-2025 returns full season manifest."""
        res = self.client.get('/api/seasons/2024-2025')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['season'], '2024-2025')

    def test_07_seasons_isolation_no_overwrite(self):
        """Ensure 2024-2025 baseline files were completely untouched by 2025-2026 import."""
        b24_manifest = season_service.get_season_manifest('2024-2025')
        self.assertEqual(b24_manifest['records_count'], 2854)
        self.assertFalse(b24_manifest.get('is_baseline', False))

        # Check file still exists in 2024-2025 folder
        csv_24 = os.path.join(self.seasons_dir, '2024-2025', 'top5-players24-25.csv')
        self.assertTrue(os.path.exists(csv_24))

    def test_08_get_presets_endpoint(self):
        """GET /api/seasons/presets returns verified presets for data download."""
        res = self.client.get('/api/seasons/presets')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        presets = data['data']
        self.assertGreaterEqual(len(presets), 1)
        self.assertEqual(presets[0]['id'], 'top5-2023-2024')
        self.assertTrue(presets[0]['url'].startswith('https://'))

if __name__ == '__main__':
    unittest.main()
