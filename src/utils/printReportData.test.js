import { describe, expect, it } from 'vitest';
import {
  buildPrintGradeBreakdown,
  buildPrintMetrics,
  buildPrintTrendPoints,
  filterPrintRecords
} from './printReportData';

const record = (overrides = {}) => ({
  approval_status: 'Approved',
  status: 'Pending',
  date_reported: '2026-05-20T12:00:00',
  student_id: 'student-1',
  student: { id: 'student-1', grade: 'Grade 7' },
  violation: { type: 'Minor', title: 'Tardiness' },
  ...overrides
});

const filterOptions = (overrides = {}) => ({
  periodPreset: 'all',
  customStartDate: '',
  customEndDate: '',
  selectedSeverity: 'all',
  selectedStatus: 'all',
  selectedGrade: 'all',
  ...overrides
});

describe('print report data', () => {
  it('includes approved records only and excludes invalid dates for bounded ranges', () => {
    const records = [
      record(),
      record({ approval_status: 'Under Approval' }),
      record({ status: 'Rejected' }),
      record({ date_reported: 'not-a-date' })
    ];

    expect(filterPrintRecords(records, filterOptions())).toHaveLength(2);
    expect(filterPrintRecords(records, filterOptions({
      periodPreset: 'custom',
      customStartDate: '2026-05-20',
      customEndDate: '2026-05-20'
    }))).toHaveLength(1);
  });

  it('includes the full custom end date and rejects reversed or invalid date ranges', () => {
    const records = [
      record({ date_reported: '2026-05-21T23:59:59.999' }),
      record({ date_reported: '2026-05-22T00:00:00' })
    ];
    const options = filterOptions({
      periodPreset: 'custom',
      customStartDate: '2026-05-21',
      customEndDate: '2026-05-21'
    });

    expect(filterPrintRecords(records, options)).toHaveLength(1);
    expect(filterPrintRecords(records, { ...options, customStartDate: '2026-05-22' })).toEqual([]);
    expect(filterPrintRecords(records, { ...options, customEndDate: '2026-02-30' })).toEqual([]);
  });

  it('matches grade and severity filters without substring or casing errors', () => {
    const records = [
      record({ student: { id: 'a', grade: 'Grade 7' }, violation: { type: 'Major Offense' } }),
      record({ student: { id: 'b', grade: 'Grade 17' }, violation: { type: 'Major' } })
    ];

    expect(filterPrintRecords(records, filterOptions({
      selectedGrade: '7',
      selectedSeverity: 'major'
    }))).toHaveLength(1);
  });

  it('calculates report metrics and exact grade totals from filtered records', () => {
    const records = [
      record({ status: 'Resolved', student: { id: 'a', grade: 'Grade 7' } }),
      record({ student_id: 'b', student: { id: 'b', grade: 'Grade 17' }, violation: { type: 'Serious' } })
    ];
    const metrics = buildPrintMetrics(records);
    const grades = buildPrintGradeBreakdown(records);

    expect(metrics).toMatchObject({
      total: 2,
      minor: 1,
      serious: 1,
      resolved: 1,
      pending: 1,
      resolvedRate: 50,
      uniqueStudents: 2
    });
    expect(grades.find((grade) => grade.label === 'Grade 7')).toMatchObject({
      count: 1,
      resolved: 1,
      pending: 0
    });
    expect(grades.reduce((total, grade) => total + grade.count, 0)).toBe(1);
  });

  it('assigns weekly trend buckets by actual record dates and reconciles totals', () => {
    const now = new Date(2026, 4, 21, 15, 0, 0);
    const records = [
      record({ date_reported: new Date(2026, 4, 15, 9).toISOString(), violation: { type: 'Minor' } }),
      record({ date_reported: new Date(2026, 4, 21, 12).toISOString(), violation: { type: 'Major' } })
    ];

    const points = buildPrintTrendPoints(records, 'week', '', '', now);

    expect(points).toHaveLength(7);
    expect(points.reduce((total, point) => total + point.total, 0)).toBe(records.length);
    expect(points.reduce((total, point) => total + point.minor, 0)).toBe(1);
    expect(points.reduce((total, point) => total + point.major, 0)).toBe(1);
  });

  it('places undated all-time records in an explicit trend bucket', () => {
    const points = buildPrintTrendPoints([record({ date_reported: null, created_at: null })], 'all', '', '');

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ label: 'Undated', total: 1, minor: 1 });
  });
});
