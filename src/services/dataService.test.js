import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseState = vi.hoisted(() => ({
  configured: false,
  responses: {}
}));

vi.mock('../lib/supabase.js', () => ({
  isSupabaseConfigured: () => supabaseState.configured,
  supabase: {
    from(table) {
      const response = supabaseState.responses[table] || { data: null, error: null };
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        then: (resolve, reject) => Promise.resolve(response).then(resolve, reject)
      };
      return query;
    }
  }
}));

import { dataService } from './dataService.js';

describe('dataService data sources', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    supabaseState.configured = false;
    supabaseState.responses = {};
    dataService.invalidateCache();
  });

  it('does not synthesize demo students, records, or other offline seed rows', async () => {
    expect(await dataService.getStudents(true)).toEqual([]);
    expect(await dataService.getRecords(true)).toEqual([]);
    expect(await dataService.getTeachers(true)).toEqual([]);
    expect(await dataService.getAdvisers(true)).toEqual([]);
    expect(await dataService.getAdmins(true)).toEqual([]);
    expect(await dataService.getActivityLogs(true)).toEqual([]);
    expect(await dataService.getSchoolEvents(true)).toEqual([]);
    expect(localStorage.getItem('viotrack_students')).toBeNull();
    expect(localStorage.getItem('viotrack_records')).toBeNull();
  });

  it('retains the violation-category catalog as the offline fallback', async () => {
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

  it('returns documented page metadata for an empty student query', async () => {
    const result = await dataService.getStudentsPaginated({ page: 1, limit: 2 });

    expect(result.data).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPrevPage).toBe(false);
  });

  it('returns documented page metadata for an empty incident query', async () => {
    const result = await dataService.getRecordsPaginated({ page: 1, limit: 2 });

    expect(result.data).toEqual([]);
    expect(result.totalCount).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.currentPage).toBe(1);
    expect(result.hasNextPage).toBe(false);
    expect(result.hasPrevPage).toBe(false);
  });

  it('treats a successful empty live student query as authoritative over local rows', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = { data: [], error: null };
    localStorage.setItem('viotrack_students', JSON.stringify([
      { id: 99, student_id: 'LOCAL-ONLY', fname: 'Old', lname: 'Cache' }
    ]));

    expect(await dataService.getStudents(true)).toEqual([]);
  });

  it('uses live teacher and admin rows without merging local-only rows', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      teachers: { data: [{ id: 2, email: 'db-teacher@example.test' }], error: null },
      admins: { data: [{ id: 3, email: 'db-admin@example.test' }], error: null }
    };
    localStorage.setItem('viotrack_teachers', JSON.stringify([
      { id: 1, email: 'local-teacher@example.test' }
    ]));
    localStorage.setItem('viotrack_admins', JSON.stringify([
      { id: 4, email: 'local-admin@example.test' }
    ]));

    expect(await dataService.getTeachers(true)).toEqual([{ id: 2, email: 'db-teacher@example.test' }]);
    expect(await dataService.getAdmins(true)).toEqual([{ id: 3, email: 'db-admin@example.test' }]);
  });

  it('treats successful empty live activity-log and school-event reads as authoritative', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      activity_logs: { data: [], error: null },
      school_events: { data: [], error: null }
    };
    localStorage.setItem('viotrack_activity_logs', JSON.stringify([{ id: 10, action: 'Stale' }]));
    localStorage.setItem('viotrack_school_events', JSON.stringify([{ id: 11, title: 'Stale' }]));

    expect(await dataService.getActivityLogs(true)).toEqual([]);
    expect(await dataService.getSchoolEvents(true)).toEqual([]);
  });

  it('does not merge local incidents into a successful empty live records result', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      students: { data: [], error: null },
      records: { data: [], error: null }
    };
    localStorage.setItem('viotrack_records', JSON.stringify([
      { id: 999, student_id: 1, violation_id: 1, remarks: 'Local-only cache row' }
    ]));

    expect(await dataService.getRecords(true)).toEqual([]);
  });

  it('purges the known legacy demo student and incident caches at module startup', async () => {
    localStorage.setItem('viotrack_records', JSON.stringify([
      { id: 101, reported_by_name: 'Alexander Mendoza' }
    ]));
    localStorage.setItem('viotrack_students', JSON.stringify([
      { student_id: '109283746101' }
    ]));

    vi.resetModules();
    await import('./dataService.js');

    expect(localStorage.getItem('viotrack_records')).toBeNull();
    expect(localStorage.getItem('viotrack_students')).toBeNull();
  });

  it('updates and deletes students when addressed by LRN', async () => {
    const student = await dataService.addStudent({
      student_id: 'BASELINE-LRN-1',
      fname: 'First',
      lname: 'Learner'
    });
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
