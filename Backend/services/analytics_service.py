import pandas as pd
from services.data_loader import data_loader
from services.validation_service import resolve_competition, validate_metric

def get_leaderboard(metric="Gls", competition=None, position=None, min_minutes=0, limit=10):
    df = data_loader.get_dataframe()
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
        results.append({
            "rank": rank,
            "id": int(row["id"]),
            "player": row["Player"],
            "slug": row["player_slug"],
            "squad": row["Squad"],
            "competition": row["competition_name"],
            "country": row["country"],
            "position": row["Pos"],
            "minutes": int(row["Min"]),
            "matches": int(row["MP"]),
            "value": row[metric_key],
            "metric": metric_key,
            "goals": int(row["Gls"]),
            "assists": int(row["Ast"]),
            "xg": float(row["xG"]),
            "xag": float(row["xAG"]),
            "progressive_passes": int(row["PrgP"]),
            "progressive_carries": int(row["PrgC"])
        })
    return results

def compare_players(record_ids):
    if not record_ids:
        return None

    # Limit comparison to max 5 players
    clean_ids = record_ids[:5]
    players = []
    for rid in clean_ids:
        p = data_loader.get_by_id(rid)
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
        {"key": "Gls_90", "label": "Finishing (Gls/90)"},
        {"key": "xG_90", "label": "Shot Quality (xG/90)"},
        {"key": "Ast_90", "label": "Creation (Ast/90)"},
        {"key": "xAG_90", "label": "Chance Quality (xAG/90)"},
        {"key": "PrgP", "label": "Prog. Passing (PrgP)"},
        {"key": "PrgC", "label": "Ball Carrying (PrgC)"}
    ]

    aligned_matrix = []
    for m in metrics_to_compare:
        aligned_matrix.append({
            "key": m["key"],
            "label": m["label"],
            "category": m["type"],
            "values": {str(p["id"]): p.get(m["key"], 0) for p in players}
        })

    radar_data = []
    for dim in radar_dimensions:
        radar_data.append({
            "dimension": dim["label"],
            "key": dim["key"],
            "values": {str(p["id"]): p.get(dim["key"], 0) for p in players}
        })

    return {
        "players": players,
        "metrics": aligned_matrix,
        "radar": radar_data
    }
