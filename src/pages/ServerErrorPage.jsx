import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ServerCrash,
  ZapOff
} from 'lucide-react';
import '../css/error-pages.css';

export function ServerErrorPage({ error, errorInfo, resetError, standalone = false }) {
  // Safe navigation fallback whether inside or outside React Router
  const handleGoHome = (e) => {
    e?.preventDefault();
    if (resetError) {
      resetError();
    }
    window.location.href = '/';
  };

  const handleReload = () => {
    if (resetError) {
      resetError();
    }
    window.location.reload();
  };

  return (
    <div className={`error-page-container ${standalone ? 'standalone' : ''}`}>
      <div className="error-card" style={{ maxWidth: '520px' }}>
        {/* Brand Header for Standalone Mode */}
        {standalone && (
          <div className="error-brand-logo">
            <img src="/logo.png" alt="VioTrack Logo" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span>VioTrack System</span>
          </div>
        )}

        {/* Status Badge */}
        <div className="error-badge badge-500">
          <AlertTriangle size={13} />
          <span>System Notice</span>
        </div>

        {/* Icon Graphic */}
        <div className="error-icon-wrapper icon-500">
          <ServerCrash size={40} strokeWidth={1.75} />
          <div className="error-icon-badge">
            <ZapOff size={13} color="#d97706" strokeWidth={2.2} />
          </div>
        </div>

        {/* Big Code & Heading */}
        <h1 className="error-big-code code-500">500</h1>
        <h2 className="error-title">Something went wrong</h2>
        <p className="error-description">
          An unexpected error occurred while processing your request. Please try reloading the page or returning to the dashboard.
        </p>

        {/* Primary Action Buttons */}
        <div className="error-actions" style={{ marginBottom: 0 }}>
          <button 
            type="button"
            className="error-btn-primary" 
            onClick={handleReload}
          >
            <RefreshCw size={14} />
            <span>Reload Page</span>
          </button>
          
          <button 
            type="button"
            onClick={handleGoHome}
            className="error-btn-secondary"
          >
            <Home size={14} />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ServerErrorPage;
