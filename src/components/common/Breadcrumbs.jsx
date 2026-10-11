import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const LABELS = {
  students: 'Students',
  violations: 'Violations',
  teachers: 'Teachers',
  advisers: 'Advisers',
  'student-violation': 'Student details',
  'for-approval': 'For approval',
  notifications: 'Notifications',
  profile: 'Profile',
  'admin-users': 'Admin users',
  'activity-logs': 'Activity logs',
  'scan-qr': 'Scan QR'
};

export const Breadcrumbs = () => {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <nav className="app-breadcrumbs" aria-label="Breadcrumb">
      <Link to="/" aria-label="Dashboard">
        <Home size={14} aria-hidden="true" />
        <span>Dashboard</span>
      </Link>
      {segments.map((segment, index) => {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        const label = LABELS[segment] || (index === segments.length - 1 && /^\d+$/.test(segment) ? 'Record' : segment.replace(/-/g, ' '));
        const isLast = index === segments.length - 1;
        return (
          <React.Fragment key={path}>
            <ChevronRight size={14} aria-hidden="true" />
            {isLast ? <span aria-current="page">{label}</span> : <Link to={path}>{label}</Link>}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
