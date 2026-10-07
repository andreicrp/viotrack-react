/**
 * VioTrack QR Scanner Audio & Haptic Feedback Engine
 * High-performance, low-latency audio synthesizers with Web Audio API + Audio Files + Mobile Vibration API
 */

const STORAGE_KEYS = {
  SOUND_ENABLED: 'viotrack_scanner_sound_enabled',
  HAPTIC_ENABLED: 'viotrack_scanner_haptic_enabled',
  VOLUME: 'viotrack_scanner_volume'
};

// Default Settings
export const getFeedbackSettings = () => {
  try {
    const sound = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    const haptic = localStorage.getItem(STORAGE_KEYS.HAPTIC_ENABLED);
    const volume = localStorage.getItem(STORAGE_KEYS.VOLUME);

    return {
      soundEnabled: sound !== null ? sound === 'true' : true,
      hapticEnabled: haptic !== null ? haptic === 'true' : true,
      volume: volume !== null ? parseFloat(volume) : 0.85
    };
  } catch {
    return {
      soundEnabled: true,
      hapticEnabled: true,
      volume: 0.85
    };
  }
};

export const saveFeedbackSettings = (settings) => {
  try {
    if (settings.soundEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(settings.soundEnabled));
    }
    if (settings.hapticEnabled !== undefined) {
      localStorage.setItem(STORAGE_KEYS.HAPTIC_ENABLED, String(settings.hapticEnabled));
    }
    if (settings.volume !== undefined) {
      localStorage.setItem(STORAGE_KEYS.VOLUME, String(settings.volume));
    }
  } catch (e) {
    console.warn('Unable to save feedback settings to localStorage:', e);
  }
};

/**
 * Triggers mobile haptic vibration feedback
 * @param {'success' | 'error' | 'tampered'} type
 */
export const triggerHapticFeedback = (type = 'success') => {
  const settings = getFeedbackSettings();
  if (!settings.hapticEnabled) return;

  try {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      if (type === 'success') {
        // Crisp, pleasant double tap for authentic scan
        navigator.vibrate([35, 40, 45]);
      } else if (type === 'error' || type === 'tampered') {
        // Heavy, distinct double buzz for invalid/tampered QR
        navigator.vibrate([130, 70, 180]);
      }
    }
  } catch {}
};

/**
 * Synthesizes a high-fidelity crisp ascending chime for authentic verified student badges
 * @param {number} [customVolume]
 */
export const playSuccessChime = (customVolume) => {
  const settings = getFeedbackSettings();
  if (!settings.soundEnabled) return;

  const vol = customVolume !== undefined ? customVolume : settings.volume;

  // 1. First attempt synthesized dual-harmonic high chime
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;

      // Note 1: E6 (1318.51 Hz) -> Note 2: B6 (1975.53 Hz)
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(1046.50, now); // C6
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
      osc1.frequency.exponentialRampToValueAtTime(1975.53, now + 0.16); // B6

      osc2.frequency.setValueAtTime(1318.51, now);
      osc2.frequency.exponentialRampToValueAtTime(2093.00, now + 0.16); // C7

      gainNode.gain.setValueAtTime(vol * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);

      triggerHapticFeedback('success');
      return;
    }
  } catch (e) {
    // Fallback to standard audio element if Web Audio is blocked
  }

  // Fallback to HTML Audio
  try {
    const audio = new Audio('/sound_effects/success.mp3');
    audio.volume = Math.max(0.1, Math.min(1, vol));
    audio.play().catch(() => {});
    triggerHapticFeedback('success');
  } catch {}
};

/**
 * Synthesizes a distinct double buzz for invalid or tampered QR codes
 * @param {number} [customVolume]
 */
export const playErrorBuzz = (customVolume) => {
  const settings = getFeedbackSettings();
  if (!settings.soundEnabled) return;

  const vol = customVolume !== undefined ? customVolume : settings.volume;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const now = audioCtx.currentTime;

      // Pulse 1: Low sawtooth buzz (220 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(220, now);
      osc1.frequency.exponentialRampToValueAtTime(160, now + 0.12);

      gain1.gain.setValueAtTime(vol * 0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.12);

      // Pulse 2: Second lower buzz after 140ms gap (180 Hz -> 130 Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();

      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(190, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(130, now + 0.28);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(vol * 0.45, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc2.start(now + 0.14);
      osc2.stop(now + 0.32);

      triggerHapticFeedback('error');
      return;
    }
  } catch (e) {
    // Fallback to HTML Audio
  }

  // Fallback to HTML Audio
  try {
    const audio = new Audio('/sound_effects/error.mp3');
    audio.volume = Math.max(0.1, Math.min(1, vol));
    audio.play().catch(() => {});
    triggerHapticFeedback('error');
  } catch {}
};
