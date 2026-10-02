import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { SearchableViolationSelect } from '../common/SearchableViolationSelect';
import { SearchableStudentSelect } from '../common/SearchableStudentSelect';
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
  const { success, error } = useNotification();

  const [step, setStep] = useState(1); // 1: Student, 2: Offense & Sanction, 3: Status & SMS
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Multi-select state
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedViolationIds, setSelectedViolationIds] = useState([]);

  const [formData, setFormData] = useState({
    sanction: '',
    remarks: '',
    notify_parent_sms: true,
    status: 'Pending'
  });

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
          { timeout: 6000, enableHighAccuracy: true }
        );
      }
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
        setStep(2); // If student is pre-selected (from QR scan), jump straight to Step 2!
      } else {
        setSelectedStudentIds([]);
        setStep(1);
      }
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
            reported_by_name: user?.name || 'Authorized Faculty / Administrator',
            reported_by_type: user?.role || 'admin',
            sanction: formData.sanction || violation.default_sanction || 'Under Review',
            remarks: formData.remarks || 'Disciplinary incident report logged.',
            status: formData.status,
            sms_notified: formData.notify_parent_sms,
            lat: location.lat,
            lng: location.lng,
            accuracy: location.accuracy
          });
          createdRecords.push(newRecord);
        }

        // Send consolidated SMS alert to guardian if enabled
        if (formData.notify_parent_sms && student.parent_contact) {
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
    } catch (err) {
      error('Failed to save violation records: ' + err.message);
    } finally {
      releaseSubmissionLock(lockKey);
      setLoading(false);
    }
  };

  const selectedStudents = students.filter(s => selectedStudentIds.includes(Number(s.id)));
  const selectedViolations = violations.filter(v => selectedViolationIds.includes(Number(v.id)));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Student Violation" icon={AlertTriangle} maxWidth="540px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Step Progress Header */}
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            
            {/* Step 1: Student */}
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '8px',
                border: step === 1 ? '1.5px solid #07345f' : step > 1 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                background: step === 1 ? '#07345f' : step > 1 ? '#ecfdf5' : '#ffffff',
                color: step === 1 ? '#ffffff' : step > 1 ? '#065f46' : '#475569',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: step === 1 ? '0 2px 6px rgba(7, 52, 95, 0.2)' : 'none',
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: step === 1 ? '#ffffff' : step > 1 ? '#10b981' : '#f1f5f9',
                color: step === 1 ? '#07345f' : step > 1 ? '#ffffff' : '#64748b',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '8px',
                border: step === 2 ? '1.5px solid #07345f' : step > 2 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                background: step === 2 ? '#07345f' : step > 2 ? '#ecfdf5' : '#ffffff',
                color: step === 2 ? '#ffffff' : step > 2 ? '#065f46' : '#475569',
                cursor: selectedStudentIds.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                boxShadow: step === 2 ? '0 2px 6px rgba(7, 52, 95, 0.2)' : 'none',
                opacity: selectedStudentIds.length === 0 ? 0.6 : 1,
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: step === 2 ? '#ffffff' : step > 2 ? '#10b981' : '#f1f5f9',
                color: step === 2 ? '#07345f' : step > 2 ? '#ffffff' : '#64748b',
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 6px',
                borderRadius: '8px',
                border: step === 3 ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                background: step === 3 ? '#07345f' : '#ffffff',
                color: step === 3 ? '#ffffff' : '#475569',
                cursor: (selectedStudentIds.length > 0 && selectedViolationIds.length > 0) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                boxShadow: step === 3 ? '0 2px 6px rgba(7, 52, 95, 0.2)' : 'none',
                opacity: (selectedStudentIds.length === 0 || selectedViolationIds.length === 0) ? 0.6 : 1,
                fontFamily: 'inherit'
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: step === 3 ? '#ffffff' : '#f1f5f9',
                color: step === 3 ? '#07345f' : '#64748b',
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
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', minHeight: '260px', maxHeight: '78vh', overflowY: 'auto' }}>
          
          {/* ================= STEP 1: STUDENT SELECTION ================= */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={14} color="#07345f" />
                    Select Student(s) <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span style={{ fontSize: '11px', color: selectedStudentIds.length > 0 ? '#07345f' : '#64748b', fontWeight: 600 }}>
                    {selectedStudentIds.length} Selected
                  </span>
                </label>
                <SearchableStudentSelect
                  students={students}
                  value={selectedStudentIds}
                  onChange={(newIds) => setSelectedStudentIds(newIds)}
                  isMulti={true}
                  inline={true}
                  maxListHeight="340px"
                  placeholder="Search student by name, LRN, or section..."
                />
              </div>

              {selectedStudents.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 10px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Selected ({selectedStudents.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxHeight: '65px', overflowY: 'auto' }}>
                    {selectedStudents.map(s => (
                      <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '5px', padding: '2px 6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a' }}>
                          {s.fname} {s.lname}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
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
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Layers size={14} color="#07345f" />
                    Violation Offense Category <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span style={{ fontSize: '11px', color: selectedViolationIds.length > 0 ? '#07345f' : '#64748b', fontWeight: 600 }}>
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
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
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
                    border: '1px solid #cbd5e1',
                    fontSize: '12.5px',
                    color: '#0f172a',
                    background: '#ffffff',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'block' }}>
                  Incident Details &amp; Faculty Remarks <span style={{ fontSize: '11px', fontWeight: 500, color: '#94a3b8' }}>(Optional)</span>
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
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    padding: '8px 10px',
                    color: '#0f172a',
                    background: '#ffffff',
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
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'block' }}>
                  Initial Case Status
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  {[
                    { id: 'Pending', label: 'Pending Action', color: '#ef4444' },
                    { id: 'Investigation', label: 'In Review', color: '#f59e0b' },
                    { id: 'Resolved', label: 'Resolved Now', color: '#10b981' }
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => setFormData(prev => ({ ...prev, status: st.id }))}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        border: formData.status === st.id ? `1.5px solid ${st.color}` : '1px solid #e2e8f0',
                        background: formData.status === st.id ? `${st.color}15` : '#ffffff',
                        color: formData.status === st.id ? st.color : '#64748b',
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
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
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
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#07345f', flexShrink: 0 }}
                />
                <label htmlFor="notify_sms_check" style={{ fontSize: '12px', color: '#0f172a', cursor: 'pointer', margin: 0, fontFamily: 'inherit', lineHeight: 1.3 }}>
                  <strong style={{ display: 'block' }}>Dispatch SMS Alert to Guardian(s)</strong>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {selectedStudents.length > 0
                      ? `Sends instant notification to ${selectedStudents.length} guardian contact(s).`
                      : 'Sends instant notification to guardian on file.'}
                  </span>
                </label>
              </div>

              {/* Quick Summary Card */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Incident Summary
                </div>
                <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.4 }}>
                  <strong>Student:</strong> {selectedStudents.map(s => `${s.fname} ${s.lname}`).join(', ') || 'None selected'}
                </div>
                <div style={{ fontSize: '12px', color: '#1e293b', lineHeight: 1.4, marginTop: '2px' }}>
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
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
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
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
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
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                color: '#0f172a',
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
                background: selectedStudentIds.length === 0 ? '#94a3b8' : '#07345f',
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
                fontFamily: 'inherit',
                boxShadow: selectedStudentIds.length === 0 ? 'none' : '0 3px 10px rgba(7, 52, 95, 0.25)'
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
                background: selectedViolationIds.length === 0 ? '#94a3b8' : '#07345f',
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
                fontFamily: 'inherit',
                boxShadow: selectedViolationIds.length === 0 ? 'none' : '0 3px 10px rgba(7, 52, 95, 0.25)'
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
                background: '#07345f',
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
                boxShadow: '0 4px 12px rgba(7, 52, 95, 0.3)',
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
  );
};

export default AddViolationModal;
