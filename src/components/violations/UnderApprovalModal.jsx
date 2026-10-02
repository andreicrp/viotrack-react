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
  Info,
  ShieldAlert,
  ArrowRight,
  Check
} from 'lucide-react';

export const UnderApprovalModal = ({ isOpen, onClose, recordData, students = [], violations = [] }) => {
  if (!isOpen) return null;

  const studentCount = recordData?.studentNames?.length || 1;
  const violationTitles = recordData?.violationTitles || ['Disciplinary Infraction'];

  // Helper to extract severity badge
  const renderOffenseBadge = (titleString) => {
    const isMajor = titleString.toLowerCase().includes('major');
    const isSerious = titleString.toLowerCase().includes('serious');
    
    let cleanTitle = titleString.replace(/\[(Major|Minor|Serious)\]/gi, '').trim();
    let badgeType = isMajor ? 'Major' : isSerious ? 'Serious' : 'Minor';
    let badgeBg = isMajor ? '#fef2f2' : isSerious ? '#fffbeb' : '#eff6ff';
    let badgeColor = isMajor ? '#dc2626' : isSerious ? '#d97706' : '#2563eb';
    let badgeBorder = isMajor ? '#fecaca' : isSerious ? '#fde68a' : '#bfdbfe';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
          <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#0f172a' }}>
            {cleanTitle}
          </span>
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Incident Report Submitted"
      icon={ShieldAlert}
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px 22px 20px' }}>
        
        {/* Top Hero Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)',
            borderRadius: '16px',
            padding: '20px',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(7, 52, 95, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Ambient Background Decorative Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, rgba(245, 158, 11, 0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', position: 'relative', zIndex: 1 }}>
            
            {/* Glowing Icon Orb */}
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.45)',
                border: '2px solid rgba(255, 255, 255, 0.25)'
              }}
            >
              <Clock size={26} color="#ffffff" strokeWidth={2.4} />
            </div>

            {/* Banner Text */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: 'rgba(245, 158, 11, 0.22)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    padding: '2px 9px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }} />
                  Under Approval
                </span>
                <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.65)' }}>
                  Report #{Date.now().toString().slice(-5)}
                </span>
              </div>

              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em' }}>
                Queued for Administrator Review
              </h3>

              <p style={{ margin: 0, fontSize: '12.5px', color: 'rgba(255, 255, 255, 0.82)', lineHeight: 1.45 }}>
                Your report is queued for verification. An authorized <strong>Discipline Officer</strong> or <strong>Head Admin</strong> will review this case before sanctions and parent notifications are finalized.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Step Approval Pipeline Flow */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            fontSize: '11.5px'
          }}
        >
          {/* Step 1: Logged */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
            <div
              style={{
                width: 22,
                height: 22,
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
              <Check size={13} strokeWidth={3} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>1. Logged</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>Faculty submitted</div>
            </div>
          </div>

          <ArrowRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />

          {/* Step 2: Under Approval */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1.2 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#d97706',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '11px',
                flexShrink: 0,
                boxShadow: '0 0 0 3px rgba(217, 119, 6, 0.15)'
              }}
            >
              <Clock size={12} strokeWidth={2.6} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#d97706', lineHeight: 1.1 }}>2. Under Review</div>
              <div style={{ fontSize: '10px', color: '#78350f' }}>Admin evaluation</div>
            </div>
          </div>

          <ArrowRight size={14} color="#94a3b8" style={{ flexShrink: 0 }} />

          {/* Step 3: Sanctions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, opacity: 0.65 }}>
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#cbd5e1',
                color: '#475569',
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
              <div style={{ fontWeight: 700, color: '#475569', lineHeight: 1.1 }}>3. Action</div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Sanctions applied</div>
            </div>
          </div>
        </div>

        {/* Structured Case Details Card */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
          }}
        >
          {/* Card Section Header */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <FileText size={15} color="#07345f" />
              Submission Summary
            </div>
            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              {new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Student Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #07345f 0%, #1e3a8a 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '13px'
                  }}
                >
                  <User size={16} />
                </div>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                    STUDENT ({studentCount})
                  </span>
                  <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px' }}>
                    {recordData?.studentNames?.join(', ') || 'Selected Student'}
                  </span>
                </div>
              </div>
            </div>

            {/* Offense Category Row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '3px' }}>
                  REPORTED OFFENSE
                </span>
                {violationTitles.map((vTitle, idx) => (
                  <div key={idx} style={{ marginTop: idx > 0 ? 4 : 0 }}>
                    {renderOffenseBadge(vTitle)}
                  </div>
                ))}
              </div>
            </div>

            {/* Sanction & Submitter Split Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                  RECOMMENDED SANCTION
                </span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12.5px' }}>
                  {recordData?.sanction || 'Under Review / Initial Counseling'}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '2px' }}>
                  REPORTING FACULTY
                </span>
                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12.5px' }}>
                  {recordData?.reportedBy || 'Faculty Member'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Notice Info Callout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '12px',
            color: '#0369a1',
            lineHeight: 1.4
          }}
        >
          <Info size={18} color="#0284c7" style={{ flexShrink: 0 }} />
          <span>
            You will receive updates once the Discipline Office acts on this report. You can review all cases anytime in your dashboard.
          </span>
        </div>

        {/* Improved Premium Action Button */}
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #07345f 0%, #1e3a8a 100%)',
              color: '#ffffff',
              fontSize: '14.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '9px',
              letterSpacing: '0.01em',
              boxShadow: '0 4px 16px rgba(7, 52, 95, 0.35)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(7, 52, 95, 0.45)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #0a4680 0%, #2563eb 100%)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(7, 52, 95, 0.35)';
              e.currentTarget.style.background = 'linear-gradient(135deg, #07345f 0%, #1e3a8a 100%)';
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(0.99)';
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Check size={15} strokeWidth={3} color="#ffffff" />
            </div>
            <span>Understood &amp; Close</span>
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default UnderApprovalModal;
