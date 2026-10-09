import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  FileType
} from 'lucide-react';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../../utils/csvHelper';
import { extractTextFromPdf, parseStudentRosterFromPdfLines } from '../../utils/pdfHelper';

const SAMPLE_CSV = `Student ID,First Name,Middle Name,Last Name,Grade,Section,Gender,Contact,Parent Name,Parent Contact,Strand
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

export const BulkImportModal = ({ isOpen, onClose, onImported, initialFormat = 'all' }) => {
  const { success, error, info } = useNotification();
  const [activeTab, setActiveTab] = useState(initialFormat === 'pdf' ? 'pdf' : 'csv');
  const [csvText, setCsvText] = useState('');
  const [pdfParsedStudents, setPdfParsedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState(initialFormat === 'pdf' ? 'pdf' : 'csv');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, percent: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialFormat === 'pdf' ? 'pdf' : 'csv');
      setFileType(initialFormat === 'pdf' ? 'pdf' : 'csv');
      setFileName('');
      setCsvText('');
      setPdfParsedStudents([]);
      setImportProgress({ current: 0, total: 0, percent: 0 });
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
        
        info(`Parsing ${file.name}...`);
        const { rawLines } = await extractTextFromPdf(file);
        const parsed = parseStudentRosterFromPdfLines(rawLines);

        if (parsed.length === 0) {
          error('Could not detect student roster rows in this PDF. Please check document structure.');
        } else {
          // Assign portrait images
          const withPortraits = parsed.map((s, i) => {
            const isFem = (s.gender || '').toLowerCase().startsWith('f');
            const portraits = isFem ? FEMALE_PORTRAITS : MALE_PORTRAITS;
            return {
              ...s,
              lrn: s.student_id,
              academicyear: '2025-2026',
              image: portraits[(i + Math.floor(Math.random() * 5)) % portraits.length]
            };
          });
          setPdfParsedStudents(withPortraits);
          success(`Extracted ${withPortraits.length} student records from ${file.name}!`);
        }
      } else {
        const text = await readFileAsText(file);
        setCsvText(text);
        setFileName(file.name);
        setFileType('csv');
        setActiveTab('csv');
        setPdfParsedStudents([]);
        setImportProgress({ current: 0, total: 0, percent: 0 });
        info(`Loaded ${file.name} successfully!`);
      }
    } catch (err) {
      error('Failed to read file: ' + err.message);
    } finally {
      setParsingPdf(false);
    }
  };

  const handleDownloadTemplate = () => {
    downloadSampleCsv('Viotrack_Student_Import_Template.csv', SAMPLE_CSV);
    success('Downloaded student import template CSV!');
  };

  // Instant in-memory parsed candidate roster from CSV
  const parsedCsvRoster = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const rows = parseCsvString(csvText);
      if (rows.length === 0) return [];

      const firstRow = rows[0];
      const hasHeader = firstRow.some(col =>
        ['student id', 'student_id', 'id', 'lrn', 'first name', 'fname', 'name', 'student'].includes(col.toLowerCase().trim())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      return dataRows
        .filter(parts => parts.length >= 2 && parts.some(p => p.trim()))
        .map((parts, i) => {
          const student_id = parts[0]?.trim() || `10928374${Math.floor(1000 + Math.random() * 9000)}`;
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

          return {
            student_id,
            lrn: student_id,
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
          };
        });
    } catch {
      return [];
    }
  }, [csvText]);

  // Combined Active Roster Candidates
  const activeCandidateRoster = fileType === 'pdf' && pdfParsedStudents.length > 0 
    ? pdfParsedStudents 
    : parsedCsvRoster;

  // High-Speed Chunked Batch Upload
  const handleParseAndUpload = async () => {
    if (activeCandidateRoster.length === 0) {
      error(`No valid student rows found in ${fileType.toUpperCase()}. Please verify file format.`);
      return;
    }

    setLoading(true);
    setImportProgress({ current: 0, total: activeCandidateRoster.length, percent: 0 });

    try {
      const result = await dataService.bulkAddStudents(activeCandidateRoster, (current, total) => {
        const percent = Math.round((current / total) * 100);
        setImportProgress({ current, total, percent });
      });

      success(`Successfully imported ${result.insertedCount || activeCandidateRoster.length} student records from ${fileType.toUpperCase()}!`);
      setTimeout(() => {
        onImported?.();
        onClose();
        setCsvText('');
        setPdfParsedStudents([]);
        setFileName('');
        setImportProgress({ current: 0, total: 0, percent: 0 });
      }, 400);
    } catch (err) {
      error('Bulk import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Bulk Student Import (${activeTab.toUpperCase()})`} icon={FileSpreadsheet} maxWidth="740px">
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 22px', maxHeight: '76vh', overflowY: 'auto' }}>
        
        {/* Format Selector Tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-input, #f1f5f9)', padding: '4px', borderRadius: '10px', gap: '4px', border: '1px solid var(--border-subtle, transparent)' }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab('csv');
              setFileType('csv');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              border: activeTab === 'csv' ? '1px solid var(--border-medium, #cbd5e1)' : 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'csv' ? 'var(--bg-surface-elevated, #ffffff)' : 'transparent',
              color: activeTab === 'csv' ? 'var(--brand-blue, #0284c7)' : 'var(--text-muted, #64748b)',
              boxShadow: activeTab === 'csv' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <FileSpreadsheet size={15} color={activeTab === 'csv' ? 'var(--brand-blue, #0284c7)' : 'var(--text-muted, #64748b)'} />
            <span>CSV / Spreadsheet File</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pdf');
              setFileType('pdf');
            }}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '7px',
              border: activeTab === 'pdf' ? '1px solid var(--border-medium, #cbd5e1)' : 'none',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              background: activeTab === 'pdf' ? 'var(--bg-surface-elevated, #ffffff)' : 'transparent',
              color: activeTab === 'pdf' ? 'var(--brand-blue, #0284c7)' : 'var(--text-muted, #64748b)',
              boxShadow: activeTab === 'pdf' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <FileType size={15} color={activeTab === 'pdf' ? 'var(--brand-blue, #0284c7)' : 'var(--text-muted, #64748b)'} />
            <span>PDF Roster Document</span>
          </button>
        </div>

        {/* Format Info & Template Download */}
        <div style={{ background: 'var(--bg-surface-elevated, #f8fafc)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ flex: 1, minWidth: '220px' }}>
              <strong style={{ fontSize: '12.5px', color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Sparkles size={14} color="var(--brand-blue, #0284c7)" />
                {activeTab === 'pdf' ? 'Supported PDF Formats:' : 'Required CSV Columns:'}
              </strong>
              {activeTab === 'pdf' ? (
                <div style={{ fontSize: '11.5px', color: 'var(--text-secondary, #475569)', marginTop: '4px', lineHeight: 1.4 }}>
                  Official School Forms (SF1), Class Rosters, DepEd Tables, or exported PDF student matrices.
                </div>
              ) : (
                <code style={{ fontSize: '11px', color: 'var(--text-secondary, #475569)', background: 'var(--bg-input, #f1f5f9)', padding: '3px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '4px', wordBreak: 'break-word', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  Student ID, First Name, Middle Name, Last Name, Grade, Section, Gender, Contact, Parent Name, Parent Contact, Strand
                </code>
              )}
            </div>
            {activeTab === 'csv' && (
              <button
                type="button"
                onClick={handleDownloadTemplate}
                style={{
                  background: 'var(--bg-surface, #ffffff)',
                  border: '1.5px solid var(--border-medium, #cbd5e1)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  padding: '7px 13px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
              >
                <Download size={13} /> Download Sample CSV
              </button>
            )}
          </div>
        </div>

        {/* File Upload Zone */}
        <div
          className="file-dropzone"
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${fileName ? (fileType === 'pdf' ? '#f87171' : '#4ade80') : 'var(--border-medium, #cbd5e1)'}`,
            borderRadius: '12px',
            padding: '20px 14px',
            textAlign: 'center',
            cursor: 'pointer',
            background: fileName ? (fileType === 'pdf' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)') : 'var(--bg-input, #fafafa)',
            transition: 'background-color 0.15s ease, border-color 0.15s ease'
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept={activeTab === 'pdf' ? '.pdf,application/pdf' : '.csv,text/csv,text/plain,.pdf,application/pdf'}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          {parsingPdf ? (
            <RefreshCw size={26} className="spin" color="var(--brand-blue, #dc2626)" style={{ margin: '0 auto 6px auto', display: 'block' }} />
          ) : (
            <Upload size={24} color={fileName ? (fileType === 'pdf' ? '#f87171' : '#4ade80') : 'var(--brand-blue, #64748b)'} style={{ margin: '0 auto 6px auto', display: 'block' }} />
          )}
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>
            {parsingPdf
              ? 'Analyzing & Extracting PDF Text...'
              : fileName
              ? `File Ready (${fileType.toUpperCase()}): ${fileName}`
              : `Tap or Drag & Drop Enrollment ${activeTab.toUpperCase()} File`}
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            {activeTab === 'pdf'
              ? 'Supports multi-page student lists, class lists, and PDF official rosters'
              : 'Supports CSV, Excel comma-separated exports, or text student tables'}
          </div>
        </div>

        {/* Pre-Import Validation & Preview Section */}
        {activeCandidateRoster.length > 0 && (
          <div style={{ background: 'var(--bg-surface-elevated, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '12px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary, #0f172a)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCheck size={15} color="#16a34a" />
                <span>Ready to Import: <strong style={{ color: '#16a34a' }}>{activeCandidateRoster.length} valid students ({fileType.toUpperCase()})</strong></span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', background: '#f8fafc', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                Showing first {Math.min(activeCandidateRoster.length, 5)} records
              </span>
            </div>

            {/* Micro Preview Table */}
            <div style={{ overflowX: 'auto', maxHeight: '160px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Student ID</th>
                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Full Name</th>
                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Placement</th>
                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Gender</th>
                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Parent / Guardian</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCandidateRoster.slice(0, 5).map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>{s.student_id}</td>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{s.fname} {s.mname ? s.mname + ' ' : ''}{s.lname}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{s.grade} - {s.section}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{s.gender || 'N/A'}</td>
                      <td style={{ padding: '6px 10px', color: '#64748b' }}>{s.parent_name || 'N/A'} ({s.parent_contact || 'N/A'})</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Live Progress Bar on Upload */}
        {loading && (
          <div style={{ background: '#f8fafc', border: '1.5px solid #e0f2fe', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12.5px' }}>
              <span style={{ fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <RefreshCw size={14} className="spin" /> Ingesting Students into Live Database...
              </span>
              <span style={{ fontWeight: 800, color: '#0284c7' }}>
                {importProgress.current} / {importProgress.total} ({importProgress.percent}%)
              </span>
            </div>
            <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${importProgress.percent}%`,
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  borderRadius: '999px',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
          </div>
        )}

        {/* Text Paste Fallback for CSV */}
        {activeTab === 'csv' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                Or Paste CSV Data Directly:
              </label>
              <button
                type="button"
                onClick={() => {
                  setCsvText(SAMPLE_CSV);
                  setFileName('');
                  setFileType('csv');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#0f172a',
                  fontSize: '11px',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                Load Sample Text
              </button>
            </div>
            <textarea
              className="form-control"
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontFamily: 'monospace',
                fontSize: '11.5px',
                lineHeight: 1.4,
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '8px 10px',
                color: '#0f172a',
                background: '#ffffff',
                outline: 'none'
              }}
              placeholder="Student ID,First Name,Middle Name,Last Name,Grade,Section,Gender,Contact,Parent Name,Parent Contact,Strand..."
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                setFileType('csv');
              }}
            />
          </div>
        )}
      </div>

      <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '12px 22px', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#f8fafc' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={loading || parsingPdf}
          style={{
            borderRadius: '8px',
            padding: '8px 16px',
            fontWeight: 600,
            fontSize: '12.5px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            color: '#0f172a',
            cursor: 'pointer'
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          style={{
            background: '#0f172a',
            color: '#ffffff',
            borderRadius: '8px',
            padding: '8px 20px',
            fontSize: '12.5px',
            fontWeight: 700,
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: loading || parsingPdf || activeCandidateRoster.length === 0 ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)'
          }}
          onClick={handleParseAndUpload}
          disabled={loading || parsingPdf || activeCandidateRoster.length === 0}
        >
          <Upload size={14} />
          {loading ? `Importing (${importProgress.percent}%)...` : `Import ${activeCandidateRoster.length > 0 ? activeCandidateRoster.length : ''} Students`}
        </button>
      </div>
    </Modal>
  );
};
