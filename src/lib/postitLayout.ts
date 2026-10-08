import type { BoardNote } from '../types/dashboard';
import { POSTIT_DEFAULT_HEIGHT, POSTIT_DEFAULT_WIDTH, POSTIT_MIN_WIDTH } from './postit';

export const POSTIT_GAP = 10;

export interface PackedNote {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function overlaps(a: Omit<PackedNote, 'id'>, b: Omit<PackedNote, 'id'>) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export function packNotes(notes: BoardNote[], canvasWidth: number, gap = POSTIT_GAP): PackedNote[] {
  if (canvasWidth <= 0) return [];
  const placed: PackedNote[] = [];

  for (const note of notes) {
    const width = Math.min(note.width ?? POSTIT_DEFAULT_WIDTH, Math.max(POSTIT_MIN_WIDTH, canvasWidth));
    const height = note.height ?? POSTIT_DEFAULT_HEIGHT;

    const xs = new Set<number>([0]);
    const ys = new Set<number>([0]);
    for (const item of placed) {
      xs.add(item.x + item.width + gap);
      ys.add(item.y + item.height + gap);
    }

    const candidates = [...ys]
      .flatMap(y => [...xs].map(x => ({ x, y })))
      .filter(pos => pos.x + width <= canvasWidth + 0.5)
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const chosen = candidates.find(pos =>
      !placed.some(item => overlaps(
        { x: pos.x, y: pos.y, width, height },
        { x: item.x, y: item.y, width: item.width, height: item.height }
      ))
    ) ?? {
      x: 0,
      y: placed.length ? Math.max(...placed.map(item => item.y + item.height)) + gap : 0
    };

    placed.push({ id: note.id, x: chosen.x, y: chosen.y, width, height });
  }

  return placed;
}

export function reorderNotes(notes: BoardNote[], movedId: string, targetId: string, after: boolean): BoardNote[] {
  if (movedId === targetId) return notes;

  const moved = notes.find(note => note.id === movedId);
  if (!moved) return notes;

  const rest = notes.filter(note => note.id !== movedId);
  const targetIndex = rest.findIndex(note => note.id === targetId);
  if (targetIndex < 0) return notes;

  const insertAt = targetIndex + (after ? 1 : 0);
  return [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
}
