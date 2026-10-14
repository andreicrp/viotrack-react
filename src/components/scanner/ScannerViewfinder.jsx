import React from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Upload,
  Search,
  Loader2
} from 'lucide-react';

export const ScannerViewfinder = ({
  isFrontCamera,
  cameraError,
  hasCameraPermission,
  isScannerRunning,
  isScanningPaused,
  isStartingCamera,
  cameraStartupStep,
  isRequestingPermission,
  handleRequestCameraAccess,
  handleRetryCamera,
  onTriggerFileUpload,
  onFocusManualInput,
  activeCameraLabel,
  availableCameras = [],
  selectedCameraId,
  onSelectCamera
}) => {
  return (
    <div className={`scanner-viewport-wrapper ${isFrontCamera ? 'is-front-camera' : ''} ${cameraError || (!hasCameraPermission && !isScannerRunning) ? 'camera-error-active' : ''}`}>
      <div id="reader-stream-container" />

      {/* Custom Glowing Reticle HUD (Only when camera is active and running) */}
      {!cameraError && hasCameraPermission && isScannerRunning && (
        <div className="scanner-overlay-reticle">
          <div className="reticle-box">
            <div className="corner-bracket top-left" />
            <div className="corner-bracket top-right" />
            <div className="corner-bracket bottom-left" />
            <div className="corner-bracket bottom-right" />
            {!isScanningPaused && <div className="laser-scan-line" />}
          </div>
        </div>
      )}

      {/* Clean Modern High-Tech Camera Starting-Up Overlay */}
      {hasCameraPermission && isStartingCamera && !cameraError && (
        <div className="camera-starting-overlay">
          <div className="camera-starting-hud-corner top-left" />
          <div className="camera-starting-hud-corner top-right" />
          <div className="camera-starting-hud-corner bottom-left" />
          <div className="camera-starting-hud-corner bottom-right" />

          <div className="camera-starting-card">
            <div className="camera-starting-radar">
              <div className="radar-pulse radar-pulse-1" />
              <div className="radar-pulse radar-pulse-2" />
              <div className="camera-starting-spinner-ring" />
              <div className="camera-starting-icon-wrap">
                <Camera size={24} className="camera-starting-icon" />
              </div>
            </div>

            <div className="camera-starting-info">
              <div className="camera-starting-badge">
                <span className="starting-status-dot" />
                <span>INITIALIZING SENSOR</span>
              </div>
              <h4 className="camera-starting-title">Starting Camera</h4>
              <p className="camera-starting-step">{cameraStartupStep || 'Connecting to video sensor...'}</p>
              <div className="camera-starting-progress-bar">
                <div className="camera-starting-progress-fill" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* One-Time Camera Permission Request Overlay */}
      {!hasCameraPermission && !cameraError && (
        <div className="camera-notice-overlay">
          <div className="camera-notice-card">
            <div className="camera-notice-icon-wrap" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>
              <div className="camera-notice-icon-pulse" style={{ borderColor: 'rgba(37, 99, 235, 0.35)' }} />
              <Camera size={24} className="camera-notice-icon" />
            </div>

            <div className="camera-notice-content">
              <h4 className="camera-notice-title">Camera Access Required</h4>
              <p className="camera-notice-text">
                Allow camera access to scan student ID QR badges quickly for real-time tracking and logging. Authorization is required only once.
              </p>
            </div>

            <div className="camera-notice-actions">
              <button
                type="button"
                onClick={handleRequestCameraAccess}
                className="camera-notice-btn primary"
                disabled={isRequestingPermission}
              >
                {isRequestingPermission ? (
                  <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Camera size={14} />
                )}
                <span>{isRequestingPermission ? 'Requesting Access...' : 'Allow Camera Access'}</span>
              </button>

              <button
                type="button"
                onClick={onTriggerFileUpload}
                className="camera-notice-btn secondary"
              >
                <Upload size={13} />
                <span>Scan Image</span>
              </button>
            </div>

            <button
              type="button"
              className="camera-notice-hint-btn"
              onClick={onFocusManualInput}
            >
              <Search size={12} className="camera-hint-icon" />
              <span>Or enter Student ID / Name in manual search</span>
            </button>
          </div>
        </div>
      )}

      {/* Camera Error / Permission Fallback Overlay */}
      {cameraError && (
        <div className="camera-notice-overlay">
          <div className="camera-notice-card">
            <div className="camera-notice-icon-wrap">
              <div className="camera-notice-icon-pulse" />
              <CameraOff size={24} className="camera-notice-icon" />
            </div>

            <div className="camera-notice-content">
              <h4 className="camera-notice-title">Camera Unavailable</h4>
              <p className="camera-notice-text">
                {cameraError}
              </p>

              {activeCameraLabel && (
                <div className="camera-detected-device-pill">
                  <span className="camera-device-dot-busy" />
                  <span className="camera-device-pill-text">{activeCameraLabel}</span>
                </div>
              )}
            </div>

            {availableCameras.length > 1 && (
              <div className="camera-fallback-devices-wrap">
                <span className="camera-fallback-devices-title">Switch to Detected Camera</span>
                <div className="camera-fallback-chips">
                  {availableCameras.map((cam) => {
                    const isCurrent = cam.id === selectedCameraId;
                    return (
                      <button
                        key={cam.id}
                        type="button"
                        onClick={() => onSelectCamera(cam.id)}
                        className={`camera-fallback-chip ${isCurrent ? 'active' : ''}`}
                        title={`Switch to ${cam.label || 'Camera'}`}
                      >
                        <Camera size={11} />
                        <span>{cam.label || 'Camera'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="camera-notice-actions">
              <button
                type="button"
                onClick={handleRetryCamera}
                className="camera-notice-btn primary"
              >
                <RefreshCw size={13} />
                <span>Retry Camera</span>
              </button>

              <button
                type="button"
                onClick={onTriggerFileUpload}
                className="camera-notice-btn secondary"
              >
                <Upload size={13} />
                <span>Scan Image</span>
              </button>
            </div>

            <button
              type="button"
              className="camera-notice-hint-btn"
              onClick={onFocusManualInput}
            >
              <Search size={12} className="camera-hint-icon" />
              <span>Or enter Student ID / Name in manual search</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
