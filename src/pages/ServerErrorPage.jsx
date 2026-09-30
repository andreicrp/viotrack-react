import React, { useState } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Code, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check,
  ServerCrash,
  ZapOff
} from 'lucide-react';
import '../css/error-pages.css';

export function ServerErrorPage({ error, errorInfo, resetError, standalone = false }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  // Safe navigation fallback whether inside or outside React Router
  const handleGoHome = (e) => {
    e?.preventDefault();
    if (resetError) {
      resetError();
    }
    window.location.href = '/';
  };

  const handleCopyStack = () => {
    const errorText = `${error?.toString() || 'Unknown Error'}\n\nComponent Stack:\n${errorInfo?.componentStack || 'No stack trace available'}`;
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = () => {
    if (resetError) {
      resetError();
    }
    window.location.reload();
  };

  return (
    <div className={`error-page-container ${standalone ? 'standalone' : ''}`}>
      <div className="error-card" style={{ maxWidth: '600px' }}>
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
          <span>Error 500 • Internal System Error</span>
        </div>

        {/* High-Fidelity Icon Graphic */}
        <div className="error-icon-wrapper icon-500">
          <ServerCrash size={44} strokeWidth={1.75} />
          <div className="error-icon-badge">
            <ZapOff size={14} color="#d97706" strokeWidth={2.2} />
          </div>
        </div>

        {/* Big Code & Heading */}
        <h1 className="error-big-code code-500">500</h1>
        <h2 className="error-title">Something went wrong</h2>
        <p className="error-description">
          An unexpected application runtime error occurred. Our error boundary has intercepted the issue to safeguard system data.
        </p>

        {/* Primary Action Buttons */}
        <div className="error-actions">
          <button 
            type="button"
            className="error-btn-secondary" 
            onClick={handleReload}
          >
            <RefreshCw size={14} />
            <span>Reload Application</span>
          </button>
          
          <button 
            type="button"
            onClick={handleGoHome}
            className="error-btn-primary"
          >
            <Home size={14} />
            <span>Return to Safety</span>
          </button>
        </div>

        {/* Collapsible Technical Error Details */}
        {(error || errorInfo) && (
          <div className="error-tech-details">
            <div 
              className="error-details-summary"
              onClick={() => setShowDetails(!showDetails)}
            >
              <Code size={13} />
              <span>Technical Diagnostic Details</span>
              {showDetails ? <ChevronUp size={13} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={13} style={{ marginLeft: 'auto' }} />}
            </div>

            {showDetails && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <button
                    type="button"
                    onClick={handleCopyStack}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '11px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}
                  >
                    {copied ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy Details'}</span>
                  </button>
                </div>
                <div className="error-stack-box">
                  <strong>{error?.toString()}</strong>
                  {errorInfo?.componentStack && `\n${errorInfo.componentStack}`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ServerErrorPage;
