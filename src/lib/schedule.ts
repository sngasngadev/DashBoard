import type { ScheduleItem } from '../types/dashboard';

const DAY_MS = 24 * 60 * 60 * 1000;

function dateKey(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return Number.POSITIVE_INFINITY;
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function daysUntil(value: string, today = new Date()) {
  const target = parseDateKey(value);
  if (!Number.isFinite(target)) return Number.POSITIVE_INFINITY;
  return Math.round((target - dateKey(today)) / DAY_MS);
}

export function scheduleUrgency(value: string, done: boolean, today = new Date()): 'normal' | 'soon' | 'overdue' {
  if (done) return 'normal';
  const diff = daysUntil(value, today);
  if (diff < 0) return 'overdue';
  if (diff <= 3) return 'soon';
  return 'normal';
}

export function sortScheduleItems(items: ScheduleItem[]) {
  return [...items].sort((a, b) =>
    a.date.localeCompare(b.date)
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id)
  );
}
