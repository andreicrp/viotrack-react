const GRADE_LEVELS = ['7', '8', '9', '10', '11', '12'];
const TREND_BUCKET_COUNT = 6;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

const parseLocalDate = (value) => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
};

export const getPrintRecordDate = (record) => {
  const value = record?.date_reported || record?.created_at || record?.date;
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? parseLocalDate(value)
    : new Date(value);
  if (!date) return null;
  return Number.isNaN(date.getTime()) ? null : date;
};

const getGradeNumber = (record) => {
  const grade = record?.student?.grade ?? record?.grade ?? '';
  return String(grade).match(/\d+/)?.[0] || '';
};

const getSeverity = (record) => {
  const rawSeverity = record?.violation?.type || record?.type || record?.severity || '';
  const match = String(rawSeverity).toLowerCase().match(/\b(minor|serious|major)\b/);
  return match?.[1] || null;
};

const isResolved = (record) => String(record?.status || '').trim().toLowerCase() === 'resolved';

export const getApprovedPrintRecords = (records = []) => records.filter((record) => {
  const status = String(record?.status || '').trim().toLowerCase();
  return String(record?.approval_status || '').trim().toLowerCase() === 'approved'
    && status !== 'under approval'
    && status !== 'rejected';
});

export const filterPrintRecords = (
  records,
  { periodPreset, customStartDate, customEndDate, selectedSeverity, selectedStatus, selectedGrade },
  now = new Date()
) => {
  let startBoundary = null;
  let endBoundary = null;

  if (periodPreset === 'today') {
    startBoundary = startOfDay(now);
    endBoundary = endOfDay(now);
  } else if (periodPreset === 'week') {
    startBoundary = startOfDay(now);
    startBoundary.setDate(startBoundary.getDate() - 6);
    endBoundary = endOfDay(now);
  } else if (periodPreset === 'month') {
    startBoundary = new Date(now.getFullYear(), now.getMonth(), 1);
    endBoundary = endOfDay(now);
  } else if (periodPreset === 'custom') {
    const startDate = parseLocalDate(customStartDate);
    const endDate = parseLocalDate(customEndDate);
    if (!startDate || !endDate || startDate > endDate) return [];
    startBoundary = startOfDay(startDate);
    endBoundary = endOfDay(endDate);
  }

  return getApprovedPrintRecords(records).filter((record) => {
    if (startBoundary && endBoundary) {
      const recordDate = getPrintRecordDate(record);
      if (!recordDate || recordDate < startBoundary || recordDate > endBoundary) return false;
    }

    if (selectedSeverity !== 'all' && getSeverity(record) !== selectedSeverity.toLowerCase()) {
      return false;
    }

    if (selectedStatus === 'resolved' && !isResolved(record)) return false;
    if (selectedStatus === 'pending' && isResolved(record)) return false;

    if (selectedGrade !== 'all') {
      const grade = getGradeNumber(record);
      if (selectedGrade === 'jhs' && !['7', '8', '9', '10'].includes(grade)) return false;
      if (selectedGrade === 'shs' && !['11', '12'].includes(grade)) return false;
      if (!['jhs', 'shs'].includes(selectedGrade) && grade !== selectedGrade) return false;
    }

    return true;
  });
};

export const buildPrintMetrics = (records) => {
  const metrics = {
    total: records.length,
    minor: 0,
    serious: 0,
    major: 0,
    resolved: 0,
    pending: 0,
    resolvedRate: 0,
    uniqueStudents: 0
  };
  const studentIds = new Set();

  records.forEach((record) => {
    const severity = getSeverity(record);
    if (severity) metrics[severity] += 1;
    if (isResolved(record)) metrics.resolved += 1;
    else metrics.pending += 1;

    const studentId = record?.student?.id ?? record?.student_id ?? record?.student?.student_id;
    if (studentId !== undefined && studentId !== null && String(studentId).trim()) {
      studentIds.add(String(studentId).trim());
    }
  });

  metrics.resolvedRate = metrics.total > 0
    ? Math.round((metrics.resolved / metrics.total) * 100)
    : 0;
  metrics.uniqueStudents = studentIds.size;
  return metrics;
};

export const buildPrintGradeBreakdown = (records) => GRADE_LEVELS.map((grade) => {
  const gradeRecords = records.filter((record) => getGradeNumber(record) === grade);
  const resolved = gradeRecords.filter(isResolved).length;
  return {
    label: `Grade ${grade}`,
    count: gradeRecords.length,
    resolved,
    pending: gradeRecords.length - resolved
  };
});

