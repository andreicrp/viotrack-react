import { describe, expect, it } from 'vitest';
import { parseEntityCsv } from './entityCsv';

describe('entity CSV parsing', () => {
  it('maps staff fields by CSV headings regardless of column order', () => {
    const rows = parseEntityCsv(
      '\uFEFFDepartment\t"Last Name"\t"Email Address"\t"First Name"\tPosition\t"Middle Name"\nScience\tReyes\tana@example.edu\tAna\tTeacher II\tM.',
      {
        fname: ['first name', 'fname'],
        mname: ['middle name', 'mname'],
        lname: ['last name', 'lname'],
        email: ['email', 'email address'],
        position: ['position'],
        department: ['department']
      }
    );

    expect(rows).toEqual([{
      department: 'Science',
      lname: 'Reyes',
      email: 'ana@example.edu',
      fname: 'Ana',
      position: 'Teacher II',
      mname: 'M.'
    }]);
  });

  it('keeps absent values empty instead of shifting columns or fabricating defaults', () => {
    const rows = parseEntityCsv(
      'Email,Last Name,First Name,Role,Contact\nadmin@example.edu,Reyes,Ana,Registrar,09171234567',
      {
        fname: ['first name', 'fname'],
        lname: ['last name', 'lname'],
        email: ['email'],
        role: ['role'],
        contact: ['contact', 'phone']
      }
    );

    expect(rows).toEqual([{
      email: 'admin@example.edu',
      lname: 'Reyes',
      fname: 'Ana',
      role: 'Registrar',
      contact: '09171234567'
    }]);
  });

  it('continues to support the documented headerless column order', () => {
    expect(parseEntityCsv(
      'Cheating,Major,Exam dishonesty,Written reprimand',
      {
        title: ['title'],
        type: ['type'],
        description: ['description'],
        default_sanction: ['default sanction']
      },
      ['title', 'type', 'description', 'default_sanction']
    )).toEqual([{
      title: 'Cheating',
      type: 'Major',
      description: 'Exam dishonesty',
      default_sanction: 'Written reprimand'
    }]);
  });
});
