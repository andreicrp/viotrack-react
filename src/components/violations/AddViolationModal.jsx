import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { SearchableViolationSelect } from '../common/SearchableViolationSelect';
import { SearchableStudentSelect } from '../common/SearchableStudentSelect';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import {
  AlertTriangle,
  MapPin,
  Check,
  Phone
} from 'lucide-react';

export const AddViolationModal = ({ isOpen, onClose, onRecordAdded, preselectedStudentId = null }) => {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [formData, setFormData] = useState({
    student_id: preselectedStudentId || '',
    violation_id: '',
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

  const sanctionPresets = [
    'Written Reprimand & Warning',
    '1-Hour Campus Community Service',
    'Guidance Counselor Referral',
    'Parent-Teacher Disciplinary Conference'
  ];

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
            // No permission or unavailable: do not set fake coordinates
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

  useEffect(() => {
    if (formData.student_id && students.length > 0) {
      const found = students.find(s => s.id === Number(formData.student_id));
      setSelectedStudent(found || null);
    } else {
      setSelectedStudent(null);
    }
  }, [formData.student_id, students]);

  const loadDropdownData = async () => {
    try {
      const [sData, vData] = await Promise.all([
        dataService.getStudents(),
        dataService.getViolations()
      ]);
      setStudents(sData);
      setViolations(vData);
      if (preselectedStudentId) {
        setFormData(prev => ({ ...prev, student_id: preselectedStudentId }));
        const matched = sData.find(s => s.id === Number(preselectedStudentId));
        setSelectedStudent(matched || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViolationSelect = (violationItem) => {
    if (violationItem) {
      setFormData(prev => ({
        ...prev,
        violation_id: violationItem.id,
        sanction: violationItem.default_sanction || violationItem.sanction || prev.sanction
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        violation_id: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.student_id || !formData.violation_id) {
      error('Please select both a student and a violation offense category.');
      return;
    }

    setLoading(true);
    try {
      const currentStudent = selectedStudent || students.find(s => s.id === Number(formData.student_id));
      const selectedViolation = violations.find(v => v.id === Number(formData.violation_id));

      const newRecord = await dataService.addRecord({
        student_id: Number(formData.student_id),
        violation_id: Number(formData.violation_id),
        reported_by_name: user?.name || 'Authorized Faculty / Administrator',
        reported_by_type: user?.role || 'admin',
        sanction: formData.sanction || 'Under Review',
        remarks: formData.remarks || 'Standard disciplinary incident report logged.',
        status: formData.status,
        sms_notified: formData.notify_parent_sms,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy
      });

      if (formData.notify_parent_sms && currentStudent?.parent_contact) {
        await dataService.sendSMS(
          currentStudent.parent_contact,
          currentStudent.parent_name || 'Guardian',
          `${currentStudent.fname} ${currentStudent.lname}`,
          selectedViolation?.title || 'Disciplinary Infraction'
        );
      }

      success(`Incident record for ${currentStudent?.fname || 'student'} added successfully!`);
      onRecordAdded?.(newRecord);
      onClose();
      setFormData({
        student_id: preselectedStudentId || '',
        violation_id: '',
        sanction: '',
        remarks: '',
        notify_parent_sms: true,
        status: 'Pending'
      });
    } catch (err) {
      error('Failed to save violation: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedOffense = violations.find(v => v.id === Number(formData.violation_id));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Violation Record" icon={AlertTriangle} maxWidth="600px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px 24px' }}>
          
          {/* Real Geolocation Tag Banner (Only shown when device GPS is genuinely captured) */}
          {location.captured && location.lat != null && location.lng != null && (
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(22, 101, 52, 0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <MapPin size={17} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#14532d' }}>
                    Incident Geolocation Tagged
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#166534', marginTop: '1px' }}>
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </div>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, background: '#ffffff', color: '#15803d', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: '12px' }}>
                ±{location.accuracy}m Accuracy
              </span>
            </div>
          )}

          {/* Preselected or Searchable Student Selector */}
          {selectedStudent && preselectedStudentId ? (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <img
                src={
                  selectedStudent.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudent.fname + ' ' + selectedStudent.lname)}&background=27367f&color=fff&size=80`
                }
                alt={selectedStudent.fname}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid #27367f', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  {selectedStudent.fname} {selectedStudent.lname}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                  LRN: <strong style={{ color: '#27367f' }}>{selectedStudent.lrn}</strong> • {selectedStudent.grade} - {selectedStudent.section}
                </div>
              </div>
              {selectedStudent.parent_contact && (
                <div style={{ fontSize: '11.5px', color: '#047857', background: '#ecfdf5', padding: '4px 10px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Phone size={12} /> {selectedStudent.parent_contact}
                </div>
              )}
            </div>
          ) : (
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
                Select Student <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <SearchableStudentSelect
                students={students}
                value={formData.student_id}
                onChange={(sid) => setFormData({ ...formData, student_id: sid })}
              />
            </div>
          )}

          {/* Custom Searchable Violation Offense Category */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', margin: 0 }}>
                Violation Offense Category <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {selectedOffense && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: selectedOffense.type?.toLowerCase() === 'major' ? '#fef2f2' : selectedOffense.type?.toLowerCase() === 'serious' ? '#fffbeb' : '#f0fdf4',
                    color: selectedOffense.type?.toLowerCase() === 'major' ? '#dc2626' : selectedOffense.type?.toLowerCase() === 'serious' ? '#d97706' : '#16a34a'
                  }}
                >
                  {selectedOffense.type} Severity
                </span>
              )}
            </div>

            {/* Custom Searchable Dropdown */}
            <SearchableViolationSelect
              violations={violations}
              value={formData.violation_id}
              onChange={handleViolationSelect}
            />
          </div>

          {/* Disciplinary Sanction & Quick Presets */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Prescribed Sanction / Corrective Measure
            </label>
            <input
              type="text"
              value={formData.sanction}
              onChange={(e) => setFormData({ ...formData, sanction: e.target.value })}
              placeholder="e.g. 1-Hour Community Service, Written Warning"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                height: '40px',
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none',
                marginBottom: '8px',
                fontFamily: 'inherit'
              }}
            />
            {/* Quick Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {sanctionPresets.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setFormData(prev => ({ ...prev, sanction: p }))}
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 9px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    fontFamily: 'inherit'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>

          {/* Incident Remarks */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Incident Details & Faculty Remarks
            </label>
            <textarea
              rows={3}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Specify the location, witnesses, circumstances, or confiscated items..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                padding: '10px 12px',
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Initial Case Status */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'block' }}>
              Initial Case Status
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
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
                    padding: '8px 10px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: formData.status === st.id ? `2px solid ${st.color}` : '1px solid #e2e8f0',
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

          {/* SMS Notification Checkbox */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <input
              type="checkbox"
              id="notify_sms_check"
              checked={formData.notify_parent_sms}
              onChange={(e) => setFormData({ ...formData, notify_parent_sms: e.target.checked })}
              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#27367f', flexShrink: 0 }}
            />
            <label htmlFor="notify_sms_check" style={{ fontSize: '12.5px', color: '#334155', cursor: 'pointer', margin: 0, fontFamily: 'inherit' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>Dispatch Immediate SMS Alert to Guardian</strong>
              <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                Sends an automated disciplinary notice to {selectedStudent?.parent_contact ? `+63 ${selectedStudent.parent_contact}` : 'the guardian on record'}.
              </span>
            </label>
          </div>

        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              borderRadius: '10px',
              padding: '9px 18px',
              fontWeight: 600,
              fontSize: '13px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{
              background: '#27367f',
              borderRadius: '10px',
              padding: '9px 22px',
              fontWeight: 700,
              fontSize: '13px',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(39, 54, 127, 0.25)',
              fontFamily: 'inherit'
            }}
          >
            <Check size={16} />
            {loading ? 'Submitting...' : 'Save & Record Violation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
