/**
 * Pure mathematical utilities and coordinate scalers for SVG sports charts.
 * Zero external runtime dependencies.
 */

export function extent(values, accessor = (d) => d) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    const val = accessor(v);
    if (val !== null && val !== undefined && !Number.isNaN(val)) {
      if (val < min) min = val;
      if (val > max) max = val;
    }
  }
  if (min === Infinity) return [0, 1];
  if (min === max) return [min - 1, max + 1];
  return [min, max];
}

export function median(values, accessor = (d) => d) {
  const nums = values
    .map(accessor)
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
    .sort((a, b) => a - b);
  if (nums.length === 0) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

export function deviation(values, accessor = (d) => d) {
  const nums = values
    .map(accessor)
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
  if (nums.length <= 1) return 1;
  const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
  const variance = nums.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (nums.length - 1);
  return Math.sqrt(variance) || 1;
}

export function scaleLinear(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;

  const scale = (val) => {
    return r0 + ((val - d0) / span) * (r1 - r0);
  };

  scale.domain = () => [d0, d1];
  scale.range = () => [r0, r1];
  scale.nice = () => scale;

  scale.ticks = (count = 6, fixedStep = null) => {
    if (Number.isFinite(fixedStep) && fixedStep > 0) {
      const epsilon = fixedStep * 1e-9;
      const firstIndex = Math.ceil((d0 - epsilon) / fixedStep);
      const lastIndex = Math.floor((d1 + epsilon) / fixedStep);
      const ticks = [];
      for (let index = firstIndex; index <= lastIndex; index += 1) {
        ticks.push(Number((index * fixedStep).toFixed(8)));
      }
      if (Number.isInteger(d1) && ticks[ticks.length - 1] !== d1) ticks.push(d1);
      return ticks;
    }

    const step = span / count;
    const ticks = [];
    for (let i = 0; i <= count; i++) {
      const v = d0 + i * step;
      // Keep tick labels fine enough to show small per-90 differences.
      const precision = Math.abs(step) >= 10
        ? 0
        : Math.min(8, Math.max(2, Math.ceil(-Math.log10(Math.abs(step))) + 1));
      const rounded = Number(v.toFixed(precision));
      if (!ticks.includes(rounded)) {
        ticks.push(rounded);
      }
    }
    return ticks;
  };

  return scale;
}

export function scaleSqrt(domain, range) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const s0 = Math.sqrt(Math.max(0, d0));
  const s1 = Math.sqrt(Math.max(0, d1));
  const span = s1 - s0 || 1;

  const scale = (val) => {
    const s = Math.sqrt(Math.max(0, val));
    return r0 + ((s - s0) / span) * (r1 - r0);
  };

  scale.domain = () => [d0, d1];
  scale.range = () => [r0, r1];
  return scale;
}

const FALLBACK_TOKENS = { paper: '#E3E6DA', panel: '#D7DCCE', ink: '#14181F', mute: '#5F665E', rule: '#B5BBAC', blue: '#27419C', red: '#B3382A', amber: '#F0B429' };

