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
  it('falls back safely for invalid data', () => {
    expect(normalizeState({ version: 99 }).version).toBe(1);
  });
});
