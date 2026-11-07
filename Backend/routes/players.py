from flask import Blueprint, request, jsonify
from services.player_service import search_players, get_player_profile
from services.data_loader import data_loader
from services.season_service import season_service
from services.validation_service import validate_pagination, validate_season_id, validate_position, parse_bool, resolve_and_validate_season
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

    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        season = validated_season

    if position:
        validated_pos = validate_position(position)
        if not validated_pos:
            return error_response(f"Invalid position '{position}'. Expected one of: GK, DF, MF, FW or combination.", status_code=400, code="ERR_INVALID_POSITION")
        position = validated_pos

    min_minutes_raw = request.args.get('min_minutes') or request.args.get('min_mins')
    try:
        min_minutes = int(min_minutes_raw) if min_minutes_raw else 0
    except (ValueError, TypeError):
        min_minutes = 0

    target_season = season or season_service.get_active_season()
    quar_policy = season_service.get_quarantine_policy(target_season)
    meta = {
        "season": target_season,
        "is_quarantined": quar_policy["is_quarantined"],
        "dataset_status": quar_policy["dataset_status"],
        "quarantine_reason": quar_policy["quarantine_reason"],
        "quarantine_notice": quar_policy["quarantine_reason"] if quar_policy["is_quarantined"] else None,
        "quarantine_policy": quar_policy
    }

    # Support all=true or raw=true to get unpaginated list
    all_records = parse_bool(request.args.get('all') or request.args.get('raw'), False)
    if all_records:
        merge_spells = parse_bool(request.args.get('merge_spells'), False)
        items, total = search_players(
            search=search, competition=competition, squad=squad, position=position,
            min_minutes=min_minutes, sort_by=sort_by, order=order, page=1, limit=3000,
            season=season, merge_spells=merge_spells
        )
        meta["total"] = total
        return success_response(items, metadata=meta)

    merge_spells = parse_bool(request.args.get('merge_spells'), False)
    page, limit = validate_pagination(request.args.get('page'), request.args.get('limit'))
    items, total = search_players(
        search=search, competition=competition, squad=squad, position=position,
        min_minutes=min_minutes, sort_by=sort_by, order=order, page=page, limit=limit,
        season=season, merge_spells=merge_spells
    )

    return paginated_response(items, total, page, limit, metadata=meta)

@players_bp.route('/players/<player_id>', methods=['GET'])
def get_player(player_id):
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        season = validated_season

    profile = get_player_profile(player_id, season=season)
    if not profile:
        return error_response(f"Player with ID '{player_id}' not found", status_code=404, code="ERR_NOT_FOUND")
    return success_response(profile)

# --- Backward compatibility endpoints for existing frontend ---

@players_bp.route('/players/<path:league>/<path:team>', methods=['GET'])
def get_players_by_team_legacy(league, team):
    """Legacy endpoint returning list of players for team and league."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return jsonify({'success': False, 'error': err, 'error_detail': {'code': err_code}}), code
        season = validated_season
    items, _ = search_players(competition=league, squad=team, limit=100, season=season)
    return jsonify(items)

@players_bp.route('/player/<player_id>', methods=['GET'])
def get_player_legacy(player_id):
    """Legacy endpoint returning original format."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return jsonify({'success': False, 'error': err, 'error_detail': {'code': err_code}}), code
        season = validated_season
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
