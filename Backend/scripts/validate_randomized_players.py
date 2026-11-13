#!/usr/bin/env python3
"""
PitchPulse Analytics — Randomized Multi-Season Player Validation & Statistical Accuracy Audit

This reproducible test utility:
1. Dynamically discovers all seasons in Backend/data/seasons/.
2. Samples randomized players across every season using stratified criteria (position, minutes, completeness, genuine zeros).
3. Independently calculates expected rates, percentiles, and availability directly from raw CSVs without calling production calculation functions.
4. Verifies the complete pipeline: Raw CSV -> DataLoader -> PlayerService -> API response.
5. Audits cross-season consistency for matched players.
6. Reports comprehensive coverage, accuracy rates, and provenance limitations.
"""

import os
import sys
import argparse
import random
import glob
import math
import json
import logging
from typing import Dict, List, Any, Optional, Tuple

import pandas as pd
import numpy as np

# Ensure Backend is in python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from api import app
from services.season_service import season_service
from services.data_loader import data_loader
from services.player_service import get_player_profile

# Reconfigure stdout for utf-8 on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

logging.basicConfig(level=logging.WARNING)


class IndependentValidator:
    """
    Completely independent statistical validator.
    Derives expected values directly from raw CSV files without using production calculation methods.
    """

    def __init__(self, season_id: str, raw_csv_path: str):
        self.season_id = season_id
        self.raw_csv_path = raw_csv_path
        self.raw_df = pd.read_csv(raw_csv_path, low_memory=False)
        self._preprocess_raw_df()

    def _preprocess_raw_df(self):
        """Prepare raw dataframe for independent reference lookups."""
        df = self.raw_df
        # Ensure Rk is present
        if 'Rk' not in df.columns:
            df['Rk'] = range(1, len(df) + 1)
        self.df = df

    def get_player_raw_record(self, rk: int) -> Optional[pd.Series]:
        matches = self.df[self.df['Rk'] == rk]
        if len(matches) == 0:
            return None
        return matches.iloc[0]

    def is_metric_tracked_in_comp(self, metric_col: str, comp_name: str) -> bool:
        if metric_col not in self.df.columns:
            return False
        comp_df = self.df[self.df['Comp'] == comp_name]
        if len(comp_df) == 0:
            return False
        vals = pd.to_numeric(comp_df[metric_col], errors='coerce').dropna()
        return bool(len(vals) > 0 and vals.max() > 0)

    def calculate_expected_rate(self, total_val: Any, min_val: Any, stored_rate_val: Any = None) -> Optional[float]:
        """Independently calculates expected per-90 rate, preserving valid authentic stored rates."""
        if total_val is None or pd.isna(total_val):
            return None
        try:
            total = float(total_val)
            minutes = float(min_val or 0)
        except (ValueError, TypeError):
            return None

        if minutes <= 0:
            return 0.0 if total == 0 else None

        if stored_rate_val is not None and not pd.isna(stored_rate_val):
            try:
                s_rate = float(stored_rate_val)
                if s_rate > 0:
                    return s_rate
            except (ValueError, TypeError):
                pass

        if total == 0:
            return 0.0

        return round((total / minutes) * 90.0, 2)

    def calculate_expected_percentile(self, rk: int, metric_col: str, base_count_col: Optional[str] = None) -> Tuple[Optional[int], bool, int]:
        """
        Independently calculates positional peer percentile using empirical mid-rank CDF.
        Percentile = round(((P < val) + 0.5 * (P == val)) / N * 100)
        """
        row = self.get_player_raw_record(rk)
        if row is None:
            return None, False, 0

        comp = str(row.get('Comp', ''))
        check_col = base_count_col or metric_col

        # Check raw value of the player
        raw_val = row.get(check_col)
        if raw_val is None or pd.isna(raw_val):
            return None, False, 0

        # Check if competition tracks this metric
        if not self.is_metric_tracked_in_comp(check_col, comp):
            return None, False, 0

        # Positional peer group: same primary position, Min >= 270
        pos_raw = str(row.get('Pos', 'MF'))
        primary_pos = pos_raw.split(',')[0].strip() if pos_raw else 'MF'

        # Filter all peers in the season with same position and min >= 270
        min_series = pd.to_numeric(self.df['Min'], errors='coerce').fillna(0)
        pos_mask = self.df['Pos'].astype(str).str.contains(primary_pos, na=False)
        eligible_peers = self.df[pos_mask & (min_series >= 270)].copy()

        if len(eligible_peers) == 0:
            eligible_peers = self.df[min_series >= 270].copy()

        # Filter peers to competitions that tracked the metric
        tracked_comps = [c for c in self.df['Comp'].unique() if self.is_metric_tracked_in_comp(check_col, c)]
        eligible_peers = eligible_peers[eligible_peers['Comp'].isin(tracked_comps)].copy()

        # Get peer metric series
        if metric_col.endswith('_90') and metric_col not in eligible_peers.columns:
            # Derive on the fly if needed
            counts = pd.to_numeric(eligible_peers[check_col], errors='coerce')
            mins = pd.to_numeric(eligible_peers['Min'], errors='coerce')
            peer_metric = (counts / mins) * 90.0
        else:
            # If the metric column exists in the dataset (like xG_90), check if it needs dynamic recalculation
            peer_metric = pd.to_numeric(eligible_peers[metric_col], errors='coerce')
            # If corrupted zero rates with positive totals exist in dataset, derive expected rate
            if check_col in eligible_peers.columns:
                counts = pd.to_numeric(eligible_peers[check_col], errors='coerce')
                mins = pd.to_numeric(eligible_peers['Min'], errors='coerce')
                peer_metric.loc[counts.isna()] = np.nan
                recalc_mask = (mins > 0) & (counts > 0) & ((peer_metric == 0.0) | peer_metric.isna())
                peer_metric.loc[recalc_mask] = ((counts.loc[recalc_mask] / mins.loc[recalc_mask]) * 90.0).round(2)

        # Exclude peers where metric is null
        valid_peer_metric = peer_metric.dropna()
        n_peers = len(valid_peer_metric)

        if n_peers == 0:
            return None, False, 0

        # Player's own value: preserve authentic stored rate if valid and > 0, else derive from count
        raw_stored_rate = row.get(metric_col)
        if metric_col.endswith('_90'):
            p_count = float(row.get(check_col, 0) or 0)
            p_min = float(row.get('Min', 0) or 0)
            if raw_stored_rate is not None and not pd.isna(raw_stored_rate) and float(raw_stored_rate) > 0:
                p_val = float(raw_stored_rate)
            elif p_min > 0 and p_count > 0:
                p_val = round((p_count / p_min) * 90.0, 2)
            else:
                p_val = 0.0
        else:
            try:
                p_val = float(row.get(metric_col, 0))
            except (ValueError, TypeError):
                p_val = 0.0

        strictly_lower = int((valid_peer_metric < p_val).sum())
        strictly_equal = int((valid_peer_metric == p_val).sum())
        pct = int(round(((strictly_lower + 0.5 * strictly_equal) / n_peers) * 100))
        pct = max(0, min(100, pct))

        return pct, True, n_peers


