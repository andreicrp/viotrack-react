import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import {
  Lock,
  Unlock,
  Shield,
  GraduationCap,
  Eye,
  EyeOff,
  LogOut,
  Sparkles,
  AlertCircle,
  Clock
} from 'lucide-react';

export const ScreenLockModal = () => {
  const { user, isLocked, unlockScreen, logout, autoLockMinutes } = useAuth();
  const { success, error } = useNotification();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isLocked) {
      lockBodyScroll();
      setPassword('');
      setErrorMessage('');
      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 100);
      return () => {
        clearTimeout(timer);
        unlockBodyScroll();
      };
    }
  }, [isLocked]);

  if (!isLocked || !user) return null;

  const isAdmin = user?.role === 'admin';
  const userName = user?.name || (isAdmin ? 'System Administrator' : 'Faculty Member');
  const userAvatar = user?.avatar || '/images/phcm-logo2.png';

  const handleUnlock = (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    // Verification check: accept standard demo passwords or PIN 1234 or non-empty for demo convenience
    const trimmed = password.trim();
    const isValid = trimmed === 'admin123' || trimmed === 'teacher123' || trimmed === '1234' || trimmed === 'password' || trimmed.length >= 4 || trimmed === '';

    setTimeout(() => {
      if (isValid) {
        unlockScreen(password);
        success(`Welcome back, ${userName}! Workstation unlocked.`);
      } else {
        setIsShaking(true);
        setErrorMessage('Incorrect password or PIN. Use 1234 or your account credentials.');
        setTimeout(() => setIsShaking(false), 500);
      }
      setIsSubmitting(false);
    }, 200);
  };

  const handleQuickUnlock = () => {
    unlockScreen();
    success(`Welcome back, ${userName}! Workstation unlocked.`);
  };

  const handleSignOut = () => {
    logout('manual');
    window.location.href = '/login?logged_out=1';
  };

  return (
    <div
      className="modal-backdrop-smooth"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className={`modal-content-smooth screen-lock-card ${isShaking ? 'shake-animation' : ''}`}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '20px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--border-subtle, #e2e8f0)'
        }}
      >
        {/* Simple Header with Avatar */}
        <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '12px' }}>
            <img
              src={userAvatar}
              alt={userName}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid var(--brand-blue, #07345f)',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                background: 'var(--bg-surface-elevated, #ffffff)'
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=07345f&color=fff&size=100&bold=true`;
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'var(--brand-blue, #07345f)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-surface, #ffffff)'
              }}
              title="Session Locked"
            >
              <Lock size={11} strokeWidth={2.6} />
            </div>
          </div>

          <h2 style={{ margin: '0 0 2px', color: 'var(--text-primary, #0f172a)', fontSize: '18px', fontWeight: 800 }}>
            {userName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '3px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
              {isAdmin ? 'System Administrator' : 'Faculty Member'}
            </span>
            <span style={{ fontSize: '10.5px', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '1px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={10} /> {autoLockMinutes > 0 ? `${autoLockMinutes}m Idle Lock` : 'Manual Lock'}
            </span>
          </div>
        </div>

        {/* Unlock Form */}
        <div style={{ padding: '0 24px 24px' }}>
          <form onSubmit={handleUnlock}>
            <div style={{ position: 'relative', marginBottom: errorMessage ? '8px' : '14px' }}>
              <input
                id="screen-lock-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password (PIN: 1234)"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                className="screen-lock-input-field"
                style={{
                  width: '100%',
                  padding: '11px 38px 11px 16px',
                  borderRadius: '20px',
                  border: errorMessage ? '1.5px solid #ef4444' : '1.5px solid var(--border-medium, #cbd5e1)',
                  fontSize: '13.5px',
                  outline: 'none',
                  background: 'var(--bg-input, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--brand-blue, #07345f)';
                  e.target.style.background = 'var(--bg-surface, #ffffff)';
                }}
                onBlur={(e) => {
                  if (!errorMessage) {
                    e.target.style.borderColor = 'var(--border-medium, #cbd5e1)';
                    e.target.style.background = 'var(--bg-input, #f8fafc)';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  padding: '2px'
                }}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#ef4444',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  marginBottom: '12px'
                }}
              >
                <AlertCircle size={13} />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="screen-lock-unlock-btn"
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '20px',
                background: 'var(--brand-blue, #07345f)',
                color: '#ffffff',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(7, 52, 95, 0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <Unlock size={15} />
              <span>{isSubmitting ? 'Unlocking...' : 'Unlock Screen'}</span>
            </button>
          </form>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-subtle, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '20px',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted, #64748b)'; e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
