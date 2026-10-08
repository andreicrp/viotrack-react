/**
 * CSV Utility for Viotrack
 * Handles CSV export, parsing, and template downloading with full Formula Injection (CSV Injection) Protection
 */

import { sanitizeCsvCell, sanitizeText } from './security';
import { downloadBlobFile } from './mobilePrintHelper';

export const exportToCsv = async (filename, headers, rows) => {
  try {
    const formatCell = (cell) => {
      if (cell === null || cell === undefined) return '""';
      // Protect against CSV formula execution in Excel/Calc
      const safeContent = sanitizeCsvCell(cell);
      const str = String(safeContent).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headerLine = headers.map(formatCell).join(',');
    const rowLines = rows.map(row => row.map(formatCell).join(','));
    const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fname = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    return await downloadBlobFile({
      filename: fname,
      blob: blob,
      mimeType: 'text/csv'
    });
  } catch (err) {
    console.error('Failed to export CSV:', err);
    throw err;
  }
};

export const downloadSampleCsv = async (filename, content) => {
  try {
    const csvContent = '\uFEFF' + content.trim();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fname = filename.endsWith('.csv') ? filename : `${filename}.csv`;

    return await downloadBlobFile({
      filename: fname,
      blob: blob,
      mimeType: 'text/csv'
    });
  } catch (err) {
    console.error('Failed to download sample CSV:', err);
    throw err;
  }
};

export const parseCsvString = (text) => {
  if (!text || !text.trim()) return [];

  const lines = text.trim().split(/\r?\n/);
  const result = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Parse line respecting quotes
    const row = [];
    let insideQuotes = false;
    let currentField = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentField += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        row.push(sanitizeText(currentField.trim()));
        currentField = '';
      } else {
        currentField += char;
      }
    }
    row.push(sanitizeText(currentField.trim()));
    result.push(row);
  }

  return result;
};

export const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }
    // Limit max text import to 10MB to prevent memory exhaustion
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('File exceeds maximum 10MB CSV import limit.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file, 'UTF-8');
  });
};
