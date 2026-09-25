import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  id: 1,
  name: 'System Admin',
  email: 'admin@viotrack.edu',
  role: 'admin', // 'admin', 'teacher', 'adviser'
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  adviserSection: null
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('viotrack_auth_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('viotrack_auth_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('viotrack_auth_user');
    }
  }, [user]);

  const login = (role = 'admin') => {
    if (role === 'admin') {
      setUser({
        id: 1,
        name: 'System Admin',
        email: 'admin@viotrack.edu',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        adviserSection: null
      });
    } else if (role === 'teacher') {
      setUser({
        id: 1,
        name: 'Juan Dela Cruz',
        email: 'juan.delacruz@viotrack.edu',
        role: 'teacher',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        adviserSection: { grade: 'Grade 10', section: 'Rizal' }
      });
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (newRole) => {
    login(newRole);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, switchRole, isAuthenticated: !!user }}>
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
