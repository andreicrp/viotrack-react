import React from 'react';
import {
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import {
  playSuccessChime,
  playErrorBuzz,
  triggerHapticFeedback
} from '../../utils/scannerFeedback';

export const ScannerFeedbackMenu = ({
  feedbackConfig,
  isFeedbackMenuOpen,
  setIsFeedbackMenuOpen,
  feedbackMenuRef,
  onUpdateFeedback
}) => {
  return (
    <div className="custom-feedback-dropdown-container" ref={feedbackMenuRef} style={{ position: 'relative' }}>
      <button
        type="button"
        className={`feedback-settings-trigger ${isFeedbackMenuOpen ? 'active' : ''} ${!feedbackConfig.soundEnabled && !feedbackConfig.hapticEnabled ? 'muted' : ''}`}
        onClick={() => setIsFeedbackMenuOpen(prev => !prev)}
        title="Audio & Haptic Feedback Settings"
        aria-label="Audio & Haptic Feedback Settings"
      >
        {feedbackConfig.soundEnabled ? (
          <Volume2 size={15} color="#07345f" />
        ) : (
          <VolumeX size={15} color="#94a3b8" />
        )}
        <span className="feedback-trigger-label">Feedback</span>
        {feedbackConfig.hapticEnabled && (
          <span className="haptic-dot-indicator" title="Vibration Enabled" />
        )}
      </button>

      {isFeedbackMenuOpen && (
        <div className="feedback-settings-popover" role="dialog">
          <div className="feedback-popover-header">
            <span className="feedback-popover-title">Scanner Feedback</span>
            <span className="feedback-popover-tag">Audio &amp; Haptics</span>
          </div>

          <div className="feedback-popover-body">
            {/* Audio Chimes Toggle */}
            <div className="feedback-toggle-row">
              <div className="feedback-toggle-info">
                <div className="feedback-toggle-title">
                  <Volume2 size={14} /> Sound Chimes
                </div>
                <span className="feedback-toggle-desc">High Chime / Double Buzz</span>
              </div>
              <label className="feedback-switch">
                <input
                  type="checkbox"
                  checked={feedbackConfig.soundEnabled}
                  onChange={(e) => onUpdateFeedback({ soundEnabled: e.target.checked })}
                />
                <span className="feedback-slider" />
              </label>
            </div>

            {/* Volume Slider */}
            {feedbackConfig.soundEnabled && (
              <div className="feedback-volume-row">
                <div className="feedback-volume-labels">
                  <span className="feedback-volume-title">Volume Level</span>
                  <span className="feedback-volume-value">{Math.round(feedbackConfig.volume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={feedbackConfig.volume}
                  onChange={(e) => onUpdateFeedback({ volume: parseFloat(e.target.value) })}
                  className="feedback-volume-range"
                />
              </div>
            )}

            {/* Haptic Vibration Toggle */}
            <div className="feedback-toggle-row">
              <div className="feedback-toggle-info">
                <div className="feedback-toggle-title">
                  <Vibrate size={14} /> Vibration / Haptics
                </div>
                <span className="feedback-toggle-desc">Tactile mobile buzz</span>
              </div>
              <label className="feedback-switch">
                <input
                  type="checkbox"
                  checked={feedbackConfig.hapticEnabled}
                  onChange={(e) => onUpdateFeedback({ hapticEnabled: e.target.checked })}
                />
                <span className="feedback-slider" />
              </label>
            </div>

            {/* Live Audio Test Buttons */}
            <div className="feedback-test-actions">
              <span className="feedback-test-heading">Test Feedback Profiles</span>
              <div className="feedback-test-buttons-grid">
                <button
                  type="button"
                  className="feedback-test-btn success"
                  onClick={() => {
                    playSuccessChime(feedbackConfig.volume);
                    triggerHapticFeedback('success');
                  }}
                  title="Test Authentic Student High Chime"
                >
                  <Sparkles size={13} /> High Chime (Success)
                </button>
                <button
                  type="button"
                  className="feedback-test-btn error"
                  onClick={() => {
                    playErrorBuzz(feedbackConfig.volume);
                    triggerHapticFeedback('error');
                  }}
                  title="Test Invalid / Tampered QR Buzz"
                >
                  <AlertTriangle size={13} /> Double Buzz (Invalid)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
