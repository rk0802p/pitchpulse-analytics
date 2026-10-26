import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

class TestPlayersEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_get_players_paginated_default(self):
        res = self.client.get('/api/players')
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

if __name__ == '__main__':
    unittest.main()
