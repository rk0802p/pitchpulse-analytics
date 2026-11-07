/**
 * Label placement algorithm with collision detection.
 * Places labels around dots in available candidate positions
 * avoiding overlaps with other labels and plot boundaries.
 */

export function placeLabels(items, { width, height, charW = 6.2, h = 13 }) {
  // items: [{ id, x, y, r, text }] already sorted by priority, highest first
  const placed = [];
  const out = [];
  const hit = (a, b) => !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

  for (const it of items) {
    if (!it || !it.text) continue;
    const w = it.text.length * charW;
    const r = it.r || 5;
    const spots = [
      [r + 3, -h / 2],              // right
      [-(w + r + 3), -h / 2],       // left
      [-w / 2, -(r + h + 2)],       // above
      [-w / 2, r + 2],              // below
      [r, -(r + h)],                // top-right
      [-(w + r), -(r + h)],         // top-left
      [r, r],                       // bottom-right
      [-(w + r), r],                // bottom-left
    ];

    for (const [dx, dy] of spots) {
      const b = { x1: it.x + dx, y1: it.y + dy, x2: it.x + dx + w, y2: it.y + dy + h };
      if (b.x1 < 0 || b.x2 > width || b.y1 < 0 || b.y2 > height) continue;
      if (placed.some((p) => hit(p, b))) continue;
      // Do not overlap over another dot center
      if (items.some((o) => o !== it && o.x > b.x1 - (o.r || 5) && o.x < b.x2 + (o.r || 5) &&
                            o.y > b.y1 - (o.r || 5) && o.y < b.y2 + (o.r || 5))) continue;

      placed.push(b);
      out.push({ id: it.id, text: it.text, x: b.x1, y: b.y2 - 2 });
      break;
    }
  }
  return out;
}

export function chooseLabelled(points, xs, ys, highlightId, budget = 12) {
  const zx = (v) => Math.abs(v - (xs?.median ?? 0)) / (xs?.sd || 1);
  const zy = (v) => Math.abs(v - (ys?.median ?? 0)) / (ys?.sd || 1);
  return [...points]
    .map((p) => ({ ...p, score: (p.id === highlightId || p.highlight) ? 1e9 : zx(p.x) + zy(p.y) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, budget);
}
