import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { BulkViolationModal } from '../components/violations/BulkViolationModal';
import { ResolutionModal } from '../components/violations/ResolutionModal';
import { StatusModal } from '../components/violations/StatusModal';
import { ParentSummonsModal } from '../components/violations/ParentSummonsModal';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { CustomSelect } from '../components/common/CustomSelect';
import { SkeletonTable, SkeletonCardGrid } from '../components/common/SkeletonLoader';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
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
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';
import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { SaveAsModal } from '../components/common/SaveAsModal';

export const ViolationsPage = () => {
  const { user } = useAuth();
  const { success, error, undo } = useNotification();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Violations',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save as'
  });

  // Keyboard navigation shortcuts: '/' to search, 'N' for new violation, 'Esc' to close modals
  useKeyboardShortcuts({
    onNew: () => setIsAddModalOpen(true),
    onEscape: () => {
      setIsAddModalOpen(false);
      setIsBulkModalOpen(false);
      setRecordForStatusChange(null);
      setSelectedRecordForResolution(null);
      setSummonsTargetRecord(null);
      setSaveAsModalOpen(false);
    }
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [yearFilter, setYearFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'investigation' | '1st conference' | '2nd conference' | '3rd conference' | 'resolved' | 'escalated'
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
  const [summonsTargetRecord, setSummonsTargetRecord] = useState(null);

  const isAdmin = user?.role === 'admin';

  const isApproved = (r) => {
    if (!r) return false;
    if (r.approval_status === 'Under Approval' || r.status === 'Under Approval') return false;
    if (r.approval_status === 'Rejected' || r.status === 'Rejected') return false;
    return r.approval_status === 'Approved';
  };

  const loadRecords = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await dataService.getRecords(forceRefresh);
      const approvedOnly = (data || []).filter(isApproved);
      setRecords(approvedOnly);
    } catch (err) {
      error('Failed to load records: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadRecords();
    const handleDataUpdate = () => {
      loadRecords(true);
    };
    window.addEventListener('viotrack_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('viotrack_data_updated', handleDataUpdate);
    };
  }, [loadRecords]);

  // Metric Analytics - optimized single-pass calculation
  const stats = useMemo(() => {
    const total = records.length;
    let pending = 0;
    let investigation = 0;
    let resolved = 0;
    let majorCount = 0;

    for (let i = 0; i < total; i++) {
      const r = records[i];
      const st = (r.status || '').toLowerCase();
      if (st === 'pending') pending++;
      else if (st === 'investigation') investigation++;
      else if (st === 'resolved') resolved++;

      if ((r.violation?.type || '').toLowerCase() === 'major') {
        majorCount++;
      }
    }

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

  // Filtered and Sorted Records with deferred search
  const filteredAndSortedRecords = useMemo(() => {
    const query = deferredSearch.toLowerCase().trim();
    const isAllStatus = statusFilter === 'all';
    const isAllSeverity = severityFilter === 'all';
    const isAllGrade = gradeFilter === 'all';
    const isAllYear = yearFilter === 'all';
    const targetStatus = statusFilter.toLowerCase();
    const targetSeverity = severityFilter.toLowerCase();
    const targetGrade = gradeFilter.toLowerCase();

    // 1. Filter
    const result = records.filter(r => {
      const status = (r.status || '').toLowerCase();
      if (!isAllStatus && status !== targetStatus) return false;

      const vType = (r.violation?.type || '').toLowerCase();
      if (!isAllSeverity && vType !== targetSeverity) return false;

      const student = r.student || {};
      const sGrade = (student.grade || '').toLowerCase();
      if (!isAllGrade && sGrade !== targetGrade) return false;

      if (!isAllYear) {
        const itemYear = new Date(r.date_reported || r.created_at).getFullYear().toString();
        if (itemYear !== yearFilter) return false;
      }

      if (!query) return true;

      const sName = `${student.fname || ''} ${student.lname || ''}`.toLowerCase();
      const sLrn = (student.lrn || '').toLowerCase();
      const sSection = (student.section || '').toLowerCase();
      const vTitle = (r.violation?.title || '').toLowerCase();

      return (
        sName.includes(query) ||
        sLrn.includes(query) ||
        sGrade.includes(query) ||
        sSection.includes(query) ||
        vTitle.includes(query) ||
        vType.includes(query) ||
        status.includes(query)
      );
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
  }, [records, deferredSearch, statusFilter, severityFilter, gradeFilter, sortField, sortOrder]);

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
      const idsToDelete = [...selectedIds];
      setSelectedIds([]);
      setRecords(prev => prev.filter(r => !idsToDelete.includes(r.id)));
      success(`Successfully deleted ${idsToDelete.length} records.`);
      try {
        for (const id of idsToDelete) {
          await dataService.deleteRecord(id);
        }
      } catch (err) {
        error('Bulk delete sync error: ' + err.message);
        loadRecords(true);
      }
    }
  };

  const handleResolveSelected = async () => {
    const idsToResolve = [...selectedIds];
    setSelectedIds([]);
    setRecords(prev => prev.map(r => idsToResolve.includes(r.id) ? { ...r, status: 'Resolved' } : r));
    success(`Marked ${idsToResolve.length} records as Resolved.`);
    try {
      for (const id of idsToResolve) {
        await dataService.updateRecordStatus(id, {
          status: 'Resolved',
          resolution_notes: 'Resolved via bulk action'
        });
      }
    } catch (err) {
      error('Bulk resolve sync error: ' + err.message);
      loadRecords(true);
    }
  };

  const handleDeleteSingle = (id) => {
    const backupRecord = records.find(r => r.id === id);
    if (!backupRecord) return;

    // Optimistically remove from view
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedIds(prev => prev.filter(x => x !== id));

    let isUndone = false;
    undo(`Violation record for ${backupRecord.student?.fname || 'Student'} deleted.`, () => {
      isUndone = true;
      setRecords(prev => [backupRecord, ...prev]);
      success('Record deletion undone.');
    }, 5000);

    setTimeout(async () => {
      if (!isUndone) {
        try {
          await dataService.deleteRecord(id);
        } catch (err) {
          error('Delete sync error: ' + err.message);
          loadRecords(true);
        }
      }
    }, 5200);
  };

  const handleStatusUpdated = (recordId, newStatus) => {
    const prevRecord = records.find(r => r.id === recordId);
    const oldStatus = prevRecord?.status || 'Pending';
    if (oldStatus === newStatus) return;

    setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r));

    let isUndone = false;
    undo(`Status updated to "${newStatus}".`, () => {
      isUndone = true;
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: oldStatus } : r));
      dataService.updateRecordStatus(recordId, { status: oldStatus });
      success(`Reverted status back to "${oldStatus}".`);
    }, 5000);

    setTimeout(async () => {
      if (!isUndone) {
        try {
          await dataService.updateRecordStatus(recordId, { status: newStatus });
        } catch (err) {
          error('Failed to sync status update: ' + err.message);
          loadRecords(true);
        }
      }
    }, 5200);
  };

  // Open Save As Modal for Export
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Record ID', 'Student ID', 'Student Name', 'Grade', 'Section', 'Offense', 'Severity', 'Reported By', 'Reporter Type', 'Date Reported', 'Sanction', 'Status', 'Remarks', 'Resolution Notes'];
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

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
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
        headStyles: { fillColor: [7, 52, 95], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Violations_${exportDate || new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Violation Records As'
    });
    setSaveAsModalOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRecords.length / entriesPerPage) || 1;
  const paginatedRecords = filteredAndSortedRecords.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

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

  // Badges UI Helpers
  const renderStatusBadge = (st) => {
    const s = (st || '').toLowerCase();
    if (s === 'resolved') {
      return (
        <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3.5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={12} color="#059669" strokeWidth={2.4} /> Resolved
        </span>
      );
    }
    if (s === 'investigation') {
      return (
        <span style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '3.5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Search size={12} color="#d97706" strokeWidth={2.4} /> In Review
        </span>
      );
    }
    if (s === 'escalated') {
      return (
        <span style={{ background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe', padding: '3.5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertCircle size={12} color="#7c3aed" strokeWidth={2.4} /> Escalated
        </span>
      );
    }
    return (
      <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '3.5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={12} color="#dc2626" strokeWidth={2.4} /> Pending
      </span>
    );
  };

  const renderSeverityBadge = (ty) => {
    const t = (ty || '').toLowerCase();
    if (t === 'major') {
      return (
        <span style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <ShieldAlert size={12} color="#dc2626" strokeWidth={2.2} /> Major
        </span>
      );
    }
    if (t === 'serious') {
      return (
        <span style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fde047', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={12} color="#d97706" strokeWidth={2.2} /> Serious
        </span>
      );
    }
    return (
      <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 9px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle2 size={12} color="#16a34a" strokeWidth={2.2} /> Minor
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Banner Header & Quick Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <ShieldAlert size={26} color="#0f172a" strokeWidth={2.4} style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Incident Registry
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Track, investigate, update status, and document disciplinary incident resolutions.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          {isAdmin && (
            <div className="page-banner-secondary-group">
              <div className="page-banner-datepicker-wrapper">
                <CustomDatePicker
                  value={exportDate}
                  onChange={setExportDate}
                  placeholder="Filter by date..."
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={() => handleOpenExportSaveAs('pdf')}
                className="page-banner-btn-secondary"
                title="Save As formatted PDF report"
              >
                <Upload size={14} strokeWidth={2.2} /> Export PDF
              </button>
              <button
                onClick={() => handleOpenExportSaveAs('csv')}
                className="page-banner-btn-secondary"
                title="Save As CSV / Excel report"
              >
                <FileText size={14} strokeWidth={2.2} /> Export CSV
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
          gap: '12px'
        }}
      >
        {/* Total Records */}
        <div
          onClick={() => { setStatusFilter('all'); setSeverityFilter('all'); setGradeFilter('all'); }}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: statusFilter === 'all' && severityFilter === 'all' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: statusFilter === 'all' && severityFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                ALL INCIDENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Total logged records
              </div>
            </div>
            <ShieldAlert size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: statusFilter === 'pending' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: statusFilter === 'pending' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                PENDING ACTION
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.pending}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Awaiting resolution
              </div>
            </div>
            <Clock size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>

        {/* In Investigation */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'investigation' ? 'all' : 'investigation')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: statusFilter === 'investigation' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: statusFilter === 'investigation' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                INVESTIGATION
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.investigation}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Under active review
              </div>
            </div>
            <Search size={20} color="#07345f" strokeWidth={2} />
          </div>
        </div>

        {/* Resolved Cases */}
        <div
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: statusFilter === 'resolved' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: statusFilter === 'resolved' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                RESOLVED CASES
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.resolved}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Documented & closed
              </div>
            </div>
            <ShieldCheck size={20} color="#07345f" strokeWidth={2} />
          </div>
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
            padding: '14px 18px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
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
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Sorting & Filter Controls */}
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
                    { value: 'date-desc', label: 'Date (Newest)' },
                    { value: 'date-asc', label: 'Date (Oldest)' },
                    { value: 'name-asc', label: 'Name (A → Z)' },
                    { value: 'severity-desc', label: 'Severity (Major)' },
                    { value: 'status-asc', label: 'Status' },
                    { value: 'grade-asc', label: 'Grade Level' }
                  ]}
                />
              </div>

              {/* Year / Date Filter */}
              <div className="mobile-filter-item">
                <CustomSelect
                  value={yearFilter}
                  onChange={(e) => {
                    setYearFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Years' },
                    { value: '2027', label: 'Year 2027' },
                    { value: '2026', label: 'Year 2026' },
                    { value: '2025', label: 'Year 2025' },
                    { value: '2024', label: 'Year 2024' }
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
                    { value: 'all', label: 'All Grade Levels' },
                    { value: 'Grade 7', label: 'Grade 7 (1st Year)' },
                    { value: 'Grade 8', label: 'Grade 8 (2nd Year)' },
                    { value: 'Grade 9', label: 'Grade 9 (3rd Year)' },
                    { value: 'Grade 10', label: 'Grade 10 (4th Year)' },
                    { value: 'Grade 11', label: 'Grade 11 (SHS Yr 1)' },
                    { value: 'Grade 12', label: 'Grade 12 (SHS Yr 2)' }
                  ]}
                />
              </div>

              {/* Severity Filter */}
              <div className="mobile-filter-item">
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
              <div className="mobile-filter-item">
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
                    { value: '1st conference', label: '1st Conference' },
                    { value: '2nd conference', label: '2nd Conference' },
                    { value: '3rd conference', label: '3rd Conference' },
                    { value: 'resolved', label: 'Resolved' },
                    { value: 'escalated', label: 'Escalated' }
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

          {/* Bulk Actions Bar (if any selected) */}
          {selectedIds.length > 0 && (
            <div
              style={{
                background: '#f0f4f8',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#07345f' }}>
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
        <div className={`responsive-table-desktop ${viewMode === 'grid' ? 'force-hidden' : ''}`}>
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
                    style={{ cursor: 'pointer', accentColor: '#07345f' }}
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
                Array.from({ length: entriesPerPage > 10 ? 8 : entriesPerPage }).map((_, rIdx) => (
                  <tr key={`skel-row-${rIdx}`}>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '18px', height: '18px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="skeleton-pulse" style={{ width: '34px', height: '34px', borderRadius: '50%' }} />
                        <div style={{ flex: 1 }}>
                          <div className="skeleton-pulse" style={{ width: '130px', height: '14px', borderRadius: '4px', marginBottom: '4px' }} />
                          <div className="skeleton-pulse" style={{ width: '85px', height: '11px', borderRadius: '4px' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '90px', height: '13px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '120px', height: '13px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '65px', height: '22px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '80px', height: '13px', borderRadius: '4px' }} /></td>
                    <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ width: '85px', height: '22px', borderRadius: '12px' }} /></td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <div className="skeleton-pulse" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                        <div className="skeleton-pulse" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
                      </div>
                    </td>
                  </tr>
                ))
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
                          style={{ cursor: 'pointer', accentColor: '#07345f' }}
                        />
                      </td>

                      {/* Student Profile */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={
                              rec.student?.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student?.fname || 'Student')}&background=07345f&color=fff&size=38`
                            }
                            alt="Student"
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
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                              {rec.student ? `${rec.student.fname} ${rec.student.lname}` : 'Enrolled Student'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                              Student ID: <strong style={{ color: '#334155' }}>{rec.student?.lrn || '22-0000-000'}</strong>
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
                            Sanction: <span style={{ color: '#07345f', fontWeight: 600 }}>{rec.sanction}</span>
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
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#07345f',
                                padding: '6px 11px',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              title="Update Case Status"
                            >
                              <Flag size={12} color="#07345f" strokeWidth={2} /> Status
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setSummonsTargetRecord(rec)}
                              style={{
                                background: '#f8fafc',
                                border: '1px solid #cbd5e1',
                                color: '#0f172a',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              title="Generate Printable Parent Summons Notice"
                            >
                              <FileText size={12} color="#0f172a" strokeWidth={2} /> Summons
                            </button>
                          )}

                          {isAdmin && isResolved && (
                            <button
                              type="button"
                              onClick={() => setSelectedRecordForResolution(rec)}
                              style={{
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#15803d',
                                padding: '6px 11px',
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
                              title="View Document Proof & Resolution Notes"
                            >
                              <FileText size={12} color="#15803d" strokeWidth={2} /> Doc Proof
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
                                borderRadius: '7px',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                              title="Delete Incident Record"
                            >
                              <Trash2 size={13} color="#dc2626" strokeWidth={2} />
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
        <div className={`responsive-cards-mobile ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
          {loading ? (
            <div style={{ gridColumn: '1 / -1', width: '100%' }}>
              <SkeletonCardGrid cards={6} />
            </div>
          ) : paginatedRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', gridColumn: '1 / -1' }}>
              <ShieldCheck size={32} color="#94a3b8" />
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginTop: '8px' }}>No violation records found</div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                Try adjusting search terms or status filters.
              </div>
            </div>
          ) : viewMode === 'grid' ? (
            paginatedRecords.map((rec) => {
              const isChecked = selectedIds.includes(rec.id);
              const isResolved = (rec.status || '').toLowerCase() === 'resolved';

              return (
                <div
                  key={rec.id}
                  className={`entity-grid-card ${isChecked ? 'is-selected' : ''}`}
                >
                  {/* Top Badges Row */}
                  <div className="entity-grid-top-badges">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(rec.id)}
                      style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#07345f' }}
                    />
                    {renderSeverityBadge(rec.violation?.type)}
                  </div>

                  {/* Center Avatar & Info */}
                  <img
                    src={
                      rec.student?.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student?.fname || 'Student')}&background=07345f&color=fff&size=48`
                    }
                    alt="Student"
                    loading="lazy"
                    decoding="async"
                    className="entity-grid-avatar"
                  />

                  <div className="entity-grid-name" title={rec.student ? `${rec.student.fname} ${rec.student.lname}` : 'Student'}>
                    {rec.student ? `${rec.student.fname} ${rec.student.lname}` : 'Enrolled Student'}
                  </div>

                  <div className="entity-grid-meta" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontWeight: 700, color: '#07345f', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {rec.violation?.title || 'Violation Incident'}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px' }}>
                      {rec.student?.grade || 'Grade 10'} • {rec.student?.section || 'Rizal'}
                    </div>
                    <div style={{ marginTop: '2px' }}>
                      {renderStatusBadge(rec.status)}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="entity-grid-actions">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setSummonsTargetRecord(rec)}
                        className="entity-grid-btn"
                        title="Generate Parent Summons Notice"
                        style={{ color: '#0f172a', borderColor: '#cbd5e1', background: '#f8fafc' }}
                      >
                        <FileText size={11} strokeWidth={2.2} /> Summons
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setRecordForStatusChange(rec)}
                        className="entity-grid-btn"
                        title="Update Status"
                      >
                        <Flag size={11} strokeWidth={2.2} /> Status
                      </button>
                    )}
                    {isAdmin && isResolved && (
                      <button
                        type="button"
                        onClick={() => setSelectedRecordForResolution(rec)}
                        className="entity-grid-btn"
                        title="View Resolution Proof"
                        style={{ color: '#15803d', borderColor: '#bbf7d0', background: '#f0fdf4' }}
                      >
                        <FileText size={11} strokeWidth={2.2} /> Proof
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(rec.id)}
                        className="entity-grid-btn"
                        title="Delete Incident Record"
                        style={{ flex: '0 0 26px', padding: '6px 3px', color: '#dc2626', borderColor: '#fecaca' }}
                      >
                        <Trash2 size={11} strokeWidth={2.2} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            paginatedRecords.map((rec) => {
              const isChecked = selectedIds.includes(rec.id);
              const isResolved = (rec.status || '').toLowerCase() === 'resolved';

              return (
                <div
                  key={rec.id}
                  style={{
                    background: isChecked ? '#f8faff' : '#ffffff',
                    border: isChecked ? '1.5px solid #07345f' : '1px solid #e2e8f0',
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
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#07345f', flexShrink: 0 }}
                      />
                      <img
                        src={
                          rec.student?.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.student?.fname || 'Student')}&background=07345f&color=fff&size=36`
                        }
                        alt="Student"
                        loading="lazy"
                        decoding="async"
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
                          Student ID: <strong style={{ color: '#334155' }}>{rec.student?.lrn || '22-0000-000'}</strong>
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
                      <strong style={{ color: '#334155' }}>{rec.student?.grade || 'Grade 10'} - {rec.student?.section || 'Rizal'}</strong> (SY {rec.student?.academicyear || '2025-2026'})
                    </div>
                    {rec.sanction && (
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                        Sanction: <strong style={{ color: '#07345f' }}>{rec.sanction}</strong>
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
                          onClick={() => setSummonsTargetRecord(rec)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#0f172a',
                            padding: '5px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Generate Parent Summons Notice"
                        >
                          <FileText size={11} color="#0f172a" strokeWidth={2} /> Summons
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setRecordForStatusChange(rec)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#07345f',
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
                          <Flag size={11} color="#07345f" strokeWidth={2} /> Status
                        </button>
                      )}

                      {isAdmin && isResolved && (
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
                          <FileText size={11} color="#15803d" strokeWidth={2} /> Proof
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
                          <Trash2 size={12} color="#dc2626" strokeWidth={2} />
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
              {filteredAndSortedRecords.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong style={{ color: '#0f172a' }}>
              {Math.min(currentPage * entriesPerPage, filteredAndSortedRecords.length)}
            </strong>{' '}
            of <strong style={{ color: '#0f172a' }}>{filteredAndSortedRecords.length}</strong> records
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
        onRecordAdded={() => {
          loadRecords(true);
        }}
      />

      {/* Bulk Entry Modal */}
      <BulkViolationModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onRecordsAdded={() => {
          loadRecords(true);
        }}
      />

      {/* Resolution / Doc Proof Modal */}
      {isAdmin && selectedRecordForResolution && (
        <ResolutionModal
          isOpen={!!selectedRecordForResolution}
          onClose={() => setSelectedRecordForResolution(null)}
          record={selectedRecordForResolution}
          onUpdated={(updated) => {
            setRecords(records.map(r => r.id === updated.id ? { ...r, ...updated } : r));
          }}
        />
      )}

      {/* Parent Summons Modal */}
      {isAdmin && summonsTargetRecord && (
        <ParentSummonsModal
          isOpen={!!summonsTargetRecord}
          onClose={() => setSummonsTargetRecord(null)}
          record={summonsTargetRecord}
          student={summonsTargetRecord.student}
          records={records}
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
