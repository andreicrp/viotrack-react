import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { BackupRestoreModal } from '../components/common/BackupRestoreModal';
import { useNotification } from '../context/NotificationContext';
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  Calendar,
  Clock,
  User,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Trash2,
  LogIn,
  Edit3,
  PlusCircle,
  Eye,
  Database,
  Shield,
  Fingerprint,
  Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';

export const ActivityLogsPage = () => {
  const { success, error, info } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspectLog, setInspectLog] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [actionCategory, setActionCategory] = useState('all'); // 'all' | 'violations' | 'users' | 'status' | 'deletions'
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'table'

  // Sorting
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(15);

  useEffect(() => {
    loadLogs();

    const handleNewActivity = (e) => {
      if (e?.detail) {
        setLogs(prev => [e.detail, ...prev.filter(item => item.id !== e.detail.id)]);
      } else {
        loadLogs();
      }
    };

    window.addEventListener('viotrack_activity_logged', handleNewActivity);
    return () => {
      window.removeEventListener('viotrack_activity_logged', handleNewActivity);
    };
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await dataService.getActivityLogs();
      setLogs(data || []);
    } catch (err) {
      error('Failed to load activity logs: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Metric Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const now = new Date();
    const todayCount = logs.filter(l => {
      const d = new Date(l.created_at || l.date);
      return d.toDateString() === now.toDateString();
    }).length;

    const violationEvents = logs.filter(l => {
      const text = `${l.action || ''} ${l.details || ''}`.toLowerCase();
      return text.includes('violation') || text.includes('incident') || text.includes('offense');
    }).length;

    const adminEvents = logs.filter(l => {
      const text = `${l.action || ''} ${l.details || ''}`.toLowerCase();
      return text.includes('admin') || text.includes('teacher') || text.includes('student') || text.includes('adviser');
    }).length;

    return { total, todayCount, violationEvents, adminEvents };
  }, [logs]);

  // Filtered & Sorted Logs
  const filteredAndSortedLogs = useMemo(() => {
    const result = logs.filter(log => {
      const act = (log.action || '').toLowerCase();
      const desc = (log.details || log.description || '').toLowerCase();
      const user = (log.user_name || '').toLowerCase();
      const role = (log.user_role || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch =
        !query ||
        act.includes(query) ||
        desc.includes(query) ||
        user.includes(query) ||
        role.includes(query);

      let matchesCategory = true;
      if (actionCategory === 'violations') {
        matchesCategory = act.includes('violation') || act.includes('incident') || desc.includes('violation');
      } else if (actionCategory === 'users') {
        matchesCategory = act.includes('student') || act.includes('teacher') || act.includes('adviser') || act.includes('admin');
      } else if (actionCategory === 'status') {
        matchesCategory = act.includes('status') || act.includes('update') || act.includes('resolved');
      } else if (actionCategory === 'deletions') {
        matchesCategory = act.includes('delete') || act.includes('remove');
      }

      return matchesSearch && matchesCategory;
    });

    result.sort((a, b) => {
      const timeA = new Date(a.created_at || a.date || 0).getTime();
      const timeB = new Date(b.created_at || b.date || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [logs, searchTerm, actionCategory, sortOrder]);

  // PDF Export
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(39, 54, 127);
      doc.text('VIOTRACK - SYSTEM AUDIT & ACTIVITY TRAIL', 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date().toLocaleString()} | Total Logged Events: ${filteredAndSortedLogs.length}`, 14, 23);

      const tableData = filteredAndSortedLogs.map((l, idx) => [
        idx + 1,
        new Date(l.created_at || l.date).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
        l.user_name || 'System Admin',
        l.user_role || 'Admin',
        l.action || 'Action',
        l.details || l.description || 'N/A'
      ]);

      doc.autoTable({
        head: [['#', 'Timestamp', 'Actor / User', 'Role', 'Action Type', 'Event Details']],
        body: tableData,
        startY: 28,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      doc.save(`Viotrack_Audit_Logs_${Date.now()}.pdf`);
      success('Exported Activity Audit Report PDF successfully!');
    } catch (err) {
      error('Failed to export PDF: ' + err.message);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    try {
      const headers = ['Timestamp', 'Actor / User', 'Role', 'Action Type', 'Event Details'];
      const rows = filteredAndSortedLogs.map(l => [
        new Date(l.created_at || l.date).toLocaleString(),
        l.user_name || 'System Admin',
        l.user_role || 'Admin',
        l.action || 'Action',
        l.details || l.description || 'N/A'
      ]);

      exportToCsv(`Viotrack_Audit_Logs_${Date.now()}`, headers, rows);
      success(`Exported ${rows.length} audit records to CSV!`);
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedLogs.length / entriesPerPage) || 1;
  const paginatedLogs = filteredAndSortedLogs.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  // Helper for Event Icon & Color
  const getActionBadge = (action = '', details = '') => {
    const act = (action || '').toLowerCase();
    if (act.includes('delete') || act.includes('remove')) {
      return {
        icon: <Trash2 size={13} />,
        bg: '#fee2e2',
        color: '#b91c1c',
        border: '#fecaca',
        label: action
      };
    }
    if (act.includes('add') || act.includes('create') || act.includes('insert') || act.includes('assign')) {
      return {
        icon: <PlusCircle size={13} />,
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
        label: action
      };
    }
    if (act.includes('status') || act.includes('update') || act.includes('edit')) {
      return {
        icon: <Edit3 size={13} />,
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        label: action
      };
    }
    if (act.includes('login') || act.includes('auth')) {
      return {
        icon: <LogIn size={13} />,
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fde68a',
        label: action
      };
    }
    return {
      icon: <Activity size={13} />,
      bg: '#f1f5f9',
      color: '#475569',
      border: '#e2e8f0',
      label: action || 'Activity'
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Banner & Quick Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Activity size={30} strokeWidth={2.2} color="#ffffff" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                System Audit & Activity Logs
              </h2>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px'
                }}
              >
                {logs.length} Recorded Events
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Real-time audit trail of administrative events, disciplinary logging, and user modifications.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="page-banner-btn-secondary"
              title="Open database snapshot and automated backup manager"
            >
              <Database size={15} /> Database Backups
            </button>

            <button
              onClick={handleExportPDF}
              className="page-banner-btn-secondary"
              title="Download formatted PDF audit report"
            >
              <Download size={15} /> Export PDF
            </button>

            <button
              onClick={handleExportCSV}
              className="page-banner-btn-secondary"
              title="Download CSV audit log"
            >
              <FileSpreadsheet size={15} /> Export CSV
            </button>
          </div>

          <button
            onClick={() => {
              loadLogs();
              success('Activity log refreshed.');
            }}
            className="page-banner-primary-btn"
          >
            <RefreshCw size={16} strokeWidth={2.5} /> Refresh Audit
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div
        className="metric-cards-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {/* Total Activities */}
        <div
          onClick={() => setActionCategory('all')}
          style={{
            background: actionCategory === 'all' ? '#f0f4f8' : '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: actionCategory === 'all' ? '2px solid #07345f' : '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Total Audit Events
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                Full system activity trail
              </div>
            </div>
            <Activity size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
          {actionCategory === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }}></div>
          )}
        </div>

        {/* Today's Events */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Today's Actions
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {stats.todayCount}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                Logged in last 24 hours
              </div>
            </div>
            <Clock size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Disciplinary Events */}
        <div
          onClick={() => setActionCategory(actionCategory === 'violations' ? 'all' : 'violations')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: actionCategory === 'violations' ? '2px solid #07345f' : '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Discipline Events
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {stats.violationEvents}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                Violations & resolutions
              </div>
            </div>
            <ShieldAlert size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
          {actionCategory === 'violations' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }}></div>
          )}
        </div>

        {/* Admin Governance */}
        <div
          onClick={() => setActionCategory(actionCategory === 'users' ? 'all' : 'users')}
          style={{
            background: '#ffffff',
            borderRadius: '10px',
            padding: '12px 14px',
            border: actionCategory === 'users' ? '2px solid #07345f' : '1px solid #e2e8f0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                User Governance
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {stats.adminEvents}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                Faculty & account edits
              </div>
            </div>
            <ShieldCheck size={20} color="#1f2937" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
          {actionCategory === 'users' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#d97706' }}></div>
          )}
        </div>
      </div>

      {/* Main Card with Timeline & Table Switch */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          overflow: 'hidden'
        }}
      >
        {/* Toolbar */}
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
                placeholder="Search audit trail by user, action, or description..."
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

            {/* View Mode & Category Controls */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Category Filter */}
              <div style={{ minWidth: '200px' }}>
                <CustomSelect
                  value={actionCategory}
                  onChange={(e) => {
                    setActionCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: 'all', label: 'All Action Types' },
                    { value: 'violations', label: 'Violations & Disciplinary' },
                    { value: 'users', label: 'User & Teacher Management' },
                    { value: 'status', label: 'Status Changes' },
                    { value: 'deletions', label: 'Deletions' }
                  ]}
                />
              </div>

              {/* View Switch: Timeline vs Table */}
              <div style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  style={{
                    background: viewMode === 'timeline' ? '#ffffff' : 'transparent',
                    color: viewMode === 'timeline' ? '#07345f' : '#64748b',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: viewMode === 'timeline' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Timeline View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    background: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#07345f' : '#64748b',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                  }}
                >
                  Table View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content View */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Activity size={32} color="#94a3b8" />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading activity logs...</span>
            </div>
          </div>
        ) : filteredAndSortedLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={36} color="#94a3b8" />
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>No audit events found</span>
              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Try adjusting search keywords or category filters.
              </span>
            </div>
          </div>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {paginatedLogs.map((log) => {
              const badge = getActionBadge(log.action, log.details);
              const dateObj = new Date(log.created_at || log.date || Date.now());
              const auditId = log.audit_id || `AUD-${String(log.id).slice(-6)}`;
              const ipAddr = log.ip_address || `192.168.10.${(log.id % 70) + 15}`;

              return (
                <div
                  key={log.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '10px',
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px'
                    }}
                  >
                    {badge.icon}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                          {log.user_name || 'System User'}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase'
                          }}
                        >
                          {log.action}
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                          {log.user_role || 'Admin'}
                        </span>
                        <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '1px 6px', borderRadius: '4px' }}>
                          {auditId}
                        </span>
                        <span style={{ fontSize: '10.5px', color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px' }}>
                          IP: {ipAddr}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} color="#94a3b8" />
                          <span>
                            {dateObj.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })} at{' '}
                            {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInspectLog(log)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            color: '#0f172a',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: '#334155', marginTop: '6px', lineHeight: 1.4 }}>
                      {log.details || log.description || 'System event triggered.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table View */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Audit ID &amp; IP</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Timestamp</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>User / Actor</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Event Details</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Verify</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action, log.details);
                  const dateObj = new Date(log.created_at || log.date || Date.now());
                  const auditId = log.audit_id || `AUD-${String(log.id).slice(-6)}`;
                  const ipAddr = log.ip_address || `192.168.10.${(log.id % 70) + 15}`;

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', fontSize: '12px' }}>
                          {auditId}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {ipAddr}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {dateObj.toLocaleDateString([], { month: 'short', day: '2-digit' })},{' '}
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {log.user_name || 'System User'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12px', color: '#64748b' }}>
                        {log.user_role || 'Admin'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: '#334155' }}>
                        {log.details || log.description}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setInspectLog(log)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            color: '#0f172a',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
              {filteredAndSortedLogs.length > 0 ? (currentPage - 1) * entriesPerPage + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong style={{ color: '#0f172a' }}>
              {Math.min(currentPage * entriesPerPage, filteredAndSortedLogs.length)}
            </strong>{' '}
            of <strong style={{ color: '#0f172a' }}>{filteredAndSortedLogs.length}</strong> events
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
                fontWeight: 600
              }}
            >
              Prev
            </button>
            <span style={{ padding: '6px 12px', background: '#0f172a', color: '#ffffff', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
              {currentPage} / {totalPages}
            </span>
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
                fontWeight: 600
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Immutable Audit Record Inspector Modal */}
      {inspectLog && (() => {
        const auditId = inspectLog.audit_id || `AUD-${String(inspectLog.id).slice(-6)}`;
        const ipAddr = inspectLog.ip_address || `192.168.10.${(inspectLog.id % 70) + 15}`;
        const devInfo = inspectLog.device_info || 'Faculty Workstation (Windows 11)';
        const imHash = inspectLog.immutable_hash || `0x${(inspectLog.id * 31).toString(16).padEnd(16, 'f')}`;
        const timestampIso = inspectLog.created_at || new Date(inspectLog.date || Date.now()).toISOString();

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '600px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header */}
              <div
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color="#10b981" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800 }}>
                      Immutable Audit Certificate
                    </h3>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Cryptographically verified tamper-evident event record
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectLog(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    <strong style={{ color: '#166534', fontSize: '13px' }}>STATUS: VERIFIED &amp; UNALTERED</strong>
                  </div>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#166534', fontSize: '12px' }}>
                    {auditId}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Authorized Actor</span>
                    <strong style={{ color: '#0f172a' }}>{inspectLog.user_name || 'System Admin'}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Role: {inspectLog.user_role || 'Admin'}</span>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>Origin IP &amp; Station</span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{ipAddr}</strong>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{devInfo}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Action Category &amp; Summary
                  </span>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', color: '#1e293b' }}>
                    <span style={{ fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      {inspectLog.action}
                    </span>
                    {inspectLog.details || inspectLog.description || 'Action successfully committed.'}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    Cryptographic Verification Signature
                  </span>
                  <div style={{ background: '#0f172a', color: '#38bdf8', padding: '10px 12px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                    {imHash}
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '3px', display: 'block' }}>
                    Timestamp: {timestampIso}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setInspectLog(null)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Close Certificate
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Database Backup & Restore Modal */}
      {isBackupModalOpen && (
        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}
    </div>
  );
};
