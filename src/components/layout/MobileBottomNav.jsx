import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShieldAlert,
  QrCode,
  GraduationCap,
  Menu
} from 'lucide-react';
import './MobileBottomNav.css';

export const MobileBottomNav = ({ onOpenMenu, isMenuOpen }) => {

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="mobile-bottom-nav-inner">
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `mobile-nav-item ${isActive && !isMenuOpen ? 'active' : ''}`
          }
        >
          <div className="mobile-nav-icon-wrap">
            <LayoutDashboard size={22} strokeWidth={2.2} />
          </div>
          <span className="mobile-nav-label">Home</span>
        </NavLink>

        {/* Violations */}
        <NavLink
          to="/violations"
          className={({ isActive }) =>
            `mobile-nav-item ${isActive && !isMenuOpen ? 'active' : ''}`
          }
        >
          <div className="mobile-nav-icon-wrap">
            <ShieldAlert size={22} strokeWidth={2.2} />
          </div>
          <span className="mobile-nav-label">Violations</span>
        </NavLink>

        {/* Scan QR (Center Elevated Action) */}
        <NavLink
          to="/scan-qr"
          className={({ isActive }) =>
            `mobile-nav-item mobile-nav-center-action ${isActive && !isMenuOpen ? 'active' : ''}`
          }
          aria-label="Scan QR Code"
        >
          <div className="mobile-nav-fab">
            <QrCode size={26} strokeWidth={2.4} />
          </div>
          <span className="mobile-nav-label">Scan QR</span>
        </NavLink>

        {/* Students */}
        <NavLink
          to="/students"
          className={({ isActive }) =>
            `mobile-nav-item ${isActive && !isMenuOpen ? 'active' : ''}`
          }
        >
          <div className="mobile-nav-icon-wrap">
            <GraduationCap size={22} strokeWidth={2.2} />
          </div>
          <span className="mobile-nav-label">Students</span>
        </NavLink>

        {/* More / Menu Toggle */}
        <button
          type="button"
          className={`mobile-nav-item mobile-nav-btn ${isMenuOpen ? 'active' : ''}`}
          onClick={onOpenMenu}
          aria-label="Toggle All Menu Options"
        >
          <div className="mobile-nav-icon-wrap">
            <Menu size={22} strokeWidth={2.2} />
          </div>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </div>
    </nav>
  );
};
