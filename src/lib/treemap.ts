/**
 * Squarified treemap (Bruls, Huizing & van Wijk, 2000).
 *
 * Used for the mosaic on the home page and inside every state card. Plain
 * slice-and-dice produces slivers you cannot put a label in; squarifying keeps
 * every tile close to a square, which is what makes the reference layout
 * readable at a glance.
 *
 * Output is in percentages so cells can be positioned with CSS and reflow with
 * the container — no measuring, no resize observers.
 */

export interface TreemapInput<T> {
  item: T;
  /** Must be > 0. Callers should clamp before handing values in. */
  value: number;
}

export interface TreemapCell<T> {
  item: T;
  /** All four are percentages of the container, 0-100. */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Worst (largest) aspect ratio in a row if `candidate` were added to it. */
function worstRatio(row: number[], rowSum: number, side: number): number {
  if (row.length === 0 || rowSum <= 0 || side <= 0) return Infinity;
  const s2 = rowSum * rowSum;
  const w2 = side * side;
  let max = 0;
  for (const v of row) {
    // Both orientations of each tile; the larger is the one that hurts.
    const ratio = Math.max((w2 * v) / s2, s2 / (w2 * v));
    if (ratio > max) max = ratio;
  }
  return max;
}

function layoutRow<T>(
  row: TreemapInput<T>[],
  rowSum: number,
  rect: Rect,
  totalValue: number,
  out: TreemapCell<T>[],
): Rect {
  const areaScale = (rect.w * rect.h) / totalValue;
  const rowArea = rowSum * areaScale;
  const horizontal = rect.w >= rect.h;

  if (horizontal) {
    // Row occupies a full-height vertical strip on the left of `rect`.
    const stripW = rowArea / rect.h;
    let y = rect.y;
    for (const entry of row) {
      const h = (entry.value / rowSum) * rect.h;
      out.push({ item: entry.item, x: rect.x, y, w: stripW, h });
      y += h;
    }
    return { x: rect.x + stripW, y: rect.y, w: rect.w - stripW, h: rect.h };
  }

  // Row occupies a full-width horizontal strip along the top of `rect`.
  const stripH = rowArea / rect.w;
  let x = rect.x;
  for (const entry of row) {
    const w = (entry.value / rowSum) * rect.w;
    out.push({ item: entry.item, x, y: rect.y, w, h: stripH });
    x += w;
  }
  return { x: rect.x, y: rect.y + stripH, w: rect.w, h: rect.h - stripH };
}

/**
 * Lay `inputs` out inside a 100x100 box, largest first.
 *
 * Zero and negative values are floored to a small positive number rather than
 * dropped: a district with one trivial promise still has to be clickable.
 */
export function squarify<T>(inputs: TreemapInput<T>[]): TreemapCell<T>[] {
  const items = inputs
    .map((i) => ({ item: i.item, value: Math.max(i.value, 0.0001) }))
    .sort((a, b) => b.value - a.value);

  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ item: items[0].item, x: 0, y: 0, w: 100, h: 100 }];
  }

  const out: TreemapCell<T>[] = [];
  let rect: Rect = { x: 0, y: 0, w: 100, h: 100 };
  let remaining = items.reduce((s, i) => s + i.value, 0);

  let row: TreemapInput<T>[] = [];
  let rowSum = 0;
  let cursor = 0;

  while (cursor < items.length) {
    const next = items[cursor];
    const side = Math.min(rect.w, rect.h);
    // Values must be expressed in the same units as the rect to compare ratios.
    const scale = (rect.w * rect.h) / remaining;
    const rowScaled = row.map((r) => r.value * scale);
    const nextScaled = next.value * scale;

    const current = worstRatio(rowScaled, rowSum * scale, side);
    const withNext = worstRatio([...rowScaled, nextScaled], (rowSum + next.value) * scale, side);

    if (row.length === 0 || withNext <= current) {
      row.push(next);
      rowSum += next.value;
      cursor += 1;
    } else {
      rect = layoutRow(row, rowSum, rect, remaining, out);
      remaining -= rowSum;
      row = [];
      rowSum = 0;
    }
  }

  if (row.length > 0) layoutRow(row, rowSum, rect, remaining, out);

  // Restore caller order so React keys stay stable across re-renders.
  const order = new Map(inputs.map((i, idx) => [i.item, idx]));
  out.sort((a, b) => (order.get(a.item) ?? 0) - (order.get(b.item) ?? 0));
  return out;
}
