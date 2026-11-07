import unittest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from api import create_app
from services.validation_service import parse_bool, validate_season_id, validate_position
from scripts.import_season import validate_safe_url

class TestSecurityPhase1(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['ADMIN_TOKEN'] = 'phase1-test-token-secret'
        cls.valid_auth = {'Authorization': 'Bearer phase1-test-token-secret'}
        cls.invalid_auth = {'Authorization': 'Bearer wrong-attacker-token'}
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_unauthenticated_import_forbidden(self):
        """S1: POST /api/seasons/import without auth returns 403."""
        res = self.client.post('/api/seasons/import')
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertFalse(data['success'])

    def test_02_unauthenticated_active_season_forbidden(self):
        """S1: POST /api/seasons/active without auth returns 403."""
        res = self.client.post('/api/seasons/active', json={'season': '2024-2025'})
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertFalse(data['success'])

    def test_03_active_season_invalid_token_forbidden(self):
        """S1: POST /api/seasons/active with invalid token returns 403."""
        res = self.client.post('/api/seasons/active', json={'season': '2024-2025'}, headers=self.invalid_auth)
        self.assertEqual(res.status_code, 403)
        data = res.get_json()
        self.assertFalse(data['success'])

    def test_04_active_season_valid_token_allowed(self):
        """S1: POST /api/seasons/active with valid admin token returns 200."""
        res = self.client.post('/api/seasons/active', json={'season': '2024-2025'}, headers=self.valid_auth)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data['success'])

    def test_05_ssrf_prohibited_in_import_route(self):
        """S2: POST /api/seasons/import with remote URL or filepath returns 400 (SSRF guard)."""
        res_url = self.client.post(
            '/api/seasons/import',
            json={'url': 'http://169.254.169.254/latest/meta-data/'},
            headers=self.valid_auth
        )
        self.assertEqual(res_url.status_code, 400)
        self.assertEqual(res_url.get_json()['error_detail']['code'], 'ERR_SSRF_PROHIBITED')

        res_path = self.client.post(
            '/api/seasons/import',
            json={'file_path': '/etc/passwd'},
            headers=self.valid_auth
        )
        self.assertEqual(res_path.status_code, 400)
        self.assertEqual(res_path.get_json()['error_detail']['code'], 'ERR_PATH_PROHIBITED')

    def test_06_cli_ssrf_validator(self):
        """S2: validate_safe_url rejects localhost, private IPs, loopbacks, and non-http schemes."""
        bad_urls = [
            'http://localhost:5000/data.csv',
            'http://127.0.0.1:8080/data.csv',
            'http://169.254.169.254/latest/meta-data',
            'http://10.0.0.1/internal.xlsx',
            'file:///etc/passwd',
            'ftp://evil.com/data.csv'
        ]
        for url in bad_urls:
            is_safe, msg = validate_safe_url(url)
            self.assertFalse(is_safe, f"Expected {url} to be unsafe, but got {is_safe} ({msg})")

    def test_07_strict_season_validation_across_routes(self):
        """S4: Invalid season or path traversal returns 400 ERR_INVALID_SEASON across endpoints."""
        traversal_seasons = ['..', '../secret', '2024/..', '..\\..', '%2e%2e', 'invalid/path']
        endpoints = [
            ('/api/players?season={}', 'GET', None),
            ('/api/leaderboards?season={}', 'GET', None),
            ('/api/competitions?season={}', 'GET', None),
            ('/api/metadata?season={}', 'GET', None),
            ('/api/players/compare', 'POST', lambda s: {'season': s, 'player_ids': [1]})
        ]

        for s in traversal_seasons:
            for url_tmpl, method, body_fn in endpoints:
                if method == 'GET':
                    url = url_tmpl.format(s)
                    res = self.client.get(url)
                else:
                    url = url_tmpl
                    res = self.client.post(url, json=body_fn(s))
                self.assertEqual(res.status_code, 400, f"Expected 400 for {url} with season='{s}', got {res.status_code}")
                data = res.get_json()
                self.assertFalse(data['success'])
                self.assertEqual(data.get('error_detail', {}).get('code'), 'ERR_INVALID_SEASON')

    def test_08_regex_and_special_character_inputs_never_500(self):
        """S7: Regex metacharacters in search and position return 200 or 400, never 500."""
        # Search containing unclosed regex parentheses
        res_search = self.client.get('/api/players?search=(')
        self.assertEqual(res_search.status_code, 200)

        # Search containing bracket expressions
        res_search_bracket = self.client.get('/api/players?search=[a-z]+')
        self.assertEqual(res_search_bracket.status_code, 200)

        # Invalid position containing regex characters returns 400, never 500
        res_pos = self.client.get('/api/players?position=[')
        self.assertEqual(res_pos.status_code, 400)
        self.assertEqual(res_pos.get_json()['error_detail']['code'], 'ERR_INVALID_POSITION')

        res_lb_pos = self.client.get('/api/leaderboards?position=[')
        self.assertEqual(res_lb_pos.status_code, 400)
        self.assertEqual(res_lb_pos.get_json()['error_detail']['code'], 'ERR_INVALID_POSITION')

    def test_09_debug_endpoint_is_404(self):
        """S5: /api/debug must not exist and return 404."""
        res = self.client.get('/api/debug')
        self.assertEqual(res.status_code, 404)

    def test_10_boolean_parser_utility(self):
        """S9: parse_bool accurately parses boolean and string representations."""
        self.assertTrue(parse_bool(True))
        self.assertTrue(parse_bool("true"))
        self.assertTrue(parse_bool("1"))
        self.assertTrue(parse_bool("yes"))
        self.assertTrue(parse_bool("on"))

        self.assertFalse(parse_bool(False))
        self.assertFalse(parse_bool("false"))
        self.assertFalse(parse_bool("0"))
        self.assertFalse(parse_bool("no"))
        self.assertFalse(parse_bool("off"))

        self.assertTrue(parse_bool(None, default=True))
        self.assertFalse(parse_bool(None, default=False))
        self.assertTrue(parse_bool("", default=True))
        self.assertFalse(parse_bool("", default=False))

if __name__ == '__main__':
    unittest.main()
