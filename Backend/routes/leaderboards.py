from flask import Blueprint, request, jsonify
from services.analytics_service import get_leaderboard, get_dashboard_analytics
from services.season_service import season_service
from services.validation_service import validate_season_id, validate_position, resolve_and_validate_season, parse_bool
from schemas.responses import success_response, error_response

leaderboards_bp = Blueprint('leaderboards', __name__)

@leaderboards_bp.route('/dashboard', methods=['GET'])
def dashboard_analytics():
    comp = request.args.get('competition') or request.args.get('comp')
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        season = validated_season
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

    min_minutes_raw = request.args.get('min_minutes')
    if min_minutes_raw is not None:
        try:
            min_minutes = max(0, int(min_minutes_raw))
        except (ValueError, TypeError):
            min_minutes = 270 if str(metric).endswith('_90') else 0
    else:
        min_minutes = 270 if str(metric).endswith('_90') else 0

    limit_raw = request.args.get('limit', '10')
    try:
        limit = int(limit_raw)
        limit = max(1, min(limit, 100))
    except (ValueError, TypeError):
        limit = 10

    merge_spells = parse_bool(request.args.get('merge_spells'), False)
    results = get_leaderboard(
        metric=metric,
        competition=competition,
        position=position,
        min_minutes=min_minutes,
        limit=limit,
        season=season,
        merge_spells=merge_spells
    )

    target_season = season or season_service.get_active_season()
    quar_policy = season_service.get_quarantine_policy(target_season)

    return success_response(results, metadata={
        "metric": metric,
        "competition": competition or "All Competitions",
        "position": position or "All Positions",
        "min_minutes": min_minutes,
        "limit": limit,
        "season": target_season,
        "is_quarantined": quar_policy["is_quarantined"],
        "dataset_status": quar_policy["dataset_status"],
        "quarantine_reason": quar_policy["quarantine_reason"],
        "quarantine_notice": quar_policy["quarantine_reason"] if quar_policy["is_quarantined"] else None,
        "quarantine_policy": quar_policy
    })

# --- Backward compatibility endpoint for existing frontend ---

@leaderboards_bp.route('/league-leaders', methods=['GET'])
def get_league_leaders_legacy():
    """Legacy endpoint returning leaders for goals, assists, matches, minutes."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return jsonify({'success': False, 'error': err, 'error_detail': {'code': err_code}}), code
        season = validated_season
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
