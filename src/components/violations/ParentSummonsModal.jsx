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
  Edit3
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { dataService } from '../../services/dataService';

export const ParentSummonsModal = ({ isOpen, onClose, record, student, records }) => {
  const { success, error, info } = useNotification();
  const printRef = useRef(null);

  // Extract initial details from record or student
  const activeStudent = student || record?.student || {};
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
  const [signatory1Dept, setSignatory1Dept] = useState('Perpetual Help College of Manila');

  // Signatory 2 (Right - Class Adviser / Department Head)
  const [includeSignatory2, setIncludeSignatory2] = useState(true);
  const [signatory2Name, setSignatory2Name] = useState('Class Adviser');
  const [signatory2Title, setSignatory2Title] = useState('Department Head');
  const [signatory2Dept, setSignatory2Dept] = useState('Basic Education Department');

  const [customRemarks, setCustomRemarks] = useState(
    'Please bring a valid government/company ID. Your cooperation is vital to supporting your child\'s academic and personal character development.'
  );
  const [isSendingSms, setIsSendingSms] = useState(false);

  // Load all student violations & advisers
  useEffect(() => {
    if (!isOpen) return;

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
              setSelectedViolationIds(prev => prev.length > 0 ? prev : [record.id]);
            } else {
              setSelectedViolationIds(prev => prev.length > 0 ? prev : matched.map(m => m.id));
            }
          }
        }

        // Auto-match adviser for Signatory 2 if available
        if (Array.isArray(allAdvisers) && activeStudent.grade && activeStudent.section) {
          const matchedAdviser = allAdvisers.find(a =>
            a.grade === activeStudent.grade &&
            (a.section === activeStudent.section || a.section_name === activeStudent.section)
          );
          if (matchedAdviser) {
            const advName = matchedAdviser.name || `${matchedAdviser.fname || ''} ${matchedAdviser.lname || ''}`.trim();
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

    return () => clearTimeout(timer);
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
            @page { size: A4 portrait; margin: 15mm; }
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

  // 2. High Quality PDF Generation (Lazy loaded on-demand for maximum 60fps performance)
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
      doc.setFontSize(13);
      doc.text('PERPETUAL HELP COLLEGE OF MANILA', 105, 11, { align: 'center' });
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
      doc.text(`Grade & Section: ${activeStudent.grade || 'Grade 10'} - ${activeStudent.section || 'General'} | LRN: ${activeStudent.lrn || 'N/A'}`, 14, 67);

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
      doc.text(signatory1Dept, 14, currentY + 8);

      if (includeSignatory2) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(signatory2Name, 130, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(signatory2Title, 130, currentY + 4);
        doc.text(signatory2Dept, 130, currentY + 8);
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
      const msg = `[PHCM VIOTRACK] Notice of Disciplinary Conference for ${studentFullName} regarding (${viosList}). Please attend meeting on ${formattedConfDate} at ${conferenceTime} (${venue}). Ref: ${referenceNo}. Office of Discipline.`;
      await dataService.sendSMS(defaultParentContact, parentName, studentFullName, `Parent Summons - ${viosList}`);
      success(`SMS summons alert dispatched to parent (${defaultParentContact}).`);
    } catch (err) {
      error('Failed to send SMS: ' + err.message);
    } finally {
      setIsSendingSms(false);
    }
  };

  return (
    <div
      className="modal-backdrop-smooth"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        transform: 'translateZ(0)',
        contain: 'strict'
      }}
    >
      <div
        className="modal-content-smooth"
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
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText size={20} color="#38bdf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Automated Parent Summons Letter Generator
                </h3>
                <span
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: '#38bdf8',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase'
                  }}
                >
                  Official Template
                </span>
                {activeViolations.length > 1 && (
                  <span
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {activeViolations.length} Violations Bundled
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                Pre-formatted formal conference notice with dynamic student infraction bundling
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: 2-Column Split */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          
          {/* Left Column: Form Parameters */}
          <div
            className="smooth-scroll-container"
            style={{
              width: '360px',
              borderRight: '1px solid #e2e8f0',
              padding: '18px 20px',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              flexShrink: 0
            }}
          >
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
                  <User size={13} color="#2563eb" /> Parent / Guardian Name
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
                    <Calendar size={12} color="#059669" /> Date
                  </label>
                  <input
                    type="date"
                    value={conferenceDate}
                    onChange={(e) => setConferenceDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12px',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    <Clock size={12} color="#d97706" /> Time
                  </label>
                  <input
                    type="time"
                    value={conferenceTime}
                    onChange={(e) => setConferenceTime(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 8px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '12px',
                      background: '#ffffff',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  <MapPin size={13} color="#dc2626" /> Designated Venue
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
                  <Layers size={13} color="#2563eb" /> Included Violations ({activeViolations.length})
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
                  const isMinor = sev.toLowerCase().includes('minor');
                  const isMajor = sev.toLowerCase().includes('major');
                  const isSerious = sev.toLowerCase().includes('serious');

                  const badgeBg = isSerious ? '#fee2e2' : (isMajor ? '#fef3c7' : '#f0fdf4');
                  const badgeColor = isSerious ? '#b91c1c' : (isMajor ? '#b45309' : '#15803d');

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

            {/* 3. Editable Signatories & Authorities Section */}
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
                      placeholder="Signatory 2 Name (e.g. Class Adviser / Adviser Name)"
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
                      placeholder="Designation (e.g. Department Head / Class Adviser)"
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
                <MessageSquare size={13} color="#64748b" /> Meeting Agenda &amp; Notes
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

            {/* Quick SMS Trigger */}
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
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

          {/* Right Column: Printable Letter Document Preview */}
          <div
            className="smooth-scroll-container"
            style={{
              flex: 1,
              padding: '24px 20px',
              background: '#e2e8f0',
              display: 'block'
            }}
          >
            <div
              ref={printRef}
              style={{
                width: '100%',
                maxWidth: '680px',
                margin: '0 auto',
                background: '#ffffff',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.08)',
                borderRadius: '8px',
                padding: '36px 44px',
                fontFamily: "'Times New Roman', Times, serif",
                color: '#0f172a',
                lineHeight: 1.55,
                boxSizing: 'border-box',
                transform: 'translate3d(0, 0, 0)',
                contain: 'layout paint'
              }}
            >
              {/* Official Letterhead */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '6px' }}>
                  <img
                    src="/images/phcm-logo.png"
                    alt="PHCM Logo"
                    style={{ width: '48px', height: '48px', objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.03em', fontFamily: 'Arial, sans-serif' }}>
                      PERPETUAL HELP COLLEGE OF MANILA
                    </h2>
                    <span style={{ fontSize: '11px', color: '#475569', display: 'block', fontFamily: 'Arial, sans-serif' }}>
                      1240 V. Concepcion St., Sampaloc, Manila | Office of the Prefect of Discipline
                    </span>
                    <span style={{ fontSize: '9.5px', color: '#64748b', fontWeight: 700, letterSpacing: '0.5px', display: 'block', textTransform: 'uppercase', fontFamily: 'Arial, sans-serif' }}>
                      VIOTRACK DISCIPLINARY &amp; STUDENT WELFARE MANAGEMENT SYSTEM
                    </span>
                  </div>
                </div>
              </div>

              {/* Reference & Date */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b', marginBottom: '14px', fontFamily: 'Arial, sans-serif' }}>
                <span>Reference No: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{referenceNo}</strong></span>
                <span>Date Issued: <strong style={{ color: '#0f172a' }}>{currentDateFormatted}</strong></span>
              </div>

              {/* Notice Heading */}
              <div style={{ textAlign: 'center', margin: '14px 0 16px' }}>
                <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Arial, sans-serif' }}>
                  OFFICIAL PARENT / GUARDIAN CONFERENCE NOTICE
                </h3>
                <span style={{ fontSize: '10.5px', color: '#dc2626', fontWeight: 700, letterSpacing: '0.4px', fontFamily: 'Arial, sans-serif' }}>
                  (MANDATORY DISCIPLINARY APPEARANCE)
                </span>
              </div>

              {/* Recipient */}
              <div style={{ fontSize: '12.5px', marginBottom: '14px', background: '#f8fafc', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <div><strong>TO:</strong> {parentName.toUpperCase()}</div>
                <div><strong>Parent / Legal Guardian of:</strong> {studentFullName}</div>
                <div><strong>Grade &amp; Section:</strong> {activeStudent.grade || 'Grade 10'} - {activeStudent.section || 'General'} | <strong>LRN:</strong> {activeStudent.lrn || 'N/A'}</div>
              </div>

              {/* Letter Body: Dynamically handles 1 or multiple violations */}
              <div style={{ fontSize: '12.5px', color: '#1e293b', textAlign: 'justify', marginBottom: '14px' }}>
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
                )}

                <p style={{ margin: '0 0 8px 0' }}>
                  In line with our mutual goal to nurture positive student character, accountability, and academic success, you are cordially requested to attend an in-person case conference scheduled as follows:
                </p>
              </div>

              {/* Conference Details Card */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '14px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '135px 1fr', gap: '6px', rowGap: '6px' }}>
                  <strong>Conference Date:</strong>
                  <span>{formattedConfDate}</span>

                  <strong>Designated Time:</strong>
                  <span>{conferenceTime} (Please arrive 10 minutes prior)</span>

                  <strong>Designated Venue:</strong>
                  <span>{venue}</span>

                  <strong>Presiding Officer:</strong>
                  <span>{signatory1Name} ({signatory1Title})</span>
                </div>
              </div>

              {/* Remarks */}
              <p style={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic', margin: '0 0 12px 0' }}>
                <strong>Note:</strong> {customRemarks}
              </p>

              {/* Signatures: Fully Editable Live */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: includeSignatory2 ? 'space-between' : 'flex-start' }}>
                <div>
                  <div style={{ height: '30px' }} />
                  <div style={{ borderTop: '1.5px solid #0f172a', width: '210px', paddingTop: '4px' }}>
                    <strong style={{ fontSize: '12px', display: 'block', color: '#0f172a' }}>{signatory1Name}</strong>
                    <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>{signatory1Title}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>{signatory1Dept}</span>
                  </div>
                </div>

                {includeSignatory2 && (
                  <div>
                    <div style={{ height: '30px' }} />
                    <div style={{ borderTop: '1.5px solid #0f172a', width: '210px', paddingTop: '4px' }}>
                      <strong style={{ fontSize: '12px', display: 'block', color: '#0f172a' }}>{signatory2Name}</strong>
                      <span style={{ fontSize: '10.5px', color: '#64748b', display: 'block' }}>{signatory2Title}</span>
                      <span style={{ fontSize: '10px', color: '#94a3b8', display: 'block' }}>{signatory2Dept}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Return Slip */}
              <div style={{ marginTop: '22px', borderTop: '2px dashed #94a3b8', paddingTop: '12px', fontSize: '10.5px' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, marginBottom: '5px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  ACKNOWLEDGEMENT &amp; CONFIRMATION RETURN SLIP
                </div>
                <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  I acknowledge receipt of the conference notice for <strong>{studentFullName}</strong> (Ref: {referenceNo}) regarding <strong>[{activeViolations.map(v => v.violation?.title || v.offense || 'Infraction').join(', ')}]</strong> for the scheduled date of <strong>{formattedConfDate}</strong> at <strong>{conferenceTime}</strong>.
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px' }}>
                  <span>Parent/Guardian Signature: _________________________</span>
                  <span>Date Signed: _______________</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            {activeViolations.length} infraction{activeViolations.length > 1 ? 's' : ''} bundled into this official conference notice.
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Close
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Printer size={15} />
              <span>Print Letter</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#0f172a',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.25)'
              }}
            >
              <Download size={15} />
              <span>Download Official PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
