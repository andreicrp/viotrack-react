import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, ShieldAlert, AlertTriangle, ShieldCheck, Layers } from 'lucide-react';

export const SearchableViolationSelect = ({
  violations = [],
  value,
  onChange,
  isMulti = true,
  placeholder = "-- Select Infraction(s) --"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize selected IDs to an array
  const selectedIds = Array.isArray(value)
    ? value.map(id => Number(id))
    : value
    ? [Number(value)]
    : [];

  const selectedViolations = violations.filter(v => selectedIds.includes(Number(v.id)));

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

  const handleToggle = (violation) => {
    const vid = Number(violation.id);
    if (!isMulti) {
      onChange(violation);
      setIsOpen(false);
      setSearchQuery('');
      return;
    }

    if (selectedIds.includes(vid)) {
      const next = selectedIds.filter(id => id !== vid);
      onChange(next, violations.filter(v => next.includes(Number(v.id))));
    } else {
      const next = [...selectedIds, vid];
      onChange(next, violations.filter(v => next.includes(Number(v.id))));
    }
  };

  const handleRemove = (e, vid) => {
    e.stopPropagation();
    if (!isMulti) {
      onChange(null);
      return;
    }
    const next = selectedIds.filter(id => id !== Number(vid));
    onChange(next, violations.filter(v => next.includes(Number(v.id))));
  };

  const handleClearAll = (e) => {
    e.stopPropagation();
    onChange(isMulti ? [] : null, []);
  };

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
      return { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Major', icon: ShieldAlert };
    }
    if (t === 'serious') {
      return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Serious', icon: AlertTriangle };
    }
    return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Minor', icon: ShieldCheck };
  };

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
          {selectedViolations.length === 0 ? (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {placeholder}
            </span>
          ) : selectedViolations.length === 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', minWidth: 0 }}>
              {(() => {
                const conf = getSeverityStyle(selectedViolations[0].type);
                return (
                  <span
                    style={{
                      background: conf.bg,
                      color: conf.color,
                      border: `1px solid ${conf.border}`,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      flexShrink: 0
                    }}
                  >
                    {selectedViolations[0].type}
                  </span>
                );
              })()}
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selectedViolations[0].title}
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', minWidth: 0 }}>
              <Layers size={15} color="#0f172a" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                {selectedViolations.length} Offenses selected
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {selectedViolations.length > 0 && (
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

      {/* Selected Violation Chips Tray (Only shown when 2 or more offenses are selected) */}
      {isMulti && selectedViolations.length > 1 && (
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
          {selectedViolations.map(violation => {
            const conf = getSeverityStyle(violation.type);
            const Icon = conf.icon;
            return (
              <div
                key={violation.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: conf.bg,
                  border: `1px solid ${conf.border}`,
                  borderRadius: '6px',
                  padding: '2px 6px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                <span
                  style={{
                    color: conf.color,
                    fontSize: '10px',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <Icon size={10} />
                  {violation.type}
                </span>
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap' }}>
                  {violation.title}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, violation.id)}
                  style={{
                    background: 'rgba(0,0,0,0.06)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '14px',
                    height: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569',
                    cursor: 'pointer',
                    padding: 0
                  }}
                  title={`Remove ${violation.title}`}
                >
                  <X size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Searchable Menu Panel */}
      {isOpen && (
        <div
          style={{
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
          }}
        >
          {/* Search Header */}
          <div style={{ padding: '8px 10px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search infractions by keyword..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '6px 10px 6px 28px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  outline: 'none',
                  color: '#0f172a',
                  background: '#ffffff',
                  fontFamily: 'inherit'
                }}
              />
              <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Severity Category Filter Pills */}
            <div style={{ display: 'flex', gap: '3px' }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'minor', label: 'Minor', color: '#16a34a' },
                { id: 'serious', label: 'Serious', color: '#d97706' },
                { id: 'major', label: 'Major', color: '#dc2626' }
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: activeTab === tab.id ? '1px solid #0f172a' : '1px solid #e2e8f0',
                    background: activeTab === tab.id ? '#0f172a' : '#ffffff',
                    color: activeTab === tab.id ? '#ffffff' : '#64748b',
                    fontSize: '10.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Violations Group List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
            {filteredViolations.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                No violations found.
              </div>
            ) : (
              <>
                {minorList.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 6px' }}>
                      Minor Offenses ({minorList.length})
                    </div>
                    {minorList.map(item => renderItem(item))}
                  </div>
                )}

                {seriousList.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 6px' }}>
                      Serious Offenses ({seriousList.length})
                    </div>
                    {seriousList.map(item => renderItem(item))}
                  </div>
                )}

                {majorList.length > 0 && (
                  <div style={{ marginBottom: '6px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 6px' }}>
                      Major Offenses ({majorList.length})
                    </div>
                    {majorList.map(item => renderItem(item))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Bar */}
          {isMulti && (
            <div style={{ padding: '6px 10px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                {selectedIds.length} {selectedIds.length === 1 ? 'offense' : 'offenses'} chosen
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
      )}
    </div>
  );

  function renderItem(item) {
    const isSelected = selectedIds.includes(Number(item.id));
    const conf = getSeverityStyle(item.type);

    return (
      <div
        key={item.id}
        onClick={() => handleToggle(item)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, paddingRight: '6px' }}>
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

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '12.5px', fontWeight: isSelected ? 700 : 500, color: '#0f172a' }}>
              {item.title}
            </div>
            {(item.default_sanction || item.sanction) && (
              <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                Sanction: <em>{item.default_sanction || item.sanction}</em>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: '4px',
              background: conf.bg,
              color: conf.color,
              border: `1px solid ${conf.border}`
            }}
          >
            {item.type}
          </span>
          {!isMulti && isSelected && <Check size={14} color="#0f172a" strokeWidth={2.5} />}
        </div>
      </div>
    );
  }
};
