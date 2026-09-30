import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Lock, 
  ArrowLeft, 
  Home, 
  UserX,
  KeyRound,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/error-pages.css';

export function ForbiddenPage({ standalone = false }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const isStandaloneMode = standalone || !isAuthenticated;

  return (
    <div className={`error-page-container ${isStandaloneMode ? 'standalone' : ''}`}>
      <div className="error-card">
        {/* Brand Header for Standalone Mode */}
        {isStandaloneMode && (
          <div className="error-brand-logo">
            <img src="/logo.png" alt="VioTrack Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span>VioTrack System</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="error-badge badge-403">
          <ShieldAlert size={13} />
          <span>Error 403 • Access Restricted</span>
        </div>

        {/* High-Fidelity Icon Graphic */}
        <div className="error-icon-wrapper icon-403">
          <Lock size={44} strokeWidth={1.75} />
          <div className="error-icon-badge">
            <KeyRound size={14} color="#e11d48" strokeWidth={2.2} />
          </div>
        </div>

        {/* Big Code & Heading */}
        <h1 className="error-big-code code-403">403</h1>
        <h2 className="error-title">Access Forbidden</h2>
        <p className="error-description">
          You do not have sufficient permissions to view or configure this administrative area. Your account is logged in as <strong>{user?.role ? user.role.toUpperCase() : 'STANDARD USER'}</strong>.
        </p>

        {/* Primary Actions */}
        <div className="error-actions">
          <button 
            type="button"
            className="error-btn-secondary" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={15} />
            <span>Go Back</span>
          </button>
          
          <Link 
            to={isAuthenticated ? "/" : "/login"} 
            className="error-btn-primary"
          >
            <Home size={15} />
            <span>{isAuthenticated ? "Back to Dashboard" : "Return to Login"}</span>
          </Link>
        </div>

        {/* Support Help Contact */}
        <div className="error-quick-links">
          <div className="error-quick-title">
            <UserX size={12} />
            <span>Need Higher Privileges?</span>
          </div>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
            Please coordinate with your school administrator or head of discipline to update your account role permissions.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForbiddenPage;
