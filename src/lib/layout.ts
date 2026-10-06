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

export function packCardsInOrder(cards: CardRecord[], orderedIds: string[], cols = GRID_COLS): CardRecord[] {
  const byId = new Map(cards.map(card => [card.id, card]));
  const placed: CardLayout[] = [];
  const positions = new Map<string, CardLayout>();

  for (const id of orderedIds) {
    const card = byId.get(id);
    if (!card) continue;
    const width = Math.min(card.layout.w, cols);
    const next = firstFreePosition(placed, width, card.layout.h, cols);
    placed.push(next);
    positions.set(card.id, next);
  }

  return cards.map(card => ({ ...card, layout: positions.get(card.id) ?? card.layout }));
}

export function compactCards(cards: CardRecord[], cols = GRID_COLS): CardRecord[] {
  const orderedIds = [...cards]
    .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x || a.createdAt.localeCompare(b.createdAt))
    .map(card => card.id);
  return packCardsInOrder(cards, orderedIds, cols);
}

export function reorderAndCompactCards(cards: CardRecord[], movedId: string, target: Pick<CardLayout, 'x' | 'y'>, cols = GRID_COLS): CardRecord[] {
  const currentOrder = [...cards]
    .sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x || a.createdAt.localeCompare(b.createdAt));

  const moved = currentOrder.find(card => card.id === movedId);
  if (!moved) return compactCards(cards, cols);

  const others = currentOrder.filter(card => card.id !== movedId);
  const targetKey = target.y * cols + target.x;

  let insertAt = others.findIndex(card => {
    const cardKey = card.layout.y * cols + card.layout.x;
    return cardKey >= targetKey;
  });
  if (insertAt < 0) insertAt = others.length;

  const orderedIds = [
    ...others.slice(0, insertAt).map(card => card.id),
    movedId,
    ...others.slice(insertAt).map(card => card.id)
  ];
  return packCardsInOrder(cards, orderedIds, cols);
}

export function nextCardPosition(cards: CardRecord[], w: number, h: number) {
  return firstFreePosition(cards.map(card => card.layout), w, h);
}
