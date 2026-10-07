import React, { useState, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Send,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  ShieldAlert,
  CheckCircle2,
  X,
  Sparkles,
  School,
  AlertTriangle,
  UserCheck,
  MessageSquare,
  CheckSquare,
  Square,
  ChevronDown,
  Layers,
  Edit3,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  ArrowLeft,
  ChevronLeft,
  SlidersHorizontal,
  Check,
  Maximize2
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { dataService } from '../../services/dataService';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import { CustomDatePicker } from '../common/CustomDatePicker';
import { CustomTimePicker } from '../common/CustomTimePicker';

export const ParentSummonsModal = ({ isOpen, onClose, record, student, records }) => {
  const { success, error, info } = useNotification();
  const printRef = useRef(null);

  // Mobile Drawer Toggle
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Viewport and Paper Measurements for Perfect Mobile Scaling
  const [viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);
  const [paperHeight, setPaperHeight] = useState(920);

  // Canvas Pan & Zoom states (Interactive layout)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, initialPanX: 0, initialPanY: 0 });
  const pinchDistanceRef = useRef(null);
  const pinchStartZoomRef = useRef(1);
  const lastTapTimeRef = useRef(0);

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

  // Extract initial details from record or student
  const activeStudent = student || record?.student || {};
  const studentLastName = activeStudent.lname || (activeStudent.name ? activeStudent.name.split(' ').pop() : 'STUDENT');
  const studentFullName = (activeStudent.fname && activeStudent.lname)
    ? `${activeStudent.fname} ${activeStudent.lname}`
    : (activeStudent.name || record?.student_name || 'Student');

  const defaultParentName = activeStudent.parent_name || 'Parent / Legal Guardian';
  const defaultParentContact = activeStudent.parent_contact || activeStudent.contact || 'N/A';

  // State for violations list & multi-selection
  const [studentViolations, setStudentViolations] = useState(record ? [record] : []);
  const [selectedViolationIds, setSelectedViolationIds] = useState(record?.id ? [record.id] : []);

  // State for customizable summons parameters
  const [parentName, setParentName] = useState(defaultParentName);
  const [conferenceDate, setConferenceDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [conferenceTime, setConferenceTime] = useState('09:30');
  const [venue, setVenue] = useState('Prefect of Discipline Office, 2nd Floor Admin Bldg');

  // Signatory 1 (Left - Prefect / Discipline Officer)
  const [signatory1Name, setSignatory1Name] = useState('Sheryl Gamboa');
  const [signatory1Title, setSignatory1Title] = useState('Prefect of Discipline / Disciplinary Committee');

  // Signatory 2 (Right - Class Adviser / Department Head)
  const [includeSignatory2, setIncludeSignatory2] = useState(true);
  const [signatory2Name, setSignatory2Name] = useState('Class Adviser');
  const [signatory2Title, setSignatory2Title] = useState('Department Head');

  const [customRemarks, setCustomRemarks] = useState(
    'Please bring a valid government/company ID. Your cooperation is vital to supporting your child\'s academic and personal character development.'
  );
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Resize and measurement listener
  useEffect(() => {
    if (!isOpen) return;

    const measureLayout = () => {
      setViewportWidth(window.innerWidth);
      if (printRef.current) {
        setPaperHeight(printRef.current.offsetHeight || printRef.current.scrollHeight || 920);
      }
    };

    measureLayout();
    window.addEventListener('resize', measureLayout);
    const timer = setTimeout(measureLayout, 120);

    return () => {
      window.removeEventListener('resize', measureLayout);
      clearTimeout(timer);
    };
  }, [
    isOpen,
    parentName,
    conferenceDate,
    conferenceTime,
    venue,
    signatory1Name,
    signatory2Name,
    includeSignatory2,
    customRemarks,
    selectedViolationIds.length,
    zoom
  ]);

  // Reset zoom, pan, and drawer state ONLY when modal is newly opened
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsMobileDrawerOpen(false);
    }
  }, [isOpen]);

  // Load all student violations & advisers
  useEffect(() => {
    if (!isOpen) return;

    lockBodyScroll();

    // 1. Instant hydration if records are already available in props
    const studentId = activeStudent.id || record?.student_id;
    if (Array.isArray(records) && records.length > 0 && studentId) {
      const matched = records.filter(r => String(r.student_id) === String(studentId));
      if (matched.length > 0) {
        setStudentViolations(matched);
        if (record?.id) {
          setSelectedViolationIds([record.id]);
        } else {
          setSelectedViolationIds(matched.map(m => m.id));
        }
      }
    }

    // 2. Non-blocking background fetch for advisers and latest database sync
    const timer = setTimeout(async () => {
      try {
        const [allRecords, allAdvisers] = await Promise.all([
          Array.isArray(records) && records.length > 0 ? Promise.resolve(records) : dataService.getRecords(),
          dataService.getAdvisers().catch(() => [])
        ]);

        if (studentId && Array.isArray(allRecords)) {
          const matched = allRecords.filter(r => String(r.student_id) === String(studentId));
          if (matched.length > 0) {
            setStudentViolations(matched);
            if (record?.id) {
              setSelectedViolationIds([record.id]);
            } else {
              setSelectedViolationIds(matched.map(m => m.id));
            }
          }
        }

        if (Array.isArray(allAdvisers) && activeStudent.section) {
          const matchedAdv = allAdvisers.find(
            a => a.class_section?.toLowerCase() === activeStudent.section?.toLowerCase()
          );
          if (matchedAdv?.teacher) {
            const advName = `${matchedAdv.teacher.fname || ''} ${matchedAdv.teacher.lname || ''}`.trim();
            if (advName) {
              setSignatory2Name(advName);
              setSignatory2Title(`Class Adviser - ${activeStudent.grade} ${activeStudent.section}`);
            }
          }
        }
      } catch (err) {
        if (record) {
          setStudentViolations([record]);
          setSelectedViolationIds([record.id]);
        }
      }
    }, 40);

    return () => {
      clearTimeout(timer);
      unlockBodyScroll();
    };
  }, [isOpen, activeStudent.id, activeStudent.grade, activeStudent.section, record?.id, records]);

  if (!isOpen) return null;

  // Selected violations subset
  const selectedViolations = studentViolations.filter(v => selectedViolationIds.includes(v.id));
  const activeViolations = selectedViolations.length > 0
    ? selectedViolations
    : (studentViolations.length > 0 ? [studentViolations[0]] : (record ? [record] : []));

  const referenceNo = `PHCM-SUM-${new Date().getFullYear()}-${String(record?.id || Math.floor(1000 + Math.random() * 9000)).padStart(5, '0')}`;
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const formattedConfDate = new Date(conferenceDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const toggleSelectViolation = (id) => {
    if (selectedViolationIds.includes(id)) {
      if (selectedViolationIds.length === 1) {
        info('At least one violation must remain selected for the summons notice.');
        return;
      }
      setSelectedViolationIds(selectedViolationIds.filter(vId => vId !== id));
    } else {
      setSelectedViolationIds([...selectedViolationIds, id]);
    }
  };

  const selectAllViolations = () => {
    setSelectedViolationIds(studentViolations.map(v => v.id));
  };

  // 1. Direct Print Functionality
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open('', '', 'width=900,height=1000');
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Official Parent Summons - ${studentFullName}</title>
          <style>
            @page { size: portrait; margin: 12mm 15mm; }
            body { font-family: 'Times New Roman', Times, serif; color: #1e293b; line-height: 1.5; margin: 0; padding: 20px; font-size: 13px; }
            .header-tbl { width: 100%; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
            .ref-no { font-family: monospace; font-size: 11px; color: #64748b; }
            .section-title { font-weight: bold; font-size: 14px; text-transform: uppercase; margin-top: 14px; margin-bottom: 6px; }
            .box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin: 14px 0; }
            .tear-off { border-top: 2px dashed #94a3b8; margin-top: 30px; padding-top: 15px; }
            .sig-line { border-bottom: 1px solid #334155; width: 220px; margin-top: 40px; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
            th { background: #f1f5f9; font-weight: bold; color: #0f172a; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
    success('Print dialog opened.');
  };

  // 2. High Quality PDF Generation
  const handleDownloadPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      // Header Banner
      doc.setFillColor(15, 23, 42); // #0f172a
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('UNIVERSITY OF PERPETUAL HELP SYSTEM MANILA', 105, 11, { align: 'center' });
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text('1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline', 105, 17, { align: 'center' });
      doc.text('VIOTRACK DISCIPLINARY & STUDENT WELFARE MANAGEMENT SYSTEM', 105, 22, { align: 'center' });

      // Letter Meta
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(8.5);
      doc.text(`Reference No: ${referenceNo}`, 14, 34);
      doc.text(`Date Issued: ${currentDateFormatted}`, 196, 34, { align: 'right' });

      // Title
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('OFFICIAL PARENT / GUARDIAN CONFERENCE NOTICE', 105, 43, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text('(Mandatory Disciplinary Consultation)', 105, 48, { align: 'center' });

      // Recipient Block
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`TO: ${parentName.toUpperCase()}`, 14, 57);
      doc.setFont('helvetica', 'normal');
      doc.text(`Parent / Legal Guardian of: ${studentFullName}`, 14, 62);
      doc.text(`Grade & Section: ${activeStudent.grade || 'Grade 10'} - ${activeStudent.section || 'General'} | Student ID: ${activeStudent.student_id || activeStudent.lrn || 'N/A'}`, 14, 67);

      // Body Text
      doc.setFontSize(9.5);
      doc.text('Dear Parent / Guardian,', 14, 76);

      let currentY = 82;

      if (activeViolations.length === 1) {
        const v = activeViolations[0];
        const vTitle = v.violation?.title || v.offense || 'Disciplinary Infraction';
        const vType = v.violation?.type || v.severity || 'Minor';
        const intro = `This is to formally notify you that your child/ward, ${studentFullName}, has been reported for a disciplinary infraction concerning "${vTitle}" (${vType} Offense) under the Student Code of Conduct.`;
        const splitIntro = doc.splitTextToSize(intro, 182);
        doc.text(splitIntro, 14, currentY);
        currentY += (splitIntro.length * 5) + 3;
      } else {
        const intro = `This is to formally notify you that your child/ward, ${studentFullName}, has been reported for ${activeViolations.length} cumulative disciplinary infractions under the Student Code of Conduct as itemized below:`;
        const splitIntro = doc.splitTextToSize(intro, 182);
        doc.text(splitIntro, 14, currentY);
        currentY += (splitIntro.length * 5) + 3;

        // AutoTable for Multiple Violations
        doc.autoTable({
          startY: currentY,
          margin: { left: 14, right: 14 },
          head: [['#', 'Infraction / Violation Description', 'Offense Level', 'Date Reported', 'Status']],
          body: activeViolations.map((v, i) => [
            i + 1,
            v.violation?.title || v.offense || 'Disciplinary Infraction',
            v.violation?.type || v.severity || 'Minor',
            v.date_reported ? new Date(v.date_reported).toLocaleDateString() : 'Recorded',
            v.status || 'Pending'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center' },
            1: { cellWidth: 72 },
            2: { cellWidth: 32 },
            3: { cellWidth: 34 },
            4: { cellWidth: 36 }
          }
        });

        currentY = doc.lastAutoTable.finalY + 5;
      }

      const body2 = 'In line with our commitment to maintaining a safe, disciplined, and nurturing environment, we request your presence for an official case conference to discuss this matter and formulate corrective interventions:';
      const splitBody2 = doc.splitTextToSize(body2, 182);
      doc.text(splitBody2, 14, currentY);
      currentY += (splitBody2.length * 5) + 4;

      // Conference Details Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, currentY, 182, 34, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SCHEDULED CONFERENCE DETAILS:', 20, currentY + 7);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Designated Date:', 20, currentY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formattedConfDate}`, 55, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Designated Time:', 20, currentY + 19);
      doc.setFont('helvetica', 'normal');
      doc.text(`${conferenceTime} (Please arrive 10 minutes early)`, 55, currentY + 19);

      doc.setFont('helvetica', 'bold');
      doc.text('Designated Venue:', 20, currentY + 25);
      doc.setFont('helvetica', 'normal');
      doc.text(`${venue}`, 55, currentY + 25);

      doc.setFont('helvetica', 'bold');
      doc.text('Presiding Officer:', 20, currentY + 31);
      doc.setFont('helvetica', 'normal');
      doc.text(`${signatory1Name} (${signatory1Title})`, 55, currentY + 31);

      currentY += 40;

      // Remarks / Instructions
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const rem = `Important Notice: ${customRemarks}`;
      const splitRem = doc.splitTextToSize(rem, 182);
      doc.text(splitRem, 14, currentY);
      currentY += (splitRem.length * 4.5) + 4;

      // Closing
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text('Your immediate presence and cooperation are vital to addressing this matter promptly for your child\'s holistic guidance.', 14, currentY);
      currentY += 6;
      doc.text('Sincerely in student development,', 14, currentY);
      currentY += 16;

      // Signatures
      doc.setFont('helvetica', 'bold');
      doc.text(signatory1Name, 14, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(signatory1Title, 14, currentY + 4);

      if (includeSignatory2) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(signatory2Name, 130, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(signatory2Title, 130, currentY + 4);
      }

      // Tear-off slip
      const tearOffY = Math.max(currentY + 22, 230);
      doc.setLineDashPattern([2, 2], 0);
      doc.setDrawColor(148, 163, 184);
      doc.line(14, tearOffY, 196, tearOffY);
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ACKNOWLEDGEMENT & CONFIRMATION SLIP (Please sign and return to Office of Discipline)', 105, tearOffY + 6, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const viosSummary = activeViolations.map(v => v.violation?.title || v.offense || 'Infraction').join(', ');
      doc.text(`I hereby acknowledge receipt of the Parent Summons for ${studentFullName} (Ref: ${referenceNo}) regarding [${viosSummary}] on scheduled date ${formattedConfDate} at ${conferenceTime}.`, 14, tearOffY + 12, { maxWidth: 182 });

      doc.text('Parent / Guardian Signature over Printed Name: __________________________   Date Received: ____________', 14, tearOffY + 24);
      doc.text('Contact Number: __________________________________   Will Attend: [  ] YES   [  ] NO (Reason: __________________)', 14, tearOffY + 30);

      doc.save(`Parent_Summons_${studentFullName.replace(/\s+/g, '_')}_${referenceNo}.pdf`);
      success('Parent Summons Letter PDF successfully generated and downloaded!');
    } catch (err) {
      error('Failed to export PDF: ' + err.message);
    }
  };

  // 3. SMS Notification
  const handleSendSummonsSMS = async () => {
    if (!defaultParentContact || defaultParentContact === 'N/A') {
      error('No valid parent contact number found on record.');
      return;
    }
    setIsSendingSms(true);
    try {
      const viosList = activeViolations.map(v => v.violation?.title || v.offense || 'Infraction').join(', ');
      await dataService.sendSMS(defaultParentContact, parentName, studentFullName, `Parent Summons - ${viosList}`);
      success(`SMS summons alert dispatched to parent (${defaultParentContact}).`);
    } catch (err) {
      error('Failed to send SMS: ' + err.message);
    } finally {
      setIsSendingSms(false);
    }
  };

  // Render Left Column / Drawer Form Content
  const renderFormContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Summons Basic Parameters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            1. Conference Schedule &amp; Recipient
          </span>
        </div>

        {/* Guardian Name */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            <User size={13} color="#0f172a" /> Parent / Guardian Name
          </label>
          <input
            type="text"
            value={parentName}
            onChange={(e) => setParentName(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '12.5px',
              background: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Conference Date & Time (Row) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              <Calendar size={12} color="#0f172a" /> Date
            </label>
            <CustomDatePicker
              value={conferenceDate}
              onChange={(val) => setConferenceDate(val)}
              placeholder="Select Date"
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              <Clock size={12} color="#0f172a" /> Time
            </label>
            <CustomTimePicker
              value={conferenceTime}
              onChange={(val) => setConferenceTime(val)}
              placeholder="Select Time"
              align="right"
            />
          </div>
        </div>

        {/* Venue */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            <MapPin size={13} color="#0f172a" /> Designated Venue
          </label>
          <input
            type="text"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            style={{
              width: '100%',
              padding: '7px 11px',
              borderRadius: '8px',
              border: '1.5px solid #cbd5e1',
              fontSize: '12.5px',
              background: '#ffffff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* 2. Multi-Violation Bundling Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Layers size={13} color="#0f172a" /> Included Violations ({activeViolations.length})
          </span>
          {studentViolations.length > 1 && (
            <button
              type="button"
              onClick={selectAllViolations}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Select All ({studentViolations.length})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
          {studentViolations.map((v) => {
            const isChecked = selectedViolationIds.includes(v.id);
            const title = v.violation?.title || v.offense || 'Disciplinary Infraction';
            const sev = v.violation?.type || v.severity || 'Minor';
            const isMajor = sev.toLowerCase().includes('major');
            const isSerious = sev.toLowerCase().includes('serious');

            const badgeBg = isMajor ? '#fee2e2' : (isSerious ? '#fef9c3' : '#dcfce7');
            const badgeColor = isMajor ? '#dc2626' : (isSerious ? '#a16207' : '#15803d');
            const badgeBorder = isMajor ? '#fecaca' : (isSerious ? '#fde047' : '#bbf7d0');

            return (
              <div
                key={v.id}
                onClick={() => toggleSelectViolation(v.id)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: isChecked ? '#f8fafc' : '#ffffff',
                  border: isChecked ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => {}}
                  style={{ marginTop: '2px', accentColor: '#0f172a', cursor: 'pointer' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                    {title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <span
                      style={{
                        background: badgeBg,
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        fontSize: '9.5px',
                        fontWeight: 800,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {sev}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                      {v.date_reported ? new Date(v.date_reported).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recorded'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Editable Signatories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            2. Authorized Signatories
          </span>
          <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700 }}>
            Fully Editable
          </span>
        </div>

        {/* Signatory 1 (Left - Prefect) */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
            Signatory 1 (Left - Prefect / Discipline Head)
          </span>
          <div>
            <input
              type="text"
              value={signatory1Name}
              placeholder="Signatory 1 Name (e.g. Sheryl Gamboa)"
              onChange={(e) => setSignatory1Name(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 9px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '4px',
                boxSizing: 'border-box'
              }}
            />
            <input
              type="text"
              value={signatory1Title}
              placeholder="Designation (e.g. Prefect of Discipline)"
              onChange={(e) => setSignatory1Title(e.target.value)}
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
        </div>

        {/* Signatory 2 (Right - Class Adviser / Dept Head) */}
        <div
          style={{
            background: '#ffffff',
            border: includeSignatory2 ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            opacity: includeSignatory2 ? 1 : 0.7,
            transition: 'all 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={includeSignatory2}
                onChange={(e) => setIncludeSignatory2(e.target.checked)}
                style={{ accentColor: '#0f172a', cursor: 'pointer' }}
              />
              <span>Signatory 2 (Adviser / Head)</span>
            </label>
            <span style={{ fontSize: '10px', fontWeight: 800, color: includeSignatory2 ? '#16a34a' : '#64748b' }}>
              {includeSignatory2 ? 'Included' : 'Removed'}
            </span>
          </div>

          {includeSignatory2 ? (
            <div>
              <input
                type="text"
                value={signatory2Name}
                placeholder="Signatory 2 Name (e.g. Class Adviser)"
                onChange={(e) => setSignatory2Name(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 9px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '4px',
                  boxSizing: 'border-box'
                }}
              />
              <input
                type="text"
                value={signatory2Title}
                placeholder="Designation (e.g. Department Head)"
                onChange={(e) => setSignatory2Title(e.target.value)}
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
          ) : (
            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', padding: '4px 0' }}>
              Second signatory line removed from notice.
            </span>
          )}
        </div>
      </div>

      {/* 4. Custom Notes */}
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
          <MessageSquare size={13} color="#0f172a" /> Meeting Agenda &amp; Notes
        </label>
        <textarea
          rows={2}
          value={customRemarks}
          onChange={(e) => setCustomRemarks(e.target.value)}
          style={{
            width: '100%',
            padding: '7px 11px',
            borderRadius: '8px',
            border: '1.5px solid #cbd5e1',
            fontSize: '12px',
            background: '#ffffff',
            resize: 'vertical',
            minHeight: '55px',
            maxHeight: '90px',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Quick SMS Trigger inside Drawer */}
      <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
        <button
          type="button"
          onClick={handleSendSummonsSMS}
          disabled={isSendingSms}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '10px',
            background: '#ffffff',
            color: '#0f172a',
            border: '1.5px solid #cbd5e1',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isSendingSms ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.15s ease'
          }}
        >
          <Send size={13} color="#0f172a" />
          <span>{isSendingSms ? 'Dispatching...' : 'Send SMS Notice to Parent'}</span>
        </button>
        {defaultParentContact && defaultParentContact !== 'N/A' && (
          <span style={{ fontSize: '10.5px', color: '#64748b', textAlign: 'center', display: 'block', marginTop: '4px' }}>
            Target: {defaultParentContact}
          </span>
        )}
      </div>
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
    >
      <style>{`
        .psm-body {
          display: flex;
          flex: 1;
          min-height: 0;
          overflow: hidden;
        }
        .psm-left {
          width: 380px;
          flex-shrink: 0;
          padding: 20px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .psm-right {
          flex: 1;
          padding: 20px 24px 36px;
          background: #eef2f6;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          user-select: none;
          touch-action: pan-y;
        }
        .psm-canvas-toolbar {
          position: sticky;
          top: 0;
          z-index: 10;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
          padding: 6px 16px;
          border-radius: 9999px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          gap: 10px;
          max-width: 680px;
          width: 100%;
          box-sizing: border-box;
          color: #0f172a;
        }
        .psm-canvas-tools-group {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .psm-canvas-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 9px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 700;
          color: #334155;
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .psm-canvas-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .psm-canvas-badge {
          font-size: 11px;
          font-weight: 800;
          color: #0f172a;
          font-family: monospace;
          min-width: 42px;
          text-align: center;
        }

        /* Fixed Geometry Authentic A4 Sheet with Light-Theme Elevation */
        .psm-preview-paper {
          width: 680px !important;
          min-width: 680px !important;
          max-width: 680px !important;
          min-height: 960px !important;
          display: flex !important;
          flex-direction: column !important;
          background: #ffffff !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10), 0 1px 4px rgba(0, 0, 0, 0.05) !important;
          border-radius: 12px !important;
          border: 1px solid #cbd5e1 !important;
          padding: 36px 40px !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif !important;
          color: #0f172a !important;
          line-height: 1.55 !important;
          box-sizing: border-box !important;
          touch-action: none;
        }
        .psm-letterhead {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 14px !important;
          margin-bottom: 4px !important;
        }
        .psm-univ-text {
          flex: 1 !important;
          text-align: center !important;
        }
        .psm-univ-logo {
          width: 50px !important;
          height: 50px !important;
          object-fit: contain !important;
          flex-shrink: 0 !important;
        }
        .psm-univ-title {
          margin: 0 0 2px 0 !important;
          font-size: 15.5px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          letter-spacing: 0.01em !important;
        }
        .psm-univ-sub {
          font-size: 11px !important;
          color: #475569 !important;
          font-weight: 600 !important;
          display: block !important;
          margin-bottom: 2px !important;
        }
        .psm-univ-tag {
          font-size: 9.5px !important;
          color: #64748b !important;
          font-weight: 700 !important;
          letter-spacing: 0.5px !important;
          display: block !important;
          text-transform: uppercase !important;
        }
        .psm-meta-row {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          font-size: 12px !important;
          color: #64748b !important;
          margin-bottom: 16px !important;
        }
        .psm-notice-title {
          margin: 0 0 4px 0 !important;
          font-size: 15px !important;
          font-weight: 800 !important;
          color: #0f172a !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
        }
        .psm-notice-sub {
          font-size: 11px !important;
          color: #dc2626 !important;
          font-weight: 800 !important;
          letter-spacing: 0.5px !important;
        }
        .psm-recipient-box {
          font-size: 12.5px !important;
          margin-bottom: 16px !important;
          background: #f8fafc !important;
          padding: 12px 16px !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          line-height: 1.55 !important;
          color: #1e293b !important;
        }
        .psm-letter-text {
          font-size: 12.5px !important;
          color: #1e293b !important;
          text-align: left !important;
          margin-bottom: 16px !important;
          line-height: 1.6 !important;
        }
        .psm-conf-card {
          background: #f8fafc !important;
          border: 1.5px solid #cbd5e1 !important;
          border-radius: 10px !important;
          padding: 14px 18px !important;
          margin-bottom: 16px !important;
        }
        .psm-conf-grid {
          display: grid !important;
          grid-template-columns: 140px 1fr !important;
          gap: 8px !important;
          row-gap: 8px !important;
          font-size: 12.5px !important;
          line-height: 1.45 !important;
        }
        .psm-conf-item {
          display: contents !important;
        }
        .psm-conf-item strong {
          color: #0f172a !important;
          font-weight: 700 !important;
        }
        .psm-conf-item span {
          color: #0f172a !important;
          font-weight: 700 !important;
        }
        .psm-note-text {
          font-size: 11.5px !important;
          color: #475569 !important;
          font-style: italic !important;
          line-height: 1.5 !important;
          margin: 0 0 18px 0 !important;
        }
        .psm-signatures-row {
          margin-top: 24px !important;
          display: flex !important;
          justify-content: space-between !important;
          gap: 20px !important;
        }
        .psm-sig-line {
          border-top: 1.5px solid #0f172a !important;
          width: 210px !important;
          padding-top: 4px !important;
        }
        .psm-return-slip {
          margin-top: auto !important;
          border-top: 2px dashed #cbd5e1 !important;
          padding-top: 14px !important;
          font-size: 11px !important;
        }
        .psm-slip-sign-row {
          display: flex !important;
          justify-content: space-between !important;
          margin-top: 14px !important;
        }
        .psm-footer {
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .psm-footer-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .psm-footer-btn {
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
        .psm-btn-close {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #475569;
        }
        .psm-btn-close:hover {
          background: #f1f5f9;
        }
        .psm-btn-print {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
        }
        .psm-btn-print:hover {
          background: #e2e8f0;
        }
        .psm-btn-download {
          border: none;
          background: #0f172a;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.25);
        }
        .psm-btn-download:hover {
          background: #1e293b;
        }

        /* Mobile Viewer Floating Action Controls */
        .psm-mobile-zoom-pill {
          display: none;
        }
        .psm-mobile-fab {
          display: none;
        }
        .psm-mobile-drawer {
          display: none;
        }

        /* Clean Light Mode Mobile Document Viewer (<= 768px) */
        @media (max-width: 768px) {
          .modal-backdrop-smooth {
            padding: 0 !important;
            background: #f1f5f9 !important;
          }
          .psm-dialog {
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            border: none !important;
            background: #f1f5f9 !important;
          }

          /* Clean Light Mode Header Bar */
          .psm-header-desktop {
            background: #ffffff !important;
            color: #0f172a !important;
            border-bottom: 1px solid #e2e8f0 !important;
            padding: 10px 14px !important;
            min-height: 52px !important;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
          }
          .psm-header-title {
            color: #0f172a !important;
            font-size: 13.5px !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            font-family: inherit !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          .psm-header-sub {
            display: none !important;
          }

          /* Left column is hidden on mobile and moved to slide-up drawer */
          .psm-left {
            display: none !important;
          }

          /* Right column becomes light mode document canvas */
          .psm-right {
            padding: 14px 10px 90px !important;
            background: #eef2f6 !important;
            width: 100% !important;
            min-height: 0 !important;
            flex: 1 !important;
            display: flex !important;
            align-items: flex-start !important;
            touch-action: pan-x pan-y pinch-zoom !important;
          }

          .psm-canvas-toolbar {
            display: none !important;
          }

          .psm-footer {
            display: none !important;
          }

          /* Floating Mobile Touch Zoom Controls */
          .psm-mobile-zoom-pill {
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
          .psm-mobile-zoom-btn {
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
          .psm-mobile-zoom-btn:active {
            background: #e2e8f0;
            transform: scale(0.92);
          }
          .psm-mobile-zoom-indicator {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
            font-family: monospace;
            padding: 0 4px;
            cursor: pointer;
          }

          .psm-mobile-fab {
            display: flex;
            position: fixed;
            bottom: 20px;
            right: 16px;
            z-index: 1001;
            width: 50px;
            height: 50px;
            border-radius: 16px;
            background: #07345f;
            color: #ffffff;
            border: none;
            box-shadow: 0 8px 24px rgba(7, 52, 95, 0.45);
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: transform 0.15s ease;
          }
          .psm-mobile-fab:active {
            transform: scale(0.92);
          }

          /* Mobile Slide-Up Edit Drawer */
          .psm-mobile-drawer {
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
          .psm-mobile-drawer.open {
            opacity: 1;
            pointer-events: auto;
          }
          .psm-mobile-drawer-content {
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
          .psm-mobile-drawer.open .psm-mobile-drawer-content {
            transform: translateY(0);
          }
          .psm-drawer-header {
            padding: 16px 20px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f8fafc;
          }
          .psm-drawer-body {
            padding: 18px 20px;
            overflow-y: auto;
            flex: 1;
          }
        }
      `}</style>

      <div
        className="modal-content-smooth psm-dialog"
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
          className="psm-header-desktop"
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
                <FileText size={15} color="#07345f" style={{ flexShrink: 0 }} />
                <h3 className="psm-header-title" style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                  {studentLastName ? `${studentLastName} - Parent Summon` : 'Parent Summon'}
                </h3>
              </div>
              <span className="psm-header-sub" style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '1px' }}>
                Official disciplinary conference notice letter for parent / guardian.
              </span>
            </div>
          </div>

          {/* Right: Only Print Button + Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
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
              title="Print Summons Letter"
            >
              <Printer size={15} />
              <span>Print</span>
            </button>

            {/* Close Button */}
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
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="psm-body">
          
          {/* Left Column: Form Parameters (Desktop) */}
          <div className="psm-left smooth-scroll-container">
            {renderFormContent()}
          </div>

          {/* Right Column: Printable Letter Document Preview */}
          <div
            className="psm-right smooth-scroll-container"
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
            {/* Canvas Control Toolbar (Desktop interactive toolbar) */}
            <div className="psm-canvas-toolbar">
              <div className="psm-canvas-tools-group">
                <Move size={13} color="#64748b" />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155' }}>
                  {isDragging ? 'Dragging layout...' : 'Official A4 Document'}
                </span>
              </div>
              <div className="psm-canvas-tools-group">
                <button
                  type="button"
                  className="psm-canvas-btn"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="psm-canvas-badge">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  className="psm-canvas-btn"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <button
                  type="button"
                  className="psm-canvas-btn"
                  onClick={handleResetView}
                  title="Reset Position & Zoom"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              </div>
            </div>

            {/* Proportional Scaling Container: Maintains pristine 680px A4 geometry */}
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
                <div
                  className="psm-preview-paper"
                  style={{
                    cursor: isDragging ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                >
                  {/* Official Letterhead */}
                  <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
                    <div className="psm-letterhead">
                      <img
                        src="/images/phcm-logo.png"
                        alt="PHCM Logo Left"
                        className="psm-univ-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="psm-univ-text">
                        <h2 className="psm-univ-title">
                          UNIVERSITY OF PERPETUAL HELP SYSTEM MANILA
                        </h2>
                        <span className="psm-univ-sub">
                          1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline
                        </span>
                        <span className="psm-univ-tag">
                          VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM
                        </span>
                      </div>
                      <img
                        src="/images/phcm-seal.png"
                        alt="PHCM University Seal"
                        className="psm-univ-logo"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                  </div>

                  {/* Reference & Date */}
                  <div className="psm-meta-row">
                    <span>Reference No: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{referenceNo}</strong></span>
                    <span>Date Issued: <strong style={{ color: '#0f172a' }}>{currentDateFormatted}</strong></span>
                  </div>

                  {/* Notice Heading */}
                  <div style={{ textAlign: 'center', margin: '14px 0 16px' }}>
                    <h3 className="psm-notice-title">
                      OFFICIAL PARENT / GUARDIAN CONFERENCE NOTICE
                    </h3>
                    <span className="psm-notice-sub">
                      (MANDATORY DISCIPLINARY APPEARANCE)
                    </span>
                  </div>

                  {/* Recipient */}
                  <div className="psm-recipient-box">
                    <div><strong>TO:</strong> {parentName.toUpperCase()}</div>
                    <div><strong>Parent / Legal Guardian of:</strong> {studentFullName}</div>
                    <div><strong>Grade &amp; Section:</strong> {activeStudent.grade || 'Grade 10'} - {activeStudent.section || 'General'} | <strong>Student ID:</strong> {activeStudent.student_id || activeStudent.lrn || 'N/A'}</div>
                  </div>

                  {/* Letter Body: Dynamically handles 1 or multiple violations */}
                  <div className="psm-letter-text">
                    <p style={{ margin: '0 0 8px 0' }}>Dear Mr. / Mrs. / Ms. <strong>{parentName}</strong>,</p>

                    {activeViolations.length === 1 ? (
                      <p style={{ margin: '0 0 8px 0' }}>
                        This is to formally inform you that your child/ward, <strong>{studentFullName}</strong>, has been reported for a disciplinary infraction regarding <strong>&quot;{activeViolations[0].violation?.title || activeViolations[0].offense || 'Disciplinary Infraction'}&quot;</strong> (classified as a <strong>{activeViolations[0].violation?.type || activeViolations[0].severity || 'Minor'} Offense</strong> under the Student Code of Conduct).
                      </p>
                    ) : (
                      <div>
                        <p style={{ margin: '0 0 8px 0' }}>
                          This is to formally inform you that your child/ward, <strong>{studentFullName}</strong>, has been reported for <strong>{activeViolations.length} cumulative disciplinary infractions</strong> under the Student Code of Conduct as itemized in the summary table below:
                        </p>

                        {/* Multi-Infractions Table */}
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', margin: '12px 0 14px', fontSize: '11.5px', border: '1px solid #cbd5e1' }}>
                            <thead>
                              <tr style={{ background: '#f1f5f9' }}>
                                <th style={{ padding: '8px 6px', border: '1px solid #cbd5e1', width: '32px', textAlign: 'center', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '8px 10px', border: '1px solid #cbd5e1', textAlign: 'left', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>Infraction / Violation Description</th>
                                <th style={{ padding: '8px 8px', border: '1px solid #cbd5e1', width: '100px', textAlign: 'center', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>Offense Level</th>
                                <th style={{ padding: '8px 8px', border: '1px solid #cbd5e1', width: '95px', textAlign: 'center', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>Date Reported</th>
                                <th style={{ padding: '8px 8px', border: '1px solid #cbd5e1', width: '80px', textAlign: 'center', background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeViolations.map((v, idx) => {
                                const vTitle = v.violation?.title || v.offense || 'Infraction';
                                const vSev = v.violation?.type || v.severity || 'Minor';
                                const vDate = v.date_reported ? new Date(v.date_reported).toLocaleDateString() : 'Recorded';
                                const vStatus = v.status || 'Pending';

                                return (
                                  <tr key={v.id || idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                    <td style={{ padding: '7px 6px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{idx + 1}</td>
                                    <td style={{ padding: '7px 10px', border: '1px solid #e2e8f0', fontWeight: 600, color: '#0f172a' }}>{vTitle}</td>
                                    <td style={{ padding: '7px 8px', border: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>{vSev}</td>
                                    <td style={{ padding: '7px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#475569' }}>{vDate}</td>
                                    <td style={{ padding: '7px 8px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#0f172a', fontWeight: 600 }}>{vStatus}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <p style={{ margin: '0 0 8px 0' }}>
                      In line with our mutual goal to nurture positive student character, accountability, and academic success, you are cordially requested to attend an in-person case conference scheduled as follows:
                    </p>
                  </div>

                  {/* Conference Details Card */}
                  <div className="psm-conf-card">
                    <div className="psm-conf-grid">
                      <div className="psm-conf-item">
                        <strong>Conference Date:</strong>
                        <span>{formattedConfDate}</span>
                      </div>

                      <div className="psm-conf-item">
                        <strong>Designated Time:</strong>
                        <span>{conferenceTime} (Please arrive 10 minutes prior)</span>
                      </div>

                      <div className="psm-conf-item">
                        <strong>Designated Venue:</strong>
                        <span>{venue}</span>
                      </div>

                      <div className="psm-conf-item">
                        <strong>Presiding Officer:</strong>
                        <span>{signatory1Name} ({signatory1Title})</span>
                      </div>
                    </div>
                  </div>

                  {/* Remarks */}
                  <p className="psm-note-text">
                    <strong>Note:</strong> {customRemarks}
                  </p>

                  {/* Signatures */}
                  <div className="psm-signatures-row">
                    <div>
                      <div style={{ height: '24px' }} />
                      <div className="psm-sig-line">
                        <strong style={{ fontSize: '12px', display: 'block', color: '#0f172a' }}>{signatory1Name}</strong>
                        <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>{signatory1Title}</span>
                      </div>
                    </div>

                    {includeSignatory2 && (
                      <div>
                        <div style={{ height: '24px' }} />
                        <div className="psm-sig-line">
                          <strong style={{ fontSize: '12px', display: 'block', color: '#0f172a' }}>{signatory2Name}</strong>
                          <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>{signatory2Title}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Return Slip */}
                  <div className="psm-return-slip">
                    <div style={{ textAlign: 'center', fontWeight: 800, marginBottom: '5px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                      ACKNOWLEDGEMENT &amp; CONFIRMATION RETURN SLIP
                    </div>
                    <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
                      I acknowledge receipt of the conference notice for <strong>{studentFullName}</strong> (Ref: {referenceNo}) regarding <strong>[{activeViolations.map(v => v.violation?.title || v.offense || 'Infraction').join(', ')}]</strong> for the scheduled date of <strong>{formattedConfDate}</strong> at <strong>{conferenceTime}</strong>.
                    </p>
                    <div className="psm-slip-sign-row">
                      <span>Parent/Guardian Signature: _________________________</span>
                      <span>Date Signed: _______________</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls (Desktop) */}
        <div className="psm-footer">
          <span className="psm-footer-text" style={{ fontSize: '12.5px', color: '#64748b' }}>
            {activeViolations.length} infraction{activeViolations.length > 1 ? 's' : ''} bundled into this official conference notice.
          </span>

          <div className="psm-footer-actions">
            <button
              type="button"
              className="psm-footer-btn psm-btn-close"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="psm-footer-btn psm-btn-print"
              onClick={handlePrint}
            >
              <Printer size={15} />
              <span>Print Letter</span>
            </button>

            <button
              type="button"
              className="psm-footer-btn psm-btn-download"
              onClick={handleDownloadPDF}
            >
              <Download size={15} />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {/* Mobile Floating Zoom & Drag Pill Toolbar */}
        <div className="psm-mobile-zoom-pill">
          <button
            type="button"
            className="psm-mobile-zoom-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>

          <span
            className="psm-mobile-zoom-indicator"
            onClick={handleResetView}
            title="Tap to Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </span>

          <button
            type="button"
            className="psm-mobile-zoom-btn"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>

          <button
            type="button"
            className="psm-mobile-zoom-btn"
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
          className="psm-mobile-fab"
          onClick={() => setIsMobileDrawerOpen(true)}
          title="Edit Summons Details"
        >
          <SlidersHorizontal size={20} strokeWidth={2.4} />
        </button>

        {/* Mobile Edit Drawer Sheet */}
        <div
          className={`psm-mobile-drawer ${isMobileDrawerOpen ? 'open' : ''}`}
          onClick={() => setIsMobileDrawerOpen(false)}
        >
          <div
            className="psm-mobile-drawer-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="psm-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SlidersHorizontal size={18} color="#0f172a" />
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Edit Summons Details
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

            <div className="psm-drawer-body">
              {renderFormContent()}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
