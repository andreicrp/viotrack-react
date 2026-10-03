/**
 * VioTrack Comprehensive Security & Cryptographic Validation Utilities
 * Aligned with OWASP Top 10, NIST Guidelines & Philippine Data Privacy Act (RA 10173)
 */

// ==============================================================================
// 1. DATA PRIVACY & ACCESS CONTROL MATRIX (RA 10173 COMPLIANCE)
// ==============================================================================

export const DATA_PRIVACY_POLICY = {
  jurisdiction: 'Republic Act No. 10173 (Philippine Data Privacy Act of 2012)',
  dataController: 'VioTrack Academic Disciplinary Board',
  defaultRetentionPeriodDays: 365 * 5, // 5 Years after student graduation/departure
  fields: {
    studentNames: {
      type: 'Personal Information',
      viewAccess: ['admin', 'teacher'],
      modifyAccess: ['admin'],
      exportAccess: ['admin'],
      retention: '5 Years post-graduation',
      protection: 'Role-scoping & encrypted in transit'
    },
    studentIdsAndLrn: {
      type: 'Sensitive Personal Information',
      viewAccess: ['admin', 'teacher'],
      modifyAccess: ['admin'],
      exportAccess: ['admin'],
      retention: '5 Years post-graduation',
      protection: 'Strict unique indexing & masked in public displays'
    },
    violationRecords: {
      type: 'Sensitive Disciplinary Record',
      viewAccess: ['admin', 'teacher (assigned section only)'],
      modifyAccess: ['admin', 'teacher (assigned section only)'],
      exportAccess: ['admin'],
      retention: '5 Years or until resolution acquittal',
      protection: 'Row Level Security & append-only audit trail'
    },
    guardianInfo: {
      type: 'Personal Information',
      viewAccess: ['admin', 'teacher'],
      modifyAccess: ['admin'],
      exportAccess: ['admin'],
      retention: '5 Years post-graduation',
      protection: 'Access restricted to active class advisers'
    },
    contactNumbers: {
      type: 'Direct Contact Identifiers',
      viewAccess: ['admin', 'teacher'],
      modifyAccess: ['admin'],
      exportAccess: ['admin'],
      retention: '5 Years',
      protection: 'Masked on general screens (e.g., 0915****567)'
    },
    uploadedEvidence: {
      type: 'Sensitive Proof & Incident Media',
      viewAccess: ['admin', 'reporting teacher'],
      modifyAccess: ['admin'],
      exportAccess: ['admin'],
      retention: '2 Years post incident resolution',
      protection: 'Private storage bucket with time-limited signed URLs (5 mins)'
    },
    locationGpsInfo: {
      type: 'Telemetry & Geolocation Data',
      viewAccess: ['admin', 'reporting teacher'],
      modifyAccess: ['admin'],
      exportAccess: ['admin'],
      retention: '1 Year',
      protection: 'Encrypted coordinates attached to incident records'
    },
    auditHistory: {
      type: 'System Compliance Logs',
      viewAccess: ['admin'],
      modifyAccess: ['None (Append-Only)'],
      exportAccess: ['admin'],
      retention: '7 Years (Statutory Requirement)',
      protection: 'Immutable database records with tamper-proof triggers'
    }
  }
};

// ==========================================
// 2. PASSWORD POLICY & STRENGTH VALIDATION
// ==========================================

export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 64,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecial: true,
  specialCharsRegex: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/,
};

/**
 * Evaluates password strength and returns score (0-4) and actionable feedback
 */
export const evaluatePasswordStrength = (password = '') => {
  if (!password) {
    return { score: 0, level: 'Too Weak', valid: false, errors: ['Password is required'] };
  }

  const errors = [];
  let score = 0;

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`At least ${PASSWORD_POLICY.minLength} characters`);
  } else {
    score += 1;
  }

  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('At least one lowercase letter (a-z)');
  } else if (/[a-z]/.test(password)) {
    score += 0.75;
  }

  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('At least one uppercase letter (A-Z)');
  } else if (/[A-Z]/.test(password)) {
    score += 0.75;
  }

  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('At least one numeric digit (0-9)');
  } else if (/\d/.test(password)) {
    score += 0.75;
  }

  if (PASSWORD_POLICY.requireSpecial && !PASSWORD_POLICY.specialCharsRegex.test(password)) {
    errors.push('At least one special character (!@#$%^&*...)');
  } else if (PASSWORD_POLICY.specialCharsRegex.test(password)) {
    score += 0.75;
  }

  // Bonus for length
  if (password.length >= 12) score += 0.5;
  if (password.length >= 16) score += 0.5;

  const normalizedScore = Math.min(4, Math.floor(score));
  
  const levels = ['Too Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];

  return {
    score: normalizedScore,
    level: levels[normalizedScore],
    color: colors[normalizedScore],
    valid: errors.length === 0,
    errors
  };
};

// ==========================================
// 3. RATE LIMITING & PROGRESSIVE DELAYS
// ==========================================

const RATE_LIMIT_PREFIX = 'viotrack_rl_';

/**
 * Checks and updates rate limits for specific action keys (e.g. login, password-reset)
 */
