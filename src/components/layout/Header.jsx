import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  LogOut,
  Shield,
  GraduationCap,
  Menu,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lock,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { BackupRestoreModal } from '../common/BackupRestoreModal';

export const Header = ({ onToggleSidebar }) => {
  const { user, logout, lockScreen } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // Helper to check if a record is Under Approval
  const resolveApprovalStatus = (r) => {
    if (r.status === 'Under Approval' || r.approval_status === 'Under Approval') return 'Under Approval';
    if (r.status === 'Rejected' || r.approval_status === 'Rejected') return 'Rejected';
    if (r.reported_by_type === 'teacher' && !r.approved_by && r.status !== 'Resolved') return 'Under Approval';
    if (r.approval_status === 'Approved' || r.status === 'Approved') return 'Approved';
    return r.approval_status || 'Approved';
  };

  const loadPendingApprovals = useCallback(async () => {
    try {
      const allRecords = await dataService.getRecords();
      const pending = (allRecords || []).filter(r => resolveApprovalStatus(r) === 'Under Approval');
      setPendingApprovals(pending);
    } catch (err) {
      console.error('Failed to load pending approvals for notifications:', err);
    }
  }, []);

  useEffect(() => {
    loadPendingApprovals();

    const handleDataUpdate = () => {
      loadPendingApprovals();
    };

    window.addEventListener('viotrack_data_updated', handleDataUpdate);
    window.addEventListener('viotrack_activity_logged', handleDataUpdate);

    return () => {
      window.removeEventListener('viotrack_data_updated', handleDataUpdate);
      window.removeEventListener('viotrack_activity_logged', handleDataUpdate);
    };
  }, [loadPendingApprovals]);

  // Relative time helper
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Recently';
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
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    };
    if (showDropdown || showNotifDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown, showNotifDropdown]);

  const handleGoProfile = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login?logged_out=1');
    setShowDropdown(false);
  };

  const handleNavigateToApproval = () => {
    setShowNotifDropdown(false);
    navigate('/for-approval');
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <button
          className="menu-toggle"
          id="menuToggle"
          type="button"
          aria-label="Toggle navigation menu"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>

        <a
          href="/"
          className="logo"
          draggable={false}
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <div className="logo-icon" draggable={false}>
            <img src="/images/phcm-logo.png" alt="VioTrack Logo" draggable={false} />
          </div>
          <span className="logo-text" draggable={false}>VIOTRACK</span>
        </a>
        <a
          href="/"
          className="logo-text-mobile"
          draggable={false}
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          VIOTRACK
        </a>
      </div>

      <div className="header-right" draggable={false}>
        {/* Notification Bell next to profile */}
        <div className="header-notif-wrap" ref={notifRef} draggable={false}>
          <button
            type="button"
            className={`header-notif-icon-btn ${showNotifDropdown ? 'active' : ''}`}
            onClick={() => {
              setShowNotifDropdown(prev => !prev);
              setShowDropdown(false);
            }}
            aria-label="Notifications"
            aria-expanded={showNotifDropdown}
            title={pendingApprovals.length > 0 ? `${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? 's' : ''}` : 'Notifications'}
          >
            <Bell size={20} className="header-notif-bell-icon" />
            {pendingApprovals.length > 0 && (
              <span className="header-notif-badge">
                {pendingApprovals.length > 99 ? '99+' : pendingApprovals.length}
                <span className="header-notif-pulse" />
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="header-notif-dropdown" role="dialog" aria-label="Pending Approvals Notifications">
              <div className="header-notif-dropdown-header">
                <div className="header-notif-dropdown-title-group">
                  <span className="header-notif-dropdown-title">To Be Approved</span>
                  {pendingApprovals.length > 0 && (
                    <span className="header-notif-count-pill">{pendingApprovals.length} Pending</span>
                  )}
                </div>
                <button
                  type="button"
                  className="header-notif-view-all-link"
                  onClick={handleNavigateToApproval}
                >
                  View All
                </button>
              </div>

              <div className="header-notif-dropdown-list">
                {pendingApprovals.length === 0 ? (
                  <div className="header-notif-empty">
                    <div className="header-notif-empty-icon">
                      <CheckCircle2 size={32} color="#10b981" />
                    </div>
                    <div className="header-notif-empty-title">All Caught Up!</div>
                    <div className="header-notif-empty-sub">There are no violation reports awaiting approval at this time.</div>
                  </div>
                ) : (
                  pendingApprovals.slice(0, 5).map((rec) => {
                    const studentObj = rec.student || rec.students || {};
                    const studentName = (studentObj.fname && studentObj.lname)
                      ? `${studentObj.fname} ${studentObj.lname}`
                      : (studentObj.name || studentObj.full_name || rec.student_name || `Student #${rec.student_id || ''}`);
                    const violationObj = rec.violation || rec.violations || {};
                    const violationTitle = violationObj.name || violationObj.violation_name || rec.offense || 'Violation Report';
                    const severity = violationObj.severity || violationObj.type || rec.severity || 'Minor';
                    const reporter = rec.reported_by || 'Teacher';
                    const timeAgo = formatTimeAgo(rec.created_at || rec.date || rec.timestamp);
                    const avatarUrl = studentObj.image ||
                      studentObj.avatar ||
                      studentObj.photo_url ||
                      studentObj.photo ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=100&bold=true`;

                    return (
                      <div
                        key={rec.id}
                        className="header-notif-item"
                        onClick={handleNavigateToApproval}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleNavigateToApproval();
                          }
                        }}
                      >
                        <div className="header-notif-avatar-col">
                          <img
                            src={avatarUrl}
                            alt={studentName}
                            className="header-notif-student-avatar"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName)}&background=07345f&color=fff&size=100&bold=true`;
                            }}
                          />
                          <span className="header-notif-pending-indicator" />
                        </div>
                        <div className="header-notif-info-col">
                          <div className="header-notif-item-top">
                            <span className="header-notif-student-name">{studentName}</span>
                            <span className="header-notif-time">
                              <Clock size={11} style={{ marginRight: 3, verticalAlign: -1 }} />
                              {timeAgo}
                            </span>
                          </div>
                          <div className="header-notif-violation-title">{violationTitle}</div>
                          <div className="header-notif-item-meta">
                            <span className={`header-notif-severity-badge severity-${severity.toLowerCase()}`}>
                              {severity}
                            </span>
                            <span className="header-notif-reporter">By: {reporter}</span>
                          </div>
                        </div>
                        <div className="header-notif-arrow">
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="header-notif-dropdown-footer">
                <button
                  type="button"
                  className="header-notif-footer-btn"
                  onClick={handleNavigateToApproval}
                >
                  <span>Go to To Approve Page</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modern User Profile Menu */}
        <div className="header-user-menu-wrap" ref={dropdownRef} draggable={false}>
          <button
            type="button"
            className="header-user-avatar-btn"
            onClick={() => {
              setShowDropdown(prev => !prev);
              setShowNotifDropdown(false);
            }}
            aria-label="Open User Menu"
            aria-expanded={showDropdown}
            draggable={false}
          >
            <div className="header-avatar-ring" draggable={false}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name || 'User'}
                className="header-avatar-img"
                draggable={false}
              />
              <span className="header-online-dot" />
            </div>
          </button>

          {showDropdown && (
            <div className="header-user-dropdown" role="menu" draggable={false}>
              <div className="user-dropdown-header" draggable={false}>
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user?.name || 'User'}
                  className="user-dropdown-avatar"
                  draggable={false}
                />
                <div className="user-dropdown-meta" draggable={false}>
                  <div className="user-dropdown-name" draggable={false}>{user?.name || 'Sheryl Gamboa'}</div>
                  <span className="user-dropdown-role-chip" draggable={false}>
                    {isAdmin ? <Shield size={11} /> : <GraduationCap size={11} />}
                    {isAdmin ? 'Administrator' : 'Teacher'}
                  </span>
                </div>
              </div>

              <div className="user-dropdown-list">
                <button
                  type="button"
                  className="user-dropdown-btn"
                  onClick={handleGoProfile}
                  role="menuitem"
                >
                  <User size={16} className="user-dropdown-icon" />
                  <span className="user-dropdown-btn-label">My Profile</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    className="user-dropdown-btn"
                    onClick={() => {
                      setIsBackupModalOpen(true);
                      setShowDropdown(false);
                    }}
                    role="menuitem"
                  >
                    <Database size={16} className="user-dropdown-icon" />
                    <span className="user-dropdown-btn-label">Database Backups</span>
                  </button>
                )}

                <button
                  type="button"
                  className="user-dropdown-btn"
                  onClick={() => {
                    lockScreen();
                    setShowDropdown(false);
                  }}
                  role="menuitem"
                >
                  <Lock size={16} className="user-dropdown-icon" />
                  <span className="user-dropdown-btn-label">Lock Screen</span>
                </button>

                <div className="user-dropdown-divider" />

                <button
                  type="button"
                  className="user-dropdown-btn logout-btn"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <LogOut size={16} className="user-dropdown-icon logout-icon" />
                  <span className="user-dropdown-btn-label">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Database Backup & Restore Modal */}
      {isBackupModalOpen && (
        <BackupRestoreModal
          isOpen={isBackupModalOpen}
          onClose={() => setIsBackupModalOpen(false)}
        />
      )}
    </header>
  );
};
