import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { Shield, GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import '../css/login.css';

export const LoginPage = () => {
  const { login, setUser } = useAuth();
  const { success, error: showError } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const isLoggedOut = queryParams.get('logged_out') === '1';

  const [userType, setUserType] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (authErr) throw authErr;
        setUser({
          id: data.user.id,
          name: data.user.user_metadata?.full_name || (userType === 'admin' ? 'Sheryl Gamboa' : 'Elena Reyes'),
          email: data.user.email,
          role: userType,
          avatar: '/images/phcm-logo2.png'
        });
        success(`Signed in successfully as ${userType.toUpperCase()}!`);
      } else {
        // Transparent local auth
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

  const fillDemo = (role) => {
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
      <div className="login-card">
        {/* Institutional Branding Header */}
        <div className="login-header-brand">
          <div className="login-school-logo-wrap">
            <img src="/images/phcm-logo.png" alt="University Seal" />
          </div>
          <h1 className="login-title-main">VIOTRACK</h1>
          <p className="login-subtitle-text">Discipline & Student Conduct Management</p>
        </div>

        {isLoggedOut && (
          <div
            style={{
              background: '#f0fdf4',
              color: '#16a34a',
              border: '1px solid #bbf7d0',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}
          >
            <CheckCircle2 size={16} />
            <span>You have been logged out successfully.</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit}>
          {/* Role Segmented Selector */}
          <div className="login-field-group">
            <label className="login-field-label">Account Role</label>
            <div className="login-role-selector">
              <button
                type="button"
                className={`login-role-btn ${userType === 'admin' ? 'active' : ''}`}
                onClick={() => setUserType('admin')}
              >
                <Shield size={15} />
                <span>Administrator</span>
              </button>
              <button
                type="button"
                className={`login-role-btn ${userType === 'teacher' ? 'active' : ''}`}
                onClick={() => setUserType('teacher')}
              >
                <GraduationCap size={16} />
                <span>Faculty / Teacher</span>
              </button>
            </div>
          </div>

          {/* Email Input */}
          <div className="login-field-group">
            <label className="login-field-label" htmlFor="login-email">
              Institutional Email
            </label>
            <div className="login-input-box">
              <div className="login-input-icon">
                <Mail size={16} />
              </div>
              <input
                id="login-email"
                type="email"
                className="login-text-input"
                placeholder={userType === 'admin' ? 'admin@viotrack.edu' : 'teacher@viotrack.edu'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="login-field-group">
            <label className="login-field-label" htmlFor="login-password">
              Password
            </label>
            <div className="login-input-box">
              <div className="login-input-icon">
                <Lock size={16} />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-text-input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Auxiliary Options */}
          <div className="login-aux-row">
            <label className="login-checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Keep me signed in</span>
            </label>

            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSd7SN8jra5WfROhysYtjd80zMUSwSnxpcQ-a3d1bu8CiogDng/viewform"
              className="login-forgot-link"
              target="_blank"
              rel="noreferrer"
            >
              Forgot password?
            </a>
          </div>

          {/* Sign In Primary Action */}
          <button type="submit" className="login-submit-btn" disabled={loading}>
            <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>

          {/* Quick Demo Credentials Fill */}
          <div className="login-demo-pills">
            <span className="login-demo-label">Quick Fill:</span>
            <button
              type="button"
              className="login-demo-pill-btn"
              onClick={() => fillDemo('admin')}
            >
              ⚡ Admin Demo
            </button>
            <button
              type="button"
              className="login-demo-pill-btn"
              onClick={() => fillDemo('teacher')}
            >
              ⚡ Teacher Demo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default LoginPage;
