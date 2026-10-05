import React, { useState, useCallback } from 'react';
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

import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { useStudentsQuery } from '../hooks/dataQueries';
import { DataSearchField } from '../components/common/DataSearchField';
import { DataTableFrame } from '../components/common/DataTableFrame';
import { useDataTableState } from '../hooks/useDataTableState';
import { useStudentTableData } from '../hooks/useStudentTableData';
import { getGradeNumber, getStudentStrand } from '../utils/studentUtils';
export { getGradeNumber, getStudentStrand } from '../utils/studentUtils';

export const StudentsPage = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const { data: students = [], isPending: loading, refetch: refetchStudents } = useStudentsQuery();
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const {
    searchTerm, setSearchTerm, deferredSearch,
    sortField, setSortField, sortOrder, setSortOrder, handleSort,
    selectedIds, setSelectedIds, entriesPerPage, setEntriesPerPage,
    currentPage, setCurrentPage
  } = useDataTableState({ initialSortField: 'grade', initialSortOrder: 'asc' });

  // Search & Filters
  const [yearFilter, setYearFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all'); // 'all' | 'jhs' | 'shs'
  const [gradeFilter, setGradeFilter] = useState('all');
  const [strandFilter, setStrandFilter] = useState('all');


  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);
  const [studentForIdCard, setStudentForIdCard] = useState(null);
  const [studentForViewModal, setStudentForViewModal] = useState(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const loadStudents = useCallback(async (_forceRefresh = false) => {
    const result = await refetchStudents();
    if (result.error) error('Failed to load students: ' + result.error.message);
    return result.data || [];
  }, [error, refetchStudents]);

  const { stats, filteredAndSortedStudents, totalPages, paginatedStudents } = useStudentTableData({
    students,
    search: deferredSearch,
    levelFilter,
    gradeFilter,
    strandFilter,
    sortField,
    sortOrder,
    currentPage,
    entriesPerPage
  });

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

  // PDF Export
  const handleExportStudents = async () => {
    try {
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

      doc.save(`Viotrack_Student_Roster_${Date.now()}.pdf`);
      success('Exported Student Roster PDF successfully!');
    } catch (err) {
      error('Failed to export PDF: ' + err.message);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    try {
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

      exportToCsv(`Viotrack_Students_${Date.now()}`, headers, rows);
      success(`Exported ${rows.length} students to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} color="#94a3b8" style={{ marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} color="#07345f" style={{ marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} color="#07345f" style={{ marginLeft: 4 }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Banner & Primary Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Users size={26} color="#0f172a" strokeWidth={2.4} style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Student Directory
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
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
              onClick={handleExportStudents}
              className="page-banner-btn-secondary"
              title="Download formatted PDF roster"
            >
              <Upload size={14} strokeWidth={2.2} /> Export PDF
            </button>

            <button
              onClick={handleExportCsv}
              className="page-banner-btn-secondary"
              title="Download raw CSV spreadsheet"
            >
              <FileText size={14} strokeWidth={2.2} /> Export CSV
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="page-banner-btn-secondary"
              >
                <Upload size={14} strokeWidth={2.2} /> Import CSV
              </button>
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
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: levelFilter === 'all' && gradeFilter === 'all' && strandFilter === 'all' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: levelFilter === 'all' && gradeFilter === 'all' && strandFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL STUDENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Across all levels & strands
              </div>
            </div>
            <Users size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>

        {/* Junior High (G7-10) */}
        <div
          onClick={() => { setLevelFilter('jhs'); setGradeFilter('all'); setStrandFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: levelFilter === 'jhs' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: levelFilter === 'jhs' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                JUNIOR HIGH (G7-10)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.jhsCount}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Basic education students
              </div>
            </div>
            <BookOpen size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>

        {/* Senior High (G11-12) */}
        <div
          onClick={() => { setLevelFilter('shs'); setGradeFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: levelFilter === 'shs' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: levelFilter === 'shs' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                SENIOR HIGH (G11-12)
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.shsCount}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Specialized strands & tracks
              </div>
            </div>
            <GraduationCap size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>

        {/* Active Academic Strands */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ACADEMIC STRANDS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.uniqueStrands}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                STEM, ABM, HUMSS, GAS, JHS
              </div>
            </div>
            <Layers size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>
      </div>

      {/* Main Table Card with Integrated Search, Sort & Filters */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        {/* Toolbar Controls */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <DataSearchField
              label="Search students"
              placeholder="Search by student name, Student ID, grade, strand, or section..."
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              onClear={() => setSearchTerm('')}
              maxWidth={420}
            />

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
                  options={[
                    { value: 'all', label: 'All School Years' },
                    { value: '2026-2027', label: 'S.Y. 2026-2027' },
                    { value: '2025-2026', label: 'S.Y. 2025-2026' },
                    { value: '2024-2025', label: 'S.Y. 2024-2025' }
                  ]}
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
          {(searchTerm || levelFilter !== 'all' || gradeFilter !== 'all' || strandFilter !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Active Filters:</span>
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
        <DataTableFrame label="Students table" className={`responsive-table-desktop ${viewMode === 'grid' ? 'force-hidden' : ''}`}>
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
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Users size={28} color="#94a3b8" />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading student directory...</span>
                    </div>
                  </td>
                </tr>
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
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                              {s.fname} {s.mname ? s.mname[0] + '. ' : ''}{s.lname}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                              Student ID: <strong style={{ color: '#334155' }}>{s.lrn}</strong> • {s.gender || 'Male'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade Level Badge */}
                      <td style={{ padding: '14px 18px' }}>
                        <span
                          style={{
                            background: isSHS ? '#f5f3ff' : '#eff6ff',
                            color: isSHS ? '#7c3aed' : '#2563eb',
                            border: `1px solid ${isSHS ? '#ddd6fe' : '#bfdbfe'}`,
                            padding: '3px 10px',
                            borderRadius: '12px',
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
                          style={{
                            background: isSHS ? '#ecfdf5' : '#f1f5f9',
                            color: isSHS ? '#047857' : '#475569',
                            border: `1px solid ${isSHS ? '#a7f3d0' : '#e2e8f0'}`,
                            padding: '3px 10px',
                            borderRadius: '8px',
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
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#334155' }}>
                        <div style={{ fontWeight: 600 }}>{s.section}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.academicyear || '2025-2026'}</div>
                      </td>

                      {/* Guardian Info */}
                      <td style={{ padding: '14px 18px', fontSize: '13px' }}>
                        <div style={{ color: '#0f172a', fontWeight: 600 }}>{s.parent_name || 'N/A'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
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
                              transition: 'all 0.15s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            title="View Student Full Profile"
                          >
                            <Eye size={14} color="#07345f" strokeWidth={2.2} /> View
                          </button>

                          {/* ID Card */}
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
                              transition: 'all 0.15s',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                            title="Generate Digital Student ID"
                          >
                            <IdCard size={14} color="#475569" strokeWidth={2.2} /> ID Card
                          </button>

                          {/* Edit */}
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
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                              title="Edit Student Info"
                            >
                              <Edit3 size={14} color="#475569" strokeWidth={2.2} /> Edit
                            </button>
                          )}

                          {/* Delete */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(s.id, `${s.fname} ${s.lname}`)}
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
                                gap: '4px',
                                transition: 'all 0.15s',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.color = '#ef4444'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; }}
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
        </DataTableFrame>

        {/* Student Cards (Mobile View) */}
        <div className={`responsive-cards-mobile ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', gridColumn: '1 / -1' }}>
              <Users size={28} color="#94a3b8" />
              <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>Loading student directory...</div>
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
                      style={{
                        background: isSHS ? '#f5f3ff' : '#eff6ff',
                        color: isSHS ? '#7c3aed' : '#2563eb',
                        border: `1px solid ${isSHS ? '#ddd6fe' : '#bfdbfe'}`,
                        padding: '1.5px 7px',
                        borderRadius: '8px',
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
                    <div style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.section}
                    </div>
                    <div style={{ color: isSHS ? '#047857' : '#64748b', fontSize: '9.5px', marginTop: '1px', fontWeight: 600 }}>
                      {strand}
                    </div>
                    <div style={{ fontSize: '9.5px', color: '#94a3b8', marginTop: '2px' }}>
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
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.fname} {s.mname ? s.mname[0] + '. ' : ''}{s.lname}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
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
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Section & SY:</span>
                      <strong style={{ color: '#1e293b' }}>{s.section} ({s.academicyear || '2025-2026'})</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ color: '#64748b' }}>Strand:</span>
                      <strong style={{ color: isSHS ? '#047857' : '#475569' }}>{strand}</strong>
                    </div>
                    {s.parent_name && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                        <span style={{ color: '#64748b' }}>Guardian:</span>
                        <span style={{ color: '#334155', fontWeight: 600 }}>{s.parent_name} {s.parent_contact ? `(${s.parent_contact})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0', flexWrap: 'wrap' }}>
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
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#ffffff',
                color: currentPage === 1 ? '#94a3b8' : '#334155',
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
                    {showEllipsis && <span style={{ padding: '0 4px', color: '#94a3b8' }}>...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      style={{
                        padding: '6px 12px',
                        border: p === currentPage ? 'none' : '1px solid #cbd5e1',
                        borderRadius: '6px',
                        background: p === currentPage ? '#0f172a' : '#ffffff',
                        color: p === currentPage ? '#ffffff' : '#334155',
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
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#ffffff',
                color: currentPage === totalPages ? '#94a3b8' : '#334155',
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
        onClose={() => setIsAddModalOpen(false)}
        studentToEdit={studentToEdit}
        onSaved={loadStudents}
      />

      {/* ID Badge Modal with QR code */}
      {studentForIdCard && (
        <StudentIdModal
          isOpen={!!studentForIdCard}
          onClose={() => setStudentForIdCard(null)}
          student={studentForIdCard}
        />
      )}

      {/* Bulk CSV Import Modal */}
      <BulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImported={loadStudents}
      />
    </div>
  );
};
