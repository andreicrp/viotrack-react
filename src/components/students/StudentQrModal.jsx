import React from 'react';
import { Modal } from '../common/Modal';
import { QrCode } from 'lucide-react';
import { getStudentQrCodeUrl } from '../../utils/qrHelper';
import { BrandedQrCode } from '../common/BrandedQrCode';

export const StudentQrModal = ({ isOpen, onClose, student }) => {
  if (!student) return null;

  const qrDataUrl = getStudentQrCodeUrl(student, 500, 2);
  const fullName = `${student.fname} ${student.lname}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student QR Code"
      maxWidth="420px"
      icon={QrCode}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        padding: '24px',
        textAlign: 'center'
      }}>
        <BrandedQrCode
          src={qrDataUrl}
          alt={`QR code for ${fullName}`}
          size="min(100%, 280px)"
          style={{
            padding: '10px',
            background: '#ffffff',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            borderRadius: '12px',
            boxSizing: 'border-box'
          }}
        />
        <div>
          <div style={{
            color: 'var(--text-primary, #0f172a)',
            fontSize: '15px',
            fontWeight: 700
          }}>
            {fullName}
          </div>
          <div style={{
            marginTop: '4px',
            color: 'var(--text-muted, #64748b)',
            fontSize: '12px'
          }}>
            {student.grade} · {student.section}
          </div>
        </div>
      </div>
    </Modal>
  );
};
