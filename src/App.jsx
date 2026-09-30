import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';
import { SplashScreen } from './components/common/SplashScreen';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { ViolationsPage } from './pages/ViolationsPage';
import { ViolationTypesPage } from './pages/ViolationTypesPage';
import { StudentsPage } from './pages/StudentsPage';
import { StudentViolationDetailPage } from './pages/StudentViolationDetailPage';
import { MyClassPage } from './pages/MyClassPage';
import { ScanQRPage } from './pages/ScanQRPage';
import { TeachersPage } from './pages/TeachersPage';
import { AdvisersPage } from './pages/AdvisersPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ActivityLogsPage } from './pages/ActivityLogsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { ServerErrorPage } from './pages/ServerErrorPage';
import { ErrorTestPage } from './pages/ErrorTestPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
  const [showSplash, setShowSplash] = useState(true);

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
              duration={2400}
              onFinish={() => setShowSplash(false)}
            />
          )}
          <BrowserRouter>
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
          </BrowserRouter>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
