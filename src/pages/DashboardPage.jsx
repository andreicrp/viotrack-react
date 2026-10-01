import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import {
  QrCode,
  PlusCircle,
  Users,
  Calendar as CalendarIcon,
  TrendingUp,
  ShieldCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  GraduationCap,
  AlertCircle,
  CalendarDays,
  User,
  Lightbulb,
  FileText,
  Bell,
  ArrowUp,
  BookOpen,
  Sparkles,
  Compass
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { SchoolCalendarModal } from '../components/common/SchoolCalendarModal';
import { CustomDatePicker } from '../components/common/CustomDatePicker';
import { CustomDateRangeModal } from '../components/common/CustomDateRangeModal';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportToCsv } from '../utils/csvHelper';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { success, info } = useNotification();
  const navigate = useNavigate();

  // Filter & Date States
  const [chartFilter, setChartFilter] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState('2026-09-01');
  const [endDate, setEndDate] = useState('2026-09-30');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // Series visibility toggles
  const [showMinor, setShowMinor] = useState(true);
  const [showSerious, setShowSerious] = useState(true);
  const [showMajor, setShowMajor] = useState(true);

  // Data States
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Repeat Offenders Pagination
  const [offendersPage, setOffendersPage] = useState(1);
  const offendersPerPage = 4;

  // Calendar State (defaults to September 2026, day 23 selected)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(23);
  const [calendarMonth, setCalendarMonth] = useState(new Date(2026, 8, 1));
  const [schoolEvents, setSchoolEvents] = useState([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    const handleEventsUpdate = async () => {
      try {
        const eData = await dataService.getSchoolEvents();
        setSchoolEvents(eData || []);
      } catch (err) {
        console.error(err);
      }
    };
    window.addEventListener('viotrack_data_updated', handleUpdate);
    window.addEventListener('viotrack_events_updated', handleEventsUpdate);
    return () => {
      window.removeEventListener('viotrack_data_updated', handleUpdate);
      window.removeEventListener('viotrack_events_updated', handleEventsUpdate);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sData, rData, eData] = await Promise.all([
        dataService.getStudents(),
        dataService.getRecords(),
        dataService.getSchoolEvents()
      ]);
      setStudents(sData || []);
      setRecords(rData || []);
      setSchoolEvents(eData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics from records or high-fidelity defaults from design - optimized single pass
  const { minorCount, seriousCount, majorCount, totalStudentsCount, totalViolationsCount } = useMemo(() => {
    let minor = 0;
    let serious = 0;
    let major = 0;

    for (let i = 0; i < records.length; i++) {
      const type = (records[i].violation?.type || records[i].type || '').toLowerCase();
      if (type === 'minor') minor++;
      else if (type === 'serious') serious++;
      else if (type === 'major') major++;
    }

    return {
      minorCount: records.length ? minor : 3,
      seriousCount: records.length ? serious : 1,
      majorCount: records.length ? major : 1,
      totalStudentsCount: students.length || 6,
      totalViolationsCount: records.length || 5
    };
  }, [records, students]);

  // Trend Chart Data exactly mirroring the smooth curves in the reference image
  const trendData = useMemo(() => {
    if (chartFilter === 'today') {
      return [
        { time: '07:00 – 09:00', minor: 1.2, serious: 0.0, major: 0.0 },
        { time: '09:00 – 11:00', minor: 3.8, serious: 1.2, major: 0.2 },
        { time: '11:00 – 13:00', minor: 6.5, serious: 2.4, major: 0.8 },
        { time: '13:00 – 15:00', minor: 4.8, serious: 1.5, major: 0.4 },
        { time: '15:00 – 17:00', minor: 2.1, serious: 0.6, major: 0.0 }
      ];
    } else if (chartFilter === 'week') {
      return [
        { time: 'Mon (Sep 22)', minor: 4.2, serious: 1.0, major: 0.2 },
        { time: 'Tue (Sep 23)', minor: 6.8, serious: 2.1, major: 1.0 },
        { time: 'Wed (Sep 24)', minor: 9.6, serious: 3.9, major: 2.1 },
        { time: 'Thu (Sep 25)', minor: 7.4, serious: 2.5, major: 1.2 },
        { time: 'Fri (Sep 26)', minor: 5.1, serious: 1.8, major: 0.8 },
        { time: 'Sat (Sep 27)', minor: 2.0, serious: 0.5, major: 0.1 }
      ];
    } else if (chartFilter === 'custom') {
      return [
        { time: `${startDate}`, minor: 3.0, serious: 1.2, major: 0.4 },
        { time: 'Interval 1', minor: 5.5, serious: 2.0, major: 0.8 },
        { time: 'Interval 2', minor: 8.2, serious: 3.1, major: 1.5 },
        { time: 'Interval 3', minor: 6.4, serious: 2.4, major: 1.0 },
        { time: `${endDate}`, minor: 4.1, serious: 1.1, major: 0.3 }
      ];
    } else {
      // Month view matching the visual chart in the screenshot
      return [
        { time: 'Sep 1 – 7', minor: 6.5, serious: 1.5, major: 0.6 },
        { time: 'Sep 8 – 14', minor: 10.5, serious: 3.8, major: 2.0 },
        { time: 'Sep 15 – 21', minor: 6.2, serious: 1.4, major: 0.5 },
        { time: 'Sep 22 – 28', minor: 9.6, serious: 3.9, major: 2.1 },
        { time: 'Sep 29 – 30', minor: 4.5, serious: 1.5, major: 0.6 }
      ];
    }
  }, [chartFilter, startDate, endDate]);

  // Repeat & High-Risk Students List
  const repeatStudentsList = useMemo(() => {
    return [
      {
        id: 1,
        rank: 1,
        name: 'Alexander Mendoza',
        grade: 'Grade 10 – Rizal',
        infractions: 2,
        infractionLabel: '2 Infractions',
        image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
        badgeType: 'amber'
      },
      {
        id: 3,
        rank: 2,
        name: 'Gabriel Torres',
        grade: 'Grade 10 – Bonifacio',
        infractions: 1,
        infractionLabel: '1 Infraction',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        badgeType: 'slate'
      },
      {
        id: 4,
        rank: 3,
        name: 'Isabella Ramos',
        grade: 'Grade 11 – STEM A',
        infractions: 1,
        infractionLabel: '1 Infraction',
        image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
        badgeType: 'slate'
      },
      {
        id: 5,
        rank: 4,
        name: 'Christian Navarro',
        grade: 'Grade 11 – STEM A',
        infractions: 1,
        infractionLabel: '1 Infraction',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        badgeType: 'slate'
      },
      {
        id: 2,
        rank: 5,
        name: 'Sophia Villanueva',
        grade: 'Grade 10 – Rizal',
        infractions: 1,
        infractionLabel: '1 Infraction',
        image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
        badgeType: 'slate'
      }
    ];
  }, []);

  // Section Breakdown Data
  const sectionBreakdown = [
    { grade: 'Grade 10', section: 'Rizal', count: 5, pct: '100%', fillPct: 100 },
    { grade: 'Grade 7', section: 'Diamond', count: 4, pct: '80%', fillPct: 80 },
    { grade: 'Grade 8', section: 'Emerald', count: 3, pct: '60%', fillPct: 60 },
    { grade: 'Grade 9', section: 'Ruby', count: 2, pct: '40%', fillPct: 40 },
    { grade: 'Grade 11', section: 'STEM A', count: 1, pct: '20%', fillPct: 20 },
    { grade: 'Grade 12', section: 'HUMSS B', count: 1, pct: '20%', fillPct: 20 }
  ];

  // Calendar Day Generation based on calendarMonth and dynamic schoolEvents
  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ empty: true, key: `empty-${year}-${month}-${i}` });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      const dayEvents = schoolEvents.filter(e => e.date === dateStr);
      const dots = [];
      if (dayEvents.some(e => e.color === '#10b981' || e.category === 'faculty')) dots.push({ color: '#10b981', type: 'green' });
      if (dayEvents.some(e => e.color === '#ef4444' || e.category === 'disciplinary')) dots.push({ color: '#ef4444', type: 'red' });
      if (dayEvents.some(e => e.color === '#07345f' || e.category === 'academic')) dots.push({ color: '#2563eb', type: 'academic' });
      if (dayEvents.some(e => e.color === '#8b5cf6' || e.category === 'activity')) dots.push({ color: '#8b5cf6', type: 'activity' });

      days.push({
        day: d,
        key: `day-${year}-${month}-${d}`,
        dateStr,
        dots,
        hasEvents: dayEvents.length > 0,
        dayEvents
      });
    }

    return days;
  }, [calendarMonth, schoolEvents]);

  // Dynamic Events for Selected Date / Upcoming
  const displayedCalendarEvents = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(selectedCalendarDate || 1).padStart(2, '0');
    const selectedDateStr = `${year}-${monthStr}-${dayStr}`;

    const exactDayEvents = schoolEvents.filter(e => e.date === selectedDateStr);
    if (exactDayEvents.length > 0) {
      return {
        label: `Events on ${calendarMonth.toLocaleDateString('en-US', { month: 'short' })} ${selectedCalendarDate}`,
        events: exactDayEvents,
        isExactDay: true
      };
    }

    const upcoming = schoolEvents
      .filter(e => e.date >= selectedDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (upcoming.length > 0) {
      return {
        label: `Upcoming from ${calendarMonth.toLocaleDateString('en-US', { month: 'short' })} ${selectedCalendarDate}`,
        events: upcoming.slice(0, 3),
        isExactDay: false
      };
    }

    return {
      label: 'Upcoming Events',
      events: schoolEvents.slice(0, 3),
      isExactDay: false
    };
  }, [calendarMonth, selectedCalendarDate, schoolEvents]);

  // Export Executive PDF Report
  const handleExport = () => {
    try {
      const doc = new jsPDF();
      doc.setFillColor(11, 25, 44);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('VIOTRACK - Executive School Disciplinary Report', 14, 12);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()} | Scope: September 2026`, 14, 20);

      doc.setTextColor(30, 41, 59);
      doc.autoTable({
        head: [['Key Disciplinary Metric', 'Count', 'Trend / Status']],
        body: [
          ['Minor Offense', minorCount, '↑ 12% (Active warning logs)'],
          ['Serious Offense', seriousCount, '↑ 0% (Faculty interventions)'],
          ['Major Offense', majorCount, '↑ 0% (Guidance hearing cases)'],
          ['Total Students', totalStudentsCount, '↑ 2% (Across all levels & strands)'],
          ['Total Violations', totalViolationsCount, '↑ 25% (Recorded incidents to date)']
        ],
        startY: 34,
        theme: 'grid',
        headStyles: { fillColor: [11, 25, 44], fontStyle: 'bold' }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Repeat & High-Risk Students', 14, finalY);

      doc.autoTable({
        head: [['Rank', 'Student Name', 'Grade & Section', 'Infractions']],
        body: repeatStudentsList.map(s => [
          `#${s.rank}`,
          s.name,
          s.grade,
          s.infractionLabel
        ]),
        startY: finalY + 4,
        theme: 'striped',
        headStyles: { fillColor: [39, 54, 127] }
      });

      doc.save(`Viotrack_Summary_Report_${Date.now()}.pdf`);
      success('Executive Summary PDF report exported successfully!');
    } catch (err) {
      console.error(err);
      info('Could not export PDF report.');
    }
  };

  return (
    <div className="dashboard-root">
      {/* 1. Header & Filters Section */}
      <div className="dash-top-header">
        {/* Top Greeting & Top Actions */}
        <div className="dash-top-row-main">
          {/* Greeting */}
          <div className="dash-greeting-area">
            <div className="dash-greeting-title-line">
              <h1 className="dash-greeting-title">
                Hi, {user?.name || 'System Admin'}
              </h1>
              <span className="dash-role-pill">
                {user?.role === 'teacher' ? 'Faculty Teacher' : 'Administrator'}
              </span>
            </div>
            <p className="dash-greeting-subtitle">
              Here's what's happening with your school today
            </p>
          </div>

          {/* Top Right Controls */}
          <div className="dash-top-actions-right">
            {/* Log Violation Primary Button */}
            <button
              type="button"
              className="dash-log-violation-btn"
              onClick={() => setIsAddModalOpen(true)}
              id="logViolationBtn"
            >
              <PlusCircle size={15} strokeWidth={2.4} />
              <span>Log Violation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top 5 Stat Metric Cards Row */}
      <div className="dash-stats-grid-5">
        {/* Card 1: Minor Offense */}
        <div className="dash-stat-card-clean card-minor">
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle minor">
              <ShieldCheck size={24} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Minor Offense</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{minorCount}</span>
                <span className="dash-stat-trend-tag">
                  <ArrowUp size={12} strokeWidth={2.8} /> 12%
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="dash-stat-chevron-right" />
          </div>
          <p className="dash-stat-bottom-text">Active warning logs</p>
        </div>

        {/* Card 2: Serious Offense */}
        <div className="dash-stat-card-clean card-serious">
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle serious">
              <Clock size={24} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Serious Offense</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{seriousCount}</span>
                <span className="dash-stat-trend-tag">
                  <ArrowUp size={12} strokeWidth={2.8} /> 0%
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="dash-stat-chevron-right" />
          </div>
          <p className="dash-stat-bottom-text">Faculty interventions</p>
        </div>

        {/* Card 3: Major Offense */}
        <div className="dash-stat-card-clean card-major">
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle major">
              <AlertCircle size={24} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Major Offense</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{majorCount}</span>
                <span className="dash-stat-trend-tag">
                  <ArrowUp size={12} strokeWidth={2.8} /> 0%
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="dash-stat-chevron-right" />
          </div>
          <p className="dash-stat-bottom-text">Guidance hearing cases</p>
        </div>

        {/* Card 4: Total Students */}
        <div className="dash-stat-card-clean card-students">
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle students">
              <Users size={24} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Total Students</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{totalStudentsCount}</span>
                <span className="dash-stat-trend-tag">
                  <ArrowUp size={12} strokeWidth={2.8} /> 2%
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="dash-stat-chevron-right" />
          </div>
          <p className="dash-stat-bottom-text">Across all levels & strands</p>
        </div>

        {/* Card 5: Total Violations */}
        <div className="dash-stat-card-clean card-violations">
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle violations">
              <CalendarIcon size={24} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Total Violations</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{totalViolationsCount}</span>
                <span className="dash-stat-trend-tag">
                  <ArrowUp size={12} strokeWidth={2.8} /> 25%
                </span>
              </div>
            </div>
            <ChevronRight size={16} className="dash-stat-chevron-right" />
          </div>
          <p className="dash-stat-bottom-text">Recorded incidents to date</p>
        </div>
      </div>

      {/* 3. Violation Trends Chart Section */}
      <div className="dash-trends-card">
        <div className="dash-trends-header">
          {/* Title on Left */}
          <div className="dash-trends-title-left">
            <TrendingUp size={22} color="#1f2937" strokeWidth={2.4} />
            <div>
              <h2 className="dash-trends-main-title">Violation Trends</h2>
              <p className="dash-trends-sub-title">Timeline of student misconduct incidents by severity</p>
            </div>
          </div>

          {/* Controls on Right: Legend & Segment Tabs */}
          <div className="dash-trends-controls-right">
            <div className="dash-trends-legend">
              <div
                className="dash-legend-item"
                onClick={() => setShowMinor(!showMinor)}
                style={{ opacity: showMinor ? 1 : 0.4 }}
              >
                <span className="dash-legend-dot minor" />
                <span>Minor</span>
              </div>
              <div
                className="dash-legend-item"
                onClick={() => setShowSerious(!showSerious)}
                style={{ opacity: showSerious ? 1 : 0.4 }}
              >
                <span className="dash-legend-dot serious" />
                <span>Serious</span>
              </div>
              <div
                className="dash-legend-item"
                onClick={() => setShowMajor(!showMajor)}
                style={{ opacity: showMajor ? 1 : 0.4 }}
              >
                <span className="dash-legend-dot major" />
                <span>Major</span>
              </div>
            </div>

            <div className="dash-segmented-pills">
              {[
                { id: 'today', label: 'Today' },
                { id: 'month', label: 'This Month' },
                { id: 'week', label: 'This Week' },
                { id: 'custom', label: 'Custom' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`dash-segment-btn ${chartFilter === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    if (tab.id === 'custom') {
                      setIsCustomModalOpen(true);
                    } else {
                      setChartFilter(tab.id);
                    }
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div style={{ width: '100%', height: 260, marginTop: '8px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="minorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="seriousGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="majorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                stroke="#94a3b8"
                fontSize={11.5}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={11.5}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                ticks={[0, 3, 6, 9, 12]}
                domain={[0, 12]}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div style={{ background: '#ffffff', borderRadius: '10px', padding: '10px 14px', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '12px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)', minWidth: '130px' }}>
                        <div style={{ fontWeight: 700, marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '11.5px' }}>
                          {label}
                        </div>
                        {payload.map(p => (
                          <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', margin: '3px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color }} />
                              <span style={{ color: p.color, fontWeight: 700 }}>{p.name}:</span>
                            </div>
                            <span style={{ fontWeight: 800, color: '#0f172a' }}>{p.value}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {showMinor && (
                <Area
                  type="monotone"
                  dataKey="minor"
                  name="Minor"
                  stroke="#10b981"
                  strokeWidth={2.4}
                  fillOpacity={1}
                  fill="url(#minorGrad)"
                  dot={{ r: 3.5, strokeWidth: 2, stroke: '#ffffff', fill: '#10b981' }}
                  activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#10b981' }}
                />
              )}

              {showSerious && (
                <Area
                  type="monotone"
                  dataKey="serious"
                  name="Serious"
                  stroke="#f59e0b"
                  strokeWidth={2.4}
                  fillOpacity={1}
                  fill="url(#seriousGrad)"
                  dot={{ r: 3.5, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
                  activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
                />
              )}

              {showMajor && (
                <Area
                  type="monotone"
                  dataKey="major"
                  name="Major"
                  stroke="#ef4444"
                  strokeWidth={2.4}
                  fillOpacity={1}
                  fill="url(#majorGrad)"
                  dot={{ r: 3.5, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                  activeDot={{ r: 5.5, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Bottom 3-Column Section */}
      <div className="dash-bottom-3col-grid">
        {/* Column 1: Repeat & High-Risk Students */}
        <div className="dash-bottom-card">
          <div className="dash-card-header-clean">
            <div className="dash-card-header-left">
              <ShieldAlert size={20} color="#1f2937" />
              <div>
                <h2 className="dash-card-header-title">Repeat & High-Risk Students</h2>
                <p className="dash-card-header-desc">Ranked by cumulative disciplinary infractions</p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="dash-offenders-list">
            {repeatStudentsList.map(st => (
              <div key={st.id} className="dash-offender-row">
                <div className="dash-offender-left">
                  <span className={`dash-rank-badge rank-${st.rank}`}>
                    #{st.rank}
                  </span>
                  <img
                    src={st.image}
                    alt={st.name}
                    className="dash-offender-avatar"
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=0b192c&color=fff&size=50`;
                    }}
                  />
                  <div className="dash-offender-meta">
                    <span className="dash-offender-name">{st.name}</span>
                    <span className="dash-offender-grade">{st.grade}</span>
                  </div>
                </div>

                <div className="dash-offender-right">
                  <span className={`dash-infraction-pill ${st.badgeType}`}>
                    {st.infractionLabel}
                  </span>
                  <button
                    type="button"
                    className="dash-btn-view-offender"
                    onClick={() => navigate(`/student-violation/${st.id}`)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Pagination */}
          <div className="dash-card-footer-pagination pagination-footer-responsive">
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>Showing 1 – {repeatStudentsList.length} of {repeatStudentsList.length}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setOffendersPage(1)}
              >
                ‹
              </button>
              <button
                type="button"
                style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: '#0b192c', color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                1
              </button>
              <button
                type="button"
                style={{ width: 24, height: 24, borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setOffendersPage(1)}
              >
                ›
              </button>
            </div>
          </div>
        </div>

        {/* Column 2: Violations by Grade & Section */}
        <div className="dash-bottom-card">
          <div className="dash-card-header-clean">
            <div className="dash-card-header-left">
              <GraduationCap size={20} color="#1f2937" />
              <div>
                <h2 className="dash-card-header-title">Violations by Grade & Section</h2>
                <p className="dash-card-header-desc">Distribution breakdown across active sections</p>
              </div>
            </div>
          </div>

          {/* Horizontal Bar Breakdown */}
          <div className="dash-sections-list">
            {sectionBreakdown.map((sec) => (
              <div key={sec.section} className="dash-section-bar-row">
                <span className="dash-section-tag">{sec.grade}</span>
                <span className="dash-section-name" title={sec.section}>{sec.section}</span>
                <div className="dash-section-track">
                  <div
                    className="dash-section-fill"
                    style={{ width: `${sec.fillPct}%` }}
                  />
                </div>
                <div className="dash-section-count-pct">
                  <span className="dash-sec-count-num">{sec.count}</span>
                  <span className="dash-sec-count-pct-sub">({sec.pct})</span>
                </div>
              </div>
            ))}
          </div>

          {/* Insight Callout Box */}
          <div className="dash-insight-banner">
            <div className="dash-insight-icon-wrap">
              <Lightbulb size={15} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div>
              <h4 className="dash-insight-title">Disciplinary Intervention Insight</h4>
              <p className="dash-insight-text">
                Grade 10 – Rizal currently accounts for 5 logged incidents (highest volume). Recommendation: Coordinate with Class Adviser for orientation.
              </p>
            </div>
          </div>
        </div>

        {/* Column 3: Calendar & Quick Actions */}
        <div className="dash-right-col-stack">
          {/* Card A: School Calendar */}
          <div className="dash-calendar-card">
            <div className="dash-calendar-top-header">
              <h2 className="dash-calendar-title">
                <CalendarDays size={16} color="#1f2937" />
                <span>School Calendar</span>
              </h2>
              <span
                className="dash-link-blue"
                onClick={() => setIsCalendarModalOpen(true)}
                title="Open School Calendar & Events Modal"
              >
                View Full Calendar →
              </span>
            </div>

            <div className="dash-calendar-month-row">
              <span className="dash-month-title">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <div className="dash-cal-nav-btns">
                <button
                  type="button"
                  className="dash-cal-nav-btn"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  title="Previous Month"
                  aria-label="Previous Month"
                >
                  <ChevronLeft size={13} strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  className="dash-cal-nav-btn"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  title="Next Month"
                  aria-label="Next Month"
                >
                  <ChevronRight size={13} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* Calendar Table */}
            <div className="dash-calendar-grid-clean">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <span key={d} className="dash-cal-day-name">{d}</span>
              ))}

              {calendarDays.map((c) => {
                if (c.empty) {
                  return <div key={c.key} style={{ height: 28 }} />;
                }
                const isSelected = c.day === selectedCalendarDate;
                return (
                  <div
                    key={c.key}
                    className={`dash-cal-date-cell ${isSelected ? 'selected' : ''} ${c.hasEvents ? 'has-events' : ''}`}
                    onClick={() => setSelectedCalendarDate(c.day)}
                    title={`${calendarMonth.toLocaleDateString('en-US', { month: 'short' })} ${c.day}${c.hasEvents ? ` (${c.eventCount} event${c.eventCount > 1 ? 's' : ''})` : ''}`}
                  >
                    <span>{c.day}</span>
                    {c.dots && c.dots.length > 0 && (
                      <div className="dash-cal-dots-container">
                        {c.dots.slice(0, 3).map((dot, idx) => (
                          <span
                            key={idx}
                            className={`dash-cal-dot-indicator ${dot.type}`}
                            style={{ backgroundColor: dot.color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Upcoming Events */}
            <div className="dash-upcoming-events-wrap">
              <div className="dash-upcoming-header">
                <span className="dash-upcoming-title">
                  <CalendarIcon size={12} color="#0f172a" /> {displayedCalendarEvents.label}
                </span>
                <button
                  type="button"
                  className="dash-link-blue-btn"
                  onClick={() => setIsCalendarModalOpen(true)}
                  title="View All Scheduled Events in Full Calendar"
                >
                  View All →
                </button>
              </div>

              {displayedCalendarEvents.events.length === 0 ? (
                <div className="dash-empty-calendar-day">
                  <span>No events scheduled for this date.</span>
                  <button
                    type="button"
                    className="dash-cal-quick-add-btn"
                    onClick={() => setIsCalendarModalOpen(true)}
                  >
                    <PlusCircle size={12} /> Schedule Event
                  </button>
                </div>
              ) : (
                <div className="dash-upcoming-list">
                  {displayedCalendarEvents.events.map(ev => {
                    const evDate = new Date(ev.date);
                    const formattedEvDate = evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                      <div
                        key={ev.id}
                        className="dash-upcoming-item"
                        onClick={() => {
                          const evDay = parseInt(ev.date.split('-')[2], 10);
                          if (!isNaN(evDay)) setSelectedCalendarDate(evDay);
                          setIsCalendarModalOpen(true);
                        }}
                        title={`Click to view details for ${ev.title}`}
                      >
                        <div className="dash-upcoming-left">
                          <span
                            className="dash-upcoming-dot"
                            style={{ background: ev.color || '#10b981' }}
                          />
                          <span className="dash-upcoming-name">{formattedEvDate} | {ev.title}</span>
                        </div>
                        <span className="dash-upcoming-time">{ev.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Card B: Quick Actions */}
          <div className="dash-quick-actions-card">
            <h4 className="dash-quick-actions-title">
              <Compass size={15} color="#07345f" />
              <span>Quick Actions</span>
            </h4>

            <div className="dash-quick-actions-grid">
              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => navigate('/students')}
              >
                <User size={18} color="#07345f" />
                <span>Manage Students</span>
              </button>

              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => setIsAddModalOpen(true)}
              >
                <ShieldCheck size={18} color="#07345f" />
                <span>Log Violation</span>
              </button>

              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={handleExport}
              >
                <FileText size={18} color="#07345f" />
                <span>Generate Report</span>
              </button>

              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => navigate('/scan-qr')}
              >
                <QrCode size={18} color="#07345f" />
                <span>Scan QR</span>
              </button>
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
          success('Violation recorded successfully!');
        }}
      />

      {/* School Calendar & Events Modal */}
      <SchoolCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        initialDate={selectedCalendarDate}
        initialMonth={calendarMonth}
      />

      {/* Custom Date Range Modal */}
      <CustomDateRangeModal
        isOpen={isCustomModalOpen}
        onClose={() => setIsCustomModalOpen(false)}
        initialStartDate={startDate}
        initialEndDate={endDate}
        onApply={({ startDate: newStart, endDate: newEnd }) => {
          setStartDate(newStart);
          setEndDate(newEnd);
          setChartFilter('custom');
          success(`Date range applied: ${newStart} to ${newEnd}`);
        }}
      />
    </div>
  );
};
