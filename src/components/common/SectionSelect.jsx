import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layers, Plus, Check, ChevronDown, Users, UserCheck } from 'lucide-react';

export const DEFAULT_GRADE_SECTIONS = {
  'Grade 7': ['Diamond', 'Emerald', 'Ruby', 'Sapphire', 'Pearl'],
  'Grade 8': ['Sampaguita', 'Ilang-Ilang', 'Camia', 'Rosal', 'Jasmin'],
  'Grade 9': ['Mabini', 'Luna', 'Silang', 'Aguinaldo', 'Del Pilar'],
  'Grade 10': ['Rizal', 'Bonifacio', 'Quezon', 'Magsaysay', 'Burgos'],
  'Grade 11': ['STEM A', 'STEM B', 'ABM A', 'HUMSS A', 'GAS A', 'TVL-ICT'],
  'Grade 12': ['STEM A', 'STEM B', 'ABM A', 'HUMSS A', 'GAS A', 'TVL-ICT']
};

export const SectionSelect = ({
  grade = 'Grade 10',
  value = '',
  onChange,
  students = [],
  advisers = [],
  placeholder = 'Select or type section name...',
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef(null);

  const [placement, setPlacement] = useState('bottom');

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Calculate dynamic placement (flip upwards if near screen bottom)
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < 240 && spaceAbove > 240) {
        setPlacement('top');
      } else {
        setPlacement('bottom');
      }
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Standard grade level normalized
  const normGrade = grade || 'Grade 10';

  // Compute available sections combining presets + active database entries
  const sectionList = useMemo(() => {
    const presets = DEFAULT_GRADE_SECTIONS[normGrade] || [];
    const fromStudents = students
      .filter(s => (s.grade || '').toLowerCase() === normGrade.toLowerCase() && s.section)
      .map(s => s.section.trim());
    const fromAdvisers = advisers
      .filter(a => (a.grade_level || '').toLowerCase() === normGrade.toLowerCase() && a.class_section)
      .map(a => a.class_section.trim());

    const uniqueSet = new Set([...presets, ...fromStudents, ...fromAdvisers]);
    return Array.from(uniqueSet).filter(Boolean);
  }, [normGrade, students, advisers]);

  // Filter based on user typed query
  const filtered = useMemo(() => {
    if (!query) return sectionList;
    return sectionList.filter(s => s.toLowerCase().includes(query.toLowerCase()));
  }, [sectionList, query]);

  const handleSelect = (sec) => {
    setQuery(sec);
    onChange(sec);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const isExactMatch = sectionList.some(s => s.toLowerCase() === (query || '').trim().toLowerCase());

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? 99999 : 1 }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
          style={{
            height: '40px',
            borderRadius: '9px',
            border: '1.5px solid #cbd5e1',
            padding: '0 36px 0 12px',
            fontSize: '13px',
            width: '100%',
            boxSizing: 'border-box',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 500
          }}
        />
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          tabIndex={-1}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            color: '#64748b'
          }}
        >
          <ChevronDown
            size={16}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease'
            }}
          />
        </button>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: placement === 'bottom' ? 'calc(100% + 6px)' : 'auto',
            bottom: placement === 'top' ? 'calc(100% + 6px)' : 'auto',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            boxShadow: '0 20px 35px -8px rgba(0, 0, 0, 0.2), 0 8px 16px -4px rgba(0, 0, 0, 0.1)',
            zIndex: 999999,
            padding: '6px'
          }}
        >
          <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Sections for {normGrade} ({sectionList.length})
          </div>

          {filtered.map(sec => {
            const isSelected = (value || '').toLowerCase() === sec.toLowerCase();
            const studentCount = students.filter(
              s => (s.grade || '').toLowerCase() === normGrade.toLowerCase() && (s.section || '').toLowerCase() === sec.toLowerCase()
            ).length;
            const adviser = advisers.find(
              a => (a.grade_level || '').toLowerCase() === normGrade.toLowerCase() && (a.class_section || '').toLowerCase() === sec.toLowerCase()
            );

            return (
              <div
                key={sec}
                onClick={() => handleSelect(sec)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: isSelected ? '#f0f4f8' : 'transparent',
                  color: isSelected ? '#07345f' : '#1e293b',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={14} color={isSelected ? '#07345f' : '#94a3b8'} />
                  <span>{sec}</span>
                  {studentCount > 0 && (
                    <span style={{ fontSize: '10.5px', background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <Users size={10} /> {studentCount}
                    </span>
                  )}
                  {adviser && adviser.teacher && (
                    <span style={{ fontSize: '10.5px', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <UserCheck size={10} /> {adviser.teacher.fname} {adviser.teacher.lname}
                    </span>
                  )}
                </div>
                {isSelected && <Check size={15} color="#07345f" strokeWidth={2.5} />}
              </div>
            );
          })}

          {query.trim() && !isExactMatch && (
            <div
              onClick={() => handleSelect(query.trim())}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: '#f0fdf4',
                color: '#166534',
                fontSize: '12.5px',
                fontWeight: 600,
                borderTop: '1px dashed #bbf7d0',
                marginTop: '4px'
              }}
            >
              <Plus size={14} color="#16a34a" strokeWidth={2.5} />
              <span>Use <strong>"{query.trim()}"</strong> as a new section</span>
            </div>
          )}

          {filtered.length === 0 && !query.trim() && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
              No sections found. Type to add one.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default SectionSelect;
