from flask import Blueprint, request, jsonify
from services.analytics_service import get_leaderboard, get_dashboard_analytics
from services.season_service import season_service
from schemas.responses import success_response, error_response

leaderboards_bp = Blueprint('leaderboards', __name__)

@leaderboards_bp.route('/dashboard', methods=['GET'])
def dashboard_analytics():
    comp = request.args.get('competition') or request.args.get('comp')
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return error_response(f"Season '{season}' not found", status_code=404)
    data = get_dashboard_analytics(comp, season=season)
    if data is None and comp:
        return error_response(f"Competition '{comp}' not recognized", status_code=404)
    return success_response(data or {})

@leaderboards_bp.route('/leaderboards', methods=['GET'])
def leaderboards():
    metric = request.args.get('metric', 'Gls')
    competition = request.args.get('competition') or request.args.get('comp')
    position = request.args.get('position') or request.args.get('pos')
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return error_response(f"Season '{season}' not found", status_code=404)

    min_minutes_raw = request.args.get('min_minutes')
    try:
        min_minutes = int(min_minutes_raw) if min_minutes_raw else 0
    except (ValueError, TypeError):
        min_minutes = 0

    limit_raw = request.args.get('limit', '10')
    try:
        limit = int(limit_raw)
        limit = max(1, min(limit, 100))
    except (ValueError, TypeError):
        limit = 10

    results = get_leaderboard(
        metric=metric,
        competition=competition,
        position=position,
        min_minutes=min_minutes,
        limit=limit,
        season=season
    )

    return success_response(results, metadata={
        "metric": metric,
        "competition": competition or "All Competitions",
        "position": position or "All Positions",
        "min_minutes": min_minutes,
        "limit": limit,
        "season": season
    })

# --- Backward compatibility endpoint for existing frontend ---

@leaderboards_bp.route('/league-leaders', methods=['GET'])
def get_league_leaders_legacy():
    """Legacy endpoint returning leaders for goals, assists, matches, minutes."""
    season = request.args.get('season')
    if season and not season_service.season_exists(season):
        return jsonify({'success': False, 'error': f"Season '{season}' not found"}), 404
    leaders = {
        'goals': [{'Player': r['player'], 'Squad': r['squad'], 'Gls': r['value'], 'Pos': r['position']}
                  for r in get_leaderboard(metric='Gls', limit=10, season=season)],
        'assists': [{'Player': r['player'], 'Squad': r['squad'], 'Ast': r['value'], 'Pos': r['position']}
                    for r in get_leaderboard(metric='Ast', limit=10, season=season)],
        'matches': [{'Player': r['player'], 'Squad': r['squad'], 'MP': r['value'], 'Pos': r['position']}
                    for r in get_leaderboard(metric='MP', limit=10, season=season)],
        'minutes': [{'Player': r['player'], 'Squad': r['squad'], 'Min': r['value'], 'Pos': r['position']}
                    for r in get_leaderboard(metric='Min', limit=10, season=season)]
    }
    return jsonify({
        'success': True,
        'leaders': leaders
    })
