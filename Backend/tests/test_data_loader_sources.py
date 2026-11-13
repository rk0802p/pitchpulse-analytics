import importlib
import os
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

import pandas as pd

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

loader_module = importlib.import_module('services.data_loader')
from services.data_loader import DataLoader
from services.season_service import season_service
from tests.fixtures import build_hermetic_season_df


class TestDataLoaderStorageFallbacks(unittest.TestCase):
    season_id = '2096-2097'

    def setUp(self):
        self.loader = DataLoader()
        self.saved_state = {
            name: getattr(self.loader, name)
            for name in (
                '_seasons_df', '_seasons_records', '_seasons_by_id',
                '_df', '_records', '_by_id', '_is_initialized', '_conn'
            )
        }
        self.loader._seasons_df = {}
        self.loader._seasons_records = {}
        self.loader._seasons_by_id = {}
        self.loader._df = None
        self.loader._records = None
        self.loader._by_id = {}
        self.loader._is_initialized = True
        self.loader._conn = None

        self.temp_dir = tempfile.TemporaryDirectory(prefix='pitchpulse-loader-test-')
        self.addCleanup(self.temp_dir.cleanup)
        self.parquet_dir = os.path.join(self.temp_dir.name, 'parquet')
        self.seasons_dir = os.path.join(self.temp_dir.name, 'seasons', self.season_id)
        os.makedirs(self.parquet_dir)
        os.makedirs(self.seasons_dir)
        self.source_df = build_hermetic_season_df(num_rows=10, season_id=self.season_id)
        self.csv_path = os.path.join(self.seasons_dir, f'top5-players-{self.season_id}.csv')
        self.xlsx_path = os.path.join(self.seasons_dir, f'top5-players-{self.season_id}.xlsx')
        self.source_df.to_csv(self.csv_path, index=False)
        self.source_df.to_excel(self.xlsx_path, index=False)

        self._patchers = [
            patch.object(loader_module, 'PARQUET_DIR', self.parquet_dir),
            patch.object(season_service, 'resolve_season', side_effect=lambda value: value),
            patch.object(season_service, 'season_exists', return_value=True),
            patch.object(season_service, 'get_active_season', return_value=self.season_id),
            patch.object(season_service, 'get_season_file_path', return_value=self.csv_path)
        ]
        for patcher in self._patchers:
            patcher.start()
            self.addCleanup(patcher.stop)
        self.addCleanup(self.restore_loader_state)

    def restore_loader_state(self):
        for name, value in self.saved_state.items():
            setattr(self.loader, name, value)

    def empty_duckdb(self):
        connection = Mock()
        connection.execute.return_value.fetchdf.return_value = pd.DataFrame()
        return connection

    def test_parquet_is_preferred_over_duckdb_and_csv(self):
        parquet_path = os.path.join(self.parquet_dir, f'{self.season_id}.parquet')
        open(parquet_path, 'wb').close()
        with patch.object(loader_module.pd, 'read_parquet', return_value=self.source_df.copy()) as read_parquet:
            with patch.object(self.loader, '_get_connection', side_effect=AssertionError('DuckDB should not be used')):
                loaded = self.loader.load_season(self.season_id)

        self.assertEqual(len(loaded), len(self.source_df))
        read_parquet.assert_called_once_with(parquet_path)
        self.assertEqual(self.loader.get_records(self.season_id)[0]['Player'], self.source_df.iloc[0]['Player'])

    def test_duckdb_is_used_when_parquet_is_missing_and_has_rows(self):
        database_df = self.source_df.copy()
        connection = Mock()
        connection.execute.return_value.fetchdf.return_value = database_df
        with patch.object(self.loader, '_get_connection', return_value=connection) as get_connection:
            loaded = self.loader.load_season(self.season_id)

        self.assertEqual(len(loaded), len(database_df))
        get_connection.assert_called_once_with()
        connection.execute.assert_called_once_with(
            'SELECT * FROM players WHERE season = ?', [self.season_id]
        )

    def test_csv_fallback_normalizes_data_when_other_stores_are_absent(self):
        connection = self.empty_duckdb()
        with patch.object(self.loader, '_get_connection', return_value=connection):
            loaded = self.loader.load_season(self.season_id)

        self.assertEqual(len(loaded), len(self.source_df))
        self.assertEqual(loaded['season'].unique().tolist(), [self.season_id])
        self.assertIn('comparison_key', loaded.columns)
        self.assertEqual(int(loaded['Gls'].sum()), int(self.source_df['Gls'].sum()))

    def test_xlsx_fallback_reads_all_sheets_and_normalizes_data(self):
        os.remove(self.csv_path)
        with patch.object(
            season_service,
            'get_season_file_path',
            return_value=self.xlsx_path
        ):
            with patch.object(self.loader, '_get_connection', return_value=self.empty_duckdb()):
                loaded = self.loader.load_season(self.season_id)

        self.assertEqual(len(loaded), len(self.source_df))
        self.assertEqual(int(loaded['Ast'].sum()), int(self.source_df['Ast'].sum()))
        self.assertEqual(loaded['season'].unique().tolist(), [self.season_id])


if __name__ == '__main__':
    unittest.main()
