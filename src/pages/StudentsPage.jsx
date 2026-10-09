import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { dataService } from '../services/dataService';
import { AddStudentModal } from '../components/students/AddStudentModal';
import { StudentIdModal } from '../components/students/StudentIdModal';
import { BulkImportModal } from '../components/students/BulkImportModal';
import { ViewStudentModal } from '../components/students/ViewStudentModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Users,
  Search,
  UserPlus,
  FileSpreadsheet,
  FileText,
  Download,
  Upload,
  Plus,
  Trash2,
  Edit3,
  Eye,
  IdCard,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  School,
  Layers,
  BookOpen,
  Filter,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';

import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { SkeletonTable, SkeletonCardGrid } from '../components/common/SkeletonLoader';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

// Helper to detect Strand / Academic Track
export const getStudentStrand = (student) => {
  if (student.strand) return student.strand;
  const sec = (student.section || '').toUpperCase();
  if (sec.includes('STEM')) return 'STEM';
  if (sec.includes('HUMSS')) return 'HUMSS';
  if (sec.includes('ABM')) return 'ABM';
  if (sec.includes('GAS')) return 'GAS';
  if (sec.includes('TVL')) return 'TVL';
  if (sec.includes('ICT')) return 'ICT';
  if (sec.includes('HE')) return 'HE';

  const gNum = parseInt((student.grade || '').replace(/\D/g, ''), 10);
  if (gNum >= 11) return 'Academic Track';
  return 'JHS Core';
};

