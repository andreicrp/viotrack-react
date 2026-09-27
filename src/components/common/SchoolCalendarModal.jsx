import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Tag,
  Search,
  Filter,
  Users,
  AlertCircle,
  BookOpen,
  Sparkles,
  X
} from 'lucide-react';
import { Modal } from './Modal';

// Sample Comprehensive School Events Dataset
const DEFAULT_EVENTS = [
  {
    id: 1,
    title: 'Faculty General Assembly',
    date: '2026-09-24',
    time: '09:00 AM – 11:00 AM',
    location: 'Main Auditorium / Hall A',
    category: 'faculty',
    categoryLabel: 'Faculty Meeting',
    color: '#10b981',
    description: 'Monthly institutional coordination meeting with Class Advisers, Guidance Counselors, and Academic Chairs.',
    attendees: 'All Faculty & Staff'
  },
  {
    id: 2,
    title: 'Submission of Disciplinary & Attendance Reports',
    date: '2026-09-30',
    time: '01:00 PM – 03:00 PM',
    location: 'Discipline Office / Room 204',
    category: 'disciplinary',
    categoryLabel: 'Disciplinary',
    color: '#ef4444',
    description: 'Submission deadline for Monthly Conduct Summary, unresolved major infraction dossiers, and adviser referrals.',
    attendees: 'Class Advisers & Prefects'
  },
  {
    id: 3,
    title: 'Student Conduct & Values Re-orientation',
    date: '2026-09-15',
    time: '10:00 AM – 12:00 PM',
    location: 'AVR 1 (Audio-Visual Room)',
    category: 'disciplinary',
    categoryLabel: 'Disciplinary',
    color: '#ef4444',
    description: 'Orientation session for students with repeat minor infractions focusing on campus policies and restorative guidelines.',
    attendees: 'Referred Students & Guardians'
  },
  {
    id: 4,
    title: 'First Quarter Examination Week',
    date: '2026-09-18',
    time: '08:00 AM – 04:00 PM',
    location: 'All Classrooms',
    category: 'academic',
    categoryLabel: 'Academic',
    color: '#07345f',
    description: 'Quarterly examinations covering all core subject areas for Junior and Senior High School levels.',
    attendees: 'All Enrolled Students'
  },
  {
    id: 5,
    title: 'Parents-Teachers Disciplinary Council (PTDC)',
    date: '2026-09-26',
    time: '02:00 PM – 04:30 PM',
    location: 'Conference Hall B',
    category: 'faculty',
    categoryLabel: 'Faculty Meeting',
    color: '#10b981',
    description: 'Quarterly consultative meeting with PTA representatives on campus security and student wellness protocols.',
    attendees: 'PTA Officers & Admin Council'
  },
  {
    id: 6,
    title: 'Midterm Grade Submission & Review',
    date: '2026-10-05',
    time: '08:00 AM – 05:00 PM',
    location: 'Registrar & Faculty Portals',
    category: 'academic',
    categoryLabel: 'Academic',
    color: '#07345f',
    description: 'Faculty portal deadline for uploading preliminary midterm evaluations.',
    attendees: 'All Teaching Personnel'
  },
  {
    id: 7,
    title: 'National Teachers Day Celebration',
    date: '2026-10-05',
    time: '01:00 PM – 05:00 PM',
    location: 'School Gymnasium',
    category: 'activity',
    categoryLabel: 'School Event',
    color: '#8b5cf6',
    description: 'Campus-wide recognition program honoring educator service and outstanding advisory leadership.',
    attendees: 'Faculty, Students, Admin'
  },
  {
    id: 8,
    title: 'Student Leaders Disciplinary Workshop',
    date: '2026-10-14',
    time: '09:00 AM – 02:00 PM',
    location: 'Student Activity Center',
    category: 'disciplinary',
    categoryLabel: 'Disciplinary',
    color: '#ef4444',
    description: 'Leadership training on peer mediation, bullying prevention, and violation reporting workflows.',
    attendees: 'SSG & Club Officers'
  },
  {
    id: 9,
    title: 'School Foundation Week Opening',
    date: '2026-10-22',
    time: '07:30 AM – 04:30 PM',
    location: 'Campus Grounds',
    category: 'activity',
    categoryLabel: 'School Event',
    color: '#8b5cf6',
    description: 'Annual institutional foundation anniversary festivities, sports matches, and cultural exhibits.',
    attendees: 'Entire Academic Community'
  }
];

