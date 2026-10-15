import { supabase, isSupabaseConfigured } from '../lib/supabase';
import bcrypt from 'bcryptjs';
import { smsService } from './smsService';
import { broadcastRecordChange, startMutation, endMutation } from '../utils/dataIntegrity';
import { normalizeBackupCollections } from '../utils/databaseBackup';

// Clean live data fallbacks
import INITIAL_VIOLATIONS from '../data/violations.json';

const INITIAL_STUDENTS = [
  { id: 1, student_id: '109283746101', fname: 'Alexander', mname: 'Cruz', lname: 'Mendoza', grade: 'Grade 10', section: 'Rizal', academicyear: '2025-2026', gender: 'Male', contact: '09151112233', parent_name: 'Carlos Mendoza', parent_contact: '09151112234', address: '124 Rizal St, Sampaloc, Manila', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 2, student_id: '109283746102', fname: 'Sophia', mname: 'Grace', lname: 'Villanueva', grade: 'Grade 10', section: 'Rizal', academicyear: '2025-2026', gender: 'Female', contact: '09152223344', parent_name: 'Lorena Villanueva', parent_contact: '09152223345', address: '45 Mabini Ave, Quezon City', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 3, student_id: '109283746103', fname: 'Gabriel', mname: 'Luis', lname: 'Torres', grade: 'Grade 10', section: 'Bonifacio', academicyear: '2025-2026', gender: 'Male', contact: '09153334455', parent_name: 'Ramon Torres', parent_contact: '09153334456', address: '88 Aurora Blvd, San Juan', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 4, student_id: '109283746104', fname: 'Isabella', mname: 'Marie', lname: 'Ramos', grade: 'Grade 11', section: 'STEM A', academicyear: '2025-2026', gender: 'Female', contact: '09154445566', parent_name: 'Patricia Ramos', parent_contact: '09154445567', address: '73 Commonwealth Ave, QC', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 5, student_id: '109283746105', fname: 'Christian', mname: 'Paul', lname: 'Navarro', grade: 'Grade 11', section: 'STEM A', academicyear: '2025-2026', gender: 'Male', contact: '09155556677', parent_name: 'Dennis Navarro', parent_contact: '09155556678', address: '19 Espana Blvd, Manila', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 6, student_id: '109283746106', fname: 'Jasmine', mname: 'Rose', lname: 'Castillo', grade: 'Grade 9', section: 'Diamond', academicyear: '2025-2026', gender: 'Female', contact: '09156667788', parent_name: 'Lita Castillo', parent_contact: '09156667789', address: '210 Taft Avenue, Pasay', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }
];
const INITIAL_TEACHERS = [
  {
    id: 1,
    fname: 'Juan',
    lname: 'Dela Cruz',
    email: 'juan.delacruz@viotrack.edu',
    position: 'Master Teacher I',
    department: 'Science Department',
    contact: '09171234567',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    fname: 'Elena',
    lname: 'Reyes',
    email: 'elena.reyes@viotrack.edu',
    position: 'Teacher III',
    department: 'Mathematics Department',
    contact: '09181234568',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    fname: 'Roberto',
    lname: 'Aquino',
    email: 'roberto.aquino@viotrack.edu',
    position: 'Teacher II',
    department: 'English Department',
    contact: '09191234569',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    fname: 'Carmela',
    lname: 'Bautista',
    email: 'carmela.bautista@viotrack.edu',
    position: 'Teacher I',
    department: 'Social Studies Department',
    contact: '09153334411',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    fname: 'Fernando',
    lname: 'Perez',
    email: 'fernando.perez@viotrack.edu',
    position: 'Senior High Instructor',
    department: 'TVL Track',
    contact: '09154445522',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  }
];
const INITIAL_ADVISERS = [
  { id: 1, teacher_id: 1, grade_level: 'Grade 10', class_section: 'Rizal' },
  { id: 2, teacher_id: 2, grade_level: 'Grade 10', class_section: 'Bonifacio' },
  { id: 3, teacher_id: 3, grade_level: 'Grade 11', class_section: 'STEM A' },
  { id: 4, teacher_id: 4, grade_level: 'Grade 9', class_section: 'Diamond' }
];
const INITIAL_ADMINS = [
  {
    id: 1,
    fname: 'Sheryl',
    mname: 'B.',
    lname: 'Gamboa',
    email: 'admin@phcmanila.edu.ph',
    role: 'Head Admin',
    position: 'Head of Student Affairs',
    image: '/images/phcm-logo2.png'
  },
  {
    id: 2,
    fname: 'System',
    mname: '',
    lname: 'Administrator',
    email: 'system.admin@viotrack.local',
    role: 'System Admin',
    position: 'IT & Security Lead',
    image: ''
  },
  {
    id: 3,
    fname: 'Maria',
    mname: 'L.',
    lname: 'Santos',
    email: 'm.santos@phcmanila.edu.ph',
    role: 'Discipline Officer',
    position: 'Guidance & Conduct Officer',
    image: ''
  }
];
const INITIAL_RECORDS = [
  {
    id: 1,
    student_id: 1,
    violation_id: 1,
    reported_by_type: 'teacher',
    reported_by_name: 'Juan Dela Cruz',
    date_reported: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    status: 'Resolved',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    sanction: 'Verbal Warning',
    remarks: 'Forgot school necktie and ID badge.',
    resolution_notes: 'Student complied the following day and signed acknowledgment.',
    sms_notified: true
  },
  {
    id: 2,
    student_id: 1,
    violation_id: 2,
    reported_by_type: 'admin',
    reported_by_name: 'System Admin',
    date_reported: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    status: 'Pending',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    sanction: '1 Hour Campus Service',
    remarks: 'Arrived 40 minutes late without authorized excuse slip.',
    sms_notified: true
  },
  {
    id: 3,
    student_id: 3,
    violation_id: 5,
    reported_by_type: 'teacher',
    reported_by_name: 'Elena Reyes',
    date_reported: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    status: 'Investigation',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    sanction: 'Parent Conference',
    remarks: 'Involved in a verbal altercation in 2nd floor hallway.',
    resolution_notes: 'Scheduled parent discussion on Friday.',
    sms_notified: true
  },
  {
    id: 4,
    student_id: 4,
    violation_id: 3,
    reported_by_type: 'teacher',
    reported_by_name: 'Roberto Aquino',
    date_reported: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    status: 'Resolved',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
    sanction: 'Device Confiscation',
    remarks: 'Playing mobile games during Chemistry lab instruction.',
    resolution_notes: 'Device returned to parent upon conference.',
    sms_notified: true
  },
  {
    id: 5,
    student_id: 5,
    violation_id: 6,
    reported_by_type: 'admin',
    reported_by_name: 'System Admin',
    date_reported: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    status: 'Pending',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    sanction: 'Desk Restitution',
    remarks: 'Graffiti drawing on classroom desk.',
    sms_notified: false
  },
  {
    id: 6,
    student_id: 2,
    violation_id: 2,
    reported_by_type: 'teacher',
    reported_by_name: 'Elena Reyes',
    date_reported: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    status: 'Under Approval',
    approval_status: 'Under Approval',
    sanction: 'Pending Admin Review',
    remarks: 'Repeated tardiness in morning homeroom period.',
    sms_notified: false
  }
];
const INITIAL_LOGS = [];
const INITIAL_SCHOOL_EVENTS = [];

// ============================================================================
// ULTRA-HIGH PERFORMANCE MULTI-TIER CACHING & DATA ACCELERATION ENGINE
// ============================================================================
const CACHE_CONFIG = {
  FRESH_TTL: 60 * 1000,       // 60 seconds fresh (instant 0ms synchronous hits)
  STALE_TTL: 15 * 60 * 1000,   // 15 minutes stale-while-revalidate window
};

const _cache = {
  data: {
    students: null,
    violations: null,
    records: null,
    teachers: null,
    advisers: null,
    admins: null,
    activity_logs: null,
    school_events: null,
    dashboard_stats: null
  },
  timestamps: {
    students: 0,
    violations: 0,
    records: 0,
    teachers: 0,
    advisers: 0,
    admins: 0,
    activity_logs: 0,
    school_events: 0,
    dashboard_stats: 0
  },
  inFlightPromises: new Map()
};

// Request Coalescing / In-Flight Deduplication
const executeWithDeduplication = (key, fetcherFn) => {
  if (_cache.inFlightPromises.has(key)) {
    return _cache.inFlightPromises.get(key);
  }
  const promise = (async () => {
    try {
      return await fetcherFn();
    } finally {
      _cache.inFlightPromises.delete(key);
    }
  })();
  _cache.inFlightPromises.set(key, promise);
  return promise;
};

const invalidateCache = (key) => {
  if (key) {
    _cache.data[key] = null;
    _cache.timestamps[key] = 0;
    _cache.inFlightPromises.delete(key);
    if (key === 'records' || key === 'students' || key === 'violations') {
      _cache.data.dashboard_stats = null;
      _cache.timestamps.dashboard_stats = 0;
      _cache.inFlightPromises.delete('dashboard_stats');
    }
  } else {
    Object.keys(_cache.data).forEach(k => {
      _cache.data[k] = null;
      _cache.timestamps[k] = 0;
    });
    _cache.inFlightPromises.clear();
  }
};

