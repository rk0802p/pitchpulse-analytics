import os
import tempfile
import urllib.request
from flask import Blueprint, request, jsonify, send_file
from services.season_service import season_service
from services.data_loader import data_loader
from services.dataset_importer import DatasetImporter, DatasetValidationError
from services.baseline_verifier import verify_baseline_integrity, BaselineIntegrityError
from schemas.responses import success_response, error_response

seasons_bp = Blueprint('seasons', __name__)

@seasons_bp.route('/seasons', methods=['GET'])
def get_seasons():
    """Returns list of all stored versioned seasons."""
    seasons = season_service.list_seasons()
    return success_response(seasons)

@seasons_bp.route('/seasons/active', methods=['GET'])
def get_active_season():
    """Returns currently active season information."""
    active_id = season_service.get_active_season()
    manifest = season_service.get_season_manifest(active_id) or {}
    return success_response({
        'active_season': active_id,
        'manifest': manifest
    })

@seasons_bp.route('/seasons/active', methods=['POST'])
def set_active_season():
    """Sets the active season for the current application session."""
    data = request.get_json() or {}
    season_id = data.get('season') or data.get('season_id')
    if not season_id:
        return error_response("Missing required field 'season'", status_code=400)

    try:
        new_active = season_service.set_active_season(season_id)
        # Preload the season in data_loader
        data_loader.load_season(new_active)
        return success_response({
            'message': f"Active season set to '{new_active}'",
            'active_season': new_active
        })
    except ValueError as e:
        return error_response(str(e), status_code=404)

@seasons_bp.route('/seasons/baseline/verify', methods=['GET'])
def verify_baseline():
    """Runs on-demand cryptographic and statistical verification of the 2024/25 reference baseline."""
    try:
        res = verify_baseline_integrity()
        return success_response(res)
    except BaselineIntegrityError as e:
        return error_response(f"Baseline integrity violation: {str(e)}", status_code=422)
    except Exception as e:
        return error_response(f"Verification error: {str(e)}", status_code=500)

@seasons_bp.route('/seasons/presets', methods=['GET'])
def get_presets():
    """Returns verified online dataset presets for one-click downloading and testing."""
    presets = season_service.get_download_presets()
    return success_response(presets)

@seasons_bp.route('/seasons/import', methods=['POST'])
def import_season_file():
    """
    Imports or validates a season dataset (.xlsx, .xls, .csv).
    Accepts multipart/form-data with 'file', JSON with 'file_path' or 'url'.
    """
    dry_run = request.form.get('dry_run', '').lower() in ['true', '1']
    allow_unknown = request.form.get('allow_unknown', '').lower() in ['true', '1']
    season = request.form.get('season')
    source = request.form.get('source') or "FBref / StatsBomb style player-level aggregates"
    url = request.form.get('url')
    file_path = None

    if request.is_json:
        data = request.get_json() or {}
        dry_run = data.get('dry_run', False)
        allow_unknown = data.get('allow_unknown', False)
        season = data.get('season', season)
        source = data.get('source', source)
        url = data.get('url', url)
        file_path = data.get('file_path')

    uploaded_file = request.files.get('file')
    temp_target = None

    try:
        if uploaded_file and uploaded_file.filename:
            filename = uploaded_file.filename
            ext = os.path.splitext(filename)[1].lower()
            if ext not in ['.csv', '.xlsx', '.xls']:
                return error_response(f"Unsupported file format '{ext}'. Must be .csv, .xlsx, or .xls.", status_code=400)
            fd, temp_target = tempfile.mkstemp(suffix=ext)
            os.close(fd)
            uploaded_file.save(temp_target)
            source_file = temp_target
        elif url and url.startswith(('http://', 'https://')):
            ext = '.xlsx' if '.xlsx' in url.lower() else '.csv'
            fd, temp_target = tempfile.mkstemp(suffix=ext)
            os.close(fd)
            req = urllib.request.Request(
                url,
                headers={'User-Agent': 'Mozilla/5.0 PitchPulse/1.0 (Dataset Importer)'}
            )
            try:
                with urllib.request.urlopen(req, timeout=30) as resp:
                    with open(temp_target, 'wb') as f:
                        f.write(resp.read())
            except Exception as e:
                return error_response(f"Failed to download dataset from URL: {str(e)}", status_code=400)
            source_file = temp_target
        elif file_path and os.path.exists(file_path):
            source_file = file_path
        else:
            return error_response("No file uploaded, URL provided, or file_path found.", status_code=400)

        if not season:
            return error_response("Missing required parameter 'season' (e.g. '2025-2026').", status_code=400)

        importer = DatasetImporter(strict=not allow_unknown, allow_unknown=allow_unknown)
        result = importer.import_file(
            file_path=source_file,
            season=season,
            source_name=source,
            dry_run=dry_run
        )

        # If import succeeded and was not dry_run, refresh data_loader
        if not dry_run:
            data_loader.load_season(season, force_reload=True)

        return success_response(result)

    except DatasetValidationError as e:
        return error_response(
            message=f"Dataset validation failed: {str(e)}",
            status_code=422,
            details=e.errors
        )
    except Exception as e:
        return error_response(f"Import process error: {str(e)}", status_code=500)
    finally:
        if temp_target and os.path.exists(temp_target):
            try:
                os.remove(temp_target)
            except Exception:
                pass

@seasons_bp.route('/seasons/<season_id>', methods=['GET'])
def get_season_details(season_id):
    """Returns metadata manifest and statistics for a specific season."""
    resolved = season_service.resolve_season(season_id)
    manifest = season_service.get_season_manifest(resolved)
    if not manifest:
        return error_response(f"Season '{season_id}' not found.", status_code=404)
    return success_response(manifest)

@seasons_bp.route('/seasons/<season_id>/download', methods=['GET'])
def download_season(season_id):
    """Provides direct download of the season CSV dataset file."""
    resolved = season_service.resolve_season(season_id)
    season_dir = os.path.join(season_service.seasons_dir, resolved)
    csv_path = os.path.join(season_dir, 'players.csv')
    if os.path.exists(csv_path):
        return send_file(
            csv_path,
            mimetype='text/csv',
            as_attachment=True,
            download_name=f"pitchpulse_{resolved}_players.csv"
        )
    return error_response(f"Season dataset file for '{resolved}' not found.", status_code=404)

