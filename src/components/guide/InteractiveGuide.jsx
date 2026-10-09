import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  QrCode,
  AlertTriangle,
  FileText,
  ShieldCheck,
  BarChart3,
  BookOpen,
  ArrowRight,
  Compass,
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  MapPin,
  User,
  Award,
  Shield,
  Scissors,
  FileCheck,
  CheckSquare,
  Square
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Institutional Sanctions Reference Data for Quick Access
const SANCTIONS_MATRIX = [
  {
    level: 'Minor Offense',
    color: '#15803d',
    bg: '#f0fdf4',
    border: '#86efac',
    examples: ['Improper Uniform / No ID', 'Tardiness / Loitering', 'Minor Classroom Disruption'],
    firstOffense: 'Verbal Warning & Counseling',
    secondOffense: 'Written Reflection & Adviser Notification',
    thirdOffense: 'Mandatory Parent / Guardian Conference'
  },
  {
    level: 'Serious Offense',
    color: '#a16207',
    bg: '#fefce8',
    border: '#fde047',
    examples: ['Cutting Classes / Truancy', 'Disrespect toward School Personnel', 'Unauthorized Campus Exit'],
    firstOffense: 'Parent Summons & 2-Hour Campus Service',
    secondOffense: 'Formal Behavioral Contract & Counseling',
    thirdOffense: 'Disciplinary Committee Escalation'
  },
  {
    level: 'Major Offense',
    color: '#b91c1c',
    bg: '#fef2f2',
    border: '#fca5a5',
    examples: ['Bullying / Physical Altercation', 'Academic Dishonesty / Forgery', 'Vandalism / Property Damage'],
    firstOffense: 'Immediate Parent Summons & Disciplinary Board Hearing',
    secondOffense: 'Suspension / Behavioral Probation',
    thirdOffense: 'Non-Readmission / Recommendation for Transfer'
  }
];

