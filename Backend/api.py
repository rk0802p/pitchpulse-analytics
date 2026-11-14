from flask import Flask, jsonify, request
from flask_cors import CORS
import hashlib
import os
import logging
from pathlib import Path
from config import ALLOWED_ORIGINS, MAX_CONTENT_LENGTH
from services.data_loader import data_loader
from routes.meta import meta_bp
from routes.competitions import competitions_bp
from routes.players import players_bp
from routes.comparisons import comparisons_bp
from routes.leaderboards import leaderboards_bp
from routes.seasons import seasons_bp
from routes.charts import charts_bp

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)
SEASON_MANIFESTS_DIR = Path(__file__).resolve().parent / 'data' / 'seasons'


def _data_version(manifests_dir=SEASON_MANIFESTS_DIR):
    """Return a stable version derived from the deployed season manifests."""
    digest = hashlib.sha256()
    for manifest in sorted(Path(manifests_dir).glob('*/manifest.json')):
        digest.update(manifest.parent.name.encode('utf-8'))
        digest.update(b'\0')
        digest.update(manifest.read_bytes())
        digest.update(b'\0')
    return digest.hexdigest()

def create_app():
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

    # Enable CORS with explicit allowed origins for secure frontend communication
    CORS(app, resources={r'/*': {
        'origins': ALLOWED_ORIGINS,
        'methods': ['GET', 'POST', 'OPTIONS'],
        'allow_headers': ['Content-Type', 'Authorization']
    }})

    # B1: Run cryptographic baseline verification at startup
    baseline_verified = False
    try:
        from services.baseline_verifier import verify_baseline_integrity
        verify_res = verify_baseline_integrity()
        baseline_verified = True
        logger.info(f"Baseline (2024-2025) cryptographic integrity verified at startup: SHA={verify_res.get('primary_sha', verify_res.get('sha256'))}")
    except Exception as e:
        logger.error(f"Startup baseline verification failed: {e}")
        baseline_verified = False

    app.config['BASELINE_VERIFIED'] = baseline_verified

    # Pre-load and validate dataset at application startup
    try:
        data_loader.initialize()
        logger.info("Dataset successfully preloaded and cached in memory.")
    except Exception as e:
        logger.error(f"Failed to load dataset at startup: {e}")

    # Register blueprints under /api (charts_bp registered before players_bp for routing precedence)
    app.register_blueprint(meta_bp, url_prefix='/api')
    app.register_blueprint(charts_bp, url_prefix='/api')
    app.register_blueprint(competitions_bp, url_prefix='/api')
    app.register_blueprint(players_bp, url_prefix='/api')
    app.register_blueprint(comparisons_bp, url_prefix='/api')
    app.register_blueprint(leaderboards_bp, url_prefix='/api')
    app.register_blueprint(seasons_bp, url_prefix='/api')

    # Edge caching for immutable historical data
    # Historical seasons (2012-2013 through 2024-2025) never change - safe to cache aggressively
    @app.after_request
    def add_cache_headers(response):
        # Only cache successful GET requests
        if request.method == 'GET' and response.status_code == 200:
            # Check if this is a historical data endpoint (not admin, not current live season mutations)
            path = request.path
            if path.startswith('/api/') and not path.startswith('/api/admin'):
                # For historical seasons: cache for 24h at edge, 7 days stale-while-revalidate
                # Mutable/current data receives a shorter edge cache than closed seasons.
                season = request.args.get('season')
                is_historical = season and season != '2024-2025' and season != '2025-2026'

                if is_historical or path.startswith('/api/players') or path.startswith('/api/leaderboards') or path.startswith('/api/charts') or path.startswith('/api/competitions') or path.startswith('/api/seasons') or path.startswith('/api/comparisons'):
                    if is_historical:
                        # Immutable historical data: 24h edge cache, 7 days stale-while-revalidate
                        response.headers['Cache-Control'] = 'public, s-maxage=86400, stale-while-revalidate=604800'
                    else:
                        # Active season: 5 min edge cache, 1 hour stale-while-revalidate
                        response.headers['Cache-Control'] = 'public, s-maxage=300, stale-while-revalidate=3600'
                    # Version cache keys/tags whenever any season manifest changes.
                    version = _data_version()
                    response.set_etag(version)
                    response.headers['X-Data-Version'] = version
                    response.headers['Cache-Tag'] = f"season-{season or 'active'},data-{version[:12]}"
                    if request.if_none_match.contains(version):
                        response.status_code = 304
                        response.set_data(b'')
        return response

    @app.route('/api/')
    @app.route('/')
    def home():
        return "Football Analytics API is running!"

    # Global error handlers with standardized schema
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "success": False,
            "error": "Bad request",
            "error_detail": {"code": "ERR_BAD_REQUEST", "message": "Bad request"}
        }), 400

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({
            "success": False,
            "error": "Access forbidden",
            "error_detail": {"code": "ERR_FORBIDDEN", "message": "Access forbidden"}
        }), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({
            "success": False,
            "error": "Endpoint not found",
            "error_detail": {"code": "ERR_NOT_FOUND", "message": "Endpoint not found"}
        }), 404

    @app.errorhandler(413)
    def request_entity_too_large(e):
        return jsonify({
            "success": False,
            "error": "Payload exceeds maximum allowed size (16MB)",
            "error_detail": {"code": "ERR_PAYLOAD_TOO_LARGE", "message": "Payload exceeds maximum allowed size (16MB)"}
        }), 413

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "error_detail": {"code": "ERR_INTERNAL_SERVER_ERROR", "message": "Internal server error"}
        }), 500

    return app

# Application instance
app = create_app()

# Backward compatibility helper for legacy scripts
def load_players_data():
    return data_loader.get_records()


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
