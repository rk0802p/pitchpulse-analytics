import os
import sys
import unittest

import pandas as pd

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from scripts.check_storage_parity import compare_frames


class TestStorageParityComparison(unittest.TestCase):
    def setUp(self):
        self.csv_frame = pd.DataFrame([
            {
                'Player': 'A Player', 'Squad': 'Club A', 'Comp': 'eng Premier League',
                'Min': 90, 'Gls': 1, 'Ast': 0, 'xG': 0.0, 'xAG': 0.0,
                'PrgC': 0, 'PrgP': 0, 'PrgR': 0
            },
            {
                'Player': 'B Player', 'Squad': 'Club B', 'Comp': 'es La Liga',
                'Min': 180, 'Gls': 2, 'Ast': 1, 'xG': None, 'xAG': None,
                'PrgC': None, 'PrgP': None, 'PrgR': None
            }
        ])

    def test_identical_rows_pass_and_preserve_null_versus_zero(self):
        mismatches, summary = compare_frames(self.csv_frame, self.csv_frame.copy())
        self.assertEqual(mismatches, [])
        self.assertEqual(summary['rows'], 2)
        self.assertEqual(summary['totals'], {'Gls': 3, 'Ast': 1, 'Min': 270})
        self.assertEqual(summary['nulls']['PrgC'], 1)

    def test_equal_totals_do_not_hide_player_level_mismatch(self):
        altered = self.csv_frame.copy()
        altered.loc[0, 'Player'], altered.loc[1, 'Player'] = 'B Player', 'A Player'
        mismatches, _ = compare_frames(self.csv_frame, altered)
        self.assertEqual(mismatches, ['row_multiset'])

    def test_missing_value_changed_to_zero_fails_parity(self):
        altered = self.csv_frame.copy()
        altered.loc[1, 'PrgC'] = 0
        mismatches, _ = compare_frames(self.csv_frame, altered)
        self.assertIn('nulls', mismatches)
        self.assertIn('row_multiset', mismatches)


if __name__ == '__main__':
    unittest.main()