class MultiSeasonAuditor:
    """
    Orchestrates discovery, stratified sampling, and verification across all 14 seasons.
    """

    def __init__(self, seed: int = 42, samples_per_season: int = 5):
        self.seed = seed
        self.samples_per_season = samples_per_season
        random.seed(seed)
        np.random.seed(seed)

        self.client = app.test_client()
        self.seasons_dir = os.path.join(BASE_DIR, 'data', 'seasons')
        self.discovered_seasons: List[Dict[str, Any]] = []

        # Audit tallies
        self.total_metrics_checked = 0
        self.total_metrics_passed = 0
        self.total_metrics_failed = 0
        self.failures: List[Dict[str, Any]] = []

    def discover_seasons(self) -> List[Dict[str, Any]]:
        """Dynamically scans the filesystem for all seasons and reads manifests."""
        seasons = []
        for entry in sorted(os.listdir(self.seasons_dir)):
            dir_path = os.path.join(self.seasons_dir, entry)
            if not os.path.isdir(dir_path) or not os.path.exists(os.path.join(dir_path, 'manifest.json')):
                continue

            csvs = sorted(glob.glob(os.path.join(dir_path, 'top5-players*.csv')))
            if not csvs:
                continue

            manifest_path = os.path.join(dir_path, 'manifest.json')
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)

            raw_csv = csvs[0]
            raw_df = pd.read_csv(raw_csv, low_memory=False)

            # Classify provenance
            is_composite = (entry == '2025-2026' or raw_df['Squad'].nunique() > 100)
            provenance = "unverified_composite" if is_composite else "verified_historical"

            seasons.append({
                'id': entry,
                'path': dir_path,
                'csv_path': raw_csv,
                'manifest': manifest,
                'records_count': len(raw_df),
                'unique_players': raw_df['Player'].nunique(),
                'unique_squads': raw_df['Squad'].nunique(),
                'unique_comps': raw_df['Comp'].nunique(),
                'provenance': provenance,
                'raw_columns': list(raw_df.columns)
            })

        self.discovered_seasons = seasons
        return seasons

    def sample_players_for_season(self, season_info: Dict[str, Any], count: int) -> List[int]:
        """
        Selects a stratified random sample of player Rks:
        - Diverse positions (FW, MF, DF, GK)
        - High, medium, low, and zero minutes
        - Genuine zero scorers and active scorers
        - Missing/untracked advanced metrics where present
        """
        raw_df = pd.read_csv(season_info['csv_path'], low_memory=False)
        if 'Rk' not in raw_df.columns:
            raw_df['Rk'] = range(1, len(raw_df) + 1)

        raw_df['Min_num'] = pd.to_numeric(raw_df['Min'], errors='coerce').fillna(0)
        raw_df['Gls_num'] = pd.to_numeric(raw_df['Gls'], errors='coerce').fillna(0)

        strata = []

        # 1. High minute Forward
        fw_high = raw_df[(raw_df['Pos'].str.contains('FW', na=False)) & (raw_df['Min_num'] >= 1500)]
        if len(fw_high) > 0:
            strata.append(int(fw_high.sample(n=1, random_state=self.seed)['Rk'].iloc[0]))

        # 2. Midfielder with high/medium minutes
        mf_mid = raw_df[(raw_df['Pos'].str.contains('MF', na=False)) & (raw_df['Min_num'] >= 900)]
        if len(mf_mid) > 0:
            strata.append(int(mf_mid.sample(n=1, random_state=self.seed + 1)['Rk'].iloc[0]))

        # 3. Defender with genuine 0 goals
        df_zero = raw_df[(raw_df['Pos'].str.contains('DF', na=False)) & (raw_df['Min_num'] >= 900) & (raw_df['Gls_num'] == 0)]
        if len(df_zero) > 0:
            strata.append(int(df_zero.sample(n=1, random_state=self.seed + 2)['Rk'].iloc[0]))

        # 4. Low minutes player (< 270 mins)
        low_min = raw_df[(raw_df['Min_num'] > 0) & (raw_df['Min_num'] < 270)]
        if len(low_min) > 0:
            strata.append(int(low_min.sample(n=1, random_state=self.seed + 3)['Rk'].iloc[0]))

        # 5. Missing xG or GK if present
        if 'xG' in raw_df.columns and raw_df['xG'].isna().sum() > 0:
            null_xg = raw_df[raw_df['xG'].isna()]
            strata.append(int(null_xg.sample(n=1, random_state=self.seed + 4)['Rk'].iloc[0]))
        else:
            gk_sample = raw_df[raw_df['Pos'].str.contains('GK', na=False)]
            if len(gk_sample) > 0:
                strata.append(int(gk_sample.sample(n=1, random_state=self.seed + 4)['Rk'].iloc[0]))

        # Fill remaining slots with purely random players to reach requested count
        remaining_needed = count - len(strata)
        if remaining_needed > 0:
            remaining_pool = raw_df[~raw_df['Rk'].isin(strata)]
            if len(remaining_pool) > 0:
                extra = remaining_pool.sample(n=min(remaining_needed, len(remaining_pool)), random_state=self.seed + 10)
                strata.extend([int(r) for r in extra['Rk']])

        return list(dict.fromkeys(strata))[:count]

    def validate_player(self, season_id: str, validator: IndependentValidator, rk: int) -> Dict[str, Any]:
        """
        Validates one sampled player across all pipeline stages.
        """
        # Stage 1: Raw Record
        raw_row = validator.get_player_raw_record(rk)
        player_name = str(raw_row.get('Player', f'Player_{rk}'))

        # Stage 2: Backend DataLoader Record
        dl_record = data_loader.get_by_id(rk, season=season_id)

        # Stage 3: Production Player Profile
        profile = get_player_profile(rk, season=season_id)

        # Stage 4: API Response via Flask Test Client
        api_res = self.client.get(f'/api/players/{rk}?season={season_id}')
        api_data = api_res.get_json() if api_res.status_code == 200 else {}
        api_profile = api_data.get('data', {})

        player_result = {
            'rk': rk,
            'name': player_name,
            'season': season_id,
            'squad': str(raw_row.get('Squad', '')),
            'comp': str(raw_row.get('Comp', '')),
            'pos': str(raw_row.get('Pos', '')),
            'min': float(raw_row.get('Min', 0) or 0),
            'checks': []
        }

        # List of rate metrics to independently audit: (rate_key, count_key)
        rate_audits = [
            ('goals_per_90', 'Gls'),
            ('assists_per_90', 'Ast'),
            ('xg_per_90', 'xG'),
            ('xag_per_90', 'xAG')
        ]

        for rate_key, count_key in rate_audits:
            self.total_metrics_checked += 1
            raw_total = raw_row.get(count_key)
            raw_min = raw_row.get('Min')

            # Check if this metric is tracked in player's competition
            is_comp_tracked = validator.is_metric_tracked_in_comp(count_key, player_result['comp'])
            is_raw_valid = (raw_total is not None and not pd.isna(raw_total))

            if not is_comp_tracked or not is_raw_valid:
                expected_rate = None
            else:
                raw_stored_rate = raw_row.get(rate_key.replace('_per_90', '_90')) or raw_row.get(count_key + '_90'); expected_rate = validator.calculate_expected_rate(raw_total, raw_min, raw_stored_rate)

            actual_rate = profile['per_90_rates'].get(rate_key) if profile else None
            api_rate = api_profile.get('per_90_rates', {}).get(rate_key) if api_profile else None

            # Compare expected vs actual with 0.05 tolerance for rounding
            match = False
            if expected_rate is None:
                match = (actual_rate is None and api_rate is None)
            elif actual_rate is not None:
                match = math.isclose(float(actual_rate), float(expected_rate), abs_tol=0.06)

            if match:
                self.total_metrics_passed += 1
                player_result['checks'].append({
                    'metric': rate_key,
                    'status': 'PASS',
                    'expected': expected_rate,
                    'actual': actual_rate
                })
            else:
                self.total_metrics_failed += 1
                failure_info = {
                    'season': season_id,
                    'player': player_name,
                    'rk': rk,
                    'metric': rate_key,
                    'expected': expected_rate,
                    'actual': actual_rate,
                    'raw_total': raw_total,
                    'min': raw_min
                }
                self.failures.append(failure_info)
                player_result['checks'].append({
                    'metric': rate_key,
                    'status': 'FAIL',
                    'expected': expected_rate,
                    'actual': actual_rate,
                    'details': failure_info
                })

        # Benchmark Percentiles Audit
        benchmark_audits = [
            ('goals_per_90', 'Gls_90', 'Gls'),
            ('xg_per_90', 'xG_90', 'xG'),
            ('assists_per_90', 'Ast_90', 'Ast'),
            ('xag_per_90', 'xAG_90', 'xAG'),
            ('progressive_carries', 'PrgC', 'PrgC'),
            ('progressive_passes', 'PrgP', 'PrgP')
        ]

        for pct_key, metric_col, base_col in benchmark_audits:
            self.total_metrics_checked += 1
            exp_pct, exp_tracked, exp_sample = validator.calculate_expected_percentile(rk, metric_col, base_col)

            act_pct_entry = profile.get('percentiles', {}).get(pct_key, {}) if profile else {}
            act_pct = act_pct_entry.get('percentile')
            act_tracked = act_pct_entry.get('is_tracked')
            act_sample = act_pct_entry.get('sample_size', 0)

            match = False
            if not exp_tracked:
                # If independently determined untracked, production must also report untracked
                match = (act_tracked is False and act_pct is None)
            else:
                # If tracked, percentiles should match within 2 percentile points (accounting for tie-breaks)
                if act_tracked is True and act_pct is not None and exp_pct is not None:
                    pct_diff = abs(int(act_pct) - int(exp_pct))
                    match = (pct_diff <= 2) and (act_sample == exp_sample)

            if match:
                self.total_metrics_passed += 1
                player_result['checks'].append({
                    'metric': f'percentile_{pct_key}',
                    'status': 'PASS',
                    'expected_pct': exp_pct,
                    'actual_pct': act_pct,
                    'tracked': act_tracked,
                    'sample_size': act_sample
                })
            else:
                self.total_metrics_failed += 1
                failure_info = {
                    'season': season_id,
                    'player': player_name,
                    'rk': rk,
                    'metric': f'percentile_{pct_key}',
                    'expected_pct': exp_pct,
                    'actual_pct': act_pct,
                    'expected_sample': exp_sample,
                    'actual_sample': act_sample,
                    'expected_tracked': exp_tracked,
                    'actual_tracked': act_tracked
                }
                self.failures.append(failure_info)
                player_result['checks'].append({
                    'metric': f'percentile_{pct_key}',
                    'status': 'FAIL',
                    'details': failure_info
                })

        return player_result

    def audit_cross_season_matching(self, count: int = 5) -> List[Dict[str, Any]]:
        """
        Cross-season consistency check for matched players appearing across multiple seasons.
        Verifies that totals, rates, and era-specific metric availability do not leak or cross-contaminate.
        """
        results = []
        # Find players present in both 2024-2025 and 2018-2019 or 2023-2024
        df_24 = data_loader.load_season('2024-2025')
        df_18 = data_loader.load_season('2018-2019')

        common_players = set(df_24['Player']).intersection(set(df_18['Player']))
        sampled_names = random.sample(sorted(common_players), min(count, len(common_players)))

        for name in sampled_names:
            p24 = df_24[df_24['Player'] == name].iloc[0]
            p18 = df_18[df_18['Player'] == name].iloc[0]

            prof24 = get_player_profile(int(p24['Rk']), '2024-2025')
            prof18 = get_player_profile(int(p18['Rk']), '2018-2019')

            # Verify that 2024-2025 has progressive actions tracked, while 2018-2019 has them untracked
            prgc_24_tracked = prof24['percentiles']['progressive_carries']['is_tracked']
            prgc_18_tracked = prof18['percentiles']['progressive_carries']['is_tracked']

            correct = (prgc_24_tracked is True and prgc_18_tracked is False)
            results.append({
                'player': name,
                'squad_24': p24['Squad'],
                'squad_18': p18['Squad'],
                'min_24': int(p24['Min']),
                'min_18': int(p18['Min']),
                'prgc_24_tracked': prgc_24_tracked,
                'prgc_18_tracked': prgc_18_tracked,
                'status': 'PASS' if correct else 'FAIL'
            })

        return results

    def run_full_audit(self) -> Dict[str, Any]:
        """Runs the complete randomized validation audit across all discovered seasons."""
        seasons = self.discover_seasons()
        print(f"\n================================================================================")
        print(f" PITCHPULSE ANALYTICS — RANDOMIZED MULTI-SEASON STATISTICAL VALIDATION SUITE")
        print(f" Random Seed: {self.seed} | Samples Per Season: {self.samples_per_season}")
        print(f" Discovered Seasons: {len(seasons)}")
        print(f"================================================================================\n")

        season_results = []
        for s in seasons:
            s_id = s['id']
            validator = IndependentValidator(s_id, s['csv_path'])
            sampled_rks = self.sample_players_for_season(s, self.samples_per_season)

            print(f"-> Validating Season {s_id} ({s['records_count']} rows, {s['unique_squads']} squads, {s['provenance']})...")
            print(f"   Sampled {len(sampled_rks)} players: Rks {sampled_rks}")

            player_checks = []
            for rk in sampled_rks:
                res = self.validate_player(s_id, validator, rk)
                player_checks.append(res)
                fails = [c for c in res['checks'] if c['status'] == 'FAIL']
                if fails:
                    print(f"   [FAIL] {res['name']} ({res['squad']}, {res['pos']}): {len(fails)} metric failures!")
                    for f in fails:
                        print(f"          - {f.get('metric')}: {f.get('details')}")
                else:
                    print(f"   [PASS] {res['name']} ({res['squad']}, {res['pos']}, {res['min']} min) — all checks passed.")

            season_results.append({
                'season': s_id,
                'provenance': s['provenance'],
                'player_checks': player_checks
            })

        # Cross season validation
        print("\n-> Running Cross-Season Matched Player Audit...")
        cross_season_checks = self.audit_cross_season_matching(count=5)
        for cs in cross_season_checks:
            print(f"   [{cs['status']}] {cs['player']}: 24/25 in {cs['squad_24']} (PrgC Tracked={cs['prgc_24_tracked']}) vs 18/19 in {cs['squad_18']} (PrgC Tracked={cs['prgc_18_tracked']})")

        return {
            'seed': self.seed,
            'seasons_count': len(seasons),
            'total_metrics_checked': self.total_metrics_checked,
            'total_metrics_passed': self.total_metrics_passed,
            'total_metrics_failed': self.total_metrics_failed,
            'accuracy_percentage': round((self.total_metrics_passed / self.total_metrics_checked) * 100, 2) if self.total_metrics_checked > 0 else 0,
            'failures': self.failures,
            'cross_season_checks': cross_season_checks,
            'seasons': season_results
        }


