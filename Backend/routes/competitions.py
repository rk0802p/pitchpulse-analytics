from flask import Blueprint, request, jsonify
from services.player_service import get_competitions_summary, get_teams_by_competition
from services.season_service import season_service
from services.validation_service import resolve_competition
from schemas.responses import success_response, error_response
from config import COMPETITIONS

competitions_bp = Blueprint('competitions', __name__)

@competitions_bp.route('/competitions', methods=['GET'])
def get_competitions():
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return error_response(f"Season '{season}' not found", status_code=404)
    summary = get_competitions_summary(season=season)
    return success_response(summary)

@competitions_bp.route('/teams', methods=['GET'])
def get_teams():
    comp_param = request.args.get('competition')
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return error_response(f"Season '{season}' not found", status_code=404)
    teams = get_teams_by_competition(comp_param, season=season)
    return success_response(teams)

# --- Backward compatibility endpoints for existing frontend ---

@competitions_bp.route('/leagues', methods=['GET'])
def get_leagues_legacy():
    """Legacy endpoint returning list of raw league strings."""
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return jsonify({'success': False, 'error': f"Season '{season}' not found"}), 404
    from services.data_loader import data_loader
    df = data_loader.get_dataframe(season=season)
    raw_leagues = sorted(df['Comp'].dropna().unique().tolist())
    return jsonify(raw_leagues)

@competitions_bp.route('/teams/<path:league>', methods=['GET'])
def get_teams_by_league_legacy(league):
    """Legacy endpoint returning list of squads in league."""
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return jsonify({'success': False, 'error': f"Season '{season}' not found"}), 404
    teams = get_teams_by_competition(league, season=season)
    return jsonify(teams)
