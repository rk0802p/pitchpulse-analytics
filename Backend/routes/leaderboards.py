from flask import Blueprint, request, jsonify
from services.analytics_service import get_leaderboard
from schemas.responses import success_response

leaderboards_bp = Blueprint('leaderboards', __name__)

@leaderboards_bp.route('/leaderboards', methods=['GET'])
def leaderboards():
    metric = request.args.get('metric', 'Gls')
    competition = request.args.get('competition') or request.args.get('comp')
    position = request.args.get('position') or request.args.get('pos')

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
        limit=limit
    )

    return success_response(results, metadata={
        "metric": metric,
        "competition": competition or "All Competitions",
        "position": position or "All Positions",
        "min_minutes": min_minutes,
        "limit": limit
    })

# --- Backward compatibility endpoint for existing frontend ---

@leaderboards_bp.route('/league-leaders', methods=['GET'])
def get_league_leaders_legacy():
    """Legacy endpoint returning leaders for goals, assists, matches, minutes."""
    leaders = {
        'goals': [{'Player': r['player'], 'Squad': r['squad'], 'Gls': r['value'], 'Pos': r['position']}
                  for r in get_leaderboard(metric='Gls', limit=10)],
        'assists': [{'Player': r['player'], 'Squad': r['squad'], 'Ast': r['value'], 'Pos': r['position']}
                    for r in get_leaderboard(metric='Ast', limit=10)],
        'matches': [{'Player': r['player'], 'Squad': r['squad'], 'MP': r['value'], 'Pos': r['position']}
                    for r in get_leaderboard(metric='MP', limit=10)],
        'minutes': [{'Player': r['player'], 'Squad': r['squad'], 'Min': r['value'], 'Pos': r['position']}
                    for r in get_leaderboard(metric='Min', limit=10)]
    }

    return jsonify({
        'success': True,
        'leaders': leaders
    })
