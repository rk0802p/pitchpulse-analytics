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
