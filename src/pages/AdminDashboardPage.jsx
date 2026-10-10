import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  HardDrive,
  Minus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  Users
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { BackupRestoreModal } from '../components/common/BackupRestoreModal';
import { dataService } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';
import '../css/admin-dashboard.css';

const DAY_MS = 24 * 60 * 60 * 1000;
const getRecordDate = (record) => record.date_reported || record.created_at || record.date || null;

const getApprovalStatus = (record) => {
  if (record.approval_status === 'Rejected' || record.status === 'Rejected') return 'Rejected';
  if (record.approval_status === 'Under Approval' || record.status === 'Under Approval') return 'Under Approval';
  if (record.reported_by_type === 'teacher' && !record.approved_by && record.status !== 'Resolved') {
    return 'Under Approval';
  }
  return record.approval_status || 'Approved';
};

const toValidDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = toValidDate(value);
  return date
    ? date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Date unavailable';
};

const formatWaitingAge = (ageMs) => {
  if (ageMs === null) return 'Date unavailable';
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  if (hours < 1) return 'Under 1 hour';
  if (hours < 24) return `${hours}h waiting`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} waiting`;
};

const getStudentLabel = (record, studentById) => {
  const relatedStudent = record.student || record.students;
  const nestedStudent = Array.isArray(relatedStudent) ? relatedStudent[0] : relatedStudent;
  const studentId = record.student_id ?? nestedStudent?.id ?? nestedStudent?.student_id ?? nestedStudent?.lrn;
  const mappedStudent = studentId === null || studentId === undefined
    ? null
    : studentById.get(String(studentId));
  const student = [nestedStudent, mappedStudent].find(candidate => (
    candidate && (
      candidate.fname || candidate.first_name || candidate.lname || candidate.last_name
      || candidate.full_name || candidate.name
    )
  ));
  const firstName = student?.fname || student?.first_name || '';
  const middleName = student?.mname || student?.middle_name || '';
  const lastName = student?.lname || student?.last_name || '';
  const name = [firstName, middleName, lastName].filter(Boolean).join(' ').trim()
    || String(student?.full_name || student?.name || '').trim();
  return name || (studentId !== null && studentId !== undefined
    ? `Student ID ${studentId}`
    : 'Unknown student');
};

const isAdminAction = (item) => /backup|restor|import|export|delet|approv|reject|admin/i.test(item.action || '');

const formatTrend = (current, previous) => {
  if (current === previous) return 'No change from the prior 7 days';
  if (previous === 0) return current > 0 ? 'Up from 0 in the prior 7 days' : 'No activity in either period';
  const change = Math.round((Math.abs(current - previous) / previous) * 100);
  return `${current > previous ? 'Up' : 'Down'} ${change}% from the prior 7 days`;
};

export const AdminDashboardPage = () => {
  const { error } = useNotification();
  const [data, setData] = useState({
    students: [],
    records: [],
    teachers: [],
    admins: [],
    activityLogs: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupSchedule, setBackupSchedule] = useState(null);
  const [backupSnapshotCheckedAt, setBackupSnapshotCheckedAt] = useState(null);
  const [activityView, setActivityView] = useState('admin');

  const loadData = useCallback(async (forceRefresh = false) => {
    try {
      const [students, records, teachers, admins, activityLogs] = await Promise.all([
        dataService.getStudents(forceRefresh),
        dataService.getRecords(forceRefresh),
        dataService.getTeachers(forceRefresh),
        dataService.getAdmins(forceRefresh),
        dataService.getActivityLogs(forceRefresh)
      ]);
      setData({
        students: students || [],
        records: records || [],
        teachers: teachers || [],
        admins: admins || [],
        activityLogs: activityLogs || []
      });
      setBackupHistory(dataService.getBackupHistory());
      setBackupSchedule(dataService.getBackupScheduleSettings());
      setBackupSnapshotCheckedAt(Date.now());
    } catch (err) {
      error(`Failed to load admin dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [error]);

  const refreshData = useCallback(() => {
    setRefreshing(true);
    loadData(true).finally(() => setRefreshing(false));
  }, [loadData]);

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) loadData();
    });
    const handleDataUpdate = refreshData;
    const handleActivityLogged = (event) => {
      if (!event?.detail) return;
      setData(previous => ({
        ...previous,
        activityLogs: [
          event.detail,
          ...previous.activityLogs.filter(item => item.id !== event.detail.id)
        ]
      }));
    };
    window.addEventListener('viotrack_data_updated', handleDataUpdate);
    window.addEventListener('viotrack_activity_logged', handleActivityLogged);
    return () => {
      isMounted = false;
      window.removeEventListener('viotrack_data_updated', handleDataUpdate);
      window.removeEventListener('viotrack_activity_logged', handleActivityLogged);
    };
  }, [loadData, refreshData]);

  const metrics = useMemo(() => {
    const now = new Date();
    const nowMs = now.getTime();
    const currentPeriodStart = nowMs - (7 * DAY_MS);
    const previousPeriodStart = nowMs - (14 * DAY_MS);
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const pendingApprovals = data.records.filter(record => getApprovalStatus(record) === 'Under Approval');
    const studentById = new Map();
    data.students.forEach(student => {
      [student.id, student.student_id, student.lrn].forEach(id => {
        if (id !== null && id !== undefined && String(id).trim()) {
          studentById.set(String(id), student);
        }
      });
    });
    const chartData = Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(startToday);
      day.setDate(startToday.getDate() - (6 - offset));
      const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
      const count = data.records.filter(record => {
        const dateValue = getRecordDate(record);
        if (!dateValue) return false;
        const date = new Date(dateValue);
        return !Number.isNaN(date.getTime())
          && `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === key;
      }).length;
      return {
        day: day.toLocaleDateString(undefined, { weekday: 'short' }),
        count
      };
    });
    const pendingApprovalAges = pendingApprovals
      .map(record => {
        const date = toValidDate(getRecordDate(record));
        return {
          record,
          date,
          ageMs: date ? Math.max(0, nowMs - date.getTime()) : null
        };
      })
      .sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date - b.date;
      });
    const severityCounts = data.records.reduce((counts, record) => {
      if (getApprovalStatus(record) === 'Rejected') return counts;
      const severity = String(record.violation?.type || record.severity || 'Minor').toLowerCase();
      if (severity.includes('major')) counts.major++;
      else if (severity.includes('serious')) counts.serious++;
      else counts.minor++;
      return counts;
    }, { minor: 0, serious: 0, major: 0 });
    const inPeriod = (value, start, end) => {
      const date = toValidDate(value);
      return date && date.getTime() > start && date.getTime() <= end;
    };
    const currentIncidents = data.records.filter(record => inPeriod(getRecordDate(record), currentPeriodStart, nowMs)).length;
    const previousIncidents = data.records.filter(record => inPeriod(getRecordDate(record), previousPeriodStart, currentPeriodStart)).length;
    const resolvedApprovals = data.records.filter(record => (
      record.reported_by_type === 'teacher'
      && ['Approved', 'Rejected'].includes(getApprovalStatus(record))
    ));
    const currentResolvedApprovals = resolvedApprovals.filter(record => {
      const resolvedAt = getApprovalStatus(record) === 'Rejected'
        ? record.rejected_at
        : record.approved_at;
      return inPeriod(resolvedAt, currentPeriodStart, nowMs);
    }).length;
    const previousResolvedApprovals = resolvedApprovals.filter(record => {
      const resolvedAt = getApprovalStatus(record) === 'Rejected'
        ? record.rejected_at
        : record.approved_at;
      return inPeriod(resolvedAt, previousPeriodStart, currentPeriodStart);
    }).length;
    const compareActivity = (a, b) => {
      const dateA = toValidDate(a.created_at || a.timestamp)?.getTime() || 0;
      const dateB = toValidDate(b.created_at || b.timestamp)?.getTime() || 0;
      return dateB - dateA;
    };
    const sortedActivity = [...data.activityLogs].sort(compareActivity);
    const latestActivity = sortedActivity.slice(0, 6);
    const adminActions = sortedActivity.filter(isAdminAction).slice(0, 8);
    const knownStudentIds = new Set(studentById.keys());
    const missingStudentData = data.students.filter(student => (
      !String(student.fname || '').trim()
      || !String(student.lname || '').trim()
      || !String(student.student_id || student.lrn || '').trim()
    ));
    const missingTeacherData = data.teachers.filter(teacher => (
      !String(teacher.fname || '').trim()
      || !String(teacher.lname || '').trim()
      || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(teacher.email || '').trim())
    ));
    const incompleteRecords = data.records.filter(record => {
      const studentId = record.student_id;
      const hasStudent = studentId !== null
        && studentId !== undefined
        && String(studentId).trim()
        && knownStudentIds.has(String(studentId));
      return !hasStudent || !toValidDate(record.date_reported || record.date);
    });

    return {
      pendingApprovals,
      pendingApprovalAges,
      chartData,
      severityCounts,
      latestActivity,
      adminActions,
      trends: [
        { label: 'Incident reports', current: currentIncidents, previous: previousIncidents },
        { label: 'Approvals completed', current: currentResolvedApprovals, previous: previousResolvedApprovals }
      ],
      dataQuality: {
        students: missingStudentData.length,
        teachers: missingTeacherData.length,
        records: incompleteRecords.length,
        total: missingStudentData.length + missingTeacherData.length + incompleteRecords.length
      },
      studentById
    };
  }, [data]);

  const sortedBackups = backupHistory
    .map(backup => ({ ...backup, date: toValidDate(backup.created_at) }))
    .filter(backup => backup.date)
    .sort((a, b) => b.date - a.date)[0];
  const latestScheduledBackup = backupHistory
    .filter(backup => String(backup.type || '').startsWith('scheduled_'))
    .map(backup => ({ ...backup, date: toValidDate(backup.created_at) }))
    .filter(backup => backup.date)
    .sort((a, b) => b.date - a.date)[0];
  const backupHealth = !backupSchedule || !backupSnapshotCheckedAt
    ? { tone: 'neutral', message: 'Loading backup schedule…' }
    : !backupSchedule.auto_backup_enabled
      ? { tone: 'neutral', message: 'Automatic backups are turned off.' }
      : !latestScheduledBackup
        ? { tone: 'warning', message: 'No scheduled backup is recorded yet.' }
        : backupSnapshotCheckedAt - latestScheduledBackup.date.getTime()
          > (backupSchedule.frequency === 'weekly' ? 10.5 : 1.5) * DAY_MS
          ? { tone: 'warning', message: 'The scheduled backup may be overdue.' }
          : { tone: 'good', message: 'The scheduled backup is current.' };

  const summaryCards = [
    { label: 'Students', value: data.students.length, icon: Users, href: '/students', tone: 'blue' },
    { label: 'Faculty', value: data.teachers.length, icon: Users, href: '/teachers', tone: 'violet' },
    { label: 'Admin users', value: data.admins.length, icon: ShieldCheck, href: '/admin-users', tone: 'slate' },
    { label: 'Incident reports', value: data.records.length, icon: FileText, href: '/violations', tone: 'slate' },
    { label: 'Pending approvals', value: metrics.pendingApprovals.length, icon: Clock3, href: '/for-approval', tone: 'amber' }
  ];

  const dataLinks = [
    { title: 'Students', count: data.students.length, description: 'Student roster', href: '/students', icon: Users },
    { title: 'Faculty', count: data.teachers.length, description: 'Teacher records', href: '/teachers', icon: Users },
    { title: 'Administrator accounts', count: data.admins.length, description: 'Admin directory', href: '/admin-users', icon: ShieldCheck },
    { title: 'Incident reports', count: data.records.length, description: 'Incident register', href: '/violations', icon: FileText }
  ];

  return (
    <main className="admin-dashboard">
      <header className="admin-dashboard-header">
        <div>
          <h1>Admin overview</h1>
          <p>School records, incident activity, and system data in one place.</p>
        </div>
        <div className="admin-dashboard-header-actions">
          <button type="button" className="admin-dashboard-button secondary" onClick={refreshData} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'is-spinning' : ''} />
            Refresh data
          </button>
          <Link to="/" className="admin-dashboard-button secondary">
            <BarChart3 size={15} />
            Full analytics
          </Link>
          <button type="button" className="admin-dashboard-button primary" onClick={() => setBackupModalOpen(true)}>
            <Database size={15} />
            Backup & restore
          </button>
        </div>
      </header>

      <section className="admin-dashboard-metrics" aria-label="School overview">
        {summaryCards.map(({ label, value, icon: Icon, href, tone }) => (
          <Link className="admin-dashboard-metric" to={href} key={label}>
            <span className={`admin-dashboard-metric-icon ${tone}`}><Icon size={18} /></span>
            <span className="admin-dashboard-metric-copy">
              <span>{label}</span>
              <strong>{loading ? '—' : value.toLocaleString()}</strong>
            </span>
            <ArrowRight size={15} className="admin-dashboard-metric-arrow" />
          </Link>
        ))}
      </section>

      <section className="admin-dashboard-main-grid">
        <article className="admin-dashboard-panel admin-dashboard-trend-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Incident activity</h2>
              <p>Reports recorded in the last seven days</p>
            </div>
            <BarChart3 size={18} />
          </div>
          <div className="admin-dashboard-chart">
            {loading ? (
              <div className="admin-dashboard-placeholder">Loading report data…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.chartData} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminReportFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--admin-dashboard-grid)" strokeDasharray="3 5" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'var(--admin-dashboard-muted)', fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--admin-dashboard-muted)', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--admin-dashboard-surface)', border: '1px solid var(--admin-dashboard-border)', borderRadius: 8, color: 'var(--admin-dashboard-text)' }}
                    labelStyle={{ color: 'var(--admin-dashboard-muted)' }}
                  />
                  <Area type="monotone" dataKey="count" name="Reports" stroke="#2563eb" strokeWidth={2.5} fill="url(#adminReportFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Incident severity</h2>
              <p>Approved and in-review reports</p>
            </div>
            <Activity size={18} />
          </div>
          <div className="admin-dashboard-severity-list">
            {[
              { label: 'Minor', value: metrics.severityCounts.minor, tone: 'green' },
              { label: 'Serious', value: metrics.severityCounts.serious, tone: 'amber' },
              { label: 'Major', value: metrics.severityCounts.major, tone: 'red' }
            ].map(item => {
              const total = metrics.severityCounts.minor + metrics.severityCounts.serious + metrics.severityCounts.major;
              const width = total > 0 ? `${Math.max((item.value / total) * 100, item.value > 0 ? 5 : 0)}%` : '0%';
              return (
                <div className="admin-dashboard-severity-row" key={item.label}>
                  <div className="admin-dashboard-severity-label"><span className={`severity-dot ${item.tone}`} />{item.label}<strong>{loading ? '—' : item.value}</strong></div>
                  <div className="admin-dashboard-severity-track"><span className={item.tone} style={{ width }} /></div>
                </div>
              );
            })}
          </div>
          <Link className="admin-dashboard-text-link" to="/violations">Open incident records <ArrowRight size={14} /></Link>
        </article>
      </section>

      <section className="admin-dashboard-operations-grid">
        <article className="admin-dashboard-panel admin-dashboard-approval-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Approval aging</h2>
              <p>Oldest reports first; 7+ days waiting are highlighted.</p>
            </div>
            <Clock3 size={18} />
          </div>
          <div className="admin-dashboard-approval-summary">
            <strong>{loading ? '—' : metrics.pendingApprovals.length}</strong>
            <span>waiting for review</span>
            <Link className="admin-dashboard-text-link" to="/for-approval">Open queue <ArrowRight size={14} /></Link>
          </div>
          {loading ? (
            <div className="admin-dashboard-placeholder">Loading approval queue…</div>
          ) : metrics.pendingApprovalAges.length ? (
            <ul className="admin-dashboard-approval-list">
              {metrics.pendingApprovalAges.slice(0, 4).map(({ record, ageMs }, index) => {
                const studentLabel = getStudentLabel(record, metrics.studentById);
                const isAging = ageMs !== null && ageMs >= 7 * DAY_MS;
                return (
                  <li key={record.id || `${studentLabel}-${index}`}>
                    <Link to="/for-approval" className="admin-dashboard-approval-item">
                      <span className="admin-dashboard-approval-copy">
                        <strong>{studentLabel}</strong>
                        <small>{record.violation?.title || `Incident #${record.id || '—'}`}</small>
                      </span>
                      <span className={`admin-dashboard-approval-age${isAging ? ' is-aging' : ''}`}>
                        {formatWaitingAge(ageMs)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="admin-dashboard-placeholder">No reports are waiting for review.</div>
          )}
        </article>

        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Week-over-week trends</h2>
              <p>Rolling 7-day totals compared with the previous 7 days</p>
            </div>
            <Activity size={18} />
          </div>
          <div className="admin-dashboard-trend-list">
            {metrics.trends.map(({ label, current, previous }) => {
              const isUp = current > previous;
              const isDown = current < previous;
              const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
              const improved = label === 'Approvals completed' ? isUp : isDown;
              const changeTone = isUp === isDown ? 'steady' : improved ? 'positive' : 'negative';
              return (
                <div className="admin-dashboard-trend-item" key={label}>
                  <div className="admin-dashboard-trend-copy">
                    <strong>{label}</strong>
                    <small>{loading ? 'Calculating…' : formatTrend(current, previous)}</small>
                  </div>
                  <span className={`admin-dashboard-trend-change ${changeTone}`}>
                    <TrendIcon size={15} />
                    {loading ? '—' : current.toLocaleString()}
                  </span>
                  <span className="admin-dashboard-trend-previous">
                    {loading ? '—' : previous.toLocaleString()} previous
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className="admin-dashboard-lower-grid">
        <article className="admin-dashboard-panel">
          <div className="admin-dashboard-panel-header">
            <div>
              <h2>Data management</h2>
              <p>Open a dataset to import or export records.</p>
            </div>
            <Download size={18} />
          </div>
          <div className="admin-dashboard-data-links">
            {dataLinks.map(({ title, count, description, href, icon: Icon }) => (
              <Link to={href} className="admin-dashboard-data-link" key={title}>
                <span className="admin-dashboard-data-link-icon"><Icon size={17} /></span>
                <span className="admin-dashboard-data-link-copy"><strong>{title}</strong><small>{description} · {loading ? '—' : count.toLocaleString()} records</small></span>
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
          <button type="button" className="admin-dashboard-inline-action" onClick={() => setBackupModalOpen(true)}>
            <Upload size={15} /> Import or restore a full database backup
          </button>
        </article>

        <div className="admin-dashboard-side-stack">
          <article className="admin-dashboard-panel admin-dashboard-quality-panel">
            <div className="admin-dashboard-panel-header">
              <div>
                <h2>Data quality</h2>
                <p>Quick checks for incomplete or unmatched records</p>
              </div>
              <ShieldCheck size={18} />
            </div>
            <div className="admin-dashboard-quality-total">
              <strong>{loading ? '—' : metrics.dataQuality.total.toLocaleString()}</strong>
              <span>records to review</span>
            </div>
            {metrics.dataQuality.total ? (
              <ul className="admin-dashboard-quality-list">
                <li>
                  <Link to="/students">
                    <span>Students missing name or ID</span>
                    <strong>{loading ? '—' : metrics.dataQuality.students}</strong>
                    <ArrowRight size={14} />
                  </Link>
                </li>
                <li>
                  <Link to="/teachers">
                    <span>Faculty missing name or valid email</span>
                    <strong>{loading ? '—' : metrics.dataQuality.teachers}</strong>
                    <ArrowRight size={14} />
                  </Link>
                </li>
                <li>
                  <Link to="/violations">
                    <span>Incidents missing student match or date</span>
                    <strong>{loading ? '—' : metrics.dataQuality.records}</strong>
                    <ArrowRight size={14} />
                  </Link>
                </li>
              </ul>
            ) : (
              <div className="admin-dashboard-quality-clear">
                {loading ? 'Checking records…' : 'No issues found in these checks.'}
              </div>
            )}
          </article>

          <article className="admin-dashboard-panel admin-dashboard-backup-panel">
            <div className="admin-dashboard-panel-header">
              <div>
                <h2>Backup health</h2>
                <p>Scheduled snapshots and restore controls</p>
              </div>
              <HardDrive size={18} />
            </div>
            <div className={`admin-dashboard-backup-status ${backupHealth.tone}`}>
              {backupHealth.tone === 'good'
                ? <CheckCircle2 size={16} />
                : backupHealth.tone === 'warning'
                  ? <AlertTriangle size={16} />
                  : <HardDrive size={16} />}
              <span>{backupHealth.message}</span>
            </div>
            <dl className="admin-dashboard-backup-details">
              <div>
                <dt>Latest snapshot</dt>
                <dd>{sortedBackups ? formatDateTime(sortedBackups.created_at) : 'None recorded'}</dd>
              </div>
              <div>
                <dt>Schedule</dt>
                <dd>{backupSchedule?.auto_backup_enabled
                  ? `${backupSchedule.frequency} at ${backupSchedule.time}`
                  : backupSchedule ? 'Off' : 'Loading…'}</dd>
              </div>
              <div>
                <dt>Last scheduled snapshot</dt>
                <dd>{latestScheduledBackup ? formatDateTime(latestScheduledBackup.created_at) : 'None recorded'}</dd>
              </div>
            </dl>
            <button type="button" className="admin-dashboard-text-link button-link" onClick={() => setBackupModalOpen(true)}>
              Create, restore, or schedule backup <ArrowRight size={14} />
            </button>
          </article>
        </div>
      </section>

      <section className="admin-dashboard-panel admin-dashboard-activity-panel">
        <div className="admin-dashboard-panel-header">
          <div>
            <h2>Activity log</h2>
            <p>Review high-impact admin actions or all recent changes</p>
          </div>
          <div className="admin-dashboard-activity-controls">
            <div className="admin-dashboard-activity-tabs" role="group" aria-label="Activity log filter">
              <button type="button" aria-pressed={activityView === 'admin'} onClick={() => setActivityView('admin')}>Admin actions</button>
              <button type="button" aria-pressed={activityView === 'all'} onClick={() => setActivityView('all')}>All activity</button>
            </div>
            <Link className="admin-dashboard-text-link" to="/activity-logs">Full log <ArrowRight size={14} /></Link>
          </div>
        </div>
        {(activityView === 'admin' ? metrics.adminActions : metrics.latestActivity).length ? (
          <ul className="admin-dashboard-activity-list">
            {(activityView === 'admin' ? metrics.adminActions : metrics.latestActivity).map((item, index) => (
              <li key={item.id || item.audit_id || `${item.action}-${index}`}>
                <span className="admin-dashboard-activity-dot" />
                <span className="admin-dashboard-activity-copy">
                  <strong>{item.action || 'System activity'}</strong>
                  <small>{item.details || item.description || item.user_name || 'Audit entry recorded'}</small>
                </span>
                <time>{formatDateTime(item.created_at || item.timestamp)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="admin-dashboard-placeholder">
            {loading ? 'Loading activity…' : activityView === 'admin' ? 'No high-impact admin actions are recorded yet.' : 'No recent activity is available.'}
          </div>
        )}
      </section>

      <BackupRestoreModal
        isOpen={backupModalOpen}
        onClose={() => {
          setBackupModalOpen(false);
          setBackupHistory(dataService.getBackupHistory());
          setBackupSchedule(dataService.getBackupScheduleSettings());
          setBackupSnapshotCheckedAt(Date.now());
        }}
      />
    </main>
  );
};

export default AdminDashboardPage;
