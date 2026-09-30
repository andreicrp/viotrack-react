import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Compass, 
  ArrowLeft, 
  Home, 
  Search, 
  ShieldAlert, 
  GraduationCap, 
  QrCode,
  SearchX,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import '../css/error-pages.css';

export function NotFoundPage({ standalone = false }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
        <div className="error-badge badge-404">
          <Compass size={13} />
          <span>Error 404 • Page Not Found</span>
        </div>

        {/* High-Fidelity Icon Graphic */}
        <div className="error-icon-wrapper icon-404">
          <SearchX size={44} strokeWidth={1.75} />
          <div className="error-icon-badge">
            <HelpCircle size={15} color="#1d4ed8" strokeWidth={2.2} />
          </div>
        </div>

        {/* Big Code & Heading */}
        <h1 className="error-big-code code-404">404</h1>
        <h2 className="error-title">Looking for something?</h2>
        <p className="error-description">
          We couldn't locate the page or record you requested. The URL may be mistyped, expired, or the resource has moved to a new address.
        </p>

        {/* Primary Action Buttons */}
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

        {/* Suggested Section Chips */}
        {isAuthenticated && (
          <div className="error-quick-links">
            <div className="error-quick-title">
              <Search size={12} />
              <span>Suggested Navigation</span>
            </div>
            <div className="error-links-grid">
              <Link to="/violations" className="error-link-chip">
                <ShieldAlert size={14} color="#dc2626" />
                <span>Violations</span>
              </Link>
              <Link to="/students" className="error-link-chip">
                <GraduationCap size={14} color="#07345f" />
                <span>Students</span>
              </Link>
              <Link to="/scan-qr" className="error-link-chip">
                <QrCode size={14} color="#16a34a" />
                <span>QR Scanner</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NotFoundPage;
