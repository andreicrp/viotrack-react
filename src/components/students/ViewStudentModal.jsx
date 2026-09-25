import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ViewStudentModal = ({ isOpen, onClose, student }) => {
  const navigate = useNavigate();

  if (!isOpen || !student) return null;

  const handleProfileAndRecord = () => {
    onClose();
    navigate(`/student-violation/${student.id}`);
  };

  return (
    <div className={`modal-overlay ${isOpen ? 'show' : ''}`} style={{ display: isOpen ? 'flex' : 'none' }}>
      <div className="student-modal" style={{ background: '#fff', borderRadius: 12, maxWidth: 680, width: '90%', overflow: 'hidden' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937', margin: 0 }}>Student Profile</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            style={{ background: '#f3f4f6', border: 'none', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="fas fa-times" style={{ color: '#6b7280' }}></i>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px' }}>
          <div className="profile-section" style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {/* Left Image */}
            <div className="profile-image-container" style={{ flexShrink: 0, textAlign: 'center' }}>
              <img
                src={student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=7c3aed&color=fff&size=180`}
                alt="Student Profile"
                className="profile-image"
                style={{ width: 180, height: 180, borderRadius: 12, objectFit: 'cover', border: '1px solid #e5e7eb' }}
              />
              <span className="profile-image-label" style={{ display: 'block', marginTop: 8, fontSize: '12px', color: '#6b7280' }}>
                Student Profile Image
              </span>
            </div>

            {/* Right Details Grid */}
            <div className="profile-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 260 }}>
              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-id-card detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>STUDENT ID</div>
                  <div className="detail-value" style={{ fontSize: '14px', fontWeight: 700, color: '#1f2937' }}>{student.lrn}</div>
                </div>
              </div>

              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-user detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>FULL NAME</div>
                  <div className="detail-value" style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937' }}>
                    {student.fname} {student.mname ? student.mname + ' ' : ''}{student.lname}
                  </div>
                </div>
              </div>

              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-graduation-cap detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>GRADE LEVEL</div>
                  <div className="detail-value" style={{ fontSize: '14px', color: '#1f2937' }}>
                    {student.grade} - {student.section} ({student.academicyear || '2025-2026'})
                  </div>
                </div>
              </div>

              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-envelope detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>EMAIL</div>
                  <div className="detail-value email" style={{ fontSize: '14px', color: '#1f2937' }}>{student.email || `${student.fname.toLowerCase()}@gmail.com`}</div>
                </div>
              </div>

              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-user-friends detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>GUARDIAN</div>
                  <div className="detail-value" style={{ fontSize: '14px', color: '#1f2937' }}>{student.parent_name || 'Guardian Name'}</div>
                </div>
              </div>

              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-phone detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>GUARDIAN CONTACT</div>
                  <div className="detail-value" style={{ fontSize: '14px', color: '#1f2937' }}>{student.parent_contact || '09150000000'}</div>
                </div>
              </div>

              <div className="detail-row" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <i className="fas fa-venus-mars detail-icon" style={{ width: 18, color: '#6b7280', marginTop: 3 }}></i>
                <div className="detail-content">
                  <div className="detail-label" style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>GENDER</div>
                  <div className="detail-value" style={{ fontSize: '14px', color: '#1f2937' }}>{student.gender || 'Male'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-start', gap: 10, padding: '16px 24px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            className="modal-btn btn-track-location"
            onClick={() => alert(`Tracking GPS Location for Student: ${student.fname} ${student.lname}`)}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-map-marker-alt"></i> Track Location
          </button>

          <button
            type="button"
            className="modal-btn btn-profile-record"
            onClick={handleProfileAndRecord}
            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <i className="fas fa-file-alt"></i> Profile & Record
          </button>

          <button
            type="button"
            className="modal-btn btn-close-modal"
            onClick={onClose}
            style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
