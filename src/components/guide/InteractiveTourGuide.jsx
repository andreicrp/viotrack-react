import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HelpCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  QrCode,
  AlertTriangle,
  FileText,
  ShieldCheck,
  BarChart3,
  BookOpen,
  ArrowRight,
  Compass,
  Play,
  RotateCcw,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Institutional Sanctions Reference Data for Quick Access
const SANCTIONS_MATRIX = [
  {
    level: 'Minor Offense',
    color: '#10b981',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    examples: ['Improper Uniform / No ID', 'Tardiness / Loitering', 'Minor Classroom Disruption'],
    firstOffense: 'Verbal Warning & Counseling',
    secondOffense: 'Written Reflection & Adviser Notification',
    thirdOffense: 'Mandatory Parent / Guardian Conference'
  },
  {
    level: 'Serious Offense',
    color: '#f59e0b',
    bg: '#fffbeb',
    border: '#fde68a',
    examples: ['Cutting Classes / Truancy', 'Disrespect toward School Personnel', 'Unauthorized Campus Exit'],
    firstOffense: 'Parent Summons & 2-Hour Campus Service',
    secondOffense: 'Formal Behavioral Contract & Counseling',
    thirdOffense: 'Disciplinary Committee Escalation'
  },
  {
    level: 'Major Offense',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    examples: ['Bullying / Physical Altercation', 'Academic Dishonesty / Forgery', 'Vandalism / Property Damage'],
    firstOffense: 'Immediate Parent Summons & Disciplinary Board Hearing',
    secondOffense: 'Suspension / Behavioral Probation',
    thirdOffense: 'Non-Readmission / Recommendation for Transfer'
  }
];

