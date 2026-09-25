import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { BulkViolationModal } from '../components/violations/BulkViolationModal';
import { ResolutionModal } from '../components/violations/ResolutionModal';
import { StatusModal } from '../components/violations/StatusModal';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { CustomSelect } from '../components/common/CustomSelect';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Search,
  Plus,
  Trash2,
  FileText,
  Download,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';

export const ViolationsPage = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'investigation' | 'resolved' | 'escalated'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'minor' | 'serious' | 'major'
  const [gradeFilter, setGradeFilter] = useState('all');
  const [exportDate, setExportDate] = useState('2026-09-25');

  // Sorting: 'date' | 'name' | 'severity' | 'status' | 'grade'
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Pagination & Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [recordForStatusChange, setRecordForStatusChange] = useState(null);
  const [selectedRecordForResolution, setSelectedRecordForResolution] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await dataService.getRecords();
      setRecords(data || []);
    } catch (err) {
      error('Failed to load records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Metric Analytics
  const stats = useMemo(() => {
    const total = records.length;
    const pending = records.filter(r => (r.status || '').toLowerCase() === 'pending').length;
    const investigation = records.filter(r => (r.status || '').toLowerCase() === 'investigation').length;
    const resolved = records.filter(r => (r.status || '').toLowerCase() === 'resolved').length;
    const majorCount = records.filter(r => (r.violation?.type || '').toLowerCase() === 'major').length;

    return { total, pending, investigation, resolved, majorCount };
  }, [records]);

  // Sorting Helper
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and Sorted Records
  const filteredAndSortedRecords = useMemo(() => {
    // 1. Filter
    const result = records.filter(r => {
      const student = r.student || {};
      const sName = `${student.fname || ''} ${student.lname || ''}`.toLowerCase();
      const sLrn = (student.lrn || '').toLowerCase();
      const sGrade = (student.grade || '').toLowerCase();
      const sSection = (student.section || '').toLowerCase();
      const vTitle = (r.violation?.title || '').toLowerCase();
      const vType = (r.violation?.type || '').toLowerCase();
      const status = (r.status || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        sName.includes(query) ||
        sLrn.includes(query) ||
        sGrade.includes(query) ||
        sSection.includes(query) ||
        vTitle.includes(query) ||
        vType.includes(query) ||
        status.includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        status === statusFilter.toLowerCase();

      const matchesSeverity =
        severityFilter === 'all' ||
        vType === severityFilter.toLowerCase();

      const matchesGrade =
        gradeFilter === 'all' ||
        sGrade === gradeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesSeverity && matchesGrade;
    });

    // 2. Sort
    result.sort((a, b) => {
      let comparison = 0;

      if (sortField === 'date') {
        const timeA = new Date(a.date_reported || 0).getTime();
        const timeB = new Date(b.date_reported || 0).getTime();
        comparison = timeA - timeB;
      } else if (sortField === 'name') {
        const nameA = `${a.student?.lname || ''}, ${a.student?.fname || ''}`.toLowerCase();
        const nameB = `${b.student?.lname || ''}, ${b.student?.fname || ''}`.toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (sortField === 'severity') {
        const severityRank = { major: 3, serious: 2, minor: 1 };
        const rankA = severityRank[(a.violation?.type || '').toLowerCase()] || 0;
        const rankB = severityRank[(b.violation?.type || '').toLowerCase()] || 0;
        comparison = rankA - rankB;
      } else if (sortField === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'grade') {
        const numA = parseInt((a.student?.grade || '').replace(/\D/g, ''), 10) || 0;
        const numB = parseInt((b.student?.grade || '').replace(/\D/g, ''), 10) || 0;
        comparison = numA - numB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [records, searchTerm, statusFilter, severityFilter, gradeFilter, sortField, sortOrder]);

  // Bulk Selection Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSortedRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected record(s)?`)) {
      try {
        for (const id of selectedIds) {
          await dataService.deleteRecord(id);
        }
        success(`Successfully deleted ${selectedIds.length} records.`);
        setSelectedIds([]);
        loadRecords();
      } catch (err) {
        error('Bulk delete failed: ' + err.message);
      }
    }
  };

  const handleResolveSelected = async () => {
    try {
      for (const id of selectedIds) {
        await dataService.updateRecordStatus(id, {
          status: 'Resolved',
          resolution_notes: 'Resolved via bulk action'
        });
      }
      success(`Marked ${selectedIds.length} records as Resolved.`);
      setSelectedIds([]);
      loadRecords();
    } catch (err) {
      error('Bulk resolve failed: ' + err.message);
    }
  };

  const handleDeleteSingle = async (id) => {
    if (window.confirm('Are you sure you want to delete this violation record?')) {
      try {
        await dataService.deleteRecord(id);
        success('Violation record deleted successfully.');
        loadRecords();
      } catch (err) {
        error('Delete failed: ' + err.message);
      }
    }
  };

  const handleStatusUpdated = async (recordId, newStatus) => {
    try {
      await dataService.updateRecordStatus(recordId, { status: newStatus });
      setRecords(records.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
      success(`Status updated successfully to "${newStatus}"!`);
    } catch (err) {
      error('Failed to update status: ' + err.message);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(39, 54, 127);
      doc.text('VIOTRACK - OFFICIAL VIOLATION INCIDENT REPORT', 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Export Date: ${exportDate || new Date().toLocaleDateString()} | Total Incidents: ${filteredAndSortedRecords.length}`, 14, 23);

      const tableData = filteredAndSortedRecords.map((r, idx) => [
        idx + 1,
        r.student ? `${r.student.lname}, ${r.student.fname}` : 'N/A',
        r.student ? `${r.student.grade} - ${r.student.section}` : 'N/A',
        r.violation?.title || 'N/A',
        r.violation?.type || 'Minor',
        new Date(r.date_reported).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
        r.status || 'Pending'
      ]);

      doc.autoTable({
        head: [['#', 'Student Name', 'Grade & Section', 'Violation Offense', 'Severity', 'Date Reported', 'Status']],
        body: tableData,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      doc.save(`Viotrack_Violation_Records_${exportDate || Date.now()}.pdf`);
      success('Exported PDF Violation Report successfully!');
    } catch (err) {
      error('Failed to export PDF: ' + err.message);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ['Record ID', 'LRN', 'Student Name', 'Grade', 'Section', 'Offense', 'Severity', 'Reported By', 'Reporter Type', 'Date Reported', 'Sanction', 'Status', 'Remarks', 'Resolution Notes'];
      const rows = filteredAndSortedRecords.map(r => [
        r.id,
        r.student?.lrn || '',
        r.student ? `${r.student.fname} ${r.student.lname}` : 'N/A',
        r.student?.grade || '',
        r.student?.section || '',
        r.violation?.title || 'N/A',
        r.violation?.type || 'Minor',
        r.reported_by_name || 'Admin',
        r.reported_by_type || 'admin',
        new Date(r.date_reported).toLocaleString(),
        r.sanction || 'None',
        r.status || 'Pending',
        r.remarks || '',
        r.resolution_notes || ''
      ]);

      exportToCsv(`Viotrack_Violations_${exportDate || Date.now()}`, headers, rows);
      success(`Exported ${rows.length} violation records to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecords.length / entriesPerPage) || 1;
  const paginatedRecords = filteredAndSortedRecords.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

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

  // Badges UI Helpers
  const renderStatusBadge = (st) => {
    const s = (st || '').toLowerCase();
    if (s === 'resolved') {
      return (
        <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={11} color="#16a34a" /> Resolved
        </span>
      );
    }
    if (s === 'investigation') {
      return (
        <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Search size={11} color="#d97706" /> In Review
        </span>
      );
    }
    if (s === 'escalated') {
      return (
        <span style={{ background: '#f5f3ff', color: '#6d28d9', border: '1px solid #ddd6fe', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={11} color="#7c3aed" /> Escalated
        </span>
      );
    }
    return (
      <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '3px 9px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={11} color="#dc2626" /> Pending
      </span>
    );
  };

  const renderSeverityBadge = (ty) => {
    const t = (ty || '').toLowerCase();
    if (t === 'major') {
      return (
        <span style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <ShieldAlert size={11} color="#dc2626" /> Major
        </span>
      );
    }
    if (t === 'serious') {
      return (
        <span style={{ background: '#ffedd5', color: '#9a3412', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
          <AlertTriangle size={11} color="#ea580c" /> Serious
        </span>
      );
    }
    return (
      <span style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
        Minor
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Banner Header & Quick Actions */}
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
            <ShieldAlert size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Incident Registry
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
                {records.length} Total {records.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Track, investigate, update status, and document disciplinary incident resolutions.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          {isAdmin && (
            <div className="page-banner-secondary-group">
              <div style={{ flex: 1, minWidth: 0 }}>
                <CustomDatePicker
                  value={exportDate}
                  onChange={setExportDate}
                  placeholder="Filter by date..."
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={handleExportPDF}
                className="page-banner-btn-secondary"
                title="Download formatted PDF report"
              >
                <Download size={14} /> Export PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="page-banner-btn-secondary"
                title="Download CSV report"
              >
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="page-banner-primary-btn"
          >
            <Plus size={16} strokeWidth={2.5} /> Log Violation
          </button>
        </div>
      </div>

      {/* Metric Filter Cards */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px'
        }}
      >
        {/* Total Records */}
        <div
          onClick={() => { setStatusFilter('all'); setSeverityFilter('all'); setGradeFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: statusFilter === 'all' && severityFilter === 'all' ? '2px solid #27367f' : '1px solid #e2e8f0',
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
                All Incidents
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Total logged records
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} />
            </div>
          </div>
          {statusFilter === 'all' && severityFilter === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#27367f' }}></div>
          )}
        </div>

        {/* Pending Review */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: statusFilter === 'pending' ? '2px solid #dc2626' : '1px solid #e2e8f0',
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
                Pending Action
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: stats.pending > 0 ? '#dc2626' : '#0f172a', marginTop: '4px' }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '4px', fontWeight: 600 }}>
                Awaiting resolution
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
          </div>
          {statusFilter === 'pending' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#dc2626' }}></div>
          )}
        </div>

        {/* In Investigation */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'investigation' ? 'all' : 'investigation')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: statusFilter === 'investigation' ? '2px solid #d97706' : '1px solid #e2e8f0',
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
                Investigation
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: stats.investigation > 0 ? '#d97706' : '#0f172a', marginTop: '4px' }}>
                {stats.investigation}
              </div>
              <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px', fontWeight: 600 }}>
                Under active review
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={22} />
            </div>
          </div>
          {statusFilter === 'investigation' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#d97706' }}></div>
          )}
        </div>

        {/* Resolved Cases */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
          style={{
            background: '#ffffff',
            borderRadius: '14px',
            padding: '18px 20px',
            border: statusFilter === 'resolved' ? '2px solid #059669' : '1px solid #e2e8f0',
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
                Resolved Cases
              </div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
                {stats.resolved}
              </div>
              <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
                Documented & closed
              </div>
            </div>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={22} />
            </div>
          </div>
          {statusFilter === 'resolved' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#059669' }}></div>
          )}
        </div>
      </div>

      {/* Main Table Card with Integrated Search & Multi-Filters */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Table Toolbar */}
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
            <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '400px' }}>
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
                placeholder="Search by student name, ID, offense title, or status..."
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

            {/* Sorting & Filter Controls */}
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
                    { value: 'date-desc', label: 'Date Reported (Newest)' },
                    { value: 'date-asc', label: 'Date Reported (Oldest)' },
                    { value: 'name-asc', label: 'Student Name (A → Z)' },
                    { value: 'severity-desc', label: 'Severity (Major First)' },
                    { value: 'status-asc', label: 'Status' },
                    { value: 'grade-asc', label: 'Grade Level' }
                  ]}
                />
              </div>

              {/* Severity Filter */}
              <div style={{ minWidth: '140px' }}>
                <CustomSelect
                  value={severityFilter}
                  onChange={(e) => {
                    setSeverityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'minor', label: 'Minor Offenses' },
                    { value: 'serious', label: 'Serious Offenses' },
                    { value: 'major', label: 'Major Offenses' }
                  ]}
                />
              </div>

              {/* Status Filter */}
              <div style={{ minWidth: '130px' }}>
                <CustomSelect
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'investigation', label: 'In Review' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'escalated', label: 'Escalated' }
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

          {/* Bulk Actions Bar (if any selected) */}
          {selectedIds.length > 0 && (
            <div
              style={{
                background: '#eef2ff',
                border: '1px solid #c7d2fe',
                borderRadius: '10px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#27367f' }}>
                {selectedIds.length} incident {selectedIds.length === 1 ? 'record' : 'records'} selected
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleResolveSelected}
                  style={{
                    background: '#059669',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <CheckCircle2 size={13} /> Mark Resolved
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Incidents Table (Desktop View) */}
        <div className="responsive-table-desktop">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: '48px', padding: '14px 18px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      paginatedRecords.length > 0 &&
                      paginatedRecords.every(r => selectedIds.includes(r.id))
                    }
                    style={{ cursor: 'pointer' }}
                  />
                </th>

                {/* Student */}
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

                {/* Grade & Section */}
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
                    Grade & Section {renderSortIcon('grade')}
                  </div>
                </th>

                {/* Violation Title */}
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
                  Offense Detail
                </th>

                {/* Date Reported */}
                <th
                  onClick={() => handleSort('date')}
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
                    Date Reported {renderSortIcon('date')}
                  </div>
                </th>

                {/* Severity */}
                <th
                  onClick={() => handleSort('severity')}
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
                    Severity {renderSortIcon('severity')}
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
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
                    Status {renderSortIcon('status')}
                  </div>
                </th>

                {/* Actions */}
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ShieldAlert size={28} color="#94a3b8" />
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading incident registry...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={32} color="#94a3b8" />
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>No violation records found</span>
                      <span style={{ fontSize: '13px', color: '#64748b' }}>
                        Try adjusting search terms or status filters.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec) => {
                  const isChecked = selectedIds.includes(rec.id);
                  const isResolved = (rec.status || '').toLowerCase() === 'resolved';

                  return (
                    <tr
                      key={rec.id}
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
                          onChange={() => toggleSelect(rec.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      {/* Student Profile */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={
                              rec.student?.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student?.fname || 'Student')}&background=27367f&color=fff&size=38`
                            }
                            alt="Student"
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '8px',
                              objectFit: 'cover',
                              border: '1px solid #e2e8f0',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                              {rec.student ? `${rec.student.fname} ${rec.student.lname}` : 'Enrolled Student'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                              LRN: <strong style={{ color: '#334155' }}>{rec.student?.lrn || '22-0000-000'}</strong>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Grade & Section */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                          {rec.student?.grade || 'Grade 10'} - {rec.student?.section || 'Rizal'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                          SY {rec.student?.academicyear || '2025-2026'}
                        </div>
                      </td>

                      {/* Violation Title */}
                      <td style={{ padding: '14px 18px', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', lineHeight: 1.4 }}>
                          {rec.violation?.title || 'Violation Incident'}
                        </div>
                        {rec.sanction && (
                          <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                            Sanction: <span style={{ color: '#27367f', fontWeight: 600 }}>{rec.sanction}</span>
                          </div>
                        )}
                      </td>

                      {/* Date Reported */}
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#334155', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>
                          {new Date(rec.date_reported).toLocaleDateString('en-US', {
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric'
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                          {new Date(rec.date_reported).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                      </td>

                      {/* Severity */}
                      <td style={{ padding: '14px 18px' }}>
                        {renderSeverityBadge(rec.violation?.type)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        {renderStatusBadge(rec.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setRecordForStatusChange(rec)}
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
                              title="Update Case Status"
                            >
                              <Flag size={12} /> Status
                            </button>
                          )}

                          {isResolved && (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForResolution(rec)}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
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
                              onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                              title="View Document Proof & Resolution Notes"
                            >
                              <FileText size={12} /> Doc Proof
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSingle(rec.id)}
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
                              title="Delete Incident Record"
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

        {/* Incidents Cards (Mobile View) */}
        <div className="responsive-cards-mobile">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <ShieldAlert size={28} color="#94a3b8" />
              <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '8px' }}>Loading incident registry...</div>
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
              <ShieldCheck size={32} color="#94a3b8" />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginTop: '8px' }}>No violation records found</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Try adjusting search terms or status filters.
              </div>
            </div>
          ) : (
            paginatedRecords.map((rec) => {
              const isChecked = selectedIds.includes(rec.id);
              const isResolved = (rec.status || '').toLowerCase() === 'resolved';

              return (
                <div
                  key={rec.id}
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
                  {/* Top Header: Checkbox + Student Avatar + Name + Severity */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(rec.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#27367f', flexShrink: 0 }}
                      />
                      <img
                        src={
                          rec.student?.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student?.fname || 'Student')}&background=27367f&color=fff&size=36`
                        }
                        alt="Student"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          objectFit: 'cover',
                          border: '1px solid #e2e8f0',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {rec.student ? `${rec.student.fname} ${rec.student.lname}` : 'Enrolled Student'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          LRN: <strong style={{ color: '#334155' }}>{rec.student?.lrn || '22-0000-000'}</strong>
                        </div>
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      {renderSeverityBadge(rec.violation?.type)}
                    </div>
                  </div>

                  {/* Offense & Grade Box */}
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b', lineHeight: 1.4 }}>
                      {rec.violation?.title || 'Violation Incident'}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                      📚 <strong style={{ color: '#334155' }}>{rec.student?.grade || 'Grade 10'} - {rec.student?.section || 'Rizal'}</strong> (SY {rec.student?.academicyear || '2025-2026'})
                    </div>
                    {rec.sanction && (
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                        ⚖️ Sanction: <strong style={{ color: '#27367f' }}>{rec.sanction}</strong>
                      </div>
                    )}
                  </div>

                  {/* Footer: Date & Status & Action Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px dashed #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {new Date(rec.date_reported).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                      </span>
                      {renderStatusBadge(rec.status)}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setRecordForStatusChange(rec)}
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
                          <Flag size={11} /> Status
                        </button>
                      )}

                      {isResolved && (
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForResolution(rec)}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
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
                          <FileText size={11} /> Proof
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(rec.id)}
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
                          title="Delete Incident Record"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
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
              {filteredAndSortedRecords.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong style={{ color: '#0f172a' }}>
              {Math.min(currentPage * entriesPerPage, filteredAndSortedRecords.length)}
            </strong>{' '}
            of <strong style={{ color: '#0f172a' }}>{filteredAndSortedRecords.length}</strong> records
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

      {/* Status Modal */}
      <StatusModal
        isOpen={!!recordForStatusChange}
        onClose={() => setRecordForStatusChange(null)}
        record={recordForStatusChange}
        onUpdated={handleStatusUpdated}
      />

      {/* Add Record Modal */}
      <AddViolationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRecordAdded={(newRec) => {
          setRecords([newRec, ...records]);
          success('Violation record added successfully!');
        }}
      />

      {/* Bulk Entry Modal */}
      <BulkViolationModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onRecordsAdded={(newRecs) => {
          setRecords([...newRecs, ...records]);
          success(`Added ${newRecs.length} violation records!`);
        }}
      />

      {/* Resolution / Doc Proof Modal */}
      {selectedRecordForResolution && (
        <ResolutionModal
          isOpen={!!selectedRecordForResolution}
          onClose={() => setSelectedRecordForResolution(null)}
          record={selectedRecordForResolution}
          onUpdated={(updated) => {
            setRecords(records.map(r => r.id === updated.id ? { ...r, ...updated } : r));
          }}
        />
      )}
    </div>
  );
};
