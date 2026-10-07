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
  AlertTriangle
} from 'lucide-react';
import { parseCsvString, readFileAsText, downloadSampleCsv } from '../../utils/csvHelper';
import { extractTextFromPdf, parseViolationRosterFromPdfLines } from '../../utils/pdfHelper';

const SAMPLE_VIOLATIONS_CSV = `Title,Type,Description,Default Sanction
Cheating during exams,Major,Dishonesty during examinations or academic submissions.,Parent Summon & Written Reprimand
Vandalism of school property,Major,Defacing walls, desks, or university facilities.,Parent Summon & Community Service
Uniform not worn properly,Minor,Student did not follow the required uniform guidelines.,Verbal Warning & Counseling
Tardiness / Late to class,Minor,Arriving at class after the designated grace period.,Verbal Warning & Student Reflection`;

export const BulkImportViolationsModal = ({ isOpen, onClose, onImported, initialFormat = 'all' }) => {
  const { success, error, info } = useNotification();
  const [activeTab, setActiveTab] = useState(initialFormat === 'pdf' ? 'pdf' : 'csv');
  const [csvText, setCsvText] = useState('');
  const [pdfParsedViolations, setPdfParsedViolations] = useState([]);
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
      setPdfParsedViolations([]);
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

        info(`Parsing violation policy PDF: ${file.name}...`);
        const { rawLines } = await extractTextFromPdf(file);
        const parsed = parseViolationRosterFromPdfLines(rawLines);

        if (parsed.length === 0) {
          error('Could not detect violation catalog rows in this PDF. Please check document formatting.');
        } else {
          setPdfParsedViolations(parsed);
          success(`Extracted ${parsed.length} violation policy entries from PDF!`);
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
    downloadSampleCsv('Viotrack_Violation_Types_Template.csv', SAMPLE_VIOLATIONS_CSV);
    success('Downloaded violation types import template CSV!');
  };

  const parsedCsvViolations = useMemo(() => {
    if (!csvText.trim()) return [];
    try {
      const rows = parseCsvString(csvText);
      if (rows.length === 0) return [];

      const firstRow = rows[0];
      const hasHeader = firstRow.some(col => 
        ['title', 'type', 'severity', 'description', 'sanction', 'violation'].includes(col.toLowerCase().trim())
      );
      const dataRows = hasHeader ? rows.slice(1) : rows;

      return dataRows
        .filter(parts => parts.length >= 2 && parts.some(p => p.trim()))
        .map(parts => {
          const title = parts[0]?.trim() || 'General Infraction';
          const type = (parts[1]?.trim()?.toLowerCase() === 'major' || parts[1]?.trim()?.toLowerCase() === 'critical') ? 'Major' : 'Minor';
          const description = parts[2]?.trim() || `Infraction classified under ${type} violation policy.`;
          const default_sanction = parts[3]?.trim() || (type === 'Major' ? 'Parent Summon & Written Reprimand' : 'Verbal Warning & Counseling');

          return {
            title,
            type,
            description,
            default_sanction
          };
        });
    } catch {
      return [];
    }
  }, [csvText]);

  const activeCandidateList = fileType === 'pdf' && pdfParsedViolations.length > 0
    ? pdfParsedViolations
    : parsedCsvViolations;

  const handleParseAndUpload = async () => {
    if (activeCandidateList.length === 0) {
      error(`No valid violation entries found in ${fileType.toUpperCase()}.`);
      return;
    }

    setLoading(true);
    try {
      let count = 0;
      for (const v of activeCandidateList) {
        await dataService.addViolationType(v);
        count++;
      }

      success(`Successfully enrolled ${count} violation types from ${fileType.toUpperCase()}!`);
      onImported?.();
      onClose();
      setCsvText('');
      setPdfParsedViolations([]);
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
      title={`Bulk Violation Policy Import (${activeTab.toUpperCase()})`}
      icon={AlertTriangle}
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
            PDF Student Handbook / Policy Document
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
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#07345f' }}>Analyzing PDF Policy Document...</div>
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
                Click to upload {activeTab === 'pdf' ? 'PDF Violation Policy Catalog (.pdf)' : 'Violation Types CSV (.csv)'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {activeTab === 'pdf' ? 'Extracts infraction rules and disciplinary matrices from PDF handbook' : 'Standard comma-delimited violation catalog format'}
              </div>
            </div>
          )}
        </div>

        {/* Template download for CSV */}
        {activeTab === 'csv' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>Download standard CSV format with sample infractions</span>
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
                Detected Violation Rules ({activeCandidateList.length})
              </span>
              <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>Ready to Import</span>
            </div>
            <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Title</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Severity</th>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: '#475569' }}>Default Sanction</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCandidateList.map((v, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{v.title}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: v.type === 'Major' ? '#fee2e2' : '#fef3c7',
                          color: v.type === 'Major' ? '#dc2626' : '#d97706'
                        }}>
                          {v.type}
                        </span>
                      </td>
                      <td style={{ padding: '6px 10px', color: '#475569' }}>{v.default_sanction}</td>
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
            Import {activeCandidateList.length > 0 ? `${activeCandidateList.length} Violations` : 'Catalog'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
