import React, { useMemo, useState, useRef, useEffect } from 'react';
import { placeLabels, chooseLabelled } from '../../utils/placeLabels';
import { deviation, scaleLinear, scaleSqrt, downloadSvgAsPng, copySvgAsPng, canCopyChartImage } from '../../utils/chartMath';
import { computeAxisDomain } from '../../utils/axisDomain';
import { deterministicJitter, normalizePlayerSearch } from '../../utils/plotInteractions';
import DataQualityBadge from '../common/DataQualityBadge';
import { Download, Table as TableIcon, Eye, Info } from 'lucide-react';

const MARGIN = { top: 24, right: 32, bottom: 58, left: 68 };

const formatCoordinate = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (Number.isInteger(numeric)) return String(numeric);
  return String(Number(numeric.toFixed(4)));
};
const formatOptional = (value) => (value === null || value === undefined || !Number.isFinite(Number(value)) ? 'n/a' : formatCoordinate(value));

export default function ScatterPlot({
  points = [],
  medians = { x: 0, y: 0 },
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
  xShort = null,
  yShort = null,
  xMetricId = null,
  yMetricId = null,
  xCanBeNegative = false,
  yCanBeNegative = false,
  xDomainOverride = null,
  yDomainOverride = null,
  dotMode = 'volume',
  jitter = true,
  colorBy = 'none',
  highlightId = null,
  highlightName = '',
  parity = false,
  parityLabel = 'Parity (y = x)',
  quadrantLabels = null,
  width = 880,
  height = 540,
  labelBudget = 14,
  onSelectPlayer = null,
  title = '',
  subtitle = '',
  poolCaption = '',
  xTickStep = null,
  yTickStep = null,
  xMax = null,
  yMax = null,
  exportContext = {},
  exportName = 'pitchpulse-scatter.png',
  qualityMetadata = null,
  qualityMessage = ''
}) {
  const [hovered, setHovered] = useState(null);
  const [viewTable, setViewTable] = useState(false);
  const [pinnedIds, setPinnedIds] = useState(() => new Set());
  const [activePointId, setActivePointId] = useState(points[0]?.id ?? null);
  const [tableSort, setTableSort] = useState({ key: 'Min', descending: true });
  const [showAllRows, setShowAllRows] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');
  const [reducedMotion, setReducedMotion] = useState(false);
  const svgRef = useRef(null);

  useEffect(() => {
    setPinnedIds(new Set());
    setHovered(null);
    setActivePointId(points[0]?.id ?? null);
  }, [points]);

  useEffect(() => {
    const clearOnEscape = (event) => {
      if (event.key === 'Escape') { setPinnedIds(new Set()); setHovered(null); }
    };
    window.addEventListener('keydown', clearOnEscape);
    return () => window.removeEventListener('keydown', clearOnEscape);
  }, []);

  const sortedTablePoints = useMemo(() => [...points].sort((a, b) => {
    const av = a[tableSort.key] ?? a[({ Player: 'name', Squad: 'club', Comp: 'comp', Pos: 'pos' })[tableSort.key]];
    const bv = b[tableSort.key] ?? b[({ Player: 'name', Squad: 'club', Comp: 'comp', Pos: 'pos' })[tableSort.key]];
    const result = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av ?? '').localeCompare(String(bv ?? ''));
    return tableSort.descending ? -result : result;
  }), [points, tableSort]);

  const clubColors = useMemo(() => {
    const counts = new Map();
    points.forEach((p) => counts.set(p.Squad || p.club || 'Unknown', (counts.get(p.Squad || p.club || 'Unknown') || 0) + 1));
    const palette = ['var(--blue)', 'var(--red)', 'var(--amber)', 'var(--board)', 'var(--ink)', 'var(--mute)', 'var(--blue)', 'var(--red)'];
    return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([club], index) => [club, palette[index]]));
  }, [points]);

  React.useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return undefined;
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const W = width - MARGIN.left - MARGIN.right;
  const H = height - MARGIN.top - MARGIN.bottom;

  const { sx, sy, sr, labels, resolvedMedians, poolSize } = useMemo(() => {
    if (!points || points.length === 0) {
      return {
        sx: scaleLinear([0, 1], [0, W]),
        sy: scaleLinear([0, 1], [H, 0]),
        sr: () => 3,
        labels: [],
        resolvedMedians: medians,
        poolSize: 0
      };
    }

    const axisDomain = (values, tickStep, maximum, isX, metricId) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (Number.isFinite(maximum) && maximum > 0 && min >= 0) return [0, maximum];
      if (Number.isFinite(tickStep) && tickStep > 0 && min >= 0) {
        return [Math.floor(min / tickStep) * tickStep, (Math.floor(max / tickStep) + 1) * tickStep];
      }
      const integer = metricId ? !metricId.endsWith('_90') && metricId !== 'Gls_minus_xG' && metricId !== 'xG+xAG_90' : values.every(Number.isInteger);
      return computeAxisDomain(values, {
        integer,
        canBeNegative: metricId === 'Gls_minus_xG' || (isX ? xCanBeNegative : yCanBeNegative) || min < 0,
        padding: isX ? 0.14 : 0.1,
        minimumSpan: integer ? 5 : 0.5
      });
    };
    const xDomain = xDomainOverride || axisDomain(points.map((p) => p.x), xTickStep, xMax, true, xMetricId);
    const yDomain = yDomainOverride || axisDomain(points.map((p) => p.y), yTickStep, yMax, false, yMetricId);
    const minMins = Math.min(...points.map((p) => p.mins || p.Min || 0));
    const maxMins = Math.max(...points.map((p) => p.mins || p.Min || 1));
    const poolSize = points.length;

    const sx = scaleLinear(xDomain, [0, W]);
    const sy = scaleLinear(yDomain, [H, 0]);
    const plotted = (p, axis, domain, metricId) => {
      const value = p[axis];
      const isIntegerMetric = metricId ? !metricId.endsWith('_90') && metricId !== 'Gls_minus_xG' : Number.isInteger(value);
      if (!jitter || !isIntegerMetric || !Number.isInteger(value)) return value;
      return value + deterministicJitter(p.id, axis, (domain[1] - domain[0]) / 6);
    };

    // Density-aware radius scaling
    let sr;
    if (dotMode === 'uniform') {
      sr = () => 2; // Uniform micro-dots for unbiased density analysis
    } else {
      // Volume-scaled with density adaptation
      // Dense pools (>250): 1.5–3.6px (editorial micro-dot style)
      // Sparse pools (<100): 2.4–5.2px
      // Medium pools: interpolated
      const denseThreshold = 250;
      const sparseThreshold = 100;
      let minR, maxR;
      if (poolSize >= denseThreshold) {
        minR = 1.5;
        maxR = 3.6;
      } else if (poolSize <= sparseThreshold) {
        minR = 2.4;
        maxR = 5.2;
      } else {
        // Linear interpolation between sparse and dense ranges
        const t = (poolSize - sparseThreshold) / (denseThreshold - sparseThreshold);
        minR = 2.4 + (1.5 - 2.4) * t;
        maxR = 5.2 + (3.6 - 5.2) * t;
      }
      sr = scaleSqrt([minMins, maxMins], [minR, maxR]);
    }

    const mX = Number.isFinite(medians?.x) ? medians.x : (xDomain[0] + xDomain[1]) / 2;
    const mY = Number.isFinite(medians?.y) ? medians.y : (yDomain[0] + yDomain[1]) / 2;
    const xs = { median: mX, sd: deviation(points, (p) => p.x) };
    const ys = { median: mY, sd: deviation(points, (p) => p.y) };

    const normalizedSearch = normalizePlayerSearch(highlightName.trim());
    const effectiveHighlightId = highlightId || (normalizedSearch ? points.find(p => normalizePlayerSearch(p.name || p.Player).includes(normalizedSearch))?.id : null);
    const prioritized = points.map((p) => ({ ...p, highlight: p.id === effectiveHighlightId || pinnedIds.has(p.id) }));

    const chosen = chooseLabelled(prioritized, xs, ys, effectiveHighlightId, Math.max(labelBudget, pinnedIds.size + (effectiveHighlightId ? 1 : 0)))
      .map((p) => ({
        id: p.id,
        text: p.name || p.Player || '',
        x: Math.max(8, Math.min(W - 8, sx(plotted(p, 'x', xDomain, xMetricId)))),
        y: Math.max(8, Math.min(H - 8, sy(plotted(p, 'y', yDomain, yMetricId)))),
        r: sr(p.mins || p.Min || 0)
      }));

    const all = points.map((p) => ({
      id: p.id,
      text: p.name || p.Player || '',
      x: Math.max(8, Math.min(W - 8, sx(plotted(p, 'x', xDomain, xMetricId)))),
      y: Math.max(8, Math.min(H - 8, sy(plotted(p, 'y', yDomain, yMetricId)))),
      r: sr(p.mins || p.Min || 0)
    }));

    const placed = placeLabels(
      chosen.concat(all.filter((a) => !chosen.some((c) => c.id === a.id))),
      { width: W, height: H }
    ).filter((l) => chosen.some((c) => c.id === l.id));

    return {
      sx,
      sy,
      sr,
      labels: placed,
      resolvedMedians: { x: mX, y: mY },
      poolSize
    };
  }, [points, medians, highlightId, highlightName, labelBudget, W, H, dotMode, xTickStep, yTickStep, xMax, yMax, xMetricId, yMetricId, xCanBeNegative, yCanBeNegative, pinnedIds, jitter, xDomainOverride, yDomainOverride]);

  const handleExport = async () => {
    if (svgRef.current) {
      try { await downloadSvgAsPng(svgRef.current, exportName, 2, exportContext); }
      catch { setCopyStatus('Could not export the chart image.'); }
    }
  };
  const handleCopyImage = async () => {
    try { const copied = await copySvgAsPng(svgRef.current, exportContext); setCopyStatus(copied ? 'Chart image copied.' : 'Image copying is unavailable.'); }
    catch { setCopyStatus('Could not copy the chart image.'); }
  };

  const parityEnd = parity ? Math.min(sx.domain()[1], sy.domain()[1]) : 0;
  const projectX = (value) => Math.max(0, Math.min(W, sx(value)));
  const projectY = (value) => Math.max(0, Math.min(H, sy(value)));
  const plottedCoordinate = (point, axis, metricId, scale) => {
    const value = point[axis];
    const integerMetric = metricId ? !metricId.endsWith('_90') && metricId !== 'Gls_minus_xG' : Number.isInteger(value);
    if (!jitter || !integerMetric || !Number.isInteger(value)) return value;
    return value + deterministicJitter(point.id, axis, (scale.domain()[1] - scale.domain()[0]) / 6);
  };
  const projectPointX = (point) => Math.max(8, Math.min(W - 8, sx(plottedCoordinate(point, 'x', xMetricId, sx))));
  const projectPointY = (point) => Math.max(8, Math.min(H - 8, sy(plottedCoordinate(point, 'y', yMetricId, sy))));
  const getPointColor = (point) => {
    if (colorBy === 'position') {
      const pos = String(point.Pos || point.pos || '').split(',')[0].trim();
      return ({ FW: 'var(--blue)', MF: 'var(--red)', DF: 'var(--board)', GK: 'var(--amber)' })[pos] || 'var(--mute)';
    }
    if (colorBy === 'club') return clubColors.get(point.Squad || point.club) || 'var(--mute)';
    if (colorBy === 'finishing') {
      const value = point.tooltip?.Gls_minus_xG;
      if (!Number.isFinite(Number(value))) return 'var(--mute)';
      return Number(value) < 0 ? 'var(--blue)' : Number(value) > 0 ? 'var(--red)' : 'var(--amber)';
    }
    return 'var(--blue)';
  };
  const quadrantLabelVisible = (text, corner) => {
    if (!text) return false;
    const left = corner.endsWith('Left');
    const bottom = corner.startsWith('bottom');
    const widthGuess = Math.min(W * 0.44, text.length * 6.2);
    const box = { x1: left ? 8 : W - widthGuess - 8, x2: left ? widthGuess + 8 : W - 8, y1: bottom ? H - 27 : 4, y2: bottom ? H - 4 : 20 };
    return !points.some((p) => {
      const x = projectPointX(p); const y = projectPointY(p); const radius = sr(p.Min || 0);
      return x + radius > box.x1 && x - radius < box.x2 && y + radius > box.y1 && y - radius < box.y2;
    }) && !labels.some((label) => label.x < box.x2 && label.x + label.text.length * 6.2 > box.x1 && label.y > box.y1 && label.y < box.y2);
  };
  const xSortedPoints = useMemo(() => [...points].sort((a, b) => a.x - b.x || String(a.id).localeCompare(String(b.id))), [points]);
  const moveFocus = (point, direction) => {
    const index = xSortedPoints.findIndex((item) => item.id === point.id);
    const next = xSortedPoints[Math.max(0, Math.min(xSortedPoints.length - 1, index + direction))];
    if (next) { setActivePointId(next.id); document.getElementById(`scatter-hit-${next.id}`)?.focus(); }
  };
  const overflowCount = points.filter((point) =>
    (Number.isFinite(xMax) && point.x > xMax) || (Number.isFinite(yMax) && point.y > yMax)
  ).length;

  return (
    <div className="border border-[var(--ink)] bg-[var(--paper)] p-4 sm:p-5 rounded-xs space-y-3 font-ser">
      {/* Chart Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-[var(--ink)] pb-3">
        <div>
          {title && (
            <h3 className="font-disp font-bold text-xl sm:text-2xl text-[var(--ink)] leading-snug">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-xs italic text-[var(--mute)] mt-0.5">
              {subtitle}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2"><DataQualityBadge metadata={qualityMetadata} />{qualityMessage && <span className="text-[10px] text-amber-300" title={qualityMetadata?.notes || qualityMetadata?.known_gaps?.summary}>{qualityMessage}</span>}</div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {pinnedIds.size > 0 && <button type="button" onClick={() => setPinnedIds(new Set())} className="border border-[var(--rule)] px-2 py-1 text-xs">Clear pins</button>}
          <button
            type="button"
            onClick={() => setViewTable(!viewTable)}
            className="border border-[var(--rule)] hover:border-[var(--ink)] px-2.5 py-1 text-xs italic text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Toggle between chart and tabular display"
          >
            {viewTable ? <Eye className="w-3.5 h-3.5" /> : <TableIcon className="w-3.5 h-3.5" />}
            <span>{viewTable ? 'View Chart' : 'View Table'}</span>
          </button>

          {!viewTable && (
            <button
              type="button"
              onClick={handleExport}
              className="border border-[var(--ink)] bg-[var(--panel)] hover:bg-[var(--paper)] px-2.5 py-1 text-xs italic text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download image as PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PNG</span>
            </button>
          )}
          {!viewTable && canCopyChartImage() && <button type="button" onClick={handleCopyImage} className="border border-[var(--rule)] px-2.5 py-1 text-xs">Copy image</button>}

        </div>
      </div>

      {poolCaption && (
        <div className="text-xs italic text-[var(--mute)] flex items-center gap-1.5" role="status" aria-live="polite">
          <Info className="w-3.5 h-3.5 text-[var(--mute)] shrink-0" />
          <span>{poolCaption}</span>
        </div>
      )}
      {copyStatus && <p role="status" aria-live="polite" className="text-xs text-[var(--mute)]">{copyStatus}</p>}
      {poolSize > 0 && dotMode === 'volume' && (
        <p className="text-[10px] text-[var(--mute)]" aria-label="Dot size legend">
          Dot size represents minutes: {Math.min(...points.map((p) => p.mins || p.Min || 0)).toLocaleString()} · {Math.round(points.reduce((sum, p) => sum + (p.mins || p.Min || 0), 0) / poolSize).toLocaleString()} · {Math.max(...points.map((p) => p.mins || p.Min || 0)).toLocaleString()} min (min · average · max)
        </p>
      )}
      {colorBy !== 'none' && <div className="flex flex-wrap items-center gap-3 text-[10px] text-[var(--mute)]" aria-label="Point colour legend">
        <span>Colour encodes {colorBy === 'position' ? 'position group' : colorBy === 'club' ? 'club (top 8; others grey)' : 'Goals - xG; n/a is grey'}:</span>
        {(colorBy === 'position' ? [['FW', 'var(--blue)'], ['MF', 'var(--red)'], ['DF', 'var(--board)'], ['GK', 'var(--amber)']] : colorBy === 'finishing' ? [['Below 0', 'var(--blue)'], ['0', 'var(--amber)'], ['Above 0', 'var(--red)']] : [...clubColors.entries()].map(([club, color]) => [club, color])).map(([label, color]) => <span key={label} className="inline-flex items-center gap-1"><i style={{ backgroundColor: color }} className="inline-block w-2 h-2 rounded-full" />{label}</span>)}
      </div>}
      {poolSize > 0 && Number.isFinite(resolvedMedians.x) && Number.isFinite(resolvedMedians.y) && (
        <div className="text-xs text-[var(--mute)]" role="note">
          <span className="font-semibold">Median guides:</span>{' '}
          {xLabel} {formatCoordinate(resolvedMedians.x)} · {yLabel} {formatCoordinate(resolvedMedians.y)}
          <span className="italic">; tied values can lie on the guides.</span>
        </div>
      )}
      {overflowCount > 0 && (
        <div className="text-xs italic text-[var(--mute)]" role="status">
          {overflowCount} point{overflowCount === 1 ? '' : 's'} exceed the fixed axis maximum; shown at the chart edge. Hover or open the table for exact values.
        </div>
      )}

      {/* Accessible Table View */}
      {poolSize === 0 ? (
        <div className="border border-[var(--rule)] p-8 text-center text-xs italic text-[var(--mute)]" role="status">
          No eligible observations are available for this chart.
        </div>
      ) : viewTable ? (
        <div className="overflow-x-auto max-h-[500px] border border-[var(--rule)]">
          <div className="flex items-center justify-between px-3 py-2 text-xs italic text-[var(--mute)]" role="status">
            <span>Showing {showAllRows ? poolSize : Math.min(poolSize, 100)} of {poolSize} plotted players.</span>
            {poolSize > 100 && <button type="button" onClick={() => setShowAllRows((value) => !value)} className="underline">{showAllRows ? 'Show first 100' : 'Show all'}</button>}
          </div>
          <table className="w-full text-xs font-ser border-collapse">
            <thead>
              <tr className="border-b border-[var(--ink)] bg-[var(--panel)]">
                {[["Player", "Player"], ["Squad", "Club"], ["Comp", "Comp"], ["Pos", "Pos"], ["Min", "Minutes"], ["x", xLabel], ["y", yLabel]].map(([key, label]) => <th key={key} className="py-2 px-2 text-left font-bold text-[var(--ink)]"><button type="button" onClick={() => setTableSort((old) => ({ key, descending: old.key === key ? !old.descending : true }))}>{label}{tableSort.key === key ? (tableSort.descending ? ' ↓' : ' ↑') : ''}</button></th>)}
              </tr>
            </thead>
            <tbody>
              {(showAllRows ? sortedTablePoints : sortedTablePoints.slice(0, 100)).map((p, idx) => (
                <tr
                  key={p.id || idx}
                  onClick={() => onSelectPlayer && onSelectPlayer(p)}
                  className={`hover:bg-[var(--panel)] cursor-pointer transition-colors ${
                    p.id === highlightId ? 'bg-amber-100/50 font-bold' : ''
                  }`}
                >
                  <td className="py-1.5 px-3 dotted-rule text-[var(--ink)]">{p.name || p.Player}</td>
                  <td className="py-1.5 px-2 dotted-rule">{p.club || p.Squad}</td>
                  <td className="py-1.5 px-2 dotted-rule">{p.comp || p.Comp}</td>
                  <td className="py-1.5 px-2 dotted-rule text-center">{p.pos || p.Pos}</td>
                  <td className="py-1.5 px-2 dotted-rule text-right font-mono">{(p.mins || p.Min || 0).toLocaleString()}</td>
                  <td className="py-1.5 px-3 dotted-rule text-right font-mono font-semibold">{formatCoordinate(p.x)}</td>
                  <td className="py-1.5 px-3 dotted-rule text-right font-mono font-semibold">{formatCoordinate(p.y)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* SVG Scatter View */
        <div className="relative w-full overflow-hidden select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
            role="group"
            aria-label={`${yShort || yLabel} against ${xShort || xLabel}. Dotted guides mark the pool medians.`}
          >
              <g transform={`translate(${MARGIN.left},${MARGIN.top})`} style={{ transition: !reducedMotion && poolSize <= 800 ? 'transform 200ms ease' : 'none' }}>
              {/* Background Quadrant Labels */}
              {quadrantLabels && (
                <g pointerEvents="none" className="opacity-70">
                  {quadrantLabelVisible(quadrantLabels.topRight, 'topRight') && (
                    <text x={W - 8} y={16} textAnchor="end" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.topRight}
                    </text>
                  )}
                  {quadrantLabelVisible(quadrantLabels.topLeft, 'topLeft') && (
                    <text x={8} y={16} textAnchor="start" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.topLeft}
                    </text>
                  )}
                  {quadrantLabelVisible(quadrantLabels.bottomRight, 'bottomRight') && (
                    <text x={W - 8} y={H - 12} textAnchor="end" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.bottomRight}
                    </text>
                  )}
                  {quadrantLabelVisible(quadrantLabels.bottomLeft, 'bottomLeft') && (
                    <text x={8} y={H - 12} textAnchor="start" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.bottomLeft}
                    </text>
                  )}
                </g>
              )}

              {/* Y Grid lines and Ticks */}
              {sy.ticks(6, yTickStep).map((t) => (
                  <g key={`y-${t}`} transform={`translate(0,${sy(t)})`} style={{ transition: !reducedMotion && poolSize <= 800 ? 'transform 200ms ease' : 'none' }}>
                  <line x2={W} stroke="var(--rule)" strokeWidth="0.8" />
                  <text x={-10} dy="0.32em" textAnchor="end" className="fill-[var(--mute)] text-[11px] font-mono">
                    {t}
                  </text>
                </g>
              ))}

              {/* X Ticks */}
              {sx.ticks(7, xTickStep).map((t) => (
                  <g key={`x-${t}`} transform={`translate(${sx(t)},${H})`} style={{ transition: !reducedMotion && poolSize <= 800 ? 'transform 200ms ease' : 'none' }}>
                  <line y2={5} stroke="var(--ink)" strokeWidth="1" />
                  <text y={20} textAnchor="middle" className="fill-[var(--mute)] text-[11px] font-mono">
                    {t}
                  </text>
                </g>
              ))}

              {/* Median Cross-hairs */}
              {poolSize > 0 && <line
                x1={projectX(resolvedMedians.x)}
                x2={projectX(resolvedMedians.x)}
                y1={0}
                y2={H}
                stroke="var(--mute)"
                strokeDasharray="3 5"
                strokeWidth="1.2"
                strokeOpacity="0.65"
              />}
              {poolSize > 0 && <line
                y1={projectY(resolvedMedians.y)}
                y2={projectY(resolvedMedians.y)}
                x1={0}
                x2={W}
                stroke="var(--mute)"
                strokeDasharray="3 5"
                strokeWidth="1.2"
                strokeOpacity="0.65"
              />}

              {/* Optional Parity Line */}
              {parity && parityEnd > 0 && (
                <g>
                  <line
                    x1={sx(0)}
                    y1={sy(0)}
                    x2={sx(parityEnd)}
                    y2={sy(parityEnd)}
                    stroke="var(--blue)"
                    strokeDasharray="6 4"
                    strokeWidth="1.4"
                  />
                  <text
                    x={sx(parityEnd * 0.75)}
                    y={sy(parityEnd * 0.75) - 8}
                    textAnchor="end"
                    transform={`rotate(-40, ${sx(parityEnd * 0.75)}, ${sy(parityEnd * 0.75)})`}
                    className="fill-[var(--blue)] text-[10px] font-mono italic"
                  >
                    {parityLabel}
                  </text>
                </g>
              )}

              {/* Plotted Player Dots */}
              {points.map((p) => {
                const searchTerm = normalizePlayerSearch(highlightName.trim());
                const isHighlight = p.id === highlightId || (searchTerm && normalizePlayerSearch(p.name || p.Player).includes(searchTerm));
                const isPinned = pinnedIds.has(p.id);
                const hasSearch = Boolean(searchTerm);
                const isHover = hovered && (hovered.id === p.id || (hovered.name === p.name && hovered.x === p.x && hovered.y === p.y));
                const mins = p.mins || p.Min || 0;
                const baseR = sr(mins);

                // Visual radius (what you see)
                const visualR = isHighlight ? baseR + 2.5 : isHover ? baseR + 2 : baseR;
                // Hitbox radius (invisible, for effortless targeting) - always at least 7px
                const hitboxR = Math.max(baseR, 7);

                // Visual hierarchy: sub-900m vs established starters
                const isLowMinutes = mins < 900 && !isHighlight && !isHover;
                const baseOpacity = isLowMinutes ? 0.30 : 0.55;
                const baseStrokeWidth = isLowMinutes ? 0.4 : 0.6;
                const baseStroke = isLowMinutes ? 'var(--blue)' : 'var(--blue)';
                const baseFill = getPointColor(p);

                const opacity = (isHighlight || isHover || isPinned) ? 1 : hasSearch ? 0.16 : baseOpacity;
                const fill = isHighlight ? 'var(--signal, #c92a2a)' : baseFill;
                const stroke = isHighlight ? 'var(--signal, #c92a2a)' : isHover ? 'var(--ink)' : baseStroke;
                const strokeWidth = (isHighlight || isHover) ? 1.75 : baseStrokeWidth;

                // Hover/highlight bloom with halo ring
                const bloomR = (isHighlight || isHover) ? visualR + 2 : visualR;
                const haloStroke = (isHighlight || isHover) ? 'var(--ink)' : 'transparent';
                const haloStrokeWidth = (isHighlight || isHover) ? 2 : 0;

                return (
                  <g key={p.id || `${p.name}-${p.x}-${p.y}`}>
                    {/* Invisible transparent hitbox for effortless targeting */}
                    <circle
                      id={`scatter-hit-${p.id}`}
                      cx={projectPointX(p)}
                      cy={projectPointY(p)}
                      r={hitboxR}
                      fill="transparent"
                      stroke="transparent"
                      className="cursor-pointer"
                      tabIndex={p.id === activePointId ? 0 : -1}
                      role="button"
                      aria-label={`${p.name || p.Player}: ${xLabel} ${p.x}, ${yLabel} ${p.y}`}
                      onMouseEnter={() => setHovered(p)}
                      onMouseLeave={() => setHovered((cur) => (cur && (cur.id === p.id || cur.name === p.name) ? null : cur))}
                      onFocus={() => setHovered(p)}
                      onBlur={() => setHovered(null)}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); moveFocus(p, event.key === 'ArrowRight' ? 1 : -1); }
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          if (pinnedIds.has(p.id)) onSelectPlayer?.(p);
                          else setPinnedIds((old) => new Set(old).add(p.id));
                        }
                      }}
                      onClick={() => {
                        setHovered(p);
                        setPinnedIds((old) => { const next = new Set(old); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; });
                      }}
                      onDoubleClick={() => onSelectPlayer?.(p)}
                      style={{ transition: !reducedMotion && poolSize <= 800 ? 'cx 200ms ease, cy 200ms ease, r 200ms ease' : 'none' }}
                    />
                    {/* Visible dot with bloom + halo on interaction */}
                    <circle
                      cx={projectPointX(p)}
                      cy={projectPointY(p)}
                      r={bloomR}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={haloStroke}
                      strokeWidth={haloStrokeWidth}
                      pointerEvents="none"
                      style={{ transition: !reducedMotion && poolSize <= 800 ? 'cx 200ms ease, cy 200ms ease, r 200ms ease' : 'none' }}
                    />
                    {/* Core dot */}
                    <circle
                      cx={projectPointX(p)}
                      cy={projectPointY(p)}
                      stroke={getPointColor(p)}
                      strokeWidth="0.8"
                      r={visualR}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      pointerEvents="none"
                      style={{ transition: !reducedMotion && poolSize <= 800 ? 'cx 200ms ease, cy 200ms ease, r 200ms ease' : 'none' }}
                    />
                  </g>
                );
              })}

              {/* Labels with Halo Stroke */}
              {labels.map((l) => (
                <text
                  key={l.id}
                  x={l.x}
                  y={l.y}
                  className="fill-[var(--ink)] text-[11px] font-ser font-semibold pointer-events-none select-none"
                  style={{
                    paintOrder: 'stroke fill',
                    stroke: 'var(--paper)',
                    strokeWidth: '3.5px',
                    strokeLinejoin: 'round'
                  }}
                >
                  {l.text}
                </text>
              ))}

              {/* Axis Titles */}
              <text x={W / 2} y={H + 46} textAnchor="middle" className="fill-[var(--ink)] font-disp font-bold text-xs uppercase tracking-wider">
                {xShort || xLabel}
              </text>
              <text
                transform={`translate(-48,${H / 2}) rotate(-90)`}
                textAnchor="middle"
                className="fill-[var(--ink)] font-disp font-bold text-xs uppercase tracking-wider"
              >
                {yShort || yLabel}
              </text>
            </g>

            {/* Hover Tooltip Overlay with smart left/right auto-flip */}
            {hovered && (() => {
              const tooltipW = 258;
              const tooltipH = 162;
              const dotPxX = MARGIN.left + projectPointX(hovered);
              const dotPxY = MARGIN.top + projectPointY(hovered);

              // Auto-flip: If point is on the right 45% of plot, render tooltip to the left of the dot
              const posX = (projectPointX(hovered) > W * 0.55)
                ? Math.max(MARGIN.left + 6, dotPxX - tooltipW - 14)
                : Math.min(dotPxX + 14, width - tooltipW - MARGIN.right);

              // Keep vertically bounded inside the SVG box
              const posY = Math.max(MARGIN.top + 4, Math.min(dotPxY - tooltipH / 2, height - tooltipH - MARGIN.bottom - 4));

              return (
                <g
                  transform={`translate(${posX}, ${posY})`}
                  pointerEvents="none"
                  style={{ pointerEvents: 'none' }}
                >
                  <rect
                    width={tooltipW}
                    height={tooltipH}
                    fill="var(--panel)"
                    stroke="var(--ink)"
                    strokeWidth="1.2"
                    rx="2"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.14))"
                    pointerEvents="none"
                    style={{ pointerEvents: 'none' }}
                  />
                  <text x="10" y="18" className="fill-[var(--ink)] font-disp font-bold text-xs" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    {hovered.name || hovered.Player}
                  </text>
                  <text x="10" y="34" className="fill-[var(--mute)] text-[10px] italic font-ser" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    Club: {hovered.club ?? hovered.Squad ?? 'n/a'} · Minutes: {hovered.mins ?? hovered.Min ?? 'n/a'}
                  </text>
                  <text x="10" y="50" className="fill-[var(--mute)] text-[10px] italic font-ser" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    Position: {hovered.pos ?? hovered.Pos ?? 'n/a'} · Competition: {hovered.comp ?? hovered.Comp ?? 'n/a'}
                  </text>
                  <text x="10" y="68" className="fill-[var(--blue)] font-mono text-[10px] font-semibold" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    {xShort || xLabel}: {formatCoordinate(hovered.x)} · {yShort || yLabel}: {formatCoordinate(hovered.y)}
                  </text>
                  <text x="10" y="86" className="fill-[var(--blue)] font-mono text-[10px]" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    {xShort || xLabel} per 90: {formatOptional(hovered.tooltip?.[xMetricId?.endsWith('_90') ? xMetricId : `${xMetricId}_90`] ?? (xMetricId?.endsWith('_90') ? hovered.x : null))} · {yShort || yLabel} per 90: {formatOptional(hovered.tooltip?.[yMetricId?.endsWith('_90') ? yMetricId : `${yMetricId}_90`] ?? (yMetricId?.endsWith('_90') ? hovered.y : null))}
                  </text>
                  <text x="10" y="104" className="fill-[var(--blue)] font-mono text-[10px]" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    Goals - xG: {formatOptional(hovered.tooltip?.Gls_minus_xG)}
                  </text>
                  <text x="10" y="124" className="fill-[var(--mute)] text-[9px] italic font-ser" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    Per-90 and goals - xG show n/a when not tracked.
                  </text>
                  <text x="10" y="144" className="fill-[var(--mute)] text-[9px] italic font-ser" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    Click to pin · double-click or Enter to open profile.
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
      )}
    </div>
  );
}
