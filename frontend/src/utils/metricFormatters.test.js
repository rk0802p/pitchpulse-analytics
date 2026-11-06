import { 
  formatMetricValue, 
  formatRateMetric, 
  formatMinutes, 
  formatGoalsMinusXG,
  formatDiscipline,
  formatNumber,
  formatDecimal,
  generateProfileSummary,
  isMetricTracked, 
  nullSafeComparator,
  GLOSSARY 
} from './metricFormatters';

describe('metricFormatters utility', () => {
  test('formatMetricValue returns fallback on null or undefined', () => {
    expect(formatMetricValue(null)).toBe('—');
    expect(formatMetricValue(undefined)).toBe('—');
    expect(formatMetricValue(NaN)).toBe('—');
    expect(formatMetricValue(null, 'N/A')).toBe('N/A');
    expect(formatMetricValue(0)).toBe(0);
    expect(formatMetricValue(15)).toBe(15);
  });

  test('formatMinutes formats minutes with thousands separator and suffix', () => {
    expect(formatMinutes(2907)).toBe('2,907 mins');
    expect(formatMinutes(450)).toBe('450 mins');
    expect(formatMinutes(null)).toBe('—');
  });

  test('formatGoalsMinusXG returns formatted delta, glyph, and direction', () => {
    const over = formatGoalsMinusXG(8.3);
    expect(over.text).toBe('+8.3');
    expect(over.glyph).toBe('▲');
    expect(over.isOver).toBe(true);

    const under = formatGoalsMinusXG(-6.6);
    expect(under.text).toBe('−6.6');
    expect(under.glyph).toBe('▼');
    expect(under.isUnder).toBe(true);
  });

  test('formatDiscipline formats readable discipline text', () => {
    expect(formatDiscipline(3, 1)).toBe('3 yellows, 1 red');
    expect(formatDiscipline(1, 0)).toBe('1 yellow, 0 reds');
  });

  test('generateProfileSummary produces data-driven sentences without hype', () => {
    const player = {
      Player: "Patrik Schick",
      Pos: "FW",
      Gls: 21,
      xG: 12.7,
      Min: 1800,
      Ast: 3,
      PrgC: 40
    };
    const summary = generateProfileSummary(player);
    expect(summary).toContain('Patrik Schick has scored 8.3 more than his chances suggest');
  });

  test('formatRateMetric formats numbers and returns N/A for null/undefined', () => {
    expect(formatRateMetric(null)).toBe('N/A');
    expect(formatRateMetric(undefined)).toBe('N/A');
    expect(formatRateMetric(0.456)).toBe('0.46');
    expect(formatRateMetric(0)).toBe('0.00');
  });

  test('GLOSSARY contains comprehensive definitions', () => {
    expect(GLOSSARY.xG).toBeDefined();
    expect(GLOSSARY['G - xG']).toBeDefined();
    expect(GLOSSARY.xAG).toBeDefined();
    expect(GLOSSARY.PrgC).toBeDefined();
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
