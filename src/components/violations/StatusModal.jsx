import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getSafeAvatarUrl, handleAvatarError } from '../../utils/avatarHelper';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Users,
  FileText,
  Calendar,
  Check,
  X,
  Shield,
  Layers,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export const StatusModal = ({ isOpen, onClose, record, onUpdated }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'conference' | 'general'
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setSelectedStatus(record.status || 'Pending');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const currentStatus = record.status || 'Pending';
  const student = record.student || {};
  const studentName = (student.fname && student.lname)
    ? `${student.fname} ${student.lname}`
    : (student.name || student.full_name || record.student_name || 'Enrolled Student');
  const studentAvatar = getSafeAvatarUrl(student.image || student.avatar, studentName);
  const violationTitle = record.violation?.title || record.violation?.name || record.offense || 'Disciplinary Violation';

  const statusOptions = [
    // --- 3-Step Disciplinary Conference Sessions ---
    {
      id: '1st Conference',
      category: 'conference',
      stepNum: '1',
      title: '1st Conference',
      subtitle: 'Initial Counseling Session',
      sessionBadge: 'Step 1',
      desc: 'First dialogue with student & parent; verbal/written warning and compliance commitment.',
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#bae6fd',
      icon: Users
    },
    {
      id: '2nd Conference',
      category: 'conference',
      stepNum: '2',
      title: '2nd Conference',
      subtitle: 'Behavior Contract Signing',
      sessionBadge: 'Step 2',
      desc: 'Follow-up conference with signed behavioral undertaking contract & remediation plan.',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: FileText
    },
    {
      id: '3rd Conference',
      category: 'conference',
      stepNum: '3',
      title: '3rd Conference',
      subtitle: 'Final Hearing & Review',
      sessionBadge: 'Step 3',
      desc: 'Final case hearing with Guidance Counselor & Prefect of Discipline before board action.',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '#fecaca',
      icon: ShieldAlert
    },

    // --- Standard Incident Statuses ---
    {
      id: 'Pending',
      category: 'general',
      title: 'Pending Review',
      subtitle: 'Awaiting Initial Action',
      desc: 'Violation is logged and awaiting administrative evaluation or initial scheduling.',
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fecaca',
      icon: Clock
    },
    {
      id: 'Investigation',
      category: 'general',
      title: 'Under Investigation',
      subtitle: 'Active Inquiry & Statements',
      desc: 'Case is active with ongoing faculty inquiry, witness statements, or evidence gathering.',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: AlertTriangle
    },
    {
      id: 'Resolved',
      category: 'general',
      title: 'Resolved & Cleared',
      subtitle: 'Case Completed & Closed',
      desc: 'Student has fulfilled disciplinary sanctions or counseling agreement; case officially closed.',
      color: '#10b981',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: CheckCircle2
    },
    {
      id: 'Escalated',
      category: 'general',
      title: 'Escalated to Guidance / Principal',
      subtitle: 'Referred for Board Action',
      desc: 'Major incident referred to higher school authorities for formal administrative sanctions.',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      icon: Shield
    }
  ];

  const filteredOptions = statusOptions.filter(opt => {
    if (activeCategory === 'conference') return opt.category === 'conference';
    if (activeCategory === 'general') return opt.category === 'general';
    return true;
  });

  const handleUpdate = () => {
    if (!selectedStatus) return;
    setLoading(true);
    setTimeout(() => {
      onUpdated?.(record.id, selectedStatus);
      setLoading(false);
      onClose();
    }, 150);
  };

  const isChanged = selectedStatus !== currentStatus;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Incident Status – #${record.id}`}
      icon={CheckCircle2}
      maxWidth="600px"
    >
      <div
        className="modal-body"
        style={{
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '75vh',
          overflowY: 'auto'
        }}
      >
        {/* Incident Summary Card Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <img
              src={studentAvatar}
              alt={studentName}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                flexShrink: 0
              }}
              onError={(e) => handleAvatarError(e, studentName)}
            />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {studentName}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {violationTitle}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                {student.grade ? `${student.grade} • ${student.section || 'Section'}` : `Reported: ${new Date(record.date_reported || Date.now()).toLocaleDateString()}`}
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Status
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11.5px',
                fontWeight: 800,
                color: '#07345f',
                background: '#e0f2fe',
                border: '1px solid #bae6fd',
                padding: '3px 9px',
                borderRadius: '20px',
                marginTop: '3px'
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0284c7' }} />
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Modern Segmented Tab Switcher */}
        <div
          style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            gap: '4px'
          }}
        >
          {[
            { id: 'all', label: 'All Statuses', count: 7 },
            { id: 'conference', label: '3-Step Conferences', count: 3 },
            { id: 'general', label: 'Standard & Closure', count: 4 }
          ].map(tab => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#07345f' : '#64748b',
                  fontSize: '12px',
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 5px',
                    borderRadius: '9999px',
                    background: isActive ? '#e0f2fe' : '#e2e8f0',
                    color: isActive ? '#0369a1' : '#64748b',
                    fontWeight: 700
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Selection Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedStatus === opt.id;
            const isCurrent = currentStatus === opt.id;

            return (
              <div
                key={opt.id}
                onClick={() => setSelectedStatus(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${opt.color}` : '1.5px solid #e2e8f0',
                  background: isSelected ? opt.bg : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected ? `0 4px 14px ${opt.color}20` : '0 1px 2px rgba(0,0,0,0.02)',
                  position: 'relative',
                  transform: isSelected ? 'scale(1.005)' : 'none'
                }}
              >
                {/* Status Icon Box */}
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: isSelected ? opt.color : opt.bg,
                    color: isSelected ? '#ffffff' : opt.color,
                    border: `1px solid ${opt.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.18s ease'
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} />
                </div>

                {/* Status Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 800, color: isSelected ? opt.color : '#0f172a' }}>
                      {opt.title}
                    </span>
                    {opt.sessionBadge && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          color: opt.color,
                          background: '#ffffff',
                          border: `1px solid ${opt.border}`,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          letterSpacing: '0.02em'
                        }}
                      >
                        {opt.sessionBadge}
                      </span>
                    )}
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#64748b',
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        Current
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                    {opt.desc}
                  </div>
                </div>

                {/* Right Selection Indicator */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: isSelected ? 'none' : '2px solid #cbd5e1',
                    background: isSelected ? opt.color : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected && (
                    <Check size={13} color="#ffffff" strokeWidth={3} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Footer */}
      <div
        className="modal-footer"
        style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}
      >
        <div style={{ fontSize: '12px', color: '#64748b' }}>
          {isChanged ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#07345f', fontWeight: 600 }}>
              <Sparkles size={13} color="#f59e0b" /> Changing from <strong>{currentStatus}</strong> → <strong>{selectedStatus}</strong>
            </span>
          ) : (
            <span>Select a new status to apply</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{
              borderRadius: '9px',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '12.5px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleUpdate}
            disabled={loading || !isChanged}
            style={{
              background: isChanged ? '#07345f' : '#94a3b8',
              borderRadius: '9px',
              padding: '8px 20px',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#ffffff',
              border: 'none',
              boxShadow: isChanged ? '0 4px 12px rgba(7, 52, 95, 0.25)' : 'none',
              cursor: isChanged ? 'pointer' : 'not-allowed',
              transition: 'all 0.18s ease'
            }}
          >
            <Check size={15} strokeWidth={2.5} />
            {loading ? 'Updating...' : 'Save New Status'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StatusModal;
