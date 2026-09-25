import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { useNotification } from '../context/NotificationContext';
import {
  GraduationCap,
  UserCheck,
  Users,
  Award,
  BookOpen,
  Search,
  Plus,
  Trash2,
  Eye,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  UserMinus,
  Mail,
  ShieldAlert,
  CheckCircle2,
  Filter,
  X,
  Sparkles,
  School,
  Layers,
  AlertTriangle,
  Download,
  UserPlus,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';

export const AdvisersPage = () => {
  const navigate = useNavigate();
  const { success, error, info } = useNotification();

  const [advisers, setAdvisers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'jhs' | 'shs'
  const [gradeFilter, setGradeFilter] = useState('all');

  // Modals
  const [isAppointModalOpen, setIsAppointModalOpen] = useState(false);
  const [adviserToDelete, setAdviserToDelete] = useState(null);

  // Appoint Form State
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [appointGrade, setAppointGrade] = useState('Grade 10');
  const [appointSection, setAppointSection] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [aList, tList, sList, rList] = await Promise.all([
        dataService.getAdvisers(),
        dataService.getTeachers(),
        dataService.getStudents(),
        dataService.getRecords()
      ]);
      setAdvisers(aList || []);
      setTeachers(tList || []);
      setStudents(sList || []);
      setRecords(rList || []);
    } catch (err) {
      error('Failed to load advisers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine JHS or SHS
  const isJHS = (gradeStr) => {
    const num = parseInt((gradeStr || '').replace(/\D/g, ''), 10);
    return num >= 7 && num <= 10;
  };

  const isSHS = (gradeStr) => {
    const num = parseInt((gradeStr || '').replace(/\D/g, ''), 10);
    return num >= 11 && num <= 12;
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = advisers.length;
    const jhsCount = advisers.filter(a => isJHS(a.grade_level)).length;
    const shsCount = advisers.filter(a => isSHS(a.grade_level)).length;

    // Total enrolled students under all advisers
    let assignedStudentCount = 0;
    advisers.forEach(adv => {
      const gNum = (adv.grade_level || '').replace(/\D/g, '');
      const secStudents = students.filter(s =>
        s.grade.replace(/\D/g, '') === gNum &&
        s.section.toLowerCase().trim() === (adv.class_section || '').toLowerCase().trim()
      );
      assignedStudentCount += secStudents.length;
    });

    return { total, jhsCount, shsCount, assignedStudentCount };
  }, [advisers, students]);

  // Filtered advisers
  const filteredAdvisers = useMemo(() => {
    return advisers.filter(adv => {
      const teacher = adv.teacher || {};
      const tName = `${teacher.fname || ''} ${teacher.lname || ''}`.toLowerCase();
      const tEmail = (teacher.email || '').toLowerCase();
      const grade = (adv.grade_level || '').toLowerCase();
      const section = (adv.class_section || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        tName.includes(query) ||
        tEmail.includes(query) ||
        grade.includes(query) ||
        section.includes(query);

      const matchesLevel =
        levelFilter === 'all' ||
        (levelFilter === 'jhs' && isJHS(adv.grade_level)) ||
        (levelFilter === 'shs' && isSHS(adv.grade_level));

      const matchesGrade =
        gradeFilter === 'all' ||
        (adv.grade_level || '').toLowerCase() === gradeFilter.toLowerCase();

      return matchesSearch && matchesLevel && matchesGrade;
    });
  }, [advisers, searchTerm, levelFilter, gradeFilter]);

  // Handle Remove
  const confirmRemoveAdviser = async () => {
    if (!adviserToDelete) return;
    try {
      await dataService.removeAdviser(adviserToDelete.id);
      setAdvisers(prev => prev.filter(a => a.id !== adviserToDelete.id));
      success(`Adviser assignment for ${adviserToDelete.grade_level} - ${adviserToDelete.class_section} has been removed.`);
    } catch (err) {
      error('Failed to remove adviser: ' + err.message);
    } finally {
      setAdviserToDelete(null);
    }
  };

  // Handle Appoint
  const handleAppointSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId) {
      error('Please select a teacher to appoint.');
      return;
    }
    if (!appointSection.trim()) {
      error('Please enter or select a class section name.');
      return;
    }

    try {
      await dataService.saveAdviserAssignment(selectedTeacherId, appointGrade, appointSection.trim());
      success(`Successfully appointed adviser for ${appointGrade} - ${appointSection.trim()}!`);
      setIsAppointModalOpen(false);
      setSelectedTeacherId('');
      setAppointSection('');
      loadData();
    } catch (err) {
      error('Failed to appoint adviser: ' + err.message);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(39, 54, 127);
      doc.text('VIOTRACK - CLASS ADVISER DIRECTORY', 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()} | Active Advisers: ${advisers.length}`, 14, 23);

      const tableData = advisers.map((adv, idx) => {
        const teacher = teachers.find(t => t.id === adv.teacher_id);
        const name = teacher ? `${teacher.fname} ${teacher.lname}` : `Teacher #${adv.teacher_id}`;
        return [
          idx + 1,
          name,
          adv.grade_level || 'Grade 7',
          adv.section || 'General',
          adv.academic_year || '2023-2024'
        ];
      });

      doc.autoTable({
        head: [['#', 'Class Adviser', 'Grade Level', 'Assigned Section', 'Academic Year']],
        body: tableData,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], textColor: 255, fontStyle: 'bold' }
      });

      doc.save(`Viotrack_Class_Advisers_${Date.now()}.pdf`);
      success('Exported Class Advisers Directory as PDF!');
    } catch (err) {
      error('Failed to export PDF: ' + err.message);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ['Adviser Name', 'Grade Level', 'Section', 'Department', 'Email', 'Contact', 'Enrolled Students', 'Violations Recorded'];
      const rows = advisers.map(adv => {
        const teacher = teachers.find(t => t.id === adv.teacher_id);
        const name = teacher ? `${teacher.fname} ${teacher.lname}` : `Teacher #${adv.teacher_id}`;
        const stdCount = students.filter(s => s.grade === adv.grade_level && s.section === adv.section).length;
        const vioCount = records.filter(r => r.student?.grade === adv.grade_level && r.student?.section === adv.section).length;
        return [
          name,
          adv.grade_level || 'Grade 10',
          adv.section || 'General',
          teacher?.department || 'Academic Faculty',
          teacher?.email || '',
          teacher?.contact || '',
          stdCount,
          vioCount
        ];
      });

      exportToCsv(`Viotrack_Class_Advisers_${Date.now()}`, headers, rows);
      success(`Exported ${rows.length} class advisers to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  const sectionPresets = [
    'Rizal',
    'Bonifacio',
    'Luna',
    'Diamond',
    'Emerald',
    'Ruby',
    'STEM A',
    'STEM B',
    'HUMSS A',
    'HUMSS B',
    'ABM A',
    'ABM B',
    'GAS'
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Action Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}
          >
            <Award size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Adviser Management
              </h2>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {advisers.length} Active {advisers.length === 1 ? 'Adviser' : 'Advisers'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Assign, supervise, and inspect class advisers and student advisory section rosters.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => navigate('/teachers')}
              className="page-banner-btn-secondary"
            >
              <ArrowLeft size={15} /> Back to Faculty
            </button>

            <button
              onClick={handleExportPDF}
              className="page-banner-btn-secondary"
              title="Download formatted PDF directory"
            >
              <Download size={15} /> Export PDF
            </button>

            <button
              onClick={handleExportCSV}
              className="page-banner-btn-secondary"
              title="Download CSV spreadsheet"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
          </div>

          <button
            onClick={() => setIsAppointModalOpen(true)}
            className="page-banner-primary-btn"
          >
            <UserPlus size={16} strokeWidth={2.5} /> Appoint New Adviser
          </button>
        </div>
      </div>

      {/* Interactive Stat Cards / Quick Filter Bar */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Total Advisers */}
        <div
          onClick={() => { setLevelFilter('all'); setGradeFilter('all'); }}
          style={{
            background: levelFilter === 'all' && gradeFilter === 'all' ? 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)' : '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: levelFilter === 'all' && gradeFilter === 'all' ? '2px solid #27367f' : '1px solid #e2e8f0',
            boxShadow: levelFilter === 'all' && gradeFilter === 'all' ? '0 6px 20px rgba(39, 54, 127, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (!(levelFilter === 'all' && gradeFilter === 'all')) {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (!(levelFilter === 'all' && gradeFilter === 'all')) {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Advisers
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                <span>All Grade Levels</span>
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UserCheck size={22} />
            </div>
          </div>
          {levelFilter === 'all' && gradeFilter === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #27367f, #3b82f6)' }}></div>
          )}
        </div>

        {/* Junior High Sections */}
        <div
          onClick={() => { setLevelFilter('jhs'); setGradeFilter('all'); }}
          style={{
            background: levelFilter === 'jhs' ? 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' : '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: levelFilter === 'jhs' ? '2px solid #059669' : '1px solid #e2e8f0',
            boxShadow: levelFilter === 'jhs' ? '0 6px 20px rgba(5, 150, 105, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (levelFilter !== 'jhs') {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (levelFilter !== 'jhs') {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Junior High (G7-10)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {stats.jhsCount}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                JHS Advisory Sections
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <BookOpen size={22} />
            </div>
          </div>
          {levelFilter === 'jhs' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #059669, #10b981)' }}></div>
          )}
        </div>

        {/* Senior High Sections */}
        <div
          onClick={() => { setLevelFilter('shs'); setGradeFilter('all'); }}
          style={{
            background: levelFilter === 'shs' ? 'linear-gradient(180deg, #ffffff 0%, #faf5ff 100%)' : '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: levelFilter === 'shs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
            boxShadow: levelFilter === 'shs' ? '0 6px 20px rgba(124, 58, 237, 0.12)' : '0 2px 8px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (levelFilter !== 'shs') {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (levelFilter !== 'shs') {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Senior High (G11-12)
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {stats.shsCount}
              </div>
              <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '4px', fontWeight: 600 }}>
                SHS Tracks & Strands
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GraduationCap size={22} />
            </div>
          </div>
          {levelFilter === 'shs' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #7c3aed, #a855f7)' }}></div>
          )}
        </div>

        {/* Assigned Students */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#cbd5e1';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Assigned Students
              </div>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', marginTop: '4px', letterSpacing: '-0.02em' }}>
                {stats.assignedStudentCount}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
                Across {advisers.length} advisory classes
              </div>
            </div>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Users size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '14px 18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Search by adviser name, email, grade, or section..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9.5px 36px 9.5px 40px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: '#0f172a',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: '#f8fafc',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#27367f';
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(39, 54, 127, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.boxShadow = 'none';
              }}
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
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                  borderRadius: '50%'
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Segmented Level Tabs */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              gap: '3px'
            }}
          >
            <button
              onClick={() => setLevelFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                background: levelFilter === 'all' ? '#ffffff' : 'transparent',
                color: levelFilter === 'all' ? '#27367f' : '#64748b',
                fontWeight: levelFilter === 'all' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: levelFilter === 'all' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              All Levels
            </button>
            <button
              onClick={() => setLevelFilter('jhs')}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                background: levelFilter === 'jhs' ? '#ffffff' : 'transparent',
                color: levelFilter === 'jhs' ? '#059669' : '#64748b',
                fontWeight: levelFilter === 'jhs' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: levelFilter === 'jhs' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Junior High
            </button>
            <button
              onClick={() => setLevelFilter('shs')}
              style={{
                padding: '6px 12px',
                borderRadius: '7px',
                border: 'none',
                background: levelFilter === 'shs' ? '#ffffff' : 'transparent',
                color: levelFilter === 'shs' ? '#7c3aed' : '#64748b',
                fontWeight: levelFilter === 'shs' ? 700 : 500,
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: levelFilter === 'shs' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Senior High
            </button>
          </div>

          {/* Grade Selector */}
          <div style={{ minWidth: '140px' }}>
            <CustomSelect
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Grades' },
                { value: 'Grade 7', label: 'Grade 7' },
                { value: 'Grade 8', label: 'Grade 8' },
                { value: 'Grade 9', label: 'Grade 9' },
                { value: 'Grade 10', label: 'Grade 10' },
                { value: 'Grade 11', label: 'Grade 11' },
                { value: 'Grade 12', label: 'Grade 12' }
              ]}
            />
          </div>
        </div>

        {/* Results Counter & Active Filters Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
            Showing <strong>{filteredAdvisers.length}</strong> of {advisers.length}
          </span>
          {(searchTerm || levelFilter !== 'all' || gradeFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setLevelFilter('all');
                setGradeFilter('all');
              }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                color: '#475569',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
            >
              <X size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Advisers Card Grid */}
      {filteredAdvisers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px dashed #cbd5e1',
            padding: '60px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserMinus size={30} />
          </div>
          <div>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>
              No advisers match your current search or filter
            </h4>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Try adjusting your search criteria, or appoint a new teacher as section adviser.
            </p>
          </div>
          <button
            onClick={() => setIsAppointModalOpen(true)}
            style={{
              background: '#27367f',
              color: '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              boxShadow: '0 4px 14px rgba(39, 54, 127, 0.25)'
            }}
          >
            <Plus size={15} /> Appoint Adviser
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 330px), 1fr))',
            gap: '20px'
          }}
        >
          {filteredAdvisers.map((adv) => {
            const teacherName = adv.teacher
              ? `${adv.teacher.fname} ${adv.teacher.lname}`
              : 'Assigned Faculty';
            const teacherEmail = adv.teacher?.email || 'adviser@viotrack.edu';
            const teacherDept = adv.teacher?.department || 'Academic Faculty';
            const teacherPos = adv.teacher?.position || 'Faculty Adviser';

            // Find enrolled students matching Grade & Section
            const gNum = (adv.grade_level || '').replace(/\D/g, '');
            const sectionStudents = students.filter(s =>
              s.grade.replace(/\D/g, '') === gNum &&
              s.section.toLowerCase().trim() === (adv.class_section || '').toLowerCase().trim()
            );

            // Compute violation statistics for this section
            const studentIds = sectionStudents.map(s => s.id);
            const sectionViolations = records.filter(r => studentIds.includes(r.student_id));
            const hasViolations = sectionViolations.length > 0;

            const isSeniorHigh = isSHS(adv.grade_level);

            return (
              <div
                key={adv.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 12px 28px -4px rgba(15, 23, 42, 0.1)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px -2px rgba(15, 23, 42, 0.05)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* Top Header Card Info */}
                <div
                  style={{
                    padding: '20px',
                    borderBottom: '1px solid #f1f5f9',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img
                        src={
                          adv.teacher?.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=27367f&color=fff&size=52`
                        }
                        alt={teacherName}
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #e2e8f0',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
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
                        title="Active Faculty Adviser"
                      />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '15px',
                          fontWeight: 700,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {teacherName}
                      </h4>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        <Mail size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{teacherEmail}</span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#475569',
                          fontWeight: 600,
                          marginTop: '4px',
                          display: 'inline-block',
                          background: '#f1f5f9',
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}
                      >
                        {teacherPos}
                      </div>
                    </div>
                  </div>

                  {/* Section Badge */}
                  <div
                    style={{
                      background: isSeniorHigh
                        ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                        : 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                      color: isSeniorHigh ? '#6d28d9' : '#27367f',
                      border: `1px solid ${isSeniorHigh ? '#ddd6fe' : '#c7d2fe'}`,
                      borderRadius: '10px',
                      padding: '8px 12px',
                      textAlign: 'right',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {adv.grade_level}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, marginTop: '2px' }}>
                      {adv.class_section}
                    </div>
                  </div>
                </div>

                {/* Section Metrics Overview */}
                <div
                  style={{
                    padding: '12px 20px',
                    background: '#f8fafc',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '10px'
                  }}
                >
                  {/* Students count */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{ color: '#27367f', flexShrink: 0 }}>
                      <Users size={16} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                        Enrolled
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {sectionStudents.length} {sectionStudents.length === 1 ? 'Student' : 'Students'}
                      </div>
                    </div>
                  </div>

                  {/* Violations Status */}
                  <div
                    style={{
                      background: hasViolations ? '#fff1f2' : '#f0fdf4',
                      border: `1px solid ${hasViolations ? '#fecdd3' : '#bbf7d0'}`,
                      borderRadius: '8px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <div style={{ color: hasViolations ? '#e11d48' : '#16a34a', flexShrink: 0 }}>
                      {hasViolations ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: hasViolations ? '#be123c' : '#15803d', textTransform: 'uppercase' }}>
                        Discipline
                      </div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: hasViolations ? '#9f1239' : '#14532d', whiteSpace: 'nowrap' }}>
                        {hasViolations ? `${sectionViolations.length} Incident(s)` : 'Clean Section'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Student Roster Preview */}
                <div
                  style={{
                    padding: '16px 20px',
                    background: '#ffffff',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      marginBottom: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <GraduationCap size={13} color="#64748b" /> Section Roster ({sectionStudents.length})
                    </span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>
                      SY 2025-2026
                    </span>
                  </div>

                  {sectionStudents.length === 0 ? (
                    <div
                      style={{
                        padding: '16px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#64748b'
                      }}
                    >
                      No students currently registered under this section.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        maxHeight: '190px',
                        overflowY: 'auto',
                        paddingRight: '4px'
                      }}
                    >
                      {sectionStudents.map((std) => {
                        const stdViolations = records.filter(r => r.student_id === std.id);
                        const isStudentClean = stdViolations.length === 0;

                        return (
                          <div
                            key={std.id}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '8px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '8px',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                              <img
                                src={
                                  std.image ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(std.fname + ' ' + std.lname)}&background=e2e8f0&color=334155&size=28`
                                }
                                alt={std.fname}
                                style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                              />
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {std.fname} {std.lname}
                                </div>
                                <div style={{ fontSize: '10px', color: '#64748b' }}>
                                  LRN: {std.lrn}
                                </div>
                              </div>
                            </div>

                            {/* Violation status tag */}
                            {isStudentClean ? (
                              <span
                                style={{
                                  background: '#f0fdf4',
                                  color: '#166534',
                                  border: '1px solid #bbf7d0',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <CheckCircle2 size={10} color="#16a34a" /> Good
                              </span>
                            ) : (
                              <span
                                style={{
                                  background: '#fee2e2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                <AlertTriangle size={10} color="#dc2626" /> {stdViolations.length} Viol.
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: '#ffffff',
                    borderTop: '1px solid #f1f5f9',
                    display: 'flex',
                    gap: '10px'
                  }}
                >
                  <button
                    onClick={() => navigate(`/adviserview-student/${adv.id}`)}
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #1e2b66 0%, #27367f 100%)',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9.5px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(39, 54, 127, 0.2)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 10px rgba(39, 54, 127, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(39, 54, 127, 0.2)';
                    }}
                  >
                    <Eye size={15} /> View Class Roster
                  </button>

                  <button
                    onClick={() => setAdviserToDelete(adv)}
                    style={{
                      background: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      padding: '9.5px 14px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#f87171';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#fecaca';
                    }}
                    title="Remove Adviser Assignment"
                  >
                    <Trash2 size={15} /> Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appoint Adviser Modal */}
      {isAppointModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsAppointModalOpen(false); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.2s ease-out'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid #f1f5f9',
                background: '#ffffff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: '#eff6ff',
                    color: '#27367f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Award size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                    Appoint Section Adviser
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Assign a faculty member as class adviser for a grade and section
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAppointModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '8px',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAppointSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Teacher Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Select Faculty Member <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <CustomSelect
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  placeholder="-- Choose a teacher --"
                  options={teachers.map(t => {
                    const alreadyAdv = advisers.find(a => a.teacher_id === t.id);
                    return {
                      value: String(t.id),
                      label: `${t.fname} ${t.lname} (${t.department || 'Faculty'}${alreadyAdv ? ` - Current: ${alreadyAdv.grade_level} ${alreadyAdv.class_section}` : ''})`
                    };
                  })}
                />
              </div>

              {/* Grade Level Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Grade Level <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((lvl) => {
                    const isSelected = appointGrade === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setAppointGrade(lvl)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #27367f' : '1px solid #e2e8f0',
                          background: isSelected ? '#eef2ff' : '#f8fafc',
                          color: isSelected ? '#27367f' : '#475569',
                          fontWeight: isSelected ? 700 : 500,
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <School size={14} /> {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Class Section Input & Presets */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Class Section Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rizal, STEM A, Diamond..."
                  value={appointSection}
                  onChange={(e) => setAppointSection(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    marginBottom: '10px'
                  }}
                />

                {/* Popular presets */}
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 500 }}>
                    Quick presets:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {sectionPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAppointSection(preset)}
                        style={{
                          background: appointSection === preset ? '#27367f' : '#f1f5f9',
                          color: appointSection === preset ? '#ffffff' : '#475569',
                          border: 'none',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAppointModalOpen(false)}
                  style={{
                    flex: 1,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    background: '#27367f',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(39, 54, 127, 0.25)'
                  }}
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      {adviserToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setAdviserToDelete(null); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              animation: 'fadeInUp 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                  Remove Adviser Assignment?
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  This will unassign the teacher from the advisory section.
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '13px'
              }}
            >
              <div style={{ fontWeight: 600, color: '#0f172a' }}>
                {adviserToDelete.teacher ? `${adviserToDelete.teacher.fname} ${adviserToDelete.teacher.lname}` : 'Teacher'}
              </div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                Section: <strong>{adviserToDelete.grade_level} - {adviserToDelete.class_section}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setAdviserToDelete(null)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveAdviser}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)'
                }}
              >
                Yes, Remove Adviser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
