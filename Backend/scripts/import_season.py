#!/usr/bin/env python3
"""
PitchPulse Season Dataset Importer & Validator CLI.

Usage examples:
  # Validate a candidate dataset without saving
  python Backend/scripts/import_season.py --file path/to/dataset.xlsx --validate-only

  # Verify reference 2024/25 baseline integrity
  python Backend/scripts/import_season.py --verify-baseline

  # Dry-run test an import of 2025-26 data
  python Backend/scripts/import_season.py --file new_season.csv --season 2025-2026 --dry-run

  # Import a new season dataset
  python Backend/scripts/import_season.py --file new_season.xlsx --season 2025-2026
"""

import os
import sys
import argparse
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Ensure Backend directory is on python path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, BACKEND_DIR)

from services.dataset_importer import DatasetImporter, DatasetValidationError
from services.baseline_verifier import verify_baseline_integrity, BaselineIntegrityError

def print_banner():
    print("=" * 68)
    print("  PitchPulse Football Analytics - Versioned Dataset Importer")
    print("=" * 68)

def handle_verify_baseline():
    print("\n[STEP 1] Verifying 2024/25 Immutable Reference Baseline...")
    try:
        res = verify_baseline_integrity()
        print("  ✓ Status: PASS")
        print(f"  ✓ Target File: {res['filepath']}")
        print(f"  ✓ SHA-256: {res['sha256']}")
        print(f"  ✓ Records: {res['record_count']:,} player rows | Columns: {res['column_count']}")
        print(f"  ✓ Totals: Goals={res['totals']['goals']:,} | Assists={res['totals']['assists']:,} | Minutes={res['totals']['minutes']:,}")
        print("  ✓ Competitions Distribution:")
        for comp, count in res['competitions'].items():
            print(f"      - {comp}: {count} players")
        print("\nBaseline verification succeeded. Dataset matches immutable invariants.")
        return 0
    except BaselineIntegrityError as e:
        print(f"\n[ERROR] Baseline integrity check failed!\n  {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\n[ERROR] Unexpected error verifying baseline:\n  {e}", file=sys.stderr)
        return 1

def main():
    parser = argparse.ArgumentParser(
        description="PitchPulse Dataset Importer: Validates and imports versioned football statistics."
    )
    parser.add_argument(
        '--file', '-f',
        type=str,
        help="Path to source Excel (.xlsx, .xls) or CSV (.csv) dataset."
    )
    parser.add_argument(
        '--season', '-s',
        type=str,
        default=None,
        help="Season identifier in YYYY-YYYY format (e.g. 2024-2025, 2025-2026)."
    )
    parser.add_argument(
        '--source',
        type=str,
        default="FBref / StatsBomb style player-level aggregates",
        help="Source attribution or provider note."
    )
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help="Validate schema, required metrics, and data types without importing."
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help="Run complete parsing, validation, and normalization without writing files to disk."
    )
    parser.add_argument(
        '--allow-unknown',
        action='store_true',
        help="Allow extra non-canonical columns rather than rejecting the file."
    )
    parser.add_argument(
        '--verify-baseline',
        action='store_true',
        help="Verify the SHA-256 hash and statistical invariants of the 2024/25 baseline."
    )
    parser.add_argument(
        '--format',
        choices=['excel', 'csv', 'both'],
        default='both',
        help="Storage format for imported season (default: both)."
    )

    args = parser.parse_args()
    print_banner()

    if args.verify_baseline:
        return handle_verify_baseline()

    if not args.file:
        parser.print_help()
        print("\n[ERROR] Either --file <path> or --verify-baseline must be specified.", file=sys.stderr)
        return 1

    file_path = os.path.abspath(args.file)
    if not os.path.exists(file_path):
        print(f"\n[ERROR] File not found: {file_path}", file=sys.stderr)
        return 1

    importer = DatasetImporter(
        strict=not args.allow_unknown,
        allow_unknown=args.allow_unknown
    )

    print(f"\n[1/3] Inspecting Source File: {os.path.basename(file_path)}")
    try:
        inspection = importer.inspect_file(file_path)
        print(f"  ✓ Format: {os.path.splitext(file_path)[1].upper()}")
        print(f"  ✓ Rows: {inspection['rows']:,} | Columns: {inspection['column_count']}")
    except Exception as e:
        print(f"  ✗ Failed to read file: {e}", file=sys.stderr)
        return 1

    print("\n[2/3] Validating Schema & Metrics...")
    df = importer.read_file(file_path)
    val = importer.validate_dataframe(df)

    if val['mapped_columns']:
        print("  ℹ Header Aliases Normalized:")
        for src, target in val['mapped_columns'].items():
            print(f"      - '{src}' -> '{target}'")

    if val['warnings']:
        print("  ⚠ Warnings:")
        for w in val['warnings']:
            print(f"      - {w}")

    if not val['is_valid']:
        print("\n  ✗ VALIDATION FAILED! The file does not conform to the canonical PitchPulse schema:")
        for err in val['errors']:
            print(f"      • {err}")
        print("\nImport rejected to prevent dataset corruption.", file=sys.stderr)
        return 1

    print("  ✓ Schema validation passed: All 37 canonical metrics present and valid.")
    stats = val['stats']
    print(f"  ✓ Valid Records: {stats['total_records']:,} | Squads: {stats['total_squads']}")
    print("  ✓ Competitions:")
    for comp, count in stats['competitions'].items():
        print(f"      - {comp}: {count} players")

    if args.validate_only:
        print("\nValidation completed successfully (--validate-only). No files imported.")
        return 0

    season = args.season
    if not season:
        # Prompt or infer season
        season = "2024-2025"
        print(f"  ℹ No --season provided. Defaulting to '{season}'.")

    print(f"\n[3/3] Importing Season '{season}' (dry_run={args.dry_run})...")
    try:
        res = importer.import_file(
            file_path=file_path,
            season=season,
            source_name=args.source,
            output_format=args.format,
            dry_run=args.dry_run
        )
        print(f"  ✓ Normalization: Complete ({res['records_count']:,} records)")
        print(f"  ✓ Total Goals: {res['totals']['goals']:,} | Assists: {res['totals']['assists']:,}")
        print(f"  ✓ Total xG: {res['totals']['xg']:,} | xAG: {res['totals']['xag']:,}")

        if args.dry_run:
            print("\nDry-run completed successfully. No files written to disk.")
        else:
            season_path = os.path.join(BACKEND_DIR, 'data', 'seasons', season)
            print(f"\nImport succeeded! Files saved to: {season_path}")
            print(f"  - Manifest: {os.path.join(season_path, 'manifest.json')}")
            if args.format in ['excel', 'both']:
                print(f"  - Excel: {os.path.join(season_path, f'top5-players-{season}.xlsx')}")
            if args.format in ['csv', 'both']:
                print(f"  - CSV: {os.path.join(season_path, f'top5-players-{season}.csv')}")

        return 0
    except DatasetValidationError as e:
        print(f"\n[ERROR] Dataset import failed validation:\n{e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"\n[ERROR] Unexpected error during import:\n{e}", file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
