import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User,
  IdCard,
  GraduationCap,
  Mail,
  Users,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import '../../css/student-modal.css';

export const ViewStudentModal = ({ isOpen, onClose, student }) => {
  const navigate = useNavigate();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const handleProfileAndRecord = () => {
    onClose();
    navigate(`/student-violation/${student.id}`);
  };

  const handleTrackLocation = () => {
    onClose();
    navigate(`/track-location?student_id=${student.id}`);
  };

  const fullName = `${student.fname} ${student.mname ? student.mname + ' ' : ''}${student.lname}`;
  const avatarUrl = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=07345f&color=fff&size=200&bold=true`;

  return (
    <div
      className={`student-modal-overlay ${isOpen ? 'show' : ''}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="student-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="student-modal-header">
          <div className="student-modal-title-wrap">
            <div>
              <h3 className="student-modal-title">Student Profile</h3>
              <p className="student-modal-subtitle">Official Student Identification Record</p>
            </div>
          </div>
          <button
            type="button"
            className="student-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="student-modal-body">
          {/* Profile Hero Card */}
          <div className="student-hero-card">
            <div className="student-avatar-wrapper">
              <img
                src={avatarUrl}
                alt={fullName}
                className="student-hero-avatar"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=07345f&color=fff&size=200&bold=true`;
                }}
              />
              <span className="student-avatar-badge" title="Active Student">
                <CheckCircle2 size={13} />
              </span>
            </div>

            <div className="student-hero-meta">
              <div className="student-hero-name-row">
                <h2 className="student-hero-name">{fullName}</h2>
              </div>

              <div className="student-hero-tags">
                <span className="student-hero-pill grade-pill">
                  <GraduationCap size={13} />
                  {student.grade} - {student.section}
                </span>

                <span className="student-hero-pill lrn-pill">
                  <IdCard size={13} />
                  Student ID: <strong>{student.lrn}</strong>
                </span>

                {student.academicyear && (
                  <span className="student-hero-pill sy-pill">
                    <Calendar size={12} />
                    S.Y. {student.academicyear}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Info Cards Grid */}
          <div className="student-details-grid">
            {/* Student ID */}
            <div className="student-info-item">
              <div className="info-icon-box">
                <IdCard size={15} />
              </div>
              <div className="info-text-group">
                <span className="info-item-label">Student ID</span>
                <span className="info-item-value lrn-font">{student.lrn || 'N/A'}</span>
              </div>
            </div>

            {/* Gender */}
            <div className="student-info-item">
              <div className="info-icon-box">
                <ShieldCheck size={15} />
              </div>
              <div className="info-text-group">
                <span className="info-item-label">Gender</span>
                <span className="info-item-value">{student.gender || 'Not specified'}</span>
              </div>
            </div>

            {/* Parent / Guardian */}
            <div className="student-info-item">
              <div className="info-icon-box">
                <Users size={15} />
              </div>
              <div className="info-text-group">
                <span className="info-item-label">Parent / Guardian</span>
                <span className="info-item-value">{student.parent_name || 'N/A'}</span>
              </div>
            </div>

            {/* Guardian Contact */}
            <div className="student-info-item">
              <div className="info-icon-box">
                <Phone size={15} />
              </div>
              <div className="info-text-group">
                <span className="info-item-label">Guardian Contact</span>
                {student.parent_contact ? (
                  <a href={`tel:${student.parent_contact}`} className="info-item-link phone">
                    {student.parent_contact}
                  </a>
                ) : (
                  <span className="info-item-value">N/A</span>
                )}
              </div>
            </div>

            {/* Email Address */}
            <div className="student-info-item">
              <div className="info-icon-box">
                <Mail size={15} />
              </div>
              <div className="info-text-group">
                <span className="info-item-label">Email Address</span>
                {student.email ? (
                  <a href={`mailto:${student.email}`} className="info-item-link">
                    {student.email}
                  </a>
                ) : (
                  <span className="info-item-value">{`${student.fname.toLowerCase().replace(/\s+/g, '')}@gmail.com`}</span>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="student-info-item">
              <div className="info-icon-box">
                <MapPin size={15} />
              </div>
              <div className="info-text-group">
                <span className="info-item-label">Residential Address</span>
                <span className="info-item-value" title={student.address || 'Metro Manila'}>
                  {student.address || 'Metro Manila, Philippines'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="student-modal-footer">
          <div className="student-modal-footer-primary">
            <button
              type="button"
              className="student-modal-btn btn-track"
              onClick={handleTrackLocation}
              title="Track Student Location on Map"
            >
              <MapPin size={15} />
              <span>Track Location</span>
            </button>

            <button
              type="button"
              className="student-modal-btn btn-profile"
              onClick={handleProfileAndRecord}
              title="View Full Profile & Disciplinary Violations"
            >
              <FileText size={15} />
              <span>Profile & Record</span>
            </button>
          </div>

          <button
            type="button"
            className="student-modal-btn btn-close"
            onClick={onClose}
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
