import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { Users, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

export const BulkViolationModal = ({ isOpen, onClose, onRecordsAdded }) => {
  const { user } = useAuth();
  const { success, error } = useNotification();

  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedViolationId, setSelectedViolationId] = useState('');
  const [sanction, setSanction] = useState('');
  const [remarks, setRemarks] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      setSelectedStudentIds([]);
    }
  }, [isOpen]);

  const loadData = async () => {
    const [sList, vList] = await Promise.all([
      dataService.getStudents(),
      dataService.getViolations()
    ]);
    setStudents(sList);
    setViolations(vList);
  };

  const handleViolationChange = (e) => {
    const vid = e.target.value;
    setSelectedViolationId(vid);
    const matched = violations.find(v => v.id === Number(vid));
    if (matched) setSanction(matched.default_sanction || '');
  };

  const toggleStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const filteredStudents = students.filter(s => {
    const matchGrade = !filterGrade || s.grade === filterGrade;
    const matchSection = !filterSection || s.section.toLowerCase().includes(filterSection.toLowerCase());
    return matchGrade && matchSection;
  });

  const selectAllFiltered = () => {
    const filteredIds = filteredStudents.map(s => s.id);
    const allSelected = filteredIds.every(id => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedStudentIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0 || !selectedViolationId) {
      error('Please select at least one student and an offense category.');
      return;
    }

    setLoading(true);
    try {
      const createdList = [];
      for (const sid of selectedStudentIds) {
        const rec = await dataService.addRecord({
          student_id: sid,
          violation_id: Number(selectedViolationId),
          reported_by_name: user?.name || 'System Admin',
          reported_by_type: user?.role || 'admin',
          sanction,
          remarks,
          status: 'Pending',
          sms_notified: true
        });
        createdList.push(rec);
      }

      success(`Successfully logged violation for ${createdList.length} students!`);
      onRecordsAdded?.(createdList);
      onClose();
    } catch (err) {
      error('Failed to log bulk records: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk / Group Violation Entry" icon={Users} maxWidth="720px">
      <form onSubmit={handleSubmit}>
        <div className="modal-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          {/* Offense Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Offense Category *</label>
              <CustomSelect
                value={selectedViolationId}
                onChange={handleViolationChange}
                placeholder="-- Choose Violation --"
                options={violations.map(v => ({
                  value: String(v.id),
                  label: `[${v.type}] ${v.title}`
                }))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Sanction / Action</label>
              <input
                type="text"
                className="form-control"
                value={sanction}
                onChange={(e) => setSanction(e.target.value)}
                placeholder="Applied sanction"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Group Incident Remarks</label>
            <input
              type="text"
              className="form-control"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Mass cutting class in computer lab during 4th period"
            />
          </div>

          {/* Student Multi-Selection Box */}
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Select Involved Students</strong>
                <span style={{ fontSize: '0.8rem', color: '#27367f', fontWeight: 700, marginLeft: 8 }}>
                  ({selectedStudentIds.length} selected)
                </span>
              </div>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11.5px' }}
              >
                Select / Deselect All
              </button>
            </div>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ flex: 1 }}>
                <CustomSelect
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  options={[
                    { value: '', label: 'All Grades' },
                    { value: 'Grade 7', label: 'Grade 7' },
                    { value: 'Grade 8', label: 'Grade 8' },
                    { value: 'Grade 9', label: 'Grade 9' },
                    { value: 'Grade 10', label: 'Grade 10' },
                    { value: 'Grade 11', label: 'Grade 11' },
                    { value: 'Grade 12', label: 'Grade 12' },
                  ]}
                  size="sm"
                />
              </div>

              <input
                type="text"
                className="form-control"
                style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem', flex: 1 }}
                placeholder="Filter section..."
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
              />
            </div>

            {/* Students Checklist */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', maxHeight: 220, overflowY: 'auto', padding: '0.5rem' }}>
              {filteredStudents.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                  No students matched filters
                </div>
              ) : (
                filteredStudents.map(student => {
                  const isChecked = selectedStudentIds.includes(student.id);
                  return (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0.75rem',
                        borderRadius: 6,
                        cursor: 'pointer',
                        background: isChecked ? '#eff6ff' : '#ffffff',
                        marginBottom: 4,
                        border: `1px solid ${isChecked ? '#bfdbfe' : '#e2e8f0'}`
                      }}
                    >
                      {isChecked ? <CheckSquare size={16} color="#2563eb" /> : <Square size={16} color="#94a3b8" />}
                      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: isChecked ? '#1e40af' : '#0f172a' }}>
                          {student.lname}, {student.fname}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {student.grade} - {student.section} | LRN: {student.lrn}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Processing...' : `Log Records for (${selectedStudentIds.length}) Students`}
          </button>
        </div>
      </form>
    </Modal>
  );
};
