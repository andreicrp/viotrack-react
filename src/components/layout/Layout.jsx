import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { AddViolationModal } from '../violations/AddViolationModal';

export const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [addViolationOpen, setAddViolationOpen] = useState(false);

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

      <main className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
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

