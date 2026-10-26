from flask import Flask, jsonify
from flask_cors import CORS
import os
import logging
from config import ALLOWED_ORIGINS
from services.data_loader import data_loader
from routes.meta import meta_bp
from routes.competitions import competitions_bp
from routes.players import players_bp
from routes.comparisons import comparisons_bp
from routes.leaderboards import leaderboards_bp

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')
logger = logging.getLogger(__name__)

def create_app():
    app = Flask(__name__)

    # Enable CORS for frontend clients
    CORS(app, resources={r'/api/*': {'origins': '*' if '*' in ALLOWED_ORIGINS else ALLOWED_ORIGINS}})

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

    @app.route('/api/')
    @app.route('/')
    def home():
        return "Football Analytics API is running!"

    # Global error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        logger.error(f"Internal server error: {e}")
        return jsonify({"success": False, "error": "Internal server error"}), 500

    return app

# Application instance
app = create_app()

# Backward compatibility helper for legacy scripts
def load_players_data():
    return data_loader.get_records()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='127.0.0.1', port=port, debug=True)
