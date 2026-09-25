import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, User } from 'lucide-react';

export const SearchableStudentSelect = ({ students = [], value, onChange, placeholder = "-- Choose Student from Directory --" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedItem = students.find(s => String(s.id) === String(value));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (item) => {
    onChange(item.id);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
  };

  const filtered = students.filter(s => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const name = `${s.fname} ${s.lname}`.toLowerCase();
    const lrn = (s.lrn || '').toLowerCase();
    const grade = (s.grade || '').toLowerCase();
    const section = (s.section || '').toLowerCase();
    return name.includes(query) || lrn.includes(query) || grade.includes(query) || section.includes(query);
  });

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      
      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: '42px',
          padding: '8px 12px',
          background: '#ffffff',
          border: isOpen ? '2px solid #27367f' : '1.5px solid #cbd5e1',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: isOpen ? '0 0 0 3px rgba(39, 54, 127, 0.1)' : 'none',
          transition: 'all 0.15s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
          {selectedItem ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <img
                src={
                  selectedItem.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedItem.fname + ' ' + selectedItem.lname)}&background=27367f&color=fff&size=50`
                }
                alt={selectedItem.fname}
                style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }}
              />
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                {selectedItem.lname}, {selectedItem.fname}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                ({selectedItem.grade} - {selectedItem.section} | LRN: {selectedItem.lrn})
              </span>
            </div>
          ) : (
            <span style={{ fontSize: '13.5px', color: '#94a3b8', fontWeight: 500 }}>
              {placeholder}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {selectedItem && (
            <button
              type="button"
              onClick={handleClear}
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
                cursor: 'pointer'
              }}
              title="Clear selection"
            >
              <X size={12} />
            </button>
          )}
          <ChevronDown
            size={16}
            color="#64748b"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          />
        </div>
      </div>

      {/* Floating Searchable Menu Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0,0,0,0.08)',
            zIndex: 9999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '300px',
            animation: 'fadeInUp 0.15s ease-out'
          }}
        >
          {/* Search Header */}
          <div style={{ padding: '10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name, 12-digit LRN, grade..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '8px 12px 8px 32px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '12.5px',
                  outline: 'none',
                  color: '#0f172a',
                  background: '#ffffff',
                  fontFamily: 'inherit'
                }}
              />
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          {/* Student List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No students found matching "<strong>{searchQuery}</strong>".
              </div>
            ) : (
              filtered.map(s => {
                const isSelected = String(s.id) === String(value);
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isSelected ? '#eff6ff' : 'transparent',
                      border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                      marginBottom: '2px',
                      transition: 'all 0.12s ease'
                    }}
                    onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={
                          s.image ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(s.fname + ' ' + s.lname)}&background=27367f&color=fff&size=50`
                        }
                        alt={s.fname}
                        style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 600, color: isSelected ? '#1e40af' : '#0f172a' }}>
                          {s.fname} {s.lname}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                          LRN: {s.lrn} • {s.grade} - {s.section}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check size={14} color="#2563eb" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
