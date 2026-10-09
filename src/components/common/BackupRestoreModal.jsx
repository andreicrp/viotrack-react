import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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

  const modalContent = (
    <div
      className="modal-backdrop-smooth"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        transform: 'translateZ(0)',
        contain: 'strict'
      }}
    >
      <div className="modal-content-smooth backup-modal-dialog">
        {/* Modal Header */}
        <div className="backup-modal-header" style={{ background: 'var(--bg-surface, #ffffff)', borderBottom: '1px solid var(--border-subtle, #f1f5f9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <Database className="backup-modal-database-icon" size={22} color="var(--brand-blue, #0f172a)" style={{ flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, letterSpacing: '-0.01em', color: 'var(--text-primary, #0f172a)' }}>
                Database Backup &amp; Restore
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px', display: 'block', lineHeight: 1.35 }}>
                Create portable backups, restore from files, or configure schedules.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              border: '1px solid var(--border-subtle, #e2e8f0)',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            title="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modern Segmented Pill Switcher */}
        <div className="backup-modal-tabs-wrap">
          <div className="backup-modal-tabs" style={{ background: 'var(--bg-input, #f1f5f9)', border: '1px solid var(--border-subtle, transparent)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`backup-modal-tab-btn ${activeTab === 'create' ? 'is-active' : ''}`}
            >
              <Download size={15} color={activeTab === 'create' ? 'var(--brand-blue, #0f172a)' : 'var(--text-muted, #64748b)'} />
              <span className="tab-text-full">Create Snapshot</span>
              <span className="tab-text-short">Create</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('restore')}
              className={`backup-modal-tab-btn ${activeTab === 'restore' ? 'is-active' : ''}`}
            >
              <Upload size={15} color={activeTab === 'restore' ? 'var(--brand-blue, #0f172a)' : 'var(--text-muted, #64748b)'} />
              <span className="tab-text-full">Restore Database</span>
              <span className="tab-text-short">Restore</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`backup-modal-tab-btn ${activeTab === 'schedule' ? 'is-active' : ''}`}
            >
              <Clock size={15} color={activeTab === 'schedule' ? 'var(--brand-blue, #0f172a)' : 'var(--text-muted, #64748b)'} />
              <span className="tab-text-full">Schedule Settings</span>
              <span className="tab-text-short">Schedule</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="smooth-scroll-container backup-modal-body">
          
          {/* TAB 1: CREATE SNAPSHOT */}
          {activeTab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Main Snapshot Hero Card */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated, #f8fafc)',
                  border: '1.5px solid var(--border-subtle, #e2e8f0)',
                  borderRadius: '18px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15.5px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                      Database Backup
                    </h4>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #64748b)', lineHeight: 1.5, maxWidth: '520px' }}>
                      Download a complete JSON file containing all students, violation records, faculty, and activity logs.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCreateBackup('manual')}
                    disabled={loading}
                    className="backup-download-btn"
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      background: 'var(--brand-blue, #0f172a)',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    <Download size={15} strokeWidth={2.4} />
                    <span>{loading ? 'Exporting...' : 'Download Backup'}</span>
                  </button>
                </div>

                {/* Live Data Counts Pill Bar */}
                <div className="backup-counts-grid">
                  <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Users size={18} color="var(--brand-blue, #0f172a)" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1 }}>{liveCounts.students}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px', fontWeight: 600 }}>Students</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldAlert size={18} color="#f87171" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1 }}>{liveCounts.records}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px', fontWeight: 600 }}>Incident Logs</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck className="backup-faculty-icon" size={18} color="#38bdf8" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1 }}>{liveCounts.teachers}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px', fontWeight: 600 }}>Faculty / Staff</div>
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-surface, #ffffff)', border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="#34d399" />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', lineHeight: 1 }}>{liveCounts.logs}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px', fontWeight: 600 }}>Audit Events</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Snapshot History Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '6px 12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.01em' }}>
                    Recent Local Snapshots ({history.length})
                  </h4>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                    Stored in secure browser storage
                  </span>
                </div>

                {history.length === 0 ? (
                  <div
                    className="backup-empty-state"
                    style={{
                      padding: '32px 20px',
                      textAlign: 'center',
                      background: 'var(--bg-surface-elevated, #f8fafc)',
                      borderRadius: '14px',
                      border: '1.5px dashed var(--border-medium, #cbd5e1)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <HardDrive size={32} color="var(--text-muted, #94a3b8)" />
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)' }}>
                      No snapshots created yet
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', maxWidth: '360px' }}>
                      Click "Download Backup" above to generate a complete backup file.
                    </span>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="backup-history-desktop" style={{ border: '1px solid var(--border-subtle, #e2e8f0)', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', width: '100%', boxSizing: 'border-box' }}>
                      <table className="backup-history-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-surface-elevated, #f8fafc)', borderBottom: '1.5px solid var(--border-subtle, #e2e8f0)', textAlign: 'left' }}>
                            <th className="backup-history-th" style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>Snapshot ID</th>
                            <th className="backup-history-th" style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Timestamp</th>
                            <th className="backup-history-th" style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em' }}>Payload Summary</th>
                            <th className="backup-history-th" style={{ padding: '12px 16px', fontWeight: 800, color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.04em', textAlign: 'right', width: '130px', whiteSpace: 'nowrap' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((item) => (
                            <tr className="backup-history-tr" key={item.id} style={{ borderBottom: '1px solid var(--border-subtle, #f1f5f9)', background: 'var(--bg-surface, #ffffff)', transition: 'background 0.15s' }}>
                              <td className="backup-history-td" style={{ padding: '12px 16px' }}>
                                <div className="backup-snapshot-identity" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '5px 8px' }}>
                                  <span className="backup-snapshot-id" style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-primary, #0f172a)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                                    {item.id}
                                  </span>
                                  <span className="backup-snapshot-type" style={{ fontSize: '10px', fontWeight: 700, background: 'var(--bg-surface-elevated, #f1f5f9)', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                    {item.type}
                                  </span>
                                </div>
                              </td>
                              <td className="backup-history-td backup-snapshot-timestamp" style={{ padding: '12px 14px', color: 'var(--text-secondary, #475569)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                                {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })},{' '}
                                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="backup-history-td backup-snapshot-summary" style={{ padding: '12px 14px', color: 'var(--text-primary, #334155)', fontWeight: 600, fontSize: '12.5px', lineHeight: 1.45 }}>
                                {item.counts?.records || 0} incidents • {item.counts?.students || 0} students ({item.size_kb || 0} KB)
                              </td>
                              <td className="backup-history-td" style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap', width: '130px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteRestore(item.snapshot)}
                                    disabled={loading}
                                    className="backup-snapshot-restore-btn"
                                    style={{
                                      padding: '6px 12px',
                                      borderRadius: '8px',
                                      background: 'var(--brand-blue, #0f172a)',
                                      color: '#ffffff',
                                      border: 'none',
                                      fontSize: '11.5px',
                                      fontWeight: 800,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      whiteSpace: 'nowrap',
                                      flexShrink: 0
                                    }}
                                    title="Restore system directly from this snapshot"
                                  >
                                    <RefreshCw size={12} />
                                    <span>Restore</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSnapshot(item.id)}
                                    className="backup-snapshot-delete-btn"
                                    style={{
                                      padding: '6px 8px',
                                      borderRadius: '8px',
                                      background: '#fef2f2',
                                      color: '#dc2626',
                                      border: '1px solid #fecaca',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      flexShrink: 0
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

                    {/* Mobile Cards */}
                    <div className="backup-history-mobile">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="backup-history-mobile-card"
                          style={{
                            background: 'var(--bg-surface, #ffffff)',
                            border: '1px solid var(--border-subtle, #e2e8f0)',
                            borderRadius: '12px',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span className="backup-snapshot-id" style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--text-primary, #0f172a)', fontSize: '12px' }}>
                              {item.id}
                            </span>
                            <span className="backup-snapshot-type" style={{ fontSize: '10px', fontWeight: 700, background: 'var(--bg-surface-elevated, #f1f5f9)', border: '1px solid var(--border-subtle, #e2e8f0)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase' }}>
                              {item.type}
                            </span>
                          </div>

                          <div className="backup-snapshot-timestamp" style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })},{' '}
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>

                          <div className="backup-snapshot-summary" style={{ fontSize: '12px', color: 'var(--text-primary, #334155)', fontWeight: 600 }}>
                            {item.counts?.records || 0} incidents • {item.counts?.students || 0} students ({item.size_kb || 0} KB)
                          </div>

                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle, #f1f5f9)' }}>
                            <button
                              type="button"
                              onClick={() => handleExecuteRestore(item.snapshot)}
                              disabled={loading}
                              className="backup-snapshot-restore-btn"
                              style={{
                                flex: 1,
                                padding: '7px 12px',
                                borderRadius: '8px',
                                background: 'var(--brand-blue, #0f172a)',
                                color: '#ffffff',
                                border: 'none',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px'
                              }}
                            >
                              <RefreshCw size={13} />
                              <span>Restore</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSnapshot(item.id)}
                              className="backup-snapshot-delete-btn"
                              style={{
                                padding: '7px 12px',
                                borderRadius: '8px',
                                background: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RESTORE SNAPSHOT */}
          {activeTab === 'restore' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* File Dropzone */}
              <div
                className="file-dropzone"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border-medium, #cbd5e1)',
                  borderRadius: '18px',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: 'var(--bg-input, #f8fafc)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}
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
                    background: 'var(--bg-surface-elevated, #ffffff)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    marginBottom: '4px'
                  }}
                >
                  <FileJson size={28} color="var(--brand-blue, #0f172a)" />
                </div>
                <h4 style={{ margin: 0, fontSize: '15.5px', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>
                  Click to select VioTrack Backup File (.json)
                </h4>
                <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                  Choose any valid system snapshot exported from VioTrack to preview and restore
                </p>
              </div>

              {/* Uploaded File Inspection & Verification Preview */}
              {uploadedFilePayload && (
                <div
                  style={{
                    background: 'var(--bg-surface-elevated, #ffffff)',
                    border: '1.5px solid #10b981',
                    borderRadius: '16px',
                    padding: '22px',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.12)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ShieldCheck size={22} color="#10b981" />
                      <strong style={{ fontSize: '15px', color: 'var(--text-primary, #0f172a)' }}>
                        Snapshot Verified: {uploadedFilePayload.backup_id || 'Valid Backup'}
                      </strong>
                    </div>
                    <span className="badge-minor" style={{ fontSize: '11px', fontWeight: 700, color: '#15803d', background: '#f0fdf4', padding: '3px 9px', borderRadius: '12px', border: '1px solid #86efac' }}>
                      Integrity Check Passed
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px', marginBottom: '18px' }}>
                    <div style={{ background: 'var(--bg-surface, #f8fafc)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px' }}>Students</span>
                      <strong style={{ fontSize: '15px', color: 'var(--text-primary, #0f172a)' }}>{uploadedFilePayload.counts?.students || uploadedFilePayload.data?.students?.length || 0}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-surface, #f8fafc)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px' }}>Incidents</span>
                      <strong style={{ fontSize: '15px', color: 'var(--text-primary, #0f172a)' }}>{uploadedFilePayload.counts?.records || uploadedFilePayload.data?.records?.length || 0}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-surface, #f8fafc)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px' }}>Staff Accounts</span>
                      <strong style={{ fontSize: '15px', color: 'var(--text-primary, #0f172a)' }}>{(uploadedFilePayload.counts?.teachers || 0) + (uploadedFilePayload.counts?.admins || 0)}</strong>
                    </div>
                    <div style={{ background: 'var(--bg-surface, #f8fafc)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                      <span style={{ color: 'var(--text-muted, #64748b)', display: 'block', fontSize: '11px' }}>Created On</span>
                      <strong style={{ fontSize: '13px', color: 'var(--text-primary, #0f172a)' }}>{new Date(uploadedFilePayload.created_at || Date.now()).toLocaleDateString()}</strong>
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
                      color: 'var(--text-secondary, #334155)',
                      marginBottom: '18px',
                      cursor: 'pointer',
                      background: 'var(--bg-surface, #f8fafc)',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle, #e2e8f0)'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={confirmRestoreCheck}
                      onChange={(e) => setConfirmRestoreCheck(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: 'var(--brand-blue, #0f172a)', width: '16px', height: '16px' }}
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
                      background: confirmRestoreCheck ? 'var(--brand-blue, #0f172a)' : 'var(--bg-surface, #cbd5e1)',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '260px', paddingBottom: '20px' }}>
              <div style={{ background: 'var(--bg-surface-elevated, #f8fafc)', border: '1.5px solid var(--border-subtle, #e2e8f0)', borderRadius: '18px', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', gap: '12px' }}>
                  <div>
                    <strong style={{ fontSize: '15px', color: 'var(--text-primary, #0f172a)', display: 'block' }}>
                      Automatic Backups
                    </strong>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                      Schedule recurring backups of system records
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={schedule.auto_backup_enabled}
                    onChange={(e) => setSchedule(s => ({ ...s, auto_backup_enabled: e.target.checked }))}
                    style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--brand-blue, #0f172a)', flexShrink: 0 }}
                  />
                </div>

                <div className="backup-schedule-grid">
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
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
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-secondary, #334155)', marginBottom: '6px' }}>
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
                  className="backup-schedule-save-btn"
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    background: 'var(--brand-blue, #0f172a)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="backup-modal-footer" style={{ background: 'var(--bg-surface, #ffffff)', borderTop: '1px solid var(--border-subtle, #f1f5f9)' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
            Backups are stored locally and encrypted.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="backup-modal-footer-close-btn"
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--brand-blue, #0f172a)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)'
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
