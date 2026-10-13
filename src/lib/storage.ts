import type { DashboardState } from '../types/dashboard';
import { normalizeState } from './state';

const DB_NAME = 'dashboard-db';
const DB_VERSION = 1;
const STORE_NAME = 'state';
const STATE_KEY = 'dashboard-state';
const FALLBACK_KEY = 'dashboard-state-v1';

function validateStoredState(value: unknown): DashboardState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('저장된 대시보드 데이터 형식이 올바르지 않습니다.');
  }
  const root = value as Record<string, unknown>;
  if (root.version !== 1 || !Array.isArray(root.cards)) {
    throw new Error('저장된 대시보드 데이터가 손상되었거나 지원하지 않는 버전입니다.');
  }
  return normalizeState(value);
}

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

/** Synchronous write-ahead snapshot: survives an immediate tab close. */
export function saveEmergencySnapshot(state: DashboardState): void {
  // Native SQLite commits synchronously in the main process; no browser journal.
  if (window.dashboardDesktop) return;
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(state));
}

function pendingSnapshot(): DashboardState | null {
  const raw = localStorage.getItem(FALLBACK_KEY);
  if (raw === null) return null;
  try {
    return validateStoredState(JSON.parse(raw));
  } catch {
    throw new Error('임시 저장 데이터가 손상되었습니다. 기존 데이터 보호를 위해 자동 초기화를 중단했습니다.');
  }
}

export async function loadState(): Promise<DashboardState> {
  if (window.dashboardDesktop) {
    const stored = await window.dashboardDesktop.loadState();
    return stored === null ? normalizeState(null) : validateStoredState(stored);
  }
  // The write-ahead snapshot is newer than any unconfirmed IndexedDB write.
  const pending = pendingSnapshot();
  if (pending) {
    try {
      await idbSet(pending);
      // Do not erase a newer snapshot written while the async transaction ran.
      if (localStorage.getItem(FALLBACK_KEY) === JSON.stringify(pending)) {
        localStorage.removeItem(FALLBACK_KEY);
      }
    } catch {
      // Preserve the snapshot until IndexedDB can be written again.
    }
    return pending;
  }

  // A storage failure is NOT equivalent to a new/empty dashboard.
  let stored: unknown;
  try {
    stored = await idbGet();
  } catch {
    throw new Error('저장된 데이터를 읽을 수 없습니다. 데이터를 보호하기 위해 초기화를 중단했습니다.');
  }
  return stored === null ? normalizeState(null) : validateStoredState(stored);
}

// Serialize transactions to prevent an older state overwriting a newer one.
let writeQueue: Promise<void> = Promise.resolve();
export function saveState(state: DashboardState): Promise<boolean> {
  if (window.dashboardDesktop) {
    const operation=writeQueue.catch(()=>undefined).then(()=>window.dashboardDesktop!.saveState(state).then(()=>undefined));
    writeQueue=operation;
    return operation.then(()=>true);
  }
  const serialized = JSON.stringify(state);
  const operation = writeQueue.catch(() => undefined).then(async () => {
    try {
      await idbSet(state);
      if (localStorage.getItem(FALLBACK_KEY) === serialized) {
        localStorage.removeItem(FALLBACK_KEY);
      }
    } catch {
      // A failed database write is acceptable only while its snapshot survives.
      if (localStorage.getItem(FALLBACK_KEY) !== serialized) {
        throw new Error('IndexedDB 저장 실패 및 안전한 임시 저장 확인 실패');
      }
    }
  });
  writeQueue = operation;
  return operation.then(() => true);
}

export async function exportBackup(state: DashboardState) {
  if (window.dashboardDesktop) {
    await window.dashboardDesktop.backup();
    return true;
  }
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
  return validateStoredState(parsed);
}
