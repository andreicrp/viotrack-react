import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { LegalModal } from '../components/legal/LegalModal';
import '../css/login.css';

export const LoginPage = () => {
  const { login, setUser } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isLoggedOut = queryParams.get('logged_out') === '1';

  const [userType, setUserType] = useState('admin');
  const [email, setEmail] = useState('admin@viotrack.edu');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState('privacy');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const isDemoAdmin = cleanEmail === 'admin@viotrack.edu' && password === 'admin123';
    const isDemoTeacher = cleanEmail === 'teacher@viotrack.edu' && password === 'teacher123';

    try {
      if (isSupabaseConfigured()) {
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
              login(role);
              success(`Signed in successfully as Demo ${role.toUpperCase()}!`);
              navigate('/');
              return;
            }
          } else {
            throw authErr;
          }
        } else {
          authUser = data?.user;
        }

        const role = authUser?.user_metadata?.role || userType;
        setUser({
          id: authUser?.id || (role === 'admin' ? 1 : 2),
          name: authUser?.user_metadata?.full_name || (role === 'admin' ? 'System Administrator' : 'Juan Dela Cruz'),
          email: authUser?.email || cleanEmail,
          role: role,
          avatar: '/images/phcm-logo2.png'
        });
        success(`Signed in successfully as ${role.toUpperCase()}!`);
      } else {
        login(userType);
        success(`Signed in successfully as ${userType.toUpperCase()}!`);
      }
      navigate('/');
    } catch (err) {
      showError('Invalid email or password: ' + err.message);
    } finally {
      setLoading(false);
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

  return (
    <div className="login-body-bg">
      {/* Background Graphic Accents */}
      <div className="login-bg-shape-top-left" />
      <div className="login-bg-shape-bottom-right" />

      <div className="login-content-wrapper">
        {/* Brand Header */}
        <div className="login-brand-header">
          {/* Exact Brand Vector Logo */}
          <svg
            className="login-brand-logo-svg"
            viewBox="0 0 500 370"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Left Figure (Deep Navy #07345F) */}
            <g>
              <circle cx="195" cy="96" r="30" fill="#07345F" />
              <path
                d="M 120 105
                   Q 108 96 110 110
                   L 122 206
                   Q 124 214 132 222
                   L 235 324
                   Q 243 332 243 320
                   L 243 202
                   Q 243 194 235 188
                   Z"
                fill="#07345F"
              />
            </g>

            {/* Right Figure (Teal #0EA5A0) */}
            <g>
              <circle cx="305" cy="96" r="30" fill="#07345F" />
              <path
                d="M 380 105
                   Q 392 96 390 110
                   L 378 206
                   Q 376 214 368 222
                   L 265 324
                   Q 257 332 257 320
                   L 257 202
                   Q 257 194 265 188
                   Z"
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

        {/* Logged out alert */}
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
            <span>You have been logged out successfully.</span>
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
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                <span>Remember me</span>
              </label>

              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSd7SN8jra5WfROhysYtjd80zMUSwSnxpcQ-a3d1bu8CiogDng/viewform"
                className="login-forgot-password-link"
                target="_blank"
                rel="noreferrer"
              >
                Forgot password?
              </a>
            </div>

            {/* SIGN IN Action Button */}
            <button
              type="submit"
              className="login-submit-btn-primary"
              disabled={loading}
            >
              <span>{loading ? 'Signing in...' : 'SIGN IN'}</span>
              {!loading && <ArrowRight size={16} />}
            </button>

            {/* Role Quick Selector / Demo Fill */}
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
