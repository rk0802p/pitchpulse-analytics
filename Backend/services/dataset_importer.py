import os
import re
import json
import hashlib
import logging
from datetime import datetime, timezone
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEASONS_DIR = os.path.join(BASE_DIR, 'data', 'seasons')

# Canonical 37 schema columns required for PitchPulse analytics
CANONICAL_SCHEMA = {
    'Rk': {'type': 'int', 'required': True, 'category': 'Identity'},
    'Player': {'type': 'string', 'required': True, 'category': 'Identity'},
    'Nation': {'type': 'string', 'required': False, 'category': 'Identity'},
    'Pos': {'type': 'string', 'required': True, 'category': 'Identity'},
    'Squad': {'type': 'string', 'required': True, 'category': 'Identity'},
    'Comp': {'type': 'string', 'required': True, 'category': 'Identity'},
    'Age': {'type': 'float', 'required': False, 'category': 'Demographics'},
    'Born': {'type': 'float', 'required': False, 'category': 'Demographics'},
    'MP': {'type': 'int', 'required': True, 'category': 'Playing Time'},
    'Starts': {'type': 'int', 'required': True, 'category': 'Playing Time'},
    'Min': {'type': 'int', 'required': True, 'category': 'Playing Time'},
    '90s': {'type': 'float', 'required': True, 'category': 'Playing Time'},
    'Gls': {'type': 'int', 'required': True, 'category': 'Scoring'},
    'Ast': {'type': 'int', 'required': True, 'category': 'Playmaking'},
    'G+A': {'type': 'int', 'required': True, 'category': 'Scoring'},
    'G-PK': {'type': 'int', 'required': True, 'category': 'Scoring'},
    'PK': {'type': 'int', 'required': True, 'category': 'Scoring'},
    'PKatt': {'type': 'int', 'required': True, 'category': 'Scoring'},
    'CrdY': {'type': 'int', 'required': True, 'category': 'Discipline'},
    'CrdR': {'type': 'int', 'required': True, 'category': 'Discipline'},
    'xG': {'type': 'float', 'required': True, 'category': 'Advanced Scoring'},
    'npxG': {'type': 'float', 'required': True, 'category': 'Advanced Scoring'},
    'xAG': {'type': 'float', 'required': True, 'category': 'Advanced Playmaking'},
    'npxG+xAG': {'type': 'float', 'required': True, 'category': 'Advanced Production'},
    'PrgC': {'type': 'int', 'required': True, 'category': 'Progression'},
    'PrgP': {'type': 'int', 'required': True, 'category': 'Progression'},
    'PrgR': {'type': 'int', 'required': True, 'category': 'Progression'},
    'Gls_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'Ast_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'G+A_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'G-PK_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'G+A-PK_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'xG_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'xAG_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'xG+xAG_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'npxG_90': {'type': 'float', 'required': True, 'category': 'Rates'},
    'npxG+xAG_90': {'type': 'float', 'required': True, 'category': 'Rates'},
}

