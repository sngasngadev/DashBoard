import { describe, expect, it } from 'vitest';
import { compactCards, firstFreePosition, reorderAndCompactCards } from './layout';
import type { CardRecord } from '../types/dashboard';

const card = (id: string, x: number, y: number, w = 4, h = 4): CardRecord => ({
  id,
  type: 'memo',
  title: id,
  favorite: false,
  layout: { x, y, w, h },
  data: { html: '' },
  createdAt: id,
  updatedAt: id
});

describe('layout packing', () => {
  it('finds the first top-left free cell', () => {
    expect(firstFreePosition([{ x:0,y:0,w:4,h:4 }], 4, 4)).toEqual({ x:4,y:0,w:4,h:4 });
  });

  it('packs cards from top-left while preserving size', () => {
    const result = compactCards([card('a', 8, 10), card('b', 4, 20)]);
    expect(result.find(c => c.id === 'a')?.layout).toEqual({ x:0,y:0,w:4,h:4 });
    expect(result.find(c => c.id === 'b')?.layout).toEqual({ x:4,y:0,w:4,h:4 });
  });

  it('inserts a moved card at the drop position and pushes following cards forward', () => {
    const cards = [card('a', 0, 0), card('b', 4, 0), card('c', 8, 0)];
    const result = reorderAndCompactCards(cards, 'c', { x: 0, y: 0 });
    expect(result.find(c => c.id === 'c')?.layout).toEqual({ x:0,y:0,w:4,h:4 });
    expect(result.find(c => c.id === 'a')?.layout).toEqual({ x:4,y:0,w:4,h:4 });
    expect(result.find(c => c.id === 'b')?.layout).toEqual({ x:8,y:0,w:4,h:4 });
  });

  it('fills the earliest available space after reordering mixed card sizes', () => {
    const cards = [card('a', 0, 0, 5, 5), card('b', 5, 0, 4, 4), card('c', 0, 8, 3, 3)];
    const result = reorderAndCompactCards(cards, 'c', { x: 0, y: 0 });
    expect(result.find(c => c.id === 'c')?.layout.x).toBe(0);
    expect(result.find(c => c.id === 'c')?.layout.y).toBe(0);
    expect(Math.min(...result.map(c => c.layout.y))).toBe(0);
  });
});
