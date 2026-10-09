import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
  const [popoverCoords, setPopoverCoords] = useState({ top: 0, left: 0 });
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

  // Calculate fixed screen coordinates for portal overlay
  const updateCoords = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const popoverWidth = 264;
    const popoverHeight = 290;

    const spaceBelow = window.innerHeight - rect.bottom;
    const showUpward = spaceBelow < popoverHeight && rect.top > popoverHeight;

    const top = showUpward ? rect.top - popoverHeight - 6 : rect.bottom + 6;

    let left = rect.left;
    if (align === 'right' || rect.left + popoverWidth > window.innerWidth - 12) {
      left = rect.right - popoverWidth;
    }

    // Safety margins within window
    if (left < 10) left = 10;
    if (left + popoverWidth > window.innerWidth - 10) {
      left = window.innerWidth - popoverWidth - 10;
    }

    setPopoverCoords({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen, align]);

  // Auto-scroll selected hour/min into view on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
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
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hour12, minute]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        popoverRef.current && !popoverRef.current.contains(e.target)
      ) {
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

  const classNamesList = className.split(/\s+/).filter(Boolean);
  const isPsm = classNamesList.includes('psm-conference-time-picker');
  const popoverClasses = ['custom-time-picker-popover', isPsm ? 'psm-conference-time-popover' : ''].filter(Boolean).join(' ');

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
        className={`custom-time-picker-trigger${isOpen ? ' is-open' : ''}`}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 13px',
          background: disabled ? 'var(--bg-surface-elevated, #f8fafc)' : 'var(--bg-input, #ffffff)',
          border: isOpen ? '1.5px solid var(--brand-blue, #2563eb)' : '1.5px solid var(--border-subtle, #cbd5e1)',
          borderRadius: '10px',
          fontSize: '13px',
          fontWeight: 700,
          color: 'var(--text-primary, #0f172a)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 3px rgba(56, 189, 248, 0.2)' : 'none',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={15} color="var(--brand-blue, #2563eb)" strokeWidth={2.2} />
          <span>{displayLabel}</span>
        </div>
        <ChevronDown
          size={14}
          color="var(--text-muted, #94a3b8)"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        />
      </button>

      {/* Popover Dropdown Card rendered in Portal to float outside modal overflow */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          className={popoverClasses}
          style={{
            position: 'fixed',
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            zIndex: 9999999,
            width: '264px',
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '14px',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            boxShadow: '0 18px 45px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-subtle, rgba(0, 0, 0, 0.05))',
            padding: '11px',
            display: 'flex',
            flexDirection: 'column',
            gap: '9px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            animation: 'fadeInUp 0.12s ease-out'
          }}
        >
          {/* Header Preview Banner */}
          <div
            className="custom-time-picker-header"
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              borderRadius: '8px',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0
            }}
          >
            <span
              className="custom-time-picker-header-title"
              style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Selected Time
            </span>
            <span
              className="custom-time-picker-header-value psm-time-selected-label"
              style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-blue, #2563eb)' }}
            >
              {displayLabel}
            </span>
          </div>

          {/* 3-Column Time Selector Grid */}
          <div
            className="custom-time-picker-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '6px',
              height: '118px',
              minHeight: 0,
              flexShrink: 0
            }}
          >
            {/* Hours Column */}
            <div
              className="custom-time-picker-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                className="custom-time-picker-col-title"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-muted, #64748b)',
                  textAlign: 'center',
                  marginBottom: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.04em'
                }}
              >
                HOUR
              </div>
              <div
                ref={hourListRef}
                className="custom-time-picker-list"
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '7px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: 'var(--bg-surface-elevated, #f8fafc)',
                  scrollbarWidth: 'thin'
                }}
              >
                {HOURS.map((h) => {
                  const isSelected = h === hour12;
                  return (
                    <button
                      key={h}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      className="custom-time-picker-option-btn"
                      onClick={() => handleSelectHour(h)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 0',
                        border: 'none',
                        borderRadius: '5px',
                        background: isSelected ? 'var(--brand-blue, #2563eb)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-primary, #1e293b)',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        transition: 'all 0.12s ease'
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
              className="custom-time-picker-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                className="custom-time-picker-col-title"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-muted, #64748b)',
                  textAlign: 'center',
                  marginBottom: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.04em'
                }}
              >
                MIN
              </div>
              <div
                ref={minListRef}
                className="custom-time-picker-list"
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  maxHeight: '100%',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '7px',
                  padding: '2px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  background: 'var(--bg-surface-elevated, #f8fafc)',
                  scrollbarWidth: 'thin'
                }}
              >
                {MINUTES.map((m) => {
                  const isSelected = m === minute;
                  return (
                    <button
                      key={m}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      className="custom-time-picker-option-btn"
                      onClick={() => handleSelectMinute(m)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 0',
                        border: 'none',
                        borderRadius: '5px',
                        background: isSelected ? 'var(--brand-blue, #2563eb)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-primary, #1e293b)',
                        fontSize: '11.5px',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        textAlign: 'center',
                        lineHeight: 1.2,
                        transition: 'all 0.12s ease'
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
              className="custom-time-picker-col"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                overflow: 'hidden'
              }}
            >
              <div
                className="custom-time-picker-col-title"
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: 'var(--text-muted, #64748b)',
                  textAlign: 'center',
                  marginBottom: '3px',
                  flexShrink: 0,
                  letterSpacing: '0.04em'
                }}
              >
                AM / PM
              </div>
              <div
                className="custom-time-picker-list"
                style={{
                  flex: '1 1 0%',
                  minHeight: 0,
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '7px',
                  padding: '3px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  justifyContent: 'center',
                  background: 'var(--bg-surface-elevated, #f8fafc)'
                }}
              >
                {PERIODS.map((p) => {
                  const isSelected = p === period;
                  return (
                    <button
                      key={p}
                      type="button"
                      data-selected={isSelected ? 'true' : 'false'}
                      className="custom-time-picker-option-btn"
                      onClick={() => handleSelectPeriod(p)}
                      style={{
                        padding: '8px 0',
                        border: 'none',
                        borderRadius: '5px',
                        background: isSelected ? 'var(--brand-blue, #2563eb)' : 'transparent',
                        color: isSelected ? '#ffffff' : 'var(--text-primary, #1e293b)',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.12s ease'
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
            className="custom-time-picker-presets-container"
            style={{
              borderTop: '1px solid var(--border-subtle, #e2e8f0)',
              paddingTop: '6px',
              flexShrink: 0
            }}
          >
            <div
              className="custom-time-picker-presets-title"
              style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #64748b)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              Presets
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  className="custom-time-picker-preset-btn psm-time-picker-preset"
                  onClick={() => handlePreset(preset.value)}
                  style={{
                    padding: '3px 7px',
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '5px',
                    border: '1px solid var(--border-subtle, #cbd5e1)',
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    color: 'var(--text-secondary, #334155)',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Done Button */}
          <button
            type="button"
            className="custom-time-picker-done-btn psm-time-picker-done"
            onClick={() => setIsOpen(false)}
            style={{
              width: '100%',
              padding: '7px 10px',
              border: 'none',
              borderRadius: '7px',
              background: 'var(--brand-blue, #2563eb)',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              flexShrink: 0,
              transition: 'all 0.15s ease'
            }}
          >
            <Check size={13} /> Done
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};
