import { useState, useRef, useEffect, useCallback } from 'react';
import {
  playSuccessChime,
  playErrorBuzz,
  getFeedbackSettings,
  saveFeedbackSettings
} from '../utils/scannerFeedback';

export const useScannerFeedback = () => {
  const [feedbackConfig, setFeedbackConfig] = useState(getFeedbackSettings);
  const [isFeedbackMenuOpen, setIsFeedbackMenuOpen] = useState(false);
  const feedbackMenuRef = useRef(null);

  // Close feedback dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (feedbackMenuRef.current && !feedbackMenuRef.current.contains(e.target)) {
        setIsFeedbackMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateFeedback = useCallback((updates) => {
    setFeedbackConfig((prev) => {
      const next = { ...prev, ...updates };
      saveFeedbackSettings(next);
      return next;
    });
  }, []);

  // Play high chime & haptic feedback when QR is scanned successfully
  const playScanSuccessSound = useCallback(() => {
    playSuccessChime(feedbackConfig.volume);
  }, [feedbackConfig.volume]);

  // Play double buzz & heavy haptic feedback when QR scan fails / is invalid
  const playScanErrorSound = useCallback(() => {
    playErrorBuzz(feedbackConfig.volume);
  }, [feedbackConfig.volume]);

  return {
    feedbackConfig,
    isFeedbackMenuOpen,
    setIsFeedbackMenuOpen,
    feedbackMenuRef,
    handleUpdateFeedback,
    playScanSuccessSound,
    playScanErrorSound
  };
};
