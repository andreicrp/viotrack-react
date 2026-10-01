import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck2, 
  Printer, 
  Check, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  User, 
  Calendar, 
  Sparkles,
  Award
} from 'lucide-react';
import confetti from 'canvas-confetti';

const SANCTION_PRESETS = [
  'Verbal Warning & Reprimand',
  'Written Acknowledgment & Reflection',
  'Parent / Guardian Conference',
  '1-Hour Campus Service',
  'Guidance Counseling Session',
  'Behavior Undertaking Contract'
];

const NOTE_SNIPPETS = [
  'Student acknowledged the infraction and committed to standard compliance.',
  'Parent/guardian was formally notified and attended conference.',
  'Student has completed assigned campus remediation duties in full.',
  'First offense counseling conducted; case considered closed.'
];

const STATUS_CONFIG = {
  'Resolved': {
    label: 'Resolved & Cleared',
    sublabel: 'Infraction remediated, case officially closed',
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    icon: CheckCircle2
  },
  'Investigation': {
    label: 'Under Investigation',
    sublabel: 'Evidence gathering & review in progress',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    icon: Clock
  },
  'Pending': {
    label: 'Pending (Open)',
    sublabel: 'Awaiting student or adviser response',
    color: '#64748b',
    bg: '#f8fafc',
    border: '#cbd5e1',
    icon: AlertCircleIcon
  },
  'Escalated': {
    label: 'Escalated to Guidance',
    sublabel: 'Forwarded for formal intervention',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: AlertTriangle
  }
};

