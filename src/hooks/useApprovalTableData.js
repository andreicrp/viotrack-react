// @ts-check
import { useMemo } from 'react';
import { getApprovalStatus } from '../utils/approvalUtils.js';

/**
 * @param {{
 *  records: import('../services/dataService/types').IncidentRecord[], search: string,
 *  approvalFilter: string, severityFilter: string, gradeFilter: string, dateFilter: string,
 *  sortField: string, sortOrder: 'asc'|'desc', currentPage: number, entriesPerPage: number
 * }} options
 */
export const useApprovalTableData = ({
  records, search, approvalFilter, severityFilter, gradeFilter, dateFilter,
  sortField, sortOrder, currentPage, entriesPerPage
}) => {
  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let highSeverity = 0;
    for (const record of records) {
      const approvalStatus = getApprovalStatus(record);
      if (approvalStatus === 'Under Approval') {
        pending++;
        const severity = (record.violation?.type || '').toLowerCase();
        if (severity.includes('major') || severity.includes('serious')) highSeverity++;
      } else if (approvalStatus === 'Approved') approved++;
      else if (approvalStatus === 'Rejected') rejected++;
    }
    return { pending, approved, rejected, highSeverity, total: records.length };
  }, [records]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = search.trim().toLowerCase();
    const result = records.filter((record) => {
      const approvalStatus = getApprovalStatus(record);
      if (approvalFilter !== 'all' && approvalStatus !== approvalFilter) return false;

      const severity = (record.violation?.type || '').toLowerCase();
      if (severityFilter !== 'all' && !severity.includes(severityFilter.toLowerCase())) return false;

      const grade = (record.student?.grade || '').toLowerCase();
      if (gradeFilter !== 'all' && !grade.includes(gradeFilter.toLowerCase())) return false;

      if (dateFilter !== 'all') {
        const reportedAt = new Date(record.date_reported || 0).getTime();
        const age = Date.now() - reportedAt;
        if (dateFilter === 'today' && age > 86400000) return false;
        if (dateFilter === 'week' && age > 7 * 86400000) return false;
        if (dateFilter === 'month' && age > 30 * 86400000) return false;
      }

      if (!normalizedQuery) return true;
      const student = record.student;
      const studentName = `${student?.fname || ''} ${student?.lname || ''}`.toLowerCase();
      const studentId = [student?.student_id, student?.lrn]
        .filter((value) => typeof value === 'string')
        .join(' ')
        .toLowerCase();
      const teacher = (typeof record.reported_by_name === 'string' ? record.reported_by_name : '').toLowerCase();
      const title = (record.violation?.title || '').toLowerCase();
      const description = (typeof record.violation?.description === 'string' ? record.violation.description : '').toLowerCase();
      const remarks = (record.remarks || '').toLowerCase();
      return [studentName, studentId, teacher, title, description, remarks].some((value) => value.includes(normalizedQuery));
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'date') {
        comparison = new Date(a.date_reported || 0).getTime() - new Date(b.date_reported || 0).getTime();
      } else {
        let valueA = '';
        let valueB = '';
        if (sortField === 'student') {
          valueA = `${a.student?.fname || ''} ${a.student?.lname || ''}`.toLowerCase();
          valueB = `${b.student?.fname || ''} ${b.student?.lname || ''}`.toLowerCase();
        } else if (sortField === 'teacher') {
          valueA = typeof a.reported_by_name === 'string' ? a.reported_by_name.toLowerCase() : '';
          valueB = typeof b.reported_by_name === 'string' ? b.reported_by_name.toLowerCase() : '';
        } else if (sortField === 'severity') {
          valueA = (a.violation?.type || '').toLowerCase();
          valueB = (b.violation?.type || '').toLowerCase();
        }
        comparison = valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return result;
  }, [records, approvalFilter, severityFilter, gradeFilter, dateFilter, search, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredRecords.length / entriesPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  return { stats, filteredRecords, totalPages, paginatedRecords };
};
