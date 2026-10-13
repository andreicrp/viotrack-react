import { describe, expect, it } from 'vitest';
import {
  buildDashboardTrendData,
  filterDashboardRecords,
  getDashboardDateRange
} from './dashboardDateRange';

const recordAt = (date, type = 'Minor', id = date) => ({
  id,
  date_reported: new Date(date).toISOString(),
  violation: { type }
});

describe('dashboard date filters and trend charts', () => {
  const now = new Date(2026, 9, 13, 12, 30);
  const calendarMonth = new Date(2026, 9, 1);

  it('uses the same seven calendar days for weekly metrics and graph points', () => {
    const records = [
      recordAt(new Date(2026, 9, 7, 9), 'Minor', 1),
      recordAt(new Date(2026, 9, 13, 11), 'Major', 2),
      recordAt(new Date(2026, 9, 6, 23), 'Serious', 3)
    ];
    const filtered = filterDashboardRecords(
      records,
      getDashboardDateRange('week', '', '', calendarMonth, now)
    );
    const trend = buildDashboardTrendData(filtered, 'week', '', '', calendarMonth, now);

    expect(filtered.map(record => record.id)).toEqual([1, 2]);
    expect(trend).toHaveLength(7);
    expect(trend.reduce((sum, point) => sum + point.total, 0)).toBe(filtered.length);
    expect(trend.reduce((sum, point) => sum + point.major, 0)).toBe(1);
  });

  it('keeps monthly chart data inside the selected calendar month', () => {
    const records = [
      recordAt(new Date(2026, 9, 1, 0), 'Serious', 1),
      recordAt(new Date(2026, 9, 31, 23, 59), 'Major', 2),
      recordAt(new Date(2026, 8, 30, 12), 'Minor', 3)
    ];
    const filtered = filterDashboardRecords(
      records,
      getDashboardDateRange('month', '', '', calendarMonth, now)
    );
    const trend = buildDashboardTrendData(filtered, 'month', '', '', calendarMonth, now);

    expect(trend).toHaveLength(31);
    expect(trend.reduce((sum, point) => sum + point.total, 0)).toBe(2);
    expect(trend.reduce((sum, point) => sum + point.serious + point.major, 0)).toBe(2);
  });

  it('includes both endpoints of a custom range and assigns every incident to a chart bucket', () => {
    const records = [
      recordAt(new Date(2026, 8, 1, 0), 'Minor', 1),
      recordAt(new Date(2026, 8, 12, 12), 'Serious', 2),
      recordAt(new Date(2026, 8, 30, 23, 59), 'Major', 3),
      recordAt(new Date(2026, 7, 31, 23, 59), 'Major', 4)
    ];
    const filtered = filterDashboardRecords(
      records,
      getDashboardDateRange('custom', '2026-09-01', '2026-09-30', calendarMonth, now)
    );
    const trend = buildDashboardTrendData(
      filtered,
      'custom',
      '2026-09-01',
      '2026-09-30',
      calendarMonth,
      now
    );

    expect(filtered.map(record => record.id)).toEqual([1, 2, 3]);
    expect(trend).toHaveLength(5);
    expect(trend.reduce((sum, point) => sum + point.total, 0)).toBe(filtered.length);
    expect(trend.reduce((sum, point) => sum + point.major, 0)).toBe(1);
  });
});
