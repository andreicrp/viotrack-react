import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { useNotification } from '../context/NotificationContext';
import {
  GraduationCap,
  Users,
  Award,
  BookOpen,
  Search,
  Plus,
  Eye,
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  UserCheck,
  Download,
  Upload,
  FileText,
  Calendar,
  School,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';

export const MyClassPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [adviser, setAdviser] = useState(null);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Class_Roster',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Class Roster As'
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'clean' | 'violations'
  const [selectedStudentForViolation, setSelectedStudentForViolation] = useState(null);

  useEffect(() => {
    loadAdviserAndClass();
  }, [id, user]);

  const loadAdviserAndClass = async () => {
    setLoading(true);
    try {
      const [allAdvisers, allStudents, allRecords] = await Promise.all([
        dataService.getAdvisers(),
        dataService.getStudents(),
        dataService.getRecords()
      ]);

      const isApproved = (r) => {
        if (!r) return false;
        if (r.approval_status === 'Under Approval' || r.status === 'Under Approval') return false;
        if (r.approval_status === 'Rejected' || r.status === 'Rejected') return false;
        return r.approval_status === 'Approved';
      };

      setRecords((allRecords || []).filter(isApproved));

      let currentAdv = null;
      if (id) {
        currentAdv = allAdvisers.find(a => a.id === Number(id));
      } else {
        currentAdv = allAdvisers[0] || {
          id: 1,
          teacher: { fname: 'Juan', lname: 'Dela Cruz', email: 'juan.delacruz@viotrack.edu', position: 'Master Teacher I', department: 'Science Department', image: '' },
          grade_level: 'Grade 10',
          class_section: 'Rizal'
        };
      }

      setAdviser(currentAdv);

      if (currentAdv) {
        const gradeClean = (currentAdv.grade_level || '').replace(/\D/g, '');
        const secTarget = (currentAdv.class_section || '').toLowerCase().trim();

        const enrolled = allStudents.filter(s => {
          const sGradeClean = (s.grade || '').replace(/\D/g, '');
          const sSec = (s.section || '').toLowerCase().trim();
          return sGradeClean === gradeClean && sSec === secTarget;
        });

        setStudents(enrolled.length > 0 ? enrolled : allStudents.slice(0, 4));
      }
    } catch (err) {
      error('Failed to load class roster: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Section Analytics
  const analytics = useMemo(() => {
    const total = students.length;
    let studentsWithViolations = 0;
    let totalViolations = 0;

    students.forEach(s => {
      const studentRecords = records.filter(r => r.student_id === s.id);
      if (studentRecords.length > 0) {
        studentsWithViolations += 1;
        totalViolations += studentRecords.length;
      }
    });

    const cleanStudents = total - studentsWithViolations;
    const goodStandingRate = total > 0 ? Math.round((cleanStudents / total) * 100) : 100;

    const maleCount = students.filter(s => (s.gender || '').toLowerCase() === 'male').length;
    const femaleCount = students.filter(s => (s.gender || '').toLowerCase() === 'female').length;

    return {
      total,
      cleanStudents,
      studentsWithViolations,
      totalViolations,
      goodStandingRate,
      maleCount,
      femaleCount
    };
  }, [students, records]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const fullName = `${s.fname} ${s.lname}`.toLowerCase();
      const lrn = (s.lrn || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || fullName.includes(query) || lrn.includes(query) || email.includes(query);

      const studentViolations = records.filter(r => r.student_id === s.id);
      const isClean = studentViolations.length === 0;

      const matchesFilter =
        statusFilter === 'all' ||
        (statusFilter === 'clean' && isClean) ||
        (statusFilter === 'violations' && !isClean);

      return matchesSearch && matchesFilter;
    });
  }, [students, records, searchTerm, statusFilter]);

  // Export Class Roster via SaveAs
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Student ID', 'Last Name', 'First Name', 'Middle Name', 'Grade', 'Section', 'Gender', 'Contact', 'Violations Count', 'Conduct Standing'];
    const rows = filteredStudents.map(s => {
      const vCount = records.filter(r => r.student_id === s.id).length;
      return [
        s.lrn,
        s.lname,
        s.fname,
        s.mname || '',
        s.grade,
        s.section,
        s.gender || 'N/A',
        s.contact || s.email || 'N/A',
        vCount,
        vCount === 0 ? 'Good Standing' : `${vCount} Recorded Infraction(s)`
      ];
    });

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
      doc.setFontSize(16);
      doc.setTextColor(39, 54, 127);
      doc.text('VIOTRACK - CLASS ADVISORY ROSTER', 14, 18);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const teacherName = adviser?.teacher ? `${adviser.teacher.fname} ${adviser.teacher.lname}` : 'Faculty';
      doc.text(`Adviser: ${teacherName} | Section: ${adviser?.grade_level || 'Grade 10'} - ${adviser?.class_section || 'Rizal'}`, 14, 25);
      doc.text(`Date Generated: ${new Date().toLocaleDateString()} | Total Students: ${students.length}`, 14, 30);

      const tableData = filteredStudents.map((s, idx) => {
        const vCount = records.filter(r => r.student_id === s.id).length;
        return [
          idx + 1,
          s.lrn,
          `${s.lname}, ${s.fname}`,
          s.gender || 'N/A',
          s.contact || s.email || 'N/A',
          vCount === 0 ? 'Good Standing' : `${vCount} Violation(s)`
        ];
      });

      doc.autoTable({
        startY: 35,
        head: [['#', 'Student ID', 'Student Name', 'Gender', 'Contact Info', 'Disciplinary Status']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9 }
      });

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Class_Roster_${adviser?.class_section || 'Section'}_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Class Roster As'
    });
    setSaveAsModalOpen(true);
  };

  const teacher = adviser?.teacher || {};
  const teacherName = `${teacher.fname || 'Faculty'} ${teacher.lname || 'Adviser'}`;
  const teacherEmail = teacher.email || 'adviser@viotrack.edu';
  const teacherDept = teacher.department || 'Academic Department';
  const teacherPos = teacher.position || 'Class Adviser';
  const gradeLabel = adviser?.grade_level || 'Grade 10';
  const sectionLabel = adviser?.class_section || 'Rizal';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Hero Adviser Profile & Advisory Banner */}
      {/* 1. Hero Adviser Profile & Advisory Banner */}
      <div className="page-banner-header">
        <div className="page-banner-info" style={{ gap: '14px' }}>
          {/* Adviser Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={
                teacher.image ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=f1f5f9&color=0f172a&size=68`
              }
              alt={teacherName}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)'
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff'
              }}
              title="Active Class Adviser"
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {teacherName}
              </h2>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  textTransform: 'uppercase'
                }}
              >
                {teacherPos}
              </span>
              <span
                style={{
                  background: '#ecfdf5',
                  color: '#065f46',
                  border: '1px solid #a7f3d0',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px'
                }}
              >
                Advisory: {gradeLabel} - {sectionLabel}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', flexWrap: 'wrap', fontSize: '13px', color: '#64748b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={14} color="#64748b" />
                <span>{teacherEmail}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <School size={14} color="#64748b" />
                <span>{teacherDept}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={14} color="#64748b" />
                <span>AY 2025-2026</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => navigate('/advisers')}
              className="page-banner-btn-secondary"
            >
              <ArrowLeft size={14} /> Back to Advisers
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('csv')}
              className="page-banner-btn-secondary"
              title="Save As CSV / Excel roster"
            >
              <FileText size={14} strokeWidth={2.2} /> Export CSV
            </button>
          </div>

          <button
            onClick={() => handleOpenExportSaveAs('pdf')}
            className="page-banner-primary-btn"
            title="Save As formatted PDF class roster"
          >
            <Upload size={14} strokeWidth={2.2} /> Export Roster (PDF)
          </button>
        </div>
      </div>

      {/* 2. Class Discipline & Roster Stat Cards */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {/* Total Enrolled Students */}
        <div
          onClick={() => setStatusFilter('all')}
          style={{
            background: statusFilter === 'all' ? '#f0f4f8' : '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: statusFilter === 'all' ? '2px solid #07345f' : '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Enrolled Students
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {analytics.total}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                {analytics.maleCount} Male • {analytics.femaleCount} Female
              </div>
            </div>
            <Users size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
          {statusFilter === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }}></div>
          )}
        </div>

        {/* Good Standing Students */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'clean' ? 'all' : 'clean')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: statusFilter === 'clean' ? '2px solid #07345f' : '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Good Standing
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {analytics.cleanStudents}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                {analytics.goodStandingRate}% Clean Disciplinary Record
              </div>
            </div>
            <ShieldCheck size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
          {statusFilter === 'clean' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }}></div>
          )}
        </div>

        {/* Recorded Offenses */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'violations' ? 'all' : 'violations')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: statusFilter === 'violations' ? '2px solid #07345f' : '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Recorded Offenses
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {analytics.totalViolations}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                {analytics.studentsWithViolations} {analytics.studentsWithViolations === 1 ? 'student' : 'students'} with offenses
              </div>
            </div>
            <ShieldAlert size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
          {statusFilter === 'violations' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }}></div>
          )}
        </div>
      </div>

      {/* 3. Class Advisory Roster Card */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Card Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} color="#07345f" strokeWidth={2.2} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Class Advisory Roster
                </h3>
                <span
                  style={{
                    background: '#f0f4f8',
                    color: '#07345f',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px'
                  }}
                >
                  {filteredStudents.length} {filteredStudents.length === 1 ? 'Student' : 'Students'}
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
                Section {gradeLabel} - {sectionLabel} enrolled student roster & conduct standing
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search Box */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                placeholder="Search by name, Student ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 36px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '9px',
                  fontSize: '13px',
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#07345f'; e.currentTarget.style.background = '#ffffff'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '9px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                style={{
                  background: statusFilter === 'all' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'all' ? '#07345f' : '#64748b',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                All ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('clean')}
                style={{
                  background: statusFilter === 'clean' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'clean' ? '#16a34a' : '#64748b',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'clean' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                Clean Record ({analytics.cleanStudents})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('violations')}
                style={{
                  background: statusFilter === 'violations' ? '#ffffff' : 'transparent',
                  color: statusFilter === 'violations' ? '#e11d48' : '#64748b',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: statusFilter === 'violations' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                With Violations ({analytics.studentsWithViolations})
              </button>
            </div>
          </div>
        </div>

        {/* Student List Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredStudents.length === 0 ? (
            <div
              style={{
                padding: '48px 20px',
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1'
              }}
            >
              <div style={{ color: '#94a3b8', marginBottom: '8px' }}>
                <Users size={32} />
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                No students match your search or filter
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Try adjusting your search query or reset active filters.
              </div>
            </div>
          ) : (
            filteredStudents.map(student => {
              const studentViolations = records.filter(r => r.student_id === student.id);
              const isClean = studentViolations.length === 0;

              return (
                <div
                  key={student.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    transition: 'all 0.15s ease',
                    flexWrap: 'wrap'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
                  }}
                >
                  {/* Student Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: '1 1 320px' }}>
                    <img
                      src={
                        student.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=52`
                      }
                      alt={student.fname}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #e2e8f0',
                        flexShrink: 0
                      }}
                    />

                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                          {student.fname} {student.lname}
                        </h4>

                        {/* Disciplinary status badge */}
                        {isClean ? (
                          <span
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              border: '1px solid #a7f3d0',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2.5px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle2 size={11} color="#059669" strokeWidth={2.4} /> Good Standing
                          </span>
                        ) : (
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#991b1b',
                              border: '1px solid #fecaca',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2.5px 8px',
                              borderRadius: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <AlertTriangle size={11} color="#dc2626" strokeWidth={2.4} /> {studentViolations.length} {studentViolations.length === 1 ? 'Violation' : 'Violations'}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                          Student ID: <strong style={{ color: '#0f172a' }}>{student.lrn}</strong>
                        </div>
                        <div>
                          Email: <span style={{ color: '#475569' }}>{student.email || `${student.fname.toLowerCase()}@school.com`}</span>
                        </div>
                        <div>
                          Gender: <span style={{ color: '#475569' }}>{student.gender || 'Male'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/student-violation/${student.id}`)}
                      style={{
                        background: '#f0f4f8',
                        color: '#07345f',
                        border: '1.5px solid #cbd5e1',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#f0f4f8'; }}
                    >
                      <Eye size={14} /> View History
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStudentForViolation(student.id)}
                      style={{
                        background: '#07345f',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(7, 52, 95, 0.25)',
                        transition: 'all 0.15s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = '#0b192c'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = '#07345f'; }}
                    >
                      <Plus size={14} strokeWidth={2.5} /> Log Violation
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Add Violation Modal */}
      {selectedStudentForViolation && (
        <AddViolationModal
          isOpen={!!selectedStudentForViolation}
          onClose={() => setSelectedStudentForViolation(null)}
          preselectedStudentId={selectedStudentForViolation}
          onRecordAdded={() => {
            loadAdviserAndClass();
          }}
        />
      )}

      {/* Save As / Export Modal */}
      <SaveAsModal
        isOpen={saveAsModalOpen}
        onClose={() => setSaveAsModalOpen(false)}
        defaultFilename={saveAsConfig.defaultFilename}
        defaultFormat={saveAsConfig.defaultFormat}
        availableFormats={saveAsConfig.availableFormats}
        headers={saveAsConfig.headers}
        rows={saveAsConfig.rows}
        generatePdfBlob={saveAsConfig.generatePdfBlob}
        userEmail={user?.email || 'viotrack.cloud@gmail.com'}
        title={saveAsConfig.title}
      />
    </div>
  );
};
