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

if __name__ == '__main__':
    unittest.main()
