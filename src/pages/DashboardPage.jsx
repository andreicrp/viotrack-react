import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  QrCode,
  PlusCircle,
  FileSpreadsheet,
  AlertTriangle,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  ShieldCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  GraduationCap,
  RotateCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  Plus,
  Trash2,
  X,
  User,
  Lightbulb,
  FileText,
  CalendarDays
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import CustomSelect from '../components/common/CustomSelect';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { success, info } = useNotification();
  const navigate = useNavigate();

  // Filter States
  const [filterType, setFilterType] = useState('month');
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');

  // Chart Series Visibility Toggles
  const [showMinorSeries, setShowMinorSeries] = useState(true);
  const [showSeriousSeries, setShowSeriousSeries] = useState(true);
  const [showMajorSeries, setShowMajorSeries] = useState(true);

  const [hoveredDonutCategory, setHoveredDonutCategory] = useState(null);

  // Data States
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Repeat Offenders Pagination
  const [offendersPage, setOffendersPage] = useState(1);
  const offendersPerPage = 4;

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 8, 1)); // September 2026
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(5);
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [newMeetingForm, setNewMeetingForm] = useState({
    student: '',
    time: '09:00 AM',
    type: 'Minor',
    status: 'Pending',
    reason: ''
  });

  // Scheduled Meetings / Incidents map for Calendar
  const [calendarEvents, setCalendarEvents] = useState({
    5: [
      { id: 'm1', student: 'Edcel B. Besa', grade: 'Grade 7 - Diamond', type: 'Serious', status: 'Pending', time: '08:15 AM', reason: 'Insubordination during flag ceremony • Parent conference requested' }
    ],
    6: [
      { id: 'm2', student: 'Maria Santos', grade: 'Grade 8 - Sapphire', type: 'Minor', status: 'Resolved', time: '07:45 AM', reason: 'Improper Uniform / No School ID • First warning issued' }
    ],
    10: [
      { id: 'm3', student: 'Joshua Garcia', grade: 'Grade 9 - Ruby', type: 'Minor', status: 'Resolved', time: '10:30 AM', reason: 'Use of Electronic Gadgets in Class without teacher permission' }
    ],
    12: [
      { id: 'm4', student: 'Juan Dela Cruz', grade: 'Grade 10 - Rizal', type: 'Major', status: 'Escalated', time: '02:15 PM', reason: 'Vandalism on 3rd Floor Restroom • Disciplinary board hearing' }
    ],
    18: [
      { id: 'm5', student: 'Carl Ramos', grade: 'Grade 11 - STEM A', type: 'Major', status: 'Pending', time: '03:40 PM', reason: 'Bullying / Intimidation in Hallway • Guidance counseling hearing' }
    ],
    24: [
      { id: 'm6', student: 'Edcel B. Besa', grade: 'Grade 7 - Diamond', type: 'Minor', status: 'Pending', time: '09:20 AM', reason: 'Chewing gum or spitting in public corridor' },
      { id: 'm7', student: 'Andrea Diaz', grade: 'Grade 8 - Emerald', type: 'Serious', status: 'Pending', time: '01:10 PM', reason: 'Cutting classes during Math period' },
      { id: 'm8', student: 'Kyle Tan', grade: 'Grade 10 - Rizal', type: 'Major', status: 'Escalated', time: '03:00 PM', reason: 'Possession of prohibited contraband on school grounds' }
    ]
  });

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [recordForStatusChange, setRecordForStatusChange] = useState(null);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('viotrack_data_updated', handleUpdate);
    return () => window.removeEventListener('viotrack_data_updated', handleUpdate);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, rData] = await Promise.all([
        dataService.getStudents(),
        dataService.getRecords()
      ]);
      setStudents(sData || []);
      setRecords(rData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Key Metrics
  const minorCount = records.filter(r => r.violation?.type === 'Minor').length || 12;
  const seriousCount = records.filter(r => r.violation?.type === 'Serious').length || 4;
  const majorCount = records.filter(r => r.violation?.type === 'Major').length || 2;
  const totalStudentsCount = students.length || 6;
  const totalViolationsCount = records.length || 18;
  const totalAllCount = minorCount + seriousCount + majorCount;

  // Donut Chart Data
  const donutData = useMemo(() => [
    { name: 'Minor', label: 'Minor Offenses', desc: 'Active warning logs', value: minorCount, color: '#10b981', bgLight: '#ecfdf5', borderColor: '#a7f3d0', percent: Math.round((minorCount / (totalAllCount || 1)) * 100) },
    { name: 'Serious', label: 'Serious Offenses', desc: 'Faculty interventions', value: seriousCount, color: '#f59e0b', bgLight: '#fffbeb', borderColor: '#fde68a', percent: Math.round((seriousCount / (totalAllCount || 1)) * 100) },
    { name: 'Major', label: 'Major Offenses', desc: 'Guidance hearings', value: majorCount, color: '#ef4444', bgLight: '#fef2f2', borderColor: '#fecaca', percent: Math.round((majorCount / (totalAllCount || 1)) * 100) }
  ], [minorCount, seriousCount, majorCount, totalAllCount]);

  // Repeat Offenders Calculation
  const repeatOffenders = useMemo(() => {
    const map = {};
    records.forEach(r => {
      const sId = r.student?.id || r.sid;
      if (!sId) return;
      if (!map[sId]) {
        const studentObj = (students || []).find(s => s.id === Number(sId)) || r.student || {};
        map[sId] = {
          id: sId,
          name: studentObj.fname ? `${studentObj.fname} ${studentObj.lname}` : (r.student ? `${r.student.fname} ${r.student.lname}` : 'Student'),
          grade: studentObj.grade ? `${studentObj.grade} - ${studentObj.section}` : (r.student ? `${r.student.grade} - ${r.student.section}` : 'Grade 10 - Rizal'),
          image: studentObj.image || r.student?.image || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
          count: 0
        };
      }
      map[sId].count += 1;
    });

    const list = Object.values(map).sort((a, b) => b.count - a.count);
    if (list.length === 0) {
      return [
        { id: 1, name: 'Alexander Mendoza', grade: 'Grade 10 - Rizal', count: 4, color: '#ef4444', image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
        { id: 3, name: 'Gabriel Torres', grade: 'Grade 10 - Bonifacio', count: 3, color: '#f97316', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
        { id: 4, name: 'Isabella Ramos', grade: 'Grade 10 - Bonifacio', count: 2, color: '#f59e0b', image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80' },
        { id: 5, name: 'Christian Navarro', grade: 'Grade 10 - Del Pilar', count: 2, color: '#f59e0b', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' },
        { id: 2, name: 'Sophia Villanueva', grade: 'Grade 10 - Rizal', count: 1, color: '#22c55e', image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80' }
      ];
    }

    const colors = ['#ef4444', '#f97316', '#f59e0b', '#f59e0b', '#22c55e'];
    return list.map((item, idx) => ({
      ...item,
      color: colors[idx % colors.length]
    }));
  }, [records, students]);

  // Paginated Offenders
  const paginatedOffenders = repeatOffenders.slice((offendersPage - 1) * offendersPerPage, offendersPage * offendersPerPage);
  const totalOffenderPages = Math.ceil(repeatOffenders.length / offendersPerPage) || 1;

  // Grade Level Breakdown
  const gradeSectionBreakdown = [
    { grade_section: 'Grade 10 - Rizal', count: 5, percent: 100 },
    { grade_section: 'Grade 7 - Diamond', count: 4, percent: 80 },
    { grade_section: 'Grade 8 - Emerald', count: 3, percent: 60 },
    { grade_section: 'Grade 9 - Ruby', count: 2, percent: 40 },
    { grade_section: 'Grade 11 - STEM A', count: 1, percent: 20 },
    { grade_section: 'Grade 12 - HUMSS B', count: 1, percent: 20 }
  ];

  // Violations by Category
  const categoryViolations = [
    { name: 'Chewing gum or spitting in public', type: 'minor', count: 5, percentage: 38 },
    { name: 'Improper Uniform / No School ID', type: 'minor', count: 4, percentage: 28 },
    { name: 'Cutting classes during school hours', type: 'serious', count: 3, percentage: 18 },
    { name: 'Use of Electronic Gadgets in Class', type: 'minor', count: 3, percentage: 18 },
    { name: 'Vandalism on school property', type: 'major', count: 1, percentage: 8 },
    { name: 'Possession of prohibited contraband', type: 'major', count: 1, percentage: 8 }
  ];

  // Dynamic Trend Chart Data based on active filter
  const trendData = useMemo(() => {
    if (filterType === 'today') {
      return [
        { time: '07:00 AM', minor: 0, serious: 0, major: 0 },
        { time: '09:00 AM', minor: 1, serious: 0, major: 0 },
        { time: '11:00 AM', minor: 3, serious: 1, major: 0 },
        { time: '01:00 PM', minor: 2, serious: 0, major: 1 },
        { time: '03:00 PM', minor: 4, serious: 2, major: 0 },
        { time: '05:00 PM', minor: 2, serious: 0, major: 0 }
      ];
    } else if (filterType === 'week') {
      return [
        { time: 'Mon (Sep 21)', minor: 3, serious: 1, major: 0 },
        { time: 'Tue (Sep 22)', minor: 5, serious: 0, major: 1 },
        { time: 'Wed (Sep 23)', minor: 2, serious: 2, major: 0 },
        { time: 'Thu (Sep 24)', minor: 6, serious: 1, major: 1 },
        { time: 'Fri (Sep 25)', minor: 4, serious: 1, major: 0 },
        { time: 'Sat (Sep 26)', minor: 1, serious: 0, major: 0 }
      ];
    } else {
      return [
        { time: 'Sep 1 - 7 (W1)', minor: 8, serious: 2, major: 1 },
        { time: 'Sep 8 - 14 (W2)', minor: 12, serious: 4, major: 2 },
        { time: 'Sep 15 - 21 (W3)', minor: 6, serious: 1, major: 0 },
        { time: 'Sep 22 - 28 (W4)', minor: 11, serious: 3, major: 1 },
        { time: 'Sep 29 - 30 (W5)', minor: 4, serious: 1, major: 0 }
      ];
    }
  }, [filterType]);

  // Calendar Day Calculation
  const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = 30;
  const startDayOfWeek = 2; // Sep 1, 2026 starts on Tue

  const calendarDays = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ empty: true, key: `empty-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = calendarEvents[d] || [];
    const hasMinor = dayEvents.some(i => i.type === 'Minor');
    const hasSerious = dayEvents.some(i => i.type === 'Serious');
    const hasMajor = dayEvents.some(i => i.type === 'Major');
    calendarDays.push({
      day: d,
      key: `day-${d}`,
      hasMinor,
      hasSerious,
      hasMajor,
      events: dayEvents
    });
  }

  // Selected Day Events
  const selectedDayItems = calendarEvents[selectedCalendarDate] || [];

  // Add Meeting Handler
  const handleAddMeeting = (e) => {
    e.preventDefault();
    if (!newMeetingForm.student.trim() || !newMeetingForm.reason.trim()) {
      info('Please provide student name and meeting reason.');
      return;
    }

    const newEvt = {
      id: `m-${Date.now()}`,
      student: newMeetingForm.student,
      grade: 'General Conduct',
      type: newMeetingForm.type,
      status: newMeetingForm.status,
      time: newMeetingForm.time,
      reason: newMeetingForm.reason
    };

    setCalendarEvents(prev => ({
      ...prev,
      [selectedCalendarDate]: [...(prev[selectedCalendarDate] || []), newEvt]
    }));

    setNewMeetingForm({
      student: '',
      time: '09:00 AM',
      type: 'Minor',
      status: 'Pending',
      reason: ''
    });
    setIsAddingMeeting(false);
    success(`Hearing scheduled for September ${selectedCalendarDate}, 2026!`);
  };

  const handleDeleteMeeting = (evtId) => {
    setCalendarEvents(prev => ({
      ...prev,
      [selectedCalendarDate]: (prev[selectedCalendarDate] || []).filter(e => e.id !== evtId)
    }));
    success('Event removed from schedule.');
  };

  // Export Executive PDF Report
  const handleExport = () => {
    const doc = new jsPDF();
    doc.setFillColor(39, 54, 127);
    doc.rect(0, 0, 210, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PERPETUAL HELP COLLEGE OF MANILA', 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('VIOTRACK - Executive Conduct & Disciplinary Summary Report', 14, 21);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(10);
    doc.text(`Report Scope: ${filterType.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 14, 36);
    doc.text(`Officer in Charge: ${user?.name || 'Administrator'} (${user?.role || 'Admin'})`, 14, 42);

    doc.autoTable({
      head: [['Key Metric Indicator', 'Count', 'Status']],
      body: [
        ['Minor Offenses (Uniform, ID, Tardy)', minorCount, 'Active Monitoring'],
        ['Serious Offenses (Disruptions, Cutting)', seriousCount, 'Requires Action'],
        ['Major Offenses (Weapons, Contraband, Vandalism)', majorCount, majorCount > 0 ? 'Urgent Review' : 'Zero Infractions'],
        ['Total Active Enrolled Students', totalStudentsCount, 'Verified in Directory'],
        ['Total Recorded Infractions', totalViolationsCount, 'Database Logged']
      ],
      startY: 48,
      theme: 'grid',
      headStyles: { fillColor: [39, 54, 127], fontStyle: 'bold' }
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Repeat Offenders Summary', 14, finalY);

    doc.autoTable({
      head: [['Student Name', 'Grade & Section', 'Recorded Infractions', 'Priority Level']],
      body: repeatOffenders.map(o => [
        o.name,
        o.grade,
        `${o.count} violations`,
        o.count >= 3 ? 'High Priority' : 'Standard Monitoring'
      ]),
      startY: finalY + 4,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Viotrack_Executive_Report_${Date.now()}.pdf`);
    success('Executive Disciplinary PDF Report exported successfully!');
  };

  // Export CSV Summary
  const handleExportCSV = () => {
    try {
      const headers = ['Category / Metric', 'Value / Details', 'Severity / Scope'];
      const rows = [
        ['Total Active Enrolled Students', totalStudentsCount, 'Verified in Directory'],
        ['Total Recorded Infractions', totalViolationsCount, 'Database Logged'],
        ['Minor Offenses (Uniform, ID, Tardy)', minorCount, 'Active Monitoring'],
        ['Serious Offenses (Disruptions, Cutting)', seriousCount, 'Interventions Required'],
        ['Major Offenses (Weapons, Contraband, Vandalism)', majorCount, 'Critical Review'],
        ...repeatOffenders.map(o => [`Repeat Offender: ${o.name}`, `${o.count} infractions (${o.grade})`, o.count >= 3 ? 'High Priority' : 'Standard Monitoring'])
      ];

      exportToCsv(`Viotrack_Executive_Summary_${Date.now()}`, headers, rows);
      success('Executive Disciplinary Summary exported as CSV!');
    } catch (err) {
      error('Failed to export CSV: ' + err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* 1. Header & Filter Section */}
      <div className="dashboard-header">
        {/* Simple, Modern Header */}
        <div className="dashboard-header-simple">
          <div className="welcome-info">
            <div className="welcome-title-row">
              <h1 className="welcome-title">
                Hi, {user?.name || 'Administrator'}
              </h1>
              <span className="welcome-role-tag">
                {user?.role === 'admin' ? 'Administrator' : 'Teacher'}
              </span>
            </div>
            <p className="welcome-subtitle">
              Here's what's happening with your school today
            </p>
          </div>

          {/* Clean Unified Quick Actions */}
          <div className="dashboard-actions-group">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="action-btn-clean primary log-violation-main-btn"
              title="Log a new violation"
            >
              <PlusCircle size={15} />
              <span>Log Violation</span>
            </button>

            <button
              onClick={() => navigate('/scan-qr')}
              className="action-btn-clean desktop-only-action scan-qr-btn"
              title="Scan Student QR Code"
            >
              <QrCode size={15} />
              <span>Scan QR</span>
            </button>

            <button
              onClick={handleExport}
              className="action-btn-clean"
              title="Export Summary Report as PDF"
            >
              <FileSpreadsheet size={15} />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="action-btn-clean"
              title="Export Summary Metrics as CSV"
            >
              <FileSpreadsheet size={15} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Clean, Streamlined Date Filter Bar */}
        <div className="date-filter-bar-clean">
          <div className="date-segmented-group">
            {[
              { id: 'today', label: 'Today', start: '2026-09-25', end: '2026-09-25' },
              { id: 'week', label: 'This Week', start: '2026-09-21', end: '2026-09-27' },
              { id: 'month', label: 'This Month', start: '2026-09-01', end: '2026-09-30' },
              { id: 'custom', label: 'Custom' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`date-segment-btn ${filterType === tab.id ? 'active' : ''}`}
                onClick={() => {
                  setFilterType(tab.id);
                  if (tab.start && tab.end) {
                    setStartDate(tab.start);
                    setEndDate(tab.end);
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filterType === 'custom' ? (
            <div className="custom-date-row-inline">
              <CustomDatePicker
                value={startDate}
                onChange={(val) => setStartDate(val)}
                placeholder="Start"
                compact
                showClear={false}
              />
              <span className="date-separator">to</span>
              <CustomDatePicker
                value={endDate}
                onChange={(val) => setEndDate(val)}
                placeholder="End"
                compact
                showClear={false}
                align="right"
              />
              <button
                type="button"
                className="btn-apply-date"
                onClick={() => success(`Applied date filter: ${startDate} to ${endDate}`)}
              >
                Apply
              </button>
            </div>
          ) : (
            <div className="date-active-badge">
              <CalendarDays size={14} color="#6366f1" />
              <span>
                {filterType === 'today' && 'Sep 25, 2026 (Today)'}
                {filterType === 'week' && 'Sep 21 – Sep 27, 2026 (This Week)'}
                {filterType === 'month' && 'Sep 01 – Sep 30, 2026 (This Month)'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. Top Stats Cards (5 Grid) */}
      <div className="stats-grid">
        {/* Minor Offense */}
        <div className="stat-card stat-minor">
          <div className="stat-info">
            <span className="stat-label">Minor Offense</span>
            <span className="stat-value">{minorCount}</span>
            <span className="stat-subtext">Active warning logs</span>
          </div>
          <div className="stat-icon minor">
            <CheckCircle2 size={22} strokeWidth={2.3} color="#10b981" />
          </div>
        </div>

        {/* Serious Offense */}
        <div className="stat-card stat-serious">
          <div className="stat-info">
            <span className="stat-label">Serious Offense</span>
            <span className="stat-value">{seriousCount}</span>
            <span className="stat-subtext">Faculty interventions</span>
          </div>
          <div className="stat-icon serious">
            <Clock size={22} strokeWidth={2.3} color="#f59e0b" />
          </div>
        </div>

        {/* Major Offense */}
        <div className="stat-card stat-major">
          <div className="stat-info">
            <span className="stat-label">Major Offense</span>
            <span className="stat-value">{majorCount}</span>
            <span className="stat-subtext">Guidance hearing cases</span>
          </div>
          <div className="stat-icon major">
            <AlertCircle size={22} strokeWidth={2.3} color="#ef4444" />
          </div>
        </div>

        {/* Total Students */}
        <div className="stat-card stat-students">
          <div className="stat-info">
            <span className="stat-label">Total Students</span>
            <span className="stat-value">{totalStudentsCount}</span>
            <span className="stat-subtext">Across all levels & strands</span>
          </div>
          <div className="stat-icon students">
            <Users size={22} strokeWidth={2.3} color="#2563eb" />
          </div>
        </div>

        {/* Total Violations */}
        <div className="stat-card stat-weekly">
          <div className="stat-info">
            <span className="stat-label">Total Violations</span>
            <span className="stat-value">{totalViolationsCount}</span>
            <span className="stat-subtext">Recorded incidents to date</span>
          </div>
          <div className="stat-icon weekly">
            <CalendarIcon size={22} strokeWidth={2.3} color="#6366f1" />
          </div>
        </div>
      </div>

      {/* 3. Violation Trends Chart */}
      <div className="card chart-card" style={{ padding: '22px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <TrendingUp size={22} color="#4f46e5" strokeWidth={2.4} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px' }}>
                  Violation Trends
                </h3>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: '8px', border: '1px solid #e0e7ff' }}>
                  Sep 01 – Sep 30, 2026
                </span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '2px 8px', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={11} color="#d97706" /> Peak: Week 2 (18 cases)
                </span>
              </div>
              <span style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                Timeline of student misconduct incidents by severity
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700 }}>
            <button
              onClick={() => setShowMinorSeries(!showMinorSeries)}
              style={{
                background: showMinorSeries ? '#ecfdf5' : '#f8fafc',
                color: showMinorSeries ? '#047857' : '#94a3b8',
                border: showMinorSeries ? '1.5px solid #a7f3d0' : '1px solid #e2e8f0',
                padding: '6px 13px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 700,
                fontSize: '12px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: showMinorSeries ? '0 2px 6px rgba(16, 185, 129, 0.15)' : 'none'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: showMinorSeries ? '#10b981' : '#cbd5e1', boxShadow: showMinorSeries ? '0 0 6px rgba(16,185,129,0.6)' : 'none' }} />
              Minor ({minorCount})
            </button>

            <button
              onClick={() => setShowSeriousSeries(!showSeriousSeries)}
              style={{
                background: showSeriousSeries ? '#fffbeb' : '#f8fafc',
                color: showSeriousSeries ? '#b45309' : '#94a3b8',
                border: showSeriousSeries ? '1.5px solid #fde68a' : '1px solid #e2e8f0',
                padding: '6px 13px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 700,
                fontSize: '12px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: showSeriousSeries ? '0 2px 6px rgba(245, 158, 11, 0.15)' : 'none'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: showSeriousSeries ? '#f59e0b' : '#cbd5e1', boxShadow: showSeriousSeries ? '0 0 6px rgba(245,158,11,0.6)' : 'none' }} />
              Serious ({seriousCount})
            </button>

            <button
              onClick={() => setShowMajorSeries(!showMajorSeries)}
              style={{
                background: showMajorSeries ? '#fef2f2' : '#f8fafc',
                color: showMajorSeries ? '#b91c1c' : '#94a3b8',
                border: showMajorSeries ? '1.5px solid #fecaca' : '1px solid #e2e8f0',
                padding: '6px 13px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                fontWeight: 700,
                fontSize: '12px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: showMajorSeries ? '0 2px 6px rgba(239, 68, 68, 0.15)' : 'none'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: showMajorSeries ? '#ef4444' : '#cbd5e1', boxShadow: showMajorSeries ? '0 0 6px rgba(239,68,68,0.6)' : 'none' }} />
              Major ({majorCount})
            </button>
          </div>
        </div>

        <div style={{ height: 300, width: '100%', marginTop: '8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 12, right: 12, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="minorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="seriousGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="majorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11.5} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
              <YAxis stroke="#94a3b8" fontSize={11.5} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} allowDecimals={false} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const totalPoint = payload.reduce((acc, curr) => acc + (curr.value || 0), 0);
                    return (
                      <div style={{ background: 'rgba(15, 23, 42, 0.94)', backdropFilter: 'blur(12px)', borderRadius: '12px', padding: '12px 16px', boxShadow: '0 12px 32px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', minWidth: '175px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>{label}</span>
                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8', background: 'rgba(56, 189, 248, 0.18)', padding: '2px 7px', borderRadius: '6px' }}>
                            {totalPoint} Cases
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {payload.map((entry) => (
                            <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, boxShadow: `0 0 8px ${entry.color}` }} />
                                <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{entry.name}</span>
                              </div>
                              <span style={{ fontWeight: 800, color: '#fff' }}>{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {showMinorSeries && (
                <Area type="monotone" dataKey="minor" name="Minor Offenses" stroke="#10b981" strokeWidth={2.8} fillOpacity={1} fill="url(#minorGradient)" activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff' }} />
              )}
              {showSeriousSeries && (
                <Area type="monotone" dataKey="serious" name="Serious Offenses" stroke="#f59e0b" strokeWidth={2.8} fillOpacity={1} fill="url(#seriousGradient)" activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff' }} />
              )}
              {showMajorSeries && (
                <Area type="monotone" dataKey="major" name="Major Offenses" stroke="#ef4444" strokeWidth={2.8} fillOpacity={1} fill="url(#majorGradient)" activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff' }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Two Column Grid 1: Repeat & High-Risk Offenders & Violations by Grade Level & Sections */}
      <div className="two-column-grid" style={{ alignItems: 'stretch' }}>
        {/* Repeat Offenders */}
        <div className="card" style={{ padding: '20px 22px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                <ShieldAlert size={22} color="#dc2626" style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', textAlign: 'left' }}>
                    Repeat & High-Risk Students
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textAlign: 'left' }}>
                    Ranked by cumulative disciplinary infractions
                  </span>
                </div>
              </div>

              {repeatOffenders.some(o => o.count >= 2) && (
                <span style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />
                  Action Required
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {paginatedOffenders.map((offender, idx) => {
                const rankNum = (offendersPage - 1) * offendersPerPage + idx + 1;
                const isCritical = offender.count >= 3;
                const isModerate = offender.count === 2;

                return (
                  <div
                    key={offender.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      background: isCritical ? '#fff8f8' : '#f8fafc',
                      border: isCritical ? '1.5px solid #fee2e2' : '1px solid #e2e8f0',
                      transition: 'all 0.2s ease',
                      gap: '10px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.borderColor = isCritical ? '#fca5a5' : '#cbd5e1';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = isCritical ? '#fee2e2' : '#e2e8f0';
                    }}
                  >
                    {/* Left: Rank & Avatar & Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      {/* Rank Badge */}
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 800,
                          background: rankNum === 1 ? '#fee2e2' : rankNum === 2 ? '#fef3c7' : '#f1f5f9',
                          color: rankNum === 1 ? '#dc2626' : rankNum === 2 ? '#d97706' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        #{rankNum}
                      </span>

                      {/* Actual Student Photo Avatar */}
                      <img
                        src={offender.image || `https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80`}
                        alt={offender.name}
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: isCritical ? '2px solid #ef4444' : isModerate ? '2px solid #f59e0b' : '2px solid #3b82f6',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                        onError={(e) => {
                          e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(offender.name)}&background=27367f&color=fff&size=50`;
                        }}
                      />

                      {/* Student Info */}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {offender.name}
                          </span>
                          <span style={{ fontSize: '10.5px', padding: '1px 6px', borderRadius: '4px', background: '#e2e8f0', color: '#334155', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {offender.grade}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', marginTop: '2px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ color: isCritical ? '#dc2626' : isModerate ? '#d97706' : '#2563eb', fontWeight: 700 }}>
                            {offender.count} {offender.count === 1 ? 'Recorded Offense' : 'Cumulative Infractions'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <button
                      onClick={() => navigate(`/student-violation/${offender.id}`)}
                      className="offender-profile-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        background: '#ffffff',
                        color: '#27367f',
                        border: '1.5px solid #cbd5e1',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = '#27367f';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = '#27367f';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#27367f';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }}
                    >
                      <span>View</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination anchored at bottom */}
          <div style={{ marginTop: '16px', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              Showing {(offendersPage - 1) * offendersPerPage + 1} - {Math.min(offendersPage * offendersPerPage, repeatOffenders.length)} of {repeatOffenders.length}
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                disabled={offendersPage <= 1}
                onClick={() => setOffendersPage(prev => Math.max(1, prev - 1))}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: offendersPage > 1 ? 'pointer' : 'default', fontSize: '12px' }}
              >
                ‹
              </button>
              {Array.from({ length: totalOffenderPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setOffendersPage(p)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: p === offendersPage ? '#27367f' : '#fff',
                    color: p === offendersPage ? '#fff' : '#334155',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {p}
                </button>
              ))}
              <button
                disabled={offendersPage >= totalOffenderPages}
                onClick={() => setOffendersPage(prev => Math.min(totalOffenderPages, prev + 1))}
                style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: offendersPage < totalOffenderPages ? 'pointer' : 'default', fontSize: '12px' }}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Violations by Grade Level & Sections */}
        <div className="card" style={{ padding: '20px 22px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                <GraduationCap size={22} color="#4338ca" style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', textAlign: 'left' }}>
                    Violations by Grade & Section
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textAlign: 'left' }}>
                    Distribution breakdown across active sections
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca', background: '#e0e7ff', padding: '3px 9px', borderRadius: '12px', alignSelf: 'flex-start' }}>
                6 Sections Tracked
              </span>
            </div>

            {/* Progress List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {gradeSectionBreakdown.map((grade, idx) => {
                const isTop = idx === 0;
                return (
                  <div key={grade.grade_section} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Grade label */}
                    <div style={{ minWidth: '100px', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          background: isTop ? '#e0e7ff' : '#f1f5f9',
                          color: isTop ? '#4338ca' : '#64748b'
                        }}
                      >
                        {grade.grade_section.split(' - ')[0]}
                      </span>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                        {grade.grade_section.split(' - ')[1] || grade.grade_section}
                      </span>
                    </div>

                    {/* Gradient Bar Track */}
                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${grade.percent}%`,
                          borderRadius: '10px',
                          background: isTop
                            ? 'linear-gradient(90deg, #27367f 0%, #4338ca 50%, #6366f1 100%)'
                            : 'linear-gradient(90deg, #6366f1 0%, #818cf8 100%)',
                          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                      />
                    </div>

                    {/* Count & Percent */}
                    <div style={{ minWidth: '60px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: isTop ? '#0f172a' : '#475569' }}>
                        {grade.count}
                      </span>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                        ({grade.percent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgraded Actionable Insight Banner anchored at bottom */}
          <div
            style={{
              marginTop: '16px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <div style={{ width: 26, height: 26, borderRadius: '7px', background: '#16a34a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <Lightbulb size={15} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d', display: 'block' }}>
                Disciplinary Intervention Insight
              </span>
              <span style={{ fontSize: '11.5px', color: '#166534', lineHeight: 1.4, display: 'block', marginTop: '2px' }}>
                <strong>Grade 10 - Rizal</strong> currently accounts for <strong>5 logged incidents</strong> (highest volume). Recommendation: Coordinate with Class Adviser for orientation.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Two Column Grid 2: Violation Percentage (Donut) & Violations by Category */}
      <div className="two-column-grid">
        {/* Violation Percentage Donut */}
        <div className="card" style={{ padding: '22px 24px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                <TrendingUp size={22} color="#4f46e5" strokeWidth={2.4} style={{ flexShrink: 0 }} />
                <div style={{ textAlign: 'left' }}>
                  <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.3px', textAlign: 'left' }}>
                    Violation Distribution
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b', display: 'block', textAlign: 'left' }}>
                    Proportional breakdown by incident severity
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#4f46e5', background: '#eef2ff', padding: '3px 9px', borderRadius: '10px', border: '1px solid #e0e7ff', alignSelf: 'flex-start' }}>
                {totalAllCount} Total Cases
              </span>
            </div>

            {/* Donut Chart with In-Ring Center Overlay */}
            <div style={{ position: 'relative', width: '100%', height: 215, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={66}
                    outerRadius={92}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setHoveredDonutCategory(donutData[index])}
                    onMouseLeave={() => setHoveredDonutCategory(null)}
                  >
                    {donutData.map((entry) => {
                      const isHovered = hoveredDonutCategory?.name === entry.name;
                      return (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          stroke="#ffffff"
                          strokeWidth={isHovered ? 3.5 : 2.5}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            outline: 'none',
                            opacity: hoveredDonutCategory ? (isHovered ? 1 : 0.65) : 1,
                            filter: isHovered ? `drop-shadow(0 0 6px ${entry.color}80)` : 'none'
                          }}
                        />
                      );
                    })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* In-Ring Centered Metric */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {hoveredDonutCategory ? hoveredDonutCategory.name : 'Total Logged'}
                </span>
                <span style={{ fontSize: '30px', fontWeight: 800, color: '#0f172a', lineHeight: 1.05, margin: '1px 0 2px 0' }}>
                  {hoveredDonutCategory ? hoveredDonutCategory.value : totalAllCount}
                </span>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 700,
                  color: hoveredDonutCategory ? hoveredDonutCategory.color : '#4f46e5',
                  background: hoveredDonutCategory ? hoveredDonutCategory.bgLight : '#eef2ff',
                  border: `1px solid ${hoveredDonutCategory ? hoveredDonutCategory.borderColor : '#e0e7ff'}`,
                  padding: '1px 6px',
                  borderRadius: '8px'
                }}>
                  {hoveredDonutCategory ? `${hoveredDonutCategory.percent}% of total` : '100% Breakdown'}
                </span>
              </div>
            </div>

            {/* Interactive Category Cards / Progress Bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {donutData.map((item) => {
                const isHovered = hoveredDonutCategory?.name === item.name;
                const IconComponent = item.name === 'Minor' ? CheckCircle2 : item.name === 'Serious' ? Clock : AlertCircle;
                return (
                  <div
                    key={item.name}
                    onMouseEnter={() => setHoveredDonutCategory(item)}
                    onMouseLeave={() => setHoveredDonutCategory(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                      padding: '9px 12px',
                      borderRadius: '12px',
                      background: isHovered ? item.bgLight : '#f8fafc',
                      border: isHovered ? `1.5px solid ${item.borderColor}` : '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isHovered ? 'translateY(-1px)' : 'none',
                      boxShadow: isHovered ? `0 4px 12px ${item.color}20` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 22, height: 22, borderRadius: '6px', background: item.bgLight, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconComponent size={13} strokeWidth={2.4} />
                        </div>
                        <div>
                          <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                            {item.label}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#64748b', marginLeft: '5px' }}>
                            • {item.desc}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{item.value}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: item.color, background: item.bgLight, border: `1px solid ${item.borderColor}`, padding: '1px 6px', borderRadius: '6px' }}>
                          {item.percent}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height: '4.5px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden', marginTop: '1px' }}>
                      <div style={{ height: '100%', width: `${item.percent}%`, backgroundColor: item.color, borderRadius: '10px', transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Violations by Category */}
        <div className="card" style={{ padding: '20px 22px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
          <div className="card-header" style={{ marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <FileText size={22} color="#27367f" style={{ flexShrink: 0 }} />
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ margin: 0, fontSize: '16.5px', fontWeight: 800, color: '#0f172a', textAlign: 'left' }}>Violations by Category</h3>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, alignSelf: 'flex-start', textAlign: 'left' }}>Sep 01 - Sep 30</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {categoryViolations.map((cat) => {
              const barColor = cat.type === 'minor' ? '#22c55e' : cat.type === 'serious' ? '#f59e0b' : '#ef4444';
              return (
                <div key={cat.name} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#1e293b' }}>
                      {cat.name}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{cat.count}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', background: '#fef2f2', padding: '1px 6px', borderRadius: '4px' }}>
                        +{cat.percentage}%
                      </span>
                    </div>
                  </div>
                  <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(cat.percentage * 2.2, 100)}%`, backgroundColor: barColor, borderRadius: '10px', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="category-footer" style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
            <div className="legend-inline" style={{ display: 'flex', gap: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span className="dot major" /> Major</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span className="dot serious" /> Serious</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span className="dot minor" /> Minor</span>
            </div>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Total: {totalViolationsCount} violations</span>
          </div>
        </div>
      </div>

      {/* 6. Clean, Integrated Meeting & Disciplinary Calendar */}
      <div className="card" style={{ padding: '20px 22px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)' }}>
        <div className="card-header" style={{ marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays size={22} color="#27367f" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#111827' }}>
              Meeting & Disciplinary Calendar
            </h3>
          </div>
          <span style={{ fontSize: '12.5px', color: '#64748b' }}>
            Disciplinary hearings, parent conferences & logged cases
          </span>
        </div>

        {/* Integrated Grid: Left Month Grid & Right Agenda Stream */}
        <div className="calendar-layout-grid">
          
          {/* Left Column: Integrated Month Calendar */}
          <div>
            {/* Sleek Month Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15.5px', fontWeight: 800, color: '#111827', letterSpacing: '-0.3px' }}>
                  {monthName}
                </span>
                <span
                  onClick={() => {
                    setCurrentMonth(new Date(2026, 8, 1));
                    setSelectedCalendarDate(5);
                  }}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#27367f',
                    background: '#e0e7ff',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Today
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                  onMouseOut={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Weekdays Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', marginBottom: '6px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <span key={day} style={{ fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', padding: '3px 0' }}>
                  {day}
                </span>
              ))}
            </div>

            {/* Day Tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
              {calendarDays.map((item) => {
                if (item.empty) {
                  return <div key={item.key} style={{ height: 36 }} />;
                }
                const isSelected = item.day === selectedCalendarDate;
                const isToday = item.day === 24;
                const hasEvents = item.events && item.events.length > 0;

                return (
                  <div
                    key={item.key}
                    onClick={() => setSelectedCalendarDate(item.day)}
                    style={{
                      height: 38,
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: isSelected ? '#27367f' : isToday ? '#f0fdf4' : '#ffffff',
                      color: isSelected ? '#ffffff' : isToday ? '#166534' : '#334155',
                      border: isSelected ? '1px solid #1e293b' : isToday ? '1px solid #86efac' : '1px solid #f1f5f9',
                      fontWeight: isSelected || isToday ? 800 : 600,
                      fontSize: '12.5px',
                      position: 'relative',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = '#f8fafc';
                        e.currentTarget.style.borderColor = '#cbd5e1';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = isToday ? '#f0fdf4' : '#ffffff';
                        e.currentTarget.style.borderColor = isToday ? '#86efac' : '#f1f5f9';
                      }
                    }}
                  >
                    <span>{item.day}</span>
                    {hasEvents && (
                      <div style={{ display: 'flex', gap: '3px', position: 'absolute', bottom: '3px' }}>
                        {item.hasMinor && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#4ade80' : '#22c55e' }} />}
                        {item.hasSerious && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fde047' : '#f59e0b' }} />}
                        {item.hasMajor && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fca5a5' : '#ef4444' }} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #f1f5f9', fontSize: '11.5px', color: '#64748b' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} /> Minor
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b' }} /> Serious
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ef4444' }} /> Major
              </span>
            </div>
          </div>

          {/* Right Column: Case & Meeting Details Panel */}
          <div className="calendar-agenda-column">
            
            {/* Agenda Header & Action Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                  Schedule for September {selectedCalendarDate}, 2026
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {selectedDayItems.length} hearing(s) / case(s) scheduled
                </span>
              </div>

              <button
                onClick={() => setIsAddingMeeting(!isAddingMeeting)}
                style={{
                  background: isAddingMeeting ? '#f1f5f9' : '#27367f',
                  color: isAddingMeeting ? '#475569' : '#ffffff',
                  border: isAddingMeeting ? '1px solid #cbd5e1' : 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                {isAddingMeeting ? <X size={13} /> : <Plus size={13} />}
                {isAddingMeeting ? 'Cancel' : 'Schedule Case'}
              </button>
            </div>

            {/* Inline Add Case Form */}
            {isAddingMeeting && (
              <form
                onSubmit={handleAddMeeting}
                style={{
                  background: '#f8fafc',
                  borderRadius: '12px',
                  padding: '14px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '3px' }}>
                      Student Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Edcel B. Besa"
                      value={newMeetingForm.student}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, student: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '3px' }}>
                      Scheduled Time
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 09:30 AM"
                      value={newMeetingForm.time}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, time: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '3px' }}>
                      Classification
                    </label>
                    <CustomSelect
                      value={newMeetingForm.type}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, type: e.target.value })}
                      options={[
                        { value: 'Minor', label: 'Minor Offense' },
                        { value: 'Serious', label: 'Serious Offense' },
                        { value: 'Major', label: 'Major Offense / Hearing' },
                      ]}
                      size="sm"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '3px' }}>
                      Case Status
                    </label>
                    <CustomSelect
                      value={newMeetingForm.status}
                      onChange={(e) => setNewMeetingForm({ ...newMeetingForm, status: e.target.value })}
                      options={[
                        { value: 'Pending', label: 'Pending Review' },
                        { value: 'Resolved', label: 'Resolved' },
                        { value: 'Escalated', label: 'Escalated to Guidance' },
                      ]}
                      size="sm"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '3px' }}>
                    Reason & Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter incident context, parent summons, or counseling remarks..."
                    value={newMeetingForm.reason}
                    onChange={(e) => setNewMeetingForm({ ...newMeetingForm, reason: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingMeeting(false)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', background: '#27367f', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Save to Schedule
                  </button>
                </div>
              </form>
            )}

            {/* List of Cases / Events for Selected Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {selectedDayItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#9ca3af', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                  <CalendarDays size={28} color="#cbd5e1" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: '#64748b', fontSize: '13px' }}>No hearings or cases scheduled</p>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>No entries logged for September {selectedCalendarDate}, 2026.</span>
                </div>
              ) : (
                selectedDayItems.map((item) => {
                  const isMajor = item.type === 'Major';
                  const isSerious = item.type === 'Serious';
                  const isResolved = item.status === 'Resolved';

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        borderLeft: `4px solid ${isMajor ? '#ef4444' : isSerious ? '#f59e0b' : '#22c55e'}`,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: '50%',
                              background: '#e0e7ff',
                              color: '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px',
                              flexShrink: 0
                            }}
                          >
                            {item.student.charAt(0)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '13.5px', color: '#1e293b', display: 'block' }}>
                              {item.student}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                              {item.grade || 'Grade 7 - Diamond'}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: isMajor ? '#fee2e2' : isSerious ? '#fef3c7' : '#dcfce7',
                              color: isMajor ? '#dc2626' : isSerious ? '#d97706' : '#15803d',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}
                          >
                            {item.type}
                          </span>

                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: isResolved ? '#dcfce7' : '#f1f5f9',
                              color: isResolved ? '#15803d' : '#475569'
                            }}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <div style={{ fontSize: '12px', color: '#334155', background: '#f8fafc', padding: '7px 10px', borderRadius: '7px', border: '1px solid #f1f5f9' }}>
                        {item.reason}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                        <span style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <Clock size={12} color="#94a3b8" /> {item.time}
                        </span>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => {
                              const newSt = item.status === 'Resolved' ? 'Pending' : 'Resolved';
                              setCalendarEvents(prev => ({
                                ...prev,
                                [selectedCalendarDate]: (prev[selectedCalendarDate] || []).map(ev => ev.id === item.id ? { ...ev, status: newSt } : ev)
                              }));
                              success(`Case marked as ${newSt}!`);
                            }}
                            style={{
                              padding: '4px 9px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: isResolved ? '#dc2626' : '#16a34a',
                              cursor: 'pointer'
                            }}
                          >
                            {isResolved ? 'Re-open' : 'Mark Resolved'}
                          </button>

                          <button
                            onClick={() => handleDeleteMeeting(item.id)}
                            title="Remove"
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              background: '#fff',
                              color: '#ef4444',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
      </div>
    </div>

      {/* Add Violation Modal */}
      <AddViolationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRecordAdded={(newRec) => {
          setRecords([newRec, ...records]);
          success('Incident recorded successfully!');
        }}
      />

      {/* Status Modal */}
      {recordForStatusChange && (
        <StatusModal
          isOpen={!!recordForStatusChange}
          onClose={() => setRecordForStatusChange(null)}
          record={recordForStatusChange}
          onUpdated={(id, newStatus) => {
            setRecords(records.map(r => r.id === id ? { ...r, status: newStatus } : r));
            success(`Status updated to "${newStatus}"!`);
          }}
        />
      )}
    </div>
  );
};
