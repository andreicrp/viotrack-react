import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { SectionSelect } from '../components/common/SectionSelect';
import { useAuth } from '../context/AuthContext';
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
  Upload,
  FileText,
  UserPlus,
  FileSpreadsheet
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';
import '../css/adviser.css';

export const AdvisersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error, info } = useNotification();

  const [advisers, setAdvisers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Class_Advisers',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Class Advisers As'
  });

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

  const deferredSearch = useDeferredValue(searchTerm);

  // Filtered advisers
  const filteredAdvisers = useMemo(() => {
    return advisers.filter(adv => {
      const teacher = adv.teacher || {};
      const tName = `${teacher.fname || ''} ${teacher.lname || ''}`.toLowerCase();
      const tEmail = (teacher.email || '').toLowerCase();
      const grade = (adv.grade_level || '').toLowerCase();
      const section = (adv.class_section || '').toLowerCase();
      const query = deferredSearch.toLowerCase().trim();

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
  }, [advisers, deferredSearch, levelFilter, gradeFilter]);

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

  // All faculty options with clean name and status badge
  const teacherOptions = useMemo(() => {
    return teachers.map(t => {
      const existingAdv = advisers.find(a => Number(a.teacher_id) === Number(t.id));
      return {
        value: String(t.id),
        label: `${t.fname} ${t.lname}`,
        badge: existingAdv ? `${existingAdv.grade_level} - ${existingAdv.class_section}` : (t.department || 'Faculty')
      };
    });
  }, [teachers, advisers]);

  const currentlyAssignedAdviser = useMemo(() => {
    if (!selectedTeacherId) return null;
    return advisers.find(a => Number(a.teacher_id) === Number(selectedTeacherId));
  }, [selectedTeacherId, advisers]);

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

    const cleanSection = appointSection.trim();

    // Check if target section is already taken by a DIFFERENT teacher
    const sectionOccupied = advisers.find(
      a =>
        Number(a.teacher_id) !== Number(selectedTeacherId) &&
        String(a.grade_level).trim().toLowerCase() === appointGrade.trim().toLowerCase() &&
        String(a.class_section).trim().toLowerCase() === cleanSection.toLowerCase()
    );
    if (sectionOccupied) {
      const occupantName = sectionOccupied.teacher ? `${sectionOccupied.teacher.fname} ${sectionOccupied.teacher.lname}` : 'another faculty member';
      error(`${appointGrade} - ${cleanSection} is already assigned to ${occupantName}. Please choose a different section or unassign the current adviser first.`);
      return;
    }

    try {
      await dataService.saveAdviserAssignment(selectedTeacherId, appointGrade, cleanSection);
      success(`Successfully appointed adviser for ${appointGrade} - ${cleanSection}!`);
      setIsAppointModalOpen(false);
      setSelectedTeacherId('');
      setAppointSection('');
      loadData();
    } catch (err) {
      error('Failed to appoint adviser: ' + err.message);
    }
  };

  // Export via SaveAs
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
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

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
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

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Class_Advisers_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Class Advisers As'
    });
    setSaveAsModalOpen(true);
  };

  return (
    <div className="advisers-page-wrapper">
      {/* Top Banner & Action Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Award size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Adviser Management
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
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
              <ArrowLeft size={14} /> Back to Faculty
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF directory"
            >
              <Upload size={14} strokeWidth={2.2} /> Export PDF
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('csv')}
              className="page-banner-btn-secondary"
              title="Save As CSV / Excel spreadsheet"
            >
              <FileText size={14} strokeWidth={2.2} /> Export CSV
            </button>
          </div>

          <button
            onClick={() => setIsAppointModalOpen(true)}
            className="page-banner-primary-btn"
          >
            <UserPlus size={15} strokeWidth={2.5} /> Appoint New Adviser
          </button>
        </div>
      </div>

      {/* Interactive Stat Cards / Quick Filter Bar */}
      <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* Total Advisers */}
        <div
          onClick={() => { setLevelFilter('all'); setGradeFilter('all'); }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: levelFilter === 'all' && gradeFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL ADVISERS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                All grade levels
              </div>
            </div>
            <UserCheck size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>

        {/* Junior High Sections */}
        <div
          onClick={() => { setLevelFilter('jhs'); setGradeFilter('all'); }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: levelFilter === 'jhs' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                JUNIOR HIGH (G7-10)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.jhsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                JHS advisory sections
              </div>
            </div>
            <BookOpen size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>

        {/* Senior High Sections */}
        <div
          onClick={() => { setLevelFilter('shs'); setGradeFilter('all'); }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: levelFilter === 'shs' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SENIOR HIGH (G11-12)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.shsCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                SHS tracks & strands
              </div>
            </div>
            <GraduationCap size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>

        {/* Assigned Students */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1.5px solid var(--border-subtle, #cbd5e1)',
            borderRadius: '12px',
            padding: '14px 16px',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ASSIGNED STUDENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.assignedStudentCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                Across {advisers.length} advisory classes
              </div>
            </div>
            <Users size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="advisers-toolbar">
        <div style={{ display: 'flex', gap: '10px', flex: 1, minWidth: '240px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Input */}
          <div className="advisers-search-box">
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '13px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Search adviser, section, grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="advisers-search-input"
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
                  padding: 3,
                  borderRadius: '50%'
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Segmented Level Tabs */}
          <div className="advisers-tab-group">
            <button
              onClick={() => setLevelFilter('all')}
              className={`advisers-tab-btn ${levelFilter === 'all' ? 'active' : ''}`}
            >
              All Levels
            </button>
            <button
              onClick={() => setLevelFilter('jhs')}
              className={`advisers-tab-btn ${levelFilter === 'jhs' ? 'active' : ''}`}
            >
              Junior High
            </button>
            <button
              onClick={() => setLevelFilter('shs')}
              className={`advisers-tab-btn ${levelFilter === 'shs' ? 'active' : ''}`}
            >
              Senior High
            </button>
          </div>

          {/* Grade Selector */}
          <div style={{ minWidth: '130px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 500 }}>
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
                padding: '5px 10px',
                borderRadius: '7px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <X size={12} /> Reset
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
            padding: '48px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: '#f1f5f9',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <UserMinus size={26} />
          </div>
          <div>
            <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 3px 0' }}>
              No advisers match your current search or filter
            </h4>
            <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0 }}>
              Try adjusting your search criteria, or appoint a new teacher as section adviser.
            </p>
          </div>
          <button
            onClick={() => setIsAppointModalOpen(true)}
            className="advisers-btn-primary"
            style={{ marginTop: '6px', background: '#07345f', color: '#ffffff', borderColor: '#07345f' }}
          >
            <Plus size={14} /> Appoint Adviser
          </button>
        </div>
      ) : (
        <div className="advisers-card-grid">
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
              <div key={adv.id} className="adviser-card">
                {/* Top Header Card Info */}
                <div className="adviser-card-header">
                  <div className="adviser-teacher-profile">
                    <div className="adviser-avatar-wrapper">
                      <img
                        src={
                          adv.teacher?.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherName)}&background=07345f&color=fff&size=52`
                        }
                        alt={teacherName}
                        className="adviser-avatar-img"
                      />
                      <span className="adviser-online-dot" title="Active Faculty Adviser" />
                    </div>

                    <div className="adviser-teacher-meta">
                      <h4 className="adviser-teacher-name" title={teacherName}>
                        {teacherName}
                      </h4>
                      <div className="adviser-teacher-email" title={teacherEmail}>
                        <Mail size={12} color="#94a3b8" style={{ flexShrink: 0 }} />
                        <span>{teacherEmail}</span>
                      </div>
                      <span className="adviser-position-pill">
                        {teacherPos}
                      </span>
                    </div>
                  </div>

                  {/* Section Badge */}
                  <div className={`adviser-section-badge ${isSeniorHigh ? 'shs' : ''}`}>
                    <div className="adviser-badge-grade">
                      {adv.grade_level}
                    </div>
                    <div className="adviser-badge-section">
                      {adv.class_section}
                    </div>
                  </div>
                </div>

                {/* Section Metrics Overview */}
                <div className="adviser-metrics-bar">
                  {/* Students count */}
                  <div className="adviser-metric-box">
                    <div style={{ color: '#07345f', flexShrink: 0, display: 'flex' }}>
                      <Users size={15} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="adviser-metric-label">Enrolled</div>
                      <div className="adviser-metric-value">
                        {sectionStudents.length} {sectionStudents.length === 1 ? 'Student' : 'Students'}
                      </div>
                    </div>
                  </div>

                  {/* Violations Status */}
                  <div className={`adviser-metric-box ${hasViolations ? 'incident' : 'clean'}`}>
                    <div style={{ flexShrink: 0, display: 'flex' }}>
                      {hasViolations ? <AlertTriangle size={15} color="#dc2626" /> : <CheckCircle2 size={15} color="#16a34a" />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="adviser-metric-label">Discipline</div>
                      <div className="adviser-metric-value">
                        {hasViolations ? `${sectionViolations.length} Incident(s)` : 'Clean Section'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Student Roster Preview */}
                <div className="adviser-roster-preview">
                  <div className="adviser-roster-header">
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
                        padding: '14px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                        textAlign: 'center',
                        fontSize: '11.5px',
                        color: '#64748b'
                      }}
                    >
                      No students currently registered under this section.
                    </div>
                  ) : (
                    <div className="adviser-roster-list">
                      {sectionStudents.map((std) => {
                        const stdViolations = records.filter(r => r.student_id === std.id);
                        const isStudentClean = stdViolations.length === 0;

                        return (
                          <div key={std.id} className="adviser-roster-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <img
                                src={
                                  std.image ||
                                  `https://ui-avatars.com/api/?name=${encodeURIComponent(std.fname + ' ' + std.lname)}&background=e2e8f0&color=334155&size=28`
                                }
                                alt={std.fname}
                                className="adviser-student-avatar"
                              />
                              <div style={{ minWidth: 0 }}>
                                <div className="adviser-student-name">
                                  {std.fname} {std.lname}
                                </div>
                                <div className="adviser-student-lrn">
                                  Student ID: {std.lrn}
                                </div>
                              </div>
                            </div>

                            {/* Violation status tag */}
                            {isStudentClean ? (
                              <span className="adviser-status-pill good">
                                <CheckCircle2 size={10} /> Good
                              </span>
                            ) : (
                              <span className="adviser-status-pill violation">
                                <AlertTriangle size={10} /> {stdViolations.length} Viol.
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="adviser-card-footer">
                  <button
                    onClick={() => navigate(`/adviserview-student/${adv.id}`)}
                    className="adviser-btn-view-roster"
                  >
                    <Eye size={15} /> View Class Roster
                  </button>

                  <button
                    onClick={() => setAdviserToDelete(adv)}
                    className="adviser-btn-remove"
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
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            willChange: 'opacity'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsAppointModalOpen(false); }}
        >
          <div
            style={{
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '18px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              animation: 'fadeInUp 0.2s ease-out',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                background: 'var(--bg-surface, #ffffff)',
                borderTopLeftRadius: '18px',
                borderTopRightRadius: '18px'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                  Appoint Section Adviser
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  Assign a faculty member as class adviser for a grade and section
                </p>
              </div>
              <button
                onClick={() => setIsAppointModalOpen(false)}
                style={{
                  background: 'var(--bg-surface-elevated, #f1f5f9)',
                  border: '1px solid var(--border-subtle, transparent)',
                  borderRadius: '8px',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted, #64748b)',
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
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #334155)', marginBottom: '6px' }}>
                  Select Faculty Member <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {teachers.length === 0 ? (
                  <div
                    style={{
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      fontSize: '12.5px',
                      color: '#fbbf24',
                      lineHeight: 1.4
                    }}
                  >
                    <strong>Notice:</strong> No faculty members registered in the system yet. Please add teachers in the Faculty Directory first.
                  </div>
                ) : (
                  <>
                    <CustomSelect
                      value={selectedTeacherId}
                      onChange={(e) => setSelectedTeacherId(e.target.value)}
                      placeholder="-- Choose a faculty member --"
                      options={teacherOptions}
                    />
                    {currentlyAssignedAdviser && (
                      <div
                        className="advisers-reassignment-notice"
                        style={{
                          background: 'rgba(56, 189, 248, 0.12)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px',
                          padding: '9px 12px',
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#38bdf8',
                          lineHeight: 1.4
                        }}
                      >
                        ℹ️ <strong>Reassignment:</strong> This teacher is currently assigned to <strong>{currentlyAssignedAdviser.grade_level} - {currentlyAssignedAdviser.class_section}</strong>. Confirming will reassign them to <strong>{appointGrade} - {appointSection || 'selected section'}</strong>.
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Grade Level Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #334155)', marginBottom: '6px' }}>
                  Grade Level <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map((lvl) => {
                    const isSelected = appointGrade === lvl;
                    return (
                      <button
                        key={lvl}
                        className={`advisers-grade-option${isSelected ? ' is-selected' : ''}`}
                        type="button"
                        onClick={() => setAppointGrade(lvl)}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--brand-blue, #07345f)' : '1px solid var(--border-subtle, #e2e8f0)',
                          background: isSelected ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-surface-elevated, #f8fafc)',
                          color: isSelected ? 'var(--brand-blue, #07345f)' : 'var(--text-secondary, #475569)',
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

              {/* Class Section Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary, #334155)', marginBottom: '6px' }}>
                  Class Section Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SectionSelect
                  grade={appointGrade}
                  value={appointSection}
                  onChange={setAppointSection}
                  students={students}
                  advisers={advisers}
                  placeholder="Select or type section name..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid var(--border-subtle, #f1f5f9)', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setIsAppointModalOpen(false)}
                  style={{
                    flex: 1,
                    background: 'var(--bg-surface-elevated, #f1f5f9)',
                    color: 'var(--text-secondary, #475569)',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
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
                  disabled={!selectedTeacherId || !appointSection.trim()}
                  style={{
                    flex: 1,
                    background: (!selectedTeacherId || !appointSection.trim()) ? 'var(--text-dim, #94a3b8)' : 'var(--brand-blue, #07345f)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: (!selectedTeacherId || !appointSection.trim()) ? 'not-allowed' : 'pointer'
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
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            willChange: 'opacity'
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
