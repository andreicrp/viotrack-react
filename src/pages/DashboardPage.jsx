import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Calendar as CalendarIcon,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  CalendarDays,
  User,
  Lightbulb,
  FileText,
  Compass,
  CheckCircle2,
  Download,
  PieChart as PieChartIcon,
  TrendingDown,
  RefreshCw,
  Award
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { SchoolCalendarModal } from '../components/common/SchoolCalendarModal';
import { CustomDateRangeModal } from '../components/common/CustomDateRangeModal';
import { getJsPDF } from '../utils/pdfHelper';
import { exportToCsv } from '../utils/csvHelper';

export const DashboardPage = () => {
  const { user } = useAuth();
  const { success, info } = useNotification();
  const navigate = useNavigate();

  // Dynamic Date Baseline
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  // Filter & Date States
  const [chartFilter, setChartFilter] = useState('month'); // 'today' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState(() => {
    const firstDay = new Date(currentYear, currentMonthIdx, 1);
    return firstDay.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const lastDay = new Date(currentYear, currentMonthIdx + 1, 0);
    return lastDay.toISOString().split('T')[0];
  });
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [selectedPieSlice, setSelectedPieSlice] = useState(null); // for donut drill-down
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Severity KPI Selection / Filter
  const [activeSeverityFilter, setActiveSeverityFilter] = useState('all'); // 'all' | 'minor' | 'serious' | 'major' | 'resolved'

  // Series visibility toggles
  const [showMinor, setShowMinor] = useState(true);
  const [showSerious, setShowSerious] = useState(true);
  const [showMajor, setShowMajor] = useState(true);

  // Data States
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [schoolEvents, setSchoolEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calendar State
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(now.getDate());
  const [calendarMonth, setCalendarMonth] = useState(new Date(currentYear, currentMonthIdx, 1));

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const loadData = useCallback(async () => {
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
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

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

    // Auto-refresh every 45 seconds
    const autoRefreshTimer = setInterval(async () => {
      setIsRefreshing(true);
      await loadData();
      setIsRefreshing(false);
    }, 45000);

    return () => {
      window.removeEventListener('viotrack_data_updated', handleUpdate);
      window.removeEventListener('viotrack_events_updated', handleEventsUpdate);
      clearInterval(autoRefreshTimer);
    };
  }, [loadData]);

  // Helper: check if a record is officially approved (exclude under approval / rejected)
  const isApproved = (r) => {
    if (!r) return false;
    if (r.approval_status === 'Under Approval' || r.status === 'Under Approval') return false;
    if (r.approval_status === 'Rejected' || r.status === 'Rejected') return false;
    return r.approval_status === 'Approved';
  };

  const approvedRecords = useMemo(() => {
    return (records || []).filter(isApproved);
  }, [records]);

  // Dynamic Active Time Period Records Filtering
  const filteredApprovedRecords = useMemo(() => {
    const nowDay = new Date();
    
    if (chartFilter === 'today') {
      return approvedRecords.filter(r => {
        const rawDate = r.date_reported || r.created_at;
        if (!rawDate) return false;
        const rDate = new Date(rawDate);
        return (
          rDate.getFullYear() === nowDay.getFullYear() &&
          rDate.getMonth() === nowDay.getMonth() &&
          rDate.getDate() === nowDay.getDate()
        );
      });
    }

    if (chartFilter === 'week') {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      return approvedRecords.filter(r => {
        const rawDate = r.date_reported || r.created_at;
        if (!rawDate) return false;
        const rDate = new Date(rawDate);
        return rDate >= sevenDaysAgo;
      });
    }

    if (chartFilter === 'custom') {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      return approvedRecords.filter(r => {
        const rawDate = r.date_reported || r.created_at;
        if (!rawDate) return false;
        const rDate = new Date(rawDate);
        return rDate >= start && rDate <= end;
      });
    }

    // Default: 'month' (Active month)
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    return approvedRecords.filter(r => {
      const rawDate = r.date_reported || r.created_at;
      if (!rawDate) return false;
      const rDate = new Date(rawDate);
      return rDate.getFullYear() === year && rDate.getMonth() === month;
    });
  }, [approvedRecords, chartFilter, startDate, endDate, calendarMonth]);

  // Records used for breakdown widgets (strictly connected to the active time filter)
  const activeWidgetRecords = useMemo(() => {
    return filteredApprovedRecords;
  }, [filteredApprovedRecords]);

  // 1. Dynamic Metric Calculations connected to Active Time Period
  const metrics = useMemo(() => {
    let minor = 0;
    let serious = 0;
    let major = 0;
    let resolved = 0;
    let pending = 0;

    filteredApprovedRecords.forEach(r => {
      const type = (r.violation?.type || r.type || '').toLowerCase();
      if (type === 'minor') minor++;
      else if (type === 'serious') serious++;
      else if (type === 'major') major++;

      const status = (r.status || '').toLowerCase();
      if (status === 'resolved') resolved++;
      else pending++;
    });

    const totalCount = filteredApprovedRecords.length;
    const resolvedRate = totalCount > 0 ? Math.round((resolved / totalCount) * 100) : 100;

    const periodLabel = chartFilter === 'today' ? 'Today' : chartFilter === 'week' ? 'This Week' : chartFilter === 'month' ? 'This Month' : 'Custom Period';

    return {
      minorCount: minor,
      seriousCount: serious,
      majorCount: major,
      totalStudentsCount: students.length,
      totalViolationsCount: totalCount,
      resolvedCount: resolved,
      pendingCount: pending,
      resolvedRate,
      periodLabel
    };
  }, [filteredApprovedRecords, students, chartFilter]);

  // 2. Real-Time Dynamic Trend Data Aggregation
  const trendData = useMemo(() => {
    const getSeverity = (rec) => {
      const type = (rec.violation?.type || rec.type || rec.severity || '').toLowerCase();
      if (type === 'minor' || type === 'serious' || type === 'major') return type;
      return 'minor';
    };

    if (chartFilter === 'today') {
      const intervals = [
        { label: '6–9am',  startH: 6,  endH: 9  },
        { label: '9–12pm', startH: 9,  endH: 12 },
        { label: '12–3pm', startH: 12, endH: 15 },
        { label: '3–6pm',  startH: 15, endH: 18 },
        { label: '6–9pm',  startH: 18, endH: 21 },
        { label: '9–12am', startH: 21, endH: 24 }
      ];

      const nowDay = new Date();
      const isRecordToday = (r) => {
        if (!r.date_reported && !r.created_at) return false;
        const rDate = new Date(r.date_reported || r.created_at);
        return (
          rDate.getFullYear() === nowDay.getFullYear() &&
          rDate.getMonth() === nowDay.getMonth() &&
          rDate.getDate() === nowDay.getDate()
        );
      };

      const todayRecords = approvedRecords.filter(isRecordToday);

      return intervals.map(int => {
        let minor = 0, serious = 0, major = 0;
        todayRecords.forEach(r => {
          const recDate = new Date(r.date_reported || r.created_at || Date.now());
          const h = recDate.getHours();
          const matched = (int.startH === 6 && h < 6) || (h >= int.startH && h < int.endH);
          if (matched) {
            const sev = getSeverity(r);
            if (sev === 'minor') minor++;
            else if (sev === 'serious') serious++;
            else if (sev === 'major') major++;
          }
        });
        return { time: int.label, minor, serious, major, total: minor + serious + major };
      });
    }

    if (chartFilter === 'week') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().split('T')[0];
        const dayLabel = `${d.getMonth() + 1}/${d.getDate()}`;

        let minor = 0, serious = 0, major = 0;
        approvedRecords.forEach(r => {
          const rDateStr = (r.date_reported || r.created_at || '').split('T')[0];
          if (rDateStr === dateStr) {
            const sev = getSeverity(r);
            if (sev === 'minor') minor++;
            else if (sev === 'serious') serious++;
            else if (sev === 'major') major++;
          }
        });

        days.push({ time: dayLabel, dateStr, minor, serious, major, total: minor + serious + major });
      }
      return days;
    }

    if (chartFilter === 'custom') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.max(end.getTime() - start.getTime(), 86400000);
      const step = diffTime / 5;

      const intervals = [];
      for (let i = 0; i < 5; i++) {
        const curStart = new Date(start.getTime() + i * step);
        const curEnd = new Date(start.getTime() + (i + 1) * step);
        const label = `${curStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

        let minor = 0, serious = 0, major = 0;
        approvedRecords.forEach(r => {
          const rDate = new Date(r.date_reported || r.created_at || Date.now());
          if (rDate >= curStart && rDate <= curEnd) {
            const sev = getSeverity(r);
            if (sev === 'minor') minor++;
            else if (sev === 'serious') serious++;
            else if (sev === 'major') major++;
          }
        });

        intervals.push({ time: label, minor, serious, major, total: minor + serious + major });
      }
      return intervals;
    }

    // Default: 'month' view (Daily breakdown for every day of the active month)
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthShort = calendarMonth.toLocaleDateString('en-US', { month: 'short' });
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      let minor = 0, serious = 0, major = 0;
      approvedRecords.forEach(r => {
        const rawDate = r.date_reported || r.created_at;
        if (!rawDate) return;
        const rDate = new Date(rawDate);
        if (
          rDate.getFullYear() === year &&
          rDate.getMonth() === month &&
          rDate.getDate() === d
        ) {
          const sev = getSeverity(r);
          if (sev === 'minor') minor++;
          else if (sev === 'serious') serious++;
          else if (sev === 'major') major++;
        }
      });
      days.push({
        time: `${monthShort} ${d}`,
        day: d,
        minor,
        serious,
        major,
        total: minor + serious + major
      });
    }

    return days;
  }, [chartFilter, approvedRecords, startDate, endDate, calendarMonth]);

  // Last-week metrics for KPI trend arrows
  const lastWeekMetrics = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);
    let minor = 0, serious = 0, major = 0, total = 0;
    approvedRecords.forEach(r => {
      const rawDate = r.date_reported || r.created_at;
      if (!rawDate) return;
      const rDate = new Date(rawDate);
      if (rDate >= fourteenDaysAgo && rDate < sevenDaysAgo) {
        const type = (r.violation?.type || r.type || '').toLowerCase();
        if (type === 'minor') minor++;
        else if (type === 'serious') serious++;
        else if (type === 'major') major++;
        total++;
      }
    });
    return { minor, serious, major, total };
  }, [approvedRecords]);

  // Today's violation count for the at-a-glance banner
  const todayStats = useMemo(() => {
    const now = new Date();
    const todayRecords = approvedRecords.filter(r => {
      const rawDate = r.date_reported || r.created_at;
      if (!rawDate) return false;
      const rDate = new Date(rawDate);
      return rDate.getFullYear() === now.getFullYear() &&
             rDate.getMonth() === now.getMonth() &&
             rDate.getDate() === now.getDate();
    });
    const pending = approvedRecords.filter(r => (r.status || '').toLowerCase() !== 'resolved').length;
    return { todayCount: todayRecords.length, pending };
  }, [approvedRecords]);

  // Top 5 Active Reporters (Teachers)
  const top5Reporters = useMemo(() => {
    const map = {};
    approvedRecords.forEach(r => {
      const name = r.reported_by || r.teacher_name || r.reporter || 'Unknown';
      if (!map[name]) map[name] = { name, count: 0, major: 0, serious: 0 };
      map[name].count++;
      const sev = (r.violation?.type || r.type || '').toLowerCase();
      if (sev === 'major') map[name].major++;
      else if (sev === 'serious') map[name].serious++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [approvedRecords]);

  // Determine max domain for Chart Y-Axis dynamically
  const chartYDomain = useMemo(() => {
    let max = 0;
    trendData.forEach(d => {
      const activeSum = (showMinor ? d.minor : 0) + (showSerious ? d.serious : 0) + (showMajor ? d.major : 0);
      if (activeSum > max) max = activeSum;
    });
    const ceiling = Math.max(max + 2, 4);
    return [0, ceiling];
  }, [trendData, showMinor, showSerious, showMajor]);

  // 3. Dynamic Repeat & High-Risk Students Aggregation (Connected to Active Period)
  const repeatStudentsList = useMemo(() => {
    const studentMap = new Map();

    students.forEach(s => {
      studentMap.set(Number(s.id), {
        id: s.id,
        name: `${s.fname} ${s.lname}`,
        grade: `${s.grade} – ${s.section}`,
        image: s.image,
        gender: s.gender,
        lrn: s.lrn,
        minorCount: 0,
        seriousCount: 0,
        majorCount: 0,
        totalInfractions: 0,
        pendingCount: 0,
        lastIncident: null
      });
    });

    activeWidgetRecords.forEach(r => {
      const sId = Number(r.student_id || r.student?.id);
      if (!studentMap.has(sId)) {
        if (r.student) {
          studentMap.set(sId, {
            id: sId,
            name: `${r.student.fname} ${r.student.lname}`,
            grade: `${r.student.grade || ''} – ${r.student.section || ''}`,
            image: r.student.image,
            gender: r.student.gender,
            lrn: r.student.lrn,
            minorCount: 0,
            seriousCount: 0,
            majorCount: 0,
            totalInfractions: 0,
            pendingCount: 0,
            lastIncident: r.date_reported
          });
        }
      }

      const st = studentMap.get(sId);
      if (st) {
        const sev = (r.violation?.type || r.type || '').toLowerCase();
        if (sev === 'minor') st.minorCount++;
        else if (sev === 'serious') st.seriousCount++;
        else if (sev === 'major') st.majorCount++;
        st.totalInfractions++;

        if ((r.status || '').toLowerCase() !== 'resolved') {
          st.pendingCount++;
        }
        if (!st.lastIncident || new Date(r.date_reported) > new Date(st.lastIncident)) {
          st.lastIncident = r.date_reported;
        }
      }
    });

    const offenders = Array.from(studentMap.values())
      .filter(s => s.totalInfractions > 0)
      .sort((a, b) => {
        const scoreA = a.majorCount * 5 + a.seriousCount * 3 + a.minorCount;
        const scoreB = b.majorCount * 5 + b.seriousCount * 3 + b.minorCount;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return b.totalInfractions - a.totalInfractions;
      });

    return offenders.map((s, idx) => {
      let badgeType = 'slate';
      let statusLabel = `${s.totalInfractions} ${s.totalInfractions === 1 ? 'Infraction' : 'Infractions'}`;

      if (s.majorCount > 0 || s.totalInfractions >= 3) {
        badgeType = 'red';
        statusLabel = s.majorCount > 0 ? `High Risk • ${s.majorCount} Major` : `High Risk • ${s.totalInfractions} Logs`;
      } else if (s.seriousCount > 0 || s.totalInfractions === 2) {
        badgeType = 'amber';
        statusLabel = s.seriousCount > 0 ? `Moderate • Serious Case` : `2 Infractions`;
      }

      return {
        ...s,
        rank: idx + 1,
        badgeType,
        infractionLabel: statusLabel
      };
    });
  }, [students, activeWidgetRecords]);

  // Top 5 High-Risk & Repeat Students Slice
  const top5Offenders = useMemo(() => {
    return repeatStudentsList.slice(0, 5);
  }, [repeatStudentsList]);

  // Curated modern color palette for circle violation chart slices
  const PIE_COLORS = [
    '#1e1b4b',
    '#4338ca',
    '#6366f1',
    '#3b82f6',
    '#2563eb',
    '#0284c7',
    '#06b6d4',
    '#38bdf8',
    '#c084fc',
    '#818cf8'
  ];

  // 4. Dynamic Most Common Violation Types Breakdown (Connected to Active Period)
  const violationDistribution = useMemo(() => {
    if (!activeWidgetRecords || activeWidgetRecords.length === 0) {
      return [];
    }

    const counts = {};
    activeWidgetRecords.forEach(r => {
      const title = (r.violation?.title || r.title || 'Other Infraction').trim();
      const sev = (r.violation?.type || r.type || 'Minor').trim();
      if (!counts[title]) {
        counts[title] = { name: title, value: 0, severity: sev };
      }
      counts[title].value += 1;
    });

    const sorted = Object.values(counts).sort((a, b) => b.value - a.value);
    const total = activeWidgetRecords.length;

    if (sorted.length <= 6) {
      return sorted.map((item, idx) => ({
        ...item,
        color: PIE_COLORS[idx % PIE_COLORS.length],
        percent: Number(((item.value / total) * 100).toFixed(1))
      }));
    }

    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restCount = rest.reduce((acc, c) => acc + c.value, 0);

    const result = top5.map((item, idx) => ({
      ...item,
      color: PIE_COLORS[idx % PIE_COLORS.length],
      percent: Number(((item.value / total) * 100).toFixed(1))
    }));

    if (restCount > 0) {
      result.push({
        name: 'Other Offenses',
        value: restCount,
        severity: 'Various',
        color: PIE_COLORS[5 % PIE_COLORS.length] || '#64748b',
        percent: Number(((restCount / total) * 100).toFixed(1))
      });
    }

    return result;
  }, [activeWidgetRecords]);

  // 4. Dynamic Grade & Section Breakdown (Connected to Active Period)
  const sectionBreakdown = useMemo(() => {
    const secMap = new Map();

    activeWidgetRecords.forEach(r => {
      const student = r.student || students.find(s => Number(s.id) === Number(r.student_id));
      if (student) {
        const grade = student.grade || 'General';
        const section = student.section || 'Unassigned';
        const key = `${grade}::${section}`;

        if (!secMap.has(key)) {
          secMap.set(key, { grade, section, count: 0 });
        }
        secMap.get(key).count++;
      }
    });

    if (secMap.size === 0 && students.length > 0) {
      students.slice(0, 5).forEach(s => {
        const key = `${s.grade || 'Grade 10'}::${s.section || 'Rizal'}`;
        if (!secMap.has(key)) {
          secMap.set(key, { grade: s.grade || 'Grade 10', section: s.section || 'Rizal', count: 0 });
        }
      });
    }

    const list = Array.from(secMap.values()).sort((a, b) => b.count - a.count);
    const maxCount = list.length > 0 && list[0].count > 0 ? list[0].count : 1;
    const totalCount = activeWidgetRecords.length > 0 ? activeWidgetRecords.length : 1;

    return list.slice(0, 6).map(item => ({
      ...item,
      pct: `${Math.round((item.count / totalCount) * 100)}%`,
      fillPct: Math.round((item.count / maxCount) * 100)
    }));
  }, [activeWidgetRecords, students]);

  // 5. Dynamic Disciplinary Insight Generator
  const disciplinaryInsight = useMemo(() => {
    if (activeWidgetRecords.length === 0) {
      return {
        title: 'Optimal Disciplinary Standing',
        text: 'Zero active disciplinary violations recorded for this period. School community adherence to campus guidelines is at 100%.'
      };
    }

    const topSection = sectionBreakdown.length > 0 && sectionBreakdown[0].count > 0 ? sectionBreakdown[0] : null;
    const highRiskCount = repeatStudentsList.filter(s => s.badgeType === 'red').length;

    if (highRiskCount > 0) {
      return {
        title: 'Priority Guidance Alert',
        text: `${highRiskCount} student${highRiskCount > 1 ? 's are' : ' is'} classified as High Risk due to multiple infractions or major offenses in this period. Recommended action: Coordinate counseling hearing with Class Advisers.`
      };
    }

    if (topSection) {
      return {
        title: 'Section Focus Opportunity',
        text: `${topSection.grade} – ${topSection.section} accounts for ${topSection.count} logged incident${topSection.count > 1 ? 's' : ''} (${topSection.pct} of selected records). Recommended action: Conduct an advisory orientation with the section head.`
      };
    }

    return {
      title: 'Disciplinary Status Stable',
      text: `${metrics.resolvedCount} of ${metrics.totalViolationsCount} incident records (${metrics.resolvedRate}%) have reached resolution. Campus conduct remains well-monitored.`
    };
  }, [activeWidgetRecords, sectionBreakdown, repeatStudentsList, metrics]);

  // 6. Dynamic School Calendar Grid Generation
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
        eventCount: dayEvents.length,
        dayEvents
      });
    }

    return days;
  }, [calendarMonth, schoolEvents]);

  // Dynamic Selected Date / Upcoming Events
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

  // Export Executive PDF Report (Dynamic)
  const handleExportPDF = async () => {
    try {
      const doc = await getJsPDF();
      doc.setFillColor(11, 25, 44);
      doc.rect(0, 0, 210, 26, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('VIOTRACK - Executive School Disciplinary Report', 14, 12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} | Status: Live Sync`, 14, 20);

      doc.setTextColor(30, 41, 59);
      doc.autoTable({
        head: [['Key Disciplinary Metric', 'Count', 'Resolution & Status']],
        body: [
          ['Minor Offense', metrics.minorCount, 'Informal / Active Warning Logs'],
          ['Serious Offense', metrics.seriousCount, 'Faculty Interventions Required'],
          ['Major Offense', metrics.majorCount, 'Guidance Hearing & Formal Cases'],
          ['Total Enrolled Students', metrics.totalStudentsCount, 'Active Student Database'],
          ['Total Logged Incidents', metrics.totalViolationsCount, `${metrics.resolvedRate}% Overall Resolution Rate`]
        ],
        startY: 34,
        theme: 'grid',
        headStyles: { fillColor: [11, 25, 44], fontStyle: 'bold' }
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Repeat & Priority Intervention Students', 14, finalY);

      const tableData = repeatStudentsList.length > 0
        ? repeatStudentsList.map(s => [
            `#${s.rank}`,
            s.name,
            s.grade,
            s.infractionLabel,
            s.pendingCount > 0 ? `${s.pendingCount} Pending` : 'All Resolved'
          ])
        : [['-', 'No repeat offenders recorded', '-', '-', 'Optimal']];

      doc.autoTable({
        head: [['Rank', 'Student Name', 'Grade & Section', 'Status / Incidents', 'Pending Cases']],
        body: tableData,
        startY: finalY + 4,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138] }
      });

      doc.save(`Viotrack_Executive_Report_${Date.now()}.pdf`);
      success('Executive Summary PDF report exported successfully!');
    } catch (err) {
      console.error(err);
      info('Could not export PDF report.');
    }
  };

  // Export CSV Data
  const handleExportCSV = () => {
    try {
      const exportRows = records.map(r => ({
        Record_ID: r.id,
        Student_ID: r.student?.lrn || '',
        Student_Name: r.student ? `${r.student.fname} ${r.student.lname}` : '',
        Grade: r.student?.grade || '',
        Section: r.student?.section || '',
        Violation_Title: r.violation?.title || r.title || '',
        Severity: r.violation?.type || r.type || 'Minor',
        Status: r.status || 'Pending',
        Reported_By: r.reported_by_name || '',
        Date_Reported: r.date_reported || r.created_at || '',
        Sanction: r.sanction || ''
      }));

      exportToCsv(`Viotrack_Disciplinary_Records_${Date.now()}.csv`, exportRows);
      success('Disciplinary dataset exported to CSV.');
    } catch (err) {
      console.error(err);
      info('Could not export CSV data.');
    }
  };

  return (
    <div className="dashboard-root">
      {/* 1. Header Section */}
      <div className="dash-top-header">
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
              {/* Auto-refresh indicator */}
              <span
                className={`dash-refresh-indicator ${isRefreshing ? 'spinning' : ''}`}
                title="Dashboard auto-refreshes every 45 seconds"
              >
                <RefreshCw size={13} strokeWidth={2.4} />
              </span>
            </div>
            {/* At-a-glance summary sentence */}
            <p className="dash-greeting-subtitle">
              {todayStats.todayCount === 0 && todayStats.pending === 0
                ? 'Campus conduct is clean — no violations recorded today.'
                : `Today: ${todayStats.todayCount > 0 ? `${todayStats.todayCount} new violation${todayStats.todayCount !== 1 ? 's' : ''}` : 'no new violations'}
                ${todayStats.pending > 0 ? `, ${todayStats.pending} pending resolution` : ', all resolved'}.`
              }
            </p>
          </div>

          {/* Top Right Controls */}
          <div className="dash-top-actions-right">
            <button
              type="button"
              className="dash-export-pdf-btn"
              onClick={handleExportPDF}
              id="exportDashboardPdfBtn"
              title="Export dashboard summary as PDF"
            >
              <Download size={15} strokeWidth={2.4} />
              <span>Export PDF</span>
            </button>
            <button
              type="button"
              className="dash-log-violation-btn"
              onClick={() => setIsAddModalOpen(true)}
              id="logViolationBtn"
              title="Record a new student disciplinary infraction"
            >
              <PlusCircle size={16} strokeWidth={2.4} />
              <span>Log Violation</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive KPI Metric Cards */}
      <div className="dash-stats-grid-4" role="region" aria-label="Disciplinary Metrics Overview">
        {/* Card 1: Minor Offense */}
        <div
          className={`dash-stat-card-clean card-minor ${activeSeverityFilter === 'minor' ? 'active-filter' : ''}`}
          onClick={() => {
            setShowMinor(true);
            setActiveSeverityFilter(prev => prev === 'minor' ? 'all' : 'minor');
          }}
          title="Click to focus on Minor Offenses"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveSeverityFilter(prev => prev === 'minor' ? 'all' : 'minor')}
        >
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle minor" style={{ color: '#10b981' }}>
              <ShieldCheck size={22} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Minor Offense</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{metrics.minorCount}</span>
                <span className="dash-stat-trend-tag" style={{ color: '#059669', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {lastWeekMetrics.minor > 0 ? (
                    metrics.minorCount > lastWeekMetrics.minor
                      ? <><TrendingUp size={12}/> +{metrics.minorCount - lastWeekMetrics.minor} vs last wk</>
                      : metrics.minorCount < lastWeekMetrics.minor
                        ? <><TrendingDown size={12} color="#10b981"/> -{lastWeekMetrics.minor - metrics.minorCount} vs last wk</>
                        : 'Same as last wk'
                  ) : (metrics.minorCount > 0 ? 'Active logs' : 'Clean')}
                </span>
              </div>
            </div>
          </div>
          <p className="dash-stat-bottom-text">Informal warning & compliance</p>
        </div>

        {/* Card 2: Serious Offense */}
        <div
          className={`dash-stat-card-clean card-serious ${activeSeverityFilter === 'serious' ? 'active-filter' : ''}`}
          onClick={() => {
            setShowSerious(true);
            setActiveSeverityFilter(prev => prev === 'serious' ? 'all' : 'serious');
          }}
          title="Click to focus on Serious Offenses"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveSeverityFilter(prev => prev === 'serious' ? 'all' : 'serious')}
        >
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle serious" style={{ color: '#f59e0b' }}>
              <AlertTriangle size={22} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Serious Offense</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{metrics.seriousCount}</span>
                <span className="dash-stat-trend-tag" style={{ color: metrics.seriousCount > 0 ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {lastWeekMetrics.serious > 0 ? (
                    metrics.seriousCount > lastWeekMetrics.serious
                      ? <><TrendingUp size={12} color="#d97706"/> +{metrics.seriousCount - lastWeekMetrics.serious} vs last wk</>
                      : metrics.seriousCount < lastWeekMetrics.serious
                        ? <><TrendingDown size={12} color="#10b981"/> -{lastWeekMetrics.serious - metrics.seriousCount} vs last wk</>
                        : 'Same as last wk'
                  ) : (metrics.seriousCount > 0 ? 'Interventions' : '0 cases')}
                </span>
              </div>
            </div>
          </div>
          <p className="dash-stat-bottom-text">Faculty parent conference</p>
        </div>

        {/* Card 3: Major Offense */}
        <div
          className={`dash-stat-card-clean card-major ${activeSeverityFilter === 'major' ? 'active-filter' : ''}`}
          onClick={() => {
            setShowMajor(true);
            setActiveSeverityFilter(prev => prev === 'major' ? 'all' : 'major');
          }}
          title="Click to focus on Major Offenses"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setActiveSeverityFilter(prev => prev === 'major' ? 'all' : 'major')}
        >
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle major" style={{ color: '#ef4444' }}>
              <AlertCircle size={22} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Major Offense</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{metrics.majorCount}</span>
                <span className="dash-stat-trend-tag" style={{ color: metrics.majorCount > 0 ? '#dc2626' : '#10b981', display: 'flex', alignItems: 'center', gap: 2 }}>
                  {lastWeekMetrics.major > 0 ? (
                    metrics.majorCount > lastWeekMetrics.major
                      ? <><TrendingUp size={12} color="#dc2626"/> +{metrics.majorCount - lastWeekMetrics.major} vs last wk</>
                      : metrics.majorCount < lastWeekMetrics.major
                        ? <><TrendingDown size={12} color="#10b981"/> -{lastWeekMetrics.major - metrics.majorCount} vs last wk</>
                        : 'Same as last wk'
                  ) : (metrics.majorCount > 0 ? 'Hearing required' : 'None')}
                </span>
              </div>
            </div>
          </div>
          <p className="dash-stat-bottom-text">Guidance council hearings</p>
        </div>

        {/* Card 4: Total Violations & Resolution Rate */}
        <div
          className="dash-stat-card-clean card-violations"
          onClick={() => navigate('/violations')}
          title="Click to view all Disciplinary Logs"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && navigate('/violations')}
        >
          <div className="dash-stat-top-part">
            <div className="dash-stat-icon-circle violations" style={{ color: '#8b5cf6' }}>
              <FileText size={22} strokeWidth={2.4} />
            </div>
            <div className="dash-stat-center-info">
              <span className="dash-stat-title-label">Total Incidents</span>
              <div className="dash-stat-number-trend-row">
                <span className="dash-stat-big-num">{metrics.totalViolationsCount}</span>
                <span className="dash-stat-trend-tag" style={{ color: '#7c3aed' }}>
                  {metrics.resolvedRate}% resolved
                </span>
              </div>
            </div>
          </div>
          <p className="dash-stat-bottom-text">{metrics.pendingCount} pending resolution</p>
        </div>
      </div>

      {/* 3. Real Violation Trends & Distribution Section (2 Columns) */}
      <div className="dash-trends-grid">
        {/* Left Card: Violation Trends Area Chart */}
        <div className="dash-trends-card">
          <div className="dash-trends-header">
            <div className="dash-trends-title-left">
              <TrendingUp size={22} color="#0f172a" strokeWidth={2.4} />
              <div>
                <h2 className="dash-trends-main-title">Violation Trends</h2>
                <p className="dash-trends-sub-title">Incidents recorded over time</p>
              </div>
            </div>

            <div className="dash-trends-controls-right">
              {/* Segmented Time Range Pills */}
              <div className="dash-segmented-pills">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Weekly' },
                  { id: 'month', label: 'Monthly' },
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
          <div style={{ width: '100%', height: 250, marginTop: '8px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="minorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="seriousGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="majorGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                <XAxis
                  dataKey="time"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  interval={chartFilter === 'month' ? 4 : 0}
                  minTickGap={chartFilter === 'month' ? 0 : 20}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  domain={chartYDomain}
                  allowDecimals={false}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const totalVal = payload.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
                      return (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '10px',
                          padding: '10px 14px',
                          border: '1px solid #e2e8f0',
                          color: '#0f172a',
                          fontSize: '12px',
                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                          minWidth: '140px'
                        }}>
                          <div style={{ fontWeight: 700, marginBottom: '6px', paddingBottom: '4px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '11.5px' }}>
                            {label}
                          </div>
                          {payload.map(p => (
                            <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', margin: '3px 0' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
                                <span style={{ color: p.color, fontWeight: 700 }}>{p.name}:</span>
                              </div>
                              <span style={{ fontWeight: 800, color: '#0f172a' }}>{p.value} incident{p.value === 1 ? '' : 's'}</span>
                            </div>
                          ))}
                          <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '11.5px' }}>
                            <span>Total:</span>
                            <span>{totalVal}</span>
                          </div>
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
                    dot={{ r: 3, strokeWidth: 2, stroke: '#ffffff', fill: '#10b981' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#10b981' }}
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
                    dot={{ r: 3, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#f59e0b' }}
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
                    dot={{ r: 3, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                    activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#ef4444' }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Series Legend at Bottom */}
          <div className="dash-trends-legend-bottom">
            <div
              className="dash-legend-item"
              onClick={() => setShowMinor(!showMinor)}
              style={{ opacity: showMinor ? 1 : 0.35 }}
              title="Toggle Minor Offenses series"
            >
              <span className="dash-legend-dot minor" />
              <span>Minor</span>
            </div>
            <div
              className="dash-legend-item"
              onClick={() => setShowSerious(!showSerious)}
              style={{ opacity: showSerious ? 1 : 0.35 }}
              title="Toggle Serious Offenses series"
            >
              <span className="dash-legend-dot serious" />
              <span>Serious</span>
            </div>
            <div
              className="dash-legend-item"
              onClick={() => setShowMajor(!showMajor)}
              style={{ opacity: showMajor ? 1 : 0.35 }}
              title="Toggle Major Offenses series"
            >
              <span className="dash-legend-dot major" />
              <span>Major</span>
            </div>
          </div>
        </div>

        {/* Right Card: Most Likely School Violations Circle Pie Chart */}
        <div className="dash-distribution-card">
          <div className="dash-trends-header">
            <div className="dash-trends-title-left">
              <PieChartIcon size={22} color="#0f172a" strokeWidth={2.4} />
              <div>
                <h2 className="dash-trends-main-title">Most Common Violations</h2>
                <p className="dash-trends-sub-title">Distribution of infractions most likely to occur in school</p>
              </div>
            </div>
          </div>

          {violationDistribution.length === 0 ? (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', textAlign: 'center', gap: 8 }}>
              {/* Friendly no-data illustration */}
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="36" cy="36" r="34" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
                <circle cx="36" cy="36" r="22" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeDasharray="10 6"/>
                <circle cx="36" cy="36" r="10" fill="#f1f5f9"/>
                <path d="M29 36 Q36 28 43 36" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="31" cy="33" r="2" fill="#cbd5e1"/>
                <circle cx="41" cy="33" r="2" fill="#cbd5e1"/>
              </svg>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#64748b' }}>No violations logged yet</span>
              <span style={{ fontSize: '11.5px', color: '#94a3b8', maxWidth: 160 }}>Approved infractions will appear as a distribution chart here</span>
            </div>
          ) : (
            <div className="dash-distribution-content">
              {/* Donut Chart with drill-down */}
              <div className="dash-distribution-chart-box" style={{ position: 'relative' }}>
                {selectedPieSlice && (
                  <div style={{
                    position: 'absolute', top: '67%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center', pointerEvents: 'none', zIndex: 2,
                    maxWidth: 90
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{selectedPieSlice.value}</div>
                    <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 600, lineHeight: 1.3, marginTop: 2, wordBreak: 'break-word' }}>{selectedPieSlice.name}</div>
                    <button onClick={() => setSelectedPieSlice(null)} style={{ fontSize: 9, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', marginTop: 3 }}>✕ clear</button>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={violationDistribution}
                      cx="50%"
                      cy="67%"
                      outerRadius={112}
                      innerRadius={52}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={false}
                      onClick={(entry) => setSelectedPieSlice(prev => prev?.name === entry.name ? null : entry)}
                      style={{ cursor: 'pointer' }}
                    >
                      {violationDistribution.map((entry, index) => (
                        <Cell
                          key={`dist-cell-${index}`}
                          fill={entry.color}
                          stroke={selectedPieSlice?.name === entry.name ? '#0f172a' : entry.color}
                          strokeWidth={selectedPieSlice?.name === entry.name ? 3 : 0.5}
                          opacity={selectedPieSlice && selectedPieSlice.name !== entry.name ? 0.4 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      position={{ x: 0, y: 0 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              background: '#ffffff',
                              borderRadius: '10px',
                              padding: '10px 14px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                              fontSize: '12px',
                              minWidth: '150px'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: data.color }} />
                                <span>{data.name}</span>
                              </div>
                              <div style={{ color: '#64748b', fontSize: '11.5px', marginTop: '2px' }}>
                                Incidents: <strong style={{ color: '#0f172a' }}>{data.value}</strong> {data.value === 1 ? 'case' : 'cases'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                Severity: <span style={{ textTransform: 'capitalize', fontWeight: 600, color: data.severity === 'Major' ? '#dc2626' : data.severity === 'Serious' ? '#d97706' : '#10b981' }}>{data.severity}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Ranked Frequency Breakdown List */}
              <div className="dash-distribution-list">
                {violationDistribution.map((item, idx) => {
                  const maxVal = Math.max(...violationDistribution.map(d => d.value), 1);
                  const barWidth = Math.max(12, Math.round((item.value / maxVal) * 100));
                  return (
                    <div key={idx} className="dash-distribution-item">
                      <div className="dash-dist-row-top">
                        <div className="dash-dist-name-group">
                          <span className="dash-dist-dot" style={{ background: item.color }} />
                          <span className="dash-dist-name" title={item.name}>{item.name}</span>
                        </div>
                        <span className="dash-dist-stat">
                          {item.value} <span style={{ color: '#64748b', fontWeight: 600, fontSize: '11px' }}>{item.value === 1 ? 'incident' : 'incidents'}</span>
                        </span>
                      </div>
                      <div className="dash-dist-bar-track">
                        <div
                          className="dash-dist-bar-fill"
                          style={{
                            width: `${barWidth}%`,
                            background: item.color
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom 3-Column Section */}
      <div className="dash-bottom-3col-grid">
        {/* Column 1: Repeat & High-Risk Students */}
        <div className="dash-bottom-card">
          <div className="dash-card-header-clean">
            <div className="dash-card-header-left">
              <ShieldAlert size={20} color="#0f172a" />
              <div>
                <h2 className="dash-card-header-title">Repeat & High-Risk Students</h2>
                <p className="dash-card-header-desc">Top 5 students ranked dynamically by incident weight & frequency</p>
              </div>
            </div>
          </div>

          {/* List */}
          <div className="dash-offenders-list">
            {repeatStudentsList.length === 0 ? (
              <div className="dash-empty-calendar-day" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <ShieldCheck size={28} color="#10b981" />
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '12.5px' }}>
                  No Disciplinary Infractions Recorded
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  All enrolled students are in good disciplinary standing.
                </span>
              </div>
            ) : (
              top5Offenders.map(st => (
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
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(st.name)}&background=0f172a&color=fff&size=50`;
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
                      title={`View disciplinary dossier for ${st.name}`}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 1b: Top 5 Active Reporters */}
        <div className="dash-bottom-card">
          <div className="dash-card-header-clean">
            <div className="dash-card-header-left">
              <Award size={20} color="#0f172a" />
              <div>
                <h2 className="dash-card-header-title">Top Active Reporters</h2>
                <p className="dash-card-header-desc">Most diligent violation-reporting faculty this period</p>
              </div>
            </div>
          </div>

          <div className="dash-offenders-list">
            {top5Reporters.length === 0 ? (
              <div className="dash-empty-calendar-day" style={{ padding: '24px 16px', textAlign: 'center' }}>
                <Award size={28} color="#94a3b8" />
                <span style={{ fontWeight: 600, color: '#64748b', fontSize: '12.5px' }}>No reports submitted yet</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Reporter rankings will appear after violations are logged.</span>
              </div>
            ) : (
              top5Reporters.map(rep => (
                <div key={rep.name} className="dash-offender-row">
                  <div className="dash-offender-left">
                    <span className={`dash-rank-badge rank-${rep.rank}`}>#{rep.rank}</span>
                    <div
                      style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: `hsl(${(rep.rank * 47) % 360}, 60%, 92%)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800,
                        color: `hsl(${(rep.rank * 47) % 360}, 55%, 35%)`,
                        flexShrink: 0
                      }}
                    >
                      {rep.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="dash-offender-meta">
                      <span className="dash-offender-name">{rep.name}</span>
                      <span className="dash-offender-grade">
                        {rep.major > 0 && <span style={{ color: '#ef4444', fontWeight: 700 }}>{rep.major} major • </span>}
                        {rep.serious > 0 && <span style={{ color: '#f59e0b', fontWeight: 700 }}>{rep.serious} serious • </span>}
                        {rep.count} total
                      </span>
                    </div>
                  </div>
                  <div className="dash-offender-right">
                    <span className="dash-infraction-pill slate" style={{ background: '#f0f9ff', color: '#0284c7', borderColor: '#bae6fd' }}>
                      {rep.count} report{rep.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Violations by Grade & Section */}
        <div className="dash-bottom-card">
          <div className="dash-card-header-clean">
            <div className="dash-card-header-left">
              <GraduationCap size={20} color="#0f172a" />
              <div>
                <h2 className="dash-card-header-title">Violations by Grade & Section</h2>
                <p className="dash-card-header-desc">Dynamic incident distribution across classes</p>
              </div>
            </div>
          </div>

          {/* Horizontal Bar Breakdown */}
          <div className="dash-sections-list">
            {sectionBreakdown.map((sec) => (
              <div key={`${sec.grade}-${sec.section}`} className="dash-section-bar-row">
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

          {/* Dynamic Insight Callout Box */}
          <div className="dash-insight-banner">
            <div className="dash-insight-icon-wrap">
              <Lightbulb size={15} color="#ffffff" strokeWidth={2.2} />
            </div>
            <div>
              <h4 className="dash-insight-title">{disciplinaryInsight.title}</h4>
              <p className="dash-insight-text">
                {disciplinaryInsight.text}
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
                <CalendarDays size={16} color="#0f172a" />
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
                  <ChevronLeft size={14} strokeWidth={2.4} />
                </button>
                <button
                  type="button"
                  className="dash-cal-nav-btn"
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  title="Next Month"
                  aria-label="Next Month"
                >
                  <ChevronRight size={14} strokeWidth={2.4} />
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

          {/* Card B: High-Value Quick Actions */}
          <div className="dash-quick-actions-card">
            <h4 className="dash-quick-actions-title">
              <Compass size={15} color="#0f172a" />
              <span>Quick Actions</span>
            </h4>

            <div className="dash-quick-actions-grid">
              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => navigate('/students')}
                title="Manage student directory and profiles"
              >
                <User size={18} color="#0f172a" />
                <span>Manage Students</span>
              </button>

              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => navigate('/violations')}
                title="Review all disciplinary violation records"
              >
                <ShieldCheck size={18} color="#0f172a" />
                <span>Discipline Logs</span>
              </button>

              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => navigate('/scan-qr')}
                title="Open camera to scan student QR badges"
              >
                <QrCode size={18} color="#0f172a" />
                <span>Scan QR</span>
              </button>

              <button
                type="button"
                className="dash-quick-action-btn"
                onClick={() => setIsAddModalOpen(true)}
                title="Log a new student violation infraction"
              >
                <AlertTriangle size={18} color="#0f172a" />
                <span>Log Violation</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Violation Modal */}
      <AddViolationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onRecordAdded={() => {
          loadData();
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
