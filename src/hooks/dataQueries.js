// @ts-check
import { useQuery } from '@tanstack/react-query';
import { dataService } from '../services/dataService.js';

export const dataQueryKeys = {
  all: ['viotrack'],
  students: ['viotrack', 'students'],
  records: ['viotrack', 'records'],
  violationTypes: ['viotrack', 'violation-types'],
  teachers: ['viotrack', 'teachers'],
  events: ['viotrack', 'school-events'],
  dashboard: ['viotrack', 'dashboard']
};

/** @returns {import('@tanstack/react-query').UseQueryResult<import('../services/dataService/types').Student[], Error>} */
export const useStudentsQuery = () => useQuery({
  queryKey: dataQueryKeys.students,
  queryFn: () => dataService.getStudents(true),
  staleTime: 30_000
});

/** @returns {import('@tanstack/react-query').UseQueryResult<import('../services/dataService/types').IncidentRecord[], Error>} */
export const useRecordsQuery = () => useQuery({
  queryKey: dataQueryKeys.records,
  queryFn: () => dataService.getRecords(true),
  staleTime: 20_000
});

/** @returns {import('@tanstack/react-query').UseQueryResult<import('../services/dataService/types').ViolationType[], Error>} */
export const useViolationTypesQuery = () => useQuery({
  queryKey: dataQueryKeys.violationTypes,
  queryFn: () => dataService.getViolations(true),
  staleTime: 60_000
});

/** @returns {import('@tanstack/react-query').UseQueryResult<{ students: import('../services/dataService/types').Student[], records: import('../services/dataService/types').IncidentRecord[], schoolEvents: unknown[] }, Error>} */
export const useDashboardDataQuery = () => useQuery({
  queryKey: dataQueryKeys.dashboard,
  queryFn: async () => {
    const [students, records, schoolEvents] = await Promise.all([
      dataService.getStudents(true),
      dataService.getRecords(true),
      dataService.getSchoolEvents(true)
    ]);
    return { students, records, schoolEvents };
  },
  staleTime: 30_000,
  refetchInterval: 45_000,
  refetchIntervalInBackground: false
});
