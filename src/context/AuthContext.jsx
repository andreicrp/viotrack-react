import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { clearRateLimit, sanitizeForLogging } from '../utils/security';

const AuthContext = createContext(null);

const INACTIVITY_AUTO_LOCK_MS = 15 * 60 * 1000; // Exactly 15 Minutes Inactivity Screen Lock
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 60 Minutes Inactivity Hard Session Timeout
const AUTH_STORAGE_KEY = 'viotrack_auth_v3';
const AUTH_ACTIVE_KEY = 'viotrack_active_v3';
const AUTH_LOCKED_KEY = 'viotrack_locked_v3';

// Helper to determine initial user from session or local storage with timeout check
const getInitialUser = () => {
  try {
    // Purge legacy storage keys from previous builds to ensure no stale auto-logins survive
    localStorage.removeItem('viotrack_auth_user');
    localStorage.removeItem('viotrack_last_active');
    sessionStorage.removeItem('viotrack_auth_user');
    sessionStorage.removeItem('viotrack_last_active');

    const sessionSaved = sessionStorage.getItem(AUTH_STORAGE_KEY);
    const localSaved = localStorage.getItem(AUTH_STORAGE_KEY);
    const saved = sessionSaved || localSaved;
    if (!saved) return null;

    const isSession = !!sessionSaved;
    const lastActiveStr = isSession
      ? sessionStorage.getItem(AUTH_ACTIVE_KEY)
      : localStorage.getItem(AUTH_ACTIVE_KEY);

    if (lastActiveStr) {
      const lastActive = parseInt(lastActiveStr, 10);
      if (lastActive > 0 && Date.now() - lastActive > INACTIVITY_TIMEOUT_MS) {
        // Stale session expired due to inactivity
        localStorage.removeItem(AUTH_STORAGE_KEY);
        localStorage.removeItem(AUTH_ACTIVE_KEY);
        localStorage.removeItem(AUTH_LOCKED_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_ACTIVE_KEY);
        sessionStorage.removeItem(AUTH_LOCKED_KEY);
        return null;
      }
    }

    return JSON.parse(saved);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getInitialUser);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(() => {
    return sessionStorage.getItem(AUTH_LOCKED_KEY) === 'true';
  });
  const inactivityTimerRef = useRef(null);
  const hardTimeoutTimerRef = useRef(null);
  const lastActiveThrottleRef = useRef(0);

  // Synchronize state changes to active storage
  useEffect(() => {
    if (user) {
      try {
        const sanitized = sanitizeForLogging(user);
        const serialized = JSON.stringify(sanitized);
        const isSessionStored = !!sessionStorage.getItem(AUTH_STORAGE_KEY);

        if (isSessionStored) {
          sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
          sessionStorage.setItem(AUTH_ACTIVE_KEY, String(Date.now()));
        } else {
          localStorage.setItem(AUTH_STORAGE_KEY, serialized);
          localStorage.setItem(AUTH_ACTIVE_KEY, String(Date.now()));
        }
      } catch (e) {
        console.warn('Unable to persist session state to storage:', e);
      }
    }
  }, [user]);

  // Lock state persistence
  useEffect(() => {
    if (isLocked) {
      sessionStorage.setItem(AUTH_LOCKED_KEY, 'true');
    } else {
      sessionStorage.removeItem(AUTH_LOCKED_KEY);
    }
  }, [isLocked]);

  // Sync with Supabase Auth listener if live client is active
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      // 1. Get initial live session if available
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        if (currentSession?.user) {
          const role = currentSession.user.user_metadata?.role || 'admin';
          const fullName = currentSession.user.user_metadata?.full_name || (role === 'admin' ? 'System Administrator' : 'Juan Dela Cruz');
          const adviserSection = currentSession.user.user_metadata?.adviserSection || (role === 'teacher' ? { grade: 'Grade 10', section: 'Rizal' } : null);

          setUser({
            id: currentSession.user.id,
            name: fullName,
            email: currentSession.user.email,
            role: role,
            avatar: '/images/phcm-logo2.png',
            adviserSection: adviserSection
          });
        }
        setLoading(false);
      }).catch((err) => {
        console.warn('Supabase getSession error:', err);
        setLoading(false);
      });

      // 2. Listen to real-time auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        if (event === 'SIGNED_OUT') {
          if (session?.user) {
            setUser(null);
            setIsLocked(false);
            localStorage.removeItem(AUTH_STORAGE_KEY);
            localStorage.removeItem(AUTH_ACTIVE_KEY);
            localStorage.removeItem(AUTH_LOCKED_KEY);
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            sessionStorage.removeItem(AUTH_ACTIVE_KEY);
            sessionStorage.removeItem(AUTH_LOCKED_KEY);
          }
        } else if (newSession?.user) {
          const role = newSession.user.user_metadata?.role || 'admin';
          setUser({
            id: newSession.user.id,
            name: newSession.user.user_metadata?.full_name || 'VioTrack User',
            email: newSession.user.email,
            role: role,
            avatar: '/images/phcm-logo2.png',
            adviserSection: newSession.user.user_metadata?.adviserSection || null
          });
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async (reason = 'manual', scope = 'local') => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut({ scope: scope === 'global' ? 'global' : 'local' });
      }
    } catch (e) {
      console.warn('Error signing out from Supabase Auth:', e);
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

  const unlockScreen = useCallback((passwordOrPin = '') => {
    setIsLocked(false);
    sessionStorage.removeItem(AUTH_LOCKED_KEY);
    const now = Date.now();
    sessionStorage.setItem(AUTH_ACTIVE_KEY, String(now));
    localStorage.setItem(AUTH_ACTIVE_KEY, String(now));
    return true;
  }, []);

  // Secure Inactivity Monitor: Auto lock after 15 minutes of idle time
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
        if (sessionStorage.getItem(AUTH_STORAGE_KEY)) {
          sessionStorage.setItem(AUTH_ACTIVE_KEY, String(now));
        } else if (localStorage.getItem(AUTH_STORAGE_KEY)) {
          localStorage.setItem(AUTH_ACTIVE_KEY, String(now));
        }
      }

      // Auto-lock screen after 15 minutes
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('Screen auto-locked due to 15 minutes of inactivity.');
        lockScreen();
      }, INACTIVITY_AUTO_LOCK_MS);

      // Complete session timeout after 60 minutes
      hardTimeoutTimerRef.current = setTimeout(() => {
        console.warn('Session expired after 60 minutes of inactivity.');
        logout('expired');
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user, isLocked, lockScreen, logout]);

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

  const login = (roleOrUser = 'admin', remember = true) => {
    clearRateLimit('login');
    let userObj;

    if (typeof roleOrUser === 'string') {
      if (roleOrUser === 'admin') {
        userObj = {
          id: 1,
          name: 'System Admin',
          email: 'admin@viotrack.edu',
          role: 'admin',
          avatar: '/images/phcm-logo2.png',
          adviserSection: null
        };
      } else {
        userObj = {
          id: 2,
          name: 'Juan Dela Cruz',
          email: 'teacher@viotrack.edu',
          role: 'teacher',
          avatar: '/images/phcm-logo2.png',
          adviserSection: { grade: 'Grade 10', section: 'Rizal' }
        };
      }
    } else {
      userObj = roleOrUser;
    }

    const sanitized = sanitizeForLogging(userObj);
    const serialized = JSON.stringify(sanitized);
    const now = String(Date.now());

    if (remember) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_ACTIVE_KEY);
      localStorage.setItem(AUTH_STORAGE_KEY, serialized);
      localStorage.setItem(AUTH_ACTIVE_KEY, now);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_ACTIVE_KEY);
      sessionStorage.setItem(AUTH_STORAGE_KEY, serialized);
      sessionStorage.setItem(AUTH_ACTIVE_KEY, now);
    }

    setUser(userObj);
  };

  const switchRole = (newRole) => {
    login(newRole, !sessionStorage.getItem(AUTH_STORAGE_KEY));
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
