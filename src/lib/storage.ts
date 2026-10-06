import type { DashboardState } from '../types/dashboard';
import { normalizeState } from './state';

const DB_NAME = 'dashboard-db';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const STATE_KEY = 'dashboard-state';
const FALLBACK_KEY = 'dashboard-state-v1';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(): Promise<unknown> {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function idbSet(value: DashboardState): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, STATE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function loadFallbackState(): DashboardState | null {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export async function loadState(): Promise<DashboardState> {
  const fallback = loadFallbackState();
  if (fallback) {
    try {
      await idbSet(fallback);
      localStorage.removeItem(FALLBACK_KEY);
    } catch {
      // Keep the fallback until IndexedDB becomes writable again.
    }
    return fallback;
  }

  try {
    const stored = await idbGet();
    if (stored) return normalizeState(stored);
  } catch {
    // Fall through to a clean initial state when no fallback exists.
  }

  return normalizeState(null);
}

export async function saveState(state: DashboardState) {
  try {
    await idbSet(state);
    try {
      localStorage.removeItem(FALLBACK_KEY);
    } catch {
      // A stale fallback is harmless when localStorage itself is unavailable.
    }
    return true;
  } catch {
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
    return true;
  }
}

export async function exportBackup(state: DashboardState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DashBoard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function importBackup(file: File) {
  const parsed: unknown = JSON.parse(await file.text());

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('올바른 대시보드 백업 파일이 아닙니다.');
  }

  const root = parsed as Record<string, unknown>;
  if (root.version !== 1 || !Array.isArray(root.cards)) {
    throw new Error('지원하지 않는 백업 형식입니다.');
  }

  return normalizeState(parsed);
}
