import React from 'react';
import { Modal } from '../common/Modal';
import '../../css/student-id-card.css';

export const StudentIdModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  // QR points to the direct scan-qr / student violation URL matching PHP scan-qr.php
  const qrTargetUrl = `${window.location.origin}/scan-qr?id=${student.id}&token=qr_${student.lrn}`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTargetUrl)}&margin=1`;

  const fullName = `${student.lname?.toUpperCase()}, ${student.fname} ${student.mname ? student.mname[0] + '.' : ''}`;
  const avatarUrl = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=200&bold=true`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Student ID Card - ${student.fname} ${student.lname}`} maxWidth="480px">
      <div className="modal-body" style={{ padding: '16px 20px', background: '#f8fafc' }}>
        {/* Printable Official Student ID Card (No Icons) */}
        <div className="id-card-wrapper">
          <div id="printable-id-card" className="official-id-card">
            {/* Top Institutional Header */}
            <div className="id-header-band">
              <div className="id-institution-info">
                <span className="id-institution-name">Student Identification</span>
                <span className="id-institution-sub">Official Student Card</span>
              </div>
              <span className="id-sy-pill">
                S.Y. {student.academicyear || '2025–2026'}
              </span>
            </div>

            {/* Student Photo & Identity Section */}
            <div className="id-card-content">
              <div className="id-student-row">
                <div className="id-photo-container">
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="id-student-photo"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=200&bold=true`;
                    }}
                  />
                </div>

                <div className="id-meta-container">
                  <div className="id-student-name">{fullName}</div>
                  <div className="id-grade-badge">
                    {student.grade} – {student.section}
                  </div>
                  <div className="id-lrn-row">
                    LRN: <span className="id-lrn-value">{student.lrn}</span>
                  </div>
                </div>
              </div>

              {/* Verification & QR Code Container */}
              <div className="id-verification-panel">
                <div className="id-guardian-block">
                  <span className="id-panel-title">Scan For Violations & Attendance</span>
                  <div className="id-guardian-name">
                    Guardian: <strong>{student.parent_name || 'N/A'}</strong>
                  </div>
                  {student.parent_contact && (
                    <div className="id-guardian-contact">Contact: {student.parent_contact}</div>
                  )}
                </div>

                <div className="id-qr-holder">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${student.lrn}`}
                    className="id-qr-img"
                  />
                </div>
              </div>
            </div>

            {/* Official Card Footer Strip */}
            <div className="id-card-footer-band">
              <span>Authorized Student Pass</span>
              <span>Non-Transferable</span>
            </div>
          </div>
        </div>
      </div>

      <div className="modal-footer" style={{ padding: '12px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handlePrint}
          style={{ background: '#07345f', borderColor: '#07345f' }}
        >
          Print ID Card
        </button>
      </div>
    </Modal>
  );
};

