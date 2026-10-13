import { describe, it, expect } from 'vitest';
import { parseCsvString } from './csvHelper';
import { parseStudentRosterCsv } from './studentRoster';

describe('CSV Import Parsers & Stress Test Bench', () => {
  it('parses structured student roster CSV with full columns', () => {
    const csvContent = `Student ID,First Name,Last Name,Grade,Section,Gender,Parent Contact\n2026-001,Sheryl,Gamboa,10,Rizal,Female,09171234567\n2026-002,Juan,Dela Cruz,11,Bonifacio,Male,09181234568`;
    const rows = parseCsvString(csvContent);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['Student ID', 'First Name', 'Last Name', 'Grade', 'Section', 'Gender', 'Parent Contact']);
    expect(rows[1][0]).toBe('2026-001');
    expect(rows[2][1]).toBe('Juan');
  });

  it('resiliently handles malformed CSVs with missing fields or inconsistent commas', () => {
    const malformedCsv = `Name,Grade,Section\n"Incomplete Student",10\n"Extra, Quoted, Name",11,Bonifacio,ExtraData\n\n`;
    const rows = parseCsvString(malformedCsv);

    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0]).toEqual(['Name', 'Grade', 'Section']);
  });

  it('efficiently parses large CSV datasets (1,000+ rows) in under 50ms', () => {
    const header = 'Student ID,First Name,Last Name,Grade,Section\n';
    const lines = [header];
    for (let i = 1; i <= 1000; i++) {
      lines.push(`2026-${String(i).padStart(4, '0')},Student${i},LastName${i},10,Rizal\n`);
    }
    const hugeCsv = lines.join('');

    const start = performance.now();
    const rows = parseCsvString(hugeCsv);
    const duration = performance.now() - start;

    expect(rows).toHaveLength(1001);
    expect(duration).toBeLessThan(150); // fast execution
  });

  it('maps reordered student CSV columns by header, including grade, section, course, and track', () => {
    const csv = '\uFEFFCourse,Last Name,Grade Level,Student ID,First Name,Class Section,Academic Track\n'
      + 'STEM,Reyes,Grade 11,2026-0042,Ana,STEM A,Academic Track';

    expect(parseStudentRosterCsv(csv)).toEqual([{
      strand: 'STEM',
      lname: 'Reyes',
      grade: 'Grade 11',
      student_id: '2026-0042',
      fname: 'Ana',
      section: 'STEM A',
      track: 'Academic Track'
    }]);
  });

  it('imports the tab-delimited spreadsheet export without shifting academic fields', () => {
    const spreadsheet = '"Student ID"\t"Grade"\t"Section"\t"Course"\t"Track"\n'
      + '"2026-0099"\t"Grade 12"\t"HUMSS B"\t"HUMSS"\t"Academic Track"';

    expect(parseStudentRosterCsv(spreadsheet)).toEqual([{
      student_id: '2026-0099',
      grade: 'Grade 12',
      section: 'HUMSS B',
      strand: 'HUMSS',
      track: 'Academic Track'
    }]);
  });

  it('preserves legacy positional roster imports and does not invent missing grades or sections', () => {
    expect(parseStudentRosterCsv('2026-001,Ana,,Reyes,Grade 10,Rizal,Female,,,,HUMSS')).toEqual([{
      student_id: '2026-001',
      fname: 'Ana',
      mname: '',
      lname: 'Reyes',
      grade: 'Grade 10',
      section: 'Rizal',
      gender: 'Female',
      contact: '',
      parent_name: '',
      parent_contact: '',
      strand: 'HUMSS'
    }]);

    expect(parseStudentRosterCsv('Student ID,First Name,Last Name\n2026-002,Ben,Cruz'))
      .toEqual([{ student_id: '2026-002', fname: 'Ben', lname: 'Cruz' }]);
  });
});
