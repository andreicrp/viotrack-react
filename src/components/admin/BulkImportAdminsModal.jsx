import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  RefreshCw,
  FileCheck,
  FileType,
  ShieldAlert
} from 'lucide-react';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../../utils/csvHelper';
import { extractTextFromPdf, parseAdminRosterFromPdfLines } from '../../utils/pdfHelper';

const SAMPLE_ADMINS_CSV = `First Name,Last Name,Email,Role,Contact,Status
Andres,Bonifacio,andres.bonifacio@viotrack.edu,Super Admin,09171112233,Active
Emilio,Jacinto,emilio.jacinto@viotrack.edu,Discipline Officer,09172223344,Active
Teresa,Magbanua,teresa.magbanua@viotrack.edu,Admin Staff,09173334455,Active`;

const ADMIN_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
];

export const BulkImportAdminsModal = ({ isOpen, onClose, onImported, initialFormat = 'all' }) => {
  const { success, error, info } = useNotification();
  const [activeTab, setActiveTab] = useState(initialFormat === 'pdf' ? 'pdf' : 'csv');
  const [csvText, setCsvText] = useState('');
  const [pdfParsedAdmins, setPdfParsedAdmins] = useState([]);
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
      setPdfParsedAdmins([]);
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

        info(`Parsing admin directory PDF: ${file.name}...`);
        const { rawLines } = await extractTextFromPdf(file);
        const parsed = parseAdminRosterFromPdfLines(rawLines);

        if (parsed.length === 0) {
          error('Could not detect admin rows in this PDF. Please check document formatting.');
        } else {
          const withAvatars = parsed.map((a, i) => ({
            ...a,
            image: ADMIN_AVATARS[i % ADMIN_AVATARS.length]
          }));
          setPdfParsedAdmins(withAvatars);
          success(`Extracted ${withAvatars.length} administrator candidate records from PDF!`);
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
    downloadSampleCsv('Viotrack_Administrators_Template.csv', SAMPLE_ADMINS_CSV);
    success('Downloaded administrator import template CSV!');
  };

  const parsedCsvAdmins = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const rows = parseCsvString(csvText);
      if (rows.length === 0) return [];

      const firstRow = rows[0];
      const hasHeader = firstRow.some(col => 
        ['first name', 'fname', 'name', 'email', 'role', 'admin'].includes(col.toLowerCase().trim())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      return dataRows
        .filter(parts => parts.length >= 2 && parts.some(p => p.trim()))
        .map((parts, i) => {
          const fname = parts[0]?.trim() || 'Admin';
          const lname = parts[1]?.trim() || 'User';
          const email = parts[2]?.trim() || `${fname.toLowerCase()}.${lname.toLowerCase()}@viotrack.edu`;
          const role = parts[3]?.trim() || 'Admin';
          const contact = parts[4]?.trim() || '09171112233';
          const status = parts[5]?.trim() || 'Active';

          return {
            fname,
            lname,
            email,
            role,
            contact,
            status,
            image: ADMIN_AVATARS[i % ADMIN_AVATARS.length]
          };
        });
    } catch {
      return [];
    }
  }, [csvText]);

  const activeCandidateList = fileType === 'pdf' && pdfParsedAdmins.length > 0
    ? pdfParsedAdmins
    : parsedCsvAdmins;

  const handleParseAndUpload = async () => {
    if (activeCandidateList.length === 0) {
      error(`No valid administrator records found in ${fileType.toUpperCase()}.`);
      return;
    }

    setLoading(true);
    try {
      let count = 0;
      for (const a of activeCandidateList) {
        await dataService.addAdmin(a);
        count++;
      }

      success(`Successfully enrolled ${count} administrators from ${fileType.toUpperCase()}!`);
      onImported?.();
      onClose();
      setCsvText('');
      setPdfParsedAdmins([]);
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
      title={`Bulk Administrator Import (${activeTab.toUpperCase()})`}
      icon={ShieldAlert}
      maxWidth="740px"
    >
      <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 22px', maxHeight: '76vh', overflowY: 'auto' }}>
        
        {/* Format Selector Tabs */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-input, #f1f5f9)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-subtle, transparent)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: activeTab === 'csv' ? '1px solid var(--border-medium, #cbd5e1)' : 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: activeTab === 'csv' ? 'var(--bg-surface-elevated, #ffffff)' : 'transparent',
              color: activeTab === 'csv' ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)',
              boxShadow: activeTab === 'csv' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FileSpreadsheet size={15} color={activeTab === 'csv' ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)'} />
            CSV / Spreadsheet File
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: activeTab === 'pdf' ? '1px solid var(--border-medium, #cbd5e1)' : 'none',
              borderRadius: '7px',
              fontSize: '12.5px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              background: activeTab === 'pdf' ? 'var(--bg-surface-elevated, #ffffff)' : 'transparent',
              color: activeTab === 'pdf' ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)',
              boxShadow: activeTab === 'pdf' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <FileType size={15} color={activeTab === 'pdf' ? 'var(--brand-blue, #07345f)' : 'var(--text-muted, #64748b)'} />
            PDF Administrator Document
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
          className="file-dropzone"
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${fileName ? '#22c55e' : 'var(--border-medium, #cbd5e1)'}`,
            borderRadius: '12px',
            padding: '24px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: fileName ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-input, #fafafa)',
            transition: 'all 0.2s'
          }}
        >
          {parsingPdf ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <RefreshCw size={32} color="var(--brand-blue, #07345f)" className="animate-spin" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-blue, #07345f)' }}>Analyzing PDF Admin Document...</div>
            </div>
          ) : fileName ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <FileCheck size={32} color="#16a34a" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>{fileName}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>Click to choose a different file</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <Upload size={28} color="var(--brand-blue, #07345f)" />
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>
                Click to upload {activeTab === 'pdf' ? 'PDF Admin Registry (.pdf)' : 'Admin CSV (.csv)'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                {activeTab === 'pdf' ? 'Supports Administrative Staff rosters and directory PDFs' : 'Standard comma-delimited administrator format'}
              </div>
            </div>
          )}
        </div>

        {/* Template download for CSV */}
        {activeTab === 'csv' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface-elevated, #f8fafc)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary, #475569)' }}>Download standard CSV format with sample admin accounts</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              style={{
                background: 'var(--bg-surface, #ffffff)',
                border: '1px solid var(--border-medium, #cbd5e1)',
                color: 'var(--text-primary, #0f172a)',
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
                Detected Administrator Candidates ({activeCandidateList.length})
              </span>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Ready to Import</span>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Name</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Role</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Email</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCandidateList.map((a, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{a.fname} {a.lname}</td>
                      <td style={{ padding: '6px 10px', color: '#07345f', fontWeight: 700 }}>{a.role}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{a.email}</td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{a.contact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="modal-footer" style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary modal-btn-secondary"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary modal-btn-primary"
            onClick={handleParseAndUpload}
            disabled={loading || activeCandidateList.length === 0}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: loading || activeCandidateList.length === 0 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
            Import {activeCandidateList.length > 0 ? `${activeCandidateList.length} Admins` : 'Roster'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
