export type Severity = 'Minor' | 'Serious' | 'Major';

export interface Student {
  id: number | string;
  student_id?: string;
  lrn?: string;
  email?: string;
  fname: string;
  lname: string;
  grade?: string;
  track?: string;
  strand?: string;
  section?: string;
  image?: string;
  [key: string]: unknown;
}

export interface StudentInput {
  student_id?: string | number;
  lrn?: string | number;
  fname?: string;
  mname?: string;
  lname?: string;
  email?: string;
  grade?: string;
  track?: string;
  strand?: string;
  section?: string;
  academicyear?: string;
  academic_year?: string;
  gender?: string;
  contact?: string;
  parent_name?: string;
  parent_contact?: string;
  address?: string;
  password?: string;
  image?: string;
  [key: string]: unknown;
}

export interface BulkStudentImportResult {
  insertedCount: number;
  errors: unknown[];
}

export interface BackupScheduleSettings {
  auto_backup_enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
  last_run?: string | null;
}

export interface Teacher {
  id: number | string;
  fname: string;
  lname: string;
  email?: string;
  position?: string;
  department?: string;
  [key: string]: unknown;
}

export interface ViolationType {
  id: number | string;
  title: string;
  type: Severity;
  description?: string;
  [key: string]: unknown;
}

export interface IncidentRecord {
  id: number | string;
  student_id: number | string;
  violation_id?: number | string;
  date_reported?: string;
  status?: string;
  approval_status?: string;
  remarks?: string;
  student?: Student;
  violation?: ViolationType;
  [key: string]: unknown;
}

export interface PageResult<T> {
  data: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface StudentPageOptions {
  page?: number;
  limit?: number;
  search?: string;
  grade?: string;
  section?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IncidentPageOptions {
  page?: number;
  limit?: number;
  status?: string;
  approvalStatus?: string;
  search?: string;
  dateRange?: unknown;
}
