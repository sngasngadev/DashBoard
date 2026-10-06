import { describe, expect, it } from 'vitest';
import type { BoardNote } from '../types/dashboard';
import { packNotes, reorderNotes } from './postitLayout';

const note = (id: string, width = 240, height = 190): BoardNote => ({
  id,
  text: id,
  color: 'yellow',
  width,
  height
});

describe('post-it layout', () => {
  it('packs notes from the top-left without overlap', () => {
    const packed = packNotes([note('a'), note('b'), note('c')], 760);

    expect(packed[0]).toMatchObject({ id: 'a', x: 0, y: 0 });

    for (let i = 0; i < packed.length; i += 1) {
      for (let j = i + 1; j < packed.length; j += 1) {
        const a = packed[i];
        const b = packed[j];
        const overlap = a.x < b.x + b.width
          && a.x + a.width > b.x
          && a.y < b.y + b.height
          && a.y + a.height > b.y;
        expect(overlap).toBe(false);
      }
    }
  });

  it('uses free space created by differently sized notes', () => {
    const packed = packNotes([
      note('a', 300, 300),
      note('b', 180, 140),
      note('c', 180, 140)
    ], 700);

    expect(packed[0]).toMatchObject({ x: 0, y: 0 });
    expect(packed[1].y).toBe(0);
    expect(packed[2].y).toBe(0);
  });

  it('reorders notes without storing coordinates', () => {
    const notes = [note('a'), note('b'), note('c')];
    expect(reorderNotes(notes, 'c', 'a', false).map(item => item.id)).toEqual(['c', 'a', 'b']);
    expect(reorderNotes(notes, 'a', 'c', true).map(item => item.id)).toEqual(['b', 'c', 'a']);
  });
});
