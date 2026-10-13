import { parseCsvString } from './csvHelper';

const HEADER_ALIASES = {
  student_id: ['student id', 'student_id', 'student number', 'lrn', 'id'],
  fname: ['first name', 'first_name', 'given name', 'fname', 'name'],
  mname: ['middle name', 'middle_name', 'mname'],
  lname: ['last name', 'last_name', 'surname', 'family name', 'lname'],
  grade: ['grade', 'grade level', 'grade_level', 'year level', 'year_level', 'level'],
  section: ['section', 'class section', 'class_section', 'class'],
  strand: ['course', 'courses', 'strand', 'program', 'specialization'],
  track: ['track', 'academic track'],
  gender: ['gender', 'sex'],
  contact: ['contact', 'contact number', 'phone', 'phone number', 'mobile'],
  parent_name: ['parent name', 'guardian name', 'parent', 'guardian'],
  parent_contact: ['parent contact', 'guardian contact', 'parent phone', 'guardian phone'],
  academicyear: ['academic year', 'academicyear', 'school year', 'schoolyear'],
  address: ['address', 'home address']
};

const normalizeHeader = (value) => String(value || '')
  .replace(/^\uFEFF/, '')
  .trim()
  .toLowerCase()
  .replace(/[_-]+/g, ' ')
  .replace(/[^\p{L}\p{N} ]/gu, '')
  .replace(/\s+/g, ' ');

const aliasToField = new Map(
  Object.entries(HEADER_ALIASES).flatMap(([field, aliases]) =>
    aliases.map(alias => [normalizeHeader(alias), field])
  )
);

const LEGACY_COLUMN_ORDER = [
  'student_id', 'fname', 'mname', 'lname', 'grade', 'section',
  'gender', 'contact', 'parent_name', 'parent_contact', 'strand', 'track'
];

export const parseStudentRosterCsv = (text) => {
  const rows = parseCsvString(String(text || '').replace(/^\uFEFF/, ''));
  if (rows.length === 0) return [];

  const firstRowFields = rows[0].map(value => aliasToField.get(normalizeHeader(value)));
  const recognizedHeaders = firstRowFields.filter(Boolean);
  const hasHeader = recognizedHeaders.length >= 2;
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const fieldIndexes = hasHeader
    ? firstRowFields.reduce((indexes, field, index) => {
      if (field && indexes[field] === undefined) indexes[field] = index;
      return indexes;
    }, {})
    : Object.fromEntries(LEGACY_COLUMN_ORDER.map((field, index) => [field, index]));

  return dataRows
    .filter(row => row.some(value => value.trim()))
    .map(row => {
      const student = {};
      for (const [field, index] of Object.entries(fieldIndexes)) {
        if (index !== undefined && row[index] !== undefined) {
          student[field] = row[index].trim();
        }
      }
      return student;
    });
};