// Local Storage Safe Helper (Handles Quota Exceeded for 10k+ rows)
const getStored = (key, fallback) => {
  try {
    const data = localStorage.getItem(`viotrack_${key}`);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
};

const setStored = (key, val) => {
  try {
    localStorage.setItem(`viotrack_${key}`, JSON.stringify(val));
  } catch (err) {
    console.warn(`LocalStorage quota exceeded or write failed for ${key}, falling back to memory cache:`, err);
  }
};

const isMissingColumnError = (error) => (
  error && ['42703', 'PGRST204'].includes(error.code)
);

const getMissingColumn = (error) => (
  error?.message?.match(/['"]([a-zA-Z0-9_]+)['"]/i)?.[1]
  || error?.message?.match(/(?:column|field)\s+([a-zA-Z0-9_]+)/i)?.[1]
);

const writeStudentsToSupabase = async (rows, { upsert = false } = {}) => {
  let payload = rows.map(row => ({ ...row }));
  let conflictColumn = 'student_id';

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const request = upsert
      ? supabase.from('students').upsert(payload, { onConflict: conflictColumn }).select()
      : supabase.from('students').insert(payload).select();
    const response = await request;

    if (!response.error) return response;
    if (!isMissingColumnError(response.error)) return response;

    const missingColumn = getMissingColumn(response.error);
    if (missingColumn && payload.some(row => Object.prototype.hasOwnProperty.call(row, missingColumn))) {
      payload = payload.map(row => {
        const copy = { ...row };
        delete copy[missingColumn];
        return copy;
      });
      if (missingColumn === conflictColumn) conflictColumn = 'student_id';
      continue;
    }
    if (upsert && conflictColumn === 'student_id') {
      conflictColumn = 'student_id';
      continue;
    }
    return response;
  }

  return { data: null, error: new Error('Student database schema could not be resolved.') };
};

const updateStudentInSupabase = async (id, payload) => {
  let updates = { ...payload };
  let lookup = Number(id);
  let useIdentifier = false;
  let identifierColumn = 'student_id';

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = useIdentifier
      ? await supabase.from('students').update(updates).eq(identifierColumn, String(id)).select()
      : await supabase.from('students').update(updates).eq('id', lookup).select();

    if (!response.error && response.data?.[0]) return response;
    if (!response.error && !response.data?.[0] && !useIdentifier) {
      useIdentifier = true;
      continue;
    }
    if (!isMissingColumnError(response.error)) return response;

    const missingColumn = getMissingColumn(response.error);
    if (useIdentifier && missingColumn === identifierColumn) {
      identifierColumn = 'student_id';
      continue;
    }
    if (!missingColumn || !Object.prototype.hasOwnProperty.call(updates, missingColumn)) {
      return response;
    }
    delete updates[missingColumn];
  }

  return { data: null, error: new Error('Student update schema could not be resolved.') };
};

export const dataService = {
  // --- USER CONTEXT HELPER ---
  getCurrentUser() {
    try {
      const stored = typeof window !== 'undefined' ? sessionStorage.getItem('viotrack_active_user') : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.name && parsed?.role) return parsed;
      }
    } catch {}
    return { name: 'Faculty Member', role: 'teacher' };
  },

  invalidateCache,

  // --- STUDENTS ---
  async getStudents(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.students;
    const cacheAge = now - _cache.timestamps.students;

    // 1. Instant Synchronous Cache Hit (Fresh)
    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    // 2. Stale-While-Revalidate Hit: Return immediately & revalidate in background
    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      // Trigger background silent revalidation without awaiting
      this.getStudents(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('students', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          const fetchAllStudents = async (ordered) => {
            const pageSize = 1000;
            const allRows = [];
            for (let offset = 0; ; offset += pageSize) {
              let query = supabase.from('students').select('*');
              if (ordered) query = query.order('lname', { ascending: true });
              const page = await query.range(offset, offset + pageSize - 1);
              if (page.error) throw page.error;
              if (Array.isArray(page.data)) allRows.push(...page.data);
              if (!Array.isArray(page.data) || page.data.length < pageSize) break;
            }
            return allRows;
          };

          try {
            remoteList = await fetchAllStudents(true);
          } catch (orderedError) {
            // Fallback if ordering by lname or a schema-specific column fails.
            try {
              remoteList = await fetchAllStudents(false);
            } catch (fallbackError) {
              throw new Error(`Unable to load students from the database: ${fallbackError?.message || orderedError?.message || 'Unknown database error'}`);
            }
          }
        } catch (e) {
          console.error('Supabase getStudents error:', e);
          throw e;
        }
      }

      const stored = getStored('students', []);
      const storedMap = new Map();
      stored.forEach(s => {
        const sid = String(s.student_id || '').trim();
        if (sid) storedMap.set(sid, s);
      });

      let combinedList = [];
      if (isSupabaseConfigured() && remoteList !== null) {
        const remoteIds = new Set();
        combinedList = remoteList.map(remoteItem => {
          const sid = String(remoteItem.student_id || '').trim();
          if (sid) remoteIds.add(sid);
          const localItem = storedMap.get(sid) || {};
          return {
            ...localItem,
            ...remoteItem,
            student_id: sid,
            image: remoteItem.image || localItem.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((remoteItem.fname || '') + ' ' + (remoteItem.lname || ''))}&background=07345f&color=fff&bold=true`
          };
        });

        // Keep locally cached students visible if a previous database write
        // failed. addRecord verifies the student exists remotely before saving
        // an incident, so these entries cannot create invalid foreign keys.
        stored.forEach(localItem => {
          const sid = String(localItem.student_id || localItem.student_id || '').trim();
          const isLocalMutation = localItem._localOnly
            || (localItem.created_at && Number(localItem.id) > 1000000000);
          if (sid && !remoteIds.has(sid) && isLocalMutation) {
            combinedList.unshift({ ...localItem, _localOnly: true });
          }
        });
      } else {
        combinedList = stored;
      }

      const processed = combinedList.map(s => {
        const sid = String(s.student_id || '').trim();
        return {
          ...s,
            student_id: sid,
          image: s.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((s.fname || '') + ' ' + (s.lname || ''))}&background=07345f&color=fff&bold=true`
        };
      });

      setStored('students', processed);
      _cache.data.students = processed;
      _cache.timestamps.students = Date.now();
      return processed;
    });
  },

  async addStudent(student) {
    startMutation();
    try {
      let result = null;
      const studentIdVal = String(student.student_id || '').trim();
      if (!studentIdVal) {
        throw new Error('Student ID is required.');
      }

      const cleanStudent = {
            student_id: studentIdVal,
        fname: String(student.fname || '').trim(),
        mname: String(student.mname || '').trim(),
        lname: String(student.lname || '').trim(),
        email: String(student.email || '').trim().toLowerCase(),
        grade: String(student.grade || 'Grade 10').trim(),
        track: String(student.track || 'JHS').trim(),
        strand: String(student.strand || 'JHS').trim(),
        section: String(student.section || 'General').trim(),
        academicyear: String(student.academicyear || student.academic_year || '2025-2026').trim(),
        gender: String(student.gender || 'Male').trim(),
        contact: String(student.contact || '').trim(),
        parent_name: String(student.parent_name || '').trim(),
        parent_contact: String(student.parent_contact || '').trim(),
        address: String(student.address || '').trim(),
        password: String(student.password || 'Viotrack@2026!').trim(),
        image: String(student.image || '').trim()
      };

      if (isSupabaseConfigured()) {
        try {
          const supabasePayload = {
            student_id: studentIdVal,
            fname: cleanStudent.fname,
            mname: cleanStudent.mname,
            lname: cleanStudent.lname,
            grade: cleanStudent.grade,
            track: cleanStudent.track,
            strand: cleanStudent.strand,
            section: cleanStudent.section,
            academicyear: cleanStudent.academicyear,
            gender: cleanStudent.gender,
            contact: cleanStudent.contact,
            parent_name: cleanStudent.parent_name,
            parent_contact: cleanStudent.parent_contact,
            address: cleanStudent.address,
            image: cleanStudent.image
          };

          const res = await writeStudentsToSupabase([supabasePayload]);

          if (res.error) {
            if (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.error.message?.includes('unique constraint')) {
              throw new Error(`Student ID "${studentIdVal}" is already registered in the system.`);
            }
            throw new Error(`Unable to save student to the database: ${res.error.message}`);
          } else if (res.data?.[0]) {
            result = { ...cleanStudent, ...res.data[0], student_id: studentIdVal };
          }
        } catch (err) {
          if (err.message && err.message.includes('already registered')) {
            throw err;
          }
          throw new Error(`Unable to save student to the database: ${err.message || String(err)}`);
        }
      }

      if (!result) {
        result = { ...cleanStudent, id: Date.now(), created_at: new Date().toISOString() };
      }

      const current = getStored('students', INITIAL_STUDENTS);
      const filtered = current.filter(s => String(s.student_id || '').trim() !== studentIdVal);
      const updated = [result, ...filtered];
      setStored('students', updated);

      invalidateCache('students');
      invalidateCache('records');
      if (_cache.data.students) {
        _cache.data.students = [result, ..._cache.data.students.filter(s => String(s.student_id || '').trim() !== studentIdVal)];
      }

      await this.addActivityLog('Add Student', `Enrolled student ${cleanStudent.fname} ${cleanStudent.lname} (ID: ${studentIdVal || 'No Student ID'}, ${cleanStudent.grade || ''} ${cleanStudent.section || ''})`);
      broadcastRecordChange('create', 'student', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async bulkAddStudents(studentsList, onProgress) {
    if (!Array.isArray(studentsList) || studentsList.length === 0) return { insertedCount: 0, errors: [] };
    startMutation();
    try {
      const CHUNK_SIZE = 100;
      const cleanStudents = studentsList.map(student => {
        const studentIdVal = String(student.student_id || '').trim();
        return {
            student_id: studentIdVal,
          fname: String(student.fname || '').trim(),
          mname: String(student.mname || '').trim(),
          lname: String(student.lname || '').trim(),
          email: String(student.email || '').trim().toLowerCase(),
          grade: String(student.grade || '').trim(),
          track: String(student.track || '').trim(),
          strand: String(student.strand || student.course || '').trim(),
          section: String(student.section || '').trim(),
          academicyear: String(student.academicyear || student.academic_year || '2025-2026').trim(),
          gender: String(student.gender || 'Male').trim(),
          contact: String(student.contact || '').trim(),
          parent_name: String(student.parent_name || '').trim(),
          parent_contact: String(student.parent_contact || '').trim(),
          address: String(student.address || '').trim(),
          password: String(student.password || 'Viotrack@2026!').trim(),
          image: String(student.image || '').trim()
        };
      });

      const invalidRows = cleanStudents
        .map((student, index) => (!student.student_id || !student.fname || !student.lname || !student.grade || !student.section ? index + 1 : null))
        .filter(Boolean);
      if (invalidRows.length > 0) {
        throw new Error(`Rows ${invalidRows.slice(0, 20).join(', ')} are missing Student ID, first name, last name, grade, or section.`);
      }

      const duplicateIds = cleanStudents
        .map(student => student.student_id.toLowerCase())
        .filter((studentId, index, ids) => ids.indexOf(studentId) !== index);
      if (duplicateIds.length > 0) {
        throw new Error(`Duplicate Student ID values found in the import: ${Array.from(new Set(duplicateIds)).slice(0, 20).join(', ')}`);
      }

      let totalInserted = 0;
      const errors = [];
      const total = cleanStudents.length;

      // 1. Supabase batch upsert in chunks
      if (isSupabaseConfigured()) {
        for (let i = 0; i < total; i += CHUNK_SIZE) {
      const chunk = cleanStudents.slice(i, i + CHUNK_SIZE);
      const payload = chunk.map(s => ({
            student_id: s.student_id,
        fname: s.fname,
        mname: s.mname,
        lname: s.lname,
        email: s.email,
        grade: s.grade,
        track: s.track,
        strand: s.strand,
        section: s.section,
        academicyear: s.academicyear,
        gender: s.gender,
        contact: s.contact,
        parent_name: s.parent_name,
        parent_contact: s.parent_contact,
        address: s.address,
        image: s.image
      }));
      const res = await writeStudentsToSupabase(payload, { upsert: true });
      if (res.error) {
        errors.push(`Rows ${i + 1}-${Math.min(i + chunk.length, total)}: ${res.error.message}`);
      } else {
        totalInserted += res.data?.length || chunk.length;
      }
      onProgress?.(Math.min(i + chunk.length, total), total);
        }
      } else {
        totalInserted = total;
      }

      if (errors.length > 0) {
        throw new Error(`Import completed with ${errors.length} failed batch(es): ${errors.join(' | ')}`);
      }

      // 2. LocalStorage Sync
      const current = getStored('students', INITIAL_STUDENTS);
      const existingIdMap = new Map(current.map(s => [String(s.student_id || '').toLowerCase(), s]));
      const newItems = [];
      let nextId = Date.now();

      cleanStudents.forEach(cs => {
        const key = String(cs.student_id || cs.student_id || '').toLowerCase();
        if (existingIdMap.has(key)) {
          const old = existingIdMap.get(key);
          Object.assign(old, cs);
        } else {
          const created = { ...cs, id: nextId++, created_at: new Date().toISOString() };
          newItems.push(created);
          existingIdMap.set(key, created);
        }
      });

      const updatedAll = [...newItems, ...current];
      setStored('students', updatedAll);

      invalidateCache('students');
      invalidateCache('records');
      await this.addActivityLog('Bulk Import', `Bulk imported and enrolled ${totalInserted} student records`);
      broadcastRecordChange('create', 'students', { count: total });

      if (onProgress) {
        onProgress(total, total);
      }

      return { insertedCount: totalInserted, errors };
    } finally {
      endMutation();
    }
  },

  async updateStudent(id, updates) {
    startMutation();
    try {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['student_id', 'fname', 'mname', 'lname', 'email', 'grade', 'track', 'strand', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'password', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'password' && !String(updates[key]).trim()) {
            continue;
          }
          cleanUpdates[key] = updates[key];
        }
      }
      if (updates.student_id && !updates.student_id) cleanUpdates.student_id = updates.student_id;
      if (updates.student_id && !updates.student_id) cleanUpdates.student_id = updates.student_id;

      if (isSupabaseConfigured()) {
        try {
          const allowedSupabaseCols = ['student_id', 'fname', 'mname', 'lname', 'grade', 'track', 'strand', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'image'];
          let toSend = {};
          for (const key of allowedSupabaseCols) {
            if (cleanUpdates[key] !== undefined) {
              toSend[key] = cleanUpdates[key];
            }
          }

          const numericId = Number(id);
          const hasNumericId = !isNaN(numericId) && numericId > 0;
          const res = hasNumericId
            ? await updateStudentInSupabase(numericId, toSend)
            : await updateStudentInSupabase(id, toSend);

          if (res.error) {
            if (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.error.message?.includes('unique constraint')) {
              throw new Error(`Student ID "${cleanUpdates.student_id || id}" is already registered to another student.`);
            }
            throw new Error(`Unable to update student in the database: ${res.error.message}`);
          } else if (res.data?.[0]) {
            const sid = res.data[0].student_id || cleanUpdates.student_id || id;
            result = { ...cleanUpdates, ...res.data[0], student_id: sid };
          }
        } catch (err) {
          if (err.message && err.message.includes('already registered')) {
            throw err;
          }
          throw new Error(`Unable to update student in the database: ${err.message || String(err)}`);
        }
      }

      const current = getStored('students', INITIAL_STUDENTS);
      const targetStudentId = updates.student_id;
      const updated = current.map(s => {
        const isMatch =
          String(s.id) === String(id) ||
          String(s.student_id) === String(id) ||
          String(s.student_id) === String(id) ||
          (targetStudentId && String(s.student_id) === String(targetStudentId));
        return isMatch ? { ...s, ...cleanUpdates, ...(result || {}) } : s;
      });
      setStored('students', updated);

      if (!result) {
        result = updated.find(s =>
          String(s.id) === String(id) ||
          String(s.student_id) === String(id) ||
          String(s.student_id) === String(id) ||
          (targetStudentId && String(s.student_id) === String(targetStudentId))
        );
      }

      invalidateCache('students');
      invalidateCache('records');
      const name = updates.fname || updates.lname ? `${updates.fname || ''} ${updates.lname || ''}`.trim() : `ID #${id}`;
      await this.addActivityLog('Update Student', `Updated profile information for student ${name}`);
      broadcastRecordChange('update', 'student', result || { id, ...cleanUpdates });
      return result || { id, ...cleanUpdates };
    } finally {
      endMutation();
    }
  },

  async deleteStudent(id) {
    startMutation();
    try {
      if (isSupabaseConfigured()) {
        try {
          const numericId = Number(id);
          if (!isNaN(numericId) && numericId > 0) {
            const { error } = await supabase.from('students').delete().eq('id', numericId);
            if (error) {
              throw new Error(`Unable to delete student from the database: ${error.message}`);
            }
          } else {
            const r1 = await supabase.from('students').delete().eq('student_id', id);
            if (r1.error) {
              const r2 = await supabase.from('students').delete().eq('student_id', id);
              if (r2.error) {
                throw new Error(`Unable to delete student from the database: ${r2.error.message}`);
              }
            }
          }
        } catch (err) {
          throw new Error(err.message || `Unable to delete student from the database.`);
        }
      }
      const current = getStored('students', INITIAL_STUDENTS);
      const target = current.find(s => String(s.id) === String(id) || String(s.student_id) === String(id) || String(s.student_id) === String(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(s => String(s.id) !== String(id) && String(s.student_id) !== String(id) && String(s.student_id) !== String(id));
      setStored('students', updated);
      invalidateCache('students');
      invalidateCache('records');
      await this.addActivityLog('Delete Student', `Removed student record for ${name}`);
      broadcastRecordChange('delete', 'student', { id });
      return true;
    } finally {
      endMutation();
    }
  },

  // --- VIOLATIONS CATEGORIES ---
  async getViolations(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.violations;
    const cacheAge = now - _cache.timestamps.violations;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getViolations(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('violations', async () => {
      let result = null;
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('violations').select('*').order('type', { ascending: true });
        if (error) throw new Error(`Unable to load violation types from the database: ${error.message}`);
        if (Array.isArray(data)) result = data;
      }
      if (!result) {
        const stored = getStored('violations', null);
        if (!stored || stored.length < INITIAL_VIOLATIONS.length) {
          setStored('violations', INITIAL_VIOLATIONS);
          result = INITIAL_VIOLATIONS;
        } else {
          result = stored;
        }
      }

      // Automatic Deduplication: Remove duplicate violation categories by normalized title
      if (Array.isArray(result)) {
        const seenTitles = new Set();
        const seenIds = new Set();
        result = result.filter(v => {
          if (!v) return false;
          const id = Number(v.id);
          const title = String(v.title || '').trim().toLowerCase();
          if (id && seenIds.has(id)) return false;
          if (title && seenTitles.has(title)) return false;
          if (id) seenIds.add(id);
          if (title) seenTitles.add(title);
          return true;
        });
      }

      _cache.data.violations = result;
      _cache.timestamps.violations = Date.now();
      return result;
    });
  },

  async addViolationType(violation) {
    const cleanViolation = {
      title: String(violation.title || '').trim(),
      description: String(violation.description || '').trim(),
      type: String(violation.type || 'Minor').trim(),
      default_sanction: String(violation.default_sanction || '').trim()
    };

    // Check for existing duplicate title
    const current = await this.getViolations();
    const existing = current.find(v => (v.title || '').trim().toLowerCase() === cleanViolation.title.toLowerCase());
    if (existing) {
      return existing;
    }

    let result = null;
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('violations').insert([cleanViolation]).select();
      if (error) throw new Error(`Unable to save violation type to the database: ${error.message}`);
      if (!data?.[0]) throw new Error('Unable to save violation type: the database returned no saved row.');
      result = data[0];
    }
    const currentStored = getStored('violations', INITIAL_VIOLATIONS);
    if (!result) {
      result = { ...cleanViolation, id: Date.now(), created_at: new Date().toISOString() };
    }
    const updated = [...currentStored.filter(v => (v.title || '').trim().toLowerCase() !== cleanViolation.title.toLowerCase()), result];
    setStored('violations', updated);
    invalidateCache('violations');
    await this.addActivityLog('Add Violation Category', `Created category "${cleanViolation.title}" (${cleanViolation.type})`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: result }));
    } catch {}
    return result;
  },

  async updateViolationType(id, updates) {
    let result = null;
    const cleanUpdates = {};
    const allowed = ['title', 'description', 'type', 'default_sanction'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = updates[key];
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('violations').update(cleanUpdates).eq('id', Number(id)).select();
        if (!error && data?.[0]) {
          result = data[0];
        } else if (error) {
          console.error('Supabase updateViolationType error:', error);
        }
      } catch (err) {
        console.warn('Supabase updateViolationType error:', err);
      }
    }
    const current = getStored('violations', INITIAL_VIOLATIONS);
    const updated = current.map(v => (v.id === Number(id) ? { ...v, ...updates } : v));
    setStored('violations', updated);
    if (!result) result = updated.find(v => v.id === Number(id));
    invalidateCache('violations');
    await this.addActivityLog('Update Violation Category', `Updated category "${updates.title || result?.title || '#' + id}" (${updates.type || result?.type || ''})`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: result }));
    } catch {}
    return result;
  },

  async deleteViolationType(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('violations').delete().eq('id', Number(id));
        if (error) console.error('Supabase deleteViolationType error:', error);
      } catch (err) {
        console.warn('Supabase deleteViolationType error:', err);
      }
    }
    const current = getStored('violations', INITIAL_VIOLATIONS);
    const target = current.find(v => v.id === Number(id));
    const title = target ? target.title : `ID #${id}`;
    const updated = current.filter(v => v.id !== Number(id));
    setStored('violations', updated);
    invalidateCache('violations');
    await this.addActivityLog('Delete Violation Category', `Removed violation category "${title}"`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_data_updated', { detail: { id } }));
    } catch {}
    return true;
  },

  // --- RECORDS / INCIDENTS ---
  async getRecords(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.records;
    const cacheAge = now - _cache.timestamps.records;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getRecords(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('records', async () => {
      const [students, violations] = await Promise.all([
        this.getStudents(),
        this.getViolations()
      ]);

      const studentMap = new Map();
      INITIAL_STUDENTS.forEach((s) => {
        if (s.id) {
          studentMap.set(Number(s.id), s);
          studentMap.set(String(s.id), s);
        }
        if (s.student_id) studentMap.set(String(s.student_id).trim(), s);
        if (s.student_id) studentMap.set(String(s.student_id).trim(), s);
      });
      students.forEach((s, idx) => {
        if (s.id) {
          studentMap.set(Number(s.id), s);
          studentMap.set(String(s.id), s);
        }
        if (s.student_id) studentMap.set(String(s.student_id).trim(), s);
        if (s.student_id) studentMap.set(String(s.student_id).trim(), s);
        if (!studentMap.has(idx + 1)) {
          studentMap.set(idx + 1, s);
        }
      });
      const violationMap = new Map();
      violations.forEach((v, idx) => {
        if (v.id) {
          violationMap.set(Number(v.id), v);
          violationMap.set(String(v.id), v);
        }
        violationMap.set(idx + 1, v);
      });

      let remoteRecords = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error: recordsError } = await supabase
            .from('records')
            .select(`
              *,
              students (*),
              violations (*)
            `)
            .order('id', { ascending: false });
          if (recordsError) {
            throw new Error(`Unable to load violation records from Supabase: ${recordsError.message}`);
          }
          remoteRecords = Array.isArray(data) ? data : [];
        } catch (err) {
          console.error('Supabase getRecords error:', err);
          throw err;
        }
      }

      let allRawRecords = [];
      if (remoteRecords !== null) {
        allRawRecords = [...remoteRecords];
        // Supabase is authoritative when configured. Remove stale browser-only records
        // so local and hosted clients resolve the same dataset.
        setStored('records', allRawRecords);
      } else {
        allRawRecords = getStored('records', INITIAL_RECORDS);
      }

      let mappedRecords = allRawRecords.map(r => {
        const isTeacher = (r.reported_by_type === 'teacher' || (r.reported_by_name && r.reported_by_name !== 'System Admin' && r.reported_by_name !== 'Sheryl Gamboa' && r.reported_by_name !== 'Head Admin'));
        
        let resolvedApproval = r.approval_status;
        if (r.status === 'Under Approval') {
          resolvedApproval = 'Under Approval';
        } else if (r.status === 'Rejected') {
          resolvedApproval = 'Rejected';
        } else if (resolvedApproval === 'Under Approval') {
          resolvedApproval = 'Under Approval';
        } else if (resolvedApproval === 'Rejected') {
          resolvedApproval = 'Rejected';
        } else if (!resolvedApproval) {
          if (r.approved_by) {
            resolvedApproval = 'Approved';
          } else if (isTeacher || !r.approved_by) {
            resolvedApproval = 'Under Approval';
          } else {
            resolvedApproval = 'Approved';
          }
        }

        const rawStudent = r.students || r.student;
        let resolvedStudent = (rawStudent && (rawStudent.fname || rawStudent.lname))
          ? rawStudent
          : (studentMap.get(Number(r.student_id)) || studentMap.get(String(r.student_id)) || rawStudent);

        if (!resolvedStudent || (!resolvedStudent.fname && !resolvedStudent.lname)) {
          resolvedStudent = (students || []).find(s => String(s.student_id) === String(r.student_id) || String(s.id) === String(r.student_id))
            || INITIAL_STUDENTS.find(s => String(s.student_id) === String(r.student_id) || String(s.id) === String(r.student_id))
            || INITIAL_STUDENTS[0];
        }

        const sid = String(resolvedStudent.student_id || r.student_id || '109283746101').trim();
        const sImage = (resolvedStudent.image && resolvedStudent.image.trim() !== '')
          ? resolvedStudent.image
          : `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`;

        resolvedStudent = {
          ...resolvedStudent,
            student_id: sid,
          image: sImage
        };

        const rawViolation = r.violations || r.violation;
        const resolvedViolation = (rawViolation && rawViolation.title)
          ? rawViolation
          : (violationMap.get(Number(r.violation_id)) || violationMap.get(String(r.violation_id)) || rawViolation);

        return {
          ...r,
          approval_status: resolvedApproval,
          student: resolvedStudent,
          violation: resolvedViolation
        };
      });

      // Automatic Deduplication of Incident Records
      if (Array.isArray(mappedRecords)) {
        const seenIds = new Set();
        mappedRecords = mappedRecords.filter(r => {
          if (!r) return false;
          const id = Number(r.id);
          if (id && seenIds.has(id)) return false;
          if (id) seenIds.add(id);
          return true;
        });
      }

      _cache.data.records = mappedRecords;
      _cache.timestamps.records = Date.now();
      return mappedRecords;
    });
  },

  async addRecord(record) {
    startMutation();
    try {
      let result = null;
      let databaseStudentId = Number(record.student_id);

      if (isSupabaseConfigured()) {
        const studentLookupId = Number.isInteger(databaseStudentId) && databaseStudentId > 0
          ? databaseStudentId
          : null;
        let studentQuery = null;

        if (studentLookupId) {
          const { data, error } = await supabase
            .from('students')
            .select('id')
            .eq('id', studentLookupId)
            .maybeSingle();
          if (error) {
            throw new Error(`Unable to verify the selected student: ${error.message}`);
          }
          studentQuery = data;
        }

        if (!studentQuery && record.student_id_value) {
          let lookup = await supabase
            .from('students')
            .select('id')
            .eq('student_id', String(record.student_id_value))
            .maybeSingle();
          if (lookup.error && ['42703', 'PGRST204'].includes(lookup.error.code)) {
            lookup = await supabase
              .from('students')
              .select('id')
              .eq('student_id', String(record.student_id_value))
              .maybeSingle();
          }
          if (lookup.error) {
            throw new Error(`Unable to verify the selected student: ${lookup.error.message}`);
          }
          studentQuery = lookup.data;
        }

        if (!studentQuery) {
          throw new Error('The selected student does not exist in the database. Refresh the student list and try again.');
        }

        databaseStudentId = Number(studentQuery.id);
      }

      let remarksText = record.remarks || '';
      if (record.lat != null && record.lng != null && !remarksText.includes('GPS:')) {
        const gpsNote = ` [GPS: ${Number(record.lat).toFixed(6)}, ${Number(record.lng).toFixed(6)}${record.accuracy != null ? ` (±${record.accuracy}m)` : ''}]`;
        remarksText = remarksText ? `${remarksText}${gpsNote}` : gpsNote.trim();
      }

      const isTeacherReport = (record.reported_by_type === 'teacher');
      const defaultApprovalStatus = record.approval_status || (isTeacherReport ? 'Under Approval' : 'Approved');

      const cleanRecord = {
        student_id: databaseStudentId,
        violation_id: Number(record.violation_id),
        reported_by_name: record.reported_by_name || 'System Admin',
        reported_by_type: record.reported_by_type || 'admin',
        date_reported: record.date_reported || new Date().toISOString(),
        status: record.status || (isTeacherReport ? 'Under Approval' : 'Pending'),
        approval_status: defaultApprovalStatus,
        approved_by: record.approved_by || (defaultApprovalStatus === 'Approved' ? (record.reported_by_name || 'Admin') : null),
        approved_at: record.approved_at || (defaultApprovalStatus === 'Approved' ? new Date().toISOString() : null),
        rejection_reason: record.rejection_reason || null,
        rejected_by: record.rejected_by || null,
        rejected_at: record.rejected_at || null,
        sanction: record.sanction || '',
        remarks: remarksText,
        resolution_notes: record.resolution_notes || '',
        resolution_date: record.resolution_date || null,
        sms_notified: Boolean(record.sms_notified)
      };

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('records')
            .insert([cleanRecord])
            .select('*, students (*), violations (*)');
          if (error) {
            console.error('Supabase addRecord insert error:', error);
            throw new Error(`Unable to save the violation record to the database: ${error.message}`);
          }
          if (!data?.[0]) {
            throw new Error('Unable to save the violation record to the database: no record was returned.');
          }
          result = {
            ...data[0],
            student: data[0].students,
            violation: data[0].violations
          };
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('Unable to save the violation record')) {
            throw err;
          }
          console.error('Supabase addRecord error:', err);
          throw new Error(`Unable to save the violation record to the database: ${err.message || String(err)}`);
        }
      }

      const current = getStored('records', INITIAL_RECORDS);
      if (!result) {
        result = {
          ...cleanRecord,
          id: Date.now(),
          lat: record.lat,
          lng: record.lng,
          accuracy: record.accuracy
        };
      }

      const updated = [result, ...current];
      setStored('records', updated);
      invalidateCache('records');

      // Identify student & violation details for clear log entry
      let studentLabel = `Student ID #${record.student_id}`;
      try {
        const students = await this.getStudents();
        const matchedStudent = (students || []).find(s => Number(s.id) === Number(record.student_id));
        if (matchedStudent) {
          studentLabel = `${matchedStudent.fname} ${matchedStudent.lname} (${matchedStudent.grade} - ${matchedStudent.section})`;
        }
      } catch {}

      let violationLabel = record.violation_title || `Violation ID #${record.violation_id}`;
      try {
        const violations = await this.getViolations();
        const matchedV = (violations || []).find(v => Number(v.id) === Number(record.violation_id));
        if (matchedV) {
          violationLabel = `${matchedV.title} [${matchedV.type}]`;
        }
      } catch {}

      await this.addActivityLog('Add Violation', `Logged incident "${violationLabel}" for ${studentLabel}`);
      broadcastRecordChange('create', 'record', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async updateRecordStatus(id, { status, resolution_notes, sanction }) {
    startMutation();
    try {
      const isResolved = status === 'Resolved';
      const payload = {
        status,
        resolution_notes: resolution_notes || '',
        sanction: sanction || '',
        resolution_date: isResolved ? new Date().toISOString() : null
      };

      let result = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('records')
            .update(payload)
            .eq('id', Number(id))
            .select('*, students (*), violations (*)');
          if (!error && data?.[0]) {
            result = {
              ...data[0],
              student: data[0].students,
              violation: data[0].violations
            };
          } else if (error) {
            console.error('Supabase updateRecordStatus error:', error);
          }
        } catch (err) {
          console.warn('Supabase updateRecordStatus error:', err);
        }
      }
      const current = getStored('records', INITIAL_RECORDS);
      const updated = current.map(r => (Number(r.id) === Number(id) ? { ...r, ...payload } : r));
      setStored('records', updated);
      invalidateCache('records');
      if (!result) result = updated.find(r => Number(r.id) === Number(id));

      const sanctionSuffix = sanction ? ` | Sanction: ${sanction}` : '';
      await this.addActivityLog('Status Update', `Marked Incident #${id} as "${status}"${sanctionSuffix}`);
      broadcastRecordChange('update', 'record', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async approveRecord(id, { approved_by = 'Head Admin', status = 'Pending', notes = '' } = {}) {
    startMutation();
    try {
      const payload = {
        approval_status: 'Approved',
        status: status || 'Pending',
        approved_by,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        resolution_notes: notes ? notes : undefined
      };

      let result = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('records')
            .update(payload)
            .eq('id', Number(id))
            .select('*, students (*), violations (*)');
          if (!error && data?.[0]) {
            result = {
              ...data[0],
              student: data[0].students,
              violation: data[0].violations
            };
          }
        } catch (err) {
          console.warn('Supabase approveRecord error:', err);
        }
      }

      const current = getStored('records', INITIAL_RECORDS);
      const updated = current.map(r => (Number(r.id) === Number(id) ? { ...r, ...payload } : r));
      setStored('records', updated);
      invalidateCache('records');
      if (!result) result = updated.find(r => Number(r.id) === Number(id));

      await this.addActivityLog('Approve Violation', `Approved teacher violation report #${id} by ${approved_by}`);
      broadcastRecordChange('update', 'record', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async rejectRecord(id, { rejected_by = 'Head Admin', rejection_reason = 'Disapproved by administration' } = {}) {
    startMutation();
    try {
      const payload = {
        approval_status: 'Rejected',
        status: 'Rejected',
        rejected_by,
        rejected_at: new Date().toISOString(),
        rejection_reason
      };

      let result = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('records')
            .update(payload)
            .eq('id', Number(id))
            .select('*, students (*), violations (*)');
          if (!error && data?.[0]) {
            result = {
              ...data[0],
              student: data[0].students,
              violation: data[0].violations
            };
          }
        } catch (err) {
          console.warn('Supabase rejectRecord error:', err);
        }
      }

      const current = getStored('records', INITIAL_RECORDS);
      const updated = current.map(r => (Number(r.id) === Number(id) ? { ...r, ...payload } : r));
      setStored('records', updated);
      invalidateCache('records');
      if (!result) result = updated.find(r => Number(r.id) === Number(id));

      await this.addActivityLog('Reject Violation', `Rejected teacher violation report #${id} (Reason: ${rejection_reason})`);
      broadcastRecordChange('update', 'record', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async deleteRecord(id) {
    startMutation();
    try {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('records').delete().eq('id', Number(id));
          if (error) console.error('Supabase deleteRecord error:', error);
        } catch (err) {
          console.warn('Supabase deleteRecord error:', err);
        }
      }
      const current = getStored('records', INITIAL_RECORDS);
      const updated = current.filter(r => Number(r.id) !== Number(id));
      setStored('records', updated);
      invalidateCache('records');
      await this.addActivityLog('Delete Record', `Removed violation record #${id}`);
      broadcastRecordChange('delete', 'record', { id });
      return true;
    } finally {
      endMutation();
    }
  },

  // --- TEACHERS & ADVISERS ---
  async getTeachers(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.teachers;
    const cacheAge = now - _cache.timestamps.teachers;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getTeachers(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('teachers', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('teachers').select('id,fname,mname,lname,email,position,department,specialization,contact,gender,image').order('lname', { ascending: true });
          if (!error && data) remoteList = data;
        } catch (e) {
          console.warn('Supabase getTeachers notice:', e);
        }
      }

      const localList = getStored('teachers', INITIAL_TEACHERS);
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList.map(r => {
            return {
              ...r,
              password: undefined
            };
          })
        : localList;

      _cache.data.teachers = list;
      _cache.timestamps.teachers = Date.now();
      return list;
    });
  },

  // --- LIVE STUDENT LOCATION TRACKING (GPS & TELEMETRY) ---
  async getStudentLatestLocation(studentId) {
    if (!studentId) return null;

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('student_locations')
          .select('*')
          .eq('student_id', Number(studentId))
          .order('recorded_at', { ascending: false })
          .limit(1);
        if (!error && data?.[0]) return data[0];
      } catch (err) {
        console.warn('Supabase getStudentLatestLocation error:', err);
      }
    }

    const storedHistory = getStored(`locations_${studentId}`, []);
    if (storedHistory.length > 0) return storedHistory[0];

    return null;
  },

  async getStudentLocationHistory(studentId, limit = 15) {
    if (!studentId) return [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('student_locations')
          .select('*')
          .eq('student_id', Number(studentId))
          .order('recorded_at', { ascending: false })
          .limit(limit);
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getStudentLocationHistory error:', err);
      }
    }

    const stored = getStored(`locations_${studentId}`, []);
    if (stored.length > 0) return stored.slice(0, limit);

    return [];
  },

  async saveStudentLocation(studentId, { latitude, longitude, accuracy_meters, tracking_status = 'Active' }) {
    if (!studentId) throw new Error('Student ID is required');

    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc = accuracy_meters == null ? 10 : Number(accuracy_meters);

    // Strict Coordinate Validation
    if (isNaN(lat) || lat < -90 || lat > 90) throw new Error('Invalid latitude coordinates');
    if (isNaN(lng) || lng < -180 || lng > 180) throw new Error('Invalid longitude coordinates');
    if (!Number.isFinite(acc) || acc < 0) throw new Error('Invalid accuracy range');

    const currentUser = this.getCurrentUser();
    const payload = {
      student_id: Number(studentId),
      latitude: lat,
      longitude: lng,
      accuracy_meters: acc,
      tracking_status: tracking_status,
      recorded_at: new Date().toISOString(),
      reported_by: currentUser.name || 'System'
    };

    let savedResult = null;
    let remoteSaveError = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('student_locations').insert([payload]).select();
        if (error) {
          remoteSaveError = error;
        } else if (!data?.[0]) {
          remoteSaveError = new Error('No location record was returned by the database.');
        } else {
          savedResult = data[0];
        }
      } catch (err) {
        remoteSaveError = err;
      }
    }

    // Local storage fallback
    const key = `locations_${studentId}`;
    const history = getStored(key, []);
    const updatedHistory = [{ ...payload, id: Date.now() }, ...history].slice(0, 50);
    setStored(key, updatedHistory);

    try {
      window.dispatchEvent(new CustomEvent('viotrack_location_updated', { detail: payload }));
    } catch {}

    if (remoteSaveError) {
      console.error('Supabase saveStudentLocation error:', remoteSaveError);
      throw new Error(`GPS was saved on this device but could not be saved to shared location history: ${remoteSaveError.message || String(remoteSaveError)}`);
    }

    return savedResult || payload;
  },

  async addTeacher(teacher) {
    let result = null;
    const cleanTeacher = {
      fname: String(teacher.fname || '').trim(),
      mname: String(teacher.mname || '').trim(),
      lname: String(teacher.lname || '').trim(),
      email: String(teacher.email || '').trim().toLowerCase(),
      position: String(teacher.position || 'Teacher').trim(),
      department: String(teacher.department || 'General').trim(),
      specialization: String(teacher.specialization || '').trim(),
      contact: String(teacher.contact || '').trim(),
      gender: String(teacher.gender || '').trim(),
      image: String(teacher.image || '').trim()
    };

    if (isSupabaseConfigured()) {
      try {
        // Hash password (defaults to 'teacher123' if not provided)
        const rawPassword = String(teacher.password || 'teacher123').trim();
        const passwordHash = await bcrypt.hash(rawPassword, 12);
        const supabasePayload = {
          fname: cleanTeacher.fname,
          mname: cleanTeacher.mname,
          lname: cleanTeacher.lname,
          email: cleanTeacher.email,
          position: cleanTeacher.position,
          department: cleanTeacher.department,
          specialization: cleanTeacher.specialization,
          contact: cleanTeacher.contact,
          gender: cleanTeacher.gender,
          image: cleanTeacher.image,
          ...(passwordHash ? { password_hash: passwordHash } : {})
        };
        const { data, error } = await supabase.from('teachers').insert([supabasePayload]).select();
        if (!error && data?.[0]) {
          result = { ...cleanTeacher, ...data[0] };
        } else if (error) {
          if (error.code === '23505') {
            throw new Error(`A teacher with email "${cleanTeacher.email}" already exists.`);
          }
          throw new Error(`Unable to save teacher to the database: ${error.message}`);
        }
      } catch (err) {
        throw err;
      }
    }
    const current = getStored('teachers', INITIAL_TEACHERS);
    if (!result && isSupabaseConfigured()) {
      throw new Error('Unable to save teacher: the database returned no saved row.');
    }
    if (!result) {
      result = { ...cleanTeacher, id: Date.now(), created_at: new Date().toISOString() };
    }
    const updated = [result, ...current.filter(t => t.email !== cleanTeacher.email)];
    setStored('teachers', updated);
    invalidateCache('teachers');
    invalidateCache('advisers');
    await this.addActivityLog('Add Teacher', `Registered faculty member ${cleanTeacher.fname} ${cleanTeacher.lname} (${cleanTeacher.position}, ${cleanTeacher.department})`);
    return result;
  },

  async updateTeacher(id, updates) {
    let result = null;
    const cleanUpdates = {};
    // Password changes go through bcrypt hashing below.
    const allowed = ['fname', 'mname', 'lname', 'email', 'position', 'department', 'specialization', 'contact', 'gender', 'image'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        cleanUpdates[key] = String(updates[key]).trim();
      }
    }

    // Hash new password if provided
    const rawPassword = String(updates.password || '').trim();
    if (rawPassword) {
      cleanUpdates.password_hash = await bcrypt.hash(rawPassword, 12);
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('teachers').update(cleanUpdates).eq('id', Number(id)).select();
        if (!error && data?.[0]) result = data[0];
        else if (error) throw new Error(`Unable to update teacher in the database: ${error.message}`);
        else throw new Error('Unable to update teacher: no matching database record was found.');
      } catch (err) {
        throw err;
      }
    }
    const current = getStored('teachers', INITIAL_TEACHERS);
    const updated = current.map(t => (t.id === Number(id) ? { ...t, ...cleanUpdates } : t));
    setStored('teachers', updated);
    invalidateCache('teachers');
    invalidateCache('advisers');
    if (!result) result = updated.find(t => t.id === Number(id));
    await this.addActivityLog('Update Teacher', `Updated details for faculty ${updates.fname || ''} ${updates.lname || ''} (#${id})`);
    return result;
  },

  async deleteTeacher(id) {
    startMutation();
    try {
      const numericId = Number(id);
      const hasNumeric = !isNaN(numericId) && numericId > 0;

      if (isSupabaseConfigured()) {
        try {
          if (hasNumeric) {
            // Remove associated advisory assignments first to ensure foreign key integrity
            await supabase.from('advisers').delete().eq('teacher_id', numericId);
            const { error } = await supabase.from('teachers').delete().eq('id', numericId);
            if (error) throw new Error(`Unable to delete teacher from the database: ${error.message}`);
          } else {
            const { error } = await supabase.from('teachers').delete().eq('email', String(id));
            if (error) throw new Error(`Unable to delete teacher from the database: ${error.message}`);
          }
        } catch (err) {
          throw err;
        }
      }

      // Also remove any local adviser appointments for this teacher
      const currentAdvisers = getStored('advisers', INITIAL_ADVISERS);
      const updatedAdvisers = currentAdvisers.filter(a => String(a.teacher_id) !== String(id));
      setStored('advisers', updatedAdvisers);

      const current = getStored('teachers', INITIAL_TEACHERS);
      const target = current.find(t => String(t.id) === String(id) || String(t.email) === String(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(t => String(t.id) !== String(id) && String(t.email) !== String(id));
      setStored('teachers', updated);
      invalidateCache('teachers');
      invalidateCache('advisers');
      if (_cache.data.teachers) {
        _cache.data.teachers = _cache.data.teachers.filter(t => String(t.id) !== String(id) && String(t.email) !== String(id));
      }
      await this.addActivityLog('Delete Teacher', `Removed faculty member ${name}`);
      broadcastRecordChange('delete', 'teacher', { id });
      return true;
    } finally {
      endMutation();
    }
  },

  async getAdvisers(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.advisers;
    const cacheAge = now - _cache.timestamps.advisers;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getAdvisers(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('advisers', async () => {
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('advisers')
            .select('*, teachers(id,fname,mname,lname,email,position,department,specialization,contact,gender,image)');
          if (!error && data) {
            const teachers = data.some(a => !a.teachers) ? await this.getTeachers(true) : [];
            const teacherMap = new Map(teachers.map(t => [Number(t.id), t]));
            const mapped = data.map(a => ({
              ...a,
              teacher: a.teachers || teacherMap.get(Number(a.teacher_id))
            }));
            _cache.data.advisers = mapped;
            _cache.timestamps.advisers = Date.now();
            setStored('advisers', mapped);
            return mapped;
          }

          if (error) {
            console.warn('Supabase getAdvisers relation query failed; retrying without the teacher join:', error.message);
            const { data: adviserRows, error: adviserError } = await supabase.from('advisers').select('*');
            if (!adviserError && adviserRows) {
              const teachers = await this.getTeachers(true);
              const teacherMap = new Map(teachers.map(t => [Number(t.id), t]));
              const mapped = adviserRows.map(a => ({
                ...a,
                teacher: teacherMap.get(Number(a.teacher_id))
              }));
              _cache.data.advisers = mapped;
              _cache.timestamps.advisers = Date.now();
              setStored('advisers', mapped);
              return mapped;
            }
            if (adviserError) {
              console.warn('Supabase getAdvisers fallback query failed:', adviserError.message);
            }
          }
        } catch (err) {
          console.warn('Supabase getAdvisers notice:', err);
        }
      }
      const advisers = getStored('advisers', INITIAL_ADVISERS);
      const teachers = await this.getTeachers();
      const teacherMap = new Map(teachers.map(t => [Number(t.id), t]));
      const mapped = advisers.map(a => ({
        ...a,
        teacher: teacherMap.get(Number(a.teacher_id))
      }));
      _cache.data.advisers = mapped;
      _cache.timestamps.advisers = Date.now();
      return mapped;
    });
  },

  async saveAdviserAssignment(teacher_id, grade_level, class_section) {
    const cleanPayload = {
      teacher_id: Number(teacher_id),
      grade_level: String(grade_level).trim(),
      class_section: String(class_section).trim()
    };

    if (isSupabaseConfigured()) {
      try {
        // Delete any existing assignment for this teacher OR this section
        await supabase
          .from('advisers')
          .delete()
          .or(`teacher_id.eq.${cleanPayload.teacher_id},and(grade_level.eq."${cleanPayload.grade_level}",class_section.eq."${cleanPayload.class_section}")`);
        const { error } = await supabase.from('advisers').insert(cleanPayload);
        if (error) console.error('Supabase saveAdviserAssignment error:', error);
      } catch (err) {
        console.warn('Supabase saveAdviserAssignment error:', err);
      }
    }
    let current = getStored('advisers', INITIAL_ADVISERS);
    // Enforce 1:1 rule: remove any prior assignment for this teacher OR for this section
    current = current.filter(a =>
      Number(a.teacher_id) !== Number(teacher_id) &&
      !(
        String(a.grade_level).trim().toLowerCase() === cleanPayload.grade_level.toLowerCase() &&
        String(a.class_section).trim().toLowerCase() === cleanPayload.class_section.toLowerCase()
      )
    );
    current.push({ id: Date.now(), ...cleanPayload, created_at: new Date().toISOString() });
    setStored('advisers', current);
    invalidateCache('advisers');

    let teacherName = `Teacher #${teacher_id}`;
    try {
      const teachers = getStored('teachers', INITIAL_TEACHERS);
      const t = teachers.find(item => item.id === Number(teacher_id));
      if (t) teacherName = `${t.fname} ${t.lname}`;
    } catch {}

    await this.addActivityLog('Adviser Assigned', `Appointed ${teacherName} as adviser for ${grade_level} - ${class_section}`);
    return true;
  },

  async removeAdviser(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('advisers').delete().eq('id', Number(id));
        if (error) console.error('Supabase removeAdviser error:', error);
      } catch (err) {
        console.warn('Supabase removeAdviser error:', err);
      }
    }
    const current = getStored('advisers', INITIAL_ADVISERS);
    const updated = current.filter(a => a.id !== Number(id));
    setStored('advisers', updated);
    invalidateCache('advisers');
    await this.addActivityLog('Adviser Removed', `Removed adviser assignment #${id}`);
    return true;
  },

  // --- ADMIN USERS ---
  async getAdmins(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.admins;
    const cacheAge = now - _cache.timestamps.admins;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getAdmins(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('admins', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('admins').select('id,fname,mname,lname,email,role,position,contact,image');
          if (!error && data) remoteList = data;
        } catch (e) {
          console.warn('Supabase getAdmins notice:', e);
        }
      }

      const localList = getStored('admins', INITIAL_ADMINS);
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList.map(r => {
            return {
              ...r,
              password: undefined
            };
          })
        : localList;

      _cache.data.admins = list;
      _cache.timestamps.admins = Date.now();
      return list;
    });
  },

  async addAdmin(admin) {
    startMutation();
    try {
      let result = null;
      const cleanAdmin = {
        fname: String(admin.fname || '').trim(),
        mname: String(admin.mname || '').trim(),
        lname: String(admin.lname || '').trim(),
        email: String(admin.email || '').trim().toLowerCase(),
        role: String(admin.role || 'Head Admin').trim(),
        position: String(admin.position || 'Discipline Staff').trim(),
        contact: String(admin.contact || '').trim(),
        image: String(admin.image || '').trim()
      };

      if (isSupabaseConfigured()) {
        try {
          const supabasePayload = {
            fname: cleanAdmin.fname,
            mname: cleanAdmin.mname,
            lname: cleanAdmin.lname,
            email: cleanAdmin.email,
            role: cleanAdmin.role,
            position: cleanAdmin.position,
            contact: cleanAdmin.contact,
            image: cleanAdmin.image
          };

          let toSend = { ...supabasePayload };
          let res = await supabase.from('admins').insert([toSend]).select();

          while (res.error && res.error.code === 'PGRST204') {
            const match = res.error.message?.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in toSend) {
              delete toSend[match[1]];
              res = await supabase.from('admins').insert([toSend]).select();
            } else {
              break;
            }
          }

          if (!res.error && res.data?.[0]) {
            result = { ...cleanAdmin, ...res.data[0] };
          } else if (res.error) {
            if (res.error.code === '23505') {
              throw new Error(`An administrator with email "${cleanAdmin.email}" already exists.`);
            }
            throw new Error(`Unable to save administrator to the database: ${res.error.message}`);
          }
        } catch (err) {
          throw err;
        }
      }

      if (!result && isSupabaseConfigured()) {
        throw new Error('Unable to save administrator: the database returned no saved row.');
      }
      if (!result) {
        result = { ...cleanAdmin, id: Date.now(), created_at: new Date().toISOString() };
      }

      const current = getStored('admins', INITIAL_ADMINS);
      const updated = [result, ...current.filter(a => a.email !== cleanAdmin.email)];
      setStored('admins', updated);
      invalidateCache('admins');
      if (_cache.data.admins) {
        _cache.data.admins = updated;
      }
      await this.addActivityLog('Add Admin', `Created administrator account for ${cleanAdmin.fname} ${cleanAdmin.lname} (${cleanAdmin.role})`);
      broadcastRecordChange('create', 'admin', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async updateAdmin(id, updates) {
    startMutation();
    try {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['fname', 'mname', 'lname', 'email', 'role', 'position', 'contact', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          cleanUpdates[key] = updates[key];
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const allowedSupabaseCols = ['fname', 'mname', 'lname', 'email', 'role', 'position', 'contact', 'image'];
          let toSend = {};
          for (const key of allowedSupabaseCols) {
            if (cleanUpdates[key] !== undefined) {
              toSend[key] = cleanUpdates[key];
            }
          }

          const numericId = Number(id);
          const hasNumeric = !isNaN(numericId) && numericId > 0;

          let res;
          if (hasNumeric) {
            res = await supabase.from('admins').update(toSend).eq('id', numericId).select();
          } else {
            res = await supabase.from('admins').update(toSend).eq('email', String(id)).select();
          }

          while (res.error && res.error.code === 'PGRST204') {
            const match = res.error.message?.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in toSend) {
              delete toSend[match[1]];
              if (hasNumeric) {
                res = await supabase.from('admins').update(toSend).eq('id', numericId).select();
              } else {
                res = await supabase.from('admins').update(toSend).eq('email', String(id)).select();
              }
            } else {
              break;
            }
          }

          if (!res.error && res.data?.[0]) {
            result = { ...cleanUpdates, ...res.data[0] };
          } else if (res.error) {
            if (res.error.code === '23505') {
              throw new Error(`An administrator with email "${cleanUpdates.email}" already exists.`);
            }
            throw new Error(`Unable to update administrator in the database: ${res.error.message}`);
          }
        } catch (err) {
          throw err;
        }
      }

      const current = getStored('admins', INITIAL_ADMINS);
      const updated = current.map(a => (String(a.id) === String(id) || String(a.email) === String(id) ? { ...a, ...cleanUpdates, ...(result || {}) } : a));
      setStored('admins', updated);
      invalidateCache('admins');
      if (!result) result = updated.find(a => String(a.id) === String(id) || String(a.email) === String(id));
      if (_cache.data.admins) {
        _cache.data.admins = updated;
      }
      await this.addActivityLog('Update Admin', `Updated admin profile for ${updates.fname || ''} ${updates.lname || ''} (${updates.role || 'Admin'})`);
      broadcastRecordChange('update', 'admin', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async deleteAdmin(id) {
    startMutation();
    try {
      const numericId = Number(id);
      const hasNumeric = !isNaN(numericId) && numericId > 0;

      if (isSupabaseConfigured()) {
        try {
          let res;
          if (hasNumeric) {
            res = await supabase.from('admins').delete().eq('id', numericId);
          } else {
            res = await supabase.from('admins').delete().eq('email', String(id));
          }
          if (res?.error) throw new Error(`Unable to delete administrator from the database: ${res.error.message}`);
        } catch (err) {
          console.warn('Supabase deleteAdmin error:', err);
        }
      }
      const current = getStored('admins', INITIAL_ADMINS);
      const target = current.find(a => String(a.id) === String(id) || String(a.email) === String(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(a => String(a.id) !== String(id) && String(a.email) !== String(id));
      setStored('admins', updated);
      invalidateCache('admins');
      if (_cache.data.admins) {
        _cache.data.admins = _cache.data.admins.filter(a => String(a.id) !== String(id) && String(a.email) !== String(id));
      }
      await this.addActivityLog('Delete Admin', `Removed administrator account for ${name}`);
      broadcastRecordChange('delete', 'admin', { id });
      return true;
    } finally {
      endMutation();
    }
  },

  // --- ACTIVITY LOGS ---
  async getActivityLogs(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.activity_logs;
    const cacheAge = now - _cache.timestamps.activity_logs;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    return executeWithDeduplication('activity_logs', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          const allRows = [];
          const pageSize = 1000;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from('activity_logs')
              .select('*')
              .order('id', { ascending: false })
              .range(offset, offset + pageSize - 1);
            if (error) throw error;
            if (Array.isArray(data)) allRows.push(...data);
            if (!Array.isArray(data) || data.length < pageSize) break;
          }
          remoteList = allRows;
        } catch (err) {
          console.error('Supabase getActivityLogs error:', err);
          throw new Error(`Unable to load activity logs from the database: ${err.message || String(err)}`);
        }
      }
      const localList = getStored('activity_logs', []);
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? [...remoteList, ...localList]
          .filter((log, index, entries) => {
            const getKey = item => item.audit_id || item.id
              || `${item.created_at || item.date || ''}|${item.user_name || ''}|${item.action || ''}`;
            return entries.findIndex(item => getKey(item) === getKey(log)) === index;
          })
          .sort((a, b) => {
            const dateA = new Date(a.created_at || a.date || 0).getTime();
            const dateB = new Date(b.created_at || b.date || 0).getTime();
            return dateB - dateA;
          })
        : localList;
      _cache.data.activity_logs = list;
      _cache.timestamps.activity_logs = Date.now();
      return list;
    });
  },

  async addActivityLog(action, details, userName, userRole, extraMeta = {}) {
    const activeUser = this.getCurrentUser();
    const finalUserName = userName || activeUser.name || 'System Admin';
    const finalUserRole = userRole || activeUser.role || 'admin';
    const timestamp = new Date().toISOString();
    const auditId = `AUD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      audit_id: auditId,
      user_name: finalUserName,
      user_role: finalUserRole,
      action,
      details,
      ip_address: extraMeta.ip || null,
      device_info: extraMeta.device_info || null,
      created_at: timestamp,
      ...extraMeta
    };

    if (isSupabaseConfigured()) {
      try {
        const supabaseLog = {
          user_name: finalUserName,
          user_role: finalUserRole,
          action,
          details,
          audit_id: auditId,
          device_info: extraMeta.device_info || null,
          created_at: timestamp,
        };
        const { data, error } = await supabase
          .from('activity_logs')
          .insert([supabaseLog])
          .select()
          .single();
        if (error) {
          console.warn('Failed to save activity log to database:', error.message);
        } else if (data) {
          Object.assign(newLog, data);
        }
      } catch (err) {
        console.warn('Activity log error:', err);
      }
    }
    const current = getStored('activity_logs', INITIAL_LOGS);
    const updated = [newLog, ...current.slice(0, 299)];
    setStored('activity_logs', updated);
    invalidateCache('activity_logs');

    // Notify all active listeners across the app
    try {
      window.dispatchEvent(new CustomEvent('viotrack_activity_logged', { detail: newLog }));
    } catch {}

    return newLog;
  },

  // --- STORAGE & PHOTO UPLOADS ---
  async uploadPhoto(file, folder = 'students') {
    if (!file || !isSupabaseConfigured()) return null;

    const ext = file.name?.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage.from('student-photos').upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (error) {
      throw new Error(`Unable to upload profile photo: ${error.message}`);
    }
    if (!data?.path) {
      throw new Error('Unable to upload profile photo: storage returned no file path.');
    }

    const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(data.path);
    if (!publicUrlData?.publicUrl) {
      throw new Error('Unable to get a public URL for the uploaded profile photo.');
    }
    return publicUrlData.publicUrl;
  },

  // --- SCHOOL CALENDAR & EVENTS ---
  async getSchoolEvents(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.school_events;
    const cacheAge = now - _cache.timestamps.school_events;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getSchoolEvents(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('school_events', async () => {
      let remoteList = null;
      if (isSupabaseConfigured()) {
        try {
          let res = await supabase.from('calendar_events').select('*').order('date', { ascending: true });
          if (res.error && res.error.code === 'PGRST205') {
            res = await supabase.from('school_events').select('*').order('date', { ascending: true });
          }
          if (!res.error && res.data) remoteList = res.data;
        } catch (err) {
          console.warn('Supabase getSchoolEvents error:', err);
        }
      }
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList
        : getStored('school_events', []);
      _cache.data.school_events = list;
      _cache.timestamps.school_events = Date.now();
      return list;
    });
  },

  async addSchoolEvent(event) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        let res = await supabase.from('calendar_events').insert([event]).select();
        if (res.error && res.error.code === 'PGRST205') {
          res = await supabase.from('school_events').insert([event]).select();
        }
        if (!res.error && res.data?.[0]) result = res.data[0];
      } catch (err) {
        console.warn('Supabase addSchoolEvent error:', err);
      }
    }
    const current = getStored('school_events', INITIAL_SCHOOL_EVENTS);
    if (!result) {
      result = {
        id: Date.now(),
        ...event
      };
    }
    const updated = [...current, result];
    setStored('school_events', updated);
    invalidateCache('school_events');
    await this.addActivityLog('Schedule Event', `Added calendar event "${event.title}" on ${event.date}`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_events_updated', { detail: result }));
    } catch {}
    return result;
  },

  async deleteSchoolEvent(id) {
    if (isSupabaseConfigured()) {
      try {
        let res = await supabase.from('calendar_events').delete().eq('id', id);
        if (res.error && res.error.code === 'PGRST205') {
          await supabase.from('school_events').delete().eq('id', id);
        }
      } catch (err) {
        console.warn('Supabase deleteSchoolEvent error:', err);
      }
    }
    const current = getStored('school_events', INITIAL_SCHOOL_EVENTS);
    const target = current.find(e => e.id === Number(id));
    const title = target ? target.title : `ID #${id}`;
    const updated = current.filter(e => e.id !== Number(id));
    setStored('school_events', updated);
    invalidateCache('school_events');
    await this.addActivityLog('Delete Event', `Removed calendar event "${title}"`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_events_updated', { detail: { id } }));
    } catch {}
    return true;
  },

  // --- SMS TRIGGER (iProgSMS Gateway) ---
  async sendSMS(studentContact, recipientName, studentName, violationTitle, customMessage = null) {
    const result = await smsService.sendSMS({
      recipientNumber: studentContact,
      recipientName,
      studentName,
      violationTitle,
      customMessage
    });

    const logStatus = result.isLive ? (result.success ? 'Live SMS Sent' : 'SMS Failed') : 'SMS Dispatched (Simulated)';
    await this.addActivityLog(
      'SMS Dispatch',
      `Notification (${logStatus}) to ${studentContact} (${recipientName || 'Parent'}) for student ${studentName}`
    );

    return result;
  },

  // --- HIGH-PERFORMANCE PRECOMPUTED ANALYTICS & PAGINATION (Large DB Optimization) ---
  async getDashboardStats(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.dashboard_stats;
    const cacheAge = now - _cache.timestamps.dashboard_stats;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getDashboardStats(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('dashboard_stats', async () => {
      const [students, records, events] = await Promise.all([
        this.getStudents(),
        this.getRecords(),
        this.getSchoolEvents()
      ]);

      const approvedRecords = (records || []).filter(r => r.approval_status === 'Approved');
      const underApprovalCount = (records || []).filter(r => r.approval_status === 'Under Approval' || r.status === 'Under Approval').length;
      const pendingCount = approvedRecords.filter(r => r.status === 'Pending').length;
      const resolvedCount = approvedRecords.filter(r => r.status === 'Resolved').length;
      const investigationCount = approvedRecords.filter(r => r.status === 'Investigation').length;

      let minorCount = 0;
      let seriousCount = 0;
      let majorCount = 0;

      const infractionMap = new Map();

      for (const r of approvedRecords) {
        const type = (r.violation?.type || 'Minor').toLowerCase();
        if (type.includes('major')) majorCount++;
        else if (type.includes('serious')) seriousCount++;
        else minorCount++;

        const sId = r.student_id;
        if (sId) {
          const current = infractionMap.get(sId) || { count: 0, student: r.student, records: [] };
          current.count++;
          if (r.student) current.student = r.student;
          current.records.push(r);
          infractionMap.set(sId, current);
        }
      }

      const repeatOffenders = Array.from(infractionMap.values())
        .filter(item => item.count >= 2 && item.student)
        .sort((a, b) => b.count - a.count);

      const stats = {
        totalStudents: (students || []).length,
        totalViolations: approvedRecords.length,
        pendingViolations: pendingCount,
        resolvedViolations: resolvedCount,
        investigationViolations: investigationCount,
        underApprovalViolations: underApprovalCount,
        minorCount,
        seriousCount,
        majorCount,
        repeatOffenders,
        schoolEvents: events || [],
        calculatedAt: new Date().toISOString()
      };

      _cache.data.dashboard_stats = stats;
      _cache.timestamps.dashboard_stats = Date.now();
      return stats;
    });
  },

  async getStudentsPaginated({ page = 1, limit = 10, search = '', grade = 'all', section = 'all', sortField = 'grade', sortOrder = 'asc' } = {}) {
    const allStudents = await this.getStudents();
    const query = String(search || '').toLowerCase().trim();

    let filtered = allStudents;
    if (query) {
      filtered = filtered.filter(s =>
        (s.fname && s.fname.toLowerCase().includes(query)) ||
        (s.lname && s.lname.toLowerCase().includes(query)) ||
        (s.student_id && String(s.student_id).toLowerCase().includes(query)) ||
        (s.email && s.email.toLowerCase().includes(query)) ||
        (s.section && s.section.toLowerCase().includes(query))
      );
    }

    if (grade !== 'all') {
      filtered = filtered.filter(s => s.grade === grade);
    }
    if (section !== 'all') {
      filtered = filtered.filter(s => s.section === section);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let valA = (a[sortField] || '').toString().toLowerCase();
      let valB = (b[sortField] || '').toString().toLowerCase();
      if (sortOrder === 'desc') {
        return valB.localeCompare(valA, undefined, { numeric: true });
      }
      return valA.localeCompare(valB, undefined, { numeric: true });
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  },

  async getRecordsPaginated({ page = 1, limit = 10, status = 'all', approvalStatus = 'all', search = '', dateRange = null } = {}) {
    const allRecords = await this.getRecords();
    const query = String(search || '').toLowerCase().trim();

    let filtered = allRecords;

    if (approvalStatus !== 'all') {
      filtered = filtered.filter(r => (r.approval_status || '').toLowerCase() === approvalStatus.toLowerCase());
    }

    if (status !== 'all') {
      filtered = filtered.filter(r => (r.status || '').toLowerCase() === status.toLowerCase());
    }

    if (query) {
      filtered = filtered.filter(r => {
        const s = r.student;
        const v = r.violation;
        return (
          (s?.fname && s.fname.toLowerCase().includes(query)) ||
          (s?.lname && s.lname.toLowerCase().includes(query)) ||
          (s?.student_id && String(s.student_id).toLowerCase().includes(query)) ||
          (v?.title && v.title.toLowerCase().includes(query)) ||
          (r.remarks && r.remarks.toLowerCase().includes(query))
        );
      });
    }

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedData = filtered.slice(startIndex, startIndex + limit);

    return {
      data: paginatedData,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  },

  // --- AUTOMATED DATABASE BACKUPS & ONE-CLICK RESTORE ---
  async createDatabaseBackup(type = 'manual') {
    const timestamp = new Date().toISOString();
    const backupId = `BKP-${Date.now()}`;

    let collections;
    if (isSupabaseConfigured()) {
      const fetchAllRows = async (table, columnOptions = '*') => {
        const selectors = Array.isArray(columnOptions) ? columnOptions : [columnOptions];
        for (let selectorIndex = 0; selectorIndex < selectors.length; selectorIndex += 1) {
          const pageSize = 1000;
          const rows = [];
          let retryWithFallback = false;
          for (let offset = 0; ; offset += pageSize) {
            const { data, error } = await supabase
              .from(table)
              .select(selectors[selectorIndex])
              .range(offset, offset + pageSize - 1);
            if (error) {
              if (isMissingColumnError(error) && selectorIndex < selectors.length - 1) {
                retryWithFallback = true;
                break;
              }
              const backupError = new Error(`Unable to include ${table} in the backup: ${error.message}`);
              backupError.code = error.code;
              throw backupError;
            }
            if (Array.isArray(data)) rows.push(...data);
            if (!Array.isArray(data) || data.length < pageSize) break;
          }
          if (!retryWithFallback) return rows;
        }
        throw new Error(`Unable to include ${table} in the backup: no compatible columns were found.`);
      };
      const fetchOptionalRows = async (table) => {
        try {
          return await fetchAllRows(table);
        } catch (error) {
          if (['PGRST205', '42P01'].includes(error.code)) return null;
          throw error;
        }
      };

      const [
        students,
        violations,
        records,
        teachers,
        advisers,
        admins,
        activity_logs,
        calendar_events,
        school_events,
        meetings,
        sms_logs,
        student_locations
      ] = await Promise.all([
        fetchAllRows('students'),
        fetchAllRows('violations'),
        fetchAllRows('records'),
        fetchAllRows('teachers', [
          'id,fname,mname,lname,email,position,department,specialization,contact,gender,image',
          'id,fname,mname,lname,email,position,department,contact,image'
        ]),
        fetchAllRows('advisers'),
        fetchAllRows('admins', 'id,fname,mname,lname,email,role,position,contact,image'),
        fetchAllRows('activity_logs'),
        fetchOptionalRows('calendar_events'),
        fetchOptionalRows('school_events'),
        fetchOptionalRows('meetings'),
        fetchOptionalRows('sms_logs'),
        fetchOptionalRows('student_locations')
      ]);
      collections = {
        students,
        violations,
        records,
        teachers: teachers.map(({ password: _password, ...profile }) => profile),
        advisers,
        admins: admins.map(({ password: _password, ...profile }) => profile),
        activity_logs
      };
      const remoteSchoolEvents = calendar_events ?? school_events;
      collections.school_events = remoteSchoolEvents ?? await this.getSchoolEvents(true);
      if (meetings) collections.meetings = meetings;
      if (sms_logs) collections.sms_logs = sms_logs;
      if (student_locations) collections.student_locations = student_locations;
    } else {
      const [students, violations, records, teachers, advisers, admins, activity_logs, school_events] = await Promise.all([
        this.getStudents(true),
        this.getViolations(true),
        this.getRecords(true),
        this.getTeachers(true),
        this.getAdvisers(true),
        this.getAdmins(true),
        this.getActivityLogs(true),
        this.getSchoolEvents(true)
      ]);
      collections = {
        students,
        violations,
        records,
        teachers: teachers.map(({ password: _password, ...profile }) => profile),
        advisers,
        admins: admins.map(({ password: _password, ...profile }) => profile),
        activity_logs,
        school_events,
        meetings: getStored('meetings', []),
        sms_logs: getStored('sms_logs', []),
        student_locations: students.flatMap(student => (
          student.id ? getStored(`locations_${student.id}`, []) : []
        ))
      };
    }

    const data = normalizeBackupCollections({ data: collections });

    const snapshot = {
      system: 'VioTrack Disciplinary System',
      version: '2.5.0',
      backup_id: backupId,
      type: type, // 'manual' | 'scheduled_daily' | 'scheduled_weekly'
      created_at: timestamp,
      created_by: this.getCurrentUser().name || 'System Admin',
      counts: {
        students: data.students.length,
        violations: data.violations.length,
        records: data.records.length,
        teachers: data.teachers.length,
        advisers: data.advisers.length,
        admins: data.admins.length,
        activity_logs: data.activity_logs.length
      },
      data
    };

    // Store in backup snapshots registry
    const existingSnapshots = this.getBackupHistory();
    const updatedSnapshots = [
      {
        id: backupId,
        type,
        created_at: timestamp,
        created_by: snapshot.created_by,
        counts: snapshot.counts,
        size_kb: Math.round(JSON.stringify(snapshot).length / 1024),
        snapshot
      },
      ...existingSnapshots.slice(0, 19)
    ];

    try {
      localStorage.setItem('viotrack_backup_snapshots', JSON.stringify(updatedSnapshots));
    } catch (e) {
      console.warn('Local storage quota warning on backup snapshot save:', e);
    }

    // Log the backup operation in the audit trail
    await this.addActivityLog(
      'Database Backup Created',
      `Full system snapshot generated (${snapshot.counts.records} violation records, ${snapshot.counts.students} students) [${type.toUpperCase()}]`
    );

    return snapshot;
  },

  getBackupHistory() {
    try {
      const saved = localStorage.getItem('viotrack_backup_snapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  },

  deleteBackupSnapshot(snapshotId) {
    try {
      const current = this.getBackupHistory();
      const filtered = current.filter(b => b.id !== snapshotId);
      localStorage.setItem('viotrack_backup_snapshots', JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  },

  async restoreDatabase(snapshotPayload) {
    const data = normalizeBackupCollections(snapshotPayload);
    const { backup_id, created_at } = snapshotPayload;
    const oldLocalStudentIds = getStored('students', [])
      .map(student => student.id)
      .filter(id => id != null);

    if (isSupabaseConfigured()) {
      const batchSize = 500;
      const failOnDatabaseError = (table, action, error) => {
        if (error) {
          const restoreError = new Error(`Unable to ${action} ${table} during restore: ${error.message}`);
          restoreError.code = error.code;
          throw restoreError;
        }
      };
      const deleteRows = async (table) => {
        const { error } = await supabase.from(table).delete().not('id', 'is', null);
        failOnDatabaseError(table, 'clear', error);
      };
      const insertRows = async (table, rows) => {
        for (let offset = 0; offset < rows.length; offset += batchSize) {
          let batch = rows.slice(offset, offset + batchSize);
          for (let attempt = 0; attempt < 20; attempt += 1) {
            const { error } = await supabase.from(table).insert(batch);
            if (!error) break;
            if (!isMissingColumnError(error)) {
              failOnDatabaseError(table, 'restore', error);
            }
            const missingColumn = getMissingColumn(error);
            if (!missingColumn || !batch.some(row => Object.prototype.hasOwnProperty.call(row, missingColumn))) {
              failOnDatabaseError(table, 'restore', error);
            }
            batch = batch.map(row => {
              const copy = { ...row };
              delete copy[missingColumn];
              return copy;
            });
            if (attempt === 19) failOnDatabaseError(table, 'restore', error);
          }
        }
      };
      const restoreStaffProfiles = async (table, rows) => {
        for (const { password: _password, ...profile } of rows) {
          const { id, email, created_at: _createdAt, ...updates } = profile;
          if (id == null && !email) {
            throw new Error(`Cannot restore ${table} profile without an account ID or email address.`);
          }
          let fields = updates;
          let updated = null;
          for (let attempt = 0; attempt < 20; attempt += 1) {
            let query = supabase.from(table).update(fields);
            query = email ? query.eq('email', email) : query.eq('id', id);
            const response = await query.select('id');
            if (!response.error) {
              updated = response.data;
              break;
            }
            if (!isMissingColumnError(response.error)) {
              failOnDatabaseError(table, 'restore profiles in', response.error);
            }
            const missingColumn = getMissingColumn(response.error);
            if (!missingColumn || !Object.prototype.hasOwnProperty.call(fields, missingColumn)) {
              failOnDatabaseError(table, 'restore profiles in', response.error);
            }
            fields = { ...fields };
            delete fields[missingColumn];
            if (attempt === 19) failOnDatabaseError(table, 'restore profiles in', response.error);
          }
          if (!updated?.length) {
            throw new Error(`Cannot restore ${table} profile "${email || id}": the account no longer exists. Backups do not contain login credentials.`);
          }
        }
      };
      const readOptionalRows = async (table) => {
        const rows = [];
        const pageSize = 1000;
        for (let offset = 0; ; offset += pageSize) {
          const { data: page, error } = await supabase
            .from(table)
            .select('*')
            .range(offset, offset + pageSize - 1);
          if (error) {
            if (['PGRST205', '42P01'].includes(error.code)) return null;
            throw new Error(`Unable to preserve ${table} during restore: ${error.message}`);
          }
          if (Array.isArray(page)) rows.push(...page);
          if (!Array.isArray(page) || page.length < pageSize) return rows;
        }
      };

      // Restore non-destructive account profile fields before replacing dependent data.
      if (data.teachers) await restoreStaffProfiles('teachers', data.teachers);
      if (data.admins) await restoreStaffProfiles('admins', data.admins);

      const preservedRelations = {};
      for (const key of ['meetings', 'sms_logs', 'student_locations']) {
        if (!Object.prototype.hasOwnProperty.call(data, key)) {
          preservedRelations[key] = await readOptionalRows(key);
        }
      }

      const relationRows = key => (
        Object.prototype.hasOwnProperty.call(data, key) ? data[key] : preservedRelations[key]
      );
      const studentsToRestore = data.students;
      const recordsToRestore = data.records;
      const studentIds = new Set(studentsToRestore.map(student => String(student.id)));
      const recordIds = new Set(recordsToRestore.map(record => String(record.id)));
      const validRelatedRows = {
        meetings: (relationRows('meetings') || []).filter(row => (
          studentIds.has(String(row.student_id)) && recordIds.has(String(row.record_id))
        )),
        sms_logs: (relationRows('sms_logs') || []).filter(row => (
          studentIds.has(String(row.student_id))
          && (row.record_id == null || recordIds.has(String(row.record_id)))
        )),
        student_locations: (relationRows('student_locations') || []).filter(row => (
          studentIds.has(String(row.student_id))
        ))
      };

      for (const key of ['meetings', 'sms_logs', 'student_locations']) {
        if (relationRows(key) !== null) await deleteRows(key);
      }
      if (data.records) await deleteRows('records');
      if (data.advisers) await deleteRows('advisers');
      if (data.activity_logs) await deleteRows('activity_logs');
      if (data.students) await deleteRows('students');
      if (data.violations) await deleteRows('violations');

      if (data.students) await insertRows('students', data.students);
      if (data.violations) await insertRows('violations', data.violations);
      if (data.advisers) await insertRows('advisers', data.advisers);
      if (data.records) await insertRows('records', data.records);
      for (const key of ['meetings', 'sms_logs', 'student_locations']) {
        if (relationRows(key) !== null) await insertRows(key, validRelatedRows[key]);
      }
      if (data.activity_logs) await insertRows('activity_logs', data.activity_logs);
      let restoreSchoolEventsLocally = false;
      if (data.school_events) {
        try {
          await deleteRows('calendar_events');
          await insertRows('calendar_events', data.school_events);
        } catch (error) {
          if (!['PGRST205', '42P01'].includes(error.code)) throw error;
          try {
            await deleteRows('school_events');
            await insertRows('school_events', data.school_events);
          } catch (schoolEventsError) {
            if (!['PGRST205', '42P01'].includes(schoolEventsError.code)) throw schoolEventsError;
            restoreSchoolEventsLocally = true;
          }
        }
      }

      [
        'students',
        'violations',
        'records',
        'teachers',
        'advisers',
        'admins',
        'activity_logs',
        'school_events',
        'meetings',
        'sms_logs'
      ].forEach(key => localStorage.removeItem(`viotrack_${key}`));
      oldLocalStudentIds.forEach(studentId => {
        localStorage.removeItem(`viotrack_locations_${studentId}`);
      });
      if (restoreSchoolEventsLocally) {
        localStorage.setItem('viotrack_school_events', JSON.stringify(data.school_events));
      }
    } else {
      const restoreLocalStaff = (key, rows) => {
        if (!rows) return null;
        const existing = getStored(key, []);
        return rows.map(row => {
          const current = existing.find(item => (
            (row.id != null && String(item.id) === String(row.id))
            || (row.email && String(item.email).toLowerCase() === String(row.email).toLowerCase())
          ));
          const password = row.password ?? current?.password;
          return password === undefined ? row : { ...row, password };
        });
      };
      if (data.teachers) data.teachers = restoreLocalStaff('teachers', data.teachers);
      if (data.admins) data.admins = restoreLocalStaff('admins', data.admins);
      const { student_locations, ...collectionsToStore } = data;
      Object.entries(collectionsToStore).forEach(([key, rows]) => {
        localStorage.setItem(`viotrack_${key}`, JSON.stringify(rows));
      });
      if (student_locations) {
        oldLocalStudentIds.forEach(studentId => {
          localStorage.removeItem(`viotrack_locations_${studentId}`);
        });
        const locationsByStudent = new Map();
        student_locations.forEach(location => {
          const key = String(location.student_id);
          locationsByStudent.set(key, [...(locationsByStudent.get(key) || []), location]);
        });
        locationsByStudent.forEach((locations, studentId) => {
          localStorage.setItem(`viotrack_locations_${studentId}`, JSON.stringify(locations));
        });
      }
    }

    // Clear memory caches so fresh data is loaded
    invalidateCache();

    // Log the restore event into audit logs
    await this.addActivityLog(
      'Database Restored',
      `Restored database from snapshot ${backup_id || 'manual upload'} created on ${new Date(created_at || Date.now()).toLocaleDateString()}`
    );

    // Notify all listeners
    window.dispatchEvent(new CustomEvent('viotrack_data_updated'));
    return true;
  },

  getBackupScheduleSettings() {
    try {
      const saved = localStorage.getItem('viotrack_backup_schedule');
      return saved ? JSON.parse(saved) : {
        auto_backup_enabled: true,
        frequency: 'daily', // 'daily' | 'weekly'
        time: '00:00',
        last_run: new Date(Date.now() - 86400000).toISOString()
      };
    } catch {
      return { auto_backup_enabled: true, frequency: 'daily', time: '00:00', last_run: null };
    }
  },

  saveBackupScheduleSettings(settings) {
    try {
      localStorage.setItem('viotrack_backup_schedule', JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  },

  async checkAndRunScheduledBackup() {
    try {
      const settings = this.getBackupScheduleSettings();
      if (!settings.auto_backup_enabled) return false;

      const now = Date.now();
      const lastRun = settings.last_run ? new Date(settings.last_run).getTime() : 0;
      const intervalMs = settings.frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

      if (now - lastRun >= intervalMs) {
        console.log('[AutoBackup] Triggering scheduled database snapshot...');
        await this.createDatabaseBackup(`scheduled_${settings.frequency || 'daily'}`);
        settings.last_run = new Date(now).toISOString();
        this.saveBackupScheduleSettings(settings);
        return true;
      }
    } catch (err) {
      console.warn('[AutoBackup] Background check error:', err);
    }
    return false;
  },

  // --- DATA RESET & SYNC UTILITIES ---
  resetRecordsToDefault() {
    try {
      localStorage.removeItem('viotrack_records');
      invalidateCache('records');
      window.dispatchEvent(new CustomEvent('viotrack_data_updated'));
      return true;
    } catch {
      return false;
    }
  },

  resetAllData() {
    try {
      [
        'students',
        'violations',
        'records',
        'teachers',
        'advisers',
        'admins',
        'activity_logs',
        'school_events'
      ].forEach(k => localStorage.removeItem(`viotrack_${k}`));
      invalidateCache();
      window.dispatchEvent(new CustomEvent('viotrack_data_updated'));
      return true;
    } catch {
      return false;
    }
  }
};
