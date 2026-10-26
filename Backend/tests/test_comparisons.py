import unittest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

class TestComparisonsEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_compare_valid_two_players(self):
        payload = json.dumps({'player_ids': [1, 2]})
        res = self.client.post('/api/players/compare', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['players']), 2)
        self.assertIn('metrics', data)
        self.assertIn('radar', data)
        self.assertIn('comparison_data', data)

        # Ensure metrics matrix contains aligned values
        first_metric = data['metrics'][0]
        self.assertIn('key', first_metric)
        self.assertIn('label', first_metric)
        self.assertIn('values', first_metric)
        self.assertIn('1', first_metric['values'])
        self.assertIn('2', first_metric['values'])

    def test_compare_non_json_request(self):
        res = self.client.post('/api/players/compare', data="not json", content_type='text/plain')
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])

    def test_compare_empty_ids(self):
        payload = json.dumps({'player_ids': []})
        res = self.client.post('/api/players/compare', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 400)
        data = res.get_json()
        self.assertFalse(data['success'])

    def test_compare_invalid_player_id(self):
        payload = json.dumps({'player_ids': [999998, 999999]})
        res = self.client.post('/api/players/compare', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 404)
        data = res.get_json()
        self.assertFalse(data['success'])

if __name__ == '__main__':
    unittest.main()
