"""
PitchPulse Analytics — Maintainable Metric-to-Source Registry

Maps every application metric to suitable source candidates, acquisition methods,
licensing constraints, derivation formulas, and historical season coverage.
"""

from typing import Dict, Any, List

METRIC_SOURCE_REGISTRY: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------
    # 1. PLAYING TIME & DEMOGRAPHICS
    # -------------------------------------------------------------
    "minutes": {
        "display_name": "Minutes Played",
        "category": "Playing Time",
        "source_fields": ["Min", "Minutes", "mins", "minutes_played"],
        "preferred_source": "FBref / Transfermarkt / Official Match Sheets",
        "alternative_source": "API-Football / Football-Data.co.uk",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Aggregated seasonal match logs",
        "license_terms": "Public historical domain / Fair Use sports stats",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer >= 0; typical regular season maximum ~3420 mins (38 matches * 90)",
        "current_coverage": "100% across all 14 seasons"
    },
    "matches_played": {
        "display_name": "Appearances",
        "category": "Playing Time",
        "source_fields": ["MP", "Matches", "apps", "appearances"],
        "preferred_source": "FBref / Transfermarkt",
        "alternative_source": "Understat / API-Football",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Official match sheets",
        "license_terms": "Public historical domain",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer between 0 and 38",
        "current_coverage": "100% across all 14 seasons"
    },
    "nineties": {
        "display_name": "90s Played",
        "category": "Playing Time",
        "source_fields": ["90s", "nineties"],
        "preferred_source": "Derived mathematically from minutes",
        "alternative_source": "FBref standard table",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Computed dynamically",
        "license_terms": "Internal calculation",
        "source_url": "https://fbref.com/",
        "is_derived": True,
        "derivation_formula": "round(Min / 90.0, 1)",
        "validation_rules": "Float >= 0.0; equals Min / 90.0 within 0.1 tolerance",
        "current_coverage": "100% across all 14 seasons"
    },

    # -------------------------------------------------------------
    # 2. SCORING & SHOOTING METRICS
    # -------------------------------------------------------------
    "goals": {
        "display_name": "Goals",
        "category": "Scoring",
        "source_fields": ["Gls", "Goals", "goals_scored"],
        "preferred_source": "FBref / Transfermarkt / Understat",
        "alternative_source": "Football-Data.co.uk / API-Football",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Official league aggregate records",
        "license_terms": "Public historical sports data",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer >= 0; non-penalty goals + penalty goals",
        "current_coverage": "100% across all 14 seasons"
    },
    "goals_per_90": {
        "display_name": "Goals per 90",
        "category": "Scoring",
        "source_fields": ["Gls_90", "Gls/90", "goals_per_90"],
        "preferred_source": "Derived mathematically from Goals and Minutes",
        "alternative_source": "FBref per-90 summary tables",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Dynamically derived if Min > 0, preserving valid source decimals",
        "license_terms": "Internal calculation",
        "source_url": "https://fbref.com/",
        "is_derived": True,
        "derivation_formula": "(Gls / Min) * 90.0",
        "validation_rules": "Float >= 0.0; valid only when Min > 0",
        "current_coverage": "100% across all 14 seasons"
    },
    "expected_goals": {
        "display_name": "Expected Goals (xG)",
        "category": "Scoring",
        "source_fields": ["xG", "expected_goals", "xg"],
        "preferred_source": "Understat (2014-2023) / FBref via StatsBomb (2023-2025)",
        "alternative_source": "StatsBomb Open Data (event-level model)",
        "supported_seasons": "2014-2026 (Untracked in 2012-2014 era)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Shot-level probability aggregation",
        "license_terms": "Understat (research / non-commercial); StatsBomb (CC-BY-4.0)",
        "source_url": "https://understat.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Float >= 0.0; sum of individual shot probabilities (0 to 1)",
        "current_coverage": "Tracked from 2014-2015 onward; untracked in 2012-2014"
    },
    "expected_goals_per_90": {
        "display_name": "Shot Threat (xG/90)",
        "category": "Scoring",
        "source_fields": ["xG_90", "xG/90", "xg_per_90"],
        "preferred_source": "Derived mathematically from xG and Minutes",
        "alternative_source": "FBref / Understat rate tables",
        "supported_seasons": "2014-2026 (Untracked in 2012-2014 era)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Dynamically derived: (xG / Min) * 90.0 when xG is valid and Min > 0",
        "license_terms": "Internal calculation",
        "source_url": "https://understat.com/",
        "is_derived": True,
        "derivation_formula": "(xG / Min) * 90.0",
        "validation_rules": "Float >= 0.0; null/None when xG is untracked or Min <= 0",
        "current_coverage": "Tracked from 2014-2015 onward; untracked in 2012-2014"
    },
    "non_penalty_expected_goals": {
        "display_name": "Non-Penalty xG (npxG)",
        "category": "Scoring",
        "source_fields": ["npxG", "npxg"],
        "preferred_source": "Understat / FBref",
        "alternative_source": "StatsBomb Open Data",
        "supported_seasons": "2014-2026",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Shot-level probability aggregation excluding penalties",
        "license_terms": "Understat / StatsBomb Open Data",
        "source_url": "https://understat.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Float >= 0.0; npxG <= xG",
        "current_coverage": "Tracked from 2014-2015 onward"
    },
    "goals_minus_xg": {
        "display_name": "Finishing Differential (G - xG)",
        "category": "Scoring",
        "source_fields": ["Gls_minus_xG", "G-xG"],
        "preferred_source": "Derived mathematically",
        "alternative_source": "FBref shooting table",
        "supported_seasons": "2014-2026",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Computed dynamically: Gls - xG",
        "license_terms": "Internal calculation",
        "source_url": "https://fbref.com/",
        "is_derived": True,
        "derivation_formula": "round(Gls - xG, 2)",
        "validation_rules": "Float; positive denotes overperformance, negative underperformance",
        "current_coverage": "Tracked from 2014-2015 onward"
    },

    # -------------------------------------------------------------
    # 3. PLAYMAKING & CREATION METRICS
    # -------------------------------------------------------------
    "assists": {
        "display_name": "Assists",
        "category": "Creation",
        "source_fields": ["Ast", "Assists", "assists"],
        "preferred_source": "FBref / Transfermarkt / Understat",
        "alternative_source": "Football-Data.co.uk / API-Football",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Official league records",
        "license_terms": "Public historical domain",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer >= 0",
        "current_coverage": "100% across all 14 seasons"
    },
    "assists_per_90": {
        "display_name": "Assists per 90",
        "category": "Creation",
        "source_fields": ["Ast_90", "Ast/90", "assists_per_90"],
        "preferred_source": "Derived mathematically from Assists and Minutes",
        "alternative_source": "FBref standard tables",
        "supported_seasons": "2012-2026 (All 14 seasons)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Dynamically derived: (Ast / Min) * 90.0",
        "license_terms": "Internal calculation",
        "source_url": "https://fbref.com/",
        "is_derived": True,
        "derivation_formula": "(Ast / Min) * 90.0",
        "validation_rules": "Float >= 0.0; valid when Min > 0",
        "current_coverage": "100% across all 14 seasons"
    },
    "expected_assisted_goals": {
        "display_name": "Expected Assisted Goals (xAG)",
        "category": "Creation",
        "source_fields": ["xAG", "expected_assisted_goals", "xag", "xA"],
        "preferred_source": "FBref via StatsBomb (2023-2025) / Understat xA proxy (2014-2023)",
        "alternative_source": "StatsBomb Open Data (pass-event xG proxy)",
        "supported_seasons": "2014-2026 (Untracked in 2012-2014)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Shot-creating pass xG evaluation",
        "license_terms": "Understat / StatsBomb CC-BY-4.0",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Float >= 0.0",
        "current_coverage": "Tracked from 2014-2015 onward; untracked in 2012-2014"
    },
    "expected_assisted_goals_per_90": {
        "display_name": "Creation Quality (xAG/90)",
        "category": "Creation",
        "source_fields": ["xAG_90", "xAG/90", "xag_per_90"],
        "preferred_source": "Derived mathematically from xAG and Minutes",
        "alternative_source": "FBref passing tables",
        "supported_seasons": "2014-2026 (Untracked in 2012-2014)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Dynamically derived: (xAG / Min) * 90.0 when xAG is valid and Min > 0",
        "license_terms": "Internal calculation",
        "source_url": "https://fbref.com/",
        "is_derived": True,
        "derivation_formula": "(xAG / Min) * 90.0",
        "validation_rules": "Float >= 0.0; null/None when xAG is untracked",
        "current_coverage": "Tracked from 2014-2015 onward; untracked in 2012-2014"
    },
    "xg_plus_xag_per_90": {
        "display_name": "Expected Goal Involvements (xG+xAG/90)",
        "category": "Creation",
        "source_fields": ["xG+xAG_90", "npxG+xAG_90"],
        "preferred_source": "Derived mathematically",
        "alternative_source": "FBref composite tables",
        "supported_seasons": "2014-2026",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Computed dynamically: xG_90 + xAG_90",
        "license_terms": "Internal calculation",
        "source_url": "https://fbref.com/",
        "is_derived": True,
        "derivation_formula": "xG_90 + xAG_90",
        "validation_rules": "Float >= 0.0",
        "current_coverage": "Tracked from 2014-2015 onward"
    },

    # -------------------------------------------------------------
    # 4. PROGRESSION & SPATIAL TRACKING
    # -------------------------------------------------------------
    "progressive_carries": {
        "display_name": "Progressive Carries (PrgC)",
        "category": "Progression",
        "source_fields": ["PrgC", "progressive_carries", "prgc"],
        "preferred_source": "FBref via StatsBomb / Opta tracking data",
        "alternative_source": "StatsBomb Open Data (event carry coordinates)",
        "supported_seasons": "2023-2025 (Completed); partially present in 2025/26 (FR/IT only)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Spatial tracking of carries advancing ball >=10 yards towards opponent goal line",
        "license_terms": "FBref / StatsBomb",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer >= 0; untracked across 2012-2023 historical era",
        "current_coverage": "Fully authentic in 2023-2024 & 2024-2025; untracked in 2012-2023"
    },
    "progressive_passes": {
        "display_name": "Progressive Passes (PrgP)",
        "category": "Progression",
        "source_fields": ["PrgP", "progressive_passes", "prgp"],
        "preferred_source": "FBref via StatsBomb / Opta tracking data",
        "alternative_source": "StatsBomb Open Data (event pass coordinates)",
        "supported_seasons": "2023-2025 (Completed); partially present in 2025/26 (FR/IT only)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Completed passes moving ball >=10 yards towards opponent goal line from furthest point in last 6 passes",
        "license_terms": "FBref / StatsBomb",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer >= 0; untracked across 2012-2023 historical era",
        "current_coverage": "Fully authentic in 2023-2024 & 2024-2025; untracked in 2012-2023"
    },
    "progressive_receptions": {
        "display_name": "Progressive Receptions (PrgR)",
        "category": "Progression",
        "source_fields": ["PrgR", "progressive_receptions", "prgr"],
        "preferred_source": "FBref via StatsBomb",
        "alternative_source": "StatsBomb Open Data",
        "supported_seasons": "2023-2025 (Completed)",
        "supported_competitions": ["eng Premier League", "es La Liga", "it Serie A", "de Bundesliga", "fr Ligue 1"],
        "acquisition_method": "Completed passes received that moved ball >=10 yards towards opponent goal",
        "license_terms": "FBref / StatsBomb",
        "source_url": "https://fbref.com/",
        "is_derived": False,
        "derivation_formula": None,
        "validation_rules": "Integer >= 0; untracked across 2012-2023 and 2025-2026",
        "current_coverage": "Fully authentic in 2023-2024 & 2024-2025; untracked in 2012-2023 and 2025/26"
    }
}


