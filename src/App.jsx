import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/layout/Layout';

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

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

export function App() {
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
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

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
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
