import { describe, expect, it } from 'vitest';
import { daysUntil, isDateValue, scheduleUrgency, sortScheduleItems } from './schedule';
import type { ScheduleItem } from '../types/dashboard';

const today = new Date(2026, 9, 8, 12, 0, 0);

describe('schedule helpers', () => {
  it('validates real YYYY-MM-DD dates', () => {
    expect(isDateValue('2026-10-08')).toBe(true);
    expect(isDateValue('2024-02-29')).toBe(true);
    expect(isDateValue('2026-02-29')).toBe(false);
    expect(isDateValue('2026-99-99')).toBe(false);
    expect(isDateValue('2026-1-1')).toBe(false);
  });

  it('classifies overdue and near dates at exact boundaries', () => {
    expect(daysUntil('2026-10-07', today)).toBe(-1);
    expect(daysUntil('2026-10-08', today)).toBe(0);
    expect(daysUntil('2026-10-11', today)).toBe(3);
    expect(daysUntil('2026-10-12', today)).toBe(4);

    expect(scheduleUrgency('2026-10-07', false, today)).toBe('overdue');
    expect(scheduleUrgency('2026-10-08', false, today)).toBe('soon');
    expect(scheduleUrgency('2026-10-11', false, today)).toBe('soon');
    expect(scheduleUrgency('2026-10-12', false, today)).toBe('normal');
    expect(scheduleUrgency('2026-10-07', true, today)).toBe('normal');
  });

  it('sorts schedule items by date then creation time', () => {
    const items: ScheduleItem[] = [
      { id:'b', date:'2026-10-12', text:'b', done:false, createdAt:'2026-10-01T00:00:02Z' },
      { id:'a2', date:'2026-10-10', text:'a2', done:false, createdAt:'2026-10-01T00:00:02Z' },
      { id:'a1', date:'2026-10-10', text:'a1', done:false, createdAt:'2026-10-01T00:00:01Z' }
    ];
    expect(sortScheduleItems(items).map(item => item.id)).toEqual(['a1','a2','b']);
  });
});
