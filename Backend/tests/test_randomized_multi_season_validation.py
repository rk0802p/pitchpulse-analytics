import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.validate_randomized_players import MultiSeasonAuditor

class TestRandomizedMultiSeasonValidation(unittest.TestCase):
    """
    Automated regression test suite executing randomized player sampling and independent
    statistical verification across all 14 seasons in the repository.
    """

    def test_randomized_validation_across_all_seasons_seed_42(self):
        """Run fast randomized player audit across all 14 seasons (seed 42, 2 samples per season)."""
        auditor = MultiSeasonAuditor(seed=42, samples_per_season=2)
        report = auditor.run_full_audit()

        self.assertGreaterEqual(report['seasons_count'], 14)
        self.assertGreaterEqual(report['total_metrics_checked'], 250)
        self.assertEqual(report['total_metrics_failed'], 0, f"Validation failures detected: {report['failures']}")
        self.assertEqual(report['accuracy_percentage'], 100.0)

    def test_cross_season_player_continuity_and_era_isolation(self):
        """Verify matched players between 2024-2025 and 2018-2019 maintain isolated era-specific metric tracking."""
        auditor = MultiSeasonAuditor(seed=123, samples_per_season=1)
        cross_season_checks = auditor.audit_cross_season_matching(count=3)

        self.assertGreaterEqual(len(cross_season_checks), 3)
        for check in cross_season_checks:
            self.assertEqual(check['status'], 'PASS', f"Failed cross-season check for {check['player']}")
            self.assertTrue(check['prgc_24_tracked'], f"PrgC should be tracked in 2024-2025 for {check['player']}")
            self.assertFalse(check['prgc_18_tracked'], f"PrgC should NOT be tracked in 2018-2019 for {check['player']}")

if __name__ == '__main__':
    unittest.main()
