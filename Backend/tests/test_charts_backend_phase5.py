import unittest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api import create_app
from services.chart_service import get_scatter_chart_data

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

    def test_scatter_age_filter_is_applied_and_reported(self):
        response = self.client.get(
            '/api/charts/scatter?season=2024-2025&x=Gls&y=Ast&pos=FW&min_minutes=500&age_max=23'
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()['data']
        self.assertGreater(payload['points_count'], 0)
        self.assertTrue(all(point['Age'] is not None and point['Age'] <= 23 for point in payload['points']))

    def test_scatter_rejects_invalid_age_filter(self):
        response = self.client.get('/api/charts/scatter?age_max=NaN')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['error_detail']['code'], 'ERR_INVALID_AGE')

    def test_scatter_accepts_goals_minus_xg_metric(self):
        response = self.client.get(
            '/api/charts/scatter?season=2024-2025&x=Gls_minus_xG&y=Ast&min_minutes=500'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()['data']['x_metric'], 'Gls_minus_xG')

    def test_scatter_uses_unrounded_per90_coordinates_from_totals(self):
        response = self.client.get(
            '/api/charts/scatter?season=2024-2025&x=Gls&y=Ast_90&pos=FW&min_minutes=500'
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()['data']
        salah = next(point for point in payload['points'] if point['Player'] == 'Mohamed Salah')
        self.assertAlmostEqual(salah['y'], 18 * 90 / 3371, places=12)
        self.assertNotEqual(salah['y'], 0.48)
        self.assertEqual(salah['x'], 29)

    def test_scatter_untracked_metrics_are_null_and_marked_not_tracked(self):
        """Untracked historical metrics must not serialize an empty chart as zero statistics."""
        for query in (
            'season=2012-2013',
            'season=2025-2026&x=PrgC&y=PrgP'
        ):
            with self.subTest(query=query):
                response = self.client.get(f'/api/charts/scatter?{query}')
                self.assertEqual(response.status_code, 200)
                payload = response.get_json()['data']
                self.assertEqual(payload['tracking_status'], 'not_tracked')
                self.assertEqual(payload['points'], [])
                self.assertEqual(payload['points_count'], 0)
                for key in ('median_x', 'median_y', 'min_x', 'max_x', 'min_y', 'max_y'):
                    self.assertIsNone(payload['distribution'][key])
                self.assertEqual(payload['distribution']['quadrants'], {
                    'q1': 0, 'q2': 0, 'q3': 0, 'q4': 0
                })

    def test_scatter_with_no_eligible_minutes_is_distinct_from_untracked(self):
        response = self.client.get(
            '/api/charts/scatter?season=2024-2025&min_minutes=999999'
        )
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()['data']
        self.assertEqual(payload['tracking_status'], 'no_eligible_observations')
        self.assertEqual(payload['points'], [])
        self.assertIsNone(payload['distribution']['median_x'])

    def test_scatter_service_handles_missing_dataframe_as_untracked(self):
        payload = get_scatter_chart_data(None)
        self.assertEqual(payload['tracking_status'], 'not_tracked')
        self.assertEqual(payload['points'], [])
        self.assertIsNone(payload['distribution']['median_x'])

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
