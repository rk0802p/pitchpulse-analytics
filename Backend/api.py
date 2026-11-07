from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from config import ALLOWED_ORIGINS, MAX_CONTENT_LENGTH
from services.data_loader import data_loader
from routes.meta import meta_bp
from routes.competitions import competitions_bp
from routes.players import players_bp
from routes.comparisons import comparisons_bp
from routes.leaderboards import leaderboards_bp
from routes.seasons import seasons_bp

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

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

    # Register blueprints under /api
    app.register_blueprint(meta_bp, url_prefix='/api')
    app.register_blueprint(competitions_bp, url_prefix='/api')
    app.register_blueprint(players_bp, url_prefix='/api')
    app.register_blueprint(comparisons_bp, url_prefix='/api')
    app.register_blueprint(leaderboards_bp, url_prefix='/api')
    app.register_blueprint(seasons_bp, url_prefix='/api')

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
