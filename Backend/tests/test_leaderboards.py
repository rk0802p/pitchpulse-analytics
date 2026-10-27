import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

class TestLeaderboardsEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_default_leaderboards(self):
        res = self.client.get('/api/leaderboards')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        leaders = data['data']
        self.assertEqual(len(leaders), 10)
        self.assertEqual(leaders[0]['rank'], 1)
        self.assertGreaterEqual(leaders[0]['value'], leaders[1]['value'])

    def test_xg_leaderboards(self):
        res = self.client.get('/api/leaderboards?metric=xG&limit=5')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        leaders = data['data']
        self.assertEqual(len(leaders), 5)
        self.assertEqual(data['metadata']['metric'], 'xG')
        for i in range(len(leaders) - 1):
            self.assertGreaterEqual(leaders[i]['value'], leaders[i + 1]['value'])

    def test_progressive_passes_leaderboards(self):
        res = self.client.get('/api/leaderboards?metric=PrgP&competition=premier-league&limit=10')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        leaders = data['data']
        self.assertGreater(len(leaders), 0)
        for l in leaders:
            self.assertEqual(l['competition'], 'Premier League')

    def test_position_and_min_minutes_leaderboards(self):
        res = self.client.get('/api/leaderboards?metric=Ast&position=MF&min_minutes=500&limit=8')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        leaders = data['data']
        self.assertEqual(len(leaders), 8)
        for l in leaders:
            self.assertIn('MF', l['position'])
            self.assertGreaterEqual(l['minutes'], 500)

    def test_legacy_league_leaders(self):
        res = self.client.get('/api/league-leaders')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        leaders = data['leaders']
        self.assertIn('goals', leaders)
        self.assertIn('assists', leaders)
        self.assertIn('matches', leaders)
        self.assertIn('minutes', leaders)
        self.assertEqual(len(leaders['goals']), 10)

    def test_dashboard_analytics(self):
        res = self.client.get('/api/dashboard?season=2024-2025')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        analytics = data['data']
        self.assertIn('kpis', analytics)
        self.assertIn('top_scorers', analytics)
        self.assertIn('top_creators', analytics)
        self.assertIn('overperformers', analytics)
        self.assertIn('underperformers', analytics)
        self.assertIn('scatter_data', analytics)
        self.assertEqual(analytics['kpis']['total_players'], 2854)
        self.assertEqual(analytics['kpis']['total_clubs'], 96)

    def test_dashboard_analytics_filtered(self):
        res = self.client.get('/api/dashboard?competition=premier-league&season=2024-2025')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        analytics = data['data']
        self.assertEqual(analytics['kpis']['total_clubs'], 20)
        self.assertEqual(analytics['kpis']['total_players'], 574)

if __name__ == '__main__':
    unittest.main()
