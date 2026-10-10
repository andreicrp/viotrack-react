import INITIAL_VIOLATIONS from '../../data/violations.json';

export { INITIAL_VIOLATIONS };

export const INITIAL_STUDENTS = [
  { id: 1, student_id: '109283746101', lrn: '109283746101', fname: 'Alexander', mname: 'Cruz', lname: 'Mendoza', grade: 'Grade 10', section: 'Rizal', academicyear: '2025-2026', gender: 'Male', contact: '09151112233', parent_name: 'Carlos Mendoza', parent_contact: '09151112234', address: '124 Rizal St, Sampaloc, Manila', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 2, student_id: '109283746102', lrn: '109283746102', fname: 'Sophia', mname: 'Grace', lname: 'Villanueva', grade: 'Grade 10', section: 'Rizal', academicyear: '2025-2026', gender: 'Female', contact: '09152223344', parent_name: 'Lorena Villanueva', parent_contact: '09152223345', address: '45 Mabini Ave, Quezon City', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' },
  { id: 3, student_id: '109283746103', lrn: '109283746103', fname: 'Gabriel', mname: 'Luis', lname: 'Torres', grade: 'Grade 10', section: 'Bonifacio', academicyear: '2025-2026', gender: 'Male', contact: '09153334455', parent_name: 'Ramon Torres', parent_contact: '09153334456', address: '88 Aurora Blvd, San Juan', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 4, student_id: '109283746104', lrn: '109283746104', fname: 'Isabella', mname: 'Marie', lname: 'Ramos', grade: 'Grade 11', section: 'STEM A', academicyear: '2025-2026', gender: 'Female', contact: '09154445566', parent_name: 'Patricia Ramos', parent_contact: '09154445567', address: '73 Commonwealth Ave, QC', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
  { id: 5, student_id: '109283746105', lrn: '109283746105', fname: 'Christian', mname: 'Paul', lname: 'Navarro', grade: 'Grade 11', section: 'STEM A', academicyear: '2025-2026', gender: 'Male', contact: '09155556677', parent_name: 'Dennis Navarro', parent_contact: '09155556678', address: '19 Espana Blvd, Manila', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
  { id: 6, student_id: '109283746106', lrn: '109283746106', fname: 'Jasmine', mname: 'Rose', lname: 'Castillo', grade: 'Grade 9', section: 'Diamond', academicyear: '2025-2026', gender: 'Female', contact: '09156667788', parent_name: 'Lita Castillo', parent_contact: '09156667789', address: '210 Taft Avenue, Pasay', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }
];

export const INITIAL_TEACHERS = [
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

export const INITIAL_ADVISERS = [
  { id: 1, teacher_id: 1, grade_level: 'Grade 10', class_section: 'Rizal' },
  { id: 2, teacher_id: 2, grade_level: 'Grade 10', class_section: 'Bonifacio' },
  { id: 3, teacher_id: 3, grade_level: 'Grade 11', class_section: 'STEM A' },
  { id: 4, teacher_id: 4, grade_level: 'Grade 9', class_section: 'Diamond' }
];

export const INITIAL_ADMINS = [
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

export const INITIAL_RECORDS = [
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

export const INITIAL_LOGS = [];

export const INITIAL_SCHOOL_EVENTS = [];
