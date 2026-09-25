import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
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
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';

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
  const { success, error } = useNotification();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
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

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await dataService.getStudents();
      setStudents(data || []);
    } catch (err) {
      error('Failed to load students: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = students.length;
    const jhsCount = students.filter(s => getGradeNumber(s.grade) >= 7 && getGradeNumber(s.grade) <= 10).length;
    const shsCount = students.filter(s => getGradeNumber(s.grade) >= 11 && getGradeNumber(s.grade) <= 12).length;
    const uniqueStrands = new Set(students.map(s => getStudentStrand(s))).size;

    return { total, jhsCount, shsCount, uniqueStrands };
  }, [students]);

  // Filtered & Sorted Student List
  const filteredAndSortedStudents = useMemo(() => {
    // 1. Filter
    const result = students.filter(s => {
      const fullName = `${s.fname || ''} ${s.mname || ''} ${s.lname || ''}`.toLowerCase();
      const lrn = (s.lrn || '').toLowerCase();
      const grade = (s.grade || '').toLowerCase();
      const section = (s.section || '').toLowerCase();
      const guardian = (s.parent_name || '').toLowerCase();
      const strand = getStudentStrand(s).toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        lrn.includes(query) ||
        grade.includes(query) ||
        section.includes(query) ||
        guardian.includes(query) ||
        strand.includes(query);

      const gNum = getGradeNumber(s.grade);
      const isJhs = gNum >= 7 && gNum <= 10;
      const isShs = gNum >= 11 && gNum <= 12;

      const matchesLevel =
        levelFilter === 'all' ||
        (levelFilter === 'jhs' && isJhs) ||
        (levelFilter === 'shs' && isShs);

      const matchesGrade =
        gradeFilter === 'all' ||
        (s.grade || '').toLowerCase() === gradeFilter.toLowerCase();

      const matchesStrand =
        strandFilter === 'all' ||
        getStudentStrand(s).toLowerCase() === strandFilter.toLowerCase();

      return matchesSearch && matchesLevel && matchesGrade && matchesStrand;
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
        const nameA = `${a.lname}, ${a.fname}`.toLowerCase();
        const nameB = `${b.lname}, ${b.fname}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'lrn') {
        comparison = (a.lrn || '').localeCompare(b.lrn || '');
      } else if (sortField === 'section') {
        comparison = (a.section || '').localeCompare(b.section || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, searchTerm, levelFilter, gradeFilter, strandFilter, sortField, sortOrder]);

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
  const handleExportStudents = () => {
    try {
      const doc = new jsPDF();
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
        head: [['#', 'LRN', 'Student Name', 'Grade', 'Strand / Track', 'Section', 'Gender', 'Guardian']],
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
      const headers = ['LRN', 'First Name', 'Middle Name', 'Last Name', 'Grade', 'Strand', 'Section', 'Gender', 'Contact', 'Parent Name', 'Parent Contact'];
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

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedStudents.length / entriesPerPage) || 1;
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} color="#94a3b8" style={{ marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} color="#27367f" style={{ marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} color="#27367f" style={{ marginLeft: 4 }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner & Primary Actions */}
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
            <GraduationCap size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Student Directory
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
                {students.length} Enrolled {students.length === 1 ? 'Student' : 'Students'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Comprehensive student records, grade level and academic strand management, and digital ID badges.
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
                padding: '9px 16px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)'
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
              <Download size={15} /> Export PDF
            </button>

            <button
              onClick={handleExportCsv}
              className="page-banner-btn-secondary"
              title="Download raw CSV spreadsheet"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsBulkImportOpen(true)}
                className="page-banner-btn-secondary"
              >
                <FileSpreadsheet size={15} /> Import CSV
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
              <UserPlus size={16} strokeWidth={2.5} /> Add Student
            </button>
          )}
        </div>
      </div>

      {/* Grade & Level Analytics Metric Cards */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Total Students */}
        <div
          onClick={() => { setLevelFilter('all'); setGradeFilter('all'); setStrandFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: levelFilter === 'all' && gradeFilter === 'all' && strandFilter === 'all' ? '2px solid #27367f' : '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Students
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Across all levels & strands
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={22} />
            </div>
          </div>
          {levelFilter === 'all' && gradeFilter === 'all' && strandFilter === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#27367f' }}></div>
          )}
        </div>

        {/* Junior High (G7-10) */}
        <div
          onClick={() => { setLevelFilter('jhs'); setGradeFilter('all'); setStrandFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: levelFilter === 'jhs' ? '2px solid #059669' : '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Junior High (G7-10)
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {stats.jhsCount}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                Basic Education Students
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={22} />
            </div>
          </div>
          {levelFilter === 'jhs' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#059669' }}></div>
          )}
        </div>

        {/* Senior High (G11-12) */}
        <div
          onClick={() => { setLevelFilter('shs'); setGradeFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: levelFilter === 'shs' ? '2px solid #7c3aed' : '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Senior High (G11-12)
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {stats.shsCount}
              </div>
              <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '4px', fontWeight: 600 }}>
                Specialized Strands & Tracks
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={22} />
            </div>
          </div>
          {levelFilter === 'shs' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#7c3aed' }}></div>
          )}
        </div>

        {/* Active Academic Strands */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Academic Strands
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {stats.uniqueStrands}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                STEM, ABM, HUMSS, GAS, JHS
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={22} />
            </div>
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
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
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
                  color: '#94a3b8'
                }}
              />
              <input
                type="text"
                placeholder="Search by student name, LRN, grade, strand, or section..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  width: '100%',
                  padding: '9px 34px 9px 38px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#0f172a',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#27367f'; e.currentTarget.style.background = '#ffffff'; }}
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
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sorting & Filter Selectors */}
            <div className="mobile-filter-grid" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Sort By Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '180px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                  Sort:
                </span>
                <CustomSelect
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
                    { value: 'name-asc', label: 'Student Name (A → Z)' },
                    { value: 'name-desc', label: 'Student Name (Z → A)' },
                    { value: 'lrn-asc', label: 'Student ID (LRN)' },
                    { value: 'section-asc', label: 'Section Name' }
                  ]}
                />
              </div>

              {/* Grade Filter */}
              <div style={{ minWidth: '140px' }}>
                <CustomSelect
                  value={gradeFilter}
                  onChange={(e) => {
                    setGradeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
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

              {/* Strand Filter */}
              <div style={{ minWidth: '140px' }}>
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

              {/* Entries per page */}
              <div style={{ minWidth: '110px' }}>
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
            </div>
          </div>

          {/* Quick Active Filters Feedback */}
          {(searchTerm || levelFilter !== 'all' || gradeFilter !== 'all' || strandFilter !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Active Filters:</span>
              {levelFilter !== 'all' && (
                <span style={{ background: '#eef2ff', color: '#27367f', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Level: {levelFilter.toUpperCase()}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => setLevelFilter('all')} />
                </span>
              )}
              {gradeFilter !== 'all' && (
                <span style={{ background: '#eef2ff', color: '#27367f', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
        <div className="responsive-table-desktop">
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
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=27367f&color=fff&size=40`
                            }
                            alt="Student Avatar"
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
                              LRN: <strong style={{ color: '#334155' }}>{s.lrn}</strong> • {s.gender || 'Male'}
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
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#2563eb',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                            title="View Student Full Profile"
                          >
                            <Eye size={13} /> View
                          </button>

                          {/* ID Card */}
                          <button
                            type="button"
                            onClick={() => setStudentForIdCard(s)}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                            title="Generate Digital Student ID"
                          >
                            <IdCard size={13} /> ID Card
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
                                background: '#f5f3ff',
                                border: '1px solid #ddd6fe',
                                color: '#7c3aed',
                                padding: '6px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'background 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#ede9fe'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#f5f3ff'; }}
                              title="Edit Student Info"
                            >
                              <Edit3 size={13} /> Edit
                            </button>
                          )}

                          {/* Delete */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(s.id, `${s.fname} ${s.lname}`)}
                              style={{
                                background: '#ffffff',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                padding: '6px 9px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'background 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                              title="Delete Student"
                            >
                              <Trash2 size={13} />
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
        <div className="responsive-cards-mobile">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Users size={28} color="#94a3b8" />
              <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>Loading student directory...</div>
            </div>
          ) : paginatedStudents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <Users size={32} color="#94a3b8" />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginTop: '8px' }}>No students found</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                No records match your selected grade, strand, or search criteria.
              </div>
            </div>
          ) : (
            paginatedStudents.map((s) => {
              const isChecked = selectedIds.includes(s.id);
              const strand = getStudentStrand(s);
              const isSHS = getGradeNumber(s.grade) >= 11;

              return (
                <div
                  key={s.id}
                  style={{
                    background: isChecked ? '#f8faff' : '#ffffff',
                    border: isChecked ? '1.5px solid #27367f' : '1px solid #e2e8f0',
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
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#27367f', flexShrink: 0 }}
                      />
                      <img
                        src={
                          s.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=27367f&color=fff&size=38`
                        }
                        alt="Student Avatar"
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
                          LRN: <strong style={{ color: '#334155' }}>{s.lrn}</strong> • {s.gender || 'Male'}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                    <button
                      type="button"
                      onClick={() => setStudentForViewModal(s)}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        padding: '5px 9px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Eye size={12} /> View
                    </button>

                    <button
                      type="button"
                      onClick={() => setStudentForIdCard(s)}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        color: '#334155',
                        padding: '5px 9px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <IdCard size={12} /> ID Card
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setStudentToEdit(s);
                          setIsAddModalOpen(true);
                        }}
                        style={{
                          background: '#f5f3ff',
                          border: '1px solid #ddd6fe',
                          color: '#7c3aed',
                          padding: '5px 9px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit3 size={12} /> Edit
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(s.id, `${s.fname} ${s.lname}`)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        <Trash2 size={12} />
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

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                        background: p === currentPage ? '#27367f' : '#ffffff',
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
