import { authMethods } from './dataService/auth.js';
import { coreMethods } from './dataService/core.js';
import { studentsMethods } from './dataService/students.js';
import { violationsMethods } from './dataService/violations.js';
import { teachersMethods } from './dataService/teachers.js';
import { adminsMethods } from './dataService/admins.js';
import { logsMethods } from './dataService/logs.js';
import { eventsMethods } from './dataService/events.js';
import { dashboardMethods } from './dataService/dashboard.js';
import { backupsMethods } from './dataService/backups.js';
import { invalidateCache } from './dataService/shared.js';

export const dataService = {
  ...authMethods,
  invalidateCache,
  ...coreMethods,
  ...studentsMethods,
  ...violationsMethods,
  ...teachersMethods,
  ...adminsMethods,
  ...logsMethods,
  ...eventsMethods,
  ...dashboardMethods,
  ...backupsMethods,
};

export default dataService;
