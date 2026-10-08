/**
 * VioTrack QR Code Generation & Scanning Utility
 * Provides clean QR code encoding and decoding that prevents "localhost" URLs from being exposed
 * on Android APKs, local development servers, and external QR scanner apps (Google Lens, iPhone Camera, etc.).
 */

/**
 * Checks if a given URL or origin string points to a local or embedded environment
 * @param {string} urlOrOrigin
 * @returns {boolean}
 */
export const isLocalhost = (urlOrOrigin) => {
  if (!urlOrOrigin) return true;
  const str = String(urlOrOrigin).toLowerCase();
  return (
    str.includes('localhost') ||
    str.includes('127.0.0.1') ||
    str.includes('capacitor://') ||
    str.includes('ionic://') ||
    str.startsWith('file:')
  );
};

/**
 * Returns the public app URL if configured and not pointing to localhost.
 * @returns {string|null}
 */
export const getPublicAppBaseUrl = () => {
  const envUrl = (import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_URL || '').trim();
  if (envUrl && !isLocalhost(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const origin = window.location.origin;
    if (!isLocalhost(origin)) {
      return origin.replace(/\/+$/, '');
    }
  }

  return null;
};

// Institutional secret key for HMAC-SHA256 tamper-proof student QR badges
const INSTITUTIONAL_HMAC_SECRET = (
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_QR_HMAC_SECRET
) || 'VT-SEC-PHCM-2026-DISCIPLINE-HMAC-KEY';

// Legacy salt for backwards compatibility with VT1 format
const LEGACY_QR_SALT = 'VT-SEC-PHCM-2026-DISCIPLINE';

/**
 * Pure JavaScript SHA-256 implementation for synchronous and environment-agnostic execution
 * (Works identically across Web Workers, Android WebView, Node.js Vitest, and Browsers).
 * @param {string} ascii
 * @returns {string} 64-character lowercase hex digest
 */
export const sha256 = (ascii) => {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let currentBlockIndex = 0;
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << ((3 - i % 4) * 8);
  }
  words[asciiBitLength >> 5] |= 0x80 << (24 - asciiBitLength % 32);
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let blockIndex = 0; blockIndex < words[lengthProperty]; blockIndex += 16) {
    const w = [];
    for (i = 0; i < 64; i++) {
      if (i < 16) {
        w[i] = words[blockIndex + i] | 0;
      } else {
        const gamma0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const gamma1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = ((w[i - 16] + gamma0) | 0) + ((w[i - 7] + gamma1) | 0);
      }
    }

    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (((h + s1) | 0) + ((ch + k[i]) | 0) + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
};

/**
 * Computes standard HMAC-SHA256 signature for a message and secret key
 * @param {string} message
 * @param {string} key
 * @returns {string} Hex string (64 chars)
 */
export const computeHmacSha256 = (message, key = INSTITUTIONAL_HMAC_SECRET) => {
  const blockSize = 64; // SHA-256 block size in bytes
  let k = key;
  if (k.length > blockSize) {
    k = sha256(k);
  }
  while (k.length < blockSize) {
    k += '\0';
  }

  let oKeyPad = '';
  let iKeyPad = '';
  for (let i = 0; i < blockSize; i++) {
    oKeyPad += String.fromCharCode(k.charCodeAt(i) ^ 0x5c);
    iKeyPad += String.fromCharCode(k.charCodeAt(i) ^ 0x36);
  }

  // Convert hex output of inner hash back to ascii bytes before hashing with outer key
  const innerHex = sha256(iKeyPad + message);
  let innerAscii = '';
  for (let i = 0; i < innerHex.length; i += 2) {
    innerAscii += String.fromCharCode(parseInt(innerHex.substr(i, 2), 16));
  }

  return sha256(oKeyPad + innerAscii);
};

/**
 * Legacy deterministic hash / checksum generator (FNV-1a 32-bit + Hex Digest)
 * Preserved for backwards compatibility with VT1 badges.
 * @param {string} str
 * @returns {string} 8-character hex digest
 */
export const computeQrChecksum = (str, salt = LEGACY_QR_SALT) => {
  let hash = 2166136261;
  const combined = `${str}#${salt}`;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

/**
 * Generates a tamper-proof cryptographically signed QR payload for a student using HMAC-SHA256.
 * Format: "VT2:<student_id>:<timestamp>:<hmac>"
 * (Uses 16-character compact HMAC-SHA256 signature for dense, highly scannable QR matrices)
 * 
 * @param {object} student
 * @param {number} timestamp
 * @returns {string}
 */
export const generateSignedStudentQr = (student, timestamp = 2026) => {
  if (!student) return '';
  const studentId = String(student.student_id || student.id || student.lrn || '').trim();
  if (!studentId) return '';
  const message = `${studentId}:${timestamp}`;
  const fullHmac = computeHmacSha256(message);
  const compactSignature = fullHmac.substring(0, 16);
  return `VT2:${studentId}:${timestamp}:${compactSignature}`;
};

/**
 * Validates a signed QR payload (Supports VT2 HMAC-SHA256 and legacy VT1).
 * @param {string} payload
 * @returns {{ isValid: boolean, studentId: string|null, isHmac: boolean }}
 */
export const verifySignedStudentQrPayload = (payload) => {
  if (!payload || typeof payload !== 'string') return { isValid: false, studentId: null, isHmac: false };
  const clean = payload.trim();
  
  // VT2: HMAC-SHA256 format: VT2:<student_id>:<timestamp>:<signature>
  if (clean.startsWith('VT2:')) {
    const parts = clean.split(':');
    if (parts.length < 4) return { isValid: false, studentId: null, isHmac: true };
    const studentId = parts[1].trim();
    const timestamp = parts[2].trim();
    const signature = parts[3].trim().toLowerCase();
    
    const message = `${studentId}:${timestamp}`;
    const expectedFull = computeHmacSha256(message).toLowerCase();
    const expectedCompact = expectedFull.substring(0, 16);
    
    if (signature === expectedCompact || signature === expectedFull) {
      return { isValid: true, studentId, isHmac: true };
    }
    return { isValid: false, studentId: null, isHmac: true };
  }

  // Legacy VT1 format: VT1:<lrn>:<checksum>
  if (clean.startsWith('VT1:')) {
    const parts = clean.split(':');
    if (parts.length < 3) return { isValid: false, studentId: null, isHmac: false };
    const lrn = parts[1].trim();
    const signature = parts[2].trim();
    const expectedSignature = computeQrChecksum(lrn);

    if (signature.toLowerCase() === expectedSignature.toLowerCase()) {
      return { isValid: true, studentId: lrn, isHmac: false };
    }
    return { isValid: false, studentId: null, isHmac: false };
  }

  return { isValid: false, studentId: null, isHmac: false };
};

/**
 * Generates the secure QR payload string for a student (Signed or Plain).
 * @param {object} student
 * @param {boolean} signed
 * @returns {string}
 */
export const getStudentQrValue = (student, signed = true) => {
  if (!student) return '';
  if (signed) {
    return generateSignedStudentQr(student);
  }
  return String(student.student_id || student.lrn || student.id || '').trim();
};

/**
 * Generates a high-definition QR code image URL for a student.
 * @param {object} student
 * @param {number} size
 * @param {number} margin
 * @param {boolean} signed
 * @returns {string}
 */
export const getStudentQrCodeUrl = (student, size = 300, margin = 1, signed = true) => {
  const data = getStudentQrValue(student, signed);
  if (!data) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&margin=${margin}`;
};

/**
 * Strict & Robust matcher for finding a student from a scanned QR code payload.
 * Accurately validates genuine student badges while rejecting foreign/arbitrary QR codes
 * (Wi-Fi codes, YouTube URLs, barcodes, vCards, unrelated links).
 *
 * @param {string} rawInput
 * @param {Array<object>} students
 * @returns {object|null}
 */
export const matchStudentFromScan = (rawInput, students = []) => {
  if (!rawInput || !Array.isArray(students) || students.length === 0) return null;

  let clean = String(rawInput).trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}

  const cleanLower = clean.toLowerCase();

  // Explicitly reject common non-student QR payloads
  if (
    cleanLower.startsWith('wifi:') ||
    cleanLower.startsWith('begin:vcard') ||
    cleanLower.startsWith('matmsg:') ||
    cleanLower.startsWith('smsto:') ||
    cleanLower.startsWith('geo:')
  ) {
    return null;
  }

  // 0. Check for Cryptographically Signed Tamper-Proof Badges ("VT2:<student_id>:<timestamp>:<hmac>" or "VT1:<lrn>:<checksum>")
  if (clean.startsWith('VT2:') || clean.startsWith('VT1:')) {
    const { isValid, studentId, isHmac } = verifySignedStudentQrPayload(clean);
    if (isValid && studentId) {
      const match = students.find(
        s => String(s.student_id || s.lrn || '').trim() === studentId || String(s.id) === studentId
      );
      if (match) {
        return {
          ...match,
          _isSignedBadge: true,
          _badgeVerified: true,
          _isHmac: isHmac
        };
      }
    } else {
      // Tampered or invalid cryptographic signature detected
      console.warn('Tampered or invalid student QR code signature detected:', clean);
      return null;
    }
  }

  // 1. Check for official VioTrack public verification & pass URLs (/verify-student/:id or /student-pass/:id)
  if (clean.includes('/verify-student/') || clean.includes('/student-pass/')) {
    const parts = clean.includes('/verify-student/')
      ? clean.split('/verify-student/')[1]
      : clean.split('/student-pass/')[1];
    const sid = (parts || '').split('?')[0].split('#')[0].trim();
    if (sid) {
      const match = students.find(
        s => String(s.id) === sid || String(s.student_id || s.lrn).trim() === sid
      );
      if (match) return match;
    }
  }

  // 2. Check for official VioTrack violation report URLs (/student-violation/:id or /adminstudentviolation/:id)
  if (clean.includes('/student-violation/') || clean.includes('/adminstudentviolation/')) {
    const parts = clean.includes('/student-violation/')
      ? clean.split('/student-violation/')[1]
      : clean.split('/adminstudentviolation/')[1];
    const sid = (parts || '').split('?')[0].split('#')[0].trim();
    if (sid) {
      const match = students.find(
        s => String(s.id) === sid || String(s.student_id || s.lrn).trim() === sid
      );
      if (match) return match;
    }
  }

  // 3. Query string parameters ?id= or ?student_id= or ?lrn= (Only if parameter is explicitly provided)
  if (clean.includes('id=') || clean.includes('student_id=') || clean.includes('lrn=')) {
    try {
      const queryString = clean.includes('?') ? clean.split('?')[1] : clean;
      const urlParams = new URLSearchParams(queryString);
      const sid = (urlParams.get('id') || urlParams.get('student_id') || '').trim();
      const lrn = (urlParams.get('lrn') || '').trim();

      if (sid) {
        const match = students.find(
          s => String(s.id) === sid || String(s.student_id || s.lrn).trim() === sid
        );
        if (match) return match;
      }
      if (lrn) {
        const match = students.find(
          s => String(s.student_id || s.lrn).trim() === lrn
        );
        if (match) return match;
      }
    } catch {}
  }

  // 4. Custom formatted institutional prefixes e.g. "VIOTRACK-STUDENT:109283746101" or "VIOTRACK:109283746101"
  if (clean.toUpperCase().includes('VIOTRACK')) {
    const stripped = clean.replace(/^.*VIOTRACK[^:]*:\s*/i, '').trim();
    if (stripped) {
      const match = students.find(
        s => String(s.student_id || s.lrn).trim() === stripped || String(s.id) === stripped
      );
      if (match) return match;
    }
  }

  // 5. JSON formats (e.g., {"student_id": "109283746106"})
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      const lrnCandidate = String(parsed.student_id || parsed.lrn || parsed.LRN || parsed.uli || parsed.ULI || parsed.id || '').trim();
      const nameCandidate = String(parsed.name || parsed.Name || parsed.student_name || '').trim().toLowerCase();

      if (lrnCandidate) {
        const match = students.find(
          s => String(s.student_id || s.lrn).trim() === lrnCandidate || String(s.id) === lrnCandidate
        );
        if (match) return match;
      }
      if (nameCandidate) {
        const match = students.find(
          s => `${s.fname} ${s.lname}`.toLowerCase() === nameCandidate
        );
        if (match) return match;
      }
    } catch {}
  }

  // If the scanned payload is an unrelated arbitrary URL (e.g. google.com, youtube.com, etc.), reject it
  if (cleanLower.startsWith('http://') || cleanLower.startsWith('https://')) {
    return null;
  }

  // 6. Direct Exact Identification matching (LRN, Student ID, or Exact Name)
  // Strict exact match prevents arbitrary numbers/letters from matching
  const exactMatch = students.find(s => {
    const sLrn = String(s.lrn || '').trim();
    const sStudentId = String(s.student_id || '').trim();
    const sId = String(s.id || '').trim();
    const sFullName = `${s.fname || ''} ${s.lname || ''}`.trim().toLowerCase();

    return (
      (sLrn && sLrn === clean) ||
      (sStudentId && sStudentId === clean) ||
      (sId && sId === clean) ||
      (sFullName && sFullName === cleanLower)
    );
  });

  if (exactMatch) return exactMatch;

  return null;
};