// Rich Visual Sample Previews for Guides
const StepVisualPreview = ({ previewType }) => {
  if (!previewType) return null;

  if (previewType === 'summons_letterhead') {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          padding: '14px',
          boxShadow: '0 8px 20px -4px rgba(7, 52, 95, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          marginTop: '6px'
        }}
      >
        {/* Letterhead Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '2px solid #07345f', paddingBottom: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #07345f 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc', flexShrink: 0, fontWeight: 900, fontSize: '10px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 6px rgba(7, 52, 95, 0.25)' }}>
            UPH
          </div>
          <div style={{ flex: 1, lineHeight: 1.25 }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Republic of the Philippines • Department of Education
            </div>
            <div style={{ fontSize: '11.5px', fontWeight: 900, color: '#07345f' }}>
              UNIVERSITY OF PERPETUAL HELP SYSTEM
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#475569' }}>
              Office of the Prefect of Student Discipline &amp; Guidance
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '3px 7px', borderRadius: '6px', fontSize: '9px', fontWeight: 800 }}>
            DepEd Order 40
          </div>
        </div>

        {/* Title Banner */}
        <div style={{ background: 'linear-gradient(135deg, #07345f 0%, #0f172a 100%)', color: '#ffffff', padding: '7px 12px', borderRadius: '8px', textAlign: 'center', fontWeight: 800, fontSize: '11px', letterSpacing: '0.03em', boxShadow: '0 2px 6px rgba(7, 52, 95, 0.2)' }}>
          NOTICE OF MANDATORY PARENT-TEACHER CONFERENCE
        </div>

        {/* Mock Case Meta Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', background: '#f8fafc', padding: '9px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '10px' }}>Student: </span>
            <strong style={{ color: '#0f172a' }}>Alexander Mendoza</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '10px' }}>Ref #: </span>
            <strong style={{ color: '#07345f' }}>SUM-2026-1048</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '10px' }}>Grade / Sec: </span>
            <strong style={{ color: '#0f172a' }}>Grade 10 - Rizal</strong>
          </div>
          <div>
            <span style={{ color: '#64748b', fontSize: '10px' }}>LRN: </span>
            <strong style={{ color: '#0f172a' }}>109283748201</strong>
          </div>
        </div>

        <div style={{ fontSize: '10.5px', color: '#475569', fontStyle: 'italic', lineHeight: 1.4, background: '#f0fdf4', borderLeft: '3px solid #10b981', padding: '6px 10px', borderRadius: '0 6px 6px 0' }}>
          "This serves as official notification requesting your urgent presence for a constructive disciplinary conference regarding the recorded infraction(s)..."
        </div>
      </div>
    );
  }

  if (previewType === 'summons_bundling') {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          padding: '14px',
          boxShadow: '0 8px 20px -4px rgba(7, 52, 95, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          marginTop: '6px'
        }}
      >
        {/* Bundled Checklist Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} color="#07345f" />
            <span style={{ fontWeight: 800, color: '#07345f', fontSize: '12px' }}>
              Bundled Offense Dossier (3 Incidents)
            </span>
          </div>
          <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800 }}>
            Repeat Offender
          </span>
        </div>

        {/* Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={14} color="#07345f" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Skipping Class / Truancy</span>
            </div>
            <span style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fde047', padding: '2px 7px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 800 }}>Serious</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={14} color="#07345f" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Improper Uniform / No ID</span>
            </div>
            <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 7px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 800 }}>Minor</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckSquare size={14} color="#07345f" />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>Unauthorized Campus Exit</span>
            </div>
            <span style={{ background: '#fef9c3', color: '#a16207', border: '1px solid #fde047', padding: '2px 7px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 800 }}>Serious</span>
          </div>
        </div>

        {/* Schedule & Venue Card */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1e40af', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
            <Calendar size={14} color="#2563eb" /> Oct 14, 2026 @ 10:30 AM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            <MapPin size={13} color="#2563eb" /> Rm 204 (Prefect Office)
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'summons_return_slip') {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          padding: '14px',
          boxShadow: '0 8px 20px -4px rgba(7, 52, 95, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          marginTop: '6px'
        }}
      >
        {/* Scissor Line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '10px', fontWeight: 700 }}>
          <Scissors size={14} color="#07345f" />
          <div style={{ flex: 1, borderBottom: '1.5px dashed #cbd5e1' }} />
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: '#07345f', fontWeight: 800 }}>Official Tear-off Return Slip</span>
        </div>

        {/* Return Slip Content */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#07345f', fontSize: '11.5px' }}>
              PARENT ACKNOWLEDGEMENT CONFIRMATION
            </span>
            <span style={{ fontSize: '9.5px', color: '#64748b', background: '#ffffff', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              Return to Prefect Office
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '10.5px', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <CheckSquare size={13} color="#059669" />
              <span><strong>I will attend</strong> the scheduled conference on Oct 14, 2026.</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Square size={13} color="#94a3b8" />
              <span>Request reschedule for valid institutional conflict.</span>
            </div>
          </div>

          {/* Signature field mockup */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #e2e8f0' }}>
            <div>
              <div style={{ fontSize: '9px', color: '#64748b' }}>Guardian Signature &amp; Date:</div>
              <div style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 700, color: '#07345f', fontSize: '13px' }}>
                Maria Mendoza — 10/10/26
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800, color: '#07345f', border: '1px solid #cbd5e1' }}>
              <QrCode size={12} /> #VT-RET-84920
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (previewType === 'case_resolution_sanctions') {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          padding: '14px',
          boxShadow: '0 8px 20px -4px rgba(7, 52, 95, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          marginTop: '6px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#059669" />
            <span style={{ fontWeight: 800, color: '#07345f', fontSize: '12px' }}>Case Clearance &amp; Sanctions Entry</span>
          </div>
          <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '3px 9px', borderRadius: '12px', fontSize: '10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> Resolved
          </span>
        </div>

        {/* Assigned Sanction Box */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Prescribed Institutional Action Taken:
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700 }}>
            <CheckSquare size={14} color="#10b981" /> 2-Hour Campus Service &amp; Reflection Essay
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 700 }}>
            <CheckSquare size={14} color="#10b981" /> Guidance Counseling Session Completed
          </div>
        </div>

        {/* Official Resolution Remarks */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px', fontSize: '10.5px', color: '#166534', lineHeight: 1.4 }}>
          <strong>Prefect Disciplinary Log:</strong> Student completed designated service hours; behavior contract signed by parent, adviser, and prefect. Case closed in good standing.
        </div>
      </div>
    );
  }

  if (previewType === 'case_resolution_certificate') {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fbfdf9 100%)',
          borderRadius: '12px',
          border: '2px solid #10b981',
          padding: '14px',
          boxShadow: '0 8px 24px -4px rgba(16, 185, 129, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '11px',
          marginTop: '6px'
        }}
      >
        {/* Certificate Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#047857', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <Award size={17} color="#059669" />
          <span>Certificate of Disciplinary Clearance</span>
        </div>

        <div style={{ textAlign: 'center', fontSize: '9.5px', color: '#64748b' }}>
          University of Perpetual Help System Manila — Guidance &amp; Prefect Office
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 12px', textAlign: 'center', lineHeight: 1.4, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '10px', color: '#64748b' }}>This officially certifies that:</div>
          <div style={{ fontSize: '14px', fontWeight: 900, color: '#07345f', margin: '3px 0' }}>Gabriel Torres</div>
          <div style={{ fontSize: '10px', color: '#475569' }}>Grade 10 - Section Bonifacio (LRN: 109283749102)</div>
          <div style={{ fontSize: '10px', color: '#059669', fontWeight: 800, marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} /> All incident obligations cleared &amp; closed in good standing.
          </div>
        </div>

        {/* Certificate Security Stamp Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: '#64748b', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
          <span>Control: <strong>#CLR-2026-0842</strong></span>
          <span style={{ color: '#059669', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '3px' }}>
            <ShieldCheck size={12} /> Verified Authentic Doc Proof
          </span>
        </div>
      </div>
    );
  }

  if (previewType === 'analytics_executive_report') {
    return (
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1.5px solid #cbd5e1',
          padding: '14px',
          boxShadow: '0 8px 20px -4px rgba(7, 52, 95, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontSize: '11px',
          marginTop: '6px'
        }}
      >
        {/* Header Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #07345f', paddingBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <BarChart3 size={15} color="#07345f" />
            <div style={{ fontWeight: 900, color: '#07345f', fontSize: '11.5px', letterSpacing: '-0.01em' }}>
              VIOTRACK ANNUAL DISCIPLINARY REPORT
            </div>
          </div>
          <span style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
            S.Y. 2025–2026
          </span>
        </div>

        {/* KPI Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', textAlign: 'center' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 4px' }}>
            <div style={{ fontSize: '8.5px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>TOTAL INCIDENTS</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>48</div>
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '6px 4px' }}>
            <div style={{ fontSize: '8.5px', color: '#065f46', fontWeight: 800, textTransform: 'uppercase' }}>RESOLVED</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#059669', marginTop: '1px' }}>94.2%</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '6px 4px' }}>
            <div style={{ fontSize: '8.5px', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase' }}>REPEAT INDEX</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#dc2626', marginTop: '1px' }}>2.1%</div>
          </div>
        </div>

        {/* Grade Breakdown Table with Perfect Column Alignment */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #cbd5e1', color: '#64748b', fontWeight: 800, fontSize: '9.5px', textTransform: 'uppercase' }}>
                <th style={{ textAlign: 'left', paddingBottom: '5px' }}>Grade Level</th>
                <th style={{ textAlign: 'center', paddingBottom: '5px', color: '#16a34a' }}>Minor</th>
                <th style={{ textAlign: 'center', paddingBottom: '5px', color: '#d97706' }}>Serious</th>
                <th style={{ textAlign: 'center', paddingBottom: '5px', color: '#dc2626' }}>Major</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#1e293b' }}>
                <td style={{ textAlign: 'left', padding: '5px 0', fontWeight: 700 }}>Junior High (G7–10)</td>
                <td style={{ textAlign: 'center', padding: '5px 0', fontWeight: 700, color: '#15803d' }}>18</td>
                <td style={{ textAlign: 'center', padding: '5px 0', fontWeight: 700, color: '#b45309' }}>9</td>
                <td style={{ textAlign: 'center', padding: '5px 0', fontWeight: 700, color: '#b91c1c' }}>2</td>
              </tr>
              <tr style={{ color: '#1e293b' }}>
                <td style={{ textAlign: 'left', padding: '5px 0 2px 0', fontWeight: 700 }}>Senior High (G11–12)</td>
                <td style={{ textAlign: 'center', padding: '5px 0 2px 0', fontWeight: 700, color: '#15803d' }}>11</td>
                <td style={{ textAlign: 'center', padding: '5px 0 2px 0', fontWeight: 700, color: '#b45309' }}>6</td>
                <td style={{ textAlign: 'center', padding: '5px 0 2px 0', fontWeight: 700, color: '#b91c1c' }}>2</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Signature & Accreditation Stamp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: '#64748b', paddingTop: '4px', borderTop: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FileCheck size={12} color="#07345f" />
            <span>Signed: <strong>Prefect of Discipline</strong></span>
          </div>
          <span style={{ color: '#07345f', fontWeight: 800, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '2px 6px', borderRadius: '4px' }}>
            Accreditation Ready PDF
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// Interactive Guided Tours Definitions matching actual DOM classes
const TOUR_SCENARIOS = {
  overview: {
    id: 'overview',
    title: 'Full VioTrack System Tour',
    description: 'Learn the primary navigation, analytics dashboard, and core disciplinary tools.',
    route: '/',
    steps: [
      {
        target: '.dash-greeting-area, .dash-top-header, .dash-header-bar, .dash-header-title-row, .page-header, h1',
        title: 'Welcome to VioTrack',
        content: 'VioTrack is a Student Monitoring System using QR Code and Dashboard for University of Perpetual Help System Manila.',
        badge: 'Getting Started',
        icon: Compass
      },
      {
        target: '.dash-stats-grid-4',
        title: 'Real-Time Incident Metrics',
        content: 'Monitor high-level KPI cards for Minor, Serious, and Major infractions, plus total resolution rates. Click any card to filter by severity!',
        badge: 'Analytics',
        icon: BarChart3
      },
      {
        target: '.dash-trends-grid',
        title: 'Trend Curves & Incident Distribution',
        content: 'Visualize disciplinary activity over time with interactive spline curve trends and segmented donut charts of the most common school violations.',
        badge: 'Visual Trends',
        icon: BarChart3
      },
      {
        target: '.dash-bottom-card:nth-child(1), .dash-offenders-list',
        title: 'Repeat & High-Risk Students',
        content: 'Dynamically ranks the top students by cumulative infraction weight. Click "View" to open their comprehensive disciplinary dossier and timeline.',
        badge: 'Risk Monitoring',
        icon: AlertTriangle
      },
      {
        target: '.dash-bottom-card:nth-child(2), .dash-sections-list, .dash-insight-banner',
        title: 'Violations by Grade & Section',
        content: 'Inspect disciplinary distribution across grade levels and sections, paired with automated Priority Guidance Alerts for timely advisory intervention.',
        badge: 'Class Distribution',
        icon: BookOpen
      },
      {
        target: '.dash-right-col-stack, .dash-calendar-card',
        title: 'School Calendar & Quick Actions',
        content: 'Track scheduled disciplinary hearings and campus events on the interactive calendar, or use Quick Actions to manage rosters and export data.',
        badge: 'Schedule & Actions',
        icon: Compass
      },
      {
        target: '.sidebar, .mobile-bottom-nav, nav',
        title: 'Quick Navigation Hub',
        content: 'Easily switch between QR Scanning for on-the-ground ID checks, Violations Registry, Student Rosters, and Institutional Data Print exports.',
        badge: 'Navigation',
        icon: Compass
      }
    ]
  },
  qr_scanner: {
    id: 'qr_scanner',
    title: 'QR Code Scanning & Field Patrol',
    description: 'Master how to scan student badges at school gates and hallways for instant lookup.',
    route: '/scan-qr',
    steps: [
      {
        target: '.scanner-viewport-wrapper, #reader-stream-container, .scanner-card',
        title: 'Live Camera Viewfinder',
        content: 'Point your camera at a student QR badge. VioTrack scans and validates student identity in real-time.',
        badge: 'Camera Scan',
        icon: QrCode
      },
      {
        target: '.manual-search-box, .manual-search-field',
        title: 'Manual Student ID / LRN Search',
        content: 'If the student does not have their badge, type their Student ID number or name here, or click one of the quick test chips for instant record lookup.',
        badge: 'Manual Lookup',
        icon: BookOpen
      },
      {
        target: '.scanner-controls-bar',
        title: 'Camera Controls & Upload',
        content: 'Easily mirror camera view, switch facing modes, pause live scanner stream, or upload saved QR code images directly.',
        badge: 'Controls & Upload',
        icon: AlertTriangle
      }
    ]
  },
  violations_log: {
    id: 'violations_log',
    title: 'Violations Registry & Filtering',
    description: 'Learn how to filter, search, and manage disciplinary incident records.',
    route: '/violations',
    steps: [
      {
        target: '.metric-cards-grid',
        title: 'Severity & Status Filters',
        content: 'Click on any KPI card (All, Investigation, or Resolved) to quickly filter the incident register by status, or use the search box and dropdown filters below.',
        badge: 'Filter & Search',
        icon: AlertTriangle
      },
      {
        target: '.mobile-filter-grid, .responsive-table-desktop',
        title: 'Multi-Field Search & Filter Toolbar',
        content: 'Search by student name, ID number, or offense title. Filter by School Year, Grade Level, Severity, or Status with real-time matching.',
        badge: 'Search & Sort',
        icon: BookOpen
      },
      {
        target: 'tbody tr:first-child, table',
        title: 'Incident Record Registry',
        content: 'View comprehensive details for each incident: student name, grade & section, offense details, reporting officer, and timestamps.',
        badge: 'Records',
        icon: FileText
      },
      {
        target: 'tbody tr:first-child td:last-child, tr td:last-child',
        title: 'Summons & Resolution Actions',
        content: 'Click "Status" to update case progress, "Summons" to create formal parent notices, or the green badge to view clearance certificates.',
        badge: 'Actions',
        icon: ShieldCheck
      }
    ]
  },
  parent_summons: {
    id: 'parent_summons',
    title: 'Parent Summons Notice Letter',
    description: 'Learn how to bundle violations and generate official conference notices with seals.',
    route: '/violations',
    steps: [
      {
        target: 'tbody tr:first-child td:last-child, tr td:last-child',
        title: 'Click the "Summons" Action Button',
        content: 'To generate an official conference notice for a student, click the "Summons" button on any incident record in the table.',
        badge: 'Action Trigger',
        icon: FileText
      },
      {
        target: null, // Centered clean modal with realistic visual letterhead sample
        title: 'Authentic Philippine Institutional Notice',
        content: 'Generates an official parent conference notice complete with Republic header, University of Perpetual Help seal, and DepEd compliance footnotes.',
        badge: 'Letterhead & Seals',
        icon: FileText,
        previewType: 'summons_letterhead'
      },
      {
        target: null,
        title: 'Multi-Violation Bundling & Schedule',
        content: 'Select multiple infractions for a repeat offender into one single formal notice. Customize the conference date, time, venue, and designated signatories.',
        badge: 'Customization',
        icon: CheckCircle2,
        previewType: 'summons_bundling'
      },
      {
        target: null,
        title: 'Direct PDF Download & Print',
        content: 'Download the summons as a crisp vector PDF or print directly. It includes an official tear-off Return Slip for parent confirmation.',
        badge: 'Export & Print',
        icon: QrCode,
        previewType: 'summons_return_slip'
      }
    ]
  },
  case_resolution: {
    id: 'case_resolution',
    title: 'Case Resolution & Clearance (Doc Proof)',
    description: 'Close disciplinary cases, assign corrective sanctions, and issue official certificates.',
    route: '/violations',
    steps: [
      {
        target: 'tbody tr:first-child td:last-child, tr td:last-child',
        title: 'Update Status & Mark Resolved',
        content: 'Click the "Status" button on an incident to update its state. Marking a case as "Resolved" unlocks official institutional clearance documentation.',
        badge: 'Status Update',
        icon: ShieldCheck
      },
      {
        target: null,
        title: 'Corrective Action & Sanctions',
        content: 'Select prescribed institutional sanctions (e.g. Verbal Warning, Campus Service, Counseling) and record resolution remarks.',
        badge: 'Sanction Presets',
        icon: ShieldCheck,
        previewType: 'case_resolution_sanctions'
      },
      {
        target: null,
        title: 'Official Certificate of Resolution',
        content: 'Generates an authentic Certificate of Disciplinary Resolution & Clearance with unique control number and digital verification hash.',
        badge: 'Certificate',
        icon: Award,
        previewType: 'case_resolution_certificate'
      }
    ]
  },
  analytics_print: {
    id: 'analytics_print',
    title: 'Institutional Analytics & Print Data',
    description: 'Export multi-page executive summaries, incident trend curves, and grade breakdown tables.',
    route: '/',
    steps: [
      {
        target: '.dash-stats-grid-4',
        title: 'Real-Time Incident Metrics',
        content: 'Monitor high-level KPI cards for Minor, Serious, and Major infractions, plus total resolution rates across the university.',
        badge: 'KPI Metrics',
        icon: BarChart3
      },
      {
        target: '.dash-trends-grid',
        title: 'Vector Charts & Incident Distribution',
        content: 'Visualize disciplinary activity over time with interactive spline curve trends and segmented donut charts of the most common school violations.',
        badge: 'Visual Trends',
        icon: BarChart3
      },
      {
        target: '.dash-bottom-card:nth-child(1), .dash-bottom-card:nth-child(2)',
        title: 'Repeat Risk Rankings & Grade Breakdown',
        content: 'Inspect disciplinary distribution across grade levels and sections, paired with automated Priority Guidance Alerts for timely advisory intervention.',
        badge: 'Grade & Risk',
        icon: BookOpen
      },
      {
        target: '.dash-header-bar, .page-banner-actions',
        title: 'Executive PDF Accreditation Report',
        content: 'Exports a multi-page PDF document including itemized incident logs, verification barcodes, and prefect signatures.',
        badge: 'Executive Report',
        icon: FileText,
        previewType: 'analytics_executive_report'
      }
    ]
  }
};

const TOUR_ICONS = {
  overview: Compass,
  qr_scanner: QrCode,
  violations_log: FileText,
  parent_summons: BookOpen,
  case_resolution: ShieldCheck,
  analytics_print: BarChart3
};

export const InteractiveTourGuide = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Modal and Tour States
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false);
  const [activeTour, setActiveTour] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [showSanctionsModal, setShowSanctionsModal] = useState(false);
  const [isPillMinimized, setIsPillMinimized] = useState(() => {
    return localStorage.getItem('viotrack_guide_minimized') === 'true';
  });
  const [completedTours, setCompletedTours] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('viotrack_completed_tours') || '[]');
    } catch {
      return [];
    }
  });

  const toggleMinimizePill = (e) => {
    e.stopPropagation();
    setIsPillMinimized((prev) => {
      const next = !prev;
      localStorage.setItem('viotrack_guide_minimized', String(next));
      return next;
    });
  };

  // Calculate Target Spotlight Rectangle
  const updateTargetRect = useCallback(() => {
    if (!activeTour) {
      setTargetRect(null);
      return;
    }

    const currentStep = activeTour.steps[currentStepIndex];
    if (!currentStep || !currentStep.target) {
      setTargetRect(null);
      return;
    }

    try {
      // Check comma-separated selectors in priority order
      const selectors = currentStep.target.split(',').map(s => s.trim()).filter(Boolean);
      let el = null;
      for (const selector of selectors) {
        const found = document.querySelector(selector);
        if (found) {
          const r = found.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            el = found;
            break;
          }
        }
      }

      if (el) {
        // Scroll target element smoothly into view if needed
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

        const rect = el.getBoundingClientRect();
        const padding = 10;
        const top = Math.max(0, rect.top - padding);
        const left = Math.max(0, rect.left - padding);
        const width = Math.min(window.innerWidth - left, rect.width + padding * 2);
        const height = Math.min(window.innerHeight - top, rect.height + padding * 2);

        // Only set rect if it has reasonable dimensions and is visible
        if (width > 20 && height > 20 && rect.top < window.innerHeight && rect.bottom > 0) {
          setTargetRect({
            top,
            left,
            width,
            height,
            rawBottom: rect.bottom,
            rawTop: rect.top,
            rawLeft: rect.left,
            rawWidth: rect.width
          });
          return;
        }
      }
    } catch {}

    // Target not found or invalid: fallback to clean centered modal (no spotlight cutout)
    setTargetRect(null);
  }, [activeTour, currentStepIndex]);

  // Handle Window Resize and Scroll during Active Tour
  useEffect(() => {
    if (!activeTour) return;
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    const t1 = setTimeout(updateTargetRect, 80);
    const t2 = setTimeout(updateTargetRect, 250);
    const t3 = setTimeout(updateTargetRect, 600);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeTour, currentStepIndex, updateTargetRect, location.pathname]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        endTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, currentStepIndex]);

  // Start Tour Handler
  const startTour = (tourKey) => {
    const scenario = TOUR_SCENARIOS[tourKey];
    if (!scenario) return;

    setIsGuideMenuOpen(false);
    setActiveTour(scenario);
    setCurrentStepIndex(0);

    // Route to target page if not already there
    if (scenario.route && location.pathname !== scenario.route) {
      navigate(scenario.route);
    }
  };

  const handleNextStep = () => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour Completed
      const newCompleted = Array.from(new Set([...completedTours, activeTour.id]));
      setCompletedTours(newCompleted);
      try {
        localStorage.setItem('viotrack_completed_tours', JSON.stringify(newCompleted));
      } catch {}
      setActiveTour(null);
      setCurrentStepIndex(0);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const endTour = () => {
    setActiveTour(null);
    setCurrentStepIndex(0);
  };

  const resetAllProgress = () => {
    setCompletedTours([]);
    localStorage.removeItem('viotrack_completed_tours');
  };

  const currentStep = activeTour ? activeTour.steps[currentStepIndex] : null;
  const progressPercent = activeTour
    ? Math.round(((currentStepIndex + 1) / activeTour.steps.length) * 100)
    : 0;

  const totalScenariosCount = Object.keys(TOUR_SCENARIOS).length;
  const completionPercent = Math.round((completedTours.length / totalScenariosCount) * 100);

  return (
    <>
      {/* 1. Floating System Guide Launcher Button (Bottom-Right, Collapsible) */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {isPillMinimized ? (
          <button
            type="button"
            className="guide-trigger-bubble"
            onClick={() => setIsGuideMenuOpen(true)}
            title="Open VioTrack User Guide & SOPs"
          >
            <HelpCircle size={20} className="guide-trigger-icon" />
            {completedTours.length > 0 && (
              <span className="guide-trigger-badge">
                {completedTours.length}
              </span>
            )}
          </button>
        ) : (
          <div className="guide-trigger-pill">
            <button
              type="button"
              className="guide-trigger-pill-btn"
              onClick={() => setIsGuideMenuOpen(true)}
              title="Open VioTrack User Guide & SOPs"
            >
              <HelpCircle size={16} className="guide-trigger-icon" />
              <span>Interactive Guide</span>
              <span className="guide-trigger-pill-badge">
                {completedTours.length}/{totalScenariosCount}
              </span>
            </button>

            <button
              type="button"
              className="guide-trigger-pill-minimize"
              onClick={toggleMinimizePill}
              title="Minimize guide button"
            >
              <Minimize2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Interactive Guide Hub Modal */}
      {isGuideMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.15s ease-out'
          }}
          onClick={() => setIsGuideMenuOpen(false)}
        >
          <div
            className="guide-hub-dialog"
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '88vh',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #cbd5e1'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Clean White Modal Header */}
            <div
              style={{
                padding: '18px 22px',
                background: '#ffffff',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  className="guide-hub-icon-badge"
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#07345f'
                  }}
                >
                  <Compass size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    VioTrack System Guide &amp; SOP Manual
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Interactive walkthroughs, sanction reference policies, and operational workflows
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGuideMenuOpen(false)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e2e8f0';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.color = '#64748b';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Progress Summary Strip */}
              <div className="guide-hub-progress-card" style={{ background: 'var(--bg-surface-elevated, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen className="guide-hub-progress-icon" size={16} color="var(--brand-blue, #07345f)" />
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                      Walkthrough Progress
                    </span>
                  </div>
                  <span className="guide-hub-progress-count" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-blue, #07345f)' }}>
                    {completedTours.length} of {totalScenariosCount} Complete ({completionPercent}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '5px', background: 'var(--bg-input, #e2e8f0)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div
                    className="guide-hub-policy-card"
                    data-complete={completedTours.length === totalScenariosCount}
                    style={{
                      width: `${completionPercent}%`,
                      height: '100%',
                      background: completedTours.length === totalScenariosCount ? '#10b981' : 'var(--brand-blue, #07345f)',
                      borderRadius: '9999px',
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>
              </div>

              {/* Sanctions Cheat Sheet Quick Action */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated, #ffffff)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="guide-hub-policy-icon" style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-input, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-blue, #07345f)', flexShrink: 0 }}>
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                      Institutional Sanctions Policy Matrix
                    </h4>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                      University handbook thresholds for Minor, Serious, and Major infractions.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="guide-hub-matrix-btn"
                  onClick={() => {
                    setIsGuideMenuOpen(false);
                    setShowSanctionsModal(true);
                  }}
                  style={{
                    background: 'var(--brand-blue, #07345f)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 13px',
                    borderRadius: '7px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>View Matrix</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Guided Walkthroughs Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Available Walkthroughs
                  </span>
                  {completedTours.length > 0 && (
                    <button
                      type="button"
                      onClick={resetAllProgress}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted, #64748b)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Reset Progress
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                  {Object.entries(TOUR_SCENARIOS).map(([key, scenario]) => {
                    const isDone = completedTours.includes(scenario.id);
                    const IconComponent = TOUR_ICONS[key] || Compass;

                    return (
                      <div
                        className="guide-hub-tour-card"
                        key={key}
                        onClick={() => startTour(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          background: 'var(--bg-surface-elevated, #ffffff)',
                          border: '1px solid var(--border-subtle, #e2e8f0)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-medium, #cbd5e1)';
                          e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle, #e2e8f0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: 'var(--bg-input, #f8fafc)',
                              border: '1px solid var(--border-subtle, #e2e8f0)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--brand-blue, #07345f)',
                              flexShrink: 0
                            }}
                          >
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
                                {scenario.title}
                              </span>
                              {isDone && (
                                <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #86efac', padding: '1px 6px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <CheckCircle2 size={10} strokeWidth={2.5} /> Completed
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', display: 'block', marginTop: '1px' }}>
                              {scenario.description}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted, #64748b)', fontWeight: 600, fontSize: '11.5px', flexShrink: 0, paddingLeft: '12px' }}>
                          <span>{scenario.steps.length} Steps</span>
                          <ChevronRight size={14} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Institutional Sanctions Policy Matrix Modal */}
      {showSanctionsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowSanctionsModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '800px',
              maxHeight: '88vh',
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '16px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle, #cbd5e1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sanctions Modal Header */}
            <div
              style={{
                padding: '18px 22px',
                background: 'var(--bg-surface, #ffffff)',
                borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  Institutional Infraction Severity &amp; Sanctions Matrix
                </h3>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                  University of Perpetual Help System Manila • Student Handbook Guidelines
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSanctionsModal(false)}
                style={{
                  background: 'var(--bg-input, #f8fafc)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  color: 'var(--text-muted, #64748b)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SANCTIONS_MATRIX.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: item.bg,
                    border: `1.5px solid ${item.border}`,
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: item.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.level}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary, #334155)', fontWeight: 500 }}>
                      Typical Infractions: <strong style={{ color: 'var(--text-primary, #0f172a)' }}>{item.examples.join(', ')}</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-surface, #ffffff)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #475569)', display: 'block', textTransform: 'uppercase' }}>1st Offense</span>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', display: 'block', marginTop: '2px' }}>{item.firstOffense}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #475569)', display: 'block', textTransform: 'uppercase' }}>2nd Offense</span>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', display: 'block', marginTop: '2px' }}>{item.secondOffense}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#b91c1c', display: 'block', textTransform: 'uppercase' }}>3rd Offense</span>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#b91c1c', display: 'block', marginTop: '2px' }}>{item.thirdOffense}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Spotlight Walkthrough Overlay */}
      {activeTour && currentStep && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        >
          {/* Separate backdrop panels keep the highlighted target fully clear */}
          {targetRect ? (
            <>
              {[
                {
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: `${targetRect.top}px`
                },
                {
                  top: `${targetRect.top + targetRect.height}px`,
                  left: 0,
                  width: '100vw',
                  height: `${Math.max(0, window.innerHeight - targetRect.top - targetRect.height)}px`
                },
                {
                  top: `${targetRect.top}px`,
                  left: 0,
                  width: `${targetRect.left}px`,
                  height: `${targetRect.height}px`
                },
                {
                  top: `${targetRect.top}px`,
                  left: `${targetRect.left + targetRect.width}px`,
                  width: `${Math.max(0, window.innerWidth - targetRect.left - targetRect.width)}px`,
                  height: `${targetRect.height}px`
                }
              ].map((panel, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  style={{
                    position: 'fixed',
                    ...panel,
                    background: 'rgba(0, 0, 0, 0.82)',
                    pointerEvents: 'none',
                    zIndex: 10000
                  }}
                />
              ))}

              {/* Glowing Target Ring */}
              <div
                className="guide-target-ring"
                style={{
                  position: 'fixed',
                  top: `${targetRect.top}px`,
                  left: `${targetRect.left}px`,
                  width: `${targetRect.width}px`,
                  height: `${targetRect.height}px`,
                  borderRadius: '14px',
                  border: '2.5px solid #ffffff',
                  boxShadow: '0 0 24px rgba(255, 255, 255, 0.4), inset 0 0 10px rgba(255, 255, 255, 0.15)',
                  pointerEvents: 'none',
                  zIndex: 10000,
                  transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              />
            </>
          ) : (
            <div
              className="guide-backdrop-fullscreen"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.82)',
                backdropFilter: 'blur(4px)',
                zIndex: 10000
              }}
            />
          )}

          {/* Floating Guidance Card with Intelligent Screen Placement */}
          <div
            className="guide-card-popover"
            style={{
              position: 'fixed',
              top: targetRect
                ? (window.innerHeight - targetRect.rawBottom >= 230
                    ? `${targetRect.rawBottom + 16}px`
                    : targetRect.rawTop >= 230
                      ? `${Math.max(16, targetRect.rawTop - 220)}px`
                      : 'auto')
                : '50%',
              bottom: targetRect && window.innerHeight - targetRect.rawBottom < 230 && targetRect.rawTop < 230
                ? '24px'
                : 'auto',
              left: targetRect
                ? `${Math.max(16, Math.min(window.innerWidth - (currentStep.previewType ? 456 : 396), targetRect.rawLeft + (targetRect.rawWidth - (currentStep.previewType ? 440 : 380)) / 2))}px`
                : '50%',
              transform: !targetRect ? 'translate(-50%, -50%)' : 'none',
              width: currentStep.previewType ? '440px' : '380px',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '18px',
              padding: '20px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)',
              zIndex: 10001,
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Progress Bar */}
            <div className="guide-card-progress-track" style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                className="guide-card-progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: '#07345f',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Header: Badge + Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  className="guide-card-badge"
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}
                >
                  {currentStep.badge || 'Guide'}
                </span>
                <span className="guide-card-step-count" style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  Step {currentStepIndex + 1} of {activeTour.steps.length}
                </span>
              </div>

              <button
                type="button"
                onClick={endTour}
                className="guide-card-close-btn"
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Exit tour (Esc)"
              >
                <X size={14} />
              </button>
            </div>

            {/* Title & Content */}
            <div>
              <h4 className="guide-card-title" style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {currentStep.title}
              </h4>
              <p className="guide-card-content" style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.55 }}>
                {currentStep.content}
              </p>
            </div>

            {/* Visual Sample Document & UI Preview Mockup */}
            <StepVisualPreview previewType={currentStep.previewType} />

            {/* Navigation Action Buttons */}
            <div className="guide-card-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '10px' }}>
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className="guide-btn-prev"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                className="guide-btn-next"
              >
                <span>{currentStepIndex === activeTour.steps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
