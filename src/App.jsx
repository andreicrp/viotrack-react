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

import { lazyRetry } from './utils/lazyRetry';

// Lazy Loaded Route Pages for Optimal Code-Splitting & Speed (with deployment auto-recovery)
const DashboardPage = lazyRetry(() => import('./pages/DashboardPage'));
const ViolationsPage = lazyRetry(() => import('./pages/ViolationsPage'));
const ViolationTypesPage = lazyRetry(() => import('./pages/ViolationTypesPage'));
const StudentsPage = lazyRetry(() => import('./pages/StudentsPage'));
const StudentViolationDetailPage = lazyRetry(() => import('./pages/StudentViolationDetailPage'));
const MyClassPage = lazyRetry(() => import('./pages/MyClassPage'));
const ScanQRPage = lazyRetry(() => import('./pages/ScanQRPage'));
const TeachersPage = lazyRetry(() => import('./pages/TeachersPage'));
const AdvisersPage = lazyRetry(() => import('./pages/AdvisersPage'));
const TrackLocationPage = lazyRetry(() => import('./pages/TrackLocationPage'));
const AdminDashboardPage = lazyRetry(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazyRetry(() => import('./pages/AdminUsersPage'));
const ForApprovalPage = lazyRetry(() => import('./pages/ForApprovalPage'));
const ActivityLogsPage = lazyRetry(() => import('./pages/ActivityLogsPage'));
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage'));
const NotificationsPage = lazyRetry(() => import('./pages/NotificationsPage'));
const LoginPage = lazyRetry(() => import('./pages/LoginPage'));
const VerifyStudentPage = lazyRetry(() => import('./pages/VerifyStudentPage'));
const NotFoundPage = lazyRetry(() => import('./pages/NotFoundPage'));
const ForbiddenPage = lazyRetry(() => import('./pages/ForbiddenPage'));
import { ServerErrorPage } from './pages/ServerErrorPage';
const ErrorTestPage = lazyRetry(() => import('./pages/ErrorTestPage'));

// Lightweight Route Loading Spinner
const PageLoader = () => {
  const { isDark } = useTheme();

  return (
    <div className={`page-loader ${isDark ? 'page-loader-dark' : 'page-loader-light'}`} role="status" aria-live="polite">
      <div className="page-loader-content">
        <div className="page-loader-spinner" aria-hidden="true">
          <span />
        </div>
        <span className="page-loader-label">Loading VioTrack</span>
        <span className="page-loader-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </div>
    </div>
  );
};

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
                      <ProtectedRoute>
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
