import React, { useState, useEffect, useMemo, useDeferredValue, useCallback } from 'react';
import { dataService } from '../services/dataService';
import { CustomSelect } from '../components/common/CustomSelect';
import { BackupRestoreModal } from '../components/common/BackupRestoreModal';
import { useNotification } from '../context/NotificationContext';
import {
  Activity,
  Search,
  RefreshCw,
  Upload,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  Trash2,
  LogIn,
  Edit3,
  PlusCircle,
  Eye,
  Database,
  Check,
  Copy
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { SaveAsModal } from '../components/common/SaveAsModal';
import { useAuth } from '../context/AuthContext';

const getLogTimestamp = (log) => {
  const timestamp = log.created_at || log.date;
  if (!timestamp) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const ActivityLogsPage = () => {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
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

  const handleCopy = async (text, fieldKey) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable in this browser.');
      }
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 2000);
      success('Copied to clipboard.');
    } catch (err) {
      error(err.message || 'Could not copy to clipboard.');
    }
  };

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [actionCategory, setActionCategory] = useState('all'); // 'all' | 'violations' | 'users' | 'status' | 'deletions'
  const [timeFilter, setTimeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' | 'table'

  // Sorting
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(15);

  const loadLogs = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setLoadError('');
    try {
      const data = await dataService.getActivityLogs(forceRefresh);
      setLogs(data || []);
      return true;
    } catch (err) {
      const message = `Failed to load activity logs: ${err.message}`;
      setLoadError(message);
      error(message);
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [error]);

  const handleRefresh = async () => {
    if (await loadLogs(true)) success('Activity log refreshed.');
  };

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) loadLogs();
    });
    const handleNewActivity = (event) => {
      if (event?.detail) {
        setLogs(previous => [event.detail, ...previous.filter(item => item.id !== event.detail.id)]);
        setCurrentPage(1);
      } else {
        loadLogs(true);
      }
    };

    window.addEventListener('viotrack_activity_logged', handleNewActivity);
    return () => {
      isMounted = false;
      window.removeEventListener('viotrack_activity_logged', handleNewActivity);
    };
  }, [loadLogs]);

  // Metric Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const now = new Date();
    const todayCount = logs.filter(l => {
      const date = getLogTimestamp(l);
      return date?.toDateString() === now.toDateString();
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
      const auditId = (log.audit_id || '').toLowerCase();
      const ipAddress = (log.ip_address || '').toLowerCase();
      const timestamp = getLogTimestamp(log);
      const matchesTime = timeFilter === 'all'
        || (timeFilter === 'today' && timestamp?.toDateString() === new Date().toDateString());

      const matchesSearch =
        !query ||
        act.includes(query) ||
        desc.includes(query) ||
        user.includes(query) ||
        role.includes(query) ||
        auditId.includes(query) ||
        ipAddress.includes(query);

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

      return matchesSearch && matchesCategory && matchesTime;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'action') {
        comparison = String(a.action || '').localeCompare(String(b.action || ''));
      } else if (sortField === 'actor') {
        comparison = String(a.user_name || '').localeCompare(String(b.user_name || ''));
      } else if (sortField === 'role') {
        comparison = String(a.user_role || '').localeCompare(String(b.user_role || ''));
      } else {
        comparison = (getLogTimestamp(a)?.getTime() || 0) - (getLogTimestamp(b)?.getTime() || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [logs, deferredSearch, actionCategory, timeFilter, sortField, sortOrder]);

  // Save As Export Handler
  const handleOpenExportSaveAs = (defaultFormat = 'csv') => {
    const headers = ['Timestamp', 'Actor / User', 'Role', 'Action Type', 'Event Details'];
    const rows = filteredAndSortedLogs.map(l => [
      getLogTimestamp(l)?.toLocaleString() || 'Date unavailable',
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
        getLogTimestamp(l)?.toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) || 'Date unavailable',
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
  const visiblePage = Math.min(currentPage, totalPages);
  const paginatedLogs = filteredAndSortedLogs.slice((visiblePage - 1) * entriesPerPage, visiblePage * entriesPerPage);

  const handleSortFieldChange = (event) => {
    setSortField(event.target.value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (event) => {
    setEntriesPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  // Helper for Event Icon & Color
  const getActionBadge = (action = '') => {
    const act = (action || '').toLowerCase();
    if (act.includes('delete') || act.includes('remove')) {
      return {
        className: 'badge-major',
        icon: <Trash2 size={13} />,
        bg: '#fee2e2',
        color: '#b91c1c',
        border: '#fecaca',
        label: action
      };
    }
    if (act.includes('add') || act.includes('create') || act.includes('insert') || act.includes('assign')) {
      return {
        className: 'badge-minor',
        icon: <PlusCircle size={13} />,
        bg: '#ecfdf5',
        color: '#047857',
        border: '#a7f3d0',
        label: action
      };
    }
    if (act.includes('status') || act.includes('update') || act.includes('edit')) {
      return {
        className: 'badge-blue',
        icon: <Edit3 size={13} />,
        bg: '#eff6ff',
        color: '#1d4ed8',
        border: '#bfdbfe',
        label: action
      };
    }
    if (act.includes('login') || act.includes('auth')) {
      return {
        className: 'badge-serious',
        icon: <LogIn size={13} />,
        bg: '#fef3c7',
        color: '#b45309',
        border: '#fde68a',
        label: action
      };
    }
    return {
      className: '',
      icon: <Activity size={13} />,
      bg: '#f1f5f9',
      color: '#475569',
      border: '#e2e8f0',
      label: action || 'Activity'
    };
  };

  return (
    <div className="activity-logs-page" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Top Banner & Quick Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <Activity size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              System Audit &amp; Activity Logs
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
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
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="page-banner-primary-btn"
          >
            <RefreshCw size={16} strokeWidth={2.5} className={refreshing ? 'activity-refreshing' : ''} />
            {refreshing ? 'Refreshing…' : 'Refresh audit'}
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
          role="button"
          tabIndex={0}
          aria-pressed={actionCategory === 'all' && timeFilter === 'all'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActionCategory('all');
              setTimeFilter('all');
              setCurrentPage(1);
            }
          }}
          onClick={() => {
            setActionCategory('all');
            setTimeFilter('all');
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: actionCategory === 'all' && timeFilter === 'all' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: actionCategory === 'all' && timeFilter === 'all' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL AUDIT EVENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.total}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                Full system activity trail
              </div>
            </div>
            <Activity size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Today's Events */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={timeFilter === 'today'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setTimeFilter(current => current === 'today' ? 'all' : 'today');
              setCurrentPage(1);
            }
          }}
          onClick={() => {
            setTimeFilter(current => current === 'today' ? 'all' : 'today');
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: timeFilter === 'today' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            position: 'relative',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                RECORDED TODAY
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.todayCount}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                Filter to today's events
              </div>
            </div>
            <Clock size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Disciplinary Events */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={actionCategory === 'violations'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActionCategory(actionCategory === 'violations' ? 'all' : 'violations');
              setTimeFilter('all');
              setCurrentPage(1);
            }
          }}
          onClick={() => {
            setActionCategory(actionCategory === 'violations' ? 'all' : 'violations');
            setTimeFilter('all');
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: actionCategory === 'violations' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: actionCategory === 'violations' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                DISCIPLINE EVENTS
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.violationEvents}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                Violations & resolutions
              </div>
            </div>
            <ShieldAlert size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>

        {/* Admin Governance */}
        <div
          role="button"
          tabIndex={0}
          aria-pressed={actionCategory === 'users'}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setActionCategory(actionCategory === 'users' ? 'all' : 'users');
              setTimeFilter('all');
              setCurrentPage(1);
            }
          }}
          onClick={() => {
            setActionCategory(actionCategory === 'users' ? 'all' : 'users');
            setTimeFilter('all');
            setCurrentPage(1);
          }}
          style={{
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            padding: '14px 16px',
            border: actionCategory === 'users' ? '2px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
            boxShadow: actionCategory === 'users' ? '0 4px 14px rgba(7, 52, 95, 0.10)' : '0 1px 3px rgba(0,0,0,0.02)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--brand-blue, #07345f)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                USER GOVERNANCE
              </div>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: '4px 0 2px 0', lineHeight: 1.1 }}>
                {stats.userEvents}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
                Faculty & account edits
              </div>
            </div>
            <ShieldCheck size={20} color="var(--brand-blue, #07345f)" strokeWidth={2} style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>

      {/* Main Card with Timeline & Table Switch */}
      <div
        className="audit-log-main-card"
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle, #e2e8f0)',
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
            <div style={{ position: 'relative', flex: 1, minWidth: '240px', maxWidth: '420px' }}>
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
                placeholder="Search user, action, details, audit ID, or IP…"
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
                  type="button"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* View Mode & Category Controls */}
            <div className="activity-log-toolbar-controls" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
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

              <div className="activity-log-sort-controls">
                <CustomSelect
                  value={sortField}
                  onChange={handleSortFieldChange}
                  options={[
                    { value: 'date', label: 'Sort: date' },
                    { value: 'actor', label: 'Sort: actor' },
                    { value: 'action', label: 'Sort: action' },
                    { value: 'role', label: 'Sort: role' }
                  ]}
                />
                <button
                  type="button"
                  className="activity-log-sort-order"
                  onClick={() => {
                    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
                    setCurrentPage(1);
                  }}
                  aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                  title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                >
                  {sortOrder === 'asc' ? <ArrowUp size={15} /> : <ArrowDown size={15} />}
                </button>
              </div>

              {/* View Switch: Timeline vs Table */}
              <div style={{ display: 'flex', background: 'var(--bg-input, #f1f5f9)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle, transparent)' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('timeline')}
                  aria-pressed={viewMode === 'timeline'}
                  style={{
                    background: viewMode === 'timeline' ? 'var(--bg-surface-elevated, #ffffff)' : 'transparent',
                    color: viewMode === 'timeline' ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)',
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
                  aria-pressed={viewMode === 'table'}
                  style={{
                    background: viewMode === 'table' ? 'var(--bg-surface-elevated, #ffffff)' : 'transparent',
                    color: viewMode === 'table' ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)',
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
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted, #64748b)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <Activity size={32} color="var(--brand-blue, #94a3b8)" />
              <span style={{ fontSize: '14px', fontWeight: 500 }}>Loading activity logs...</span>
            </div>
          </div>
        ) : loadError ? (
          <div className="activity-log-empty-state" role="alert">
            <ShieldAlert size={30} />
            <strong>Could not load activity logs</strong>
            <span>{loadError}</span>
            <button type="button" className="page-banner-primary-btn" onClick={() => loadLogs(true)}>
              Try again
            </button>
          </div>
        ) : filteredAndSortedLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted, #64748b)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              {logs.length ? <Search size={32} color="var(--text-muted, #94a3b8)" /> : <ShieldCheck size={36} color="var(--text-muted, #94a3b8)" />}
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary, #1e293b)' }}>
                {logs.length ? 'No matching events' : 'No activity has been recorded yet'}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                {logs.length ? 'Try changing your search or action filter.' : 'Actions recorded in VioTrack will appear here.'}
              </span>
              {logs.length > 0 && (searchTerm || actionCategory !== 'all' || timeFilter !== 'all') && (
                <button type="button" className="activity-log-clear-filters" onClick={() => {
                  setSearchTerm('');
                  setActionCategory('all');
                  setTimeFilter('all');
                  setCurrentPage(1);
                }}>Clear filters</button>
              )}
            </div>
          </div>
        ) : viewMode === 'timeline' ? (
          /* Timeline View */
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {paginatedLogs.map((log) => {
              const badge = getActionBadge(log.action);
              const dateObj = getLogTimestamp(log);
              const auditId = log.audit_id || (log.id ? `Local #${log.id}` : 'ID unavailable');

              return (
                <div
                  className="audit-log-entry"
                  key={log.id}
                  style={{
                    background: 'var(--bg-surface-elevated, #ffffff)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                          {log.user_name || 'System User'}
                        </span>
                        <span
                          className={badge.className}
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '20px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase'
                          }}
                        >
                          {badge.label}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', background: 'var(--bg-input, #f1f5f9)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle, transparent)' }}>
                          {log.user_role || 'Admin'}
                        </span>
                        <span style={{ fontSize: '10.5px', fontFamily: 'monospace', fontWeight: 700, background: 'var(--bg-input, #f8fafc)', color: 'var(--text-muted, #64748b)', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1px 6px', borderRadius: '4px' }}>
                          {auditId}
                        </span>
                        {log.ip_address && (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted, #64748b)', background: 'var(--bg-input, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '1px 6px', borderRadius: '4px' }}>
                            IP: {log.ip_address}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} color="var(--brand-blue, #94a3b8)" />
                          <span>
                            {dateObj
                              ? `${dateObj.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })} at ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Date unavailable'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setInspectLog(log)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            background: 'var(--bg-surface, #ffffff)',
                            color: 'var(--text-primary, #0f172a)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={12} color="var(--brand-blue, #0f172a)" /> Inspect
                        </button>
                      </div>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--text-secondary, #334155)', marginTop: '6px', lineHeight: 1.4 }}>
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
                <tr style={{ background: 'var(--bg-input, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>Audit ID &amp; IP</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>Timestamp</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>User / Actor</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>Action</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>Event Details</th>
                  <th style={{ padding: '14px 18px', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const dateObj = getLogTimestamp(log);
                  const auditId = log.audit_id || (log.id ? `Local #${log.id}` : 'ID unavailable');

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary, #0f172a)', fontSize: '12px' }}>
                          {auditId}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                          {log.ip_address || 'IP not recorded'}
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12.5px', color: 'var(--text-secondary, #475569)', whiteSpace: 'nowrap' }}>
                        {dateObj
                          ? `${dateObj.toLocaleDateString([], { month: 'short', day: '2-digit' })}, ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Date unavailable'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                        {log.user_name || 'System User'}
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                        {log.user_role || 'Admin'}
                      </td>
                      <td style={{ padding: '14px 18px' }}>
                        <span className={badge.className} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: '13px', color: 'var(--text-secondary, #334155)' }}>
                        {log.details || log.description}
                      </td>
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setInspectLog(log)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle, #cbd5e1)',
                            background: 'var(--bg-surface-elevated, #f8fafc)',
                            color: 'var(--text-primary, #0f172a)',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Inspect
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
            borderTop: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '13px',
            color: 'var(--text-muted, #64748b)'
          }}
        >
          <div>
            Showing{' '}
            <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
              {filteredAndSortedLogs.length > 0 ? (visiblePage - 1) * entriesPerPage + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong style={{ color: 'var(--text-primary, #0f172a)' }}>
              {Math.min(visiblePage * entriesPerPage, filteredAndSortedLogs.length)}
            </strong>{' '}
            of <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{filteredAndSortedLogs.length}</strong> events
          </div>

          <div className="pagination-btn-group" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <label className="activity-log-page-size">
              <span>Rows</span>
              <CustomSelect
                value={String(entriesPerPage)}
                onChange={handlePageSizeChange}
                options={[
                  { value: '10', label: '10' },
                  { value: '15', label: '15' },
                  { value: '25', label: '25' },
                  { value: '50', label: '50' }
                ]}
              />
            </label>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
              disabled={visiblePage === 1}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                borderRadius: '6px',
                background: 'var(--bg-surface-elevated, #ffffff)',
                color: visiblePage === 1 ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary, #334155)',
                cursor: visiblePage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: 600
              }}
            >
              Prev
            </button>
            <span className="activity-pagination-current" aria-current="page" style={{ padding: '6px 12px', background: 'var(--brand-blue, #0f172a)', color: '#ffffff', borderRadius: '6px', fontWeight: 700, fontSize: '12px' }}>
              {visiblePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
              disabled={visiblePage === totalPages}
              style={{
                padding: '6px 12px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                borderRadius: '6px',
                background: 'var(--bg-surface-elevated, #ffffff)',
                color: visiblePage === totalPages ? 'var(--text-muted, #94a3b8)' : 'var(--text-secondary, #334155)',
                cursor: visiblePage === totalPages ? 'not-allowed' : 'pointer',
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
        const auditId = inspectLog.audit_id || (inspectLog.id ? `Local #${inspectLog.id}` : 'ID unavailable');
        const ipAddr = inspectLog.ip_address || 'Not recorded';
        const devInfo = inspectLog.device_info || 'Not recorded';
        const imHash = inspectLog.immutable_hash || null;
        const date = getLogTimestamp(inspectLog);
        const timestampIso = date?.toISOString() || 'Date unavailable';
        const formattedDate = date?.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        }) || 'Date unavailable';

        const certificateSummary = [
          '[VIOTRACK ACTIVITY RECORD]',
          `Audit ID: ${auditId}`,
          `Actor: ${inspectLog.user_name || 'System User'} (${inspectLog.user_role || 'Role not recorded'})`,
          `Origin IP: ${ipAddr}`,
          `Device: ${devInfo}`,
          `Action: ${inspectLog.action || 'Action not recorded'}`,
          `Details: ${inspectLog.details || inspectLog.description || 'No details recorded.'}`,
          `Timestamp: ${timestampIso}`,
          imHash ? `Stored integrity value: ${imHash}` : 'Stored integrity value: Not recorded'
        ].join('\n');

        return (
          <div
            className="modal-backdrop-smooth"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(3, 7, 18, 0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div
              className="modal-content-smooth audit-inspector-dialog"
              style={{
                width: '100%',
                maxWidth: '560px',
                background: 'var(--bg-surface, #ffffff)',
                borderRadius: '16px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid var(--border-subtle, #e2e8f0)'
              }}
            >
              {/* Clean Modal Header */}
              <div
                className="audit-inspector-header"
                style={{
                  background: 'var(--bg-surface, #ffffff)',
                  color: 'var(--text-primary, #0f172a)',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-subtle, #f1f5f9)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Activity size={20} className="audit-inspector-shield-icon" style={{ flexShrink: 0, color: 'var(--brand-blue, #0f172a)' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--text-primary, #0f172a)' }}>
                      Audit Event Details
                    </h3>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', display: 'block', marginTop: '1px' }}>
                      Details stored with this activity event
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectLog(null)}
                  className="audit-inspector-close-icon"
                  style={{
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    color: 'var(--text-muted, #64748b)',
                    cursor: 'pointer',
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="audit-inspector-body" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
                {/* Audit ID and stored integrity metadata */}
                <div
                  className="audit-inspector-verified"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Activity size={15} className="audit-inspector-verified-icon" />
                    <span className="audit-inspector-verified-text" style={{ fontWeight: 600, fontSize: '12px' }}>
                      {imHash ? 'Integrity value stored' : 'Activity record'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(auditId, 'auditId')}
                    className="audit-inspector-copy-id"
                    title="Copy Audit ID"
                  >
                    <span>{auditId}</span>
                    {copiedField === 'auditId' ? (
                      <Check size={11} className="audit-inspector-copied-icon" />
                    ) : (
                      <Copy size={11} className="audit-inspector-copy-icon" />
                    )}
                  </button>
                </div>

                {/* Actor and Workstation Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    className="audit-inspector-card"
                    style={{
                      background: 'var(--bg-surface-elevated, #f8fafc)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span className="audit-inspector-label" style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Authorized Actor
                    </span>
                    <strong style={{ color: 'var(--text-primary, #0f172a)', fontSize: '13px', marginTop: '1px' }}>
                      {inspectLog.user_name || 'System Admin'}
                    </strong>
                    <div style={{ marginTop: '2px' }}>
                      <span
                        style={{
                          background: 'var(--bg-input, #e2e8f0)',
                          color: 'var(--text-secondary, #334155)',
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
                    className="audit-inspector-card"
                    style={{
                      background: 'var(--bg-surface-elevated, #f8fafc)',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                  >
                    <span className="audit-inspector-label" style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>
                      Origin IP
                    </span>
                    <strong style={{ color: 'var(--text-primary, #0f172a)', fontFamily: 'monospace', fontSize: '12.5px', marginTop: '1px' }}>
                      {ipAddr}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                      {devInfo}
                    </span>
                  </div>
                </div>

                {/* Action Category & Details */}
                <div
                  className="audit-inspector-card"
                  style={{
                    background: 'var(--bg-surface-elevated, #ffffff)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '12px 14px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="audit-inspector-label" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
                      Action Description
                    </span>
                  </div>
                  <strong style={{ color: 'var(--text-primary, #0f172a)', fontSize: '13.5px', display: 'block', marginBottom: '4px' }}>
                    {inspectLog.action}
                  </strong>
                  <div style={{ color: 'var(--text-secondary, #475569)', fontSize: '12.5px', lineHeight: 1.5 }}>
                    {inspectLog.details || inspectLog.description || 'Action committed.'}
                  </div>
                </div>

                {/* Verification Hash Card */}
                <div
                  className="audit-inspector-card audit-inspector-hash-box"
                  style={{
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span className="audit-inspector-label" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
                      Stored integrity value
                    </span>

                    {imHash && (
                      <button
                        type="button"
                        onClick={() => handleCopy(imHash, 'imHash')}
                        className="audit-inspector-copy-hash"
                      >
                        {copiedField === 'imHash' ? (
                          <>
                            <Check size={11} className="audit-inspector-copied-icon" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} className="audit-inspector-copy-icon" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div
                    className="audit-inspector-hash-val"
                    style={{
                      color: 'var(--text-primary, #0f172a)',
                      fontFamily: 'monospace',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      wordBreak: 'break-all'
                    }}
                  >
                    {imHash || 'No integrity value was stored for this event.'}
                  </div>

                  <div
                    className="audit-inspector-time-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      marginTop: '6px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-subtle, #e2e8f0)',
                      fontSize: '11px',
                      color: 'var(--text-muted, #64748b)'
                    }}
                  >
                    <Clock size={11} />
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className="audit-inspector-dialog-footer"
                style={{
                  background: 'var(--bg-surface-elevated, #f8fafc)',
                  borderTop: '1px solid var(--border-subtle, #f1f5f9)',
                  padding: '12px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCopy(certificateSummary, 'summary')}
                  className="audit-inspector-copy-summary"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface, #ffffff)',
                    color: 'var(--text-primary, #334155)',
                    border: '1px solid var(--border-medium, #cbd5e1)',
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
                      <Check size={12} className="audit-inspector-copied-icon" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} className="audit-inspector-copy-icon" />
                      <span>Copy Summary</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setInspectLog(null)}
                  className="audit-inspector-close-footer"
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
