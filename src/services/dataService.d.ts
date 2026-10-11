import type { BackupScheduleSettings, IncidentRecord, IncidentPageOptions, PageResult, Student, StudentPageOptions, Teacher, ViolationType } from './dataService/types';

export interface DataService {
  getStudents(forceRefresh?: boolean): Promise<Student[]>;
  getStudentsPaginated(options?: StudentPageOptions): Promise<PageResult<Student>>;
  getRecords(forceRefresh?: boolean): Promise<IncidentRecord[]>;
  getRecordsPaginated(options?: IncidentPageOptions): Promise<PageResult<IncidentRecord>>;
  getViolations(forceRefresh?: boolean): Promise<ViolationType[]>;
  getTeachers(forceRefresh?: boolean): Promise<Teacher[]>;
  getSchoolEvents(forceRefresh?: boolean): Promise<unknown[]>;
  getBackupScheduleSettings(): BackupScheduleSettings;
  saveBackupScheduleSettings(settings: BackupScheduleSettings): boolean;
  checkAndRunScheduledBackup(): Promise<boolean>;
  invalidateCache(key?: string): void;
  [method: string]: unknown;
}

export const dataService: DataService;
export default dataService;
