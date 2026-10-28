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

        # Ensure metrics matrix contains aligned values and leaders
        first_metric = data['metrics'][0]
        self.assertIn('key', first_metric)
        self.assertIn('label', first_metric)
        self.assertIn('values', first_metric)
        self.assertIn('leaders', first_metric)
        self.assertIn('1', first_metric['values'])
        self.assertIn('2', first_metric['values'])

        # Ensure radar data contains percentile scores
        first_radar = data['radar'][0]
        self.assertIn('dimension', first_radar)
        self.assertIn('values', first_radar)
        self.assertIn('scores', first_radar)
        self.assertIn('1', first_radar['scores'])
        self.assertIn('2', first_radar['scores'])

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

    def test_compare_cross_season_dict_payload(self):
        payload = json.dumps({
            'player_ids': [
                {'id': 1, 'season': '2018-2019'},
                {'id': 2, 'season': '2023-2024'}
            ]
        })
        res = self.client.post('/api/players/compare', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['players']), 2)
        
        # Check season tagging
        seasons = [p['season'] for p in data['players']]
        self.assertEqual(seasons, ['2018-2019', '2023-2024'])
        
        # Check comparison_key
        keys = [p['comparison_key'] for p in data['players']]
        self.assertEqual(keys, ['1@2018-2019', '2@2023-2024'])
        
        # Metrics indexed by comparison_key
        for m in data['metrics']:
            self.assertIn('1@2018-2019', m['values'])
            self.assertIn('2@2023-2024', m['values'])

    def test_compare_cross_season_string_payload(self):
        payload = json.dumps({
            'player_ids': ['1@2017-2018', '1@2022-2023']
        })
        res = self.client.post('/api/players/compare', data=payload, content_type='application/json')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(len(data['players']), 2)
        self.assertEqual(data['players'][0]['season'], '2017-2018')
        self.assertEqual(data['players'][1]['season'], '2022-2023')

if __name__ == '__main__':
    unittest.main()
