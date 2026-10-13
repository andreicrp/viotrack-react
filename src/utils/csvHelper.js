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
  if (!text || !String(text).trim()) return [];

  const normalizedText = String(text).replace(/^\uFEFF/, '');
  let commaCount = 0;
  let tabCount = 0;
  let insideQuotes = false;
  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    if (char === '"') {
      if (insideQuotes && normalizedText[i + 1] === '"') i++;
      else insideQuotes = !insideQuotes;
    } else if (!insideQuotes && (char === '\r' || char === '\n')) {
      break;
    } else if (!insideQuotes && char === ',') {
      commaCount++;
    } else if (!insideQuotes && char === '\t') {
      tabCount++;
    }
  }
  const delimiter = tabCount > commaCount ? '\t' : ',';
  const result = [];
  let row = [];
  let currentField = '';
  insideQuotes = false;

  for (let i = 0; i < normalizedText.length; i++) {
    const char = normalizedText[i];
    const nextChar = normalizedText[i + 1];
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      row.push(sanitizeText(currentField.trim()));
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(sanitizeText(currentField.trim()));
      if (row.some(field => field !== '')) result.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || row.length) {
    row.push(sanitizeText(currentField.trim()));
    if (row.some(field => field !== '')) result.push(row);
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