def get_metric_registry() -> Dict[str, Dict[str, Any]]:
    """Returns the full metric source registry."""
    return METRIC_SOURCE_REGISTRY


def get_metric_info(metric_key: str) -> Dict[str, Any]:
    """Returns metadata for a specific metric."""
    return METRIC_SOURCE_REGISTRY.get(metric_key, {
        "display_name": metric_key,
        "category": "General",
        "is_derived": False,
        "validation_rules": "Unknown"
    })


ERA_METRIC_COVERAGE: Dict[str, Any] = {
    # 2012-2013 and 2013-2014: Pre-xG Historical Era (Standard stats only; xG and progression untracked)
    "pre_xg_historical_era": {
        "seasons": ["2012-2013", "2013-2014"],
        "tracked_metrics": [
            "Min", "MP", "Starts", "90s", "Gls", "Ast", "G+A", 
            "G-PK", "PK", "PKatt", "CrdY", "CrdR", "Gls_90", "Ast_90", "G+A_90"
        ],
        "untracked_metrics": [
            "xG", "xAG", "npxG", "npxG+xAG", "xG_90", "xAG_90", "npxG_90", 
            "PrgC", "PrgP", "PrgR", "Gls_minus_xG", "Ast_minus_xAG"
        ]
    },
    # 2014-2015 through 2022-2023: Early xG Era (Understat shot-level xG tracked; spatial progression PrgC/PrgP/PrgR untracked)
    "early_xg_historical_era": {
        "seasons": [
            "2014-2015", "2015-2016", "2016-2017", "2017-2018", 
            "2018-2019", "2019-2020", "2020-2021", "2021-2022", "2022-2023"
        ],
        "tracked_metrics": [
            "Min", "MP", "Starts", "90s", "Gls", "Ast", "G+A", 
            "G-PK", "PK", "PKatt", "CrdY", "CrdR", "Gls_90", "Ast_90", "G+A_90",
            "xG", "npxG", "xAG", "xG_90", "xAG_90", "npxG_90", "Gls_minus_xG"
        ],
        "untracked_metrics": [
            "PrgC", "PrgP", "PrgR"
        ]
    },
    # 2023-2024 and 2024-2025: Modern Tracking Era (FBref via StatsBomb; standard, xG, xAG, and progression all tracked)
    "modern_verified_era": {
        "seasons": ["2023-2024", "2024-2025"],
        "tracked_metrics": [
            "Min", "MP", "Starts", "90s", "Gls", "Ast", "G+A", 
            "G-PK", "PK", "PKatt", "CrdY", "CrdR", "Gls_90", "Ast_90", "G+A_90",
            "xG", "xAG", "npxG", "npxG+xAG", "xG_90", "xAG_90", "npxG_90", 
            "PrgC", "PrgP", "PrgR", "Gls_minus_xG", "Ast_minus_xAG"
        ],
        "untracked_metrics": []
    },
    # 2025-2026: Modern Regular Season Era (FBref + FotMob)
    "modern_regular_era_2025": {
        "seasons": ["2025-2026"],
        "tracked_metrics": [
            "Min", "MP", "Starts", "90s", "Gls", "Ast", "G+A", 
            "G-PK", "PK", "PKatt", "CrdY", "CrdR", "Gls_90", "Ast_90", "G+A_90",
            "xG", "xAG", "npxG", "npxG+xAG", "xG_90", "xAG_90", "npxG_90", 
            "PrgC", "PrgP", "PrgR", "Gls_minus_xG", "Ast_minus_xAG"
        ],
        # Progression untracked in Premier League, Bundesliga, and La Liga in 2025/26 source feed
        "competition_overrides": {
            "eng Premier League": {
                "untracked": ["PrgC", "PrgP", "PrgR"]
            },
            "de Bundesliga": {
                "untracked": ["PrgC", "PrgP", "PrgR"]
            },
            "es La Liga": {
                "untracked": ["PrgC", "PrgP", "PrgR"]
            }
        },
        "untracked_metrics": ["PrgR"]
    }
}


