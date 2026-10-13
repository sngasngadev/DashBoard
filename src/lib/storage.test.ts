import { afterEach, describe, expect, it, vi } from 'vitest';
import { importBackup, loadState, saveEmergencySnapshot, saveState } from './storage';
import { createInitialState } from './state';

function jsonFile(value: unknown) {
  return new File([JSON.stringify(value)], 'backup.json', { type: 'application/json' });
}

describe('backup import', () => {
  it('accepts a supported dashboard backup', async () => {
    const state = await importBackup(jsonFile({
      version: 1,
      meta: { title: '백업' },
      settings: { autoCompact: true },
      cards: []
    }));

    expect(state.version).toBe(1);
    expect(state.meta.title).toBe('백업');
  });

  it('rejects unsupported versions instead of silently resetting the dashboard', async () => {
    await expect(importBackup(jsonFile({ version: 2, cards: [] })))
      .rejects.toThrow('지원하지 않는 백업 형식');
  });

  it('rejects malformed root data', async () => {
    await expect(importBackup(jsonFile(['not', 'a', 'dashboard'])))
      .rejects.toThrow('올바른 대시보드 백업 파일');
  });
});

describe('durable storage and recovery', () => {
  const key = 'dashboard-state-v1';
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('journals edits synchronously even if the tab closes before the async database write', () => {
    const state = createInitialState();
    state.meta.title = '마지막 변경';
    saveEmergencySnapshot(state);
    expect(JSON.parse(localStorage.getItem(key)!).meta.title).toBe('마지막 변경');
  });

  it('restores the newest journal despite an unavailable IndexedDB', async () => {
    const state = createInitialState();
    state.meta.title = '복원할 변경';
    saveEmergencySnapshot(state);
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('blocked'); } });
    const restored = await loadState();
    expect(restored.meta.title).toBe('복원할 변경');
    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it('preserves the journal when IndexedDB writes fail', async () => {
    const state = createInitialState();
    saveEmergencySnapshot(state);
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('blocked'); } });
    await expect(saveState(state)).resolves.toBe(true);
    expect(localStorage.getItem(key)).not.toBeNull();
  });

  it('refuses to silently reset corrupted pending state', async () => {
    localStorage.setItem(key, '{broken');
    await expect(loadState()).rejects.toThrow('임시 저장 데이터가 손상');
    expect(localStorage.getItem(key)).toBe('{broken');
  });

  it('refuses to turn an IndexedDB outage into a fresh dashboard', async () => {
    vi.stubGlobal('indexedDB', { open: () => { throw new Error('blocked'); } });
    await expect(loadState()).rejects.toThrow('초기화를 중단');
  });

  it('reports an error when both durable stores are unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => saveEmergencySnapshot(createInitialState())).toThrow('quota');
  });
});
