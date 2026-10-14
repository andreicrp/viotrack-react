import React from 'react';
import { QrCode, AlertTriangle } from 'lucide-react';

export const ScanProcessingModal = ({
  isProcessingScan,
  scanProcessingStep,
  scanProcessingSubstep,
  scanProgressPercent,
  onDismissError
}) => {
  if (!isProcessingScan) return null;

  const isInvalid = scanProcessingStep.includes('Invalid');

  return (
    <div
      className="student-scan-modal-overlay"
      onClick={() => {
        if (isInvalid) {
          onDismissError();
        }
      }}
    >
      <div
        className="student-scan-modal-dialog"
        style={{ maxWidth: '420px', textAlign: 'center', padding: '28px 24px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="scan-processing-state" style={{ margin: 0, padding: 0, gap: '14px' }}>
          {/* Matrix Scanner Hub */}
          <div className="scan-matrix-hub-wrapper">
            <div className={`scan-matrix-pulse ring-1 ${isInvalid ? 'error-pulse' : ''}`} />
            <div className={`scan-matrix-pulse ring-2 ${isInvalid ? 'error-pulse' : ''}`} />
            <div
              className="scan-matrix-hub"
              style={isInvalid ? { borderColor: '#ef4444', background: '#fef2f2' } : {}}
            >
              {isInvalid ? (
                <AlertTriangle size={34} color="#dc2626" />
              ) : (
                <QrCode size={34} className="scan-matrix-icon" />
              )}
              {!isInvalid && <div className="scan-matrix-laser" />}
              <div
                className="scan-matrix-corner top-left"
                style={isInvalid ? { borderColor: '#ef4444' } : {}}
              />
              <div
                className="scan-matrix-corner top-right"
                style={isInvalid ? { borderColor: '#ef4444' } : {}}
              />
              <div
                className="scan-matrix-corner bottom-left"
                style={isInvalid ? { borderColor: '#ef4444' } : {}}
              />
              <div
                className="scan-matrix-corner bottom-right"
                style={isInvalid ? { borderColor: '#ef4444' } : {}}
              />
            </div>
          </div>

          {/* Title & Substep */}
          <div className="scan-processing-header">
            <h3
              className="processing-title"
              style={isInvalid ? { color: '#dc2626' } : {}}
            >
              {isInvalid ? 'Unrecognized QR Code' : 'Scanning & Verifying'}
            </h3>
            <p
              className="processing-substep-text"
              style={isInvalid ? { color: '#ef4444' } : {}}
            >
              {scanProcessingSubstep || 'Optical code captured from device'}
            </p>
          </div>

          {/* Dynamic Status Pill */}
          <div
            className="processing-step-pill"
            style={isInvalid ? { background: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' } : {}}
          >
            <span
              className="processing-live-dot"
              style={isInvalid ? { background: '#ef4444', boxShadow: '0 0 8px #ef4444' } : {}}
            />
            <span className="processing-step-label">
              {scanProcessingStep || 'Scanning visual QR matrix...'}
            </span>
          </div>

          {/* 3-Stage Pipeline Indicator */}
          <div className="scan-pipeline-steps">
            <div
              className={`pipeline-step ${scanProgressPercent >= 25 ? 'active' : ''} ${scanProgressPercent > 25 && !isInvalid ? 'completed' : ''}`}
            >
              <div className="pipeline-dot" style={isInvalid ? { background: '#ef4444' } : {}} />
              <span>Scan Matrix</span>
            </div>
            <div className="pipeline-connector" />
            <div
              className={`pipeline-step ${scanProgressPercent >= 70 ? 'active' : ''} ${scanProgressPercent > 70 && !isInvalid ? 'completed' : ''}`}
            >
              <div className="pipeline-dot" style={isInvalid ? { background: '#ef4444' } : {}} />
              <span>Database Match</span>
            </div>
            <div className="pipeline-connector" />
            <div
              className={`pipeline-step ${scanProgressPercent >= 100 ? (isInvalid ? 'active error' : 'active completed') : ''}`}
            >
              <div className="pipeline-dot" style={isInvalid ? { background: '#ef4444' } : {}} />
              <span>{isInvalid ? 'Rejected' : 'Finalize'}</span>
            </div>
          </div>

          {/* Dynamic Progress Bar */}
          <div className="scan-progress-wrapper">
            <div className="scan-progress-bar-container">
              <div
                className="scan-progress-bar-fill"
                style={{
                  width: `${scanProgressPercent}%`,
                  background: isInvalid ? '#ef4444' : undefined
                }}
              >
                {!isInvalid && <div className="scan-progress-shimmer" />}
              </div>
            </div>
            <div className="scan-progress-meta">
              <span
                className="scan-progress-status-label"
                style={isInvalid ? { color: '#ef4444' } : {}}
              >
                {isInvalid
                  ? 'Validation Failed'
                  : scanProgressPercent >= 100
                  ? 'Verification Complete'
                  : 'Decrypting Payload'}
              </span>
              <span className="scan-progress-percentage">{scanProgressPercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
