import pandas as pd
from services.data_loader import data_loader
from services.validation_service import resolve_competition, validate_metric

def get_leaderboard(metric="Gls", competition=None, position=None, min_minutes=0, limit=10, season=None):
    df = data_loader.get_dataframe(season=season)
    metric_key = validate_metric(metric, default="Gls")

    # Filter competition
    if competition:
        resolved = resolve_competition(competition)
        if resolved:
            df = df[df['Comp'] == resolved]
        else:
            return []

    # Filter position
    if position:
        df = df[df['Pos'].str.contains(position.strip().upper(), na=False, case=False)]

    # Filter min minutes
    if min_minutes and min_minutes > 0:
        df = df[df['Min'] >= min_minutes]

    if len(df) == 0:
        return []

    sorted_df = df.sort_values(by=metric_key, ascending=False).head(limit)

    results = []
    for rank, (_, row) in enumerate(sorted_df.iterrows(), start=1):
        raw_val = row[metric_key]
        clean_val = round(float(raw_val), 2) if isinstance(raw_val, (float, int)) and not pd.isna(raw_val) else raw_val
        results.append({
            "rank": rank,
            "id": int(row["id"]),
            "player": row["Player"],
            "slug": row["player_slug"],
            "squad": row["Squad"],
            "competition": row["competition_name"],
            "competition_id": row.get("competition_id", ""),
            "country": row["country"],
            "position": row["Pos"],
            "age": row.get("Age"),
            "minutes": int(row["Min"]),
            "matches": int(row["MP"]),
            "starts": int(row.get("Starts", 0)),
            "value": clean_val,
            "metric": metric_key,
            "goals": int(row["Gls"]),
            "assists": int(row["Ast"]),
            "xg": float(row["xG"]),
            "xag": float(row["xAG"]),
            "goals_per_90": float(row.get("Gls_90", 0.0)),
            "assists_per_90": float(row.get("Ast_90", 0.0)),
            "xg_per_90": float(row.get("xG_90", 0.0)),
            "xag_per_90": float(row.get("xAG_90", 0.0)),
            "progressive_passes": int(row["PrgP"]),
            "progressive_carries": int(row["PrgC"]),
            "finishing_differential": float(row.get("Gls_minus_xG", 0.0))
        })
    return results

def compare_players(record_ids, season=None):
    if not record_ids:
        return None

    # Limit comparison to max 5 players
    clean_ids = record_ids[:5]
    players = []
    for rid in clean_ids:
        p = data_loader.get_by_id(rid, season=season)
        if p:
            players.append(p)

    if not players:
        return None

    # Aligned comparison matrix
    metrics_to_compare = [
        {"key": "MP", "label": "Matches Played", "type": "total"},
        {"key": "Min", "label": "Minutes Played", "type": "total"},
        {"key": "Gls", "label": "Goals", "type": "total"},
        {"key": "Ast", "label": "Assists", "type": "total"},
        {"key": "G+A", "label": "Goals + Assists", "type": "total"},
        {"key": "xG", "label": "Expected Goals (xG)", "type": "expected"},
        {"key": "xAG", "label": "Expected Assisted Goals (xAG)", "type": "expected"},
        {"key": "Gls_minus_xG", "label": "Finishing Differential (Gls - xG)", "type": "differential"},
        {"key": "PrgC", "label": "Progressive Carries", "type": "progression"},
        {"key": "PrgP", "label": "Progressive Passes", "type": "progression"},
        {"key": "PrgR", "label": "Progressive Receptions", "type": "progression"},
        {"key": "Gls_90", "label": "Goals / 90", "type": "rate"},
        {"key": "Ast_90", "label": "Assists / 90", "type": "rate"},
        {"key": "xG_90", "label": "xG / 90", "type": "rate"},
        {"key": "xAG_90", "label": "xAG / 90", "type": "rate"},
        {"key": "npxG_90", "label": "npxG / 90", "type": "rate"},
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
        values = {str(p["id"]): p.get(key, 0) for p in players}
        
        # Determine best/leader value
        raw_vals = [p.get(key, 0) or 0 for p in players]
        # For cards, lower is better; for others, higher is better
        if key in ["CrdY", "CrdR"]:
            best_val = min(raw_vals) if raw_vals else 0
        else:
            best_val = max(raw_vals) if raw_vals else 0

        leaders = [str(p["id"]) for p in players if (p.get(key, 0) or 0) == best_val and best_val > 0]

        aligned_matrix.append({
            "metric": metric_meta["label"],
            "label": metric_meta["label"],
            "key": key,
            "category": metric_meta["type"],
            "values": values,
            "leaders": leaders,
            "best_value": best_val
        })

    df = data_loader.get_dataframe(season=season)
    # Compute percentile rank against European players with at least 270 mins
    qualified_peers = df[df['Min'] >= 270] if len(df) > 0 else df

    radar_data = []
    for dim in radar_dimensions:
        key = dim["key"]
        dim_values = {str(p["id"]): p.get(key, 0) for p in players}
        dim_scores = {}
        
        series = qualified_peers[key] if key in qualified_peers.columns else None
        for p in players:
            raw_val = p.get(key, 0) or 0
            if series is not None and len(series) > 0:
                try:
                    pct = round(float((series < float(raw_val)).mean() * 100), 1)
                except (ValueError, TypeError):
                    pct = 50.0
            else:
                pct = 50.0
            dim_scores[str(p["id"])] = pct

        radar_data.append({
            "dimension": dim["label"],
            "key": key,
            "values": dim_values,
            "scores": dim_scores
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

    min_500 = df[df['Min'] >= 500].copy()
    overperformers = min_500.sort_values(by='Gls_minus_xG', ascending=False).head(5)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Gls', 'xG', 'Gls_minus_xG', 'Min']
    ].to_dict(orient='records')

    underperformers = min_500.sort_values(by='Gls_minus_xG', ascending=True).head(5)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'Gls', 'xG', 'Gls_minus_xG', 'Min']
    ].to_dict(orient='records')

    progression_leaders = df.sort_values(by='PrgC', ascending=False).head(8)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'PrgC', 'PrgP', 'Min']
    ].to_dict(orient='records')

    min_450 = df[df['Min'] >= 450].copy()
    min_450['production_sum'] = min_450['xG'] + min_450['xAG']
    scatter_data = min_450.sort_values(by='production_sum', ascending=False).head(25)[
        ['id', 'Player', 'Squad', 'Pos', 'Comp', 'competition_name', 'xG', 'xAG', 'Gls', 'Ast', 'Min']
    ].to_dict(orient='records')

    return {
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
