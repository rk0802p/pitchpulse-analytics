from flask import Blueprint, request, jsonify
from services.season_service import season_service
from services.data_loader import data_loader
from schemas.responses import success_response, error_response

seasons_bp = Blueprint('seasons', __name__)

@seasons_bp.route('/seasons', methods=['GET'])
def get_seasons():
    """Returns list of all stored versioned seasons."""
    seasons = season_service.list_seasons()
    return success_response(seasons)

@seasons_bp.route('/seasons/active', methods=['GET'])
def get_active_season():
    """Returns currently active season information."""
    active_id = season_service.get_active_season()
    manifest = season_service.get_season_manifest(active_id) or {}
    return success_response({
        'active_season': active_id,
        'manifest': manifest
    })

@seasons_bp.route('/seasons/active', methods=['POST'])
def set_active_season():
    """Sets the active season for the current application session."""
    data = request.get_json() or {}
    season_id = data.get('season') or data.get('season_id')
    if not season_id:
        return error_response("Missing required field 'season'", status_code=400)

    try:
        new_active = season_service.set_active_season(season_id)
        # Preload the season in data_loader
        data_loader.load_season(new_active)
        return success_response({
            'message': f"Active season set to '{new_active}'",
            'active_season': new_active
        })
    except ValueError as e:
        return error_response(str(e), status_code=404)

@seasons_bp.route('/seasons/<season_id>', methods=['GET'])
def get_season_details(season_id):
    """Returns metadata manifest and statistics for a specific season."""
    resolved = season_service.resolve_season(season_id)
    manifest = season_service.get_season_manifest(resolved)
    if not manifest:
        return error_response(f"Season '{season_id}' not found.", status_code=404)
    return success_response(manifest)
