import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const NotificationContext = createContext(null);

const ToastItem = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const duration = toast.duration || 4500;
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const currentDragRef = useRef(0);

  // Trigger exit animation then remove from state
  const triggerExit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 280);
  }, [onRemove, toast.id]);

  // Haptic feedback on mobile if supported
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        if (toast.type === 'error') {
          navigator.vibrate([30, 40, 30]);
        } else if (toast.type === 'warning') {
          navigator.vibrate([25, 30]);
        } else if (toast.type === 'success') {
          navigator.vibrate(20);
        }
      }
    } catch (e) {}
  }, [toast.type]);

  const startDismissTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      triggerExit();
    }, remainingTimeRef.current);

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / remainingTimeRef.current) * 100);
      setProgress(pct);
      if (pct > 0 && !isPaused && !isDragging) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isPaused, isDragging, triggerExit]);

  const pauseTimer = () => {
    setIsPaused(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(500, remainingTimeRef.current - elapsed);
  };

  const resumeTimer = () => {
    setIsPaused(false);
    startDismissTimer();
  };

  useEffect(() => {
    startDismissTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [startDismissTimer]);

  // Touch / Swipe Gestures for Mobile
  const handleTouchStart = (e) => {
    pauseTimer();
    setIsDragging(true);
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartXRef.current;
    const diffY = currentY - touchStartYRef.current;

    // Primarily horizontal swipe with upward flick support
    if (Math.abs(diffX) > Math.abs(diffY)) {
      currentDragRef.current = diffX;
      setDragOffset(diffX);
    } else if (diffY < -15) {
      // Swiping up to dismiss
      currentDragRef.current = diffY;
      setDragOffset(diffY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const absDiff = Math.abs(currentDragRef.current);

    // If swiped more than 75px or flicked up, dismiss
    if (absDiff > 75 || currentDragRef.current < -50) {
      triggerExit();
    } else {
      // Spring back to center
      setDragOffset(0);
      currentDragRef.current = 0;
      resumeTimer();
    }
  };

  const config = {
    success: {
      icon: CheckCircle2,
      badge: 'Success',
      accentColor: '#10b981',
      bgTint: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.28)',
      iconBg: 'rgba(16, 185, 129, 0.12)',
      progressGradient: 'linear-gradient(90deg, #10b981, #059669)'
    },
    error: {
      icon: XCircle,
      badge: 'Action Failed',
      accentColor: '#ef4444',
      bgTint: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.28)',
      iconBg: 'rgba(239, 68, 68, 0.12)',
      progressGradient: 'linear-gradient(90deg, #ef4444, #dc2626)'
    },
    warning: {
      icon: AlertTriangle,
      badge: 'Attention',
      accentColor: '#f59e0b',
      bgTint: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.28)',
      iconBg: 'rgba(245, 158, 11, 0.12)',
      progressGradient: 'linear-gradient(90deg, #f59e0b, #d97706)'
    },
    info: {
      icon: Info,
      badge: 'Notification',
      accentColor: '#07345f',
      bgTint: 'rgba(7, 52, 95, 0.08)',
      borderColor: 'rgba(7, 52, 95, 0.25)',
      iconBg: 'rgba(7, 52, 95, 0.12)',
      progressGradient: 'linear-gradient(90deg, #07345f, #0b192c)'
    }
  }[toast.type] || {
    icon: Info,
    badge: 'Notice',
    accentColor: '#07345f',
    bgTint: 'rgba(7, 52, 95, 0.08)',
    borderColor: 'rgba(7, 52, 95, 0.25)',
    iconBg: 'rgba(7, 52, 95, 0.12)',
    progressGradient: 'linear-gradient(90deg, #07345f, #0b192c)'
  };

  const IconComponent = config.icon;

  const dragStyles = dragOffset !== 0 ? {
    transform: `translateX(${dragOffset}px)`,
    opacity: Math.max(0.2, 1 - Math.abs(dragOffset) / 220),
    transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease'
  } : {};

  return (
    <div
      className={`custom-toast custom-toast-${toast.type} ${isExiting ? 'is-exiting' : 'is-entering'} ${isDragging ? 'is-dragging' : ''}`}
      style={{
        borderColor: config.borderColor,
        ...dragStyles
      }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="alert"
      aria-live="assertive"
    >
      <div className="custom-toast-glow" style={{ background: config.bgTint }} />

      <div className="custom-toast-icon-wrap" style={{ color: config.accentColor, background: config.iconBg }}>
        <IconComponent size={20} strokeWidth={2.4} />
      </div>

      <div className="custom-toast-body">
        <div className="custom-toast-header-row">
          <span className="custom-toast-badge" style={{ color: config.accentColor }}>
            {toast.title || config.badge}
          </span>
        </div>
        <div className="custom-toast-message">{toast.message}</div>

        {toast.action && (
          <div className="custom-toast-action-row">
            <button
              type="button"
              className="custom-toast-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                toast.action.onClick?.();
                triggerExit();
              }}
              style={{ color: config.accentColor, borderColor: config.borderColor }}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="custom-toast-close"
        onClick={triggerExit}
        aria-label="Close notification"
      >
        <X size={16} strokeWidth={2.2} />
      </button>

      <div className="custom-toast-progress-track">
        <div
          className="custom-toast-progress-fill"
          style={{
            width: `${progress}%`,
            background: config.progressGradient
          }}
        />
      </div>
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4500, options = {}) => {
    if (!message) return;
    setToasts((prev) => {
      // Prevent rapid duplicate messages of identical type & text
      const isDuplicate = prev.some(
        (t) => t.message === message && t.type === type
      );
      if (isDuplicate) return prev;

      const id = Date.now() + Math.random();
      // Keep up to 3 active toasts
      const trimmed = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
      return [...trimmed, { id, message, type, duration, ...options }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = (msg, duration, options) => addToast(msg, 'success', duration, options);
  const error = (msg, duration, options) => addToast(msg, 'error', duration, options);
  const warning = (msg, duration, options) => addToast(msg, 'warning', duration, options);
  const info = (msg, duration, options) => addToast(msg, 'info', duration, options);

  return (
    <NotificationContext.Provider value={{ addToast, success, error, warning, info }}>
      {children}
      <div className="toast-container" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