export const getGradeNumber = (gradeStr) => {
  const num = parseInt((gradeStr || '').replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
};

export const StudentsPage = () => {
  const { user } = useAuth();
  const { success, error, undo } = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Students',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Student Roster As'
  });

  // Keyboard navigation shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      setIsAddModalOpen(false);
      setIsBulkImportOpen(false);
      setStudentForId(null);
      setViewStudentData(null);
      setEditStudentData(null);
    }
  });

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [yearFilter, setYearFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'jhs' | 'shs'
  const [gradeFilter, setGradeFilter] = useState('all');
  const [strandFilter, setStrandFilter] = useState('all');

  // Sorting: 'grade' | 'strand' | 'name' | 'lrn' | 'section'
  const [sortField, setSortField] = useState('grade');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Pagination & Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentForIdCard, setStudentForIdCard] = useState(null);
  const [studentForViewModal, setStudentForViewModal] = useState(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportFormat, setBulkImportFormat] = useState('all'); // 'all' | 'pdf' | 'csv'

  const isAdmin = user?.role === 'admin';

  const loadStudents = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await dataService.getStudents(forceRefresh);
      setStudents(data || []);
    } catch (err) {
      error('Failed to load students: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadStudents();
    const handleDataUpdate = () => {
      loadStudents(true);
    };
    window.addEventListener('viotrack_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('viotrack_data_updated', handleDataUpdate);
    };
  }, [loadStudents]);

  // Helper sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Statistics calculation - optimized single pass for 10,000+ students
  const stats = useMemo(() => {
    const total = students.length;
    let jhsCount = 0;
    let shsCount = 0;
    const strandSet = new Set();

    for (let i = 0; i < total; i++) {
      const s = students[i];
      const gNum = getGradeNumber(s.grade);
      if (gNum >= 7 && gNum <= 10) jhsCount++;
      else if (gNum >= 11 && gNum <= 12) shsCount++;
      strandSet.add(getStudentStrand(s));
    }

    return { total, jhsCount, shsCount, uniqueStrands: strandSet.size };
  }, [students]);

  // Dynamic School Year Options
  const schoolYearOptions = useMemo(() => {
    const yearsSet = new Set(['2026-2027', '2025-2026', '2024-2025']);
    (students || []).forEach(s => {
      const y = (s.academicyear || s.academic_year || s.school_year || '').trim();
      if (y) {
        const cleaned = y.replace(/^s\.?y\.?\s*/i, '').trim();
        if (cleaned) yearsSet.add(cleaned);
      }
    });
    const sorted = Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
    return [
      { value: 'all', label: 'All School Years' },
      ...sorted.map(yr => ({ value: yr, label: `S.Y. ${yr}` }))
    ];
  }, [students]);

  // Filtered & Sorted Student List with deferred non-blocking search
  const filteredAndSortedStudents = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    const isAllLevel = levelFilter === 'all';
    const isAllGrade = gradeFilter === 'all';
    const isAllStrand = strandFilter === 'all';
    const isAllYear = yearFilter === 'all';
    const targetGrade = gradeFilter.toLowerCase();
    const targetStrand = strandFilter.toLowerCase();
    const targetYear = yearFilter.toLowerCase().replace(/[^0-9-]/g, '');

    // 1. Filter
    const result = students.filter(s => {
      const gNum = getGradeNumber(s.grade);
      const isJhs = gNum >= 7 && gNum <= 10;
      const isShs = gNum >= 11 && gNum <= 12;

      const matchesLevel =
        isAllLevel ||
        (levelFilter === 'jhs' && isJhs) ||
        (levelFilter === 'shs' && isShs);

      if (!matchesLevel) return false;

      const sGrade = (s.grade || '').toLowerCase();
      const matchesGrade = isAllGrade || sGrade === targetGrade;
      if (!matchesGrade) return false;

      const sYear = String(s.academicyear || s.academic_year || s.school_year || '2025-2026').trim();
      const sYearClean = sYear.toLowerCase().replace(/[^0-9-]/g, '');
      const matchesYear = isAllYear || sYearClean === targetYear || sYear.toLowerCase().includes(yearFilter.toLowerCase());
      if (!matchesYear) return false;

      const studentStrand = getStudentStrand(s);
      const matchesStrand = isAllStrand || studentStrand.toLowerCase() === targetStrand;
      if (!matchesStrand) return false;

      if (!query) return true;

      const fullName = `${s.fname || ''} ${s.mname || ''} ${s.lname || ''}`.toLowerCase();
      const lrn = (s.lrn || '').toLowerCase();
      const section = (s.section || '').toLowerCase();
      const guardian = (s.parent_name || '').toLowerCase();
      const strand = studentStrand.toLowerCase();

      return (
        fullName.includes(query) ||
        lrn.includes(query) ||
        sGrade.includes(query) ||
        section.includes(query) ||
        guardian.includes(query) ||
        strand.includes(query)
      );
    });

    // 2. Sort
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'grade') {
        const gA = getGradeNumber(a.grade);
        const gB = getGradeNumber(b.grade);
        comparison = gA - gB;
        if (comparison === 0) {
          comparison = (a.section || '').localeCompare(b.section || '');
        }
      } else if (sortField === 'strand') {
        const strandA = getStudentStrand(a);
        const strandB = getStudentStrand(b);
        comparison = strandA.localeCompare(strandB);
        if (comparison === 0) {
          comparison = getGradeNumber(a.grade) - getGradeNumber(b.grade);
        }
      } else if (sortField === 'name') {
        const nameA = `${a.lname || ''}, ${a.fname || ''}`.toLowerCase();
        const nameB = `${b.lname || ''}, ${b.fname || ''}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'lrn') {
        comparison = (a.lrn || '').localeCompare(b.lrn || '');
      } else if (sortField === 'section') {
        comparison = (a.section || '').localeCompare(b.section || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, deferredSearch, levelFilter, gradeFilter, strandFilter, yearFilter, sortField, sortOrder]);

  // Selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSortedStudents.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Delete Handlers
  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected student(s)?`)) {
      try {
        for (const id of selectedIds) {
          await dataService.deleteStudent(id);
        }
        success(`Successfully removed ${selectedIds.length} students.`);
        setSelectedIds([]);
        loadStudents();
      } catch (err) {
        error('Bulk delete failed: ' + err.message);
      }
    }
  };

  const handleDeleteSingle = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove student: ${name}?`)) {
      try {
        await dataService.deleteStudent(id);
        success('Student removed from system.');
        loadStudents();
      } catch (err) {
        error('Delete failed: ' + err.message);
      }
    }
  };

  // Save As Export Handler
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Student ID', 'First Name', 'Middle Name', 'Last Name', 'Grade', 'Strand', 'Section', 'Gender', 'Contact', 'Parent Name', 'Parent Contact'];
    const rows = filteredAndSortedStudents.map(s => [
      s.lrn,
      s.fname,
      s.mname || '',
      s.lname,
      s.grade,
      getStudentStrand(s),
      s.section,
      s.gender || 'N/A',
      s.contact || 'N/A',
      s.parent_name || 'N/A',
      s.parent_contact || 'N/A'
    ]);

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
      doc.setFontSize(16);
      doc.setTextColor(39, 54, 127);
      doc.text('VIOTRACK - OFFICIAL STUDENT ROSTER', 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Sorted by: ${sortField.toUpperCase()} (${sortOrder.toUpperCase()}) | Total Students: ${filteredAndSortedStudents.length} | Generated: ${new Date().toLocaleDateString()}`, 14, 23);

      const tableData = filteredAndSortedStudents.map((s, idx) => [
        idx + 1,
        s.lrn,
        `${s.lname}, ${s.fname}`,
        s.grade,
        getStudentStrand(s),
        s.section,
        s.gender || 'N/A',
        s.parent_name || 'N/A'
      ]);

      doc.autoTable({
        head: [['#', 'Student ID', 'Student Name', 'Grade', 'Strand / Track', 'Section', 'Gender', 'Guardian']],
        body: tableData,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Students_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Student Roster As'
    });
    setSaveAsModalOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStudents.length / entriesPerPage) || 1;
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

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
      {/* Top Banner & Primary Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Users size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Student Directory
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              View and manage student records, grades, levels, and academic strand information.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          {selectedIds.length > 0 && isAdmin && (
            <button
              onClick={handleDeleteSelected}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)'
              }}
            >
              <Trash2 size={15} /> Delete Selected ({selectedIds.length})
            </button>
          )}

          <div className="page-banner-secondary-group">
            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF student roster"
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

            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setBulkImportFormat('pdf');
                    setIsBulkImportOpen(true);
                  }}
                  className="page-banner-btn-secondary"
                  title="Import students from PDF document"
                >
                  <Upload size={14} strokeWidth={2.2} /> Import PDF
                </button>

                <button
                  onClick={() => {
                    setBulkImportFormat('csv');
                    setIsBulkImportOpen(true);
                  }}
                  className="page-banner-btn-secondary"
                  title="Import students from CSV spreadsheet"
                >
                  <Upload size={14} strokeWidth={2.2} /> Import CSV
                </button>
              </>
            )}
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setStudentToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="page-banner-primary-btn"
            >
              <Plus size={16} strokeWidth={2.5} /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Grade & Level Analytics Metric Cards */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {/* Total Students */}
        <div
          onClick={() => { setLevelFilter('all'); setGradeFilter('all'); setStrandFilter('all'); }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: levelFilter === 'all' && gradeFilter === 'all' && strandFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: levelFilter === 'all' && gradeFilter === 'all' && strandFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL STUDENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                Across all levels & strands
              </div>
            </div>
            <Users size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>

        {/* Junior High (G7-10) */}
        <div
          onClick={() => { setLevelFilter('jhs'); setGradeFilter('all'); setStrandFilter('all'); }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: levelFilter === 'jhs' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: levelFilter === 'jhs' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
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
                Basic education students
              </div>
            </div>
            <BookOpen size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>

        {/* Senior High (G11-12) */}
        <div
          onClick={() => { setLevelFilter('shs'); setGradeFilter('all'); }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: levelFilter === 'shs' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: levelFilter === 'shs' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
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
                Specialized strands & tracks
              </div>
            </div>
            <GraduationCap size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>

        {/* Active Academic Strands */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ACADEMIC STRANDS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.uniqueStrands}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                STEM, ABM, HUMSS, GAS, JHS
              </div>
            </div>
            <Layers size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Main Table Card with Integrated Search, Sort & Filters */}
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        {/* Toolbar Controls */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94a3b8)'
                }}
              />
              <input
                type="text"
                placeholder="Search by student name, Student ID, grade, strand, or section..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 38px',
                  border: '1px solid var(--border-subtle, #cbd5e1)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: 'var(--text-primary, #0f172a)',
                  background: 'var(--bg-input, #f8fafc)',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--brand-blue, #07345f)'; e.currentTarget.style.background = 'var(--bg-surface, #ffffff)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle, #cbd5e1)'; e.currentTarget.style.background = 'var(--bg-input, #f8fafc)'; }}
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
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sorting & Filter Selectors */}
            <div className="mobile-filter-grid">
              {/* Sort By Selector */}
              <div className="mobile-filter-item">
                <CustomSelect
                  icon={ArrowUpDown}
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [f, o] = e.target.value.split('-');
                    setSortField(f);
                    setSortOrder(o);
                  }}
                  options={[
                    { value: 'grade-asc', label: 'Grade (7 → 12)' },
                    { value: 'grade-desc', label: 'Grade (12 → 7)' },
                    { value: 'strand-asc', label: 'Strand (A → Z)' },
                    { value: 'strand-desc', label: 'Strand (Z → A)' },
                    { value: 'name-asc', label: 'Name (A → Z)' },
                    { value: 'name-desc', label: 'Name (Z → A)' },
                    { value: 'lrn-asc', label: 'Student ID' },
                    { value: 'section-asc', label: 'Section' }
                  ]}
                />
              </div>

              {/* School Year / Academic Batch Filter */}
              <div className="mobile-filter-item">
                <CustomSelect
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={schoolYearOptions}
                />
              </div>

              {/* Grade / Year Level Filter */}
              <div className="mobile-filter-item">
                <CustomSelect
                  value={gradeFilter}
                  onChange={(e) => {
                    setGradeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Year Levels' },
                    { value: 'Grade 7', label: 'Grade 7 (1st Year)' },
                    { value: 'Grade 8', label: 'Grade 8 (2nd Year)' },
                    { value: 'Grade 9', label: 'Grade 9 (3rd Year)' },
                    { value: 'Grade 10', label: 'Grade 10 (4th Year)' },
                    { value: 'Grade 11', label: 'Grade 11 (SHS Yr 1)' },
                    { value: 'Grade 12', label: 'Grade 12 (SHS Yr 2)' }
                  ]}
                />
              </div>

              {/* Strand Filter */}
              <div className="mobile-filter-item">
                <CustomSelect
                  value={strandFilter}
                  onChange={(e) => {
                    setStrandFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Strands' },
                    { value: 'STEM', label: 'STEM' },
                    { value: 'ABM', label: 'ABM' },
                    { value: 'HUMSS', label: 'HUMSS' },
                    { value: 'GAS', label: 'GAS' },
                    { value: 'TVL', label: 'TVL' },
                    { value: 'JHS Core', label: 'JHS Core' }
                  ]}
                />
              </div>

              {/* Entries per page & List / Grid View Toggle combined */}
              <div className="mobile-filter-item mobile-filter-item-utility">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <CustomSelect
                    value={entriesPerPage}
                    onChange={(e) => {
                      setEntriesPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: 10, label: '10 / page' },
                      { value: 25, label: '25 / page' },
                      { value: 50, label: '50 / page' },
                      { value: 100, label: '100 / page' }
                    ]}
                  />
                </div>
                <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
              </div>
            </div>
          </div>

          {/* Quick Active Filters Feedback */}
          {(searchTerm || levelFilter !== 'all' || gradeFilter !== 'all' || strandFilter !== 'all' || yearFilter !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Active Filters:</span>
              {yearFilter !== 'all' && (
                <span style={{ background: '#f0fdf4', color: '#15803d', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  S.Y.: {yearFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setYearFilter('all')} />
                </span>
              )}
              {levelFilter !== 'all' && (
                <span style={{ background: '#f0f4f8', color: '#07345f', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Level: {levelFilter.toUpperCase()}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('all')} />
                </span>
              )}
              {gradeFilter !== 'all' && (
                <span style={{ background: '#f0f4f8', color: '#07345f', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Grade: {gradeFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setGradeFilter('all')} />
                </span>
              )}
              {strandFilter !== 'all' && (
                <span style={{ background: '#f5f3ff', color: '#7c3aed', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Strand: {strandFilter}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setStrandFilter('all')} />
                </span>
              )}
              {searchTerm && (
                <span style={{ background: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Query: "{searchTerm}"
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setSearchTerm('')} />
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setYearFilter('all');
                  setLevelFilter('all');
                  setGradeFilter('all');
                  setStrandFilter('all');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Student Table (Desktop View) */}
        <div className={`responsive-table-desktop ${viewMode === 'grid' ? 'force-hidden' : ''}`}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: '48px', padding: '14px 18px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      paginatedStudents.length > 0 &&
                      paginatedStudents.every(s => selectedIds.includes(s.id))
                    }
                    style={{ cursor: 'pointer' }}
                  />
                </th>

                {/* Student Name */}
                <th
                  onClick={() => handleSort('name')}
                  style={{
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Student {renderSortIcon('name')}
                  </div>
                </th>

                {/* Grade Level */}
                <th
                  onClick={() => handleSort('grade')}
                  style={{
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Grade Level {renderSortIcon('grade')}
                  </div>
                </th>

                {/* Academic Strand / Track */}
                <th
                  onClick={() => handleSort('strand')}
                  style={{
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Strand / Track {renderSortIcon('strand')}
                  </div>
                </th>

                {/* Section */}
                <th
                  onClick={() => handleSort('section')}
                  style={{
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Section {renderSortIcon('section')}
                  </div>
                </th>

                {/* Guardian / Contact */}
                <th
                  style={{
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Guardian Info
                </th>

                {/* Action */}
                <th
                  style={{
                    padding: '14px 18px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    textAlign: 'right'
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: entriesPerPage > 10 ? 8 : entriesPerPage }).map((_, rIdx) => (
                  <tr key={`skel-student-${rIdx}`}>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '18px', height: '18px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="skeleton-pulse" style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton-pulse" style={{ width: '140px', height: '14px', borderRadius: '4px', marginBottom: '4px' }} />
                          <div className="skeleton-pulse" style={{ width: '90px', height: '11px', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '100px', height: '13px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '80px', height: '22px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '90px', height: '13px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '85px', height: '22px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <div className="skeleton-pulse" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                        <div className="skeleton-pulse" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={32} color="#94a3b8" />
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>No students found</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        No records match your selected grade, strand, or search criteria.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((s) => {
                  const isChecked = selectedIds.includes(s.id);
                  const strand = getStudentStrand(s);
                  const isSHS = getGradeNumber(s.grade) >= 11;

                  return (
                    <tr
                      key={s.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isChecked ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => { if (!isChecked) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseOut={(e) => { if (!isChecked) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      {/* Checkbox */}
                      <td style={{ textAlign: 'center', padding: '14px 18px' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(s.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Student Profile */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={
                              s.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=07345f&color=fff&size=40`
                            }
                            alt="Student Avatar"
                            loading="lazy"
                            decoding="async"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: '10px',
                              objectFit: 'cover',
                              border: '1px solid #e2e8f0',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary, #0f172a)' }}>
                              {s.fname} {s.mname ? s.mname[0] + '. ' : ''}{s.lname}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '1px' }}>
                              Student ID: <strong style={{ color: 'var(--text-secondary, #334155)' }}>{s.lrn}</strong> • {s.gender || 'Male'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade Level Badge */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          className={isSHS ? 'badge-purple' : 'badge-blue'}
                          style={{
                            background: isSHS ? '#f5f3ff' : '#eff6ff',
                            color: isSHS ? '#6d28d9' : '#1d4ed8',
                            border: `1px solid ${isSHS ? '#c4b5fd' : '#bfdbfe'}`,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            display: 'inline-block'
                          }}
                        >
                          {s.grade}
                        </span>
                      </td>

                      {/* Strand / Track Badge */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          className={isSHS ? 'badge-minor' : 'badge-neutral'}
                          style={{
                            background: isSHS ? '#f0fdf4' : 'var(--bg-surface-elevated, #f8fafc)',
                            color: isSHS ? '#15803d' : 'var(--text-secondary, #334155)',
                            border: `1px solid ${isSHS ? '#86efac' : 'var(--border-subtle, #cbd5e1)'}`,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Layers size={11} /> {strand}
                        </span>
                      </td>

                      {/* Section */}
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary, #334155)' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>{s.section}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>{s.academicyear || '2025-2026'}</div>
                      </td>

                      {/* Guardian Info */}
                      <td style={{ padding: '14px 18px', fontSize: '13px' }}>
                        <div style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}>{s.parent_name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '1px' }}>
                          {s.parent_contact || 'No contact number'}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => setStudentForViewModal(s)}
                            className="student-row-action-btn"
                            style={{
                              background: 'var(--bg-surface-elevated, #ffffff)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
                              color: 'var(--brand-blue, #07345f)',
                              padding: '7px 13px',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            title="View Student Full Profile"
                          >
                            <Eye size={14} color="var(--brand-blue, #07345f)" strokeWidth={2.2} /> View
                          </button>

                          {/* ID Card */}
                          <button
                            type="button"
                            onClick={() => setStudentForIdCard(s)}
                            className="student-row-action-btn"
                            style={{
                              background: 'var(--bg-surface-elevated, #ffffff)',
                              border: '1px solid var(--border-subtle, #cbd5e1)',
                              color: 'var(--text-secondary, #334155)',
                              padding: '7px 13px',
                              borderRadius: '8px',
                              fontSize: '12.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            title="Generate Official Student ID"
                          >
                            <IdCard size={14} color="var(--text-muted, #475569)" strokeWidth={2.2} /> ID Card
                          </button>

                          {/* Edit */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentToEdit(s);
                                setIsAddModalOpen(true);
                              }}
                              className="student-row-action-btn"
                              style={{
                                background: 'var(--bg-surface-elevated, #ffffff)',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                color: 'var(--text-secondary, #334155)',
                                padding: '7px 13px',
                                borderRadius: '8px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                              title="Edit Student Info"
                            >
                              <Edit3 size={14} color="var(--text-muted, #475569)" strokeWidth={2.2} /> Edit
                            </button>
                          )}

                          {/* Delete */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(s.id, `${s.fname} ${s.lname}`)}
                              className="student-row-action-btn"
                              style={{
                                background: 'var(--bg-surface-elevated, #ffffff)',
                                border: '1px solid var(--border-subtle, #cbd5e1)',
                                color: 'var(--text-muted, #64748b)',
                                padding: '7px 11px',
                                borderRadius: '8px',
                                fontSize: '12.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                              title="Delete Student"
                            >
                              <Trash2 size={14} strokeWidth={2.2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Student Cards (Mobile View) */}
        <div className={`responsive-cards-mobile ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', width: '100%' }}>
              <SkeletonCardGrid cards={6} />
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', gridColumn: '1 / -1' }}>
              <Users size={32} color="#94a3b8" />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginTop: '8px' }}>No students found</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                No records match your selected grade, strand, or search criteria.
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            paginatedStudents.map((s) => {
              const isChecked = selectedIds.includes(s.id);
              const strand = getStudentStrand(s);
              const isSHS = getGradeNumber(s.grade) >= 11;

              return (
                <div
                  key={s.id}
                  className={`entity-grid-card ${isChecked ? 'is-selected' : ''}`}
                >
                  {/* Top Badges Row */}
                  <div className="entity-grid-top-badges">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(s.id)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#07345f' }}
                    />
                    <span
                      className={isSHS ? 'badge-purple' : 'badge-blue'}
                      style={{
                        background: isSHS ? '#f5f3ff' : '#eff6ff',
                        color: isSHS ? '#7c3aed' : '#2563eb',
                        border: `1px solid ${isSHS ? '#ddd6fe' : '#bfdbfe'}`,
                        padding: '2px 9px',
                        borderRadius: '20px',
                        fontSize: '10px',
                        fontWeight: 700
                      }}
                    >
                      {s.grade}
                    </span>
                  </div>

                  {/* Center Avatar & Info */}
                  <img
                    src={
                      s.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=07345f&color=fff&size=48`
                    }
                    alt="Student"
                    loading="lazy"
                    decoding="async"
                    className="entity-grid-avatar"
                  />

                  <div className="entity-grid-name" title={`${s.fname} ${s.lname}`}>
                    {s.fname} {s.lname}
                  </div>

                  <div className="entity-grid-meta">
                    <div className="entity-grid-meta-primary" style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.section}
                    </div>
                    <div className={`entity-grid-meta-secondary${isSHS ? ' student-mobile-grid-strand' : ''}`} style={{ color: isSHS ? '#047857' : '#64748b', fontSize: '9.5px', marginTop: '1px', fontWeight: 600 }}>
                      {strand}
                    </div>
                    <div className="entity-grid-meta-tertiary" style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
                      Student ID: {s.lrn}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="entity-grid-actions">
                    <button
                      type="button"
                      onClick={() => setStudentForViewModal(s)}
                      className="entity-grid-btn"
                      title="View Student Profile"
                    >
                      <Eye size={12} strokeWidth={2.4} /> View
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentForIdCard(s)}
                      className="entity-grid-btn"
                      title="Generate ID Card"
                    >
                      <IdCard size={12} strokeWidth={2.4} /> ID
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentToEdit(s);
                          setIsAddModalOpen(true);
                        }}
                        className="entity-grid-btn"
                        title="Edit Student"
                        style={{ padding: '6px 4px', flex: '0 0 28px' }}
                      >
                        <Edit3 size={12} strokeWidth={2.4} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            paginatedStudents.map((s) => {
              const isChecked = selectedIds.includes(s.id);
              const strand = getStudentStrand(s);
              const isSHS = getGradeNumber(s.grade) >= 11;

              return (
                <div
                  key={s.id}
                  className={`student-mobile-list-card${isChecked ? ' is-selected' : ''}`}
                  style={{
                    background: isChecked ? '#f0f4f8' : '#ffffff',
                    border: isChecked ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  {/* Top Header: Checkbox + Avatar + Name + Grade Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(s.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#07345f', flexShrink: 0 }}
                      />
                      <img
                        src={
                          s.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=07345f&color=fff&size=38`
                        }
                        alt="Student Avatar"
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="student-mobile-list-name" style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.fname} {s.mname ? s.mname[0] + '. ' : ''}{s.lname}
                        </div>
                        <div className="student-mobile-list-id" style={{ fontSize: '11px', color: '#64748b' }}>
                          Student ID: <strong style={{ color: '#334155' }}>{s.lrn}</strong> • {s.gender || 'Male'}
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <span
                        style={{
                          background: isSHS ? '#f5f3ff' : '#eff6ff',
                          color: isSHS ? '#7c3aed' : '#2563eb',
                          border: `1px solid ${isSHS ? '#ddd6fe' : '#bfdbfe'}`,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700
                        }}
                      >
                        {s.grade}
                      </span>
                    </div>
                  </div>

                  {/* Academic details box */}
                  <div className="student-mobile-list-details" style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Section & SY:</span>
                      <strong style={{ color: '#1e293b' }}>{s.section} ({s.academicyear || '2025-2026'})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Strand:</span>
                      <strong className="student-mobile-list-strand" style={{ color: isSHS ? '#047857' : '#475569' }}>{strand}</strong>
                    </div>
                    {s.parent_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>Guardian:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{s.parent_name} {s.parent_contact ? `(${s.parent_contact})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div className="student-mobile-list-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setStudentForViewModal(s)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#07345f',
                        padding: '7px 13px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <Eye size={14} color="#07345f" strokeWidth={2.2} /> View
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentForIdCard(s)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '7px 13px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <IdCard size={14} color="#475569" strokeWidth={2.2} /> ID Card
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentToEdit(s);
                          setIsAddModalOpen(true);
                        }}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          padding: '7px 13px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <Edit3 size={14} color="#475569" strokeWidth={2.2} /> Edit
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(s.id, `${s.fname} ${s.lname}`)}
                        className="is-delete"
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#64748b',
                          padding: '7px 11px',
                          borderRadius: '8px',
                          fontSize: '12.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <Trash2 size={14} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination & Status Footer */}
        <div
          className="pagination-footer-responsive table-footer"
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
            color: '#64748b'
          }}
        >
          <div>
            Showing{' '}
            <strong style={{ color: '#0f172a' }}>
              {filteredAndSortedStudents.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong style={{ color: '#0f172a' }}>
              {Math.min(currentPage * entriesPerPage, filteredAndSortedStudents.length)}
            </strong>{' '}
            of <strong style={{ color: '#0f172a' }}>{filteredAndSortedStudents.length}</strong> students
          </div>

          <div className="pagination-btn-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                borderRadius: '6px',
                background: 'var(--bg-surface-elevated, #ffffff)',
                color: currentPage === 1 ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary, #334155)',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span style={{ padding: '0 4px', color: 'var(--text-muted, #94a3b8)' }}>...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      aria-current={p === currentPage ? 'page' : undefined}
                      style={{
                        padding: '6px 12px',
                        border: p === currentPage ? 'none' : '1px solid var(--border-subtle, #cbd5e1)',
                        borderRadius: '6px',
                        background: p === currentPage ? 'var(--brand-blue, #0f172a)' : 'var(--bg-surface-elevated, #ffffff)',
                        color: p === currentPage ? '#ffffff' : 'var(--text-secondary, #334155)',
                        fontWeight: p === currentPage ? 700 : 500,
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                borderRadius: '6px',
                background: 'var(--bg-surface-elevated, #ffffff)',
                color: currentPage === totalPages ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary, #334155)',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* View Student Modal */}
      <ViewStudentModal
        isOpen={!!studentForViewModal}
        onClose={() => setStudentForViewModal(null)}
        student={studentForViewModal}
      />

      {/* Add / Edit Student Modal */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setStudentToEdit(null);
        }}
        studentToEdit={studentToEdit}
        onSaved={() => {
          loadStudents(true);
          setStudentToEdit(null);
        }}
      />

      {/* ID Badge Modal with QR code */}
      {studentForIdCard && (
        <StudentIdModal
          isOpen={!!studentForIdCard}
          onClose={() => setStudentForIdCard(null)}
          student={studentForIdCard}
        />
      )}

      {/* Bulk CSV / PDF Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImported={loadStudents}
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
