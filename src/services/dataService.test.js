import { beforeEach, describe, expect, it } from 'vitest';
import { dataService } from './dataService';

describe('dataService offline fixtures', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    dataService.invalidateCache();
  });

  it('loads the demo student fixture and normalizes student identifiers', async () => {
    const students = await dataService.getStudents(true);

    expect(students).toHaveLength(6);
    expect(students.every((student) => typeof student.student_id === 'string')).toBe(true);
    expect(students.every((student) => student.student_id === student.lrn)).toBe(true);
  });

  it('loads seeded violation types in offline mode', async () => {
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
});
