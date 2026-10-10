import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { SplashScreen } from './components/common/SplashScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { CookieConsentBanner } from './components/legal/CookieConsentBanner';
import { ScreenLockModal } from './components/common/ScreenLockModal';
import { dataService } from './services/dataService';

// Lazy Loaded Route Pages for Optimal Code-Splitting & Speed
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage || m.default })));
const ViolationsPage = lazy(() => import('./pages/ViolationsPage').then(m => ({ default: m.ViolationsPage || m.default })));
const ViolationTypesPage = lazy(() => import('./pages/ViolationTypesPage').then(m => ({ default: m.ViolationTypesPage || m.default })));
const StudentsPage = lazy(() => import('./pages/StudentsPage').then(m => ({ default: m.StudentsPage || m.default })));
const StudentViolationDetailPage = lazy(() => import('./pages/StudentViolationDetailPage').then(m => ({ default: m.StudentViolationDetailPage || m.default })));
const MyClassPage = lazy(() => import('./pages/MyClassPage').then(m => ({ default: m.MyClassPage || m.default })));
const ScanQRPage = lazy(() => import('./pages/ScanQRPage').then(m => ({ default: m.ScanQRPage || m.default })));
const TeachersPage = lazy(() => import('./pages/TeachersPage').then(m => ({ default: m.TeachersPage || m.default })));
const AdvisersPage = lazy(() => import('./pages/AdvisersPage').then(m => ({ default: m.AdvisersPage || m.default })));
const TrackLocationPage = lazy(() => import('./pages/TrackLocationPage').then(m => ({ default: m.TrackLocationPage || m.default })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage || m.default })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage || m.default })));
const ForApprovalPage = lazy(() => import('./pages/ForApprovalPage').then(m => ({ default: m.ForApprovalPage || m.default })));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage').then(m => ({ default: m.ActivityLogsPage || m.default })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage || m.default })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage || m.default })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage || m.default })));
const VerifyStudentPage = lazy(() => import('./pages/VerifyStudentPage').then(m => ({ default: m.VerifyStudentPage || m.default })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage || m.default })));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage').then(m => ({ default: m.ForbiddenPage || m.default })));
import { ServerErrorPage } from './pages/ServerErrorPage';
const ErrorTestPage = lazy(() => import('./pages/ErrorTestPage').then(m => ({ default: m.ErrorTestPage || m.default })));

// Lightweight Route Loading Spinner
const PageLoader = () => (
  <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div 
        style={{ 
          width: '36px', 
          height: '36px', 
          border: '3px solid #e2e8f0', 
          borderTopColor: '#07345f', 
          borderRadius: '50%', 
          animation: 'spin 0.8s linear infinite' 
        }} 
      />
      <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Loading VioTrack...</span>
    </div>
  </div>
);

const AuthenticatedStartupTasks = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    let idleCallbackId;
    let timeoutId;
    const runStartupTasks = () => {
      void dataService.checkAndRunScheduledBackup();
    };

    if (typeof window.requestIdleCallback === 'function') {
      idleCallbackId = window.requestIdleCallback(runStartupTasks, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(runStartupTasks, 250);
    }

    const backupInterval = window.setInterval(() => {
      void dataService.checkAndRunScheduledBackup();
    }, 60 * 60 * 1000);

    return () => {
      if (
        idleCallbackId !== undefined &&
        typeof window.cancelIdleCallback === 'function'
      ) {
        window.cancelIdleCallback(idleCallbackId);
      }
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
      window.clearInterval(backupInterval);
    };
  }, [loading, user?.id]);

  return null;
};

const NativeStatusBarTheme = () => {
  const { isDark } = useTheme();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const configureStatusBar = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ color: isDark ? '#050b12' : '#ffffff' });
      } catch (error) {
        console.warn('Capacitor StatusBar configuration error:', error);
      }
    };

    void configureStatusBar();
  }, [isDark]);

  return null;
};

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    const returnUrl = location.pathname + location.search;
    const isScanAttempt = returnUrl.includes('scan') || returnUrl.includes('student') || returnUrl.includes('violation');
    const redirectParam = encodeURIComponent(returnUrl);
    const loginUrl = isScanAttempt
      ? `/login?redirect=${redirectParam}&reason=qr_protected`
      : `/login?redirect=${redirectParam}`;
    return <Navigate to={loginUrl} replace />;
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/forbidden" replace />;
  }

  return children;
};

export function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash screen on native Capacitor app on first launch
    return Capacitor.isNativePlatform();
  });

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <NotificationProvider>
            <NativeStatusBarTheme />
            <AuthenticatedStartupTasks />
            {showSplash && (
              <SplashScreen
                mode="coded"
                duration={1600}
                onFinish={() => setShowSplash(false)}
              />
            )}
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Public Auth & Student ID Pass Routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/verify-student/:id" element={<VerifyStudentPage />} />
                <Route path="/student-pass/:id" element={<VerifyStudentPage />} />
                <Route path="/forbidden" element={<ForbiddenPage standalone />} />
                <Route path="/403" element={<ForbiddenPage standalone />} />
                <Route path="/500" element={<ServerErrorPage standalone />} />
                <Route path="/404" element={<NotFoundPage standalone />} />

                {/* Authenticated Application Layout */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  {/* General Authenticated Access */}
                  <Route index element={<DashboardPage />} />
                  <Route path="scan-qr" element={<ScanQRPage />} />
                  <Route path="scan" element={<ScanQRPage />} />
                  <Route path="track-location" element={<TrackLocationPage />} />
                  <Route path="violations" element={<ViolationsPage />} />
                  <Route path="violation-types" element={<ViolationTypesPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="student-violation/:id" element={<StudentViolationDetailPage />} />
                  <Route path="adminstudentviolation/:id" element={<StudentViolationDetailPage />} />
                  <Route path="my-class" element={<MyClassPage />} />
                  <Route path="adviserview-student/:id" element={<MyClassPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="notifications" element={<NotificationsPage />} />

                  {/* Strict Admin RBAC Protected Routes */}
                  <Route 
                    path="teachers" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <TeachersPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="advisers" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdvisersPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="admin-dashboard"
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="admin-users" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <AdminUsersPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="for-approval" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <ForApprovalPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="activity-logs" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <ActivityLogsPage />
                      </ProtectedRoute>
                    } 
                  />

                  {/* Error & Fallback in layout */}
                  <Route path="error-test" element={<ErrorTestPage />} />
                  <Route path="forbidden" element={<ForbiddenPage />} />
                  <Route path="403" element={<ForbiddenPage />} />
                  <Route path="500" element={<ServerErrorPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Catch-all */}
                <Route path="/error-test" element={<ErrorTestPage />} />
                <Route path="*" element={<NotFoundPage standalone />} />
              </Routes>
            </Suspense>
            <CookieConsentBanner />
            <ScreenLockModal />
          </BrowserRouter>
        </NotificationProvider>
      </ThemeProvider>
    </AuthProvider>
  </ErrorBoundary>
  );
}

export default App;
