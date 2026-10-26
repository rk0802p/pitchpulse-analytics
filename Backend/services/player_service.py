import pandas as pd
from services.data_loader import data_loader
from services.validation_service import resolve_competition, validate_position, validate_metric, validate_pagination
from config import COMPETITIONS

def get_competitions_summary():
    df = data_loader.get_dataframe()
    summary = []
    for raw_name, info in COMPETITIONS.items():
        comp_df = df[df['Comp'] == raw_name]
        summary.append({
            "id": info["id"],
            "name": info["name"],
            "raw_name": raw_name,
            "country": info["country"],
            "code": info["code"],
            "teams_count": int(comp_df['Squad'].nunique()),
            "players_count": int(len(comp_df)),
            "total_goals": int(comp_df['Gls'].sum()),
            "total_assists": int(comp_df['Ast'].sum()),
            "total_matches": int(comp_df['MP'].sum())
        })
    return summary

def get_teams_by_competition(competition=None):
    df = data_loader.get_dataframe()
    if competition:
        resolved_comp = resolve_competition(competition)
        if resolved_comp:
            df = df[df['Comp'] == resolved_comp]
        else:
            return []
    return sorted(df['Squad'].unique().tolist())

def search_players(search=None, competition=None, squad=None, position=None,
                   min_minutes=0, sort_by="Gls", order="desc", page=1, limit=50):
    df = data_loader.get_dataframe()

    # Filter by competition
    if competition:
        resolved = resolve_competition(competition)
        if resolved:
            df = df[df['Comp'] == resolved]
        else:
            return [], 0

    # Filter by squad
    if squad:
        df = df[df['Squad'].str.lower() == squad.strip().lower()]

    # Filter by position
    if position:
        pos_clean = position.strip().upper()
        df = df[df['Pos'].str.contains(pos_clean, na=False, case=False)]

    # Filter by minimum minutes
    if min_minutes and min_minutes > 0:
        df = df[df['Min'] >= min_minutes]

    # Search by player name or squad
    if search:
        search_term = str(search).strip().lower()
        df = df[df['Player'].str.lower().str.contains(search_term, na=False) |
                df['Squad'].str.lower().str.contains(search_term, na=False)]

    total_count = len(df)
    if total_count == 0:
        return [], 0

    # Sorting
    metric = validate_metric(sort_by, default="Gls")
    ascending = (str(order).lower() == "asc")
    if metric in df.columns:
        df = df.sort_values(by=metric, ascending=ascending)

    # Pagination slice
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_df = df.iloc[start_idx:end_idx]

    return paginated_df.to_dict(orient='records'), total_count

def get_player_profile(record_id):
    player = data_loader.get_by_id(record_id)
    if not player:
        return None

    # Structured profile breakdown
    profile = {
        "identity": {
            "id": player["id"],
            "record_id": player["record_id"],
            "rk": player["Rk"],
            "name": player["Player"],
            "slug": player["player_slug"],
            "nation": player["Nation"],
            "position": player["Pos"],
            "squad": player["Squad"],
            "competition": player["competition_name"],
            "competition_id": player["competition_id"],
            "country": player["country"],
            "age": player["Age"],
            "born": player["Born"]
        },
        "playing_time": {
            "matches_played": player["MP"],
            "starts": player["Starts"],
            "minutes": player["Min"],
            "ninetys": player["90s"]
        },
        "scoring": {
            "goals": player["Gls"],
            "goals_non_penalty": player["G-PK"],
            "penalties_made": player["PK"],
            "penalties_attempted": player["PKatt"],
            "expected_goals": player["xG"],
            "non_penalty_xg": player["npxG"],
            "finishing_differential": player["Gls_minus_xG"]
        },
        "playmaking": {
            "assists": player["Ast"],
            "goals_plus_assists": player["G+A"],
            "expected_assisted_goals": player["xAG"],
            "assists_differential": player["Ast_minus_xAG"],
            "npxg_plus_xag": player["npxG+xAG"]
        },
        "progression": {
            "progressive_carries": player["PrgC"],
            "progressive_passes": player["PrgP"],
            "progressive_receptions": player["PrgR"]
        },
        "discipline": {
            "yellow_cards": player["CrdY"],
            "red_cards": player["CrdR"]
        },
        "per_90_rates": {
            "goals_per_90": player["Gls_90"],
            "assists_per_90": player["Ast_90"],
            "ga_per_90": player["G+A_90"],
            "xg_per_90": player["xG_90"],
            "xag_per_90": player["xAG_90"],
            "xg_plus_xag_per_90": player["xG+xAG_90"],
            "npxg_per_90": player["npxG_90"],
            "npxg_plus_xag_per_90": player["npxG+xAG_90"]
        },
        "raw_record": player
    }
    return profile
