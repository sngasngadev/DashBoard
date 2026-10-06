import type { CardLayout, CardRecord } from '../types/dashboard';

export const GRID_COLS = 12;

function overlaps(a: CardLayout, b: CardLayout) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function firstFreePosition(placed: CardLayout[], w: number, h: number, cols = GRID_COLS): CardLayout {
  for (let y = 0; y < 2000; y += 1) {
    for (let x = 0; x <= cols - w; x += 1) {
      const candidate = { x, y, w, h };
      if (!placed.some(item => overlaps(candidate, item))) return candidate;
    }
  }
  return { x: 0, y: 2000, w, h };
}

export function compactCards(cards: CardRecord[], cols = GRID_COLS): CardRecord[] {
  const sorted = [...cards].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x || a.createdAt.localeCompare(b.createdAt));
  const placed: CardLayout[] = [];
  const positions = new Map<string, CardLayout>();

  sorted.forEach(card => {
    const width = Math.min(card.layout.w, cols);
    const next = firstFreePosition(placed, width, card.layout.h, cols);
    placed.push(next);
    positions.set(card.id, next);
  });

  return cards.map(card => ({ ...card, layout: positions.get(card.id) ?? card.layout }));
}

export function nextCardPosition(cards: CardRecord[], w: number, h: number) {
  return firstFreePosition(cards.map(card => card.layout), w, h);
}
