const NICE_STEPS = [1, 2, 5, 10];

function niceStep(raw, integer) {
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const scaled = NICE_STEPS.find((step) => step >= fraction) || 10;
  const step = scaled * power;
  return integer ? Math.max(1, Math.ceil(step)) : step;
}

export function computeAxisDomain(values, { integer = false, canBeNegative = false, padding = 0.1, minimumSpan = null } = {}) {
  const finite = values.map(Number).filter(Number.isFinite);
  if (!finite.length) return canBeNegative ? [-1, 1] : [0, integer ? 5 : 0.5];
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const minSpan = minimumSpan ?? (integer ? 5 : 0.5);
  const span = Math.max(max - min, minSpan);
  const step = niceStep(span / 6, integer);
  const lowerRaw = (canBeNegative || min < 0) ? min - span * padding : 0;
  const upperRaw = max + span * padding;
  let lower = Math.floor(lowerRaw / step) * step;
  let upper = Math.ceil(upperRaw / step) * step;
  if (!canBeNegative && min >= 0) upper = Math.max(upper, minSpan);
  if (lower === upper) upper += step;
  if (!canBeNegative && min >= 0) lower = 0;
  return [Number(lower.toPrecision(12)), Number(upper.toPrecision(12))];
}