def is_metric_tracked_in_era(metric_col: str, season_id: str, competition: str = None) -> bool:
    """
    Evaluates whether a metric is tracked based on explicit season & competition provenance metadata,
    rather than relying solely on dataset heuristics like competition_max > 0.
    """
    if not season_id:
        return True
    
    # Check pre-xG historical era (2012-2014)
    if season_id in ERA_METRIC_COVERAGE["pre_xg_historical_era"]["seasons"]:
        if metric_col in ERA_METRIC_COVERAGE["pre_xg_historical_era"]["untracked_metrics"]:
            return False
        return True

    # Check early xG historical era (2014-2023)
    if season_id in ERA_METRIC_COVERAGE["early_xg_historical_era"]["seasons"]:
        if metric_col in ERA_METRIC_COVERAGE["early_xg_historical_era"]["untracked_metrics"]:
            return False
        return True
        
    # Check modern verified era (2023-2025)
    if season_id in ERA_METRIC_COVERAGE["modern_verified_era"]["seasons"]:
        return True
        
    # Check modern 2025-2026 era
    if season_id in ERA_METRIC_COVERAGE["modern_regular_era_2025"]["seasons"]:
        if metric_col in ERA_METRIC_COVERAGE["modern_regular_era_2025"]["untracked_metrics"]:
            return False
        if competition:
            comp_overrides = ERA_METRIC_COVERAGE["modern_regular_era_2025"]["competition_overrides"]
            if competition in comp_overrides:
                if metric_col in comp_overrides[competition].get("untracked", []):
                    return False
        return True
        
    return True
