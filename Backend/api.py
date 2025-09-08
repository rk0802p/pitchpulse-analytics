from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import os

app = Flask(__name__)
CORS(app, resources={r'/api/*': {'origins': 'http://localhost:3000'}})

def load_players_data():
    try:
        # Construct the absolute path to the Excel file
        dir_path = os.path.dirname(os.path.realpath(__file__))
        excel_path = os.path.join(dir_path, 'top5-players24-25.xlsx')
        xls = pd.ExcelFile(excel_path)
        all_players = []
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            df['league'] = sheet_name 
            all_players.append(df)
        players_df = pd.concat(all_players, ignore_index=True)
        return players_df.to_dict(orient='records')
    except FileNotFoundError:
        return []

@app.route('/api/')
def home():
    return "Football Analytics API is running!"

@app.route('/api/players', methods=['GET'])
def get_players():
    players = load_players_data()
    return jsonify(players)

@app.route('/api/teams', methods=['GET'])
def get_teams():
    players = load_players_data()
    if players:
        teams = pd.DataFrame(players)['squad'].unique().tolist()
        return jsonify(teams)
    return jsonify([])

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)