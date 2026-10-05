import INITIAL_VIOLATIONS from '../../data/violations.json';

export { INITIAL_VIOLATIONS };

export const INITIAL_STUDENTS = [
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


export const INITIAL_TEACHERS = [
  { id: 1, fname: 'Juan', lname: 'Dela Cruz', email: 'juan.delacruz@viotrack.edu', position: 'Master Teacher I', department: 'Science Department', contact: '09171234567', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
  { id: 2, fname: 'Elena', lname: 'Reyes', email: 'elena.reyes@viotrack.edu', position: 'Teacher III', department: 'Mathematics Department', contact: '09181234568', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80' },
  { id: 3, fname: 'Roberto', lname: 'Aquino', email: 'roberto.aquino@viotrack.edu', position: 'Teacher II', department: 'English Department', contact: '09191234569', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' }
];

export const INITIAL_ADVISERS = [
  { id: 1, teacher_id: 1, grade_level: 'Grade 10', class_section: 'Rizal' },
  { id: 2, teacher_id: 2, grade_level: 'Grade 10', class_section: 'Bonifacio' },
  { id: 3, teacher_id: 3, grade_level: 'Grade 11', class_section: 'STEM A' }
];

export const INITIAL_ADMINS = [
  { id: 1, fname: 'System', lname: 'Admin', email: 'admin@viotrack.edu', role: 'Head Admin', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 2, fname: 'Maria', lname: 'Santos', email: 'maria.santos@viotrack.edu', role: 'Discipline Officer', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' }
];

export const getDynamicInitialRecords = () => {
  const now = Date.now();
  const dayMs = 86400000;
  const hourMs = 3600000;

  return [
    // --- TODAY'S INCIDENTS ---
    {
      id: 101,
      student_id: 1,
      violation_id: 2, // Late arrival
      reported_by_name: 'Juan Dela Cruz',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 8 * hourMs).toISOString(),
      status: 'Pending',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 7 * hourMs).toISOString(),
      sanction: '1 Hour Community Service',
      remarks: 'Arrived 25 minutes late during morning period without clinic pass.',
      resolution_notes: '',
      resolution_date: null,
      sms_notified: true
    },
    {
      id: 102,
      student_id: 4,
      violation_id: 3, // Mobile gadgets
      reported_by_name: 'Roberto Aquino',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 5 * hourMs).toISOString(),
      status: 'Pending',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 4 * hourMs).toISOString(),
      sanction: 'Temporary Confiscation',
      remarks: 'Using phone during science quiz without instructor permission.',
      resolution_notes: '',
      resolution_date: null,
      sms_notified: true
    },
    {
      id: 103,
      student_id: 5,
      violation_id: 1, // Leaving classroom messy
      reported_by_name: 'Elena Reyes',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 2 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 1.5 * hourMs).toISOString(),
      sanction: 'Classroom Cleanup',
      remarks: 'Left wrappers and plastic bottles underneath study desk.',
      resolution_notes: 'Student organized classroom area before dismissal.',
      resolution_date: new Date(now - 1 * hourMs).toISOString(),
      sms_notified: true
    },
    {
      id: 104,
      student_id: 3,
      violation_id: 6, // Cyberbullying / Serious
      reported_by_name: 'System Admin',
      reported_by_type: 'admin',
      date_reported: new Date(now - 30 * 60000).toISOString(),
      status: 'Investigation',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 20 * 60000).toISOString(),
      sanction: 'Faculty-Parent Conference',
      remarks: 'Posting disrespectful remarks about peers on social group chat.',
      resolution_notes: '',
      resolution_date: null,
      sms_notified: true
    },

    // --- YESTERDAY (DAY -1) ---
    {
      id: 105,
      student_id: 2,
      violation_id: 1,
      reported_by_name: 'Elena Reyes',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 1 * dayMs - 4 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 1 * dayMs - 2 * hourMs).toISOString(),
      sanction: 'Verbal Warning',
      remarks: 'Improper school uniform during assembly.',
      resolution_notes: 'Acknowledged and complied with adviser.',
      resolution_date: new Date(now - 1 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 106,
      student_id: 4,
      violation_id: 6,
      reported_by_name: 'Juan Dela Cruz',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 1 * dayMs - 6 * hourMs).toISOString(),
      status: 'Pending',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 1 * dayMs - 5 * hourMs).toISOString(),
      sanction: 'Adviser Consultation',
      remarks: 'Uncooperative during group classroom lab activity.',
      resolution_notes: '',
      resolution_date: null,
      sms_notified: true
    },

    // --- DAY -2 ---
    {
      id: 107,
      student_id: 3,
      violation_id: 7, // Major / Vandalism or Fight
      reported_by_name: 'System Admin',
      reported_by_type: 'admin',
      date_reported: new Date(now - 2 * dayMs - 3 * hourMs).toISOString(),
      status: 'Investigation',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 2 * dayMs - 2 * hourMs).toISOString(),
      sanction: 'Guidance Council Hearing',
      remarks: 'Severe physical scuffle near gymnasium bleachers.',
      resolution_notes: '',
      resolution_date: null,
      sms_notified: true
    },
    {
      id: 108,
      student_id: 1,
      violation_id: 1,
      reported_by_name: 'Roberto Aquino',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 2 * dayMs - 5 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 2 * dayMs - 4 * hourMs).toISOString(),
      sanction: 'Written Reprimand',
      remarks: 'Loitering in corridors during English period.',
      resolution_notes: 'Resolved with subject teacher.',
      resolution_date: new Date(now - 2 * dayMs).toISOString(),
      sms_notified: true
    },

    // --- DAY -3 to DAY -7 (Spread across the week) ---
    {
      id: 109,
      student_id: 5,
      violation_id: 2,
      reported_by_name: 'Elena Reyes',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 3 * dayMs - 4 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 3 * dayMs - 2 * hourMs).toISOString(),
      sanction: 'Tardiness Slip Issued',
      remarks: 'Late arrival to morning homeroom.',
      resolution_notes: 'Presented clinic slip.',
      resolution_date: new Date(now - 3 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 110,
      student_id: 4,
      violation_id: 1,
      reported_by_name: 'Juan Dela Cruz',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 4 * dayMs - 2 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 4 * dayMs - 1 * hourMs).toISOString(),
      sanction: 'Verbal Warning',
      remarks: 'Leaving books and trash on lab table.',
      resolution_notes: 'Cleaned area.',
      resolution_date: new Date(now - 4 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 111,
      student_id: 3,
      violation_id: 3,
      reported_by_name: 'Roberto Aquino',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 5 * dayMs - 5 * hourMs).toISOString(),
      status: 'Pending',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 5 * dayMs - 4 * hourMs).toISOString(),
      sanction: 'Parent Notification',
      remarks: 'Earphones worn during lecture recitation.',
      resolution_notes: '',
      resolution_date: null,
      sms_notified: true
    },
    {
      id: 112,
      student_id: 1,
      violation_id: 6,
      reported_by_name: 'Elena Reyes',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 6 * dayMs - 3 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 6 * dayMs - 2 * hourMs).toISOString(),
      sanction: 'Adviser Conference',
      remarks: 'Verbal dispute in hallway.',
      resolution_notes: 'Settled via mediation.',
      resolution_date: new Date(now - 5 * dayMs).toISOString(),
      sms_notified: true
    },

    // --- DAY -8 to DAY -25 (Distributed across the month) ---
    {
      id: 113,
      student_id: 4,
      violation_id: 1,
      reported_by_name: 'Juan Dela Cruz',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 8 * dayMs - 4 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 8 * dayMs - 3 * hourMs).toISOString(),
      sanction: 'Verbal Warning',
      remarks: 'Messy classroom desk.',
      resolution_notes: 'Completed cleanup.',
      resolution_date: new Date(now - 8 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 114,
      student_id: 2,
      violation_id: 2,
      reported_by_name: 'Roberto Aquino',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 11 * dayMs - 2 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 11 * dayMs - 1 * hourMs).toISOString(),
      sanction: 'Verbal Warning',
      remarks: 'Late attendance.',
      resolution_notes: 'Admitted with pass.',
      resolution_date: new Date(now - 11 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 115,
      student_id: 5,
      violation_id: 6,
      reported_by_name: 'Elena Reyes',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 14 * dayMs - 4 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 14 * dayMs - 3 * hourMs).toISOString(),
      sanction: 'Parent Conference',
      remarks: 'Disrespectful language toward classmate.',
      resolution_notes: 'Parent attended meeting.',
      resolution_date: new Date(now - 13 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 116,
      student_id: 3,
      violation_id: 1,
      reported_by_name: 'Juan Dela Cruz',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 18 * dayMs - 2 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'Sheryl Gamboa',
      approved_at: new Date(now - 18 * dayMs - 1 * hourMs).toISOString(),
      sanction: 'Cleanup Duty',
      remarks: 'Left trash in canteen hallway.',
      resolution_notes: 'Compliance verified.',
      resolution_date: new Date(now - 18 * dayMs).toISOString(),
      sms_notified: true
    },
    {
      id: 117,
      student_id: 1,
      violation_id: 3,
      reported_by_name: 'Roberto Aquino',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 22 * dayMs - 5 * hourMs).toISOString(),
      status: 'Resolved',
      approval_status: 'Approved',
      approved_by: 'System Admin',
      approved_at: new Date(now - 22 * dayMs - 4 * hourMs).toISOString(),
      sanction: 'Warning Slip',
      remarks: 'Unauthorized gadget usage during study hour.',
      resolution_notes: 'Acknowledged by student.',
      resolution_date: new Date(now - 22 * dayMs).toISOString(),
      sms_notified: true
    },

    // --- PENDING / UNDER APPROVAL DEMO INCIDENTS ---
    {
      id: 118,
      student_id: 2,
      violation_id: 4,
      reported_by_name: 'Elena Reyes',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 2 * hourMs).toISOString(),
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
      id: 119,
      student_id: 6,
      violation_id: 1,
      reported_by_name: 'Roberto Aquino',
      reported_by_type: 'teacher',
      date_reported: new Date(now - 4 * hourMs).toISOString(),
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
};

export const INITIAL_RECORDS = getDynamicInitialRecords();

export const INITIAL_LOGS = [
  { id: 1, user_name: 'System Admin', user_role: 'admin', action: 'Login', details: 'User authenticated from web interface', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, user_name: 'Juan Dela Cruz', user_role: 'teacher', action: 'Add Violation', details: 'Logged Minor violation for Alexander Mendoza', created_at: new Date(Date.now() - 7200000).toISOString() },
  { id: 3, user_name: 'System Admin', user_role: 'admin', action: 'Status Update', details: 'Marked Record #1 as Resolved', created_at: new Date(Date.now() - 18000000).toISOString() }
];

export const INITIAL_SCHOOL_EVENTS = [
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
