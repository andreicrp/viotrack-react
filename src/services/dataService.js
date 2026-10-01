import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  { id: 1, fname: 'System', lname: 'Admin', email: 'admin@viotrack.edu', role: 'Super Admin', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
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
    sanction: 'Restitution',
    remarks: 'Graffiti tagging on back classroom wooden desk.',
    resolution_notes: '',
    resolution_date: null,
    sms_notified: false
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

// High-Performance In-Memory Cache for 10,000+ Items
const _memoryCache = {
  students: null,
  studentsTimestamp: 0,
  violations: null,
  violationsTimestamp: 0,
  teachers: null,
  teachersTimestamp: 0,
  advisers: null,
  advisersTimestamp: 0,
  records: null,
  recordsTimestamp: 0,
  TTL: 30000 // 30-second hot cache
};

const invalidateCache = (key) => {
  if (key) {
    _memoryCache[key] = null;
    _memoryCache[`${key}Timestamp`] = 0;
  } else {
    Object.keys(_memoryCache).forEach(k => {
      if (k !== 'TTL') _memoryCache[k] = null;
    });
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
    // If browser localStorage quota (5MB) is exceeded, log warning and rely on in-memory cache
    console.warn(`LocalStorage quota exceeded or write failed for ${key}, falling back to memory cache:`, err);
  }
};

export const dataService = {
  // --- USER CONTEXT HELPER ---
  getCurrentUser() {
    try {
      const saved = localStorage.getItem('viotrack_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.name) return parsed;
      }
    } catch {}
    return { name: 'System Admin', role: 'admin' };
  },

  invalidateCache,

  // --- STUDENTS ---
  async getStudents(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _memoryCache.students && (now - _memoryCache.studentsTimestamp < _memoryCache.TTL)) {
      return _memoryCache.students;
    }

    let list = [];
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('students').select('*').order('lname', { ascending: true });
      if (!error && data && data.length > 0) list = data;
    }
    if (!list || list.length === 0) {
      list = getStored('students', INITIAL_STUDENTS);
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

    _memoryCache.students = processed;
    _memoryCache.studentsTimestamp = now;
    return processed;
  },

  async addStudent(student) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('students').insert([student]).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase addStudent error:', err);
      }
    }
    if (!result) {
      const current = getStored('students', INITIAL_STUDENTS);
      result = { ...student, id: Date.now(), created_at: new Date().toISOString() };
      const updated = [result, ...current];
      setStored('students', updated);
    }
    invalidateCache('students');
    invalidateCache('records');
    await this.addActivityLog('Add Student', `Enrolled student ${student.fname} ${student.lname} (${student.lrn || 'No LRN'}, ${student.grade || ''} ${student.section || ''})`);
    return result;
  },

  async updateStudent(id, updates) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('students').update(updates).eq('id', id).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase updateStudent error:', err);
      }
    }
    const current = getStored('students', INITIAL_STUDENTS);
    const updated = current.map(s => (s.id === Number(id) ? { ...s, ...updates } : s));
    setStored('students', updated);
    if (!result) result = updated.find(s => s.id === Number(id));
    invalidateCache('students');
    invalidateCache('records');
    const name = updates.fname || updates.lname ? `${updates.fname || ''} ${updates.lname || ''}`.trim() : `ID #${id}`;
    await this.addActivityLog('Update Student', `Updated profile information for student ${name}`);
    return result;
  },

  async deleteStudent(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('students').delete().eq('id', id);
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
    return true;
  },

  // --- VIOLATIONS CATEGORIES ---
  async getViolations(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _memoryCache.violations && (now - _memoryCache.violationsTimestamp < _memoryCache.TTL)) {
      return _memoryCache.violations;
    }

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
    _memoryCache.violations = result;
    _memoryCache.violationsTimestamp = now;
    return result;
  },

  async addViolationType(violation) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('violations').insert([violation]).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase addViolationType error:', err);
      }
    }
    const current = getStored('violations', INITIAL_VIOLATIONS);
    if (!result) {
      result = { ...violation, id: Date.now() };
    }
    const updated = [...current, result];
    setStored('violations', updated);
    invalidateCache('violations');
    await this.addActivityLog('Add Violation Category', `Created category "${violation.title}" (${violation.type || 'Minor'})`);
    return result;
  },

  async updateViolationType(id, updates) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('violations').update(updates).eq('id', id).select();
        if (!error && data?.[0]) result = data[0];
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
    return result;
  },

  async deleteViolationType(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('violations').delete().eq('id', id);
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
    return true;
  },

  // --- RECORDS / INCIDENTS ---
  async getRecords(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _memoryCache.records && (now - _memoryCache.recordsTimestamp < _memoryCache.TTL)) {
      return _memoryCache.records;
    }

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
        const mapped = data.map(r => ({
          ...r,
          student: r.students,
          violation: r.violations
        }));
        _memoryCache.records = mapped;
        _memoryCache.recordsTimestamp = now;
        return mapped;
      }
    }
    const records = getStored('records', INITIAL_RECORDS);
    const students = await this.getStudents();
    const violations = await this.getViolations();

    // Instant O(1) Hash Map Indexing for 10,000+ scaling
    const studentMap = new Map(students.map(s => [Number(s.id), s]));
    const violationMap = new Map(violations.map(v => [Number(v.id), v]));

    const mapped = records.map(r => ({
      ...r,
      student: studentMap.get(Number(r.student_id)),
      violation: violationMap.get(Number(r.violation_id))
    }));

    _memoryCache.records = mapped;
    _memoryCache.recordsTimestamp = now;
    return mapped;
  },

  async addRecord(record) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('records').insert([record]).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase addRecord error:', err);
      }
    }
    const current = getStored('records', INITIAL_RECORDS);
    if (!result) {
      result = {
        ...record,
        id: Date.now(),
        date_reported: new Date().toISOString(),
        status: record.status || 'Pending'
      };
    }
    const updated = [result, ...current];
    setStored('records', updated);
    invalidateCache('records');

    // Identify student & violation details for clear log entry
    let studentLabel = `Student ID #${record.student_id}`;
    try {
      const students = getStored('students', INITIAL_STUDENTS);
      const matchedStudent = students.find(s => s.id === Number(record.student_id));
      if (matchedStudent) {
        studentLabel = `${matchedStudent.fname} ${matchedStudent.lname} (${matchedStudent.grade} - ${matchedStudent.section})`;
      }
    } catch {}

    let violationLabel = record.violation_title || `Violation ID #${record.violation_id}`;
    try {
      const violations = getStored('violations', INITIAL_VIOLATIONS);
      const matchedV = violations.find(v => v.id === Number(record.violation_id));
      if (matchedV) {
        violationLabel = `${matchedV.title} [${matchedV.type}]`;
      }
    } catch {}

    await this.addActivityLog('Add Violation', `Logged incident "${violationLabel}" for ${studentLabel}`);
    return result;
  },

  async updateRecordStatus(id, { status, resolution_notes, sanction }) {
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
        const { data, error } = await supabase.from('records').update(payload).eq('id', id).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase updateRecordStatus error:', err);
      }
    }
    const current = getStored('records', INITIAL_RECORDS);
    const updated = current.map(r => (r.id === Number(id) ? { ...r, ...payload } : r));
    setStored('records', updated);
    invalidateCache('records');
    if (!result) result = updated.find(r => r.id === Number(id));

    const sanctionSuffix = sanction ? ` | Sanction: ${sanction}` : '';
    await this.addActivityLog('Status Update', `Marked Incident #${id} as "${status}"${sanctionSuffix}`);
    return result;
  },

  async deleteRecord(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('records').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteRecord error:', err);
      }
    }
    const current = getStored('records', INITIAL_RECORDS);
    const updated = current.filter(r => r.id !== Number(id));
    setStored('records', updated);
    invalidateCache('records');
    await this.addActivityLog('Delete Record', `Removed violation record #${id}`);
    return true;
  },

  // --- TEACHERS & ADVISERS ---
  async getTeachers(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && _memoryCache.teachers && (now - _memoryCache.teachersTimestamp < _memoryCache.TTL)) {
      return _memoryCache.teachers;
    }

    let list = null;
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('teachers').select('*').order('lname', { ascending: true });
      if (!error && data && data.length > 0) list = data;
    }
    if (!list) list = getStored('teachers', INITIAL_TEACHERS);
    _memoryCache.teachers = list;
    _memoryCache.teachersTimestamp = now;
    return list;
  },

  async addTeacher(teacher) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('teachers').insert([teacher]).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase addTeacher error:', err);
      }
    }
    const current = getStored('teachers', INITIAL_TEACHERS);
    if (!result) {
      result = { ...teacher, id: Date.now() };
    }
    const updated = [result, ...current];
    setStored('teachers', updated);
    invalidateCache('teachers');
    invalidateCache('advisers');
    await this.addActivityLog('Add Teacher', `Registered faculty member ${teacher.fname} ${teacher.lname} (${teacher.position || 'Teacher'}, ${teacher.department || 'General'})`);
    return result;
  },

  async updateTeacher(id, updates) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('teachers').update(updates).eq('id', id).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase updateTeacher error:', err);
      }
    }
    const current = getStored('teachers', INITIAL_TEACHERS);
    const updated = current.map(t => (t.id === Number(id) ? { ...t, ...updates } : t));
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
        await supabase.from('teachers').delete().eq('id', id);
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
    if (!forceRefresh && _memoryCache.advisers && (now - _memoryCache.advisersTimestamp < _memoryCache.TTL)) {
      return _memoryCache.advisers;
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('advisers').select('*, teachers(*)');
      if (!error && data) {
        const mapped = data.map(a => ({
          ...a,
          teacher: a.teachers
        }));
        _memoryCache.advisers = mapped;
        _memoryCache.advisersTimestamp = now;
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
    _memoryCache.advisers = mapped;
    _memoryCache.advisersTimestamp = now;
    return mapped;
  },

  async saveAdviserAssignment(teacher_id, grade_level, class_section) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('advisers').upsert({ teacher_id, grade_level, class_section });
      } catch (err) {
        console.warn('Supabase saveAdviserAssignment error:', err);
      }
    }
    let current = getStored('advisers', INITIAL_ADVISERS);
    current = current.filter(a => !(a.grade_level === grade_level && a.class_section === class_section));
    current.push({ id: Date.now(), teacher_id: Number(teacher_id), grade_level, class_section });
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
        await supabase.from('advisers').delete().eq('id', id);
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
  async getAdmins() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('admins').select('*');
      if (!error && data && data.length > 0) return data;
    }
    return getStored('admins', INITIAL_ADMINS);
  },

  async addAdmin(admin) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('admins').insert([admin]).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase addAdmin error:', err);
      }
    }
    const current = getStored('admins', INITIAL_ADMINS);
    if (!result) {
      result = { ...admin, id: Date.now() };
    }
    const updated = [result, ...current];
    setStored('admins', updated);
    await this.addActivityLog('Add Admin', `Created administrator account for ${admin.fname} ${admin.lname} (${admin.role || 'Admin'})`);
    return result;
  },

  async updateAdmin(id, updates) {
    let result = null;
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('admins').update(updates).eq('id', id).select();
        if (!error && data?.[0]) result = data[0];
      } catch (err) {
        console.warn('Supabase updateAdmin error:', err);
      }
    }
    const current = getStored('admins', INITIAL_ADMINS);
    const updated = current.map(a => (a.id === Number(id) ? { ...a, ...updates } : a));
    setStored('admins', updated);
    if (!result) result = updated.find(a => a.id === Number(id));
    await this.addActivityLog('Update Admin', `Updated admin profile for ${updates.fname || ''} ${updates.lname || ''} (${updates.role || 'Admin'})`);
    return result;
  },

  async deleteAdmin(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('admins').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteAdmin error:', err);
      }
    }
    const current = getStored('admins', INITIAL_ADMINS);
    const target = current.find(a => a.id === Number(id));
    const name = target ? `${target.fname} ${target.lname}` : `ID #${id}`;
    const updated = current.filter(a => a.id !== Number(id));
    setStored('admins', updated);
    await this.addActivityLog('Delete Admin', `Removed administrator account for ${name}`);
    return true;
  },

  // --- ACTIVITY LOGS ---
  async getActivityLogs() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(100);
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getActivityLogs error:', err);
      }
    }
    return getStored('activity_logs', INITIAL_LOGS);
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
  async getSchoolEvents() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('school_events').select('*').order('date', { ascending: true });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase getSchoolEvents error:', err);
      }
    }
    const current = getStored('school_events', null);
    if (!current || current.length === 0) {
      setStored('school_events', INITIAL_SCHOOL_EVENTS);
      return INITIAL_SCHOOL_EVENTS;
    }
    return current;
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
    await this.addActivityLog('Delete Event', `Removed calendar event "${title}"`);
    try {
      window.dispatchEvent(new CustomEvent('viotrack_events_updated', { detail: { id } }));
    } catch {}
    return true;
  },

  // --- SMS TRIGGER ---
  async sendSMS(studentContact, recipientName, studentName, violationTitle) {
    const message = `[VioTrack Alert] Dear ${recipientName || 'Parent/Guardian'}, this is to inform you that ${studentName} has received a record for: ${violationTitle}. Please contact the school guidance office for details.`;
    await this.addActivityLog('SMS Sent', `Notification dispatched to ${studentContact} (${recipientName || 'Parent'}) for student ${studentName}`);
    return { success: true, message };
  }
};
