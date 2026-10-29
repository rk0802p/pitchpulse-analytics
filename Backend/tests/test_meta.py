import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

class TestMetaEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_check(self):
        res = self.client.get('/api/health')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['status'], 'healthy')
        self.assertTrue(data['data']['dataset_ready'])

    def test_metadata(self):
        res = self.client.get('/api/metadata')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['season'], '2024-2025')
        self.assertEqual(data['data']['total_records'], 2854)
        self.assertEqual(data['data']['competitions_count'], 5)
        self.assertEqual(data['data']['clubs_count'], 96)

    def test_metrics_definitions(self):
        res = self.client.get('/api/metrics')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        metrics = data['data']
        self.assertIn('Gls', metrics)
        self.assertIn('xG', metrics)
        self.assertIn('PrgC', metrics)
        self.assertIn('category', metrics['xG'])

    def test_metrics_registry(self):
        res = self.client.get('/api/metrics/registry')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        registry = data['data']
        self.assertIn('expected_goals', registry)
        self.assertIn('progressive_carries', registry)
        self.assertIn('preferred_source', registry['expected_goals'])
        self.assertIn('derivation_formula', registry['expected_goals_per_90'])

        # Test single metric lookup
        res_single = self.client.get('/api/metrics/registry?metric_id=expected_goals')
        self.assertEqual(res_single.status_code, 200)
        data_single = res_single.get_json()
        self.assertEqual(data_single['data']['display_name'], 'Expected Goals (xG)')

        # Test invalid metric lookup
        res_invalid = self.client.get('/api/metrics/registry?metric_id=invalid_stat')
        self.assertEqual(res_invalid.status_code, 404)

if __name__ == '__main__':
    unittest.main()
