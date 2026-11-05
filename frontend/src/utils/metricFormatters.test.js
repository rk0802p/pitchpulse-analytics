import { formatMetricValue, formatRateMetric, isMetricTracked, nullSafeComparator } from './metricFormatters';

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

  test('nullSafeComparator places nulls and NaNs at the end in both asc and desc order', () => {
    const list = [
      { id: 1, PrgC: null },
      { id: 2, PrgC: 50 },
      { id: 3, PrgC: undefined },
      { id: 4, PrgC: 120 },
      { id: 5, PrgC: 10 }
    ];

    const sortedDesc = [...list].sort((a, b) => nullSafeComparator(a, b, 'PrgC', 'desc'));
    expect(sortedDesc.map(x => x.id)).toEqual([4, 2, 5, 1, 3]);

    const sortedAsc = [...list].sort((a, b) => nullSafeComparator(a, b, 'PrgC', 'asc'));
    expect(sortedAsc.map(x => x.id)).toEqual([5, 2, 4, 1, 3]);
  });
});
