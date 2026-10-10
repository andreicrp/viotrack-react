import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseState = vi.hoisted(() => ({
  configured: false,
  responses: {},
  calls: []
}));

vi.mock('../lib/supabase.js', () => ({
  isSupabaseConfigured: () => supabaseState.configured,
  supabase: {
    from(table) {
      let operation = 'select';
      let payload;
      let ordering;
      const filters = [];
      const copyPayload = (value) => Array.isArray(value)
        ? value.map((item) => ({ ...item }))
        : value && typeof value === 'object' ? { ...value } : value;
      const query = {
        select: () => query,
        order: (column, options) => { ordering = { column, options }; return query; },
        limit: () => query,
        insert: (values) => { operation = 'insert'; payload = values; return query; },
        update: (values) => { operation = 'update'; payload = values; return query; },
        delete: () => { operation = 'delete'; return query; },
        eq: (column, value) => { filters.push([column, value]); return query; },
        or: (expression) => { filters.push(['or', expression]); return query; },
        then: (resolve, reject) => {
          supabaseState.calls.push({ table, operation, payload: copyPayload(payload), ordering, filters: [...filters] });
          const configuredResponse = supabaseState.responses[table];
          const response = Array.isArray(configuredResponse)
            ? configuredResponse.shift() || { data: null, error: null }
            : configuredResponse || { data: null, error: null };
          return Promise.resolve(response).then(resolve, reject);
        }
      };
      return query;
    }
  }
}));

import { dataService } from './dataService.js';

