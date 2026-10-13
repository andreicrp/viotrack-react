import { describe, expect, it } from 'vitest';
import { normalizeBackupCollections } from './databaseBackup';

describe('database backup snapshots', () => {
  it('removes joined display objects from records and adviser assignments', () => {
    const data = normalizeBackupCollections({
      data: {
        students: [{ id: 7, student_id: 'S-7' }],
        records: [{
          id: 12,
          student_id: 7,
          violation_id: 3,
          students: { fname: 'Ari' },
          violations: { title: 'Late' },
          student: { fname: 'Ari' },
          violation: { title: 'Late' }
        }],
        advisers: [{
          id: 4,
          teacher_id: 8,
          grade_level: 'Grade 10',
          class_section: 'Rizal',
          teachers: { fname: 'Sam' },
          teacher: { fname: 'Sam' }
        }]
      }
    });

    expect(data.records).toEqual([{ id: 12, student_id: 7, violation_id: 3 }]);
    expect(data.advisers).toEqual([{
      id: 4,
      teacher_id: 8,
      grade_level: 'Grade 10',
      class_section: 'Rizal'
    }]);
  });

  it('keeps empty collections as valid data rather than treating them as missing', () => {
    expect(normalizeBackupCollections({
      data: {
        students: [],
        records: [],
        violations: []
      }
    })).toEqual({
      students: [],
      records: [],
      violations: []
    });
  });

  it('rejects malformed collection structures before a restore begins', () => {
    expect(() => normalizeBackupCollections({ data: { students: {}, records: [] } }))
      .toThrow('Collections must be arrays of records');
    expect(() => normalizeBackupCollections({ data: { teachers: [] } }))
      .toThrow('Backup must include both students and incident records');
  });
});
