import React, { useMemo, useState, useRef } from 'react';
import { placeLabels, chooseLabelled } from '../../utils/placeLabels';
import { deviation, scaleLinear, scaleSqrt, downloadSvgAsPng } from '../../utils/chartMath';
import { Download, Table as TableIcon, Eye, Info } from 'lucide-react';

const MARGIN = { top: 24, right: 32, bottom: 58, left: 68 };

const formatCoordinate = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (Number.isInteger(numeric)) return String(numeric);
  return String(Number(numeric.toFixed(4)));
};

export default function ScatterPlot({
  points = [],
  medians = { x: 0, y: 0 },
  xLabel = 'X Axis',
  yLabel = 'Y Axis',
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
  yTickStep = null
}) {
  const [hovered, setHovered] = useState(null);
  const [viewTable, setViewTable] = useState(false);
  const [dotMode, setDotMode] = useState('volume'); // 'volume' | 'uniform'
  const svgRef = useRef(null);

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

    const axisDomain = (values, tickStep) => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      if (Number.isFinite(tickStep) && tickStep > 0 && min >= 0) {
        return [Math.floor(min / tickStep) * tickStep, (Math.floor(max / tickStep) + 1) * tickStep];
      }
      if (min === max) {
        if (min === 0) return [-1, 1];
        const padding = Math.abs(min) * 0.06;
        return [min - padding, max + padding];
      }
      const padding = (max - min) * 0.06;
      return [min >= 0 ? 0 : min - padding, max + padding];
    };
    const xDomain = axisDomain(points.map((p) => p.x), xTickStep);
    const yDomain = axisDomain(points.map((p) => p.y), yTickStep);
    const minMins = Math.min(...points.map((p) => p.mins || p.Min || 0));
    const maxMins = Math.max(...points.map((p) => p.mins || p.Min || 1));
    const poolSize = points.length;

    const sx = scaleLinear(xDomain, [0, W]);
    const sy = scaleLinear(yDomain, [H, 0]);

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

    const effectiveHighlightId = highlightId || (highlightName ? points.find(p => p.name?.toLowerCase() === highlightName.toLowerCase())?.id : null);

    const chosen = chooseLabelled(points, xs, ys, effectiveHighlightId, labelBudget)
      .map((p) => ({
        id: p.id,
        text: p.name || p.Player || '',
        x: sx(p.x),
        y: sy(p.y),
        r: sr(p.mins || p.Min || 0)
      }));

    const all = points.map((p) => ({
      id: p.id,
      text: p.name || p.Player || '',
      x: sx(p.x),
      y: sy(p.y),
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
  }, [points, medians, highlightId, highlightName, labelBudget, W, H, dotMode, xTickStep, yTickStep]);

  const handleExport = () => {
    if (svgRef.current) {
      downloadSvgAsPng(svgRef.current, `scatter-${xLabel.replace(/\s+/g, '_')}-vs-${yLabel.replace(/\s+/g, '_')}.png`);
    }
  };

  const parityEnd = parity ? Math.min(sx.domain()[1], sy.domain()[1]) : 0;

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
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
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

          {!viewTable && (
            <button
              type="button"
              onClick={() => setDotMode(dotMode === 'volume' ? 'uniform' : 'volume')}
              className="border border-[var(--rule)] hover:border-[var(--ink)] px-2.5 py-1 text-xs italic text-[var(--ink)] flex items-center gap-1.5 transition-colors cursor-pointer"
              title={dotMode === 'volume' ? 'Switch to uniform micro-dots (2px)' : 'Switch to volume-scaled dots (minutes-based)'}
            >
              <span className="font-mono">
                {dotMode === 'volume' ? '● Volume' : '● Uniform'}
              </span>
            </button>
          )}
        </div>
      </div>

      {poolCaption && (
        <div className="text-xs italic text-[var(--mute)] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[var(--mute)] shrink-0" />
          <span>{poolCaption}</span>
        </div>
      )}

      {/* Accessible Table View */}
      {poolSize === 0 ? (
        <div className="border border-[var(--rule)] p-8 text-center text-xs italic text-[var(--mute)]" role="status">
          No eligible observations are available for this chart.
        </div>
      ) : viewTable ? (
        <div className="overflow-x-auto max-h-[500px] border border-[var(--rule)]">
          {poolSize > 100 && (
            <p className="px-3 py-2 text-xs italic text-[var(--mute)]" role="status">
              Showing the first 100 of {poolSize} plotted players.
            </p>
          )}
          <table className="w-full text-xs font-ser border-collapse">
            <thead>
              <tr className="border-b border-[var(--ink)] bg-[var(--panel)]">
                <th className="py-2 px-3 text-left font-bold text-[var(--ink)]">Player</th>
                <th className="py-2 px-2 text-left font-bold text-[var(--ink)]">Club</th>
                <th className="py-2 px-2 text-left font-bold text-[var(--ink)]">Comp</th>
                <th className="py-2 px-2 text-center font-bold text-[var(--ink)]">Pos</th>
                <th className="py-2 px-2 text-right font-bold text-[var(--ink)]">Minutes</th>
                <th className="py-2 px-3 text-right font-bold text-[var(--ink)]">{xLabel}</th>
                <th className="py-2 px-3 text-right font-bold text-[var(--ink)]">{yLabel}</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(0, 100).map((p, idx) => (
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
            role="img"
            aria-label={`${yLabel} against ${xLabel}`}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Background Quadrant Labels */}
              {quadrantLabels && (
                <g pointerEvents="none" className="opacity-70">
                  {quadrantLabels.topRight && (
                    <text x={W - 8} y={16} textAnchor="end" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.topRight}
                    </text>
                  )}
                  {quadrantLabels.topLeft && (
                    <text x={8} y={16} textAnchor="start" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.topLeft}
                    </text>
                  )}
                  {quadrantLabels.bottomRight && (
                    <text x={W - 8} y={H - 12} textAnchor="end" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.bottomRight}
                    </text>
                  )}
                  {quadrantLabels.bottomLeft && (
                    <text x={8} y={H - 12} textAnchor="start" className="text-[11px] italic font-ser fill-[var(--mute)]">
                      {quadrantLabels.bottomLeft}
                    </text>
                  )}
                </g>
              )}

              {/* Y Grid lines and Ticks */}
              {sy.ticks(6, yTickStep).map((t) => (
                <g key={`y-${t}`} transform={`translate(0,${sy(t)})`}>
                  <line x2={W} stroke="var(--rule)" strokeWidth="0.8" />
                  <text x={-10} dy="0.32em" textAnchor="end" className="fill-[var(--mute)] text-[11px] font-mono">
                    {t}
                  </text>
                </g>
              ))}

              {/* X Ticks */}
              {sx.ticks(7, xTickStep).map((t) => (
                <g key={`x-${t}`} transform={`translate(${sx(t)},${H})`}>
                  <line y2={5} stroke="var(--ink)" strokeWidth="1" />
                  <text y={20} textAnchor="middle" className="fill-[var(--mute)] text-[11px] font-mono">
                    {t}
                  </text>
                </g>
              ))}

              {/* Median Cross-hairs */}
              {poolSize > 0 && <line
                x1={sx(resolvedMedians.x)}
                x2={sx(resolvedMedians.x)}
                y1={0}
                y2={H}
                stroke="var(--mute)"
                strokeDasharray="3 5"
                strokeWidth="1.2"
              />}
              {poolSize > 0 && <line
                y1={sy(resolvedMedians.y)}
                y2={sy(resolvedMedians.y)}
                x1={0}
                x2={W}
                stroke="var(--mute)"
                strokeDasharray="3 5"
                strokeWidth="1.2"
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
                const isHighlight = p.id === highlightId || (highlightName && p.name?.toLowerCase() === highlightName.toLowerCase());
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
                const baseFill = 'var(--blue)';

                const opacity = (isHighlight || isHover) ? 1 : baseOpacity;
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
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={hitboxR}
                      fill="transparent"
                      stroke="transparent"
                      className="cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`${p.name || p.Player}: ${xLabel} ${p.x}, ${yLabel} ${p.y}`}
                      onMouseEnter={() => setHovered(p)}
                      onMouseLeave={() => setHovered((cur) => (cur && (cur.id === p.id || cur.name === p.name) ? null : cur))}
                      onFocus={() => setHovered(p)}
                      onBlur={() => setHovered(null)}
                      onClick={() => onSelectPlayer && onSelectPlayer(p)}
                    />
                    {/* Visible dot with bloom + halo on interaction */}
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={bloomR}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={haloStroke}
                      strokeWidth={haloStrokeWidth}
                      pointerEvents="none"
                    />
                    {/* Core dot */}
                    <circle
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={visualR}
                      fill={fill}
                      fillOpacity={opacity}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      pointerEvents="none"
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
                {xLabel}
              </text>
              <text
                transform={`translate(-48,${H / 2}) rotate(-90)`}
                textAnchor="middle"
                className="fill-[var(--ink)] font-disp font-bold text-xs uppercase tracking-wider"
              >
                {yLabel}
              </text>
            </g>

            {/* Hover Tooltip Overlay with smart left/right auto-flip */}
            {hovered && (() => {
              const tooltipW = 200;
              const tooltipH = 58;
              const dotPxX = MARGIN.left + sx(hovered.x);
              const dotPxY = MARGIN.top + sy(hovered.y);

              // Auto-flip: If point is on the right 45% of plot, render tooltip to the left of the dot
              const posX = (sx(hovered.x) > W * 0.55)
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
                    {hovered.club || hovered.Squad} · {(hovered.mins || hovered.Min || 0).toLocaleString()} mins
                  </text>
                  <text x="10" y="48" className="fill-[var(--blue)] font-mono text-[10px] font-semibold" pointerEvents="none" style={{ pointerEvents: 'none' }}>
                    {xLabel.split(' ')[0]}: {formatCoordinate(hovered.x)} | {yLabel.split(' ')[0]}: {formatCoordinate(hovered.y)}
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
