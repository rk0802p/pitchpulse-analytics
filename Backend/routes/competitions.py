from flask import Blueprint, request, jsonify
from services.player_service import get_competitions_summary, get_teams_by_competition
from services.validation_service import resolve_competition
from schemas.responses import success_response, error_response
from config import COMPETITIONS

competitions_bp = Blueprint('competitions', __name__)

@competitions_bp.route('/competitions', methods=['GET'])
def get_competitions():
    summary = get_competitions_summary()
    return success_response(summary)

@competitions_bp.route('/teams', methods=['GET'])
def get_teams():
    comp_param = request.args.get('competition')
    teams = get_teams_by_competition(comp_param)
    return success_response(teams)

# --- Backward compatibility endpoints for existing frontend ---

@competitions_bp.route('/leagues', methods=['GET'])
def get_leagues_legacy():
    """Legacy endpoint returning list of raw league strings."""
    raw_leagues = list(COMPETITIONS.keys())
    return jsonify(raw_leagues)

@competitions_bp.route('/teams/<league>', methods=['GET'])
def get_teams_by_league_legacy(league):
    """Legacy endpoint returning list of squads in league."""
    teams = get_teams_by_competition(league)
    return jsonify(teams)
