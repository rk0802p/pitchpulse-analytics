import os
import re
import json
import logging
try:
    from config import BASE_DIR
except ImportError:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

logger = logging.getLogger(__name__)

SEASONS_DIR = os.path.join(BASE_DIR, 'data', 'seasons')
DEFAULT_SEASON = '2024-2025'

class SeasonService:
    """
    Manages multi-season storage, season discovery, active season tracking,
    and manifest resolution for PitchPulse analytics.
    """

    def __init__(self, seasons_dir=None):
        self.seasons_dir = seasons_dir or SEASONS_DIR
        self._active_season = DEFAULT_SEASON

    def get_active_season(self):
        return self._active_season

    def set_active_season(self, season_id):
        resolved = self.resolve_season(season_id)
        if not self.season_exists(resolved):
            raise ValueError(f"Season '{season_id}' does not exist.")
        self._active_season = resolved
        return self._active_season

    def resolve_season(self, season_str):
        """Normalizes various season representations (e.g. '2024/25', '2024-2025') to canonical format."""
        if not season_str:
            return self._active_season
        cleaned = str(season_str).strip()
        if re.match(r'^\d{4}-\d{4}$', cleaned):
            return cleaned
        match_slash = re.match(r'^(\d{4})/(\d{2,4})$', cleaned)
        if match_slash:
            start = match_slash.group(1)
            end = match_slash.group(2)
            if len(end) == 2:
                end = start[:2] + end
            return f"{start}-{end}"
        return cleaned

    def season_exists(self, season_id):
        s_id = self.resolve_season(season_id)
        path = os.path.join(self.seasons_dir, s_id)
        return os.path.isdir(path)

    def list_seasons(self):
        """Returns sorted list of all available seasons with metadata."""
        if not os.path.exists(self.seasons_dir):
            return []

        seasons = []
        for entry in sorted(os.listdir(self.seasons_dir), reverse=True):
            dir_path = os.path.join(self.seasons_dir, entry)
            if not os.path.isdir(dir_path):
                continue

            manifest_path = os.path.join(dir_path, 'manifest.json')
            manifest = {}
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                except Exception as e:
                    logger.warning(f"Failed to read manifest for season '{entry}': {e}")

            display_name = manifest.get('display_name') or f"{entry.replace('-', '/')} Season"
            seasons.append({
                'id': entry,
                'name': display_name,
                'is_active': (entry == self._active_season),
                'is_baseline': manifest.get('is_baseline', entry == DEFAULT_SEASON),
                'records_count': manifest.get('records_count', 0),
                'clubs_count': manifest.get('clubs_count', 0),
                'competitions_count': manifest.get('competitions_count', 5),
                'imported_at': manifest.get('imported_at', 'Unknown'),
                'source': manifest.get('source', 'FBref / StatsBomb style aggregates'),
                'validation_status': manifest.get('validation_status', 'passed'),
                'files': manifest.get('files', {})
            })

        return seasons

    def get_season_manifest(self, season_id):
        s_id = self.resolve_season(season_id)
        dir_path = os.path.join(self.seasons_dir, s_id)
        manifest_path = os.path.join(dir_path, 'manifest.json')
        if not os.path.exists(manifest_path):
            return None
        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading manifest for '{s_id}': {e}")
            return None

    def get_season_file_path(self, season_id, preferred_format='csv'):
        s_id = self.resolve_season(season_id)
        dir_path = os.path.join(self.seasons_dir, s_id)
        if not os.path.isdir(dir_path):
            return None

        # 1. Preferred format first
        if preferred_format == 'csv':
            candidates = [
                os.path.join(dir_path, f"top5-players-{s_id}.csv"),
                os.path.join(dir_path, "top5-players24-25.csv"),
                os.path.join(dir_path, "dataset.csv")
            ]
            for c in candidates:
                if os.path.exists(c):
                    return c

        # 2. Excel candidates
        excel_candidates = [
            os.path.join(dir_path, f"top5-players-{s_id}.xlsx"),
            os.path.join(dir_path, "top5-players24-25.xlsx"),
            os.path.join(dir_path, "dataset.xlsx")
        ]
        for c in excel_candidates:
            if os.path.exists(c):
                return c

        # 3. Fallback: any data file in directory
        for f in os.listdir(dir_path):
            if f.endswith(('.csv', '.xlsx', '.xls')):
                return os.path.join(dir_path, f)

        return None

    def get_download_presets(self):
        """Returns verified online dataset presets for one-click download & testing."""
        return [
            {
                'id': 'top5-2023-2024',
                'season': '2023-2024',
                'title': 'Top 5 European Leagues 2023/24',
                'description': 'Complete player season stats across Premier League, La Liga, Serie A, Bundesliga, and Ligue 1.',
                'url': 'https://raw.githubusercontent.com/JSzamik/FootballDataAnalysis-R-Visualisations/main/top5-players.csv',
                'source': 'FBref / StatsBomb (JSzamik archive)',
                'records_approx': 2852,
                'format': 'csv'
            }
        ]

season_service = SeasonService()
