/**
 * Route Preloader Engine
 * Silently prefetches lazy-loaded page modules on user hover/interaction
 * ensuring instantaneous 0ms route transitions.
 */

const prefetchMap = {
  '/dashboard': () => import('../pages/DashboardPage'),
  '/violations': () => import('../pages/ViolationsPage'),
  '/violation-types': () => import('../pages/ViolationTypesPage'),
  '/students': () => import('../pages/StudentsPage'),
  '/my-class': () => import('../pages/MyClassPage'),
  '/scan-qr': () => import('../pages/ScanQRPage'),
  '/teachers': () => import('../pages/TeachersPage'),
  '/advisers': () => import('../pages/AdvisersPage'),
  '/track-location': () => import('../pages/TrackLocationPage'),
  '/admin-users': () => import('../pages/AdminUsersPage'),
  '/for-approval': () => import('../pages/ForApprovalPage'),
  '/activity-logs': () => import('../pages/ActivityLogsPage'),
  '/profile': () => import('../pages/ProfilePage'),
};

const preloadedSet = new Set();

export const preloadRoute = (path) => {
  if (!path) return;
  const cleanPath = path.split('?')[0].split('#')[0];
  if (preloadedSet.has(cleanPath)) return;

  const loader = prefetchMap[cleanPath];
  if (loader) {
    preloadedSet.add(cleanPath);
    // Execute on idle time or microtask so it never blocks active frame rendering
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        loader().catch(() => {});
      });
    } else {
      setTimeout(() => {
        loader().catch(() => {});
      }, 0);
    }
  }
};
