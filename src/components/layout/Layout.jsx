import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { AddViolationModal } from '../violations/AddViolationModal';

export const Layout = () => {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [addViolationOpen, setAddViolationOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is actively typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setAddViolationOpen(true);
      } else if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setAddViolationOpen(true);
      } else if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        navigate('/scan-qr');
      } else if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        navigate('/');
      } else if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        navigate('/violations');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  return (
    <>
      <Header onToggleSidebar={handleToggleSidebar} />
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <main id="main-content" tabIndex="-1" className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
        <Outlet />
      </main>

      {/* Modern Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        onOpenMenu={() => setIsMobileOpen(prev => !prev)}
        isMenuOpen={isMobileOpen}
      />

      <AddViolationModal
        isOpen={addViolationOpen}
        onClose={() => setAddViolationOpen(false)}
        onRecordAdded={() => {
          window.dispatchEvent(new Event('viotrack_data_updated'));
        }}
      />
    </>
  );
};

