import pandas as pd
from services.data_loader import data_loader
from services.validation_service import resolve_competition, validate_metric
from services.season_service import season_service
from services.metric_registry import is_metric_tracked_in_era

def get_leaderboard(metric="Gls", competition=None, position=None, min_minutes=None, limit=10, season=None):
    df = data_loader.get_dataframe(season=season)
    metric_key = validate_metric(metric, default="Gls")

    # Filter out missing / untracked records for this metric
    if metric_key in df.columns:
        df = df[df[metric_key].notna()]
    else:
        return []

    # Filter competition
    if competition:
        resolved = resolve_competition(competition)
        if resolved:
            df = df[df['Comp'] == resolved]
        else:
            return []

    # Filter position
    if position:
        df = df[df['Pos'].str.contains(position.strip().upper(), regex=False, na=False, case=False)]

    # Enforce minimum 270-minute floor for per-90 rate metrics to eliminate small-sample noise
    is_rate_metric = str(metric_key).endswith('_90')
    if is_rate_metric:
        if min_minutes is None or min_minutes < 270:
            effective_min_minutes = 270
        else:
            effective_min_minutes = min_minutes
    else:
        effective_min_minutes = min_minutes if min_minutes is not None else 0

    # Filter min minutes
    if effective_min_minutes and effective_min_minutes > 0:
        df = df[df['Min'] >= effective_min_minutes]

    if len(df) == 0:
        return []

    sorted_df = df.sort_values(by=metric_key, ascending=False).head(limit)

    target_season = season or season_service.get_active_season()
    results = []
    for rank, (_, row) in enumerate(sorted_df.iterrows(), start=1):
        raw_val = row[metric_key]
        clean_val = round(float(raw_val), 2) if isinstance(raw_val, (float, int)) and not pd.isna(raw_val) else raw_val
        row_season = row.get("season", target_season)
        player_id = int(row["id"])
        results.append({
            "rank": rank,
            "id": player_id,
            "Rk": player_id,
            "player": row["Player"],
            "Player": row["Player"],
            "slug": row["player_slug"],
            "squad": row["Squad"],
            "Squad": row["Squad"],
            "competition": row["competition_name"],
            "competition_id": row.get("competition_id", ""),
            "country": row["country"],
            "position": row["Pos"],
            "Pos": row["Pos"],
            "age": row.get("Age"),
            "minutes": int(row["Min"]),
            "Min": int(row["Min"]),
            "matches": int(row["MP"]),
            "MP": int(row["MP"]),
            "starts": int(row.get("Starts", 0)),
            "value": clean_val,
            "metric": metric_key,
            "goals": int(row["Gls"]),
            "Gls": int(row["Gls"]),
            "assists": int(row["Ast"]),
            "Ast": int(row["Ast"]),
            "xg": float(row["xG"]) if pd.notna(row.get("xG")) else None,
            "xG": float(row["xG"]) if pd.notna(row.get("xG")) else None,
            "xag": float(row["xAG"]) if pd.notna(row.get("xAG")) else None,
            "xAG": float(row["xAG"]) if pd.notna(row.get("xAG")) else None,
            "goals_per_90": float(row.get("Gls_90", 0.0)) if pd.notna(row.get("Gls_90")) else 0.0,
            "assists_per_90": float(row.get("Ast_90", 0.0)) if pd.notna(row.get("Ast_90")) else 0.0,
            "xg_per_90": float(row.get("xG_90")) if pd.notna(row.get("xG_90")) else None,
            "xag_per_90": float(row.get("xAG_90")) if pd.notna(row.get("xAG_90")) else None,
            "progressive_passes": int(row["PrgP"]) if pd.notna(row.get("PrgP")) else None,
            "progressive_carries": int(row["PrgC"]) if pd.notna(row.get("PrgC")) else None,
            "finishing_differential": float(row.get("Gls_minus_xG")) if pd.notna(row.get("Gls_minus_xG")) else None,
            "season": row_season,
            "comparison_key": f"{player_id}@{row_season}"
        })
    return results

