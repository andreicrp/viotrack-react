import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Eye,
  RefreshCw,
  XCircle,
  FileCheck,
  FileText,
  File,
  FileType,
  GraduationCap
} from 'lucide-react';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../../utils/csvHelper';
import { extractTextFromPdf, parseTeacherRosterFromPdfLines } from '../../utils/pdfHelper';

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

export const BulkImportTeachersModal = ({ isOpen, onClose, onImported, initialFormat = 'all' }) => {
  const { success, error, info } = useNotification();
  const [activeTab, setActiveTab] = useState(initialFormat === 'pdf' ? 'pdf' : 'csv');
  const [csvText, setCsvText] = useState('');
  const [pdfParsedTeachers, setPdfParsedTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState(initialFormat === 'pdf' ? 'pdf' : 'csv');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialFormat === 'pdf' ? 'pdf' : 'csv');
      setFileType(initialFormat === 'pdf' ? 'pdf' : 'csv');
      setFileName('');
      setCsvText('');
      setPdfParsedTeachers([]);
    }
  }, [isOpen, initialFormat]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

    try {
      if (isPdf) {
        setParsingPdf(true);
        setFileName(file.name);
        setFileType('pdf');
        setActiveTab('pdf');

        info(`Parsing faculty roster PDF: ${file.name}...`);
        const { rawLines } = await extractTextFromPdf(file);
        const parsed = parseTeacherRosterFromPdfLines(rawLines);

        if (parsed.length === 0) {
          error('Could not detect faculty rows in this PDF. Please check document formatting.');
        } else {
          const withAvatars = parsed.map((t, i) => {
            const isFem = (t.gender || '').toLowerCase().startsWith('f');
            const avatars = isFem ? FEMALE_AVATARS : MALE_AVATARS;
            return {
              ...t,
              image: avatars[(i + Math.floor(Math.random() * 4)) % avatars.length]
            };
          });
          setPdfParsedTeachers(withAvatars);
          success(`Extracted ${withAvatars.length} faculty candidate records from PDF!`);
        }
      } else {
        const text = await readFileAsText(file);
        setCsvText(text);
        setFileName(file.name);
        setFileType('csv');
        setActiveTab('csv');
        info(`Loaded CSV spreadsheet: ${file.name}`);
      }
    } catch (err) {
      error(`Failed to process ${isPdf ? 'PDF' : 'CSV'} file: ` + err.message);
    } finally {
      setParsingPdf(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    downloadSampleCsv('Viotrack_Faculty_Import_Template.csv', SAMPLE_TEACHERS_CSV);
    success('Downloaded faculty import template CSV!');
  };

  // Parsed CSV Candidate Rows
  const parsedCsvTeachers = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const rows = parseCsvString(csvText);
      if (rows.length === 0) return [];

      const firstRow = rows[0];
      const hasHeader = firstRow.some(col => 
        ['first name', 'fname', 'name', 'email', 'teacher', 'faculty'].includes(col.toLowerCase().trim())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      return dataRows
        .filter(parts => parts.length >= 2 && parts.some(p => p.trim()))
        .map((parts, i) => {
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

          return {
            fname,
            mname,
            lname,
            email,
            contact,
            department,
            position: 'Teacher I',
            specialization,
            gender: isFem ? 'Female' : 'Male',
            image: assignedImage
          };
        });
    } catch {
      return [];
    }
  }, [csvText]);

  const activeCandidateList = fileType === 'pdf' && pdfParsedTeachers.length > 0
    ? pdfParsedTeachers
    : parsedCsvTeachers;

  const handleParseAndUpload = async () => {
    if (activeCandidateList.length === 0) {
      error(`No valid faculty records found in ${fileType.toUpperCase()}.`);
      return;
    }

    setLoading(true);
    try {
      let count = 0;
      for (const t of activeCandidateList) {
        await dataService.addTeacher(t);
        count++;
      }

      success(`Successfully enrolled ${count} faculty members from ${fileType.toUpperCase()}!`);
      onImported?.();
      onClose();
      setCsvText('');
      setPdfParsedTeachers([]);
      setFileName('');
    } catch (err) {
      error('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bulk Faculty Import (${activeTab.toUpperCase()})`}
      icon={GraduationCap}
      maxWidth="740px"
    >
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 22px', maxHeight: '76vh', overflowY: 'auto' }}>
        
        {/* Format Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: activeTab === 'csv' ? '#ffffff' : 'transparent',
              color: activeTab === 'csv' ? '#07345f' : '#64748b',
              boxShadow: activeTab === 'csv' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSpreadsheet size={15} color={activeTab === 'csv' ? '#07345f' : '#64748b'} />
            CSV / Spreadsheet File
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: activeTab === 'pdf' ? '#ffffff' : 'transparent',
              color: activeTab === 'pdf' ? '#07345f' : '#64748b',
              boxShadow: activeTab === 'pdf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FileType size={15} color={activeTab === 'pdf' ? '#07345f' : '#64748b'} />
            PDF Faculty Roster Document
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <input
          type="file"
          ref={fileInputRef}
          accept={activeTab === 'pdf' ? '.pdf,application/pdf' : '.csv,text/csv'}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '12px',
            padding: '24px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: fileName ? '#f0fdf4' : '#fafafa',
            borderColor: fileName ? '#22c55e' : '#cbd5e1',
            transition: 'all 0.2s'
          }}
        >
          {parsingPdf ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={32} color="#07345f" className="animate-spin" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#07345f' }}>Analyzing PDF Faculty Roster...</div>
            </div>
          ) : fileName ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <FileCheck size={32} color="#16a34a" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{fileName}</span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Click to choose a different file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Upload size={28} color="#07345f" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                Click to upload {activeTab === 'pdf' ? 'PDF Faculty Roster (.pdf)' : 'Faculty CSV (.csv)'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {activeTab === 'pdf' ? 'Supports Faculty Directories and institutional assignment PDFs' : 'Standard comma-delimited faculty format'}
              </div>
            </div>
          )}
        </div>

        {/* Template download for CSV */}
        {activeTab === 'csv' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Download standard CSV format with sample data</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={13} /> Sample CSV
            </button>
          </div>
        )}

        {/* Candidate Preview */}
        {activeCandidateList.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                Detected Faculty Candidates ({activeCandidateList.length})
              </span>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Ready to Import</span>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Name</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Department</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Email</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCandidateList.map((t, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.fname} {t.lname}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{t.department}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{t.email}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{t.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleParseAndUpload}
            disabled={loading || activeCandidateList.length === 0}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: loading || activeCandidateList.length === 0 ? '#94a3b8' : '#07345f',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading || activeCandidateList.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            Import {activeCandidateList.length > 0 ? `${activeCandidateList.length} Faculty` : 'Roster'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
