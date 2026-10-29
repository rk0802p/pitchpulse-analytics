import urllib.parse
import pandas as pd
from services.data_loader import data_loader
from services.season_service import season_service
from services.validation_service import resolve_competition, validate_position, validate_metric, validate_pagination
from services.metric_registry import is_metric_tracked_in_era
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

    active_season = season or player.get("season") or data_loader.get_active_season()
    df_all = data_loader.get_dataframe(season=active_season)
    player_comp = player.get("Comp")
    df_comp = df_all[df_all['Comp'] == player_comp] if player_comp else df_all

    def is_metric_tracked(col):
        # 1. Check explicit documented era and competition coverage
        if not is_metric_tracked_in_era(col, active_season, player_comp):
            return False

        val = player.get(col)
        # If player's own value is None or NaN, it is not tracked / missing for this player
        if val is None or pd.isna(val):
            return False

        # If player has positive value, it is tracked
        if val > 0:
            return True

        # Player has 0.0: check if the competition actually has valid tracked records
        if len(df_comp) > 0 and col in df_comp.columns:
            return bool(df_comp[col].dropna().count() > 0 and df_comp[col].dropna().max() > 0)
        if col in df_all.columns:
            return bool(df_all[col].dropna().count() > 0 and df_all[col].dropna().max() > 0)
        return False

    is_xg_tracked = is_metric_tracked("xG") or is_metric_tracked("xG_90")
    is_xag_tracked = is_metric_tracked("xAG") or is_metric_tracked("xAG_90")
    is_npxg_tracked = is_metric_tracked("npxG") or is_metric_tracked("npxG_90")
    is_prgc_tracked = is_metric_tracked("PrgC")
    is_prgp_tracked = is_metric_tracked("PrgP")
    is_prgr_tracked = is_metric_tracked("PrgR")

    min_val = float(player.get("Min", 0) or 0)
    prgc_val = player.get("PrgC")
    prgp_val = player.get("PrgP")
    prgr_val = player.get("PrgR")
    prgc_90 = round((float(prgc_val) / min_val) * 90.0, 2) if min_val > 0 and is_prgc_tracked and prgc_val is not None and not pd.isna(prgc_val) else None
    prgp_90 = round((float(prgp_val) / min_val) * 90.0, 2) if min_val > 0 and is_prgp_tracked and prgp_val is not None and not pd.isna(prgp_val) else None
    prgr_90 = round((float(prgr_val) / min_val) * 90.0, 2) if min_val > 0 and is_prgr_tracked and prgr_val is not None and not pd.isna(prgr_val) else None

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
            "born": player["Born"],
            "matches_played": player["MP"],
            "starts": player["Starts"],
            "minutes": player["Min"],
            "nineties": player["90s"]
        },
        "playing_time": {
            "matches_played": player["MP"],
            "starts": player["Starts"],
            "minutes": player["Min"],
            "nineties": player["90s"]
        },
        "totals": {
            "goals": player["Gls"],
            "assists": player["Ast"],
            "goals_plus_assists": player["G+A"],
            "non_penalty_goals": player["G-PK"],
            "penalty_goals": player["PK"],
            "penalties_attempted": player["PKatt"],
            "yellow_cards": player["CrdY"],
            "red_cards": player["CrdR"],
            "expected_goals": player["xG"] if is_xg_tracked else None,
            "non_penalty_xg": player["npxG"] if is_npxg_tracked else None,
            "expected_assists": player["xAG"] if is_xag_tracked else None,
            "npxg_plus_xag": player["npxG+xAG"] if (is_npxg_tracked and is_xag_tracked) else None,
            "progressive_carries": player["PrgC"] if is_prgc_tracked else None,
            "progressive_passes": player["PrgP"] if is_prgp_tracked else None,
            "progressive_receptions": player["PrgR"] if is_prgr_tracked else None
        },
        "scoring": {
            "goals": player["Gls"],
            "non_penalty_goals": player["G-PK"],
            "penalty_goals": player["PK"],
            "penalties_attempted": player["PKatt"],
            "expected_goals": player["xG"] if is_xg_tracked else None,
            "non_penalty_xg": player["npxG"] if is_npxg_tracked else None,
            "goals_minus_xg": player.get("Gls_minus_xG") if is_xg_tracked else None
        },
        "playmaking": {
            "assists": player["Ast"],
            "goals_plus_assists": player["G+A"],
            "expected_assists": player["xAG"] if is_xag_tracked else None,
            "npxg_plus_xag": player["npxG+xAG"] if (is_npxg_tracked and is_xag_tracked) else None
        },
        "progression": {
            "progressive_carries": player["PrgC"] if is_prgc_tracked else None,
            "progressive_passes": player["PrgP"] if is_prgp_tracked else None,
            "progressive_receptions": player["PrgR"] if is_prgr_tracked else None
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
            "xg_per_90": player["xG_90"] if is_xg_tracked else None,
            "xag_per_90": player["xAG_90"] if is_xag_tracked else None,
            "xg_plus_xag_per_90": player["xG+xAG_90"] if is_xg_tracked else None,
            "npxg_per_90": player["npxG_90"] if is_npxg_tracked else None,
            "npxg_plus_xag_per_90": player["npxG+xAG_90"] if is_npxg_tracked else None,
            "progressive_carries_per_90": prgc_90,
            "progressive_passes_per_90": prgp_90,
            "progressive_receptions_per_90": prgr_90
        },
        "raw_record": player,
        "season": player.get("season", active_season),
        "is_quarantined": season_service.is_season_quarantined(player.get("season", active_season)),
        "dataset_status": "quarantined" if season_service.is_season_quarantined(player.get("season", active_season)) else "verified_historical",
        "quarantine_reason": (season_service.get_season_manifest(player.get("season", active_season)) or {}).get("quarantine_reason") if season_service.is_season_quarantined(player.get("season", active_season)) else None
    }

    # Positional peer percentile benchmarks (min 270 mins threshold)
    pos_clean = player["Pos"].split(',')[0].strip() if player["Pos"] else "MF"
    peers = df_all[(df_all['Pos'].str.contains(pos_clean, na=False)) & (df_all['Min'] >= 270)]
    if len(peers) == 0:
        peers = df_all[df_all['Min'] >= 270]

    def get_pct(col, base_metric=None):
        check_col = base_metric or col
        if not is_metric_tracked(check_col):
            return None, False, 0

        # Filter peers to competitions that tracked this metric in this era
        tracked_comps = [c for c in df_all['Comp'].unique() if is_metric_tracked_in_era(check_col, active_season, c)]
        valid_peers = peers[peers['Comp'].isin(tracked_comps)]
        valid_peers = valid_peers[valid_peers[col].notna()]
        n_peers = len(valid_peers)
        if n_peers == 0:
            return None, False, 0

        val = player.get(col)
        if val is None or pd.isna(val):
            return None, False, n_peers

        # Empirical mid-rank percentile CDF
        strictly_lower = (valid_peers[col] < val).sum()
        strictly_equal = (valid_peers[col] == val).sum()
        pct = int(round(((strictly_lower + 0.5 * strictly_equal) / n_peers) * 100))
        pct = max(0, min(100, pct))
        return pct, True, int(n_peers)

    pct_gls, trk_gls, n_gls = get_pct("Gls_90", "Gls")
    pct_xg, trk_xg, n_xg = get_pct("xG_90", "xG")
    pct_ast, trk_ast, n_ast = get_pct("Ast_90", "Ast")
    pct_xag, trk_xag, n_xag = get_pct("xAG_90", "xAG")
    pct_prgc, trk_prgc, n_prgc = get_pct("PrgC", "PrgC")
    pct_prgp, trk_prgp, n_prgp = get_pct("PrgP", "PrgP")
    pct_prgr, trk_prgr, n_prgr = get_pct("PrgR", "PrgR")

    profile["percentiles"] = {
        "goals_per_90": {"value": player["Gls_90"], "percentile": pct_gls, "is_tracked": trk_gls, "label": "Goals / 90", "sample_size": n_gls},
        "xg_per_90": {"value": player["xG_90"] if trk_xg else None, "percentile": pct_xg, "is_tracked": trk_xg, "label": "Shot Threat (xG/90)", "sample_size": n_xg},
        "assists_per_90": {"value": player["Ast_90"], "percentile": pct_ast, "is_tracked": trk_ast, "label": "Assists / 90", "sample_size": n_ast},
        "xag_per_90": {"value": player["xAG_90"] if trk_xag else None, "percentile": pct_xag, "is_tracked": trk_xag, "label": "Creation Quality (xAG/90)", "sample_size": n_xag},
        "progressive_carries": {"value": player["PrgC"] if trk_prgc else None, "percentile": pct_prgc, "is_tracked": trk_prgc, "label": "Prog. Carries", "sample_size": n_prgc},
        "progressive_passes": {"value": player["PrgP"] if trk_prgp else None, "percentile": pct_prgp, "is_tracked": trk_prgp, "label": "Prog. Passes", "sample_size": n_prgp},
        "progressive_receptions": {"value": player["PrgR"] if trk_prgr else None, "percentile": pct_prgr, "is_tracked": trk_prgr, "label": "Prog. Receptions", "sample_size": n_prgr},
        "peer_sample_size": int(len(peers)),
        "comparison_position": pos_clean
    }

    return profile