# Standard column aliases for automatic mapping
COLUMN_ALIASES = {
    'rk': 'Rk', 'rank': 'Rk', 'id': 'Rk',
    'player': 'Player', 'player name': 'Player', 'name': 'Player',
    'nation': 'Nation', 'nationality': 'Nation', 'country': 'Nation',
    'pos': 'Pos', 'position': 'Pos', 'role': 'Pos',
    'squad': 'Squad', 'team': 'Squad', 'club': 'Squad',
    'comp': 'Comp', 'league': 'Comp', 'competition': 'Comp',
    'age': 'Age',
    'born': 'Born', 'birth year': 'Born', 'year of birth': 'Born',
    'mp': 'MP', 'matches': 'MP', 'matches played': 'MP', 'appearances': 'MP', 'apps': 'MP',
    'starts': 'Starts', 'games started': 'Starts',
    'min': 'Min', 'mins': 'Min', 'minutes': 'Min', 'minutes played': 'Min',
    '90s': '90s', 'nineties': '90s',
    'gls': 'Gls', 'goals': 'Gls',
    'ast': 'Ast', 'assists': 'Ast',
    'g+a': 'G+A', 'goals+assists': 'G+A', 'goals + assists': 'G+A',
    'g-pk': 'G-PK', 'non-penalty goals': 'G-PK', 'non penalty goals': 'G-PK',
    'pk': 'PK', 'penalties': 'PK', 'penalty goals': 'PK',
    'pkatt': 'PKatt', 'penalty attempts': 'PKatt', 'penalties attempted': 'PKatt',
    'crdy': 'CrdY', 'yellow cards': 'CrdY', 'yellows': 'CrdY',
    'crdr': 'CrdR', 'red cards': 'CrdR', 'reds': 'CrdR',
    'xg': 'xG', 'expected goals': 'xG',
    'npxg': 'npxG', 'non-penalty xg': 'npxG', 'non penalty xg': 'npxG',
    'xag': 'xAG', 'expected assisted goals': 'xAG', 'expected assists': 'xAG', 'xa': 'xAG',
    'npxg+xag': 'npxG+xAG', 'npxg + xag': 'npxG+xAG',
    'prgc': 'PrgC', 'progressive carries': 'PrgC',
    'prgp': 'PrgP', 'progressive passes': 'PrgP',
    'prgr': 'PrgR', 'progressive receptions': 'PrgR',
    'gls_90': 'Gls_90', 'goals/90': 'Gls_90', 'goals per 90': 'Gls_90',
    'ast_90': 'Ast_90', 'assists/90': 'Ast_90', 'assists per 90': 'Ast_90',
    'g+a_90': 'G+A_90', 'g+a/90': 'G+A_90',
    'g-pk_90': 'G-PK_90', 'g-pk/90': 'G-PK_90',
    'g+a-pk_90': 'G+A-PK_90', 'g+a-pk/90': 'G+A-PK_90',
    'xg_90': 'xG_90', 'xg/90': 'xG_90',
    'xag_90': 'xAG_90', 'xag/90': 'xAG_90',
    'xg+xag_90': 'xG+xAG_90', 'xg+xag/90': 'xG+xAG_90',
    'npxg_90': 'npxG_90', 'npxg/90': 'npxG_90',
    'npxg+xag_90': 'npxG+xAG_90', 'npxg+xag/90': 'npxG+xAG_90'
}

VALID_POSITIONS = {'GK', 'DF', 'MF', 'FW', 'DF,MF', 'MF,DF', 'MF,FW', 'FW,MF', 'DF,FW', 'FW,DF'}

# Columns that can be deterministically auto-computed if missing from raw files
DERIVABLE_COLUMNS = {
    'Rk', '90s', 'G+A', 'G-PK', 'npxG+xAG',
    'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90',
    'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90'
}

class DatasetValidationError(Exception):
    """Raised when an incoming dataset fails schema or data integrity validation."""
    def __init__(self, message, errors=None):
        super().__init__(message)
        self.errors = errors or [message]

