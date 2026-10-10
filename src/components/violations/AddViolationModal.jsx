import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { SearchableViolationSelect } from '../common/SearchableViolationSelect';
import { SearchableStudentSelect } from '../common/SearchableStudentSelect';
import { UnderApprovalModal } from './UnderApprovalModal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { claimSubmissionLock, releaseSubmissionLock } from '../../utils/dataIntegrity';
import {
  AlertTriangle,
  MapPin,
  Check,
  Users,
  Layers,
  ArrowRight,
  ArrowLeft,
  Send,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';

export const AddViolationModal = ({ isOpen, onClose, onRecordAdded, preselectedStudentId = null }) => {
  const { user } = useAuth();
  const { success, error, info } = useNotification();

  const [step, setStep] = useState(1); // 1: Student, 2: Offense & Sanction, 3: Status & SMS
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Multi-select state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedViolationIds, setSelectedViolationIds] = useState([]);

  // Under Approval Popup State
  const [isApprovalPopupOpen, setIsApprovalPopupOpen] = useState(false);
  const [approvalPopupData, setApprovalPopupData] = useState(null);
  const [pendingRecords, setPendingRecords] = useState(null);

  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    captured: false,
    timestamp: null
  });

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
      const geoTimer = setTimeout(() => {
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const acc = Math.round(pos.coords.accuracy);
              setLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: acc,
                captured: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            },
            () => {
              setLocation({
                lat: null,
                lng: null,
                accuracy: null,
                captured: false,
                timestamp: null
              });
            },
            { timeout: 6000, enableHighAccuracy: false }
          );
        }
      }, 200);
      return () => clearTimeout(geoTimer);
    }
  }, [isOpen, preselectedStudentId]);

  const loadDropdownData = async () => {
    try {
      const [sData, vData] = await Promise.all([
        dataService.getStudents(),
        dataService.getViolations()
      ]);
      setStudents(sData);
      setViolations(vData);

      if (preselectedStudentId) {
        setSelectedStudentIds([Number(preselectedStudentId)]);
      } else {
        setSelectedStudentIds([]);
      }
      setStep(1);
      setSelectedViolationIds([]);
    } catch (err) {
      console.error('Error loading dropdown data:', err);
    }
  };

  const handleViolationsChange = (newIds, selectedViolationObjects) => {
    setSelectedViolationIds(newIds);

    // Auto-suggest combined default sanctions
    const sanctionsList = (selectedViolationObjects || [])
      .map(v => v.default_sanction || v.sanction)
      .filter(Boolean);

    if (sanctionsList.length > 0) {
      const uniqueSanctions = Array.from(new Set(sanctionsList));
      setFormData(prev => ({
        ...prev,
        sanction: uniqueSanctions.join(', ')
      }));
    }
  };

  const handleNextToStep2 = () => {
    if (selectedStudentIds.length === 0) {
      error('Please select at least one student.');
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (selectedViolationIds.length === 0) {
      error('Please select at least one violation offense.');
      return;
    }
    setStep(3);
  };

  const isTeacher = user?.role === 'teacher';

  const [formData, setFormData] = useState({
    sanction: '',
    remarks: '',
    notify_parent_sms: true,
    status: isTeacher ? 'Under Approval' : 'Pending'
  });

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    // Guard: Never auto-record if not on the final review step
    if (step !== 3) {
      if (step === 1) handleNextToStep2();
      else if (step === 2) handleNextToStep3();
      return;
    }

    if (selectedStudentIds.length === 0) {
      error('Please select at least one student.');
      setStep(1);
      return;
    }
    if (selectedViolationIds.length === 0) {
      error('Please select at least one violation offense.');
      setStep(2);
      return;
    }

    const lockKey = `add_violation_${selectedStudentIds.join('_')}_${selectedViolationIds.join('_')}`;
    if (!claimSubmissionLock(lockKey)) {
      console.warn('Duplicate rapid submit blocked by data integrity lock.');
      return;
    }

    const isApprovalMode = isTeacher || formData.status === 'Under Approval';

    setLoading(true);
    try {
      const createdRecords = [];
      const chosenStudents = students.filter(s => selectedStudentIds.includes(Number(s.id)));
      const chosenViolations = violations.filter(v => selectedViolationIds.includes(Number(v.id)));

      // Create a record for every student and violation combination
      for (const student of chosenStudents) {
        for (const violation of chosenViolations) {
          const newRecord = await dataService.addRecord({
            student_id: Number(student.id),
            violation_id: Number(violation.id),
            reported_by_name: user?.name || (isTeacher ? 'Faculty Teacher' : 'Authorized Administrator'),
            reported_by_type: isTeacher ? 'teacher' : (isApprovalMode ? 'teacher' : (user?.role || 'admin')),
            sanction: formData.sanction || violation.default_sanction || 'Under Review',
            remarks: formData.remarks || 'Disciplinary incident report logged.',
            status: isApprovalMode ? 'Under Approval' : formData.status,
            approval_status: isApprovalMode ? 'Under Approval' : 'Approved',
            sms_notified: formData.notify_parent_sms,
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy
          });
          createdRecords.push(newRecord);
        }

        // Send consolidated SMS alert to guardian if enabled and admin approved
        if (!isApprovalMode && formData.notify_parent_sms && student.parent_contact) {
          const violationTitles = chosenViolations.map(v => v.title).join(', ');
          await dataService.sendSMS(
            student.parent_contact,
            student.parent_name || 'Guardian',
            `${student.fname} ${student.lname}`,
            violationTitles
          );
        }
      }

      const totalCount = createdRecords.length;
      const studentCount = chosenStudents.length;
      const violationCount = chosenViolations.length;

      if (isApprovalMode) {
        // Teacher / Approval Mode: Show Under Approval confirmation modal!
        setApprovalPopupData({
          studentNames: chosenStudents.map(s => `${s.fname} ${s.lname}`),
          violationTitles: chosenViolations.map(v => `[${v.type}] ${v.title}`),
          sanction: formData.sanction || 'Under Administrative Review',
          reportedBy: user?.name || (isTeacher ? 'Faculty Teacher' : 'Reporting Faculty')
        });
        setPendingRecords(createdRecords);
        setIsApprovalPopupOpen(true);
      } else {
        // Admin Direct Mode: Direct success
        if (studentCount === 1 && violationCount === 1) {
          success(`Incident record for ${chosenStudents[0]?.fname || 'student'} added successfully!`);
        } else {
          success(`Successfully recorded ${violationCount} violation(s) for ${studentCount} student(s) (${totalCount} total entries)!`);
        }

        onRecordAdded?.(createdRecords[0] || createdRecords);
        onClose();

        // Reset Form State
        setSelectedStudentIds([]);
        setSelectedViolationIds([]);
        setStep(1);
        setFormData({
          sanction: '',
          remarks: '',
          notify_parent_sms: true,
          status: 'Pending'
        });
      }
    } catch (err) {
      error('Failed to save violation records: ' + err.message);
    } finally {
      releaseSubmissionLock(lockKey);
      setLoading(false);
    }
  };

  const handleCloseApprovalPopup = () => {
    setIsApprovalPopupOpen(false);
    if (pendingRecords) {
      onRecordAdded?.(pendingRecords[0] || pendingRecords);
      setPendingRecords(null);
    }
    onClose();

    // Reset Form State
    setSelectedStudentIds([]);
    setSelectedViolationIds([]);
    setStep(1);
    setFormData({
      sanction: '',
      remarks: '',
      notify_parent_sms: true,
      status: 'Pending'
    });
  };

  const selectedStudents = students.filter(s => selectedStudentIds.includes(Number(s.id)));
  const selectedViolations = violations.filter(v => selectedViolationIds.includes(Number(v.id)));

  return (
    <>
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log Student Violation"
      icon={AlertTriangle}
      maxWidth="680px"
      dialogClassName="violation-entry-modal"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Step Progress Header */}
        <div className="modal-stepper-header" style={{ padding: '10px 16px', background: 'var(--bg-surface-elevated, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            
            {/* Step 1: Student */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`violation-step-pill ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '8px',
                border: step === 1 ? '1.5px solid var(--brand-blue, #0f172a)' : step > 1 ? '1px solid #10b981' : '1px solid var(--border-subtle, #e2e8f0)',
                background: step === 1 ? 'var(--brand-blue, #0f172a)' : step > 1 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface, #ffffff)',
                color: step === 1 ? '#ffffff' : step > 1 ? '#34d399' : 'var(--text-muted, #475569)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: step === 1 ? '#ffffff' : step > 1 ? '#10b981' : 'var(--bg-surface-hover, #f1f5f9)',
                color: step === 1 ? 'var(--brand-blue, #0f172a)' : step > 1 ? '#ffffff' : 'var(--text-muted, #64748b)',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {step > 1 ? <Check size={12} strokeWidth={3} /> : '1'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Student
              </span>
            </button>

            {/* Step 2: Offense */}
            <button
              type="button"
              onClick={() => { if (selectedStudentIds.length > 0) setStep(2); }}
              disabled={selectedStudentIds.length === 0}
              className={`violation-step-pill ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '8px',
                border: step === 2 ? '1.5px solid var(--brand-blue, #0f172a)' : step > 2 ? '1px solid #10b981' : '1px solid var(--border-subtle, #e2e8f0)',
                background: step === 2 ? 'var(--brand-blue, #0f172a)' : step > 2 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface, #ffffff)',
                color: step === 2 ? '#ffffff' : step > 2 ? '#34d399' : 'var(--text-muted, #475569)',
                cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: step === 2 ? '#ffffff' : step > 2 ? '#10b981' : 'var(--bg-surface-hover, #f1f5f9)',
                color: step === 2 ? 'var(--brand-blue, #0f172a)' : step > 2 ? '#ffffff' : 'var(--text-muted, #64748b)',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {step > 2 ? <Check size={12} strokeWidth={3} /> : '2'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Offense
              </span>
            </button>

            {/* Step 3: Status & SMS */}
            <button
              type="button"
              onClick={() => { if (selectedStudentIds.length > 0 && selectedViolationIds.length > 0) setStep(3); }}
              disabled={selectedStudentIds.length === 0 || selectedViolationIds.length === 0}
              className={`violation-step-pill ${step === 3 ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '8px',
                border: step === 3 ? '1.5px solid var(--brand-blue, #0f172a)' : '1px solid var(--border-subtle, #e2e8f0)',
                background: step === 3 ? 'var(--brand-blue, #0f172a)' : 'var(--bg-surface, #ffffff)',
                color: step === 3 ? '#ffffff' : 'var(--text-muted, #475569)',
                cursor: (selectedStudentIds.length > 0 && selectedViolationIds.length > 0) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: step === 3 ? '#ffffff' : 'var(--bg-surface-hover, #f1f5f9)',
                color: step === 3 ? 'var(--brand-blue, #0f172a)' : 'var(--text-muted, #64748b)',
                fontSize: '11px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                3
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Status &amp; SMS
              </span>
            </button>

          </div>
        </div>

        {/* Modal Step Content Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', minHeight: '260px', maxHeight: '78vh', overflowY: 'auto' }}>
          
          {/* ================= STEP 1: STUDENT SELECTION ================= */}
          {step === 1 && (
            <div className="violation-student-step" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={14} color="var(--brand-blue, #0f172a)" />
                    Select Student(s) <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span className="student-selection-count" style={{ fontSize: '12px', color: selectedStudentIds.length > 0 ? 'var(--brand-blue, #0f172a)' : 'var(--text-muted, #64748b)', fontWeight: 700 }}>
                    {selectedStudentIds.length} {selectedStudentIds.length === 1 ? 'student' : 'students'} selected
                  </span>
                </label>
                <SearchableStudentSelect
                  students={students}
                  value={selectedStudentIds}
                  onChange={(newIds) => setSelectedStudentIds(newIds)}
                  isMulti={true}
                  inline={true}
                  maxListHeight="min(42vh, 360px)"
                  placeholder="Search student by name, Student ID, or section..."
                />
              </div>

              {selectedStudents.length > 0 && (
                <div className="violation-selected-students" style={{ background: 'var(--bg-surface-elevated, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '10px', padding: '10px 12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '7px' }}>
                    Ready to log for
                  </div>
                  <div className="violation-selected-students-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '72px', overflowY: 'auto' }}>
                    {selectedStudents.map(s => (
                      <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-subtle, #cbd5e1)', borderRadius: '6px', padding: '4px 8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary, #0f172a)' }}>
                          {s.fname} {s.lname}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted, #64748b)' }}>
                          ({s.grade}-{s.section})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= STEP 2: OFFENSE & SANCTION ================= */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Layers size={14} color="var(--brand-blue, #07345f)" />
                    Violation Offense Category <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span style={{ fontSize: '11px', color: selectedViolationIds.length > 0 ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                    {selectedViolationIds.length} Selected
                  </span>
                </label>
                <SearchableViolationSelect
                  violations={violations}
                  value={selectedViolationIds}
                  onChange={handleViolationsChange}
                  isMulti={true}
                  inline={true}
                  maxListHeight="280px"
                  placeholder="Search and choose infraction(s)..."
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '4px', display: 'block' }}>
                  Prescribed Sanction / Corrective Measure
                </label>
                <input
                  type="text"
                  value={formData.sanction}
                  onChange={(e) => setFormData({ ...formData, sanction: e.target.value })}
                  placeholder="e.g. 1st Offense: Written Reprimand, Community Service"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    height: '38px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '12.5px',
                    color: 'var(--text-primary, #0f172a)',
                    background: 'var(--bg-input, #ffffff)',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '4px', display: 'block' }}>
                  Incident Details &amp; Faculty Remarks <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted, #94a3b8)' }}>(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Specify location, witnesses, circumstances, or confiscated items..."
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    fontSize: '12px',
                    padding: '8px 10px',
                    color: 'var(--text-primary, #0f172a)',
                    background: 'var(--bg-input, #ffffff)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: '1.4'
                  }}
                />
              </div>
            </div>
          )}

          {/* ================= STEP 3: STATUS & SMS DISPATCH ================= */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Initial Case Status */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', marginBottom: '6px', display: 'block' }}>
                  Initial Case Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                  {[
                    { id: 'Under Approval', label: '⏳ Under Approval', color: '#d97706' },
                    { id: 'Pending', label: 'Pending Action', color: '#ef4444' },
                    { id: 'Investigation', label: 'In Review', color: '#f59e0b' },
                    { id: 'Resolved', label: 'Resolved Now', color: '#10b981' }
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setFormData(prev => ({ ...prev, status: st.id }))}
                      style={{
                        padding: '8px 4px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        border: formData.status === st.id ? `1.5px solid ${st.color}` : '1px solid var(--border-subtle, #e2e8f0)',
                        background: formData.status === st.id ? `${st.color}25` : 'var(--bg-surface, #ffffff)',
                        color: formData.status === st.id ? st.color : 'var(--text-muted, #64748b)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        textAlign: 'center',
                        fontFamily: 'inherit'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SMS Notification Toggle */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated, #f8fafc)',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  id="notify_sms_check"
                  checked={formData.notify_parent_sms}
                  onChange={(e) => setFormData({ ...formData, notify_parent_sms: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-blue, #07345f)', flexShrink: 0 }}
                />
                <label htmlFor="notify_sms_check" style={{ fontSize: '12px', color: 'var(--text-primary, #0f172a)', cursor: 'pointer', margin: 0, fontFamily: 'inherit', lineHeight: 1.3 }}>
                  <strong style={{ display: 'block' }}>Dispatch SMS Alert to Guardian(s)</strong>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                    {selectedStudents.length > 0
                      ? `Sends instant notification to ${selectedStudents.length} guardian contact(s).`
                      : 'Sends instant notification to guardian on file.'}
                  </span>
                </label>
              </div>

              {/* Quick Summary Card */}
              <div style={{ background: 'var(--bg-surface-elevated, #eff6ff)', border: '1px solid var(--border-subtle, #bfdbfe)', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-blue, #1e40af)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Incident Summary
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary, #1e293b)', lineHeight: 1.4 }}>
                  <strong>Student:</strong> {selectedStudents.map(s => `${s.fname} ${s.lname}`).join(', ') || 'None selected'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-primary, #1e293b)', lineHeight: 1.4, marginTop: '2px' }}>
                  <strong>Offense:</strong> {selectedViolations.map(v => v.title).join(', ') || 'None selected'}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Wizard Footer Navigation */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border-subtle, #e2e8f0)',
            background: 'var(--bg-surface-elevated, #f8fafc)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0
          }}
        >
          {/* Left Back / Cancel */}
          {step === 1 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: '12.5px',
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(prev => Math.max(1, prev - 1))}
              style={{
                borderRadius: '8px',
                padding: '8px 14px',
                fontWeight: 600,
                fontSize: '12.5px',
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontFamily: 'inherit'
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          {/* Right Next / Save */}
          {step === 1 ? (
            <button
              type="button"
              onClick={handleNextToStep2}
              disabled={selectedStudentIds.length === 0}
              style={{
                background: selectedStudentIds.length === 0 ? 'var(--text-dim, #94a3b8)' : 'var(--brand-blue, #0f172a)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: '12.5px',
                color: '#ffffff',
                border: 'none',
                cursor: selectedStudentIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit'
              }}
            >
              <span>Next: Offense</span>
              <ArrowRight size={14} />
            </button>
          ) : step === 2 ? (
            <button
              type="button"
              onClick={handleNextToStep3}
              disabled={selectedViolationIds.length === 0}
              style={{
                background: selectedViolationIds.length === 0 ? 'var(--text-dim, #94a3b8)' : 'var(--brand-blue, #0f172a)',
                borderRadius: '8px',
                padding: '8px 16px',
                fontWeight: 700,
                fontSize: '12.5px',
                color: '#ffffff',
                border: 'none',
                cursor: selectedViolationIds.length === 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit'
              }}
            >
              <span>Next: Status &amp; SMS</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="btn btn-primary btn-save-violation-action"
              disabled={loading}
              style={{
                background: 'var(--brand-blue, #0f172a)',
                borderRadius: '8px',
                padding: '8px 18px',
                fontWeight: 700,
                fontSize: '12.5px',
                color: '#ffffff',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'inherit'
              }}
            >
              <Check size={14} />
              {loading
                ? 'Recording...'
                : selectedStudentIds.length > 1 || selectedViolationIds.length > 1
                ? `Save (${selectedStudentIds.length * selectedViolationIds.length})`
                : 'Save & Record'}
            </button>
          )}
        </div>
      </form>
    </Modal>

    {/* Dedicated Popup for Teacher Submission Under Approval */}
    <UnderApprovalModal
      isOpen={isApprovalPopupOpen}
      onClose={handleCloseApprovalPopup}
      recordData={approvalPopupData}
      students={students}
      violations={violations}
    />
    </>
  );
};

export default AddViolationModal;
