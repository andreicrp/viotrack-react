/** @typedef {import('../services/dataService/types').Student} Student */

/** @param {Student & { strand?: string }} student */
export const getStudentStrand = (student) => {
  if (student.strand) return student.strand;
  const section = (student.section || '').toUpperCase();
  if (section.includes('STEM')) return 'STEM';
  if (section.includes('HUMSS')) return 'HUMSS';
  if (section.includes('ABM')) return 'ABM';
  if (section.includes('GAS')) return 'GAS';
  if (section.includes('TVL')) return 'TVL';
  if (section.includes('ICT')) return 'ICT';
  if (section.includes('HE')) return 'HE';

  const gradeNumber = parseInt((student.grade || '').replace(/\D/g, ''), 10);
  if (gradeNumber >= 11) return 'Academic Track';
  return 'JHS Core';
};

/** @param {string|undefined} grade */
export const getGradeNumber = (grade) => {
  const number = parseInt((grade || '').replace(/\D/g, ''), 10);
  return Number.isNaN(number) ? 0 : number;
};
