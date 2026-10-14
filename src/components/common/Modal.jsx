import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = '600px',
  icon: Icon,
  dialogClassName = '',
  overlayZIndex = 3500,
  enableSwipeDown = true
}) => {
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const currentYRef = useRef(0);

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

  // Touch gesture to swipe down to dismiss bottom sheet on mobile
  const handleTouchStart = useCallback((e) => {
    if (!enableSwipeDown || typeof window === 'undefined' || window.innerWidth > 768) return;
    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    currentYRef.current = touch.clientY;
    setIsDragging(true);
  }, [enableSwipeDown]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    currentYRef.current = touch.clientY;
    const diff = currentYRef.current - startYRef.current;
    if (diff > 0) {
      setDragOffset(diff);
    } else {
      setDragOffset(0);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const diff = currentYRef.current - startYRef.current;
    if (diff > 110) {
      onClose();
    }
    setDragOffset(0);
  }, [isDragging, onClose]);

  if (!isOpen) return null;

  const dragStyle = dragOffset > 0 ? {
    transform: `translate3d(0, ${dragOffset}px, 0)`,
    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  } : {};

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: overlayZIndex }}
    >
      <div
        className={`modal-dialog ${dialogClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog Modal'}
        style={{ maxWidth, ...dragStyle }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Grab / Drag Handle */}
        <div
          className="modal-drag-handle-wrap"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="Drag down to close"
        >
          <div className="modal-drag-handle" />
        </div>

        <div
          className="modal-header"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
