import { describe, expect, it } from 'vitest';
import { compactCards, firstFreePosition } from './layout';
import type { CardRecord } from '../types/dashboard';

const card = (id: string, x: number, y: number, w = 4, h = 4): CardRecord => ({ id, type: 'memo', title: id, favorite: false, layout: { x,y,w,h }, data: { html: '' }, createdAt: id, updatedAt: id });

describe('layout packing', () => {
  it('finds the first top-left free cell', () => {
    expect(firstFreePosition([{ x:0,y:0,w:4,h:4 }], 4, 4)).toEqual({ x:4,y:0,w:4,h:4 });
  });
  it('packs cards from top-left while preserving size', () => {
    const result = compactCards([card('a', 8, 10), card('b', 4, 20)]);
    expect(result.find(c => c.id === 'a')?.layout).toEqual({ x:0,y:0,w:4,h:4 });
    expect(result.find(c => c.id === 'b')?.layout).toEqual({ x:4,y:0,w:4,h:4 });
  });
});
