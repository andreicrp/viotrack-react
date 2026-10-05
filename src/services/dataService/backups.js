import { invalidateCache } from './shared.js';

export const backupsMethods = {
  async createDatabaseBackup(type = 'manual') {
      const timestamp = new Date().toISOString();
      const backupId = `BKP-${Date.now()}`;

      const [students, violations, records, teachers, advisers, admins, activity_logs, school_events] = await Promise.all([
        this.getStudents(true),
        this.getViolations(true),
        this.getRecords(true),
        this.getTeachers(true),
        this.getAdvisers(true),
        this.getAdmins(true),
        this.getActivityLogs(true),
        this.getSchoolEvents()
      ]);

      const snapshot = {
        system: 'VioTrack Disciplinary System',
        version: '2.4.0',
        backup_id: backupId,
        type: type, // 'manual' | 'scheduled_daily' | 'scheduled_weekly'
        created_at: timestamp,
        created_by: this.getCurrentUser().name || 'System Admin',
        counts: {
          students: students.length,
          violations: violations.length,
          records: records.length,
          teachers: teachers.length,
          advisers: advisers.length,
          admins: admins.length,
          activity_logs: activity_logs.length
        },
        data: {
          students,
          violations,
          records,
          teachers,
          advisers,
          admins,
          activity_logs,
          school_events
        }
      };

      // Store in backup snapshots registry
      const existingSnapshots = this.getBackupHistory();
      const updatedSnapshots = [
        {
          id: backupId,
          type,
          created_at: timestamp,
          created_by: snapshot.created_by,
          counts: snapshot.counts,
          size_kb: Math.round(JSON.stringify(snapshot).length / 1024),
          snapshot
        },
        ...existingSnapshots.slice(0, 19)
      ];

      try {
        localStorage.setItem('viotrack_backup_snapshots', JSON.stringify(updatedSnapshots));
      } catch (e) {
        console.warn('Local storage quota warning on backup snapshot save:', e);
      }

      // Log the backup operation in the audit trail
      await this.addActivityLog(
        'Database Backup Created',
        `Full system snapshot generated (${snapshot.counts.records} violation records, ${snapshot.counts.students} students) [${type.toUpperCase()}]`
      );

      return snapshot;
    },

  getBackupHistory() {
      try {
        const saved = localStorage.getItem('viotrack_backup_snapshots');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    },

  deleteBackupSnapshot(snapshotId) {
      try {
        const current = this.getBackupHistory();
        const filtered = current.filter(b => b.id !== snapshotId);
        localStorage.setItem('viotrack_backup_snapshots', JSON.stringify(filtered));
        return true;
      } catch {
        return false;
      }
    },

  async restoreDatabase(snapshotPayload) {
      if (!snapshotPayload || !snapshotPayload.data) {
        throw new Error('Invalid snapshot structure: Missing data payload.');
      }

      const { data, counts, backup_id, created_at } = snapshotPayload;

      // Restore collections into localStorage
      if (data.students) localStorage.setItem('viotrack_students', JSON.stringify(data.students));
      if (data.violations) localStorage.setItem('viotrack_violations', JSON.stringify(data.violations));
      if (data.records) localStorage.setItem('viotrack_records', JSON.stringify(data.records));
      if (data.teachers) localStorage.setItem('viotrack_teachers', JSON.stringify(data.teachers));
      if (data.advisers) localStorage.setItem('viotrack_advisers', JSON.stringify(data.advisers));
      if (data.admins) localStorage.setItem('viotrack_admins', JSON.stringify(data.admins));
      if (data.school_events) localStorage.setItem('viotrack_school_events', JSON.stringify(data.school_events));

      // Clear memory caches so fresh data is loaded
      invalidateCache();

      // Log the restore event into audit logs
      await this.addActivityLog(
        'Database Restored',
        `Restored database from snapshot ${backup_id || 'manual upload'} created on ${new Date(created_at || Date.now()).toLocaleDateString()}`
      );

      // Notify all listeners
      window.dispatchEvent(new CustomEvent('viotrack_data_updated'));
      return true;
    },

  getBackupScheduleSettings() {
      try {
        const saved = localStorage.getItem('viotrack_backup_schedule');
        return saved ? JSON.parse(saved) : {
          auto_backup_enabled: true,
          frequency: 'daily', // 'daily' | 'weekly'
          time: '00:00',
          last_run: new Date(Date.now() - 86400000).toISOString()
        };
      } catch {
        return { auto_backup_enabled: true, frequency: 'daily', time: '00:00', last_run: null };
      }
    },

  saveBackupScheduleSettings(settings) {
      try {
        localStorage.setItem('viotrack_backup_schedule', JSON.stringify(settings));
        return true;
      } catch {
        return false;
      }
    },

  resetAllData() {
      try {
        [
          'students',
          'violations',
          'records',
          'teachers',
          'advisers',
          'admins',
          'activity_logs',
          'school_events'
        ].forEach(k => localStorage.removeItem(`viotrack_${k}`));
        invalidateCache();
        window.dispatchEvent(new CustomEvent('viotrack_data_updated'));
        return true;
      } catch {
        return false;
      }
    }
};
