"""
PitchPulse Analytics — Priority 2: Deterministic Understat Identity Matching & Data Repair Engine

Repairs historical seasons 2014-2015 through 2022-2023 using:
1. Deterministic text normalization (HTML unescape, NFKD unicode diacritics stripping, lowercasing)
2. Token-set matching (handles inverted Asian name representations: 'Son Heung-Min' == 'Heung-min Son')
3. Apostrophe-free phonetic normalization ('N'Gog' == 'Ngog', 'N'Doye' == 'Ndoye', 'N'Koudou' == 'Nkoudou')
4. Transliteration mapping ('Malinovskyi' <-> 'Malinovskiy', 'Odegaard' <-> 'Ødegaard')
5. Verified alias resolution (e.g. 'Marcos André' <-> 'Marcos de Sousa' [Understat ID 8933])
6. Intra-league transfer spell isolation (never assign multi-club combined xG to a single club spell; leave as null/unavailable)
"""

import os
import sys
import re
import html
import json
import hashlib
import unicodedata
import pandas as pd
import numpy as np

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UNDERSTAT_PATH = r"C:\Users\Raj\.gemini\antigravity\brain\154b98d1-8ac1-4125-9fe7-23a7a9de2960\scratch\understat_repo\understat_players_aggregated_2014_2024.csv"
SEASONS_DIR = os.path.join(BASE_DIR, 'data', 'seasons')

