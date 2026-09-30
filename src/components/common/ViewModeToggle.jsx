import React from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';

export const ViewModeToggle = ({ viewMode = 'list', onChange, size = 'sm' }) => {
  return (
    <div
      className="view-mode-toggle"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#f8fafc',
        padding: '3px',
        borderRadius: '9px',
        border: '1.5px solid #cbd5e1',
        gap: '3px',
        height: '38px',
        boxSizing: 'border-box'
      }}
    >
      <button
        type="button"
        onClick={() => onChange('list')}
        title="List View"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '0 8px',
          fontSize: '12px',
          fontWeight: viewMode === 'list' ? 700 : 500,
          color: viewMode === 'list' ? '#ffffff' : '#64748b',
          background: viewMode === 'list' ? '#07345f' : 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: viewMode === 'list' ? '0 1px 3px rgba(7, 52, 95, 0.25)' : 'none'
        }}
      >
        <LayoutList size={15} strokeWidth={2.4} />
      </button>

      <button
        type="button"
        onClick={() => onChange('grid')}
        title="Grid View"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '0 8px',
          fontSize: '12px',
          fontWeight: viewMode === 'grid' ? 700 : 500,
          color: viewMode === 'grid' ? '#ffffff' : '#64748b',
          background: viewMode === 'grid' ? '#07345f' : 'transparent',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(7, 52, 95, 0.25)' : 'none'
        }}
      >
        <LayoutGrid size={15} strokeWidth={2.4} />
      </button>
    </div>
  );
};
