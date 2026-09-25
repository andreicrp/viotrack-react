import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { StatusModal } from '../components/violations/StatusModal';
import { ResolutionModal } from '../components/violations/ResolutionModal';
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
  Check
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  const [smsSending, setSmsSending] = useState(false);
  const [smsCustomMessage, setSmsCustomMessage] = useState('');
  const [smsReportType, setSmsReportType] = useState('Incident Notification');

  const fromQRScan = searchParams.get('scan') === 'true' || searchParams.get('fromQRScan') === 'true';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadStudentAndRecords();
  }, [id]);

  useEffect(() => {
    // Auto-open Add Record modal if coming from QR scan like in PHP
    if (fromQRScan && student) {
      const timer = setTimeout(() => {
        setIsAddViolationOpen(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [fromQRScan, student]);

  const loadStudentAndRecords = async () => {
    setLoading(true);
    try {
      const [allStudents, allRecords] = await Promise.all([
        dataService.getStudents(),
        dataService.getRecords()
      ]);

      const found = allStudents.find(s => s.id === Number(id) || s.lrn === id);
      if (found) {
        setStudent(found);
        const studentHistory = allRecords.filter(r => r.student_id === found.id);
        setRecords(studentHistory);
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

  // PDF Report Generation
  const handleGenerateReport = () => {
    if (!student) return;
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setTextColor(39, 54, 127);
      doc.text(`VIOTRACK - OFFICIAL STUDENT DISCIPLINARY RECORD`, 14, 16);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Student: ${student.fname} ${student.lname} | LRN: ${student.lrn}`, 14, 23);
      doc.text(`Grade & Section: ${student.grade} - ${student.section} (${student.academicyear || '2025-2026'}) | Guardian: ${student.parent_name || 'N/A'} (${student.parent_contact || 'N/A'})`, 14, 28);
      doc.text(`Total Incidents Logged: ${records.length} | Generated: ${new Date().toLocaleString()}`, 14, 33);

      const tableData = records.map((r, idx) => [
        idx + 1,
        student.academicyear || '2025-2026',
        r.violation?.title || 'Infraction',
        new Date(r.date_reported).toLocaleString([], { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        r.violation?.type || 'Minor',
        r.sanction || 'None',
        r.status || 'Pending'
      ]);

      doc.autoTable({
        head: [['#', 'School Year', 'Violation Detail', 'Date Reported', 'Severity', 'Sanction', 'Status']],
        body: tableData,
        startY: 38,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 8.5 }
      });

      doc.save(`Student_Record_${student.lrn}_${Date.now()}.pdf`);
      success('Official Student Disciplinary Report exported as PDF!');
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
      const defaultNotice = `Notice for guardian of ${studentName}: Please be informed regarding student conduct record. Contact guidance office for details.`;
      await dataService.sendSMS(
        student.parent_contact,
        student.parent_name || 'Guardian',
        studentName,
        smsCustomMessage || defaultNotice
      );
      success(`SMS Disciplinary Alert dispatched to ${student.parent_contact} (${student.parent_name || 'Guardian'})!`);
      setIsSmsModalOpen(false);
      setSmsCustomMessage('');
    } catch (err) {
      error('Failed to dispatch SMS: ' + err.message);
    } finally {
      setSmsSending(false);
    }
  };

  // QR Code URL (points to /scan-qr route matching scan-qr.php)
  const qrData = student ? `${window.location.origin}/scan-qr?id=${student.id}&token=qr_${student.lrn}` : '';
  const qrUrl = student ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrData)}&margin=1` : '';

  // Metrics
  const totalCount = records.length;
  const pendingCount = records.filter(r => (r.status || '').toLowerCase() === 'pending').length;
  const investigationCount = records.filter(r => (r.status || '').toLowerCase() === 'investigation').length;
  const resolvedCount = records.filter(r => (r.status || '').toLowerCase() === 'resolved').length;

  // Standing Badge
  const standingText = totalCount === 0 ? 'Good Standing' : totalCount <= 2 ? 'Under Observation' : 'Disciplinary Action';
  const standingColor = totalCount === 0 ? '#10b981' : totalCount <= 2 ? '#f59e0b' : '#ef4444';
  const standingBg = totalCount === 0 ? '#f0fdf4' : totalCount <= 2 ? '#fffbeb' : '#fef2f2';

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
        <span style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <CheckCircle2 size={12} color="#16a34a" /> Resolved
        </span>
      );
    }
    if (s === 'investigation') {
      return (
        <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <Search size={12} color="#d97706" /> In Review
        </span>
      );
    }
    return (
      <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <Clock size={12} color="#dc2626" /> Pending
      </span>
    );
  };

  const renderSeverityBadge = (ty) => {
    const t = (ty || '').toLowerCase();
    if (t === 'major') {
      return (
        <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fef2f2', padding: '3px 8px', borderRadius: '6px' }}>
          <ShieldAlert size={12} color="#dc2626" /> Major
        </span>
      );
    }
    if (t === 'serious') {
      return (
        <span style={{ color: '#d97706', fontWeight: 700, fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#fffbeb', padding: '3px 8px', borderRadius: '6px' }}>
          <AlertTriangle size={12} color="#d97706" /> Serious
        </span>
      );
    }
    return (
      <span style={{ color: '#15803d', fontWeight: 700, fontSize: '12px', background: '#f0fdf4', padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle2 size={12} color="#15803d" /> Minor
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#27367f', animation: 'spin 1s linear infinite' }} />
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
          style={{ background: '#27367f', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
        >
          Return to Student Directory
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner Header with Actions */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '14px',
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              flexShrink: 0
            }}
          >
            <User size={24} color="#ffffff" />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {student.fname} {student.lname}
              </h2>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                LRN: {student.lrn}
              </span>
              <span
                style={{
                  background: standingBg,
                  color: standingColor,
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '20px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {totalCount === 0 ? <ShieldCheck size={13} /> : <AlertTriangle size={13} />}
                {standingText}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {student.grade} - {student.section} • Academic Year {student.academicyear || '2025-2026'}
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

      {/* 1. Student Information Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '22px 24px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          position: 'relative'
        }}
      >
        {/* Card Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
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
            <GraduationCap size={20} color="#27367f" /> Student Information Profile
          </h3>

          <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', background: '#eef2ff', border: '1px solid #c7d2fe', padding: '3.5px 12px', borderRadius: '12px' }}>
            Academic Year {student.academicyear || '2025-2026'}
          </span>
        </div>

        <div className="student-profile-grid">
          {/* Avatar + Main Identity */}
          <div className="student-profile-identity" style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img
                src={
                  student.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=27367f&color=fff&size=120`
                }
                alt={student.fname}
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3.5px solid #27367f',
                  boxShadow: '0 6px 16px rgba(39, 54, 127, 0.2)'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 15,
                  height: 15,
                  borderRadius: '50%',
                  background: '#10b981',
                  border: '2px solid #ffffff'
                }}
                title="Officially Enrolled"
              />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                STUDENT PROFILE
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', lineHeight: '1.25' }}>
                {student.fname} {student.lname}
              </div>
              <div style={{ fontSize: '12.5px', color: '#334155', marginTop: '4px', fontWeight: 600 }}>
                LRN: <strong style={{ color: '#0f172a' }}>{student.lrn}</strong>
              </div>
              <div style={{ fontSize: '11.5px', color: '#334155', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ background: '#f1f5f9', color: '#1e293b', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                  {student.gender || 'Female'}
                </span>
                <span style={{ background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Check size={11} strokeWidth={3} /> Active
                </span>
              </div>
            </div>
          </div>

          {/* Academic & Section Information */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#27367f', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <School size={13} color="#27367f" /> ACADEMIC PLACEMENT
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Grade & Section</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>
                {student.grade} - {student.section}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Enrollment Status</div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                <CheckCircle2 size={13} /> Active & Registered
              </div>
            </div>
          </div>

          {/* Contact & Guardian Information */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '8px'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#27367f', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={13} color="#27367f" /> GUARDIAN & CONTACT
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Parent / Guardian</div>
              <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>
                {student.parent_name || 'Guardian on File'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Contact Number</div>
              <a
                href={`tel:${student.parent_contact || '09156667789'}`}
                style={{
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#065f46',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '2px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textDecoration: 'none'
                }}
              >
                <Phone size={12} color="#059669" /> {student.parent_contact || '09156667789'}
              </a>
            </div>
            <div>
              <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>Email Address</div>
              <a
                href={`mailto:${student.email || `${student.fname.toLowerCase()}@school.com`}`}
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#1d4ed8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '2px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  maxWidth: '100%',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                <Mail size={12} color="#2563eb" style={{ flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {student.email || `${student.fname.toLowerCase()}@school.com`}
                </span>
              </a>
            </div>
          </div>

          {/* High-Res QR Code Scanner Frame */}
          <div
            className="student-profile-qr-box qr-code-section"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 16px',
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '16px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
            onClick={() => setIsQrModalOpen(true)}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#27367f'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.transform = 'translateY(0)'; }}
            title="Click to view & print full Student QR ID Pass"
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
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#27367f', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <QrCode size={14} /> Scan or Click to Print
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Quick Disciplinary Stats Metric Cards */}
      <div className="metric-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {/* Total Incidents */}
        <div
          onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'all' ? 'linear-gradient(180deg, #ffffff 0%, #f8faff 100%)' : '#ffffff',
            border: statusFilter === 'all' ? '2px solid #27367f' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: statusFilter === 'all' ? '0 6px 18px rgba(39, 54, 127, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <div style={{ fontSize: '11.5px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Incidents</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{totalCount}</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#eff6ff', color: '#27367f', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={22} />
          </div>
          {statusFilter === 'all' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #27367f, #3b82f6)' }} />
          )}
        </div>

        {/* Pending Review */}
        <div
          onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'pending' ? 'linear-gradient(180deg, #ffffff 0%, #fef2f2 100%)' : '#ffffff',
            border: statusFilter === 'pending' ? '2px solid #dc2626' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: statusFilter === 'pending' ? '0 6px 18px rgba(220, 38, 38, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <div style={{ fontSize: '11.5px', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Review</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#b91c1c', marginTop: '2px' }}>{pendingCount}</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Clock size={22} />
          </div>
          {statusFilter === 'pending' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #dc2626, #f87171)' }} />
          )}
        </div>

        {/* In Review */}
        <div
          onClick={() => { setStatusFilter('investigation'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'investigation' ? 'linear-gradient(180deg, #ffffff 0%, #fffbeb 100%)' : '#ffffff',
            border: statusFilter === 'investigation' ? '2px solid #d97706' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: statusFilter === 'investigation' ? '0 6px 18px rgba(217, 119, 6, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <div style={{ fontSize: '11.5px', color: '#b45309', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In Review</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>{investigationCount}</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Search size={22} />
          </div>
          {statusFilter === 'investigation' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #d97706, #fbbf24)' }} />
          )}
        </div>

        {/* Resolved & Cleared */}
        <div
          onClick={() => { setStatusFilter('resolved'); setCurrentPage(1); }}
          style={{
            background: statusFilter === 'resolved' ? 'linear-gradient(180deg, #ffffff 0%, #f0fdf4 100%)' : '#ffffff',
            border: statusFilter === 'resolved' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '16px 20px',
            boxShadow: statusFilter === 'resolved' ? '0 6px 18px rgba(22, 163, 74, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
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
            <div style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved & Cleared</div>
            <div style={{ fontSize: '26px', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>{resolvedCount}</div>
          </div>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={22} />
          </div>
          {statusFilter === 'resolved' && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3.5, background: 'linear-gradient(90deg, #16a34a, #34d399)' }} />
          )}
        </div>
      </div>

      {/* 3. Violation Record Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px 28px',
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
            gap: '16px',
            marginBottom: '20px',
            paddingBottom: '16px',
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
                    color: statusFilter === tab.id ? '#27367f' : '#475569',
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
                    style={{ cursor: 'pointer', accentColor: '#27367f' }}
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
                          style={{ cursor: 'pointer', accentColor: '#27367f' }}
                        />
                      </td>

                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img
                            src={
                              student.image ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=27367f&color=fff&size=50`
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
                    background: isSelected ? '#f8fafc' : '#ffffff',
                    border: isSelected ? '1.5px solid #27367f' : '1px solid #e2e8f0',
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
                        style={{ cursor: 'pointer', accentColor: '#27367f', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {r.violation?.title || 'Infraction'}
                      </span>
                    </div>
                    {renderSeverityBadge(r.violation?.type)}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px' }}>
                    <div style={{ color: '#64748b' }}>
                      📅 {new Date(r.date_reported).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })} at {new Date(r.date_reported).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {r.sanction && (
                      <div style={{ color: '#334155', marginTop: '4px' }}>
                        ⚖️ Sanction: <strong style={{ color: '#27367f' }}>{r.sanction}</strong>
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
              <div style={{ display: 'flex', gap: '4px' }}>
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
                      background: currentPage === page ? '#27367f' : '#fff',
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
          success('Violation incident added successfully for student!');
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
      {selectedRecordForResolution && (
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
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsSmsModalOpen(false); }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '520px',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              animation: 'fadeInUp 0.15s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 42, height: 42, borderRadius: '12px', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                    Dispatch SMS Guardian Notice
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                    Instant SMS alert transmission to student's parent / guardian
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSmsModalOpen(false)}
                style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSendSmsTrigger} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Recipient Details Pill Card */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12.5px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Guardian Name:</span>
                  <strong style={{ color: '#0f172a' }}>{student.parent_name || 'Lita Castillo (Guardian)'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Target Phone Number:</span>
                  <strong style={{ color: '#16a34a' }}>+63 {student.parent_contact || '09156867789'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Student LRN:</span>
                  <strong style={{ color: '#27367f' }}>{student.lrn} ({student.fname} {student.lname})</strong>
                </div>
              </div>

              {/* Report Type Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Notice Category
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {['Incident Notification', 'Parent Conference Needed', 'Sanction Notice', 'Attendance & Conduct'].map(t => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setSmsReportType(t)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: smsReportType === t ? '2px solid #10b981' : '1px solid #e2e8f0',
                        background: smsReportType === t ? '#ecfdf5' : '#ffffff',
                        color: smsReportType === t ? '#065f46' : '#64748b',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom SMS text */}
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  SMS Message Body
                </label>
                <textarea
                  rows={3}
                  placeholder={`[VioTrack Notice] Dear ${student.parent_name || 'Guardian'}, please be informed that student ${student.fname} ${student.lname} has a recorded notice under category: ${smsReportType}. Please contact the Guidance Office.`}
                  value={smsCustomMessage}
                  onChange={(e) => setSmsCustomMessage(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: '1.5'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsSmsModalOpen(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={smsSending}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 22px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: smsSending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={15} /> {smsSending ? 'Transmitting...' : 'Dispatch SMS Alert'}
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
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} color="#27367f" />
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
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                borderRadius: '16px',
                padding: '20px',
                color: '#ffffff',
                border: '1.5px solid rgba(255,255,255,0.15)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                position: 'relative'
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                VIOTRACK • PERPETUAL HELP COLLEGE OF MANILA
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
                {student.fname} {student.lname}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                {student.grade} - {student.section} • S.Y. {student.academicyear || '2025-2026'}
              </div>

              <div
                style={{
                  margin: '16px auto',
                  padding: '12px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  display: 'inline-block',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.2)'
                }}
              >
                <img
                  src={qrUrl}
                  alt={`QR Pass for ${student.lrn}`}
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>

              <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.05em' }}>
                LRN: {student.lrn}
              </div>
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>
                Scan to instantly access disciplinary log & track location
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  background: '#27367f',
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
                  boxShadow: '0 4px 14px rgba(39, 54, 127, 0.25)'
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
    </div>
  );
};
