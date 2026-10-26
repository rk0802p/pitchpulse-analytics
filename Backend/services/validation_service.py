from config import COMPETITION_LOOKUP, METRIC_DEFINITIONS

VALID_POSITIONS = {'GK', 'DF', 'MF', 'FW', 'DF,MF', 'MF,DF', 'MF,FW', 'FW,MF', 'DF,FW', 'FW,DF'}

def resolve_competition(comp_param):
    """Maps competition param (raw name, short name, or slug) to raw dataset name."""
    if not comp_param:
        return None
    key = str(comp_param).strip().lower()
    return COMPETITION_LOOKUP.get(key)

def validate_position(pos_param):
    if not pos_param:
        return None
    pos = str(pos_param).strip().upper()
    return pos if pos in VALID_POSITIONS or any(p in pos for p in ['GK', 'DF', 'MF', 'FW']) else None

def validate_metric(metric_param, default="Gls"):
    if not metric_param:
        return default
    cleaned = str(metric_param).strip()
    # Normalize common aliases
    alias_map = {
        "goals": "Gls",
        "assists": "Ast",
        "minutes": "Min",
        "matches": "MP",
        "xg": "xG",
        "xag": "xAG",
        "npxg": "npxG",
        "prgc": "PrgC",
        "prgp": "PrgP",
        "prgr": "PrgR"
    }
    metric_key = alias_map.get(cleaned.lower(), cleaned)
    if metric_key in METRIC_DEFINITIONS or metric_key in ['Gls_minus_xG', 'Ast_minus_xAG', 'xG_minus_Gls']:
        return metric_key
    return default

def validate_pagination(page_str, limit_str, default_page=1, default_limit=50, max_limit=500):
    try:
        page = int(page_str) if page_str is not None else default_page
        if page < 1:
            page = 1
    except (ValueError, TypeError):
        page = default_page

    try:
        limit = int(limit_str) if limit_str is not None else default_limit
        if limit < 1:
            limit = 1
        elif limit > max_limit:
            limit = max_limit
    except (ValueError, TypeError):
        limit = default_limit

    return page, limit
