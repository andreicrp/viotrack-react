import React from 'react';
import { Modal } from '../common/Modal';
import { Printer, X } from 'lucide-react';
import '../../css/student-id-card.css';

export const StudentIdModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  // QR points to secure public ID verification pass (zero violation leak on external scanners)
  const qrTargetUrl = `${window.location.origin}/verify-student/${student.id}`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrTargetUrl)}&margin=0`;

  const fullName = `${student.lname?.toUpperCase()}, ${student.fname} ${student.mname ? student.mname[0] + '.' : ''}`;
  const avatarUrl = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=200&bold=true`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Student ID Card - ${student.fname} ${student.lname}`} maxWidth="560px">
      <div className="modal-body" style={{ padding: '16px 20px', background: '#f8fafc' }}>
        {/* Printable Official Student ID Card */}
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

              {/* Verification & Enlarged High-Def QR Code Container */}
              <div className="id-verification-panel">
                <div className="id-guardian-block">
                  <span className="id-panel-title">Scan For Violations & Attendance</span>
                  <div className="id-guardian-name">
                    Guardian: <strong>{student.parent_name || 'N/A'}</strong>
                  </div>
                  {student.parent_contact && (
                    <div className="id-guardian-contact">Contact: {student.parent_contact}</div>
                  )}
                  <div className="id-scan-hint">
                    Official biometric & scanner pass
                  </div>
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

      <div className="modal-footer" style={{ padding: '12px 20px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          style={{
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '12.5px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
        <button
          type="button"
          onClick={handlePrint}
          style={{
            background: '#0f172a',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 18px',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)'
          }}
        >
          <Printer size={15} /> Print ID Card
        </button>
      </div>
    </Modal>
  );
};