export const buildPrintViolationDistribution = (records, colors) => {
  const counts = new Map();
  records.forEach((record) => {
    const title = String(record?.violation?.title || record?.violation_name || record?.offense || 'Other Infraction').trim();
    const key = title.toLocaleLowerCase();
    const current = counts.get(key);
    if (current) {
      current.value += 1;
    } else {
      counts.set(key, {
        name: title,
        value: 1,
        severity: String(record?.violation?.type || record?.severity || record?.type || 'Minor').trim()
      });
    }
  });

  return [...counts.values()]
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .map((item, index) => ({ ...item, color: colors[index % colors.length] }));
};

const formatShortDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const makeTrendPoint = (label, start, end) => ({
  label,
  start,
  end,
  minor: 0,
  serious: 0,
  major: 0,
  total: 0
});

export const buildPrintTrendPoints = (records, periodPreset, customStartDate, customEndDate, now = new Date()) => {
  let points;

  if (periodPreset === 'today') {
    points = Array.from({ length: TREND_BUCKET_COUNT }, (_, index) => {
      const start = startOfDay(now);
      start.setHours(index * 4);
      const end = new Date(start);
      end.setHours(end.getHours() + 4);
      return makeTrendPoint(start.toLocaleTimeString('en-US', { hour: 'numeric' }), start.getTime(), end.getTime());
    });
  } else if (periodPreset === 'week') {
    const today = startOfDay(now);
    points = Array.from({ length: 7 }, (_, index) => {
      const start = new Date(today);
      start.setDate(today.getDate() - (6 - index));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return makeTrendPoint(
        start.toLocaleDateString('en-US', { weekday: 'short' }),
        start.getTime(),
        end.getTime()
      );
    });
  } else {
    let rangeStart;
    let rangeEnd;
    if (periodPreset === 'month') {
      rangeStart = new Date(now.getFullYear(), now.getMonth(), 1);
      rangeEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else if (periodPreset === 'custom') {
      const startDate = parseLocalDate(customStartDate);
      const endDate = parseLocalDate(customEndDate);
      if (!startDate || !endDate || startDate > endDate) return [];
      rangeStart = startOfDay(startDate);
      rangeEnd = startOfDay(endDate);
      rangeEnd.setDate(rangeEnd.getDate() + 1);
    } else {
      const datedRecords = records.map(getPrintRecordDate).filter(Boolean);
      if (datedRecords.length === 0) {
        points = records.length > 0
          ? [makeTrendPoint('Undated', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY)]
          : [];
      } else {
        rangeStart = startOfDay(new Date(Math.min(...datedRecords.map((date) => date.getTime()))));
        rangeEnd = startOfDay(new Date(Math.max(...datedRecords.map((date) => date.getTime()))));
        rangeEnd.setDate(rangeEnd.getDate() + 1);
      }
    }

    if (rangeStart && rangeEnd) {
      const duration = rangeEnd.getTime() - rangeStart.getTime();
      points = Array.from({ length: TREND_BUCKET_COUNT }, (_, index) => {
        const start = new Date(rangeStart.getTime() + (duration * index) / TREND_BUCKET_COUNT);
        const end = new Date(rangeStart.getTime() + (duration * (index + 1)) / TREND_BUCKET_COUNT);
        return makeTrendPoint(
          `${formatShortDate(start)}–${formatShortDate(new Date(end.getTime() - 1))}`,
          start.getTime(),
          end.getTime()
        );
      });
    }
  }

  if (periodPreset === 'all' && records.some((record) => !getPrintRecordDate(record))
    && !points.some((point) => point.label === 'Undated')) {
    points.push(makeTrendPoint('Undated', Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY));
  }

  records.forEach((record) => {
    const date = getPrintRecordDate(record);
    if (!date) {
      if (periodPreset === 'all') {
        const undatedPoint = points.find((point) => point.label === 'Undated');
        if (undatedPoint) {
          const severity = getSeverity(record);
          if (severity) undatedPoint[severity] += 1;
          undatedPoint.total += 1;
        }
      }
      return;
    }
    const point = points.find((bucket, index) => (
      date.getTime() >= bucket.start
      && (date.getTime() < bucket.end || (index === points.length - 1 && date.getTime() === bucket.end))
    ));
    if (!point && periodPreset === 'today') {
      if (date < startOfDay(now) || date > endOfDay(now)) return;
      const todayPoint = points[Math.min(Math.floor(date.getHours() / 4), points.length - 1)];
      const severity = getSeverity(record);
      if (severity) todayPoint[severity] += 1;
      todayPoint.total += 1;
      return;
    }
    if (!point) return;
    const severity = getSeverity(record);
    if (severity) point[severity] += 1;
    point.total += 1;
  });

  return points.map(({ start: _start, end: _end, ...point }) => point);
};
