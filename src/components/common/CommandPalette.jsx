import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  QrCode,
  AlertTriangle,
  FileText,
  Users,
  GraduationCap,
  ShieldCheck,
  Activity,
  Bell,
  Settings,
  PlusCircle,
  FileSpreadsheet,
  Compass,
  Lock,
  BookOpen,
  ArrowRight,
  X,
  Sparkles,
  Command,
  CornerDownLeft,
  Sun,
  Moon
} from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';

export const CommandPalette = ({
  isOpen,
  onClose,
  onOpenAddViolation,
  onOpenPrintData,
  onOpenGuide
}) => {
  const navigate = useNavigate();
  const { user, lockScreen } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isAdmin = user?.role === 'admin';

  // Load students for fast local lookup
  useEffect(() => {
    let isMounted = true;
    const loadStudents = async () => {
      try {
        const data = await dataService.getStudents();
        if (isMounted && Array.isArray(data)) {
          setStudents(data);
        }
      } catch (err) {
        console.warn('Command palette student load error:', err);
      }
    };
    loadStudents();

    const handleUpdate = () => loadStudents();
    window.addEventListener('viotrack_data_updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('viotrack_data_updated', handleUpdate);
    };
  }, []);

  // Handle focus, reset, and body scroll locking
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
      return () => {
        clearTimeout(timer);
        unlockBodyScroll();
      };
    }
  }, [isOpen]);

  // Static Pages List
  const PAGES = useMemo(() => [
    {
      id: 'page_dashboard',
      category: 'Pages',
      title: 'Dashboard Overview',
      subtitle: 'Analytics, KPI cards, trend curves, and school calendar',
      icon: Activity,
      action: () => navigate('/')
    },
    {
      id: 'page_scan_qr',
      category: 'Pages',
      title: 'QR Code Scanner & Field Patrol',
      subtitle: 'Fast gate badge lookup and instant incident logging',
      icon: QrCode,
      action: () => navigate('/scan-qr')
    },
    {
      id: 'page_violations',
      category: 'Pages',
      title: 'Violations Registry',
      subtitle: 'Search, filter, and moderate approved incident records',
      icon: FileText,
      action: () => navigate('/violations')
    },
    {
      id: 'page_for_approval',
      category: 'Pages',
      title: 'Pending Approvals / Moderation',
      subtitle: 'Review and approve teacher-submitted violation reports',
      icon: AlertTriangle,
      action: () => navigate('/for-approval')
    },
    {
      id: 'page_students',
      category: 'Pages',
      title: 'Student Directory & Rosters',
      subtitle: 'Manage enrolled student records, LRNs, and sections',
      icon: Users,
      action: () => navigate('/students')
    },
    {
      id: 'page_advisers',
      category: 'Pages',
      title: 'Class Advisers',
      subtitle: 'Class advisory assignments and departmental supervision',
      icon: GraduationCap,
      action: () => navigate('/advisers')
    },
    {
      id: 'page_teachers',
      category: 'Pages',
      title: 'Faculty & Teachers Directory',
      subtitle: 'Faculty accounts, reporting credentials, and roles',
      icon: User,
      action: () => navigate('/teachers')
    },
    {
      id: 'page_violation_types',
      category: 'Pages',
      title: 'Violation Policies & Categories',
      subtitle: 'Manage Minor, Serious, and Major infraction presets',
      icon: ShieldCheck,
      action: () => navigate('/violation-types')
    },
    {
      id: 'page_activity_logs',
      category: 'Pages',
      title: 'System Activity Audit Logs',
      subtitle: 'Security audit trail of all staff and prefect actions',
      icon: Activity,
      action: () => navigate('/activity-logs')
    },
    {
      id: 'page_notifications',
      category: 'Pages',
      title: 'Notification Center',
      subtitle: 'Recent alerts, disciplinary summons updates, and notices',
      icon: Bell,
      action: () => navigate('/notifications')
    },
    {
      id: 'page_profile',
      category: 'Pages',
      title: 'User Profile & Preferences',
      subtitle: 'Manage security credentials, passwords, and profile details',
      icon: Settings,
      action: () => navigate('/profile')
    }
  ], [navigate]);

  // Quick Actions List
  const ACTIONS = useMemo(() => [
    {
      id: 'action_new_violation',
      category: 'Quick Actions',
      title: 'Log New Violation',
      subtitle: 'Record an infraction with student lookup, presets, and GPS',
      icon: PlusCircle,
      action: () => {
        if (typeof onOpenAddViolation === 'function') {
          onOpenAddViolation();
        } else {
          window.dispatchEvent(new CustomEvent('open_add_violation'));
        }
      }
    },
    {
      id: 'action_export_pdf',
      category: 'Quick Actions',
      title: 'Export Accreditation PDF / Print Data',
      subtitle: 'Generate multi-page formal reports with official seals',
      icon: FileSpreadsheet,
      action: () => {
        if (typeof onOpenPrintData === 'function') {
          onOpenPrintData();
        } else {
          window.dispatchEvent(new CustomEvent('open_print_data'));
        }
      }
    },
    {
      id: 'action_open_guide',
      category: 'Quick Actions',
      title: 'System Guide & SOP Walkthroughs',
      subtitle: 'Step-by-step interactive missions and operations manual',
      icon: Compass,
      action: () => {
        if (typeof onOpenGuide === 'function') {
          onOpenGuide();
        } else {
          window.dispatchEvent(new CustomEvent('open_interactive_guide'));
        }
      }
    },
    {
      id: 'action_lock_screen',
      category: 'Quick Actions',
      title: 'Lock Terminal Screen',
      subtitle: 'Immediately blur interface with secure PIN protection',
      icon: Lock,
      action: () => {
        if (typeof lockScreen === 'function') {
          lockScreen();
        }
      }
    },
    {
      id: 'action_toggle_theme',
      category: 'Quick Actions',
      title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      subtitle: `Toggle visual theme (currently ${isDark ? 'Dark' : 'Light'})`,
      icon: isDark ? Sun : Moon,
      action: () => {
        toggleTheme();
      }
    }
  ], [onOpenAddViolation, onOpenPrintData, onOpenGuide, lockScreen, isDark, toggleTheme]);

  // Filtered Results Pipeline
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Default initial view: Quick Actions + Top Pages
      return [
        ...ACTIONS,
        ...PAGES.slice(0, 5)
      ];
    }

    // 1. Search Students
    const matchedStudents = students.filter(s => {
      const name = `${s.fname || ''} ${s.mname || ''} ${s.lname || ''}`.toLowerCase();
      const lrn = String(s.lrn || '').toLowerCase();
      const sid = String(s.student_id || s.id || '').toLowerCase();
      const gradeSection = `${s.grade || ''} ${s.section || ''}`.toLowerCase();
      return name.includes(q) || lrn.includes(q) || sid.includes(q) || gradeSection.includes(q);
    }).slice(0, 6).map(s => {
      const fullName = `${s.fname || ''} ${s.lname || ''}`.trim() || 'Student';
      return {
        id: `student_${s.id}`,
        category: 'Students',
        title: fullName,
        subtitle: `Grade ${s.grade || 'N/A'} - ${s.section || 'N/A'} • LRN: ${s.lrn || 'N/A'}`,
        icon: User,
        student: s,
        action: () => navigate(`/student-violation/${s.id}`)
      };
    });

    // 2. Search Pages
    const matchedPages = PAGES.filter(p => {
      return p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q);
    });

    // 3. Search Actions
    const matchedActions = ACTIONS.filter(a => {
      return a.title.toLowerCase().includes(q) || a.subtitle.toLowerCase().includes(q);
    });

    return [
      ...matchedStudents,
      ...matchedActions,
      ...matchedPages
    ];
  }, [query, students, PAGES, ACTIONS, navigate]);

  // Keep selection within bounds
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length]);

  // Keyboard navigation inside palette
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredResults[selectedIndex];
      if (item && typeof item.action === 'function') {
        onClose();
        item.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '80px 16px 20px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px #cbd5e1',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(85vh - 80px)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff'
          }}
        >
          <Search size={19} color="#07345f" style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search students by name or LRN, jump to page, or run action..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '14.5px',
              color: '#0f172a',
              background: 'transparent',
              fontWeight: 500
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                if (inputRef.current) inputRef.current.focus();
              }}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={12} />
            </button>
          ) : (
            <kbd
              style={{
                fontSize: '10.5px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '5px',
                padding: '2px 6px',
                color: '#64748b',
                fontWeight: 700,
                fontFamily: 'monospace'
              }}
            >
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          style={{
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px',
            flex: 1
          }}
        >
          {filteredResults.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', color: '#94a3b8' }}>
                <Search size={20} />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                No results found for "{query}"
              </p>
              <span style={{ fontSize: '12px' }}>
                Try searching for student names, 12-digit LRNs, or navigation pages.
              </span>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const isActive = idx === selectedIndex;
              const IconComponent = item.icon || FileText;

              return (
                <div
                  key={item.id}
                  data-active={isActive}
                  onClick={() => {
                    onClose();
                    item.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    background: isActive ? '#f1f5f9' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.1s ease',
                    border: isActive ? '1px solid #cbd5e1' : '1px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        background: isActive ? '#ffffff' : '#f8fafc',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#07345f',
                        flexShrink: 0
                      }}
                    >
                      <IconComponent size={17} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </span>
                        <span
                          style={{
                            fontSize: '9.5px',
                            fontWeight: 700,
                            color: item.category === 'Students' ? '#0369a1' : item.category === 'Quick Actions' ? '#059669' : '#64748b',
                            background: item.category === 'Students' ? '#e0f2fe' : item.category === 'Quick Actions' ? '#ecfdf5' : '#f1f5f9',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            flexShrink: 0
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isActive ? '#07345f' : '#94a3b8', flexShrink: 0, paddingLeft: '8px' }}>
                    <CornerDownLeft size={13} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div
          style={{
            padding: '10px 16px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: '#0f172a' }}>↑</kbd>
              <kbd style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: '#0f172a' }}>↓</kbd>
              <span>to navigate</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: '#0f172a' }}>↵</kbd>
              <span>to select</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <kbd style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '1px 5px', fontSize: '10px', color: '#0f172a' }}>ESC</kbd>
              <span>to close</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: '#07345f' }}>
            <Command size={12} />
            <span>VioTrack Quick Command</span>
          </div>
        </div>
      </div>
    </div>
  );
};
