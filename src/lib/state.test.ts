import { describe, expect, it } from 'vitest';
import { createCard, createInitialState, normalizeState } from './state';

describe('dashboard state', () => {
  it('creates stable initial state', () => {
    const state = createInitialState();
    expect(state.version).toBe(1);
    expect(state.cards.length).toBeGreaterThanOrEqual(2);
  });

  it('creates extensible cards with layout and timestamps', () => {
    const card = createCard('memoBoard', []);
    expect(card.type).toBe('memoBoard');
    expect(card.layout.w).toBeGreaterThan(0);
    expect(card.createdAt).toBeTruthy();
  });

  it('falls back safely for invalid root data', () => {
    expect(normalizeState({ version: 99 }).version).toBe(1);
  });

  it('repairs malformed known cards without dropping the dashboard', () => {
    const state = normalizeState({
      version: 1,
      meta: { title: '복구 테스트' },
      settings: { autoCompact: false },
      cards: [{
        id: 'broken',
        type: 'todo',
        title: 123,
        favorite: 1,
        layout: { x: -20, y: -1, w: 99, h: 0 },
        data: { items: [{ text: 42, done: 'yes' }, null] }
      }]
    });
    expect(state.meta.title).toBe('복구 테스트');
    expect(state.settings.autoCompact).toBe(false);
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0].layout.x).toBe(0);
    expect(state.cards[0].layout.w).toBe(12);
    expect((state.cards[0].data as { items: unknown[] }).items).toHaveLength(1);
  });

  it('preserves unknown card payloads for future card types', () => {
    const state = normalizeState({
      version: 1,
      cards: [{ id: 'future', type: 'calendar', title: '일정', layout: { x: 0, y: 0, w: 4, h: 6 }, data: { events: [1, 2] } }]
    });
    expect(state.cards[0].type).toBe('calendar');
    expect(state.cards[0].data).toEqual({ events: [1, 2] });
  });
});
