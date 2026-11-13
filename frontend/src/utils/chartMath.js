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

  scale.ticks = (count = 6) => {
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

export function downloadSvgAsPng(svgEl, name = 'pitchpulse-chart.png', scale = 2) {
  if (!svgEl) return;
  const xml = new XMLSerializer().serializeToString(svgEl);
  const img = new Image();
  const width = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 900;
  const height = svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 560;

  // Resolve current document theme colors
  const computed = getComputedStyle(document.documentElement);
  const paper = computed.getPropertyValue('--paper').trim() || '#f7f6f2';

  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
}
