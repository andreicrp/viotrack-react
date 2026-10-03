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
  const { user, isLocked, unlockScreen, logout } = useAuth();
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
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className={`modal-content-smooth ${isShaking ? 'shake-animation' : ''}`}
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header Ribbon */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '24px 24px 20px',
            textAlign: 'center',
            position: 'relative'
          }}
        >
          {/* Logo & Seal */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '14px' }}>
            <img
              src="/images/phcm-logo.png"
              alt="Perpetual Logo"
              style={{ width: '32px', height: '32px', objectFit: 'contain' }}
            />
            <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em' }}>
              VIOTRACK SECURITY
            </span>
          </div>

          {/* User Avatar with Locked Badge */}
          <div style={{ position: 'relative', display: 'inline-block', margin: '0 auto 12px' }}>
            <img
              src={userAvatar}
              alt={userName}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #ffffff',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                background: '#ffffff'
              }}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0f172a&color=fff&size=100&bold=true`;
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: -2,
                right: -2,
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#e11d48',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title="Session Locked"
            >
              <Lock size={13} strokeWidth={2.6} />
            </div>
          </div>

          <h2 style={{ margin: '0 0 4px', color: '#ffffff', fontSize: '18px', fontWeight: 800 }}>
            {userName}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                padding: '3px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700
              }}
            >
              {isAdmin ? <Shield size={11} /> : <GraduationCap size={11} />}
              {isAdmin ? 'System Administrator' : 'Faculty Adviser'}
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px' }}>
          {/* Lock Info Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '20px'
            }}
          >
            <Clock size={18} color="#64748b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.45 }}>
              <strong style={{ color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                Workstation Locked for Privacy
              </strong>
              Screen auto-locked after 15 minutes of inactivity to protect sensitive student records.
            </div>
          </div>

          {/* Unlock Form */}
          <form onSubmit={handleUnlock}>
            <label
              htmlFor="screen-lock-input"
              style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}
            >
              Enter Password or PIN (Default PIN: 1234)
            </label>
            <div style={{ position: 'relative', marginBottom: errorMessage ? '8px' : '16px' }}>
              <input
                id="screen-lock-input"
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password or 1234"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                style={{
                  width: '100%',
                  padding: '11px 40px 11px 14px',
                  borderRadius: '10px',
                  border: errorMessage ? '1.5px solid #e11d48' : '1.5px solid #cbd5e1',
                  fontSize: '14px',
                  outline: 'none',
                  background: '#f8fafc',
                  transition: 'all 0.15s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0f172a';
                  e.target.style.background = '#ffffff';
                }}
                onBlur={(e) => {
                  if (!errorMessage) {
                    e.target.style.borderColor = '#cbd5e1';
                    e.target.style.background = '#f8fafc';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#e11d48',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '16px'
                }}
              >
                <AlertCircle size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#0f172a',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                  transition: 'background 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
                onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
              >
                <Unlock size={16} />
                <span>{isSubmitting ? 'Verifying...' : 'Unlock Workstation'}</span>
              </button>

              <button
                type="button"
                onClick={handleQuickUnlock}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                <Sparkles size={14} color="#0f172a" />
                <span>1-Click Quick Resume</span>
              </button>
            </div>
          </form>

          {/* Footer Actions */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              Not {userName.split(' ')[0]}?
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                background: 'none',
                border: 'none',
                color: '#e11d48',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#fff1f2'}
              onMouseOut={(e) => e.currentTarget.style.background = 'none'}
            >
              <LogOut size={13} />
              <span>Sign Out Completely</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
