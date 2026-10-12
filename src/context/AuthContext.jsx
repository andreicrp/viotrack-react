import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { customAuth, clearStoredToken } from '../lib/supabase';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 Minutes Inactivity Session Timeout
const AUTH_STORAGE_KEY = 'viotrack_auth_v3';
const AUTH_ACTIVE_KEY = 'viotrack_active_v3';
const AUTH_LOCKED_KEY = 'viotrack_locked_v3';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem(AUTH_LOCKED_KEY) === 'true';
  });
  const inactivityTimerRef = useRef(null);
  const hardTimeoutTimerRef = useRef(null);
  const lastActiveThrottleRef = useRef(0);

  // Lock state persistence
  useEffect(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    if (isLocked) {
      sessionStorage.setItem(AUTH_LOCKED_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_LOCKED_KEY);
    }
  }, [isLocked]);

  // Persist current user to sessionStorage for data services
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('viotrack_active_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('viotrack_active_user');
    }
  }, [user]);

  // Restore the server-side custom-auth session from its HttpOnly cookie.
  useEffect(() => {
    customAuth({ action: 'session' })
      .then(({ user: currentUser }) => {
        if (currentUser) setUser(currentUser);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async (reason = 'manual', scope = 'local') => {
    try {
      await customAuth({ action: 'logout' });
    } catch (e) {
      console.warn('Error signing out from custom authentication:', e);
    } finally {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (hardTimeoutTimerRef.current) {
        clearTimeout(hardTimeoutTimerRef.current);
        hardTimeoutTimerRef.current = null;
      }
      setUser(null);
      setSession(null);
      setIsLocked(false);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_ACTIVE_KEY);
      localStorage.removeItem(AUTH_LOCKED_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_ACTIVE_KEY);
      sessionStorage.removeItem(AUTH_LOCKED_KEY);
      sessionStorage.clear();
      clearStoredToken();

      if (reason === 'expired') {
        window.location.href = '/login?logged_out=expired';
      }
    }
  }, []);

  const lockScreen = useCallback(() => {
    if (user) {
      setIsLocked(true);
    }
  }, [user]);

  const unlockScreen = useCallback(async (password = '') => {
    if (!user || !password) {
      return false;
    }
    try {
      await customAuth({ action: 'login', email: user.email, password });
    } catch {
      return false;
    }
    setIsLocked(false);
    sessionStorage.removeItem(AUTH_LOCKED_KEY);
    sessionStorage.setItem(AUTH_ACTIVE_KEY, String(Date.now()));
    return true;
  }, [session, user]);

  // Secure inactivity monitor: log out after 30 minutes without activity.
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (hardTimeoutTimerRef.current) {
      clearTimeout(hardTimeoutTimerRef.current);
    }

    if (user && !isLocked) {
      // Throttle updating timestamp to every 15 seconds to minimize storage writes
      const now = Date.now();
      if (now - lastActiveThrottleRef.current > 15000) {
        lastActiveThrottleRef.current = now;
        sessionStorage.setItem(AUTH_ACTIVE_KEY, String(now));
      }

      hardTimeoutTimerRef.current = setTimeout(() => {
        console.warn('Session expired after 30 minutes of inactivity.');
        logout('expired');
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, isLocked, logout]);

  useEffect(() => {
    if (!user || isLocked) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    let lastHandled = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastHandled > 3000) {
        lastHandled = now;
        resetInactivityTimer();
      }
    };

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    resetInactivityTimer();

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (hardTimeoutTimerRef.current) clearTimeout(hardTimeoutTimerRef.current);
    };
  }, [user, isLocked, resetInactivityTimer]);

  const login = (roleOrUser, remember = true, authSession = null) => {
    let userObj;

    userObj = roleOrUser;
    if (authSession) setSession(authSession);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.setItem(AUTH_ACTIVE_KEY, String(Date.now()));
    setUser(userObj);
  };

  const switchRole = () => {
    console.warn('Role switching is disabled; roles come from the server-authenticated account.');
  };

  // RBAC & IDOR Authorization Helpers
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isAdviser = isTeacher && !!user?.adviserSection;

  const canAccessSection = (grade, section) => {
    if (isAdmin) return true;
    if (!user?.adviserSection) return true; // General teacher view
    return (
      user.adviserSection.grade?.toLowerCase() === grade?.toLowerCase() &&
      user.adviserSection.section?.toLowerCase() === section?.toLowerCase()
    );
  };

  const canAccessStudent = (student) => {
    if (isAdmin) return true;
    if (!student) return false;
    return canAccessSection(student.grade, student.section);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        session,
        loading,
        login,
        logout,
        switchRole,
        isLocked,
        lockScreen,
        unlockScreen,
        isAuthenticated: !!user,
        isAdmin,
        isTeacher,
        isAdviser,
        canAccessSection,
        canAccessStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
