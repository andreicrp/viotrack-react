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
  FolderOpen,
  Image as ImageIcon,
  Music as MusicIcon,
  Video as VideoIcon,
  File as GenericFileIcon
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { isMobileDevice, isNativeApp, blobToBase64 } from '../../utils/mobilePrintHelper';
import { sanitizeCsvCell } from '../../utils/security';

/**
 * Universal Mobile & Desktop "Save as" Modal (Light Mode Theme)
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
  userEmail
}) => {
  const { user } = useAuth() || {};
  const activeUserEmail = userEmail || user?.email || 'viotrack.cloud@gmail.com';
  const { success, error, info } = useNotification();

  // Navigation views: 'places' | 'device' | 'folder'
  const [currentView, setCurrentView] = useState('places');
  const [selectedFolder, setSelectedFolder] = useState('Documents');
  const [filename, setFilename] = useState(defaultFilename);
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [savedFilesList, setSavedFilesList] = useState([]);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      // 1. If on Website / Desktop Browser -> Auto download immediately and close without showing modal
      if (!isNativeApp() && !isMobileDevice()) {
        const executeWebDownload = async () => {
          try {
            const cleanFilename = (defaultFilename || 'Viotrack_Export').replace(/\.(csv|pdf|xlsx)$/i, '').trim();
            const format = defaultFormat || 'csv';
            const fullFilename = `${cleanFilename}.${format}`;
            let blob;

            if (format === 'pdf') {
              if (typeof generatePdfBlob === 'function') {
                const pdfOutput = await generatePdfBlob();
                if (pdfOutput instanceof Blob) blob = pdfOutput;
                else if (pdfOutput && typeof pdfOutput.output === 'function') blob = pdfOutput.output('blob');
                else if (pdfOutput instanceof ArrayBuffer) blob = new Blob([pdfOutput], { type: 'application/pdf' });
              } else {
                const text = headers.join(', ') + '\n' + rows.map(r => (Array.isArray(r) ? r : Object.values(r)).join(', ')).join('\n');
                blob = new Blob([text], { type: 'application/pdf' });
              }
            } else if (format === 'xlsx') {
              blob = generateExcelBlob();
            } else {
              blob = generateCsvBlob();
            }

            if (blob) {
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', fullFilename);
              link.target = '_self';
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              success(`Downloaded ${fullFilename}`);
            }
          } catch (err) {
            console.error('Web auto-download error:', err);
            error('Failed to download export file.');
          } finally {
            onClose();
          }
        };

        executeWebDownload();
        return;
      }

      // 2. Mobile / APK workflow -> Initialize mobile modal view
      setCurrentView('places');
      setSelectedFolder('Documents');
      setFilename(defaultFilename.replace(/\.(csv|pdf|xlsx)$/i, ''));
      setSelectedFormat(defaultFormat);
      setIsSaving(false);
      loadSavedFiles('Documents');
    }
  }, [isOpen, defaultFilename, defaultFormat]);

  const loadSavedFiles = async (folderName = 'Documents') => {
    if (isNativeApp()) {
      try {
        let res = null;

        if (folderName === 'Storage') {
          try {
            res = await Filesystem.readdir({
              path: '',
              directory: Directory.ExternalStorage
            });
          } catch (e) {
            console.warn('Read Storage failed:', e);
          }
        } else if (folderName === 'Download' || folderName === 'Downloads') {
          try {
            res = await Filesystem.readdir({
              path: 'Download',
              directory: Directory.ExternalStorage
            });
          } catch (e1) {
            try {
              res = await Filesystem.readdir({
                path: 'Downloads',
                directory: Directory.ExternalStorage
              });
            } catch (e2) {
              console.warn('Read Download failed:', e2);
            }
          }
        } else if (folderName === 'Documents') {
          try {
            res = await Filesystem.readdir({
              path: '',
              directory: Directory.Documents
            });
          } catch (e1) {
            try {
              res = await Filesystem.readdir({
                path: 'Documents',
                directory: Directory.ExternalStorage
              });
            } catch (e2) {
              console.warn('Read Documents failed:', e2);
            }
          }
        } else {
          // Navigating into a specific subfolder (e.g., DCIM, Pictures, CapCut)
          try {
            res = await Filesystem.readdir({
              path: folderName,
              directory: Directory.ExternalStorage
            });
          } catch (e) {
            console.warn(`Read subfolder ${folderName} failed:`, e);
          }
        }

        if (res && res.files) {
          const fileItems = res.files
            .map(f => {
              const name = typeof f === 'string' ? f : (f.name || '');
              const type = typeof f === 'object' && f.type ? f.type : (!name.includes('.') ? 'directory' : 'file');
              const isDir = type === 'directory' || !name.includes('.');
              const size = typeof f === 'object' && f.size ? `${(f.size / 1024).toFixed(0)} KB` : (isDir ? 'Folder' : '');
              const mtime = typeof f === 'object' && f.mtime 
                ? new Date(f.mtime).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) 
                : '';
              return { name, size, date: mtime, isDirectory: isDir };
            })
            .filter(f => f.name && !f.name.startsWith('.'));

          setSavedFilesList(fileItems);
          return;
        }
      } catch (err) {
        console.warn('Real device readdir attempt:', err);
      }
    }
    
    // Only real files from device storage — no mock lists
    setSavedFilesList([]);
  };

  // Helper to determine icon & badge color for any file/folder type
  const getFileBadgeMeta = (file) => {
    const name = (file?.name || '').toLowerCase();
    const isDir = file?.isDirectory || !name.includes('.');

    if (isDir) {
      if (name.includes('music') || name.includes('audio') || name.includes('ringtone') || name.includes('notification')) {
        return { bg: '#eff6ff', icon: <MusicIcon size={22} color="#2563eb" />, isDir: true };
      }
      if (name.includes('picture') || name.includes('dcim') || name.includes('photo') || name.includes('image')) {
        return { bg: '#faf5ff', icon: <ImageIcon size={22} color="#9333ea" />, isDir: true };
      }
      if (name.includes('movie') || name.includes('video')) {
        return { bg: '#fff1f2', icon: <VideoIcon size={22} color="#e11d48" />, isDir: true };
      }
      return { bg: '#fef3c7', icon: <Folder size={22} color="#d97706" />, isDir: true };
    }

    if (name.endsWith('.pdf')) {
      return { bg: '#fef2f2', icon: <FileText size={22} color="#dc2626" />, isDir: false };
    }
    if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return { bg: '#f0fdf4', icon: <FileSpreadsheet size={22} color="#16a34a" />, isDir: false };
    }
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp') || name.endsWith('.svg')) {
      return { bg: '#faf5ff', icon: <ImageIcon size={22} color="#9333ea" />, isDir: false };
    }
    if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.ogg') || name.endsWith('.m4a')) {
      return { bg: '#eff6ff', icon: <MusicIcon size={22} color="#2563eb" />, isDir: false };
    }
    if (name.endsWith('.mp4') || name.endsWith('.mkv') || name.endsWith('.mov')) {
      return { bg: '#fff1f2', icon: <VideoIcon size={22} color="#e11d48" />, isDir: false };
    }

    return { bg: '#f1f5f9', icon: <GenericFileIcon size={22} color="#475569" />, isDir: false };
  };

  if (!isOpen || (!isNativeApp() && !isMobileDevice())) return null;

  const handleSaveFile = async (destinationType = 'device') => {
    if (!filename.trim()) {
      error('Please enter a valid filename.');
      return;
    }

    const cleanFilename = filename.trim().replace(/\.[^/.]+$/, '');
    const fullFilename = `${cleanFilename}.${selectedFormat}`;
    
    setIsSaving(true);
    setSavingMessage(`Saving to ${selectedFolder || 'Device'}: ${fullFilename}...`);

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
            success(`${fullFilename} saved to cloud destination!`);
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

      // 2. If Destination is "This Device" inside Capacitor APK -> Directly save to device storage without sharing dialog
      if (isNativeApp()) {
        // Explicitly check & request Android storage permissions
        try {
          const permStatus = await Filesystem.checkPermissions();
          if (permStatus.publicStorage !== 'granted') {
            await Filesystem.requestPermissions();
          }
        } catch (permErr) {
          console.warn('Filesystem permission request:', permErr);
        }

        const base64 = await blobToBase64(blob);
        let targetDir = Directory.Documents;
        let filePath = fullFilename;
        let savedLocationName = selectedFolder || 'Documents';

        if (selectedFolder === 'Download' || selectedFolder === 'Downloads') {
          targetDir = Directory.ExternalStorage;
          filePath = `Download/${fullFilename}`;
          savedLocationName = 'Download';
        } else if (selectedFolder === 'Storage') {
          targetDir = Directory.ExternalStorage;
          filePath = fullFilename;
          savedLocationName = 'Storage';
        } else if (selectedFolder === 'Documents') {
          targetDir = Directory.Documents;
          filePath = fullFilename;
          savedLocationName = 'Documents';
        } else if (selectedFolder) {
          targetDir = Directory.ExternalStorage;
          filePath = `${selectedFolder}/${fullFilename}`;
          savedLocationName = selectedFolder;
        }

        try {
          await Filesystem.writeFile({
            path: filePath,
            data: base64,
            directory: targetDir,
            recursive: true
          });
        } catch (targetWriteErr) {
          console.warn(`Write to ${savedLocationName} failed:`, targetWriteErr);
          // Fallback to Documents
          try {
            await Filesystem.writeFile({
              path: fullFilename,
              data: base64,
              directory: Directory.Documents,
              recursive: true
            });
            savedLocationName = 'Documents';
          } catch (docErr) {
            // Fallback to Data directory
            await Filesystem.writeFile({
              path: fullFilename,
              data: base64,
              directory: Directory.Data,
              recursive: true
            });
            savedLocationName = 'Internal Storage';
          }
        }

        success(`Saved directly to device: ${savedLocationName}/${fullFilename}`);
        await loadSavedFiles(selectedFolder);
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
        background: '#ffffff',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.99); }
          to { opacity: 1; transform: scale(1); }
        }
        .saveas-item-light {
          display: flex;
          align-items: center;
          padding: 15px 20px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.15s ease;
          user-select: none;
          background: #ffffff;
        }
        .saveas-item-light:hover {
          background: #f8fafc;
        }
        .saveas-item-light:active {
          background: #f1f5f9 !important;
        }
        .saveas-format-badge-light {
          padding: 6px 13px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1.5px solid #cbd5e1;
          background: #f8fafc;
          color: #1d4ed8;
          transition: all 0.15s ease;
        }
        .saveas-format-badge-light:hover {
          background: #eff6ff;
          border-color: #93c5fd;
        }
        .saveas-input-box {
          flex: 1;
          display: flex;
          align-items: center;
          background: #ffffff;
          border-radius: 8px;
          border: 1.5px solid #cbd5e1;
          padding: 0 8px 0 12px;
          height: 42px;
          min-width: 0;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
          transition: border-color 0.15s ease;
        }
        .saveas-input-box:focus-within {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
        }
      `}</style>

      {/* Top App Bar (Light Mode Header) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'max(14px, env(safe-area-inset-top, 14px)) 16px 14px 16px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              color: '#0f172a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: '8px'
            }}
            title="Back"
          >
            <ArrowLeft size={22} color="#0f172a" />
          </button>

          <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
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
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: '8px'
            }}
          >
            <FolderOpen size={16} color="#475569" />
            <span>Places</span>
          </button>
        )}
      </div>

      {/* Center Body: Navigation Views */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
        {/* VIEW 1: PLACES */}
        {currentView === 'places' && (
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '10px 0' }}>
            <div style={{ padding: '14px 20px 8px 20px', fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Places
            </div>

            <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              {/* Cloud Storage / Google Drive / OneDrive */}
              <div
                className="saveas-item-light"
                onClick={() => handleSaveFile('cloud')}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Cloud size={22} color="#2563eb" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Google Drive / Cloud
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                    {activeUserEmail}
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* This Device */}
              <div
                className="saveas-item-light"
                onClick={() => setCurrentView('device')}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Smartphone size={22} color="#475569" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    This device
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                    Internal storage (Download, Documents)
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Browse (Android Storage Access Framework / Native Picker / Share) */}
              <div
                className="saveas-item-light"
                onClick={() => handleSaveFile('browse')}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Folder size={22} color="#d97706" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Browse
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                    Google Drive, SD card, and other apps...
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Add a place */}
              <div
                className="saveas-item-light"
                style={{ borderBottom: 'none' }}
                onClick={() => info('Connect additional cloud accounts in System Settings.')}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Plus size={22} color="#2563eb" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                    Add a place
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '1px' }}>
                    Connect to cloud storage
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: THIS DEVICE FOLDERS */}
        {currentView === 'device' && (
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '10px 0' }}>
            <div style={{ padding: '14px 20px 8px 20px', fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Device Storage Locations
            </div>

            <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              {/* Documents Folder */}
              <div
                className="saveas-item-light"
                onClick={() => {
                  setSelectedFolder('Documents');
                  loadSavedFiles('Documents');
                  setCurrentView('folder');
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Folder size={22} color="#d97706" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Documents
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Download Folder */}
              <div
                className="saveas-item-light"
                onClick={() => {
                  setSelectedFolder('Download');
                  loadSavedFiles('Download');
                  setCurrentView('folder');
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Folder size={22} color="#d97706" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Download
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* General Storage */}
              <div
                className="saveas-item-light"
                style={{ borderBottom: 'none' }}
                onClick={() => {
                  setSelectedFolder('Storage');
                  loadSavedFiles('Storage');
                  setCurrentView('folder');
                }}
              >
                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <HardDrive size={22} color="#475569" />
                </div>
                <div style={{ flex: 1, marginLeft: '12px', fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                  Storage
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: INSIDE SELECTED FOLDER */}
        {currentView === 'folder' && (
          <div style={{ maxWidth: '720px', margin: '0 auto', padding: '10px 0' }}>
            <div style={{ padding: '14px 20px 8px 20px', fontSize: '11.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Files in {selectedFolder}
            </div>

            <div style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
              {savedFilesList.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  Folder is empty. Tap <b>Save</b> below to export file directly here.
                </div>
              ) : (
                savedFilesList.map((file, idx) => {
                  const meta = getFileBadgeMeta(file);
                  return (
                    <div
                      key={idx}
                      className="saveas-item-light"
                      style={{ 
                        borderBottom: idx === savedFilesList.length - 1 ? 'none' : '1px solid #f1f5f9',
                        cursor: meta.isDir ? 'pointer' : 'default'
                      }}
                      onClick={() => {
                        if (meta.isDir) {
                          setSelectedFolder(file.name);
                          loadSavedFiles(file.name);
                        }
                      }}
                    >
                      <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '8px', 
                        background: meta.bg, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        flexShrink: 0 
                      }}>
                        {meta.icon}
                      </div>
                      <div style={{ flex: 1, marginLeft: '12px', minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          {file.size ? `${file.size} \u2022 ` : ''}{file.date || (meta.isDir ? 'Directory' : 'File')}
                        </div>
                      </div>
                      {meta.isDir && (
                        <ChevronRight size={18} color="#94a3b8" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Format Switcher Tray (Light Mode Popover) */}
      {showFormatDropdown && (
        <div
          style={{
            position: 'absolute',
            bottom: '75px',
            right: '90px',
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '12px',
            padding: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
            zIndex: 100000,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '120px'
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
                background: selectedFormat === fmt ? '#eff6ff' : 'transparent',
                border: 'none',
                color: selectedFormat === fmt ? '#1d4ed8' : '#0f172a',
                padding: '9px 14px',
                borderRadius: '8px',
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
              {selectedFormat === fmt && <Check size={15} color="#2563eb" strokeWidth={2.5} />}
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
          padding: '12px 16px max(16px, env(safe-area-inset-bottom, 16px)) 16px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* Filename Input Container */}
        <div className="saveas-input-box">
          <input
            type="text"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="Enter file name"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#0f172a',
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
                color: '#94a3b8',
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
          className="saveas-format-badge-light"
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
            padding: '0 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
            transition: 'background 0.15s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
          onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
        >
          Save
        </button>
      </div>

      {/* Full-Screen "Saving: [filename]... Working on it..." Light Modal Overlay */}
      {isSaving && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 100001,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '28px 32px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              maxWidth: '340px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
              textAlign: 'center'
            }}
          >
            <Loader2 size={38} color="#2563eb" className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
              {savingMessage}
            </div>
            <div style={{ fontSize: '12.5px', color: '#64748b' }}>
              Preparing and exporting file data...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