class DatasetImporter:
    """
    Reusable importer for PitchPulse datasets in Excel (.xlsx, .xls) and CSV (.csv) formats.
    Validates required metrics, rejects unexpected columns, normalizes datatypes,
    and writes versioned season storage.
    """

    def __init__(self, strict=True, allow_unknown=False, min_records=10):
        self.strict = strict
        self.allow_unknown = allow_unknown
        self.min_records = min_records

    def read_file(self, file_path):
        """Reads Excel or CSV file into a pandas DataFrame."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Source file not found at: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext in ['.xlsx', '.xls']:
            xls = pd.ExcelFile(file_path)
            dfs = []
            for sheet_name in xls.sheet_names:
                sheet_df = pd.read_excel(xls, sheet_name=sheet_name)
                dfs.append(sheet_df)
            df = pd.concat(dfs, ignore_index=True) if dfs else pd.DataFrame()
        elif ext in ['.csv', '.txt']:
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin1')
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Must be .xlsx, .xls, or .csv.")

        return df

    def inspect_file(self, file_path):
        """Quick inspection of file without full validation."""
        df = self.read_file(file_path)
        return {
            'filepath': file_path,
            'filename': os.path.basename(file_path),
            'filesize_bytes': os.path.getsize(file_path),
            'rows': len(df),
            'columns': list(df.columns),
            'column_count': len(df.columns)
        }

    def validate_dataframe(self, df):
        """
        Validates schema, column names, data types, and record contents.
        Returns a structured validation dictionary with errors and warnings.
        """
        errors = []
        warnings = []
        mapped_columns = {}

        # 1. Minimum record count
        if len(df) == 0:
            errors.append("Dataset is completely empty (0 records).")
            return {
                'is_valid': False,
                'errors': errors,
                'warnings': warnings,
                'mapped_columns': mapped_columns,
                'stats': {'total_records': 0}
            }

        if len(df) < self.min_records:
            errors.append(f"Dataset has only {len(df)} records, below required minimum of {self.min_records}.")

        # 2. Check and map column names
        current_cols = list(df.columns)
        cleaned_col_map = {}
        for col in current_cols:
            col_str = str(col).strip()
            col_lower = col_str.lower()
            if col_str in CANONICAL_SCHEMA:
                cleaned_col_map[col] = col_str
            elif col_lower in COLUMN_ALIASES:
                canonical = COLUMN_ALIASES[col_lower]
                cleaned_col_map[col] = canonical
                mapped_columns[col] = canonical
                warnings.append(f"Mapped alias column '{col}' -> '{canonical}'.")
            else:
                cleaned_col_map[col] = col_str

        normalized_cols = set(cleaned_col_map.values())

        # 3. Check for missing required canonical columns (excluding auto-derivable fields)
        missing_required = []
        for col, meta in CANONICAL_SCHEMA.items():
            if meta['required'] and col not in normalized_cols:
                if col not in DERIVABLE_COLUMNS:
                    missing_required.append(col)

        if missing_required:
            errors.append(f"Missing {len(missing_required)} required columns: {sorted(missing_required)}")

        # 4. Check for unexpected / unrecognized columns
        extra_cols = [c for c in normalized_cols if c not in CANONICAL_SCHEMA]
        if extra_cols:
            if not self.allow_unknown:
                errors.append(
                    f"Unexpected columns found ({len(extra_cols)}): {extra_cols}. "
                    "In strict mode, datasets with unrecognized columns are rejected to prevent corruption."
                )
            else:
                warnings.append(f"Found non-standard extra columns: {extra_cols}")

        # If schema errors exist, stop here before data type checks
        if errors:
            return {
                'is_valid': False,
                'errors': errors,
                'warnings': warnings,
                'mapped_columns': mapped_columns,
                'stats': {'total_records': len(df)}
            }

        # 5. Row-level content & type validation
        # Create a temporary mapped df to validate contents
        work_df = df.rename(columns=cleaned_col_map)

        # Check Player column
        if work_df['Player'].isnull().any():
            null_count = int(work_df['Player'].isnull().sum())
            errors.append(f"Found {null_count} records with null/missing Player name.")

        # Check Pos column
        invalid_pos = work_df[~work_df['Pos'].astype(str).str.contains('GK|DF|MF|FW', regex=True, na=False)]
        if len(invalid_pos) > 0:
            warnings.append(f"Found {len(invalid_pos)} records with non-standard position values.")

        # Check numeric columns casting
        numeric_cols = [
            col for col, meta in CANONICAL_SCHEMA.items()
            if meta['type'] in ['int', 'float'] and col in work_df.columns
        ]

        for col in numeric_cols:
            non_numeric = pd.to_numeric(work_df[col], errors='coerce').isnull() & work_df[col].notnull()
            if non_numeric.any():
                invalid_count = int(non_numeric.sum())
                errors.append(f"Column '{col}' has {invalid_count} non-numeric values.")

        is_valid = len(errors) == 0

        # Stats breakdown
        comps = work_df['Comp'].value_counts().to_dict() if 'Comp' in work_df.columns else {}
        squads = int(work_df['Squad'].nunique()) if 'Squad' in work_df.columns else 0

        return {
            'is_valid': is_valid,
            'errors': errors,
            'warnings': warnings,
            'mapped_columns': mapped_columns,
            'stats': {
                'total_records': len(work_df),
                'total_squads': squads,
                'competitions': {str(k): int(v) for k, v in comps.items()},
                'columns_count': len(work_df.columns)
            }
        }

    def normalize_dataframe(self, df):
        """
        Normalizes column names, string types, demographic values,
        and computes missing per-90 rates or derived statistics.
        """
        # Map aliases
        rename_map = {}
        for col in df.columns:
            col_str = str(col).strip()
            col_lower = col_str.lower()
            if col_str in CANONICAL_SCHEMA:
                rename_map[col] = col_str
            elif col_lower in COLUMN_ALIASES:
                rename_map[col] = COLUMN_ALIASES[col_lower]

        ndf = df.rename(columns=rename_map).copy()

        # Fill text defaults
        ndf['Player'] = ndf['Player'].astype(str).str.strip()
        ndf['Nation'] = ndf['Nation'].fillna('Unknown').astype(str).str.strip()
        ndf['Pos'] = ndf['Pos'].astype(str).str.strip()
        ndf['Squad'] = ndf['Squad'].astype(str).str.strip()
        ndf['Comp'] = ndf['Comp'].astype(str).str.strip()

        # Demographics
        def parse_age_val(val):
            if pd.isna(val):
                return None
            s = str(val).strip()
            if '-' in s:
                s = s.split('-')[0].strip()
            try:
                return float(s)
            except (ValueError, TypeError):
                return None

        ndf['Age'] = ndf['Age'].apply(parse_age_val)
        ndf['Born'] = pd.to_numeric(ndf['Born'], errors='coerce')

        # Standard match count integer columns (0 if missing)
        int_cols = ['Rk', 'MP', 'Starts', 'Min', 'Gls', 'Ast', 'G+A', 'G-PK', 'PK', 'PKatt', 'CrdY', 'CrdR']
        for col in int_cols:
            if col in ndf.columns:
                ndf[col] = pd.to_numeric(ndf[col], errors='coerce').fillna(0).astype(int)

        # Progression metrics can be null or integers
        for col in ['PrgC', 'PrgP', 'PrgR']:
            if col in ndf.columns:
                ndf[col] = pd.to_numeric(ndf[col], errors='coerce')

        # Float metric columns: preserve missingness for advanced stats
        float_cols = ['90s', 'xG', 'npxG', 'xAG', 'npxG+xAG', 'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'G+A-PK_90', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90']
        for col in float_cols:
            if col in ndf.columns:
                if col in ['xG', 'npxG', 'xAG', 'npxG+xAG', 'xG_90', 'xAG_90', 'xG+xAG_90', 'npxG_90', 'npxG+xAG_90']:
                    ndf[col] = pd.to_numeric(ndf[col], errors='coerce').round(2)
                else:
                    ndf[col] = pd.to_numeric(ndf[col], errors='coerce').fillna(0.0).astype(float).round(2)

        # Auto-compute 90s if missing or 0
        if '90s' not in ndf.columns or (ndf['90s'] == 0).all():
            ndf['90s'] = (ndf['Min'] / 90.0).round(1)

        # Auto-compute compound counters if missing
        if 'G+A' not in ndf.columns:
            ndf['G+A'] = ndf['Gls'] + ndf['Ast']
        if 'G-PK' not in ndf.columns:
            ndf['G-PK'] = ndf['Gls'] - ndf['PK']
        if 'npxG+xAG' not in ndf.columns:
            ndf['npxG+xAG'] = (ndf['npxG'] + ndf['xAG']).round(2)

        # Auto-compute per-90 rates if missing or incomplete
        nineties = ndf['90s'].apply(lambda x: x if x > 0 else 1.0)
        has_minutes = ndf['90s'] > 0

        rate_mappings = [
            ('Gls_90', 'Gls'),
            ('Ast_90', 'Ast'),
            ('G+A_90', 'G+A'),
            ('G-PK_90', 'G-PK'),
            ('xG_90', 'xG'),
            ('xAG_90', 'xAG'),
            ('npxG_90', 'npxG')
        ]

        for rate_col, base_col in rate_mappings:
            if rate_col not in ndf.columns or ndf[rate_col].isnull().all():
                if base_col in ndf.columns:
                    ndf[rate_col] = (ndf[base_col] / nineties).round(2)
                    ndf.loc[~has_minutes, rate_col] = 0.0

        if 'xG+xAG_90' not in ndf.columns:
            ndf['xG+xAG_90'] = (ndf['xG_90'] + ndf['xAG_90']).round(2)
        if 'npxG+xAG_90' not in ndf.columns:
            ndf['npxG+xAG_90'] = (ndf['npxG_90'] + ndf['xAG_90']).round(2)
        if 'G+A-PK_90' not in ndf.columns:
            ndf['G+A-PK_90'] = ((ndf['G-PK'] + ndf['Ast']) / nineties).round(2)
            ndf.loc[~has_minutes, 'G+A-PK_90'] = 0.0

        # Rk ordering
        if 'Rk' not in ndf.columns or ndf['Rk'].isnull().any():
            ndf['Rk'] = range(1, len(ndf) + 1)

        # Ensure all 37 canonical columns are present in canonical order
        canonical_order = list(CANONICAL_SCHEMA.keys())
        # Keep any extra columns at the end if allow_unknown was set
        final_cols = [c for c in canonical_order if c in ndf.columns]
        extra_cols = [c for c in ndf.columns if c not in CANONICAL_SCHEMA]
        ndf = ndf[final_cols + extra_cols]

        return ndf

    def import_file(self, file_path, season, source_name=None, output_format='both', dry_run=False, allow_overwrite=False):
        """
        Full end-to-end import pipeline:
        1. Read source Excel/CSV.
        2. Validate schema and metrics against canonical 37 schema.
        3. If invalid, reject with DatasetValidationError without modifying data.
        4. Normalize dataset.
        5. If dry_run is False, save versioned files (.xlsx, .csv) into data/seasons/{season}/.
        6. Write manifest.json with file hash, records, and totals.
        """
        logger.info(f"Starting import of file '{file_path}' for season '{season}' (dry_run={dry_run}).")

        if season == '2024-2025':
            raise DatasetValidationError("The 2024-2025 baseline dataset is immutable and cannot be overwritten.")

        season_dir_check = os.path.join(SEASONS_DIR, season)
        if os.path.exists(season_dir_check) and not allow_overwrite:
            raise DatasetValidationError(
                f"Season '{season}' already exists in storage and cannot be overwritten without allow_overwrite=True / --force."
            )

        df = self.read_file(file_path)
        validation = self.validate_dataframe(df)

        if not validation['is_valid']:
            err_msg = f"Dataset validation failed with {len(validation['errors'])} error(s):\n" + "\n".join(f" - {e}" for e in validation['errors'])
            logger.error(err_msg)
            raise DatasetValidationError(err_msg, errors=validation['errors'])

        # Compute SHA-256 of incoming raw file
        hasher = hashlib.sha256()
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                hasher.update(chunk)
        raw_sha256 = hasher.hexdigest()

        # Normalize dataframe
        norm_df = self.normalize_dataframe(df)

        # Season destination folder
        season_dir = os.path.join(SEASONS_DIR, season)
        excel_filename = f"top5-players-{season}.xlsx"
        csv_filename = f"top5-players-{season}.csv"
        excel_path = os.path.join(season_dir, excel_filename)
        csv_path = os.path.join(season_dir, csv_filename)
        manifest_path = os.path.join(season_dir, "manifest.json")

        summary_totals = {
            'goals': int(norm_df['Gls'].sum()),
            'assists': int(norm_df['Ast'].sum()),
            'minutes': int(norm_df['Min'].sum()),
            'xg': round(float(norm_df['xG'].sum()), 2),
            'xag': round(float(norm_df['xAG'].sum()), 2),
            'yellow_cards': int(norm_df['CrdY'].sum()),
            'red_cards': int(norm_df['CrdR'].sum()),
            'progressive_passes': int(norm_df['PrgP'].sum()),
            'progressive_carries': int(norm_df['PrgC'].sum())
        }

        top_scorers_preview = norm_df.sort_values(by=['Gls', 'Min'], ascending=[False, True]).head(5)[
            ['Player', 'Squad', 'Comp', 'Pos', 'Gls', 'Ast', 'xG']
        ].to_dict('records')
        top_creators_preview = norm_df.sort_values(by=['Ast', 'Min'], ascending=[False, True]).head(5)[
            ['Player', 'Squad', 'Comp', 'Pos', 'Ast', 'Gls', 'xAG']
        ].to_dict('records')

        preview = {
            'top_scorers': top_scorers_preview,
            'top_creators': top_creators_preview
        }

        manifest = {
            'canonical_id': season,
            'season': season,
            'display_name': f"{season.replace('-', '/')} Season",
            'dataset_status': 'unverified',
            'status_label': 'Unverified Import',
            'is_projection': False,
            'source': source_name or "FBref / StatsBomb style player-level aggregates",
            'source_name': source_name or "FBref / StatsBomb style player-level aggregates",
            'imported_at': datetime.now(timezone.utc).isoformat(),
            'original_filename': os.path.basename(file_path),
            'original_sha256': raw_sha256,
            'content_hash': raw_sha256,
            'records_count': len(norm_df),
            'columns_count': len(norm_df.columns),
            'competitions_count': int(norm_df['Comp'].nunique()),
            'clubs_count': int(norm_df['Squad'].nunique()),
            'competitions': {str(k): int(v) for k, v in norm_df['Comp'].value_counts().items()},
            'totals': summary_totals,
            'preview': preview,
            'files': {
                'excel': excel_filename,
                'csv': csv_filename
            },
            'validation_status': 'passed',
            'schema_version': '1.1.0',
            'verification_notes': 'Dataset passed 37-column canonical schema and rate-derivation checks. Awaiting factual domain verification.'
        }

        if not dry_run:
            try:
                import tempfile
                import shutil
                with tempfile.TemporaryDirectory() as temp_dir:
                    temp_excel = os.path.join(temp_dir, excel_filename)
                    temp_csv = os.path.join(temp_dir, csv_filename)
                    temp_manifest = os.path.join(temp_dir, "manifest.json")

                    if output_format in ['excel', 'both']:
                        norm_df.to_excel(temp_excel, index=False)
                    if output_format in ['csv', 'both']:
                        norm_df.to_csv(temp_csv, index=False, encoding='utf-8')

                    with open(temp_manifest, 'w', encoding='utf-8') as f:
                        json.dump(manifest, f, indent=2)

                    os.makedirs(season_dir, exist_ok=True)
                    # Atomic file writes using temporary staging and os.replace
                    if os.path.exists(temp_excel):
                        staging_excel = excel_path + ".staging"
                        shutil.copy2(temp_excel, staging_excel)
                        os.replace(staging_excel, excel_path)
                        logger.info(f"Atomically saved Excel dataset to: {excel_path}")
                    if os.path.exists(temp_csv):
                        staging_csv = csv_path + ".staging"
                        shutil.copy2(temp_csv, staging_csv)
                        os.replace(staging_csv, csv_path)
                        logger.info(f"Atomically saved CSV dataset to: {csv_path}")
                    staging_manifest = manifest_path + ".staging"
                    shutil.copy2(temp_manifest, staging_manifest)
                    os.replace(staging_manifest, manifest_path)
                    logger.info(f"Atomically saved season manifest to: {manifest_path}")
            except OSError as e:
                logger.warning(f"Storage filesystem is read-only ({e}). Import validated in memory.")
                return {
                    'status': 'success',
                    'dry_run': True,
                    'read_only_environment': True,
                    'message': 'Dataset successfully validated! Note: On serverless environments (Vercel/Lambda), the file system is read-only. To persist new seasons, add them to data/seasons/ in Git.',
                    'season': season,
                    'records_count': len(norm_df),
                    'columns_count': len(norm_df.columns),
                    'competitions': manifest['competitions'],
                    'totals': summary_totals,
                    'preview': preview,
                    'manifest': manifest,
                    'warnings': validation['warnings'] + ['Serverless filesystem is read-only; persistent disk write was skipped.']
                }

        return {
            'status': 'success',
            'dry_run': dry_run,
            'season': season,
            'records_count': len(norm_df),
            'columns_count': len(norm_df.columns),
            'competitions': manifest['competitions'],
            'totals': summary_totals,
            'preview': preview,
            'manifest': manifest,
            'warnings': validation['warnings']
        }
