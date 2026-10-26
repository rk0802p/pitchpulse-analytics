from flask import Blueprint, request, jsonify
from config import METADATA, METRIC_DEFINITIONS, DATASET_PATH
from schemas.responses import success_response
from services.season_service import season_service
import os

meta_bp = Blueprint('meta', __name__)

@meta_bp.route('/health', methods=['GET'])
def health():
    return success_response({
        "status": "healthy",
        "service": "Sports Analytics API",
        "dataset_ready": os.path.exists(DATASET_PATH),
        "active_season": season_service.get_active_season(),
        "available_seasons": [s['id'] for s in season_service.list_seasons()]
    })

@meta_bp.route('/metadata', methods=['GET'])
def metadata():
    season = request.args.get('season')
    meta = dict(METADATA)
    if season:
        manifest = season_service.get_season_manifest(season)
        if manifest:
            meta["season"] = manifest.get("season", season)
            meta["total_records"] = manifest.get("records_count", meta.get("total_records"))
            meta["clubs_count"] = manifest.get("clubs_count", meta.get("clubs_count"))
            meta["source"] = manifest.get("source", meta.get("source"))
            meta["updated_at"] = manifest.get("imported_at", meta.get("updated_at"))
    return success_response(meta)

@meta_bp.route('/metrics', methods=['GET'])
def metrics():
    return success_response(METRIC_DEFINITIONS)

@meta_bp.route('/debug', methods=['GET'])
def debug_info():
    dir_path = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
    csv_files = [f for f in os.listdir(dir_path) if f.endswith('.csv')]
    excel_path = os.path.join(dir_path, 'top5-players24-25.xlsx')

    return jsonify({
        'backend_directory': dir_path,
        'csv_files_found': csv_files,
        'excel_path': excel_path,
        'excel_exists': os.path.exists(excel_path),
        'all_files_in_backend': os.listdir(dir_path),
        'current_working_directory': os.getcwd()
    })