def compare_players(record_ids, season=None):
    if not record_ids:
        return None

    # Limit comparison to max 5 players
    clean_ids = record_ids[:5]
    players = []
    for rid in clean_ids:
        p_id = rid
        p_season = season
        if isinstance(rid, dict):
            p_id = rid.get('id') or rid.get('player_id') or rid.get('Rk')
            p_season = rid.get('season') or season
        elif isinstance(rid, str) and (':' in rid or '@' in rid):
            delimiter = ':' if ':' in rid else '@'
            parts = rid.split(delimiter)
            p_id = parts[0]
            p_season = parts[1]

        p = data_loader.get_by_id(p_id, season=p_season)
        if p:
            p_copy = dict(p)
            p_copy['season'] = p_season or season or season_service.get_active_season()
            p_copy['comparison_key'] = f"{p_copy['id']}@{p_copy['season']}"
            players.append(p_copy)

    if not players:
        return None

    # Aligned comparison matrix (aligned with FBref standard and advanced breakdowns)
    metrics_to_compare = [
        # Playing Time & Volume
        {"key": "MP", "label": "Matches Played", "type": "total"},
        {"key": "Starts", "label": "Games Started", "type": "total"},
        {"key": "Min", "label": "Minutes Played", "type": "total"},
        {"key": "90s", "label": "90s Completed", "type": "total"},
        # Scoring & Shooting
        {"key": "Gls", "label": "Goals", "type": "total"},
        {"key": "G-PK", "label": "Non-Penalty Goals", "type": "total"},
        {"key": "PK", "label": "Penalty Goals", "type": "total"},
        {"key": "PKatt", "label": "Penalties Attempted", "type": "total"},
        {"key": "xG", "label": "Expected Goals (xG)", "type": "expected"},
        {"key": "npxG", "label": "Non-Penalty xG (npxG)", "type": "expected"},
        {"key": "Gls_minus_xG", "label": "Finishing Differential (Gls - xG)", "type": "differential"},
        # Playmaking & Creation
        {"key": "Ast", "label": "Assists", "type": "total"},
        {"key": "G+A", "label": "Goals + Assists", "type": "total"},
        {"key": "xAG", "label": "Expected Assisted Goals (xAG)", "type": "expected"},
        # Standardized Rates (Per 90 Minutes)
        {"key": "Gls_90", "label": "Goals / 90", "type": "rate"},
        {"key": "Ast_90", "label": "Assists / 90", "type": "rate"},
        {"key": "G+A_90", "label": "Goals + Assists / 90", "type": "rate"},
        {"key": "xG_90", "label": "xG / 90", "type": "rate"},
        {"key": "xAG_90", "label": "xAG / 90", "type": "rate"},
        {"key": "npxG_90", "label": "npxG / 90", "type": "rate"},
        # Ball Progression & Spatial Coordinates
        {"key": "PrgC", "label": "Progressive Carries", "type": "progression"},
        {"key": "PrgP", "label": "Progressive Passes", "type": "progression"},
        {"key": "PrgR", "label": "Progressive Receptions", "type": "progression"},
        # Disciplinary Record
        {"key": "CrdY", "label": "Yellow Cards", "type": "discipline"},
        {"key": "CrdR", "label": "Red Cards", "type": "discipline"}
    ]

    radar_dimensions = [
        {"key": "Gls_90", "label": "Goals/90", "max": 1.5},
        {"key": "xG_90", "label": "xG/90", "max": 1.2},
        {"key": "Ast_90", "label": "Assists/90", "max": 1.0},
        {"key": "xAG_90", "label": "xAG/90", "max": 1.0},
        {"key": "PrgC", "label": "Prog. Carries", "max": 150},
        {"key": "PrgP", "label": "Prog. Passes", "max": 250},
        {"key": "PrgR", "label": "Prog. Receptions", "max": 300}
    ]

    aligned_matrix = []
    for metric_meta in metrics_to_compare:
        key = metric_meta["key"]
        values = {}
        untracked = []
        valid_vals = []

        for p in players:
            p_season = p.get('season') or season or season_service.get_active_season()
            p_comp = p.get('Comp')
            val = p.get(key)
            is_tracked = is_metric_tracked_in_era(key, p_season, p_comp) and val is not None and not pd.isna(val)

            clean_val = val if is_tracked else None
            values[str(p["id"])] = clean_val
            values[p["comparison_key"]] = clean_val

            if not is_tracked:
                untracked.append(p["comparison_key"])
                untracked.append(str(p["id"]))
            else:
                valid_vals.append(val)

        # Determine best/leader value among players where metric is tracked
        if valid_vals:
            if key in ["CrdY", "CrdR"]:
                best_val = min(valid_vals)
            else:
                best_val = max(valid_vals)
        else:
            best_val = None

        leaders = []
        if best_val is not None:
            for p in players:
                val = p.get(key)
                if val is not None and not pd.isna(val) and val == best_val:
                    if key in ["CrdY", "CrdR"] or best_val > 0:
                        leaders.append(str(p["id"]))
                        leaders.append(p["comparison_key"])

        aligned_matrix.append({
            "metric": metric_meta["label"],
            "label": metric_meta["label"],
            "key": key,
            "category": metric_meta["type"],
            "values": values,
            "leaders": leaders,
            "best_value": best_val,
            "untracked": untracked
        })

    radar_data = []
    for dim in radar_dimensions:
        key = dim["key"]
        dim_values = {}
        dim_scores = {}
        dim_tracked = {}

        for p in players:
            p_season = p.get("season") or season or season_service.get_active_season()
            p_comp = p.get("Comp")
            p_df = data_loader.get_dataframe(season=p_season)

            raw_val = p.get(key)
            is_tracked = is_metric_tracked_in_era(key, p_season, p_comp) and raw_val is not None and not pd.isna(raw_val)

            p_id_str = str(p["id"])
            p_cmp_key = p["comparison_key"]

            dim_values[p_id_str] = raw_val if is_tracked else None
            dim_values[p_cmp_key] = raw_val if is_tracked else None
            dim_tracked[p_id_str] = is_tracked
            dim_tracked[p_cmp_key] = is_tracked

            if not is_tracked or raw_val is None:
                dim_scores[p_id_str] = None
                dim_scores[p_cmp_key] = None
            else:
                p_peers = p_df[p_df['Min'] >= 270] if len(p_df) > 0 else p_df
                if key in p_peers.columns:
                    valid_series = p_peers[p_peers[key].notna()][key]
                    if len(valid_series) >= 10:
                        strictly_lower = (valid_series < float(raw_val)).sum()
                        strictly_equal = (valid_series == float(raw_val)).sum()
                        pct = round(float(((strictly_lower + 0.5 * strictly_equal) / len(valid_series)) * 100), 1)
                        pct = max(0.0, min(100.0, pct))
                        dim_scores[p_id_str] = pct
                        dim_scores[p_cmp_key] = pct
                    else:
                        dim_scores[p_id_str] = None
                        dim_scores[p_cmp_key] = None
                else:
                    dim_scores[p_id_str] = None
                    dim_scores[p_cmp_key] = None

        radar_data.append({
            "dimension": dim["label"],
            "key": key,
            "values": dim_values,
            "scores": dim_scores,
            "is_tracked": dim_tracked
        })

    return {
        "players": players,
        "metrics": aligned_matrix,
        "radar": radar_data
    }