// Interactive Guided Tours Definitions
const TOUR_SCENARIOS = {
  overview: {
    id: 'overview',
    title: 'Full VioTrack System Tour',
    description: 'Learn the primary navigation, analytics dashboard, and core disciplinary tools.',
    route: '/',
    steps: [
      {
        target: '.header-title, h1, h2',
        title: 'Welcome to VioTrack',
        content: 'VioTrack is the institutional Student Welfare and Disciplinary Management System for the University of Perpetual Help System Manila.',
        badge: 'Getting Started',
        icon: Sparkles
      },
      {
        target: '.metrics-grid, .stats-container, [data-tour="metrics"]',
        title: 'Real-Time Incident Metrics',
        content: 'Monitor high-level KPI cards showing Total Reported Infractions, Resolved Cases, Active Students, and Pending Actions at a glance.',
        badge: 'Analytics',
        icon: BarChart3
      },
      {
        target: 'nav, .sidebar, .mobile-nav-bar',
        title: 'Navigation Hub',
        content: 'Access the QR Scanner for on-the-ground ID checks, Violations Registry, Student Rosters, and Institutional Data Print exports.',
        badge: 'Navigation',
        icon: Compass
      }
    ]
  },
  qr_scanner: {
    id: 'qr_scanner',
    title: 'QR Code Scanning & Field Patrol',
    description: 'Master how to scan student badges at school gates and hallways for instant lookup.',
    route: '/scan',
    steps: [
      {
        target: '.scanner-viewport, video, [data-tour="camera"]',
        title: 'Live Camera Viewfinder',
        content: 'Point your phone or laptop camera at the student ID QR code. VioTrack detects and reads the student identification number in real-time.',
        badge: 'Camera Scan',
        icon: QrCode
      },
      {
        target: 'input[type="text"], .search-input, [data-tour="manual-search"]',
        title: 'Manual Student ID / LRN Search',
        content: 'If a student forgot their physical ID card, type their Student ID number or name here to look up their disciplinary history instantly.',
        badge: 'Manual Lookup',
        icon: BookOpen
      },
      {
        target: 'button, .action-btn, [data-tour="quick-log"]',
        title: 'Quick Infraction Logging',
        content: 'Once the student profile appears, tap "Log Violation" to record infractions with preset policies and timestamps in under 5 seconds.',
        badge: 'Instant Citation',
        icon: AlertTriangle
      }
    ]
  },
  violations_log: {
    id: 'violations_log',
    title: 'Violations Registry & Filtering',
    description: 'Learn how to filter, search, and manage disciplinary incident records.',
    route: '/violations',
    steps: [
      {
        target: '.filters-container, .filter-bar, [data-tour="filters"]',
        title: 'Severity & Status Filters',
        content: 'Filter incidents by Minor, Serious, or Major offense level, or filter by Pending vs. Resolved status to prioritize open cases.',
        badge: 'Filter & Search',
        icon: AlertTriangle
      },
      {
        target: '.table-container, .record-card, [data-tour="records-list"]',
        title: 'Incident Record Log',
        content: 'View comprehensive details for each incident: student name, grade & section, offense details, reporting officer, and timestamps.',
        badge: 'Records',
        icon: FileText
      },
      {
        target: 'button:has(svg), .action-button, [data-tour="action-buttons"]',
        title: 'Summons & Resolution Actions',
        content: 'Open the Parent Summons generator for formal notices, or open the Resolution modal (Doc Proof) to clear cases with official certificates.',
        badge: 'Actions',
        icon: ShieldCheck
      }
    ]
  },
  parent_summons: {
    id: 'parent_summons',
    title: 'Parent Summons Notice Letter',
    description: 'Learn how to bundle violations and generate official conference notices with seals.',
    route: '/violations',
    steps: [
      {
        target: '.psm-preview-paper, .preview-container, body',
        title: 'Authentic Philippine Institutional Notice',
        content: 'Generates an official parent conference notice complete with Republic header, University of Perpetual Help seal, and DepEd compliance footnotes.',
        badge: 'Letterhead & Seals',
        icon: FileText
      },
      {
        target: '.psm-left, [data-tour="summons-parameters"]',
        title: 'Multi-Violation Bundling & Schedule',
        content: 'Select multiple infractions for a repeat offender into one single formal notice. Customize the conference date, time, venue, and designated signatories.',
        badge: 'Customization',
        icon: CheckCircle2
      },
      {
        target: '.psm-btn-download, .psm-btn-print, button:contains("PDF")',
        title: 'Direct PDF Download & Print',
        content: 'Download the summons as a crisp vector PDF or print directly. It includes an official tear-off Return Slip for parent confirmation.',
        badge: 'Export & Print',
        icon: QrCode
      }
    ]
  },
  case_resolution: {
    id: 'case_resolution',
    title: 'Case Resolution & Clearance (Doc Proof)',
    description: 'Close disciplinary cases, assign corrective sanctions, and issue official certificates.',
    route: '/violations',
    steps: [
      {
        target: 'body',
        title: 'Corrective Action & Sanctions',
        content: 'Select prescribed institutional sanctions (e.g. Verbal Warning, Campus Service, Counseling) and record resolution remarks.',
        badge: 'Sanction Presets',
        icon: ShieldCheck
      },
      {
        target: 'body',
        title: 'Official Certificate of Resolution',
        content: 'Generates an authentic Certificate of Disciplinary Resolution & Clearance with unique control number and digital verification hash.',
        badge: 'Certificate',
        icon: Sparkles
      }
    ]
  },
  analytics_print: {
    id: 'analytics_print',
    title: 'Institutional Analytics & Print Data',
    description: 'Export multi-page executive summaries, incident trend curves, and grade breakdown tables.',
    route: '/',
    steps: [
      {
        target: 'body',
        title: 'Coverage Period & Presets',
        content: 'Choose between Today, Weekly, Monthly, All-Time, or custom date ranges to compile accreditation-ready analytics.',
        badge: 'Time Period',
        icon: BarChart3
      },
      {
        target: 'body',
        title: 'Vector Charts & Grade Breakdown',
        content: 'Includes real-time spline trend graphs, most common violation donut charts, and complete grade level incident distribution tables.',
        badge: 'Visual Analytics',
        icon: Sparkles
      },
      {
        target: 'body',
        title: 'Multi-Page DepEd Compliance Report',
        content: 'Exports a multi-page PDF document including itemized incident logs, verification barcodes, and prefect signatures.',
        badge: 'Executive Report',
        icon: FileText
      }
    ]
  }
};

