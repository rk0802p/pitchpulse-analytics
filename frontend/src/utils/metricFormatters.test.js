import { formatMetricValue, formatRateMetric, isMetricTracked } from './metricFormatters';

describe('metricFormatters utility', () => {
  test('formatMetricValue returns fallback on null or undefined', () => {
    expect(formatMetricValue(null)).toBe('—');
    expect(formatMetricValue(undefined)).toBe('—');
    expect(formatMetricValue(NaN)).toBe('—');
    expect(formatMetricValue(null, 'N/A')).toBe('N/A');
    expect(formatMetricValue(0)).toBe(0);
    expect(formatMetricValue(15)).toBe(15);
  });

  test('formatRateMetric formats numbers and returns N/A for null/undefined', () => {
    expect(formatRateMetric(null)).toBe('N/A');
    expect(formatRateMetric(undefined)).toBe('N/A');
    expect(formatRateMetric(0.456)).toBe('0.46');
    expect(formatRateMetric(0)).toBe('0.00');
  });

  test('isMetricTracked correctly identifies tracked status', () => {
    expect(isMetricTracked(null)).toBe(false);
    expect(isMetricTracked(undefined)).toBe(false);
    expect(isMetricTracked(NaN)).toBe(false);
    expect(isMetricTracked(0)).toBe(true);
    expect(isMetricTracked(12)).toBe(true);
  });
});
