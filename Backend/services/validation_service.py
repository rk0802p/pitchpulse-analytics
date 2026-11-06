import re
import os
import urllib.parse
from config import COMPETITION_LOOKUP, METRIC_DEFINITIONS

VALID_POSITIONS = {'GK', 'DF', 'MF', 'FW', 'DF,MF', 'MF,DF', 'MF,FW', 'FW,MF', 'DF,FW', 'FW,DF'}

def validate_season_id(season_param, seasons_dir=None, must_exist=False):
    """
    Validates and canonicalizes a season identifier (e.g. '2024-2025', '2024/25', '24/25').
    Rejects path traversal (.., /, \\) and malformed season formats.
    Returns canonical 'YYYY-YYYY' string or None if invalid.
    If must_exist=True and seasons_dir is provided, also checks directory existence.
    """
    if not season_param:
        return None
    cleaned = str(season_param).strip()
    # Reject directory traversal attempts and null bytes early
    if '..' in cleaned or '\\' in cleaned or '\0' in cleaned:
        return None

    # Handle forward slashes: only permitted as a year separator, e.g. 2024/2025 or 2024/25
    if '/' in cleaned:
        parts = cleaned.split('/')
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
            return None

    canonical = None
    m_full = re.match(r'^(\d{4})-(\d{4})$', cleaned)
    if m_full:
        start, end = int(m_full.group(1)), int(m_full.group(2))
        if end == start + 1:
            canonical = f"{start:04d}-{end:04d}"
    else:
        m_slash = re.match(r'^(\d{4})[/-](\d{2,4})$', cleaned)
        if m_slash:
            start_str, end_str = m_slash.group(1), m_slash.group(2)
            start = int(start_str)
            if len(end_str) == 2:
                end = int(start_str[:2] + end_str)
            else:
                end = int(end_str)
            if end == start + 1:
                canonical = f"{start:04d}-{end:04d}"
        else:
            m_short = re.match(r'^(\d{2})[/-](\d{2})$', cleaned)
            if m_short:
                start = 2000 + int(m_short.group(1))
                end = 2000 + int(m_short.group(2))
                if end == start + 1:
                    canonical = f"{start:04d}-{end:04d}"

    if not canonical:
        return None

    if seasons_dir:
        abs_base = os.path.abspath(seasons_dir)
        target = os.path.abspath(os.path.join(abs_base, canonical))
        # Ensure path containment strictly within seasons_dir
        if not target.startswith(abs_base + os.sep) and target != abs_base:
            return None
        if must_exist and not os.path.isdir(target):
            return None

    return canonical

def resolve_competition(comp_param):
    """Maps competition param (raw name, short name, or slug) to raw dataset name."""
    if not comp_param:
        return None
    decoded = urllib.parse.unquote(str(comp_param)).strip()
    key = decoded.lower()
    if key in COMPETITION_LOOKUP:
        return COMPETITION_LOOKUP[key]
    key_clean = key.replace('-', ' ').replace('_', ' ')
    if key_clean in COMPETITION_LOOKUP:
        return COMPETITION_LOOKUP[key_clean]
    for lookup_k, v in COMPETITION_LOOKUP.items():
        if lookup_k == key or lookup_k.endswith(key) or key.endswith(lookup_k):
            return v
    return None

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