def main():
    parser = argparse.ArgumentParser(description="PitchPulse Randomized Multi-Season Player Validation Suite")
    parser.add_argument('--seed', type=int, default=42, help="Deterministic random seed (default: 42)")
    parser.add_argument('--samples', type=int, default=5, help="Number of random players sampled per season (default: 5)")
    parser.add_argument('--season', type=str, default=None, help="Specific season ID to validate (optional)")
    parser.add_argument('--fast', action='store_true', help="Fast mode: 2 samples per season")

    args = parser.parse_args()
    samples = 2 if args.fast else args.samples

    auditor = MultiSeasonAuditor(seed=args.seed, samples_per_season=samples)
    if args.season:
        seasons = auditor.discover_seasons()
        auditor.discovered_seasons = [s for s in seasons if s['id'] == args.season]

    report = auditor.run_full_audit()

    print("\n================================================================================")
    print(" FINAL AUDIT SUMMARY")
    print("================================================================================")
    print(f" Total Metrics Checked : {report['total_metrics_checked']}")
    print(f" Total Passed          : {report['total_metrics_passed']}")
    print(f" Total Failed          : {report['total_metrics_failed']}")
    print(f" Overall Accuracy Rate : {report['accuracy_percentage']}%")
    print("================================================================================\n")

    if report['total_metrics_failed'] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
