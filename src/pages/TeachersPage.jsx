import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { dataService } from '../services/dataService';
import { EditTeacherModal } from '../components/teachers/EditTeacherModal';
import { AppointAdviserModal } from '../components/teachers/AppointAdviserModal';
import { BulkImportTeachersModal } from '../components/teachers/BulkImportTeachersModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { exportToCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';
import {
  GraduationCap,
  UserCheck,
  Users,
  UserPlus,
  Building,
  Search,
  Upload,
  FileSpreadsheet,
  Trash2,
  Edit3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Award,
  ChevronRight,
  Download,
  Plus,
  FileText
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';

export const TeachersPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();
  const [teachers, setTeachers] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Faculty',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Faculty Directory As'
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('all'); // 'all' | 'adviser' | 'subject'
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sorting
  const [sortField, setSortField] = useState('name'); // 'name' | 'position' | 'department' | 'email'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportFormat, setBulkImportFormat] = useState('all'); // 'all' | 'pdf' | 'csv'
  const [teacherToEdit, setTeacherToEdit] = useState(null);
  const [teacherForAdviser, setTeacherForAdviser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, aList] = await Promise.all([
        dataService.getTeachers(),
        dataService.getAdvisers()
      ]);
      setTeachers(tList || []);
      setAdvisers(aList || []);
    } catch (err) {
      error('Failed to load teachers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = {
    total: teachers.length,
    advisersCount: teachers.filter(t => advisers.some(a => a.teacher_id === t.id)).length,
    subjectTeachers: teachers.filter(t => !advisers.some(a => a.teacher_id === t.id)).length,
    departmentsCount: new Set(teachers.map(t => t.department || 'General Faculty')).size
  };

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSorted.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSaveTeacher = async (updatedTeacher) => {
    try {
      if (teacherToEdit) {
        const saved = await dataService.updateTeacher(teacherToEdit.id, updatedTeacher);
        setTeachers(teachers.map(t => t.id === teacherToEdit.id ? saved : t));
        success(`Updated details for ${updatedTeacher.fname} ${updatedTeacher.lname}`);
      } else {
        const newT = await dataService.addTeacher(updatedTeacher);
        setTeachers([newT, ...teachers]);
        success(`Added teacher: ${newT.fname} ${newT.lname}`);
      }
      setIsEditModalOpen(false);
      loadData();
    } catch (err) {
      error('Failed to save faculty record: ' + err.message);
    }
  };

  const handleAppointAdviser = async (teacherId, grade, section) => {
    try {
      await dataService.saveAdviserAssignment(teacherId, grade, section);
      success('Appointed teacher as class adviser!');
      loadData();
    } catch (err) {
      error('Appointment failed: ' + err.message);
    }
  };

  const handleRemoveTeacher = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove teacher: ${name}?`)) {
      try {
        await dataService.deleteTeacher(id);
        setTeachers(teachers.filter(t => t.id !== id));
        setSelectedIds(prev => prev.filter(x => x !== id));
        success('Teacher removed from faculty.');
        loadData();
      } catch (err) {
        error('Failed to remove teacher: ' + err.message);
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to remove ${selectedIds.length} selected teacher(s)?`)) {
      try {
        for (const id of selectedIds) {
          await dataService.deleteTeacher(id);
        }
        setSelectedIds([]);
        success('Selected teachers removed.');
        loadData();
      } catch (err) {
        error('Failed to remove teachers: ' + err.message);
      }
    }
  };

  // Export via SaveAs
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['First Name', 'Middle Name', 'Last Name', 'Position', 'Department', 'Specialization', 'Advisory', 'Email', 'Contact', 'Gender'];
    const rows = filteredAndSorted.map(t => {
      const adv = advisers.find(a => a.teacher_id === t.id);
      const advText = adv ? `${adv.grade_level} - ${adv.class_section}` : 'None';
      return [
        t.fname,
        t.mname || '',
        t.lname,
        t.position || 'Teacher',
        t.department || 'Academic Faculty',
        t.specialization || 'General Education',
        advText,
        t.email || '',
        t.contact || '',
        t.gender || 'Male'
      ];
    });

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
      doc.setFillColor(39, 54, 127);
      doc.rect(0, 0, 210, 24, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSITY OF PERPETUAL HELP SYSTEM MANILA', 14, 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Faculty Directory & Section Advisers Master Roster', 14, 18);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.text(`Total Active Faculty: ${filteredAndSorted.length} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = filteredAndSorted.map(t => {
        const adv = advisers.find(a => a.teacher_id === t.id);
        const advText = adv ? `${adv.grade_level} - ${adv.class_section}` : 'Subject Teacher';
        return [
          `${t.fname} ${t.lname}`,
          t.position || 'Teacher',
          t.department || 'Academic Faculty',
          advText,
          t.email
        ];
      });

      doc.autoTable({
        head: [['Faculty Name', 'Academic Rank', 'Department', 'Advisory Assignment', 'Institutional Email']],
        body: tableData,
        startY: 34,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], fontStyle: 'bold' }
      });

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Faculty_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Faculty Directory As'
    });
    setSaveAsModalOpen(true);
  };

  const deferredSearch = useDeferredValue(searchTerm);

  // Filter & Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    let result = teachers.filter(t => {
      const isAdv = advisers.some(a => a.teacher_id === t.id);
      // Filter Type
      if (selectedFacultyFilter === 'adviser' && !isAdv) return false;
      if (selectedFacultyFilter === 'subject' && isAdv) return false;

      // Search
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase();
        const fullName = `${t.fname} ${t.mname || ''} ${t.lname}`.toLowerCase();
        const email = (t.email || '').toLowerCase();
        const pos = (t.position || '').toLowerCase();
        const dept = (t.department || '').toLowerCase();
        const adv = advisers.find(a => a.teacher_id === t.id);
        const advText = adv ? `${adv.grade_level} ${adv.class_section}`.toLowerCase() : '';

        return fullName.includes(query) || email.includes(query) || pos.includes(query) || dept.includes(query) || advText.includes(query);
      }
      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = '';
      let valB = '';
      if (sortField === 'name') {
        valA = `${a.fname} ${a.lname}`.toLowerCase();
        valB = `${b.fname} ${b.lname}`.toLowerCase();
      } else if (sortField === 'position') {
        valA = (a.position || '').toLowerCase();
        valB = (b.position || '').toLowerCase();
      } else if (sortField === 'department') {
        valA = (a.department || '').toLowerCase();
        valB = (b.department || '').toLowerCase();
      } else if (sortField === 'email') {
        valA = (a.email || '').toLowerCase();
        valB = (b.email || '').toLowerCase();
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [teachers, advisers, selectedFacultyFilter, deferredSearch, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage) || 1;
  const paginatedTeachers = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="table-sort-icon is-inactive" color="currentColor" style={{ marginLeft: 4, color: 'var(--text-muted, #94a3b8)' }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} className="table-sort-icon is-active" color="currentColor" style={{ marginLeft: 4, color: 'var(--brand-blue, #07345f)' }} />
    ) : (
      <ArrowDown size={13} className="table-sort-icon is-active" color="currentColor" style={{ marginLeft: 4, color: 'var(--brand-blue, #07345f)' }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. Top Banner & Primary Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Users size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Faculty Teachers &amp; Advisers
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Comprehensive faculty roster, advisory appointments, department heads, and academic educators.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF faculty directory"
            >
              <Download size={14} strokeWidth={2.2} /> Export PDF
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('csv')}
              className="page-banner-btn-secondary"
              title="Save As CSV / Excel spreadsheet"
            >
              <FileSpreadsheet size={14} strokeWidth={2.2} /> Export CSV
            </button>

            <button
              onClick={() => {
                setBulkImportFormat('pdf');
                setIsBulkImportOpen(true);
              }}
              className="page-banner-btn-secondary"
              title="Import faculty roster from PDF document"
            >
              <Upload size={14} strokeWidth={2.2} /> Import PDF
            </button>

            <button
              onClick={() => {
                setBulkImportFormat('csv');
                setIsBulkImportOpen(true);
              }}
              className="page-banner-btn-secondary"
              title="Import faculty members from CSV spreadsheet"
            >
              <Upload size={14} strokeWidth={2.2} /> Import CSV
            </button>
          </div>

          <button
            onClick={() => {
              setTeacherToEdit(null);
              setIsEditModalOpen(true);
            }}
            className="page-banner-primary-btn"
          >
            <Plus size={16} strokeWidth={2.5} /> Add New Teacher
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', background: 'var(--bg-surface, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {/* 2. Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Total Teachers */}
          <div
            onClick={() => setSelectedFacultyFilter('all')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedFacultyFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedFacultyFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  TOTAL TEACHERS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Active faculty members
                </div>
              </div>
              <Users size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Appointed Advisers */}
          <div
            onClick={() => setSelectedFacultyFilter('adviser')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedFacultyFilter === 'adviser' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedFacultyFilter === 'adviser' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  CLASS ADVISERS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.advisersCount}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Assigned section leads
                </div>
              </div>
              <UserCheck size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Subject Teachers */}
          <div
            onClick={() => setSelectedFacultyFilter('subject')}
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: selectedFacultyFilter === 'subject' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: selectedFacultyFilter === 'subject' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SUBJECT TEACHERS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.subjectTeachers}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Instructional faculty
                </div>
              </div>
              <GraduationCap size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Departments */}
          <div
            style={{
              background: 'var(--bg-surface, #ffffff)',
              border: '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  DEPARTMENTS
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.departmentsCount}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Academic learning groups
                </div>
              </div>
              <Building size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* 3. Search & Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '420px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by faculty name, position, department, or section..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '9px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                background: '#ffffff',
                outline: 'none',
                color: '#1f2937'
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '0' }}>
            <div style={{ minWidth: '120px', flex: '1' }}>
              <CustomSelect
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                options={[
                  { value: 10, label: '10 per page' },
                  { value: 25, label: '25 per page' },
                  { value: 50, label: '50 per page' }
                ]}
              />
            </div>

            {/* List / Grid View Toggle */}
            <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Batch Selection Action Bar */}
        {selectedIds.length > 0 && (
          <div
            style={{
              marginTop: '16px',
              padding: '10px 16px',
              background: '#f8fafc',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
              {selectedIds.length} faculty member(s) selected
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleDeleteSelected}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 size={14} /> Delete Selected
              </button>

              <button
                onClick={() => setSelectedIds([])}
                style={{
                  background: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* 4. Table (Desktop View) */}
        <div className={`responsive-table-desktop teacher-table-container ${viewMode === 'grid' ? 'force-hidden' : ''}`} style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ width: 44, textAlign: 'center', padding: '14px 10px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f' }}
                  />
                </th>

                <th
                  onClick={() => handleSort('name')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    FACULTY TEACHER {renderSortIcon('name')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('position')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    POSITION & DEPARTMENT {renderSortIcon('position')}
                  </div>
                </th>

                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', letterSpacing: '0.04em', width: '200px' }}>
                  ADVISORY SECTION
                </th>

                <th
                  onClick={() => handleSort('email')}
                  style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', cursor: 'pointer', userSelect: 'none', letterSpacing: '0.04em' }}
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    CONTACT & EMAIL {renderSortIcon('email')}
                  </div>
                </th>

                <th style={{ padding: '14px 16px', fontSize: '12px', fontWeight: 800, color: '#334155', textAlign: 'right', width: '250px', letterSpacing: '0.04em' }}>
                  ACTIONS
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading faculty directory...</td>
                </tr>
              ) : filteredAndSorted.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No faculty teachers found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedTeachers.map((teacher) => {
                  const isChecked = selectedIds.includes(teacher.id);
                  const fullName = `${teacher.fname} ${teacher.lname}`.trim();
                  const initials = `${(teacher.fname || 'T')[0]}${(teacher.lname || 'C')[0]}`;
                  const adv = advisers.find(a => a.teacher_id === teacher.id);

                  return (
                    <tr
                      key={teacher.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseOver={(e) => { if (!isChecked) e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseOut={(e) => { if (!isChecked) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <td style={{ textAlign: 'center', padding: '14px 10px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(teacher.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f' }}
                        />
                      </td>

                      {/* Name & Photo */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {teacher.image ? (
                            <img
                              src={teacher.image}
                              alt={fullName}
                              style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: adv ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '13.5px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                              }}
                            >
                              {initials}
                            </div>
                          )}
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                              {fullName}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                              Faculty ID: #{teacher.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Position & Department */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #1e293b)', display: 'block' }}>
                            {teacher.position || 'Teacher I'}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                            {teacher.department || 'Junior High Faculty'}
                          </span>
                        </div>
                      </td>

                      {/* Advisory Section */}
                      <td style={{ padding: '14px 16px' }}>
                        {adv ? (
                          <span
                            className="badge-minor"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.3)'
                            }}
                          >
                            {adv.grade_level} - {adv.class_section}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-dim, #94a3b8)', fontStyle: 'italic' }}>
                            None (Subject Teacher)
                          </span>
                        )}
                      </td>

                      {/* Contact & Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--text-secondary, #334155)' }}>
                            <Mail size={13} color="var(--text-muted, #94a3b8)" />
                            <span>{teacher.email}</span>
                          </div>
                          {teacher.contact && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                              <Phone size={13} color="var(--text-muted, #94a3b8)" />
                              <span>{teacher.contact}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => setTeacherForAdviser(teacher)}
                            style={{
                              background: adv ? 'rgba(34, 197, 94, 0.12)' : 'var(--bg-surface-elevated, #f0f4f8)',
                              color: adv ? '#4ade80' : 'var(--brand-blue, #07345f)',
                              border: adv ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-subtle, #cbd5e1)',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s'
                            }}
                            title={adv ? `Currently assigned to ${adv.grade_level} - ${adv.class_section}. Click to manage/reassign.` : 'Appoint as Class Section Adviser'}
                          >
                            <Award size={13} /> {adv ? 'Manage' : 'Appoint'}
                          </button>

                          <button
                            onClick={() => {
                              setTeacherToEdit(teacher);
                              setIsEditModalOpen(true);
                            }}
                            style={{
                              background: 'var(--bg-surface-elevated, #f8fafc)',
                              color: 'var(--text-secondary, #334155)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Edit3 size={13} /> Edit
                          </button>

                          <button
                            onClick={() => handleDeleteTeacher(teacher.id, fullName)}
                            style={{
                              background: 'var(--bg-surface-elevated, #f8fafc)',
                              color: 'var(--text-muted, #64748b)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
                              padding: '6px 10px',
                              borderRadius: '7px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s'
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Faculty Cards (Mobile View) */}
        <div className={`responsive-cards-mobile ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`} style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8', gridColumn: '1 / -1' }}>
              Loading faculty directory...
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8', gridColumn: '1 / -1' }}>
              No faculty teachers found matching your filter criteria.
            </div>
          ) : viewMode === 'grid' ? (
            paginatedTeachers.map((teacher) => {
              const isChecked = selectedIds.includes(teacher.id);
              const fullName = `${teacher.fname} ${teacher.lname}`.trim();
              const initials = `${(teacher.fname || 'T')[0]}${(teacher.lname || 'C')[0]}`;
              const adv = advisers.find(a => a.teacher_id === teacher.id);

              return (
                <div
                  key={teacher.id}
                  className={`entity-grid-card ${isChecked ? 'is-selected' : ''}`}
                >
                  {/* Top Badges Row */}
                  <div className="entity-grid-top-badges">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(teacher.id)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#07345f' }}
                    />
                    {adv ? (
                      <span
                        className="badge-minor"
                        style={{
                          padding: '2px 9px',
                          borderRadius: '20px',
                          fontSize: '10px',
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {adv.grade_level}
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '2px 9px',
                          borderRadius: '20px',
                          fontSize: '10px',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#64748b',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Subject
                      </span>
                    )}
                  </div>

                  {/* Center Avatar & Info */}
                  {teacher.image ? (
                    <img
                      src={teacher.image}
                      alt={fullName}
                      className="entity-grid-avatar"
                    />
                  ) : (
                    <div
                      className="entity-grid-avatar"
                      style={{
                        background: adv ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '15px'
                      }}
                    >
                      {initials}
                    </div>
                  )}

                  <div className="entity-grid-name" title={fullName}>
                    {fullName}
                  </div>

                  <div className="entity-grid-meta">
                    <div className="entity-grid-meta-primary" style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {teacher.position || 'Teacher I'}
                    </div>
                    <div className="entity-grid-meta-secondary" style={{ color: '#64748b', fontSize: '9.5px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {teacher.department || 'Faculty Dept'}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="entity-grid-actions">
                    <button
                      type="button"
                      onClick={() => setTeacherForAdviser(teacher)}
                      className="entity-grid-btn is-positive-action"
                      title={adv ? 'Adviser Assigned' : 'Appoint as Class Adviser'}
                      style={{ color: adv ? '#16a34a' : '#07345f', borderColor: adv ? '#bbf7d0' : '#cbd5e1', background: adv ? '#f0fdf4' : '#ffffff' }}
                    >
                      <Award size={11} strokeWidth={2.4} /> {adv ? 'Adv' : 'Appoint'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTeacherToEdit(teacher);
                        setIsEditModalOpen(true);
                      }}
                      className="entity-grid-btn"
                      title="Edit Teacher Details"
                      style={{ flex: '0 0 28px' }}
                    >
                      <Edit3 size={11} strokeWidth={2.4} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTeacher(teacher.id, fullName)}
                      className="entity-grid-btn is-delete"
                      title="Delete Teacher Record"
                      style={{ flex: '0 0 28px', color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}
                    >
                      <Trash2 size={11} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            paginatedTeachers.map((teacher) => {
              const isChecked = selectedIds.includes(teacher.id);
              const fullName = `${teacher.fname} ${teacher.lname}`.trim();
              const initials = `${(teacher.fname || 'T')[0]}${(teacher.lname || 'C')[0]}`;
              const adv = advisers.find(a => a.teacher_id === teacher.id);

              return (
                <div
                  key={teacher.id}
                  className={`teacher-mobile-list-card${isChecked ? ' is-selected' : ''}`}
                  style={{
                    background: isChecked ? '#f8fafc' : '#ffffff',
                    border: isChecked ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Top Row: Checkbox + Avatar + Name + Adviser Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(teacher.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#07345f', flexShrink: 0 }}
                      />
                      {teacher.image ? (
                        <img
                          src={teacher.image}
                          alt={fullName}
                          style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2e8f0', flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: '50%',
                            background: adv ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '13px',
                            flexShrink: 0
                          }}
                        >
                          {initials}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="teacher-mobile-list-name" style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fullName}
                        </div>
                        <div className="teacher-mobile-list-id" style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Faculty #{teacher.id} • {teacher.position || 'Teacher I'}
                        </div>
                      </div>
                    </div>

                    {adv ? (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: '#dcfce7',
                          color: '#15803d',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        {adv.grade_level} - {adv.class_section}
                      </span>
                    ) : (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          fontWeight: 600,
                          background: '#f1f5f9',
                          color: '#64748b',
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        Subject Teacher
                      </span>
                    )}
                  </div>

                  {/* Middle Row: Department & Contact */}
                  <div className="teacher-mobile-list-details" style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>
                      {teacher.department || 'Faculty Department'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} color="#94a3b8" />
                      <span style={{ wordBreak: 'break-all' }}>{teacher.email}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="teacher-mobile-list-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => setTeacherForAdviser(teacher)}
                      className="is-positive-action"
                      style={{
                        background: adv ? '#f0fdf4' : '#f0f4f8',
                        color: adv ? '#16a34a' : '#07345f',
                        border: adv ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Award size={12} /> {adv ? 'Adviser' : 'Appoint'}
                    </button>

                    <button
                      onClick={() => {
                        setTeacherToEdit(teacher);
                        setIsEditModalOpen(true);
                      }}
                      style={{
                        background: '#f8fafc',
                        color: '#334155',
                        border: '1px solid #cbd5e1',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Edit3 size={12} /> Edit
                    </button>

                    <button
                      onClick={() => handleRemoveTeacher(teacher.id, fullName)}
                      className="is-delete"
                      style={{
                        background: '#fef2f2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Pagination Footer */}
        <div className="pagination-footer-responsive table-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
            {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} teachers
          </span>

          <div className="pagination-btn-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage > 1 ? 'pointer' : 'default', fontSize: '12px' }}
            >
              «
            </button>
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage > 1 ? 'pointer' : 'default', fontSize: '12px' }}
            >
              ‹
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                aria-current={pageNum === currentPage ? 'page' : undefined}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: pageNum === currentPage ? '#0f172a' : '#ffffff',
                  color: pageNum === currentPage ? '#ffffff' : '#334155',
                  fontWeight: 700,
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {pageNum}
              </button>
            ))}

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage < totalPages ? 'pointer' : 'default', fontSize: '12px' }}
            >
              ›
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: currentPage < totalPages ? 'pointer' : 'default', fontSize: '12px' }}
            >
              »
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Add Teacher Modal */}
      <EditTeacherModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        teacher={teacherToEdit}
        onSaved={handleSaveTeacher}
      />

      {/* Appoint / Manage Adviser Modal */}
      <AppointAdviserModal
        isOpen={!!teacherForAdviser}
        onClose={() => setTeacherForAdviser(null)}
        teacher={teacherForAdviser}
        currentAdviser={teacherForAdviser ? advisers.find(a => Number(a.teacher_id) === Number(teacherForAdviser.id)) : null}
        onAppointed={handleAppointAdviser}
        onUnassign={async (adviserId) => {
          try {
            await dataService.removeAdviser(adviserId);
            success('Adviser unassigned from section.');
            setTeacherForAdviser(null);
            loadData();
          } catch (err) {
            error('Failed to unassign adviser: ' + err.message);
          }
        }}
      />

      {/* Bulk Import Faculty Modal */}
      <BulkImportTeachersModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImported={loadData}
        initialFormat={bulkImportFormat}
      />

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
