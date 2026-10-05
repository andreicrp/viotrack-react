import type { IncidentRecord, Student, Teacher, ViolationType } from './dataService/types';

export interface DataService {
  getStudents(forceRefresh?: boolean): Promise<Student[]>;
  getRecords(forceRefresh?: boolean): Promise<IncidentRecord[]>;
  getViolations(forceRefresh?: boolean): Promise<ViolationType[]>;
  getTeachers(forceRefresh?: boolean): Promise<Teacher[]>;
  getSchoolEvents(forceRefresh?: boolean): Promise<unknown[]>;
  invalidateCache(key?: string): void;
  [method: string]: unknown;
}

export const dataService: DataService;
export default dataService;
