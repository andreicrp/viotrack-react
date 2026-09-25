import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { EditTeacherModal } from '../components/teachers/EditTeacherModal';
import { AppointAdviserModal } from '../components/teachers/AppointAdviserModal';
import { BulkImportTeachersModal } from '../components/teachers/BulkImportTeachersModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useNotification } from '../context/NotificationContext';
import { exportToCsv } from '../utils/csvHelper';
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
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const TeachersPage = () => {
  const { success, error, info } = useNotification();
  const [teachers, setTeachers] = useState([]);
  const [advisers, setAdvisers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleSaveTeacher = (updatedTeacher) => {
    if (teacherToEdit) {
      setTeachers(teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
      success(`Updated details for ${updatedTeacher.fname} ${updatedTeacher.lname}`);
    } else {
      const newT = { ...updatedTeacher, id: Date.now() };
      setTeachers([newT, ...teachers]);
      success(`Added teacher: ${newT.fname} ${newT.lname}`);
    }
    setIsEditModalOpen(false);
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

  const handleRemoveTeacher = (id, name) => {
    if (window.confirm(`Are you sure you want to remove teacher: ${name}?`)) {
      setTeachers(teachers.filter(t => t.id !== id));
      setSelectedIds(prev => prev.filter(x => x !== id));
      success('Teacher removed from faculty.');
    }
  };

  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to remove ${selectedIds.length} selected teacher(s)?`)) {
      setTeachers(teachers.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]);
      success('Selected teachers removed.');
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(39, 54, 127);
    doc.rect(0, 0, 210, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('PERPETUAL HELP COLLEGE OF MANILA', 14, 11);
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

    doc.save(`Viotrack_Faculty_Directory_${Date.now()}.pdf`);
    success('Exported Faculty Directory as PDF!');
  };

  const handleExportCSV = () => {
    try {
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

      exportToCsv(`Viotrack_Faculty_${Date.now()}`, headers, rows);
      success(`Exported ${rows.length} faculty members to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  // Filter & Sort Pipeline
  const filteredAndSorted = useMemo(() => {
    let result = teachers.filter(t => {
      const isAdv = advisers.some(a => a.teacher_id === t.id);
      // Filter Type
      if (selectedFacultyFilter === 'adviser' && !isAdv) return false;
      if (selectedFacultyFilter === 'subject' && isAdv) return false;

      // Search
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
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
  }, [teachers, advisers, selectedFacultyFilter, searchTerm, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / entriesPerPage) || 1;
  const paginatedTeachers = filteredAndSorted.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ color: '#94a3b8', marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#27367f', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#27367f', marginLeft: 4 }} />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. Top Banner & Primary Actions */}
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
            <Users size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Faculty Teachers & Advisers
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
                {stats.total} Total Faculty
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Comprehensive faculty roster, advisory appointments, department heads, and academic educators.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={handleExportPDF}
              className="page-banner-btn-secondary"
              title="Download formatted PDF faculty directory"
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

            <button
              onClick={() => setIsBulkImportOpen(true)}
              className="page-banner-btn-secondary"
              title="Import faculty members from CSV"
            >
              <Upload size={15} /> Import CSV
            </button>
          </div>

          <button
            onClick={() => {
              setTeacherToEdit(null);
              setIsEditModalOpen(true);
            }}
            className="page-banner-primary-btn"
          >
            <UserPlus size={16} strokeWidth={2.5} /> Add New Teacher
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        {/* 2. Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {/* Total Teachers */}
          <div
            onClick={() => setSelectedFacultyFilter('all')}
            style={{
              background: selectedFacultyFilter === 'all' ? '#eff6ff' : '#ffffff',
              border: selectedFacultyFilter === 'all' ? '2px solid #2563eb' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedFacultyFilter === 'all' ? '0 4px 12px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', lineHeight: 1, display: 'block' }}>
                  {stats.total}
                </span>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Total Teachers</span>
              </div>
            </div>
            {selectedFacultyFilter === 'all' && (
              <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                All
              </span>
            )}
          </div>

          {/* Appointed Advisers */}
          <div
            onClick={() => setSelectedFacultyFilter(selectedFacultyFilter === 'adviser' ? 'all' : 'adviser')}
            style={{
              background: selectedFacultyFilter === 'adviser' ? '#f0fdf4' : '#ffffff',
              border: selectedFacultyFilter === 'adviser' ? '2px solid #16a34a' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedFacultyFilter === 'adviser' ? '0 4px 12px rgba(22, 163, 74, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#14532d', lineHeight: 1, display: 'block' }}>
                  {stats.advisersCount}
                </span>
                <span style={{ fontSize: '12.5px', color: '#15803d', fontWeight: 600 }}>Class Advisers</span>
              </div>
            </div>
            {selectedFacultyFilter === 'adviser' && (
              <span style={{ background: '#16a34a', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                Active Filter
              </span>
            )}
          </div>

          {/* Subject Teachers */}
          <div
            onClick={() => setSelectedFacultyFilter(selectedFacultyFilter === 'subject' ? 'all' : 'subject')}
            style={{
              background: selectedFacultyFilter === 'subject' ? '#fffbeb' : '#ffffff',
              border: selectedFacultyFilter === 'subject' ? '2px solid #d97706' : '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: selectedFacultyFilter === 'subject' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <GraduationCap size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#78350f', lineHeight: 1, display: 'block' }}>
                  {stats.subjectTeachers}
                </span>
                <span style={{ fontSize: '12.5px', color: '#92400e', fontWeight: 600 }}>Subject Teachers</span>
              </div>
            </div>
            {selectedFacultyFilter === 'subject' && (
              <span style={{ background: '#d97706', color: '#fff', fontSize: '10px', padding: '2px 7px', borderRadius: '6px', fontWeight: 700 }}>
                Active Filter
              </span>
            )}
          </div>

          {/* Departments */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building size={22} />
              </div>
              <div>
                <span style={{ fontSize: '26px', fontWeight: 800, color: '#1e293b', lineHeight: 1, display: 'block' }}>
                  {stats.departmentsCount}
                </span>
                <span style={{ fontSize: '12.5px', color: '#64748b', fontWeight: 600 }}>Departments</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Search & Control Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '22px', flexWrap: 'wrap', gap: '12px' }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
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
        <div className="responsive-table-desktop" style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                <th style={{ width: 44, textAlign: 'center', padding: '14px 10px' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedIds.length > 0 && selectedIds.length === filteredAndSorted.length}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#27367f' }}
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
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#27367f' }}
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
                                background: adv ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #27367f 0%, #4338ca 100%)',
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
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                              {fullName}
                            </span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              Faculty ID: #{teacher.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Position & Department */}
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                            {teacher.position || 'Teacher I'}
                          </span>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            {teacher.department || 'Junior High Faculty'}
                          </span>
                        </div>
                      </td>

                      {/* Advisory Section */}
                      <td style={{ padding: '14px 16px' }}>
                        {adv ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              background: '#dcfce7',
                              color: '#15803d'
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                            {adv.grade_level} - {adv.class_section}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                            None (Subject Teacher)
                          </span>
                        )}
                      </td>

                      {/* Contact & Email */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#334155' }}>
                            <Mail size={13} color="#94a3b8" />
                            <span>{teacher.email}</span>
                          </div>
                          {teacher.contact && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b' }}>
                              <Phone size={13} color="#94a3b8" />
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
                              background: adv ? '#f0fdf4' : '#eff6ff',
                              color: adv ? '#16a34a' : '#2563eb',
                              border: adv ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
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
                            title="Appoint as Class Section Adviser"
                          >
                            <Award size={13} /> {adv ? 'Adviser' : 'Appoint'}
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
                            onClick={() => handleRemoveTeacher(teacher.id, fullName)}
                            style={{
                              background: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
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
        <div className="responsive-cards-mobile" style={{ marginTop: '16px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
              Loading faculty directory...
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
              No faculty teachers found matching your filter criteria.
            </div>
          ) : (
            paginatedTeachers.map((teacher) => {
              const isChecked = selectedIds.includes(teacher.id);
              const fullName = `${teacher.fname} ${teacher.lname}`.trim();
              const initials = `${(teacher.fname || 'T')[0]}${(teacher.lname || 'C')[0]}`;
              const adv = advisers.find(a => a.teacher_id === teacher.id);

              return (
                <div
                  key={teacher.id}
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
                  {/* Top Row: Checkbox + Avatar + Name + Adviser Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(teacher.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#27367f', flexShrink: 0 }}
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
                            background: adv ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #27367f 0%, #4338ca 100%)',
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
                        <div style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {fullName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#475569' }}>
                    <div style={{ fontWeight: 600, color: '#334155' }}>
                      {teacher.department || 'Faculty Department'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail size={12} color="#94a3b8" />
                      <span style={{ wordBreak: 'break-all' }}>{teacher.email}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', paddingTop: '4px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      onClick={() => setTeacherForAdviser(teacher)}
                      style={{
                        background: adv ? '#f0fdf4' : '#eff6ff',
                        color: adv ? '#16a34a' : '#2563eb',
                        border: adv ? '1px solid #bbf7d0' : '1px solid #bfdbfe',
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '18px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredAndSorted.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
            {Math.min(currentPage * entriesPerPage, filteredAndSorted.length)} of {filteredAndSorted.length} teachers
          </span>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: pageNum === currentPage ? '#27367f' : '#ffffff',
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

      {/* Appoint Adviser Modal */}
      <AppointAdviserModal
        isOpen={!!teacherForAdviser}
        onClose={() => setTeacherForAdviser(null)}
        teacher={teacherForAdviser}
        onAppointed={handleAppointAdviser}
      />

      {/* Bulk Import Faculty Modal */}
      <BulkImportTeachersModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onImported={loadData}
      />
    </div>
  );
};
