import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Clock, CheckCircle2, AlertTriangle, ShieldAlert, ArrowRight, Check, X } from 'lucide-react';

export const StatusModal = ({ isOpen, onClose, record, onUpdated }) => {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (record) {
      setSelectedStatus(record.status || 'Pending');
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const currentStatus = record.status || 'Pending';

  const statusOptions = [
    {
      id: 'Pending',
      title: 'Pending Review',
      desc: 'Violation is logged and awaiting administrative action or hearing.',
      color: '#ef4444',
      bg: '#fef2f2',
      border: '#fecaca',
      icon: Clock
    },
    {
      id: 'Investigation',
      title: 'Under Investigation',
      desc: 'Case is active with ongoing teacher review or evidence gathering.',
      color: '#f59e0b',
      bg: '#fffbeb',
      border: '#fde68a',
      icon: AlertTriangle
    },
    {
      id: 'Resolved',
      title: 'Resolved & Cleared',
      desc: 'Student has completed disciplinary sanction or counsel agreement.',
      color: '#10b981',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      icon: CheckCircle2
    },
    {
      id: 'Escalated',
      title: 'Escalated to Guidance / Principal',
      desc: 'Major severity incident referred to higher school authorities.',
      color: '#8b5cf6',
      bg: '#f5f3ff',
      border: '#ddd6fe',
      icon: ShieldAlert
    }
  ];

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
      title={`Update Status - Record #${record.id}`}
      icon={CheckCircle2}
      maxWidth="520px"
    >
      <div className="modal-body" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
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
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              {record.violation?.title || 'Violation Incident'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Reported: {new Date(record.date_reported).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Current Status</div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#27367f' }}>
              {currentStatus}
            </span>
          </div>
        </div>

        {/* Status Selection Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
            Select New Status:
          </label>
          {statusOptions.map((opt) => {
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
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: isSelected ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                  background: isSelected ? opt.bg : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? `0 2px 8px ${opt.color}20` : 'none'
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: isSelected ? opt.color : '#0f172a' }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
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

      <div className="modal-footer" style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          style={{ borderRadius: '10px', padding: '9px 18px', fontWeight: 600, fontSize: '13px' }}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleUpdate}
          disabled={loading || selectedStatus === currentStatus}
          style={{
            background: '#27367f',
            borderRadius: '10px',
            padding: '9px 20px',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(39, 54, 127, 0.25)',
            opacity: selectedStatus === currentStatus ? 0.6 : 1
          }}
        >
          <Check size={16} />
          {loading ? 'Updating...' : 'Save New Status'}
        </button>
      </div>
    </Modal>
  );
};