export const checkRateLimit = (actionKey = 'login', maxAttempts = 5, windowSeconds = 60) => {
  const storageKey = `${RATE_LIMIT_PREFIX}${actionKey}`;
  const now = Date.now();
  
  let record = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) record = JSON.parse(raw);
  } catch (e) {
    record = null;
  }

  if (!record || now > record.resetAt) {
    record = {
      attempts: 0,
      firstAttempt: now,
      resetAt: now + windowSeconds * 1000,
      lockoutUntil: 0
    };
  }

  // Check if currently locked out
  if (record.lockoutUntil && now < record.lockoutUntil) {
    const waitSec = Math.ceil((record.lockoutUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutSeconds: waitSec,
      waitMessage: `Too many failed attempts. Please wait ${waitSec}s before trying again.`
    };
  }

  const remaining = Math.max(0, maxAttempts - record.attempts);
  return {
    allowed: record.attempts < maxAttempts,
    remainingAttempts: remaining,
    lockoutSeconds: 0,
    waitMessage: ''
  };
};

/**
 * Records a failed attempt with progressive lockout backoff
 */
export const recordFailedAttempt = (actionKey = 'login', maxAttempts = 5, baseLockoutSeconds = 30) => {
  const storageKey = `${RATE_LIMIT_PREFIX}${actionKey}`;
  const now = Date.now();
  
  let record = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) record = JSON.parse(raw);
  } catch (e) {
    record = null;
  }

  if (!record || now > record.resetAt) {
    record = {
      attempts: 0,
      firstAttempt: now,
      resetAt: now + 300 * 1000, // 5 min rolling window
      lockoutUntil: 0,
      penaltyMultiplier: 1
    };
  }

  record.attempts += 1;

  if (record.attempts >= maxAttempts) {
    const multiplier = Math.min(8, Math.pow(2, record.attempts - maxAttempts));
    const lockoutSec = Math.min(600, baseLockoutSeconds * multiplier);
    record.lockoutUntil = now + lockoutSec * 1000;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(record));
  } catch (e) {
    // Ignore storage quota errors
  }

  return checkRateLimit(actionKey, maxAttempts);
};

/**
 * Resets rate limit on successful authentication/action
 */
export const clearRateLimit = (actionKey = 'login') => {
  try {
    localStorage.removeItem(`${RATE_LIMIT_PREFIX}${actionKey}`);
  } catch (e) {
    // Ignore
  }
};

// ==========================================
// 4. INPUT SANITIZATION & XSS MITIGATION
// ==========================================

export const escapeHtml = (str = '') => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const sanitizeText = (input = '') => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\S+/gi, '')
    .trim();
};

export const sanitizeCsvCell = (value = '') => {
  if (value === null || value === undefined) return '';
  const str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
};

// ==========================================
// 5. FILE UPLOAD & EVIDENCE SECURITY
// ==========================================

export const FILE_UPLOAD_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB max
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  allowedDocTypes: ['application/pdf', 'text/csv', 'application/vnd.ms-excel'],
  blockedExtensions: ['.exe', '.bat', '.sh', '.php', '.jsp', '.asp', '.js', '.vbs', '.html', '.svg', '.cmd']
};

export const validateUploadedFile = (file, options = { isImageOnly: true }) => {
  if (!file) return { valid: false, error: 'No file provided.' };

  if (file.size > FILE_UPLOAD_CONFIG.maxSizeBytes) {
    return { valid: false, error: `File size exceeds max limit of 5MB (size: ${(file.size / 1024 / 1024).toFixed(2)}MB).` };
  }

  const lowerName = file.name.toLowerCase();
  const hasBlockedExt = FILE_UPLOAD_CONFIG.blockedExtensions.some(ext => lowerName.endsWith(ext));
  if (hasBlockedExt) {
    return { valid: false, error: 'Executable or dangerous file formats are strictly prohibited.' };
  }

  const allowedMimes = options.isImageOnly 
    ? FILE_UPLOAD_CONFIG.allowedImageTypes 
    : [...FILE_UPLOAD_CONFIG.allowedImageTypes, ...FILE_UPLOAD_CONFIG.allowedDocTypes];

  if (!allowedMimes.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type || 'unknown'}. Allowed: ${allowedMimes.join(', ')}` };
  }

  return { valid: true };
};

export const sanitizeFileName = (fileName = '') => {
  // Strip directory paths and traversal dots
  const baseName = String(fileName || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.{2,}/g, '_');
  const clean = baseName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}_${random}_${clean}`;
};

// ==========================================
// 6. PRIVACY & SENSITIVE DATA MASKING (RA 10173)
// ==========================================

export const maskPhoneNumber = (phone = '') => {
  if (!phone || typeof phone !== 'string') return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length <= 6) return '****';
  return `${clean.slice(0, 4)}****${clean.slice(-3)}`;
};

export const maskEmail = (email = '') => {
  if (!email || !email.includes('@')) return '***@***';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `*@${domain}`;
  return `${local[0]}***${local.slice(-1)}@${domain}`;
};

export const sanitizeForLogging = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['password', 'token', 'access_token', 'refresh_token', 'secret', 'apiKey', 'anonKey'];
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }
  return sanitized;
};