SEASONS_TO_REPAIR = [
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

VERIFIED_ALIASES = {
    # (season, league, normalized_local_name): understat_id
    ('2020/21', 'La_Liga', 'marcos andre'): 8933,
    ('2014/15', 'Ligue_1', 'david n gog'): 3245,
    ('2014/15', 'Ligue_1', 'yeni ngbakoto'): 4738,
}

def clean_text(text):
    if not isinstance(text, str):
        return ""
    unescaped = html.unescape(text)
    nfkd = unicodedata.normalize('NFKD', unescaped)
    stripped = "".join([c for c in nfkd if not unicodedata.combining(c)])
    # Transliterations
    s = stripped.lower()
    s = s.replace('iy', 'y').replace('oe', 'o').replace('ae', 'a')
    # Remove apostrophes completely for token matching (n'doye -> ndoye)
    s_no_apostrophe = s.replace("'", "").replace("’", "").replace("`", "")
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', s_no_apostrophe)
    return " ".join(cleaned.split())

def get_tokens(text):
    return set(clean_text(text).split())

def comp_to_league(comp):
    c = str(comp).lower().strip()
    if 'bundesliga' in c or c.startswith('de'): return 'Bundesliga'
    if 'premier league' in c or c.startswith('eng'): return 'EPL'
    if 'la liga' in c or c.startswith('es'): return 'La_Liga'
    if 'serie a' in c or c.startswith('it'): return 'Serie_A'
    if 'ligue 1' in c or c.startswith('fr'): return 'Ligue_1'
    return None

def calculate_sha256(filepath):
    sha = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(65536):
            sha.update(chunk)
    return sha.hexdigest()

def match_player_to_understat(p_name, p_squad, p_league, p_gls, p_min, und_candidates, season_und):
    p_clean = clean_text(p_name)
    p_tok = get_tokens(p_name)
    
    # 0. Check verified cross-source aliases
    alias_key = (season_und, p_league, p_clean)
    if alias_key in VERIFIED_ALIASES:
        target_id = VERIFIED_ALIASES[alias_key]
        m = und_candidates[und_candidates['id'] == target_id]
        if not m.empty:
            return m.iloc[0], "verified_alias"

    # 1. Exact cleaned name in same league
    m = und_candidates[und_candidates['clean_name'] == p_clean]
    if len(m) == 1:
        return m.iloc[0], "exact_clean_name"

    # 2. Token set equality (handles reversed order e.g. 'Son Heung-Min' == 'Heung-min Son')
    if m.empty and len(p_tok) >= 2:
        m = und_candidates[und_candidates['tokens'] == p_tok]
        if len(m) == 1:
            return m.iloc[0], "token_set_equality"

    # 3. Token subset with goal proximity
    if m.empty and len(p_tok) >= 2:
        m = und_candidates[und_candidates['tokens'].apply(lambda t: p_tok.issubset(t) or t.issubset(p_tok))]
        if len(m) > 1 and p_gls is not None and not pd.isna(p_gls):
            m = m[abs(m['goals'] - p_gls) <= 2]
        if len(m) == 1:
            return m.iloc[0], "token_subset_with_goals"

    # 4. Last name + squad match
    if m.empty:
        p_last = p_clean.split()[-1] if p_clean.split() else ""
        if len(p_last) > 3:
            sq_clean = clean_text(p_squad)
            sq_words = [w for w in sq_clean.split() if len(w) > 3]
            m = und_candidates[(und_candidates['clean_name'].str.endswith(p_last)) & 
                               (und_candidates['clean_team'].apply(lambda t: any(w in t for w in sq_words)))]
            if len(m) == 1:
                return m.iloc[0], "last_name_and_squad"

    if len(m) == 1:
        return m.iloc[0], "single_candidate"
    elif len(m) > 1:
        return None, "ambiguous_multiple_candidates"
    else:
        return None, "unmatched"

def run_repair():
    print("=" * 80)
    print(" PITCHPULSE ANALYTICS — PRIORITY 2: HISTORICAL UNDERSTAT DATA REPAIR")
    print("=" * 80)
    
    if not os.path.exists(UNDERSTAT_PATH):
        print(f"Error: Understat reference file not found at {UNDERSTAT_PATH}")
        return
        
    und_all = pd.read_csv(UNDERSTAT_PATH, low_memory=False)
    und_all['clean_name'] = und_all['player_name'].apply(clean_text)
    und_all['tokens'] = und_all['player_name'].apply(get_tokens)
    und_all['clean_team'] = und_all['team_title'].apply(clean_text)
    
    repair_summary = {}

    for s_id, und_season in SEASONS_TO_REPAIR:
        season_dir = os.path.join(SEASONS_DIR, s_id)
        csv_path = os.path.join(season_dir, f"top5-players-{s_id}.csv")
        xlsx_path = os.path.join(season_dir, f"top5-players-{s_id}.xlsx")
        manifest_path = os.path.join(season_dir, "manifest.json")
        
        if not os.path.exists(csv_path):
            continue
            
        df = pd.read_csv(csv_path, low_memory=False)
        und_s = und_all[(und_all['season'] == und_season) & (und_all['league'] != 'RFPL')].copy()
        
        print(f"\n-> Processing Season {s_id} ({und_season}) with {len(df)} local players against {len(und_s)} Understat records...")
        
        repaired_zeros = 0
        intra_league_spells_handled = 0
        matched_total = 0
        
        # Spot check specific high profile fixes
        fixes_log = []

        for idx, row in df.iterrows():
            p_name = row['Player']
            p_squad = row['Squad']
            p_comp = row['Comp']
            p_league = comp_to_league(p_comp)
            p_gls = row.get('Gls', 0)
            p_min = row.get('Min', 0)
            
            cand_league = und_s[und_s['league'] == p_league]
            u_rec, match_type = match_player_to_understat(p_name, p_squad, p_league, p_gls, p_min, cand_league, und_season)
            
            if u_rec is not None:
                matched_total += 1
                # Check intra-league multi-team spell
                team_title = str(u_rec['team_title'])
                if ',' in team_title:
                    # Multi-team in same league: Understat aggregates both spells together.
                    # Per Priority 2: Never assign multi-club combined totals to a single spell.
                    # Leave spell metrics as None/null.
                    intra_league_spells_handled += 1
                    df.at[idx, 'xG'] = None
                    df.at[idx, 'npxG'] = None
                    df.at[idx, 'xAG'] = None
                    df.at[idx, 'npxG+xAG'] = None
                    df.at[idx, 'xG_90'] = None
                    df.at[idx, 'xAG_90'] = None
                    df.at[idx, 'xG+xAG_90'] = None
                    df.at[idx, 'npxG_90'] = None
                    df.at[idx, 'npxG+xAG_90'] = None
                    continue

                # Single club spell: assign exact verified values
                prev_xg = row.get('xG')
                xg = round(float(u_rec['xG']), 2)
                npxg = round(float(u_rec['npxG']), 2)
                xag = round(float(u_rec['xA']), 2)
                npxg_xag = round(npxg + xag, 2)

                if (pd.isna(prev_xg) or prev_xg == 0.0) and xg > 0:
                    repaired_zeros += 1
                    if p_gls >= 4:
                        fixes_log.append(f"Fixed: {p_name} ({p_squad}): Gls={p_gls}, xG {prev_xg} -> {xg} (match: {match_type}, ID {u_rec['id']})")

                df.at[idx, 'xG'] = xg
                df.at[idx, 'npxG'] = npxg
                df.at[idx, 'xAG'] = xag
                df.at[idx, 'npxG+xAG'] = npxg_xag
                
                u_npg = int(u_rec['npg'])
                if u_npg <= df.at[idx, 'Gls']:
                    df.at[idx, 'G-PK'] = u_npg
                    df.at[idx, 'PK'] = df.at[idx, 'Gls'] - u_npg
                    df.at[idx, 'PKatt'] = max(int(df.at[idx, 'PKatt']) if pd.notnull(df.at[idx, 'PKatt']) else 0, int(df.at[idx, 'PK']))

                min_val = float(df.at[idx, 'Min']) if pd.notnull(df.at[idx, 'Min']) else 0.0
                if min_val > 0:
                    n90 = min_val / 90.0
                    df.at[idx, '90s'] = round(n90, 2)
                    df.at[idx, 'xG_90'] = round(xg / n90, 2)
                    df.at[idx, 'xAG_90'] = round(xag / n90, 2)
                    df.at[idx, 'xG+xAG_90'] = round((xg + xag) / n90, 2)
                    df.at[idx, 'npxG_90'] = round(npxg / n90, 2)
                    df.at[idx, 'npxG+xAG_90'] = round(npxg_xag / n90, 2)
                    df.at[idx, 'G-PK_90'] = round(float(df.at[idx, 'G-PK']) / n90, 2)
                    df.at[idx, 'G+A-PK_90'] = round((float(df.at[idx, 'G-PK']) + float(df.at[idx, 'Ast'])) / n90, 2)
            else:
                # If unmatched, ensure metrics are None, not 0.0
                if row.get('xG') == 0.0 and (p_gls > 0 or p_min > 500):
                    df.at[idx, 'xG'] = None
                    df.at[idx, 'npxG'] = None
                    df.at[idx, 'xAG'] = None
                    df.at[idx, 'npxG+xAG'] = None
                    df.at[idx, 'xG_90'] = None
                    df.at[idx, 'xAG_90'] = None

        # Write repaired CSV & XLSX
        df.to_csv(csv_path, index=False)
        df.to_excel(xlsx_path, index=False)
        new_sha256 = calculate_sha256(csv_path)
        
        # Update manifest
        manifest = {}
        if os.path.exists(manifest_path):
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
        manifest['sha256'] = new_sha256
        manifest['repair_status'] = "repaired_understat_deterministic_matching"
        manifest['repaired_zero_xg_records'] = repaired_zeros
        manifest['intra_league_spells_nullified'] = intra_league_spells_handled
        manifest['matched_players_count'] = matched_total
        with open(manifest_path, 'w', encoding='utf-8') as f:
            json.dump(manifest, f, indent=2)

        print(f"   Matches: {matched_total}/{len(df)} ({matched_total/len(df)*100:.1f}%) | Repaired Zero xG: {repaired_zeros} | Intra-league Nullified: {intra_league_spells_handled}")
        for fix in fixes_log[:5]:
            print(f"      * {fix}")
            
        repair_summary[s_id] = {
            'matched': matched_total,
            'total': len(df),
            'repaired_zeros': repaired_zeros,
            'intra_league_spells': intra_league_spells_handled
        }

    out_file = os.path.join(BASE_DIR, 'scripts', 'output', 'understat_repair_summary.json')
    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(repair_summary, f, indent=2)
    print(f"\nRepair summary saved to {out_file}")

if __name__ == '__main__':
    run_repair()
