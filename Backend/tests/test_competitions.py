import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api import app

class TestCompetitionsEndpoints(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_get_competitions(self):
        res = self.client.get('/api/competitions')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        comps = data['data']
        self.assertEqual(len(comps), 5)
        
        comp_ids = [c['id'] for c in comps]
        self.assertIn('premier-league', comp_ids)
        self.assertIn('la-liga', comp_ids)
        self.assertIn('serie-a', comp_ids)
        self.assertIn('bundesliga', comp_ids)
        self.assertIn('ligue-1', comp_ids)

        for c in comps:
            self.assertGreater(c['teams_count'], 0)
            self.assertGreater(c['players_count'], 0)
            self.assertGreater(c['total_goals'], 0)

    def test_get_teams_filtered_by_competition(self):
        res = self.client.get('/api/teams?competition=premier-league')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        teams = data['data']
        self.assertEqual(len(teams), 20)
        self.assertIn('Arsenal', teams)
        self.assertIn('Manchester City', teams)

    def test_get_teams_raw_competition_name(self):
        res = self.client.get('/api/teams?competition=es La Liga')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        teams = data['data']
        self.assertEqual(len(teams), 20)
        self.assertIn('Real Madrid', teams)
        self.assertIn('Barcelona', teams)

    def test_get_teams_invalid_competition(self):
        res = self.client.get('/api/teams?competition=unknown-league')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data'], [])

    def test_legacy_leagues(self):
        res = self.client.get('/api/leagues')
        self.assertEqual(res.status_code, 200)
        leagues = res.get_json()
        self.assertEqual(len(leagues), 5)
        self.assertIn('eng Premier League', leagues)

    def test_legacy_teams_by_league(self):
        res = self.client.get('/api/teams/eng Premier League')
        self.assertEqual(res.status_code, 200)
        teams = res.get_json()
        self.assertEqual(len(teams), 20)
        self.assertIn('Arsenal', teams)

    def test_legacy_teams_url_encoded(self):
        res = self.client.get('/api/teams/es%20La%20Liga')
        self.assertEqual(res.status_code, 200)
        teams = res.get_json()
        self.assertEqual(len(teams), 20)
        self.assertIn('Real Madrid', teams)
        self.assertIn('Barcelona', teams)

if __name__ == '__main__':
    unittest.main()
