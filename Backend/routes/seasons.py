import os
import hmac
import tempfile
from flask import Blueprint, request, jsonify, send_file
from config import ADMIN_TOKEN
from services.season_service import season_service
from services.data_loader import data_loader
from services.dataset_importer import DatasetImporter, DatasetValidationError
from services.baseline_verifier import verify_baseline_integrity, BaselineIntegrityError
from services.validation_service import validate_season_id, parse_bool
from schemas.responses import success_response, error_response

seasons_bp = Blueprint('seasons', __name__)

def check_admin_auth():
    """
    Validates Bearer token authentication against configured ADMIN_TOKEN.
    Uses constant-time comparison to prevent timing attacks.
    Fails closed if ADMIN_TOKEN is not configured.
    """
    token_config = os.environ.get('ADMIN_TOKEN') or ADMIN_TOKEN
    if not token_config:
        return False, "Admin token is not configured on this server."

    auth_header = request.headers.get('Authorization', '').strip()
    if not auth_header or not auth_header.startswith('Bearer '):
        return False, "Missing or invalid Authorization header. Expected format: 'Bearer <token>'."

    provided_token = auth_header[7:].strip()
    if not hmac.compare_digest(provided_token, token_config):
        return False, "Invalid authentication token."

    return True, None

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
    """
    Sets the active season for the current application session.
    Requires Bearer token authentication via ADMIN_TOKEN.
    Note: Query-scoped '?season=...' parameters are preferred for stateless execution.
    """
    is_auth, auth_err = check_admin_auth()
    if not is_auth:
        return error_response(auth_err, status_code=403, code="ERR_FORBIDDEN")

    data = request.get_json() or {}
    season_id = data.get('season') or data.get('season_id')
    if not season_id:
        return error_response("Missing required field 'season'", status_code=400, code="ERR_MISSING_SEASON")

    validated = validate_season_id(season_id, seasons_dir=season_service.seasons_dir, must_exist=True)
    if not validated:
        return error_response(f"Season '{season_id}' does not exist or has invalid format.", status_code=404, code="ERR_SEASON_NOT_FOUND")

    try:
        new_active = season_service.set_active_season(validated)
        data_loader.load_season(new_active)
        return success_response({
            'message': f"Active season set to '{new_active}'",
            'active_season': new_active
        })
    except ValueError as e:
        return error_response(str(e), status_code=404, code="ERR_SEASON_NOT_FOUND")

@seasons_bp.route('/seasons/baseline/verify', methods=['GET'])
def verify_baseline():
    """Runs on-demand cryptographic and statistical verification of the 2024/25 reference baseline."""
    try:
        res = verify_baseline_integrity()
        return success_response(res)
    except BaselineIntegrityError as e:
        return error_response(f"Baseline integrity violation: {str(e)}", status_code=422, code="ERR_BASELINE_CORRUPT")
    except Exception as e:
        return error_response(f"Verification error: {str(e)}", status_code=500, code="ERR_VERIFICATION_FAILED")

@seasons_bp.route('/seasons/presets', methods=['GET'])
def get_presets():
    """Returns verified dataset presets for inspection and reference."""
    presets = season_service.get_download_presets()
    return success_response(presets)

