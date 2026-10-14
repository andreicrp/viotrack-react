import React from 'react';
import {
  FlipHorizontal,
  RefreshCw,
  Play,
  Pause,
  Upload,
  Loader2
} from 'lucide-react';

export const ScannerControlsBar = ({
  isFrontCamera,
  isScanningPaused,
  isProcessingScan,
  onToggleMirror,
  onToggleCameraFacing,
  onTogglePause,
  onTriggerFileUpload,
  fileInputRef,
  onFileUpload
}) => {
  return (
    <div className="scanner-controls-bar">
      <button
        type="button"
        className={`scan-ctrl-btn ${isFrontCamera ? 'active' : ''}`}
        onClick={onToggleMirror}
        title={isFrontCamera ? 'Mirroring is ON (Selfie Mode) - Click to unmirror' : 'Mirroring is OFF - Click to mirror'}
      >
        <FlipHorizontal size={14} />
        <span>{isFrontCamera ? 'Mirrored' : 'Mirror'}</span>
      </button>

      <button
        type="button"
        className="scan-ctrl-btn"
        onClick={onToggleCameraFacing}
        title="Switch between front and rear cameras"
      >
        <RefreshCw size={14} />
        <span>Switch Cam</span>
      </button>

      <button
        type="button"
        className={`scan-ctrl-btn ${isScanningPaused ? 'active' : ''}`}
        onClick={onTogglePause}
        title={isScanningPaused ? 'Resume live scanner' : 'Pause live scanner'}
      >
        {isScanningPaused ? <Play size={14} /> : <Pause size={14} />}
        <span>{isScanningPaused ? 'Resume' : 'Pause'}</span>
      </button>

      <button
        type="button"
        className={`scan-ctrl-btn ${isProcessingScan ? 'active' : ''}`}
        onClick={() => !isProcessingScan && onTriggerFileUpload()}
        title="Upload an image file containing a student QR code"
        disabled={isProcessingScan}
      >
        {isProcessingScan ? (
          <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
        ) : (
          <Upload size={14} />
        )}
        <span>{isProcessingScan ? 'Processing Image...' : 'Scan Image'}</span>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={onFileUpload}
      />
    </div>
  );
};
