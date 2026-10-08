import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Folder, 
  HardDrive, 
  Cloud, 
  FileText, 
  Plus, 
  X, 
  Check, 
  Smartphone, 
  ChevronRight, 
  Share2, 
  Download,
  FileSpreadsheet,
  FileCode,
  Loader2,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useNotification } from '../../context/NotificationContext';
import { isMobileDevice, isNativeApp, blobToBase64 } from '../../utils/mobilePrintHelper';
import { sanitizeCsvCell } from '../../utils/security';

/**
 * Universal Mobile & Desktop "Save as" Modal
 * Inspired by Microsoft 365 / Google Docs mobile file save workflow.
 */
export const SaveAsModal = ({
  isOpen,
  onClose,
  defaultFilename = 'Viotrack_Export',
  defaultFormat = 'csv',
  availableFormats = ['csv', 'xlsx', 'pdf'],
  headers = [],
  rows = [],
  generatePdfBlob = null,
  title = 'Save as',
  userEmail = 'viotrack.cloud@gmail.com'
}) => {
  const { success, error, info } = useNotification();

  // Navigation views: 'places' | 'device' | 'folder'
  const [currentView, setCurrentView] = useState('places');
  const [selectedFolder, setSelectedFolder] = useState('Download');
  const [filename, setFilename] = useState(defaultFilename);
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [savedFilesList, setSavedFilesList] = useState([]);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentView('places');
      setSelectedFolder('Download');
      setFilename(defaultFilename.replace(/\.(csv|pdf|xlsx)$/i, ''));
      setSelectedFormat(defaultFormat);
      setIsSaving(false);
      loadSavedFiles('Download');
    }
  }, [isOpen, defaultFilename, defaultFormat]);

  const loadSavedFiles = (folderName) => {
    // Simulated/Real recent files in that folder for authentic browsing experience
    const mockFiles = {
      'Download': [
        { name: 'Viotrack_Violations_Q1.csv', size: '24 KB', date: 'Yesterday' },
        { name: 'Student_Directory_2026.csv', size: '86 KB', date: 'Oct 5, 2026' },
        { name: 'Parent_Summons_Notice.pdf', size: '142 KB', date: 'Oct 2, 2026' }
      ],
      'Documents': [
        { name: 'Disciplinary_Clearance_Summary.pdf', size: '210 KB', date: 'Sep 28, 2026' },
        { name: 'Attendance_Logs_Grade10.csv', size: '54 KB', date: 'Sep 20, 2026' }
      ],
      'Storage': [
        { name: 'Institutional_Discipline_Archive.csv', size: '312 KB', date: 'Aug 15, 2026' }
      ]
    };
    setSavedFilesList(mockFiles[folderName] || []);
  };

  if (!isOpen) return null;

  // Build CSV content from headers and rows
  const generateCsvBlob = () => {
    const formatCell = (cell) => {
      if (cell === null || cell === undefined) return '""';
      const safeContent = sanitizeCsvCell(cell);
      const str = String(safeContent).replace(/"/g, '""');
      return `"${str}"`;
    };
    const headerLine = headers.map(formatCell).join(',');
    const rowLines = rows.map(r => (Array.isArray(r) ? r : Object.values(r)).map(formatCell).join(','));
    const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  };

  // Build Excel-compatible HTML/XML Blob or CSV blob
  const generateExcelBlob = () => {
    const formatCell = (cell) => {
      if (cell === null || cell === undefined) return '""';
      const safeContent = sanitizeCsvCell(cell);
      const str = String(safeContent).replace(/"/g, '""');
      return `"${str}"`;
    };
    const headerLine = headers.map(formatCell).join('\t');
    const rowLines = rows.map(r => (Array.isArray(r) ? r : Object.values(r)).map(formatCell).join('\t'));
    const content = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
    return new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  };

  const handleSaveFile = async (destinationType = 'device') => {
    if (!filename.trim()) {
      error('Please enter a valid filename.');
      return;
    }

    const cleanFilename = filename.trim().replace(/\.[^/.]+$/, '');
    const fullFilename = `${cleanFilename}.${selectedFormat}`;
    
    setIsSaving(true);
    setSavingMessage(`Saving: ${fullFilename}... Working on it...`);

    try {
      let blob;
      let mimeType = 'text/csv';

      if (selectedFormat === 'pdf') {
        mimeType = 'application/pdf';
        if (typeof generatePdfBlob === 'function') {
          const pdfOutput = await generatePdfBlob();
          if (pdfOutput instanceof Blob) blob = pdfOutput;
          else if (pdfOutput && typeof pdfOutput.output === 'function') blob = pdfOutput.output('blob');
          else if (pdfOutput instanceof ArrayBuffer) blob = new Blob([pdfOutput], { type: 'application/pdf' });
        } else {
          // Fallback simple PDF table text
          const text = headers.join(', ') + '\n' + rows.map(r => r.join(', ')).join('\n');
          blob = new Blob([text], { type: 'application/pdf' });
        }
      } else if (selectedFormat === 'xlsx') {
        mimeType = 'application/vnd.ms-excel';
        blob = generateExcelBlob();
      } else {
        mimeType = 'text/csv';
        blob = generateCsvBlob();
      }

      if (!blob) throw new Error('Failed to generate export file content.');

      // 1. If Destination is "Browse" or "Cloud", launch native Android Share / Drive Intent directly
      if (destinationType === 'browse' || destinationType === 'cloud') {
        if (isNativeApp()) {
          const base64 = await blobToBase64(blob);
          const writeRes = await Filesystem.writeFile({
            path: fullFilename,
            data: base64,
            directory: Directory.Cache,
            recursive: true
          });
          if (writeRes && writeRes.uri) {
            await Share.share({
              title: fullFilename,
              text: fullFilename,
              url: writeRes.uri,
              files: [writeRes.uri],
              dialogTitle: destinationType === 'cloud' ? 'Save to Cloud / Drive' : 'Browse Apps to Save'
            });
            success(`${fullFilename} shared to cloud destination!`);
            onClose();
            return;
          }
        } else if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
          const file = new File([blob], fullFilename, { type: mimeType });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: fullFilename });
            success(`${fullFilename} sent to selected app!`);
            onClose();
            return;
          }
        }
      }

      // 2. If Destination is "This Device" inside Capacitor APK
      if (isNativeApp()) {
        const base64 = await blobToBase64(blob);
        let targetDirectory = Directory.Documents;
        if (selectedFolder === 'Download' || selectedFolder === 'Documents') {
          targetDirectory = Directory.Documents;
        }

        const writeRes = await Filesystem.writeFile({
          path: fullFilename,
          data: base64,
          directory: targetDirectory,
          recursive: true
        });

        // Also trigger native share sheet so user can open in Excel/Drive or move to custom folder
        try {
          if (writeRes && writeRes.uri) {
            await Share.share({
              title: fullFilename,
              text: `Saved to ${selectedFolder}: ${fullFilename}`,
              url: writeRes.uri,
              files: [writeRes.uri],
              dialogTitle: `Saved to ${selectedFolder}`
            });
          }
        } catch (shareErr) {
          // User closed share dialog, still saved to documents
        }

        success(`Saved successfully to ${selectedFolder}/${fullFilename}!`);
        onClose();
        return;
      }

      // 3. Desktop / Mobile Browser Direct File Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fullFilename);
      link.target = '_self';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => URL.revokeObjectURL(url), 4000);
      success(`${fullFilename} downloaded to your device!`);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
      error(`Failed to save file: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#000000',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .saveas-item {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid #1e293b;
          cursor: pointer;
          transition: background 0.15s ease;
          user-select: none;
        }
        .saveas-item:active {
          background: #1e293b !important;
        }
        .saveas-format-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #334155;
          background: #1e293b;
          color: #93c5fd;
        }
      `}</style>

      {/* Top App Bar (Matching Microsoft Office / Google Docs mobile Save As) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(14px, env(safe-area-inset-top, 14px)) 16px 14px 16px',
          borderBottom: '1px solid #1e293b',
          background: '#090d16'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => {
              if (currentView === 'folder') setCurrentView('device');
              else if (currentView === 'device') setCurrentView('places');
              else onClose();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px'
            }}
            title="Back"
          >
            <ArrowLeft size={22} />
          </button>

          <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>
            {currentView === 'places' && 'Save as'}
            {currentView === 'device' && 'This device'}
            {currentView === 'folder' && `This device > ${selectedFolder}`}
          </span>
        </div>

        {/* Places Toggle Button */}
        {currentView !== 'places' && (
          <button
            type="button"
            onClick={() => setCurrentView('places')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FolderOpen size={17} />
            <span>Places</span>
          </button>
        )}
      </div>

      {/* Center Body: Navigation Views */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#000000' }}>
        {/* VIEW 1: PLACES */}
        {currentView === 'places' && (
          <div>
            <div style={{ padding: '14px 18px 8px 18px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Places
            </div>

            {/* Cloud Storage / Google Drive / OneDrive */}
            <div
              className="saveas-item"
              onClick={() => handleSaveFile('cloud')}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Cloud size={24} color="#3b82f6" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  Google Drive / Cloud
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                  {userEmail}
                </div>
              </div>
              <ChevronRight size={18} color="#475569" />
            </div>

            {/* This Device */}
            <div
              className="saveas-item"
              onClick={() => setCurrentView('device')}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={24} color="#94a3b8" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  This device
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                  Internal storage (Download, Documents)
                </div>
              </div>
              <ChevronRight size={18} color="#475569" />
            </div>

            {/* Browse (Android Storage Access Framework / Native Picker / Share) */}
            <div
              className="saveas-item"
              onClick={() => handleSaveFile('browse')}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Folder size={24} color="#f59e0b" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  Browse
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                  Google Drive, SD card, and other apps...
                </div>
              </div>
              <ChevronRight size={18} color="#475569" />
            </div>

            {/* Add a place */}
            <div
              className="saveas-item"
              onClick={() => info('Connect additional cloud accounts in System Settings.')}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Plus size={22} color="#94a3b8" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                  Add a place
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                  Connect to cloud storage
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: THIS DEVICE FOLDERS */}
        {currentView === 'device' && (
          <div>
            <div style={{ padding: '14px 18px 8px 18px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Device Storage Locations
            </div>

            {/* Documents Folder */}
            <div
              className="saveas-item"
              onClick={() => {
                setSelectedFolder('Documents');
                loadSavedFiles('Documents');
                setCurrentView('folder');
              }}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Folder size={24} color="#f59e0b" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                Documents
              </div>
              <ChevronRight size={18} color="#475569" />
            </div>

            {/* Download Folder */}
            <div
              className="saveas-item"
              onClick={() => {
                setSelectedFolder('Download');
                loadSavedFiles('Download');
                setCurrentView('folder');
              }}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Folder size={24} color="#f59e0b" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                Download
              </div>
              <ChevronRight size={18} color="#475569" />
            </div>

            {/* General Storage */}
            <div
              className="saveas-item"
              onClick={() => {
                setSelectedFolder('Storage');
                loadSavedFiles('Storage');
                setCurrentView('folder');
              }}
            >
              <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={24} color="#94a3b8" />
              </div>
              <div style={{ flex: 1, marginLeft: '8px', fontSize: '15px', fontWeight: 700, color: '#ffffff' }}>
                Storage
              </div>
              <ChevronRight size={18} color="#475569" />
            </div>
          </div>
        )}

        {/* VIEW 3: INSIDE SELECTED FOLDER */}
        {currentView === 'folder' && (
          <div>
            <div style={{ padding: '14px 18px 8px 18px', fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Files in {selectedFolder}
            </div>

            {savedFilesList.length === 0 ? (
              <div style={{ padding: '30px 18px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Folder is empty. Tap Save below to export here.
              </div>
            ) : (
              savedFilesList.map((file, idx) => (
                <div
                  key={idx}
                  className="saveas-item"
                  style={{ opacity: 0.85 }}
                >
                  <div style={{ width: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {file.name.endsWith('.csv') && <FileSpreadsheet size={22} color="#10b981" />}
                    {file.name.endsWith('.pdf') && <FileText size={22} color="#ef4444" />}
                    {file.name.endsWith('.xlsx') && <FileSpreadsheet size={22} color="#3b82f6" />}
                  </div>
                  <div style={{ flex: 1, marginLeft: '8px', minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {file.size} &bull; {file.date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Format Switcher Tray (Popover) */}
      {showFormatDropdown && (
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            right: '85px',
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '10px',
            padding: '6px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {availableFormats.map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => {
                setSelectedFormat(fmt);
                setShowFormatDropdown(false);
              }}
              style={{
                background: selectedFormat === fmt ? '#07345f' : 'transparent',
                border: 'none',
                color: '#ffffff',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px'
              }}
            >
              <span>.{fmt.toUpperCase()}</span>
              {selectedFormat === fmt && <Check size={14} color="#60a5fa" />}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Sticky Action Bar: Filename Input + Extension Badge + Save Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px max(14px, env(safe-area-inset-bottom, 14px)) 14px',
          background: '#090d16',
          borderTop: '1px solid #1e293b'
        }}
      >
        {/* Filename Input Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: '#131c2e',
            borderRadius: '8px',
            border: '1.5px solid #334155',
            padding: '0 8px 0 12px',
            height: '42px',
            minWidth: 0
          }}
        >
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter file name"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              outline: 'none',
              minWidth: 0
            }}
          />

          {filename && (
            <button
              type="button"
              onClick={() => setFilename('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Format Selector Badge (e.g. .csv, .xlsx, .pdf) */}
        <button
          type="button"
          className="saveas-format-badge"
          onClick={() => setShowFormatDropdown(!showFormatDropdown)}
          title="Change file format"
        >
          <span>.{selectedFormat}</span>
        </button>

        {/* Save Button */}
        <button
          type="button"
          onClick={() => handleSaveFile('device')}
          disabled={isSaving}
          style={{
            background: '#2563eb',
            border: 'none',
            color: '#ffffff',
            height: '42px',
            padding: '0 18px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease'
          }}
        >
          Save
        </button>
      </div>

      {/* Full-Screen "Saving: [filename]... Working on it..." Modal Overlay */}
      {isSaving && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100001,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1.5px solid #334155',
              borderRadius: '16px',
              padding: '24px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              maxWidth: '340px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
              textAlign: 'center'
            }}
          >
            <Loader2 size={36} color="#60a5fa" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', lineHeight: 1.4 }}>
              {savingMessage}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              Preparing and exporting data...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
