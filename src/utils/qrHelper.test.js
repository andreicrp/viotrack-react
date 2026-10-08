import { describe, it, expect } from 'vitest';
import {
  sha256,
  computeHmacSha256,
  computeQrChecksum,
  generateSignedStudentQr,
  verifySignedStudentQrPayload,
  getStudentQrValue,
  matchStudentFromScan
} from './qrHelper';

describe('QR Cryptographic Helper & HMAC-SHA256 Suite', () => {
  const mockStudent = {
    id: '101',
    student_id: '2026-0042',
    lrn: '109283746101',
    fname: 'Juan',
    lname: 'Dela Cruz',
    grade_level: '10',
    section: 'Rizal'
  };

  it('computes consistent SHA-256 digests', () => {
    const hash = sha256('VioTrack2026');
    expect(hash).toHaveLength(64);
    expect(hash).toBe(sha256('VioTrack2026'));
  });

  it('generates authentic VT2 HMAC-SHA256 signed QR payload', () => {
    const payload = generateSignedStudentQr(mockStudent, 2026);
    expect(payload.startsWith('VT2:2026-0042:2026:')).toBe(true);

    const verification = verifySignedStudentQrPayload(payload);
    expect(verification.isValid).toBe(true);
    expect(verification.studentId).toBe('2026-0042');
    expect(verification.isHmac).toBe(true);
  });

  it('rejects forged or tampered VT2 payloads', () => {
    const forgedPayload = 'VT2:2026-0042:2026:deadbeefcafebabe';
    const verification = verifySignedStudentQrPayload(forgedPayload);
    expect(verification.isValid).toBe(false);
  });

  it('maintains backwards compatibility with legacy VT1 checksum badges', () => {
    const legacyChecksum = computeQrChecksum('109283746101');
    const legacyPayload = `VT1:109283746101:${legacyChecksum}`;

    const verification = verifySignedStudentQrPayload(legacyPayload);
    expect(verification.isValid).toBe(true);
    expect(verification.studentId).toBe('109283746101');
    expect(verification.isHmac).toBe(false);
  });

  it('matches authentic students from scan and marks badge verified', () => {
    const payload = generateSignedStudentQr(mockStudent, 2026);
    const matched = matchStudentFromScan(payload, [mockStudent]);

    expect(matched).not.toBeNull();
    expect(matched.fname).toBe('Juan');
    expect(matched._isSignedBadge).toBe(true);
    expect(matched._badgeVerified).toBe(true);
  });

  it('rejects foreign, invalid, or arbitrary QR payloads', () => {
    const students = [mockStudent];
    expect(matchStudentFromScan('WIFI:S:MyWifi;T:WPA;P:12345;;', students)).toBeNull();
    expect(matchStudentFromScan('https://www.youtube.com/watch?v=abc', students)).toBeNull();
    expect(matchStudentFromScan('https://google.com', students)).toBeNull();
    expect(matchStudentFromScan('VT2:2026-0042:2026:invalidhmac', students)).toBeNull();
  });
});
