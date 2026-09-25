import React, { useState, useRef, useEffect } from 'react';
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
  className = '',
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedAlign, setResolvedAlign] = useState(align === 'right' ? 'right' : 'left');
  const containerRef = useRef(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popoverWidth = 285;
      if (align === 'right' || rect.left + popoverWidth > window.innerWidth - 12) {
        setResolvedAlign('right');
      } else {
        setResolvedAlign('left');
      }
    }
  }, [isOpen, align]);

  // Parse initial date or default to current / September 2026
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(2026, 8, 1);
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date(2026, 8, 1) : d;
  };

  const selectedDate = value ? parseDate(value) : null;
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date(2026, 8, 1));

  // Sync viewDate when value changes
  useEffect(() => {
    if (value) {
      setViewDate(parseDate(value));
    }
  }, [value]);

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

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleSelectDay = (day) => {
    const monthFormatted = String(currentMonth + 1).padStart(2, '0');
    const dayFormatted = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${monthFormatted}-${dayFormatted}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    // Default to September 25, 2026 or today's equivalent
    const today = new Date(2026, 8, 25);
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
      isCurrentMonth: false,
      isPrev: true
    });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      day: i,
      isCurrentMonth: true
    });
  }
  // Next month leading days
  const remainingCells = 42 - days.length; // 6 rows of 7
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      day: i,
      isCurrentMonth: false,
      isNext: true
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
      style={{ position: 'relative', display: 'inline-block', boxSizing: 'border-box', ...style }}
    >
      {/* Input Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className="custom-date-picker-trigger"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          background: disabled ? '#f8fafc' : '#ffffff',
          border: isOpen ? '1.5px solid #27367f' : '1.5px solid #cbd5e1',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(39, 54, 127, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          boxSizing: 'border-box',
          width: '100%'
        }}
      >
        <CalendarIcon size={14} color={isOpen ? '#27367f' : '#64748b'} style={{ flexShrink: 0 }} />
        <span
          style={{
            fontSize: '12px',
            fontWeight: value ? 700 : 500,
            color: value ? '#0f172a' : '#94a3b8',
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
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '0 2px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Popover Custom Calendar */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            ...(resolvedAlign === 'right' ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' }),
            zIndex: 1500,
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 20px 50px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.9)',
            border: '1px solid #e2e8f0',
            width: '280px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '16px',
            animation: 'fadeInUp 0.15s ease-out'
          }}
        >
          {/* Header with Month / Year & Prev / Next */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.2px' }}>
                {MONTH_NAMES[currentMonth]}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                {currentYear}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '7px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '7px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Weekdays Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' }}>
            {DAYS_OF_WEEK.map((d) => (
              <span key={d} style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', padding: '2px 0' }}>
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
            {days.map((item, index) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={index}
                    style={{
                      height: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      color: '#cbd5e1',
                      userSelect: 'none'
                    }}
                  >
                    {item.day}
                  </div>
                );
              }

              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === currentYear &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getDate() === item.day;

              const isToday = currentYear === 2026 && currentMonth === 8 && item.day === 25;

              return (
                <div
                  key={index}
                  onClick={() => handleSelectDay(item.day)}
                  style={{
                    height: 32,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12.5px',
                    fontWeight: isSelected ? 800 : isToday ? 700 : 500,
                    cursor: 'pointer',
                    background: isSelected
                      ? 'linear-gradient(135deg, #27367f 0%, #1a2557 100%)'
                      : isToday
                      ? '#e0e7ff'
                      : '#ffffff',
                    color: isSelected ? '#ffffff' : isToday ? '#27367f' : '#1e293b',
                    border: isSelected ? 'none' : isToday ? '1px solid #c7d2fe' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 3px 8px rgba(39, 54, 127, 0.35)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = isToday ? '#e0e7ff' : '#ffffff';
                    }
                  }}
                >
                  {item.day}
                </div>
              );
            })}
          </div>

          {/* Quick Action Footer */}
          <div
            style={{
              marginTop: '12px',
              paddingTop: '10px',
              borderTop: '1px solid #f1f5f9',
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
                color: '#27367f',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: '5px'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#e0e7ff'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
