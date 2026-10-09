import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

export const CustomDateRangeModal = ({
  isOpen,
  onClose,
  initialStartDate = '2026-09-01',
  initialEndDate = '2026-09-30',
  onApply,
  title = 'Custom Date Range'
}) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [activePreset, setActivePreset] = useState('30days');

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      const now = new Date();
      const currentYear = now.getFullYear();
      const todayStr = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      if (initialStartDate === `${currentYear}-01-01` && initialEndDate === `${currentYear}-12-31`) {
        setActivePreset('year');
      } else if (initialStartDate === '2020-01-01') {
        setActivePreset('all');
      } else if (initialStartDate === todayStr && initialEndDate === todayStr) {
        setActivePreset('today');
      } else {
        setActivePreset('custom');
      }
      return () => unlockBodyScroll();
    }
  }, [isOpen, initialStartDate, initialEndDate]);

  if (!isOpen) return null;

  // Format date helper: YYYY-MM-DD
  const formatDateString = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Human readable format: Sep 01, 2026
  const formatHumanDate = (dateStr) => {
    if (!dateStr) return 'Select date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const handleApplyPreset = (presetId) => {
    setActivePreset(presetId);
    const now = new Date();
    const currentYear = now.getFullYear();

    if (presetId === 'today') {
      const todayStr = formatDateString(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetId === 'yesterday') {
      const yDate = new Date(now);
      yDate.setDate(yDate.getDate() - 1);
      const yStr = formatDateString(yDate);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (presetId === '7days') {
      const sDate = new Date(now);
      sDate.setDate(sDate.getDate() - 6);
      setStartDate(formatDateString(sDate));
      setEndDate(formatDateString(now));
    } else if (presetId === '30days') {
      const sDate = new Date(now);
      sDate.setDate(sDate.getDate() - 29);
      setStartDate(formatDateString(sDate));
      setEndDate(formatDateString(now));
    } else if (presetId === 'year') {
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
    } else if (presetId === 'all') {
      setStartDate('2020-01-01');
      setEndDate(`${currentYear + 1}-12-31`);
    }
  };

  const handleApply = (e) => {
    e.preventDefault();
    if (onApply) {
      onApply({ startDate, endDate, preset: activePreset });
    }
    onClose();
  };

  // Calculate day count
  const calculateDays = () => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e - s);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) ? 1 : diffDays;
    } catch {
      return 1;
    }
  };

  const daysCount = calculateDays();

  const presets = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: '7days', label: 'Last 7 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: 'year', label: 'This Year' },
    { id: 'all', label: 'All Time' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '16px',
        willChange: 'opacity'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px 16px 24px',
            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              {title}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
              Select a preset or custom date interval for analytics
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-surface-elevated, #f1f5f9)',
              border: '1px solid var(--border-subtle, transparent)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleApply} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Quick Presets Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick Presets
              </label>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', fontWeight: 600 }}>One-click selection</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {presets.map((p) => {
                const isSelected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`date-preset-btn ${isSelected ? 'active' : ''}`}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid var(--brand-blue, #07345f)' : '1px solid var(--border-subtle, #e2e8f0)',
                      background: isSelected ? 'var(--brand-blue, #07345f)' : 'var(--bg-surface-elevated, #ffffff)',
                      color: isSelected ? '#ffffff' : 'var(--text-primary, #334155)',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Range Interval Card */}
          <div
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: 'var(--text-secondary, #334155)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Date Range Interval
              </span>
              <span style={{ fontSize: '11px', color: 'var(--brand-blue, #64748b)', background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Custom Interval
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              <div style={{ minWidth: 0, width: '100%' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginBottom: '5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Start Date
                </span>
                <CustomDatePicker
                  value={startDate}
                  onChange={(val) => {
                    setStartDate(val);
                    setActivePreset('custom');
                  }}
                  showClear={false}
                  showIcon={false}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ minWidth: 0, width: '100%' }}>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginBottom: '5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  End Date
                </span>
                <CustomDatePicker
                  value={endDate}
                  onChange={(val) => {
                    setEndDate(val);
                    setActivePreset('custom');
                  }}
                  showClear={false}
                  showIcon={false}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* Selected Range Preview Banner */}
          <div
            style={{
              background: 'var(--bg-surface-elevated, #f0f4f8)',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              borderRadius: '10px',
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-primary, #0f172a)', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span>{formatHumanDate(startDate)}</span>
              <span style={{ margin: '0 8px', color: 'var(--text-muted, #64748b)' }}>—</span>
              <span>{formatHumanDate(endDate)}</span>
            </div>

            <span
              className="badge-blue date-range-preview-badge"
              style={{
                background: '#e0f2fe',
                color: '#0369a1',
                border: '1px solid #bae6fd',
                padding: '3px 10px',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '11.5px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {activePreset === 'all' ? 'All Time' : `${daysCount} ${daysCount === 1 ? 'Day' : 'Days'}`}
            </span>
          </div>

          {/* Modal Footer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '4px'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 16px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                background: 'var(--bg-surface, #ffffff)',
                color: 'var(--text-secondary, #475569)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="date-range-apply-btn"
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                background: '#07345f',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(7, 52, 95, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
