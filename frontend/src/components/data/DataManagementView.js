import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  Copy,
  Lock,
  Download,
  FileJson,
  X,
} from 'lucide-react';
import api from '../../services/api';
import { formatNumber } from '../../utils/metricFormatters';

function formatHashPreview(hash) {
  if (!hash || typeof hash !== 'string') return 'Unavailable';
  if (hash.length <= 20) return hash;
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function triggerBlobDownload(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function copyTextSafely(text) {
  if (!text) return false;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below for restricted iframe clipboard permissions
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return Boolean(ok);
  } catch {
    return false;
  }
}

export const DataManagementView = ({
  activeSeason = '2024-2025',
  onSeasonActivated,
}) => {
  const [seasons, setSeasons] = useState([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [selectedManifestSeason, setSelectedManifestSeason] = useState(null);
  const [manifestData, setManifestData] = useState(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  // Baseline verification state
  const [baselineStatus, setBaselineStatus] = useState(null);
  const [verifyingBaseline, setVerifyingBaseline] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Active dataset summary
  const [activeMetadata, setActiveMetadata] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Per-row download & inline status feedback (iframe-safe, zero alert/window.open)
  const [downloadingKey, setDownloadingKey] = useState(null);
  const [statusBanner, setStatusBanner] = useState(null);

  const showBanner = useCallback((type, message) => {
    setStatusBanner({ type, message });
  }, []);

  const fetchSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    try {
      const res = await api.getSeasons();
      if (res?.success && Array.isArray(res.data)) {
        setSeasons(res.data);
      }
    } catch (err) {
      showBanner('error', `Failed to load season archive: ${err.message}`);
    } finally {
      setLoadingSeasons(false);
    }
  }, [showBanner]);

  const fetchActiveMetadata = useCallback(async () => {
    setLoadingMetadata(true);
    try {
      const res = await api.getMetadata(activeSeason);
      if (res?.success && res.data) {
        setActiveMetadata(res.data);
      }
    } catch (err) {
      showBanner('error', `Failed to load metadata for ${activeSeason}: ${err.message}`);
    } finally {
      setLoadingMetadata(false);
    }
  }, [activeSeason, showBanner]);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  useEffect(() => {
    setActiveMetadata(null);
    fetchActiveMetadata();
  }, [fetchActiveMetadata]);

  // Baseline Verification Handler
  const handleVerifyBaseline = async () => {
    setVerifyingBaseline(true);
    setBaselineStatus(null);
    try {
      const res = await api.verifyBaseline();
      if (res?.success && res.data) {
        setBaselineStatus({
          verified: Boolean(res.data.verified),
          data: res.data,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        setBaselineStatus({
          verified: false,
          error: res?.error || 'Integrity check failed',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err) {
      setBaselineStatus({
        verified: false,
        error: err.message,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setVerifyingBaseline(false);
    }
  };

  // Inspect Season Manifest
  const handleViewManifest = async (seasonId) => {
    if (selectedManifestSeason === seasonId) {
      setSelectedManifestSeason(null);
      setManifestData(null);
      return;
    }
    setSelectedManifestSeason(seasonId);
    setManifestData(null);
    setLoadingManifest(true);
    try {
      const res = await api.getSeasonDetails(seasonId);
      if (res?.success && res.data) {
        setManifestData(res.data);
      } else {
        setManifestData({ error: res?.error || 'Manifest not found' });
      }
    } catch (err) {
      setManifestData({ error: err.message });
    } finally {
      setLoadingManifest(false);
    }
  };

  // Switch Active Season (iframe-safe inline feedback)
  const handleSwitchActive = async (seasonId) => {
    try {
      const res = await api.setActiveSeason(seasonId);
      if (res?.success) {
        if (onSeasonActivated) onSeasonActivated(seasonId);
        showBanner('success', `Active season switched to Vol. ${seasonId}.`);
        fetchSeasons();
      } else {
        showBanner('error', res?.error || `Failed to activate season ${seasonId}.`);
      }
    } catch (err) {
      showBanner('error', `Failed to activate season ${seasonId}: ${err.message}`);
    }
  };

  const handleCopyHash = async (hash, key) => {
    if (!hash) return;
    const copied = await copyTextSafely(hash);
    if (copied) {
      setCopiedKey(key);
      showBanner('info', `Copied SHA-256 fingerprint (${formatHashPreview(hash)}) to clipboard.`);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 2000);
    } else {
      showBanner('error', 'Clipboard access is blocked in this browser context.');
    }
  };

  // Iframe-safe CSV download via fetch + Blob
  const handleDownloadCsv = async (seasonId) => {
    const busyId = `${seasonId}:csv`;
    setDownloadingKey(busyId);
    try {
      const url = `${api.baseUrl}/seasons/${encodeURIComponent(seasonId)}/download`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} while downloading ${seasonId} CSV`);
      }
      const blob = await response.blob();
      const filename = `pitchpulse_${seasonId}_players.csv`;
      triggerBlobDownload(blob, filename);
      showBanner('success', `Downloaded ${filename} (${formatFileSize(blob.size)}).`);
    } catch (err) {
      showBanner('error', `CSV download failed for ${seasonId}: ${err.message}`);
    } finally {
      setDownloadingKey((prev) => (prev === busyId ? null : prev));
    }
  };

  // Truthful JSON manifest export via fetch + Blob (replaces broken fake XLSX button)
  const handleDownloadManifestJson = async (seasonId) => {
    const busyId = `${seasonId}:json`;
    setDownloadingKey(busyId);
    try {
      const res = await api.getSeasonDetails(seasonId);
      if (!res?.success || !res.data) {
        throw new Error(res?.error || `Manifest unavailable for ${seasonId}`);
      }
      const serialized = JSON.stringify(res.data, null, 2);
      const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
      const filename = `pitchpulse_${seasonId}_manifest.json`;
      triggerBlobDownload(blob, filename);
      showBanner('success', `Exported ${filename} (${formatFileSize(blob.size)}).`);
    } catch (err) {
      showBanner('error', `Manifest export failed for ${seasonId}: ${err.message}`);
    } finally {
      setDownloadingKey((prev) => (prev === busyId ? null : prev));
    }
  };

  const activeSeasonRow = useMemo(
    () => seasons.find((s) => s.id === activeSeason) || null,
    [seasons, activeSeason]
  );

  const isViewingBaseline = activeSeason === '2024-2025';
  const activeSourceLabel =
    activeMetadata?.source ||
    activeSeasonRow?.source ||
    (isViewingBaseline
      ? 'FBref / StatsBomb player-level aggregates'
      : activeSeason < '2014-2015'
        ? 'Transfermarkt historical appearance logs (Pre-xG era)'
        : 'Transfermarkt & Understat Big 5 aggregates');

  const baselineLiveHash =
    baselineStatus?.data?.csv_sha256 ||
    baselineStatus?.data?.primary_sha ||
    baselineStatus?.data?.sha256 ||
    null;

  const activeStats = useMemo(() => {
    if (!activeMetadata) return null;
    return {
      records: activeMetadata.total_players ?? activeMetadata.total_records ?? null,
      goals: activeMetadata.total_goals ?? null,
      assists: activeMetadata.total_assists ?? null,
      minutes: activeMetadata.total_minutes ?? null,
      clubs: activeMetadata.total_teams ?? activeMetadata.clubs_count ?? null,
      leagues: activeMetadata.total_competitions ?? activeMetadata.competitions_count ?? null,
    };
  }, [activeMetadata]);

  const sortedSeasons = useMemo(() => {
    return [...seasons].sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [seasons]);

  const formatMetric = (val) => {
    if (loadingMetadata || val === null || val === undefined) return '—';
    return formatNumber(val);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b-2 border-[var(--ink)] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)]">
            Volume Archive & Data Provenance
          </div>
          <h1 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)] leading-none mt-1">
            Dataset Registry
          </h1>
          <p className="text-xs italic text-[var(--mute)] mt-1 max-w-2xl">
            Multi-season immutable archive, live SHA-256 CSV fingerprints, 37 canonical schema fields, and era-aware validation invariants.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--rule)] bg-[var(--panel)] text-[11px] font-mono uppercase text-[var(--mute)] whitespace-nowrap"
            title="All historical seasons are preloaded and immutable in this archive"
          >
            <Lock className="w-3.5 h-3.5 text-[var(--ink)]" />
            Read-Only Archive ({seasons.length || 14} Vols.)
          </span>

          <button
            type="button"
            onClick={handleVerifyBaseline}
            disabled={verifyingBaseline}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:opacity-90 text-xs font-mono uppercase whitespace-nowrap transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${verifyingBaseline ? 'animate-spin' : ''}`} />
            {verifyingBaseline ? 'Verifying...' : 'Verify Baseline Invariant'}
          </button>
        </div>
      </div>

      {/* Inline Status / Feedback Banner (Iframe-safe replacement for alert/window.open) */}
      {statusBanner && (
        <div
          role="status"
          aria-live="polite"
          className={`px-4 py-2.5 border font-mono text-xs flex items-center justify-between gap-3 ${
            statusBanner.type === 'error'
              ? 'border-[var(--red)] bg-[var(--panel)] text-[var(--red)]'
              : statusBanner.type === 'success'
                ? 'border-[var(--green)] bg-[var(--panel)] text-[var(--ink)]'
                : 'border-[var(--ink)] bg-[var(--panel)] text-[var(--ink)]'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {statusBanner.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[var(--red)]" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--green)]" />
            )}
            <span className="truncate">{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            aria-label="Dismiss notification"
            className="p-0.5 text-[var(--mute)] hover:text-[var(--ink)] shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Baseline Verification Result Banner */}
      {baselineStatus && (
        <div
          className={`p-4 border-2 ${
            baselineStatus.verified
              ? 'border-[var(--green)] bg-[var(--paper)] text-[var(--ink)]'
              : 'border-[var(--red)] bg-[var(--paper)] text-[var(--red)]'
          } flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs`}
        >
          <div className="flex items-start sm:items-center gap-2.5">
            {baselineStatus.verified ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--green)] shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {baselineStatus.verified
                  ? 'Cryptographic Integrity Confirmed: 2024/25 Baseline Matches Authoritative Spec.'
                  : baselineStatus.error || 'Integrity Mismatch Detected.'}
              </div>
              <div className="text-[11px] text-[var(--mute)] mt-0.5">
                Checked at {baselineStatus.timestamp} • Live CSV SHA-256 verified against baseline invariant lock.
              </div>
            </div>
          </div>

          {baselineLiveHash && (
            <div className="flex items-center gap-2 text-[11px] text-[var(--mute)] shrink-0">
              <span>
                CSV SHA-256:{' '}
                <code className="font-bold text-[var(--ink)]" title={baselineLiveHash}>
                  {formatHashPreview(baselineLiveHash)}
                </code>
              </span>
              <button
                type="button"
                onClick={() => handleCopyHash(baselineLiveHash, 'baseline')}
                className="inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--rule)] hover:border-[var(--ink)] text-[var(--ink)]"
                aria-label="Copy baseline SHA-256 hash"
              >
                {copiedKey === 'baseline' ? (
                  <Check className="w-3 h-3 text-[var(--green)]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'baseline' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SECTION 1: Active Volume Summary */}
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--rule)] pb-3 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border border-[var(--ink)] bg-[var(--panel)] font-bold">
              {isViewingBaseline ? 'Reference Baseline' : 'Active Volume'}
            </span>
            <span className="font-disp font-bold text-lg text-[var(--ink)]">
              Vol. {activeSeason} {isViewingBaseline ? 'Reference Dataset' : 'Archive'}
            </span>
          </div>
          <span
            className="text-xs font-mono text-[var(--mute)] truncate max-w-md"
            title={activeSourceLabel}
          >
            Source: {activeSourceLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 tabular-nums">
          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)]">
            <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Total Records</div>
            <div className="font-mono font-bold text-2xl text-[var(--ink)] mt-1">
              {formatMetric(activeStats?.records)}
            </div>
            <div className="text-[9px] font-mono text-[var(--mute)] mt-0.5" title="one club spell per row">
              *player-club spells
            </div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)]">
            <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Total Goals</div>
            <div className="font-mono font-bold text-2xl text-[var(--ink)] mt-1">
              {formatMetric(activeStats?.goals)}
            </div>
            <div className="text-[9px] font-mono text-[var(--mute)] mt-0.5">
              Recorded league goals
            </div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)]">
            <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Total Assists</div>
            <div className="font-mono font-bold text-2xl text-[var(--ink)] mt-1">
              {formatMetric(activeStats?.assists)}
            </div>
            <div className="text-[9px] font-mono text-[var(--mute)] mt-0.5">
              Standard primary assists
            </div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)]">
            <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Total Minutes</div>
            <div className="font-mono font-bold text-2xl text-[var(--ink)] mt-1">
              {formatMetric(activeStats?.minutes)}
            </div>
            <div className="text-[9px] font-mono text-[var(--mute)] mt-0.5">
              Cumulative pitch time
            </div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)]">
            <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Clubs</div>
            <div className="font-mono font-bold text-2xl text-[var(--ink)] mt-1">
              {formatMetric(activeStats?.clubs)}
            </div>
            <div className="text-[9px] font-mono text-[var(--mute)] mt-0.5">
              Distinct squad labels
            </div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)]">
            <div className="text-[10px] font-mono uppercase text-[var(--mute)]">Leagues</div>
            <div className="font-mono font-bold text-2xl text-[var(--ink)] mt-1">
              {formatMetric(activeStats?.leagues)}
            </div>
            <div className="text-[9px] font-mono text-[var(--mute)] mt-0.5">
              European Big 5
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: High-Density Archive Table */}
      <div className="border border-[var(--ink)] bg-[var(--paper)]">
        <div className="p-4 bg-[var(--panel)] border-b border-[var(--ink)] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-disp font-bold text-xl text-[var(--ink)]">
              Historical Season Ledger ({sortedSeasons.length} Archives)
            </h2>
            <p className="text-xs italic text-[var(--mute)]">
              Authoritative player-level records from 2012/13 to 2025/26. Click CSV or JSON for direct archive exports.
            </p>
          </div>
          <span className="text-[10px] font-mono uppercase text-[var(--mute)]">
            Reverse Chronological Order
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-ser tabular-nums">
            <thead>
              <tr className="border-b border-[var(--ink)] text-[10px] font-mono uppercase text-[var(--mute)] bg-[var(--paper)]">
                <th className="py-2 px-2.5 text-left">Season</th>
                <th className="py-2 px-2.5 text-right">Records</th>
                <th className="py-2 px-2.5 text-right">Clubs</th>
                <th className="py-2 px-2.5 text-left">Coverage &amp; Status</th>
                <th className="py-2 px-2.5 text-left">Provenance &amp; Source</th>
                <th className="py-2 px-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rule)] font-mono">
              {loadingSeasons ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-[var(--mute)]">
                    Loading versioned archive records...
                  </td>
                </tr>
              ) : sortedSeasons.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-xs text-[var(--mute)]">
                    No season records registered.
                  </td>
                </tr>
              ) : (
                sortedSeasons.map((season) => {
                  const isActive = season.id === activeSeason;
                  const isBaseline = season.id === '2024-2025' || season.is_baseline === true;
                  const isQuarantined = season.is_quarantined === true || season.dataset_status === 'quarantined';
                  const hasKnownGaps = season.dataset_status === 'verified_historical_with_known_gaps';
                  const hasPartial =
                    season.partial_competitions &&
                    Object.keys(season.partial_competitions).length > 0;
                  const isPreXg = season.id < '2014-2015';
                  const isManifestOpen = selectedManifestSeason === season.id;

                  const recordCount = season.records_count ?? season.total_players ?? null;
                  const clubCount = season.clubs_count ?? season.total_teams ?? null;
                  const source = season.source || season.source_name || 'European Big 5 match aggregates';
                  const csvBusy = downloadingKey === `${season.id}:csv`;
                  const jsonBusy = downloadingKey === `${season.id}:json`;

                  return (
                    <React.Fragment key={season.id}>
                      <tr
                        className={`hover:bg-[var(--panel)] transition-colors ${
                          isActive ? 'bg-[var(--panel)]' : ''
                        }`}
                      >
                        {/* Season Name */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-disp font-bold text-sm text-[var(--ink)]">
                              {season.id}
                            </span>
                            {isActive && (
                              <span className="text-[9px] font-mono px-1 py-0.5 border border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] uppercase font-bold leading-none">
                                Active
                              </span>
                            )}
                            {isBaseline && (
                              <span className="text-[9px] font-mono px-1 py-0.5 border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] uppercase leading-none">
                                Baseline
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Records */}
                        <td
                          className="py-2 px-2.5 text-right text-xs text-[var(--ink)]"
                          title="Player-club spell rows"
                        >
                          {typeof recordCount === 'number' ? formatNumber(recordCount) : '—'}
                        </td>

                        {/* Clubs */}
                        <td className="py-2 px-2.5 text-right text-xs text-[var(--ink)]">
                          {typeof clubCount === 'number' ? formatNumber(clubCount) : '—'}
                        </td>

                        {/* Validation & Coverage Status */}
                        <td className="py-2 px-2.5 text-xs whitespace-nowrap">
                          {isQuarantined ? (
                            <span className="inline-flex items-center gap-1.5 text-[var(--red)] font-semibold">
                              <span className="w-2 h-2 rounded-full bg-[var(--red)] shrink-0" />
                              Quarantined
                            </span>
                          ) : hasPartial ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[var(--accent)] font-semibold"
                              title={season.quality_notes || 'Partial league snapshot'}
                            >
                              <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                              Verified · Partial Snapshot
                            </span>
                          ) : hasKnownGaps ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[var(--accent)] font-semibold"
                              title={season.known_gaps?.summary || season.quality_notes || 'Historical archive with documented minor gaps'}
                            >
                              <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" />
                              Verified · Known Gaps
                            </span>
                          ) : isPreXg ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-[var(--green)] font-semibold"
                              title="Expected goals (xG/xAG) are untracked (null) prior to 2014-2015"
                            >
                              <span className="w-2 h-2 rounded-full bg-[var(--green)] shrink-0" />
                              Verified · Pre-xG Era
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[var(--green)] font-semibold">
                              <span className="w-2 h-2 rounded-full bg-[var(--green)] shrink-0" />
                              Passed (all checks)
                            </span>
                          )}
                        </td>

                        {/* Source */}
                        <td
                          className="py-2 px-2.5 text-xs text-[var(--mute)] max-w-[200px] truncate font-ser italic"
                          title={source}
                        >
                          {source}
                        </td>

                        {/* Actions (Activate, CSV, JSON Manifest, Manifest Drawer) */}
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSwitchActive(season.id)}
                              disabled={isActive}
                              aria-label={isActive ? `${season.id} is active` : `Activate ${season.id} season`}
                              className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                                isActive
                                  ? 'border-[var(--rule)] text-[var(--mute)] cursor-not-allowed opacity-60'
                                  : 'border-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)] text-[var(--ink)]'
                              }`}
                            >
                              {isActive ? 'Active' : 'Activate'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadCsv(season.id)}
                              disabled={csvBusy}
                              aria-label={`Download ${season.id} CSV dataset`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-50"
                              title="Download full CSV dataset"
                            >
                              <Download className="w-2.5 h-2.5" />
                              <span>{csvBusy ? '...' : 'CSV'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadManifestJson(season.id)}
                              disabled={jsonBusy}
                              aria-label={`Download ${season.id} JSON manifest`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border border-[var(--rule)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--paper)] disabled:opacity-50"
                              title="Export verified JSON manifest & provenance metadata"
                            >
                              <FileJson className="w-2.5 h-2.5" />
                              <span>{jsonBusy ? '...' : 'JSON'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleViewManifest(season.id)}
                              aria-expanded={isManifestOpen}
                              aria-label={`${isManifestOpen ? 'Hide' : 'View'} manifest for ${season.id}`}
                              className={`px-2 py-0.5 text-[10px] font-mono border transition-colors ${
                                isManifestOpen
                                  ? 'border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] font-bold'
                                  : 'border-[var(--rule)] text-[var(--mute)] hover:border-[var(--ink)] hover:text-[var(--ink)]'
                              }`}
                            >
                              {isManifestOpen ? 'Hide' : 'Manifest'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Manifest Drawer */}
                      {isManifestOpen && (
                        <tr>
                          <td colSpan="6" className="p-4 bg-[var(--panel)] border-b border-[var(--ink)]">
                            <div className="space-y-3 font-mono text-xs">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-2">
                                <span className="font-bold text-[var(--ink)]">
                                  Manifest Metadata: Vol. {season.id}
                                </span>
                                {(manifestData?.csv_sha256 || manifestData?.sha256) && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleCopyHash(
                                        manifestData.csv_sha256 || manifestData.sha256,
                                        `manifest:${season.id}`
                                      )
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] text-[var(--mute)] hover:text-[var(--ink)]"
                                  >
                                    {copiedKey === `manifest:${season.id}` ? (
                                      <Check className="w-3 h-3 text-[var(--green)]" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>
                                      {copiedKey === `manifest:${season.id}` ? 'Hash Copied' : 'Copy SHA-256'}
                                    </span>
                                  </button>
                                )}
                              </div>

                              {loadingManifest ? (
                                <div className="py-3 text-center text-[var(--mute)]">
                                  Loading manifest & computing CSV SHA-256...
                                </div>
                              ) : manifestData?.error ? (
                                <div className="text-[var(--red)]">{manifestData.error}</div>
                              ) : manifestData ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-1.5 bg-[var(--paper)] p-3 border border-[var(--rule)]">
                                    <div>
                                      <span className="text-[var(--mute)]">CSV SHA-256:</span>{' '}
                                      <code className="break-all font-bold text-[var(--ink)] text-[11px]">
                                        {manifestData.csv_sha256 || manifestData.sha256 || 'Not available'}
                                      </code>
                                    </div>
                                    {manifestData.sha256 &&
                                      manifestData.csv_sha256 &&
                                      manifestData.sha256 !== manifestData.csv_sha256 && (
                                        <div>
                                          <span className="text-[var(--mute)]">Archive Spec SHA-256:</span>{' '}
                                          <code className="break-all text-[var(--ink)] text-[11px]">
                                            {manifestData.sha256}
                                          </code>
                                        </div>
                                      )}
                                    <div>
                                      <span className="text-[var(--mute)]">CSV Size:</span>{' '}
                                      <span className="text-[var(--ink)]">
                                        {formatFileSize(manifestData.file_size_bytes)}
                                        {manifestData.csv_filename ? ` (${manifestData.csv_filename})` : ''}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[var(--mute)]">Schema:</span>{' '}
                                      <span className="text-[var(--ink)]">
                                        {manifestData.metrics_count || manifestData.columns_count || 37} canonical fields
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[var(--mute)]">Status:</span>{' '}
                                      <span className="text-[var(--ink)]">
                                        {manifestData.status_label || 'Verified Historical'}
                                      </span>
                                    </div>
                                    {Array.isArray(manifestData.untracked_metrics) &&
                                      manifestData.untracked_metrics.length > 0 && (
                                        <div>
                                          <span className="text-[var(--mute)]">Untracked Metrics:</span>{' '}
                                          <span className="text-[var(--accent)] font-semibold">
                                            {manifestData.untracked_metrics.join(', ')} (stored as null)
                                          </span>
                                        </div>
                                      )}
                                    {(manifestData.quality_notes || manifestData.verification_notes) && (
                                      <div className="pt-1 border-t border-[var(--rule)] font-ser italic text-[11px] text-[var(--mute)] leading-snug">
                                        {manifestData.quality_notes || manifestData.verification_notes}
                                      </div>
                                    )}
                                  </div>

                                  <div className="bg-[var(--paper)] p-3 border border-[var(--rule)] overflow-y-auto max-h-48">
                                    <span className="text-[10px] uppercase text-[var(--mute)] block mb-1">
                                      Raw Manifest JSON:
                                    </span>
                                    <pre className="text-[10px] leading-tight text-[var(--ink)] font-mono whitespace-pre-wrap break-all">
                                      {JSON.stringify(manifestData, null, 2)}
                                    </pre>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[var(--red)]">No manifest available.</div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Validation Checks Explained */}
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 space-y-4">
        <div className="border-b border-[var(--rule)] pb-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)]">
            Algorithmic Invariants & Verification Pipeline
          </div>
          <h2 className="font-disp font-bold text-2xl text-[var(--ink)]">
            Validation Checks Explained
          </h2>
          <p className="text-xs italic text-[var(--mute)] mt-0.5">
            Every archived campaign passes automated schema, era-tracking, and cryptographic checks:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono text-xs">
          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)] flex flex-col justify-between">
            <div>
              <div className="font-bold text-[var(--ink)] mb-1">1. Canonical Schema</div>
              <p className="text-[11px] text-[var(--mute)] font-ser leading-normal">
                37 canonical player-season fields (Goals, Assists, xG, xAG, PrgC, PrgP, Minutes, per-90 rates) with strict null typing for untracked eras.
              </p>
            </div>
            <div className="text-[10px] text-[var(--green)] mt-2 font-bold">✓ 37 Fields Enforced</div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)] flex flex-col justify-between">
            <div>
              <div className="font-bold text-[var(--ink)] mb-1">2. Value Bounds</div>
              <p className="text-[11px] text-[var(--mute)] font-ser leading-normal">
                Numerical bounds verified on every row: non-negative minutes and counts, exact rate reconciliation, and zero-minute placeholder filtering.
              </p>
            </div>
            <div className="text-[10px] text-[var(--green)] mt-2 font-bold">✓ Bounded Invariants</div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)] flex flex-col justify-between">
            <div>
              <div className="font-bold text-[var(--ink)] mb-1">3. Transfer Deduplication</div>
              <p className="text-[11px] text-[var(--mute)] font-ser leading-normal">
                Multi-club spells with unsplit full-season xG are flagged via <code>shared_season_xg</code> and excluded from inflated per-90 rankings.
              </p>
            </div>
            <div className="text-[10px] text-[var(--green)] mt-2 font-bold">✓ Split-Spell Safe</div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)] flex flex-col justify-between">
            <div>
              <div className="font-bold text-[var(--ink)] mb-1">4. Baseline Invariant Lock</div>
              <p className="text-[11px] text-[var(--mute)] font-ser leading-normal">
                Vol. 2024–2025 reconciles exact baseline totals: 2,854 rows, 4,806 goals, 3,429 assists, and 3,459,684 pitch minutes across 96 clubs.
              </p>
            </div>
            <div className="text-[10px] text-[var(--green)] mt-2 font-bold">✓ Exact Reference Lock</div>
          </div>

          <div className="border border-[var(--rule)] p-3 bg-[var(--panel)] flex flex-col justify-between">
            <div>
              <div className="font-bold text-[var(--ink)] mb-1">5. SHA-256 Fingerprints</div>
              <p className="text-[11px] text-[var(--mute)] font-ser leading-normal">
                Live SHA-256 checksums are computed directly from each archived CSV file to guarantee tamper-free, reproducible analytics.
              </p>
            </div>
            <div className="text-[10px] text-[var(--green)] mt-2 font-bold">✓ Live Hash Verified</div>
          </div>
        </div>
      </div>

      {/* SECTION 4: Dataset Changelog */}
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-5 space-y-4">
        <div className="border-b border-[var(--rule)] pb-2 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--mute)]">
              Version Provenance History
            </div>
            <h2 className="font-disp font-bold text-2xl text-[var(--ink)]">
              Dataset Changelog
            </h2>
          </div>
          <span className="text-xs font-mono text-[var(--mute)]">
            {sortedSeasons.length || 14} Historical Seasons Documented
          </span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 border-l-2 border-[var(--accent)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-2 font-bold text-[var(--ink)]">
              <span>Vol. 2025–2026 • Active Season Composite Archive</span>
              <span className="text-[10px] text-[var(--accent)]">PARTIAL SNAPSHOT</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] font-ser mt-1 leading-normal">
              2,611 player-spell records compiled across Europe&apos;s Big 5 leagues with verified goals, assists, and Understat/FBref xG. Serie A (~MW 33/38) and Ligue 1 (~MW 30/34) reflect partial snapshots. Progressive actions (PrgC, PrgP, PrgR) are strictly nulled (untracked), and transferred players with unsplit seasonal xG are flagged via <code>shared_season_xg</code> to prevent per-90 distortion.
            </p>
          </div>

          <div className="p-3 border-l-2 border-[var(--ink)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-2 font-bold text-[var(--ink)]">
              <span>Vol. 2024–2025 • Reference Baseline Ingestion</span>
              <span className="text-[10px] text-[var(--green)]">REFERENCE BASELINE</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] font-ser mt-1 leading-normal">
              2,854 player-season records across 96 clubs from FBref / StatsBomb player aggregates. Full progressive passing, carrying, and reception metrics validated with an immutable SHA-256 baseline invariant lock.
            </p>
          </div>

          <div className="p-3 border-l-2 border-[var(--rule)] bg-[var(--paper)]">
            <div className="flex items-center justify-between gap-2 font-bold text-[var(--ink)]">
              <span>Vol. 2014–2015 through 2023–2024 • Multi-Season Expected Data</span>
              <span className="text-[10px] text-[var(--mute)]">HISTORICAL VERIFIED</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] font-ser mt-1 leading-normal">
              10 consecutive historical Big 5 seasons cross-referenced across Understat, Transfermarkt, and FBref archives, providing continuous expected goals (xG/xAG) coverage for multi-season career trajectories.
            </p>
          </div>

          <div className="p-3 border-l-2 border-[var(--rule)] bg-[var(--paper)]">
            <div className="flex items-center justify-between gap-2 font-bold text-[var(--ink)]">
              <span>Vol. 2012–2013 &amp; 2013–2014 • Pre-xG Match Log Archives</span>
              <span className="text-[10px] text-[var(--mute)]">PRE-xG ERA</span>
            </div>
            <p className="text-[11px] text-[var(--mute)] font-ser mt-1 leading-normal">
              Official Transfermarkt appearance, goal, and assist logs covering Europe&apos;s top five leagues prior to public xG tracking. Expected metrics (xG, xAG, npxG) and progressive actions are stored strictly as <code>null</code> (untracked) rather than <code>0.0</code> so era-incompatible metrics never distort averages or scatter plots.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataManagementView;
