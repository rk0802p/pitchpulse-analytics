import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DATASET = os.path.join(BASE_DIR, 'data', 'seasons', '2024-2025', 'top5-players24-25.csv')
if not os.path.exists(DEFAULT_DATASET):
    DEFAULT_DATASET = os.path.join(BASE_DIR, 'data', 'seasons', '2024-2025', 'top5-players24-25.xlsx')
if not os.path.exists(DEFAULT_DATASET):
    DEFAULT_DATASET = os.path.join(BASE_DIR, 'top5-players24-25.csv')
if not os.path.exists(DEFAULT_DATASET):
    DEFAULT_DATASET = os.path.join(BASE_DIR, 'top5-players24-25.xlsx')
DATASET_PATH = os.environ.get('DATASET_PATH', DEFAULT_DATASET)

METADATA = {
    "season": "2024-2025",
    "dataset_name": "Big 5 European Leagues Player Statistics 2024/25",
    "source": "FBref / StatsBomb style player-level aggregates",
    "updated_at": "2024-2025 Regular Season",
    "total_records": 2854,
    "competitions_count": 5,
    "clubs_count": 96,
    "disclaimer": "Player-level aggregates covering the 2024/25 season. Records represent individual spells per club."
}

COMPETITIONS = {
    "eng Premier League": {
        "id": "premier-league",
        "name": "Premier League",
        "country": "England",
        "code": "ENG",
        "raw": "eng Premier League",
        "teams_count": 20
    },
    "es La Liga": {
        "id": "la-liga",
        "name": "La Liga",
        "country": "Spain",
        "code": "ESP",
        "raw": "es La Liga",
        "teams_count": 20
    },
    "it Serie A": {
        "id": "serie-a",
        "name": "Serie A",
        "country": "Italy",
        "code": "ITA",
        "raw": "it Serie A",
        "teams_count": 20
    },
    "de Bundesliga": {
        "id": "bundesliga",
        "name": "Bundesliga",
        "country": "Germany",
        "code": "GER",
        "raw": "de Bundesliga",
        "teams_count": 18
    },
    "fr Ligue 1": {
        "id": "ligue-1",
        "name": "Ligue 1",
        "country": "France",
        "code": "FRA",
        "raw": "fr Ligue 1",
        "teams_count": 18
    }
}

# Lookup index by slug or name
COMPETITION_LOOKUP = {}
for raw_name, info in COMPETITIONS.items():
    COMPETITION_LOOKUP[raw_name.lower()] = raw_name
    COMPETITION_LOOKUP[info['id'].lower()] = raw_name
    COMPETITION_LOOKUP[info['name'].lower()] = raw_name

