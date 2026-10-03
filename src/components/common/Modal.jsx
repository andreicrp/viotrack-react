import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = '600px', icon: Icon }) => {
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
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog Modal'}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {Icon && <Icon size={18} color="#07345f" />}
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog modal"
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              width: 32,
              height: 32,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={16} />
          </button>
        </div>
        
        <div
          className="smooth-scroll-container"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
