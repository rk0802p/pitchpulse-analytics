import os
import sys
import pandas as pd

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

path = r'C:\Users\Raj\.gemini\antigravity\brain\154b98d1-8ac1-4125-9fe7-23a7a9de2960\scratch\rahul_repo\players_data-2025_2026.csv'
if not os.path.exists(path):
    print("Candidate file does not exist.")
    sys.exit(1)

df = pd.read_csv(path)
print(f"Total records: {len(df)}")
print(f"Unique squads: {df['Squad'].nunique()}")
print(f"Unique comps: {df['Comp'].nunique()}")
for c, group in df.groupby('Comp'):
    print(f"  {c}: {group['Squad'].nunique()} squads, {len(group)} players, max MP={group['MP'].max()}")

print("\nSpot-checking key players:")
players_to_check = ['Harry Kane', 'Mbapp', 'Haaland', 'Salah', 'Díaz', 'Diaz', 'Lewandowski', 'Vinicius', 'Bellingham']
for p in players_to_check:
    matches = df[df['Player'].str.contains(p, na=False, case=False)]
    for _, r in matches.iterrows():
        print(f"  {r['Player']} | {r['Squad']} | {r['Comp']} | MP: {r['MP']} | Min: {r['Min']} | Gls: {r['Gls']} | Ast: {r['Ast']} | xG: {r['xG']} | PrgC: {r.get('PrgC')}")

print("\nChecking null distributions for advanced metrics:")
for m in ['xG', 'npxG', 'xAG', 'PrgC', 'PrgP', 'PrgR']:
    null_count = df[m].isna().sum() if m in df.columns else 'MISSING_COL'
    zero_count = (df[m] == 0).sum() if m in df.columns else 0
    pos_count = (df[m] > 0).sum() if m in df.columns else 0
    print(f"  {m}: nulls={null_count}, zeros={zero_count}, positive={pos_count}")
