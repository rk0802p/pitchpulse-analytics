"""
PitchPulse Chart Service.
Implements canonical statistical recipes for scatter plots, empirical positional percentiles,
player style similarity matching (z-score distance), and composite role performance indices.
"""

import numpy as np
import pandas as pd
from services.validation_service import resolve_competition, validate_metric
from services.metric_registry import is_metric_tracked_in_era

DEFAULT_SIMILARITY_METRICS = [
    'Gls_90', 'Ast_90', 'xG_90', 'xAG_90', 'PrgC', 'PrgP', 'PrgR'
]

ROLE_PRESETS = {
    'finisher': {
        'metrics': {'Gls_90': 0.35, 'xG_90': 0.30, 'npxG_90': 0.20, 'Gls_minus_xG': 0.15},
        'title': 'Clinical Finishing Index',
        'description': 'Evaluates goal volume, shot selection, and finishing efficiency over performance.'
    },
    'creator': {
        'metrics': {'xAG_90': 0.35, 'Ast_90': 0.30, 'PrgP': 0.20, 'G+A_90': 0.15},
        'title': 'Chances & Creation Index',
        'description': 'Measures chance creation quality, progressive passing, and direct goal assists.'
    },
    'progressor': {
        'metrics': {'PrgC': 0.40, 'PrgP': 0.40, 'PrgR': 0.20},
        'title': 'Ball Progression Index',
        'description': 'Isolates players who drive play forward through carries, passing, and progressive receptions.'
    },
    'all_round': {
        'metrics': {'xG+xAG_90': 0.30, 'G+A_90': 0.30, 'PrgC': 0.20, 'PrgP': 0.20},
        'title': 'All-Round Attacking Threat Index',
        'description': 'Holistic attacking contribution combining scoring, playmaking, and vertical transition progression.'
    }
}

def pool(df, position=None, min_minutes=270, competition=None):
    """
    Constructs a peer pool filtered by minimum minutes, primary playing position, and competition.
    """
    if df is None or len(df) == 0:
        return df

    res = df.copy()

    # Filter minimum minutes
    if min_minutes and min_minutes > 0:
        res = res[res['Min'] >= min_minutes]

    # Filter competition
    if competition:
        resolved_comp = resolve_competition(competition)
        if resolved_comp:
            res = res[res['Comp'] == resolved_comp]

    # Filter primary position
    if position:
        pos_clean = str(position).split(',')[0].strip().upper()
        if pos_clean:
            res = res[res['Pos'].str.contains(pos_clean, regex=False, na=False, case=False)]

    return res

def pct_of_value(metric, value, pool_df):
    """
    Calculates empirical mid-rank percentile (0-100) for a given value within a metric distribution.
    Formula: round(((count(x < v) + 0.5 * count(x == v)) / N) * 100)
    """
    if pool_df is None or len(pool_df) == 0 or metric not in pool_df.columns:
        return None
    if value is None or pd.isna(value):
        return None

    valid = pool_df[pool_df[metric].notna()][metric].astype(float)
    n = len(valid)
    if n < 5:
        return None

    val_f = float(value)
    strictly_lower = (valid < val_f).sum()
    strictly_equal = (valid == val_f).sum()
    pct = int(round(((strictly_lower + 0.5 * strictly_equal) / n) * 100))
    return max(0, min(100, pct))

def percentiles(player, pool_df, metrics=None):
    """
    Computes empirical mid-rank percentiles for an individual player across multiple metrics.
    """
    if metrics is None:
        metrics = [
            'Gls_90', 'Ast_90', 'G+A_90', 'G-PK_90', 'xG_90', 'xAG_90',
            'xG+xAG_90', 'npxG_90', 'npxG+xAG_90', 'PrgC', 'PrgP', 'PrgR'
        ]

    pcts = {}
    for m in metrics:
        val = player.get(m)
        pct = pct_of_value(m, val, pool_df)
        pcts[m] = {
            'value': round(float(val), 2) if val is not None and not pd.isna(val) else None,
            'percentile': pct,
            'metric': m
        }
    return pcts

