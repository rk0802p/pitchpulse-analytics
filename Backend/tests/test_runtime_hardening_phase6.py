import os
import tempfile
import unittest
from pathlib import Path

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in os.sys.path:
    os.sys.path.insert(0, backend_dir)

from api import app, _data_version
from config import DEFAULT_ORIGINS, resolve_allowed_origins


class TestRuntimeHardeningPhase6(unittest.TestCase):
    def test_production_cors_is_restricted_when_unset_or_wildcard(self):
        self.assertEqual(resolve_allowed_origins(None, 'production'), DEFAULT_ORIGINS)
        self.assertEqual(resolve_allowed_origins('*', 'production'), DEFAULT_ORIGINS)
        self.assertEqual(resolve_allowed_origins('*', 'development'), '*')
        self.assertEqual(resolve_allowed_origins('https://app.example', 'production'), ['https://app.example'])

    def test_data_version_tracks_manifest_content(self):
        with tempfile.TemporaryDirectory() as directory:
            manifest = Path(directory) / '2024-2025' / 'manifest.json'
            manifest.parent.mkdir()
            manifest.write_text('{"version":1}', encoding='utf-8')
            first = _data_version(directory)
            manifest.write_text('{"version":2}', encoding='utf-8')
            self.assertNotEqual(first, _data_version(directory))

    def test_cached_api_responses_expose_manifest_version_and_etag(self):
        client = app.test_client()
        response = client.get('/api/players?season=2024-2025&limit=1')
        self.assertEqual(response.status_code, 200)
        version = response.headers['X-Data-Version']
        self.assertEqual(len(version), 64)
        self.assertEqual(response.headers['ETag'], f'"{version}"')
        self.assertIn('season-2024-2025', response.headers['Cache-Tag'])
        self.assertIn(f'data-{version[:12]}', response.headers['Cache-Tag'])
        cached = client.get('/api/players?season=2024-2025&limit=1', headers={'If-None-Match': response.headers['ETag']})
        self.assertEqual(cached.status_code, 304)


if __name__ == '__main__':
    unittest.main()
