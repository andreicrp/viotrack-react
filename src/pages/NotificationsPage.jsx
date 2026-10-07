import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ShieldAlert,
  MessageSquare,
  AlertTriangle,
  Info,
  Calendar,
  ChevronRight,
  Trash2,
  Eye,
  Check,
  X,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  SlidersHorizontal,
  User
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { SkeletonList } from '../components/common/SkeletonLoader';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import '../css/notifications.css';

export const NotificationsPage = () => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();
  const navigate = useNavigate();

  // Keyboard navigation shortcuts
  useKeyboardShortcuts();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'approvals' | 'sms' | 'conduct' | 'system'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('viotrack_read_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [dismissedNotifIds, setDismissedNotifIds] = useState(() => {
    try {
      const saved = localStorage.getItem('viotrack_dismissed_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [rawRecords, setRawRecords] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Load live data from dataService
  const loadNotificationsData = useCallback(async (showToast = false) => {
    try {
      if (showToast) setIsRefreshing(true);
      const [recordsData, logsData, eventsData] = await Promise.all([
        dataService.getRecords().catch(() => []),
        dataService.getActivityLogs().catch(() => []),
        dataService.getSchoolEvents().catch(() => [])
      ]);

      setRawRecords(recordsData || []);
      setActivityLogs(logsData || []);
      setSchoolEvents(eventsData || []);

      if (showToast) {
        success('Notification feed synchronized.');
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      if (showToast) error('Could not refresh notifications feed.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [success, error]);

  useEffect(() => {
    loadNotificationsData();

    const handleDataUpdate = () => loadNotificationsData();
    window.addEventListener('viotrack_data_updated', handleDataUpdate);
    window.addEventListener('viotrack_activity_logged', handleDataUpdate);

    return () => {
      window.removeEventListener('viotrack_data_updated', handleDataUpdate);
      window.removeEventListener('viotrack_activity_logged', handleDataUpdate);
    };
  }, [loadNotificationsData]);

  // Persist read/dismissed IDs
  useEffect(() => {
    try {
      localStorage.setItem('viotrack_read_notif_ids', JSON.stringify(readNotifIds));
    } catch {}
  }, [readNotifIds]);

  useEffect(() => {
    try {
      localStorage.setItem('viotrack_dismissed_notif_ids', JSON.stringify(dismissedNotifIds));
    } catch {}
  }, [dismissedNotifIds]);

  // Transform raw data into structured notifications
  const allNotifications = useMemo(() => {
    const list = [];

    // 1. Pending Approvals & Violation Reports
    (rawRecords || []).forEach(rec => {
      const student = rec.student || rec.students || {};
      const studentName = (student.fname && student.lname)
        ? `${student.fname} ${student.lname}`
        : (student.name || student.full_name || rec.student_name || 'Student');
      const violation = rec.violation || rec.violations || {};
      const violationTitle = violation.name || violation.violation_name || rec.offense || 'Violation Report';
      const severity = (violation.severity || violation.type || rec.severity || 'Minor').toLowerCase();
      const isUnderApproval = rec.approval_status === 'Under Approval' || rec.status === 'Under Approval' || (rec.reported_by_type === 'teacher' && !rec.approved_by && rec.status !== 'Resolved');

      const dateVal = rec.created_at || rec.date_reported || rec.date || rec.timestamp || new Date().toISOString();

      if (isUnderApproval) {
        list.push({
          id: `approval-${rec.id}`,
          sourceId: rec.id,
          type: 'approval',
          category: 'approvals',
          title: `Pending Approval: ${violationTitle}`,
          message: `${studentName} was reported by ${rec.reported_by || 'Faculty'} for "${violationTitle}". Review and approve disciplinary action.`,
          severity: severity === 'major' ? 'high' : severity === 'serious' ? 'medium' : 'normal',
          timestamp: dateVal,
          studentName,
          studentId: rec.student_id,
          studentPhoto: student.photo || student.image || student.avatar,
          grade: student.grade || rec.grade,
          section: student.section || rec.section,
          actionUrl: '/for-approval',
          actionText: 'Review Approval',
          canApprove: isAdmin
        });
      } else if (severity === 'major' || severity === 'serious') {
        list.push({
          id: `conduct-${rec.id}`,
          sourceId: rec.id,
          type: 'conduct',
          category: 'conduct',
          title: `${severity === 'major' ? 'Major Offense' : 'Serious Offense'}: ${violationTitle}`,
          message: `${studentName} received a ${severity} infraction report for "${violationTitle}". Sanction: ${rec.sanction || 'Pending Review'}.`,
          severity: severity === 'major' ? 'high' : 'medium',
          timestamp: dateVal,
          studentName,
          studentId: rec.student_id,
          studentPhoto: student.photo || student.image || student.avatar,
          grade: student.grade || rec.grade,
          section: student.section || rec.section,
          actionUrl: `/student-violation/${rec.student_id}`,
          actionText: 'View Case'
        });
      }

      // Check if Parent SMS was recorded
      if (rec.sms_status || rec.parent_notified) {
        list.push({
          id: `sms-${rec.id}`,
          sourceId: rec.id,
          type: 'sms',
          category: 'sms',
          title: `Parent SMS Notification Dispatched`,
          message: `SMS sent to parent/guardian of ${studentName} regarding "${violationTitle}". Status: ${rec.sms_status || 'Delivered'}.`,
          severity: 'normal',
          timestamp: dateVal,
          studentName,
          studentId: rec.student_id,
          studentPhoto: student.photo || student.image || student.avatar,
          actionUrl: `/student-violation/${rec.student_id}`,
          actionText: 'View SMS Log'
        });
      }
    });

    // 2. Activity Logs & System Events
    (activityLogs || []).slice(0, 30).forEach(log => {
      const action = (log.action || '').toLowerCase();
      const isSystemNotice = action.includes('backup') || action.includes('security') || action.includes('login') || action.includes('import');

      if (isSystemNotice) {
        list.push({
          id: `log-${log.id}`,
          sourceId: log.id,
          type: 'system',
          category: 'system',
          title: log.action || 'System Security Event',
          message: log.details || log.description || `Performed by ${log.performed_by || log.user_name || 'System'}`,
          severity: 'normal',
          timestamp: log.created_at || log.timestamp || new Date().toISOString(),
          actionUrl: '/activity-logs',
          actionText: 'View Audit Logs'
        });
      }
    });

    // Filter out dismissed notifications
    const active = list.filter(item => !dismissedNotifIds.includes(item.id));

    // Sort by newest first
    return active.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [rawRecords, activityLogs, dismissedNotifIds, isAdmin]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const unreadCount = allNotifications.filter(n => !readNotifIds.includes(n.id)).length;
    const approvalsCount = allNotifications.filter(n => n.category === 'approvals').length;
    const smsCount = allNotifications.filter(n => n.category === 'sms').length;
    const conductCount = allNotifications.filter(n => n.category === 'conduct').length;
    const systemCount = allNotifications.filter(n => n.category === 'system').length;

    return {
      all: allNotifications.length,
      unread: unreadCount,
      approvals: approvalsCount,
      sms: smsCount,
      conduct: conductCount,
      system: systemCount
    };
  }, [allNotifications, readNotifIds]);

  // Filtered Notifications based on Active Tab, Search, and Unread Toggle
  const filteredNotifications = useMemo(() => {
    return allNotifications.filter(item => {
      // Category Tab Filter
      if (activeTab !== 'all' && item.category !== activeTab) {
        return false;
      }

      // Unread Toggle
      const isRead = readNotifIds.includes(item.id);
      if (filterUnreadOnly && isRead) {
        return false;
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = (item.title || '').toLowerCase().includes(query);
        const matchesMessage = (item.message || '').toLowerCase().includes(query);
        const matchesStudent = (item.studentName || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesMessage && !matchesStudent) return false;
      }

      return true;
    });
  }, [allNotifications, activeTab, filterUnreadOnly, searchQuery, readNotifIds]);

  // Helper actions
  const markAsRead = (id) => {
    if (!readNotifIds.includes(id)) {
      setReadNotifIds(prev => [...prev, id]);
    }
  };

  const markAllAsRead = () => {
    const allIds = allNotifications.map(n => n.id);
    setReadNotifIds(allIds);
    success('All notifications marked as read.');
  };

  const dismissNotification = (id) => {
    setDismissedNotifIds(prev => [...prev, id]);
    info('Notification dismissed.');
  };

  const clearAllNotifications = () => {
    if (window.confirm('Dismiss all visible notifications from your feed?')) {
      const allIds = allNotifications.map(n => n.id);
      setDismissedNotifIds(allIds);
      success('Notification feed cleared.');
    }
  };

  // Relative Time Helper
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  const getNotificationIcon = (type, severity) => {
    if (type === 'approval') {
      return (
        <div className="notif-type-icon approval">
          <Clock size={16} strokeWidth={2.4} />
        </div>
      );
    }
    if (type === 'sms') {
      return (
        <div className="notif-type-icon sms">
          <MessageSquare size={16} strokeWidth={2.4} />
        </div>
      );
    }
    if (type === 'conduct') {
      return (
        <div className={`notif-type-icon conduct ${severity === 'high' ? 'danger' : 'warning'}`}>
          <ShieldAlert size={16} strokeWidth={2.4} />
        </div>
      );
    }
    return (
      <div className="notif-type-icon system">
        <Info size={16} strokeWidth={2.4} />
      </div>
    );
  };

  return (
    <div className="notifications-page-root">
      {/* 1. Header Section */}
      <div className="dash-top-header notif-greeting-header">
        <div className="dash-top-row-main">
          {/* Notifications Title & Summary */}
          <div className="dash-greeting-area">
            <div className="dash-greeting-title-line">
              <h1 className="dash-greeting-title">
                Notifications
              </h1>
              {/* Refresh indicator */}
              <button
                type="button"
                className={`dash-refresh-indicator notif-refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                onClick={() => loadNotificationsData(true)}
                title="Click to refresh notifications"
              >
                <RefreshCw size={13} strokeWidth={2.4} />
              </button>
            </div>
            {/* Notification-specific summary sentence */}
            <p className="dash-greeting-subtitle">
              {tabCounts.unread === 0 && tabCounts.approvals === 0
                ? 'All caught up — you have no unread notifications or pending actions.'
                : `You have ${tabCounts.unread > 0 ? `${tabCounts.unread} unread alert${tabCounts.unread !== 1 ? 's' : ''}` : 'no unread alerts'}${tabCounts.approvals > 0 ? ` and ${tabCounts.approvals} pending approval${tabCounts.approvals !== 1 ? 's' : ''}` : ''}.`
              }
            </p>
          </div>

          {/* Top Right Controls */}
          <div className="dash-top-actions-right">
            {tabCounts.unread > 0 && (
              <button
                type="button"
                className="dash-export-pdf-btn"
                onClick={markAllAsRead}
                title="Mark all notifications as read"
              >
                <CheckCheck size={14} strokeWidth={2.4} />
                <span>Mark All Read</span>
              </button>
            )}

            {allNotifications.length > 0 && (
              <button
                type="button"
                className="dash-export-pdf-btn"
                onClick={clearAllNotifications}
                title="Clear all notifications"
              >
                <Trash2 size={13} strokeWidth={2.4} />
                <span>Clear Feed</span>
              </button>
            )}

            {isAdmin && tabCounts.approvals > 0 && (
              <button
                type="button"
                className="dash-log-violation-btn"
                onClick={() => navigate('/for-approval')}
                title="Review pending approvals"
              >
                <Clock size={14} strokeWidth={2.4} />
                <span>Review Approvals</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Content & Insights Layout Grid */}
      <div className="notif-page-layout-grid">
        {/* Left / Main Column: Controls + Feed */}
        <div className="notif-main-col">
          {/* Controls & Filter Bar */}
          <div className="notif-controls-bar">
            {/* Category Tabs */}
            <div className="notif-category-tabs">
              {[
                { id: 'all', label: 'All Alerts', count: tabCounts.all },
                { id: 'approvals', label: 'Pending Approvals', count: tabCounts.approvals },
                { id: 'conduct', label: 'Conduct & Infractions', count: tabCounts.conduct },
                { id: 'sms', label: 'Parent SMS', count: tabCounts.sms },
                { id: 'system', label: 'System & Security', count: tabCounts.system }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`notif-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span className="notif-tab-badge">{tab.count}</span>
                </button>
              ))}
            </div>

            {/* Search & Toggle Filters */}
            <div className="notif-search-and-toggles">
              <div className="notif-search-box">
                <Search size={15} className="notif-search-icon" />
                <input
                  type="text"
                  placeholder="Search alerts or students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="notif-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="notif-search-clear"
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <label className="notif-unread-toggle-label">
                <input
                  type="checkbox"
                  checked={filterUnreadOnly}
                  onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                  className="notif-unread-checkbox"
                />
                <span>Unread only</span>
              </label>
            </div>
          </div>

          {/* Notifications Feed List */}
          <div className="notif-list-container">
            {loading ? (
              <div style={{ padding: '8px 0' }}>
                <SkeletonList items={5} />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <div className="notif-empty-icon-wrap">
                  <CheckCircle2 size={36} color="#10b981" />
                </div>
                <h3 className="notif-empty-title">You're All Caught Up!</h3>
                <p className="notif-empty-desc">
                  {searchQuery
                    ? `No notifications matched your search "${searchQuery}".`
                    : filterUnreadOnly
                    ? 'No unread notifications at this time.'
                    : 'There are no notifications in this category right now.'}
                </p>
                {(searchQuery || filterUnreadOnly) && (
                  <button
                    type="button"
                    className="notif-empty-reset-btn"
                    onClick={() => { setSearchQuery(''); setFilterUnreadOnly(false); }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="notif-cards-stack">
                {filteredNotifications.map((notif) => {
                  const isRead = readNotifIds.includes(notif.id);
                  const gradeText = notif.grade
                    ? `${String(notif.grade).toLowerCase().startsWith('grade') ? notif.grade : `Grade ${notif.grade}`}${notif.section ? ` – ${notif.section}` : ''}`
                    : null;

                  return (
                    <div
                      key={notif.id}
                      className={`notif-card-item ${isRead ? 'read' : 'unread'} ${notif.severity === 'high' ? 'severity-high' : ''}`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      {/* Left: Avatar or Type Icon */}
                      <div className="notif-card-avatar-box">
                        {notif.studentPhoto ? (
                          <img
                            src={notif.studentPhoto}
                            alt={notif.studentName || 'Student'}
                            className="notif-student-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement.innerHTML = '<span class="notif-avatar-fallback"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>';
                            }}
                          />
                        ) : (
                          getNotificationIcon(notif.type, notif.severity)
                        )}
                      </div>

                      {/* Middle: Content Info */}
                      <div className="notif-card-body">
                        <div className="notif-header-line">
                          <div className="notif-title-wrap">
                            {!isRead && <span className="notif-dot-unread" title="Unread" />}
                            <span className="notif-card-title">{notif.title}</span>
                            {gradeText && <span className="notif-pill grade">{gradeText}</span>}
                          </div>
                          <span className="notif-time-tag">
                            <Clock size={11} />
                            {formatTimeAgo(notif.timestamp)}
                          </span>
                        </div>

                        <p className="notif-card-message">{notif.message}</p>
                      </div>

                      {/* Right: Actions */}
                      <div className="notif-card-actions" onClick={(e) => e.stopPropagation()}>
                        {notif.actionUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              markAsRead(notif.id);
                              navigate(notif.actionUrl);
                            }}
                            className="notif-action-btn primary"
                            title={notif.actionText}
                          >
                            <span>{notif.actionText}</span>
                            <ArrowUpRight size={12} />
                          </button>
                        )}

                        {!isRead && (
                          <button
                            type="button"
                            onClick={() => markAsRead(notif.id)}
                            className="notif-icon-btn check"
                            title="Mark as Read"
                          >
                            <Check size={13} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => dismissNotification(notif.id)}
                          className="notif-icon-btn dismiss"
                          title="Dismiss"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Insights & Quick Actions Sidebar */}
        <aside className="notif-side-panel">
          {/* Priority Breakdown Card */}
          <div className="notif-side-card">
            <h4 className="notif-side-title">
              <ShieldAlert size={15} color="#0f172a" />
              <span>Alert Breakdown</span>
            </h4>
            <div className="notif-breakdown-list">
              <div className="notif-breakdown-row" onClick={() => setActiveTab('approvals')}>
                <div className="notif-breakdown-label-wrap">
                  <span className="notif-dot-bullet amber" />
                  <span className="notif-breakdown-name">Pending Approvals</span>
                </div>
                <span className="notif-breakdown-badge amber">{tabCounts.approvals}</span>
              </div>

              <div className="notif-breakdown-row" onClick={() => setActiveTab('conduct')}>
                <div className="notif-breakdown-label-wrap">
                  <span className="notif-dot-bullet red" />
                  <span className="notif-breakdown-name">Conduct & Infractions</span>
                </div>
                <span className="notif-breakdown-badge red">{tabCounts.conduct}</span>
              </div>

              <div className="notif-breakdown-row" onClick={() => setActiveTab('sms')}>
                <div className="notif-breakdown-label-wrap">
                  <span className="notif-dot-bullet blue" />
                  <span className="notif-breakdown-name">Parent SMS Logs</span>
                </div>
                <span className="notif-breakdown-badge blue">{tabCounts.sms}</span>
              </div>

              <div className="notif-breakdown-row" onClick={() => setActiveTab('system')}>
                <div className="notif-breakdown-label-wrap">
                  <span className="notif-dot-bullet slate" />
                  <span className="notif-breakdown-name">System & Security</span>
                </div>
                <span className="notif-breakdown-badge slate">{tabCounts.system}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="notif-side-card">
            <h4 className="notif-side-title">
              <Sparkles size={15} color="#0f172a" />
              <span>Quick Navigation</span>
            </h4>
            <div className="notif-shortcuts-list">
              {isAdmin && (
                <button
                  type="button"
                  className="notif-shortcut-btn"
                  onClick={() => navigate('/for-approval')}
                >
                  <div className="notif-shortcut-left">
                    <Clock size={14} className="notif-shortcut-icon amber" />
                    <span>Review Approvals</span>
                  </div>
                  <ChevronRight size={14} className="notif-shortcut-arrow" />
                </button>
              )}
              <button
                type="button"
                className="notif-shortcut-btn"
                onClick={() => navigate('/violations')}
              >
                <div className="notif-shortcut-left">
                  <ShieldAlert size={14} className="notif-shortcut-icon red" />
                  <span>Student Infractions</span>
                </div>
                <ChevronRight size={14} className="notif-shortcut-arrow" />
              </button>
              <button
                type="button"
                className="notif-shortcut-btn"
                onClick={() => navigate('/activity-logs')}
              >
                <div className="notif-shortcut-left">
                  <Info size={14} className="notif-shortcut-icon blue" />
                  <span>Activity Audit Log</span>
                </div>
                <ChevronRight size={14} className="notif-shortcut-arrow" />
              </button>
            </div>
          </div>

          {/* Real-time sync status card */}
          <div className="notif-side-card subtle">
            <div className="notif-sync-status-row">
              <span className="notif-sync-live-dot" />
              <span className="notif-sync-live-text">Real-time Stream Connected</span>
            </div>
            <p className="notif-sync-live-desc">
              Automatic listeners are active. Disciplinary alerts and approval requests sync instantly across sessions.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
export default NotificationsPage;
