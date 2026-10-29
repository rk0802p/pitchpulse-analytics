import os
import sys
import json
import pandas as pd
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seasons_dir = os.path.join(BASE_DIR, 'data', 'seasons')

# Discover all seasons
seasons = sorted([d for d in os.listdir(seasons_dir) if os.path.isdir(os.path.join(seasons_dir, d)) and d[0].isdigit()])

audit_findings = {
    "mid_season_transfers": {},
    "goalkeepers_and_low_minutes": {},
    "zero_xg_with_high_goals": {},
    "advanced_progression_modern": {},
    "genuine_zeros_vs_untracked": {}
}

for s in seasons:
    s_dir = os.path.join(seasons_dir, s)
    csv_fn = None
    for fn in [f'top5-players-{s}.csv', f'top5-players{s[-5:]}.csv', 'top5-players24-25.csv', 'dataset.csv']:
        p = os.path.join(s_dir, fn)
        if os.path.exists(p):
            csv_fn = p
            break
    if not csv_fn:
        continue
    df = pd.read_csv(csv_fn, low_memory=False)
    
    # 1. Multi-squad players (mid-season transfers)
    p_counts = df['Player'].value_counts()
    multi_players = p_counts[p_counts > 1].index.tolist()
    audit_findings["mid_season_transfers"][s] = {
        "count_multi_club_players": len(multi_players),
        "sample": []
    }
    for mp in multi_players[:5]:
        rows = df[df['Player'] == mp][['Player', 'Squad', 'Comp', 'Min', 'Gls', 'Ast']].to_dict('records')
        audit_findings["mid_season_transfers"][s]["sample"].append(rows)
        
    # 2. Goalkeepers & low minutes (< 90 mins)
    low_min_gk = df[(df['Pos'] == 'GK') & (df['Min'] < 180)]
    audit_findings["goalkeepers_and_low_minutes"][s] = {
        "total_gk": int((df['Pos'] == 'GK').sum()),
        "low_min_gk_count": len(low_min_gk),
        "zero_gls_gk_rate": float((df[df['Pos'] == 'GK']['Gls'] == 0).mean()) if (df['Pos'] == 'GK').sum() > 0 else None,
        "sample_low_min": low_min_gk[['Player', 'Squad', 'Min', 'Gls']].head(3).to_dict('records')
    }
    
    # 3. High scorers with 0 xG in xG eras (2014-2023)
    if 'xG' in df.columns:
        high_gls_zero_xg = df[(df['Gls'] >= 4) & ((df['xG'] == 0) | (pd.isna(df['xG'])))]
        if len(high_gls_zero_xg) > 0:
            audit_findings["zero_xg_with_high_goals"][s] = {
                "count": len(high_gls_zero_xg),
                "players": high_gls_zero_xg[['Player', 'Squad', 'Gls', 'xG', 'Min']].to_dict('records')
            }
            
    # 4. Modern era advanced metrics (2023-2025)
    if s in ['2023-2024', '2024-2025']:
        audit_findings["advanced_progression_modern"][s] = {
            "prgc_max": float(df['PrgC'].max()) if 'PrgC' in df.columns else None,
            "prgp_max": float(df['PrgP'].max()) if 'PrgP' in df.columns else None,
            "prgc_mean": float(df['PrgC'].mean()) if 'PrgC' in df.columns else None,
            "prgp_mean": float(df['PrgP'].mean()) if 'PrgP' in df.columns else None,
            "prgc_zero_count": int((df['PrgC'] == 0).sum()) if 'PrgC' in df.columns else None,
            "prgc_tracked_count": int((df['PrgC'] > 0).sum()) if 'PrgC' in df.columns else None
        }

with open(os.path.join(BASE_DIR, 'scripts', 'output', 'historical_claims_audit.json'), 'w', encoding='utf-8') as f:
    json.dump(audit_findings, f, indent=2)

print("Saved historical claims audit to Backend/scripts/output/historical_claims_audit.json")
