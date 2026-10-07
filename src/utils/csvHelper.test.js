import { describe, it, expect } from 'vitest';
import { parseCsvString } from './csvHelper';
import { sanitizeText, sanitizeCsvCell } from './security';
import { smsService } from '../services/smsService';

describe('CSV & Security Utilities', () => {
  it('parses valid CSV string into rows and columns', () => {
    const csv = 'Name,Grade,Section\nJohn Doe,10,Rizal\nJane Smith,11,Bonifacio';
    const rows = parseCsvString(csv);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual(['Name', 'Grade', 'Section']);
    expect(rows[1]).toEqual(['John Doe', '10', 'Rizal']);
    expect(rows[2]).toEqual(['Jane Smith', '11', 'Bonifacio']);
  });

  it('escapes CSV formula injection patterns', () => {
    const maliciousFormula = '=SUM(1+1)';
    const sanitized = sanitizeCsvCell(maliciousFormula);
    expect(sanitized.startsWith("'")).toBe(true);
  });

  it('sanitizes potentially malicious HTML text', () => {
    const dirty = '<script>alert("xss")</script>Hello';
    const clean = sanitizeText(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).toContain('Hello');
  });
});

describe('SMS Service Utilities', () => {
  it('sanitizes recipient phone numbers', () => {
    expect(smsService.sanitizePhoneNumber('+63 (912) 345-6789')).toBe('+639123456789');
    expect(smsService.sanitizePhoneNumber('0912-345-6789')).toBe('09123456789');
    expect(smsService.sanitizePhoneNumber('')).toBe('');
  });
});
