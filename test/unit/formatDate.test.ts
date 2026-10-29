import { describe, it, expect } from 'vitest';
import { formatDateTime } from '@/lib/formatDate';

describe('formatDateTime', () => {
  it('formats a date object correctly', () => {
    // 2026-10-28 15:30:45 UTC
    const date = new Date(Date.UTC(2026, 9, 28, 15, 30, 45));
    const result = formatDateTime(date);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result).toContain('2026-10-');
  });

  it('formats ISO date strings correctly', () => {
    const isoString = '2026-05-12T08:15:30.000Z';
    const result = formatDateTime(isoString);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(result).toContain('2026-05-');
  });

  it('formats numeric timestamp correctly', () => {
    const timestamp = 1779958800000;
    const result = formatDateTime(timestamp);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
