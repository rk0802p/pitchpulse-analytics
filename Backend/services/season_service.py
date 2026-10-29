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
    manifest resolution, and quarantine governance for PitchPulse analytics.
    Enforces chronological ordering and flags unverified/quarantined datasets.
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
        """Normalizes various season representations (e.g. '2024/25', '24/25', '2024-2025', '2024-25') to canonical format."""
        if not season_str:
            return self._active_season
        cleaned = str(season_str).strip()
        if re.match(r'^\d{4}-\d{4}$', cleaned):
            return cleaned
        match_slash = re.match(r'^(\d{4})[/-](\d{2,4})$', cleaned)
        if match_slash:
            start = match_slash.group(1)
            end = match_slash.group(2)
            if len(end) == 2:
                end = start[:2] + end
            return f"{start}-{end}"
        match_short = re.match(r'^(\d{2})[/-](\d{2})$', cleaned)
        if match_short:
            start = "20" + match_short.group(1)
            end = "20" + match_short.group(2)
            return f"{start}-{end}"
        return cleaned

    def season_exists(self, season_id):
        s_id = self.resolve_season(season_id)
        path = os.path.join(self.seasons_dir, s_id)
        return os.path.isdir(path)

    def is_season_quarantined(self, season_id):
        """Returns True if the season has been quarantined from authoritative rankings."""
        manifest = self.get_season_manifest(season_id) or {}
        if manifest.get('is_quarantined') is True or manifest.get('dataset_status') == 'quarantined':
            return True
        resolved = self.resolve_season(season_id)
        return resolved == '2025-2026'

    def list_seasons(self):
        """Returns chronological list (oldest to newest) of available historical seasons with quarantine metadata."""
        if not os.path.exists(self.seasons_dir):
            return []

        # Chronological sorting: 2012-2013 -> ... -> 2024-2025 -> 2025-2026
        valid_entries = []
        for entry in sorted(os.listdir(self.seasons_dir)):
            dir_path = os.path.join(self.seasons_dir, entry)
            if not os.path.isdir(dir_path) or not re.match(r'^\d{4}-\d{4}$', entry):
                continue
            valid_entries.append(entry)

        seasons = []
        for entry in valid_entries:
            dir_path = os.path.join(self.seasons_dir, entry)
            manifest_path = os.path.join(dir_path, 'manifest.json')
            manifest = {}
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, 'r', encoding='utf-8') as f:
                        manifest = json.load(f)
                except Exception as e:
                    logger.warning(f"Failed to read manifest for season '{entry}': {e}")

            # Quarantine & governance resolution
            is_quarantined = manifest.get('is_quarantined', (entry == '2025-2026'))
            if is_quarantined:
                dataset_status = 'quarantined'
                status_label = manifest.get('status_label', 'Quarantined / Provisional')
                quarantine_reason = manifest.get(
                    'quarantine_reason',
                    'Composite dataset contains squad attribution anomalies (197 clubs) and unverified projections. Quarantined from authoritative rankings.'
                )
                is_projection = True
            else:
                dataset_status = manifest.get('dataset_status', 'verified_historical')
                status_label = manifest.get('status_label', 'Historical Season')
                quarantine_reason = None
                is_projection = False

            # Human friendly display name e.g. "2023/24 Historical Season"
            short_year = entry.replace('-', '/').replace('20', '', 1)
            display_name = manifest.get('display_name') or (
                f"{short_year} Provisional Season" if is_quarantined else f"{short_year} Historical Season"
            )

            seasons.append({
                'id': entry,
                'canonical_id': entry,
                'name': display_name,
                'display_name': display_name,
                'is_active': (entry == self._active_season),
                'is_baseline': False,
                'is_quarantined': is_quarantined,
                'quarantine_reason': quarantine_reason,
                'dataset_status': dataset_status,
                'status_label': status_label,
                'is_projection': is_projection,
                'records_count': manifest.get('records_count', 0),
                'clubs_count': manifest.get('clubs_count', 0),
                'competitions_count': manifest.get('competitions_count', 5),
                'imported_at': manifest.get('imported_at', 'Completed Season'),
                'source': manifest.get('source', manifest.get('source_name', 'FBref / StatsBomb style aggregates')),
                'source_name': manifest.get('source_name', manifest.get('source')),
                'source_url': manifest.get('source_url'),
                'data_as_of': manifest.get('data_as_of'),
                'verification_notes': manifest.get('verification_notes'),
                'content_hash': manifest.get('content_hash', manifest.get('sha256')),
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
