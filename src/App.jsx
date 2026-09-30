import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { SplashScreen } from './components/common/SplashScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Lazy Loaded Route Pages for Optimal Code-Splitting & Speed
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const ViolationsPage = lazy(() => import('./pages/ViolationsPage').then(m => ({ default: m.ViolationsPage })));
const ViolationTypesPage = lazy(() => import('./pages/ViolationTypesPage').then(m => ({ default: m.ViolationTypesPage })));
const StudentsPage = lazy(() => import('./pages/StudentsPage').then(m => ({ default: m.StudentsPage })));
const StudentViolationDetailPage = lazy(() => import('./pages/StudentViolationDetailPage').then(m => ({ default: m.StudentViolationDetailPage })));
const MyClassPage = lazy(() => import('./pages/MyClassPage').then(m => ({ default: m.MyClassPage })));
const ScanQRPage = lazy(() => import('./pages/ScanQRPage').then(m => ({ default: m.ScanQRPage })));
const TeachersPage = lazy(() => import('./pages/TeachersPage').then(m => ({ default: m.TeachersPage })));
const AdvisersPage = lazy(() => import('./pages/AdvisersPage').then(m => ({ default: m.AdvisersPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const ActivityLogsPage = lazy(() => import('./pages/ActivityLogsPage').then(m => ({ default: m.ActivityLogsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const ForbiddenPage = lazy(() => import('./pages/ForbiddenPage').then(m => ({ default: m.ForbiddenPage })));
import { ServerErrorPage } from './pages/ServerErrorPage';
const ErrorTestPage = lazy(() => import('./pages/ErrorTestPage').then(m => ({ default: m.ErrorTestPage })));

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

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const configureStatusBar = async () => {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        } catch (e) {
          console.warn('Capacitor StatusBar configuration error:', e);
        }
      };
      configureStatusBar();
    }
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
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
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forbidden" element={<ForbiddenPage standalone />} />
                <Route path="/403" element={<ForbiddenPage standalone />} />
                <Route path="/500" element={<ServerErrorPage standalone />} />
                <Route path="/404" element={<NotFoundPage standalone />} />

                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="scan-qr" element={<ScanQRPage />} />
                  <Route path="violations" element={<ViolationsPage />} />
                  <Route path="violation-types" element={<ViolationTypesPage />} />
                  <Route path="students" element={<StudentsPage />} />
                  <Route path="student-violation/:id" element={<StudentViolationDetailPage />} />
                  <Route path="adminstudentviolation/:id" element={<StudentViolationDetailPage />} />
                  <Route path="my-class" element={<MyClassPage />} />
                  <Route path="teachers" element={<TeachersPage />} />
                  <Route path="advisers" element={<AdvisersPage />} />
                  <Route path="adviserview-student/:id" element={<MyClassPage />} />
                  <Route path="admin-users" element={<AdminUsersPage />} />
                  <Route path="activity-logs" element={<ActivityLogsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="error-test" element={<ErrorTestPage />} />
                  <Route path="forbidden" element={<ForbiddenPage />} />
                  <Route path="403" element={<ForbiddenPage />} />
                  <Route path="500" element={<ServerErrorPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>

                {/* Catch-all for unauthenticated or outside-layout paths */}
                <Route path="/error-test" element={<ErrorTestPage />} />
                <Route path="*" element={<NotFoundPage standalone />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
