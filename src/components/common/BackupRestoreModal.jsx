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
  HardDrive
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';

export const BackupRestoreModal = ({ isOpen, onClose }) => {
  const { success, error, info } = useNotification();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'restore' | 'schedule'
  const [history, setHistory] = useState([]);
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
      loadHistoryAndSettings();
      setUploadedFilePayload(null);
      setConfirmRestoreCheck(false);
    }
  }, [isOpen]);

  const loadHistoryAndSettings = () => {
    const list = dataService.getBackupHistory();
    const sched = dataService.getBackupScheduleSettings();
    setHistory(list);
    setSchedule(sched);
  };

  if (!isOpen) return null;

  // 1. Create and Download Snapshot
  const handleCreateBackup = async (type = 'manual') => {
    setLoading(true);
    try {
      const snapshot = await dataService.createDatabaseBackup(type);
      loadHistoryAndSettings();

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
        info(`Loaded backup snapshot ${parsed.backup_id || file.name}`);
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
      loadHistoryAndSettings();
      setTimeout(() => {
        onClose();
      }, 800);
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '90vh',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            background: '#0f172a',
            color: '#ffffff',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Database size={20} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                Automated Database Backups &amp; One-Click Restore
              </h3>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                Secure database snapshot management and disaster recovery
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ffffff'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            padding: '0 24px'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'create' ? '#0f172a' : '#64748b',
              borderBottom: activeTab === 'create' ? '2.5px solid #0f172a' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} />
            <span>Create Snapshot</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'restore' ? '#0f172a' : '#64748b',
              borderBottom: activeTab === 'restore' ? '2.5px solid #0f172a' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Upload size={15} />
            <span>Restore Database</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            style={{
              padding: '12px 18px',
              border: 'none',
              background: 'none',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'schedule' ? '#0f172a' : '#64748b',
              borderBottom: activeTab === 'schedule' ? '2.5px solid #0f172a' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Clock size={15} />
            <span>Schedule Settings</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* TAB 1: CREATE SNAPSHOT */}
          {activeTab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Main Backup Callout */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    Instant Full Database Snapshot
                  </h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b', maxWidth: '440px' }}>
                    Exports all student registries, disciplinary incident logs, violation taxonomy, staff accounts, and audit entries into an encrypted/portable JSON file.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCreateBackup('manual')}
                  disabled={loading}
                  style={{
                    padding: '11px 22px',
                    borderRadius: '10px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                    transition: 'background 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#1e293b'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#0f172a'}
                >
                  <Download size={16} />
                  <span>{loading ? 'Exporting...' : 'Take Snapshot & Download'}</span>
                </button>
              </div>

              {/* Snapshot History Table */}
              <div>
                <h4 style={{ margin: '0 0 10px', fontSize: '13.5px', fontWeight: 800, color: '#334155' }}>
                  Recent Local Snapshots History ({history.length})
                </h4>

                {history.length === 0 ? (
                  <div
                    style={{
                      padding: '30px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px dashed #cbd5e1',
                      color: '#94a3b8',
                      fontSize: '12.5px'
                    }}
                  >
                    No snapshots created yet. Click above to generate your first backup.
                  </div>
                ) : (
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Snapshot ID</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Date &amp; Time</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569' }}>Records / Students</th>
                          <th style={{ padding: '10px 14px', fontWeight: 700, color: '#475569', textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                              {item.id}
                              <span style={{ marginLeft: '6px', fontSize: '10px', background: '#f1f5f9', padding: '2px 5px', borderRadius: '4px', color: '#64748b' }}>
                                {item.type}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: '#475569' }}>
                              {new Date(item.created_at).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 14px', color: '#334155', fontWeight: 600 }}>
                              {item.counts?.records || 0} incidents • {item.counts?.students || 0} students ({item.size_kb || 0} KB)
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleExecuteRestore(item.snapshot)}
                                  disabled={loading}
                                  style={{
                                    padding: '4px 9px',
                                    borderRadius: '6px',
                                    background: '#ecfdf5',
                                    color: '#065f46',
                                    border: '1px solid #a7f3d0',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                  title="Restore system directly from this snapshot"
                                >
                                  Restore
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSnapshot(item.id)}
                                  style={{
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    background: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    cursor: 'pointer'
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '14px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.background = '#f1f5f9'; }}
                onMouseOut={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <FileJson size={40} color="#0f172a" style={{ margin: '0 auto 10px' }} />
                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  Click to select VioTrack Backup File (.json)
                </h4>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Select any previous system snapshot to preview and restore
                </p>
              </div>

              {/* Uploaded File Inspection & Verification Preview */}
              {uploadedFilePayload && (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #10b981',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <ShieldCheck size={20} color="#10b981" />
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                      Snapshot Verified: {uploadedFilePayload.backup_id || 'Valid Backup'}
                    </strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', fontSize: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block' }}>Students</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{uploadedFilePayload.counts?.students || uploadedFilePayload.data?.students?.length || 0}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block' }}>Incidents</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{uploadedFilePayload.counts?.records || uploadedFilePayload.data?.records?.length || 0}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block' }}>Staff Accounts</span>
                      <strong style={{ fontSize: '14px', color: '#0f172a' }}>{(uploadedFilePayload.counts?.teachers || 0) + (uploadedFilePayload.counts?.admins || 0)}</strong>
                    </div>
                    <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <span style={{ color: '#64748b', display: 'block' }}>Created On</span>
                      <strong style={{ fontSize: '12px', color: '#0f172a' }}>{new Date(uploadedFilePayload.created_at || Date.now()).toLocaleDateString()}</strong>
                    </div>
                  </div>

                  {/* Safety Checkbox */}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#334155',
                      marginBottom: '16px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={confirmRestoreCheck}
                      onChange={(e) => setConfirmRestoreCheck(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: '#0f172a' }}
                    />
                    <span>I understand this will overwrite current live database collections with the selected snapshot.</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => handleExecuteRestore(uploadedFilePayload)}
                    disabled={!confirmRestoreCheck || loading}
                    style={{
                      width: '100%',
                      padding: '11px',
                      borderRadius: '8px',
                      background: confirmRestoreCheck ? '#0f172a' : '#cbd5e1',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: confirmRestoreCheck ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                  >
                    <RefreshCw size={15} />
                    <span>{loading ? 'Restoring Database...' : 'Confirm 1-Click Database Restore'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SCHEDULE SETTINGS */}
          {activeTab === 'schedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                      Automated Snapshot Cron Trigger
                    </strong>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      Automatically capture system snapshots at regular background intervals
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={schedule.auto_backup_enabled}
                    onChange={(e) => setSchedule(s => ({ ...s, auto_backup_enabled: e.target.checked }))}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f172a' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Backup Frequency
                    </label>
                    <select
                      value={schedule.frequency}
                      onChange={(e) => setSchedule(s => ({ ...s, frequency: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="daily">Daily (Every 24 hours)</option>
                      <option value="weekly">Weekly (Every Sunday)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Trigger Time
                    </label>
                    <input
                      type="time"
                      value={schedule.time || '00:00'}
                      onChange={(e) => setSchedule(s => ({ ...s, time: e.target.value }))}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveSchedule}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    background: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Save Schedule Settings
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div
          style={{
            background: '#ffffff',
            borderTop: '1px solid #e2e8f0',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
            VioTrack Disaster Recovery Engine v2.4
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
