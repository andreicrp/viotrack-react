import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { clearRateLimit, sanitizeForLogging } from '../utils/security';

const AuthContext = createContext(null);

// Default Demo Fallbacks for Offline / Development Mode
const DEFAULT_DEMO_ADMIN = {
  id: 1,
  name: 'System Admin',
  email: 'admin@viotrack.edu',
  role: 'admin',
  avatar: '/images/phcm-logo2.png',
  adviserSection: null
};

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // Exactly 30 Minutes Inactivity Session Timeout

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('viotrack_auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_DEMO_ADMIN;
    } catch (e) {
      return DEFAULT_DEMO_ADMIN;
    }
  });

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);

  // Synchronize state changes to secure local storage
  useEffect(() => {
    if (user) {
      try {
        const sanitized = sanitizeForLogging(user);
        localStorage.setItem('viotrack_auth_user', JSON.stringify(sanitized));
      } catch (e) {
        console.warn('Unable to persist session state to storage:', e);
      }
    } else {
      localStorage.removeItem('viotrack_auth_user');
      localStorage.removeItem('viotrack_session_token');
    }
  }, [user]);

  // Sync with Supabase Auth listener if live client is active
  useEffect(() => {
    if (isSupabaseConfigured() && supabase) {
      // 1. Get initial session
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
      });

      // 2. Listen to real-time auth state changes (token refresh, sign out, password recovery)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        if (event === 'SIGNED_OUT') {
          setUser(null);
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

  // Secure Inactivity Monitor: Auto logout after exactly 30 minutes of idle time
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (user) {
      inactivityTimerRef.current = setTimeout(() => {
        console.warn('Session expired after 30 minutes of inactivity.');
        logout('expired');
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [user]);

  useEffect(() => {
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetInactivityTimer();

    activityEvents.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));
    resetInactivityTimer();

    return () => {
      activityEvents.forEach(evt => window.removeEventListener(evt, handleActivity));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  const login = (role = 'admin') => {
    clearRateLimit('login');
    if (role === 'admin') {
      setUser({
        id: 1,
        name: 'System Admin',
        email: 'admin@viotrack.edu',
        role: 'admin',
        avatar: '/images/phcm-logo2.png',
        adviserSection: null
      });
    } else if (role === 'teacher') {
      setUser({
        id: 2,
        name: 'Juan Dela Cruz',
        email: 'teacher@viotrack.edu',
        role: 'teacher',
        avatar: '/images/phcm-logo2.png',
        adviserSection: { grade: 'Grade 10', section: 'Rizal' }
      });
    }
  };

  const logout = async (reason = 'manual') => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Error signing out from Supabase Auth:', e);
    } finally {
      setUser(null);
      setSession(null);
      localStorage.removeItem('viotrack_auth_user');
      localStorage.removeItem('viotrack_session_token');
      sessionStorage.clear();
      
      if (reason === 'expired') {
        window.location.href = '/login?logged_out=expired';
      }
    }
  };

  const switchRole = (newRole) => {
    login(newRole);
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
