import os
import re
import logging
import pandas as pd
import numpy as np
from config import DATASET_PATH, COMPETITIONS, COMPETITION_LOOKUP, METRIC_DEFINITIONS
from services.season_service import season_service

logger = logging.getLogger(__name__)

def slugify(text):
    if not text:
        return ""
    text = str(text).strip().lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

class DataLoader:
    """
    Multi-season data loader and in-memory cache for PitchPulse.
    Supports on-demand loading of individual seasons with fallback to the immutable baseline.
    """
    _instance = None
    _seasons_df = {}
    _seasons_records = {}
    _seasons_by_id = {}
    _df = None
    _records = None
    _by_id = {}
    _is_initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataLoader, cls).__new__(cls)
            cls._instance._seasons_df = {}
            cls._instance._seasons_records = {}
            cls._instance._seasons_by_id = {}
        return cls._instance

    def initialize(self, force_reload=False):
        if self._is_initialized and not force_reload:
            return

        active_season = season_service.get_active_season()
        logger.info(f"Initializing DataLoader with active season: {active_season}")
        self.load_season(active_season, force_reload=force_reload)
        self._is_initialized = True

    def load_season(self, season_id, force_reload=False):
        """Loads and normalizes a specific season dataset into memory."""
        s_id = season_service.resolve_season(season_id)
        if not season_service.season_exists(s_id):
            raise FileNotFoundError(f"Season data file not found for season '{s_id}'.")

        if s_id in self._seasons_df and not force_reload:
            # FIX: When switching to an already-cached season, ensure primary active references update
            if s_id == season_service.get_active_season() or self._df is None:
                self._df = self._seasons_df[s_id]
                self._records = self._seasons_records[s_id]
                self._by_id = self._seasons_by_id[s_id]
            return self._seasons_df[s_id]

        file_path = season_service.get_season_file_path(s_id, preferred_format='csv')
        if not file_path or not os.path.exists(file_path):
            if s_id == '2024-2025' and os.path.exists(DATASET_PATH):
                file_path = DATASET_PATH
            else:
                raise FileNotFoundError(f"Season data file not found for season '{s_id}'.")

        logger.info(f"Loading season '{s_id}' from: {file_path}")
        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.csv', '.txt']:
            try:
                raw_df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                raw_df = pd.read_csv(file_path, encoding='latin1')
        elif ext in ['.xlsx', '.xls']:
            xls = pd.ExcelFile(file_path)
            all_dfs = []
            for sheet_name in xls.sheet_names:
                all_dfs.append(pd.read_excel(xls, sheet_name=sheet_name))
            raw_df = pd.concat(all_dfs, ignore_index=True) if all_dfs else pd.DataFrame()
        else:
            raise ValueError(f"Unsupported file format '{ext}' for season '{s_id}'.")

        self._validate_schema(raw_df)
        norm_df = self._normalize_dataset(raw_df, season_id=s_id)
        norm_df['season'] = s_id
        norm_df['comparison_key'] = norm_df['Rk'].astype(str) + '@' + s_id
        raw_records = norm_df.to_dict(orient='records')
        records = [{k: (None if pd.isna(v) else (int(v) if k in ['PrgC', 'PrgP', 'PrgR'] and not pd.isna(v) else v)) for k, v in r.items()} for r in raw_records]
        by_id = {r['Rk']: r for r in records}

        self._seasons_df[s_id] = norm_df
        self._seasons_records[s_id] = records
        self._seasons_by_id[s_id] = by_id

        # Update primary defaults if this is the active season or uninitialized
        if s_id == season_service.get_active_season() or self._df is None:
            self._df = norm_df
            self._records = records
            self._by_id = by_id

        logger.info(f"Season '{s_id}' loaded successfully with {len(records)} player records.")
        return norm_df

    def _validate_schema(self, df):
        """Validates that all expected baseline columns exist and types are correct."""
        required_columns = list(METRIC_DEFINITIONS.keys())
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            raise ValueError(f"Dataset is missing required columns: {missing}")
        if len(df) == 0:
            raise ValueError("Dataset is empty.")

    def _normalize_dataset(self, raw_df, season_id=None):
        from services.metric_registry import is_metric_tracked_in_era
        df = raw_df.copy()

        # Handle missing demographic values
        if 'Nation' in df.columns:
            df['Nation'] = df['Nation'].fillna('Unknown')
        else:
            df['Nation'] = 'Unknown'
        def parse_age(x):
            if pd.isna(x) or x is None or x == '':
                return None
            s = str(x).strip()
            if '-' in s:
                parts = s.split('-')
                try:
                    years = float(parts[0])
                    days = float(parts[1]) if len(parts) > 1 and parts[1] else 0.0
                    return round(years + (days / 365.25), 1)
                except (ValueError, TypeError):
                    pass
            try:
                return float(s)
            except (ValueError, TypeError):
                return None

        df['Age'] = df['Age'].apply(parse_age)
        df['Born'] = df['Born'].apply(lambda x: None if pd.isna(x) else int(x))

        # Ensure standard match counts are clean ints (0 if missing/NA)
        int_cols = ['Rk', 'MP', 'Starts', 'Min', 'Gls', 'Ast', 'G+A', 'G-PK', 'PK', 'PKatt', 'CrdY', 'CrdR']
        for col in int_cols:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0).astype(int)

        # Progression metrics preserve nulls/missingness
        for col in ['PrgC', 'PrgP', 'PrgR']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')

        # DATA INTEGRITY: Enforce explicit NaN / null representation for metrics untracked in this season / competition era
        if season_id:
            for comp in df['Comp'].dropna().unique():
                comp_mask = df['Comp'] == comp
                for metric in ['PrgC', 'PrgP', 'PrgR', 'xG', 'xAG', 'npxG', 'npxG+xAG']:
                    if metric in df.columns:
                        if not is_metric_tracked_in_era(metric, season_id, comp):
                            df.loc[comp_mask, metric] = np.nan

        float_cols = ['90s', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90']
        for col in float_cols:
            if col in df.columns:
                # Do not fillna(0.0) on advanced metrics to preserve raw missingness/nulls
                if col in ['xG', 'npxG', 'xAG', 'npxG+xAG', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90']:
                    df[col] = pd.to_numeric(df[col], errors='coerce').round(2)
                else:
                    df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0).astype(float).round(2)

        # Phase 4: Standardize and calculate rate metrics dynamically from count totals whenever Min > 0
        # Rate per 90 = (Total metric / Minutes played) * 90
        has_minutes = df['Min'] > 0
        rate_derivations = [
            ('Gls', 'Gls_90'),
            ('Ast', 'Ast_90'),
            ('G+A', 'G+A_90'),
            ('G-PK', 'G-PK_90'),
            ('xG', 'xG_90'),
            ('xAG', 'xAG_90'),
            ('npxG', 'npxG_90'),
            ('npxG+xAG', 'npxG+xAG_90')
        ]
        for total_col, rate_col in rate_derivations:
            if total_col in df.columns and rate_col in df.columns:
                # If total is NA/missing, rate must also be NA (cannot fabricate 0.0)
                df.loc[df[total_col].isna(), rate_col] = np.nan
                # If total > 0 and Min > 0, derive rate if rate is 0.0 or NA
                recalc_mask = has_minutes & (df[total_col] > 0) & ((df[rate_col] == 0.0) | df[rate_col].isna())
                df.loc[recalc_mask, rate_col] = ((df.loc[recalc_mask, total_col] / df.loc[recalc_mask, 'Min']) * 90.0).round(2)

        # Also recalculate 90s if zero while Min > 0
        if '90s' in df.columns:
            recalc_90s = has_minutes & ((df['90s'] == 0.0) | df['90s'].isna())
            df.loc[recalc_90s, '90s'] = (df.loc[recalc_90s, 'Min'] / 90.0).round(1)
        else:
            df['90s'] = 0.0
            df.loc[has_minutes, '90s'] = (df.loc[has_minutes, 'Min'] / 90.0).round(1)

        # Derived G+A-PK_90 calculated from G-PK and Ast when Min > 0
        if 'G-PK' in df.columns and 'Ast' in df.columns and 'G+A-PK_90' in df.columns:
            recalc_gapk = has_minutes & ((df['G-PK'] > 0) | (df['Ast'] > 0)) & ((df['G+A-PK_90'] == 0.0) | df['G+A-PK_90'].isna())
            df.loc[recalc_gapk, 'G+A-PK_90'] = (((df.loc[recalc_gapk, 'G-PK'] + df.loc[recalc_gapk, 'Ast']) / df.loc[recalc_gapk, 'Min']) * 90.0).round(2)

        # Derived composite rate: xG+xAG_90
        if 'xG_90' in df.columns and 'xAG_90' in df.columns and 'xG+xAG_90' in df.columns:
            recalc_xg_xag = has_minutes & ((df['xG_90'] > 0) | (df['xAG_90'] > 0)) & ((df['xG+xAG_90'] == 0.0) | df['xG+xAG_90'].isna())
            df.loc[recalc_xg_xag, 'xG+xAG_90'] = (df.loc[recalc_xg_xag, 'xG_90'].fillna(0) + df.loc[recalc_xg_xag, 'xAG_90'].fillna(0)).round(2)

        # Derived metrics (safe guards for column existence)
        if 'Gls' in df.columns and 'xG' in df.columns:
            df['Gls_minus_xG'] = (df['Gls'] - df['xG']).round(2)
            df['xG_minus_Gls'] = (df['xG'] - df['Gls']).round(2)
        if 'Ast' in df.columns and 'xAG' in df.columns:
            df['Ast_minus_xAG'] = (df['Ast'] - df['xAG']).round(2)

        # Stable identifiers and metadata
        df['id'] = df['Rk']
        df['record_id'] = df['Rk']
        df['player_slug'] = df['Player'].apply(slugify)

        def make_player_id(row):
            slug = slugify(row.get('Player', ''))
            born = row.get('Born')
            if pd.notna(born) and born:
                try:
                    return f"{slug}-{int(born)}"
                except (ValueError, TypeError):
                    pass
            return slug

        df['player_id'] = df.apply(make_player_id, axis=1)

        # Competition normalization
        def map_comp_info(comp_raw):
            info = COMPETITIONS.get(comp_raw, {})
            return pd.Series([
                info.get('id', slugify(comp_raw)),
                info.get('name', comp_raw),
                info.get('country', 'Unknown')
            ])

        df[['competition_id', 'competition_name', 'country']] = df['Comp'].apply(map_comp_info)
        df['league'] = df['competition_name']

        return df

    def get_dataframe(self, season=None):
        if not self._is_initialized:
            self.initialize()
        if not season:
            return self._df
        s_id = season_service.resolve_season(season)
        if s_id in self._seasons_df:
            return self._seasons_df[s_id]
        if season_service.season_exists(s_id):
            return self.load_season(s_id)
        raise FileNotFoundError(f"Season '{season}' not found.")

    def get_records(self, season=None):
        if not self._is_initialized:
            self.initialize()
        if not season:
            return self._records
        s_id = season_service.resolve_season(season)
        if s_id in self._seasons_records:
            return self._seasons_records[s_id]
        if season_service.season_exists(s_id):
            self.load_season(s_id)
            return self._seasons_records.get(s_id, self._records)
        raise FileNotFoundError(f"Season '{season}' not found.")

    def get_by_id(self, record_id, season=None):
        if not self._is_initialized:
            self.initialize()
        if season:
            s_id = season_service.resolve_season(season)
            if not season_service.season_exists(s_id):
                raise FileNotFoundError(f"Season '{season}' not found.")
        else:
            s_id = season_service.get_active_season()

        if s_id not in self._seasons_by_id and season_service.season_exists(s_id):
            self.load_season(s_id)

        target_by_id = self._seasons_by_id.get(s_id, self._by_id)
        target_records = self._seasons_records.get(s_id, self._records)

        try:
            int_id = int(record_id)
            return target_by_id.get(int_id)
        except (ValueError, TypeError):
            req_str = str(record_id).strip()
            slug = slugify(req_str)
            matches = [r for r in target_records if r.get('player_id') == req_str or r.get('player_slug') == slug]
            return matches[0] if matches else None

# Global singleton accessor
data_loader = DataLoader()
