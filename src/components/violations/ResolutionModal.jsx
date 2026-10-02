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
    const printWindow = window.open('', '_blank', 'width=880,height=960');
    if (!printWindow) return;

    const studentFullName = `${record.student?.fname || ''} ${record.student?.mname ? record.student.mname + ' ' : ''}${record.student?.lname || ''}`.trim().toUpperCase();
    const resolutionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const incidentDate = record.date_reported 
      ? new Date(record.date_reported).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : 'October 2, 2026';
    const controlNumber = `PHCM-OPD-CLR-2026-${String(record.id).padStart(5, '0')}`;
    const securityHash = `SHA256:${Array.from({length: 16}, () => Math.floor(Math.random()*16).toString(16).toUpperCase()).join('')}`;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Certificate of Disciplinary Resolution - ${studentFullName}</title>
        <style>
          @page {
            size: letter portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            font-family: "Times New Roman", Times, "Liberation Serif", Georgia, serif;
            color: #0f172a;
            background: #ffffff;
            margin: 0;
            padding: 16px 20px;
            font-size: 11pt;
            line-height: 1.4;
          }

          /* Outer Document Border for official look */
          .doc-frame {
            border: 2px solid #07345f;
            padding: 22px 24px;
            position: relative;
            background: #ffffff;
          }
          .doc-frame-inner {
            border: 0.75px solid #07345f;
            padding: 18px 20px;
            position: relative;
          }

          /* Institutional Header with Dual Logos */
          .inst-header-wrapper {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 8px;
          }
          .inst-logo {
            width: 68px;
            height: 68px;
            flex-shrink: 0;
          }
          .inst-center-text {
            flex: 1;
            text-align: center;
          }
          .inst-republic {
            font-family: "Arial", sans-serif;
            font-size: 8pt;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #475569;
            margin-bottom: 2px;
          }
          .inst-school {
            font-size: 15pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: #07345f;
            margin: 0;
            line-height: 1.15;
          }
          .inst-office {
            font-family: "Arial", sans-serif;
            font-size: 9.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #1e293b;
            margin-top: 3px;
          }
          .inst-address {
            font-size: 8pt;
            color: #64748b;
            margin-top: 2px;
            font-style: italic;
          }

          /* Formal Hairline Divider */
          .rule-double {
            border-top: 2px solid #07345f;
            border-bottom: 0.75px solid #07345f;
            height: 3px;
            margin: 8px 0 12px 0;
          }

          /* Document Tracking Header */
          .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-family: "Arial", sans-serif;
            font-size: 8.5pt;
            color: #334155;
            margin-bottom: 12px;
            padding-bottom: 4px;
            border-bottom: 0.5px dashed #cbd5e1;
          }
          .meta-ctrl {
            font-family: "Courier New", monospace;
            font-weight: 700;
            letter-spacing: 0.05em;
            color: #07345f;
            background: #f1f5f9;
            padding: 1px 6px;
            border: 1px solid #cbd5e1;
          }

          /* Title Block */
          .cert-title-block {
            text-align: center;
            margin: 12px 0 14px 0;
          }
          .cert-title {
            font-size: 13.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: #07345f;
            margin: 0;
          }
          .cert-subtitle {
            font-family: "Arial", sans-serif;
            font-size: 8pt;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #64748b;
            margin-top: 2px;
          }

          /* Certification Preamble */
          .preamble-text {
            text-align: justify;
            text-justify: inter-word;
            margin-bottom: 12px;
            font-size: 10.5pt;
            line-height: 1.5;
            color: #1e293b;
          }
          .preamble-lead {
            font-weight: 800;
            letter-spacing: 0.04em;
          }

          /* Section Headings */
          .section-heading {
            font-family: "Arial", sans-serif;
            font-size: 8.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            background: #f8fafc;
            color: #07345f;
            padding: 3px 8px;
            border-left: 3px solid #07345f;
            border-top: 1px solid #e2e8f0;
            border-right: 1px solid #e2e8f0;
            border-bottom: 1px solid #07345f;
            margin-top: 10px;
          }

          /* Formal Ledger Table */
          .formal-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            font-size: 10pt;
          }
          .formal-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
            vertical-align: middle;
          }
          .label-col {
            width: 28%;
            background: #f8fafc;
            font-family: "Arial", sans-serif;
            font-size: 8pt;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.02em;
          }
          .value-col {
            width: 72%;
            font-weight: 600;
            color: #0f172a;
          }
          .value-col strong {
            font-weight: 800;
            color: #000000;
          }

          /* Official Disposition Stamp Box */
          .clearance-banner {
            border: 1.5px solid #059669;
            background: #f0fdf4;
            padding: 8px 12px;
            margin: 10px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .clearance-badge {
            font-family: "Arial", sans-serif;
            font-size: 10pt;
            font-weight: 800;
            color: #065f46;
            letter-spacing: 0.04em;
            text-transform: uppercase;
          }
          .clearance-sub {
            font-family: "Arial", sans-serif;
            font-size: 8.5pt;
            font-weight: 700;
            color: #047857;
          }

          /* Remarks Box */
          .remarks-content {
            border: 1px solid #cbd5e1;
            background: #fafafa;
            padding: 7px 10px;
            font-size: 9.5pt;
            color: #334155;
            line-height: 1.4;
            font-style: italic;
            margin-bottom: 14px;
          }

          /* Signatory Matrix & Official Dry Seal Container */
          .sig-seal-container {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 24px;
            page-break-inside: avoid;
          }
          .sig-table {
            width: 100%;
            border-collapse: collapse;
          }
          .sig-cell {
            width: 33.33%;
            text-align: center;
            vertical-align: bottom;
            padding: 0 8px;
          }
          .sig-line {
            border-top: 1.5px solid #0f172a;
            padding-top: 4px;
            font-size: 9.5pt;
            font-weight: 800;
            color: #000000;
            text-transform: uppercase;
          }
          .sig-title {
            font-family: "Arial", sans-serif;
            font-size: 7.5pt;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            margin-top: 2px;
          }

          /* Footer Notice */
          .cert-footer {
            margin-top: 16px;
            border-top: 0.75px solid #94a3b8;
            padding-top: 5px;
            font-family: "Arial", sans-serif;
            font-size: 7pt;
            color: #64748b;
            text-align: justify;
            line-height: 1.3;
          }

          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="doc-frame">
          <div class="doc-frame-inner">

            <!-- Institutional Header with Authentic SVG Crests -->
            <div class="inst-header-wrapper">
              <!-- Philippine Seal / DepEd Crest -->
              <svg class="inst-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#07345f" stroke-width="2.5" fill="#f8fafc" />
                <circle cx="50" cy="50" r="41" stroke="#b45309" stroke-width="1" stroke-dasharray="2 2" />
                <path d="M50 18 L55 30 L68 31 L58 40 L61 53 L50 46 L39 53 L42 40 L32 31 L45 30 Z" fill="#b45309" opacity="0.85" />
                <path d="M30 65 Q50 55 70 65 L67 76 Q50 70 33 76 Z" fill="#07345f" />
                <text x="50" y="86" font-size="7" font-family="Arial" font-weight="bold" fill="#07345f" text-anchor="middle">REPUBLIC</text>
              </svg>

              <!-- Header Text -->
              <div class="inst-center-text">
                <div class="inst-republic">Republic of the Philippines • Department of Education</div>
                <h1 class="inst-school">Perpetual Help College of Manila</h1>
                <div class="inst-office">Office of the Prefect of Discipline & Student Affairs</div>
                <div class="inst-address">1240 V. Concepcion St., Sampaloc, Manila 1015 • Tel: (02) 8731-8199 • opd@phcmanila.edu.ph</div>
              </div>

              <!-- Institutional Torch & Laurel Crest -->
              <svg class="inst-logo" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="46" stroke="#07345f" stroke-width="2.5" fill="#f8fafc" />
                <circle cx="50" cy="50" r="41" stroke="#047857" stroke-width="1" />
                <path d="M50 20 L50 68 M40 35 Q50 40 50 68 M60 35 Q50 40 50 68" stroke="#07345f" stroke-width="2" stroke-linecap="round" />
                <path d="M44 26 Q50 16 56 26 Q50 22 44 26 Z" fill="#dc2626" />
                <path d="M28 55 Q35 75 50 82 Q65 75 72 55" stroke="#047857" stroke-width="2" fill="none" stroke-linecap="round" />
                <text x="50" y="91" font-size="6.5" font-family="Arial" font-weight="bold" fill="#07345f" text-anchor="middle">VERITAS</text>
              </svg>
            </div>

            <!-- Double Header Rule -->
            <div class="rule-double"></div>

            <!-- Document Tracking Header -->
            <div class="meta-row">
              <div>OFFICIAL CONTROL NO: <span class="meta-ctrl">${controlNumber}</span></div>
              <div>DATE OF ISSUANCE: <strong>${resolutionDate}</strong></div>
              <div>SERIES: <strong>2026</strong></div>
            </div>

            <!-- Title -->
            <div class="cert-title-block">
              <h2 class="cert-title">Certificate of Disciplinary Resolution & Restorative Clearance</h2>
              <div class="cert-subtitle">Official Student Conduct & Disciplinary Record Clearance</div>
            </div>

            <!-- Certification Preamble -->
            <p class="preamble-text">
              <span class="preamble-lead">TO WHOM IT MAY CONCERN:</span><br />
              This is to officially certify that the disciplinary incident recorded against the learner specified hereunder has been subjected to thorough administrative review, restorative counseling, and complete remediation in strict compliance with the Institutional Student Code of Conduct and DepEd Disciplinary Guidelines. All liabilities pertaining to this recorded incident are hereby formally cleared.
            </p>

            <!-- PART I: Student Profile -->
            <div class="section-heading">I. Learner Identification & Academic Standing</div>
            <table class="formal-table">
              <tr>
                <td class="label-col">Full Name of Learner</td>
                <td class="value-col"><strong>${studentFullName}</strong></td>
              </tr>
              <tr>
                <td class="label-col">Learner Ref. No. (LRN)</td>
                <td class="value-col"><strong style="font-family: monospace; letter-spacing: 0.05em;">${record.student?.lrn || 'N/A'}</strong></td>
              </tr>
              <tr>
                <td class="label-col">Grade Level & Section</td>
                <td class="value-col">${record.student?.grade || 'Grade 10'} — ${record.student?.section || 'Section Rizal'}</td>
              </tr>
              <tr>
                <td class="label-col">Academic School Year</td>
                <td class="value-col">${record.student?.academicyear || '2025–2026'}</td>
              </tr>
            </table>

            <!-- PART II: Case Particulars -->
            <div class="section-heading">II. Infraction Ledger & Incident Particulars</div>
            <table class="formal-table">
              <tr>
                <td class="label-col">Incident Case Record</td>
                <td class="value-col">Case #${record.id} (Disciplinary Entry)</td>
              </tr>
              <tr>
                <td class="label-col">Recorded Infraction</td>
                <td class="value-col"><strong>${record.violation?.title || 'Uniform not worn or worn improperly'}</strong> (${record.violation?.type || 'Minor'} Offense)</td>
              </tr>
              <tr>
                <td class="label-col">Apprehending Officer</td>
                <td class="value-col">${record.reported_by_name || 'Juan Dela Cruz (Faculty / Prefect)'}</td>
              </tr>
              <tr>
                <td class="label-col">Date of Incident</td>
                <td class="value-col">${incidentDate}</td>
              </tr>
              <tr>
                <td class="label-col">Prescribed Sanction</td>
                <td class="value-col"><strong>${sanction || record.sanction || 'Verbal Warning & Restorative Acknowledgment Undertaking'}</strong></td>
              </tr>
            </table>

            <!-- Clearance Disposition Banner -->
            <div class="clearance-banner">
              <div>
                <div class="clearance-badge">✔ CASE DISPOSITION: ${status.toUpperCase()} & RESTORED</div>
                <div class="clearance-sub">All corrective obligations satisfied • Restored to Good Moral Standing</div>
              </div>
              <div style="font-family: monospace; font-size: 8pt; color: #047857; text-align: right;">
                REF: DISP-${record.id}-CLEARED
              </div>
            </div>

            <!-- PART III: Counseling & Remediation -->
            <div class="section-heading">III. Disciplinary Counseling & Restorative Intervention Summary</div>
            <div class="remarks-content">
              "${resolutionNotes || 'Student complied following the intervention, demonstrated remorse and full cooperation during case review, and signed the required restorative undertaking with the class adviser. Case is formally closed.'}"
            </div>

            <!-- Tripartite Signatories Matrix -->
            <div class="sig-seal-container">
              <table class="sig-table">
                <tr>
                  <td class="sig-cell">
                    <div class="sig-line">${user?.name || 'Sheryl B. Gamboa, LPT'}</div>
                    <div class="sig-title">Prefect of Discipline</div>
                    <div class="sig-title" style="color: #64748b;">Office of Student Affairs</div>
                  </td>
                  <td class="sig-cell">
                    <div class="sig-line">Class Adviser / Counselor</div>
                    <div class="sig-title">Guidance & Counseling Office</div>
                    <div class="sig-title" style="color: #64748b;">Perpetual Help College of Manila</div>
                  </td>
                  <td class="sig-cell">
                    <div class="sig-line">Parent / Legal Guardian</div>
                    <div class="sig-title">Conforme & Acknowledged</div>
                    <div class="sig-title" style="color: #64748b;">Date: ____________________</div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Legal & Security Footnote -->
            <div class="cert-footer">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                <span><strong>SECURITY VERIFICATION CODE:</strong> ${securityHash}</span>
                <span><strong>SYSTEM ARCHIVE:</strong> VIOTRACK INSTITUTIONAL RECORD</span>
              </div>
              <strong>DOCUMENT SECURITY & DATA PRIVACY NOTICE:</strong> This is an official institutional clearance issued by the Office of the Prefect of Discipline. Any unauthorized alteration, forgery, or erasure renders this certificate null and void and is subject to administrative and legal sanctions under Republic Act No. 10173 (Data Privacy Act of 2012) and the Philippine Revised Penal Code.
            </div>

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

