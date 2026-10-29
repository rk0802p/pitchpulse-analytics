from flask import Blueprint, request, jsonify
from services.analytics_service import compare_players
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
    if season and not season_service.season_exists(season):
        return jsonify({'success': False, 'error': f"Season '{season}' not found"}), 404

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
    is_quar = season_service.is_season_quarantined(target_season)
    any_quarantined = is_quar or any(season_service.is_season_quarantined(p.get("season", target_season)) for p in selected_players)
    quar_reason = None
    if any_quarantined:
        m = season_service.get_season_manifest("2025-2026") or {}
        quar_reason = m.get("quarantine_reason")

    return jsonify({
        'success': True,
        'players': selected_players,
        'metrics': result['metrics'],
        'radar': result['radar'],
        'is_quarantined': any_quarantined,
        'dataset_status': 'quarantined' if any_quarantined else 'verified_historical',
        'quarantine_notice': quar_reason if any_quarantined else None,
        'comparison_data': {
            'goals': [p.get('Gls', 0) for p in selected_players],
            'assists': [p.get('Ast', 0) for p in selected_players],
            'matches': [p.get('MP', 0) for p in selected_players],
            'minutes': [p.get('Min', 0) for p in selected_players]
        }
    }), 200
