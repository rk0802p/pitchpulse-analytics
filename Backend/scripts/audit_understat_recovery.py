import os
import sys
import re
import html
import unicodedata
import pandas as pd
import numpy as np

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = r"d:\New folder (2)\Sports Analytical Website\Backend"
UNDERSTAT_PATH = r"C:\Users\Raj\.gemini\antigravity\brain\154b98d1-8ac1-4125-9fe7-23a7a9de2960\scratch\understat_repo\understat_players_aggregated_2014_2024.csv"

und_df = pd.read_csv(UNDERSTAT_PATH, low_memory=False)

def normalize_name(name):
    if not isinstance(name, str):
        return ""
    # 1. Unescape HTML entities (e.g. &#039; -> ')
    unescaped = html.unescape(name)
    # 2. NFKD + strip diacritics
    nfkd = unicodedata.normalize('NFKD', unescaped)
    stripped = "".join([c for c in nfkd if not unicodedata.combining(c)])
    # 3. Common transliteration variants: 'iy' -> 'y', 'oe' -> 'o', 'ae' -> 'a'
    s = stripped.lower()
    s = s.replace('iy', 'y').replace('oe', 'o').replace('ae', 'a')
    # 4. Strip non-alphanumeric
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    return " ".join(cleaned.split())

def name_tokens(name):
    norm = normalize_name(name)
    return set(norm.split())

def comp_to_league(comp):
    c = str(comp).lower().strip()
    if 'bundesliga' in c or c.startswith('de'): return 'Bundesliga'
    if 'premier league' in c or c.startswith('eng'): return 'EPL'
    if 'la liga' in c or c.startswith('es'): return 'La_Liga'
    if 'serie a' in c or c.startswith('it'): return 'Serie_A'
    if 'ligue 1' in c or c.startswith('fr'): return 'Ligue_1'
    return None

SEASONS = [
    ('2014-2015', '2014/15'),
    ('2015-2016', '2015/16'),
    ('2016-2017', '2016/17'),
    ('2017-2018', '2017/18'),
    ('2018-2019', '2018/19'),
    ('2019-2020', '2019/20'),
    ('2020-2021', '2020/21'),
    ('2021-2022', '2021/22'),
    ('2022-2023', '2022/23'),
]

total_candidates = 0
recoverable = []
ambiguous = []
intra_league_transfers = []

for s_id, und_season in SEASONS:
    csv_path = os.path.join(BASE_DIR, 'data', 'seasons', s_id, f"top5-players-{s_id}.csv")
    if not os.path.exists(csv_path):
        continue
    df = pd.read_csv(csv_path, low_memory=False)
    und_s = und_df[und_df['season'] == und_season].copy()
    
    # Pre-index Understat season
    und_s['norm_name'] = und_s['player_name'].apply(normalize_name)
    und_s['tokens'] = und_s['player_name'].apply(name_tokens)
    
    # Check players with >= 4 goals and xG == 0.0
    zero_xg = df[(df['Gls'] >= 4) & ((df['xG'] == 0.0) | (df['xG'].isna()))]
    
    for idx, row in zero_xg.iterrows():
        total_candidates += 1
        p_name = row['Player']
        p_squad = row['Squad']
        p_comp = row['Comp']
        p_league = comp_to_league(p_comp)
        p_gls = row['Gls']
        p_min = row['Min']
        p_tokens = name_tokens(p_name)
        p_norm = normalize_name(p_name)
        
        # Match in Understat league
        candidates = und_s[und_s['league'] == p_league]
        
        # 1. Exact normalized name
        m = candidates[candidates['norm_name'] == p_norm]
        
        # 2. Token set match (handles reversed names like Son Heung-Min vs Heung-Min Son)
        if m.empty:
            m = candidates[candidates['tokens'] == p_tokens]
            
        # 3. Token subset if length >= 2 and goals match
        if m.empty and len(p_tokens) >= 2:
            m = candidates[candidates['tokens'].apply(lambda t: p_tokens.issubset(t) or t.issubset(p_tokens)) & (abs(candidates['goals'] - p_gls) <= 2)]
            
        if len(m) == 1:
            u_rec = m.iloc[0]
            # Check if intra-league transfer (comma in team_title)
            if ',' in str(u_rec['team_title']):
                intra_league_transfers.append({
                    'season': s_id,
                    'player': p_name,
                    'squad': p_squad,
                    'gls': p_gls,
                    'und_teams': u_rec['team_title'],
                    'und_goals': u_rec['goals'],
                    'und_xg': u_rec['xG'],
                    'reason': 'intra_league_transfer_aggregate'
                })
            else:
                recoverable.append({
                    'season': s_id,
                    'player': p_name,
                    'squad': p_squad,
                    'gls': p_gls,
                    'und_player': u_rec['player_name'],
                    'und_team': u_rec['team_title'],
                    'und_goals': u_rec['goals'],
                    'und_xg': round(float(u_rec['xG']), 2),
                    'und_xa': round(float(u_rec['xA']), 2),
                    'und_id': int(u_rec['id'])
                })
        elif len(m) > 1:
            ambiguous.append({
                'season': s_id,
                'player': p_name,
                'squad': p_squad,
                'candidates_count': len(m)
            })
        else:
            ambiguous.append({
                'season': s_id,
                'player': p_name,
                'squad': p_squad,
                'candidates_count': 0,
                'gls': p_gls,
                'min': p_min
            })

print(f"Total zero-xG high scorer candidates: {total_candidates}")
print(f"Directly recoverable single-club matches: {len(recoverable)}")
print(f"Intra-league multi-club aggregate records: {len(intra_league_transfers)}")
print(f"Ambiguous records: {len(ambiguous)}")

print("\n--- SAMPLE RECOVERABLE SINGLE-CLUB RECORDS ---")
for r in recoverable[:10]:
    print(f"[{r['season']}] {r['player']} ({r['squad']}, {r['gls']} gls) -> {r['und_player']} ({r['und_team']}): xG={r['und_xg']}, xA={r['und_xa']}, ID={r['und_id']}")

print("\n--- SAMPLE INTRA-LEAGUE MULTI-CLUB RECORDS ---")
for r in intra_league_transfers[:5]:
    print(f"[{r['season']}] {r['player']} ({r['squad']}, {r['gls']} gls) -> {r['und_teams']} (Total Gls={r['und_goals']}, xG={r['und_xg']})")

print(f"\n--- UNMATCHED CANDIDATES ({len(ambiguous)}) ---")
for a in ambiguous:
    print(f"[{a['season']}] {a['player']} ({a['squad']}, {a.get('gls')} gls, {a.get('min')} min)")
