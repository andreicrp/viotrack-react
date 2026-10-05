import React, { useState, useRef, useEffect } from 'react';
import { Clock, Check, ChevronDown, X } from 'lucide-react';

const COMMON_TIME_PRESETS = [
  { label: '08:00 AM', value: '08:00' },
  { label: '08:30 AM', value: '08:30' },
  { label: '09:00 AM', value: '09:00' },
  { label: '09:30 AM', value: '09:30' },
  { label: '10:00 AM', value: '10:00' },
  { label: '10:30 AM', value: '10:30' },
  { label: '01:00 PM', value: '13:00' },
  { label: '01:30 PM', value: '13:30' },
  { label: '02:00 PM', value: '14:00' },
  { label: '02:30 PM', value: '14:30' },
  { label: '03:00 PM', value: '15:00' },
  { label: '03:30 PM', value: '15:30' },
  { label: '04:00 PM', value: '16:00' }
];

export const CustomTimePicker = ({
  value = '09:30',
  onChange,
  placeholder = 'Select time',
  disabled = false,
  compact = false,
  align = 'auto',
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState(align === 'right' ? 'right' : 'left');
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 232;
      if (align === 'right' || rect.left + popoverWidth > window.innerWidth - 12) {
        setResolvedAlign('right');
      } else {
        const parent = containerRef.current.closest('.smooth-scroll-container') || containerRef.current.parentElement;
        if (parent) {
          const pRect = parent.getBoundingClientRect();
          if (rect.left + popoverWidth > pRect.right - 10) {
            setResolvedAlign('right');
            return;
          }
        }
        setResolvedAlign(align === 'left' ? 'left' : 'right');
      }
    }
  }, [isOpen, align]);

  // Parse 24h 'HH:MM' string to 12h parts
  const parseTime = (timeStr) => {
    if (!timeStr) return { hour: '09', minute: '30', period: 'AM' };
    const [hStr, mStr] = String(timeStr).split(':');
    let h = parseInt(hStr, 10);
    const m = mStr ? mStr.slice(0, 2) : '00';
    if (isNaN(h)) h = 9;

    let period = 'AM';
    if (h >= 12) {
      period = 'PM';
      if (h > 12) h -= 12;
    } else if (h === 0) {
      h = 12;
    }
    return {
      hour: String(h).padStart(2, '0'),
      minute: String(m).padStart(2, '0'),
      period
    };
  };

  const { hour, minute, period } = parseTime(value);

  // Format display string
  const displayString = `${hour}:${minute} ${period}`;

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updateTime = (newHour, newMinute, newPeriod) => {
    let h = parseInt(newHour, 10);
    if (newPeriod === 'PM' && h < 12) h += 12;
    if (newPeriod === 'AM' && h === 12) h = 0;
    const time24 = `${String(h).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    onChange?.(time24);
  };

  const hoursList = ['07', '08', '09', '10', '11', '12', '01', '02', '03', '04', '05', '06'];
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <div
      ref={containerRef}
      className={`custom-timepicker-container ${className}`}
      style={{ position: 'relative', width: '100%', ...style }}
    >
      {/* Trigger Input Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: compact ? '5px 8px' : '7px 10px',
          borderRadius: '8px',
          border: isOpen ? '1.5px solid #07345f' : '1.5px solid #cbd5e1',
          background: disabled ? '#f1f5f9' : '#ffffff',
          color: value ? '#0f172a' : '#64748b',
          fontSize: compact ? '11.5px' : '12.5px',
          fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(7, 52, 95, 0.1)' : 'none',
          transition: 'border-color 0.14s ease, box-shadow 0.14s ease',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} color="#0f172a" />
          <span>{value ? displayString : placeholder}</span>
        </div>
        <ChevronDown size={13} color="#94a3b8" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className="dropdown-pop-smooth"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...(resolvedAlign === 'right' ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }),
            zIndex: 100005,
            width: '232px',
            maxWidth: 'calc(100vw - 20px)',
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 30px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)',
            padding: '12px',
            boxSizing: 'border-box'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#07345f', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Select Time
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                type="button"
                onClick={() => updateTime(hour, minute, 'AM')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  border: 'none',
                  background: period === 'AM' ? '#07345f' : '#f1f5f9',
                  color: period === 'AM' ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => updateTime(hour, minute, 'PM')}
                style={{
                  padding: '2px 8px',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                  fontWeight: 700,
                  border: 'none',
                  background: period === 'PM' ? '#07345f' : '#f1f5f9',
                  color: period === 'PM' ? '#ffffff' : '#64748b',
                  cursor: 'pointer'
                }}
              >
                PM
              </button>
            </div>
          </div>

          {/* Dial Columns: Hours & Minutes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {/* Hours Column */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>
                HOUR
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '7px', padding: '2px' }}>
                {hoursList.map((h) => {
                  const isSelected = h === hour;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => updateTime(h, minute, period)}
                      style={{
                        width: '100%',
                        padding: '4px 0',
                        textAlign: 'center',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 500,
                        borderRadius: '5px',
                        border: 'none',
                        background: isSelected ? '#07345f' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        cursor: 'pointer',
                        display: 'block'
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px', textAlign: 'center' }}>
                MINUTE
              </div>
              <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #f1f5f9', borderRadius: '7px', padding: '2px' }}>
                {minutesList.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateTime(hour, m, period)}
                      style={{
                        width: '100%',
                        padding: '4px 0',
                        textAlign: 'center',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 500,
                        borderRadius: '5px',
                        border: 'none',
                        background: isSelected ? '#07345f' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        cursor: 'pointer',
                        display: 'block'
                      }}
                    >
                      :{m}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '5px', textTransform: 'uppercase' }}>
              Quick Presets
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              {COMMON_TIME_PRESETS.slice(0, 6).map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    onChange?.(preset.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: '3px 2px',
                    fontSize: '9.5px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid #e2e8f0',
                    background: value === preset.value ? '#e0f2fe' : '#ffffff',
                    color: value === preset.value ? '#0369a1' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '6px',
              borderRadius: '6px',
              border: 'none',
              background: '#07345f',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            <Check size={12} strokeWidth={2.4} /> Done
          </button>
        </div>
      )}
    </div>
  );
};