export const SchoolCalendarModal = ({ isOpen, onClose, initialDate = 23, initialMonth = new Date(2026, 8, 1) }) => {
  const [currentDate, setCurrentDate] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  };

  const handleToday = () => {
    const today = new Date(2026, 8, 23); // Default institutional current date
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  // Generate Calendar Matrix for the active month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    // Empty leading spaces
    for (let i = 0; i < firstDay; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = DEFAULT_EVENTS.filter(e => e.date === dateString);

      cells.push({
        empty: false,
        day: d,
        dateString,
        events: dayEvents,
        hasEvents: dayEvents.length > 0,
        hasDisciplinary: dayEvents.some(e => e.category === 'disciplinary'),
        hasFaculty: dayEvents.some(e => e.category === 'faculty'),
        hasAcademic: dayEvents.some(e => e.category === 'academic'),
        hasActivity: dayEvents.some(e => e.category === 'activity'),
        key: `day-${d}`
      });
    }

    return cells;
  }, [year, month]);

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    return DEFAULT_EVENTS.filter(event => {
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Events on the currently selected date
  const selectedDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayEvents = useMemo(() => {
    return DEFAULT_EVENTS.filter(e => e.date === selectedDateString);
  }, [selectedDateString]);

  const categories = [
    { key: 'all', label: 'All Events', count: DEFAULT_EVENTS.length },
    { key: 'disciplinary', label: 'Disciplinary & Conduct', count: DEFAULT_EVENTS.filter(e => e.category === 'disciplinary').length, color: '#ef4444' },
    { key: 'faculty', label: 'Faculty & Admin', count: DEFAULT_EVENTS.filter(e => e.category === 'faculty').length, color: '#10b981' },
    { key: 'academic', label: 'Academic & Exams', count: DEFAULT_EVENTS.filter(e => e.category === 'academic').length, color: '#07345f' },
    { key: 'activity', label: 'School Activities', count: DEFAULT_EVENTS.filter(e => e.category === 'activity').length, color: '#8b5cf6' }
  ];

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="School Calendar & Institutional Events"
      maxWidth="860px"
      icon={CalendarDays}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Top Control Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          {/* Month & Year Title + Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={handlePrevMonth}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#07345f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Previous Month"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#07345f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                title="Next Month"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            <span style={{ fontSize: '16px', fontWeight: 800, color: '#07345f', letterSpacing: '-0.01em' }}>
              {monthNames[month]} {year}
            </span>

            <button
              type="button"
              onClick={handleToday}
              style={{
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#07345f',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Today
            </button>
          </div>

          {/* View Mode Switcher */}
          <div
            style={{
              display: 'flex',
              background: '#ffffff',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: activeTab === 'calendar' ? 700 : 500,
                color: activeTab === 'calendar' ? '#ffffff' : '#64748b',
                background: activeTab === 'calendar' ? '#07345f' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CalendarIcon size={14} /> Full Grid
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              style={{
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: activeTab === 'list' ? 700 : 500,
                color: activeTab === 'list' ? '#ffffff' : '#64748b',
                background: activeTab === 'list' ? '#07345f' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Clock size={14} /> Agenda List
            </button>
          </div>
        </div>

        {/* Category Filters Bar */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            scrollbarWidth: 'none'
          }}
        >
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? '#07345f' : '#64748b',
                  background: isSelected ? '#f0f4f8' : '#ffffff',
                  border: isSelected ? '1px solid #07345f' : '1px solid #e2e8f0',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.color && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: cat.color,
                      display: 'inline-block'
                    }}
                  />
                )}
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    padding: '1px 5px',
                    borderRadius: '10px',
                    background: isSelected ? '#07345f' : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b'
                  }}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Container */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'calendar' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px'
              }}
            >
              {/* Left Column: Interactive Month Grid */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                {/* Day Names Header */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    textAlign: 'center',
                    marginBottom: '8px'
                  }}
                >
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                    <span
                      key={dayName}
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        padding: '4px 0'
                      }}
                    >
                      {dayName}
                    </span>
                  ))}
                </div>

                {/* Calendar Days Matrix */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '4px'
                  }}
                >
                  {calendarGrid.map(cell => {
                    if (cell.empty) {
                      return <div key={cell.key} style={{ height: '40px' }} />;
                    }

                    const isSelected = cell.day === selectedDay;

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => setSelectedDay(cell.day)}
                        style={{
                          height: '42px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid #07345f' : '1px solid transparent',
                          background: isSelected ? '#07345f' : cell.hasEvents ? '#f8fafc' : 'transparent',
                          color: isSelected ? '#ffffff' : '#1e293b',
                          cursor: 'pointer',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                          fontWeight: isSelected ? 800 : cell.hasEvents ? 700 : 500,
                          fontSize: '13px'
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = '#f1f5f9';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = cell.hasEvents ? '#f8fafc' : 'transparent';
                          }
                        }}
                      >
                        <span>{cell.day}</span>
                        {/* Event Dot Indicators */}
                        {cell.hasEvents && (
                          <div style={{ display: 'flex', gap: '2.5px', marginTop: '2px' }}>
                            {cell.hasDisciplinary && (
                              <span
                                style={{
                                  width: 4.5,
                                  height: 4.5,
                                  borderRadius: '50%',
                                  background: isSelected ? '#ffffff' : '#ef4444'
                                }}
                              />
                            )}
                            {cell.hasFaculty && (
                              <span
                                style={{
                                  width: 4.5,
                                  height: 4.5,
                                  borderRadius: '50%',
                                  background: isSelected ? '#ffffff' : '#10b981'
                                }}
                              />
                            )}
                            {cell.hasAcademic && (
                              <span
                                style={{
                                  width: 4.5,
                                  height: 4.5,
                                  borderRadius: '50%',
                                  background: isSelected ? '#ffffff' : '#07345f'
                                }}
                              />
                            )}
                            {cell.hasActivity && (
                              <span
                                style={{
                                  width: 4.5,
                                  height: 4.5,
                                  borderRadius: '50%',
                                  background: isSelected ? '#ffffff' : '#8b5cf6'
                                }}
                              />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Events on Selected Date */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingBottom: '10px',
                    borderBottom: '1px solid #f1f5f9'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#f0f4f8',
                        color: '#07345f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px'
                      }}
                    >
                      {selectedDay}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                        {monthNames[month]} {selectedDay}, {year}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} scheduled
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Cards for Selected Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {selectedDayEvents.length === 0 ? (
                    <div
                      style={{
                        padding: '30px 16px',
                        textAlign: 'center',
                        color: '#94a3b8',
                        fontSize: '13px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <CalendarIcon size={28} strokeWidth={1.5} color="#cbd5e1" />
                      <span>No events or deadlines scheduled for this date.</span>
                    </div>
                  ) : (
                    selectedDayEvents.map(event => (
                      <div
                        key={event.id}
                        style={{
                          padding: '12px 14px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          background: '#f8fafc',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                            {event.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              color: event.color,
                              background: `${event.color}15`,
                              padding: '2px 7px',
                              borderRadius: '5px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {event.categoryLabel}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#64748b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {event.time}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {event.location}
                          </span>
                        </div>

                        <p style={{ fontSize: '12px', color: '#475569', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                          {event.description}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          <Users size={11} />
                          <span>Attendees: <strong>{event.attendees}</strong></span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Agenda List View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Search Bar */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search institutional events, meetings, deadlines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Events List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredEvents.length === 0 ? (
                  <div
                    style={{
                      padding: '40px 20px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '13.5px'
                    }}
                  >
                    No matching school events found.
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <div
                      key={event.id}
                      style={{
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#07345f',
                              background: '#f0f4f8',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {event.date}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                            {event.title}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: event.color,
                            background: `${event.color}15`,
                            padding: '2.5px 8px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {event.categoryLabel}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} /> {event.time}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={13} /> {event.location}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={13} /> {event.attendees}
                        </span>
                      </div>

                      <p style={{ fontSize: '12.5px', color: '#475569', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                        {event.description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #f1f5f9',
            background: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
            <span style={{ fontWeight: 700, color: '#07345f' }}>VIOTRACK</span> School Conduct & Academic Calendar
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#ffffff',
              background: '#07345f',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#0a4b88'}
            onMouseOut={(e) => e.currentTarget.style.background = '#07345f'}
          >
            Close Calendar
          </button>
        </div>
      </div>
    </Modal>
  );
};
