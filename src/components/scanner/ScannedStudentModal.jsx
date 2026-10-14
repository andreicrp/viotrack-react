import React, { useState, useRef, useCallback } from 'react';
import {
  UserCheck,
  X,
  Check,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Phone,
  PlusCircle,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { StudentInitialsAvatar } from '../students/StudentInitialsAvatar';

export const ScannedStudentModal = ({
  scannedStudent,
  studentRecords = [],
  onClose,
  onLogViolation,
  onViewFullProfile
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

  // Touch gesture to swipe down to dismiss bottom sheet on mobile
  const handleTouchStart = useCallback((e) => {
    if (typeof window === 'undefined' || window.innerWidth > 768) return;
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0) {
      setDragOffset(diff);
    } else {
      setDragOffset(0);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = currentYRef.current - startYRef.current;
    if (diff > 110) {
      onClose();
    }
    setDragOffset(0);
  }, [isDragging, onClose]);

  if (!scannedStudent) return null;

  const dragStyle = dragOffset > 0 ? {
    transform: `translate3d(0, ${dragOffset}px, 0)`,
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  } : {};

  return (
    <div className="student-scan-modal-overlay" onClick={onClose}>
      <div
        className="student-scan-modal-dialog"
        style={dragStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator Handle */}
        <div
          className="modal-drag-handle-wrap"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="Drag down to close"
        >
          <div className="modal-drag-handle" />
        </div>

        <div
          className="student-scan-modal-header"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="student-scan-modal-title-group">
            <div className="modal-header-icon-badge">
              <UserCheck size={18} />
            </div>
            <div>
              <h3 className="student-scan-modal-title">Student Identified</h3>
              <p className="student-scan-modal-subtitle">Official Student Conduct Summary</p>
            </div>
          </div>
          <button
            type="button"
            className="student-scan-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={17} />
          </button>
        </div>

        <div className="student-scan-modal-body">
          {/* Unified Student Hero Card */}
          <div className="verified-header-card">
            <div className="verified-hero-main">
              <div className="verified-avatar-wrapper">
                <StudentInitialsAvatar
                  student={scannedStudent}
                  size={72}
                  className="verified-avatar"
                />
                <div className="verified-avatar-badge" title="Identity Verified">
                  <Check size={10} strokeWidth={3} />
                </div>
              </div>

              <div className="verified-meta">
                <div className="verified-name-row">
                  <h2 className="verified-name">
                    {scannedStudent.fname} {scannedStudent.mname ? `${scannedStudent.mname[0]}. ` : ''}{scannedStudent.lname}
                  </h2>
                  {scannedStudent._isSignedBadge && (
                    <span
                      className="authentic-signed-badge"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#059669',
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '2px 8px',
                        borderRadius: '12px'
                      }}
                      title="Tamper-proof cryptographic signature verified"
                    >
                      <Check size={11} strokeWidth={3} /> Signed Badge
                    </span>
                  )}
                  {/* Integrated Status Pill */}
                  {studentRecords.length >= 3 ? (
                    <span className="status-flag-pill danger">
                      <ShieldAlert size={12} /> High Priority
                    </span>
                  ) : studentRecords.length > 0 ? (
                    <span className="status-flag-pill warning">
                      <AlertTriangle size={12} /> Active Records
                    </span>
                  ) : (
                    <span className="status-flag-pill success">
                      <CheckCircle2 size={12} /> Clean Standing
                    </span>
                  )}
                </div>

                <div className="verified-details-row">
                  <span className="verified-section-tag">
                    {scannedStudent.grade} – {scannedStudent.section}
                  </span>
                  <span className="verified-dot">•</span>
                  <span className="lrn-chip" title="Learner Reference Number">
                    ID: {scannedStudent.student_id}
                  </span>
                  {scannedStudent.academicyear && (
                    <>
                      <span className="verified-dot">•</span>
                      <span className="sy-text">S.Y. {scannedStudent.academicyear}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Integrated Guardian Sub-Bar */}
            {scannedStudent.parent_name && (
              <div className="verified-guardian-strip">
                <span className="guardian-strip-label">Guardian:</span>
                <span className="guardian-strip-name">{scannedStudent.parent_name}</span>
                {scannedStudent.parent_contact && (
                  <a href={`tel:${scannedStudent.parent_contact}`} className="guardian-strip-phone" title="Call Guardian">
                    <Phone size={11} />
                    <span>{scannedStudent.parent_contact}</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Streamlined Stats Strip */}
          <div className="student-stats-strip">
            <div className={`stat-strip-item ${studentRecords.length > 0 ? (studentRecords.length >= 3 ? 'danger' : 'warning') : 'success'}`}>
              <span className="stat-strip-num">{studentRecords.length}</span>
              <span className="stat-strip-label">Total Infractions</span>
            </div>

            <div className="stat-strip-divider" />

            <div className="stat-strip-item warning">
              <span className="stat-strip-num">{studentRecords.filter(r => r.status === 'Pending').length}</span>
              <span className="stat-strip-label">Pending Action</span>
            </div>

            <div className="stat-strip-divider" />

            <div className="stat-strip-item success">
              <span className="stat-strip-num">{studentRecords.filter(r => r.status === 'Resolved').length}</span>
              <span className="stat-strip-label">Resolved</span>
            </div>
          </div>

          {/* Recent Violations Section */}
          <div className="recent-violations-wrap">
            <div className="recent-violations-title">
              <span>Recent Violation History</span>
              <span className="history-count-badge">{studentRecords.length} {studentRecords.length === 1 ? 'record' : 'records'}</span>
            </div>

            {studentRecords.length === 0 ? (
              <div className="clean-standing-box">
                <CheckCircle2 size={16} className="clean-standing-icon" />
                <span>Clean disciplinary standing — no active infractions logged.</span>
              </div>
            ) : (
              <div className="violations-timeline-list">
                {studentRecords.map(r => {
                  const vType = (r.violation?.type || 'Minor').toLowerCase();
                  const severityClass = vType === 'major' ? 'severity-major' : vType === 'serious' ? 'severity-serious' : 'severity-minor';
                  return (
                    <div key={r.id} className="violation-timeline-item">
                      <div className="violation-item-main">
                        <span className="v-item-title">{r.violation?.title || r.title || 'Violation Incident'}</span>
                        <div className="v-item-meta">
                          <span className="v-item-date">
                            {r.date_reported ? new Date(r.date_reported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                          </span>
                          <span className="v-item-dot">•</span>
                          <span className={`v-severity-pill ${severityClass}`}>
                            {r.violation?.type || 'Minor'}
                          </span>
                        </div>
                      </div>
                      <span className={`v-status-badge ${(r.status || 'pending').toLowerCase()}`}>
                        {r.status || 'Pending'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="student-scan-modal-footer">
          <div className="footer-actions-row">
            <button
              type="button"
              className="verified-btn primary"
              onClick={onLogViolation}
            >
              <PlusCircle size={15} />
              <span>Log Violation</span>
            </button>

            <button
              type="button"
              className="verified-btn secondary"
              onClick={onViewFullProfile}
            >
              <FileSpreadsheet size={15} />
              <span>Full Profile</span>
            </button>
          </div>

          <button
            type="button"
            className="verified-btn tertiary"
            onClick={onClose}
            title="Scan next badge"
          >
            <RefreshCw size={13} />
            <span>Scan Next Badge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
