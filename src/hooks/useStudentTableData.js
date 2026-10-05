// @ts-check
import { useMemo } from 'react';
import { getGradeNumber, getStudentStrand } from '../utils/studentUtils.js';

/**
 * @param {{
 *  students: import('../services/dataService/types').Student[], search: string,
 *  levelFilter: string, gradeFilter: string, strandFilter: string,
 *  sortField: string, sortOrder: 'asc'|'desc', currentPage: number, entriesPerPage: number
 * }} options
 */
export const useStudentTableData = ({
  students, search, levelFilter, gradeFilter, strandFilter,
  sortField, sortOrder, currentPage, entriesPerPage
}) => {
  const stats = useMemo(() => {
    let jhsCount = 0;
    let shsCount = 0;
    const strands = new Set();

    for (const student of students) {
      const gradeNumber = getGradeNumber(student.grade);
      if (gradeNumber >= 7 && gradeNumber <= 10) jhsCount++;
      else if (gradeNumber >= 11 && gradeNumber <= 12) shsCount++;
      strands.add(getStudentStrand(student));
    }

    return { total: students.length, jhsCount, shsCount, uniqueStrands: strands.size };
  }, [students]);

  const filteredAndSortedStudents = useMemo(() => {
    const query = search.toLowerCase().trim();
    const targetGrade = gradeFilter.toLowerCase();
    const targetStrand = strandFilter.toLowerCase();

    const result = students.filter((student) => {
      const gradeNumber = getGradeNumber(student.grade);
      const isJhs = gradeNumber >= 7 && gradeNumber <= 10;
      const isShs = gradeNumber >= 11 && gradeNumber <= 12;
      const matchesLevel = levelFilter === 'all' || (levelFilter === 'jhs' && isJhs) || (levelFilter === 'shs' && isShs);
      if (!matchesLevel) return false;

      const studentGrade = (student.grade || '').toLowerCase();
      if (gradeFilter !== 'all' && studentGrade !== targetGrade) return false;

      const strand = getStudentStrand(student);
      if (strandFilter !== 'all' && strand.toLowerCase() !== targetStrand) return false;
      if (!query) return true;

      const fullName = `${student.fname || ''} ${student.mname || ''} ${student.lname || ''}`.toLowerCase();
      const lrn = (student.lrn || '').toLowerCase();
      const section = (student.section || '').toLowerCase();
      const guardian = (typeof student.parent_name === 'string' ? student.parent_name : '').toLowerCase();
      return [fullName, lrn, studentGrade, section, guardian, strand.toLowerCase()].some((value) => value.includes(query));
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'grade') {
        comparison = getGradeNumber(a.grade) - getGradeNumber(b.grade);
        if (comparison === 0) comparison = (a.section || '').localeCompare(b.section || '');
      } else if (sortField === 'strand') {
        comparison = getStudentStrand(a).localeCompare(getStudentStrand(b));
        if (comparison === 0) comparison = getGradeNumber(a.grade) - getGradeNumber(b.grade);
      } else if (sortField === 'name') {
        comparison = `${a.lname || ''}, ${a.fname || ''}`.toLowerCase().localeCompare(`${b.lname || ''}, ${b.fname || ''}`.toLowerCase());
      } else if (sortField === 'lrn') {
        comparison = (a.lrn || '').localeCompare(b.lrn || '');
      } else if (sortField === 'section') {
        comparison = (a.section || '').localeCompare(b.section || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [students, search, levelFilter, gradeFilter, strandFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / entriesPerPage) || 1;
  const paginatedStudents = filteredAndSortedStudents.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);
  return { stats, filteredAndSortedStudents, totalPages, paginatedStudents };
};
