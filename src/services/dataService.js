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

// Local Storage Helper
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
    console.warn('LocalStorage save failed', err);
  }
};

export const dataService = {
  // --- STUDENTS ---
  async getStudents() {
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
    return list.map(s => {
      if (s.image && !s.image.includes('ui-avatars.com')) return s;
      const seed = INITIAL_STUDENTS.find(init => init.id === s.id || init.lrn === s.lrn);
      if (seed?.image) return { ...s, image: seed.image };
      const pool = (s.gender || '').toLowerCase() === 'female' ? femaleAvatars : maleAvatars;
      const assignedImage = pool[(s.id || 1) % pool.length];
      return { ...s, image: assignedImage };
    });
  },

  async addStudent(student) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('students').insert([student]).select();
      if (!error && data?.[0]) return data[0];
    }
    const current = getStored('students', INITIAL_STUDENTS);
    const newStudent = { ...student, id: Date.now(), created_at: new Date().toISOString() };
    const updated = [newStudent, ...current];
    setStored('students', updated);
    this.addActivityLog('Add Student', `Registered student ${student.fname} ${student.lname} (${student.lrn})`);
    return newStudent;
  },

  async updateStudent(id, updates) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('students').update(updates).eq('id', id).select();
      if (!error && data?.[0]) return data[0];
    }
    const current = getStored('students', INITIAL_STUDENTS);
    const updated = current.map(s => (s.id === Number(id) ? { ...s, ...updates } : s));
    setStored('students', updated);
    this.addActivityLog('Update Student', `Updated information for student ID #${id}`);
    return updated.find(s => s.id === Number(id));
  },

  async deleteStudent(id) {
    if (isSupabaseConfigured()) {
      await supabase.from('students').delete().eq('id', id);
    }
    const current = getStored('students', INITIAL_STUDENTS);
    const updated = current.filter(s => s.id !== Number(id));
    setStored('students', updated);
    this.addActivityLog('Delete Student', `Removed student record ID #${id}`);
    return true;
  },

  // --- VIOLATIONS ---
  async getViolations() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('violations').select('*').order('type', { ascending: true });
      if (!error && data && data.length > 0) return data;
    }
    const stored = getStored('violations', null);
    if (!stored || stored.length < INITIAL_VIOLATIONS.length) {
      setStored('violations', INITIAL_VIOLATIONS);
      return INITIAL_VIOLATIONS;
    }
    return stored;
  },

  async addViolationType(violation) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('violations').insert([violation]).select();
      if (!error && data?.[0]) return data[0];
    }
    const current = getStored('violations', INITIAL_VIOLATIONS);
    const newViolation = { ...violation, id: Date.now() };
    const updated = [...current, newViolation];
    setStored('violations', updated);
    this.addActivityLog('Add Violation Category', `Created category: ${violation.title}`);
    return newViolation;
  },

  // --- RECORDS ---
  async getRecords() {
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
        return data.map(r => ({
          ...r,
          student: r.students,
          violation: r.violations
        }));
      }
    }
    const records = getStored('records', INITIAL_RECORDS);
    const students = await this.getStudents();
    const violations = await this.getViolations();

    return records.map(r => ({
      ...r,
      student: students.find(s => s.id === r.student_id),
      violation: violations.find(v => v.id === r.violation_id)
    }));
  },

  async addRecord(record) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('records').insert([record]).select();
      if (!error && data?.[0]) return data[0];
    }
    const current = getStored('records', INITIAL_RECORDS);
    const newRecord = {
      ...record,
      id: Date.now(),
      date_reported: new Date().toISOString(),
      status: record.status || 'Pending'
    };
    const updated = [newRecord, ...current];
    setStored('records', updated);
    this.addActivityLog('Record Incident', `Logged violation record for Student ID #${record.student_id}`);
    return newRecord;
  },

  async updateRecordStatus(id, { status, resolution_notes, sanction }) {
    const isResolved = status === 'Resolved';
    const payload = {
      status,
      resolution_notes: resolution_notes || '',
      sanction: sanction || '',
      resolution_date: isResolved ? new Date().toISOString() : null
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('records').update(payload).eq('id', id).select();
      if (!error && data?.[0]) return data[0];
    }
    const current = getStored('records', INITIAL_RECORDS);
    const updated = current.map(r => (r.id === Number(id) ? { ...r, ...payload } : r));
    setStored('records', updated);
    this.addActivityLog('Status Update', `Updated Incident #${id} status to [${status}]`);
    return updated.find(r => r.id === Number(id));
  },

  async deleteRecord(id) {
    if (isSupabaseConfigured()) {
      await supabase.from('records').delete().eq('id', id);
    }
    const current = getStored('records', INITIAL_RECORDS);
    const updated = current.filter(r => r.id !== Number(id));
    setStored('records', updated);
    this.addActivityLog('Delete Record', `Deleted violation record #${id}`);
    return true;
  },

  // --- TEACHERS & ADVISERS ---
  async getTeachers() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('teachers').select('*').order('lname', { ascending: true });
      if (!error && data) return data;
    }
    return getStored('teachers', INITIAL_TEACHERS);
  },

  async getAdvisers() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('advisers').select('*, teachers(*)');
      if (!error && data) {
        return data.map(a => ({
          ...a,
          teacher: a.teachers
        }));
      }
    }
    const advisers = getStored('advisers', INITIAL_ADVISERS);
    const teachers = getStored('teachers', INITIAL_TEACHERS);
    return advisers.map(a => ({
      ...a,
      teacher: teachers.find(t => t.id === a.teacher_id)
    }));
  },

  async saveAdviserAssignment(teacher_id, grade_level, class_section) {
    if (isSupabaseConfigured()) {
      await supabase.from('advisers').upsert({ teacher_id, grade_level, class_section });
    }
    let current = getStored('advisers', INITIAL_ADVISERS);
    current = current.filter(a => !(a.grade_level === grade_level && a.class_section === class_section));
    current.push({ id: Date.now(), teacher_id: Number(teacher_id), grade_level, class_section });
    setStored('advisers', current);
    this.addActivityLog('Adviser Assigned', `Assigned teacher #${teacher_id} to ${grade_level} - ${class_section}`);
    return true;
  },

  async removeAdviser(id) {
    if (isSupabaseConfigured()) {
      await supabase.from('advisers').delete().eq('id', id);
    }
    const current = getStored('advisers', INITIAL_ADVISERS);
    const updated = current.filter(a => a.id !== Number(id));
    setStored('advisers', updated);
    this.addActivityLog('Adviser Removed', `Removed adviser assignment #${id}`);
    return true;
  },


  // --- ADMIN USERS ---
  async getAdmins() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('admins').select('*');
      if (!error && data) return data;
    }
    return getStored('admins', INITIAL_ADMINS);
  },

  // --- ACTIVITY LOGS ---
  async getActivityLogs() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('activity_logs').select('*').order('id', { ascending: false }).limit(50);
      if (!error && data) return data;
    }
    return getStored('activity_logs', INITIAL_LOGS);
  },

  async addActivityLog(action, details, userName = 'Current User', userRole = 'admin') {
    const newLog = {
      id: Date.now(),
      user_name: userName,
      user_role: userRole,
      action,
      details,
      created_at: new Date().toISOString()
    };
    if (isSupabaseConfigured()) {
      await supabase.from('activity_logs').insert([newLog]);
    }
    const current = getStored('activity_logs', INITIAL_LOGS);
    setStored('activity_logs', [newLog, ...current.slice(0, 49)]);
  },

  // --- SMS TRIGGER ---
  async sendSMS(studentContact, recipientName, studentName, violationTitle) {
    const message = `[VioTrack Alert] Dear ${recipientName || 'Parent/Guardian'}, this is to inform you that ${studentName} has received a record for: ${violationTitle}. Please contact the school guidance office for details.`;
    this.addActivityLog('SMS Sent', `Notification dispatched to ${studentContact} (${recipientName})`);
    return { success: true, message };
  }
};
