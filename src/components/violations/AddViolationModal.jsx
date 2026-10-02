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
  ShieldCheck
} from 'lucide-react';

export const AddViolationModal = ({ isOpen, onClose, onRecordAdded, preselectedStudentId = null }) => {
  const { user } = useAuth();
  const { success, error } = useNotification();

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
      } else {
        setSelectedStudentIds([]);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (selectedStudentIds.length === 0) {
      error('Please select at least one student.');
      return;
    }
    if (selectedViolationIds.length === 0) {
      error('Please select at least one violation offense.');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Violation Record" icon={AlertTriangle} maxWidth="640px">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 18px', maxHeight: '74vh', overflowY: 'auto' }}>
          
          {/* Real Geolocation Tag Banner */}
          {location.captured && location.lat != null && location.lng != null && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} color="#16a34a" />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#14532d' }}>
                  GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </span>
              </div>
              <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d' }}>
                ±{location.accuracy}m Accuracy
              </span>
            </div>
          )}

          {/* 1. Multi-Student Selection Field */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={14} color="#0f172a" />
              Select Student(s) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <SearchableStudentSelect
              students={students}
              value={selectedStudentIds}
              onChange={(newIds) => setSelectedStudentIds(newIds)}
              isMulti={true}
              placeholder="-- Choose student(s) from directory --"
            />
          </div>

          {/* 2. Multi-Violation Selection Field */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Layers size={14} color="#0f172a" />
              Violation Offense Category(ies) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <SearchableViolationSelect
              violations={violations}
              value={selectedViolationIds}
              onChange={handleViolationsChange}
              isMulti={true}
              placeholder="-- Select infraction(s) --"
            />
          </div>

          {/* 3. Disciplinary Sanction / Corrective Measure */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
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
                height: '38px',
                padding: '6px 10px',
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

          {/* 4. Incident Remarks */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
              Incident Details & Faculty Remarks
            </label>
            <textarea
              rows={2}
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Specify the location, witnesses, circumstances, or confiscated items..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                padding: '8px 10px',
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.4'
              }}
            />
          </div>

          {/* 5. Initial Case Status */}
          <div>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '4px', display: 'block' }}>
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
                    padding: '6px 8px',
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

          {/* 6. SMS Notification Alert */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
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
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#0f172a', flexShrink: 0 }}
            />
            <label htmlFor="notify_sms_check" style={{ fontSize: '12px', color: '#334155', cursor: 'pointer', margin: 0, fontFamily: 'inherit' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>
                Dispatch Immediate SMS Alert to Guardian(s)
              </strong>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {selectedStudents.length > 0
                  ? `Sends automated SMS notice to the guardians of ${selectedStudents.length} selected student(s).`
                  : 'Sends automated SMS notice to guardian(s) on record.'}
              </span>
            </label>
          </div>

        </div>

        {/* DepEd Child Protection & Confidentiality Notice */}
        <div
          style={{
            padding: '10px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '11.5px',
            color: '#475569',
            lineHeight: 1.45
          }}
        >
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <ShieldCheck size={14} color="#059669" strokeWidth={2.5} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>Confidential Incident Log: </span>
            <span>Disciplinary entries are protected student records pursuant to DepEd Order No. 40, s. 2012. Records are strictly confidential.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer"
          style={{
            padding: '12px 18px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              borderRadius: '8px',
              padding: '8px 16px',
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
          <button
            type="submit"
            className="btn btn-primary btn-save-violation-action"
            disabled={loading}
            style={{
              background: '#0f172a',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: '12.5px',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
              fontFamily: 'inherit'
            }}
          >
            <Check size={15} />
            {loading
              ? 'Recording...'
              : selectedStudentIds.length > 1 || selectedViolationIds.length > 1
              ? `Save & Record (${selectedStudentIds.length * selectedViolationIds.length || selectedStudentIds.length || 1} Entries)`
              : 'Save & Record Violation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
