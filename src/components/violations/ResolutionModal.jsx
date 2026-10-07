import React, { useState, useMemo, useRef, useEffect } from 'react';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import { 
  CheckCircle2, 
  ShieldCheck, 
  FileCheck2, 
  Printer, 
  Download,
  Check, 
  Clock, 
  AlertTriangle, 
  ArrowUpRight, 
  User, 
  Calendar, 
  Sparkles, 
  Award, 
  Eye, 
  X,
  FileText,
  Shield,
  Layers,
  Building,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  ChevronLeft,
  SlidersHorizontal,
  Edit3
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
    sublabel: 'Evidence review & interviews ongoing',
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
    icon: Clock
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

/**
 * Builds the complete, authentic Philippine Institutional Clearance Certificate HTML for direct printing
 */
export const buildCertificateHtml = ({ record, status, sanction, resolutionNotes, officerName, officerTitle }) => {
  const studentFullName = `${record?.student?.fname || ''} ${record?.student?.mname ? record.student.mname + ' ' : ''}${record?.student?.lname || ''}`.trim().toUpperCase() || 'STUDENT RECORD';
  const resolutionDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const incidentDate = record?.date_reported 
    ? new Date(record.date_reported).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const controlNumber = `PHCM-OPD-CLR-2026-${String(record?.id || 1).padStart(5, '0')}`;
  const securityHash = `SHA256:7D9A4C${String(record?.id || 1).padStart(4, '0')}E83B10928`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate of Disciplinary Resolution - ${studentFullName}</title>
  <style>
    @page {
      size: portrait;
      margin: 10mm 14mm 10mm 14mm;
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
      padding: 12px 16px;
      font-size: 11pt;
      line-height: 1.4;
    }

    .doc-frame {
      border: 2px solid #07345f;
      padding: 18px 22px;
      position: relative;
      background: #ffffff;
    }
    .doc-frame-inner {
      border: 0.75px solid #07345f;
      padding: 16px 18px;
      position: relative;
    }

    .inst-header-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 6px;
    }
    .inst-logo {
      width: 62px;
      height: 62px;
      flex-shrink: 0;
    }
    .inst-center-text {
      flex: 1;
      text-align: center;
    }
    .inst-republic {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #334155;
      margin: 0;
    }
    .inst-school {
      font-size: 14pt;
      font-weight: bold;
      color: #07345f;
      margin: 2px 0;
      letter-spacing: 0.5px;
    }
    .inst-dept {
      font-size: 9.5pt;
      color: #1e293b;
      margin: 0;
    }
    .inst-subdept {
      font-size: 9pt;
      font-weight: bold;
      color: #475569;
      margin: 2px 0 0 0;
      text-transform: uppercase;
    }

    .header-divider {
      height: 2px;
      background: #07345f;
      margin: 8px 0 2px 0;
    }
    .header-subdivider {
      height: 0.75px;
      background: #07345f;
      margin: 0 0 12px 0;
    }

    .meta-bar {
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #64748b;
      margin-bottom: 12px;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 4px;
    }
    .meta-code {
      font-family: monospace;
      font-weight: bold;
      color: #0f172a;
    }

    .cert-title-container {
      text-align: center;
      margin: 12px 0 14px 0;
    }
    .cert-title-main {
      font-size: 15pt;
      font-weight: bold;
      color: #07345f;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
      text-decoration: underline;
    }
    .cert-title-sub {
      font-size: 9pt;
      font-style: italic;
      color: #475569;
      margin: 4px 0 0 0;
    }

    .case-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9.5pt;
    }
    .case-table th {
      background: #f8fafc;
      color: #07345f;
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
      font-weight: bold;
      width: 32%;
    }
    .case-table td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      color: #0f172a;
    }

    .body-statement {
      text-align: justify;
      margin: 12px 0;
      font-size: 10pt;
      line-height: 1.5;
    }

    .resolution-box {
      border: 1px solid #94a3b8;
      background: #f8fafc;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 9.5pt;
      border-radius: 4px;
    }
    .resolution-box-title {
      font-weight: bold;
      color: #07345f;
      margin-bottom: 4px;
      text-transform: uppercase;
      font-size: 8.5pt;
      letter-spacing: 0.5px;
    }

    .sig-seal-container {
      margin-top: 24px;
      padding-top: 8px;
    }
    .sig-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
    }
    .sig-cell {
      width: 33.33%;
      padding: 0 10px;
      vertical-align: bottom;
    }
    .sig-line {
      border-top: 1.5px solid #0f172a;
      padding-top: 4px;
      font-weight: bold;
      font-size: 9.5pt;
      color: #0f172a;
    }
    .sig-title {
      font-size: 8.5pt;
      color: #475569;
    }

    .cert-footer {
      margin-top: 20px;
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      font-size: 7.5pt;
      color: #64748b;
      text-align: justify;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="doc-frame">
    <div class="doc-frame-inner">

      <!-- Header Section -->
      <div class="inst-header-wrapper">
        <img src="/images/phcm-logo.png" alt="PHCM Logo Left" class="inst-logo" onerror="this.style.display='none'" />
        <div class="inst-center-text">
          <p class="inst-republic">Republic of the Philippines</p>
          <h1 class="inst-school">University of Perpetual Help System Manila</h1>
          <p class="inst-dept">1240 V. Concepcion St., Sampaloc, Manila | Tel: (02) 8731-8199</p>
          <p class="inst-subdept">OFFICE OF THE PREFECT OF DISCIPLINE &amp; STUDENT WELFARE</p>
        </div>
        <img src="/images/phcm-seal.png" alt="PHCM University Seal" class="inst-logo" onerror="this.style.display='none'" />
      </div>

      <div class="header-divider"></div>
      <div class="header-subdivider"></div>

      <!-- Reference & Metadata -->
      <div class="meta-bar">
        <span>CONTROL NUMBER: <span class="meta-code">${controlNumber}</span></span>
        <span>DATE OF ISSUANCE: <span class="meta-code">${resolutionDate}</span></span>
        <span>STATUS: <span class="meta-code" style="color: ${status === 'Resolved' ? '#15803d' : '#07345f'}; text-transform: uppercase;">${status}</span></span>
      </div>

      <!-- Certificate Title -->
      <div class="cert-title-container">
        <h2 class="cert-title-main">CERTIFICATE OF DISCIPLINARY RESOLUTION &amp; CLEARANCE</h2>
        <p class="cert-title-sub">Official Institutional Notice of Restorative Counseling &amp; Infraction Remediation</p>
      </div>

      <!-- Student & Case Information Matrix -->
      <table class="case-table">
        <tr>
          <th>Student Full Name:</th>
          <td><strong>${studentFullName}</strong></td>
        </tr>
        <tr>
          <th>Student ID / Grade &amp; Section:</th>
          <td>${record?.student?.student_id || record?.student?.lrn || 'N/A'} &nbsp;|&nbsp; Grade ${record?.student?.grade || '10'} - ${record?.student?.section || 'General'}</td>
        </tr>
        <tr>
          <th>Case Incident Reference:</th>
          <td>Incident #${record?.id || 1} &nbsp;(Date Reported: ${incidentDate})</td>
        </tr>
        <tr>
          <th>Infraction / Violation:</th>
          <td><strong>${record?.violation?.title || record?.offense || 'General Infraction'}</strong> (${record?.violation?.type || record?.severity || 'Minor'} Offense)</td>
        </tr>
        <tr>
          <th>Final Case Disposition:</th>
          <td><strong style="color: ${status === 'Resolved' ? '#15803d' : '#07345f'}; text-transform: uppercase;">${status}</strong></td>
        </tr>
      </table>

      <!-- Formal Body Statement -->
      <p class="body-statement">
        <strong>TO WHOM IT MAY CONCERN:</strong><br />
        This is to certify that the disciplinary case for the student referenced above has undergone formal evaluation and due process in accordance with the Student Code of Conduct and Institutional Guidelines of University of Perpetual Help System Manila. Restorative guidance counseling and corrective remediation measures have been formally administered.
      </p>

      <!-- Resolution & Sanctions Box -->
      <div class="resolution-box">
        <div class="resolution-box-title">ASSIGNED SANCTION &amp; CORRECTIVE MEASURES FULFILLED:</div>
        <div style="color: #0f172a; margin-bottom: 6px;">
          ${sanction || 'Verbal Warning, Guided Reflection & Standard Compliance Counseling Completed.'}
        </div>
        ${resolutionNotes ? `
        <div class="resolution-box-title" style="margin-top: 8px;">COUNSELING OUTCOMES &amp; OFFICIAL FINDINGS:</div>
        <div style="color: #334155; font-style: italic;">
          "${resolutionNotes}"
        </div>
        ` : ''}
      </div>

      <p class="body-statement" style="font-size: 9.5pt; margin-top: 6px;">
        ${status === 'Resolved' 
          ? 'With the full satisfaction of assigned restorative measures, the student is hereby issued official disciplinary clearance for the aforementioned incident. The student in good standing may proceed with standard academic and co-curricular entitlements.' 
          : 'This case is currently being monitored in accordance with prescribed guidance follow-up timelines.'}
      </p>

      <!-- Signatories Matrix -->
      <div class="sig-seal-container">
        <table class="sig-table">
          <tr>
            <td class="sig-cell">
              <div class="sig-line">${officerName || 'Sheryl B. Gamboa, LPT'}</div>
              <div class="sig-title">${officerTitle || 'Prefect of Discipline'}</div>
            </td>
            <td class="sig-cell">
              <div class="sig-line">Class Adviser / Counselor</div>
              <div class="sig-title">Guidance &amp; Counseling Office</div>
            </td>
            <td class="sig-cell">
              <div class="sig-line">Parent / Legal Guardian</div>
              <div class="sig-title">Conforme &amp; Acknowledged</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Legal Footnote -->
      <div class="cert-footer">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
          <span><strong>SECURITY VERIFICATION CODE:</strong> ${securityHash}</span>
          <span><strong>SYSTEM ARCHIVE:</strong> VIOTRACK INSTITUTIONAL RECORD</span>
        </div>
        <strong>DOCUMENT SECURITY &amp; DATA PRIVACY NOTICE:</strong> This is an official institutional clearance issued by the Office of the Prefect of Discipline. Any unauthorized alteration, forgery, or erasure renders this certificate null and void and is subject to administrative and legal sanctions under Republic Act No. 10173 (Data Privacy Act of 2012) and the Philippine Revised Penal Code.
      </div>

    </div>
  </div>
</body>
</html>`;
};

/**
 * Printing helper with hidden iframe + Blob fallback
 */
export const printCertificateDocument = (htmlContent) => {
  try {
    const existing = document.getElementById('viotrack-print-frame');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'viotrack-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const printWin = window.open(url, '_blank');
        if (printWin) {
          printWin.onload = () => {
            printWin.focus();
            printWin.print();
          };
        }
      }
    }, 300);
  } catch (err) {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWin = window.open(url, '_blank');
    if (printWin) {
      printWin.onload = () => {
        printWin.focus();
        printWin.print();
      };
    }
  }
};

export const ResolutionModal = ({ isOpen, onClose, record, onUpdated }) => {
  const { user } = useAuth();
  const { success, error } = useNotification();
  const printRef = useRef(null);
  
  const [status, setStatus] = useState(record?.status || 'Resolved');
  const [sanction, setSanction] = useState(record?.sanction || '');
  const [resolutionNotes, setResolutionNotes] = useState(record?.resolution_notes || '');
  const [officerName, setOfficerName] = useState(user?.name || user?.email?.split('@')[0] || 'Sheryl B. Gamboa, LPT');
  const [officerTitle, setOfficerTitle] = useState('Prefect of Discipline');
  const [loading, setLoading] = useState(false);

  // Mobile Drawer Toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Viewport and Paper Measurements for Perfect Mobile Scaling
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);
  const [paperHeight, setPaperHeight] = useState(900);

  // Canvas Pan & Zoom states
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const pinchDistanceRef = useRef(null);
  const pinchStartZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  // Sync state when record changes or modal opens
  useEffect(() => {
    if (record) {
      setStatus(record.status || 'Resolved');
      setSanction(record.sanction || '');
      setResolutionNotes(record.resolution_notes || '');
    }
  }, [record, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, [isOpen]);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
      if (printRef.current) {
        setPaperHeight(printRef.current.offsetHeight || 900);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsMobileDrawerOpen(false);
      const timer = setTimeout(() => {
        if (printRef.current) {
          setPaperHeight(printRef.current.offsetHeight || 900);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, record, status, sanction, resolutionNotes, officerName, officerTitle]);

  if (!record || !isOpen) return null;

  const studentFullName = `${record.student?.fname || ''} ${record.student?.mname ? record.student.mname + ' ' : ''}${record.student?.lname || ''}`.trim().toUpperCase() || 'STUDENT RECORD';
  const currentDateFormatted = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const incidentDateFormatted = record.date_reported 
    ? new Date(record.date_reported).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : currentDateFormatted;
  const controlNumber = `PHCM-OPD-CLR-2026-${String(record.id || 1).padStart(5, '0')}`;
  const securityHash = `SHA256:7D9A4C${String(record.id || 1).padStart(4, '0')}E83B10928`;

  const isMobile = viewportWidth <= 768;
  const baseScale = isMobile ? Math.min(1, Math.max(0.38, (viewportWidth - 24) / 680)) : 1;
  const effectiveScale = Number((baseScale * zoom).toFixed(3));

  // Live Zoom & Pan State Refs to prevent stutter & eliminate React re-render bottlenecks during dragging
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  const effectiveScaleRef = useRef(effectiveScale);
  const rafIdRef = useRef(null);
  const isPinchingRef = useRef(false);

  useEffect(() => {
    zoomRef.current = zoom;
    effectiveScaleRef.current = effectiveScale;
  }, [zoom, effectiveScale]);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const applyLiveTransform = (currentPanX, currentPanY, currentScale) => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(() => {
      if (printRef.current) {
        printRef.current.style.transform = `scale(${currentScale}) translate3d(${currentPanX}px, ${currentPanY}px, 0)`;
      }
    });
  };

  // Mouse Handlers (Desktop)
  const handleMouseDown = (e) => {
    if (e.button !== 0 || e.target.closest('button, input, textarea, select, a, [role="button"]')) return;
    setIsDragging(true);
    if (printRef.current) {
      printRef.current.style.transition = 'none';
      printRef.current.style.willChange = 'transform';
    }
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialPanX: panRef.current.x,
      initialPanY: panRef.current.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    const newX = dragStartRef.current.initialPanX + deltaX;
    const newY = dragStartRef.current.initialPanY + deltaY;
    panRef.current = { x: newX, y: newY };
    applyLiveTransform(newX, newY, effectiveScaleRef.current);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setPan({ ...panRef.current });
      if (printRef.current) {
        printRef.current.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)';
        printRef.current.style.willChange = 'auto';
      }
    }
  };

  // Touch Handlers (Mobile)
  const handleTouchStart = (e) => {
    if (e.target.closest('button, input, textarea, select, a, [role="button"]')) return;

    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchDistanceRef.current = dist;
      pinchStartZoomRef.current = zoomRef.current;
      isPinchingRef.current = true;
      setIsDragging(false);
      if (printRef.current) {
        printRef.current.style.transition = 'none';
        printRef.current.style.willChange = 'transform';
      }
    } else if (e.touches.length === 1) {
      isPinchingRef.current = false;
      const touch = e.touches[0];
      const now = Date.now();

      // Double-tap zoom toggle
      if (
        now - lastTapTimeRef.current < 280 &&
        dragStartRef.current.tapX !== undefined &&
        Math.hypot(touch.clientX - dragStartRef.current.tapX, touch.clientY - dragStartRef.current.tapY) < 25
      ) {
        const nextZoom = zoomRef.current > 1.05 ? 1 : 1.35;
        setZoom(nextZoom);
        setPan({ x: 0, y: 0 });
        panRef.current = { x: 0, y: 0 };
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      setIsDragging(true);
      if (printRef.current) {
        printRef.current.style.transition = 'none';
        printRef.current.style.willChange = 'transform';
      }
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tapX: touch.clientX,
        tapY: touch.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchDistanceRef.current && isPinchingRef.current) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (currentDist > 0 && pinchDistanceRef.current > 0) {
        const ratio = currentDist / pinchDistanceRef.current;
        const targetZoom = Math.min(2.5, Math.max(0.6, Math.round(pinchStartZoomRef.current * ratio * 100) / 100));
        zoomRef.current = targetZoom;
        const currentScale = Number((baseScale * targetZoom).toFixed(3));
        effectiveScaleRef.current = currentScale;
        applyLiveTransform(panRef.current.x, panRef.current.y, currentScale);
      }
    } else if (e.touches.length === 1 && isDragging && !isPinchingRef.current) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      const newX = dragStartRef.current.initialPanX + deltaX;
      const newY = dragStartRef.current.initialPanY + deltaY;
      panRef.current = { x: newX, y: newY };
      applyLiveTransform(newX, newY, effectiveScaleRef.current);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      if (isPinchingRef.current) {
        setZoom(zoomRef.current);
      }
      pinchDistanceRef.current = null;
      isPinchingRef.current = false;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      dragStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        tapX: touch.clientX,
        tapY: touch.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y
      };
    } else if (e.touches.length === 0) {
      if (isDragging) {
        setIsDragging(false);
        setPan({ ...panRef.current });
      }
      if (printRef.current) {
        printRef.current.style.transition = 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)';
        printRef.current.style.willChange = 'auto';
      }
    }
  };

  const handleZoomIn = () => {
    const nextZoom = Math.min(2.5, Math.round((zoomRef.current + 0.15) * 100) / 100);
    setZoom(nextZoom);
  };

  const handleZoomOut = () => {
    const nextZoom = Math.max(0.6, Math.round((zoomRef.current - 0.15) * 100) / 100);
    setZoom(nextZoom);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    if (printRef.current) {
      const currentScale = Number((baseScale * 1).toFixed(3));
      effectiveScaleRef.current = currentScale;
      printRef.current.style.transform = `scale(${currentScale}) translate3d(0px, 0px, 0)`;
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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

  // High Quality Client-Side PDF Generation
  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('UNIVERSITY OF PERPETUAL HELP SYSTEM MANILA', 105, 11, { align: 'center' });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline', 105, 17, { align: 'center' });
      doc.text('VIOTRACK DISCIPLINARY & STUDENT WELFARE MANAGEMENT SYSTEM', 105, 22, { align: 'center' });

      // Metadata Bar
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.text(`Control No: ${controlNumber}`, 14, 34);
      doc.text(`Date Issued: ${currentDateFormatted}`, 196, 34, { align: 'right' });

      // Title
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('CERTIFICATE OF DISCIPLINARY RESOLUTION & CLEARANCE', 105, 43, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('(Official Restorative Intervention & Case Disposition)', 105, 48, { align: 'center' });

      // Recipient / Student Information Box
      doc.autoTable({
        startY: 54,
        margin: { left: 14, right: 14 },
        head: [['Student Details & Case Record Information', '']],
        body: [
          ['Student Name:', studentFullName],
          ['Student ID:', record.student?.student_id || record.student?.lrn || 'N/A'],
          ['Grade & Section:', `Grade ${record.student?.grade || '10'} - ${record.student?.section || 'General'}`],
          ['Incident Reference:', `Incident #${record.id} (Date: ${incidentDateFormatted})`],
          ['Infraction / Violation:', `${record.violation?.title || record.offense || 'General Infraction'} (${record.violation?.type || record.severity || 'Minor'} Offense)`],
          ['Final Case Status:', status.toUpperCase()]
        ],
        theme: 'plain',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: 'bold', textColor: [15, 23, 42] },
          1: { cellWidth: 127 }
        }
      });

      let currentY = doc.lastAutoTable.finalY + 8;

      // Formal Statement
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      const statement = 'This is to formally certify that the disciplinary case for the student referenced above has undergone evaluation and due process in accordance with the Student Code of Conduct and Institutional Guidelines of University of Perpetual Help System Manila. Assigned corrective measures and restorative guidance counseling have been completed.';
      const splitStatement = doc.splitTextToSize(statement, 182);
      doc.text(splitStatement, 14, currentY);
      currentY += (splitStatement.length * 5) + 6;

      // Resolution & Sanctions Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, currentY, 182, 38, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ASSIGNED SANCTION & REMEDIATION COMPLETED:', 20, currentY + 7);
      doc.setFont('helvetica', 'normal');
      doc.text(sanction || 'Verbal Warning, Guided Reflection & Standard Compliance Counseling Completed.', 20, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('COUNSELING OUTCOMES & OFFICIAL NOTES:', 20, currentY + 22);
      doc.setFont('helvetica', 'normal');
      const sNotes = resolutionNotes || 'Student acknowledged infraction, agreed to code of conduct compliance, and successfully fulfilled assigned restorative tasks.';
      const splitNotes = doc.splitTextToSize(sNotes, 170);
      doc.text(splitNotes, 20, currentY + 28);

      currentY += 46;

      // Clearance declaration
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const clearanceText = status === 'Resolved'
        ? 'With the full satisfaction of assigned restorative measures, the student is hereby issued official disciplinary clearance for the aforementioned incident.'
        : 'This case is currently being monitored in accordance with prescribed guidance follow-up timelines.';
      doc.text(clearanceText, 14, currentY);
      currentY += 16;

      // Signatures
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(officerName, 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(officerTitle, 14, currentY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Class Adviser / Counselor', 80, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Guidance & Counseling Office', 80, currentY + 4);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Parent / Legal Guardian', 148, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Conforme & Acknowledged', 148, currentY + 4);

      // Security Footer
      const tearOffY = Math.max(currentY + 24, 252);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, tearOffY, 196, tearOffY);

      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`SECURITY VERIFICATION CODE: ${securityHash}   |   SYSTEM ARCHIVE: VIOTRACK INSTITUTIONAL RECORD`, 105, tearOffY + 5, { align: 'center' });
      doc.text('Official institutional clearance certificate issued by the Office of the Prefect of Discipline.', 105, tearOffY + 10, { align: 'center' });

      doc.save(`Disciplinary_Resolution_Certificate_${studentFullName.replace(/\s+/g, '_')}_${record.id}.pdf`);
      success('Case Resolution PDF Certificate successfully downloaded!');
    } catch (err) {
      error('Failed to generate PDF: ' + err.message);
    }
  };

  const handlePrintResolutionCertificate = () => {
    const html = buildCertificateHtml({
      record,
      status,
      sanction,
      resolutionNotes,
      officerName,
      officerTitle
    });
    printCertificateDocument(html);
  };

  const studentName = `${record.student?.fname || ''} ${record.student?.lname || ''}`.trim();
  const avatarUrl = record.student?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName || 'Student')}&background=0f172a&color=fff&size=100&bold=true`;

  const getSeverityStyle = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('major') || t.includes('critical') || t.includes('severe')) {
      return { bg: '#fef2f2', border: '#fecaca', color: '#dc2626' };
    }
    if (t.includes('serious')) {
      return { bg: '#fef9c3', border: '#fde047', color: '#a16207' };
    }
    return { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' };
  };

  const severityStyle = getSeverityStyle(record.violation?.type);

  // Shared form content for both desktop sidebar and mobile slide-up drawer
  const renderFormContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Student & Incident Bio Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 14px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={avatarUrl}
            alt={studentName}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              objectFit: 'cover',
              border: '1.5px solid #cbd5e1',
              flexShrink: 0
            }}
            onError={(e) => {
              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(studentName || 'Student')}&background=0f172a&color=fff&size=100&bold=true`;
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {studentName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              Student ID: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>{record.student?.student_id || record.student?.lrn || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '6px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px'
          }}
        >
          <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {record.violation?.title || record.offense || 'Infraction'}
          </span>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '2px 6px',
              borderRadius: '4px',
              background: severityStyle.bg,
              border: `1px solid ${severityStyle.border}`,
              color: severityStyle.color,
              flexShrink: 0
            }}
          >
            {record.violation?.type || record.severity || 'Minor'}
          </span>
        </div>
      </div>

      {/* 1. Case Resolution Status */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
          <Shield size={12} color="#0f172a" /> Resolution Status
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
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
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 9px',
                  borderRadius: '8px',
                  border: isSelected ? `2px solid ${cfg.color}` : '1.5px solid #e2e8f0',
                  background: isSelected ? cfg.bg : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 2px 6px ${cfg.color}20` : 'none',
                  textAlign: 'left'
                }}
              >
                <IconComponent size={13} color={isSelected ? cfg.color : '#64748b'} />
                <span style={{ fontSize: '11px', fontWeight: isSelected ? 800 : 600, color: isSelected ? cfg.color : '#334155' }}>
                  {key === 'Resolved' ? 'Resolved' : key === 'Investigation' ? 'Investigating' : key}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Sanction / Remediation Completed */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            <Award size={12} color="#0f172a" /> Fulfilled Sanction
          </label>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Click presets</span>
        </div>
        <input
          type="text"
          value={sanction}
          onChange={(e) => setSanction(e.target.value)}
          placeholder="e.g. Verbal warning, 1-hour campus reflection"
          style={{
            width: '100%',
            height: '36px',
            borderRadius: '7px',
            fontSize: '12px',
            border: '1.5px solid #cbd5e1',
            padding: '0 10px',
            marginBottom: '6px',
            boxSizing: 'border-box',
            background: '#ffffff'
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {SANCTION_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplyPreset(p)}
              style={{
                background: sanction === p ? '#0f172a' : '#ffffff',
                color: sanction === p ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: sanction === p ? '#0f172a' : '#cbd5e1',
                borderRadius: '5px',
                padding: '3px 7px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.12s ease'
              }}
            >
              + {p}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Resolution Notes / Outcomes */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
            <FileText size={12} color="#0f172a" /> Resolution Summary
          </label>
          <span style={{ fontSize: '10px', color: '#64748b' }}>Official Record</span>
        </div>
        <textarea
          rows={3}
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Document student reflection, counseling outcomes, or guardian agreements..."
          style={{
            width: '100%',
            borderRadius: '7px',
            fontSize: '12px',
            padding: '8px 10px',
            border: '1.5px solid #cbd5e1',
            boxSizing: 'border-box',
            lineHeight: 1.4,
            marginBottom: '6px',
            resize: 'vertical',
            minHeight: '55px',
            maxHeight: '95px',
            background: '#ffffff'
          }}
        />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {NOTE_SNIPPETS.map((snip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAppendSnippet(snip)}
              style={{
                background: '#ffffff',
                color: '#475569',
                border: '1px dashed #cbd5e1',
                borderRadius: '5px',
                padding: '3px 6px',
                fontSize: '10px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                textAlign: 'left'
              }}
            >
              + {snip.length > 32 ? snip.substring(0, 32) + '...' : snip}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Presiding Officer Signatory */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
          Presiding Officer Signatory
        </span>
        <input
          type="text"
          value={officerName}
          placeholder="Officer Name (e.g. Sheryl B. Gamboa, LPT)"
          onChange={(e) => setOfficerName(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 9px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '12px',
            fontWeight: 600,
            boxSizing: 'border-box'
          }}
        />
        <input
          type="text"
          value={officerTitle}
          placeholder="Designation (e.g. Prefect of Discipline)"
          onChange={(e) => setOfficerTitle(e.target.value)}
          style={{
            width: '100%',
            padding: '5px 9px',
            borderRadius: '6px',
            border: '1px solid #cbd5e1',
            fontSize: '11.5px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Save Button (prominent in mobile drawer) */}
      <button
        type="button"
        className="res-drawer-save-btn"
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: '4px',
          padding: '10px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 800,
          border: 'none',
          background: status === 'Resolved' ? '#10b981' : '#0f172a',
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          boxShadow: status === 'Resolved' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(15, 23, 42, 0.25)'
        }}
      >
        <Check size={15} strokeWidth={2.5} />
        {loading ? 'Saving...' : 'Save & Finalize Resolution'}
      </button>
    </div>
  );

  return (
    <div
      className="modal-backdrop-smooth"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        transform: 'translateZ(0)',
        contain: 'strict'
      }}
      onClick={onClose}
    >
      <style>{`
        .res-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
          background: #ffffff;
        }
        .res-left {
          width: 380px;
          border-right: 1px solid #e2e8f0;
          padding: 18px 20px;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 14px;
          flex-shrink: 0;
          overflow-y: auto;
        }
        .res-right {
          flex: 1;
          padding: 24px 20px;
          background: #eef2f6;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        .res-preview-paper {
          width: 100%;
          max-width: 680px;
          background: #ffffff;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10);
          border-radius: 12px;
          padding: 32px 36px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
          color: #0f172a;
          line-height: 1.55;
          box-sizing: border-box;
          transform: translate3d(0, 0, 0);
          contain: layout paint;
          user-select: none;
        }
        .res-letterhead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 4px;
        }
        .res-univ-text {
          flex: 1;
          text-align: center;
        }
        .res-univ-logo {
          width: 46px;
          height: 46px;
          object-fit: contain;
          flex-shrink: 0;
        }
        .res-canvas-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          max-width: 680px;
          margin-bottom: 12px;
          padding: 6px 12px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .res-canvas-tools-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .res-canvas-btn {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          color: #334155;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.15s ease;
        }
        .res-canvas-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .res-canvas-badge {
          background: #f1f5f9;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 800;
          font-family: monospace;
        }
        .res-footer {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .res-footer-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .res-footer-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .res-btn-close {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
        }
        .res-btn-close:hover {
          background: #f1f5f9;
        }

        /* Mobile Viewer Floating Action Controls */
        .res-mobile-zoom-pill {
          display: none;
        }
        .res-mobile-fab {
          display: none;
        }
        .res-mobile-drawer {
          display: none;
        }

        /* Clean Light Mode Mobile Document Viewer (<= 768px) */
        @media (max-width: 768px) {
          .modal-backdrop-smooth {
            padding: 0 !important;
            background: #f1f5f9 !important;
          }
          .res-dialog {
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
            background: #f1f5f9 !important;
          }

          /* Clean Light Mode Header Bar */
          .res-header-desktop {
            background: #ffffff !important;
            color: #0f172a !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 10px 14px !important;
            min-height: 52px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
          }
          .res-header-title {
            color: #0f172a !important;
            font-size: 13.5px !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            font-family: inherit !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .res-header-sub {
            display: none !important;
          }

          /* Left column is hidden on mobile and moved to slide-up drawer */
          .res-left {
            display: none !important;
          }

          /* Right column becomes light mode document canvas */
          .res-right {
            padding: 14px 10px 90px !important;
            background: #eef2f6 !important;
            width: 100% !important;
            min-height: 0 !important;
            flex: 1 !important;
            display: flex !important;
            align-items: flex-start !important;
            touch-action: pan-x pan-y pinch-zoom !important;
          }

          .res-canvas-toolbar {
            display: none !important;
          }

          .res-footer {
            display: none !important;
          }

          /* Floating Mobile Touch Zoom Controls */
          .res-mobile-zoom-pill {
            display: flex;
            position: fixed;
            bottom: 22px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            color: #0f172a;
            border: 1.5px solid #cbd5e1;
            padding: 5px 8px;
            border-radius: 9999px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            backdrop-filter: blur(12px);
          }
          .res-mobile-zoom-btn {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            color: #334155;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.15s ease;
          }
          .res-mobile-zoom-btn:active {
            background: #e2e8f0;
            transform: scale(0.92);
          }
          .res-mobile-zoom-indicator {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
            font-family: monospace;
            padding: 0 4px;
            cursor: pointer;
          }

          .res-mobile-fab {
            display: flex;
            position: fixed;
            bottom: 20px;
            right: 16px;
            z-index: 1001;
            width: 50px;
            height: 50px;
            border-radius: 16px;
            background: #c28b38;
            color: #ffffff;
            border: none;
            box-shadow: 0 8px 24px rgba(194, 139, 56, 0.45);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .res-mobile-fab:active {
            transform: scale(0.92);
          }

          /* Mobile Slide-Up Edit Drawer */
          .res-mobile-drawer {
            display: flex;
            flex-direction: column;
            position: fixed;
            inset: 0;
            z-index: 1050;
            background: rgba(15, 23, 42, 0.6);
            backdrop-filter: blur(4px);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
          }
          .res-mobile-drawer.open {
            opacity: 1;
            pointer-events: auto;
          }
          .res-mobile-drawer-content {
            margin-top: auto;
            max-height: 86vh;
            background: #ffffff;
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            transform: translateY(100%);
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 -10px 40px rgba(0,0,0,0.25);
          }
          .res-mobile-drawer.open .res-mobile-drawer-content {
            transform: translateY(0);
          }
          .res-drawer-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
          }
          .res-drawer-body {
            padding: 18px 20px;
            overflow-y: auto;
            flex: 1;
          }
        }
      `}</style>
      <div
        className="modal-content-smooth res-dialog"
        style={{
          width: '100%',
          maxWidth: '1160px',
          height: '92vh',
          maxHeight: '880px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          transform: 'translate3d(0, 0, 0)',
          contain: 'layout paint'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar: Only Print & Close on the right */}
        <div
          className="res-header-desktop"
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
            gap: '12px'
          }}
        >
          {/* Left: Back Arrow + Document Title Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#334155',
                cursor: 'pointer',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#334155';
              }}
              title="Close viewer"
            >
              <ChevronLeft size={19} strokeWidth={2.4} />
            </button>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCheck2 size={15} color="#07345f" style={{ flexShrink: 0 }} />
                <h3 className="res-header-title" style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                  {studentName || 'Student'} — Case Resolution &amp; Clearance Doc Proof
                </h3>
              </div>
              <span className="res-header-sub" style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                Incident #{record.id} • Official Institutional Certificate of Disciplinary Resolution
              </span>
            </div>
          </div>

          {/* Right: Only Print Button + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={handlePrintResolutionCertificate}
              style={{
                background: '#0f172a',
                border: '1px solid #0f172a',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '0 14px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.15)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1e293b';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0f172a';
              }}
              title="Print Resolution Document"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#64748b',
                cursor: 'pointer',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fee2e2';
                e.currentTarget.style.borderColor = '#fca5a5';
                e.currentTarget.style.color = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#64748b';
              }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body: 2-Column Split */}
        <div className="res-body">
          
          {/* Left Column: Form Parameters (Desktop) */}
          <div className="res-left smooth-scroll-container">
            {renderFormContent()}
          </div>

          {/* Right Column: Live Document Proof / Certificate Preview */}
          <div
            className="res-right smooth-scroll-container"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              cursor: isDragging ? 'grabbing' : 'default',
              userSelect: 'none',
              WebkitUserSelect: 'none'
            }}
          >
            {/* Desktop Canvas Toolbar */}
            <div className="res-canvas-toolbar">
              <div className="res-canvas-tools-group">
                <Move size={13} color="#64748b" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                  {isDragging ? 'Dragging layout...' : 'Official Certificate Document'}
                </span>
              </div>
              <div className="res-canvas-tools-group">
                <button
                  type="button"
                  className="res-canvas-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="res-canvas-badge">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="res-canvas-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  className="res-canvas-btn"
                  onClick={handleResetView}
                  title="Reset Position & Zoom"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Proportional Scaling Container */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start'
              }}
            >
              <div
                ref={printRef}
                style={{
                  width: '680px',
                  minWidth: '680px',
                  maxWidth: '680px',
                  transform: `scale(${effectiveScale}) translate3d(${pan.x}px, ${pan.y}px, 0)`,
                  transformOrigin: 'top center',
                  transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
                  marginBottom: isMobile && paperHeight ? `-${paperHeight * (1 - effectiveScale)}px` : '0px'
                }}
              >
                {/* Live Paper Document Preview Sheet */}
                <div
                  className="res-preview-paper"
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  {/* Official Letterhead */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #07345f', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div className="res-letterhead">
                      <img
                        src="/images/phcm-logo.png"
                        alt="PHCM Logo Left"
                        className="res-univ-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="res-univ-text">
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#334155', fontFamily: 'inherit' }}>
                          Republic of the Philippines
                        </div>
                        <h2 style={{ margin: '2px 0', fontSize: '15.5px', fontWeight: 800, color: '#07345f', letterSpacing: '0.01em', fontFamily: 'inherit' }}>
                          UNIVERSITY OF PERPETUAL HELP SYSTEM MANILA
                        </h2>
                        <span style={{ fontSize: '10.5px', color: '#475569', display: 'block', fontFamily: 'inherit' }}>
                          1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline
                        </span>
                        <span style={{ fontSize: '9px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', display: 'block', textTransform: 'uppercase', fontFamily: 'inherit' }}>
                          VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM
                        </span>
                      </div>
                      <img
                        src="/images/phcm-seal.png"
                        alt="PHCM University Seal"
                        className="res-univ-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Reference & Metadata */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', marginBottom: '12px', fontFamily: 'inherit', borderBottom: '1px dotted #cbd5e1', paddingBottom: '4px', flexWrap: 'wrap', gap: '4px' }}>
                    <span>Control No: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{controlNumber}</strong></span>
                    <span>Date Issued: <strong style={{ color: '#0f172a' }}>{currentDateFormatted}</strong></span>
                    <span>Status: <strong style={{ color: status === 'Resolved' ? '#15803d' : '#07345f', textTransform: 'uppercase' }}>{status}</strong></span>
                  </div>

                  {/* Document Certificate Title */}
                  <div style={{ textAlign: 'center', margin: '12px 0 14px' }}>
                    <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.5px', textDecoration: 'underline', fontFamily: 'inherit' }}>
                      CERTIFICATE OF DISCIPLINARY RESOLUTION &amp; CLEARANCE
                    </h3>
                    <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '2px' }}>
                      Official Institutional Notice of Restorative Counseling &amp; Infraction Remediation
                    </span>
                  </div>

                  {/* Student & Case Information Table */}
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0 14px', fontSize: '11.5px', border: '1px solid #cbd5e1' }}>
                      <tbody>
                        <tr style={{ background: '#f8fafc' }}>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', width: '32%', fontWeight: 700, color: '#07345f' }}>Student Full Name:</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 800, color: '#0f172a' }}>{studentFullName}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#07345f' }}>Student ID / Level:</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', color: '#0f172a' }}>{record.student?.student_id || record.student?.lrn || 'N/A'} &nbsp;|&nbsp; Grade {record.student?.grade || '10'} - {record.student?.section || 'General'}</td>
                        </tr>
                        <tr style={{ background: '#f8fafc' }}>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#07345f' }}>Incident Reference:</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', color: '#0f172a' }}>Incident #{record.id} &nbsp;(Date Reported: {incidentDateFormatted})</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#07345f' }}>Infraction / Violation:</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', color: '#0f172a' }}><strong>{record.violation?.title || record.offense || 'General Infraction'}</strong> ({record.violation?.type || record.severity || 'Minor'} Offense)</td>
                        </tr>
                        <tr style={{ background: '#f8fafc' }}>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 700, color: '#07345f' }}>Final Disposition:</td>
                          <td style={{ padding: '6px 10px', border: '1px solid #cbd5e1', fontWeight: 800, color: status === 'Resolved' ? '#15803d' : '#07345f', textTransform: 'uppercase' }}>{status}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Body Text */}
                  <div style={{ fontSize: '12px', color: '#1e293b', textAlign: 'left', marginBottom: '12px', lineHeight: 1.55 }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>TO WHOM IT MAY CONCERN:</strong><br />
                      This is to certify that the disciplinary case for the student referenced above has undergone formal evaluation and due process in accordance with the Student Code of Conduct and Institutional Guidelines of University of Perpetual Help System Manila. Restorative guidance counseling and corrective remediation measures have been formally administered.
                    </p>
                  </div>

                  {/* Assigned Sanction & Outcomes Box */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      marginBottom: '12px',
                      fontSize: '11.5px'
                    }}
                  >
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>
                      ASSIGNED SANCTION &amp; CORRECTIVE MEASURES FULFILLED:
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: 600, marginBottom: '6px' }}>
                      {sanction || 'Verbal Warning, Guided Reflection & Standard Compliance Counseling Completed.'}
                    </div>

                    {resolutionNotes && (
                      <>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: '6px', marginBottom: '3px' }}>
                          COUNSELING OUTCOMES &amp; OFFICIAL FINDINGS:
                        </div>
                        <div style={{ color: '#334155', fontStyle: 'italic' }}>
                          &quot;{resolutionNotes}&quot;
                        </div>
                      </>
                    )}
                  </div>

                  <p style={{ fontSize: '11.5px', color: '#1e293b', textAlign: 'left', margin: '0 0 16px 0', lineHeight: 1.55 }}>
                    {status === 'Resolved'
                      ? 'With the full satisfaction of assigned restorative measures, the student is hereby issued official disciplinary clearance for the aforementioned incident. The student in good standing may proceed with standard academic and co-curricular entitlements.'
                      : 'This case is currently being monitored in accordance with prescribed guidance follow-up timelines.'}
                  </p>

                  {/* Signatories */}
                  <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', textAlign: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '130px', maxWidth: '180px' }}>
                      <div style={{ height: '24px' }} />
                      <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px' }}>
                        <strong style={{ fontSize: '11.5px', display: 'block', color: '#0f172a' }}>{officerName}</strong>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{officerTitle}</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '130px', maxWidth: '180px' }}>
                      <div style={{ height: '24px' }} />
                      <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px' }}>
                        <strong style={{ fontSize: '11.5px', display: 'block', color: '#0f172a' }}>Class Adviser / Counselor</strong>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Guidance &amp; Counseling Office</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: '130px', maxWidth: '180px' }}>
                      <div style={{ height: '24px' }} />
                      <div style={{ borderTop: '1.5px solid #0f172a', paddingTop: '4px' }}>
                        <strong style={{ fontSize: '11.5px', display: 'block', color: '#0f172a' }}>Parent / Legal Guardian</strong>
                        <span style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>Conforme &amp; Acknowledged</span>
                      </div>
                    </div>
                  </div>

                  {/* Security Footnote */}
                  <div style={{ marginTop: '20px', borderTop: '1px solid #cbd5e1', paddingTop: '8px', fontSize: '9px', color: '#64748b' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', flexWrap: 'wrap', gap: '4px' }}>
                      <span>SECURITY CODE: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{securityHash}</strong></span>
                      <span>SYSTEM ARCHIVE: VIOTRACK INSTITUTIONAL RECORD</span>
                    </div>
                    <div>
                      Official institutional clearance issued by the Office of the Prefect of Discipline under Philippine Data Privacy Act of 2012.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls (Desktop) */}
        <div className="res-footer">
          <span className="res-footer-text" style={{ fontSize: '12px', color: '#64748b' }}>
            Saving this resolution affirms restorative guidance intervention and updates Incident #{record.id}.
          </span>

          <div className="res-footer-actions">
            <button
              type="button"
              className="res-footer-btn res-btn-close"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="res-footer-btn res-btn-submit"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                border: 'none',
                background: status === 'Resolved' ? '#10b981' : '#0f172a',
                color: '#ffffff',
                boxShadow: status === 'Resolved' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(15, 23, 42, 0.25)'
              }}
            >
              <Check size={14} strokeWidth={2.4} />
              {loading ? 'Saving...' : 'Save & Finalize Resolution'}
            </button>
          </div>
        </div>

        {/* Mobile Floating Zoom & Drag Pill Toolbar */}
        <div className="res-mobile-zoom-pill">
          <button
            type="button"
            className="res-mobile-zoom-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <span
            className="res-mobile-zoom-indicator"
            onClick={handleResetView}
            title="Tap to Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            className="res-mobile-zoom-btn"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            className="res-mobile-zoom-btn"
            onClick={handleResetView}
            style={{ marginLeft: '2px' }}
            title="Fit to Screen"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Mobile Floating Action Button (FAB) - Edit Parameters */}
        <button
          type="button"
          className="res-mobile-fab"
          onClick={() => setIsMobileDrawerOpen(true)}
          title="Edit Resolution Details"
        >
          <Edit3 size={20} strokeWidth={2.4} />
        </button>

        {/* Mobile Edit Drawer Sheet */}
        <div
          className={`res-mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="res-mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="res-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="#0f172a" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Edit Resolution Details
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                style={{
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={14} /> Done
              </button>
            </div>

            <div className="res-drawer-body">
              {renderFormContent()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
