from flask import Blueprint, request, jsonify
from services.analytics_service import compare_players
from services.validation_service import validate_season_id, resolve_and_validate_season
from schemas.responses import success_response, error_response

comparisons_bp = Blueprint('comparisons', __name__)

@comparisons_bp.route('/players/compare', methods=['POST'])
def compare():
    if not request.is_json:
        return jsonify({'success': False, 'error': 'Request must be JSON'}), 400

    data = request.get_json() or {}
    player_ids = data.get('player_ids') or data.get('ids') or []
    season = data.get('season') or request.args.get('season')
    from services.season_service import season_service
    if season:
        validated_season, err, code = resolve_and_validate_season(season, season_service)
        if err:
            err_code = "ERR_INVALID_SEASON" if code == 400 else "ERR_SEASON_NOT_FOUND"
            return jsonify({'success': False, 'error': err, 'error_detail': {'code': err_code}}), code
        season = validated_season

    if not isinstance(player_ids, list):
        return jsonify({'success': False, 'error': 'player_ids must be a list'}), 400

    if not player_ids:
        return jsonify({'success': False, 'error': 'No players to compare'}), 400

    result = compare_players(player_ids, season=season)
    if not result or not result['players']:
        return jsonify({'success': False, 'error': 'None of the requested players were found'}), 404

    # Provide both legacy keys and modern rich comparison matrix
    selected_players = result['players']
    target_season = season or season_service.get_active_season()
    base_policy = season_service.get_quarantine_policy(target_season)
    player_policies = [season_service.get_quarantine_policy(p.get("season", target_season)) for p in selected_players]
    any_quarantined = base_policy["is_quarantined"] or any(pol["is_quarantined"] for pol in player_policies)
    quar_reason = None
    dataset_status = 'verified_historical'
    if any_quarantined:
        quar_reasons = [pol["quarantine_reason"] for pol in ([base_policy] + player_policies) if pol["quarantine_reason"]]
        quar_reason = quar_reasons[0] if quar_reasons else "Dataset contains unverified data and is quarantined."
        # Use the actual dataset_status from the first quarantined policy
        for pol in ([base_policy] + player_policies):
            if pol["is_quarantined"]:
                dataset_status = pol.get("dataset_status", "quarantined")
                break

    return jsonify({
        'success': True,
        'players': selected_players,
        'metrics': result['metrics'],
        'radar': result['radar'],
        'is_quarantined': any_quarantined,
        'dataset_status': dataset_status,
        'quarantine_notice': quar_reason if any_quarantined else None,
        'quarantine_policy': base_policy if not any_quarantined else next((p for p in player_policies if p["is_quarantined"]), base_policy),
        'comparison_data': {
            'goals': [p.get('Gls', 0) for p in selected_players],
            'assists': [p.get('Ast', 0) for p in selected_players],
            'matches': [p.get('MP', 0) for p in selected_players],
            'minutes': [p.get('Min', 0) for p in selected_players]
        }
    }), 200
