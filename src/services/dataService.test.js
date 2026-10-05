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
});
