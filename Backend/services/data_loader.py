import os
import re
import logging
import pandas as pd
import numpy as np
import duckdb
from config import DATASET_PATH, COMPETITIONS, COMPETITION_LOOKUP, METRIC_DEFINITIONS
from services.season_service import season_service

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUCKDB_PATH = os.path.join(BASE_DIR, 'data', 'pitchpulse.duckdb')
PARQUET_DIR = os.path.join(BASE_DIR, 'data', 'parquet')


def slugify(text):
    if not text:
        return ""
    text = str(text).strip().lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')


class DataLoader:
    """
    Multi-season data loader using DuckDB for high-performance columnar queries.
    Falls back to Parquet files for direct access. In-memory cache for hot data.
    """
    _instance = None
    _seasons_df = {}
    _seasons_records = {}
    _seasons_by_id = {}
    _df = None
    _records = None
    _by_id = {}
    _is_initialized = False
    _conn = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DataLoader, cls).__new__(cls)
            cls._instance._seasons_df = {}
            cls._instance._seasons_records = {}
            cls._instance._seasons_by_id = {}
        return cls._instance

    def _get_connection(self):
        """Get or create DuckDB connection (read-only for query performance)."""
        if self._conn is None:
            self._conn = duckdb.connect(DUCKDB_PATH, read_only=True)
        return self._conn

    def initialize(self, force_reload=False):
        if self._is_initialized and not force_reload:
            return

        active_season = season_service.get_active_season()
        logger.info(f"Initializing DataLoader with active season: {active_season}")
        self.load_season(active_season, force_reload=force_reload)
        self._is_initialized = True

    def load_season(self, season_id, force_reload=False):
        """Loads a specific season from Parquet (fast), DuckDB, or CSV/Excel fallback into memory cache."""
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

        # Try Parquet first (fastest for single-season loads)
        parquet_path = os.path.join(PARQUET_DIR, f"{s_id}.parquet")
        if os.path.exists(parquet_path):
            logger.info(f"Loading season '{s_id}' from Parquet: {parquet_path}")
            norm_df = pd.read_parquet(parquet_path)
        else:
            # Fallback to DuckDB query
            conn = self._get_connection()
            duck_df = conn.execute(
                "SELECT * FROM players WHERE season = ?", [s_id]
            ).fetchdf()

            if len(duck_df) > 0:
                logger.info(f"Loading season '{s_id}' from DuckDB ({len(duck_df)} rows)")
                norm_df = duck_df
            else:
                # Fallback to legacy CSV/Excel import (for dynamically added seasons not yet in DuckDB/Parquet)
                logger.info(f"Season '{s_id}' not in DuckDB/Parquet, falling back to CSV/Excel import")
                file_path = season_service.get_season_file_path(s_id, preferred_format='csv')
                if not file_path or not os.path.exists(file_path):
                    if s_id == '2024-2025' and os.path.exists(DATASET_PATH):
                        file_path = DATASET_PATH
                    else:
                        raise FileNotFoundError(f"Season data file not found for season '{s_id}'.")

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

        if len(norm_df) == 0:
            raise ValueError(f"Season '{s_id}' has no records.")

        # Convert to records format for API compatibility
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
        derived_by_engine = {'PrgC_90', 'PrgP_90', 'PrgR_90'}
        required_columns = [col for col in METRIC_DEFINITIONS.keys() if col not in derived_by_engine]
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

        float_cols = ['90s', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90', 'PrgC_90', 'PrgP_90', 'PrgR_90']
        for col in float_cols:
            if col in df.columns:
                # Do not fillna(0.0) on advanced metrics to preserve raw missingness/nulls
                if col in ['xG', 'npxG', 'xAG', 'npxG+xAG', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90', 'PrgC_90', 'PrgP_90', 'PrgR_90']:
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
            ('npxG+xAG', 'npxG+xAG_90'),
            ('PrgC', 'PrgC_90'),
            ('PrgP', 'PrgP_90'),
            ('PrgR', 'PrgR_90')
        ]
        for total_col, rate_col in rate_derivations:
            if total_col in df.columns:
                if rate_col not in df.columns:
                    df[rate_col] = np.nan
                # If total is NA/missing, rate must also be NA (cannot fabricate 0.0)
                df.loc[df[total_col].isna(), rate_col] = np.nan
                # If total > 0 and Min > 0, derive rate if rate is 0.0 or NA
                recalc_mask = has_minutes & (df[total_col] > 0) & ((df[rate_col] == 0.0) | df[rate_col].isna())
                df.loc[recalc_mask, rate_col] = ((df.loc[recalc_mask, total_col] / df.loc[recalc_mask, 'Min']) * 90.0).round(2)
                # If total == 0 and not NA, and Min > 0, rate is 0.0 if NA
                zero_mask = has_minutes & (df[total_col] == 0) & df[rate_col].isna()
                df.loc[zero_mask, rate_col] = 0.0
                # If Min == 0 and total is not NA, rate is 0.0
                min_zero_mask = (~has_minutes) & df[total_col].notna() & df[rate_col].isna()
                df.loc[min_zero_mask, rate_col] = 0.0

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

    def query_players(self, season=None, competition=None, position=None, min_minutes=0, metrics=None, limit=None, offset=0):
        """
        High-performance filtered query using DuckDB SQL.
        Returns DataFrame for analytical operations or list of dicts for API.
        """
        conn = self._get_connection()

        conditions = []
        params = []

        if season:
            s_id = season_service.resolve_season(season)
            conditions.append("season = ?")
            params.append(s_id)
        else:
            s_id = season_service.get_active_season()
            conditions.append("season = ?")
            params.append(s_id)

        if competition:
            conditions.append("competition_id = ?")
            params.append(competition)

        if position:
            conditions.append("Pos = ?")
            params.append(position)

        if min_minutes > 0:
            conditions.append("Min >= ?")
            params.append(min_minutes)

        where_clause = " AND ".join(conditions) if conditions else "1=1"

        # Build select clause
        if metrics:
            # Quote metric names that contain special characters
            quoted_metrics = [f'"{m}"' if any(c in m for c in '+-') else m for m in metrics]
            # Always include identity columns
            identity_cols = ['Rk', 'Player', 'Squad', 'Comp', 'Pos', 'Min', 'season', 'competition_id', 'competition_name', 'country']
            select_cols = identity_cols + [m for m in quoted_metrics if m not in identity_cols]
            select_clause = ", ".join(select_cols)
        else:
            select_clause = "*"

        query = f"SELECT {select_clause} FROM players WHERE {where_clause}"

        if limit:
            query += f" LIMIT {limit}"
        if offset:
            query += f" OFFSET {offset}"

        return conn.execute(query, params).fetchdf()

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

    def get_aggregations(self, season=None, group_by='competition_id', metrics=None):
        """Fast aggregated queries (means, percentiles) using DuckDB."""
        conn = self._get_connection()

        if season:
            s_id = season_service.resolve_season(season)
            where = "WHERE season = ?"
            params = [s_id]
        else:
            s_id = season_service.get_active_season()
            where = "WHERE season = ?"
            params = [s_id]

        if metrics:
            quoted = [f'AVG("{m}") as avg_{m.replace("+", "_").replace("-", "_")}' if any(c in m for c in '+-') else f'AVG({m}) as avg_{m}' for m in metrics]
            agg_clause = ", ".join(quoted)
        else:
            agg_clause = "AVG(Gls_90) as avg_gls_90, AVG(Ast_90) as avg_ast_90, AVG(xG_90) as avg_xg_90"

        query = f"""
            SELECT {group_by}, {agg_clause}, COUNT(*) as player_count
            FROM players
            {where} AND Min > 0
            GROUP BY {group_by}
            ORDER BY player_count DESC
        """
        return conn.execute(query, params).fetchdf()

    def get_percentiles(self, season=None, metric='Gls_90', percentiles=[0.25, 0.5, 0.75, 0.9, 0.95]):
        """Fast percentile computation using DuckDB's quantile functions."""
        conn = self._get_connection()

        if season:
            s_id = season_service.resolve_season(season)
            where = "WHERE season = ? AND Min > 0"
            params = [s_id]
        else:
            s_id = season_service.get_active_season()
            where = "WHERE season = ? AND Min > 0"
            params = [s_id]

        # Quote metric if needed
        metric_q = f'"{metric}"' if any(c in metric for c in '+-') else metric

        pct_exprs = ", ".join([f"quantile_cont({metric_q}, {p}) as p{int(p*100)}" for p in percentiles])
        query = f"SELECT {pct_exprs} FROM players {where}"
        return conn.execute(query, params).fetchdf()

    def close(self):
        """Close DuckDB connection."""
        if self._conn:
            self._conn.close()
            self._conn = None


# Global singleton accessor
data_loader = DataLoader()