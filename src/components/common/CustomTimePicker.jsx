import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

const HOURS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PERIODS = ['AM', 'PM'];

const PRESETS = [
  { label: '12:00 AM (Midnight)', value: '00:00' },
  { label: '06:00 AM (Early Morning)', value: '06:00' },
  { label: '12:00 PM (Noon)', value: '12:00' },
  { label: '06:00 PM (Evening)', value: '18:00' },
  { label: '11:59 PM (End of Day)', value: '23:59' }
];

export const CustomTimePicker = ({
  value = '00:00',
  onChange,
  disabled = false,
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Convert 24-hr 'HH:MM' string to 12-hr parts
  const { hour12, minute, period, displayLabel } = useMemo(() => {
    let rawHour = 0;
    let rawMinute = 0;

    if (value && typeof value === 'string') {
      const parts = value.split(':');
      if (parts.length >= 2) {
        rawHour = parseInt(parts[0], 10) || 0;
        rawMinute = parseInt(parts[1], 10) || 0;
      }
    }

    const p = rawHour >= 12 ? 'PM' : 'AM';
    let h12 = rawHour % 12;
    if (h12 === 0) h12 = 12;
    const h12Str = String(h12).padStart(2, '0');
    const mStr = String(rawMinute).padStart(2, '0');

    return {
      hour12: h12Str,
      minute: mStr,
      period: p,
      displayLabel: `${h12Str}:${mStr} ${p}`
    };
  }, [value]);

  // Close when clicking outside
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

  // Convert selected 12-hr parts back to 'HH:MM' 24-hr string
  const updateTime = (newHour12, newMinute, newPeriod) => {
    let h = parseInt(newHour12, 10);
    if (newPeriod === 'PM') {
      if (h < 12) h += 12;
    } else {
      if (h === 12) h = 0;
    }
    const h24 = String(h).padStart(2, '0');
    const m24 = String(newMinute).padStart(2, '0');
    onChange?.(`${h24}:${m24}`);
  };

  const handleSelectHour = (h) => {
    updateTime(h, minute, period);
  };

  const handleSelectMinute = (m) => {
    updateTime(hour12, m, period);
  };

  const handleSelectPeriod = (p) => {
    updateTime(hour12, minute, p);
  };

  const handlePreset = (presetVal) => {
    onChange?.(presetVal);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-time-picker-root ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        ...style
      }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#ffffff',
          border: isOpen ? '1.5px solid #07345f' : '1.5px solid #cbd5e1',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#0f172a',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(7, 52, 95, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#07345f" strokeWidth={2.2} />
          <span>{displayLabel}</span>
        </div>
        <ChevronDown
          size={15}
          color="#64748b"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Popover Dropdown Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 99999,
            width: '280px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0,0,0,0.04)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeInTimePicker 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header Preview Banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Selected Time
            </span>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#07345f' }}>
              {displayLabel}
            </span>
          </div>

          {/* 3-Column Time Selector Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              height: '180px'
            }}
          >
            {/* Hours Column */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: '4px' }}>
                HOUR
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {HOURS.map((h) => {
                  const isSelected = h === hour12;
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHour(h)}
                      style={{
                        padding: '6px 0',
                        border: 'none',
                        borderRadius: '6px',
                        background: isSelected ? '#07345f' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background 0.12s'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {h}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes Column */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: '4px' }}>
                MIN
              </div>
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px'
                }}
              >
                {MINUTES.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinute(m)}
                      style={{
                        padding: '6px 0',
                        border: 'none',
                        borderRadius: '6px',
                        background: isSelected ? '#07345f' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontSize: '12px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'background 0.12s'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f1f5f9';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Period Column */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', textAlign: 'center', marginBottom: '4px' }}>
                AM / PM
              </div>
              <div
                style={{
                  flex: 1,
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  justifyContent: 'center'
                }}
              >
                {PERIODS.map((p) => {
                  const isSelected = p === period;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleSelectPeriod(p)}
                      style={{
                        padding: '12px 0',
                        border: 'none',
                        borderRadius: '6px',
                        background: isSelected ? '#07345f' : '#f8fafc',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#e2e8f0';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Presets Menu */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <div style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase' }}>
              Quick Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePreset(preset.value)}
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.12s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#07345f'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                >
                  {preset.label.split(' ')[0]} {preset.label.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              marginTop: '2px',
              padding: '8px',
              border: 'none',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px'
            }}
          >
            <Check size={14} /> Done
          </button>
        </div>
      )}
    </div>
  );
};
