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
