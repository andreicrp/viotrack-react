import React from 'react';
import { Search, X } from 'lucide-react';

export const ScannerManualSearch = ({
  manualInputRef,
  manualQuery,
  setManualQuery,
  onSearch,
  allStudents = [],
  onSelectStudentChip
}) => {
  return (
    <div className="manual-search-box">
      <div className="manual-search-header">
        <span className="manual-search-title">Manual Student Lookup</span>
        <span className="manual-search-subtag">Student ID or Name</span>
      </div>

      <div className="manual-search-input-group">
        <div className="manual-input-wrapper">
          <Search size={15} className="manual-input-search-icon" />
          <input
            ref={manualInputRef}
            type="text"
            className="manual-search-field"
            placeholder="Enter Student ID or Student Name..."
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualQuery.trim()) {
                onSearch(manualQuery);
              }
            }}
          />
          {manualQuery && (
            <button
              type="button"
              className="manual-clear-btn"
              onClick={() => setManualQuery('')}
              title="Clear input"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="manual-search-submit-btn"
          onClick={() => manualQuery.trim() && onSearch(manualQuery)}
          disabled={!manualQuery.trim()}
        >
          <Search size={14} />
          <span>Search</span>
        </button>
      </div>

      {/* Quick Suggestions Chips */}
      {allStudents.length > 0 && (
        <div className="quick-sample-chips">
          <span className="quick-sample-label">Quick Test:</span>
          <div className="quick-chips-list">
            {allStudents.slice(0, 4).map(s => (
              <button
                key={s.id}
                type="button"
                className="quick-chip"
                onClick={() => onSelectStudentChip(s)}
                title={`Select ${s.fname} ${s.lname}`}
              >
                <span className="quick-chip-dot" />
                <span className="quick-chip-name">{s.fname} {s.lname}</span>
                <span className="quick-chip-grade">{s.grade?.replace('Grade ', 'G') || 'G7'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
