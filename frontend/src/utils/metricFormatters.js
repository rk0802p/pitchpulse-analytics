/**
 * Metric formatting and display utilities for sports analytics.
 * Enforces honest representations of missing or untracked historical data.
 */

export const formatMetricValue = (value, fallback = '—') => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return fallback;
  }
  return value;
};

export const formatRateMetric = (rate, fallback = 'N/A') => {
  if (rate === null || rate === undefined || Number.isNaN(rate)) {
    return fallback;
  }
  return typeof rate === 'number' ? rate.toFixed(2) : rate;
};

export const isMetricTracked = (value) => {
  return value !== null && value !== undefined && !Number.isNaN(value);
};


export const nullSafeComparator = (a, b, key, direction = 'desc') => {
  const valA = a ? a[key] : null;
  const valB = b ? b[key] : null;

  const isANull = valA === null || valA === undefined || Number.isNaN(valA);
  const isBNull = valB === null || valB === undefined || Number.isNaN(valB);

  // Nulls always placed at the end regardless of direction
  if (isANull && isBNull) return 0;
  if (isANull) return 1;
  if (isBNull) return -1;

  if (valA < valB) return direction === 'asc' ? -1 : 1;
  if (valA > valB) return direction === 'asc' ? 1 : -1;
  return 0;
};