function AlertCircleIcon(props) {
  return (
    <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export const ResolutionModal = ({ isOpen, onClose, record, onUpdated }) => {
  const { success, error } = useNotification();
  const [status, setStatus] = useState(record?.status || 'Resolved');
  const [sanction, setSanction] = useState(record?.sanction || '');
  const [resolutionNotes, setResolutionNotes] = useState(record?.resolution_notes || '');
  const [loading, setLoading] = useState(false);

  if (!record) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await dataService.updateRecordStatus(record.id, {
        status,
        sanction,
        resolution_notes: resolutionNotes
      });

      if (status === 'Resolved') {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }

      success(`Incident #${record.id} updated to "${status}" successfully!`);
      onUpdated?.(updated);
      onClose();
    } catch (err) {
      error('Failed to update resolution: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetText) => {
    setSanction(presetText);
  };

  const handleAppendSnippet = (snippetText) => {
    setResolutionNotes((prev) => {
      if (!prev || !prev.trim()) return snippetText;
      return `${prev.trim()} ${snippetText}`;
    });
  };

  const handlePrintResolutionCertificate = () => {
    const printWindow = window.open('', '_blank', 'width=850,height=800');
    if (!printWindow) return;

    const studentFullName = `${record.student?.fname || ''} ${record.student?.mname ? record.student.mname[0] + '.' : ''} ${record.student?.lname || ''}`.trim();
    const resolutionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>VioTrack - Disciplinary Resolution Certificate #${record.id}</title>
        <style>
          @page { size: A4 portrait; margin: 18mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.5; margin: 0; padding: 24px; }
          .header-box { border-bottom: 2.5px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
          .inst-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
          .inst-sub { font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 3px; }
          .badge-case { background: #0f172a; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; }
          .cert-title { text-align: center; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #0f172a; margin: 20px 0 10px 0; }
          .cert-desc { text-align: center; font-size: 13px; color: #475569; max-width: 600px; margin: 0 auto 24px auto; }
          .details-card { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px; }
          .grid-table { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; font-size: 12.5px; }
          .grid-item { display: flex; flex-direction: column; }
          .item-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
          .item-val { font-size: 13.5px; font-weight: 700; color: #0f172a; margin-top: 2px; }
          .remarks-box { border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 14px; background: #ffffff; margin-top: 20px; font-size: 12.5px; }
          .status-pill { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 800; text-transform: uppercase; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 70px; text-align: center; }
          .sig-line { border-top: 1.5px solid #0f172a; padding-top: 6px; font-size: 11.5px; font-weight: 700; color: #1e293b; }
          .sig-title { font-size: 10px; color: #64748b; margin-top: 2px; }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="inst-title">VioTrack System</div>
            <div class="inst-sub">Prefect of Discipline & Student Affairs Office</div>
          </div>
          <div class="badge-case">CASE #${record.id}</div>
        </div>

        <div class="cert-title">Certificate of Disciplinary Resolution</div>
        <div class="cert-desc">
          This document certifies that the disciplinary incident detailed below has been formally reviewed, remediated, and officially documented in compliance with school policies.
        </div>

        <div class="details-card">
          <div class="grid-table">
            <div class="grid-item">
              <span class="item-label">Student Name</span>
              <span class="item-val">${studentFullName}</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Learner Reference Number (LRN)</span>
              <span class="item-val">${record.student?.lrn || 'N/A'}</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Grade & Section</span>
              <span class="item-val">${record.student?.grade || ''} - ${record.student?.section || ''}</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Academic Year</span>
              <span class="item-val">${record.student?.academicyear || '2025–2026'}</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Infraction Recorded</span>
              <span class="item-val">${record.violation?.title || 'Recorded Incident'}</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Infraction Severity</span>
              <span class="item-val">${record.violation?.type || 'Minor'} Offense</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Reported By</span>
              <span class="item-val">${record.reported_by_name || 'Faculty / Staff'}</span>
            </div>
            <div class="grid-item">
              <span class="item-label">Date Resolved</span>
              <span class="item-val">${resolutionDate}</span>
            </div>
          </div>

          <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <span class="item-label">Resolution Status:</span>&nbsp;
              <span class="status-pill">${status}</span>
            </div>
            <div>
              <span class="item-label">Sanction Rendered:</span>&nbsp;
              <strong style="font-size: 12.5px; color: #0f172a;">${sanction || record.sanction || 'Completed Remediation'}</strong>
            </div>
          </div>

          <div class="remarks-box">
            <div class="item-label" style="margin-bottom: 4px;">Counseling & Resolution Remarks</div>
            <div style="color: #334155; line-height: 1.5;">
              ${resolutionNotes || 'The student demonstrated full cooperation, signed the required acknowledgment, and fulfilled all disciplinary conditions. Case is cleared and returned to good standing.'}
            </div>
          </div>
        </div>

        <div class="signatures">
          <div>
            <div class="sig-line">Prefect of Discipline</div>
            <div class="sig-title">Disciplinary Officer</div>
          </div>
          <div>
            <div class="sig-line">Guidance Counselor / Adviser</div>
            <div class="sig-title">Student Affairs</div>
          </div>
          <div>
            <div class="sig-line">Parent / Guardian Signature</div>
            <div class="sig-title">Acknowledged & Notified</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const studentName = `${record.student?.fname || ''} ${record.student?.lname || ''}`.trim();
  const avatarUrl = record.student?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName || 'Student')}&background=0f172a&color=fff&size=100&bold=true`;

  const getSeverityStyle = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('critical') || t.includes('severe')) {
      return { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' };
    }
    if (t.includes('major')) {
      return { bg: '#fff7ed', border: '#fed7aa', color: '#c2410c' };
    }
    return { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' };
  };

  const severityStyle = getSeverityStyle(record.violation?.type);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Case Resolution — Incident #${record.id}`} 
      icon={ShieldCheck} 
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ margin: 0 }}>
        <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: 'calc(85vh - 130px)', overflowY: 'auto' }}>
          
          {/* Enhanced Student & Incident Profile Banner */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Top row: Student Bio */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <img
                src={avatarUrl}
                alt={studentName}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '1.5px solid #cbd5e1',
                  flexShrink: 0
                }}
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName || 'Student')}&background=0f172a&color=fff&size=100&bold=true`;
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    {studentName}
                  </h4>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      background: '#f1f5f9',
                      color: '#475569',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {record.student?.grade} - {record.student?.section}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '3px', fontSize: '11.5px', color: '#64748b' }}>
                  <span>LRN: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{record.student?.lrn || 'N/A'}</strong></span>
                  <span>•</span>
                  <span>Reported by: <strong style={{ color: '#334155' }}>{record.reported_by_name || 'Faculty'}</strong></span>
                </div>
              </div>
            </div>

            {/* Offense strip */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Offense:
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {record.violation?.title || 'Violation Incident'}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  background: severityStyle.bg,
                  border: `1px solid ${severityStyle.border}`,
                  color: severityStyle.color,
                  flexShrink: 0
                }}
              >
                {record.violation?.type || 'Minor'}
              </span>
            </div>
          </div>

          {/* Interactive Resolution Status Selector */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              Case Resolution Status <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px'
              }}
            >
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                const isSelected = status === key;
                const IconComponent = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${cfg.color}` : '1.5px solid #e2e8f0',
                      background: isSelected ? cfg.bg : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.18s ease',
                      boxShadow: isSelected ? `0 2px 8px ${cfg.color}25` : 'none',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', marginBottom: '3px' }}>
                      <IconComponent size={15} color={isSelected ? cfg.color : '#64748b'} />
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : 700,
                          color: isSelected ? cfg.color : '#334155'
                        }}
                      >
                        {key === 'Resolved' ? 'Resolved' : key === 'Investigation' ? 'Investigating' : key}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.2 }}>
                      {key === 'Resolved' ? 'Close & clear case' : key === 'Investigation' ? 'Ongoing review' : key === 'Pending' ? 'Awaiting action' : 'Guidance office'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sanction Fulfilled Section with Quick Presets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Fulfilled Sanction / Remediation Completed
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Click presets to fill</span>
            </div>
            <input
              type="text"
              className="form-control"
              value={sanction}
              onChange={(e) => setSanction(e.target.value)}
              placeholder="e.g. Verbal warning issued, 1-hour campus reflection, Signed undertaking"
              style={{
                height: '42px',
                borderRadius: '10px',
                fontSize: '13px',
                border: '1.5px solid #cbd5e1',
                padding: '0 14px',
                marginBottom: '8px',
                width: '100%',
                boxSizing: 'border-box'
              }}
            />

            {/* Quick preset chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {SANCTION_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  style={{
                    background: sanction === p ? '#0f172a' : '#f1f5f9',
                    color: sanction === p ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: sanction === p ? '#0f172a' : '#e2e8f0',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Counseling Notes with Quick Snippets */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Counseling Notes & Official Resolution Summary
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Official Record</span>
            </div>
            <textarea
              className="form-control"
              rows={3}
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Document student reflection, counseling outcomes, or guardian agreements..."
              style={{
                borderRadius: '10px',
                fontSize: '13px',
                padding: '10px 14px',
                border: '1.5px solid #cbd5e1',
                width: '100%',
                boxSizing: 'border-box',
                lineHeight: 1.5,
                marginBottom: '8px'
              }}
            />

            {/* Quick snippets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {NOTE_SNIPPETS.map((snip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAppendSnippet(snip)}
                  style={{
                    background: '#f8fafc',
                    color: '#475569',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '6px',
                    padding: '3px 8px',
                    fontSize: '10.5px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left'
                  }}
                >
                  + {snip.length > 38 ? snip.substring(0, 38) + '...' : snip}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Restorative Action & Guidance Certification */}
        <div style={{ padding: '8px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#16a34a', fontWeight: 800 }}>✓</span>
          <span>
            <strong>Official Certification:</strong> Saving this resolution affirms that restorative guidance intervention was conducted in accordance with institutional policy.
          </span>
        </div>

        {/* Modal Action Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <button
            type="button"
            onClick={handlePrintResolutionCertificate}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              color: '#0f172a',
              padding: '9px 15px',
              borderRadius: '9px',
              fontWeight: 700,
              fontSize: '12.5px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <Printer size={15} /> Print Resolution Certificate
          </button>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                borderRadius: '9px',
                padding: '9px 16px',
                fontWeight: 600,
                fontSize: '12.5px',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                background: status === 'Resolved' ? '#10b981' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '9px',
                padding: '9px 20px',
                fontWeight: 700,
                fontSize: '13px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: status === 'Resolved' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.18s ease'
              }}
            >
              <Check size={16} />
              {loading ? 'Saving...' : 'Save Resolution'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

