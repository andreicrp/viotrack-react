import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert, 
  KeyRound, 
  Lock, 
  Mail,
  X 
} from 'lucide-react';
import { LegalModal } from '../components/legal/LegalModal';
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  clearRateLimit, 
  evaluatePasswordStrength,
  sanitizeText 
} from '../utils/security';
import '../css/login.css';

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const { success, error: showError, info } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isLoggedOut = queryParams.get('logged_out') === '1';
  const isExpired = queryParams.get('logged_out') === 'expired';
  const isQrProtected = queryParams.get('reason') === 'qr_protected';
  const redirectParam = queryParams.get('redirect');
  const targetDestination = redirectParam ? decodeURIComponent(redirectParam) : '/';

  const [userType, setUserType] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // If already authenticated and not explicitly redirected due to logout, go straight to dashboard
  useEffect(() => {
    if (isAuthenticated && !isLoggedOut && !isExpired) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, isLoggedOut, isExpired, navigate]);

  // Rate Limiting & Security Lockout State
  const [rateLimitState, setRateLimitState] = useState(() => checkRateLimit('login', 5, 120));
  const [lockoutCountdown, setLockoutCountdown] = useState(0);

  // Password Reset Dialog State
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Legal Modal
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');

  // Lockout Timer countdown effect
  useEffect(() => {
    let timer;
    if (lockoutCountdown > 0) {
      timer = setInterval(() => {
        setLockoutCountdown(prev => {
          if (prev <= 1) {
            setRateLimitState(checkRateLimit('login', 5, 120));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Check Rate Limiting Status
    const rlCheck = checkRateLimit('login', 5, 120);
    if (!rlCheck.allowed) {
      setLockoutCountdown(rlCheck.lockoutSeconds);
      showError(rlCheck.waitMessage || 'Account temporarily locked due to excessive failed attempts.');
      return;
    }

    setLoading(true);
    const cleanEmail = sanitizeText(email).trim().toLowerCase();
    
    if (!cleanEmail || !password) {
      showError('Please enter your institutional email and password.');
      setLoading(false);
      return;
    }

    const isDemoAdmin = cleanEmail === 'admin@viotrack.edu' && password === 'admin123';
    const isDemoTeacher = cleanEmail === 'teacher@viotrack.edu' && password === 'teacher123';

    try {
      if (isSupabaseConfigured() && supabase) {
        let authUser = null;
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (authErr) {
          if (isDemoAdmin || isDemoTeacher) {
            const role = isDemoAdmin ? 'admin' : 'teacher';
            const fullName = isDemoAdmin ? 'System Administrator' : 'Juan Dela Cruz';
            const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
              email: cleanEmail,
              password,
              options: {
                data: {
                  full_name: fullName,
                  role: role
                }
              }
            });

            if (!signUpErr && signUpData?.user) {
              authUser = signUpData.user;
            } else {
              clearRateLimit('login');
              login(role, rememberMe);
              success(`Authenticated successfully as Demo ${role.toUpperCase()}`);
              navigate(targetDestination);
              return;
            }
          } else {
            // Record failed attempt on real Supabase auth failure
            const nextRl = recordFailedAttempt('login', 5, 30);
            if (!nextRl.allowed) {
              setLockoutCountdown(nextRl.lockoutSeconds);
            }
            throw new Error('Invalid email or password. Please verify your credentials.');
          }
        } else {
          authUser = data?.user;
        }

        clearRateLimit('login');
        const role = authUser?.user_metadata?.role || userType;
        const userObj = {
          id: authUser?.id || (role === 'admin' ? 1 : 2),
          name: authUser?.user_metadata?.full_name || (role === 'admin' ? 'System Administrator' : 'Juan Dela Cruz'),
          email: authUser?.email || cleanEmail,
          role: role,
          avatar: '/images/phcm-logo2.png'
        };
        login(userObj, rememberMe);
        success(`Welcome back! Signed in as ${role.toUpperCase()}`);
      } else {
        // Fallback / Demo Offline Mode
        if (isDemoAdmin || isDemoTeacher) {
          clearRateLimit('login');
          login(userType, rememberMe);
          success(`Signed in successfully as ${userType.toUpperCase()}`);
        } else {
          const nextRl = recordFailedAttempt('login', 5, 30);
          if (!nextRl.allowed) {
            setLockoutCountdown(nextRl.lockoutSeconds);
          }
          throw new Error('Invalid credentials. (For demo access, choose Admin Demo or Teacher Demo below)');
        }
      }
      navigate(targetDestination);
    } catch (err) {
      showError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Secure Password Reset Handler (Prevents Email Enumeration)
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;

    setResetLoading(true);
    const cleanEmail = sanitizeText(resetEmail).trim().toLowerCase();

    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/profile`
        });
      }
      // Uniform generic response to prevent user enumeration
      info('If this email is registered in VioTrack, a secure password reset link has been dispatched.');
      setIsResetOpen(false);
      setResetEmail('');
    } catch (err) {
      // Even on error, do not reveal if the account exists or not
      info('If this email is registered in VioTrack, a secure password reset link has been dispatched.');
      setIsResetOpen(false);
    } finally {
      setResetLoading(false);
    }
  };

  const fillRole = (role) => {
    setUserType(role);
    if (role === 'admin') {
      setEmail('admin@viotrack.edu');
      setPassword('admin123');
    } else {
      setEmail('teacher@viotrack.edu');
      setPassword('teacher123');
    }
  };

  const passwordFeedback = evaluatePasswordStrength(password);

  return (
    <div className="login-body-bg">
      {/* Background Graphic Accents */}
      <div className="login-bg-shape-top-left" />
      <div className="login-bg-shape-bottom-right" />

      <div className="login-content-wrapper">
        {/* Brand Header */}
        <div className="login-brand-header">
          <svg
            className="login-brand-logo-svg"
            viewBox="0 0 500 370"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g>
              <circle cx="195" cy="96" r="30" fill="#07345F" />
              <path
                d="M 120 105 Q 108 96 110 110 L 122 206 Q 124 214 132 222 L 235 324 Q 243 332 243 320 L 243 202 Q 243 194 235 188 Z"
                fill="#07345F"
              />
            </g>
            <g>
              <circle cx="305" cy="96" r="30" fill="#07345F" />
              <path
                d="M 380 105 Q 392 96 390 110 L 378 206 Q 376 214 368 222 L 265 324 Q 257 332 257 320 L 257 202 Q 257 194 265 188 Z"
                fill="#0EA5A0"
              />
            </g>
          </svg>

          <h1 className="login-brand-title">VIOTRACK</h1>
          <p className="login-brand-tagline">
            A Student Violation Tracking and Monitoring System
            <span className="login-brand-tagline-sub">Using QR Code and Dashboard</span>
          </p>
        </div>

        {/* QR Security & Protected Record Access Banner */}
        {isQrProtected && (
          <div
            style={{
              background: '#eff6ff',
              color: '#1e40af',
              border: '1.5px solid #bfdbfe',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <ShieldAlert size={22} color="#2563eb" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700 }}>🔒 Protected Academic QR Code</div>
              <div style={{ fontSize: '11.5px', fontWeight: 500, marginTop: '2px', color: '#3b82f6' }}>
                You must sign in to an authorized school faculty or administrator account to scan this student record. (30-min secure session).
              </div>
            </div>
          </div>
        )}

        {/* Logged out & Expiration alerts */}
        {queryParams.get('logged_out') === 'expired' && (
          <div
            style={{
              background: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <CheckCircle2 size={16} color="#d97706" />
            <span>Your session automatically expired after 30 minutes of inactivity. Please sign in again.</span>
          </div>
        )}

        {isLoggedOut && (
          <div
            style={{
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0',
              padding: '10px 14px',
              borderRadius: '12px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <CheckCircle2 size={16} />
            <span>You have been logged out securely. Session invalidated.</span>
          </div>
        )}

        {/* Rate Limiting Lockout Warning */}
        {lockoutCountdown > 0 && (
          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '12px 14px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '16px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <ShieldAlert size={20} />
            <div>
              <div>Rate limit triggered (Too many attempts).</div>
              <div style={{ fontSize: '11.5px', fontWeight: 500, marginTop: '2px' }}>
                Please wait <strong>{lockoutCountdown} seconds</strong> before retrying.
              </div>
            </div>
          </div>
        )}

        {/* Clean Login Card */}
        <div className="login-card-modern">
          <form onSubmit={handleSubmit}>
            {/* Email Input */}
            <div className="login-input-field-wrap">
              <input
                id="login-email"
                type="email"
                className="login-text-input-clean"
                placeholder="Institutional Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading || lockoutCountdown > 0}
              />
            </div>

            {/* Password Input */}
            <div className="login-input-field-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-text-input-clean has-eye"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading || lockoutCountdown > 0}
              />
              <button
                type="button"
                className="login-eye-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="login-options-row">
              <label className="login-remember-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember session</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setIsResetOpen(true);
                }}
                className="login-forgot-password-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* SIGN IN Action Button */}
            <button
              type="submit"
              className="login-submit-btn-primary"
              disabled={loading || lockoutCountdown > 0}
            >
              <span>{loading ? 'Authenticating...' : lockoutCountdown > 0 ? `Locked (${lockoutCountdown}s)` : 'SIGN IN'}</span>
              {!loading && lockoutCountdown === 0 && <ArrowRight size={16} />}
            </button>

            {/* Role Quick Selector / Demo Access (Disabled on Protected QR Scans) */}
            {isQrProtected ? (
              <div
                style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '11.5px',
                  color: '#64748b',
                  textAlign: 'center',
                  fontWeight: 500
                }}
              >
                🔒 Quick demo bypass is disabled for protected student QR scans. Please enter your authorized faculty credentials.
              </div>
            ) : (
              <div className="login-role-chips-wrap">
                <button
                  type="button"
                  className={`login-role-chip-btn ${userType === 'admin' ? 'active' : ''}`}
                  onClick={() => fillRole('admin')}
                >
                  Admin Demo
                </button>
                <button
                  type="button"
                  className={`login-role-chip-btn ${userType === 'teacher' ? 'active' : ''}`}
                  onClick={() => fillRole('teacher')}
                >
                  Teacher Demo
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Privacy Policy Footer */}
        <div className="login-privacy-footer">
          <span>By signing in you agree to our </span>
          <button
            type="button"
            onClick={() => { setLegalModalTab('privacy'); setIsLegalModalOpen(true); }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#2563eb',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'underline',
              fontFamily: 'inherit',
              fontSize: 'inherit'
            }}
          >
            Privacy Policy
          </button>
        </div>
      </div>

      {/* Password Reset Modal (Enumeration-Safe) */}
      {isResetOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '8px', borderRadius: '10px' }}>
                  <KeyRound size={20} />
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: 0 }}>Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.5, marginBottom: '20px' }}>
              Enter your registered institutional email. If found, a single-use, time-limited verification token will be sent to your inbox.
            </p>

            <form onSubmit={handlePasswordReset}>
              <div style={{ position: 'relative', marginBottom: '16px' }}>
                <input
                  type="email"
                  placeholder="admin@viotrack.edu"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #e2e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#64748b',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#07345f',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Privacy Policy & Legal Dialog */}
      <LegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </div>
  );
};

export default LoginPage;
