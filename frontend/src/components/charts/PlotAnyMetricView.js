import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import ScatterPlot from './ScatterPlot';
import { Sliders, Search } from 'lucide-react';
import { parseHash } from '../../utils/hashRoute';
import { normalizePlayerSearch, PER90_PAIRS } from '../../utils/plotInteractions';
import DataQualityBadge from '../common/DataQualityBadge';

const METRIC_CATALOG = [
  // Scoring
  { id: 'Gls', name: 'Goals (Gls)', short: 'Goals', group: 'Scoring', desc: 'Total goals scored' },
  { id: 'xG', name: 'Expected Goals (xG)', short: 'xG', group: 'Scoring', desc: 'Shot quality accumulation' },
  { id: 'Gls_90', name: 'Goals per 90 (Gls_90)', short: 'Goals/90', group: 'Scoring', desc: 'Goals scaled to 90 minutes' },
  { id: 'xG_90', name: 'xG per 90 (xG_90)', short: 'xG/90', group: 'Scoring', desc: 'Expected goals scaled to 90 minutes' },
  { id: 'Gls_minus_xG', name: 'Goals minus xG', short: 'Goals - xG', group: 'Scoring', desc: 'Season goals minus expected goals' },

  // Creating
  { id: 'Ast', name: 'Assists (Ast)', short: 'Assists', group: 'Creating', desc: 'Direct goal assists' },
  { id: 'xAG', name: 'Expected Assisted Goals (xAG)', short: 'xAG', group: 'Creating', desc: 'Shot assist quality' },
  { id: 'Ast_90', name: 'Assists per 90 (Ast_90)', short: 'Assists/90', group: 'Creating', desc: 'Assists scaled to 90 minutes' },
  { id: 'xAG_90', name: 'xAG per 90 (xAG_90)', short: 'xAG/90', group: 'Creating', desc: 'Creation quality scaled to 90 mins' },
  { id: 'xG+xAG_90', name: 'xG + xAG per 90', short: 'xG+xAG/90', group: 'Creating', desc: 'Combined attacking output rate' },

  // Progressing
  { id: 'PrgC', name: 'Progressive Carries (PrgC)', short: 'Prog. carries', group: 'Progressing', desc: 'Carries moving ball >= 10 yards forward' },
  { id: 'PrgP', name: 'Progressive Passes (PrgP)', short: 'Prog. passes', group: 'Progressing', desc: 'Completed passes moving ball forward >= 10 yards' },
  { id: 'PrgR', name: 'Progressive Receptions (PrgR)', short: 'Prog. receptions', group: 'Progressing', desc: 'Receptions of progressive passes' },
  { id: 'PrgC_90', name: 'Progressive Carries / 90', short: 'Carries/90', group: 'Progressing', desc: 'Carries scaled to 90 minutes' },
  { id: 'PrgP_90', name: 'Progressive Passes / 90', short: 'Passes/90', group: 'Progressing', desc: 'Passes scaled to 90 minutes' },
  { id: 'PrgR_90', name: 'Progressive Receptions / 90', short: 'Receptions/90', group: 'Progressing', desc: 'Receptions scaled to 90 minutes' },

  // Playing Time & Volume
  { id: 'Min', name: 'Minutes Played (Min)', short: 'Minutes', group: 'Volume', desc: 'Total match minutes' },
  { id: '90s', name: '90s Played (90s)', short: '90s', group: 'Volume', desc: 'Total 90-minute equivalents' },
  { id: 'Age', name: 'Player Age', short: 'Age', group: 'Volume', desc: 'Age in years' },

  // Discipline
  { id: 'CrdY', name: 'Yellow Cards (CrdY)', short: 'Yellow cards', group: 'Discipline', desc: 'Cautions received' },
  { id: 'CrdR', name: 'Red Cards (CrdR)', short: 'Red cards', group: 'Discipline', desc: 'Send-offs received' }
];