def similar_players(player, pool_df, k=5, weights=None, same_league=False):
    """
    Finds the k most similar players in style and output to the target player
    using weighted Euclidean distance on z-score standardized metrics.
    """
    if pool_df is None or len(pool_df) == 0:
        return []

    target_id = player.get('id') or player.get('Rk')
    target_pos = str(player.get('Pos', 'MF')).split(',')[0].strip()

    # Filter candidates to same primary position
    candidates = pool_df[pool_df['Pos'].str.contains(target_pos, regex=False, na=False, case=False)].copy()
    if len(candidates) < 5:
        candidates = pool_df.copy()

    if same_league and player.get('Comp'):
        candidates = candidates[candidates['Comp'] == player['Comp']]

    # Exclude target player from peer candidate pool
    candidates = candidates[candidates['id'] != target_id]
    if len(candidates) == 0:
        return []

    metrics = list(weights.keys()) if weights else DEFAULT_SIMILARITY_METRICS
    feature_cols = [m for m in metrics if m in candidates.columns and m in player and player[m] is not None and not pd.isna(player[m])]

    if len(feature_cols) < 3:
        feature_cols = [c for c in ['Gls_90', 'Ast_90', 'Min', 'G+A_90'] if c in candidates.columns]

    w_dict = weights or {c: 1.0 for c in feature_cols}
    w_sum = sum(w_dict.get(c, 1.0) for c in feature_cols)

    # Standardize candidate features (z-scores)
    z_scores = pd.DataFrame(index=candidates.index)
    target_z = {}

    for col in feature_cols:
        series = pd.to_numeric(candidates[col], errors='coerce').fillna(0.0)
        mean_val = series.mean()
        std_val = series.std()
        std_val = std_val if std_val > 1e-6 else 1.0

        z_scores[col] = (series - mean_val) / std_val
        val_target = float(player.get(col, 0.0) or 0.0)
        target_z[col] = (val_target - mean_val) / std_val

    # Weighted Euclidean distance
    dist_sq = np.zeros(len(candidates))
    for col in feature_cols:
        w = w_dict.get(col, 1.0)
        diff = z_scores[col] - target_z[col]
        dist_sq += w * (diff ** 2)

    dist = np.sqrt(dist_sq)

    # Normalize similarity to 0-100% scale
    max_reasonable_dist = np.sqrt(w_sum) * 3.0
    similarity = np.clip(100.0 * (1.0 - (dist / max_reasonable_dist)), 10.0, 99.5)

    candidates['similarity'] = np.round(similarity, 1)
    candidates['distance'] = np.round(dist, 2)

    top_matches = candidates.sort_values(by='similarity', ascending=False).head(k)

    results = []
    for _, row in top_matches.iterrows():
        results.append({
            'id': int(row['id']),
            'Player': row['Player'],
            'Squad': row['Squad'],
            'Comp': row['Comp'],
            'Pos': row['Pos'],
            'Age': row.get('Age'),
            'Min': int(row.get('Min', 0)),
            'similarity': float(row['similarity']),
            'distance': float(row['distance']),
            'stats': {
                'Gls': int(row.get('Gls', 0)),
                'Ast': int(row.get('Ast', 0)),
                'xG': float(row.get('xG', 0.0)) if pd.notna(row.get('xG')) else None,
                'xAG': float(row.get('xAG', 0.0)) if pd.notna(row.get('xAG')) else None,
                'Gls_90': float(row.get('Gls_90', 0.0)) if pd.notna(row.get('Gls_90')) else None,
                'Ast_90': float(row.get('Ast_90', 0.0)) if pd.notna(row.get('Ast_90')) else None,
            }
        })
    return results

