import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { FileSpreadsheet, Upload, Download, CheckCircle2 } from 'lucide-react';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../../utils/csvHelper';

const SAMPLE_TEACHERS_CSV = `First Name,Middle Name,Last Name,Email,Contact,Department,Specialization,Gender
Manuel,L.,Quezon,manuel.quezon@viotrack.edu,09181112233,Social Studies,Philippine History,Male
Gabriela,S.,Silang,gabriela.silang@viotrack.edu,09182223344,English,Literature & Grammar,Female
Melchora,A.,Aquino,melchora.aquino@viotrack.edu,09183334455,Science,Biology & Health,Female
Apolinario,M.,Mabini,apolinario.mabini@viotrack.edu,09184445566,Mathematics,Algebra & Calculus,Male`;

const MALE_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
];

const FEMALE_AVATARS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80'
];

export const BulkImportTeachersModal = ({ isOpen, onClose, onImported }) => {
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
    downloadSampleCsv('Viotrack_Faculty_Import_Template.csv', SAMPLE_TEACHERS_CSV);
    success('Downloaded faculty import template CSV!');
  };

  const handleParseAndUpload = async () => {
    if (!csvText.trim()) {
      error('Please upload a CSV file or paste faculty rows.');
      return;
    }

    setLoading(true);
    try {
      const rows = parseCsvString(csvText);
      if (rows.length === 0) throw new Error('No valid rows found.');

      const firstRow = rows[0];
      const hasHeader = firstRow.some(col => 
        ['first name', 'fname', 'name', 'email', 'teacher', 'faculty'].includes(col.toLowerCase())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      if (dataRows.length === 0) throw new Error('No faculty rows to import.');

      let count = 0;
      for (let i = 0; i < dataRows.length; i++) {
        const parts = dataRows[i];
        if (parts.length >= 2 && parts.some(p => p.trim())) {
          const fname = parts[0]?.trim() || 'Faculty';
          const mname = parts[1]?.trim() || '';
          const lname = parts[2]?.trim() || 'Educator';
          const email = parts[3]?.trim() || `${fname.toLowerCase()}.${lname.toLowerCase()}@viotrack.edu`;
          const contact = parts[4]?.trim() || '09181112233';
          const department = parts[5]?.trim() || 'General Academics';
          const specialization = parts[6]?.trim() || 'General Education';
          const gender = parts[7]?.trim() || 'Male';

          const isFem = gender.toLowerCase().startsWith('f');
          const avatars = isFem ? FEMALE_AVATARS : MALE_AVATARS;
          const assignedImage = avatars[(i + Math.floor(Math.random() * 4)) % avatars.length];

          await dataService.addTeacher({
            fname,
            mname,
            lname,
            email,
            contact,
            department,
            specialization,
            gender: isFem ? 'Female' : 'Male',
            image: assignedImage
          });
          count++;
        }
      }

      success(`Successfully imported ${count} faculty members!`);
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
    <Modal isOpen={isOpen} onClose={onClose} title="Import Faculty Roster via CSV" icon={FileSpreadsheet} maxWidth="680px">
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: '#f8faff', border: '1px solid #dbeafe', borderRadius: '10px', padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <strong style={{ fontSize: '13.5px', color: '#1e3a8a', display: 'block' }}>Expected CSV Column Format:</strong>
              <code style={{ fontSize: '11.5px', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                First Name, Middle Name, Last Name, Email, Contact, Department, Specialization, Gender
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

        {/* File Upload Box */}
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
            {fileName ? `Selected File: ${fileName}` : 'Click or Drag & Drop to Upload Faculty CSV'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            Supports .csv and UTF-8 comma-separated text files
          </div>
        </div>

        {/* Paste Area */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155' }}>
              Or Paste CSV Data Directly:
            </label>
            <button
              type="button"
              onClick={() => {
                setCsvText(SAMPLE_TEACHERS_CSV);
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
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: '12px', lineHeight: 1.4 }}
            placeholder="First Name,Middle Name,Last Name,Email,Contact,Department,Specialization,Gender..."
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
          {loading ? 'Processing Import...' : 'Import Faculty'}
        </button>
      </div>
    </Modal>
  );
};