export function inlineSvgStyles(svgEl) {
  if (!svgEl) return null;
  const clone = svgEl.cloneNode(true);
  const rootStyles = getComputedStyle(document.documentElement);
  const tokens = Object.fromEntries(Object.entries(FALLBACK_TOKENS).map(([key, fallback]) => [key, rootStyles.getPropertyValue(`--${key}`).trim() || fallback]));
  const replaceVars = (value) => String(value || '').replace(/var\(--([\w-]+)(?:,\s*([^)]*))?\)/g, (_, key, fallback) => tokens[key] || fallback || FALLBACK_TOKENS.ink);
  const originalNodes = [svgEl, ...svgEl.querySelectorAll('*')];
  const clonedNodes = [clone, ...clone.querySelectorAll('*')];
  originalNodes.forEach((original, index) => {
    const node = clonedNodes[index];
    if (!node || node.nodeType !== 1) return;
    const computed = getComputedStyle(original);
    const fill = computed.fill && computed.fill !== 'none' ? computed.fill : replaceVars(original.getAttribute('fill'));
    const stroke = computed.stroke && computed.stroke !== 'none' ? computed.stroke : replaceVars(original.getAttribute('stroke'));
    const style = {
      fill: fill || 'none',
      stroke: stroke || 'none',
      'font-family': computed.fontFamily || 'Georgia, serif',
      'font-size': computed.fontSize || '12px',
      'font-weight': computed.fontWeight || '400',
      'font-style': computed.fontStyle || 'normal',
      'stroke-width': computed.strokeWidth || original.getAttribute('stroke-width') || '1',
      opacity: computed.opacity || original.getAttribute('opacity') || '1',
      'paint-order': computed.paintOrder || original.style?.paintOrder || 'normal'
    };
    Object.entries(style).forEach(([key, value]) => node.style.setProperty(key, replaceVars(value)));
    [...node.attributes].forEach((attr) => {
      const updated = replaceVars(attr.value);
      if (updated !== attr.value) node.setAttribute(attr.name, updated);
    });
    node.removeAttribute('class');
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 900);
  clone.setAttribute('height', svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 560);
  return new XMLSerializer().serializeToString(clone);
}

export function buildExportHeader(context = {}) {
  return [context.title || 'Scatter plot', context.scope || '', `${context.mode || 'Totals'} · ${context.sizeLegend || 'Size: minutes'} · ${context.colorLegend || 'Colour: none'}`, context.quality || '', context.sourceLine || 'Dataset provenance: Dataset Registry'].filter(Boolean);
}

export function canCopyChartImage() {
  return typeof ClipboardItem !== 'undefined' && typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.write);
}

export function createSvgPngBlob(svgEl, context = {}, scale = 2) {
  if (!svgEl) return Promise.resolve(null);
  const xml = inlineSvgStyles(svgEl);
  const image = new Image();
  const width = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 900;
  const height = svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 560;
  const rootStyles = getComputedStyle(document.documentElement);
  const token = (name) => rootStyles.getPropertyValue(`--${name}`).trim() || FALLBACK_TOKENS[name];
  const paper = token('paper'); const ink = token('ink'); const mute = token('mute');
  return new Promise((resolve, reject) => {
    image.onerror = reject;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const headerHeight = 96; const footerHeight = 38;
      canvas.width = width * scale; canvas.height = (height + headerHeight + footerHeight) * scale;
      const context2d = canvas.getContext('2d');
      if (!context2d) { resolve(null); return; }
      context2d.scale(scale, scale);
      context2d.fillStyle = paper; context2d.fillRect(0, 0, width, height + headerHeight + footerHeight);
      context2d.fillStyle = ink; context2d.font = '700 20px Georgia, serif'; context2d.fillText(context.title || 'Scatter plot', 18, 28);
      context2d.fillStyle = mute; context2d.font = '12px Georgia, serif';
      context2d.fillText(context.scope || '', 18, 48, width - 36);
      context2d.fillText(`${context.mode || 'Totals'} · ${context.sizeLegend || 'Size: minutes'} · ${context.colorLegend || 'Colour: none'}`, 18, 67, width - 36);
      if (context.quality) context2d.fillText(context.quality, 18, 85, width - 36);
      context2d.drawImage(image, 0, headerHeight, width, height);
      context2d.fillStyle = mute; context2d.font = '11px Georgia, serif';
      context2d.fillText(`PitchPulse Analytics · ${context.sourceLine || 'Dataset provenance: Dataset Registry'}`, 18, height + headerHeight + 23, width - 36);
      canvas.toBlob(resolve, 'image/png');
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });
}

export async function downloadSvgAsPng(svgEl, name = 'pitchpulse-chart.png', scale = 2, context = {}) {
  const blob = await createSvgPngBlob(svgEl, context, scale);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  URL.revokeObjectURL(url);
  return blob;
}

export async function copySvgAsPng(svgEl, context = {}) {
  if (!canCopyChartImage()) return false;
  const blob = await createSvgPngBlob(svgEl, context, 2);
  if (!blob) return false;
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  return true;
}
