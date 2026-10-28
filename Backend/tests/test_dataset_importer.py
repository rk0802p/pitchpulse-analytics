import unittest
import os
import sys
import shutil
import tempfile
import json
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.dataset_importer import (
    DatasetImporter,
    DatasetValidationError,
    CANONICAL_SCHEMA
)
from services.baseline_verifier import (
    verify_baseline_integrity,
    compare_to_baseline,
    load_baseline_manifest,
    BaselineIntegrityError
)

class TestDatasetImporter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.importer = DatasetImporter(strict=True, allow_unknown=False, min_records=5)
        cls.backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cls.baseline_excel = os.path.join(cls.backend_dir, 'data', 'seasons', '2024-2025', 'top5-players24-25.xlsx')
        cls.baseline_csv = os.path.join(cls.backend_dir, 'data', 'seasons', '2024-2025', 'top5-players24-25.csv')
        cls.temp_dir = tempfile.mkdtemp()

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.temp_dir, ignore_errors=True)

    def test_01_verify_baseline_integrity(self):
        """Step 1: Baseline verification asserts exact SHA-256 and invariants."""
        res = verify_baseline_integrity(self.baseline_excel)
        self.assertTrue(res['valid'])
        self.assertEqual(res['record_count'], 2854)
        self.assertEqual(res['column_count'], 37)
        self.assertEqual(res['totals']['goals'], 4806)
        self.assertEqual(res['totals']['assists'], 3429)
        self.assertEqual(res['totals']['minutes'], 3459684)

    def test_02_baseline_tamper_detection(self):
        """Step 1: Baseline verifier rejects corrupted or tampered file."""
        tampered_path = os.path.join(self.temp_dir, 'tampered.xlsx')
        # Create a modified Excel file
        df = pd.DataFrame({'Rk': [1], 'Player': ['Tampered']})
        df.to_excel(tampered_path, index=False)

        with self.assertRaises(BaselineIntegrityError):
            verify_baseline_integrity(tampered_path)

    def test_03_validate_baseline_excel(self):
        """Step 2: Importer validates 2024/25 Excel dataset successfully."""
        df = self.importer.read_file(self.baseline_excel)
        val = self.importer.validate_dataframe(df)
        self.assertTrue(val['is_valid'])
        self.assertEqual(len(val['errors']), 0)
        self.assertEqual(val['stats']['total_records'], 2854)
        self.assertEqual(val['stats']['total_squads'], 96)

    def test_04_validate_baseline_csv(self):
        """Step 2: Importer validates 2024/25 CSV dataset successfully."""
        df = self.importer.read_file(self.baseline_csv)
        val = self.importer.validate_dataframe(df)
        self.assertTrue(val['is_valid'])
        self.assertEqual(len(val['errors']), 0)
        self.assertEqual(val['stats']['total_records'], 2854)

    def test_05_reject_missing_required_columns(self):
        """Step 2: Rejects dataset missing required canonical metrics (e.g. xG, PrgP)."""
        df = self.importer.read_file(self.baseline_csv).head(50).copy()
        df = df.drop(columns=['xG', 'npxG', 'PrgP'])

        val = self.importer.validate_dataframe(df)
        self.assertFalse(val['is_valid'])
        self.assertTrue(any("Missing 3 required columns" in e for e in val['errors']))

        test_file = os.path.join(self.temp_dir, 'missing_cols.csv')
        df.to_csv(test_file, index=False)
        with self.assertRaises(DatasetValidationError):
            self.importer.import_file(test_file, season='test-season')

    def test_06_reject_unexpected_columns_in_strict_mode(self):
        """Step 2: Rejects unrecognized columns in strict mode to prevent dataset corruption."""
        df = self.importer.read_file(self.baseline_csv).head(50).copy()
        df['unauthorized_metric'] = 123.45
        df['random_notes'] = 'corrupt'

        val = self.importer.validate_dataframe(df)
        self.assertFalse(val['is_valid'])
        self.assertTrue(any("Unexpected columns found" in e for e in val['errors']))

    def test_07_allow_unknown_flag(self):
        """Step 2: When allow_unknown=True, extra columns are permitted with warning."""
        relaxed_importer = DatasetImporter(strict=False, allow_unknown=True, min_records=5)
        df = self.importer.read_file(self.baseline_csv).head(50).copy()
        df['custom_metric'] = 99.9

        val = relaxed_importer.validate_dataframe(df)
        self.assertTrue(val['is_valid'])
        self.assertTrue(any("Found non-standard extra columns" in w for w in val['warnings']))

    def test_08_reject_empty_dataset(self):
        """Step 2: Rejects empty dataset (0 records)."""
        empty_df = pd.DataFrame(columns=list(CANONICAL_SCHEMA.keys()))
        val = self.importer.validate_dataframe(empty_df)
        self.assertFalse(val['is_valid'])
        self.assertTrue(any("0 records" in e for e in val['errors']))

    def test_09_reject_below_minimum_records(self):
        """Step 2: Rejects dataset below min_records threshold."""
        strict_min = DatasetImporter(min_records=100)
        df = self.importer.read_file(self.baseline_csv).head(20).copy()
        val = strict_min.validate_dataframe(df)
        self.assertFalse(val['is_valid'])
        self.assertTrue(any("below required minimum" in e for e in val['errors']))

    def test_10_reject_non_numeric_values_in_metrics(self):
        """Step 2: Rejects dataset with non-numeric strings in numeric metric columns."""
        df = self.importer.read_file(self.baseline_csv).head(50).copy()
        df['Gls'] = df['Gls'].astype(object)
        df.loc[0, 'Gls'] = 'NOT_A_NUMBER'
        val = self.importer.validate_dataframe(df)
        self.assertFalse(val['is_valid'])
        self.assertTrue(any("non-numeric values" in e for e in val['errors']))

    def test_11_column_alias_normalization(self):
        """Step 2: Standard header aliases are automatically mapped to canonical names."""
        df = self.importer.read_file(self.baseline_csv).head(50).copy()
        df = df.rename(columns={
            'Gls': 'Goals',
            'Ast': 'Assists',
            'xG': 'Expected Goals',
            'Min': 'Minutes Played'
        })
        val = self.importer.validate_dataframe(df)
        self.assertTrue(val['is_valid'])
        self.assertIn('Goals', val['mapped_columns'])
        self.assertEqual(val['mapped_columns']['Goals'], 'Gls')
        self.assertEqual(val['mapped_columns']['Expected Goals'], 'xG')

    def test_12_dry_run_does_not_write_files(self):
        """Step 2: Dry run validates and computes totals without creating disk files."""
        season = "2099-2100-dryrun"
        res = self.importer.import_file(
            file_path=self.baseline_csv,
            season=season,
            dry_run=True
        )
        self.assertEqual(res['status'], 'success')
        self.assertTrue(res['dry_run'])

        season_dir = os.path.join(self.backend_dir, 'data', 'seasons', season)
        self.assertFalse(os.path.exists(season_dir))

    def test_13_auto_compute_derived_rates(self):
        """Step 2: Importer computes missing per-90 rates when raw metrics exist."""
        df = self.importer.read_file(self.baseline_csv).head(20).copy()
        # Drop per-90 rate columns
        drop_cols = ['Gls_90', 'Ast_90', 'xG_90', 'xAG_90', '90s', 'xG+xAG_90']
        df_dropped = df.drop(columns=drop_cols)

        # In relaxed importer, normalize will compute them
        norm_df = self.importer.normalize_dataframe(df_dropped)
        for col in drop_cols:
            self.assertIn(col, norm_df.columns)
            self.assertFalse(norm_df[col].isnull().all())

    def test_14_compare_to_baseline(self):
        """Step 1: compare_to_baseline correctly evaluates candidate schema."""
        df = self.importer.read_file(self.baseline_csv)
        report = compare_to_baseline(df)
        self.assertTrue(report['is_schema_compatible'])
        self.assertEqual(len(report['missing_required_columns']), 0)
        self.assertEqual(report['candidate_rows'], 2854)

if __name__ == '__main__':
    unittest.main()
