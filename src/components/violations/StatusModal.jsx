import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
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
  MessageSquare,
  Shield
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

  const statusOptions = [
    // --- 3-Step Disciplinary Conference Sessions ---
    {
      id: '1st Conference',
      category: 'conference',
      title: '1st Conference (Initial Counseling)',
      sessionBadge: 'Step 1 Session',
      desc: '1st dialogue with student & parent; verbal/written warning and compliance commitment.',
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#bae6fd',
      icon: Users
    },
    {
      id: '2nd Conference',
      category: 'conference',
      title: '2nd Conference (Behavior Contract)',
      sessionBadge: 'Step 2 Session',
      desc: 'Follow-up conference with signed behavioral undertaking contract & remediation plan.',
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: FileText
    },
    {
      id: '3rd Conference',
      category: 'conference',
      title: '3rd Conference (Final Hearing)',
      sessionBadge: 'Step 3 Session',
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
      desc: 'Violation is logged and awaiting administrative action or initial review.',
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fecaca',
      icon: Clock
    },
    {
      id: 'Investigation',
      category: 'general',
      title: 'Under Investigation',
      desc: 'Case is active with ongoing teacher review, witness statement, or evidence gathering.',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: AlertTriangle
    },
    {
      id: 'Resolved',
      category: 'general',
      title: 'Resolved & Cleared',
      desc: 'Student has completed disciplinary sanction or counsel agreement; case closed.',
      color: '#10b981',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: CheckCircle2
    },
    {
      id: 'Escalated',
      category: 'general',
      title: 'Escalated to Guidance / Principal',
      desc: 'Major severity incident referred to higher school authorities for formal sanctions.',
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Status – Record #${record.id}`}
      icon={CheckCircle2}
      maxWidth="560px"
    >
      <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '78vh', overflowY: 'auto' }}>
        
        {/* Incident Summary Card */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
              {record.violation?.title || 'Violation Incident'}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Reported: {new Date(record.date_reported).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Current Status</div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '12px',
                fontWeight: 800,
                color: '#07345f',
                background: '#e0f2fe',
                padding: '2px 8px',
                borderRadius: '6px',
                marginTop: '2px'
              }}
            >
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Category Tabs Switcher */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'conference', label: '3-Step Conference Sessions' },
            { id: 'general', label: 'Standard & Resolution' }
          ].map(tab => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: activeCategory === tab.id ? '1.5px solid #07345f' : '1px solid #cbd5e1',
                background: activeCategory === tab.id ? '#07345f' : '#ffffff',
                color: activeCategory === tab.id ? '#ffffff' : '#334155',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: activeCategory === tab.id ? '0 2px 6px rgba(7, 52, 95, 0.2)' : 'none'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Selection Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {filteredOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedStatus === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => setSelectedStatus(opt.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 15px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                  background: isSelected ? opt.bg : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 3px 10px ${opt.color}25` : '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    background: isSelected ? opt.color : '#f1f5f9',
                    color: isSelected ? '#ffffff' : opt.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Icon size={18} />
                </div>
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
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em'
                        }}
                      >
                        {opt.sessionBadge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', lineHeight: 1.35 }}>
                    {opt.desc}
                  </div>
                </div>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: isSelected ? `5px solid ${opt.color}` : '2px solid #cbd5e1',
                    background: '#ffffff',
                    flexShrink: 0
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="modal-footer" style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#f8fafc' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: 600, fontSize: '12.5px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a' }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleUpdate}
          disabled={loading || selectedStatus === currentStatus}
          style={{
            background: '#07345f',
            borderRadius: '8px',
            padding: '8px 20px',
            fontWeight: 700,
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 12px rgba(7, 52, 95, 0.25)',
            opacity: selectedStatus === currentStatus ? 0.6 : 1,
            cursor: selectedStatus === currentStatus ? 'not-allowed' : 'pointer'
          }}
        >
          <Check size={15} />
          {loading ? 'Updating...' : 'Save New Status'}
        </button>
      </div>
    </Modal>
  );
};
export default StatusModal;
