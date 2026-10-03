import React, { useState, useRef } from 'react';
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
  MessageSquare
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNotification } from '../../context/NotificationContext';
import { dataService } from '../../services/dataService';

export const ParentSummonsModal = ({ isOpen, onClose, record, student }) => {
  const { success, error, info } = useNotification();
  const printRef = useRef(null);

  // Extract initial details from record or student
  const activeStudent = student || record?.student || {};
  const studentFullName = (activeStudent.fname && activeStudent.lname)
    ? `${activeStudent.fname} ${activeStudent.lname}`
    : (activeStudent.name || record?.student_name || 'Student');

  const defaultParentName = activeStudent.parent_name || 'Parent / Legal Guardian';
  const defaultParentContact = activeStudent.parent_contact || activeStudent.contact || 'N/A';
  const violationTitle = record?.violation?.title || record?.violation?.name || record?.offense || 'Disciplinary Infraction';
  const violationType = record?.violation?.type || record?.severity || 'Minor';

  // State for customizable summons parameters
  const [parentName, setParentName] = useState(defaultParentName);
  const [conferenceDate, setConferenceDate] = useState(() => {
    // Default to 2 days from today (weekdays)
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [conferenceTime, setConferenceTime] = useState('09:30');
  const [venue, setVenue] = useState('Prefect of Discipline Office, 2nd Floor Admin Bldg');
  const [officerName, setOfficerName] = useState('Sheryl Gamboa');
  const [officerTitle, setOfficerTitle] = useState('Prefect of Discipline / Disciplinary Committee');
  const [customRemarks, setCustomRemarks] = useState(
    'Please bring a valid government/company ID. Your cooperation is vital to supporting your child\'s academic and personal character development.'
  );
  const [isSendingSms, setIsSendingSms] = useState(false);

  if (!isOpen) return null;

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
  const handleDownloadPDF = () => {
    try {
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
      const intro = `This is to formally notify you that your child/ward, ${studentFullName}, has been reported for a disciplinary infraction concerning "${violationTitle}" (${violationType} Offense) under the Student Code of Conduct.`;
      const splitIntro = doc.splitTextToSize(intro, 182);
      doc.text(splitIntro, 14, 82);

      const body2 = 'In line with our commitment to maintaining a safe, disciplined, and nurturing environment, we request your presence for an official case conference to discuss this matter and formulate corrective interventions:';
      const splitBody2 = doc.splitTextToSize(body2, 182);
      doc.text(splitBody2, 14, 94);

      // Conference Details Box
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(14, 106, 182, 36, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('SCHEDULED CONFERENCE DETAILS:', 20, 113);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Designated Date:', 20, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(`${formattedConfDate}`, 55, 120);

      doc.setFont('helvetica', 'bold');
      doc.text('Designated Time:', 20, 126);
      doc.setFont('helvetica', 'normal');
      doc.text(`${conferenceTime} (Please arrive 10 minutes early)`, 55, 126);

      doc.setFont('helvetica', 'bold');
      doc.text('Designated Venue:', 20, 132);
      doc.setFont('helvetica', 'normal');
      doc.text(`${venue}`, 55, 132);

      doc.setFont('helvetica', 'bold');
      doc.text('Presiding Officer:', 20, 138);
      doc.setFont('helvetica', 'normal');
      doc.text(`${officerName} (${officerTitle})`, 55, 138);

      // Remarks / Instructions
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      const rem = `Important Notice: ${customRemarks}`;
      const splitRem = doc.splitTextToSize(rem, 182);
      doc.text(splitRem, 14, 150);

      // Closing
      doc.setTextColor(15, 23, 42);
      doc.text('Your immediate presence and cooperation are vital to addressing this matter promptly for your child\'s holistic guidance.', 14, 164);
      doc.text('Sincerely in student development,', 14, 172);

      // Signatures
      doc.setFont('helvetica', 'bold');
      doc.text(officerName, 14, 192);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(officerTitle, 14, 196);
      doc.text('Perpetual Help College of Manila', 14, 200);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Class Adviser / Department Head', 130, 192);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('Basic Education Department', 130, 196);

      // Tear-off slip
      doc.setLineDashPattern([2, 2], 0);
      doc.setDrawColor(148, 163, 184);
      doc.line(14, 222, 196, 222);
      doc.setLineDashPattern([], 0);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ACKNOWLEDGEMENT & CONFIRMATION SLIP (Please sign and return to Office of Discipline)', 105, 228, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text(`I hereby acknowledge receipt of the Parent Summons for ${studentFullName} (Ref: ${referenceNo}) on scheduled date ${formattedConfDate} at ${conferenceTime}.`, 14, 235, { maxWidth: 182 });

      doc.text('Parent / Guardian Signature over Printed Name: __________________________   Date Received: ____________', 14, 248);
      doc.text('Contact Number: __________________________________   Will Attend: [  ] YES   [  ] NO (Reason: __________________)', 14, 255);

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
      const msg = `[PHCM VIOTRACK] Notice of Disciplinary Conference for ${studentFullName}. Please attend the scheduled meeting on ${formattedConfDate} at ${conferenceTime} (${venue}). Ref: ${referenceNo}. Office of Discipline.`;
      await dataService.sendSMS(defaultParentContact, parentName, studentFullName, `Parent Summons - ${violationTitle}`);
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
          maxWidth: '1120px',
          height: '92vh',
          maxHeight: '860px',
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
              </div>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                Pre-formatted formal conference notice with dynamic student infraction data
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
              width: '350px',
              borderRight: '1px solid #e2e8f0',
              padding: '18px 20px',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Summons Parameters
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                Live Sync
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

            {/* Conference Date */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                <Calendar size={13} color="#059669" /> Conference Date
              </label>
              <input
                type="date"
                value={conferenceDate}
                onChange={(e) => setConferenceDate(e.target.value)}
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

            {/* Conference Time */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                <Clock size={13} color="#d97706" /> Conference Time
              </label>
              <input
                type="time"
                value={conferenceTime}
                onChange={(e) => setConferenceTime(e.target.value)}
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

            {/* Presiding Officer */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                <UserCheck size={13} color="#4f46e5" /> Officer in Charge
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
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

            {/* Custom Notes */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                <MessageSquare size={13} color="#64748b" /> Meeting Agenda / Notes
              </label>
              <textarea
                rows={3}
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
                  minHeight: '65px',
                  maxHeight: '110px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Quick SMS Trigger */}
            <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
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

              {/* Letter Body */}
              <div style={{ fontSize: '12.5px', color: '#1e293b', textAlign: 'justify', marginBottom: '14px' }}>
                <p style={{ margin: '0 0 8px 0' }}>Dear Mr. / Mrs. / Ms. <strong>{parentName}</strong>,</p>
                <p style={{ margin: '0 0 8px 0' }}>
                  This is to formally inform you that your child/ward, <strong>{studentFullName}</strong>, has been reported for a disciplinary infraction regarding <strong>&quot;{violationTitle}&quot;</strong> (classified as a <strong>{violationType} Offense</strong> under the Student Code of Conduct).
                </p>
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
                  <span>{officerName} ({officerTitle})</span>
                </div>
              </div>

              {/* Remarks */}
              <p style={{ fontSize: '11.5px', color: '#475569', fontStyle: 'italic', margin: '0 0 12px 0' }}>
                <strong>Note:</strong> {customRemarks}
              </p>

              {/* Signatures */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ height: '30px' }} />
                  <div style={{ borderTop: '1.5px solid #0f172a', width: '200px', paddingTop: '4px' }}>
                    <strong style={{ fontSize: '12px', display: 'block' }}>{officerName}</strong>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>{officerTitle}</span>
                  </div>
                </div>

                <div>
                  <div style={{ height: '30px' }} />
                  <div style={{ borderTop: '1.5px solid #0f172a', width: '200px', paddingTop: '4px' }}>
                    <strong style={{ fontSize: '12px', display: 'block' }}>Class Adviser</strong>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>Department Head</span>
                  </div>
                </div>
              </div>

              {/* Return Slip */}
              <div style={{ marginTop: '22px', borderTop: '2px dashed #94a3b8', paddingTop: '12px', fontSize: '10.5px' }}>
                <div style={{ textAlign: 'center', fontWeight: 800, marginBottom: '5px', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  ACKNOWLEDGEMENT &amp; CONFIRMATION RETURN SLIP
                </div>
                <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
                  I acknowledge receipt of the conference notice for <strong>{studentFullName}</strong> (Ref: {referenceNo}) for the scheduled date of <strong>{formattedConfDate}</strong> at <strong>{conferenceTime}</strong>.
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
            Ready for formal distribution and filing into student physical portfolio.
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
