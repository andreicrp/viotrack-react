import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, ShieldAlert, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

export const SearchableViolationSelect = ({ violations = [], value, onChange, placeholder = "-- Select Specific Infraction --" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedItem = violations.find(v => String(v.id) === String(value));

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleSelect = (item) => {
    onChange(item);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
  };

  // Filter violations by search query and category tab
  const filteredViolations = violations.filter(v => {
    const query = searchQuery.toLowerCase().trim();
    const title = (v.title || '').toLowerCase();
    const type = (v.type || '').toLowerCase();
    const desc = (v.description || '').toLowerCase();
    const sanction = (v.default_sanction || v.sanction || '').toLowerCase();

    const matchesSearch = !query || title.includes(query) || type.includes(query) || desc.includes(query) || sanction.includes(query);
    const matchesTab = activeTab === 'all' || type === activeTab.toLowerCase();

    return matchesSearch && matchesTab;
  });

  const minorList = filteredViolations.filter(v => (v.type || '').toLowerCase() === 'minor');
  const seriousList = filteredViolations.filter(v => (v.type || '').toLowerCase() === 'serious');
  const majorList = filteredViolations.filter(v => (v.type || '').toLowerCase() === 'major');

  const getSeverityStyle = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'major') {
      return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Major Offense', icon: ShieldAlert };
    }
    if (t === 'serious') {
      return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Serious Offense', icon: AlertTriangle };
    }
    return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Minor Offense', icon: ShieldCheck };
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
      
      {/* Dropdown Trigger Box */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          minHeight: '44px',
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
              {(() => {
                const conf = getSeverityStyle(selectedItem.type);
                const Icon = conf.icon;
                return (
                  <span
                    style={{
                      background: conf.bg,
                      color: conf.color,
                      border: `1px solid ${conf.border}`,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={11} /> {selectedItem.type}
                  </span>
                );
              })()}
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedItem.title}
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
            maxHeight: '340px',
            animation: 'fadeInUp 0.15s ease-out'
          }}
        >
          {/* Search Header */}
          <div style={{ padding: '12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search violations by title, keyword, or sanction..."
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
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Severity Category Filter Pills */}
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'all', label: 'All Infractions' },
                { id: 'minor', label: 'Minor', color: '#16a34a' },
                { id: 'serious', label: 'Serious', color: '#d97706' },
                { id: 'major', label: 'Major', color: '#dc2626' }
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: activeTab === tab.id ? `1.5px solid ${tab.color || '#27367f'}` : '1px solid #cbd5e1',
                    background: activeTab === tab.id ? (tab.color ? `${tab.color}15` : '#27367f15') : '#ffffff',
                    color: activeTab === tab.id ? (tab.color || '#27367f') : '#64748b',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Violations Group List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '6px' }}>
            {filteredViolations.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                No violations found matching "<strong>{searchQuery}</strong>".
              </div>
            ) : (
              <>
                {/* Minor Group */}
                {minorList.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px' }}>
                      ● Minor Offenses ({minorList.length})
                    </div>
                    {minorList.map(item => renderItem(item))}
                  </div>
                )}

                {/* Serious Group */}
                {seriousList.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px' }}>
                      ● Serious Offenses ({seriousList.length})
                    </div>
                    {seriousList.map(item => renderItem(item))}
                  </div>
                )}

                {/* Major Group */}
                {majorList.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '4px 8px' }}>
                      ● Major Offenses ({majorList.length})
                    </div>
                    {majorList.map(item => renderItem(item))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  function renderItem(item) {
    const isSelected = String(item.id) === String(value);
    const conf = getSeverityStyle(item.type);

    return (
      <div
        key={item.id}
        onClick={() => handleSelect(item)}
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
        <div style={{ flex: 1, paddingRight: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#1e40af' : '#0f172a' }}>
            {item.title}
          </div>
          {(item.default_sanction || item.sanction) && (
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
              Default Sanction: <em>{item.default_sanction || item.sanction}</em>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: '6px',
              background: conf.bg,
              color: conf.color,
              border: `1px solid ${conf.border}`
            }}
          >
            {item.type}
          </span>
          {isSelected && <Check size={14} color="#2563eb" />}
        </div>
      </div>
    );
  }
};
