import React from 'react';
import { Modal } from '../common/Modal';
import {
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Calendar,
  Send,
  Sparkles,
  Info
} from 'lucide-react';

export const UnderApprovalModal = ({ isOpen, onClose, recordData, students = [], violations = [] }) => {
  if (!isOpen) return null;

  const studentCount = recordData?.studentNames?.length || 1;
  const violationCount = recordData?.violationTitles?.length || 1;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Incident Report Submitted"
      icon={ShieldCheck}
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '10px 0 6px 0' }}>
        {/* Status Badge & Animation Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '1.5px solid #fde68a',
            borderRadius: '16px',
            padding: '22px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            position: 'relative',
            boxShadow: '0 4px 16px rgba(217, 119, 6, 0.08)'
          }}
        >
          {/* Animated Glow Pill */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: '#d97706',
              color: '#ffffff',
              padding: '5px 14px',
              borderRadius: '30px',
              fontSize: '12px',
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: '0 2px 10px rgba(217, 119, 6, 0.35)'
            }}
          >
            <Clock size={14} className="animate-spin" style={{ animationDuration: '3s' }} />
            Under Approval
          </div>

          <h3
            style={{
              margin: '2px 0 0 0',
              fontSize: '19px',
              fontWeight: 800,
              color: '#92400e',
              letterSpacing: '-0.01em'
            }}
          >
            Queued for Administrator Review
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: '13.5px',
              color: '#78350f',
              lineHeight: 1.55,
              maxWidth: '460px'
            }}
          >
            Your report has been logged and marked <strong>Under Approval</strong>. An authorized <strong>Discipline Officer</strong> or <strong>Head Administrator</strong> will inspect and approve this case before official disciplinary sanctions are finalized.
          </p>
        </div>

        {/* Incident Summary Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12.5px',
              fontWeight: 800,
              color: '#07345f',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <FileText size={15} color="#07345f" />
            Report Submission Summary
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              fontSize: '13px'
            }}
          >
            {/* Student Info */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                STUDENT ({studentCount})
              </span>
              <span style={{ fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' }}>
                {recordData?.studentNames?.join(', ') || 'Selected Student'}
              </span>
            </div>

            {/* Offense Info */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                OFFENSE CATEGORY ({violationCount})
              </span>
              <span style={{ fontWeight: 800, color: '#dc2626', wordBreak: 'break-word' }}>
                {recordData?.violationTitles?.join(', ') || 'Logged Offense'}
              </span>
            </div>

            {/* Prescribed Sanction */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                RECOMMENDED SANCTION
              </span>
              <span style={{ fontWeight: 700, color: '#334155' }}>
                {recordData?.sanction || 'Under Review / Initial Counseling'}
              </span>
            </div>

            {/* Reported By */}
            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                REPORTING FACULTY
              </span>
              <span style={{ fontWeight: 700, color: '#334155' }}>
                {recordData?.reportedBy || 'Faculty Member'}
              </span>
            </div>
          </div>

          {/* Quick Notice Tip */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '9px',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '9px',
              padding: '9px 12px',
              fontSize: '12px',
              color: '#0369a1',
              lineHeight: 1.4
            }}
          >
            <Info size={16} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              You will be notified once the Discipline Office acts on this report. You can track progress under your submitted incident records.
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
              color: '#ffffff',
              fontSize: '14.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(7, 52, 95, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <CheckCircle2 size={18} />
            Understood & Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