export const InteractiveTourGuide = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Modal and Tour States
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false);
  const [activeTour, setActiveTour] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);
  const [showSanctionsModal, setShowSanctionsModal] = useState(false);
  const [completedTours, setCompletedTours] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('viotrack_completed_tours') || '[]');
    } catch {
      return [];
    }
  });

  // Calculate Target Spotlight Rectangle
  const updateTargetRect = useCallback(() => {
    if (!activeTour) {
      setTargetRect(null);
      return;
    }

    const currentStep = activeTour.steps[currentStepIndex];
    if (!currentStep) return;

    if (currentStep.target === 'body') {
      setTargetRect({
        top: window.innerHeight * 0.15,
        left: window.innerWidth * 0.1,
        width: window.innerWidth * 0.8,
        height: window.innerHeight * 0.65,
        isCenter: true
      });
      return;
    }

    try {
      const el = document.querySelector(currentStep.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        const padding = 8;
        setTargetRect({
          top: Math.max(0, rect.top - padding),
          left: Math.max(0, rect.left - padding),
          width: Math.min(window.innerWidth, rect.width + padding * 2),
          height: Math.min(window.innerHeight, rect.height + padding * 2),
          isCenter: false
        });
      } else {
        // Fallback to centered card if selector not found on current page
        setTargetRect({
          top: window.innerHeight * 0.2,
          left: window.innerWidth * 0.15,
          width: window.innerWidth * 0.7,
          height: 280,
          isCenter: true
        });
      }
    } catch {
      setTargetRect({
        top: window.innerHeight * 0.2,
        left: window.innerWidth * 0.15,
        width: window.innerWidth * 0.7,
        height: 280,
        isCenter: true
      });
    }
  }, [activeTour, currentStepIndex]);

  // Handle Window Resize and Scroll during Active Tour
  useEffect(() => {
    if (!activeTour) return;
    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    const timer = setTimeout(updateTargetRect, 250);
    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
      clearTimeout(timer);
    };
  }, [activeTour, currentStepIndex, updateTargetRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!activeTour) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        endTour();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNextStep();
      } else if (e.key === 'ArrowLeft') {
        handlePrevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTour, currentStepIndex]);

  // Start Tour Handler
  const startTour = (tourKey) => {
    const scenario = TOUR_SCENARIOS[tourKey];
    if (!scenario) return;

    setIsGuideMenuOpen(false);
    setActiveTour(scenario);
    setCurrentStepIndex(0);

    // Route to target page if not already there
    if (scenario.route && location.pathname !== scenario.route) {
      navigate(scenario.route);
    }
  };

  const handleNextStep = () => {
    if (!activeTour) return;
    if (currentStepIndex < activeTour.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      // Tour Completed
      const newCompleted = Array.from(new Set([...completedTours, activeTour.id]));
      setCompletedTours(newCompleted);
      try {
        localStorage.setItem('viotrack_completed_tours', JSON.stringify(newCompleted));
      } catch {}
      setActiveTour(null);
      setCurrentStepIndex(0);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const endTour = () => {
    setActiveTour(null);
    setCurrentStepIndex(0);
  };

  const resetAllProgress = () => {
    setCompletedTours([]);
    localStorage.removeItem('viotrack_completed_tours');
  };

  const currentStep = activeTour ? activeTour.steps[currentStepIndex] : null;
  const progressPercent = activeTour
    ? Math.round(((currentStepIndex + 1) / activeTour.steps.length) * 100)
    : 0;

  return (
    <>
      {/* 1. Floating Help & Interactive Guides Launcher Button (Bottom-Right) */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <button
          type="button"
          onClick={() => setIsGuideMenuOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #07345f 0%, #0f172a 100%)',
            color: '#ffffff',
            border: '1.5px solid rgba(255, 255, 255, 0.25)',
            padding: '10px 16px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(7, 52, 95, 0.35)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(7, 52, 95, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(7, 52, 95, 0.35)';
          }}
          title="Open Interactive Guide & SOP Manual"
        >
          <Sparkles size={16} color="#38bdf8" />
          <span>Interactive Guide</span>
          {completedTours.length > 0 && (
            <span
              style={{
                background: '#10b981',
                color: '#ffffff',
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '9999px',
                fontWeight: 900
              }}
            >
              {completedTours.length}/{Object.keys(TOUR_SCENARIOS).length}
            </span>
          )}
        </button>
      </div>

      {/* 2. Interactive Guide Hub Modal */}
      {isGuideMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setIsGuideMenuOpen(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '720px',
              maxHeight: '88vh',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #07345f 0%, #0f172a 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Compass size={22} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    VioTrack Interactive Guide &amp; SOP Hub
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Interactive walkthroughs, sanction reference policies, and operations manual
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsGuideMenuOpen(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Sanctions Cheat Sheet Quick Action */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #a7f3d0' }}>
                    <BookOpen size={18} color="#10b981" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                      Institutional Sanctions Policy Matrix
                    </h4>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Official University handbook thresholds for Minor, Serious, and Major infractions.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsGuideMenuOpen(false);
                    setShowSanctionsModal(true);
                  }}
                  style={{
                    background: '#07345f',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <span>View Matrix</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Guided Interactive Missions Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select an Interactive Walkthrough
                  </span>
                  {completedTours.length > 0 && (
                    <button
                      type="button"
                      onClick={resetAllProgress}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Reset Progress
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                  {Object.entries(TOUR_SCENARIOS).map(([key, scenario]) => {
                    const isDone = completedTours.includes(scenario.id);
                    return (
                      <div
                        key={key}
                        onClick={() => startTour(key)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          background: isDone ? '#f0fdf4' : '#ffffff',
                          border: isDone ? '1.5px solid #bbf7d0' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#07345f';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = isDone ? '#bbf7d0' : '#e2e8f0';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: isDone ? '#dcfce7' : '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: isDone ? '#16a34a' : '#07345f'
                            }}
                          >
                            {isDone ? <CheckCircle2 size={18} /> : <Play size={15} fill="#07345f" />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                                {scenario.title}
                              </span>
                              {isDone && (
                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#16a34a', background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                  Completed
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                              {scenario.description}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#07345f', fontWeight: 700, fontSize: '12px' }}>
                          <span>{scenario.steps.length} Steps</span>
                          <ChevronRight size={15} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Institutional Sanctions Policy Matrix Modal */}
      {showSanctionsModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowSanctionsModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '820px',
              maxHeight: '88vh',
              background: '#ffffff',
              borderRadius: '20px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                background: '#07345f',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Institutional Infraction Severity &amp; Sanctions Matrix
                </h3>
                <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                  University of Perpetual Help System Manila • Student Handbook Guidelines
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSanctionsModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#ffffff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {SANCTIONS_MATRIX.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: item.bg,
                    border: `1.5px solid ${item.border}`,
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: item.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {item.level}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Typical Infractions: {item.examples.join(', ')}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', background: '#ffffff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>1st Offense</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '2px' }}>{item.firstOffense}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>2nd Offense</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginTop: '2px' }}>{item.secondOffense}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', textTransform: 'uppercase' }}>3rd Offense</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626', display: 'block', marginTop: '2px' }}>{item.thirdOffense}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. Active Spotlight Walkthrough Overlay */}
      {activeTour && currentStep && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            pointerEvents: 'auto'
          }}
        >
          {/* Dark Backdrop Spotlight with SVG Cutout */}
          <svg
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              pointerEvents: 'none'
            }}
          >
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {targetRect && (
                  <rect
                    x={targetRect.left}
                    y={targetRect.top}
                    width={targetRect.width}
                    height={targetRect.height}
                    rx="12"
                    ry="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(15, 23, 42, 0.75)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* Glowing Target Ring */}
          {targetRect && !targetRect.isCenter && (
            <div
              style={{
                position: 'fixed',
                top: `${targetRect.top}px`,
                left: `${targetRect.left}px`,
                width: `${targetRect.width}px`,
                height: `${targetRect.height}px`,
                borderRadius: '12px',
                border: '2.5px solid #38bdf8',
                boxShadow: '0 0 20px rgba(56, 189, 248, 0.6), inset 0 0 10px rgba(56, 189, 248, 0.3)',
                pointerEvents: 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                animation: 'pulseRing 2s infinite ease-in-out'
              }}
            />
          )}

          {/* Floating Guidance Card */}
          <div
            style={{
              position: 'fixed',
              top: targetRect && !targetRect.isCenter
                ? Math.min(window.innerHeight - 300, Math.max(20, targetRect.top + targetRect.height + 16))
                : '50%',
              left: targetRect && !targetRect.isCenter
                ? Math.min(window.innerWidth - 420, Math.max(20, targetRect.left))
                : '50%',
              transform: targetRect && targetRect.isCenter ? 'translate(-50%, -50%)' : 'none',
              width: '100%',
              maxWidth: '390px',
              background: '#ffffff',
              borderRadius: '18px',
              padding: '20px',
              boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.08)',
              zIndex: 10001,
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxSizing: 'border-box'
            }}
          >
            {/* Top Progress Bar */}
            <div style={{ width: '100%', height: '4px', background: '#f1f5f9', borderRadius: '9999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: '#07345f',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>

            {/* Header: Badge + Close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontSize: '10.5px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    textTransform: 'uppercase'
                  }}
                >
                  {currentStep.badge || 'Guide'}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                  Step {currentStepIndex + 1} of {activeTour.steps.length}
                </span>
              </div>

              <button
                type="button"
                onClick={endTour}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Exit tour (Esc)"
              >
                <X size={14} />
              </button>
            </div>

            {/* Title & Content */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                {currentStep.title}
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#334155', lineHeight: 1.55 }}>
                {currentStep.content}
              </p>
            </div>

            {/* Navigation Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: currentStepIndex === 0 ? '#cbd5e1' : '#334155',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={handleNextStep}
                style={{
                  padding: '7px 16px',
                  borderRadius: '8px',
                  background: '#07345f',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(7, 52, 95, 0.3)'
                }}
              >
                <span>{currentStepIndex === activeTour.steps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
