"""
PitchPulse Charts Blueprint.
Exposes REST endpoints for scatter plots, empirical percentiles,
player style similarity matching, and composite performance indices.
"""

import math
from flask import Blueprint, request
from services.data_loader import data_loader
from services.season_service import season_service
from services.validation_service import resolve_and_validate_season, validate_position, parse_bool
from services.chart_service import (
    get_scatter_chart_data,
    similar_players,
    performance_index,
    pool,
    percentiles
)
from schemas.responses import success_response, error_response

charts_bp = Blueprint('charts', __name__)

@charts_bp.route('/charts/scatter', methods=['GET'])
def get_scatter():
    """Returns 2D scatter coordinates and quadrant distribution for any pair of metrics."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        target_season = validated_season
    else:
        target_season = season_service.get_active_season()

    x_metric = request.args.get('x') or request.args.get('x_metric') or 'xG_90'
    y_metric = request.args.get('y') or request.args.get('y_metric') or 'xAG_90'
    position = request.args.get('position') or request.args.get('pos')
    competition = request.args.get('competition') or request.args.get('comp')

    if position:
        validated_pos = validate_position(position)
        if not validated_pos:
            return error_response(f"Invalid position '{position}'", status_code=400, code="ERR_INVALID_POSITION")
        position = validated_pos

    try:
        min_minutes = int(request.args.get('min_minutes') or 270)
        min_minutes = max(0, min_minutes)
    except (ValueError, TypeError):
        min_minutes = 270

    age_max = request.args.get('age_max')
    if age_max not in (None, ''):
        try:
            age_max = float(age_max)
            if not math.isfinite(age_max) or age_max < 0:
                raise ValueError
        except (ValueError, TypeError):
            return error_response("age_max must be a non-negative number", status_code=400, code="ERR_INVALID_AGE")
    else:
        age_max = None

    df = data_loader.get_dataframe(season=target_season)
    data = get_scatter_chart_data(
        df=df,
        x_metric=x_metric,
        y_metric=y_metric,
        position=position,
        competition=competition,
        min_minutes=min_minutes,
        age_max=age_max
    )
    return success_response(data, metadata={'season': target_season})

@charts_bp.route('/players/<player_id>/percentiles', methods=['GET'])
def get_player_percentiles(player_id):
    """Returns empirical mid-rank percentiles for an individual player against positional peers."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        target_season = validated_season
    else:
        target_season = season_service.get_active_season()

    player = data_loader.get_by_id(player_id, season=target_season)
    if not player:
        return error_response(f"Player with ID '{player_id}' not found", status_code=404, code="ERR_NOT_FOUND")

    try:
        min_minutes = int(request.args.get('min_minutes') or 270)
    except (ValueError, TypeError):
        min_minutes = 270

    df = data_loader.get_dataframe(season=target_season)
    pos_clean = str(player.get('Pos', 'MF')).split(',')[0].strip()
    peer_pool = pool(df, position=pos_clean, min_minutes=min_minutes)

    pct_dict = percentiles(player, peer_pool)
    return success_response({
        'player_id': player.get('id'),
        'Player': player.get('Player'),
        'Pos': player.get('Pos'),
        'comparison_position': pos_clean,
        'peer_sample_size': len(peer_pool),
        'percentiles': pct_dict
    }, metadata={'season': target_season})

@charts_bp.route('/players/<player_id>/similar', methods=['GET'])
def get_similar(player_id):
    """Returns top k statistically similar players in playing style using weighted z-score distance."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        target_season = validated_season
    else:
        target_season = season_service.get_active_season()

    player = data_loader.get_by_id(player_id, season=target_season)
    if not player:
        return error_response(f"Player with ID '{player_id}' not found", status_code=404, code="ERR_NOT_FOUND")

    try:
        k = int(request.args.get('k') or 5)
        k = max(1, min(20, k))
    except (ValueError, TypeError):
        k = 5

    try:
        min_minutes = int(request.args.get('min_minutes') or 270)
    except (ValueError, TypeError):
        min_minutes = 270

    same_league = parse_bool(request.args.get('same_league'), False)

    df = data_loader.get_dataframe(season=target_season)
    peer_pool = pool(df, min_minutes=min_minutes)
    similar = similar_players(player, peer_pool, k=k, same_league=same_league)

    return success_response({
        'target_player': {
            'id': player.get('id'),
            'Player': player.get('Player'),
            'Squad': player.get('Squad'),
            'Comp': player.get('Comp'),
            'Pos': player.get('Pos')
        },
        'count': len(similar),
        'similar_players': similar
    }, metadata={'season': target_season})

@charts_bp.route('/leaderboards/index', methods=['GET'])
def get_performance_index():
    """Returns ranked cohort leaderboard based on composite role performance index."""
    season = request.args.get('season')
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return error_response(err, status_code=code, code=err_code)
        target_season = validated_season
    else:
        target_season = season_service.get_active_season()

    role = request.args.get('role') or request.args.get('preset') or 'finisher'
    position = request.args.get('position') or request.args.get('pos')
    competition = request.args.get('competition') or request.args.get('comp')

    if position:
        validated_pos = validate_position(position)
        if not validated_pos:
            return error_response(f"Invalid position '{position}'", status_code=400, code="ERR_INVALID_POSITION")
        position = validated_pos

    try:
        min_minutes = int(request.args.get('min_minutes') or 270)
    except (ValueError, TypeError):
        min_minutes = 270

    try:
        limit = int(request.args.get('limit') or 25)
        limit = max(1, min(100, limit))
    except (ValueError, TypeError):
        limit = 25

    df = data_loader.get_dataframe(season=target_season)
    result = performance_index(
        df=df,
        role=role,
        position=position,
        competition=competition,
        min_minutes=min_minutes,
        limit=limit
    )

    return success_response(result, metadata={'season': target_season})
