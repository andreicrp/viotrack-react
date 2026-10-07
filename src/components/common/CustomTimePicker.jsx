import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Clock, ChevronDown, Check } from 'lucide-react';

const HOURS = ['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PERIODS = ['AM', 'PM'];

const PRESETS = [
  { label: '12:00 AM', value: '00:00' },
  { label: '06:00 AM', value: '06:00' },
  { label: '08:00 AM', value: '08:00' },
  { label: '12:00 PM', value: '12:00' },
  { label: '06:00 PM', value: '18:00' }
];

export const CustomTimePicker = ({
  value = '00:00',
  onChange,
  disabled = false,
  placeholder = 'Select Time',
  align = 'left',
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const hourListRef = useRef(null);
  const minListRef = useRef(null);

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
      displayLabel: value ? `${h12Str}:${mStr} ${p}` : placeholder
    };
  }, [value, placeholder]);

  // Determine smart placement (upward vs downward)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 290px available below, flip upward
      if (spaceBelow < 290 && rect.top > 290) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
  }, [isOpen]);

  // Auto-scroll selected hour/min into view on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hourListRef.current) {
          const selectedHourEl = hourListRef.current.querySelector('[data-selected="true"]');
          if (selectedHourEl) {
            selectedHourEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }
        }
        if (minListRef.current) {
          const selectedMinEl = minListRef.current.querySelector('[data-selected="true"]');
          if (selectedMinEl) {
            selectedMinEl.scrollIntoView({ block: 'nearest', behavior: 'auto' });
          }
        }
      }, 50);
    }
  }, [isOpen, hour12, minute]);

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
          padding: '9px 14px',
          background: '#ffffff',
          border: isOpen ? '1.5px solid #07345f' : '1.5px solid #cbd5e1',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          color: value ? '#0f172a' : '#94a3b8',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(7, 52, 95, 0.12)' : 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="#07345f" strokeWidth={2.2} />
          <span>{displayLabel}</span>
        </div>
        <ChevronDown
          size={14}
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
          ref={popoverRef}
          style={{
            position: 'absolute',
            ...(openUpward
              ? { bottom: 'calc(100% + 6px)' }
              : { top: 'calc(100% + 6px)' }),
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: 999999,
            width: '260px',
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(0,0,0,0.06)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
        >
          {/* Header Preview Banner */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Selected Time
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#07345f' }}>
              {displayLabel}
            </span>
          </div>

          {/* 3-Column Time Selector Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              height: '115px',
              minHeight: 0,
              flexShrink: 0
            }}
          >
            {/* Hours Column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#64748b',
                  textAlign: 'center',
                  marginBottom: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.03em'
                }}
              >
                HOUR
              </div>
              <div
                ref={hourListRef}
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: '#fcfcfc',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f8fafc'
                }}
              >
                {HOURS.map((h) => {
                  const isSelected = h === hour12;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => handleSelectHour(h)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 0',
                        border: 'none',
                        borderRadius: '4px',
                        background: isSelected ? '#07345f' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        transition: 'background 0.1s ease'
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#64748b',
                  textAlign: 'center',
                  marginBottom: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.03em'
                }}
              >
                MIN
              </div>
              <div
                ref={minListRef}
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: '#fcfcfc',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f8fafc'
                }}
              >
                {MINUTES.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => handleSelectMinute(m)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 0',
                        border: 'none',
                        borderRadius: '4px',
                        background: isSelected ? '#07345f' : 'transparent',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        transition: 'background 0.1s ease'
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: '#64748b',
                  textAlign: 'center',
                  marginBottom: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.03em'
                }}
              >
                AM / PM
              </div>
              <div
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  justifyContent: 'center',
                  background: '#fcfcfc'
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
                        padding: '8px 0',
                        border: 'none',
                        borderRadius: '5px',
                        background: isSelected ? '#07345f' : '#ffffff',
                        color: isSelected ? '#ffffff' : '#1e293b',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                        boxShadow: isSelected ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                        transition: 'background 0.1s ease'
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#e2e8f0';
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.background = '#ffffff';
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
          <div
            style={{
              borderTop: '1px solid #f1f5f9',
              paddingTop: '6px',
              flexShrink: 0
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => handlePreset(preset.value)}
                  style={{
                    padding: '2.5px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#334155',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = '#07345f'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#334155'; }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '6px 10px',
              border: 'none',
              borderRadius: '6px',
              background: '#07345f',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              flexShrink: 0,
              transition: 'background 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#07345f'; }}
          >
            <Check size={13} /> Done
          </button>
        </div>
      )}
    </div>
  );
};

