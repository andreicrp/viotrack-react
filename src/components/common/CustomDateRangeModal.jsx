import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CustomDatePicker } from './CustomDatePicker';

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
  const [activePreset, setActivePreset] = useState('month');

  useEffect(() => {
    if (isOpen) {
      setStartDate(initialStartDate);
      setEndDate(initialEndDate);
      if (initialStartDate === '2026-09-01' && initialEndDate === '2026-09-30') {
        setActivePreset('month');
      } else if (initialStartDate === '2026-09-30' && initialEndDate === '2026-09-30') {
        setActivePreset('today');
      } else {
        setActivePreset('custom');
      }
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
    const baseDate = new Date(2026, 8, 30); // 2026-09-30

    if (presetId === 'today') {
      const todayStr = formatDateString(baseDate);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetId === 'yesterday') {
      const yDate = new Date(baseDate);
      yDate.setDate(yDate.getDate() - 1);
      const yStr = formatDateString(yDate);
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (presetId === '7days') {
      const sDate = new Date(baseDate);
      sDate.setDate(sDate.getDate() - 6);
      setStartDate(formatDateString(sDate));
      setEndDate(formatDateString(baseDate));
    } else if (presetId === '14days') {
      const sDate = new Date(baseDate);
      sDate.setDate(sDate.getDate() - 13);
      setStartDate(formatDateString(sDate));
      setEndDate(formatDateString(baseDate));
    } else if (presetId === '30days') {
      const sDate = new Date(baseDate);
      sDate.setDate(sDate.getDate() - 29);
      setStartDate(formatDateString(sDate));
      setEndDate(formatDateString(baseDate));
    } else if (presetId === 'month') {
      setStartDate('2026-09-01');
      setEndDate('2026-09-30');
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
    { id: '14days', label: 'Last 14 Days' },
    { id: '30days', label: 'Last 30 Days' },
    { id: 'month', label: 'This Month' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          border: '1px solid #e2e8f0',
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
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {title}
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#64748b' }}>
              Select a preset or custom date interval for analytics
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleApply} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Quick Presets Grid */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Quick Presets
              </label>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>One-click selection</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {presets.map((p) => {
                const isSelected = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #07345f' : '1px solid #e2e8f0',
                      background: isSelected ? '#07345f' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 700 : 600,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.color = '#0f172a';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#334155';
                      }
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
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Date Range Interval
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                Custom Interval
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
              <div style={{ minWidth: 0, width: '100%' }}>
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
                <span style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
              background: '#f0f4f8',
              border: '1px solid #cbd5e1',
              borderRadius: '10px',
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '13px', color: '#0f172a', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span>{formatHumanDate(startDate)}</span>
              <span style={{ margin: '0 8px', color: '#64748b' }}>—</span>
              <span>{formatHumanDate(endDate)}</span>
            </div>

            <span
              style={{
                background: '#07345f',
                color: '#ffffff',
                padding: '3px 9px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11.5px',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {daysCount} {daysCount === 1 ? 'Day' : 'Days'}
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
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#0f172a'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.color = '#475569'; }}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                background: '#07345f',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(7, 52, 95, 0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = '#0a4275'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = '#07345f'; }}
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
