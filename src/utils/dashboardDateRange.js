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

const getRecordDate = (record) => {
  const value = record?.date_reported || record?.created_at;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateLabel = (date) => date.toLocaleDateString('en-US', {
  month: 'numeric',
  day: 'numeric'
});

const getSeverity = (record) => {
  const severity = String(record?.violation?.type || record?.type || record?.severity || '').toLowerCase();
  return ['minor', 'serious', 'major'].includes(severity) ? severity : 'minor';
};

const emptyPoint = (time) => ({ time, minor: 0, serious: 0, major: 0, total: 0 });

const addRecordToPoint = (point, record) => {
  point[getSeverity(record)] += 1;
  point.total += 1;
};

export const getDashboardDateRange = (
  chartFilter,
  startDate,
  endDate,
  calendarMonth,
  now = new Date()
) => {
  if (chartFilter === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (chartFilter === 'week') {
    const start = startOfDay(now);
    start.setDate(start.getDate() - 6);
    return { start, end: endOfDay(now) };
  }

  if (chartFilter === 'custom') {
    const parsedStart = parseLocalDate(startDate);
    const parsedEnd = parseLocalDate(endDate);
    if (!parsedStart || !parsedEnd) return null;
    return { start: startOfDay(parsedStart), end: endOfDay(parsedEnd) };
  }

  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  return {
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 0, 23, 59, 59, 999)
  };
};

export const filterDashboardRecords = (records, dateRange) => {
  if (!dateRange || dateRange.start > dateRange.end) return [];
  return records.filter(record => {
    const date = getRecordDate(record);
    return date && date >= dateRange.start && date <= dateRange.end;
  });
};

export const buildDashboardTrendData = (
  records,
  chartFilter,
  startDate,
  endDate,
  calendarMonth,
  now = new Date()
) => {
  if (chartFilter === 'today') {
    const points = Array.from({ length: 18 }, (_, index) => {
      const hour = index + 6;
      const label = hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`;
      return { ...emptyPoint(label), hour };
    });
    records.forEach(record => {
      const date = getRecordDate(record);
      if (!date) return;
      const bucket = date.getHours() < 6 ? points[0] : points[date.getHours() - 6];
      if (bucket) addRecordToPoint(bucket, record);
    });
    return points.map(({ hour: _hour, ...point }) => point);
  }

  const dateRange = getDashboardDateRange(chartFilter, startDate, endDate, calendarMonth, now);
  if (!dateRange || dateRange.start > dateRange.end) return [];

  if (chartFilter === 'month' || chartFilter === 'week') {
    const points = [];
    const cursor = startOfDay(dateRange.start);
    while (cursor <= dateRange.end) {
      points.push({ ...emptyPoint(formatDateLabel(cursor)), dateKey: cursor.toDateString() });
      cursor.setDate(cursor.getDate() + 1);
    }
    const byDate = new Map(points.map(point => [point.dateKey, point]));
    records.forEach(record => {
      const date = getRecordDate(record);
      const point = date && byDate.get(startOfDay(date).toDateString());
      if (point) addRecordToPoint(point, record);
    });
    return points.map(({ dateKey: _dateKey, ...point }) => point);
  }

  const rangeDuration = dateRange.end.getTime() - dateRange.start.getTime() + 1;
  const calendarDays = Math.floor(
    (startOfDay(dateRange.end).getTime() - startOfDay(dateRange.start).getTime()) / 86400000
  ) + 1;

  if (calendarDays <= 7) {
    const points = [];
    const cursor = startOfDay(dateRange.start);
    while (cursor <= dateRange.end) {
      points.push({ ...emptyPoint(formatDateLabel(cursor)), dateKey: cursor.toDateString() });
      cursor.setDate(cursor.getDate() + 1);
    }
    const byDate = new Map(points.map(point => [point.dateKey, point]));
    records.forEach(record => {
      const date = getRecordDate(record);
      const point = date && byDate.get(startOfDay(date).toDateString());
      if (point) addRecordToPoint(point, record);
    });
    return points.map(({ dateKey: _dateKey, ...point }) => point);
  }

  const points = Array.from({ length: 5 }, (_, index) => {
    const bucketStart = new Date(dateRange.start.getTime() + (rangeDuration * index) / 5);
    const bucketEnd = new Date(dateRange.start.getTime() + (rangeDuration * (index + 1)) / 5 - 1);
    const label = `${formatDateLabel(bucketStart)}–${formatDateLabel(bucketEnd)}`;
    return { ...emptyPoint(label), start: bucketStart.getTime(), end: bucketEnd.getTime() };
  });
  records.forEach(record => {
    const date = getRecordDate(record);
    if (!date) return;
    const point = points.find(bucket => date.getTime() >= bucket.start && date.getTime() <= bucket.end);
    if (point) addRecordToPoint(point, record);
  });
  return points.map(({ start: _start, end: _end, ...point }) => point);
};
