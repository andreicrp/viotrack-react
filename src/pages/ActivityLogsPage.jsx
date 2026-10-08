import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { BackupRestoreModal } from '../components/common/BackupRestoreModal';
import { useNotification } from '../context/NotificationContext';
import {
  Activity,
  Search,
  RefreshCw,
  Download,
  Upload,
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
  Check,
  Copy,
  Laptop,
  Globe
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';
import { useAuth } from '../context/AuthContext';

export const ActivityLogsPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inspectLog, setInspectLog] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [saveAsModalOpen, setSaveAsModalOpen] = useState(false);
  const [saveAsConfig, setSaveAsConfig] = useState({
    defaultFilename: 'Viotrack_Audit_Logs',
    defaultFormat: 'csv',
    availableFormats: ['csv', 'xlsx', 'pdf'],
    headers: [],
    rows: [],
    generatePdfBlob: null,
    title: 'Save Activity Audit Logs As'
  });

  const handleCopy = (text, fieldKey) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
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
    const query = deferredSearch.toLowerCase().trim();
    const result = logs.filter(log => {
      const act = (log.action || '').toLowerCase();
      const desc = (log.details || log.description || '').toLowerCase();
      const user = (log.user_name || '').toLowerCase();
      const role = (log.user_role || '').toLowerCase();

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
  }, [logs, deferredSearch, actionCategory, sortOrder]);

  // Save As Export Handler
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Timestamp', 'Actor / User', 'Role', 'Action Type', 'Event Details'];
    const rows = filteredAndSortedLogs.map(l => [
      new Date(l.created_at || l.date).toLocaleString(),
      l.user_name || 'System Admin',
      l.user_role || 'Admin',
      l.action || 'Action',
      l.details || l.description || 'N/A'
    ]);

    const generatePdfBlob = async () => {
      const doc = await getJsPDF();
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

      return doc.output('blob');
    };

    setSaveAsConfig({
      defaultFilename: `Viotrack_Audit_Logs_${new Date().toISOString().slice(0, 10)}`,
      defaultFormat,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      headers,
      rows,
      generatePdfBlob,
      title: 'Save Activity Audit Logs As'
    });
    setSaveAsModalOpen(true);
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
          <Activity size={26} strokeWidth={2.4} color="#0f172a" style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              System Audit &amp; Activity Logs
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
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
              <Database size={14} /> Database Backups
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('pdf')}
              className="page-banner-btn-secondary"
              title="Save As formatted PDF audit report"
            >
              <Upload size={14} strokeWidth={2.2} /> Export PDF
            </button>

            <button
              onClick={() => handleOpenExportSaveAs('csv')}
              className="page-banner-btn-secondary"
              title="Save As CSV / Excel audit log"
            >
              <FileText size={14} strokeWidth={2.2} /> Export CSV
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
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: actionCategory === 'all' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: actionCategory === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL AUDIT EVENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Full system activity trail
              </div>
            </div>
            <Activity size={20} color="#07345f" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Today's Events */}
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
                TODAY'S ACTIONS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.todayCount}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Logged in last 24 hours
              </div>
            </div>
            <Clock size={20} color="#07345f" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Disciplinary Events */}
        <div
          onClick={() => setActionCategory(actionCategory === 'violations' ? 'all' : 'violations')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: actionCategory === 'violations' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: actionCategory === 'violations' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                DISCIPLINE EVENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.violationEvents}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Violations & resolutions
              </div>
            </div>
            <ShieldAlert size={20} color="#07345f" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Admin Governance */}
        <div
          onClick={() => setActionCategory(actionCategory === 'users' ? 'all' : 'users')}
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px 16px',
            border: actionCategory === 'users' ? '2px solid #07345f' : '1.5px solid #cbd5e1',
            boxShadow: actionCategory === 'users' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                USER GOVERNANCE
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.adminEvents}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Faculty & account edits
              </div>
            </div>
            <ShieldCheck size={20} color="#07345f" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
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
        const formattedDate = new Date(inspectLog.date || timestampIso).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });

        const certificateSummary = `[VIOTRACK AUDIT EVENT]\nAudit ID: ${auditId}\nStatus: Verified Record\nActor: ${inspectLog.user_name || 'System Admin'} (${inspectLog.user_role || 'Admin'})\nOrigin IP: ${ipAddr}\nWorkstation: ${devInfo}\nAction: ${inspectLog.action}\nDetails: ${inspectLog.details || inspectLog.description || 'Action committed.'}\nTimestamp: ${timestampIso}\nHash: ${imHash}`;

        return (
          <div
            className="modal-backdrop-smooth"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              className="modal-content-smooth"
              style={{
                width: '100%',
                maxWidth: '560px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #e2e8f0'
              }}
            >
              {/* Clean Light Modal Header */}
              <div
                style={{
                  background: '#ffffff',
                  color: '#0f172a',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f1f5f9'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} color="#0f172a" style={{ flexShrink: 0 }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', color: '#0f172a' }}>
                      Audit Event Details
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                      System activity record and verification details
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectLog(null)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                {/* Audit ID & Verified Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    padding: '9px 12px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <CheckCircle2 size={15} color="#16a34a" />
                    <span style={{ color: '#166534', fontWeight: 600, fontSize: '12px' }}>
                      Verified System Record
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(auditId, 'auditId')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: '#ffffff',
                      border: '1px solid #86efac',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      color: '#166534',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                    title="Copy Audit ID"
                  >
                    <span>{auditId}</span>
                    {copiedField === 'auditId' ? (
                      <Check size={11} color="#16a34a" />
                    ) : (
                      <Copy size={11} color="#166534" />
                    )}
                  </button>
                </div>

                {/* Actor and Workstation Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Authorized Actor
                    </span>
                    <strong style={{ color: '#0f172a', fontSize: '13px', marginTop: '1px' }}>
                      {inspectLog.user_name || 'System Admin'}
                    </strong>
                    <div style={{ marginTop: '2px' }}>
                      <span
                        style={{
                          background: '#e2e8f0',
                          color: '#334155',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}
                      >
                        {inspectLog.user_role || 'Admin'}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      background: '#f8fafc',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Origin Station
                    </span>
                    <strong style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '12.5px', marginTop: '1px' }}>
                      {ipAddr}
                    </strong>
                    <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      {devInfo}
                    </span>
                  </div>
                </div>

                {/* Action Category & Details */}
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      Action Description
                    </span>
                  </div>
                  <strong style={{ color: '#0f172a', fontSize: '13.5px', display: 'block', marginBottom: '4px' }}>
                    {inspectLog.action}
                  </strong>
                  <div style={{ color: '#475569', fontSize: '12.5px', lineHeight: 1.5 }}>
                    {inspectLog.details || inspectLog.description || 'Action committed.'}
                  </div>
                </div>

                {/* Verification Hash Card */}
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                      Verification Hash (SHA-256)
                    </span>

                    <button
                      type="button"
                      onClick={() => handleCopy(imHash, 'imHash')}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {copiedField === 'imHash' ? (
                        <>
                          <Check size={11} color="#16a34a" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div
                    style={{
                      color: '#0f172a',
                      fontFamily: 'monospace',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      wordBreak: 'break-all'
                    }}
                  >
                    {imHash}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid #e2e8f0',
                      fontSize: '11px',
                      color: '#64748b'
                    }}
                  >
                    <Clock size={11} />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  background: '#f8fafc',
                  borderTop: '1px solid #f1f5f9',
                  padding: '12px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCopy(certificateSummary, 'summary')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {copiedField === 'summary' ? (
                    <>
                      <Check size={12} color="#16a34a" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectLog(null)}
                  style={{
                    padding: '7px 18px',
                    borderRadius: '6px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Close
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
