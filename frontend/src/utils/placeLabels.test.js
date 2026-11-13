import { placeLabels, chooseLabelled } from './placeLabels';
import { scaleLinear, scaleSqrt, extent, median, deviation } from './chartMath';

describe('placeLabels collision and boundary tests (Section 12)', () => {
  test('no two returned label boxes overlap', () => {
    const items = [
      { id: 1, text: 'Erling Haaland', x: 200, y: 150, r: 8 },
      { id: 2, text: 'Harry Kane', x: 205, y: 152, r: 8 },
      { id: 3, text: 'Kylian Mbappe', x: 210, y: 154, r: 8 },
      { id: 4, text: 'Bukayo Saka', x: 500, y: 300, r: 6 }
    ];

    const labels = placeLabels(items, { width: 800, height: 600, charW: 6.2, h: 13 });

    // Check every pair of placed labels for overlap
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i];
        const b = labels[j];
        const aW = a.text.length * 6.2;
        const bW = b.text.length * 6.2;
        const aBox = { x1: a.x, y1: a.y - 11, x2: a.x + aW, y2: a.y + 2 };
        const bBox = { x1: b.x, y1: b.y - 11, x2: b.x + bW, y2: b.y + 2 };

        const overlap = !(aBox.x2 <= bBox.x1 || aBox.x1 >= bBox.x2 || aBox.y2 <= bBox.y1 || aBox.y1 >= bBox.y2);
        expect(overlap).toBe(false);
      }
    }
  });

  test('no label falls outside the plot area', () => {
    const items = [
      { id: 1, text: 'Corner Player', x: 5, y: 5, r: 5 },
      { id: 2, text: 'Far Right Player', x: 795, y: 595, r: 5 }
    ];

    const labels = placeLabels(items, { width: 800, height: 600, charW: 6.2, h: 13 });
    labels.forEach((l) => {
      const w = l.text.length * 6.2;
      expect(l.x).toBeGreaterThanOrEqual(0);
      expect(l.x + w).toBeLessThanOrEqual(800);
      expect(l.y).toBeGreaterThanOrEqual(0);
      expect(l.y).toBeLessThanOrEqual(600);
    });
  });

  test('chooseLabelled prioritises the highlighted player', () => {
    const points = [
      { id: 1, name: 'Normal 1', x: 5, y: 5 },
      { id: 2, name: 'Normal 2', x: 5.1, y: 4.9 },
      { id: 3, name: 'Highlighted Star', x: 5.05, y: 5.02 },
      { id: 4, name: 'Extreme Outlier', x: 25, y: 30 }
    ];

    const xs = { median: 5, sd: 2 };
    const ys = { median: 5, sd: 2 };

    const chosen = chooseLabelled(points, xs, ys, 3, 2);
    expect(chosen.map((c) => c.id)).toContain(3);
  });
});

describe('chartMath statistical and scale tests', () => {
  test('extent, median, and deviation calculations', () => {
    const sample = [10, 20, 30, 40, 50];
    expect(extent(sample)).toEqual([10, 50]);
    expect(median(sample)).toBe(30);
    expect(Math.round(deviation(sample))).toBe(16);
  });

  test('scaleLinear maps domains correctly', () => {
    const scale = scaleLinear([0, 100], [0, 500]);
    expect(scale(0)).toBe(0);
    expect(scale(50)).toBe(250);
    expect(scale(100)).toBe(500);
    expect(scale.ticks(5)).toBeDefined();
  });

  test('scale ticks retain precision for small per-90 ranges', () => {
    const ticks = scaleLinear([0, 0.01], [100, 0]).ticks(5);
    expect(ticks).toEqual([0, 0.002, 0.004, 0.006, 0.008, 0.01]);
  });

  test('scale supports fixed integer tick steps', () => {
    expect(scaleLinear([0, 21], [100, 0]).ticks(6, 3)).toEqual([0, 3, 6, 9, 12, 15, 18, 21]);
  });

  test('scaleSqrt maps square roots proportionally for bubble sizing', () => {
    const scale = scaleSqrt([0, 3600], [3, 11]);
    expect(scale(0)).toBe(3);
    expect(scale(3600)).toBe(11);
    expect(scale(900)).toBe(7); // sqrt(900)/sqrt(3600) = 30/60 = 0.5 -> 3 + 0.5*8 = 7
  });
});
