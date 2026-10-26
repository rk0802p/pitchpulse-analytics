import os
import json
import hashlib
import logging
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE_JSON_PATH = os.path.join(BASE_DIR, 'data', 'baselines', 'baseline_2024_2025.json')
DEFAULT_BASELINE_EXCEL = os.path.join(BASE_DIR, 'top5-players24-25.xlsx')

class BaselineIntegrityError(Exception):
    """Raised when the baseline dataset fails cryptographic or statistical integrity checks."""
    pass

def load_baseline_manifest(manifest_path=None):
    path = manifest_path or BASELINE_JSON_PATH
    if not os.path.exists(path):
        raise FileNotFoundError(f"Baseline manifest not found at: {path}")
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def compute_file_sha256(filepath):
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(65536), b''):
            hasher.update(chunk)
    return hasher.hexdigest()

def verify_baseline_integrity(filepath=None, manifest_path=None):
    """
    Verifies that the reference baseline 2024/25 dataset is untampered,
    matching exact SHA-256 hash, record counts, and aggregate invariants.
    """
    manifest = load_baseline_manifest(manifest_path)
    target_path = filepath or DEFAULT_BASELINE_EXCEL
    
    if not os.path.exists(target_path):
        # Check seasons folder fallback
        fallback = os.path.join(BASE_DIR, 'data', 'seasons', '2024-2025', 'top5-players24-25.xlsx')
        if os.path.exists(fallback):
            target_path = fallback
        else:
            raise FileNotFoundError(f"Baseline dataset file not found at: {target_path}")

    # 1. SHA-256 Check
    expected_sha = manifest['files']['excel']['sha256']
    actual_sha = compute_file_sha256(target_path)
    if actual_sha != expected_sha:
        raise BaselineIntegrityError(
            f"Baseline file SHA-256 mismatch! Expected {expected_sha}, got {actual_sha}."
        )

    # 2. Schema and Invariants Check
    df = pd.read_excel(target_path)
    invariants = manifest['invariants']
    
    # Record Count
    expected_records = invariants['record_count']
    if len(df) != expected_records:
        raise BaselineIntegrityError(
            f"Record count mismatch: expected {expected_records}, got {len(df)}."
        )

    # Schema columns
    expected_cols = [c['name'] for c in manifest['schema']['columns']]
    missing_cols = [c for c in expected_cols if c not in df.columns]
    if missing_cols:
        raise BaselineIntegrityError(f"Missing baseline columns: {missing_cols}")

    # Mathematical totals
    expected_totals = invariants['totals']
    actual_goals = int(df['Gls'].sum())
    actual_assists = int(df['Ast'].sum())
    actual_minutes = int(df['Min'].sum())

    if actual_goals != expected_totals['goals']:
        raise BaselineIntegrityError(
            f"Total goals invariant failed: expected {expected_totals['goals']}, got {actual_goals}."
        )
    if actual_assists != expected_totals['assists']:
        raise BaselineIntegrityError(
            f"Total assists invariant failed: expected {expected_totals['assists']}, got {actual_assists}."
        )
    if actual_minutes != expected_totals['minutes']:
        raise BaselineIntegrityError(
            f"Total minutes invariant failed: expected {expected_totals['minutes']}, got {actual_minutes}."
        )

    return {
        "valid": True,
        "filepath": target_path,
        "sha256": actual_sha,
        "record_count": len(df),
        "column_count": len(df.columns),
        "totals": {
            "goals": actual_goals,
            "assists": actual_assists,
            "minutes": actual_minutes
        },
        "competitions": invariants['competitions'],
        "status": "verified"
    }

def compare_to_baseline(df, manifest_path=None):
    """
    Compares an arbitrary candidate dataframe against the baseline schema and distribution.
    Returns a compatibility and drift report.
    """
    manifest = load_baseline_manifest(manifest_path)
    baseline_cols = {c['name']: c for c in manifest['schema']['columns']}
    candidate_cols = list(df.columns)

    missing_cols = [col for col in baseline_cols if col not in candidate_cols]
    extra_cols = [col for col in candidate_cols if col not in baseline_cols]

    is_compatible = len(missing_cols) == 0

    return {
        "is_schema_compatible": is_compatible,
        "missing_required_columns": missing_cols,
        "extra_columns": extra_cols,
        "baseline_column_count": len(baseline_cols),
        "candidate_column_count": len(candidate_cols),
        "candidate_rows": len(df),
        "baseline_rows": manifest['invariants']['record_count'],
        "candidate_competitions": list(df['Comp'].unique()) if 'Comp' in df.columns else []
    }
