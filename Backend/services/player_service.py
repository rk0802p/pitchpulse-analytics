import urllib.parse
import pandas as pd
from services.data_loader import data_loader
from services.validation_service import resolve_competition, validate_position, validate_metric, validate_pagination
from config import COMPETITIONS

def get_competitions_summary(season=None):
    df = data_loader.get_dataframe(season=season)
    summary = []
    # Dynamically derive competitions directly from loaded season data
    available_comps = sorted(df['Comp'].dropna().unique().tolist())
    for raw_name in available_comps:
        info = COMPETITIONS.get(raw_name, {
            "id": raw_name.lower().replace(' ', '-'),
            "name": raw_name,
            "country": "Europe",
            "code": raw_name[:3].upper()
        })
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

def get_teams_by_competition(competition=None, season=None):
    df = data_loader.get_dataframe(season=season)
    if competition:
        resolved_comp = resolve_competition(competition)
        if resolved_comp:
            df = df[df['Comp'] == resolved_comp]
        else:
            return []
    return sorted(df['Squad'].unique().tolist())

def search_players(search=None, competition=None, squad=None, position=None,
                   min_minutes=0, sort_by="Gls", order="desc", page=1, limit=50, season=None):
    df = data_loader.get_dataframe(season=season)

    # Filter by competition
    if competition:
        resolved = resolve_competition(competition)
        if resolved:
            df = df[df['Comp'] == resolved]
        else:
            return [], 0

    # Filter by squad
    if squad:
        squad_decoded = urllib.parse.unquote(str(squad)).strip().lower()
        df = df[df['Squad'].str.lower() == squad_decoded]

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

def get_player_profile(record_id, season=None):
    player = data_loader.get_by_id(record_id, season=season)
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
            "competition_id": player.get("competition_id", ""),
            "country": player["country"],
            "age": player["Age"],
            "born": player["Born"]
        },
        "playing_time": {
            "matches_played": player["MP"],
            "starts": player["Starts"],
            "minutes": player["Min"],
            "nineties": player["90s"]
        },
        "scoring": {
            "goals": player["Gls"],
            "non_penalty_goals": player["G-PK"],
            "penalty_goals": player["PK"],
            "penalties_attempted": player["PKatt"],
            "xg": player["xG"],
            "npxg": player["npxG"],
            "goals_minus_xg": player["Gls_minus_xG"]
        },
        "playmaking": {
            "assists": player["Ast"],
            "xag": player["xAG"],
            "assists_minus_xag": player["Ast_minus_xAG"],
            "goals_plus_assists": player["G+A"],
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
            "goals_plus_assists_per_90": player["G+A_90"],
            "non_penalty_goals_per_90": player["G-PK_90"],
            "goals_plus_assists_non_pk_per_90": player["G+A-PK_90"],
            "xg_per_90": player["xG_90"],
            "xag_per_90": player["xAG_90"],
            "xg_plus_xag_per_90": player["xG+xAG_90"],
            "npxg_per_90": player["npxG_90"],
            "npxg_plus_xag_per_90": player["npxG+xAG_90"]
        },
        "raw_record": player
    }

    # Positional peer percentile benchmarks (min 270 mins threshold)
    pos_clean = player["Pos"].split(',')[0].strip() if player["Pos"] else "MF"
    df_all = data_loader.get_dataframe(season=season)
    peers = df_all[(df_all['Pos'].str.contains(pos_clean, na=False)) & (df_all['Min'] >= 270)]
    if len(peers) == 0:
        peers = df_all[df_all['Min'] >= 270]

    def get_pct(col):
        val = player.get(col, 0)
        if val is None or len(peers) == 0:
            return 50
        return int(round((peers[col] < val).mean() * 100))

    profile["percentiles"] = {
        "goals_per_90": {"value": player["Gls_90"], "percentile": get_pct("Gls_90"), "label": "Goals / 90"},
        "xg_per_90": {"value": player["xG_90"], "percentile": get_pct("xG_90"), "label": "Shot Threat (xG/90)"},
        "assists_per_90": {"value": player["Ast_90"], "percentile": get_pct("Ast_90"), "label": "Assists / 90"},
        "xag_per_90": {"value": player["xAG_90"], "percentile": get_pct("xAG_90"), "label": "Creation Quality (xAG/90)"},
        "progressive_carries": {"value": player["PrgC"], "percentile": get_pct("PrgC"), "label": "Prog. Carries"},
        "progressive_passes": {"value": player["PrgP"], "percentile": get_pct("PrgP"), "label": "Prog. Passes"},
        "progressive_receptions": {"value": player["PrgR"], "percentile": get_pct("PrgR"), "label": "Prog. Receptions"},
        "peer_sample_size": int(len(peers)),
        "comparison_position": pos_clean
    }

    return profile
