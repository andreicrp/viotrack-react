import React from 'react';
import { Modal } from '../common/Modal';
import { Printer, QrCode, Shield, Download } from 'lucide-react';

export const StudentIdModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;

  const handlePrint = () => {
    window.print();
  };

  // QR points to the direct scan-qr / student violation URL matching PHP scan-qr.php
  const qrTargetUrl = `${window.location.origin}/scan-qr?id=${student.id}&token=qr_${student.lrn}`;
  const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrTargetUrl)}&margin=1`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Student ID Card - ${student.fname} ${student.lname}`} icon={QrCode} maxWidth="500px">
      <div className="modal-body">
        {/* Printable ID Card Graphic Preview */}
        <div id="printable-id-card" style={{
          background: 'linear-gradient(145deg, #1e1b4b 0%, #0f172a 100%)',
          border: '2px solid rgba(99, 102, 241, 0.4)',
          borderRadius: '16px',
          padding: '1.5rem',
          color: '#fff',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.5)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Hologram aesthetic ribbon */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #6366f1, #06b6d4, #10b981, #f59e0b)'
          }} />

          {/* School Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.04em' }}>VIOTRACK ACADEMY</div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>OFFICIAL STUDENT IDENTIFICATION</div>
              </div>
            </div>
            <span style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.3)', padding: '2px 8px', borderRadius: 10, color: '#a5b4fc', fontWeight: 700 }}>
              S.Y. {student.academicyear || '2025-2026'}
            </span>
          </div>

          {/* Student Profile Row */}
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.25rem' }}>
            <img
              src={student.image || `https://api.dicebear.com/7.x/initials/svg?seed=${student.fname} ${student.lname}`}
              alt={student.fname}
              style={{
                width: 90,
                height: 90,
                borderRadius: '12px',
                objectFit: 'cover',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
                {student.lname?.toUpperCase()}, {student.fname} {student.mname ? student.mname[0] + '.' : ''}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#38bdf8', fontWeight: 600, marginTop: 4 }}>
                {student.grade} - {student.section}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
                LRN: <strong style={{ color: '#fff', letterSpacing: '0.05em' }}>{student.lrn}</strong>
              </div>
            </div>
          </div>

          {/* QR Code & Barcode Row */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '10px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#0f172a'
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                Scan for Violations & Attendance
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                {student.lrn}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#64748b', marginTop: 2 }}>
                Guardian: {student.parent_name || 'N/A'}
              </div>
            </div>
            <img
              src={qrDataUrl}
              alt={`QR for ${student.lrn}`}
              style={{ width: 68, height: 68, borderRadius: 4 }}
            />
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <Printer size={16} />
          Print ID Badge
        </button>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-id-card, #printable-id-card * {
            visibility: visible;
          }
          #printable-id-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 320px;
          }
        }
      `}</style>
    </Modal>
  );
};
