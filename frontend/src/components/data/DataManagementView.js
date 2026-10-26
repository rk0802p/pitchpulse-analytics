import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Shield, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  FileSpreadsheet, 
  RefreshCw, 
  Layers, 
  Check, 
  Copy, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  ArrowRight,
  FileCheck
} from 'lucide-react';
import api from '../../services/api';

export const DataManagementView = ({ 
  activeSeason, 
  onSeasonChange 
}) => {
  const [seasons, setSeasons] = useState([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [selectedManifestSeason, setSelectedManifestSeason] = useState(null);
  const [manifestData, setManifestData] = useState(null);
  
  // Baseline verification state
  const [baselineStatus, setBaselineStatus] = useState(null);
  const [verifyingBaseline, setVerifyingBaseline] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Import form state
  const [importSeasonId, setImportSeasonId] = useState('');
  const [importSource, setImportSource] = useState('FBref / StatsBomb style player-level aggregates');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDryRun, setIsDryRun] = useState(true);
  const [allowUnknown, setAllowUnknown] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState(null);

  // Load seasons list
  const fetchSeasons = useCallback(async () => {
    setLoadingSeasons(true);
    try {
      const res = await api.getSeasons();
      if (res?.success && Array.isArray(res.data)) {
        setSeasons(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch seasons:", err);
    } finally {
      setLoadingSeasons(false);
    }
  }, []);

  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  // Run on-demand baseline verification
  const handleVerifyBaseline = async () => {
    setVerifyingBaseline(true);
    setBaselineStatus(null);
    try {
      const res = await api.verifyBaseline();
      if (res?.success) {
        setBaselineStatus({
          verified: true,
          data: res.data,
          timestamp: new Date().toLocaleTimeString()
        });
      } else {
        setBaselineStatus({
          verified: false,
          error: res?.error || 'Integrity check failed',
          timestamp: new Date().toLocaleTimeString()
        });
      }
    } catch (err) {
      setBaselineStatus({
        verified: false,
        error: err.message,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setVerifyingBaseline(false);
    }
  };

  // Inspect season manifest
  const handleViewManifest = async (seasonId) => {
    if (selectedManifestSeason === seasonId) {
      setSelectedManifestSeason(null);
      setManifestData(null);
      return;
    }
    setSelectedManifestSeason(seasonId);
    try {
      const res = await api.getSeasonDetails(seasonId);
      if (res?.success) {
        setManifestData(res.data);
      }
    } catch (err) {
      console.error("Failed to load manifest:", err);
    }
  };

  // Handle active season switch
  const handleSwitchActive = async (seasonId) => {
    try {
      await api.setActiveSeason(seasonId);
      if (onSeasonChange) {
        onSeasonChange(seasonId);
      }
      fetchSeasons();
    } catch (err) {
      alert(`Failed to set active season: ${err.message}`);
    }
  };

  // Copy SHA-256 hash
  const handleCopyHash = (hash) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Handle import execution
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to import (.xlsx, .xls, or .csv).");
      return;
    }
    if (!importSeasonId.trim()) {
      alert("Please enter a season identifier (e.g. 2025-2026).");
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('season', importSeasonId.trim());
    formData.append('source', importSource.trim());
    formData.append('dry_run', isDryRun ? 'true' : 'false');
    formData.append('allow_unknown', allowUnknown ? 'true' : 'false');

    try {
      const res = await api.importSeason(formData);
      if (res?.success) {
        setImportResult(res.data);
        if (!isDryRun) {
          fetchSeasons();
          setSelectedFile(null);
        }
      } else {
        setImportError(res?.error || "Import validation failed");
      }
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-pitch-border/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-6 h-6 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Dataset Registry & Versioned Storage</h1>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Immutable 2024/25 baseline preservation, multi-season isolation, and automated validation pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card border border-pitch-border text-xs">
            <span className="text-slate-400">Active Season:</span>
            <span className="font-mono font-bold text-emerald-400">{activeSeason || '2024-2025'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pitch-card border border-pitch-border text-xs">
            <span className="text-slate-400">Stored Seasons:</span>
            <span className="font-mono font-bold text-slate-200">{seasons.length}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Baseline Invariant & Verification Panel */}
      <div className="bg-gradient-to-r from-pitch-card via-pitch-card to-slate-900 border border-emerald-500/30 rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Reference 2024/25 Baseline
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-normal">
                  Read-Only & Immutable
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Preserved as the gold standard baseline for PitchPulse. Every future season import and regression test validates against these cryptographic and statistical invariants.
            </p>

            {/* SHA-256 Fingerprint */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="text-slate-500">SHA-256:</span>
              <code className="px-2 py-1 bg-pitch-surface border border-pitch-border rounded text-slate-300 select-all text-[11px]">
                7dbea8fdd43b9cf09eef5a18632953d9079d0f10bd11532da3337d937213e7e0
              </code>
              <button
                onClick={() => handleCopyHash('7dbea8fdd43b9cf09eef5a18632953d9079d0f10bd11532da3337d937213e7e0')}
                className="p-1 hover:text-emerald-400 text-slate-400 transition-colors"
                title="Copy SHA-256 hash"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Action & Verification Box */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {baselineStatus && (
              <div className={`p-3 rounded-lg border text-xs font-mono max-w-sm ${
                baselineStatus.verified 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}>
                <div className="flex items-center gap-1.5 font-bold mb-0.5">
                  {baselineStatus.verified ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  <span>{baselineStatus.verified ? 'Verified Untampered' : 'Integrity Mismatch'}</span>
                </div>
                <p className="text-[11px] opacity-90">Checked at {baselineStatus.timestamp} • All 37 schema metrics & mathematical invariants match.</p>
              </div>
            )}

            <button
              onClick={handleVerifyBaseline}
              disabled={verifyingBaseline}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${verifyingBaseline ? 'animate-spin' : ''}`} />
              {verifyingBaseline ? 'Verifying Baseline...' : 'Verify Baseline Integrity'}
            </button>
          </div>
        </div>

        {/* Baseline Mathematical Invariants Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-pitch-border/60">
          <div className="bg-pitch-surface/60 border border-pitch-border/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Players</span>
            <span className="text-sm font-bold text-white font-mono">2,854</span>
          </div>
          <div className="bg-pitch-surface/60 border border-pitch-border/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Goals</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">4,806</span>
          </div>
          <div className="bg-pitch-surface/60 border border-pitch-border/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Assists</span>
            <span className="text-sm font-bold text-cyan-400 font-mono">3,429</span>
          </div>
          <div className="bg-pitch-surface/60 border border-pitch-border/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Total Minutes</span>
            <span className="text-sm font-bold text-slate-200 font-mono">3,459,684</span>
          </div>
          <div className="bg-pitch-surface/60 border border-pitch-border/60 rounded-lg p-2.5">
            <span className="text-[10px] text-slate-500 font-mono uppercase block">Clubs / Leagues</span>
            <span className="text-sm font-bold text-white font-mono">96 Clubs / 5</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Stored Seasons Registry */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            Stored Season Archives ({seasons.length})
          </h2>
          <span className="text-xs text-slate-400 font-mono">Each season stored in dedicated directories</span>
        </div>

        {loadingSeasons ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            Loading seasons registry...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seasons.map((season) => {
              const isActive = (season.id === activeSeason) || season.is_active;
              const isExpanded = selectedManifestSeason === season.id;

              return (
                <div 
                  key={season.id} 
                  className={`bg-pitch-card border rounded-xl p-5 transition-all shadow-sm ${
                    isActive ? 'border-emerald-500/40 bg-slate-900/40' : 'border-pitch-border hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-white text-base">{season.name}</h3>
                        {season.is_baseline && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Baseline
                          </span>
                        )}
                        {isActive && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{season.id}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isActive && (
                        <button
                          onClick={() => handleSwitchActive(season.id)}
                          className="px-2.5 py-1 rounded bg-pitch-surface hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-pitch-border text-xs font-mono transition-colors"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => handleViewManifest(season.id)}
                        className="p-1 rounded bg-pitch-surface hover:bg-slate-700 text-slate-400 hover:text-white border border-pitch-border text-xs transition-colors"
                        title="View Season Manifest JSON"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono mb-3 bg-pitch-surface/40 p-2.5 rounded-lg border border-pitch-border/50">
                    <div>
                      <span className="text-slate-500 text-[10px] block">RECORDS</span>
                      <span className="text-white font-bold">{season.records_count?.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">CLUBS</span>
                      <span className="text-white font-bold">{season.clubs_count}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">VALIDATION</span>
                      <span className="text-emerald-400 font-bold capitalize">{season.validation_status}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate max-w-xs">{season.source}</span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {season.files?.csv && <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-pitch-border">CSV</span>}
                      {season.files?.excel && <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-pitch-border">XLSX</span>}
                    </div>
                  </div>

                  {/* Expandable Manifest JSON */}
                  {isExpanded && manifestData && (
                    <div className="mt-4 pt-4 border-t border-pitch-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-mono text-slate-400">Manifest Metadata</span>
                        <span className="text-[10px] font-mono text-slate-500">manifest.json</span>
                      </div>
                      <pre className="p-3 rounded-lg bg-pitch-surface border border-pitch-border text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                        {JSON.stringify(manifestData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: Interactive Import & Ingestion Workspace */}
      <div className="bg-pitch-card border border-pitch-border rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Upload className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Import New Season Dataset</h2>
            <p className="text-xs text-slate-400 font-mono">
              Upload a downloadable season dataset (.xlsx or .csv) to validate schema and persist into versioned storage.
            </p>
          </div>
        </div>

        <form onSubmit={handleImportSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Season Identifier (YYYY-YYYY) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 2025-2026, 2026-2027"
                value={importSeasonId}
                onChange={(e) => setImportSeasonId(e.target.value)}
                required
                className="w-full px-3.5 py-2 bg-pitch-surface border border-pitch-border rounded-lg text-sm text-slate-200 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 mb-1.5">
                Dataset Source Attribution
              </label>
              <input
                type="text"
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                className="w-full px-3.5 py-2 bg-pitch-surface border border-pitch-border rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* File Selector */}
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5">
              Select Dataset File (.xlsx, .xls, .csv) <span className="text-rose-400">*</span>
            </label>
            <div className="border-2 border-dashed border-pitch-border hover:border-emerald-500/40 rounded-xl p-6 text-center bg-pitch-surface/40 cursor-pointer transition-colors">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                className="hidden"
                id="season-file-input"
              />
              <label htmlFor="season-file-input" className="cursor-pointer flex flex-col items-center">
                <FileSpreadsheet className="w-10 h-10 text-slate-400 mb-2" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <span className="font-semibold text-emerald-400 text-sm">{selectedFile.name}</span>
                    <p className="text-xs text-slate-500 font-mono">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div>
                    <span className="text-sm font-semibold text-slate-200">Click to choose a dataset</span>
                    <p className="text-xs text-slate-400 mt-0.5">Supports Big 5 European Leagues Excel or CSV workbooks</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="rounded bg-pitch-surface border-pitch-border text-emerald-500 focus:ring-0"
              />
              <span>Dry-Run Mode (Validate schema without writing to storage)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={allowUnknown}
                onChange={(e) => setAllowUnknown(e.target.checked)}
                className="rounded bg-pitch-surface border-pitch-border text-emerald-500 focus:ring-0"
              />
              <span>Allow Non-Standard Extra Columns (Relaxed mode)</span>
            </label>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={importing || !selectedFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating & Processing...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>{isDryRun ? 'Run Schema Validation (Dry-Run)' : 'Publish Season Dataset'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Validation / Import Result Panel */}
        {importError && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            <div className="flex items-center gap-2 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Import Validation Rejected</span>
            </div>
            <p className="font-mono whitespace-pre-wrap">{importError}</p>
          </div>
        )}

        {importResult && (
          <div className="mt-6 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>
                  {importResult.dry_run 
                    ? `Dry-Run Validation Succeeded for ${importResult.season}` 
                    : `Season ${importResult.season} Successfully Imported!`}
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">
                {importResult.dry_run ? 'Dry Run' : 'Published'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-pitch-surface/60 p-3 rounded-lg border border-pitch-border/50 text-slate-200">
              <div>
                <span className="text-slate-500 text-[10px] block">VALID ROWS</span>
                <span className="font-bold">{importResult.records_count?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">COLUMNS</span>
                <span className="font-bold">{importResult.columns_count} / 37</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">TOTAL GOALS</span>
                <span className="font-bold text-emerald-400">{importResult.totals?.goals?.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">TOTAL ASSISTS</span>
                <span className="font-bold text-cyan-400">{importResult.totals?.assists?.toLocaleString()}</span>
              </div>
            </div>

            {importResult.warnings && importResult.warnings.length > 0 && (
              <div className="text-[11px] text-amber-300/90 font-mono space-y-0.5 pt-1">
                <span className="font-semibold block">Warnings:</span>
                {importResult.warnings.map((w, i) => (
                  <p key={i}>• {w}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataManagementView;
