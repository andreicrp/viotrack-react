import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useViolationTableData } from './useViolationTableData';

const records = [
  { id: 1, status: 'Pending', date_reported: '2026-02-10T10:00:00.000Z', student: { fname: 'Ana', lname: 'Cruz', grade: 'Grade 10', section: 'Rizal', lrn: '001' }, violation: { title: 'Late arrival', type: 'Minor' } },
  { id: 2, status: 'Resolved', date_reported: '2025-11-03T10:00:00.000Z', student: { fname: 'Ben', lname: 'Santos', grade: 'Grade 11', section: 'STEM A', lrn: '002' }, violation: { title: 'Vandalism', type: 'Major' } }
];

const baseOptions = {
  records,
  search: '',
  statusFilter: 'all',
  severityFilter: 'all',
  gradeFilter: 'all',
  yearFilter: 'all',
  sortField: 'date',
  sortOrder: 'desc',
  currentPage: 1,
  entriesPerPage: 10
};

describe('useViolationTableData', () => {
  it('computes metrics, sorts newest first, and filters by grade', () => {
    const { result } = renderHook(() => useViolationTableData(baseOptions));
    expect(result.current.stats).toMatchObject({ total: 2, pending: 1, resolved: 1, majorCount: 1 });
    expect(result.current.filteredAndSortedRecords.map((record) => record.id)).toEqual([1, 2]);

    const filtered = renderHook(() => useViolationTableData({ ...baseOptions, gradeFilter: 'grade 11' }));
    expect(filtered.result.current.paginatedRecords.map((record) => record.id)).toEqual([2]);
  });

  it('filters using the reported year', () => {
    const { result } = renderHook(() => useViolationTableData({ ...baseOptions, yearFilter: '2025' }));
    expect(result.current.filteredAndSortedRecords.map((record) => record.id)).toEqual([2]);
  });
});
