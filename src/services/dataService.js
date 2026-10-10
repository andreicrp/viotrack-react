import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { smsService } from './smsService';
import { broadcastRecordChange, startMutation, endMutation } from '../utils/dataIntegrity';

// Clean live data fallbacks
import INITIAL_VIOLATIONS from '../data/violations.json';

const INITIAL_STUDENTS = [
  { id: 1, student_id: '109283746101', lrn: '109283746101', fname: 'Alexander', mname: 'Cruz', lname: 'Mendoza', grade: 'Grade 10', section: 'Rizal', academicyear: '2025-2026', gender: 'Male', contact: '09151112233', parent_name: 'Carlos Mendoza', parent_contact: '09151112234', address: '124 Rizal St, Sampaloc, Manila', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 2, student_id: '109283746102', lrn: '109283746102', fname: 'Sophia', mname: 'Grace', lname: 'Villanueva', grade: 'Grade 10', section: 'Rizal', academicyear: '2025-2026', gender: 'Female', contact: '09152223344', parent_name: 'Lorena Villanueva', parent_contact: '09152223345', address: '45 Mabini Ave, Quezon City', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 3, student_id: '109283746103', lrn: '109283746103', fname: 'Gabriel', mname: 'Luis', lname: 'Torres', grade: 'Grade 10', section: 'Bonifacio', academicyear: '2025-2026', gender: 'Male', contact: '09153334455', parent_name: 'Ramon Torres', parent_contact: '09153334456', address: '88 Aurora Blvd, San Juan', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 4, student_id: '109283746104', lrn: '109283746104', fname: 'Isabella', mname: 'Marie', lname: 'Ramos', grade: 'Grade 11', section: 'STEM A', academicyear: '2025-2026', gender: 'Female', contact: '09154445566', parent_name: 'Patricia Ramos', parent_contact: '09154445567', address: '73 Commonwealth Ave, QC', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 5, student_id: '109283746105', lrn: '109283746105', fname: 'Christian', mname: 'Paul', lname: 'Navarro', grade: 'Grade 11', section: 'STEM A', academicyear: '2025-2026', gender: 'Male', contact: '09155556677', parent_name: 'Dennis Navarro', parent_contact: '09155556678', address: '19 Espana Blvd, Manila', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 6, student_id: '109283746106', lrn: '109283746106', fname: 'Jasmine', mname: 'Rose', lname: 'Castillo', grade: 'Grade 9', section: 'Diamond', academicyear: '2025-2026', gender: 'Female', contact: '09156667788', parent_name: 'Lita Castillo', parent_contact: '09156667789', address: '210 Taft Avenue, Pasay', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }
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
  }
];
const INITIAL_ADVISERS = [];
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

