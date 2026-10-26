from flask import Blueprint, jsonify
from config import METADATA, METRIC_DEFINITIONS, DATASET_PATH
from schemas.responses import success_response
import os

meta_bp = Blueprint('meta', __name__)

@meta_bp.route('/health', methods=['GET'])
def health():
    return success_response({
        "status": "healthy",
        "service": "Sports Analytics API",
        "dataset_ready": os.path.exists(DATASET_PATH)
    })

@meta_bp.route('/metadata', methods=['GET'])
def metadata():
    return success_response(METADATA)

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
