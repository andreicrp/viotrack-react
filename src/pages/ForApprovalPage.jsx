import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  UserX
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';
import { ViewModeToggle } from '../components/common/ViewModeToggle';
import { CustomSelect } from '../components/common/CustomSelect';
import { Modal } from '../components/common/Modal';

export const ForApprovalPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('Under Approval'); // 'Under Approval' | 'Approved' | 'Rejected' | 'all'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'minor' | 'serious' | 'major'
  const [gradeFilter, setGradeFilter] = useState('all');

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

  // Metric Analytics
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let highSeverity = 0;

    for (const r of records) {
      const aStat = r.approval_status || (r.reported_by_type === 'teacher' && r.status === 'Under Approval' ? 'Under Approval' : 'Approved');
      if (aStat === 'Under Approval') {
        pending++;
        const sev = r.violation?.type?.toLowerCase() || '';
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

  // Filter & Sort Pipeline
  const filteredRecords = useMemo(() => {
    let result = records.filter(r => {
      const aStat = r.approval_status || (r.reported_by_type === 'teacher' && r.status === 'Under Approval' ? 'Under Approval' : 'Approved');

      // Approval Status Filter
      if (approvalFilter !== 'all') {
        if (approvalFilter === 'Under Approval' && aStat !== 'Under Approval') return false;
        if (approvalFilter === 'Approved' && aStat !== 'Approved') return false;
        if (approvalFilter === 'Rejected' && aStat !== 'Rejected') return false;
      }

      // Severity Filter
      if (severityFilter !== 'all') {
        const type = (r.violation?.type || '').toLowerCase();
        if (type !== severityFilter.toLowerCase()) return false;
      }

      // Grade Filter
      if (gradeFilter !== 'all') {
        if (r.student?.grade !== gradeFilter) return false;
      }

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const studentName = `${r.student?.fname || ''} ${r.student?.lname || ''}`.toLowerCase();
        const lrn = (r.student?.lrn || '').toLowerCase();
        const teacher = (r.reported_by_name || '').toLowerCase();
        const vTitle = (r.violation?.title || '').toLowerCase();
        const remarks = (r.remarks || '').toLowerCase();
        return (
          studentName.includes(query) ||
          lrn.includes(query) ||
          teacher.includes(query) ||
          vTitle.includes(query) ||
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
  }, [records, approvalFilter, severityFilter, gradeFilter, searchTerm, sortField, sortOrder]);

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

  // Exports
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

    doc.save(`Viotrack_For_Approval_${Date.now()}.pdf`);
    success('Exported Approval Queue as PDF!');
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Student Name', 'LRN', 'Grade', 'Section', 'Offense', 'Severity', 'Sanction', 'Reported By', 'Approval Status', 'Date Reported', 'Remarks'];
      const rows = filteredRecords.map(r => [
        `${r.student?.fname || ''} ${r.student?.lname || ''}`.trim(),
        r.student?.lrn || 'N/A',
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

      exportToCsv(`Viotrack_For_Approval_${Date.now()}`, headers, rows);
      success(`Exported ${rows.length} approval entries to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown size={13} style={{ color: '#94a3b8', marginLeft: 4 }} />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp size={13} style={{ color: '#07345f', marginLeft: 4 }} />
    ) : (
      <ArrowDown size={13} style={{ color: '#07345f', marginLeft: 4 }} />
    );
  };

  const getSeverityBadge = (type) => {
    const t = (type || 'Minor').toLowerCase();
    if (t.includes('major')) {
      return { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Major Offense' };
    }
    if (t.includes('serious')) {
      return { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Serious Offense' };
    }
    return { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Minor Offense' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* 1. Page Banner Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <ShieldAlert size={32} strokeWidth={2.2} color="#ffffff" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Violations For Approval
              </h2>
              <span
                style={{
                  background: stats.pending > 0 ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)',
                  color: stats.pending > 0 ? '#ffffff' : '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {stats.pending} {stats.pending === 1 ? 'Pending Review' : 'Pending Reviews'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Review, verify, approve, or reject violation reports submitted by teaching faculty before sanctions take effect.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={handleExportPDF}
              className="page-banner-btn-secondary"
              title="Download PDF registry of approval cases"
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

          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchApprove}
              className="page-banner-primary-btn"
              style={{ background: '#10b981', borderColor: '#059669' }}
            >
              <CheckCircle2 size={16} strokeWidth={2.5} /> Approve Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="card" style={{ padding: '22px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        
        {/* 2. Stat Filter Cards */}
        <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          
          {/* Under Approval Card */}
          <div
            onClick={() => setApprovalFilter('Under Approval')}
            style={{
              background: approvalFilter === 'Under Approval' ? '#fef3c7' : '#ffffff',
              border: approvalFilter === 'Under Approval' ? '2px solid #d97706' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: approvalFilter === 'Under Approval' ? '0 4px 12px rgba(217, 119, 6, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={22} color="#d97706" strokeWidth={2.4} />
              <div>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#92400e', lineHeight: 1, display: 'block' }}>
                  {stats.pending}
                </span>
                <span style={{ fontSize: '11.5px', color: '#78350f', fontWeight: 700 }}>Under Approval</span>
              </div>
            </div>
            {approvalFilter === 'Under Approval' && (
              <span style={{ background: '#d97706', color: '#fff', fontSize: '9.5px', padding: '2px 7px', borderRadius: '5px', fontWeight: 800 }}>
                Active Filter
              </span>
            )}
          </div>

          {/* Approved Card */}
          <div
            onClick={() => setApprovalFilter('Approved')}
            style={{
              background: approvalFilter === 'Approved' ? '#f0fdf4' : '#ffffff',
              border: approvalFilter === 'Approved' ? '2px solid #10b981' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: approvalFilter === 'Approved' ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={22} color="#10b981" strokeWidth={2.4} />
              <div>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#065f46', lineHeight: 1, display: 'block' }}>
                  {stats.approved}
                </span>
                <span style={{ fontSize: '11.5px', color: '#047857', fontWeight: 700 }}>Approved Cases</span>
              </div>
            </div>
            {approvalFilter === 'Approved' && (
              <span style={{ background: '#10b981', color: '#fff', fontSize: '9.5px', padding: '2px 7px', borderRadius: '5px', fontWeight: 800 }}>
                Active Filter
              </span>
            )}
          </div>

          {/* Rejected Card */}
          <div
            onClick={() => setApprovalFilter('Rejected')}
            style={{
              background: approvalFilter === 'Rejected' ? '#fef2f2' : '#ffffff',
              border: approvalFilter === 'Rejected' ? '2px solid #ef4444' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: approvalFilter === 'Rejected' ? '0 4px 12px rgba(239, 68, 68, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <UserX size={22} color="#ef4444" strokeWidth={2.4} />
              <div>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#991b1b', lineHeight: 1, display: 'block' }}>
                  {stats.rejected}
                </span>
                <span style={{ fontSize: '11.5px', color: '#b91c1c', fontWeight: 700 }}>Rejected Reports</span>
              </div>
            </div>
            {approvalFilter === 'Rejected' && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '9.5px', padding: '2px 7px', borderRadius: '5px', fontWeight: 800 }}>
                Active Filter
              </span>
            )}
          </div>

          {/* All Submissions */}
          <div
            onClick={() => setApprovalFilter('all')}
            style={{
              background: approvalFilter === 'all' ? '#f0f4f8' : '#ffffff',
              border: approvalFilter === 'all' ? '2px solid #07345f' : '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: approvalFilter === 'all' ? '0 4px 12px rgba(7, 52, 95, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Layers size={22} color="#07345f" strokeWidth={2.4} />
              <div>
                <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', lineHeight: 1, display: 'block' }}>
                  {stats.total}
                </span>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700 }}>All Submissions</span>
              </div>
            </div>
            {approvalFilter === 'all' && (
              <span style={{ background: '#07345f', color: '#fff', fontSize: '9.5px', padding: '2px 7px', borderRadius: '5px', fontWeight: 800 }}>
                Active Filter
              </span>
            )}
          </div>

        </div>

        {/* 3. Search & Secondary Filters Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by student name, LRN, teacher, offense..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none',
                background: '#f8fafc',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#07345f'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.background = '#f8fafc'; }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Severity & Grade Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '130px' }}>
              <CustomSelect
                value={severityFilter}
                onChange={setSeverityFilter}
                placeholder="Severity"
                options={[
                  { value: 'all', label: 'All Severities' },
                  { value: 'minor', label: 'Minor Offenses' },
                  { value: 'serious', label: 'Serious Offenses' },
                  { value: 'major', label: 'Major Offenses' }
                ]}
              />
            </div>

            <div style={{ minWidth: '130px' }}>
              <CustomSelect
                value={gradeFilter}
                onChange={setGradeFilter}
                placeholder="Grade Level"
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

            {/* Entries Per Page */}
            <div style={{ minWidth: '110px' }}>
              <CustomSelect
                value={String(entriesPerPage)}
                onChange={(val) => { setEntriesPerPage(Number(val)); setCurrentPage(1); }}
                options={[
                  { value: '10', label: '10 per page' },
                  { value: '25', label: '25 per page' },
                  { value: '50', label: '50 per page' }
                ]}
              />
            </div>

            <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>

        {/* 4. Table / Grid Container */}
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div
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
            <ShieldCheck size={42} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 800, color: '#334155' }}>
              No Records Matching Filter
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
              {approvalFilter === 'Under Approval'
                ? 'All teacher-submitted incident reports have been reviewed and approved!'
                : 'Try adjusting your search keywords or severity filter.'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          /* Table View */
          <div className="table-container" style={{ overflowX: 'auto' }}>
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
                  const aStat = r.approval_status || (r.reported_by_type === 'teacher' && r.status === 'Under Approval' ? 'Under Approval' : 'Approved');
                  const isPending = aStat === 'Under Approval';
                  const isApproved = aStat === 'Approved';
                  const isRejected = aStat === 'Rejected';

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
                          {s.image ? (
                            <img
                              src={s.image}
                              alt={s.fname}
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1px solid #e2e8f0' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '12px'
                              }}
                            >
                              {(s.fname || 'S')[0]}{(s.lname || 'T')[0]}
                            </div>
                          )}
                          <div>
                            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px', display: 'block' }}>
                              {s.fname} {s.lname}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {s.grade} • {s.section} {s.lrn ? `• LRN: ${s.lrn}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Offense & Severity */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px' }}>
                            {v.title || 'Disciplinary Violation'}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              width: 'fit-content',
                              padding: '2px 7px',
                              borderRadius: '6px',
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
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#fffbeb',
                              color: '#d97706',
                              border: '1px solid #fde68a',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '11.5px',
                              fontWeight: 800
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#d97706', animation: 'pulse 1.5s infinite' }} />
                            Under Approval
                          </span>
                        )}
                        {isApproved && (
                          <span
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
                            className="entity-grid-btn"
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
        ) : (
          /* Grid View */
          <div className="entity-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
            {paginatedRecords.map((r) => {
              const isChecked = selectedIds.includes(r.id);
              const s = r.student || {};
              const v = r.violation || {};
              const sevBadge = getSeverityBadge(v.type);
              const aStat = r.approval_status || (r.reported_by_type === 'teacher' && r.status === 'Under Approval' ? 'Under Approval' : 'Approved');
              const isPending = aStat === 'Under Approval';
              const isApproved = aStat === 'Approved';

              return (
                <div
                  key={r.id}
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
                    {s.image ? (
                      <img
                        src={s.image}
                        alt={s.fname}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px'
                        }}
                      >
                        {(s.fname || 'S')[0]}{(s.lname || 'T')[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                        {s.fname} {s.lname}
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
                      {v.title || 'Violation Incident'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: sevBadge.bg,
                          color: sevBadge.color
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
                      <Eye size={13} /> View
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
            })}
          </div>
        )}

        {/* 5. Pagination Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>
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

      {/* 6. Comprehensive Case Inspection Modal */}
      {inspectRecord && (
        <Modal
          isOpen={Boolean(inspectRecord)}
          onClose={() => setInspectRecord(null)}
          title="Incident Report Case Inspection"
          icon={FileText}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
            
            {/* Top Student Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f8fafc', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px'
                }}
              >
                {(inspectRecord.student?.fname || 'S')[0]}{(inspectRecord.student?.lname || 'T')[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  {inspectRecord.student?.fname} {inspectRecord.student?.lname}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                  {inspectRecord.student?.grade} - {inspectRecord.student?.section} | LRN: {inspectRecord.student?.lrn || 'N/A'}
                </div>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: inspectRecord.approval_status === 'Under Approval' ? '#fffbeb' : '#f0fdf4',
                  color: inspectRecord.approval_status === 'Under Approval' ? '#d97706' : '#16a34a',
                  border: `1px solid ${inspectRecord.approval_status === 'Under Approval' ? '#fde68a' : '#bbf7d0'}`
                }}
              >
                {inspectRecord.approval_status || 'Under Approval'}
              </span>
            </div>

            {/* Violation Details Box */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                  OFFENSE CATEGORY
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#dc2626' }}>
                  {inspectRecord.violation?.title || 'Disciplinary Offense'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Classification: {inspectRecord.violation?.type || 'Minor'}
                </span>
              </div>

              <div style={{ background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                  RECOMMENDED SANCTION
                </span>
                <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  {inspectRecord.sanction || 'Under Review / Initial Counseling'}
                </span>
              </div>
            </div>

            {/* Teacher Remarks & Statement */}
            <div style={{ background: '#ffffff', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                FACULTY INCIDENT STATEMENT &amp; REMARKS
              </span>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.5, background: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                {inspectRecord.remarks || 'No detailed statement logged.'}
              </p>
            </div>

            {/* Submitter & Location Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '12.5px' }}>
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>REPORTING FACULTY</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{inspectRecord.reported_by_name || 'Faculty Member'}</span>
              </div>

              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>SUBMISSION DATE &amp; TIME</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{new Date(inspectRecord.date_reported).toLocaleString()}</span>
              </div>

              {inspectRecord.student?.parent_contact && (
                <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>PARENT CONTACT</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{inspectRecord.student.parent_contact}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setInspectRecord(null)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>

              {inspectRecord.approval_status === 'Under Approval' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenRejectModal(inspectRecord)}
                    style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reject Report
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenApproveModal(inspectRecord)}
                    style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#ffffff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Approve Case
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 7. Approve Confirmation Modal */}
      {approveTargetRecord && (
        <Modal
          isOpen={Boolean(approveTargetRecord)}
          onClose={() => setApproveTargetRecord(null)}
          title="Approve Violation Incident Report"
          icon={CheckCircle2}
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
              You are about to officially verify and approve the disciplinary incident report for{' '}
              <strong>{approveTargetRecord.student?.fname} {approveTargetRecord.student?.lname}</strong>.
            </p>

            {/* Case Snapshot Box */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 14px', fontSize: '13px' }}>
              <div style={{ fontWeight: 800, color: '#166534', marginBottom: '4px' }}>
                {approveTargetRecord.violation?.title}
              </div>
              <div style={{ color: '#15803d', fontSize: '12px' }}>
                Prescribed Sanction: <strong>{approveTargetRecord.sanction || 'Initial Counseling'}</strong>
              </div>
              <div style={{ color: '#15803d', fontSize: '12px', marginTop: '2px' }}>
                Submitted by: {approveTargetRecord.reported_by_name}
              </div>
            </div>

            {/* Target Status Choice */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Assign Initial Disciplinary Status
              </label>
              <CustomSelect
                value={approveStatusChoice}
                onChange={setApproveStatusChoice}
                options={[
                  { value: 'Pending', label: 'Pending Review / Action' },
                  { value: '1st Conference', label: '1st Conference Session' },
                  { value: 'Investigation', label: 'Under Investigation' },
                  { value: 'Resolved', label: 'Resolved (Immediate Closure)' }
                ]}
              />
            </div>

            {/* SMS Checkbox */}
            {approveTargetRecord.student?.parent_contact && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: '#334155', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={notifyParentOnApprove}
                  onChange={(e) => setNotifyParentOnApprove(e.target.checked)}
                  style={{ accentColor: '#10b981', width: 16, height: 16 }}
                />
                Send official SMS notice to Guardian ({approveTargetRecord.student.parent_contact})
              </label>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setApproveTargetRecord(null)}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={actionLoading}
                style={{
                  padding: '9px 22px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#10b981',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <CheckCircle2 size={16} />
                {actionLoading ? 'Approving...' : 'Confirm & Approve'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 8. Reject Reason Modal */}
      {rejectTargetRecord && (
        <Modal
          isOpen={Boolean(rejectTargetRecord)}
          onClose={() => setRejectTargetRecord(null)}
          title="Reject Incident Report"
          icon={AlertTriangle}
          maxWidth="520px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
              Please specify the reason for rejecting the incident report submitted for{' '}
              <strong>{rejectTargetRecord.student?.fname} {rejectTargetRecord.student?.lname}</strong>.
            </p>

            {/* Reason Selector */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Primary Rejection Reason
              </label>
              <CustomSelect
                value={rejectionReason}
                onChange={setRejectionReason}
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
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Administrator Feedback Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Provide guidance or notes to the reporting teacher..."
                value={customRejectNote}
                onChange={(e) => setCustomRejectNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setRejectTargetRecord(null)}
                style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                style={{
                  padding: '9px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: actionLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={16} />
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ForApprovalPage;