@seasons_bp.route('/seasons/import', methods=['POST'])
def import_season_file():
    """
    Secure import and validation endpoint for season datasets (.xlsx, .xls, .csv).
    Requires Bearer token authentication via ADMIN_TOKEN.
    Accepts only direct multipart/form-data file uploads.
    Remote URLs (SSRF prevention) and arbitrary server filepaths are strictly prohibited.
    """
    is_auth, auth_err = check_admin_auth()
    if not is_auth:
        return error_response(auth_err, status_code=403, code="ERR_FORBIDDEN")

    # Security check: proactively reject disallowed remote URL and server file path ingestion
    if request.is_json:
        req_data = request.get_json() or {}
        if req_data.get('url'):
            return error_response(
                "Remote URL fetching is disabled for security (SSRF prevention). Upload files directly via multipart/form-data.",
                status_code=400,
                code="ERR_SSRF_PROHIBITED"
            )
        if req_data.get('file_path'):
            return error_response(
                "Server filesystem path ingestion is disabled for security. Upload files directly via multipart/form-data.",
                status_code=400,
                code="ERR_PATH_PROHIBITED"
            )

    uploaded_file = request.files.get('file')
    if not uploaded_file or not uploaded_file.filename:
        return error_response("Missing required file upload. Submit a file under key 'file'.", status_code=400, code="ERR_MISSING_FILE")

    dry_run = parse_bool(request.form.get('dry_run', False))
    allow_unknown = parse_bool(request.form.get('allow_unknown', False))
    season = request.form.get('season')
    source = request.form.get('source') or "FBref / StatsBomb style player-level aggregates"

    if not season:
        return error_response("Missing required parameter 'season' (e.g. '2025-2026').", status_code=400, code="ERR_MISSING_SEASON")

    validated_season = validate_season_id(season)
    if not validated_season:
        return error_response(f"Invalid season identifier '{season}'. Format must be YYYY-YYYY (e.g. 2025-2026).", status_code=400, code="ERR_INVALID_SEASON")

    # Prevent overwriting immutable reference baseline
    if validated_season == '2024-2025':
        return error_response("The 2024-2025 baseline dataset is immutable and cannot be overwritten.", status_code=403, code="ERR_BASELINE_IMMUTABLE")

    filename = uploaded_file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.csv', '.xlsx', '.xls']:
        return error_response(f"Unsupported file format '{ext}'. Must be .csv, .xlsx, or .xls.", status_code=400, code="ERR_UNSUPPORTED_FORMAT")

    temp_target = None
    try:
        fd, temp_target = tempfile.mkstemp(suffix=ext)
        os.close(fd)
        uploaded_file.save(temp_target)

        importer = DatasetImporter(strict=not allow_unknown, allow_unknown=allow_unknown)
        result = importer.import_file(
            file_path=temp_target,
            season=validated_season,
            source_name=source,
            dry_run=dry_run
        )

        if not dry_run:
            data_loader.load_season(validated_season, force_reload=True)

        return success_response(result)

    except DatasetValidationError as e:
        return error_response(
            message=f"Dataset validation failed: {str(e)}",
            status_code=422,
            details=e.errors,
            code="ERR_DATASET_VALIDATION_FAILED"
        )
    except Exception as e:
        return error_response(f"Import process error: {str(e)}", status_code=500, code="ERR_IMPORT_FAILED")
    finally:
        if temp_target and os.path.exists(temp_target):
            try:
                os.remove(temp_target)
            except Exception:
                pass

@seasons_bp.route('/seasons/<season_id>', methods=['GET'])
def get_season_details(season_id):
    """Returns metadata manifest and statistics for a specific season."""
    validated = validate_season_id(season_id, seasons_dir=season_service.seasons_dir, must_exist=True)
    if not validated:
        return error_response(f"Season '{season_id}' not found.", status_code=404, code="ERR_NOT_FOUND")

    manifest = season_service.get_season_manifest(validated)
    if not manifest:
        return error_response(f"Season manifest for '{validated}' not found.", status_code=404, code="ERR_NOT_FOUND")
    return success_response(manifest)

@seasons_bp.route('/seasons/<season_id>/download', methods=['GET'])
def download_season(season_id):
    """Provides direct download of the season CSV dataset file."""
    validated = validate_season_id(season_id, seasons_dir=season_service.seasons_dir, must_exist=True)
    if not validated:
        return error_response(f"Season '{season_id}' not found.", status_code=404, code="ERR_NOT_FOUND")

    season_dir = os.path.join(season_service.seasons_dir, validated)
    csv_candidates = [
        os.path.join(season_dir, f"top5-players-{validated}.csv"),
        os.path.join(season_dir, "top5-players24-25.csv"),
        os.path.join(season_dir, "dataset.csv"),
        os.path.join(season_dir, "players.csv")
    ]
    for csv_path in csv_candidates:
        if os.path.exists(csv_path):
            return send_file(
                csv_path,
                mimetype='text/csv',
                as_attachment=True,
                download_name=f"pitchpulse_{validated}_players.csv"
            )
    return error_response(f"Season dataset file for '{validated}' not found.", status_code=404, code="ERR_NOT_FOUND")
