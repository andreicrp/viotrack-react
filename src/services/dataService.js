import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { smsService } from './smsService';
import { broadcastRecordChange, startMutation, endMutation } from '../utils/dataIntegrity';

// Initial Mock Seed Data
const INITIAL_STUDENTS = [
  {
    id: 1,
    lrn: '109283746101',
    fname: 'Alexander',
    mname: 'Cruz',
    lname: 'Mendoza',
    grade: 'Grade 10',
    section: 'Rizal',
    academicyear: '2025-2026',
    gender: 'Male',
    contact: '09151112233',
    parent_name: 'Carlos Mendoza',
    parent_contact: '09151112234',
    address: '124 Rizal St, Sampaloc, Manila',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 2,
    lrn: '109283746102',
    fname: 'Sophia',
    mname: 'Grace',
    lname: 'Villanueva',
    grade: 'Grade 10',
    section: 'Rizal',
    academicyear: '2025-2026',
    gender: 'Female',
    contact: '09152223344',
    parent_name: 'Lorena Villanueva',
    parent_contact: '09152223345',
    address: '45 Mabini Ave, Quezon City',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 3,
    lrn: '109283746103',
    fname: 'Gabriel',
    mname: 'Luis',
    lname: 'Torres',
    grade: 'Grade 10',
    section: 'Bonifacio',
    academicyear: '2025-2026',
    gender: 'Male',
    contact: '09153334455',
    parent_name: 'Ramon Torres',
    parent_contact: '09153334456',
    address: '88 Aurora Blvd, San Juan',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString()
  },
  {
    id: 4,
    lrn: '109283746104',
    fname: 'Isabella',
    mname: 'Marie',
    lname: 'Ramos',
    grade: 'Grade 11',
    section: 'STEM A',
    academicyear: '2025-2026',
    gender: 'Female',
    contact: '09154445566',
    parent_name: 'Patricia Ramos',
    parent_contact: '09154445567',
    address: '73 Commonwealth Ave, QC',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString()
  },
  {
    id: 5,
    lrn: '109283746105',
    fname: 'Christian',
    mname: 'Paul',
    lname: 'Navarro',
    grade: 'Grade 11',
    section: 'STEM A',
    academicyear: '2025-2026',
    gender: 'Male',
    contact: '09155556677',
    parent_name: 'Dennis Navarro',
    parent_contact: '09155556678',
    address: '19 Espana Blvd, Manila',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 6,
    lrn: '109283746106',
    fname: 'Jasmine',
    mname: 'Rose',
    lname: 'Castillo',
    grade: 'Grade 9',
    section: 'Diamond',
    academicyear: '2025-2026',
    gender: 'Female',
    contact: '09156667788',
    parent_name: 'Lita Castillo',
    parent_contact: '09156667789',
    address: '210 Taft Avenue, Pasay',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

import INITIAL_VIOLATIONS from '../data/violations.json';

const INITIAL_TEACHERS = [
  { id: 1, fname: 'Juan', lname: 'Dela Cruz', email: 'juan.delacruz@viotrack.edu', position: 'Master Teacher I', department: 'Science Department', contact: '09171234567', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 2, fname: 'Elena', lname: 'Reyes', email: 'elena.reyes@viotrack.edu', position: 'Teacher III', department: 'Mathematics Department', contact: '09181234568', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { id: 3, fname: 'Roberto', lname: 'Aquino', email: 'roberto.aquino@viotrack.edu', position: 'Teacher II', department: 'English Department', contact: '09191234569', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' }
];

const INITIAL_ADVISERS = [
  { id: 1, teacher_id: 1, grade_level: 'Grade 10', class_section: 'Rizal' },
  { id: 2, teacher_id: 2, grade_level: 'Grade 10', class_section: 'Bonifacio' },
  { id: 3, teacher_id: 3, grade_level: 'Grade 11', class_section: 'STEM A' }
];

const INITIAL_ADMINS = [
  { id: 1, fname: 'System', lname: 'Admin', email: 'admin@viotrack.edu', role: 'Head Admin', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 2, fname: 'Maria', lname: 'Santos', email: 'maria.santos@viotrack.edu', role: 'Discipline Officer', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' }
];

const INITIAL_RECORDS = [
  {
    id: 1,
    student_id: 1,
    violation_id: 1,
    reported_by_name: 'Juan Dela Cruz',
    reported_by_type: 'teacher',
    date_reported: new Date(Date.now() - 2 * 86400000).toISOString(),
    status: 'Resolved',
    approval_status: 'Approved',
    approved_by: 'Sheryl Gamboa',
    approved_at: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    sanction: 'Verbal Warning',
    remarks: 'Forgot school necktie and ID lace during morning flag ceremony.',
    resolution_notes: 'Student complied the following day and signed acknowledgment with adviser.',
    resolution_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    sms_notified: true
  },
  {
    id: 2,
    student_id: 1,
    violation_id: 2,
    reported_by_name: 'System Admin',
    reported_by_type: 'admin',
    date_reported: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: 'Pending',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    sanction: '1 Hour Community Service',
    remarks: 'Arrived 40 minutes late without valid excuse slip from clinic/office.',
    resolution_notes: '',
    resolution_date: null,
    sms_notified: true
  },
  {
    id: 3,
    student_id: 3,
    violation_id: 4,
    reported_by_name: 'Elena Reyes',
    reported_by_type: 'teacher',
    date_reported: new Date(Date.now() - 1 * 86400000).toISOString(),
    status: 'Investigation',
    approval_status: 'Approved',
    approved_by: 'Sheryl Gamboa',
    approved_at: new Date(Date.now() - 1 * 86400000 + 7200000).toISOString(),
    sanction: 'Parent Conference',
    remarks: 'Involved in verbal altercation with classmate near hallway lockers.',
    resolution_notes: 'Meeting with parent scheduled for Friday afternoon.',
    resolution_date: null,
    sms_notified: true
  },
  {
    id: 4,
    student_id: 4,
    violation_id: 3,
    reported_by_name: 'Roberto Aquino',
    reported_by_type: 'teacher',
    date_reported: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: 'Resolved',
    approval_status: 'Approved',
    approved_by: 'Sheryl Gamboa',
    approved_at: new Date(Date.now() - 3 * 86400000 + 1800000).toISOString(),
    sanction: 'Confiscation',
    remarks: 'Playing mobile games during Chemistry class period.',
    resolution_notes: 'Device returned to guardian at end of school week.',
    resolution_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    sms_notified: true
  },
  {
    id: 5,
    student_id: 5,
    violation_id: 5,
    reported_by_name: 'System Admin',
    reported_by_type: 'admin',
    date_reported: new Date(Date.now() - 4 * 86400000).toISOString(),
    status: 'Pending',
    approval_status: 'Approved',
    approved_by: 'System Admin',
    approved_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    sanction: 'Restitution',
    remarks: 'Graffiti tagging on back classroom wooden desk.',
    resolution_notes: '',
    resolution_date: null,
    sms_notified: false
  },
  {
    id: 6,
    student_id: 2,
    violation_id: 4,
    reported_by_name: 'Elena Reyes',
    reported_by_type: 'teacher',
    date_reported: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'Under Approval',
    approval_status: 'Under Approval',
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    sanction: '1st Conference & Counseling',
    remarks: 'Caught loitering and cutting 3rd period English class behind the gym pavilion.',
    resolution_notes: '',
    resolution_date: null,
    sms_notified: true
  },
  {
    id: 7,
    student_id: 6,
    violation_id: 1,
    reported_by_name: 'Roberto Aquino',
    reported_by_type: 'teacher',
    date_reported: new Date(Date.now() - 5 * 3600000).toISOString(),
    status: 'Under Approval',
    approval_status: 'Under Approval',
    approved_by: null,
    approved_at: null,
    rejection_reason: null,
    sanction: 'Verbal Warning',
    remarks: 'No school uniform and unauthorized civilian clothing without clinic permission slip.',
    resolution_notes: '',
    resolution_date: null,
    sms_notified: true
  }
];

const INITIAL_LOGS = [
  { id: 1, user_name: 'System Admin', user_role: 'admin', action: 'Login', details: 'User authenticated from web interface', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, user_name: 'Juan Dela Cruz', user_role: 'teacher', action: 'Add Violation', details: 'Logged Minor violation for Alexander Mendoza', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, user_name: 'System Admin', user_role: 'admin', action: 'Status Update', details: 'Marked Record #1 as Resolved', created_at: new Date(Date.now() - 18000000).toISOString() }
];

const INITIAL_SCHOOL_EVENTS = [
  {
    id: 1,
    title: 'Faculty General Assembly',
    date: '2026-09-24',
    time: '09:00 AM – 11:00 AM',
    location: 'Main Auditorium / Hall A',
    category: 'faculty',
    categoryLabel: 'Faculty Meeting',
    color: '#10b981',
    description: 'Monthly institutional coordination meeting with Class Advisers, Guidance Counselors, and Academic Chairs.',
    attendees: 'All Faculty & Staff'
  },
  {
    id: 2,
    title: 'Submission of Disciplinary & Attendance Reports',
    date: '2026-09-30',
    time: '01:00 PM – 03:00 PM',
    location: 'Discipline Office / Room 204',
    category: 'disciplinary',
    categoryLabel: 'Disciplinary',
    color: '#ef4444',
    description: 'Submission deadline for Monthly Conduct Summary, unresolved major infraction dossiers, and adviser referrals.',
    attendees: 'Class Advisers & Prefects'
  },
  {
    id: 3,
    title: 'Student Conduct & Values Re-orientation',
    date: '2026-09-15',
    time: '10:00 AM – 12:00 PM',
    location: 'AVR 1 (Audio-Visual Room)',
    category: 'disciplinary',
    categoryLabel: 'Disciplinary',
    color: '#ef4444',
    description: 'Orientation session for students with repeat minor infractions focusing on campus policies and restorative guidelines.',
    attendees: 'Referred Students & Guardians'
  },
  {
    id: 4,
    title: 'First Quarter Examination Week',
    date: '2026-09-18',
    time: '08:00 AM – 04:00 PM',
    location: 'All Classrooms',
    category: 'academic',
    categoryLabel: 'Academic',
    color: '#07345f',
    description: 'Quarterly examinations covering all core subject areas for Junior and Senior High School levels.',
    attendees: 'All Enrolled Students'
  },
  {
    id: 5,
    title: 'Parents-Teachers Disciplinary Council (PTDC)',
    date: '2026-09-26',
    time: '02:00 PM – 04:30 PM',
    location: 'Conference Hall B',
    category: 'faculty',
    categoryLabel: 'Faculty Meeting',
    color: '#10b981',
    description: 'Quarterly consultative meeting with PTA representatives on campus security and student wellness protocols.',
    attendees: 'PTA Officers & Admin Council'
  },
  {
    id: 6,
    title: 'Midterm Grade Submission & Review',
    date: '2026-10-05',
    time: '08:00 AM – 05:00 PM',
    location: 'Registrar & Faculty Portals',
    category: 'academic',
    categoryLabel: 'Academic',
    color: '#07345f',
    description: 'Faculty portal deadline for uploading preliminary midterm evaluations.',
    attendees: 'All Teaching Personnel'
  },
  {
    id: 7,
    title: 'National Teachers Day Celebration',
    date: '2026-10-05',
    time: '01:00 PM – 05:00 PM',
    location: 'School Gymnasium',
    category: 'activity',
    categoryLabel: 'School Event',
    color: '#8b5cf6',
    description: 'Campus-wide recognition program honoring educator service and outstanding advisory leadership.',
    attendees: 'Faculty, Students, Admin'
  },
  {
    id: 8,
    title: 'Student Leaders Disciplinary Workshop',
    date: '2026-10-14',
    time: '09:00 AM – 02:00 PM',
    location: 'Student Activity Center',
    category: 'disciplinary',
    categoryLabel: 'Disciplinary',
    color: '#ef4444',
    description: 'Leadership training on peer mediation, bullying prevention, and violation reporting workflows.',
    attendees: 'SSG & Club Officers'
  },
  {
    id: 9,
    title: 'School Foundation Week Opening',
    date: '2026-10-22',
    time: '07:30 AM – 04:30 PM',
    location: 'Campus Grounds',
    category: 'activity',
    categoryLabel: 'School Event',
    color: '#8b5cf6',
    description: 'Annual institutional foundation anniversary festivities, sports matches, and cultural exhibits.',
    attendees: 'Entire Academic Community'
  }
];

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
          if (!error && data && data.length > 0) remoteList = data;
        } catch (e) {
          console.warn('Supabase getStudents notice:', e);
        }
      }

      const localList = getStored('students', INITIAL_STUDENTS);
      let list = [];

      if (remoteList && remoteList.length > 0) {
        const remoteLrnMap = new Map(remoteList.map(s => [String(s.lrn || '').toLowerCase(), s]));
        const mergedRemote = remoteList.map(rs => {
          const ls = localList.find(l => String(l.lrn || '').toLowerCase() === String(rs.lrn || '').toLowerCase() || l.id === rs.id);
          return ls ? { ...ls, ...rs, password: rs.password || ls.password } : rs;
        });
        const extraLocal = localList.filter(ls => ls.lrn && !remoteLrnMap.has(String(ls.lrn).toLowerCase()));
        list = [...mergedRemote, ...extraLocal];
      } else {
        list = localList;
      }

      const maleAvatars = [
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
      ];
      const femaleAvatars = [
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
      ];

      const initialMap = new Map(INITIAL_STUDENTS.map(init => [init.id, init]));
      const processed = list.map(s => {
        if (s.image && !s.image.includes('ui-avatars.com')) return s;
        const seed = initialMap.get(s.id);
        if (seed?.image) return { ...s, image: seed.image };
        const pool = (s.gender || '').toLowerCase() === 'female' ? femaleAvatars : maleAvatars;
        const assignedImage = pool[(s.id || 1) % pool.length];
        return { ...s, image: assignedImage };
      });

      _cache.data.students = processed;
      _cache.timestamps.students = Date.now();
      return processed;
    });
  },

  async addStudent(student) {
    startMutation();
    try {
      let result = null;
      const cleanStudent = {
        lrn: String(student.lrn || '').trim(),
        fname: String(student.fname || '').trim(),
        mname: String(student.mname || '').trim(),
        lname: String(student.lname || '').trim(),
        email: String(student.email || '').trim().toLowerCase(),
        grade: String(student.grade || '').trim(),
        section: String(student.section || '').trim(),
        academicyear: String(student.academicyear || '2025-2026').trim(),
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
          const { data, error } = await supabase.from('students').insert([cleanStudent]).select();
          if (!error && data?.[0]) {
            result = data[0];
          } else if (error) {
            console.error('Supabase addStudent error:', error);
          }
        } catch (err) {
          console.warn('Supabase addStudent error:', err);
        }
      }
      if (!result) {
        const current = getStored('students', INITIAL_STUDENTS);
        result = { ...cleanStudent, id: Date.now(), created_at: new Date().toISOString() };
        const updated = [result, ...current];
        setStored('students', updated);
      }
      invalidateCache('students');
      invalidateCache('records');
      await this.addActivityLog('Add Student', `Enrolled student ${cleanStudent.fname} ${cleanStudent.lname} (${cleanStudent.lrn || 'No Student ID'}, ${cleanStudent.grade || ''} ${cleanStudent.section || ''})`);
      broadcastRecordChange('create', 'student', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async updateStudent(id, updates) {
    startMutation();
    try {
      let result = null;
      const cleanUpdates = {};
      const allowed = ['lrn', 'fname', 'mname', 'lname', 'email', 'grade', 'section', 'academicyear', 'gender', 'contact', 'parent_name', 'parent_contact', 'address', 'password', 'image'];
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
          const { data, error } = await supabase.from('students').update(cleanUpdates).eq('id', Number(id)).select();
          if (!error && data?.[0]) {
            result = data[0];
          } else if (error) {
            console.error('Supabase updateStudent error:', error);
          }
        } catch (err) {
          console.warn('Supabase updateStudent error:', err);
        }
      }
      const current = getStored('students', INITIAL_STUDENTS);
      const updated = current.map(s => (s.id === Number(id) ? { ...s, ...cleanUpdates } : s));
      setStored('students', updated);
      if (!result) result = updated.find(s => s.id === Number(id));
      invalidateCache('students');
      invalidateCache('records');
      const name = updates.fname || updates.lname ? `${updates.fname || ''} ${updates.lname || ''}`.trim() : `ID #${id}`;
      await this.addActivityLog('Update Student', `Updated profile information for student ${name}`);
      broadcastRecordChange('update', 'student', result);
      return result;
    } finally {
      endMutation();
    }
  },

  async deleteStudent(id) {
    startMutation();
    try {
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase.from('students').delete().eq('id', Number(id));
          if (error) console.error('Supabase deleteStudent error:', error);
        } catch (err) {
          console.warn('Supabase deleteStudent error:', err);
        }
      }
      const current = getStored('students', INITIAL_STUDENTS);
      const target = current.find(s => s.id === Number(id));
      const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
      const updated = current.filter(s => s.id !== Number(id));
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
      _cache.data.violations = result;
      _cache.timestamps.violations = Date.now();
      return result;
    });
  },

  async addViolationType(violation) {
    let result = null;
    const cleanViolation = {
      title: String(violation.title || '').trim(),
      description: String(violation.description || '').trim(),
      type: String(violation.type || 'Minor').trim(),
      default_sanction: String(violation.default_sanction || '').trim()
    };

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
    const current = getStored('violations', INITIAL_VIOLATIONS);
    if (!result) {
      result = { ...cleanViolation, id: Date.now(), created_at: new Date().toISOString() };
    }
    const updated = [...current, result];
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
      let mappedRecords = null;
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase
          .from('records')
          .select(`
            *,
            students (*),
            violations (*)
          `)
          .order('id', { ascending: false });
        if (!error && data) {
          mappedRecords = data.map(r => {
            const isTeacher = (r.reported_by_type === 'teacher');
            let resolvedApproval = r.approval_status;
            if (!resolvedApproval) {
              if (r.status === 'Under Approval' || r.status === 'Rejected') {
                resolvedApproval = r.status;
              } else if (r.approved_by) {
                resolvedApproval = 'Approved';
              } else if (isTeacher || !r.approved_by) {
                resolvedApproval = 'Under Approval';
              } else {
                resolvedApproval = 'Approved';
              }
            }
            return {
              ...r,
              approval_status: resolvedApproval,
              student: r.students,
              violation: r.violations
            };
          });
        }
      }

      if (!mappedRecords) {
        let records = getStored('records', INITIAL_RECORDS);
        if (!records.some(r => r.approval_status === 'Under Approval' || r.status === 'Under Approval')) {
          const underApprovalInitials = INITIAL_RECORDS.filter(r => r.approval_status === 'Under Approval' || r.status === 'Under Approval');
          if (underApprovalInitials.length > 0) {
            records = [...underApprovalInitials, ...records];
            setStored('records', records);
          }
        }

        const [students, violations] = await Promise.all([
          this.getStudents(),
          this.getViolations()
        ]);

        const studentMap = new Map(students.map(s => [Number(s.id), s]));
        const violationMap = new Map(violations.map(v => [Number(v.id), v]));

        mappedRecords = records.map(r => {
          const isTeacher = (r.reported_by_type === 'teacher');
          let resolvedApproval = r.approval_status;
          if (!resolvedApproval) {
            if (r.status === 'Under Approval' || r.status === 'Rejected') {
              resolvedApproval = r.status;
            } else if (r.approved_by) {
              resolvedApproval = 'Approved';
            } else if (isTeacher || !r.approved_by) {
              resolvedApproval = 'Under Approval';
            } else {
              resolvedApproval = 'Approved';
            }
          }
          return {
            ...r,
            approval_status: resolvedApproval,
            student: studentMap.get(Number(r.student_id)),
            violation: violationMap.get(Number(r.violation_id))
          };
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
      let list = [];

      if (remoteList && remoteList.length > 0) {
        const remoteEmailMap = new Map(remoteList.map(t => [String(t.email || '').toLowerCase(), t]));
        const mergedRemote = remoteList.map(rt => {
          const lt = localList.find(l => String(l.email || '').toLowerCase() === String(rt.email || '').toLowerCase() || l.id === rt.id);
          return lt ? { ...lt, ...rt, password: rt.password || lt.password } : rt;
        });
        const extraLocal = localList.filter(lt => lt.email && !remoteEmailMap.has(String(lt.email).toLowerCase()));
        list = [...mergedRemote, ...extraLocal];
      } else {
        list = localList;
      }

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
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('teachers').delete().eq('id', Number(id));
        if (error) console.error('Supabase deleteTeacher error:', error);
      } catch (err) {
        console.warn('Supabase deleteTeacher error:', err);
      }
    }
    const current = getStored('teachers', INITIAL_TEACHERS);
    const target = current.find(t => t.id === Number(id));
    const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
    const updated = current.filter(t => t.id !== Number(id));
    setStored('teachers', updated);
    invalidateCache('teachers');
    invalidateCache('advisers');
    await this.addActivityLog('Delete Teacher', `Removed faculty member ${name}`);
    return true;
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
      let list = [];

      if (remoteList && remoteList.length > 0) {
        const remoteEmailMap = new Map(remoteList.map(a => [String(a.email || '').toLowerCase(), a]));
        const mergedRemote = remoteList.map(ra => {
          const la = localList.find(l => String(l.email || '').toLowerCase() === String(ra.email || '').toLowerCase() || l.id === ra.id);
          return la ? { ...la, ...ra, password: ra.password || la.password } : ra;
        });
        const extraLocal = localList.filter(la => la.email && !remoteEmailMap.has(String(la.email).toLowerCase()));
        list = [...mergedRemote, ...extraLocal];
      } else {
        list = localList;
      }

      _cache.data.admins = list;
      _cache.timestamps.admins = Date.now();
      return list;
    });
  },

  async addAdmin(admin) {
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
        const { data, error } = await supabase.from('admins').insert([supabasePayload]).select();
        if (!error && data?.[0]) {
          result = { ...cleanAdmin, ...data[0] };
        } else if (error) {
          console.warn('Supabase addAdmin notice:', error.message || error);
        }
      } catch (err) {
        console.warn('Supabase addAdmin error:', err);
      }
    }
    const current = getStored('admins', INITIAL_ADMINS);
    if (!result) {
      result = { ...cleanAdmin, id: Date.now(), created_at: new Date().toISOString() };
    }
    const updated = [result, ...current.filter(a => a.email !== cleanAdmin.email)];
    setStored('admins', updated);
    invalidateCache('admins');
    await this.addActivityLog('Add Admin', `Created administrator account for ${cleanAdmin.fname} ${cleanAdmin.lname} (${cleanAdmin.role})`);
    return result;
  },

  async updateAdmin(id, updates) {
    let result = null;
    const cleanUpdates = {};
    const allowed = ['fname', 'mname', 'lname', 'email', 'role', 'position', 'password', 'image'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        if (key === 'password' && !String(updates[key]).trim()) {
          // Skip empty password update to prevent wiping existing password
          continue;
        }
        cleanUpdates[key] = updates[key];
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('admins').update(cleanUpdates).eq('id', Number(id)).select();
        if (!error && data?.[0]) result = data[0];
        else if (error) console.error('Supabase updateAdmin error:', error);
      } catch (err) {
        console.warn('Supabase updateAdmin error:', err);
      }
    }
    const current = getStored('admins', INITIAL_ADMINS);
    const updated = current.map(a => (a.id === Number(id) ? { ...a, ...cleanUpdates } : a));
    setStored('admins', updated);
    invalidateCache('admins');
    if (!result) result = updated.find(a => a.id === Number(id));
    await this.addActivityLog('Update Admin', `Updated admin profile for ${updates.fname || ''} ${updates.lname || ''} (${updates.role || 'Admin'})`);
    return result;
  },

  async deleteAdmin(id) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('admins').delete().eq('id', Number(id));
        if (error) console.error('Supabase deleteAdmin error:', error);
      } catch (err) {
        console.warn('Supabase deleteAdmin error:', err);
      }
    }
    const current = getStored('admins', INITIAL_ADMINS);
    const target = current.find(a => a.id === Number(id));
    const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
    const updated = current.filter(a => a.id !== Number(id));
    setStored('admins', updated);
    invalidateCache('admins');
    await this.addActivityLog('Delete Admin', `Removed administrator account for ${name}`);
    return true;
  },

  // --- ACTIVITY LOGS ---
  async getActivityLogs(forceRefresh = false) {
    const now = Date.now();
    const cached = _cache.data.activity_logs;
    const cacheAge = now - _cache.timestamps.activity_logs;

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.FRESH_TTL) {
      return cached;
    }

    if (!forceRefresh && cached && cacheAge < CACHE_CONFIG.STALE_TTL) {
      this.getActivityLogs(true).catch(() => {});
      return cached;
    }

    return executeWithDeduplication('activity_logs', async () => {
      let list = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(100);
          if (!error && data && data.length > 0) list = data;
        } catch (err) {
          console.warn('Supabase getActivityLogs error:', err);
        }
      }
      if (!list) list = getStored('activity_logs', INITIAL_LOGS);
      _cache.data.activity_logs = list;
      _cache.timestamps.activity_logs = Date.now();
      return list;
    });
  },

  async addActivityLog(action, details, userName, userRole) {
    const activeUser = this.getCurrentUser();
    const finalUserName = userName || activeUser.name || 'System Admin';
    const finalUserRole = userRole || activeUser.role || 'admin';

    const newLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      user_name: finalUserName,
      user_role: finalUserRole,
      action,
      details,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('activity_logs').insert([newLog]);
      } catch (err) {
        console.warn('Supabase activity log insert error:', err);
      }
    }
    const current = getStored('activity_logs', INITIAL_LOGS);
    const updated = [newLog, ...current.slice(0, 199)];
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
      let list = null;
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('school_events').select('*').order('date', { ascending: true });
          if (!error && data && data.length > 0) list = data;
        } catch (err) {
          console.warn('Supabase getSchoolEvents error:', err);
        }
      }
      if (!list) {
        const current = getStored('school_events', null);
        if (!current || current.length === 0) {
          setStored('school_events', INITIAL_SCHOOL_EVENTS);
          list = INITIAL_SCHOOL_EVENTS;
        } else {
          list = current;
        }
      }
      _cache.data.school_events = list;
      _cache.timestamps.school_events = Date.now();
      return list;
    });
  },

  async addSchoolEvent(event) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('school_events').insert([event]).select();
        if (!error && data?.[0]) result = data[0];
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
        await supabase.from('school_events').delete().eq('id', id);
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
