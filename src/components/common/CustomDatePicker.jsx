import React, { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const CustomDatePicker = ({
  value,
  onChange,
  placeholder = 'Select date',
  minDate,
  maxDate,
  disabled = false,
  align = 'auto',
  compact = false,
  showClear = true,
  showIcon = true,
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState(align === 'right' ? 'right' : 'left');
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 236 });
  const containerRef = useRef(null);
  const popoverRef = useRef(null);
  const classNames = className.split(/\s+/);
  const shouldPortalPopover = classNames.includes('pdm-date-picker') || classNames.includes('psm-conference-date-picker');
  const popoverScopeClass = classNames.includes('pdm-date-picker')
    ? 'pdm-date-picker-popover'
    : classNames.includes('psm-conference-date-picker')
      ? 'psm-conference-date-popover'
      : '';

  const updatePopoverPosition = useCallback(() => {
    if (!containerRef.current) return;
    const triggerRect = containerRef.current.getBoundingClientRect();
    const width = Math.max(0, Math.min(236, window.innerWidth - 24));
    const left = Math.max(12, Math.min(triggerRect.left, window.innerWidth - width - 12));
    const popoverHeight = popoverRef.current?.getBoundingClientRect().height || 290;
    const belowTop = triggerRect.bottom + 4;
    const top = belowTop + popoverHeight > window.innerHeight - 12
      ? Math.max(12, triggerRect.top - popoverHeight - 4)
      : belowTop;

    setPopoverPosition({ top, left, width });
  }, []);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 240;
      if (align === 'right' || rect.left + popoverWidth > window.innerWidth - 12) {
        setResolvedAlign('right');
      } else {
        setResolvedAlign('left');
      }
    }
  }, [isOpen, align]);

  useLayoutEffect(() => {
    if (!isOpen || !shouldPortalPopover) return undefined;

    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [isOpen, shouldPortalPopover, updatePopoverPosition]);

  // Parse a date-only value as local time to avoid timezone shifts.
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    if (dateStr instanceof Date) return dateStr;
    const parts = typeof dateStr === 'string' ? dateStr.split('-') : [];
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const selectedDate = value ? parseDate(value) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());

  // Sync viewDate when value changes
  useEffect(() => {
    if (value) {
      setViewDate(parseDate(value));
    } else {
      setViewDate(new Date());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !containerRef.current?.contains(e.target) &&
        !popoverRef.current?.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day, monthOffset = 0) => {
    const selected = new Date(currentYear, currentMonth + monthOffset, day);
    const monthFormatted = String(selected.getMonth() + 1).padStart(2, '0');
    const dayFormatted = String(selected.getDate()).padStart(2, '0');
    const dateStr = `${selected.getFullYear()}-${monthFormatted}-${dayFormatted}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const monthFormatted = String(today.getMonth() + 1).padStart(2, '0');
    const dayFormatted = String(today.getDate()).padStart(2, '0');
    const dateStr = `${today.getFullYear()}-${monthFormatted}-${dayFormatted}`;
    onChange(dateStr);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Calendar matrix calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

  const days = [];
  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    days.push({
      day: daysInPrevMonth - i,
      monthOffset: -1
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      monthOffset: 0
    });
  }
  // Next month leading days
  const remainingCells = 42 - days.length; // 6 rows of 7
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      monthOffset: 1
    });
  }

  // Format date display for input trigger
  const formatDisplay = (val) => {
    if (!val) return '';
    const d = parseDate(val);
    const monthShort = MONTH_NAMES[d.getMonth()]?.slice(0, 3);
    const day = String(d.getDate()).padStart(2, '0');
    if (compact) {
      return `${monthShort} ${day}`;
    }
    const year = d.getFullYear();
    return `${monthShort} ${day}, ${year}`;
  };

  return (
    <div
      ref={containerRef}
      className={`custom-date-picker-wrapper ${className}`}
      style={{ position: 'relative', display: 'block', width: '100%', boxSizing: 'border-box', ...style }}
    >
      {/* Input Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`custom-date-picker-trigger${isOpen ? ' is-open' : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: compact ? '7px 10px' : '9px 12px',
          background: disabled ? 'var(--bg-surface-elevated, #f8fafc)' : 'var(--bg-input, #ffffff)',
          border: isOpen ? '1.5px solid var(--brand-blue, #07345f)' : '1.5px solid var(--border-subtle, #cbd5e1)',
          borderRadius: '10px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(56, 189, 248, 0.2)' : '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        {showIcon && (
          <CalendarIcon size={15} color="var(--brand-blue, #0f172a)" style={{ flexShrink: 0 }} />
        )}
        <span
          style={{
            fontSize: compact ? '12px' : '13px',
            fontWeight: value ? 700 : 500,
            color: value ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #94a3b8)',
            flex: 1,
            whiteSpace: 'nowrap'
          }}
        >
          {value ? formatDisplay(value) : placeholder}
        </span>
        {value && !disabled && showClear && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              padding: '0 2px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Popover Custom Calendar */}
      {isOpen && (() => {
        const popover = (
        <div
          ref={popoverRef}
          className={`custom-date-picker-popover${shouldPortalPopover ? ` ${popoverScopeClass}` : ''}`}
          style={{
            position: shouldPortalPopover ? 'fixed' : 'absolute',
            top: shouldPortalPopover ? `${popoverPosition.top}px` : 'calc(100% + 4px)',
            ...(shouldPortalPopover
              ? { left: `${popoverPosition.left}px`, right: 'auto' }
              : resolvedAlign === 'right'
                ? { right: 0, left: 'auto' }
                : { left: 0, right: 'auto' }),
            zIndex: 100005,
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 14px 36px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-subtle, rgba(226, 232, 240, 0.95))',
            border: '1px solid var(--border-subtle, #e2e8f0)',
            width: shouldPortalPopover ? `${popoverPosition.width}px` : '236px',
            boxSizing: shouldPortalPopover ? 'border-box' : undefined,
            maxWidth: 'calc(100vw - 20px)',
            maxHeight: shouldPortalPopover ? 'calc(100dvh - 24px)' : undefined,
            overflowY: shouldPortalPopover ? 'auto' : undefined,
            padding: '10px 11px',
            animation: 'fadeInUp 0.12s ease-out'
          }}
        >
          {/* Header with Month / Year & Prev / Next */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.2px' }}>
                {MONTH_NAMES[currentMonth]}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                {currentYear}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '3px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  background: 'var(--bg-surface-elevated, #ffffff)',
                  color: 'var(--text-secondary, #475569)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  background: 'var(--bg-surface-elevated, #ffffff)',
                  color: 'var(--text-secondary, #475569)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Weekdays Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '4px' }}>
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted, #94a3b8)', padding: '1px 0' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {days.map((item, index) => {
              const itemDate = new Date(currentYear, currentMonth + item.monthOffset, item.day);

              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === itemDate.getFullYear() &&
                selectedDate.getMonth() === itemDate.getMonth() &&
                selectedDate.getDate() === itemDate.getDate();

              const today = new Date();
              const isToday =
                today.getFullYear() === itemDate.getFullYear() &&
                today.getMonth() === itemDate.getMonth() &&
                today.getDate() === itemDate.getDate();

              return (
                <button
                  type="button"
                  key={index}
                  onClick={() => handleSelectDay(item.day, item.monthOffset)}
                  className={`custom-date-picker-day${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
                  aria-label={itemDate.toLocaleDateString()}
                  aria-pressed={Boolean(isSelected)}
                  style={{
                    height: 26,
                    padding: 0,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11.5px',
                    fontFamily: 'inherit',
                    fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                    cursor: 'pointer',
                    background: isSelected
                      ? 'var(--brand-blue, #27367f)'
                      : isToday
                      ? 'rgba(56, 189, 248, 0.2)'
                      : 'transparent',
                    color: isSelected
                      ? '#ffffff'
                      : isToday
                        ? 'var(--brand-blue, #27367f)'
                        : item.monthOffset === 0
                          ? 'var(--text-primary, #1e293b)'
                          : 'var(--text-dim, #cbd5e1)',
                    border: isSelected ? 'none' : isToday ? '1px solid var(--border-focus, #c7d2fe)' : '1px solid transparent',
                    transition: 'all 0.12s ease'
                  }}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle, #f1f5f9)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <button
              type="button"
              onClick={handleSelectToday}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--brand-blue, #27367f)',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '2px 5px',
                borderRadius: '4px'
              }}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'var(--bg-surface-elevated, #f8fafc)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                color: 'var(--text-secondary, #475569)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '3px 8px',
                borderRadius: '5px'
              }}
            >
              Close
            </button>
          </div>
        </div>
        );
        return shouldPortalPopover ? createPortal(popover, document.body) : popover;
      })()}
    </div>
  );
};
