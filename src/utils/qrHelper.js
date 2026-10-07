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

/**
 * Generates the secure, privacy-preserving QR payload string for a student.
 * Encodes the student's unique academic 12-digit LRN (or ID) directly as plain numerical data.
 *
 * Privacy & Security Benefits (RA 10173 - Data Privacy Act):
 * - External scanners (Google Lens, iPhone Camera, third-party scanner apps) only see
 *   the raw student ID number (e.g., 109283746103) instead of an exposed website URL or endpoint.
 * - Prevents public web scraping, unauthorized URL crawling, and data leaks from screenshotted ID badges.
 * - Authorized personnel using the internal VioTrack Scanner (on Web or Mobile) can seamlessly
 *   decode the LRN and retrieve the student's records within the authenticated session.
 *
 * @param {object} student
 * @returns {string}
 */
export const getStudentQrValue = (student) => {
  if (!student) return '';
  // Use student ID directly (standard institutional ID barcode/QR standard)
  return String(student.student_id || student.lrn || student.id || '').trim();
};

/**
 * Generates a high-definition QR code image URL for a student.
 * @param {object} student
 * @param {number} size
 * @param {number} margin
 * @returns {string}
 */
export const getStudentQrCodeUrl = (student, size = 300, margin = 1) => {
  const data = getStudentQrValue(student);
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

