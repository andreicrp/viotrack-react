const BACKUP_COLLECTIONS = [
  'students',
  'violations',
  'records',
  'teachers',
  'advisers',
  'admins',
  'activity_logs',
  'school_events',
  'meetings',
  'sms_logs',
  'student_locations'
];

const withoutKeys = (row, excludedKeys) => Object.fromEntries(
  Object.entries(row).filter(([key]) => !excludedKeys.includes(key))
);

export const normalizeBackupCollections = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || !snapshot.data || typeof snapshot.data !== 'object') {
    throw new Error('Invalid snapshot structure: Missing data payload.');
  }

  const entries = Object.entries(snapshot.data)
    .filter(([key]) => BACKUP_COLLECTIONS.includes(key));
  const collections = new Set(entries.map(([key]) => key));
  if (!collections.has('students') || !collections.has('records')) {
    throw new Error('Backup must include both students and incident records.');
  }
  if (entries.some(([, rows]) => !Array.isArray(rows) || rows.some(
    row => !row || typeof row !== 'object' || Array.isArray(row)
  ))) {
    throw new Error('Invalid snapshot structure: Collections must be arrays of records.');
  }

  const data = Object.fromEntries(entries);
  if (data.records) {
    data.records = data.records.map(record => (
      withoutKeys(record, ['students', 'violations', 'student', 'violation'])
    ));
  }
  if (data.advisers) {
    data.advisers = data.advisers.map(adviser => withoutKeys(adviser, ['teachers', 'teacher']));
  }
  return data;
};
