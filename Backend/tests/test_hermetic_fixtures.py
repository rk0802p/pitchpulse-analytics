import unittest
import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from tests.fixtures import build_hermetic_season_df, HermeticSeasonFixture, CANONICAL_COLUMNS
from services.dataset_importer import DatasetImporter

class TestHermeticFixtures(unittest.TestCase):
    def test_01_fixture_generation_conforms_to_schema(self):
        """Validates that synthetic hermetic fixtures match all 37 canonical columns."""
        df = build_hermetic_season_df(num_rows=60, season_id="2096-2097")
        self.assertEqual(len(df), 60)
        self.assertEqual(list(df.columns), CANONICAL_COLUMNS)
        self.assertFalse(df.isna().any().any())

    def test_02_context_manager_isolation_and_cleanup(self):
        """Validates that HermeticSeasonFixture creates and cleans up temporary season paths."""
        temp_csv = None
        with HermeticSeasonFixture(season_id="2095-2096", num_rows=25) as fixture:
            temp_csv = fixture.csv_path
            self.assertTrue(os.path.exists(temp_csv))
            importer = DatasetImporter(strict=True)
            res = importer.validate_dataframe(fixture.df)
            self.assertTrue(res['is_valid'])
            self.assertEqual(len(res['errors']), 0)

        # After exiting context, temp directory must be wiped
        self.assertFalse(os.path.exists(temp_csv))

if __name__ == '__main__':
    unittest.main()
