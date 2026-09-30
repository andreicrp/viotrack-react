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
      title="School Calendar & Events"
      maxWidth="860px"
    >
      <div className="school-cal-modal-wrap">
        {/* Top Control Bar */}
        <div className="school-cal-top-bar">
          {/* Month & Year Title + Navigation */}
          <div className="school-cal-nav-group">
            <div className="school-cal-arrows">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="school-cal-arrow-btn"
                title="Previous Month"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="school-cal-arrow-btn"
                title="Next Month"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            <span className="school-cal-month-title">
              {monthNames[month]} {year}
            </span>

            <button
              type="button"
              onClick={handleToday}
              className="school-cal-today-btn"
            >
              Today
            </button>
          </div>

          {/* View Mode Switcher */}
          <div className="school-cal-view-tabs">
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`school-cal-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            >
              <CalendarIcon size={14} /> Full Grid
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`school-cal-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            >
              <Clock size={14} /> Agenda List
            </button>
          </div>
        </div>

        {/* Category Filters Horizontal Scroll Bar */}
        <div className="school-cal-categories-bar">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`school-cal-cat-chip ${isSelected ? 'active' : ''}`}
              >
                {cat.color && (
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: cat.color,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                )}
                <span>{cat.label}</span>
                <span className="school-cal-cat-badge">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Container */}
        <div className="school-cal-content-body">
          {activeTab === 'calendar' ? (
            <div className="school-cal-main-layout">
              {/* Left Column: Interactive Month Grid */}
              <div className="school-cal-card">
                {/* Day Names Header */}
                <div className="school-cal-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                    <span key={dayName} className="school-cal-weekday-label">
                      {dayName}
                    </span>
                  ))}
                </div>

                {/* Calendar Days Matrix */}
                <div className="school-cal-grid">
                  {calendarGrid.map(cell => {
                    if (cell.empty) {
                      return <div key={cell.key} className="school-cal-day-empty" />;
                    }

                    const isSelected = cell.day === selectedDay;
                    const isToday = cell.day === 23 && month === 8 && year === 2026;

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onClick={() => setSelectedDay(cell.day)}
                        className={`school-cal-day-cell ${isSelected ? 'selected' : ''} ${cell.hasEvents ? 'has-events' : ''} ${isToday ? 'is-today' : ''}`}
                      >
                        <span>{cell.day}</span>
                        {/* Event Dot Indicators */}
                        {cell.hasEvents && (
                          <div className="school-cal-dots-row">
                            {cell.hasDisciplinary && (
                              <span className="school-cal-dot" style={{ background: '#ef4444' }} />
                            )}
                            {cell.hasFaculty && (
                              <span className="school-cal-dot" style={{ background: '#10b981' }} />
                            )}
                            {cell.hasAcademic && (
                              <span className="school-cal-dot" style={{ background: '#07345f' }} />
                            )}
                            {cell.hasActivity && (
                              <span className="school-cal-dot" style={{ background: '#8b5cf6' }} />
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Events on Selected Date */}
              <div className="school-cal-event-details-card">
                <div className="school-cal-date-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="school-cal-date-badge">
                      {selectedDay}
                    </div>
                    <div>
                      <div className="school-cal-date-title">
                        {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="school-cal-date-subtitle">
                        {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} scheduled
                      </div>
                    </div>
                  </div>
                </div>

                {/* Event Cards for Selected Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  {selectedDayEvents.length === 0 ? (
                    <div className="school-cal-empty">
                      <CalendarIcon size={24} strokeWidth={1.6} color="#94a3b8" />
                      <span>No events or deadlines scheduled for this date.</span>
                    </div>
                  ) : (
                    selectedDayEvents.map(event => (
                      <div key={event.id} className="school-cal-item-card">
                        <div className="school-cal-item-top">
                          <span className="school-cal-item-title">
                            {event.title}
                          </span>
                          <span
                            className="school-cal-item-tag"
                            style={{
                              color: event.color,
                              background: `${event.color}18`
                            }}
                          >
                            {event.categoryLabel}
                          </span>
                        </div>

                        <div className="school-cal-item-meta">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {event.time}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {event.location}
                          </span>
                        </div>

                        <p className="school-cal-item-desc">
                          {event.description}
                        </p>

                        <div className="school-cal-item-attendees">
                          <Users size={12} />
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Search Bar */}
              <div className="school-cal-search-box">
                <Search size={15} className="school-cal-search-icon" />
                <input
                  type="text"
                  placeholder="Search events, meetings, deadlines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="school-cal-search-input"
                />
              </div>

              {/* Events List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredEvents.length === 0 ? (
                  <div className="school-cal-empty">
                    <CalendarIcon size={24} strokeWidth={1.6} color="#94a3b8" />
                    <span>No matching school events found.</span>
                  </div>
                ) : (
                  filteredEvents.map(event => (
                    <div key={event.id} className="school-cal-agenda-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              color: '#07345f',
                              background: '#eff6ff',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {event.date}
                          </span>
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                            {event.title}
                          </span>
                        </div>
                        <span
                          className="school-cal-item-tag"
                          style={{
                            color: event.color,
                            background: `${event.color}18`
                          }}
                        >
                          {event.categoryLabel}
                        </span>
                      </div>

                      <div className="school-cal-item-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {event.time}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {event.location}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {event.attendees}
                        </span>
                      </div>

                      <p className="school-cal-item-desc">
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
        <div className="school-cal-footer">
          <div className="school-cal-footer-brand">
            <strong style={{ color: '#07345f' }}>VIOTRACK</strong> • Academic Calendar
          </div>
          <button
            type="button"
            onClick={onClose}
            className="school-cal-close-btn"
          >
            Close Calendar
          </button>
        </div>
      </div>
    </Modal>
  );
};
