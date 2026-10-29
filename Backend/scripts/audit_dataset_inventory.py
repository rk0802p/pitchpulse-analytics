"""
PitchPulse Analytics — Comprehensive Dataset Inventory & Integrity Audit Script
Discovers all seasons dynamically from Backend/data/seasons and analyzes:
- Record counts, unique players, unique clubs per league
- Expected vs observed clubs
- Duplicate (Player, Squad, Comp) rows
- Completeness, genuine zeros, and missingness for canonical metrics
- Rate field verification (source-stored vs derived)
- Suspicious values (negative minutes, impossible minutes > 3600, etc.)
"""

import os
import sys
import json
import re
import pandas as pd
import numpy as np

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEASONS_DIR = os.path.join(BASE_DIR, 'data', 'seasons')

EXPECTED_CLUBS_PER_LEAGUE = {
    "eng Premier League": 20,
    "es La Liga": 20,
    "it Serie A": 20,
    "de Bundesliga": 18,
    "fr Ligue 1": {
        # Ligue 1 reduced from 20 to 18 teams starting in 2023/24
        "default": 20,
        "reduced_from_2023": 18
    }
}

CANONICAL_METRICS = [
    'Min', 'Gls', 'Ast', 'xG', 'xAG', 'npxG', 
    'PrgC', 'PrgP', 'PrgR', 
    'Gls_90', 'Ast_90', 'xG_90', 'xAG_90'
]

def get_expected_ligue1_clubs(season_str):
    # e.g. 2023-2024 onwards is 18
    try:
        start_year = int(season_str.split('-')[0])
        return 18 if start_year >= 2023 else 20
    except Exception:
        return 20

def audit_season(season_id):
    season_path = os.path.join(SEASONS_DIR, season_id)
    manifest_path = os.path.join(season_path, 'manifest.json')
    
    # Locate data file
    csv_file = None
    for fname in [f"top5-players-{season_id}.csv", f"top5-players{season_id[-5:]}.csv", "top5-players24-25.csv", "dataset.csv"]:
        fp = os.path.join(season_path, fname)
        if os.path.exists(fp):
            csv_file = fp
            break
    if not csv_file:
        for f in os.listdir(season_path):
            if f.endswith('.csv'):
                csv_file = os.path.join(season_path, f)
                break
                
    if not csv_file:
        return {"error": f"No CSV found in {season_path}"}
        
    df = pd.read_csv(csv_file, low_memory=False)
    
    # Manifest info
    manifest = {}
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r', encoding='utf-8') as f:
            manifest = json.load(f)
            
    total_rows = len(df)
    unique_players = int(df['Player'].nunique()) if 'Player' in df.columns else 0
    total_observed_clubs = int(df['Squad'].nunique()) if 'Squad' in df.columns else 0
    
    # Squads per comp
    comp_squad_report = {}
    if 'Comp' in df.columns and 'Squad' in df.columns:
        for comp, group in df.groupby('Comp'):
            observed = group['Squad'].nunique()
            expected = 20
            if 'de Bundesliga' in comp:
                expected = 18
            elif 'fr Ligue 1' in comp:
                expected = get_expected_ligue1_clubs(season_id)
            comp_squad_report[comp] = {
                "observed": int(observed),
                "expected": int(expected),
                "discrepancy": int(observed - expected),
                "status": "MATCH" if observed == expected else f"MISMATCH ({observed - expected:+d})"
            }
    
    # Duplicate (Player, Squad, Comp) rows
    duplicates_count = 0
    if all(c in df.columns for c in ['Player', 'Squad', 'Comp']):
        duplicates = df[df.duplicated(subset=['Player', 'Squad', 'Comp'], keep=False)]
        duplicates_count = int(len(duplicates))
        
    # Multi-club players in season (legitimate transfers)
    multi_club_players = 0
    if 'Player' in df.columns and 'Squad' in df.columns:
        player_squad_counts = df.groupby('Player')['Squad'].nunique()
        multi_club_players = int((player_squad_counts > 1).sum())
        
    # Metrics audit
    metrics_summary = {}
    for m in CANONICAL_METRICS:
        if m not in df.columns:
            metrics_summary[m] = {
                "status": "UNAVAILABLE_COLUMN",
                "non_null_count": 0,
                "null_count": total_rows,
                "genuine_zeros": 0,
                "min": None,
                "max": None
            }
            continue
            
        s = pd.to_numeric(df[m], errors='coerce')
        non_null = s.notna().sum()
        nulls = s.isna().sum()
        zeros = (s == 0.0).sum()
        m_max = float(s.max()) if non_null > 0 else None
        m_min = float(s.min()) if non_null > 0 else None
        
        # Determine tracking status
        if non_null == 0 or (non_null > 0 and m_max == 0.0 and m_min == 0.0 and m in ['xG', 'xAG', 'PrgC', 'PrgP', 'PrgR']):
            status = "UNTRACKED_IN_ERA"
        elif nulls > 0 and non_null > 0:
            status = f"PARTIALLY_TRACKED ({non_null}/{total_rows} valid)"
        else:
            status = "FULLY_TRACKED"
            
        metrics_summary[m] = {
            "status": status,
            "non_null_count": int(non_null),
            "null_count": int(nulls),
            "genuine_zeros": int(zeros),
            "min": m_min,
            "max": m_max
        }
        
    # Data anomalies
    anomalies = []
    if 'Min' in df.columns:
        s_min = pd.to_numeric(df['Min'], errors='coerce')
        neg_min = (s_min < 0).sum()
        if neg_min > 0:
            anomalies.append(f"Negative minutes: {neg_min} rows")
        high_min = (s_min > 3600).sum()
        if high_min > 0:
            anomalies.append(f"Excessive minutes (>3600): {high_min} rows")
            
    # Check rate fields vs source
    has_source_rates = all(c in df.columns for c in ['Gls_90', 'Ast_90'])
    has_source_xg_rates = all(c in df.columns for c in ['xG_90', 'xAG_90'])
    
    return {
        "season_id": season_id,
        "csv_file": os.path.basename(csv_file),
        "total_rows": total_rows,
        "unique_players": unique_players,
        "total_observed_clubs": total_observed_clubs,
        "comp_squad_report": comp_squad_report,
        "duplicates_count": duplicates_count,
        "multi_club_players": multi_club_players,
        "has_source_rates": has_source_rates,
        "has_source_xg_rates": has_source_xg_rates,
        "metrics_summary": metrics_summary,
        "anomalies": anomalies,
        "manifest_status": manifest.get('dataset_status', 'none'),
        "manifest_clubs": manifest.get('clubs_count', 0),
        "manifest_source": manifest.get('source', 'none')
    }

