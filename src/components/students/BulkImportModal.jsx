import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { FileSpreadsheet, Upload, Download, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../../utils/csvHelper';

const SAMPLE_CSV = `LRN,First Name,Middle Name,Last Name,Grade,Section,Gender,Contact,Parent Name,Parent Contact,Strand
109283746201,Danilo,G.,Ramos,Grade 10,Rizal,Male,09151234567,Arturo Ramos,09151234568,Junior High School
109283746202,Patricia,Mae,Garcia,Grade 10,Rizal,Female,09152345678,Carmen Garcia,09152345679,Junior High School
109283746203,Kenneth,John,Bautista,Grade 11,STEM A,Male,09153456789,Lorna Bautista,09153456780,STEM
109283746204,Camille,Rose,Santos,Grade 12,HUMSS B,Female,09154567890,Eduardo Santos,09154567891,HUMSS`;

const MALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
];

const FEMALE_PORTRAITS = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
];

export const BulkImportModal = ({ isOpen, onClose, onImported }) => {
  const { success, error, info } = useNotification();
  const [csvText, setCsvText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setCsvText(text);
      setFileName(file.name);
      info(`Loaded ${file.name} successfully!`);
    } catch (err) {
      error('Failed to read file: ' + err.message);
    }
  };

  const handleDownloadTemplate = () => {
    downloadSampleCsv('Viotrack_Student_Import_Template.csv', SAMPLE_CSV);
    success('Downloaded student import template CSV!');
  };

  const handleParseAndUpload = async () => {
    if (!csvText.trim()) {
      error('Please upload a CSV file or paste student rows.');
      return;
    }

    setLoading(true);
    try {
      const rows = parseCsvString(csvText);
      if (rows.length === 0) {
        throw new Error('No valid CSV rows found.');
      }

      // Detect and skip header row if present
      const firstRow = rows[0];
      const hasHeader = firstRow.some(col => 
        ['lrn', 'first name', 'fname', 'name', 'student'].includes(col.toLowerCase())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      if (dataRows.length === 0) {
        throw new Error('No data rows to import.');
      }

      let count = 0;
      for (let i = 0; i < dataRows.length; i++) {
        const parts = dataRows[i];
        if (parts.length >= 2 && parts.some(p => p.trim())) {
          const lrn = parts[0]?.trim() || `109283746${Math.floor(100 + Math.random() * 900)}`;
          const fname = parts[1]?.trim() || 'Student';
          const mname = parts[2]?.trim() || '';
          const lname = parts[3]?.trim() || 'Roster';
          const grade = parts[4]?.trim() || 'Grade 10';
          const section = parts[5]?.trim() || 'Rizal';
          const gender = parts[6]?.trim() || 'Male';
          const contact = parts[7]?.trim() || '09151234567';
          const parent_name = parts[8]?.trim() || 'Parent Guardian';
          const parent_contact = parts[9]?.trim() || '09151234568';
          const strand = parts[10]?.trim() || '';

          const isFem = gender.toLowerCase().startsWith('f');
          const portraits = isFem ? FEMALE_PORTRAITS : MALE_PORTRAITS;
          const assignedImage = portraits[(i + Math.floor(Math.random() * 5)) % portraits.length];

          await dataService.addStudent({
            lrn,
            fname,
            mname,
            lname,
            grade,
            section,
            gender: isFem ? 'Female' : 'Male',
            contact,
            parent_name,
            parent_contact,
            strand,
            academicyear: '2025-2026',
            image: assignedImage
          });
          count++;
        }
      }

      success(`Successfully imported ${count} student records!`);
      onImported?.();
      onClose();
      setCsvText('');
      setFileName('');
    } catch (err) {
      error('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Students via CSV" icon={FileSpreadsheet} maxWidth="680px">
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ fontSize: '13.5px', color: '#1e3a8a', display: 'block' }}>Expected CSV Column Format:</strong>
              <code style={{ fontSize: '11.5px', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                LRN, First Name, Middle Name, Last Name, Grade, Section, Gender, Contact, Parent Name, Parent Contact, Strand
              </code>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                background: '#ffffff',
                border: '1px solid #bfdbfe',
                color: '#2563eb',
                fontSize: '12px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} /> Download Template
            </button>
          </div>
        </div>

        {/* File Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: fileName ? '#f0fdf4' : '#fafafa',
            borderColor: fileName ? '#86efac' : '#cbd5e1',
            transition: 'all 0.2s ease'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv,text/plain"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <Upload size={28} color={fileName ? '#16a34a' : '#64748b'} style={{ margin: '0 auto 8px auto' }} />
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
            {fileName ? `Selected File: ${fileName}` : 'Click or Drag & Drop to Upload CSV File'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Supports .csv and UTF-8 comma-delimited text files
          </div>
        </div>

        {/* Or Paste Area */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              Or Paste CSV Data Directly:
            </label>
            <button
              type="button"
              onClick={() => {
                setCsvText(SAMPLE_CSV);
                setFileName('');
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2563eb',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Load Sample Text
            </button>
          </div>
          <textarea
            className="form-control"
            rows={7}
            style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.4 }}
            placeholder="LRN,First Name,Middle Name,Last Name,Grade,Section,Gender,Contact,Parent Name,Parent Contact,Strand..."
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
        </div>
      </div>

      <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '14px 20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
          Cancel
        </button>
        <button
          type="button"
          className="page-banner-primary-btn"
          style={{ padding: '9px 18px', fontSize: '13px', borderRadius: '8px' }}
          onClick={handleParseAndUpload}
          disabled={loading}
        >
          <Upload size={15} />
          {loading ? 'Processing Import...' : 'Import Students'}
        </button>
      </div>
    </Modal>
  );
};
