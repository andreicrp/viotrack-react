import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileBottomNav } from './MobileBottomNav';
import { AddViolationModal } from '../violations/AddViolationModal';
import { InteractiveTourGuide } from '../guide/InteractiveTourGuide';
import { CommandPalette } from '../common/CommandPalette';

export const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [addViolationOpen, setAddViolationOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const handleToggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setIsMobileOpen(prev => !prev);
    } else {
      setIsCollapsed(prev => !prev);
    }
  };

  // Global Ctrl+K / Cmd+K Command Palette Shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    const handleOpenPalette = () => setIsCommandPaletteOpen(true);
    const handleOpenAddViolation = () => setAddViolationOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open_command_palette', handleOpenPalette);
    window.addEventListener('open_add_violation', handleOpenAddViolation);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open_command_palette', handleOpenPalette);
      window.removeEventListener('open_add_violation', handleOpenAddViolation);
    };
  }, []);

  return (
    <>
      <Header onToggleSidebar={handleToggleSidebar} onOpenCommandPalette={() => setIsCommandPaletteOpen(true)} />
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      <main id="main-content" tabIndex="-1" className={`main-content ${isCollapsed ? 'expanded' : ''}`}>
        <Outlet />
      </main>

      {/* Global Quick Command Palette (Ctrl + K / Cmd + K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenAddViolation={() => setAddViolationOpen(true)}
      />

      {/* Interactive Instructional Guide & SOP Hub */}
      <InteractiveTourGuide />

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

