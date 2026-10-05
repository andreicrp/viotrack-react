// @ts-check
import { useMemo } from 'react';

/**
 * @param {{
 *  records: import('../services/dataService/types').IncidentRecord[], search: string,
 *  statusFilter: string, severityFilter: string, gradeFilter: string, yearFilter: string,
 *  sortField: string, sortOrder: 'asc'|'desc', currentPage: number, entriesPerPage: number
 * }} options
 */
export const useViolationTableData = ({
  records, search, statusFilter, severityFilter, gradeFilter, yearFilter,
  sortField, sortOrder, currentPage, entriesPerPage
}) => {
  const stats = useMemo(() => {
    let pending = 0;
    let investigation = 0;
    let resolved = 0;
    let majorCount = 0;
    for (const record of records) {
      const status = (record.status || '').toLowerCase();
      if (status === 'pending') pending++;
      else if (status === 'investigation') investigation++;
      else if (status === 'resolved') resolved++;
      if ((record.violation?.type || '').toLowerCase() === 'major') majorCount++;
    }
    return { total: records.length, pending, investigation, resolved, majorCount };
  }, [records]);

  const filteredAndSortedRecords = useMemo(() => {
    const query = search.toLowerCase().trim();
    const targetStatus = statusFilter.toLowerCase();
    const targetSeverity = severityFilter.toLowerCase();
    const targetGrade = gradeFilter.toLowerCase();

    const result = records.filter((record) => {
      const status = (record.status || '').toLowerCase();
      if (statusFilter !== 'all' && status !== targetStatus) return false;
      const severity = (record.violation?.type || '').toLowerCase();
      if (severityFilter !== 'all' && severity !== targetSeverity) return false;

      const student = record.student;
      const grade = (typeof student?.grade === 'string' ? student.grade : '').toLowerCase();
      if (gradeFilter !== 'all' && grade !== targetGrade) return false;
      if (yearFilter !== 'all') {
        const reportedYear = new Date(record.date_reported || String(record.created_at || '')).getFullYear().toString();
        if (reportedYear !== yearFilter) return false;
      }
      if (!query) return true;

      const name = `${student?.fname || ''} ${student?.lname || ''}`.toLowerCase();
      const lrn = (typeof student?.lrn === 'string' ? student.lrn : '').toLowerCase();
      const section = (typeof student?.section === 'string' ? student.section : '').toLowerCase();
      const title = (record.violation?.title || '').toLowerCase();
      return [name, lrn, grade, section, title, severity, status].some((value) => value.includes(query));
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date_reported || 0).getTime() - new Date(b.date_reported || 0).getTime();
      } else if (sortField === 'name') {
        comparison = `${a.student?.lname || ''}, ${a.student?.fname || ''}`.toLowerCase().localeCompare(`${b.student?.lname || ''}, ${b.student?.fname || ''}`.toLowerCase());
      } else if (sortField === 'severity') {
        const rank = { major: 3, serious: 2, minor: 1 };
        comparison = (rank[(a.violation?.type || '').toLowerCase()] || 0) - (rank[(b.violation?.type || '').toLowerCase()] || 0);
      } else if (sortField === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'grade') {
        const gradeA = (typeof a.student?.grade === 'string' ? a.student.grade : '').replace(/\D/g, '');
        const gradeB = (typeof b.student?.grade === 'string' ? b.student.grade : '').replace(/\D/g, '');
        comparison = (parseInt(gradeA, 10) || 0) - (parseInt(gradeB, 10) || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [records, search, statusFilter, severityFilter, gradeFilter, yearFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / entriesPerPage) || 1;
  const paginatedRecords = filteredAndSortedRecords.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  return { stats, filteredAndSortedRecords, totalPages, paginatedRecords };
};
