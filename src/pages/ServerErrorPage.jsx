import React from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  ServerCrash,
  ZapOff
} from 'lucide-react';
import '../css/error-pages.css';

export function ServerErrorPage({ error, errorInfo, resetError, isChunkError: isChunkErrorProp = false, standalone = false }) {
  const isChunkError = isChunkErrorProp || Boolean(
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Importing a module script failed') ||
    error?.message?.includes('error loading dynamically imported module') ||
    error?.message?.includes('MIME type') ||
    error?.name === 'ChunkLoadError'
  );

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
    // Hard refresh to bypass stale cache
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
        <div 
          className="error-badge badge-500"
          style={isChunkError ? { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' } : undefined}
        >
          {isChunkError ? <RefreshCw size={13} /> : <AlertTriangle size={13} />}
          <span>{isChunkError ? 'System Update • New Version' : 'Error 500 • Server Error'}</span>
        </div>

        {/* Icon Graphic */}
        <div 
          className="error-icon-wrapper icon-500"
          style={isChunkError ? { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderColor: 'rgba(59, 130, 246, 0.2)' } : undefined}
        >
          {isChunkError ? (
            <RefreshCw size={40} strokeWidth={1.75} />
          ) : (
            <>
              <ServerCrash size={40} strokeWidth={1.75} />
              <div className="error-icon-badge">
                <ZapOff size={13} color="#d97706" strokeWidth={2.2} />
              </div>
            </>
          )}
        </div>

        {/* Big Code & Heading */}
        <h1 
          className="error-big-code code-500"
          style={isChunkError ? { color: '#3b82f6' } : undefined}
        >
          {isChunkError ? 'NEW' : '500'}
        </h1>
        <h2 className="error-title">
          {isChunkError ? 'Application Updated' : 'Something went wrong'}
        </h2>
        <p className="error-description">
          {isChunkError
            ? 'A new version of VioTrack has been deployed. Please reload the page to load the latest features and ensure smooth performance.'
            : 'An unexpected error occurred while processing your request. Please try reloading the page or returning to the dashboard.'}
        </p>

        {/* Primary Action Buttons */}
        <div className="error-actions" style={{ marginBottom: 0 }}>
          <button 
            type="button"
            className="error-btn-primary" 
            onClick={handleReload}
          >
            <RefreshCw size={14} />
            <span>{isChunkError ? 'Update & Reload App' : 'Reload Page'}</span>
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
