import { beforeEach, describe, expect, it } from 'vitest';
import { dataService } from './dataService.js';

describe('dataService offline behavior', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    dataService.invalidateCache();
  });

  it('loads demo students and normalizes student_id to the LRN', async () => {
    const students = await dataService.getStudents(true);

    expect(students).toHaveLength(6);
    expect(students.every((student) => typeof student.student_id === 'string')).toBe(true);
    expect(students.every((student) => student.student_id === student.lrn)).toBe(true);
  });

  it('loads seeded violation categories in offline mode', async () => {
    const violations = await dataService.getViolations(true);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toHaveProperty('title');
    expect(['Minor', 'Serious', 'Major']).toContain(violations[0].type);
  });

  it('deduplicates concurrent student reads and returns the same cached result', async () => {
    const [first, second] = await Promise.all([
      dataService.getStudents(true),
      dataService.getStudents(true)
    ]);

    expect(first).toBe(second);
  });

  it('returns the documented page metadata for student queries', async () => {
    const result = await dataService.getStudentsPaginated({ page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.totalCount).toBe(6);
    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(1);
    expect(result.hasNextPage).toBe(true);
    expect(result.hasPrevPage).toBe(false);
  });

  it('returns the documented page metadata for incident queries', async () => {
    const result = await dataService.getRecordsPaginated({ page: 1, limit: 2 });

    expect(result.data).toHaveLength(2);
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.totalPages).toBeGreaterThan(0);
    expect(result.currentPage).toBe(1);
    expect(result.hasNextPage).toBe(result.totalPages > 1);
    expect(result.hasPrevPage).toBe(false);
  });

  it('updates and deletes students when addressed by LRN', async () => {
    const [student] = await dataService.getStudents(true);
    const result = await dataService.updateStudent(student.lrn, {
      fname: 'Updated Learner',
      track: 'JHS',
      strand: 'STEM'
    });

    expect(result.fname).toBe('Updated Learner');
    expect(result.track).toBe('JHS');
    expect(result.strand).toBe('STEM');

    const updatedStudents = await dataService.getStudents(true);
    expect(updatedStudents.find((item) => item.lrn === student.lrn)?.fname).toBe('Updated Learner');

    await dataService.deleteStudent(student.lrn);
    const remainingStudents = await dataService.getStudents(true);
    expect(remainingStudents.some((item) => item.lrn === student.lrn)).toBe(false);
  });

  it('supports track and strand on adds and assigns defaults on bulk import', async () => {
    const added = await dataService.addStudent({
      student_id: 'BASELINE-ADD-1',
      fname: 'New',
      lname: 'Student',
      track: 'SHS',
      strand: 'STEM'
    });

    expect(added.track).toBe('SHS');
    expect(added.strand).toBe('STEM');

    await dataService.bulkAddStudents([{
      student_id: 'BASELINE-BULK-1',
      fname: 'Bulk',
      lname: 'Student'
    }]);
    const students = await dataService.getStudents(true);
    const bulkAdded = students.find((item) => item.student_id === 'BASELINE-BULK-1');
    expect(bulkAdded.track).toBe('JHS');
    expect(bulkAdded.strand).toBe('JHS');
  });
});
