import type { ScheduleItem } from '../types/dashboard';

const DAY_MS = 24 * 60 * 60 * 1000;
export const SCHEDULE_SOON_DAYS = 3;

function dateKey(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseDateParts(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { year, month, day };
}

export function isDateValue(value: string) {
  return parseDateParts(value) !== null;
}

function parseDateKey(value: string) {
  const parts = parseDateParts(value);
  if (!parts) return Number.POSITIVE_INFINITY;
  return Date.UTC(parts.year, parts.month - 1, parts.day);
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
  if (diff <= SCHEDULE_SOON_DAYS) return 'soon';
  return 'normal';
}

export function sortScheduleItems(items: ScheduleItem[]) {
  return [...items].sort((a, b) =>
    a.date.localeCompare(b.date)
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id)
  );
}
