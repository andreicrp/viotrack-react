import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { StatusModal } from '../components/violations/StatusModal';
import { ResolutionModal } from '../components/violations/ResolutionModal';
import { ParentSummonsModal } from '../components/violations/ParentSummonsModal';
import { CustomSelect } from '../components/common/CustomSelect';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Users,
  School,
  GraduationCap,
  QrCode,
  Send,
  Download,
  Plus,
  Trash2,
  FileText,
  Search,
  ArrowLeft,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flag,
  X,
  Printer,
  Sparkles,
  MessageSquare,
  Maximize2,
  ExternalLink,
  Calendar,
  Layers,
  MapPin,
  Check,
  Loader2,
  RotateCcw
} from 'lucide-react';
import { getJsPDF } from '../utils/pdfHelper';
import { getStudentQrCodeUrl, getStudentQrValue } from '../utils/qrHelper';

export const StudentViolationDetailPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isAddViolationOpen, setIsAddViolationOpen] = useState(false);
  const [recordForStatusChange, setRecordForStatusChange] = useState(null);
  const [selectedRecordForResolution, setSelectedRecordForResolution] = useState(null);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isSummonsModalOpen, setIsSummonsModalOpen] = useState(false);
  const [summonsTargetRecord, setSummonsTargetRecord] = useState(null);
  const [smsSending, setSmsSending] = useState(false);
  const [smsCustomMessage, setSmsCustomMessage] = useState('');
  const [smsReportType, setSmsReportType] = useState('Incident Notification');
  const [allStudentRecords, setAllStudentRecords] = useState([]); // All violations (all statuses) for report

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadStudentAndRecords();
  }, [id]);

  const loadStudentAndRecords = async () => {
    setLoading(true);
    try {
      const [allStudents, allRecords] = await Promise.all([
        dataService.getStudents(),
        dataService.getRecords()
      ]);

      const found = allStudents.find(s => String(s.id) === String(id) || String(s.lrn) === String(id));
      if (found) {
        setStudent(found);
        const isApproved = (r) => {
          if (!r) return false;
          if (r.approval_status === 'Under Approval' || r.status === 'Under Approval') return false;
          if (r.approval_status === 'Rejected' || r.status === 'Rejected') return false;
          // Must be explicitly approved by an administrator
          return r.approval_status === 'Approved';
        };
        // For display: only approved records
        const studentHistory = (allRecords || [])
          .filter(r => String(r.student_id) === String(found.id))
          .filter(isApproved);
        setRecords(studentHistory);

        // For the report: ALL violations (all approval/status states)
        const allHistory = (allRecords || [])
          .filter(r => String(r.student_id) === String(found.id))
          .sort((a, b) => new Date(b.date_reported) - new Date(a.date_reported));
        setAllStudentRecords(allHistory);
      } else {
        error('Student profile not found.');
      }
    } catch (err) {
      error('Failed to load student records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRecord = async (recId) => {
    if (window.confirm(`Are you sure you want to remove violation record #${recId}?`)) {
      try {
        await dataService.deleteRecord(recId);
        success('Violation record deleted successfully.');
        loadStudentAndRecords();
      } catch (err) {
        error('Delete failed: ' + err.message);
      }
    }
  };

  const handleStatusUpdated = async (recordId, newStatus) => {
    try {
      await dataService.updateRecordStatus(recordId, { status: newStatus });
      setRecords(records.map(r => r.id === recordId ? { ...r, status: newStatus } : r));
      success(`Status updated successfully to "${newStatus}"!`);
    } catch (err) {
      error('Failed to update status: ' + err.message);
    }
  };

  // PDF Report Generation — Full Violation History
  const handleGenerateReport = async () => {
    if (!student) return;
    try {
      const doc = await getJsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      const now = new Date();

      // ── HEADER BANNER ────────────────────────────────────────────────────
      doc.setFillColor(7, 52, 95); // #07345f brand navy
      doc.rect(0, 0, pageW, 38, 'F');

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('VIOTRACK', margin, 14);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 210, 240);
      doc.text('Official Student Disciplinary & Conduct Report', margin, 21);

      doc.setFontSize(8);
      doc.setTextColor(150, 190, 230);
      doc.text(`Generated: ${now.toLocaleString()}`, margin, 28);
      doc.text(`Printed by: ${user?.email || 'System Administrator'}`, margin, 34);

      // ── STUDENT PROFILE SECTION ───────────────────────────────────────────
      let y = 46;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(7, 52, 95);
      doc.text('STUDENT PROFILE', margin, y);

      // Thin rule
      doc.setDrawColor(7, 52, 95);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 8;

      const col1 = margin;
      const col2 = pageW / 2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);

      const profileRows = [
        ['Full Name:', `${student.fname} ${student.lname}`, 'Student ID (LRN):', student.lrn || 'N/A'],
        ['Grade & Section:', `${student.grade} - ${student.section}`, 'Gender:', student.gender || 'N/A'],
        ['Academic Year:', student.academicyear || '2025–2026', 'Guardian:', student.parent_name || 'N/A'],
        ['Contact No.:', student.parent_contact || 'N/A', 'Address:', student.address || 'N/A'],
      ];

      profileRows.forEach(([lbl1, val1, lbl2, val2]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(lbl1, col1, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(String(val1), col1 + 32, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(lbl2, col2, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(String(val2), col2 + 32, y);

        y += 6;
      });

      // ── SUMMARY METRICS ───────────────────────────────────────────────────
      y += 4;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(7, 52, 95);
      doc.text('VIOLATION SUMMARY', margin, y);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 8;

      const total = allStudentRecords.length;
      const minor = allStudentRecords.filter(r => (r.violation?.type || '').toLowerCase() === 'minor').length;
      const serious = allStudentRecords.filter(r => (r.violation?.type || '').toLowerCase() === 'serious').length;
      const major = allStudentRecords.filter(r => (r.violation?.type || '').toLowerCase() === 'major').length;
      const resolved = allStudentRecords.filter(r => (r.status || '').toLowerCase() === 'resolved').length;
      const pending = allStudentRecords.filter(r => (r.status || '').toLowerCase() === 'pending').length;
      const underApproval = allStudentRecords.filter(r =>
        r.approval_status === 'Under Approval' || r.status === 'Under Approval'
      ).length;

      const summaryBoxes = [
        { label: 'Total Violations', value: total, color: [15, 23, 42] },
        { label: 'Minor', value: minor, color: [5, 150, 105] },
        { label: 'Serious', value: serious, color: [234, 88, 12] },
        { label: 'Major', value: major, color: [220, 38, 38] },
        { label: 'Resolved', value: resolved, color: [59, 130, 246] },
        { label: 'Pending', value: pending, color: [100, 116, 139] },
      ];

      const boxW = (pageW - 2 * margin - 5 * 3) / 6;
      summaryBoxes.forEach((box, i) => {
        const bx = margin + i * (boxW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(...box.color);
        doc.setLineWidth(0.4);
        doc.roundedRect(bx, y, boxW, 16, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(...box.color);
        doc.text(String(box.value), bx + boxW / 2, y + 8, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(box.label, bx + boxW / 2, y + 13, { align: 'center' });
      });

      y += 24;

      // ── VIOLATION DETAIL TABLE ─────────────────────────────────────────────
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(7, 52, 95);
      doc.text('COMPLETE VIOLATION HISTORY', margin, y);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 2, pageW - margin, y + 2);
      y += 6;

      const tableData = allStudentRecords.map((r, idx) => [
        idx + 1,
        r.date_reported
          ? new Date(r.date_reported).toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
          : 'N/A',
        r.violation?.title || 'Unspecified Infraction',
        (r.violation?.type || 'Minor'),
        r.sanction || 'None',
        r.reported_by || r.teacher_name || 'N/A',
        r.approval_status || r.status || 'N/A',
        r.status || 'N/A',
      ]);

      doc.autoTable({
        head: [['#', 'Date', 'Violation', 'Severity', 'Sanction', 'Reported By', 'Approval', 'Status']],
        body: tableData,
        startY: y,
        theme: 'striped',
        headStyles: {
          fillColor: [7, 52, 95],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
        },
        styles: {
          fontSize: 7.5,
          cellPadding: 2.5,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 7 },
          1: { cellWidth: 22 },
          2: { cellWidth: 50 },
          3: { cellWidth: 18 },
          4: { cellWidth: 30 },
          5: { cellWidth: 25 },
          6: { cellWidth: 22 },
          7: { cellWidth: 18 },
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (data) => {
          // Color-code severity column
          if (data.column.index === 3) {
            const txt = (data.cell.raw || '').toString().toLowerCase();
            if (txt === 'major') { data.cell.styles.textColor = [220, 38, 38]; data.cell.styles.fontStyle = 'bold'; }
            else if (txt === 'serious') { data.cell.styles.textColor = [234, 88, 12]; data.cell.styles.fontStyle = 'bold'; }
            else { data.cell.styles.textColor = [5, 150, 105]; }
          }
          // Color-code status column
          if (data.column.index === 7) {
            const txt = (data.cell.raw || '').toString().toLowerCase();
            if (txt === 'resolved') { data.cell.styles.textColor = [5, 150, 105]; }
            else if (txt === 'pending') { data.cell.styles.textColor = [220, 38, 38]; }
            else { data.cell.styles.textColor = [100, 116, 139]; }
          }
        }
      });

      // ── FOOTER ON EACH PAGE ───────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFillColor(248, 250, 252);
        doc.rect(0, pageH - 12, pageW, 12, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(
          `VIOTRACK Disciplinary System  •  ${student.fname} ${student.lname} (${student.lrn})  •  Confidential`,
          margin, pageH - 5
        );
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 5, { align: 'right' });
      }

      doc.save(`VioTrack_Report_${student.lrn}_${now.toISOString().slice(0,10)}.pdf`);
      success(`Report generated: ${total} violation(s) included.`);
    } catch (err) {
      error('Failed to generate PDF report: ' + err.message);
    }
  };

  // SMS Parent Notification
  const handleSendSmsTrigger = async (e) => {
    e.preventDefault();
    if (!student?.parent_contact) {
      error('No guardian contact number on file for this student.');
      return;
    }

    setSmsSending(true);
    try {
      const studentName = `${student.fname} ${student.lname}`;
      const defaultNotice = `[VioTrack Notice] Dear ${student.parent_name || 'Guardian'}, please be informed that student ${studentName} has a recorded notice under category: ${smsReportType}. Please contact the Guidance Office.`;
      const messageBody = smsCustomMessage && smsCustomMessage.trim() ? smsCustomMessage.trim() : defaultNotice;

      const res = await dataService.sendSMS(
        student.parent_contact,
        student.parent_name || 'Guardian',
        studentName,
        smsReportType,
        messageBody
      );

      if (res?.success) {
        success(`SMS notice successfully dispatched to ${student.parent_contact} via iProgTech!`);
      } else {
        info(`SMS transmission logged to ${student.parent_contact}.`);
      }
      setIsSmsModalOpen(false);
      setSmsCustomMessage('');
    } catch (err) {
      error('Failed to dispatch SMS: ' + err.message);
    } finally {
      setSmsSending(false);
    }
  };

  // QR Code data & URL (clean student identifier or public verification URL, avoiding localhost)
  const qrData = student ? getStudentQrValue(student) : '';
  const qrUrl = student ? getStudentQrCodeUrl(student, 240, 1) : '';

  // Metrics
  const totalCount = records.length;
  const pendingCount = records.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const investigationCount = records.filter(r => (r.status || '').toLowerCase() === 'investigation').length;
  const resolvedCount = records.filter(r => (r.status || '').toLowerCase() === 'resolved').length;

  // Standing Badge configuration for clean light theme
  const getStandingConfig = () => {
    if (totalCount === 0) {
      return {
        text: 'Good Standing',
        color: '#065f46',
        bg: '#ecfdf5',
        border: '1px solid #a7f3d0',
        glow: '0 1px 3px rgba(16, 185, 129, 0.1)',
        icon: <ShieldCheck size={13} color="#059669" strokeWidth={2.4} />
      };
    }
    if (totalCount <= 2) {
      return {
        text: 'Under Observation',
        color: '#92400e',
        bg: '#fffbeb',
        border: '1px solid #fde68a',
        glow: '0 1px 3px rgba(245, 158, 11, 0.1)',
        icon: <AlertTriangle size={13} color="#d97706" strokeWidth={2.4} />
      };
    }
    return {
      text: 'Disciplinary Action',
      color: '#991b1b',
      bg: '#fef2f2',
      border: '1px solid #fecaca',
      glow: '0 1px 3px rgba(239, 68, 68, 0.1)',
      icon: <ShieldAlert size={13} color="#dc2626" strokeWidth={2.4} />
    };
  };
  const standing = getStandingConfig();

  // Filtered Records
  const filtered = useMemo(() => {
    return records.filter(r => {
      const vTitle = (r.violation?.title || '').toLowerCase();
      const vType = (r.violation?.type || '').toLowerCase();
      const status = (r.status || '').toLowerCase();
      const query = searchTerm.toLowerCase().trim();

      const matchesSearch = !query || vTitle.includes(query) || vType.includes(query) || status.includes(query);
      const matchesStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filtered.length / entriesPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginated.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (recId) => {
    if (selectedIds.includes(recId)) {
      setSelectedIds(selectedIds.filter(id => id !== recId));
    } else {
      setSelectedIds([...selectedIds, recId]);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Delete ${selectedIds.length} selected violation record(s)?`)) {
      try {
        for (const rId of selectedIds) {
          await dataService.deleteRecord(rId);
        }
        success(`${selectedIds.length} records deleted successfully.`);
        setSelectedIds([]);
        loadStudentAndRecords();
      } catch (err) {
        error('Batch delete failed: ' + err.message);
      }
    }
  };

  // Status Badge UI
  const renderStatusBadge = (st) => {
    const s = (st || '').toLowerCase();
    if (s === 'resolved') {
      return (
        <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3.5px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <CheckCircle2 size={12} color="#059669" strokeWidth={2.4} /> Resolved
        </span>
      );
    }
    if (s === 'investigation') {
      return (
        <span style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', padding: '3.5px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Search size={12} color="#d97706" strokeWidth={2.4} /> In Review
        </span>
      );
    }
    return (
      <span style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '3.5px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={12} color="#dc2626" strokeWidth={2.4} /> Pending
      </span>
    );
  };

  const renderSeverityBadge = (ty) => {
    const t = (ty || '').toLowerCase();
    if (t === 'major') {
      return (
        <span style={{ color: '#991b1b', fontWeight: 800, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', border: '1px solid #fecaca', padding: '3px 8px', borderRadius: '6px' }}>
          <ShieldAlert size={12} color="#dc2626" strokeWidth={2.2} /> Major
        </span>
      );
    }
    if (t === 'serious') {
      return (
        <span style={{ color: '#9a3412', fontWeight: 800, fontSize: '11.5px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fff7ed', border: '1px solid #fed7aa', padding: '3px 8px', borderRadius: '6px' }}>
          <AlertTriangle size={12} color="#ea580c" strokeWidth={2.2} /> Serious
        </span>
      );
    }
    return (
      <span style={{ color: '#065f46', fontWeight: 800, fontSize: '11.5px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle2 size={12} color="#059669" strokeWidth={2.2} /> Minor
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#07345f', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#334155' }}>Loading student violation record...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '18px' }}>Student Profile Not Found</h3>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>The requested student could not be located in the database.</p>
        <button
          onClick={() => navigate('/students')}
          style={{ background: '#0f172a', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
        >
          Return to Student Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Top Banner Header with Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <User size={26} strokeWidth={2.4} color="#0f172a" style={{ flexShrink: 0 }} />

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                {student.fname} {student.lname}
              </h2>
              <span
                style={{
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  letterSpacing: '0.02em'
                }}
              >
                Student ID: {student.lrn}
              </span>
              <span
                style={{
                  background: standing.bg,
                  color: standing.color,
                  border: standing.border,
                  boxShadow: standing.glow,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  letterSpacing: '0.02em'
                }}
              >
                {standing.icon}
                {standing.text}
              </span>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              {student.grade} - {student.section} &bull; Academic Year {student.academicyear || '2025–2026'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              onClick={() => navigate(-1)}
              className="page-banner-btn-secondary"
            >
              <ArrowLeft size={15} /> Back
            </button>

            {isAdmin && (
              <button
                onClick={() => setIsSmsModalOpen(true)}
                className="page-banner-btn-secondary"
              >
                <Send size={15} /> Send Message
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  setSummonsTargetRecord(records[0] || null);
                  setIsSummonsModalOpen(true);
                }}
                className="page-banner-btn-secondary"
                title="Generate formal printable Parent Summons notice letter"
              >
                <FileText size={15} /> Parent Summons
              </button>
            )}

            <button
              onClick={handleGenerateReport}
              className="page-banner-btn-secondary"
            >
              <Download size={15} /> Generate Report
            </button>
          </div>

          <button
            onClick={() => setIsAddViolationOpen(true)}
            className="page-banner-primary-btn"
          >
            <Plus size={16} strokeWidth={2.5} /> Add new record
          </button>
        </div>
      </div>

      {/* 1. Student Information Profile Card (Clean, Balanced Hero Layout) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          position: 'relative'
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#0f172a',
              margin: 0,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <GraduationCap size={20} color="#0f172a" /> Student Information Profile
          </h3>

          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', background: '#f8fafc', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '20px' }}>
            Academic Year {student.academicyear || '2025–2026'}
          </span>
        </div>

        <div className="student-profile-hero-layout">
          {/* Column 1: Avatar + Identity (Enlarged & Prominent) */}
          <div className="student-profile-hero-identity">
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={
                  student.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=0f172a&color=fff&size=160`
                }
                alt={student.fname}
                style={{
                  width: 104,
                  height: 104,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3.5px solid #0f172a',
                  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.16)'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 3,
                  right: 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '3px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                }}
                title="Officially Enrolled"
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px' }}>
                STUDENT PROFILE
              </div>
              <div style={{ fontSize: '21px', fontWeight: 850, color: '#0f172a', lineHeight: '1.2', letterSpacing: '-0.02em' }}>
                {student.fname} {student.lname}
              </div>
              <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '4px', fontWeight: 600 }}>
                Student ID: <strong style={{ color: '#0f172a' }}>{student.lrn}</strong>
              </div>
              <div style={{ fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #cbd5e1', padding: '3.5px 10px', borderRadius: '6px', fontWeight: 700 }}>
                  {student.gender || 'Male'}
                </span>
                <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '3.5px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={13} strokeWidth={3} /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Structured Details Grid */}
          <div className="student-profile-hero-grid">
            {/* Academic Placement */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '2px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <School size={13} color="#0f172a" /> ACADEMIC PLACEMENT
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {student.grade} - {student.section}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <CheckCircle2 size={11} color="#059669" /> Active & Registered
              </div>
            </div>

            {/* Guardian & Contact */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '2px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Users size={13} color="#0f172a" /> PARENT / GUARDIAN
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {student.parent_name || 'Guardian on File'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <a
                  href={`tel:${student.parent_contact || '09156667789'}`}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#0f172a',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    textDecoration: 'none',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    padding: '2px 7px',
                    borderRadius: '5px'
                  }}
                  title="Guardian Contact"
                >
                  <Phone size={11} color="#16a34a" /> {student.parent_contact || '09156667789'}
                </a>
              </div>
            </div>

            {/* Contact Details */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '2px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={13} color="#0f172a" /> INSTITUTIONAL EMAIL
              </div>
              <a
                href={`mailto:${student.email || `${student.fname.toLowerCase()}@school.com`}`}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#0f172a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '2px',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <Mail size={12} color="#64748b" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {student.email || `${student.fname.toLowerCase()}@school.com`}
                </span>
              </a>
              {student.contact && (
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Student Mobile: <strong style={{ color: '#334155' }}>{student.contact}</strong>
                </div>
              )}
            </div>

            {/* Address & Campus */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '2px'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <MapPin size={13} color="#0f172a" /> CAMPUS & RESIDENCE
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {student.address || 'Sampaloc, Manila'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                UPHSM Manila Campus
              </div>
            </div>
          </div>

          {/* Column 3: High-Res QR Code Scanner Frame */}
          <div className="student-profile-hero-qr">
            <div
              onClick={() => setIsQrModalOpen(true)}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15, 23, 42, 0.12)'; }}
              onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
              title="Click to view & print Student QR ID Pass"
            >
              <div id="qrcode" style={{ width: '155px', height: '155px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={qrUrl}
                  alt={`QR Pass for ${student.lrn}`}
                  style={{
                    width: '155px',
                    height: '155px',
                    maxWidth: '155px',
                    maxHeight: '155px',
                    borderRadius: '8px',
                    display: 'block'
                  }}
                />
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <QrCode size={14} strokeWidth={2.4} /> Scan or Click to Print
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Interactive Quick Disciplinary Stats Metric Cards */}
      <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {/* Total Incidents */}
        <div
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'all' ? '#f0f4f8' : '#ffffff',
            border: statusFilter === 'all' ? '2px solid #07345f' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: statusFilter === 'all' ? '0 2px 8px rgba(7, 52, 95, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (statusFilter !== 'all') {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (statusFilter !== 'all') {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Incidents</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#07345f', marginTop: '2px' }}>{totalCount}</div>
          </div>
          <FileText size={20} color="#1f2937" strokeWidth={2} />
          {statusFilter === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }} />
          )}
        </div>

        {/* Pending Review */}
        <div
          onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'pending' ? '#f0f4f8' : '#ffffff',
            border: statusFilter === 'pending' ? '2px solid #07345f' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: statusFilter === 'pending' ? '0 2px 8px rgba(7, 52, 95, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (statusFilter !== 'pending') {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (statusFilter !== 'pending') {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Pending Review</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{pendingCount}</div>
          </div>
          <Clock size={20} color="#1f2937" strokeWidth={2} />
          {statusFilter === 'pending' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }} />
          )}
        </div>

        {/* In Review */}
        <div
          onClick={() => { setStatusFilter('investigation'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'investigation' ? '#f0f4f8' : '#ffffff',
            border: statusFilter === 'investigation' ? '2px solid #07345f' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: statusFilter === 'investigation' ? '0 2px 8px rgba(7, 52, 95, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (statusFilter !== 'investigation') {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (statusFilter !== 'investigation') {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>In Review</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{investigationCount}</div>
          </div>
          <Search size={20} color="#1f2937" strokeWidth={2} />
          {statusFilter === 'investigation' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }} />
          )}
        </div>

        {/* Resolved & Cleared */}
        <div
          onClick={() => { setStatusFilter('resolved'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'resolved' ? '#f0f4f8' : '#ffffff',
            border: statusFilter === 'resolved' ? '2px solid #07345f' : '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            boxShadow: statusFilter === 'resolved' ? '0 2px 8px rgba(7, 52, 95, 0.1)' : '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseOver={(e) => {
            if (statusFilter !== 'resolved') {
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseOut={(e) => {
            if (statusFilter !== 'resolved') {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em' }}>Resolved & Cleared</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{resolvedCount}</div>
          </div>
          <CheckCircle2 size={20} color="#1f2937" strokeWidth={2} />
          {statusFilter === 'resolved' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2.5, background: '#07345f' }} />
          )}
        </div>
      </div>

      {/* 3. Violation Record Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
        }}
      >
        {/* Table Card Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f1f5f9'
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
              {student.fname} {student.lname} Violation Record List
            </h3>
            <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>
              {student.fname} {student.lname} has <strong>{totalCount}</strong> violation {totalCount === 1 ? 'record' : 'record(s)'}
            </p>
          </div>

          {selectedIds.length > 0 && isAdmin && (
            <button
              onClick={handleDeleteSelected}
              style={{
                background: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                padding: '9px 14px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '12.5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Trash2 size={14} /> Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>

        {/* Table Controls (Entries per page & Search) */}
        <div
          className="student-record-toolbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '130px' }}>
            <CustomSelect
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              options={[
                { value: 10, label: '10 / page' },
                { value: 25, label: '25 / page' },
                { value: 50, label: '50 / page' },
                { value: 100, label: '100 / page' }
              ]}
            />
          </div>

          <div className="student-record-toolbar-right" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Status Filter Tabs */}
            <div className="status-filter-tabs" style={{ display: 'flex', background: '#f1f5f9', padding: '3px', borderRadius: '10px', gap: '3px' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'investigation', label: 'In Review' },
                { id: 'resolved', label: 'Resolved' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setStatusFilter(tab.id); setCurrentPage(1); }}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: statusFilter === tab.id ? '#ffffff' : 'transparent',
                    color: statusFilter === tab.id ? '#07345f' : '#475569',
                    boxShadow: statusFilter === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="search-box-wrapper" style={{ position: 'relative', minWidth: '200px' }}>
              <input
                type="text"
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '8px 30px 8px 32px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '13px',
                  width: '100%',
                  outline: 'none',
                  color: '#0f172a',
                  background: '#f8fafc',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2 }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Violation Table (Desktop View) */}
        <div className="responsive-table-desktop" style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 14px', width: '38px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && selectedIds.length === paginated.length}
                    onChange={handleSelectAll}
                    style={{ cursor: 'pointer', accentColor: '#07345f' }}
                  />
                </th>
                <th style={{ padding: '12px 14px' }}>STUDENT</th>
                <th style={{ padding: '12px 14px' }}>YEAR</th>
                <th style={{ padding: '12px 14px' }}>VIOLATION</th>
                <th style={{ padding: '12px 14px' }}>DATE REPORTED</th>
                <th style={{ padding: '12px 14px' }}>VIOLATION TYPE</th>
                <th style={{ padding: '12px 14px' }}>STATUS</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckCircle2 size={26} />
                      </div>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                        No violation records recorded
                      </h4>
                      <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        Student currently has a clean disciplinary record for this filter selection.
                      </p>
                      <button
                        onClick={() => setIsAddViolationOpen(true)}
                        style={{
                          marginTop: '8px',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          padding: '7px 16px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '12.5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Plus size={14} /> Log Disciplinary Incident
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((r) => {
                  const isSelected = selectedIds.includes(r.id);
                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#f8fafc' : '#ffffff',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafbfc'; }}
                      onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(r.id)}
                          style={{ cursor: 'pointer', accentColor: '#07345f' }}
                        />
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={
                              student.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=07345f&color=fff&size=50`
                            }
                            alt={student.fname}
                            style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                              {student.fname} {student.lname}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              ID: {student.lrn}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '12.5px' }}>
                          {student.grade} - {student.section}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {student.academicyear || '2025-2026'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {r.violation?.title || 'Infraction'}
                        </div>
                        {r.sanction && (
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                            Sanction: {r.sanction}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 14px', color: '#475569', fontSize: '12.5px' }}>
                        {new Date(r.date_reported).toLocaleDateString([], {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric'
                        })}{' '}
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(r.date_reported).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        {renderSeverityBadge(r.violation?.type)}
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => setRecordForStatusChange(r)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                          title="Click to update status"
                        >
                          {renderStatusBadge(r.status)}
                        </button>
                      </td>

                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setSummonsTargetRecord(r);
                                setIsSummonsModalOpen(true);
                              }}
                              style={{
                                background: '#f8fafc',
                                color: '#0f172a',
                                border: '1px solid #cbd5e1',
                                padding: '5px 9px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                              onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                              title="Generate printable Parent Summons letter for this incident"
                            >
                              <FileText size={12} /> Summons
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => setSelectedRecordForResolution(r)}
                              style={{
                                background: '#eff6ff',
                                color: '#2563eb',
                                border: '1px solid #bfdbfe',
                                padding: '5px 10px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Resolve or document case"
                            >
                              <FileText size={12} /> Resolve
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleRemoveRecord(r.id)}
                              style={{
                                background: '#fff1f2',
                                color: '#e11d48',
                                border: '1px solid #fecdd3',
                                padding: '5px 9px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Delete record"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Violation Cards (Mobile View) */}
        <div className="responsive-cards-mobile">
          {paginated.length === 0 ? (
            <div style={{ padding: '30px 16px', textAlign: 'center' }}>
              <CheckCircle2 size={24} color="#10b981" />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>No records found</div>
            </div>
          ) : (
            paginated.map((r) => {
              const isSelected = selectedIds.includes(r.id);
              return (
                <div
                  key={r.id}
                  style={{
                    background: isSelected ? '#f0f4f8' : '#ffffff',
                    border: isSelected ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(r.id)}
                        style={{ cursor: 'pointer', accentColor: '#07345f', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {r.violation?.title || 'Infraction'}
                      </span>
                    </div>
                    {renderSeverityBadge(r.violation?.type)}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#64748b' }}>
                      {new Date(r.date_reported).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })} at {new Date(r.date_reported).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {r.sanction && (
                      <div style={{ color: '#334155', marginTop: '4px' }}>
                        Sanction: <strong style={{ color: '#07345f' }}>{r.sanction}</strong>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px dashed #e2e8f0' }}>
                    <button
                      onClick={() => setRecordForStatusChange(r)}
                      style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      {renderStatusBadge(r.status)}
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setSummonsTargetRecord(r);
                            setIsSummonsModalOpen(true);
                          }}
                          style={{
                            background: '#f8fafc',
                            color: '#0f172a',
                            border: '1px solid #cbd5e1',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Generate summons letter"
                        >
                          <FileText size={11} /> Summons
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setSelectedRecordForResolution(r)}
                          style={{
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: '1px solid #bfdbfe',
                            padding: '4px 9px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FileText size={11} /> Resolve
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => handleRemoveRecord(r.id)}
                          style={{
                            background: '#fff1f2',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table Footer with Pagination */}
        {filtered.length > 0 && (
          <div
            className="pagination-footer-responsive table-footer"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '16px',
              fontSize: '12.5px',
              color: '#64748b'
            }}
          >
            <div>
              Showing {Math.min((currentPage - 1) * entriesPerPage + 1, filtered.length)} to{' '}
              {Math.min(currentPage * entriesPerPage, filtered.length)} of {filtered.length} entries
            </div>

            {totalPages > 1 && (
              <div className="pagination-btn-group" style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '4px 10px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#cbd5e1' : '#334155'
                  }}
                >
                  « Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '4px 10px',
                      border: '1px solid #cbd5e1',
                      background: currentPage === page ? '#07345f' : '#fff',
                      color: currentPage === page ? '#fff' : '#334155',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: currentPage === page ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '4px 10px',
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#cbd5e1' : '#334155'
                  }}
                >
                  Next »
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Add Record Modal */}
      <AddViolationModal
        isOpen={isAddViolationOpen}
        onClose={() => setIsAddViolationOpen(false)}
        preselectedStudentId={student.id}
        onRecordAdded={() => {
          loadStudentAndRecords();
        }}
      />

      {/* 5. Status Modal */}
      <StatusModal
        isOpen={!!recordForStatusChange}
        onClose={() => setRecordForStatusChange(null)}
        record={recordForStatusChange}
        onUpdated={handleStatusUpdated}
      />

      {/* 6. Resolution Modal */}
      {isAdmin && selectedRecordForResolution && (
        <ResolutionModal
          isOpen={!!selectedRecordForResolution}
          onClose={() => setSelectedRecordForResolution(null)}
          record={selectedRecordForResolution}
          onUpdated={() => loadStudentAndRecords()}
        />
      )}

      {/* 7. Send SMS Modal */}
      {isSmsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            willChange: 'opacity'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSmsModalOpen(false); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '540px',
              boxShadow: '0 25px 60px -15px rgba(7, 52, 95, 0.35)',
              border: '1.5px solid #cbd5e1',
              overflow: 'hidden',
              padding: '26px 28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              animation: 'modalScaleUp 0.16s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '14px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#07345f', letterSpacing: '-0.01em' }}>
                  Dispatch SMS Guardian Notice
                </h4>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  Instant SMS alert transmission to student's parent / guardian
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSmsModalOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendSmsTrigger} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Recipient Details Outline Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f0f7ff 100%)',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Guardian Name:</span>
                  <strong style={{ color: '#07345f', fontWeight: 700 }}>
                    {student.parent_name || 'Lita Castillo (Guardian)'}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Target Phone Number:</span>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      background: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                  >
                    +63 {student.parent_contact || '09156667789'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Student ID:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        background: '#ffffff',
                        color: '#07345f',
                        border: '1px solid #cbd5e1',
                        padding: '1px 7px',
                        borderRadius: '6px',
                        fontSize: '11.5px'
                      }}
                    >
                      {student.lrn}
                    </span>
                    <strong style={{ color: '#07345f' }}>({student.fname} {student.lname})</strong>
                  </div>
                </div>
              </div>

              {/* Notice Category Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                  Notice Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['Incident Notification', 'Parent Conference Needed', 'Sanction Notice', 'Attendance & Conduct'].map(t => {
                    const isSelected = smsReportType === t;
                    return (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setSmsReportType(t)}
                        style={{
                          padding: '9px 12px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #07345f' : '1.5px solid #cbd5e1',
                          background: isSelected ? '#f0f7ff' : '#ffffff',
                          color: isSelected ? '#07345f' : '#475569',
                          fontSize: '12px',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          boxShadow: isSelected ? '0 2px 8px rgba(7, 52, 95, 0.12)' : 'none'
                        }}
                      >
                        {isSelected && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#2563eb',
                              display: 'inline-block'
                            }}
                          />
                        )}
                        <span>{t}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom SMS text */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    SMS Message Body
                  </label>
                  {smsCustomMessage && (
                    <button
                      type="button"
                      onClick={() => setSmsCustomMessage('')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      <RotateCcw size={11} /> Reset to Default
                    </button>
                  )}
                </div>
                <textarea
                  rows={4}
                  placeholder={`[VioTrack Notice] Dear ${student.parent_name || 'Guardian'}, please be informed that student ${student.fname} ${student.lname} has a recorded notice under category: ${smsReportType}. Please contact the Guidance Office.`}
                  value={smsCustomMessage}
                  onChange={(e) => setSmsCustomMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#07345f',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    background: '#ffffff',
                    transition: 'border-color 0.15s ease'
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#07345f'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    Standard carrier transmission rates apply
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                    {(smsCustomMessage || `[VioTrack Notice] Dear ${student.parent_name || 'Guardian'}, please be informed that student ${student.fname} ${student.lname} has a recorded notice under category: ${smsReportType}. Please contact the Guidance Office.`).length} characters
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSmsModalOpen(false)}
                  style={{
                    background: '#ffffff',
                    color: '#475569',
                    border: '1.5px solid #cbd5e1',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smsSending}
                  style={{
                    background: '#07345f',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: smsSending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(7, 52, 95, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!smsSending) e.currentTarget.style.background = '#0b192c'; }}
                  onMouseLeave={(e) => { if (!smsSending) e.currentTarget.style.background = '#07345f'; }}
                >
                  {smsSending ? (
                    <>
                      <Loader2 size={15} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Dispatch SMS Alert</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Official Student QR Pass Preview & Print Modal */}
      {isQrModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px',
            willChange: 'opacity'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsQrModalOpen(false); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '440px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              padding: '28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              animation: 'fadeInUp 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                  Official Student QR Pass
                </h4>
              </div>
              <button
                onClick={() => setIsQrModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', width: 28, height: 28, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable ID badge format */}
            <div
              id="printable-qr-card"
              style={{
                width: '100%',
                background: '#ffffff',
                borderRadius: '16px',
                padding: '22px 20px',
                color: '#0f172a',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#07345f', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                VIOTRACK
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                {student.fname} {student.lname}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                {student.grade} - {student.section} • S.Y. {student.academicyear || '2025-2026'}
              </div>

              <div
                style={{
                  margin: '16px auto',
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  display: 'inline-block',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                }}
              >
                <img
                  src={qrUrl}
                  alt={`QR Pass for ${student.lrn}`}
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '14px', fontWeight: 800, color: '#07345f', letterSpacing: '0.04em' }}>
                Student ID: {student.lrn}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Scan to instantly access disciplinary log & track location
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  background: '#07345f',
                  color: '#ffffff',
                  border: 'none',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 14px rgba(7, 52, 95, 0.25)'
                }}
              >
                <Printer size={15} /> Print QR Pass Badge
              </button>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '11px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Parent Summons Letter Modal */}
      {isAdmin && isSummonsModalOpen && (
        <ParentSummonsModal
          isOpen={isSummonsModalOpen}
          onClose={() => setIsSummonsModalOpen(false)}
          student={student}
          record={summonsTargetRecord}
          records={records}
        />
      )}
    </div>
  );
};

export default StudentViolationDetailPage;

