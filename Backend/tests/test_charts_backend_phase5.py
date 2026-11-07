import unittest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api import create_app

class TestChartsBackendPhase5(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_scatter_endpoint_default(self):
        """GET /api/charts/scatter returns valid 2D coordinates and quadrant distribution."""
        res = self.client.get('/api/charts/scatter')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        payload = data['data']
        self.assertIn('points', payload)
        self.assertIn('distribution', payload)
        self.assertGreater(payload['points_count'], 100)

        dist = payload['distribution']
        self.assertIn('median_x', dist)
        self.assertIn('median_y', dist)
        self.assertIn('quadrants', dist)
        self.assertEqual(dist['quadrants']['q1'] + dist['quadrants']['q2'] + dist['quadrants']['q3'] + dist['quadrants']['q4'], payload['points_count'])

    def test_02_scatter_endpoint_custom_metrics_and_filters(self):
        """GET /api/charts/scatter accepts custom x/y metrics, position, and minutes."""
        res = self.client.get('/api/charts/scatter?x=Gls_90&y=Ast_90&pos=FW&min_minutes=500')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()['data']
        self.assertEqual(data['x_metric'], 'Gls_90')
        self.assertEqual(data['y_metric'], 'Ast_90')
        for p in data['points']:
            self.assertIn('FW', p['Pos'])
            self.assertGreaterEqual(p['Min'], 500)

    def test_03_player_percentiles_endpoint(self):
        """GET /api/players/<id>/percentiles returns positional peer percentiles."""
        res = self.client.get('/api/players/1/percentiles')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        payload = data['data']
        self.assertIn('percentiles', payload)
        self.assertIn('peer_sample_size', payload)
        self.assertGreater(payload['peer_sample_size'], 0)

        pcts = payload['percentiles']
        self.assertIn('Gls_90', pcts)
        self.assertIn('Ast_90', pcts)

    def test_04_player_similar_endpoint(self):
        """GET /api/players/<id>/similar returns top k similar players with similarity scores."""
        res = self.client.get('/api/players/1/similar?k=5')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])
        payload = data['data']
        self.assertIn('similar_players', payload)
        similar = payload['similar_players']
        self.assertEqual(len(similar), 5)
        for p in similar:
            self.assertIn('similarity', p)
            self.assertGreaterEqual(p['similarity'], 0.0)
            self.assertLessEqual(p['similarity'], 100.0)
            self.assertIn('stats', p)

    def test_05_performance_index_endpoint(self):
        """GET /api/leaderboards/index computes composite indices for roles (finisher, creator)."""
        res_finisher = self.client.get('/api/leaderboards/index?role=finisher&limit=10')
        self.assertEqual(res_finisher.status_code, 200)
        data_f = res_finisher.get_json()['data']
        self.assertEqual(len(data_f['players']), 10)
        self.assertEqual(data_f['role'], 'finisher')

        # Scores should be sorted descending
        scores = [p['composite_index'] for p in data_f['players']]
        self.assertEqual(scores, sorted(scores, reverse=True))

        res_creator = self.client.get('/api/leaderboards/index?role=creator&limit=10')
        self.assertEqual(res_creator.status_code, 200)
        data_c = res_creator.get_json()['data']
        self.assertEqual(len(data_c['players']), 10)
        self.assertEqual(data_c['role'], 'creator')

if __name__ == '__main__':
    unittest.main()
