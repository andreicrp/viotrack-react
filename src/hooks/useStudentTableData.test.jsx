import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useStudentTableData } from './useStudentTableData';

const students = [
  { id: 1, fname: 'Ana', lname: 'Cruz', grade: 'Grade 10', section: 'Rizal', lrn: '001', parent_name: 'Maria Cruz' },
  { id: 2, fname: 'Ben', lname: 'Santos', grade: 'Grade 11', section: 'STEM A', lrn: '002', parent_name: 'Lina Santos' },
  { id: 3, fname: 'Cara', lname: 'Reyes', grade: 'Grade 9', section: 'Diamond', lrn: '003', parent_name: 'Mila Reyes' }
];

const baseOptions = {
  students,
  search: '',
  levelFilter: 'all',
  gradeFilter: 'all',
  strandFilter: 'all',
  sortField: 'grade',
  sortOrder: 'asc',
  currentPage: 1,
  entriesPerPage: 2
};

describe('useStudentTableData', () => {
  it('calculates metrics and returns sorted page rows', () => {
    const { result } = renderHook(() => useStudentTableData(baseOptions));
    expect(result.current.stats).toMatchObject({ total: 3, jhsCount: 2, shsCount: 1 });
    expect(result.current.filteredAndSortedStudents.map((student) => student.id)).toEqual([3, 1, 2]);
    expect(result.current.paginatedStudents.map((student) => student.id)).toEqual([3, 1]);
    expect(result.current.totalPages).toBe(2);
  });

  it('matches search against a guardian name', () => {
    const { result } = renderHook(() => useStudentTableData({ ...baseOptions, search: 'lina' }));
    expect(result.current.filteredAndSortedStudents.map((student) => student.id)).toEqual([2]);
  });
});
