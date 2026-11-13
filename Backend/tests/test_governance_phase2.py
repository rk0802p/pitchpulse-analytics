import unittest
import os
import sys
import tempfile
import json
import pandas as pd

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api import create_app
from services.season_service import season_service
from services.dataset_importer import DatasetImporter, DatasetValidationError
from services.baseline_verifier import verify_baseline_integrity

class TestGovernancePhase2(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['ADMIN_TOKEN'] = 'phase2-test-token'
        cls.auth_headers = {'Authorization': 'Bearer phase2-test-token'}
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_health_reports_baseline_verified_and_ready(self):
        """B1, B2: /api/health exposes baseline_verified=True and returns 200 when ready."""
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['status'], 'healthy')
        self.assertTrue(data['data']['baseline_verified'])
        self.assertTrue(data['data']['dataset_ready'])

    def test_02_quarantine_policy_strict_allowlist(self):
        """B5, B6: Strict allow-list enforces quarantine on any status not verified_historical / read_only_baseline."""
        # 2024-2025 is the immutable baseline
        pol_24 = season_service.get_quarantine_policy('2024-2025')
        self.assertFalse(pol_24['is_quarantined'])
        self.assertEqual(pol_24['status'], 'verified_historical')

        # 2025-2026 is verified historical (completed season)
        pol_25 = season_service.get_quarantine_policy('2025-2026')
        self.assertFalse(pol_25['is_quarantined'])
        self.assertEqual(pol_25['status'], 'verified_historical')
        self.assertEqual(pol_25['dataset_status'], 'verified_historical')

        # Unknown or provisional status must fail-closed as quarantined
        mock_quarantine = season_service.get_quarantine_policy('non-existent-or-unverified')
        self.assertTrue(mock_quarantine['is_quarantined'])
        self.assertEqual(mock_quarantine['status'], 'quarantined')

    def test_03_prevent_accidental_season_overwrite(self):
        """B3: DatasetImporter rejects overwriting existing seasons unless allow_overwrite=True."""
        importer = DatasetImporter(strict=True)
        # Create minimal 37-column test row
        baseline_csv = os.path.join(backend_dir, 'data', 'seasons', '2024-2025', 'top5-players24-25.csv')
        df = pd.read_csv(baseline_csv).head(5)

        with tempfile.NamedTemporaryFile(suffix='.csv', delete=False) as tf:
            df.to_csv(tf.name, index=False)
            temp_path = tf.name

        try:
            # Baseline is strictly immutable
            with self.assertRaises(DatasetValidationError):
                importer.import_file(temp_path, season='2024-2025', allow_overwrite=True)

            # Established historical seasons reject overwrite when allow_overwrite=False
            with self.assertRaises(DatasetValidationError):
                importer.import_file(temp_path, season='2023-2024', allow_overwrite=False)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    def test_04_leaderboard_rate_metric_minutes_floor(self):
        """B8: Rate metrics (e.g. Gls_90) enforce a 270-minute floor to filter small-sample noise."""
        res_rate = self.client.get('/api/leaderboards?metric=Gls_90&min_minutes=0')
        self.assertEqual(res_rate.status_code, 200)
        data = res_rate.get_json()['data']
        self.assertGreater(len(data), 0)
        # All returned players in rate leaderboard must have >= 270 minutes
        for p in data:
            self.assertGreaterEqual(p['minutes'], 270, f"Player {p['player']} has only {p['minutes']} mins on Gls_90 board")

    def test_05_stateless_per_request_season_queries(self):
        """B4, B7: Query-scoped ?season= resolves correctly without altering server-wide active season."""
        initial_active = season_service.get_active_season()
        self.assertEqual(initial_active, '2024-2025')

        # Query a historical season
        res = self.client.get('/api/players?season=2023-2024&limit=5')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['metadata']['season'], '2023-2024')

        # Verify server active season was not mutated
        self.assertEqual(season_service.get_active_season(), '2024-2025')

    def test_06_baseline_cryptographic_verification(self):
        """L3: Baseline 2024/25 dataset files match exact cryptographic invariants."""
        res = verify_baseline_integrity()
        self.assertIn('sha256', res)
        self.assertEqual(res['record_count'], 2854)
        self.assertEqual(res['totals']['goals'], 4806)
        self.assertEqual(res['totals']['assists'], 3429)

    def test_07_phase2_2025_2026_data_invariants(self):
        """Phase 2: progression is unavailable and review changes stay sidecar-only."""
        season_dir = os.path.join(backend_dir, 'data', 'seasons', '2025-2026')
        df = pd.read_csv(os.path.join(season_dir, 'top5-players-2025-2026.csv'))
        review = pd.read_csv(os.path.join(backend_dir, 'scripts', 'output', 'squad_label_review_2025_2026.csv'))
        sidecar = pd.read_csv(os.path.join(season_dir, 'squad_verification.csv'))
        self.assertEqual(len(df), 2611)
        self.assertEqual(len(df.columns), 37)
        self.assertEqual(int((df['Min'] == 0).sum()), 0)
        self.assertEqual(int(df[['PrgC', 'PrgP', 'PrgR']].notna().sum().sum()), 0)
        self.assertEqual(len(review), 252)
        self.assertEqual(review['action'].value_counts().to_dict(), {'correct': 73, 'auto-map': 11, 'unresolved': 168})
        self.assertEqual(len(sidecar), 252)
        self.assertEqual(int(sidecar['verified'].sum()), 84)
        self.assertNotIn('squad_verified', df.columns)

if __name__ == '__main__':
    unittest.main()
