import type { CardLayout, CardRecord } from '../types/dashboard';

export const GRID_COLS = 12;
export const ADD_TILE_WIDTH = 3;
export const ADD_TILE_HEIGHT = 3;

export function overlaps(a: CardLayout, b: CardLayout) {
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

export function nearestFreePosition(placed: CardLayout[], preferred: CardLayout, cols = GRID_COLS): CardLayout {
  const w = Math.min(preferred.w, cols);
  const h = preferred.h;
  const startX = Math.max(0, Math.min(cols - w, preferred.x));
  const startY = Math.max(0, preferred.y);
  const direct = { x: startX, y: startY, w, h };
  if (!placed.some(item => overlaps(direct, item))) return direct;

  for (let radius = 1; radius < 2000; radius += 1) {
    const minY = Math.max(0, startY - radius);
    const maxY = startY + radius;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = 0; x <= cols - w; x += 1) {
        if (Math.abs(x - startX) + Math.abs(y - startY) !== radius) continue;
        const candidate = { x, y, w, h };
        if (!placed.some(item => overlaps(candidate, item))) return candidate;
      }
    }
  }
  return firstFreePosition(placed, w, h, cols);
}

export function repairOverlaps(cards: CardRecord[], cols = GRID_COLS): CardRecord[] {
  const placed: CardLayout[] = [];
  return cards.map(card => {
    const preferred = {
      x: Math.max(0, Math.min(cols - Math.min(card.layout.w, cols), card.layout.x)),
      y: Math.max(0, card.layout.y),
      w: Math.min(card.layout.w, cols),
      h: card.layout.h
    };
    const layout = placed.some(item => overlaps(preferred, item))
      ? nearestFreePosition(placed, preferred, cols)
      : preferred;
    placed.push(layout);
    return { ...card, layout };
  });
}

export function safeAddTilePosition(cards: CardRecord[], preferred: CardLayout, cols = GRID_COLS): CardLayout {
  return nearestFreePosition(cards.map(card => card.layout), { ...preferred, w: ADD_TILE_WIDTH, h: ADD_TILE_HEIGHT }, cols);
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
  const droppedLayout: CardLayout = {
    x: Math.max(0, Math.min(cols - Math.min(moved.layout.w, cols), target.x)),
    y: Math.max(0, target.y),
    w: Math.min(moved.layout.w, cols),
    h: moved.layout.h
  };

  // If the dropped card actually covers an existing card, treat that card as
  // the insertion target. This feels much more natural than comparing only
  // the dropped card's top-left grid cell.
  let insertAt = others.findIndex(card => overlaps(droppedLayout, card.layout));

  if (insertAt < 0) {
    const targetKey = target.y * cols + target.x;
    insertAt = others.findIndex(card => {
      const cardKey = card.layout.y * cols + card.layout.x;
      return cardKey >= targetKey;
    });
  }
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


export function pushCardsFromDrop(cards: CardRecord[], movedId: string, target: CardLayout, cols = GRID_COLS): CardRecord[] {
  const moved = cards.find(card => card.id === movedId);
  if (!moved) return repairOverlaps(cards, cols);

  const movedLayout: CardLayout = {
    x: Math.max(0, Math.min(cols - Math.min(target.w, cols), target.x)),
    y: Math.max(0, target.y),
    w: Math.min(target.w, cols),
    h: target.h
  };

  const others = cards.filter(card => card.id !== movedId);
  const fixed: CardRecord[] = [];
  const displaced: CardRecord[] = [];

  for (const card of others) {
    if (overlaps(movedLayout, card.layout)) displaced.push(card);
    else fixed.push(card);
  }

  const occupied: CardLayout[] = [movedLayout, ...fixed.map(card => card.layout)];
  const displacedLayouts = new Map<string, CardLayout>();

  for (const card of displaced.sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x)) {
    const next = nearestFreePosition(occupied, card.layout, cols);
    occupied.push(next);
    displacedLayouts.set(card.id, next);
  }

  return cards.map(card => {
    if (card.id === movedId) return { ...card, layout: movedLayout };
    const next = displacedLayouts.get(card.id);
    return next ? { ...card, layout: next } : card;
  });
}


export interface DashboardLayoutResult {
  cards: CardRecord[];
  addTileLayout: CardLayout;
}

export function resolveAddTileDrop(cards: CardRecord[], target: CardLayout): DashboardLayoutResult {
  return {
    cards,
    addTileLayout: safeAddTilePosition(cards, target)
  };
}

export function resolveCardDrop(
  cards: CardRecord[],
  addTileLayout: CardLayout,
  movedId: string,
  target: CardLayout,
  autoCompact: boolean,
  cols = GRID_COLS
): DashboardLayoutResult {
  const moved = cards.find(card => card.id === movedId);
  if (!moved) {
    const repaired = repairOverlaps(cards, cols);
    return {
      cards: repaired,
      addTileLayout: safeAddTilePosition(repaired, addTileLayout, cols)
    };
  }

  const nextCards = autoCompact
    ? reorderAndCompactCards(cards, movedId, target, cols)
    : pushCardsFromDrop(cards, movedId, {
        x: target.x,
        y: target.y,
        w: moved.layout.w,
        h: moved.layout.h
      }, cols);

  const preferredAdd = autoCompact
    ? nextCardPosition(nextCards, ADD_TILE_WIDTH, ADD_TILE_HEIGHT)
    : addTileLayout;

  return {
    cards: nextCards,
    addTileLayout: safeAddTilePosition(nextCards, preferredAdd, cols)
  };
}

export function resolveCardResize(
  cards: CardRecord[],
  addTileLayout: CardLayout,
  updatedLayouts: ReadonlyMap<string, CardLayout>,
  autoCompact: boolean,
  cols = GRID_COLS
): DashboardLayoutResult {
  let nextCards = repairOverlaps(cards.map(card => ({
    ...card,
    layout: updatedLayouts.get(card.id) ?? card.layout
  })), cols);

  if (autoCompact) nextCards = compactCards(nextCards, cols);

  const preferredAdd = autoCompact
    ? nextCardPosition(nextCards, ADD_TILE_WIDTH, ADD_TILE_HEIGHT)
    : addTileLayout;

  return {
    cards: nextCards,
    addTileLayout: safeAddTilePosition(nextCards, preferredAdd, cols)
  };
}

export function resolveCompact(cards: CardRecord[], cols = GRID_COLS): DashboardLayoutResult {
  const nextCards = compactCards(cards, cols);
  return {
    cards: nextCards,
    addTileLayout: safeAddTilePosition(nextCards, nextCardPosition(nextCards, ADD_TILE_WIDTH, ADD_TILE_HEIGHT), cols)
  };
}