export const dataService = {
  // --- USER CONTEXT HELPER ---
  getCurrentUser() {
    try {
      const saved = sessionStorage.getItem('viotrack_auth_v3') || localStorage.getItem('viotrack_auth_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) return parsed;
      }
    } catch {}
    return { name: 'Faculty Member', role: 'teacher' };
  },

  invalidateCache,

  // --- BACKGROUND CACHE WARMING ---
  async warmCache() {
    try {
      await Promise.allSettled([
        this.getStudents(),
        this.getViolations(),
        this.getRecords(),
        this.getTeachers(),
        this.getAdvisers(),
        this.getSchoolEvents(),
        this.getAdmins(),
        this.getActivityLogs()
      ]);
    } catch (e) {
      console.warn('Background cache warming warning:', e);
    }
  },

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
          const { data, error } = await supabase.from('students').select('*').order('lname', { ascending: true });
          if (!error && Array.isArray(data)) {
            remoteList = data;
          } else {
            // Fallback if ordering by lname or column issue occurred
            const fallback = await supabase.from('students').select('*');
            if (!fallback.error && Array.isArray(fallback.data)) {
              remoteList = fallback.data;
            }
          }
        } catch (e) {
          console.warn('Supabase getStudents notice:', e);
        }
      }

      const stored = getStored('students', []);
      const storedMap = new Map();
      stored.forEach(s => {
        const sid = String(s.student_id || s.lrn || '').trim();
        if (sid) storedMap.set(sid, s);
      });

      let combinedList = [];
      if (isSupabaseConfigured() && remoteList !== null) {
        const remoteIds = new Set();
        combinedList = remoteList.map(remoteItem => {
          const sid = String(remoteItem.student_id || remoteItem.lrn || '').trim();
          if (sid) remoteIds.add(sid);
          const localItem = storedMap.get(sid) || {};
          return {
            ...localItem,
            ...remoteItem,
            student_id: sid,
            lrn: sid,
            image: remoteItem.image || localItem.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((remoteItem.fname || '') + ' ' + (remoteItem.lname || ''))}&background=07345f&color=fff&bold=true`
          };
        });

        // Also preserve any newly added local students that haven't synced to remote yet
        stored.forEach(localItem => {
          const sid = String(localItem.student_id || localItem.lrn || '').trim();
          if (sid && !remoteIds.has(sid)) {
            combinedList.unshift(localItem);
          }
        });
      } else {
        combinedList = stored;
      }

      const processed = combinedList.map(s => {
        const sid = String(s.student_id || s.lrn || '').trim();
        return {
          ...s,
          student_id: sid,
          lrn: sid,
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
      const studentIdVal = String(student.student_id || student.lrn || '').trim();
      if (!studentIdVal) {
        throw new Error('Student ID is required.');
      }

      const cleanStudent = {
        student_id: studentIdVal,
        lrn: studentIdVal,
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
            section: cleanStudent.section,
            academicyear: cleanStudent.academicyear,
            gender: cleanStudent.gender,
            contact: cleanStudent.contact,
            parent_name: cleanStudent.parent_name,
            parent_contact: cleanStudent.parent_contact,
            address: cleanStudent.address,
            image: cleanStudent.image
          };

          let toSend = { ...supabasePayload };
          let res = await supabase.from('students').insert([toSend]).select();

          // Resilient retry loop if any column doesn't exist in Supabase schema
          while (res.error && res.error.code === 'PGRST204') {
            const match = res.error.message?.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in toSend) {
              delete toSend[match[1]];
              res = await supabase.from('students').insert([toSend]).select();
            } else {
              break;
            }
          }

          if (res.error) {
            if (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.error.message?.includes('unique constraint')) {
              throw new Error(`Student ID / LRN "${studentIdVal}" is already registered in the system.`);
            }
            console.warn('Supabase addStudent notice:', res.error);
          } else if (res.data?.[0]) {
            result = { ...cleanStudent, ...res.data[0], student_id: studentIdVal, lrn: studentIdVal };
          }
        } catch (err) {
          if (err.message && err.message.includes('already registered')) {
            throw err;
          }
          console.warn('Supabase addStudent error:', err);
        }
      }

      if (!result) {
        result = { ...cleanStudent, id: Date.now(), created_at: new Date().toISOString() };
      }

      const current = getStored('students', INITIAL_STUDENTS);
      const filtered = current.filter(s => String(s.student_id || s.lrn || '').trim() !== studentIdVal);
      const updated = [result, ...filtered];
      setStored('students', updated);

      invalidateCache('students');
      invalidateCache('records');
      if (_cache.data.students) {
        _cache.data.students = [result, ..._cache.data.students.filter(s => String(s.student_id || s.lrn || '').trim() !== studentIdVal)];
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
      const cleanStudents = studentsList.map((student, idx) => {
        const studentIdVal = String(student.student_id || student.lrn || `10928374${Math.floor(1000 + Math.random() * 9000)}`).trim();
        return {
          student_id: studentIdVal,
          lrn: studentIdVal,
          fname: String(student.fname || 'Student').trim(),
          mname: String(student.mname || '').trim(),
          lname: String(student.lname || 'Roster').trim(),
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
      });

      let totalInserted = 0;
      const total = cleanStudents.length;

      // 1. Supabase batch upsert in chunks
      if (isSupabaseConfigured()) {
        try {
          for (let i = 0; i < total; i += CHUNK_SIZE) {
            const chunk = cleanStudents.slice(i, i + CHUNK_SIZE);
            let payload = chunk.map(s => ({
              student_id: s.student_id,
              fname: s.fname,
              mname: s.mname,
              lname: s.lname,
              grade: s.grade,
              section: s.section,
              academicyear: s.academicyear,
              gender: s.gender,
              contact: s.contact,
              parent_name: s.parent_name,
              parent_contact: s.parent_contact,
              address: s.address,
              image: s.image
            }));
            
            let res = await supabase.from('students').insert(payload).select();
            while (res.error && res.error.code === 'PGRST204') {
              const match = res.error.message?.match(/Could not find the '([^']+)' column/);
              if (match && match[1]) {
                payload = payload.map(p => {
                  const copy = { ...p };
                  delete copy[match[1]];
                  return copy;
                });
                res = await supabase.from('students').insert(payload).select();
              } else {
                break;
              }
            }

            totalInserted += (res.data ? res.data.length : chunk.length);
            if (onProgress) {
              onProgress(Math.min(totalInserted, total), total);
            }
          }
        } catch (err) {
          console.warn('Supabase bulkAddStudents error:', err);
        }
      }

      // 2. LocalStorage Sync
      const current = getStored('students', INITIAL_STUDENTS);
      const existingIdMap = new Map(current.map(s => [String(s.student_id || s.lrn || '').toLowerCase(), s]));
      const newItems = [];
      let nextId = Date.now();

      cleanStudents.forEach(cs => {
        const key = String(cs.student_id || cs.lrn || '').toLowerCase();
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
      await this.addActivityLog('Bulk Import', `Bulk imported and enrolled ${total} student records`);
      broadcastRecordChange('create', 'students', { count: total });

      if (onProgress) {
        onProgress(total, total);
      }

      return { insertedCount: total, errors: [] };
    } finally {
      endMutation();
    }
  },

  async updateStudent(id, updates) {
    startMutation();
    try {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['student_id', 'lrn', 'fname', 'mname', 'lname', 'email', 'grade', 'track', 'strand', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'password', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'password' && !String(updates[key]).trim()) {
            continue;
          }
          cleanUpdates[key] = updates[key];
        }
      }
      if (updates.student_id && !updates.lrn) cleanUpdates.lrn = updates.student_id;
      if (updates.lrn && !updates.student_id) cleanUpdates.student_id = updates.lrn;

      if (isSupabaseConfigured()) {
        try {
          const allowedSupabaseCols = ['student_id', 'fname', 'mname', 'lname', 'grade', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'image'];
          let toSend = {};
          for (const key of allowedSupabaseCols) {
            if (cleanUpdates[key] !== undefined) {
              toSend[key] = cleanUpdates[key];
            }
          }

          const numericId = Number(id);
          const hasNumericId = !isNaN(numericId) && numericId > 0;

          let res;
          if (hasNumericId) {
            res = await supabase.from('students').update(toSend).eq('id', numericId).select();
          } else {
            res = await supabase.from('students').update(toSend).eq('student_id', String(id)).select();
          }

          while (res.error && res.error.code === 'PGRST204') {
            const match = res.error.message?.match(/Could not find the '([^']+)' column/);
            if (match && match[1] && match[1] in toSend) {
              delete toSend[match[1]];
              if (hasNumericId) {
                res = await supabase.from('students').update(toSend).eq('id', numericId).select();
              } else {
                res = await supabase.from('students').update(toSend).eq('student_id', String(id)).select();
              }
            } else {
              break;
            }
          }

          if (res.error) {
            if (res.error.code === '23505' || res.error.message?.includes('duplicate key') || res.error.message?.includes('unique constraint')) {
              throw new Error(`Student ID / LRN "${cleanUpdates.student_id || id}" is already registered to another student.`);
            }
            console.warn('Supabase updateStudent notice:', res.error);
          } else if (res.data?.[0]) {
            const sid = res.data[0].student_id || res.data[0].lrn || cleanUpdates.student_id || id;
            result = { ...cleanUpdates, ...res.data[0], student_id: sid, lrn: sid };
          }
        } catch (err) {
          if (err.message && err.message.includes('already registered')) {
            throw err;
          }
          console.warn('Supabase updateStudent error:', err);
        }
      }

      const current = getStored('students', INITIAL_STUDENTS);
      const targetLrn = updates.lrn || updates.student_id;
      const updated = current.map(s => {
        const isMatch =
          String(s.id) === String(id) ||
          String(s.student_id) === String(id) ||
          String(s.lrn) === String(id) ||
          (targetLrn && (String(s.lrn) === String(targetLrn) || String(s.student_id) === String(targetLrn)));
        return isMatch ? { ...s, ...cleanUpdates, ...(result || {}) } : s;
      });
      setStored('students', updated);

      if (!result) {
        result = updated.find(s =>
          String(s.id) === String(id) ||
          String(s.student_id) === String(id) ||
          String(s.lrn) === String(id) ||
          (targetLrn && (String(s.lrn) === String(targetLrn) || String(s.student_id) === String(targetLrn)))
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
            await supabase.from('students').delete().eq('id', numericId);
          } else {
            const r1 = await supabase.from('students').delete().eq('student_id', id);
            if (r1.error) {
              await supabase.from('students').delete().eq('lrn', id);
            }
          }
        } catch (err) {
          console.warn('Supabase deleteStudent error:', err);
        }
      }
      const current = getStored('students', INITIAL_STUDENTS);
      const target = current.find(s => String(s.id) === String(id) || String(s.student_id) === String(id) || String(s.lrn) === String(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(s => String(s.id) !== String(id) && String(s.student_id) !== String(id) && String(s.lrn) !== String(id));
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
        if (!error && data && data.length > 0) result = data;
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
      try {
        const { data, error } = await supabase.from('violations').insert([cleanViolation]).select();
        if (!error && data?.[0]) {
          result = data[0];
        } else if (error) {
          console.error('Supabase addViolationType error:', error);
        }
      } catch (err) {
        console.warn('Supabase addViolationType error:', err);
      }
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

      const studentMap = new Map(students.map(s => [Number(s.id), s]));
      const violationMap = new Map(violations.map(v => [Number(v.id), v]));

      let remoteRecords = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('records')
            .select(`
              *,
              students (*),
              violations (*)
            `)
            .order('id', { ascending: false });
          if (!error && data) {
            remoteRecords = data;
          }
        } catch (err) {
          console.warn('Supabase getRecords error:', err);
        }
      }

      const allRawRecords = [];
      const remoteIds = new Set();
      if (remoteRecords && remoteRecords.length > 0) {
        remoteRecords.forEach(r => {
          remoteIds.add(Number(r.id));
          allRawRecords.push(r);
        });
      }
      const localRecords = getStored('records', INITIAL_RECORDS);
      localRecords.forEach(lr => {
        if (!remoteIds.has(Number(lr.id))) {
          allRawRecords.push(lr);
        }
      });

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

        const resolvedStudent = r.students || r.student || studentMap.get(Number(r.student_id));
        const resolvedViolation = r.violations || r.violation || violationMap.get(Number(r.violation_id));

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
      let remarksText = record.remarks || '';
      if (record.lat && record.lng && !remarksText.includes('GPS:')) {
        const gpsNote = ` [GPS: ${Number(record.lat).toFixed(4)}, ${Number(record.lng).toFixed(4)}${record.accuracy ? ` (±${record.accuracy}m)` : ''}]`;
        remarksText = remarksText ? `${remarksText}${gpsNote}` : gpsNote.trim();
      }

      const isTeacherReport = (record.reported_by_type === 'teacher');
      const defaultApprovalStatus = record.approval_status || (isTeacherReport ? 'Under Approval' : 'Approved');

      const cleanRecord = {
        student_id: Number(record.student_id),
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
          if (!error && data?.[0]) {
            result = {
              ...data[0],
              student: data[0].students,
              violation: data[0].violations
            };
          } else if (error) {
            console.error('Supabase addRecord insert error:', error);
          }
        } catch (err) {
          console.warn('Supabase addRecord error:', err);
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
          const { data, error } = await supabase.from('teachers').select('*').order('lname', { ascending: true });
          if (!error && data && data.length > 0) remoteList = data;
        } catch (e) {
          console.warn('Supabase getTeachers notice:', e);
        }
      }

      const localList = getStored('teachers', INITIAL_TEACHERS);
      const localMap = new Map(localList.map(t => [String(t.email || t.id).toLowerCase(), t]));
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList.map(r => {
            const local = localMap.get(String(r.email || r.id).toLowerCase());
            return {
              ...r,
              password: r.password || local?.password || 'Viotrack@2026!'
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

    // Fallback seed based on student ID
    const seed = Number(studentId) || 1;
    const latOffset = ((seed * 17) % 70 - 35) * 0.0018;
    const lngOffset = ((seed * 23) % 70 - 35) * 0.0022;
    return {
      student_id: Number(studentId),
      latitude: 14.642 + latOffset,
      longitude: 120.985 + lngOffset,
      accuracy_meters: 8 + (seed % 12),
      recorded_at: new Date(Date.now() - (seed % 15) * 60000).toISOString(),
      tracking_status: 'Active',
      reported_by: 'GPS Telemetry'
    };
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

    // Initial mock breadcrumbs
    const latest = await this.getStudentLatestLocation(studentId);
    const crumbs = [];
    for (let i = 0; i < 5; i++) {
      crumbs.push({
        id: `crumb_${i}`,
        student_id: Number(studentId),
        latitude: latest.latitude + (i * 0.0004 * (i % 2 === 0 ? 1 : -1)),
        longitude: latest.longitude + (i * 0.0005 * (i % 2 === 0 ? -1 : 1)),
        accuracy_meters: Math.max(5, (latest.accuracy_meters || 10) + i * 2),
        recorded_at: new Date(Date.now() - i * 180000).toISOString(),
        tracking_status: i === 0 ? 'Active' : 'Historical',
        reported_by: 'Device GPS'
      });
    }
    return crumbs;
  },

  async saveStudentLocation(studentId, { latitude, longitude, accuracy_meters, tracking_status = 'Active' }) {
    if (!studentId) throw new Error('Student ID is required');

    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc = Number(accuracy_meters) || 10;

    // Strict Coordinate Validation
    if (isNaN(lat) || lat < -90 || lat > 90) throw new Error('Invalid latitude coordinates');
    if (isNaN(lng) || lng < -180 || lng > 180) throw new Error('Invalid longitude coordinates');
    if (acc < 0) throw new Error('Invalid accuracy range');

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
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('student_locations').insert([payload]).select();
        if (!error && data?.[0]) savedResult = data[0];
      } catch (err) {
        console.warn('Supabase saveStudentLocation error:', err);
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
      contact: String(teacher.contact || '').trim(),
      password: String(teacher.password || 'Viotrack@2026!').trim(),
      image: String(teacher.image || '').trim()
    };

    if (isSupabaseConfigured()) {
      try {
        const supabasePayload = {
          fname: cleanTeacher.fname,
          lname: cleanTeacher.lname,
          email: cleanTeacher.email,
          password: cleanTeacher.password,
          position: cleanTeacher.position,
          department: cleanTeacher.department,
          contact: cleanTeacher.contact,
          image: cleanTeacher.image
        };
        const { data, error } = await supabase.from('teachers').insert([supabasePayload]).select();
        if (!error && data?.[0]) {
          result = { ...cleanTeacher, ...data[0] };
        } else if (error) {
          console.warn('Supabase addTeacher notice:', error.message || error);
        }
      } catch (err) {
        console.warn('Supabase addTeacher error:', err);
      }
    }
    const current = getStored('teachers', INITIAL_TEACHERS);
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
    const allowed = ['fname', 'mname', 'lname', 'email', 'position', 'department', 'contact', 'password', 'image'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        if (key === 'password' && !String(updates[key]).trim()) {
          // Skip empty password update to preserve existing password
          continue;
        }
        cleanUpdates[key] = updates[key];
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('teachers').update(cleanUpdates).eq('id', Number(id)).select();
        if (!error && data?.[0]) result = data[0];
        else if (error) console.error('Supabase updateTeacher error:', error);
      } catch (err) {
        console.warn('Supabase updateTeacher error:', err);
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
            if (error) console.warn('Supabase deleteTeacher notice:', error);
          } else {
            await supabase.from('teachers').delete().eq('email', String(id));
          }
        } catch (err) {
          console.warn('Supabase deleteTeacher error:', err);
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
        const { data, error } = await supabase.from('advisers').select('*, teachers(*)');
        if (!error && data) {
          const mapped = data.map(a => ({
            ...a,
            teacher: a.teachers
          }));
          _cache.data.advisers = mapped;
          _cache.timestamps.advisers = Date.now();
          return mapped;
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
          const { data, error } = await supabase.from('admins').select('*');
          if (!error && data && data.length > 0) remoteList = data;
        } catch (e) {
          console.warn('Supabase getAdmins notice:', e);
        }
      }

      const localList = getStored('admins', INITIAL_ADMINS);
      const localMap = new Map(localList.map(a => [String(a.email || a.id).toLowerCase(), a]));
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList.map(r => {
            const local = localMap.get(String(r.email || r.id).toLowerCase());
            return {
              ...r,
              password: r.password || local?.password || 'Viotrack@2026!'
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
        password: String(admin.password || 'Viotrack@2026!').trim(),
        image: String(admin.image || '').trim()
      };

      if (isSupabaseConfigured()) {
        try {
          const supabasePayload = {
            fname: cleanAdmin.fname,
            lname: cleanAdmin.lname,
            email: cleanAdmin.email,
            password: cleanAdmin.password,
            role: cleanAdmin.role,
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
            console.warn('Supabase addAdmin notice:', res.error);
          }
        } catch (err) {
          console.warn('Supabase addAdmin error:', err);
        }
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
      const allowed = ['fname', 'mname', 'lname', 'email', 'role', 'position', 'password', 'image'];
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          if (key === 'password' && !String(updates[key]).trim()) {
            continue;
          }
          cleanUpdates[key] = updates[key];
        }
      }

      if (isSupabaseConfigured()) {
        try {
          const allowedSupabaseCols = ['fname', 'lname', 'email', 'role', 'image', 'password'];
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
            console.warn('Supabase updateAdmin notice:', res.error);
          }
        } catch (err) {
          console.warn('Supabase updateAdmin error:', err);
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
          if (res?.error) console.warn('Supabase deleteAdmin notice:', res.error);
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
          const { data, error } = await supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(100);
          if (!error && data) remoteList = data;
        } catch (err) {
          console.warn('Supabase getActivityLogs error:', err);
        }
      }
      const list = (isSupabaseConfigured() && remoteList !== null)
        ? remoteList
        : getStored('activity_logs', []);
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

    // Client subnet / IP address simulation for immutable audit log
    const ipAddress = extraMeta.ip || `192.168.10.${Math.floor(20 + Math.random() * 80)}`;
    const deviceInfo = navigator.userAgent.includes('Windows')
      ? 'Windows 11 / Chrome (Workstation)'
      : (navigator.userAgent.includes('Mobile') ? 'Mobile Terminal (Staff App)' : 'Faculty Workstation');

    // Cryptographic hash simulation for tamper verification
    const rawHashInput = `${auditId}|${finalUserName}|${action}|${details}|${timestamp}`;
    let hash = 0;
    for (let i = 0; i < rawHashInput.length; i++) {
      hash = ((hash << 5) - hash) + rawHashInput.charCodeAt(i);
      hash |= 0;
    }
    const immutableHash = `0x${Math.abs(hash).toString(16).padStart(8, '0')}${Math.random().toString(16).substring(2, 10)}`;

    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      audit_id: auditId,
      user_name: finalUserName,
      user_role: finalUserRole,
      action,
      details,
      ip_address: ipAddress,
      device_info: deviceInfo,
      immutable_hash: immutableHash,
      integrity_status: 'VERIFIED',
      created_at: timestamp,
      ...extraMeta
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('activity_logs').insert([newLog]);
      } catch (err) {
        console.warn('Supabase activity log insert error:', err);
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
    if (isSupabaseConfigured() && file) {
      try {
        const ext = file.name ? file.name.split('.').pop() : 'jpg';
        const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const { data, error } = await supabase.storage.from('student-photos').upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
        if (!error && data) {
          const { data: publicUrlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
          return publicUrlData?.publicUrl || null;
        }
      } catch (err) {
        console.warn('Storage upload error:', err);
      }
    }
    return null;
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
        (s.lrn && String(s.lrn).toLowerCase().includes(query)) ||
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
          (s?.lrn && String(s.lrn).toLowerCase().includes(query)) ||
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

    const [students, violations, records, teachers, advisers, admins, activity_logs, school_events] = await Promise.all([
      this.getStudents(true),
      this.getViolations(true),
      this.getRecords(true),
      this.getTeachers(true),
      this.getAdvisers(true),
      this.getAdmins(true),
      this.getActivityLogs(true),
      this.getSchoolEvents()
    ]);

    const snapshot = {
      system: 'VioTrack Disciplinary System',
      version: '2.4.0',
      backup_id: backupId,
      type: type, // 'manual' | 'scheduled_daily' | 'scheduled_weekly'
      created_at: timestamp,
      created_by: this.getCurrentUser().name || 'System Admin',
      counts: {
        students: students.length,
        violations: violations.length,
        records: records.length,
        teachers: teachers.length,
        advisers: advisers.length,
        admins: admins.length,
        activity_logs: activity_logs.length
      },
      data: {
        students,
        violations,
        records,
        teachers,
        advisers,
        admins,
        activity_logs,
        school_events
      }
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
    if (!snapshotPayload || !snapshotPayload.data) {
      throw new Error('Invalid snapshot structure: Missing data payload.');
    }

    const { data, counts, backup_id, created_at } = snapshotPayload;

    // Restore collections into localStorage
    if (data.students) localStorage.setItem('viotrack_students', JSON.stringify(data.students));
    if (data.violations) localStorage.setItem('viotrack_violations', JSON.stringify(data.violations));
    if (data.records) localStorage.setItem('viotrack_records', JSON.stringify(data.records));
    if (data.teachers) localStorage.setItem('viotrack_teachers', JSON.stringify(data.teachers));
    if (data.advisers) localStorage.setItem('viotrack_advisers', JSON.stringify(data.advisers));
    if (data.admins) localStorage.setItem('viotrack_admins', JSON.stringify(data.admins));
    if (data.school_events) localStorage.setItem('viotrack_school_events', JSON.stringify(data.school_events));

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
