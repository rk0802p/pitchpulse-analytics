import os
import re
import logging
import pandas as pd
from config import DATASET_PATH, COMPETITIONS, COMPETITION_LOOKUP, METRIC_DEFINITIONS

logger = logging.getLogger(__name__)

def slugify(text):
    if not text:
        return ""
    text = str(text).strip().lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

class DataLoader:
    _instance = None
    _df = None
    _records = None
    _by_id = {}
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataLoader, cls).__new__(cls)
        return cls._instance

    def initialize(self, force_reload=False):
        if self._is_initialized and not force_reload:
            return

        logger.info(f"Initializing DataLoader from: {DATASET_PATH}")
        if not os.path.exists(DATASET_PATH):
            raise FileNotFoundError(f"Dataset file not found at: {DATASET_PATH}")

        # Load Excel file
        xls = pd.ExcelFile(DATASET_PATH)
        all_dfs = []
        for sheet_name in xls.sheet_names:
            sheet_df = pd.read_excel(xls, sheet_name=sheet_name)
            all_dfs.append(sheet_df)

        df = pd.concat(all_dfs, ignore_index=True)
        self._validate_schema(df)
        self._df = self._normalize_dataset(df)
        self._records = self._df.to_dict(orient='records')
        self._by_id = {r['Rk']: r for r in self._records}
        self._is_initialized = True
        logger.info(f"DataLoader initialized successfully with {len(self._records)} player records.")

    def _validate_schema(self, df):
        """Validates that all expected baseline columns exist and types are correct."""
        required_columns = list(METRIC_DEFINITIONS.keys())
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            raise ValueError(f"Dataset is missing required columns: {missing}")
        if len(df) == 0:
            raise ValueError("Dataset is empty.")

    def _normalize_dataset(self, raw_df):
        df = raw_df.copy()

        # Handle missing demographic values
        df['Nation'] = df['Nation'].fillna('Unknown')
        df['Age'] = df['Age'].apply(lambda x: None if pd.isna(x) else float(x))
        df['Born'] = df['Born'].apply(lambda x: None if pd.isna(x) else int(x))

        # Ensure numeric metrics are clean floats or ints
        int_cols = ['Rk', 'MP', 'Starts', 'Min', 'Gls', 'Ast', 'G+A', 'G-PK', 'PK', 'PKatt', 'CrdY', 'CrdR', 'PrgC', 'PrgP', 'PrgR']
        for col in int_cols:
            df[col] = df[col].fillna(0).astype(int)

        float_cols = ['90s', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90']
        for col in float_cols:
            df[col] = df[col].fillna(0.0).astype(float).round(2)

        # Derived metrics
        df['Gls_minus_xG'] = (df['Gls'] - df['xG']).round(2)
        df['Ast_minus_xAG'] = (df['Ast'] - df['xAG']).round(2)

        # Stable identifiers and metadata
        df['id'] = df['Rk']
        df['record_id'] = df['Rk']
        df['player_slug'] = df['Player'].apply(slugify)

        # Competition normalization
        def map_comp_info(comp_raw):
            info = COMPETITIONS.get(comp_raw, {})
            return pd.Series([
                info.get('id', slugify(comp_raw)),
                info.get('name', comp_raw),
                info.get('country', 'Unknown')
            ])

        df[['competition_id', 'competition_name', 'country']] = df['Comp'].apply(map_comp_info)
        # Fix legacy 'league' bug: assign competition_name instead of 'Sheet1'
        df['league'] = df['competition_name']

        return df

    def get_dataframe(self):
        if not self._is_initialized:
            self.initialize()
        return self._df

    def get_records(self):
        if not self._is_initialized:
            self.initialize()
        return self._records

    def get_by_id(self, record_id):
        if not self._is_initialized:
            self.initialize()
        try:
            int_id = int(record_id)
            return self._by_id.get(int_id)
        except (ValueError, TypeError):
            # Try searching by player_slug
            slug = slugify(str(record_id))
            matches = [r for r in self._records if r['player_slug'] == slug]
            return matches[0] if matches else None

# Global singleton accessor
data_loader = DataLoader()
