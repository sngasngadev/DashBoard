import { describe, expect, it } from 'vitest';
import { importBackup } from './storage';

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
