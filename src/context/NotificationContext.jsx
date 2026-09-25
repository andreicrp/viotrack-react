import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

const NotificationContext = createContext(null);

const ToastItem = ({ toast, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);

  const duration = toast.duration || 4200;
  const startTimeRef = useRef(Date.now());
  const remainingTimeRef = useRef(duration);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);

  const startDismissTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      triggerExit();
    }, remainingTimeRef.current);

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / remainingTimeRef.current) * 100);
      setProgress(pct);
      if (pct > 0 && !isPaused) {
        animFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    animFrameRef.current = requestAnimationFrame(updateProgress);
  }, [isPaused]);

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

  const triggerExit = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onRemove(toast.id);
    }, 280);
  }, [onRemove, toast.id]);

  useEffect(() => {
    startDismissTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [startDismissTimer]);

  const config = {
    success: {
      icon: CheckCircle2,
      badge: 'Success',
      accentColor: '#10b981',
      bgTint: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)'
    },
    error: {
      icon: XCircle,
      badge: 'Action Failed',
      accentColor: '#ef4444',
      bgTint: 'rgba(239, 68, 68, 0.08)',
      borderColor: 'rgba(239, 68, 68, 0.25)'
    },
    warning: {
      icon: AlertTriangle,
      badge: 'Attention',
      accentColor: '#f59e0b',
      bgTint: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.25)'
    },
    info: {
      icon: Info,
      badge: 'Notification',
      accentColor: '#2563eb',
      bgTint: 'rgba(37, 99, 235, 0.08)',
      borderColor: 'rgba(37, 99, 235, 0.25)'
    }
  }[toast.type] || {
    icon: Info,
    badge: 'Notice',
    accentColor: '#2563eb',
    bgTint: 'rgba(37, 99, 235, 0.08)',
    borderColor: 'rgba(37, 99, 235, 0.25)'
  };

  const IconComponent = config.icon;

  return (
    <div
      className={`custom-toast custom-toast-${toast.type} ${isExiting ? 'is-exiting' : 'is-entering'}`}
      style={{
        borderColor: config.borderColor
      }}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      role="alert"
      aria-live="assertive"
    >
      <div className="custom-toast-glow" style={{ background: config.bgTint }} />

      <div className="custom-toast-icon-wrap" style={{ color: config.accentColor, background: config.bgTint }}>
        <IconComponent size={20} strokeWidth={2.4} />
      </div>

      <div className="custom-toast-body">
        <div className="custom-toast-header-row">
          <span className="custom-toast-badge" style={{ color: config.accentColor }}>
            {config.badge}
          </span>
        </div>
        <div className="custom-toast-message">{toast.message}</div>
      </div>

      <button
        type="button"
        className="custom-toast-close"
        onClick={triggerExit}
        aria-label="Close notification"
      >
        <X size={15} strokeWidth={2.2} />
      </button>

      <div className="custom-toast-progress-track">
        <div
          className="custom-toast-progress-fill"
          style={{
            width: `${progress}%`,
            backgroundColor: config.accentColor
          }}
        />
      </div>
    </div>
  );
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    if (!message) return;
    setToasts((prev) => {
      // Prevent duplicate messages if an identical message is already active
      const isDuplicate = prev.some(
        (t) => t.message === message && t.type === type
      );
      if (isDuplicate) return prev;

      const id = Date.now() + Math.random();
      // Keep only up to 2 active toasts to prevent stacking/covering the screen
      const trimmed = prev.length >= 2 ? prev.slice(prev.length - 1) : prev;
      return [...trimmed, { id, message, type, duration }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = (msg, duration) => addToast(msg, 'success', duration);
  const error = (msg, duration) => addToast(msg, 'error', duration);
  const warning = (msg, duration) => addToast(msg, 'warning', duration);
  const info = (msg, duration) => addToast(msg, 'info', duration);

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

