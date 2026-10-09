import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = '600px', icon: Icon, dialogClassName = '' }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      lockBodyScroll();
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: 3500 }}
    >
      <div
        className={`modal-dialog ${dialogClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog Modal'}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {Icon && <Icon size={18} color="var(--brand-blue, #07345f)" />}
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', margin: 0, letterSpacing: '-0.01em' }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog modal"
            className="modal-close-btn"
            style={{
              background: 'var(--bg-surface-hover, #f1f5f9)',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              width: 32,
              height: 32,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <X size={16} />
          </button>
        </div>
        
        <div
          className="modal-content-wrapper"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
