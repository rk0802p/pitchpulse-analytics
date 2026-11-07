import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import ScatterPlot from './ScatterPlot';
import { Sliders, Search, Filter, RotateCcw, Sparkles } from 'lucide-react';

const METRIC_CATALOG = [
  // Scoring
  { id: 'Gls', name: 'Goals (Gls)', group: 'Scoring', desc: 'Total goals scored' },
  { id: 'xG', name: 'Expected Goals (xG)', group: 'Scoring', desc: 'Shot quality accumulation' },
  { id: 'Gls_90', name: 'Goals per 90 (Gls_90)', group: 'Scoring', desc: 'Goals scaled to 90 minutes' },
  { id: 'xG_90', name: 'xG per 90 (xG_90)', group: 'Scoring', desc: 'Expected goals scaled to 90 minutes' },
  { id: 'np:G-xG_90', name: 'Non-penalty G minus xG/90', group: 'Scoring', desc: 'Finishing over/under performance' },

  // Creating
  { id: 'Ast', name: 'Assists (Ast)', group: 'Creating', desc: 'Direct goal assists' },
  { id: 'xAG', name: 'Expected Assisted Goals (xAG)', group: 'Creating', desc: 'Shot assist quality' },
  { id: 'Ast_90', name: 'Assists per 90 (Ast_90)', group: 'Creating', desc: 'Assists scaled to 90 minutes' },
  { id: 'xAG_90', name: 'xAG per 90 (xAG_90)', group: 'Creating', desc: 'Creation quality scaled to 90 mins' },
  { id: 'xG+xAG_90', name: 'xG + xAG per 90', group: 'Creating', desc: 'Combined attacking output rate' },

  // Progressing
  { id: 'PrgC', name: 'Progressive Carries (PrgC)', group: 'Progressing', desc: 'Carries moving ball >= 10 yards forward' },
  { id: 'PrgP', name: 'Progressive Passes (PrgP)', group: 'Progressing', desc: 'Completed passes moving ball forward >= 10 yards' },
  { id: 'PrgR', name: 'Progressive Receptions (PrgR)', group: 'Progressing', desc: 'Receptions of progressive passes' },
  { id: 'PrgC_90', name: 'Progressive Carries / 90', group: 'Progressing', desc: 'Carries scaled to 90 minutes' },
  { id: 'PrgP_90', name: 'Progressive Passes / 90', group: 'Progressing', desc: 'Passes scaled to 90 minutes' },

  // Playing Time & Volume
  { id: 'Min', name: 'Minutes Played (Min)', group: 'Volume', desc: 'Total match minutes' },
  { id: '90s', name: '90s Played (90s)', group: 'Volume', desc: 'Total 90-minute equivalents' },
  { id: 'Age', name: 'Player Age', group: 'Volume', desc: 'Age in years' },

  // Discipline
  { id: 'CrdY', name: 'Yellow Cards (CrdY)', group: 'Discipline', desc: 'Cautions received' },
  { id: 'CrdR', name: 'Red Cards (CrdR)', group: 'Discipline', desc: 'Send-offs received' }
];