# Metric definitions dictionary (Phase 2 Item 1)
METRIC_DEFINITIONS = {
    "Rk": {"name": "Rank", "category": "Identity", "description": "Original row rank identifier"},
    "Player": {"name": "Player Name", "category": "Identity", "description": "Full name of the player"},
    "Nation": {"name": "Nationality", "category": "Identity", "description": "Three-letter country code and nationality flag"},
    "Pos": {"name": "Position", "category": "Identity", "description": "Primary playing position (GK, DF, MF, FW)"},
    "Squad": {"name": "Squad / Club", "category": "Identity", "description": "Club team for this record"},
    "Comp": {"name": "Competition", "category": "Identity", "description": "League competition"},
    "Age": {"name": "Age", "category": "Demographics", "description": "Player age in years"},
    "Born": {"name": "Birth Year", "category": "Demographics", "description": "Year of birth"},
    "MP": {"name": "Matches Played", "category": "Playing Time", "description": "Total matches played in the competition"},
    "Starts": {"name": "Starts", "category": "Playing Time", "description": "Total games started in the starting XI"},
    "Min": {"name": "Minutes Played", "category": "Playing Time", "description": "Total minutes on pitch"},
    "90s": {"name": "90s Played", "category": "Playing Time", "description": "Minutes played divided by 90"},
    "Gls": {"name": "Goals", "category": "Scoring", "description": "Total goals scored"},
    "Ast": {"name": "Assists", "category": "Playmaking", "description": "Total assists directly leading to a goal"},
    "G+A": {"name": "Goals + Assists", "category": "Scoring", "description": "Combined goals and assists"},
    "G-PK": {"name": "Non-Penalty Goals", "category": "Scoring", "description": "Goals scored excluding penalty kicks"},
    "PK": {"name": "Penalty Kicks Made", "category": "Scoring", "description": "Penalty kicks successfully converted"},
    "PKatt": {"name": "Penalty Kicks Attempted", "category": "Scoring", "description": "Penalty kick attempts taken"},
    "CrdY": {"name": "Yellow Cards", "category": "Discipline", "description": "Yellow cards received"},
    "CrdR": {"name": "Red Cards", "category": "Discipline", "description": "Red cards received"},
    "xG": {"name": "Expected Goals", "category": "Advanced Scoring", "description": "Statistical model estimate of the quality of scoring chances"},
    "npxG": {"name": "Non-Penalty xG", "category": "Advanced Scoring", "description": "Expected goals excluding penalties"},
    "xAG": {"name": "Expected Assisted Goals", "category": "Advanced Playmaking", "description": "xG of shots assisted by the player (chance creation quality)"},
    "npxG+xAG": {"name": "npxG + xAG", "category": "Advanced Production", "description": "Combined non-penalty expected goals and assisted goals"},
    "PrgC": {"name": "Progressive Carries", "category": "Progression", "description": "Carries that move the ball towards opponent goal by at least 10 yards or into penalty area"},
    "PrgP": {"name": "Progressive Passes", "category": "Progression", "description": "Completed passes that move ball towards opponent goal by at least 10 yards or into penalty area"},
    "PrgR": {"name": "Progressive Receptions", "category": "Progression", "description": "Completed passes received that move play forward towards goal"},
    "PrgC_90": {"name": "Progressive Carries per 90", "category": "Progression Rates", "description": "Progressive carries per 90 minutes played"},
    "PrgP_90": {"name": "Progressive Passes per 90", "category": "Progression Rates", "description": "Progressive passes completed per 90 minutes played"},
    "PrgR_90": {"name": "Progressive Receptions per 90", "category": "Progression Rates", "description": "Progressive passes received per 90 minutes played"},
    "Gls_90": {"name": "Goals per 90", "category": "Rates", "description": "Goals scored per 90 minutes played"},
    "Ast_90": {"name": "Assists per 90", "category": "Rates", "description": "Assists per 90 minutes played"},
    "G+A_90": {"name": "G+A per 90", "category": "Rates", "description": "Goals and assists combined per 90 minutes"},
    "G-PK_90": {"name": "Non-Penalty Goals per 90", "category": "Rates", "description": "Non-penalty goals per 90 minutes"},
    "G+A-PK_90": {"name": "G+A (Non-PK) per 90", "category": "Rates", "description": "Non-penalty goals + assists per 90 minutes"},
    "xG_90": {"name": "xG per 90", "category": "Advanced Rates", "description": "Expected goals per 90 minutes"},
    "xAG_90": {"name": "xAG per 90", "category": "Advanced Rates", "description": "Expected assisted goals per 90 minutes"},
    "xG+xAG_90": {"name": "xG + xAG per 90", "category": "Advanced Rates", "description": "Combined xG and xAG per 90 minutes"},
    "npxG_90": {"name": "npxG per 90", "category": "Advanced Rates", "description": "Non-penalty xG per 90 minutes"},
    "npxG+xAG_90": {"name": "npxG + xAG per 90", "category": "Advanced Rates", "description": "Non-penalty xG + xAG per 90 minutes"}
}

DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:5001",
    "http://127.0.0.1:5001",
]
cors_env = os.environ.get('CORS_ORIGINS')
ALLOWED_ORIGINS = '*' if not cors_env or cors_env == '*' else [o.strip() for o in cors_env.split(',') if o.strip()]

FLASK_ENV = os.environ.get('FLASK_ENV', 'development')
# S1: Fail closed by default if ADMIN_TOKEN is not explicitly configured
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN')
if not ADMIN_TOKEN and (FLASK_ENV == 'testing' or os.environ.get('TESTING') == 'True'):
    ADMIN_TOKEN = 'pitchpulse-admin-test-key'

MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