export default function PlotAnyMetricView({
  activeSeason = '2024-2025',
  seasonQuality = null,
  onSelectPlayer = null
}) {
  // Read initial configuration from URL hash query if present
  const initialParams = useMemo(() => {
    const { query: sp } = parseHash(window.location.hash);
    if ([...sp.keys()].length > 0) {
      return {
        x: sp.get('x') || 'xAG_90',
        y: sp.get('y') || 'xG_90',
        pos: sp.get('pos') || 'FW',
        comp: sp.get('comp') || '',
        mins: Number(sp.get('mins')) || 500,
        ageMax: sp.has('age_max') ? Number(sp.get('age_max')) : '',
        per90: sp.get('perg') === '1', colorBy: sp.get('color') || 'none', jitter: sp.get('jitter') !== '0', lock: sp.get('lock') === '1'
      };
    }
    return {
      x: 'xAG_90',
      y: 'xG_90',
      pos: 'FW',
      comp: '',
      mins: 500,
      ageMax: '', per90: false, colorBy: 'none', jitter: true, lock: false
    };
  }, []);

  const [xMetric, setXMetric] = useState(initialParams.x);
  const [yMetric, setYMetric] = useState(initialParams.y);
  const [selectedPos, setSelectedPos] = useState(initialParams.pos);
  const [selectedComp, setSelectedComp] = useState(initialParams.comp);
  const [minMinutes, setMinMinutes] = useState(initialParams.mins);
  const [ageMax, setAgeMax] = useState(initialParams.ageMax);
  const [debouncedFilters, setDebouncedFilters] = useState({ mins: initialParams.mins, age: initialParams.ageMax });
  const [searchHighlight, setSearchHighlight] = useState('');
  const [per90, setPer90] = useState(initialParams.per90);
  const [colorBy, setColorBy] = useState(initialParams.colorBy);
  const [jitter, setJitter] = useState(initialParams.jitter);
  const [lockScale, setLockScale] = useState(initialParams.lock);
  const [quadrantsOn, setQuadrantsOn] = useState(true);
  const [dotMode, setDotMode] = useState('volume');
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [rangeData, setRangeData] = useState(null);
  const [rangeError, setRangeError] = useState(false);

  const effectiveX = per90 && !xMetric.endsWith('_90') ? (PER90_PAIRS[xMetric] || xMetric) : xMetric;
  const effectiveY = per90 && !yMetric.endsWith('_90') ? (PER90_PAIRS[yMetric] || yMetric) : yMetric;
  const canUsePer90 = Boolean(PER90_PAIRS[xMetric] && PER90_PAIRS[yMetric]);
  const untrackedMetrics = seasonQuality?.untracked_metrics || [];
  const metricIsUntracked = (metricId) => untrackedMetrics.includes(metricId) || untrackedMetrics.includes(metricId.replace(/_90$/, ''));
  const plotXUntracked = metricIsUntracked(effectiveX);
  const plotYUntracked = metricIsUntracked(effectiveY);

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestKey = JSON.stringify([activeSeason, effectiveX, effectiveY, selectedPos, selectedComp, debouncedFilters.mins, debouncedFilters.age]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedFilters({ mins: minMinutes, age: ageMax }), 250);
    return () => window.clearTimeout(timer);
  }, [minMinutes, ageMax]);

  // Sync state to URL hash for shareable links
  useEffect(() => {
    const sp = new URLSearchParams();
    if (xMetric) sp.set('x', xMetric);
    if (yMetric) sp.set('y', yMetric);
    if (selectedPos) sp.set('pos', selectedPos);
    if (selectedComp) sp.set('comp', selectedComp);
    if (minMinutes) sp.set('mins', String(minMinutes));
    if (ageMax !== '') sp.set('age_max', String(ageMax));
    if (colorBy !== 'none') sp.set('color', colorBy);
    if (per90) sp.set('perg', '1');
    if (!jitter) sp.set('jitter', '0');
    if (lockScale) sp.set('lock', '1');
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#plots?${sp.toString()}`);
  }, [xMetric, yMetric, selectedPos, selectedComp, minMinutes, ageMax, colorBy, per90, jitter, lockScale]);

  // Keep the chart tied to the current controls, ignoring responses from stale requests.
  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;
    setLoading(true);
    setError(null);
    api.getScatterChart({
      season: activeSeason,
      x: effectiveX,
      y: effectiveY,
      position: selectedPos,
      competition: selectedComp,
      min_minutes: debouncedFilters.mins,
      age_max: debouncedFilters.age !== '' ? debouncedFilters.age : undefined
    }, { signal: controller.signal })
      .then((res) => {
        const payload = res?.data || res;
        if (payload && isCurrent) {
          setChartData({ requestKey, payload: payload.data || payload });
        }
      })
      .catch((err) => {
        if (!isCurrent || err?.name === 'AbortError') return;
        console.error('Failed to load scatter data:', err);
        setError({ requestKey, message: err.message || 'Failed to generate chart coordinates' });
      })
      .finally(() => {
        if (isCurrent) setLoading(false);
      });
    return () => { isCurrent = false; controller.abort(); };
  }, [requestKey, activeSeason, effectiveX, effectiveY, selectedPos, selectedComp, debouncedFilters]);

  useEffect(() => {
    if (!lockScale) { setRangeData(null); setRangeError(false); return undefined; }
    const controller = new AbortController();
    setRangeError(false);
    setRangeData(null);
    api.getScatterRange({ x: effectiveX, y: effectiveY, position: selectedPos, competition: selectedComp, min_minutes: debouncedFilters.mins }, { signal: controller.signal })
      .then((res) => { const payload = res?.data || res; setRangeData(payload?.data || payload); })
      .catch((error) => { if (error?.name !== 'AbortError') { setRangeData(null); setRangeError(true); } });
    return () => controller.abort();
  }, [lockScale, effectiveX, effectiveY, selectedPos, selectedComp, debouncedFilters]);

  // Automatic quadrant labels for known pairs
  const quadrantLabels = useMemo(() => {
    if (!quadrantsOn) return null;
    const pairKey = `${xMetric}:${yMetric}`;
    const mapped = {
      'Gls:Ast': { topRight: 'All-round', topLeft: 'Creators', bottomRight: 'Finishers', bottomLeft: 'Low output' },
      'Gls:xG': { topRight: 'High output', topLeft: 'Below xG', bottomRight: 'Above xG', bottomLeft: 'Low output' },
      'Gls_90:xG_90': { topRight: 'High volume threat', topLeft: 'Underperforming xG', bottomRight: 'Overperforming xG', bottomLeft: 'Quiet in front of goal' },
      'xG:xAG': { topRight: 'Scoring and creating', topLeft: 'Creators', bottomRight: 'Scorers', bottomLeft: 'Lower xG output' },
      'xAG:xG': { topRight: 'Scoring and creating', topLeft: 'Scorers', bottomRight: 'Creators', bottomLeft: 'Lower xG output' },
      'Ast:xAG': { topRight: 'Assist and chance creation', topLeft: 'Chance creators', bottomRight: 'Assist providers', bottomLeft: 'Lower creation' },
      'PrgP:PrgC': { topRight: 'Dual progressors', topLeft: 'Carriers', bottomRight: 'Pass distributors', bottomLeft: 'Lower progression' },
      'PrgC:PrgP': { topRight: 'Dual progressors', topLeft: 'Pass distributors', bottomRight: 'Carriers', bottomLeft: 'Lower progression' },
      'xAG_90:xG_90': { topRight: 'Scores and creates', topLeft: 'Mostly scorers', bottomRight: 'Mostly creators', bottomLeft: 'Lower output' }
    };
    if (mapped[pairKey]) return mapped[pairKey];
    const xName = METRIC_CATALOG.find((m) => m.id === xMetric)?.short || xMetric;
    const yName = METRIC_CATALOG.find((m) => m.id === yMetric)?.short || yMetric;
    return { topRight: `High ${xName} / High ${yName}`, topLeft: `Low ${xName} / High ${yName}`, bottomRight: `High ${xName} / Low ${yName}`, bottomLeft: `Low ${xName} / Low ${yName}` };
  }, [xMetric, yMetric, quadrantsOn]);

  const hasParity = (xMetric === 'Gls_90' && yMetric === 'xG_90') || (xMetric === 'Gls' && yMetric === 'xG');

  // Metric Catalog groups
  const metricGroups = useMemo(() => {
    return METRIC_CATALOG.reduce((acc, m) => {
      if (!acc[m.group]) acc[m.group] = [];
      acc[m.group].push(m);
      return acc;
    }, {});
  }, []);

  const xLabel = METRIC_CATALOG.find((m) => m.id === effectiveX)?.name || effectiveX;
  const yLabel = METRIC_CATALOG.find((m) => m.id === effectiveY)?.name || effectiveY;
  const xShort = METRIC_CATALOG.find((m) => m.id === effectiveX)?.short || effectiveX;
  const yShort = METRIC_CATALOG.find((m) => m.id === effectiveY)?.short || effectiveY;
  const currentChartData = chartData?.payload || null;
  const currentError = error?.requestKey === requestKey ? error.message : null;
  const isLoading = !currentChartData && (loading || !currentError);
  const scatterPoints = currentChartData?.points || [];
  const plottedLabel = scatterPoints.length === 1 ? 'player' : 'players';
  const suggestions = searchHighlight.trim().length < 2 ? [] : [...scatterPoints]
    .filter((p) => normalizePlayerSearch(p.Player || p.name).includes(normalizePlayerSearch(searchHighlight)))
    .sort((a, b) => Number(normalizePlayerSearch(b.Player || b.name).startsWith(normalizePlayerSearch(searchHighlight))) - Number(normalizePlayerSearch(a.Player || a.name).startsWith(normalizePlayerSearch(searchHighlight))))
    .slice(0, 6);
  const xgTracked = scatterPoints.some((point) => point.tooltip?.Gls_minus_xG !== null && point.tooltip?.Gls_minus_xG !== undefined);
  const gaps = seasonQuality?.known_gaps?.clubs_with_gaps || [];
  const scopedGaps = gaps.filter((gap) => !selectedComp || gap.league === selectedComp).sort((a, b) => (b.shortfall || 0) - (a.shortfall || 0)).slice(0, 2);
  const partialCompetitions = seasonQuality?.partial_competitions || {};
  const partial = selectedComp && partialCompetitions[selectedComp];
  const qualityMessage = partial
    ? `${selectedComp.replace(/^[a-z]{2}\s+/, '')} is a partial snapshot, approximately matchweek ${partial.matchweek}/${partial.of}.`
    : scopedGaps.length ? `Known gap in this scope: ${scopedGaps.map((gap) => {
      const names = (seasonQuality?.known_gaps?.missing_top10_scorers || []).filter((player) => player.club === gap.club).map((player) => player.player);
      return `${gap.club} ${gap.data_goals}/${gap.wiki_goals} goals${names.length ? `; missing ${names.join(', ')}` : ''}`;
    }).join('; ')}.` : '';
  const qualityLabel = qualityMessage || seasonQuality?.known_gaps?.summary || '';
  const qualityAlternative = (metricId) => {
    if (plotXUntracked && plotYUntracked) { setXMetric(metricId); setYMetric(metricId === 'Gls' ? 'Ast' : metricId); return; }
    if (plotXUntracked) setXMetric(metricId);
    if (plotYUntracked) setYMetric(metricId);
  };
  const sharedDomain = (range) => {
    if (!range || !Number.isFinite(Number(range.max))) return null;
    const min = range.signed ? Number(range.min) : 0;
    const max = Number(range.max);
    if (!Number.isFinite(min) || max <= min) return null;
    return [min, max];
  };
  const isNotTracked = currentChartData?.tracking_status === 'not_tracked' || plotXUntracked || plotYUntracked;
  const resetControls = () => {
    setXMetric('xAG_90'); setYMetric('xG_90'); setSelectedPos('FW'); setSelectedComp('');
    setMinMinutes(500); setAgeMax(''); setSearchHighlight(''); setPer90(false); setColorBy('none');
    setJitter(true); setLockScale(false); setQuadrantsOn(true); setDotMode('volume');
  };
  const exportScope = `${selectedComp || 'all-big5'}_${selectedPos || 'all-pos'}_${minMinutes}min`.replace(/[^a-z0-9-]+/gi, '-');
  const exportContext = {
    title: `${yShort} vs ${xShort}`,
    scope: `Season ${activeSeason.replace('-', '/')} · ${selectedComp || 'All Big 5'} · ${selectedPos || 'All positions'} · ${minMinutes}+ minutes${ageMax !== '' ? ` · age ≤ ${ageMax}` : ''} · ${scatterPoints.length} players`,
    mode: per90 ? 'Per 90' : 'Totals',
    sizeLegend: dotMode === 'volume' ? 'Size: minutes' : 'Size: equal',
    colorLegend: `Colour: ${colorBy}`,
    quality: qualityLabel,
    sourceLine: 'Season-specific provenance: Dataset Registry'
  };

  return (
    <div className="space-y-6 font-ser">
      {/* Top Banner */}
      <div className="border-b-2 border-[var(--ink)] pb-4">
        <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[var(--blue)]" />
              <h1 className="font-disp font-extrabold text-4xl sm:text-5xl text-[var(--ink)]">
                Scatter Plot Tool
              </h1>
            </div>
            <p className="text-xs italic text-[var(--mute)] mt-1">
              Plot any two metrics across the European Big 5 archive with dynamic median cross-hairs and positional filtering.
            </p>
          </div>

          <div className="text-xs font-mono text-[var(--mute)] bg-[var(--panel)] px-3 py-1.5 border border-[var(--rule)] self-start md:self-auto">
          {activeSeason.replace('-', '/')}
          </div>
        </div>
      </div>

      {/* Control Grid */}
      <fieldset aria-label="Scatter plot controls" className="min-w-0 border border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-5 rounded-xs space-y-4">
        <legend className="px-2 font-disp font-bold uppercase tracking-wider text-sm text-[var(--ink)]">Scatter controls</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* X Axis Metric */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--ink)]">
              X-Axis Metric
            </label>
            <select
              value={xMetric}
              onChange={(e) => setXMetric(e.target.value)}
              className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--panel)] p-2 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
            >
              {Object.entries(metricGroups).map(([group, metrics]) => (
                <optgroup key={group} label={group}>
                  {metrics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{metricIsUntracked(m.id) ? ' (not tracked)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Y Axis Metric */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--ink)]">
              Y-Axis Metric
            </label>
            <select
              value={yMetric}
              onChange={(e) => setYMetric(e.target.value)}
              className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--panel)] p-2 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
            >
              {Object.entries(metricGroups).map(([group, metrics]) => (
                <optgroup key={group} label={group}>
                  {metrics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{metricIsUntracked(m.id) ? ' (not tracked)' : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Position Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--ink)]">
              Position Group
            </label>
            <select
              value={selectedPos}
              onChange={(e) => setSelectedPos(e.target.value)}
              className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--panel)] p-2 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
            >
              <option value="">All Positions</option>
              <option value="FW">Forwards (FW)</option>
              <option value="MF">Midfielders (MF)</option>
              <option value="DF">Defenders (DF)</option>
              <option value="GK">Goalkeepers (GK)</option>
            </select>
          </div>

          {/* League Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--ink)]">
              Competition
            </label>
            <select
              value={selectedComp}
              onChange={(e) => setSelectedComp(e.target.value)}
              className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--panel)] p-2 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
            >
              <option value="">All European Big 5</option>
              <option value="eng Premier League">Premier League</option>
              <option value="es La Liga">La Liga</option>
              <option value="it Serie A">Serie A</option>
              <option value="de Bundesliga">Bundesliga</option>
              <option value="fr Ligue 1">Ligue 1</option>
            </select>
          </div>
        </div>

        {/* Secondary Row: Minutes, Age, and Search Highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--rule)]">
          {/* Min Minutes */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Min Minutes Played ({minMinutes}m)
            </label>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={minMinutes}
              onChange={(e) => setMinMinutes(Number(e.target.value))}
              className="w-full accent-[var(--ink)] cursor-pointer"
            />
          </div>

          {/* Age Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Max Age ({ageMax ? `≤ ${ageMax}` : 'No limit'})
            </label>
            <input
              type="number"
              placeholder="e.g. 23 (U23)"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value ? Number(e.target.value) : '')}
              className="w-full text-xs font-mono border border-[var(--rule)] bg-[var(--panel)] p-1.5 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
            />
          </div>

          {/* Highlight Player Search */}
          <div className="space-y-1">
            <label className="block text-xs font-disp font-bold uppercase tracking-wider text-[var(--mute)]">
              Highlight Dot (Player Name)
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search player to highlight..."
                value={searchHighlight}
                onChange={(e) => setSearchHighlight(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && suggestions.length) { e.preventDefault(); setSuggestionIndex((suggestionIndex + 1) % suggestions.length); }
                  if (e.key === 'ArrowUp' && suggestions.length) { e.preventDefault(); setSuggestionIndex((suggestionIndex + suggestions.length - 1) % suggestions.length); }
                  if (e.key === 'Enter' && suggestions[suggestionIndex]) { e.preventDefault(); setSearchHighlight(suggestions[suggestionIndex].Player || suggestions[suggestionIndex].name); }
                }}
                aria-autocomplete="list"
                aria-expanded={suggestions.length > 0}
                aria-controls="scatter-player-suggestions"
                className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--panel)] pl-7 pr-2 py-1.5 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[var(--mute)] absolute left-2 top-2.5" />
              {suggestions.length > 0 && <div id="scatter-player-suggestions" role="listbox" className="absolute z-20 top-full left-0 right-0 border border-[var(--rule)] bg-[var(--panel)] shadow-lg max-h-52 overflow-y-auto">
                {suggestions.map((p, index) => <button key={p.id} type="button" role="option" aria-selected={index === suggestionIndex} onClick={() => setSearchHighlight(p.Player || p.name)} className={`block w-full text-left px-2 py-1 text-xs ${index === suggestionIndex ? 'bg-[var(--paper)]' : ''}`}>
                  {p.Player || p.name} <span className="text-[var(--mute)]">· {p.Squad || p.club}</span>
                </button>)}
              </div>}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3 border-t border-[var(--rule)] pt-3">
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={per90} disabled={!canUsePer90} onChange={(e) => setPer90(e.target.checked)} /><span title={!canUsePer90 ? 'Selected metrics do not both have per-90 counterparts.' : ''}>Totals / Per 90</span></label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={quadrantsOn} onChange={(e) => setQuadrantsOn(e.target.checked)} />Quadrant labels</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={jitter} onChange={(e) => setJitter(e.target.checked)} />Reduce overlap</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={lockScale} onChange={(e) => setLockScale(e.target.checked)} title={rangeError ? 'Shared range request failed; using this season’s dynamic scale.' : ''} />Compare seasons: lock scale</label>
          <label className="flex items-center gap-2 text-xs">Size
            <select aria-label="Dot size" value={dotMode} onChange={(e) => setDotMode(e.target.value)} className="border border-[var(--rule)] bg-[var(--panel)] p-1"><option value="volume">Minutes</option><option value="uniform">Equal</option></select>
          </label>
          <label className="flex items-center gap-2 text-xs">Colour
            <select aria-label="Colour by" value={colorBy} onChange={(e) => setColorBy(e.target.value)} className="border border-[var(--rule)] bg-[var(--panel)] p-1"><option value="none">None</option><option value="position">Position</option><option value="club">Club</option><option value="finishing" disabled={!xgTracked} title={!xgTracked ? 'Goals minus xG is not tracked for this season.' : ''}>Goals - xG{!xgTracked ? ' (not tracked)' : ''}</option></select>
          </label>
          <button type="button" onClick={resetControls} className="ml-auto border border-[var(--ink)] px-2 py-1 text-xs hover:bg-[var(--panel)]">Reset controls</button>
          {per90 && <span className="basis-full text-[11px] italic text-[var(--mute)]">Per-90 rates can be noisy for players with few minutes.</span>}
        </div>
      </fieldset>

      {/* Error state */}
      {currentError && (
        <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-700">
          {currentError}
        </div>
      )}

      {/* Main Scatter Plot Display */}
      {isLoading ? (
        <div className="border border-[var(--ink)] bg-[var(--paper)] p-16 text-center animate-pulse">
          <div className="font-disp font-bold text-xl text-[var(--ink)]">
            Computing Positional Coordinates...
          </div>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Resolving pool medians and standard deviations across {activeSeason}
          </p>
        </div>
      ) : currentError && !currentChartData ? null : currentChartData && scatterPoints.length > 0 ? (
        <div aria-busy={loading} className={loading ? 'opacity-60 transition-opacity' : ''}>
        {loading && <p role="status" aria-live="polite" className="text-xs text-[var(--mute)]">Updating scatter results…</p>}
        <ScatterPlot
          points={scatterPoints}
          medians={currentChartData.medians || (currentChartData.distribution ? { x: currentChartData.distribution.median_x, y: currentChartData.distribution.median_y } : { x: null, y: null })}
          xLabel={xLabel}
          yLabel={yLabel}
          highlightName={searchHighlight}
          highlightId={suggestions[0]?.id || null}
          dotMode={dotMode}
          jitter={jitter}
          colorBy={colorBy}
          exportContext={exportContext}
          exportName={`pitchpulse_${activeSeason}_${effectiveY}-vs-${effectiveX}_${exportScope}.png`}
          parity={hasParity}
          parityLabel={hasParity ? 'Parity (Gls = xG)' : ''}
          quadrantLabels={quadrantLabels}
          title={`${yShort} vs ${xShort}`}
          subtitle="Interactive player scatter plot with median guides"
          xShort={xShort}
          yShort={yShort}
          xMetricId={effectiveX}
          yMetricId={effectiveY}
          xCanBeNegative={effectiveX === 'Gls_minus_xG'}
          yCanBeNegative={effectiveY === 'Gls_minus_xG'}
          xDomainOverride={lockScale ? sharedDomain(rangeData?.x) : null}
          yDomainOverride={lockScale ? sharedDomain(rangeData?.y) : null}
          qualityMetadata={seasonQuality}
          qualityMessage={qualityMessage}
          poolCaption={`Season ${activeSeason.replace('-', '/')} · ${selectedComp || 'All Big 5'} · ${selectedPos || 'All positions'} · ${minMinutes}+ minutes${ageMax !== '' ? ` · age ≤ ${ageMax}` : ''} · Plotted: ${scatterPoints.length} ${plottedLabel}`}
          onSelectPlayer={onSelectPlayer}
          labelBudget={14}
        />
        </div>
      ) : (
        <div className="border border-[var(--ink)] bg-[var(--paper)] p-12 text-center text-xs italic text-[var(--mute)]">
          {isNotTracked
            ? <><strong className="block text-base not-italic text-[var(--ink)]">Not tracked for {activeSeason}</strong><span className="block mt-1">{seasonQuality?.untracked_metrics_reason || `${xLabel} or ${yLabel} is unavailable for this season.`}</span><span className="flex flex-wrap justify-center gap-2 mt-3 not-italic">Try a tracked metric: {['Gls', 'Ast', 'xG', 'xAG'].map((id) => <button key={id} type="button" className="underline text-[var(--blue)]" onClick={() => qualityAlternative(id)}>{id}</button>)}</span></>
            : currentChartData?.tracking_status === 'no_eligible_observations'
              ? `No players have eligible ${xLabel} and ${yLabel} values for the selected filters.`
              : `No players match the selected criteria (${selectedPos || 'All positions'}, ${selectedComp || 'All Big 5'}, ${minMinutes}+ minutes${ageMax !== '' ? `, age ≤ ${ageMax}` : ''}). Lower the filters to include more players.`}
        </div>
      )}
    </div>
  );
}