def performance_index(df, role='finisher', position=None, competition=None, min_minutes=270, limit=25):
    """
    Computes a composite performance index (0-100 scale) for players based on role weightings.
    """
    preset = ROLE_PRESETS.get(role, ROLE_PRESETS['finisher'])
    weights = preset['metrics']

    filtered_df = pool(df, position=position, min_minutes=min_minutes, competition=competition).copy()
    if len(filtered_df) == 0:
        return {'players': [], 'role': role, 'preset': preset, 'total': 0}

    # Compute percentiles for each weighted metric within this cohort
    scores = np.zeros(len(filtered_df))
    active_weights_sum = 0.0

    for metric, w in weights.items():
        if metric in filtered_df.columns:
            s = pd.to_numeric(filtered_df[metric], errors='coerce').fillna(0.0)
            n = len(s)
            ranks = s.rank(method='average', ascending=True)
            pcts = (ranks / n) * 100.0
            scores += w * pcts
            active_weights_sum += w

    if active_weights_sum > 0:
        filtered_df['composite_index'] = np.round(scores / active_weights_sum, 1)
    else:
        filtered_df['composite_index'] = 50.0

    ranked = filtered_df.sort_values(by='composite_index', ascending=False).head(limit)

    results = []
    for rank, (_, row) in enumerate(ranked.iterrows(), start=1):
        results.append({
            'rank': rank,
            'id': int(row['id']),
            'Player': row['Player'],
            'Squad': row['Squad'],
            'Comp': row['Comp'],
            'Pos': row['Pos'],
            'Age': row.get('Age'),
            'Min': int(row.get('Min', 0)),
            'composite_index': float(row['composite_index']),
            'metrics': {m: round(float(row[m]), 2) if m in row and pd.notna(row[m]) else None for m in weights.keys()}
        })

    return {
        'role': role,
        'preset': preset,
        'total': len(filtered_df),
        'players': results
    }

def get_scatter_chart_data(df, x_metric="xG_90", y_metric="xAG_90", position=None, competition=None, min_minutes=270):
    """
    Generates standardized 2D scatter plot data with median crosshairs and quadrant distribution.
    """
    valid_x = validate_metric(x_metric, default="xG_90")
    valid_y = validate_metric(y_metric, default="xAG_90")

    cohort = pool(df, position=position, min_minutes=min_minutes, competition=competition).copy()
    if len(cohort) == 0:
        return {
            'points': [],
            'x_metric': valid_x,
            'y_metric': valid_y,
            'distribution': {'median_x': 0, 'median_y': 0, 'min_x': 0, 'max_x': 0, 'min_y': 0, 'max_y': 0}
        }

    cohort = cohort[cohort[valid_x].notna() & cohort[valid_y].notna()]
    if len(cohort) == 0:
        return {
            'points': [],
            'x_metric': valid_x,
            'y_metric': valid_y,
            'distribution': {'median_x': 0, 'median_y': 0, 'min_x': 0, 'max_x': 0, 'min_y': 0, 'max_y': 0}
        }

    med_x = round(float(cohort[valid_x].median()), 2)
    med_y = round(float(cohort[valid_y].median()), 2)
    min_x = round(float(cohort[valid_x].min()), 2)
    max_x = round(float(cohort[valid_x].max()), 2)
    min_y = round(float(cohort[valid_y].min()), 2)
    max_y = round(float(cohort[valid_y].max()), 2)

    points = []
    q1, q2, q3, q4 = 0, 0, 0, 0  # Q1: high X high Y, Q2: low X high Y, Q3: low X low Y, Q4: high X low Y

    for _, row in cohort.iterrows():
        vx = round(float(row[valid_x]), 2)
        vy = round(float(row[valid_y]), 2)

        if vx >= med_x and vy >= med_y:
            q = 'Q1'
            q1 += 1
        elif vx < med_x and vy >= med_y:
            q = 'Q2'
            q2 += 1
        elif vx < med_x and vy < med_y:
            q = 'Q3'
            q3 += 1
        else:
            q = 'Q4'
            q4 += 1

        points.append({
            'id': int(row['id']),
            'Player': row['Player'],
            'Squad': row['Squad'],
            'Comp': row['Comp'],
            'Pos': row['Pos'],
            'Min': int(row['Min']),
            'x': vx,
            'y': vy,
            'quadrant': q
        })

    return {
        'x_metric': valid_x,
        'y_metric': valid_y,
        'points_count': len(points),
        'distribution': {
            'median_x': med_x,
            'median_y': med_y,
            'min_x': min_x,
            'max_x': max_x,
            'min_y': min_y,
            'max_y': max_y,
            'quadrants': {'q1': q1, 'q2': q2, 'q3': q3, 'q4': q4}
        },
        'points': points
    }
