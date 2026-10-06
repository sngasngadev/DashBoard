import type { DashboardState } from '../types/dashboard';
import { normalizeState } from './state';

const KEY = 'dashboard-state-v1';

export async function loadState(): Promise<DashboardState> {
  if (window.dashboardStore) return normalizeState(await window.dashboardStore.load());
  try {
    const raw = localStorage.getItem(KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeState(null);
  }
}

export async function saveState(state: DashboardState) {
  if (window.dashboardStore) return window.dashboardStore.save(state);
  localStorage.setItem(KEY, JSON.stringify(state));
  return true;
}

export async function exportBackup(state: DashboardState) {
  if (window.dashboardStore) return window.dashboardStore.exportBackup(state);
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `DashBoard-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function importBackupWeb(file: File) {
  return normalizeState(JSON.parse(await file.text()));
}

export async function importBackupElectron() {
  if (!window.dashboardStore) return null;
  const raw = await window.dashboardStore.importBackup();
  return raw ? normalizeState(raw) : null;
}
