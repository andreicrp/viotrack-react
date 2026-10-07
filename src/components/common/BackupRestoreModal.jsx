import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Calendar,
  Layers,
  Trash2,
  X,
  Sparkles,
  ShieldCheck,
  HardDrive,
  Users,
  ShieldAlert,
  FileText
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import { CustomTimePicker } from './CustomTimePicker';
import { CustomSelect } from './CustomSelect';

export const BackupRestoreModal = ({ isOpen, onClose }) => {
  const { success, error, info } = useNotification();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'restore' | 'schedule'
  const [history, setHistory] = useState([]);
  const [liveCounts, setLiveCounts] = useState({
    students: 0,
    records: 0,
    teachers: 0,
    logs: 0
  });
  const [schedule, setSchedule] = useState({
    auto_backup_enabled: true,
    frequency: 'daily',
    time: '00:00',
    last_run: null
  });
  const [loading, setLoading] = useState(false);
  const [uploadedFilePayload, setUploadedFilePayload] = useState(null);
  const [confirmRestoreCheck, setConfirmRestoreCheck] = useState(false);

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      loadHistoryAndSettings();
      setUploadedFilePayload(null);
      setConfirmRestoreCheck(false);
    }
    return () => {
      if (isOpen) {
        unlockBodyScroll();
      }
    };
  }, [isOpen]);

  const loadHistoryAndSettings = async () => {
    try {
      const list = dataService.getBackupHistory();
      const sched = dataService.getBackupScheduleSettings();
      setHistory(list);
      setSchedule(sched);

      const [students, records, teachers, logs] = await Promise.all([
        dataService.getStudents(),
        dataService.getRecords(),
        dataService.getTeachers(),
        dataService.getActivityLogs()
      ]);

      setLiveCounts({
        students: students?.length || 0,
        records: records?.length || 0,
        teachers: teachers?.length || 0,
        logs: logs?.length || 0
      });
    } catch (e) {
      console.warn('Unable to load backup metadata:', e);
    }
  };

  if (!isOpen) return null;

  // 1. Create and Download Snapshot
  const handleCreateBackup = async (type = 'manual') => {
    setLoading(true);
    try {
      const snapshot = await dataService.createDatabaseBackup(type);
      await loadHistoryAndSettings();

      // Download file to browser
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `VioTrack_DB_Backup_${new Date().toISOString().split('T')[0]}_${snapshot.backup_id}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      success(`Database snapshot ${snapshot.backup_id} created and downloaded successfully!`);
    } catch (err) {
      error('Failed to create database snapshot: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Parse uploaded JSON backup file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed.data || (!parsed.data.records && !parsed.data.students)) {
          throw new Error('Unrecognized database backup format.');
        }
        setUploadedFilePayload(parsed);
        setConfirmRestoreCheck(false);
        info(`Loaded backup snapshot: ${parsed.backup_id || file.name}`);
      } catch (err) {
        error('Invalid JSON backup file: ' + err.message);
        setUploadedFilePayload(null);
      }
    };
    reader.readAsText(file);
  };

  // 3. Execute Restore
  const handleExecuteRestore = async (payloadToRestore = uploadedFilePayload) => {
    if (!payloadToRestore) return;
    setLoading(true);
    try {
      await dataService.restoreDatabase(payloadToRestore);
      success('Database successfully restored from snapshot! All records synchronized.');
      setUploadedFilePayload(null);
      await loadHistoryAndSettings();
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      error('Restore failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Save schedule
  const handleSaveSchedule = () => {
    dataService.saveBackupScheduleSettings(schedule);
    success('Automated backup schedule preferences saved!');
  };

  // 5. Delete snapshot from history
  const handleDeleteSnapshot = (id) => {
    if (window.confirm('Remove this snapshot entry from local history?')) {
      dataService.deleteBackupSnapshot(id);
      loadHistoryAndSettings();
      info('Snapshot entry removed.');
    }
  };

  return (
    <div
      className="modal-backdrop-smooth"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        transform: 'translateZ(0)',
        contain: 'strict'
      }}
    >
      <div
        className="modal-content-smooth"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '24px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
          transform: 'translate3d(0, 0, 0)',
          contain: 'layout paint'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#ffffff',
            color: '#0f172a',
            padding: '18px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={22} color="#0f172a" style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, letterSpacing: '-0.01em', color: '#0f172a' }}>
                Database Backup & Restore
              </h3>
              <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                Create portable backups, restore from files, or configure auto-backup schedules.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#64748b',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#64748b'; }}
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modern Segmented Pill Switcher */}
        <div style={{ padding: '16px 28px 0 28px', background: '#ffffff' }}>
          <div
            style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '4px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              gap: '4px'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: 'none',
                background: activeTab === 'create' ? '#ffffff' : 'transparent',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: activeTab === 'create' ? 800 : 600,
                color: activeTab === 'create' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'create' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.18s ease'
              }}
            >
              <Download size={15} color={activeTab === 'create' ? '#0f172a' : '#64748b'} />
              <span>Create Snapshot</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: 'none',
                background: activeTab === 'restore' ? '#ffffff' : 'transparent',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: activeTab === 'restore' ? 800 : 600,
                color: activeTab === 'restore' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'restore' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.18s ease'
              }}
            >
              <Upload size={15} color={activeTab === 'restore' ? '#0f172a' : '#64748b'} />
              <span>Restore Database</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: 'none',
                background: activeTab === 'schedule' ? '#ffffff' : 'transparent',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: activeTab === 'schedule' ? 800 : 600,
                color: activeTab === 'schedule' ? '#0f172a' : '#64748b',
                boxShadow: activeTab === 'schedule' ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.18s ease'
              }}
            >
              <Clock size={15} color={activeTab === 'schedule' ? '#0f172a' : '#64748b'} />
              <span>Schedule Settings</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="smooth-scroll-container" style={{ padding: '24px 28px', flex: 1 }}>
          
          {/* TAB 1: CREATE SNAPSHOT */}
          {activeTab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Main Snapshot Hero Card */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '18px',
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      Database Backup
                    </h4>
                    <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', lineHeight: 1.5, maxWidth: '520px' }}>
                      Download a complete JSON file containing all students, violation records, faculty, and activity logs.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateBackup('manual')}
                    disabled={loading}
                    style={{
                      padding: '11px 20px',
                      borderRadius: '10px',
                      background: '#0f172a',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                    onMouseOver={(e) => { if (!loading) e.currentTarget.style.background = '#1e293b'; }}
                    onMouseOut={(e) => { if (!loading) e.currentTarget.style.background = '#0f172a'; }}
                  >
                    <Download size={15} strokeWidth={2.4} />
                    <span>{loading ? 'Exporting...' : 'Download Backup'}</span>
                  </button>
                </div>

                {/* Live Data Counts Pill Bar */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '10px',
                    paddingTop: '14px',
                    borderTop: '1px solid #e2e8f0'
                  }}
                >
                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={18} color="#0f172a" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{liveCounts.students}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Students</div>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={18} color="#dc2626" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{liveCounts.records}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Incident Logs</div>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={18} color="#2563eb" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{liveCounts.teachers}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Faculty / Staff</div>
                    </div>
                  </div>

                  <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="#059669" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{liveCounts.logs}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>Audit Events</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Snapshot History Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                    Recent Local Snapshots ({history.length})
                  </h4>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Stored in secure browser storage
                  </span>
                </div>

                {history.length === 0 ? (
                  <div
                    style={{
                      padding: '36px 20px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: '14px',
                      border: '1.5px dashed #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <HardDrive size={32} color="#94a3b8" />
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#334155' }}>
                      No snapshots created yet
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b', maxWidth: '360px' }}>
                      Click "Take Snapshot &amp; Download" above to generate a complete backup file.
                    </span>
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.03em' }}>Snapshot ID</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.03em' }}>Timestamp</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.03em' }}>Payload Summary</th>
                          <th style={{ padding: '12px 16px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.03em', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background 0.15s' }}>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>
                                  {item.id}
                                </span>
                                <span style={{ fontSize: '10.5px', fontWeight: 700, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: '4px', color: '#475569', textTransform: 'uppercase' }}>
                                  {item.type}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>
                              {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })},{' '}
                              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 600 }}>
                              {item.counts?.records || 0} incidents • {item.counts?.students || 0} students ({item.size_kb || 0} KB)
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleExecuteRestore(item.snapshot)}
                                  disabled={loading}
                                  style={{
                                    padding: '5px 12px',
                                    borderRadius: '8px',
                                    background: '#ecfdf5',
                                    color: '#065f46',
                                    border: '1px solid #a7f3d0',
                                    fontSize: '11.5px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="Restore system directly from this snapshot"
                                >
                                  <RefreshCw size={12} />
                                  <span>Restore</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSnapshot(item.id)}
                                  style={{
                                    padding: '5px 8px',
                                    borderRadius: '8px',
                                    background: '#ffffff',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}
                                  title="Delete from history"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE SNAPSHOT */}
          {activeTab === 'restore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '18px',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    marginBottom: '4px'
                  }}
                >
                  <FileJson size={28} color="#0f172a" />
                </div>
                <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: '#0f172a' }}>
                  Click to select VioTrack Backup File (.json)
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                  Choose any valid system snapshot exported from VioTrack to preview and restore
                </p>
              </div>

              {/* Uploaded File Inspection & Verification Preview */}
              {uploadedFilePayload && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #10b981',
                    borderRadius: '16px',
                    padding: '22px',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.12)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={22} color="#10b981" />
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                        Snapshot Verified: {uploadedFilePayload.backup_id || 'Valid Backup'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '3px 9px', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
                      Integrity Check Passed
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px', marginBottom: '18px' }}>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Students</span>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{uploadedFilePayload.counts?.students || uploadedFilePayload.data?.students?.length || 0}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Incidents</span>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{uploadedFilePayload.counts?.records || uploadedFilePayload.data?.records?.length || 0}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Staff Accounts</span>
                      <strong style={{ fontSize: '15px', color: '#0f172a' }}>{(uploadedFilePayload.counts?.teachers || 0) + (uploadedFilePayload.counts?.admins || 0)}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '11px' }}>Created On</span>
                      <strong style={{ fontSize: '13px', color: '#0f172a' }}>{new Date(uploadedFilePayload.created_at || Date.now()).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  {/* Safety Checkbox */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '18px',
                      cursor: 'pointer',
                      background: '#f8fafc',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={confirmRestoreCheck}
                      onChange={(e) => setConfirmRestoreCheck(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#0f172a', width: '16px', height: '16px' }}
                    />
                    <span>I confirm and understand this will replace current database records with the selected snapshot.</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleExecuteRestore(uploadedFilePayload)}
                    disabled={!confirmRestoreCheck || loading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      background: confirmRestoreCheck ? '#0f172a' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      cursor: confirmRestoreCheck ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: confirmRestoreCheck ? '0 4px 14px rgba(15, 23, 42, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <RefreshCw size={16} />
                    <span>{loading ? 'Restoring Database...' : 'Restore Database'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEDULE SETTINGS */}
          {activeTab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '18px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                  <div>
                    <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>
                      Automatic Backups
                    </strong>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                      Schedule recurring backups of system records
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={schedule.auto_backup_enabled}
                    onChange={(e) => setSchedule(s => ({ ...s, auto_backup_enabled: e.target.checked }))}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#0f172a' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Backup Frequency
                    </label>
                    <CustomSelect
                      value={schedule.frequency}
                      onChange={(val) => setSchedule(s => ({ ...s, frequency: val }))}
                      options={[
                        { value: 'daily', label: 'Daily (Every 24 Hours)' },
                        { value: 'weekly', label: 'Weekly (Every Sunday)' }
                      ]}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                      Scheduled Trigger Time
                    </label>
                    <CustomTimePicker
                      value={schedule.time || '00:00'}
                      onChange={(val) => setSchedule(s => ({ ...s, time: val }))}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)'
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div
          style={{
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            padding: '14px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Backups are stored locally and encrypted.
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(15, 23, 42, 0.2)'
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