def get_dashboard_analytics(competition=None, season=None):
    df = data_loader.get_dataframe(season=season)
    if competition:
        resolved = resolve_competition(competition)
        if resolved:
            df = df[df['Comp'] == resolved]
        else:
            return None

    total_players = int(len(df))
    total_clubs = int(df['Squad'].nunique())
    total_goals = int(df['Gls'].sum())
    total_assists = int(df['Ast'].sum())
    total_xg = round(float(df['xG'].sum()), 1)
    total_xag = round(float(df['xAG'].sum()), 1)
    finishing_delta = round(total_goals - total_xg, 1)

    top_scorers = df.sort_values(by='Gls', ascending=False).head(8)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Gls', 'xG', 'Gls_minus_xG', 'Min']
    ].to_dict(orient='records')

    top_creators = df.sort_values(by='Ast', ascending=False).head(8)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Ast', 'xAG', 'Ast_minus_xAG', 'Min']
    ].to_dict(orient='records')

    has_xg = bool(df['xG'].dropna().max() > 0) if 'xG' in df.columns else False
    has_prgc = bool(df['PrgC'].dropna().max() > 0) if 'PrgC' in df.columns else False

    min_500 = df[df['Min'] >= 500].copy()
    if has_xg and 'Gls_minus_xG' in min_500.columns:
        overperformers = min_500.sort_values(by='Gls_minus_xG', ascending=False).head(5)[
            ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Gls', 'xG', 'Gls_minus_xG', 'Min']
        ].to_dict(orient='records')

        underperformers = min_500.sort_values(by='Gls_minus_xG', ascending=True).head(5)[
            ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Gls', 'xG', 'Gls_minus_xG', 'Min']
        ].to_dict(orient='records')
    else:
        overperformers = []
        underperformers = []

    if has_prgc:
        progression_leaders = df.assign(prog_total=df['PrgC'].fillna(0) + df['PrgP'].fillna(0)).sort_values(by='prog_total', ascending=False).head(8)[
            ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'PrgC', 'PrgP', 'Min']
        ].to_dict(orient='records')
    else:
        progression_leaders = []

    min_450 = df[df['Min'] >= 450].copy()
    if has_xg:
        min_450['production_sum'] = min_450['xG'].fillna(0) + min_450['xAG'].fillna(0)
    else:
        min_450['production_sum'] = min_450['Gls'].fillna(0) + min_450['Ast'].fillna(0)

    scatter_data = min_450.sort_values(by='production_sum', ascending=False).head(25)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'xG', 'xAG', 'Gls', 'Ast', 'Min']
    ].to_dict(orient='records')

    quar_policy = season_service.get_quarantine_policy(season)
    quarantine_notice = None
    if quar_policy["is_quarantined"]:
        quarantine_notice = {
            "status": "quarantined",
            "title": quar_policy["warning_title"],
            "message": quar_policy["warning_message"]
        }

    return {
        "is_quarantined": quar_policy["is_quarantined"],
        "quarantine_notice": quarantine_notice,
        "quarantine_policy": quar_policy,
        "kpis": {
            "total_players": total_players,
            "total_clubs": total_clubs,
            "total_goals": total_goals,
            "total_assists": total_assists,
            "total_xg": total_xg,
            "total_xag": total_xag,
            "finishing_delta": finishing_delta
        },
        "top_scorers": top_scorers,
        "top_creators": top_creators,
        "overperformers": overperformers,
        "underperformers": underperformers,
        "progression_leaders": progression_leaders,
        "scatter_data": scatter_data
    }
