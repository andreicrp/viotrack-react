import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { dataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  FileSpreadsheet,
  X,
  Check,
  Eye,
  Trash2,
  Users,
  MapPin,
  Calendar,
  Phone,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  MessageSquare,
  Sparkles,
  UserCheck,
  UserX,
  User,
  GraduationCap,
  XCircle,
  Scale
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';
import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { CustomSelect } from '../components/common/CustomSelect';
import { Modal } from '../components/common/Modal';

export const ForApprovalPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_For_Approval',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Approval Queue As'
  });

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('Under Approval'); // 'Under Approval' | 'Approved' | 'Rejected' | 'all'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'minor' | 'serious' | 'major'
  const [gradeFilter, setGradeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month'

  // Sorting
  const [sortField, setSortField] = useState('date'); // 'date' | 'student' | 'teacher' | 'severity'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState([]);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [inspectRecord, setInspectRecord] = useState(null);
  const [approveTargetRecord, setApproveTargetRecord] = useState(null);
  const [rejectTargetRecord, setRejectTargetRecord] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('Insufficient Evidence / Lack of Proof');
  const [customRejectNote, setCustomRejectNote] = useState('');
  const [approveStatusChoice, setApproveStatusChoice] = useState('Pending');
  const [notifyParentOnApprove, setNotifyParentOnApprove] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const data = await dataService.getRecords(forceRefresh);
      setRecords(data || []);
    } catch (err) {
      error('Failed to load violation records: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
    const handleDataUpdate = () => {
      loadData(true);
    };
    window.addEventListener('viotrack_data_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('viotrack_data_updated', handleDataUpdate);
    };
  }, [loadData]);

  const getApprovalStatus = (r) => {
    if (r.status === 'Under Approval' || r.approval_status === 'Under Approval') return 'Under Approval';
    if (r.status === 'Rejected' || r.approval_status === 'Rejected') return 'Rejected';
    if (r.reported_by_type === 'teacher' && !r.approved_by && r.status !== 'Resolved') return 'Under Approval';
    if (r.approval_status === 'Approved') return 'Approved';
    return r.approval_status || (r.status === 'Under Approval' ? 'Under Approval' : 'Approved');
  };

  // Metric Analytics
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let highSeverity = 0;

    for (const r of records) {
      const aStat = getApprovalStatus(r);
      if (aStat === 'Under Approval') {
        pending++;
        const sev = (r.violation?.type || '').toLowerCase();
        if (sev.includes('major') || sev.includes('serious')) highSeverity++;
      } else if (aStat === 'Approved') {
        approved++;
      } else if (aStat === 'Rejected') {
        rejected++;
      }
    }

    return {
      pending,
      approved,
      rejected,
      highSeverity,
      total: records.length
    };
  }, [records]);

  const deferredSearch = useDeferredValue(searchTerm);

  // Filter & Sort Pipeline
  const filteredRecords = useMemo(() => {
    let result = records.filter(r => {
      const aStat = getApprovalStatus(r);

      // 1. Approval Status Filter
      if (approvalFilter !== 'all') {
        if (approvalFilter === 'Under Approval' && aStat !== 'Under Approval') return false;
        if (approvalFilter === 'Approved' && aStat !== 'Approved') return false;
        if (approvalFilter === 'Rejected' && aStat !== 'Rejected') return false;
      }

      // 2. Severity Filter (Fuzzy case-insensitive matching)
      if (severityFilter !== 'all') {
        const type = (r.violation?.type || '').toLowerCase();
        if (!type.includes(severityFilter.toLowerCase())) return false;
      }

      // 3. Grade Filter
      if (gradeFilter !== 'all') {
        const grade = (r.student?.grade || '').toLowerCase();
        if (!grade.includes(gradeFilter.toLowerCase())) return false;
      }

      // 4. Date Range Filter
      if (dateFilter !== 'all') {
        const recordTime = new Date(r.date_reported || 0).getTime();
        const now = Date.now();
        if (dateFilter === 'today') {
          if (now - recordTime > 86400000) return false;
        } else if (dateFilter === 'week') {
          if (now - recordTime > 7 * 86400000) return false;
        } else if (dateFilter === 'month') {
          if (now - recordTime > 30 * 86400000) return false;
        }
      }

      // 5. Search Query
      if (deferredSearch.trim()) {
        const query = deferredSearch.toLowerCase();
        const studentName = `${r.student?.fname || ''} ${r.student?.lname || ''}`.toLowerCase();
        const lrn = (r.student?.student_id || r.student?.lrn || '').toLowerCase();
        const teacher = (r.reported_by_name || '').toLowerCase();
        const vTitle = (r.violation?.title || '').toLowerCase();
        const vDesc = (r.violation?.description || '').toLowerCase();
        const remarks = (r.remarks || '').toLowerCase();
        return (
          studentName.includes(query) ||
          lrn.includes(query) ||
          teacher.includes(query) ||
          vTitle.includes(query) ||
          vDesc.includes(query) ||
          remarks.includes(query)
        );
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortField === 'date') {
        valA = new Date(a.date_reported || 0).getTime();
        valB = new Date(b.date_reported || 0).getTime();
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      } else if (sortField === 'student') {
        valA = `${a.student?.fname || ''} ${a.student?.lname || ''}`.toLowerCase();
        valB = `${b.student?.fname || ''} ${b.student?.lname || ''}`.toLowerCase();
      } else if (sortField === 'teacher') {
        valA = (a.reported_by_name || '').toLowerCase();
        valB = (b.reported_by_name || '').toLowerCase();
      } else if (sortField === 'severity') {
        valA = (a.violation?.type || '').toLowerCase();
        valB = (b.violation?.type || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, approvalFilter, severityFilter, gradeFilter, dateFilter, deferredSearch, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredRecords.length / entriesPerPage) || 1;
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

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
      setSelectedIds(filteredRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSeverityFilter('all');
    setGradeFilter('all');
    setDateFilter('all');
    setApprovalFilter('Under Approval');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    severityFilter !== 'all' ||
    gradeFilter !== 'all' ||
    dateFilter !== 'all' ||
    approvalFilter !== 'Under Approval'
  );

  // Approval Handlers
  const handleOpenApproveModal = (record) => {
    setApproveTargetRecord(record);
    setApproveStatusChoice('Pending');
    setNotifyParentOnApprove(Boolean(record.sms_notified));
  };

  const handleConfirmApprove = async () => {
    if (!approveTargetRecord) return;
    setActionLoading(true);
    try {
      await dataService.approveRecord(approveTargetRecord.id, {
        approved_by: user?.name || 'Head Admin',
        status: approveStatusChoice || 'Pending'
      });

      if (notifyParentOnApprove && approveTargetRecord.student?.parent_contact) {
        try {
          await dataService.sendSMS(
            approveTargetRecord.student.parent_contact,
            approveTargetRecord.student.parent_name || 'Guardian',
            `${approveTargetRecord.student.fname} ${approveTargetRecord.student.lname}`,
            approveTargetRecord.violation?.title || 'Student Disciplinary Notice'
          );
        } catch (smsErr) {
          console.warn('SMS dispatch error:', smsErr);
        }
      }

      success(`Approved incident record for ${approveTargetRecord.student?.fname || 'Student'}!`);
      setApproveTargetRecord(null);
      if (inspectRecord?.id === approveTargetRecord.id) setInspectRecord(null);
      loadData(true);
    } catch (err) {
      error('Failed to approve record: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (record) => {
    setRejectTargetRecord(record);
    setRejectionReason('Insufficient Evidence / Lack of Proof');
    setCustomRejectNote('');
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetRecord) return;
    setActionLoading(true);
    try {
      const finalReason = rejectionReason === 'Other (Please specify below)'
        ? (customRejectNote.trim() || 'Declined by Administrator')
        : (customRejectNote.trim() ? `${rejectionReason} - ${customRejectNote.trim()}` : rejectionReason);

      await dataService.rejectRecord(rejectTargetRecord.id, {
        rejected_by: user?.name || 'Head Admin',
        rejection_reason: finalReason
      });

      success(`Rejected incident record for ${rejectTargetRecord.student?.fname || 'Student'}.`);
      setRejectTargetRecord(null);
      if (inspectRecord?.id === rejectTargetRecord.id) setInspectRecord(null);
      loadData(true);
    } catch (err) {
      error('Failed to reject record: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Batch Operations
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to batch approve ${selectedIds.length} selected violation report(s)?`)) {
      return;
    }

    setActionLoading(true);
    try {
      for (const id of selectedIds) {
        await dataService.approveRecord(id, {
          approved_by: user?.name || 'Head Admin',
          status: 'Pending'
        });
      }
      success(`Successfully approved ${selectedIds.length} incident reports!`);
      setSelectedIds([]);
      loadData(true);
    } catch (err) {
      error('Batch approve error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBatchReject = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to batch reject ${selectedIds.length} selected violation report(s)?`)) {
      return;
    }

    setActionLoading(true);
    try {
      for (const id of selectedIds) {
        await dataService.rejectRecord(id, {
          rejected_by: user?.name || 'Head Admin',
          rejection_reason: 'Declined during administrative batch review'
        });
      }
      success(`Successfully rejected ${selectedIds.length} incident reports!`);
      setSelectedIds([]);
      loadData(true);
    } catch (err) {
      error('Batch reject error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Exports via SaveAs
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Student Name', 'Student ID', 'Grade', 'Section', 'Offense', 'Severity', 'Sanction', 'Reported By', 'Approval Status', 'Date Reported', 'Remarks'];
    const rows = filteredRecords.map(r => [
      `${r.student?.fname || ''} ${r.student?.lname || ''}`.trim(),
      r.student?.student_id || r.student?.lrn || 'N/A',
      r.student?.grade || 'N/A',
      r.student?.section || 'N/A',
      r.violation?.title || 'N/A',
      r.violation?.type || 'N/A',
      r.sanction || 'N/A',
      r.reported_by_name || 'Faculty',
      r.approval_status || 'Under Approval',
      new Date(r.date_reported).toLocaleString(),
      r.remarks || ''
    ]);

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
      doc.text('VioTrack Disciplinary System - Violations For Approval Queue', 14, 18);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.text(`Queue Status: ${approvalFilter} | Records: ${filteredRecords.length} | Generated: ${new Date().toLocaleDateString()}`, 14, 30);

      const tableData = filteredRecords.map(r => [
        `${r.student?.fname || ''} ${r.student?.lname || ''}`.trim(),
        `${r.student?.grade || ''} - ${r.student?.section || ''}`,
        r.violation?.title || 'Disciplinary Offense',
        r.violation?.type || 'Minor',
        r.reported_by_name || 'Faculty',
        r.approval_status || 'Under Approval',
        new Date(r.date_reported).toLocaleDateString()
      ]);

      doc.autoTable({
        head: [['Student Name', 'Grade & Section', 'Offense Title', 'Severity', 'Reported By', 'Approval Status', 'Date']],
        body: tableData,
        startY: 34,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], fontStyle: 'bold' }
      });

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_For_Approval_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Approval Queue As'
    });
    setSaveAsModalOpen(true);
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} className="table-sort-icon is-inactive" color="currentColor" style={{ color: 'var(--text-muted, #94a3b8)', marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} className="table-sort-icon is-active" color="currentColor" style={{ color: 'var(--brand-blue, #07345f)', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} className="table-sort-icon is-active" color="currentColor" style={{ color: 'var(--brand-blue, #07345f)', marginLeft: 4 }} />
    );
  };

  const getSeverityBadge = (type) => {
    const t = (type || 'Minor').toLowerCase();
    if (t.includes('major')) {
      return { className: 'badge-major', bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Major Offense' };
    }
    if (t.includes('serious')) {
      return { className: 'badge-serious', bg: '#fef9c3', color: '#a16207', border: '#fde047', label: 'Serious Offense' };
    }
    return { className: 'badge-minor', bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Minor Offense' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Page Banner Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <ShieldAlert size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Violations For Approval
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Review, verify, approve, or reject violation reports submitted by teaching faculty before sanctions take effect.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF registry of approval cases"
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

          {selectedIds.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={handleBatchApprove}
                disabled={actionLoading}
                className="page-banner-primary-btn"
                style={{ background: '#10b981', borderColor: '#059669', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                <CheckCircle2 size={16} strokeWidth={2.5} /> Approve ({selectedIds.length})
              </button>

              <button
                onClick={handleBatchReject}
                disabled={actionLoading}
                className="page-banner-primary-btn"
                style={{ background: '#ef4444', borderColor: '#dc2626', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
              >
                <X size={16} strokeWidth={2.5} /> Reject ({selectedIds.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="card" style={{ padding: '22px', background: 'var(--bg-surface, #ffffff)', borderRadius: '16px', border: '1px solid var(--border-subtle, #e2e8f0)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        
        {/* 2. Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          
          {/* Under Approval Card */}
          <div
            onClick={() => { setApprovalFilter('Under Approval'); setCurrentPage(1); }}
            style={{
              background: 'var(--bg-surface-elevated, #ffffff)',
              border: approvalFilter === 'Under Approval' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: approvalFilter === 'Under Approval' ? '0 4px 14px rgba(56, 189, 248, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Under Approval
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.pending}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Awaiting review
                </div>
              </div>
              <Clock size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Approved Card */}
          <div
            onClick={() => { setApprovalFilter('Approved'); setCurrentPage(1); }}
            style={{
              background: 'var(--bg-surface-elevated, #ffffff)',
              border: approvalFilter === 'Approved' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: approvalFilter === 'Approved' ? '0 4px 14px rgba(56, 189, 248, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Approved Cases
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.approved}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Sanctions active
                </div>
              </div>
              <ShieldCheck size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* Rejected Card */}
          <div
            onClick={() => { setApprovalFilter('Rejected'); setCurrentPage(1); }}
            style={{
              background: 'var(--bg-surface-elevated, #ffffff)',
              border: approvalFilter === 'Rejected' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: approvalFilter === 'Rejected' ? '0 4px 14px rgba(56, 189, 248, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Rejected Reports
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.rejected}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Returned to teacher
                </div>
              </div>
              <UserX size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

          {/* All Submissions */}
          <div
            onClick={() => { setApprovalFilter('all'); setCurrentPage(1); }}
            style={{
              background: 'var(--bg-surface-elevated, #ffffff)',
              border: approvalFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '12px',
              padding: '14px 16px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: approvalFilter === 'all' ? '0 4px 14px rgba(56, 189, 248, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  All Submissions
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                  {stats.total}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                  Total logged reports
                </div>
              </div>
              <Layers size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} />
            </div>
          </div>

        </div>

        {/* 3. Search & Secondary Filters Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search student, Student ID, teacher, offense..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1.5px solid var(--border-subtle, #cbd5e1)',
                fontSize: '13.5px',
                outline: 'none',
                color: 'var(--text-primary, #0f172a)',
                background: 'var(--bg-input, #f8fafc)',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => { e.target.style.borderColor = 'var(--brand-blue, #07345f)'; e.target.style.background = 'var(--bg-surface, #fff)'; }}
              onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle, #cbd5e1)'; e.target.style.background = 'var(--bg-input, #f8fafc)'; }}
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Severity, Grade, Date & Pagination Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '125px' }}>
              <CustomSelect
                value={severityFilter}
                onChange={(e) => {
                  const val = typeof e === 'object' && e?.target?.value !== undefined ? e.target.value : String(e || 'all');
                  setSeverityFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="Severity"
                options={[
                  { value: 'all', label: 'All Severities' },
                  { value: 'minor', label: 'Minor Offenses' },
                  { value: 'serious', label: 'Serious Offenses' },
                  { value: 'major', label: 'Major Offenses' }
                ]}
              />
            </div>

            <div style={{ minWidth: '120px' }}>
              <CustomSelect
                value={gradeFilter}
                onChange={(e) => {
                  const val = typeof e === 'object' && e?.target?.value !== undefined ? e.target.value : String(e || 'all');
                  setGradeFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="Grade Level"
                options={[
                  { value: 'all', label: 'All Grades' },
                  { value: 'grade 7', label: 'Grade 7' },
                  { value: 'grade 8', label: 'Grade 8' },
                  { value: 'grade 9', label: 'Grade 9' },
                  { value: 'grade 10', label: 'Grade 10' },
                  { value: 'grade 11', label: 'Grade 11' },
                  { value: 'grade 12', label: 'Grade 12' }
                ]}
              />
            </div>

            <div style={{ minWidth: '120px' }}>
              <CustomSelect
                value={dateFilter}
                onChange={(e) => {
                  const val = typeof e === 'object' && e?.target?.value !== undefined ? e.target.value : String(e || 'all');
                  setDateFilter(val);
                  setCurrentPage(1);
                }}
                placeholder="Timeline"
                options={[
                  { value: 'all', label: 'All Dates' },
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Past 7 Days' },
                  { value: 'month', label: 'Past 30 Days' }
                ]}
              />
            </div>

            {/* Entries Per Page */}
            <div style={{ minWidth: '110px' }}>
              <CustomSelect
                value={String(entriesPerPage)}
                onChange={(e) => {
                  const val = typeof e === 'object' && e?.target?.value !== undefined ? e.target.value : e;
                  setEntriesPerPage(Number(val) || 10);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '10', label: '10 per page' },
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' }
                ]}
              />
            </div>

            {/* Reset Filters Quick Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  padding: '8px 12px',
                  borderRadius: '9px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; }}
                title="Reset all search queries and dropdown filters"
              >
                <X size={13} /> Clear
              </button>
            )}

            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>

        {/* 4. Table / Grid Container */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div
              className="approval-empty-state"
              style={{
                width: '36px',
                height: '36px',
                border: '3px solid #e2e8f0',
                borderTopColor: '#07345f',
                borderRadius: '50%',
                margin: '0 auto 12px auto',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>Loading approval records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div
            style={{
              padding: '50px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1.5px dashed #cbd5e1'
            }}
          >
            <ShieldCheck className="approval-empty-icon" size={42} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
            <h4 className="approval-empty-title" style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#334155' }}>
              No Records Matching Filter
            </h4>
            <p className="approval-empty-description" style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {approvalFilter === 'Under Approval'
                ? 'All teacher-submitted incident reports have been reviewed and approved!'
                : 'Try adjusting your search keywords or severity filter.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div
              className={`responsive-table-desktop table-container approval-table-container ${viewMode === 'grid' ? 'force-hidden' : ''}`}
              style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px' }}
            >
              <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                    <th style={{ width: '40px', padding: '12px 14px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#07345f' }}
                      />
                    </th>
                    <th
                      onClick={() => handleSort('student')}
                      style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
                    >
                      Student {renderSortIcon('student')}
                    </th>
                    <th
                      onClick={() => handleSort('severity')}
                      style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
                    >
                      Offense &amp; Severity {renderSortIcon('severity')}
                    </th>
                    <th
                      onClick={() => handleSort('teacher')}
                      style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
                    >
                      Reported By {renderSortIcon('teacher')}
                    </th>
                    <th
                      onClick={() => handleSort('date')}
                      style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer' }}
                    >
                      Submitted Date {renderSortIcon('date')}
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Approval Status
                    </th>
                    <th style={{ padding: '12px 14px', fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((r) => {
                    const isChecked = selectedIds.includes(r.id);
                    const s = r.student || {};
                    const v = r.violation || {};
                    const sevBadge = getSeverityBadge(v.type);
                    const aStat = getApprovalStatus(r);
                    const isPending = aStat === 'Under Approval';
                    const isApproved = aStat === 'Approved';
                    const isRejected = aStat === 'Rejected';
                    const studentName = (s.fname && s.lname) ? `${s.fname} ${s.lname}` : (s.name || s.full_name || r.student_name || 'Student');
                    const studentAvatar = s.image || s.avatar || s.photo_url || s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=40&bold=true`;

                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isChecked ? '#f8fafc' : '#ffffff',
                          transition: 'background 0.15s'
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '12px 14px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(r.id)}
                            style={{ cursor: 'pointer', width: '15px', height: '15px', accentColor: '#07345f' }}
                          />
                        </td>

                        {/* Student Info */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img
                              src={studentAvatar}
                              alt={studentName}
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=40&bold=true`;
                              }}
                            />
                            <div>
                              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px', display: 'block' }}>
                                {studentName}
                              </span>
                              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                                {s.grade} • {s.section} {s.lrn ? `• Student ID: ${s.lrn}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Offense & Severity */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
                              {v.title || v.name || 'Disciplinary Violation'}
                            </span>
                            <span
                              className={sevBadge.className}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                width: 'fit-content',
                                padding: '3px 9px',
                                borderRadius: '20px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                background: sevBadge.bg,
                                color: sevBadge.color,
                                border: `1px solid ${sevBadge.border}`
                              }}
                            >
                              {sevBadge.label}
                            </span>
                          </div>
                        </td>

                        {/* Reported By */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 700, color: '#334155', fontSize: '13px' }}>
                              {r.reported_by_name || 'Faculty Member'}
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {r.reported_by_type === 'teacher' ? 'Teaching Faculty' : 'Administrator'}
                            </span>
                          </div>
                        </td>

                        {/* Submitted Date */}
                        <td style={{ padding: '12px 14px', fontSize: '12.5px', color: '#475569' }}>
                          {new Date(r.date_reported).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            {new Date(r.date_reported).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        {/* Approval Status Badge */}
                        <td style={{ padding: '12px 14px' }}>
                          {isPending && (
                            <span
                              className="approval-status-pill approval-status-pill--pending"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: '#fffbeb',
                                color: '#d97706',
                                border: '1px solid #fde68a',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11.5px',
                                fontWeight: 800
                              }}
                            >
                              Under Approval
                            </span>
                          )}
                          {isApproved && (
                            <span
                              className="approval-status-pill approval-status-pill--approved"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#f0fdf4',
                                color: '#16a34a',
                                border: '1px solid #bbf7d0',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11.5px',
                                fontWeight: 800
                              }}
                            >
                              <CheckCircle2 size={13} />
                              Approved
                            </span>
                          )}
                          {isRejected && (
                            <span
                              className="approval-status-pill approval-status-pill--rejected"
                              title={r.rejection_reason || 'Declined'}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '11.5px',
                                fontWeight: 800,
                                cursor: 'help'
                              }}
                            >
                              <AlertCircle size={13} />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {/* Inspect Modal Button */}
                            <button
                              type="button"
                              onClick={() => setInspectRecord(r)}
                              className="entity-grid-btn approval-row-view-btn"
                              title="Inspect Details"
                              style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '11.5px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                            >
                              <Eye size={13} />
                            </button>

                            {/* Quick Approve Button */}
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenApproveModal(r)}
                                  className="approval-row-approve-btn"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                                  }}
                                  title="Approve this incident report"
                                >
                                  <Check size={13} strokeWidth={2.5} /> Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenRejectModal(r)}
                                  className="approval-row-reject-btn"
                                  style={{
                                    padding: '5px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Reject this incident report"
                                >
                                  <X size={13} strokeWidth={2.5} /> Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards & Desktop Grid View */}
            <div className={`responsive-cards-mobile ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
              {viewMode === 'grid' ? (
                paginatedRecords.map((r) => {
                  const isChecked = selectedIds.includes(r.id);
                  const s = r.student || {};
                  const v = r.violation || {};
                  const sevBadge = getSeverityBadge(v.type);
                  const aStat = getApprovalStatus(r);
                  const isPending = aStat === 'Under Approval';
                  const isApproved = aStat === 'Approved';
                  const studentName = (s.fname && s.lname) ? `${s.fname} ${s.lname}` : (s.name || s.full_name || r.student_name || 'Student');
                  const studentAvatar = s.image || s.avatar || s.photo_url || s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=40&bold=true`;

                  return (
                    <div
                      key={r.id}
                      className={`approval-mobile-record-card${isChecked ? ' is-selected' : ''}`}
                      style={{
                        background: isChecked ? '#f8fafc' : '#ffffff',
                        border: isChecked ? '2px solid #07345f' : '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        position: 'relative'
                      }}
                    >
                      {/* Card Header: Checkbox + Status */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(r.id)}
                          style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#07345f' }}
                        />
                        <span
                          className={`approval-status-pill ${isPending ? 'approval-status-pill--pending' : isApproved ? 'approval-status-pill--approved' : 'approval-status-pill--rejected'}`}
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '20px',
                            background: isPending ? '#fffbeb' : isApproved ? '#f0fdf4' : '#fef2f2',
                            color: isPending ? '#d97706' : isApproved ? '#16a34a' : '#dc2626',
                            border: `1px solid ${isPending ? '#fde68a' : isApproved ? '#bbf7d0' : '#fecaca'}`
                          }}
                        >
                          {aStat}
                        </span>
                      </div>

                      {/* Student Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={studentAvatar}
                          alt={studentName}
                          style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=40&bold=true`;
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                            {studentName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {s.grade} • {s.section}
                          </div>
                        </div>
                      </div>

                      {/* Offense Card Box */}
                      <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, marginBottom: '2px' }}>
                          REPORTED OFFENSE
                        </div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b' }}>
                          {v.title || v.name || 'Violation Incident'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span
                            className={sevBadge.className}
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: sevBadge.bg,
                              color: sevBadge.color,
                              border: `1px solid ${sevBadge.border}`
                            }}
                          >
                            {sevBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Remarks preview */}
                      {r.remarks && (
                        <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{r.remarks}"
                        </div>
                      )}

                      {/* Submitter & Time */}
                      <div style={{ fontSize: '11.5px', color: '#64748b', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                        By: <strong>{r.reported_by_name || 'Faculty'}</strong> • {new Date(r.date_reported).toLocaleDateString()}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => setInspectRecord(r)}
                          style={{
                            flex: 1,
                            padding: '7px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={13} />
                          <span className="approval-mobile-action-label">View</span>
                        </button>
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenApproveModal(r)}
                              style={{
                                flex: 1,
                                padding: '7px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}
                            >
                              <Check size={13} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(r)}
                              style={{
                                padding: '7px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                cursor: 'pointer'
                              }}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Mobile Card List Format */
                paginatedRecords.map((r) => {
                  const isChecked = selectedIds.includes(r.id);
                  const s = r.student || {};
                  const v = r.violation || {};
                  const sevBadge = getSeverityBadge(v.type);
                  const aStat = getApprovalStatus(r);
                  const isPending = aStat === 'Under Approval';
                  const isApproved = aStat === 'Approved';
                  const isRejected = aStat === 'Rejected';
                  const studentName = (s.fname && s.lname) ? `${s.fname} ${s.lname}` : (s.name || s.full_name || r.student_name || 'Student');
                  const studentAvatar = s.image || s.avatar || s.photo_url || s.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=40&bold=true`;

                  return (
                    <div
                      key={r.id}
                      className={`approval-mobile-record-card${isChecked ? ' is-selected' : ''}`}
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
                      {/* Top Row: Checkbox + Student Avatar + Name + Severity Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelect(r.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#07345f', flexShrink: 0 }}
                          />
                          <img
                            src={studentAvatar}
                            alt={studentName}
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '1.5px solid #e2e8f0',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=40&bold=true`;
                            }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="approval-mobile-student-name" style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {studentName}
                            </div>
                            <div className="approval-mobile-student-detail" style={{ fontSize: '11px', color: '#64748b' }}>
                              <span>{s.grade || 'Grade 10'} • {s.section || 'Section'}</span>
                              {s.lrn && <span style={{ marginLeft: 4 }}>• Student ID: {s.lrn}</span>}
                            </div>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          <span
                            className={`approval-status-pill ${isPending ? 'approval-status-pill--pending' : isApproved ? 'approval-status-pill--approved' : 'approval-status-pill--rejected'}`}
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              padding: '2.5px 8px',
                              borderRadius: '6px',
                              background: sevBadge.bg,
                              color: sevBadge.color,
                              display: 'inline-block'
                            }}
                          >
                            {sevBadge.label}
                          </span>
                        </div>
                      </div>

                      {/* Offense & Description Box */}
                      <div className="approval-mobile-offense-panel" style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                        <div className="approval-mobile-offense-label" style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
                          Offense
                        </div>
                        <div className="approval-mobile-offense-title" style={{ fontWeight: 800, fontSize: '13px', color: '#1e293b', lineHeight: 1.35 }}>
                          {v.title || v.name || 'Violation Incident'}
                        </div>
                        {r.remarks && (
                          <div className="approval-mobile-offense-remarks" style={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic', marginTop: '4px', lineHeight: 1.4 }}>
                            "{r.remarks}"
                          </div>
                        )}
                      </div>

                      {/* Reporter, Date & Status Meta */}
                      <div className="approval-mobile-record-meta" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: '#64748b', paddingTop: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                          <span>
                            Reported by: <strong className="approval-mobile-reporter" style={{ color: '#334155' }}>{r.reported_by_name || 'Faculty'}</strong>
                          </span>
                          <span className="approval-mobile-record-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={11} />
                            {new Date(r.date_reported || r.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                          <span style={{ fontWeight: 600 }}>Status:</span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '20px',
                              background: isPending ? '#fffbeb' : isApproved ? '#f0fdf4' : '#fef2f2',
                              color: isPending ? '#d97706' : isApproved ? '#16a34a' : '#dc2626',
                              border: `1px solid ${isPending ? '#fde68a' : isApproved ? '#bbf7d0' : '#fecaca'}`
                            }}
                          >
                            {isPending ? '⏳ Under Approval' : isApproved ? '✓ Approved' : '✕ Rejected'}
                          </span>
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="approval-mobile-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                        <button
                          type="button"
                          onClick={() => setInspectRecord(r)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            minHeight: '34px'
                          }}
                        >
                          <Eye size={13} /> View
                        </button>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenApproveModal(r)}
                              style={{
                                flex: 1.3,
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#10b981',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                minHeight: '34px',
                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                              }}
                            >
                              <Check size={14} strokeWidth={2.5} />
                              <span className="approval-mobile-action-label">Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenRejectModal(r)}
                              style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                minHeight: '34px'
                              }}
                            >
                              <X size={14} strokeWidth={2.5} />
                              <span className="approval-mobile-action-label">Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* 5. Pagination Footer */}
        <div className="approval-pagination-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
          <span className="approval-pagination-count" style={{ fontSize: '13px', color: '#64748b' }}>
            Showing {filteredRecords.length === 0 ? 0 : (currentPage - 1) * entriesPerPage + 1} to{' '}
            {Math.min(currentPage * entriesPerPage, filteredRecords.length)} of {filteredRecords.length} records
          </span>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1
                }}
              >
                <ChevronLeft size={15} />
              </button>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', padding: '0 6px' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            animation: 'fadeIn 0.2s ease-out',
            maxWidth: '92vw',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                background: '#38bdf8',
                color: '#0f172a',
                fontWeight: 800,
                fontSize: '12px',
                padding: '3px 9px',
                borderRadius: '20px'
              }}
            >
              {selectedIds.length} Selected
            </span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
              Pending Minor/Verified Reports
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleBatchApprove}
              disabled={actionLoading}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s'
              }}
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{actionLoading ? 'Approving...' : `Approve All (${selectedIds.length})`}</span>
            </button>

            <button
              type="button"
              onClick={handleBatchReject}
              disabled={actionLoading}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
                transition: 'all 0.15s'
              }}
            >
              <X size={15} strokeWidth={2.5} />
              <span>Reject All</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Deselect all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* 6. Comprehensive Case Inspection Modal */}
      {inspectRecord && (() => {
        const studentFullName = `${inspectRecord.student?.fname || ''} ${inspectRecord.student?.lname || ''}`.trim() || 'Student';
        const studentAvatar = inspectRecord.student?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentFullName)}&background=07345f&color=fff&size=200&bold=true`;
        const aStat = getApprovalStatus(inspectRecord);
        const isUnderApproval = aStat === 'Under Approval';
        const isApproved = aStat === 'Approved';
        const isRejected = aStat === 'Rejected';

        const rawRemarks = inspectRecord.remarks || 'No specific notes provided.';
        const gpsMatch = rawRemarks.match(/\[GPS:\s*([^\]]+)\]/i);
        let gpsCoords = gpsMatch ? gpsMatch[1].trim() : null;
        if (gpsCoords) {
          gpsCoords = gpsCoords.replace(/\s*\([^)]*\)/g, '').trim();
        }
        const cleanRemarks = rawRemarks.replace(/\[GPS:[^\]]+\]/gi, '').trim() || 'Disciplinary incident report logged by reporting faculty.';

        const vType = (inspectRecord.violation?.type || 'Minor').toLowerCase();
        const isMajor = vType.includes('major');
        const isSerious = vType.includes('serious');

        const severityBg = isMajor ? '#fef2f2' : isSerious ? '#fffbeb' : '#eff6ff';
        const severityText = isMajor ? '#dc2626' : isSerious ? '#d97706' : '#2563eb';
        const severityBorder = isMajor ? '#fecaca' : isSerious ? '#fde68a' : '#bfdbfe';
        const severityLabel = isMajor ? 'Major Offense' : isSerious ? 'Serious Offense' : 'Minor Offense';

        return (
          <Modal
            isOpen={Boolean(inspectRecord)}
            onClose={() => setInspectRecord(null)}
            title="Incident Report Details"
            icon={FileText}
            maxWidth="620px"
          >
            <div className="approval-inspection-dialog" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px 20px 20px' }}>
              
              {/* 1. Student Info Card */}
              <div
                className="approval-inspection-student-card"
                style={{
                  background: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                  <img
                    src={studentAvatar}
                    alt={studentFullName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentFullName)}&background=07345f&color=fff&size=200&bold=true`;
                    }}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #e2e8f0',
                      display: 'block',
                      flexShrink: 0
                    }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {studentFullName}
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#475569',
                          background: '#f1f5f9',
                          padding: '1px 7px',
                          borderRadius: '4px',
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        {inspectRecord.student?.grade || 'Grade N/A'} - {inspectRecord.student?.section || 'Section N/A'}
                      </span>

                      <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Student ID: <strong style={{ color: '#334155' }}>{inspectRecord.student?.student_id || inspectRecord.student?.lrn || 'N/A'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: isUnderApproval ? '#fffbeb' : isApproved ? '#f0fdf4' : '#fef2f2',
                      color: isUnderApproval ? '#b45309' : isApproved ? '#15803d' : '#b91c1c',
                      border: `1px solid ${isUnderApproval ? '#fde68a' : isApproved ? '#bbf7d0' : '#fecaca'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {isApproved && (
                      <Check size={12} strokeWidth={2.5} />
                    )}
                    {isRejected && (
                      <X size={12} strokeWidth={2.5} />
                    )}
                    {aStat}
                  </span>
                </div>
              </div>

              {/* 2. Offense & Sanction Cards (2 columns) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Offense Card */}
                <div
                  className="approval-inspection-offense-card"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      Reported Offense
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: severityBg,
                        color: severityText,
                        border: `1px solid ${severityBorder}`
                      }}
                    >
                      {severityLabel}
                    </span>
                  </div>

                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {inspectRecord.violation?.title || 'Disciplinary Infraction'}
                  </div>

                  {inspectRecord.violation?.description && (
                    <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4, marginTop: '2px' }}>
                      {inspectRecord.violation.description}
                    </div>
                  )}
                </div>

                {/* Sanction Card */}
                <div
                  className="approval-inspection-sanction-card"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                    Prescribed Sanction
                  </span>

                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                    {inspectRecord.sanction || 'Initial Counseling'}
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: 'auto', lineHeight: 1.4 }}>
                    Standard disciplinary action for this violation.
                  </div>
                </div>
              </div>

              {/* 3. Teacher Statement Card */}
              <div
                className="approval-inspection-statement-card"
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Reporting Teacher Statement
                </div>

                <div
                  className="approval-inspection-statement-quote"
                  style={{
                    fontSize: '12.5px',
                    color: '#334155',
                    lineHeight: 1.5,
                    background: '#f8fafc',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0'
                  }}
                >
                  "{cleanRemarks}"
                </div>

                {gpsCoords && (
                  <div
                    className="approval-inspection-summary"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      color: '#475569',
                      fontWeight: 600,
                      background: '#f1f5f9',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginTop: '8px'
                    }}
                  >
                    <MapPin size={11} color="#64748b" />
                    <span>Location: {gpsCoords}</span>
                  </div>
                )}
              </div>

              {/* 4. Reporter & Case Details Grid (3 columns) */}
              <div
                className="approval-inspection-footer"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  padding: '10px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px'
                }}
              >
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                    Reported By
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '12.5px', display: 'block', marginTop: '1px' }}>
                    {inspectRecord.reported_by_name || 'Faculty Member'}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                    Date Submitted
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '12.5px', display: 'block', marginTop: '1px' }}>
                    {new Date(inspectRecord.date_reported).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block', fontWeight: 600, textTransform: 'uppercase' }}>
                    Guardian Contact
                  </span>
                  <strong style={{ color: '#0f172a', fontSize: '12.5px', display: 'block', marginTop: '1px' }}>
                    {inspectRecord.student?.parent_contact || 'No Contact Listed'}
                  </strong>
                </div>
              </div>

              {/* 5. Footer Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  marginTop: '2px'
                }}
              >
                <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                  Case ID: #{String(inspectRecord.id).padStart(5, '0')}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setInspectRecord(null)}
                    className="approval-inspection-close-btn"
                    style={{
                      padding: '7px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#334155',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>

                  {isUnderApproval && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectModal(inspectRecord)}
                        className="approval-inspection-reject-btn"
                        style={{
                          padding: '7px 14px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <X size={14} />
                        Reject Report
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleOpenApproveModal(inspectRecord)}
                        className="approval-inspection-approve-btn"
                        style={{
                          padding: '7px 18px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Approve Case
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
          </Modal>
        );
      })()}

      {/* 7. Approve Confirmation Modal */}
      {approveTargetRecord && (() => {
        const student = approveTargetRecord.student || {};
        const violation = approveTargetRecord.violation || {};
        const studentName = `${student.fname || ''} ${student.lname || ''}`.trim() || 'Student';
        const studentAvatar = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=120&bold=true`;
        const sevBadge = getSeverityBadge(violation.type);

        return (
          <Modal
            isOpen={Boolean(approveTargetRecord)}
            onClose={() => setApproveTargetRecord(null)}
            title="Approve Incident Report"
            icon={CheckCircle2}
            maxWidth="500px"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px 20px 20px' }}>
              
              {/* Student Information Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={studentAvatar}
                    alt={studentName}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #e2e8f0'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                      {studentName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                      {student.grade || 'Grade --'} • {student.section || 'Section --'}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#e2e8f0',
                    color: '#475569',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Case #{String(approveTargetRecord.id).padStart(4, '0')}
                </span>
              </div>

              {/* Case Snapshot Box */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                    {violation.title || 'Reported Offense'}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      background: sevBadge.bg,
                      color: sevBadge.color,
                      border: `1px solid ${sevBadge.border}`
                    }}
                  >
                    {sevBadge.label}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Sanction
                    </span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {approveTargetRecord.sanction || violation.default_sanction || 'Initial Counseling'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '10.5px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Reporting Faculty
                    </span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>
                      {approveTargetRecord.reported_by_name || 'Faculty Member'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target Status Choice */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Assign Initial Status
                </label>
                <CustomSelect
                  value={approveStatusChoice}
                  onChange={(e) => {
                    const val = typeof e === 'object' && e?.target?.value !== undefined ? e.target.value : String(e || 'Pending');
                    setApproveStatusChoice(val);
                  }}
                  options={[
                    { value: 'Pending', label: 'Pending Review / Action' },
                    { value: '1st Conference', label: '1st Conference Session' },
                    { value: 'Investigation', label: 'Under Investigation' },
                    { value: 'Resolved', label: 'Resolved (Immediate Closure)' }
                  ]}
                />
              </div>

              {/* SMS Notification Toggle Card */}
              {student.parent_contact && (
                <div
                  onClick={() => setNotifyParentOnApprove(prev => !prev)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a' }}>
                      Send SMS Notification
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                      Notify guardian at {student.parent_contact}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={notifyParentOnApprove}
                    onChange={(e) => setNotifyParentOnApprove(e.target.checked)}
                    style={{ accentColor: '#0f172a', width: 16, height: 16, cursor: 'pointer' }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}

              {/* Modal Footer Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                <button
                  type="button"
                  onClick={() => setApproveTargetRecord(null)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApprove}
                  disabled={actionLoading}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#16a34a',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <CheckCircle2 size={14} />
                  {actionLoading ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>

            </div>
          </Modal>
        );
      })()}

      {/* 8. Reject Reason Modal */}
      {rejectTargetRecord && (() => {
        const student = rejectTargetRecord.student || {};
        const violation = rejectTargetRecord.violation || {};
        const studentName = `${student.fname || ''} ${student.lname || ''}`.trim() || 'Student';
        const studentAvatar = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=120&bold=true`;
        const sevBadge = getSeverityBadge(violation.type);

        return (
          <Modal
            isOpen={Boolean(rejectTargetRecord)}
            onClose={() => setRejectTargetRecord(null)}
            title="Reject Incident Report"
            icon={AlertTriangle}
            maxWidth="500px"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 20px 20px 20px' }}>
              
              {/* Student Information Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#fef2f2',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={studentAvatar}
                    alt={studentName}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '8px',
                      objectFit: 'cover',
                      border: '1px solid #fecaca'
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '14px' }}>
                      {studentName}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#b91c1c', marginTop: '1px' }}>
                      {student.grade || 'Grade --'} • {student.section || 'Section --'}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Case #{String(rejectTargetRecord.id).padStart(4, '0')}
                </span>
              </div>

              {/* Case Summary Info */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px'
                }}
              >
                <div>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase' }}>
                    Incident Offense
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                    {violation.title || 'Violation Incident'}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: sevBadge.bg,
                    color: sevBadge.color,
                    border: `1px solid ${sevBadge.border}`
                  }}
                >
                  {sevBadge.label}
                </span>
              </div>

              {/* Reason Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Rejection Reason
                </label>
                <CustomSelect
                  value={rejectionReason}
                  onChange={(e) => {
                    const val = typeof e === 'object' && e?.target?.value !== undefined ? e.target.value : String(e || '');
                    setRejectionReason(val);
                  }}
                  options={[
                    { value: 'Insufficient Evidence / Lack of Proof', label: 'Insufficient Evidence / Lack of Proof' },
                    { value: 'Minor classroom infraction resolved informally', label: 'Minor classroom infraction resolved informally' },
                    { value: 'Incorrect Offense Category or Sanction Matrix', label: 'Incorrect Offense Category or Sanction Matrix' },
                    { value: 'Duplicate Report / Erroneous Entry', label: 'Duplicate Report / Erroneous Entry' },
                    { value: 'Other (Please specify below)', label: 'Other (Please specify below)' }
                  ]}
                />
              </div>

              {/* Custom Notes */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Feedback Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide feedback notes to the reporting teacher..."
                  value={customRejectNote}
                  onChange={(e) => setCustomRejectNote(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    background: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#0f172a'; e.target.style.background = '#ffffff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
                />
              </div>

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '8px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9'
                }}
              >
                <button
                  type="button"
                  onClick={() => setRejectTargetRecord(null)}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionLoading}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <X size={14} />
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>

            </div>
          </Modal>
        );
      })()}

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

export default ForApprovalPage;
