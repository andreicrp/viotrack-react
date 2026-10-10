import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Users, UserPlus } from 'lucide-react';

export const SearchableStudentSelect = ({
  students = [],
  value,
  onChange,
  isMulti = true,
  placeholder = "-- Search and choose student(s) --",
  inline = false,
  maxListHeight = '240px'
}) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize selected IDs to a Set for O(1) membership checks
  const selectedIds = Array.isArray(value)
    ? value.map(id => Number(id))
    : value
    ? [Number(value)]
    : [];

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedStudents = useMemo(() => {
    return students.filter(s => selectedSet.has(Number(s.id)));
  }, [students, selectedSet]);

  // Close when clicking outside (only in popup mode)
  useEffect(() => {
    if (inline) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inline]);



  const handleToggle = (student) => {
    const sid = Number(student.id);
    if (!isMulti) {
      onChange(sid);
      if (!inline) {
        setIsOpen(false);
        setSearchQuery('');
      }
      return;
    }

    if (selectedSet.has(sid)) {
      const next = selectedIds.filter(id => id !== sid);
      onChange(next);
    } else {
      const next = [...selectedIds, sid];
      onChange(next);
    }
  };

  const handleRemove = (e, sid) => {
    e.stopPropagation();
    if (!isMulti) {
      onChange('');
      return;
    }
    const next = selectedIds.filter(id => id !== Number(sid));
    onChange(next);
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange(isMulti ? [] : '');
  };

  // High performance memoized filter
  const filtered = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const isAllGrade = gradeFilter === 'all';
    const targetGrade = gradeFilter.toLowerCase();

    if (!query && isAllGrade) {
      return students;
    }

    return students.filter(s => {
      const name = `${s.fname || ''} ${s.lname || ''}`.toLowerCase();
      const lrn = (s.lrn || '').toLowerCase();
      const grade = (s.grade || '').toLowerCase();
      const section = (s.section || '').toLowerCase();

      const matchesQuery = !query || name.includes(query) || lrn.includes(query) || grade.includes(query) || section.includes(query);
      const matchesGrade = isAllGrade || grade === targetGrade;

      return matchesQuery && matchesGrade;
    });
  }, [students, searchQuery, gradeFilter]);

  // Window top 50 to render in sub-millisecond time for 10,000+ records
  const visibleStudents = useMemo(() => {
    return filtered.slice(0, 50);
  }, [filtered]);

  const handleSelectAllFiltered = () => {
    const filteredIds = filtered.map(s => Number(s.id));
    const allAreSelected = filteredIds.length > 0 && filteredIds.every(id => selectedSet.has(id));

    if (allAreSelected) {
      const filteredSet = new Set(filteredIds);
      const next = selectedIds.filter(id => !filteredSet.has(id));
      onChange(next);
    } else {
      const next = Array.from(new Set([...selectedIds, ...filteredIds]));
      onChange(next);
    }
  };

  const renderContent = () => (
    <div
      className="searchable-dropdown-panel"
      style={
        inline
          ? {
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              boxSizing: 'border-box'
            }
          : {
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.35)',
              zIndex: 9999,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '320px',
              animation: 'fadeInUp 0.15s ease-out'
            }
      }
    >
      {/* Search & Filter Header */}
      <div className="searchable-select-header student-picker-header" style={{ padding: '14px 16px', background: 'var(--bg-surface-elevated, #f8fafc)', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, Student ID, section..."
            className="searchable-select-input"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '10px 38px 10px 36px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              fontSize: '13px',
              outline: 'none',
              color: 'var(--text-primary, #0f172a)',
              background: 'var(--bg-input, #ffffff)',
              fontFamily: 'inherit'
            }}
          />
          <Search size={15} color="var(--text-muted, #94a3b8)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted, #94a3b8)',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Quick Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {['all', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => {
              const isActive = gradeFilter === g;
              return (
                <button
                  type="button"
                  key={g}
                  onClick={() => setGradeFilter(g)}
                  className={`searchable-filter-chip ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '6px 11px',
                    borderRadius: '6px',
                    border: isActive ? '1.5px solid var(--brand-blue, #0f172a)' : '1px solid var(--border-subtle, #cbd5e1)',
                    background: isActive ? 'var(--brand-blue, #0f172a)' : 'var(--bg-surface, #ffffff)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary, #334155)',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {g === 'all' ? 'All' : g.replace('Grade ', 'G')}
                </button>
              );
            })}
          </div>

          {isMulti && filtered.length > 0 && (
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="searchable-filter-chip"
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text-primary, #0f172a)',
                background: 'var(--bg-surface-hover, #f1f5f9)',
                border: '1px solid var(--border-subtle, #cbd5e1)',
                borderRadius: '6px',
                padding: '5px 10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {filtered.every(s => selectedIds.includes(Number(s.id))) ? 'Deselect All' : 'Select Filtered'}
            </button>
          )}
        </div>
      </div>

      {/* Student List */}
      <div className="searchable-select-list student-picker-list" style={{ overflowY: 'auto', maxHeight: inline ? maxListHeight : '240px', minHeight: '180px', flex: 1, padding: '8px', background: 'var(--bg-surface, #ffffff)' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>
            No students found.
          </div>
        ) : (
          <>
            {visibleStudents.map(s => {
              const isSelected = selectedSet.has(Number(s.id));
              return (
                <div
                  key={s.id}
                  onClick={() => handleToggle(s)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleToggle(s);
                    }
                  }}
                  role={isMulti ? 'checkbox' : 'button'}
                  aria-checked={isMulti ? isSelected : undefined}
                  aria-pressed={!isMulti ? isSelected : undefined}
                  tabIndex={0}
                  className={`searchable-item-row student-picker-row ${isSelected ? 'selected' : ''}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isSelected ? 'var(--bg-surface-hover, #f1f5f9)' : 'var(--bg-surface, #ffffff)',
                    border: isSelected ? '1px solid var(--brand-blue, #0f172a)' : '1px solid var(--border-subtle, #e2e8f0)',
                    marginBottom: '5px',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    {isMulti ? (
                      <div
                        style={{
                          width: 19,
                          height: 19,
                          borderRadius: '5px',
                          border: isSelected ? '1.5px solid var(--brand-blue, #0f172a)' : '1.5px solid var(--border-subtle, #cbd5e1)',
                          background: isSelected ? 'var(--brand-blue, #0f172a)' : 'var(--bg-input, #ffffff)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <Check size={11} color="#ffffff" strokeWidth={3} />}
                      </div>
                    ) : null}

                    <img
                      src={
                        s.image ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=0f172a&color=fff&size=50`
                      }
                      alt={s.fname}
                      style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: 'var(--text-primary, #0f172a)' }}>
                        {s.fname} {s.lname}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                        ID {s.lrn} <span aria-hidden="true">·</span> Grade {s.grade}, {s.section}
                      </div>
                    </div>
                  </div>

                  {!isMulti && isSelected && <Check size={14} color="var(--brand-blue, #0f172a)" strokeWidth={2.5} />}
                </div>
              );
            })}
            {filtered.length > 50 && (
              <div style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted, #64748b)', background: 'var(--bg-surface-elevated, #f8fafc)', borderRadius: '6px', margin: '4px 0' }}>
                Showing top 50 of {filtered.length.toLocaleString()} matching students. Type to narrow search.
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Bar (in dropdown mode) */}
      {!inline && isMulti && (
        <div style={{ padding: '6px 10px', background: 'var(--bg-surface-elevated, #f8fafc)', borderTop: '1px solid var(--border-subtle, #e2e8f0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>
            {selectedIds.length} {selectedIds.length === 1 ? 'student' : 'students'} chosen
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              background: 'var(--brand-blue, #0f172a)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '5px',
              padding: '4px 12px',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div style={{ width: '100%', userSelect: 'none' }}>
        {renderContent()}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      
      {/* Dropdown Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: '38px',
          padding: '6px 10px',
          background: '#ffffff',
          border: isOpen ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 2px rgba(15, 23, 42, 0.08)' : 'none',
          transition: 'all 0.15s ease',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1, minWidth: 0 }}>
          {selectedStudents.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {placeholder}
            </span>
          ) : selectedStudents.length === 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
              <img
                src={
                  selectedStudents[0].image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStudents[0].fname + ' ' + selectedStudents[0].lname)}&background=0f172a&color=fff&size=40`
                }
                alt={selectedStudents[0].fname}
                style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedStudents[0].fname} {selectedStudents[0].lname}
              </span>
              <span style={{ fontSize: '11.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                ({selectedStudents[0].grade}-{selectedStudents[0].section})
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ background: '#0f172a', color: '#ffffff', borderRadius: '4px', padding: '1px 6px', fontSize: '11px', fontWeight: 700 }}>
                {selectedStudents.length}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                Students Selected
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {selectedStudents.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                padding: 0
              }}
              title="Clear all"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={15}
            color="#64748b"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Selected Student Chips Tray (Only shown when 2 or more students are selected) */}
      {isMulti && selectedStudents.length > 1 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '5px',
            marginTop: '6px',
            maxHeight: '96px',
            overflowY: 'auto',
            padding: '6px 8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px'
          }}
        >
          {selectedStudents.map(student => (
            <div
              key={student.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '2px 6px 2px 4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            >
              <img
                src={
                  student.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fname + ' ' + student.lname)}&background=0f172a&color=fff&size=40`
                }
                alt={student.fname}
                style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {student.fname} {student.lname}
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap' }}>
                ({student.grade}-{student.section})
              </span>
              <button
                type="button"
                onClick={(e) => handleRemove(e, student.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={`Remove ${student.fname}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Floating Searchable Menu Panel */}
      {isOpen && renderContent()}
    </div>
  );
};
