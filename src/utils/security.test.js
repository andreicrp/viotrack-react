import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeCsvCell,
  sanitizeText,
  evaluatePasswordStrength,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  maskEmail
} from './security';

// Mock localStorage if in node environment
if (typeof globalThis.localStorage === 'undefined') {
  let store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

describe('Security & Data Protection Test Bench', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  describe('CSV Injection Defense', () => {
    it('neutralizes malicious formula injection prefixes (=, +, -, @, \\t, \\r)', () => {
      expect(sanitizeCsvCell('=cmd|"/c calc"!A0')).toMatch(/^'/);
      expect(sanitizeCsvCell('+1+2')).toMatch(/^'/);
      expect(sanitizeCsvCell('-5+10')).toMatch(/^'/);
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toMatch(/^'/);
      expect(sanitizeCsvCell('\tmalicious')).toMatch(/^'/);
      expect(sanitizeCsvCell('\rmalicious')).toMatch(/^'/);
    });

    it('preserves clean numeric and text data without mutation', () => {
      expect(sanitizeCsvCell('Juan Dela Cruz')).toBe('Juan Dela Cruz');
      expect(sanitizeCsvCell(100)).toBe('100');
      expect(sanitizeCsvCell('')).toBe('');
      expect(sanitizeCsvCell(null)).toBe('');
    });
  });

  describe('Email Masking & Privacy', () => {
    it('masks email addresses according to privacy guidelines', () => {
      expect(maskEmail('admin@viotrack.edu')).toBe('a***n@viotrack.edu');
      expect(maskEmail('john@domain.com')).toBe('j***n@domain.com');
      expect(maskEmail('j@domain.com')).toBe('*@domain.com');
      expect(maskEmail('')).toBe('');
    });
  });

  describe('Password Strength Evaluator', () => {
    it('grades strong passwords with full score', () => {
      const evaluation = evaluatePasswordStrength('VioTrack@2026!Secure');
      expect(evaluation.valid).toBe(true);
      expect(evaluation.score).toBeGreaterThanOrEqual(4);
    });

    it('rejects short or weak passwords', () => {
      const evaluation = evaluatePasswordStrength('pass');
      expect(evaluation.valid).toBe(false);
      expect(evaluation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Rate Limiting', () => {
    it('allows attempts within threshold and locks out on excess failed attempts', () => {
      const key = 'test_action';
      clearRateLimit(key);

      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(key, 5, 10);
      }

      const status = checkRateLimit(key, 5, 60);
      expect(status.allowed).toBe(false);
      expect(status.lockoutSeconds).toBeGreaterThan(0);
    });
  });
});
