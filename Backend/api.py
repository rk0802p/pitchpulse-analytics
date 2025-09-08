from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import os
import logging

app = Flask(__name__)
CORS(app, resources={r'/api/*': {'origins': 'http://localhost:3000'}})

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_players_data():
    try:
        # Construct the absolute path to look for CSV files
        dir_path = os.path.dirname(os.path.realpath(__file__))
        
        # Look for CSV files in the directory
        csv_files = [f for f in os.listdir(dir_path) if f.endswith('.csv')]
        
        if not csv_files:
            # If no CSV files, try Excel as fallback
            excel_path = os.path.join(dir_path, 'top5-players24-25.xlsx')
            if os.path.exists(excel_path):
                logger.info(f"Loading Excel file: {excel_path}")
                xls = pd.ExcelFile(excel_path)
                all_players = []
                for sheet_name in xls.sheet_names:
                    df = pd.read_excel(xls, sheet_name=sheet_name)
                    df['league'] = sheet_name 
                    all_players.append(df)
                players_df = pd.concat(all_players, ignore_index=True)
                return players_df.to_dict(orient='records')
            else:
                logger.error("No CSV or Excel files found")
                return {
                    'error': 'No data files found',
                    'message': 'Please add CSV files or Excel file to Backend directory',
                    'files_in_directory': os.listdir(dir_path)
                }
        
        # Load CSV files
        all_players = []
        for csv_file in csv_files:
            csv_path = os.path.join(dir_path, csv_file)
            logger.info(f"Loading CSV file: {csv_path}")
            
            # Extract league name from filename (remove .csv extension)
            league_name = os.path.splitext(csv_file)[0]
            
            # Read CSV file
            df = pd.read_csv(csv_path)
            df['league'] = league_name
            all_players.append(df)
            logger.info(f"Loaded {len(df)} players from {league_name}")
        
        if not all_players:
            return {
                'error': 'No player data loaded',
                'csv_files_found': csv_files
            }
        
        players_df = pd.concat(all_players, ignore_index=True)
        logger.info(f"Total players loaded: {len(players_df)}")
        
        return players_df.to_dict(orient='records')
        
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return {'error': 'Error loading data', 'details': str(e)}

@app.route('/api/')
def home():
    return "Football Analytics API is running!"

@app.route('/api/players', methods=['GET'])
def get_players():
    players = load_players_data()
    
    # Check if we got an error instead of data
    if isinstance(players, dict) and 'error' in players:
        logger.error(f"Error loading players: {players}")
        return jsonify(players), 500
    
    return jsonify(players)

@app.route('/api/leagues', methods=['GET'])
def get_leagues():
    """Get all available leagues"""
    players = load_players_data()
    
    if isinstance(players, dict) and 'error' in players:
        return jsonify(players), 500
    
    if players:
        leagues = pd.DataFrame(players)['league'].unique().tolist()
        return jsonify(leagues)
    return jsonify([])

@app.route('/api/teams/<league>', methods=['GET'])
def get_teams_by_league(league):
    """Get teams for a specific league"""
    players = load_players_data()
    
    if isinstance(players, dict) and 'error' in players:
        return jsonify(players), 500
    
    if players:
        df = pd.DataFrame(players)
        league_teams = df[df['league'] == league]['squad'].unique().tolist()
        return jsonify(league_teams)
    return jsonify([])

@app.route('/api/players/<league>/<team>', methods=['GET'])
def get_players_by_team(league, team):
    """Get players for a specific team in a specific league"""
    players = load_players_data()
    
    if isinstance(players, dict) and 'error' in players:
        return jsonify(players), 500
    
    if players:
        df = pd.DataFrame(players)
        team_players = df[(df['league'] == league) & (df['Squad'] == team)].to_dict(orient='records')
        return jsonify(team_players)
    return jsonify([])

@app.route('/api/debug', methods=['GET'])
def debug_info():
    """Debug endpoint to check file system"""
    dir_path = os.path.dirname(os.path.realpath(__file__))
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

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)