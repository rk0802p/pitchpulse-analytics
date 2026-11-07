import os
from flask import Blueprint, request
from config import METRIC_DEFINITIONS, DATASET_PATH
from services.validation_service import validate_season_id, resolve_and_validate_season
from schemas.responses import success_response, error_response
from services.season_service import season_service
from services.metric_registry import get_metric_registry, get_metric_info

meta_bp = Blueprint('meta', __name__)

@meta_bp.route('/health', methods=['GET'])
def health():
    """
    Readiness and liveness probe.
    Returns 200 when default reference dataset is ready in memory or storage.
    Returns 503 if required baseline data is missing or inaccessible.
    """
    baseline_exists = os.path.exists(DATASET_PATH) or season_service.season_exists('2024-2025')
    active_season = season_service.get_active_season()
    active_exists = season_service.season_exists(active_season)
    
    is_ready = baseline_exists and active_exists
    status_str = "healthy" if is_ready else "unhealthy"
    status_code = 200 if is_ready else 503

    payload = {
        "status": status_str,
        "service": "PitchPulse Analytics API",
        "dataset_ready": baseline_exists,
        "active_season": active_season,
        "available_seasons": [s['id'] for s in season_service.list_seasons()]
    }
    return success_response(payload, status_code=status_code)

@meta_bp.route('/metadata', methods=['GET'])
def metadata():
    """Returns dataset metadata dynamically derived from the requested season manifest."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        target_season = validated_season
    else:
        target_season = season_service.get_active_season()

    manifest = season_service.get_season_manifest(target_season) or {}
    policy = season_service.get_quarantine_policy(target_season)

    meta = {
        "season": target_season,
        "dataset_name": manifest.get("display_name") or f"Big 5 European Leagues Player Statistics {target_season.replace('-', '/')}",
        "source": manifest.get("source") or manifest.get("source_name") or "FBref / StatsBomb style player-level aggregates",
        "updated_at": manifest.get("imported_at") or manifest.get("data_as_of") or "Completed Season",
        "total_records": manifest.get("records_count", 2854),
        "competitions_count": manifest.get("competitions_count", 5),
        "clubs_count": manifest.get("clubs_count", 96),
        "is_baseline": (target_season == '2024-2025'),
        "is_quarantined": policy["is_quarantined"],
        "dataset_status": policy["dataset_status"],
        "status_label": policy["status_label"],
        "disclaimer": manifest.get("disclaimer") or "Player-level aggregates covering Europe's top 5 leagues. Records represent individual spells per club."
    }
    return success_response(meta)

@meta_bp.route('/metrics', methods=['GET'])
def metrics():
    """Returns canonical metric definitions, categories, and descriptions."""
    return success_response(METRIC_DEFINITIONS)

@meta_bp.route('/metrics/registry', methods=['GET'])
def metric_registry():
    """Returns registry metadata for statistical metrics with era coverage and derivation rules."""
    metric_id = request.args.get('metric_id')
    if metric_id:
        info = get_metric_info(metric_id)
        if not info or info.get("validation_rules") == "Unknown":
            return error_response(f"Metric '{metric_id}' not found in registry", status_code=404, code="ERR_METRIC_NOT_FOUND")
        return success_response(info)
    return success_response(get_metric_registry())
