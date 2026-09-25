import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  User,
  LogOut,
  Shield,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Header = ({ onToggleSidebar }) => {
  const { user, switchRole, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSwitchRole = () => {
    switchRole(isAdmin ? 'teacher' : 'admin');
    setShowDropdown(false);
  };

  const handleGoProfile = () => {
    navigate('/profile');
    setShowDropdown(false);
  };

  const handleSignOut = () => {
    logout();
    navigate('/login?logged_out=1');
    setShowDropdown(false);
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <button
          className="menu-toggle"
          id="menuToggle"
          type="button"
          aria-label="Toggle menu"
          onClick={onToggleSidebar}
        >
          <i className="fas fa-bars"></i>
        </button>

        <a
          href="/"
          className="logo"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          <div className="logo-icon">
            <img src="/images/phcm-logo.png" alt="VioTrack Logo" />
          </div>
          <span className="logo-text">VIOTRACK: By Perpetual Help College of Manila</span>
        </a>
        <a
          href="/"
          className="logo-text-mobile"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
        >
          VIOTRACK
        </a>
      </div>

      <div className="header-right">
        {/* Modern User Profile Menu */}
        <div className="header-user-menu-wrap" ref={dropdownRef}>
          <button
            type="button"
            className="header-user-avatar-btn"
            onClick={() => setShowDropdown(prev => !prev)}
            aria-label="Open User Menu"
            aria-expanded={showDropdown}
          >
            <div className="header-avatar-ring">
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                alt={user?.name || 'User'}
                className="header-avatar-img"
              />
              <span className="header-online-dot" />
            </div>
          </button>

          {showDropdown && (
            <div className="header-user-dropdown" role="menu">
              <div className="user-dropdown-header">
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user?.name || 'User'}
                  className="user-dropdown-avatar"
                />
                <div className="user-dropdown-meta">
                  <div className="user-dropdown-name">{user?.name || 'Sheryl Gamboa'}</div>
                  <span className="user-dropdown-role-chip">
                    {isAdmin ? <Shield size={11} /> : <GraduationCap size={11} />}
                    {isAdmin ? 'Administrator' : 'Teacher'}
                  </span>
                </div>
              </div>

              <div className="user-dropdown-list">
                <button
                  type="button"
                  className="user-dropdown-btn"
                  onClick={handleSwitchRole}
                  role="menuitem"
                >
                  <span className="user-dropdown-icon-box switch">
                    <RefreshCw size={14} strokeWidth={2.2} />
                  </span>
                  <span className="user-dropdown-btn-label">
                    Switch to {isAdmin ? 'Teacher' : 'Admin'}
                  </span>
                </button>

                <button
                  type="button"
                  className="user-dropdown-btn"
                  onClick={handleGoProfile}
                  role="menuitem"
                >
                  <span className="user-dropdown-icon-box profile">
                    <User size={14} strokeWidth={2.2} />
                  </span>
                  <span className="user-dropdown-btn-label">My Profile</span>
                </button>

                <div className="user-dropdown-divider" />

                <button
                  type="button"
                  className="user-dropdown-btn logout-btn"
                  onClick={handleSignOut}
                  role="menuitem"
                >
                  <span className="user-dropdown-icon-box logout">
                    <LogOut size={14} strokeWidth={2.2} />
                  </span>
                  <span className="user-dropdown-btn-label">Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
