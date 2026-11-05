import unittest
import json
import time
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from api import app, load_players_data

class TestApiBaseline(unittest.TestCase):
    def setUp(self):
        self.app = app
        self.client = self.app.test_client()

    def test_01_home(self):
        response = self.client.get('/api/')
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Football Analytics API is running!", response.data)

    def test_02_debug(self):
        response = self.client.get('/api/debug')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn('excel_exists', data)
        self.assertEqual(data.get('csv_files_found'), [])

    def test_03_leagues(self):
        response = self.client.get('/api/leagues')
        self.assertEqual(response.status_code, 200)
        leagues = response.get_json()
        self.assertIsInstance(leagues, list)
        expected_competitions = [
            'eng Premier League',
            'es La Liga',
            'it Serie A',
            'fr Ligue 1',
            'de Bundesliga'
        ]
        for comp in expected_competitions:
            self.assertIn(comp, leagues, f"Missing competition {comp}")
        self.assertEqual(len(leagues), 5)

    def test_04_teams_valid(self):
        response = self.client.get('/api/teams/eng Premier League')
        self.assertEqual(response.status_code, 200)
        teams = response.get_json()
        self.assertIsInstance(teams, list)
        self.assertIn('Arsenal', teams)
        self.assertIn('Manchester City', teams)
        self.assertEqual(len(teams), 20)

    def test_05_teams_invalid(self):
        response = self.client.get('/api/teams/NonExistentLeague')
        self.assertEqual(response.status_code, 200)
        teams = response.get_json()
        self.assertEqual(teams, [])

    def test_06_players_by_team_valid(self):
        response = self.client.get('/api/players/eng Premier League/Arsenal')
        self.assertEqual(response.status_code, 200)
        players = response.get_json()
        self.assertIsInstance(players, list)
        self.assertGreater(len(players), 0)
        first = players[0]
        self.assertEqual(first.get('Squad'), 'Arsenal')
        self.assertEqual(first.get('Comp'), 'eng Premier League')
        self.assertIn('Player', first)
        self.assertIn('Gls', first)

    def test_07_players_by_team_invalid(self):
        response = self.client.get('/api/players/eng Premier League/FakeSquad')
        self.assertEqual(response.status_code, 200)
        players = response.get_json()
        self.assertEqual(players, [])

    def test_08_player_profile_valid(self):
        response = self.client.get('/api/player/1')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get('success'))
        self.assertIn('player', data)
        self.assertIn('statistics', data)
        self.assertEqual(data['player']['Rk'], 1)

    def test_09_player_profile_not_found(self):
        response = self.client.get('/api/player/999999')
        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertFalse(data.get('success'))
        self.assertEqual(data.get('error'), 'Player not found')

    def test_10_compare_players_valid(self):
        response = self.client.post('/api/players/compare',
            data=json.dumps({'player_ids': [1, 2]}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get('success'))
        self.assertEqual(len(data.get('players')), 2)
        self.assertIn('comparison_data', data)

    def test_11_compare_players_empty(self):
        response = self.client.post('/api/players/compare',
            data=json.dumps({'player_ids': []}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertFalse(data.get('success'))

    def test_12_league_leaders(self):
        response = self.client.get('/api/league-leaders')
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertTrue(data.get('success'))
        leaders = data.get('leaders')
        self.assertIn('goals', leaders)
        self.assertIn('assists', leaders)
        self.assertIn('matches', leaders)
        self.assertIn('minutes', leaders)
        self.assertEqual(len(leaders['goals']), 10)

    def test_13_performance_benchmark(self):
        start = time.time()
        self.client.get('/api/leagues')
        duration = time.time() - start
        print(f"\n[PERF BENCHMARK] GET /api/leagues uncached latency: {duration:.3f}s")

if __name__ == '__main__':
    unittest.main()
