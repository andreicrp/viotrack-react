import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useApprovalTableData } from './useApprovalTableData';

const records = [
  { id: 1, status: 'Under Approval', approval_status: 'Under Approval', date_reported: '2026-06-01T09:00:00Z', reported_by_type: 'teacher', reported_by_name: 'Juan Cruz', student: { id: 1, fname: 'Ana', lname: 'Cruz', student_id: '001', grade: 'Grade 10' }, violation: { id: 1, title: 'Vandalism', type: 'Major', description: 'Desk graffiti' }, remarks: 'Needs review' },
  { id: 2, status: 'Resolved', approval_status: 'Approved', approved_by: 'Admin', date_reported: '2026-05-01T09:00:00Z', reported_by_type: 'teacher', reported_by_name: 'Maria Reyes', student: { id: 2, fname: 'Ben', lname: 'Santos', student_id: '002', grade: 'Grade 11' }, violation: { id: 2, title: 'Late arrival', type: 'Minor' } }
];

const baseOptions = {
  records,
  search: '',
  approvalFilter: 'all',
  severityFilter: 'all',
  gradeFilter: 'all',
  dateFilter: 'all',
  sortField: 'date',
  sortOrder: 'desc',
  currentPage: 1,
  entriesPerPage: 10
};

describe('useApprovalTableData', () => {
  it('computes queue metrics and orders by date', () => {
    const { result } = renderHook(() => useApprovalTableData(baseOptions));
    expect(result.current.stats).toMatchObject({ pending: 1, approved: 1, highSeverity: 1, total: 2 });
    expect(result.current.filteredRecords.map((record) => record.id)).toEqual([1, 2]);
  });

  it('filters by status, severity, and student search', () => {
    const { result } = renderHook(() => useApprovalTableData({ ...baseOptions, approvalFilter: 'Under Approval', severityFilter: 'major', search: '001' }));
    expect(result.current.paginatedRecords.map((record) => record.id)).toEqual([1]);
  });
});
