import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

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

  const startProgressPctRef = useRef(100);

  const startDismissTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    const initialRemaining = remainingTimeRef.current;
    const initialPct = startProgressPctRef.current;

    timerRef.current = setTimeout(() => {
      triggerExit();
    }, initialRemaining);

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progressFraction = Math.min(1, elapsed / initialRemaining);
      const currentPct = Math.max(0, initialPct * (1 - progressFraction));
      setProgress(currentPct);

      if (currentPct > 0 && !isPaused && !isDragging) {
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
    remainingTimeRef.current = Math.max(300, remainingTimeRef.current - elapsed);
    startProgressPctRef.current = Math.max(0, (remainingTimeRef.current / duration) * 100);
    setProgress(startProgressPctRef.current);
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
      icon: Check,
      title: 'Success',
      color: '#22c55e',
      accentBg: '#22c55e',
      progressGradient: 'linear-gradient(90deg, #16a34a 0%, #22c55e 60%, #4ade80 100%)',
      glowShadow: '0 0 10px rgba(34, 197, 94, 0.5)'
    },
    error: {
      icon: X,
      title: 'Error',
      color: '#ef4444',
      accentBg: '#ef4444',
      progressGradient: 'linear-gradient(90deg, #dc2626 0%, #ef4444 60%, #f87171 100%)',
      glowShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
    },
    warning: {
      icon: AlertTriangle,
      title: 'Warning',
      color: '#f59e0b',
      accentBg: '#f59e0b',
      progressGradient: 'linear-gradient(90deg, #d97706 0%, #f59e0b 60%, #fbbf24 100%)',
      glowShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
    },
    info: {
      icon: Info,
      title: 'Information',
      color: '#3b82f6',
      accentBg: '#3b82f6',
      progressGradient: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #60a5fa 100%)',
      glowShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
    }
  }[toast.type] || {
    icon: Info,
    title: 'Notice',
    color: '#3b82f6',
    accentBg: '#3b82f6',
    progressGradient: 'linear-gradient(90deg, #1d4ed8 0%, #3b82f6 60%, #60a5fa 100%)',
    glowShadow: '0 0 10px rgba(59, 130, 246, 0.5)'
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
      {/* Left vertical accent bar */}
      <div className="custom-toast-left-bar" style={{ background: config.color }} />

      {/* Solid rounded icon box */}
      <div className="custom-toast-icon-box" style={{ background: config.accentBg }}>
        <IconComponent size={20} color="#ffffff" strokeWidth={3} />
      </div>

      {/* Text body */}
      <div className="custom-toast-body">
        <div className="custom-toast-title">
          {toast.title || config.title}
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
              style={{ color: config.color }}
            >
              {toast.action.label}
            </button>
          </div>
        )}
      </div>

      {/* Top-right close button */}
      <button
        type="button"
        className="custom-toast-close"
        onClick={triggerExit}
        aria-label="Close notification"
      >
        <X size={15} strokeWidth={2.4} />
      </button>

      {/* High-definition meter progress track */}
      <div className="custom-toast-progress-track">
        <div
          className="custom-toast-progress-fill"
          style={{
            width: `${progress}%`,
            background: config.progressGradient,
            boxShadow: config.glowShadow
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
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
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