export default function PlotAnyMetricView({
  activeSeason = '2024-2025',
  onSelectPlayer = null
}) {
  // Read initial configuration from URL hash query if present
  const initialParams = useMemo(() => {
    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
      const sp = new URLSearchParams(hash.slice(queryIdx + 1));
      return {
        x: sp.get('x') || 'xAG_90',
        y: sp.get('y') || 'xG_90',
        pos: sp.get('pos') || 'FW',
        comp: sp.get('comp') || '',
        mins: Number(sp.get('mins')) || 500,
        ageMax: sp.get('age_max') ? Number(sp.get('age_max')) : ''
      };
    }
    return {
      x: 'xAG_90',
      y: 'xG_90',
      pos: 'FW',
      comp: '',
      mins: 500,
      ageMax: ''
    };
  }, []);

  const [xMetric, setXMetric] = useState(initialParams.x);
  const [yMetric, setYMetric] = useState(initialParams.y);
  const [selectedPos, setSelectedPos] = useState(initialParams.pos);
  const [selectedComp, setSelectedComp] = useState(initialParams.comp);
  const [minMinutes, setMinMinutes] = useState(initialParams.mins);
  const [ageMax, setAgeMax] = useState(initialParams.ageMax);
  const [searchHighlight, setSearchHighlight] = useState('');

  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state to URL hash for shareable links
  useEffect(() => {
    const sp = new URLSearchParams();
    if (xMetric) sp.set('x', xMetric);
    if (yMetric) sp.set('y', yMetric);
    if (selectedPos) sp.set('pos', selectedPos);
    if (selectedComp) sp.set('comp', selectedComp);
    if (minMinutes) sp.set('mins', String(minMinutes));
    if (ageMax) sp.set('age_max', String(ageMax));
    window.location.hash = `#plots?${sp.toString()}`;
  }, [xMetric, yMetric, selectedPos, selectedComp, minMinutes, ageMax]);

  // Fetch scatter plot payload
  const fetchScatter = useCallback(() => {
    setLoading(true);
    setError(null);
    api.getScatterChart({
      season: activeSeason,
      x: xMetric,
      y: yMetric,
      position: selectedPos,
      competition: selectedComp,
      min_minutes: minMinutes,
      age_max: ageMax || undefined
    })
      .then((res) => {
        if (res) {
          setChartData(res);
        }
      })
      .catch((err) => {
        console.error('Failed to load scatter data:', err);
        setError(err.message || 'Failed to generate chart coordinates');
      })
      .finally(() => setLoading(false));
  }, [activeSeason, xMetric, yMetric, selectedPos, selectedComp, minMinutes, ageMax]);

  useEffect(() => {
    fetchScatter();
  }, [fetchScatter]);

  // Automatic quadrant labels for known pairs
  const quadrantLabels = useMemo(() => {
    if (xMetric === 'xAG_90' && yMetric === 'xG_90') {
      return {
        topRight: 'Scores and creates',
        topLeft: 'Mostly scorers',
        bottomRight: 'Mostly creators',
        bottomLeft: 'Lower output'
      };
    }
    if (xMetric === 'PrgP' && yMetric === 'PrgC') {
      return {
        topRight: 'Dual progressors',
        topLeft: 'Carriers',
        bottomRight: 'Pass distributors',
        bottomLeft: 'Consolidated role'
      };
    }
    if (xMetric === 'Gls_90' && yMetric === 'xG_90') {
      return {
        topRight: 'High volume threat',
        topLeft: 'Underperforming xG',
        bottomRight: 'Overperforming xG',
        bottomLeft: 'Quiet in front of goal'
      };
    }
    return null;
  }, [xMetric, yMetric]);

  const hasParity = (xMetric === 'Gls_90' && yMetric === 'xG_90') || (xMetric === 'Gls' && yMetric === 'xG');

  // Metric Catalog groups
  const metricGroups = useMemo(() => {
    return METRIC_CATALOG.reduce((acc, m) => {
      if (!acc[m.group]) acc[m.group] = [];
      acc[m.group].push(m);
      return acc;
    }, {});
  }, []);

  const xLabel = METRIC_CATALOG.find((m) => m.id === xMetric)?.name || xMetric;
  const yLabel = METRIC_CATALOG.find((m) => m.id === yMetric)?.name || yMetric;

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
            Volume: {activeSeason}
          </div>
        </div>
      </div>

      {/* Control Grid */}
      <div className="border border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-5 rounded-xs space-y-4">
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
                      {m.name}
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
                      {m.name}
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
                className="w-full text-xs font-ser border border-[var(--rule)] bg-[var(--panel)] pl-7 pr-2 py-1.5 text-[var(--ink)] focus:border-[var(--ink)] outline-none"
              />
              <Search className="w-3.5 h-3.5 text-[var(--mute)] absolute left-2 top-2.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Main Scatter Plot Display */}
      {loading ? (
        <div className="border border-[var(--ink)] bg-[var(--paper)] p-16 text-center animate-pulse">
          <div className="font-disp font-bold text-xl text-[var(--ink)]">
            Computing Positional Coordinates...
          </div>
          <p className="text-xs italic text-[var(--mute)] mt-1">
            Resolving pool medians and standard deviations across {activeSeason}
          </p>
        </div>
      ) : chartData && chartData.points ? (
        <ScatterPlot
          points={chartData.points}
          medians={chartData.medians}
          xLabel={xLabel}
          yLabel={yLabel}
          highlightName={searchHighlight}
          parity={hasParity}
          parityLabel={hasParity ? 'Parity (Gls = xG)' : ''}
          quadrantLabels={quadrantLabels}
          title={`${yLabel} vs ${xLabel}`}
          subtitle={`Interactive bubble scatter plot with pool median cross-hairs and collision-free outlier labels`}
          poolCaption={`Pool: ${chartData.pool?.n || chartData.points.length} players (${selectedPos || 'All positions'}, ${minMinutes}+ minutes played)`}
          onSelectPlayer={onSelectPlayer}
          labelBudget={14}
        />
      ) : null}
    </div>
  );
}
