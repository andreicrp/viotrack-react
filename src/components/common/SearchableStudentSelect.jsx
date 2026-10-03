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

  // Auto-focus search input when opened
  useEffect(() => {
    if ((isOpen || inline) && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, inline]);

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
      style={
        inline
          ? {
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
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
              background: '#ffffff',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 12px 30px -5px rgba(0, 0, 0, 0.2)',
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
      <div style={{ padding: '10px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, Student ID, section..."
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '8px 12px 8px 32px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              color: '#0f172a',
              background: '#ffffff',
              fontFamily: 'inherit'
            }}
          />
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
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
                color: '#94a3b8',
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
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: isActive ? '1.5px solid #0f172a' : '1px solid #cbd5e1',
                    background: isActive ? '#0f172a' : '#ffffff',
                    color: isActive ? '#ffffff' : '#334155',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 4px rgba(15, 23, 42, 0.2)' : 'none'
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
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#0f172a',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
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
      <div style={{ overflowY: 'auto', maxHeight: inline ? maxListHeight : '240px', minHeight: '140px', flex: 1, padding: '4px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
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
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isSelected ? '#f1f5f9' : 'transparent',
                    border: isSelected ? '1px solid #cbd5e1' : '1px solid transparent',
                    marginBottom: '2px',
                    transition: 'all 0.12s ease'
                  }}
                  onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isMulti ? (
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: '3px',
                          border: isSelected ? '1.5px solid #0f172a' : '1.5px solid #cbd5e1',
                          background: isSelected ? '#0f172a' : '#ffffff',
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
                      style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 600, color: '#0f172a' }}>
                        {s.fname} {s.lname}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Student ID: {s.lrn} • {s.grade} - {s.section}
                      </div>
                    </div>
                  </div>

                  {!isMulti && isSelected && <Check size={14} color="#0f172a" strokeWidth={2.5} />}
                </div>
              );
            })}
            {filtered.length > 50 && (
              <div style={{ padding: '6px 8px', textAlign: 'center', fontSize: '11px', color: '#64748b', background: '#f8fafc', borderRadius: '6px', margin: '4px 0' }}>
                Showing top 50 of {filtered.length.toLocaleString()} matching students. Type to narrow search.
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Bar (in dropdown mode) */}
      {!inline && isMulti && (
        <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
            {selectedIds.length} {selectedIds.length === 1 ? 'student' : 'students'} chosen
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              background: '#0f172a',
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
