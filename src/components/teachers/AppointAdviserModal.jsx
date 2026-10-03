import React, { useState, useEffect } from 'react';
import { Award, X, Check, GraduationCap, ShieldCheck, UserMinus, AlertCircle } from 'lucide-react';
import CustomSelect from '../common/CustomSelect';

export const AppointAdviserModal = ({ isOpen, onClose, teacher, currentAdviser, onAppointed, onUnassign }) => {
  const [gradeLevel, setGradeLevel] = useState('Grade 10');
  const [classSection, setClassSection] = useState('');

  useEffect(() => {
    if (currentAdviser) {
      setGradeLevel(currentAdviser.grade_level || 'Grade 10');
      setClassSection(currentAdviser.class_section || '');
    } else {
      setGradeLevel('Grade 10');
      setClassSection('');
    }
  }, [currentAdviser, teacher, isOpen]);

  if (!isOpen || !teacher) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!classSection.trim()) return;
    onAppointed?.(teacher.id, gradeLevel, classSection.trim());
    onClose();
  };

  const handleUnassignClick = () => {
    if (currentAdviser && onUnassign) {
      if (window.confirm(`Unassign ${teacher.fname} ${teacher.lname} from ${currentAdviser.grade_level} - ${currentAdviser.class_section}?`)) {
        onUnassign(currentAdviser.id);
        onClose();
      }
    }
  };

  const sectionPresets = [
    'Rizal',
    'Bonifacio',
    'Diamond',
    'Emerald',
    'Ruby',
    'STEM A',
    'HUMSS B',
    'ABM A'
  ];

  const isAlreadyAssigned = Boolean(currentAdviser);

  return (
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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: isAlreadyAssigned ? '#eff6ff' : '#dcfce7',
                color: isAlreadyAssigned ? '#2563eb' : '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Award size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                {isAlreadyAssigned ? 'Manage Advisory Assignment' : 'Appoint Class Adviser'}
              </h3>
              <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                {isAlreadyAssigned
                  ? `Update or reassign ${teacher.fname} ${teacher.lname}`
                  : `Assign ${teacher.fname} ${teacher.lname} to an advisory section`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Current Assignment Status Pill */}
            {isAlreadyAssigned && (
              <div
                style={{
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12.5px'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#166534' }}>Currently Assigned Advisory:</div>
                  <div style={{ color: '#15803d', fontWeight: 600, marginTop: '2px' }}>
                    {currentAdviser.grade_level} — {currentAdviser.class_section}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUnassignClick}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserMinus size={12} /> Unassign
                </button>
              </div>
            )}

            {/* Grade Level */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Academic Grade Level <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <CustomSelect
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                options={[
                  { value: 'Grade 7', label: 'Grade 7 (Junior High)' },
                  { value: 'Grade 8', label: 'Grade 8 (Junior High)' },
                  { value: 'Grade 9', label: 'Grade 9 (Junior High)' },
                  { value: 'Grade 10', label: 'Grade 10 (Junior High)' },
                  { value: 'Grade 11', label: 'Grade 11 (Senior High)' },
                  { value: 'Grade 12', label: 'Grade 12 (Senior High)' },
                ]}
              />
            </div>

            {/* Class Section Name */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Class Section Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Quick suggestions:</span>
              </div>

              <input
                type="text"
                required
                placeholder="e.g. Rizal, STEM A, Diamond"
                value={classSection}
                onChange={(e) => setClassSection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '9px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13.5px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              {/* Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {sectionPresets.map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setClassSection(sec)}
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      background: classSection.toLowerCase() === sec.toLowerCase() ? '#dcfce7' : '#f8fafc',
                      color: classSection.toLowerCase() === sec.toLowerCase() ? '#15803d' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    + {sec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              background: '#f8fafc'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                borderRadius: '9px',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                color: '#475569',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                padding: '9px 22px',
                borderRadius: '9px',
                background: isAlreadyAssigned
                  ? 'linear-gradient(135deg, #07345f 0%, #1e40af 100%)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isAlreadyAssigned
                  ? '0 4px 14px rgba(7, 52, 95, 0.3)'
                  : '0 4px 14px rgba(16, 185, 129, 0.35)'
              }}
            >
              <Check size={16} />
              <span>{isAlreadyAssigned ? 'Update Assignment' : 'Confirm Appointment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
