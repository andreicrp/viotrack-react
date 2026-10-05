import React from 'react';
import { Modal } from '../common/Modal';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  FileText,
  Info,
  ShieldAlert,
  ArrowRight,
  Check
} from 'lucide-react';

export const UnderApprovalModal = ({ isOpen, onClose, recordData }) => {
  if (!isOpen) return null;

  const studentCount = recordData?.studentNames?.length || 1;
  const violationTitles = recordData?.violationTitles || ['Disciplinary Infraction'];

  // Helper to extract severity badge
  const renderOffenseBadge = (titleString) => {
    const isMajor = titleString.toLowerCase().includes('major');
    const isSerious = titleString.toLowerCase().includes('serious');
    
    let cleanTitle = titleString.replace(/\[(Major|Minor|Serious)\]/gi, '').trim();
    let badgeType = isMajor ? 'Major' : isSerious ? 'Serious' : 'Minor';
    let badgeBg = isMajor ? '#fef2f2' : isSerious ? '#fef9c3' : '#f0fdf4';
    let badgeColor = isMajor ? '#dc2626' : isSerious ? '#a16207' : '#16a34a';
    let badgeBorder = isMajor ? '#fecaca' : isSerious ? '#fde047' : '#bbf7d0';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 7px',
            borderRadius: '6px',
            background: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {badgeType}
        </span>
        <span style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
          {cleanTitle}
        </span>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Incident Report Submitted"
      icon={ShieldAlert}
      maxWidth="560px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '18px 22px' }}>
        
        {/* Clean Status Banner */}
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <Clock size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#b45309',
                  background: '#fef3c7',
                  border: '1px solid #fde68a',
                  padding: '1px 7px',
                  borderRadius: '6px',
                  textTransform: 'uppercase'
                }}
              >
                Under Review
              </span>
            </div>
            <h4 style={{ margin: '0 0 3px 0', fontSize: '15px', fontWeight: 800, color: '#92400e' }}>
              Queued for Administrator Review
            </h4>
            <p style={{ margin: 0, fontSize: '12.5px', color: '#78350f', lineHeight: 1.45 }}>
              Your report has been submitted. A Discipline Officer will evaluate this case before sanctions and parent notifications are finalized.
            </p>
          </div>
        </div>

        {/* 3-Step Review Flow */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '11.5px'
          }}
        >
          {/* Step 1: Logged */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '11px',
                flexShrink: 0
              }}
            >
              <Check size={12} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>1. Logged</div>
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>Faculty submitted</div>
            </div>
          </div>

          <ArrowRight size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />

          {/* Step 2: Under Review */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1.1 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#d97706',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '11px',
                flexShrink: 0
              }}
            >
              <Clock size={11} strokeWidth={2.6} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>2. Under Review</div>
              <div style={{ fontSize: '10.5px', color: '#92400e' }}>Admin evaluation</div>
            </div>
          </div>

          <ArrowRight size={14} color="#cbd5e1" style={{ flexShrink: 0 }} />

          {/* Step 3: Action */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, opacity: 0.6 }}>
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#e2e8f0',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '11px',
                flexShrink: 0
              }}
            >
              3
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#64748b', lineHeight: 1.1 }}>3. Action</div>
              <div style={{ fontSize: '10.5px', color: '#94a3b8' }}>Sanction applied</div>
            </div>
          </div>
        </div>

        {/* Structured Case Details Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '10px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
              <FileText size={14} color="#64748b" />
              Submission Summary
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Student Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              <User size={16} color="#64748b" />
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block' }}>
                  Student ({studentCount})
                </span>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>
                  {recordData?.studentNames?.join(', ') || 'Selected Student'}
                </span>
              </div>
            </div>

            {/* Offense Category Row */}
            <div style={{ paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                Reported Offense
              </span>
              {violationTitles.map((vTitle, idx) => (
                <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                  {renderOffenseBadge(vTitle)}
                </div>
              ))}
            </div>

            {/* Sanction & Submitter Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  Recommended Sanction
                </span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12.5px' }}>
                  {recordData?.sanction || 'Under Review / Initial Counseling'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '2px' }}>
                  Reporting Faculty
                </span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12.5px' }}>
                  {recordData?.reportedBy || 'Faculty Member'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Notice Callout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#64748b',
            lineHeight: 1.4
          }}
        >
          <Info size={16} color="#64748b" style={{ flexShrink: 0 }} />
          <span>
            You will receive updates once the Discipline Office acts on this report.
          </span>
        </div>

        {/* Done / Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%',
            padding: '11px 20px',
            borderRadius: '10px',
            border: 'none',
            background: '#0f172a',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#1e293b'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#0f172a'; }}
        >
          Done
        </button>

      </div>
    </Modal>
  );
};

export default UnderApprovalModal;