def main():
    seasons = [s for s in sorted(os.listdir(SEASONS_DIR)) if os.path.isdir(os.path.join(SEASONS_DIR, s)) and re.match(r'^\d{4}-\d{4}$', s)]
    print(f"Discovered {len(seasons)} seasons in {SEASONS_DIR}")
    
    full_audit = {}
    for s in seasons:
        res = audit_season(s)
        full_audit[s] = res
        print(f"\n--- Season {s} ({res.get('total_rows')} rows, {res.get('total_observed_clubs')} clubs) ---")
        print(f"Manifest source: {res.get('manifest_source')}")
        print(f"Manifest status: {res.get('manifest_status')} | Manifest clubs: {res.get('manifest_clubs')}")
        for comp, rep in res.get('comp_squad_report', {}).items():
            print(f"  {comp:20}: {rep['observed']} clubs (expected {rep['expected']}) -> {rep['status']}")
        if res.get('duplicates_count') > 0:
            print(f"  WARNING: {res.get('duplicates_count')} duplicate (Player, Squad, Comp) rows found!")
        print(f"  Multi-club players: {res.get('multi_club_players')}")
        if res.get('anomalies'):
            print(f"  ANOMALIES: {', '.join(res.get('anomalies'))}")
            
    # Write audit JSON to scratch directory
    scratch_dir = os.path.join(BASE_DIR, 'scripts', 'output')
    os.makedirs(scratch_dir, exist_ok=True)
    out_file = os.path.join(scratch_dir, 'dataset_inventory_audit.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(full_audit, f, indent=2)
    print(f"\nDetailed inventory audit written to {out_file}")

if __name__ == '__main__':
    main()