describe('dataService data sources', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    ['students', 'records', 'teachers', 'advisers', 'admins', 'activity_logs', 'school_events']
      .forEach((key) => localStorage.setItem(`viotrack_${key}`, '[]'));
    sessionStorage.clear();
    supabaseState.configured = false;
    supabaseState.responses = {};
    supabaseState.calls = [];
    dataService.invalidateCache();
  });

  it('uses upstream student, incident, faculty, adviser, and admin seed rows when local data is absent', async () => {
    localStorage.clear();
    dataService.invalidateCache();

    const students = await dataService.getStudents(true);
    const records = await dataService.getRecords(true);
    const teachers = await dataService.getTeachers(true);
    const advisers = await dataService.getAdvisers(true);
    const admins = await dataService.getAdmins(true);

    expect(students).toHaveLength(6);
    expect(records).toHaveLength(6);
    expect(records[0].student).toMatchObject({ student_id: '109283746101', fname: 'Alexander' });
    expect(records[0].violation).toHaveProperty('title');
    expect(teachers).toHaveLength(5);
    expect(advisers).toHaveLength(4);
    expect(admins).toHaveLength(3);
    expect(await dataService.getActivityLogs(true)).toEqual([]);
    expect(await dataService.getSchoolEvents(true)).toEqual([]);
    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual(students);
    expect(localStorage.getItem('viotrack_records')).toBeNull();
  });

  it('retains the violation-category catalog as the offline fallback', async () => {
    const violations = await dataService.getViolations(true);

    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0]).toHaveProperty('title');
    expect(['Minor', 'Serious', 'Major']).toContain(violations[0].type);
  });

  it('deduplicates violation categories by numeric ID and normalized title', async () => {
    supabaseState.configured = true;
    supabaseState.responses.violations = {
      data: [
        { id: 1, title: 'Dress Code' },
        { id: 2, title: '  dress code ' },
        { id: '1', title: 'Another title' },
        null,
        { id: 3, title: 'Bullying' }
      ],
      error: null
    };

    const result = await dataService.getViolations(true);

    expect(result).toEqual([
      { id: 1, title: 'Dress Code' },
      { id: 3, title: 'Bullying' }
    ]);
  });

  it('returns an existing violation category instead of inserting a duplicate', async () => {
    supabaseState.configured = true;
    const existing = { id: 7, title: 'Uniform Policy', type: 'Minor' };
    supabaseState.responses.violations = { data: [existing], error: null };
    const addActivityLog = vi.spyOn(dataService, 'addActivityLog');

    const result = await dataService.addViolationType({ title: '  uniform policy  ', type: 'Major' });

    expect(result).toEqual(existing);
    expect(supabaseState.calls.filter((call) => call.table === 'violations' && call.operation === 'insert')).toEqual([]);
    expect(addActivityLog).not.toHaveBeenCalled();
  });

  it('removes stale local categories with the same normalized title when adding', async () => {
    supabaseState.configured = true;
    supabaseState.responses.violations = [
      { data: [{ id: 10, title: 'Other Category' }], error: null },
      { data: [{ id: 20, title: 'New Category', type: 'Minor' }], error: null }
    ];
    localStorage.setItem('viotrack_violations', JSON.stringify([
      { id: 1, title: 'New Category' },
      { id: 2, title: ' new category ' },
      { id: 3, title: 'Unrelated Category' }
    ]));

    const result = await dataService.addViolationType({ title: 'New Category' });
    const stored = JSON.parse(localStorage.getItem('viotrack_violations'));

    expect(result).toMatchObject({ id: 20, title: 'New Category' });
    expect(stored).toEqual([
      { id: 3, title: 'Unrelated Category' },
      { id: 20, title: 'New Category', type: 'Minor' }
    ]);
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

  it('preserves locally-created students until they appear in the live database', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = { data: [], error: null };
    localStorage.setItem('viotrack_students', JSON.stringify([
      { id: 99, student_id: 'LOCAL-ONLY', fname: 'Local', lname: 'Student' }
    ]));

    const students = await dataService.getStudents(true);

    expect(students).toHaveLength(1);
    expect(students[0]).toMatchObject({ id: 99, student_id: 'LOCAL-ONLY', lrn: 'LOCAL-ONLY' });
    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual(students);
  });

  it('merges matching local fields into remote students and keeps unsynced rows visible', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = {
      data: [{ id: 1, student_id: 'SYNCED-1', fname: 'Remote', lname: 'Student' }],
      error: null
    };
    localStorage.setItem('viotrack_students', JSON.stringify([
      { id: 1, student_id: 'SYNCED-1', fname: 'Stale', lname: 'Student', image: 'local-image.png' },
      { id: 2, student_id: 'PENDING-2', fname: 'Pending', lname: 'Sync' }
    ]));

    const students = await dataService.getStudents(true);

    expect(students).toHaveLength(2);
    expect(students[0]).toMatchObject({ student_id: 'PENDING-2', fname: 'Pending' });
    expect(students[1]).toMatchObject({ student_id: 'SYNCED-1', fname: 'Remote', image: 'local-image.png' });
    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual(students);
  });

  it('retries the student read without ordering when the lname column is unsupported', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = [
      { data: null, error: { message: 'column lname does not exist' } },
      { data: [{ id: 8, student_id: 'REMOTE-8', fname: 'Remote', lname: 'Learner' }], error: null }
    ];

    const students = await dataService.getStudents(true);
    const readCalls = supabaseState.calls.filter((call) => call.table === 'students');

    expect(students[0]).toMatchObject({ student_id: 'REMOTE-8', lrn: 'REMOTE-8' });
    expect(readCalls).toHaveLength(2);
    expect(readCalls[0].ordering).toEqual({ column: 'lname', options: { ascending: true } });
    expect(readCalls[1].ordering).toBeUndefined();
  });

  it('requires a student ID before attempting a registration', async () => {
    const addActivityLog = vi.spyOn(dataService, 'addActivityLog');

    await expect(dataService.addStudent({ fname: 'Missing', lname: 'ID' })).rejects.toThrow('Student ID is required.');

    expect(supabaseState.calls).toEqual([]);
    expect(addActivityLog).not.toHaveBeenCalled();
  });

  it('sanitizes student inserts and retries by removing unsupported schema columns', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = [
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'academicyear' column" } },
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'student_id' column" } },
      { data: [{ id: 21 }], error: null }
    ];

    const student = await dataService.addStudent({
      student_id: 'SCHEMA-21',
      fname: 'Schema',
      lname: 'Student',
      track: 'SHS',
      strand: 'STEM',
      academicyear: '2026-2027'
    });
    const inserts = supabaseState.calls.filter((call) => call.table === 'students' && call.operation === 'insert');

    expect(inserts).toHaveLength(3);
    expect(inserts[0].payload[0]).toMatchObject({ student_id: 'SCHEMA-21', academicyear: '2026-2027' });
    expect(inserts[0].payload[0]).not.toHaveProperty('lrn');
    expect(inserts[0].payload[0]).not.toHaveProperty('email');
    expect(inserts[0].payload[0]).not.toHaveProperty('track');
    expect(inserts[0].payload[0]).not.toHaveProperty('strand');
    expect(inserts[0].payload[0]).not.toHaveProperty('password');
    expect(inserts[1].payload[0]).not.toHaveProperty('track');
    expect(inserts[1].payload[0]).not.toHaveProperty('strand');
    expect(inserts[1].payload[0]).not.toHaveProperty('academicyear');
    expect(inserts[1].payload[0]).toHaveProperty('student_id', 'SCHEMA-21');
    expect(inserts[2].payload[0]).not.toHaveProperty('student_id');
    expect(student).toMatchObject({ student_id: 'SCHEMA-21', lrn: 'SCHEMA-21', fname: 'Schema' });
  });

  it('rejects duplicate student registration without writing a local duplicate', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' }
    };
    const addActivityLog = vi.spyOn(dataService, 'addActivityLog');

    await expect(dataService.addStudent({ student_id: 'DUP-1', fname: 'Duplicate', lname: 'Student' }))
      .rejects.toThrow('Student ID / LRN "DUP-1" is already registered in the system.');

    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual([]);
    expect(addActivityLog).not.toHaveBeenCalled();
  });

  it('sanitizes bulk student payloads and removes unsupported schema columns on retry', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = [
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'academicyear' column" } },
      { data: [{ id: 31 }], error: null }
    ];

    const result = await dataService.bulkAddStudents([{
      student_id: 'BULK-SCHEMA-31',
      fname: 'Bulk',
      lname: 'Learner',
      track: 'SHS',
      strand: 'HUMSS',
      academic_year: '2026-2027',
      email: 'private@example.test',
      password: 'private-password'
    }]);
    const inserts = supabaseState.calls.filter((call) => call.table === 'students' && call.operation === 'insert');

    expect(result.insertedCount).toBe(1);
    expect(inserts).toHaveLength(2);
    expect(inserts[0].payload[0]).toHaveProperty('academicyear', '2026-2027');
    expect(inserts[0].payload[0]).not.toHaveProperty('lrn');
    expect(inserts[0].payload[0]).not.toHaveProperty('email');
    expect(inserts[0].payload[0]).not.toHaveProperty('track');
    expect(inserts[0].payload[0]).not.toHaveProperty('strand');
    expect(inserts[0].payload[0]).not.toHaveProperty('password');
    expect(inserts[1].payload[0]).not.toHaveProperty('academicyear');
  });

  it('sanitizes student updates and retries missing schema columns by student_id', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = [
      { data: null, error: { code: 'PGRST204', message: "Could not find the 'grade' column" } },
      { data: [{ id: 41, student_id: 'LRN-41', fname: 'Server Name' }], error: null }
    ];
    localStorage.setItem('viotrack_students', JSON.stringify([
      { id: 41, student_id: 'LRN-41', lrn: 'LRN-41', fname: 'Before', lname: 'Update' }
    ]));

    const result = await dataService.updateStudent('LRN-41', {
      fname: 'After',
      grade: 'Grade 10',
      track: 'SHS',
      email: 'private@example.test',
      password: 'private-password'
    });
    const updates = supabaseState.calls.filter((call) => call.table === 'students' && call.operation === 'update');

    expect(updates).toHaveLength(2);
    expect(updates.map((call) => call.filters[0])).toEqual([
      ['student_id', 'LRN-41'],
      ['student_id', 'LRN-41']
    ]);
    expect(updates[0].payload).toMatchObject({ fname: 'After', grade: 'Grade 10' });
    expect(updates[0].payload).not.toHaveProperty('track');
    expect(updates[0].payload).not.toHaveProperty('email');
    expect(updates[0].payload).not.toHaveProperty('password');
    expect(updates[0].payload).not.toHaveProperty('lrn');
    expect(updates[1].payload).not.toHaveProperty('grade');
    expect(result).toMatchObject({ student_id: 'LRN-41', lrn: 'LRN-41', fname: 'Server Name', track: 'SHS' });
  });

  it('rejects duplicate student-ID updates without mutating the local profile', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = {
      data: null,
      error: { code: '23505', message: 'duplicate key violates unique constraint' }
    };
    const initial = [{ id: 42, student_id: 'LRN-42', lrn: 'LRN-42', fname: 'Before', lname: 'Update' }];
    localStorage.setItem('viotrack_students', JSON.stringify(initial));
    const addActivityLog = vi.spyOn(dataService, 'addActivityLog');

    await expect(dataService.updateStudent('LRN-42', { student_id: 'ALREADY-USED' }))
      .rejects.toThrow('Student ID / LRN "ALREADY-USED" is already registered to another student.');

    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual(initial);
    expect(addActivityLog).not.toHaveBeenCalled();
  });

  it('retries non-numeric student deletion by LRN when student_id deletion errors', async () => {
    supabaseState.configured = true;
    supabaseState.responses.students = [
      { data: null, error: { message: 'column student_id does not exist' } },
      { data: null, error: null }
    ];
    localStorage.setItem('viotrack_students', JSON.stringify([
      { id: 51, student_id: 'LRN-51', lrn: 'LRN-51', fname: 'Delete', lname: 'Me' }
    ]));

    expect(await dataService.deleteStudent('LRN-51')).toBe(true);
    const deletes = supabaseState.calls.filter((call) => call.table === 'students' && call.operation === 'delete');

    expect(deletes).toHaveLength(2);
    expect(deletes[0].filters).toEqual([['student_id', 'LRN-51']]);
    expect(deletes[1].filters).toEqual([['lrn', 'LRN-51']]);
    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual([]);
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

    expect(await dataService.getTeachers(true)).toEqual([{ id: 2, email: 'db-teacher@example.test', password: 'Viotrack@2026!' }]);
    expect(await dataService.getAdmins(true)).toEqual([{ id: 3, email: 'db-admin@example.test', password: 'Viotrack@2026!' }]);
  });

  it('merges local activity logs while treating successful empty calendar reads as authoritative', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      activity_logs: { data: [], error: null },
      calendar_events: { data: [], error: null }
    };
    localStorage.setItem('viotrack_activity_logs', JSON.stringify([{ id: 10, action: 'Stale' }]));
    localStorage.setItem('viotrack_school_events', JSON.stringify([{ id: 11, title: 'Stale' }]));

    expect(await dataService.getActivityLogs(true)).toMatchObject([{ id: 10, action: 'Stale' }]);
    expect(await dataService.getSchoolEvents(true)).toEqual([]);
  });

  it('deduplicates and sorts merged remote and local activity logs', async () => {
    supabaseState.configured = true;
    supabaseState.responses.activity_logs = {
      data: [
        { id: 3, action: 'Remote copy', created_at: '2026-01-03T00:00:00Z' },
        { id: 2, action: 'Older remote', created_at: '2026-01-02T00:00:00Z' }
      ],
      error: null
    };
    localStorage.setItem('viotrack_activity_logs', JSON.stringify([
      { id: 3, action: 'Stale local copy', created_at: '2026-01-01T00:00:00Z' },
      { id: 1, action: 'Local-only', created_at: '2026-01-04T00:00:00Z' }
    ]));

    const logs = await dataService.getActivityLogs(true);

    expect(logs.map((entry) => entry.id)).toEqual([1, 3, 2]);
    expect(logs.find((entry) => entry.id === 3).action).toBe('Remote copy');
  });

  it('falls back to school_events when the calendar_events table is unavailable', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      calendar_events: { data: null, error: { code: 'PGRST205', message: 'table not found' } },
      school_events: { data: [{ id: 21, title: 'Campus Assembly' }], error: null }
    };

    const events = await dataService.getSchoolEvents(true);
    const eventReads = supabaseState.calls.filter((call) => ['calendar_events', 'school_events'].includes(call.table));

    expect(events).toEqual([{ id: 21, title: 'Campus Assembly' }]);
    expect(eventReads.map((call) => call.table)).toEqual(['calendar_events', 'school_events']);
  });

  it('uses local incidents as the baseline when the live database has no record rows', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      students: { data: [], error: null },
      records: { data: [], error: null }
    };
    localStorage.setItem('viotrack_records', JSON.stringify([
      { id: 999, student_id: 1, violation_id: 1, remarks: 'Local-only cache row' }
    ]));

    const result = await dataService.getRecords(true);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 999, remarks: 'Local-only cache row' });
    expect(result[0].student).toMatchObject({ student_id: '109283746101', fname: 'Alexander' });
    expect(result[0].violation).toHaveProperty('title');
  });

  it('deduplicates live incident records by numeric ID and keeps the first record', async () => {
    supabaseState.configured = true;
    supabaseState.responses = {
      students: { data: [], error: null },
      violations: { data: [{ id: 2, title: 'Minor Violation' }], error: null },
      records: {
        data: [
          { id: 12, student_id: 1, violation_id: 2, remarks: 'newest copy' },
          { id: '12', student_id: 1, violation_id: 2, remarks: 'duplicate copy' },
          { id: 11, student_id: 1, violation_id: 2, remarks: 'other incident' }
        ],
        error: null
      }
    };

    const result = await dataService.getRecords(true);

    expect(result.map((record) => record.id)).toEqual([12, 11]);
    expect(result[0].remarks).toBe('newest copy');
  });

  it('preserves local student and incident rows when loading the service module', async () => {
    const legacyRecords = [
      { id: 101, reported_by_name: 'Alexander Mendoza' }
    ];
    const seededStudents = [
      { student_id: '109283746101' }
    ];
    localStorage.setItem('viotrack_records', JSON.stringify(legacyRecords));
    localStorage.setItem('viotrack_students', JSON.stringify(seededStudents));

    vi.resetModules();
    await import('./dataService.js');

    expect(JSON.parse(localStorage.getItem('viotrack_records'))).toEqual(legacyRecords);
    expect(JSON.parse(localStorage.getItem('viotrack_students'))).toEqual(seededStudents);
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

  it('does not create a scheduled backup when automatic backups are disabled', async () => {
    localStorage.setItem('viotrack_backup_schedule', JSON.stringify({
      auto_backup_enabled: false,
      frequency: 'daily',
      time: '00:00',
      last_run: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    }));
    const createBackup = vi.spyOn(dataService, 'createDatabaseBackup').mockResolvedValue({});

    expect(await dataService.checkAndRunScheduledBackup()).toBe(false);
    expect(createBackup).not.toHaveBeenCalled();
  });

  it('creates and timestamps a due daily backup', async () => {
    const previousRun = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('viotrack_backup_schedule', JSON.stringify({
      auto_backup_enabled: true,
      frequency: 'daily',
      time: '00:00',
      last_run: previousRun
    }));
    const createBackup = vi.spyOn(dataService, 'createDatabaseBackup').mockResolvedValue({});

    expect(await dataService.checkAndRunScheduledBackup()).toBe(true);
    expect(createBackup).toHaveBeenCalledWith('scheduled_daily');
    const updatedSettings = JSON.parse(localStorage.getItem('viotrack_backup_schedule'));
    expect(Date.parse(updatedSettings.last_run)).toBeGreaterThan(Date.parse(previousRun));
  });

  it('does not create a weekly backup before seven days have elapsed', async () => {
    localStorage.setItem('viotrack_backup_schedule', JSON.stringify({
      auto_backup_enabled: true,
      frequency: 'weekly',
      time: '00:00',
      last_run: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    }));
    const createBackup = vi.spyOn(dataService, 'createDatabaseBackup').mockResolvedValue({});

    expect(await dataService.checkAndRunScheduledBackup()).toBe(false);
    expect(createBackup).not.toHaveBeenCalled();
  });
});
