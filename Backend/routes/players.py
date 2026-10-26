from flask import Blueprint, request, jsonify
from services.player_service import search_players, get_player_profile
from services.data_loader import data_loader
from services.validation_service import validate_pagination
from schemas.responses import success_response, error_response, paginated_response

players_bp = Blueprint('players', __name__)

@players_bp.route('/players', methods=['GET'])
def get_players():
    search = request.args.get('search')
    competition = request.args.get('competition') or request.args.get('comp')
    squad = request.args.get('squad') or request.args.get('team')
    position = request.args.get('position') or request.args.get('pos')
    sort_by = request.args.get('sort_by') or request.args.get('sort') or 'Gls'
    order = request.args.get('order', 'desc')
    season = request.args.get('season')

    min_minutes_raw = request.args.get('min_minutes') or request.args.get('min_mins')
    try:
        min_minutes = int(min_minutes_raw) if min_minutes_raw else 0
    except (ValueError, TypeError):
        min_minutes = 0

    # Support all=true or raw=true to get unpaginated list
    all_records = request.args.get('all', '').lower() in ['true', '1']
    if all_records:
        items, total = search_players(
            search=search, competition=competition, squad=squad, position=position,
            min_minutes=min_minutes, sort_by=sort_by, order=order, page=1, limit=3000,
            season=season
        )
        return success_response(items, metadata={"total": total, "season": season})

    page, limit = validate_pagination(request.args.get('page'), request.args.get('limit'))
    items, total = search_players(
        search=search, competition=competition, squad=squad, position=position,
        min_minutes=min_minutes, sort_by=sort_by, order=order, page=page, limit=limit,
        season=season
    )

    return paginated_response(items, total, page, limit)

@players_bp.route('/players/<player_id>', methods=['GET'])
def get_player(player_id):
    season = request.args.get('season')
    profile = get_player_profile(player_id, season=season)
    if not profile:
        return error_response(f"Player with ID '{player_id}' not found", status_code=404)
    return success_response(profile)

# --- Backward compatibility endpoints for existing frontend ---

@players_bp.route('/players/<path:league>/<path:team>', methods=['GET'])
def get_players_by_team_legacy(league, team):
    """Legacy endpoint returning list of players for team and league."""
    season = request.args.get('season')
    items, _ = search_players(competition=league, squad=team, limit=100, season=season)
    return jsonify(items)

@players_bp.route('/player/<player_id>', methods=['GET'])
def get_player_legacy(player_id):
    """Legacy endpoint returning original format."""
    season = request.args.get('season')
    player = data_loader.get_by_id(player_id, season=season)
    if not player:
        return jsonify({'success': False, 'error': 'Player not found'}), 404

    return jsonify({
        'success': True,
        'player': player,
        'statistics': {
            'goals': player.get('Gls', 0),
            'assists': player.get('Ast', 0),
            'matches_played': player.get('MP', 0),
            'minutes': player.get('Min', 0),
            'starts': player.get('Starts', 0),
            'yellow_cards': player.get('CrdY', 0),
            'red_cards': player.get('CrdR', 0)
        }
    })
