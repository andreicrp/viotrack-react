import React, { useState, useMemo, useEffect } from 'react';
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
  Plus,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react';
import { Modal } from './Modal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';

export const SchoolCalendarModal = ({ isOpen, onClose, initialDate = 23, initialMonth = new Date(2026, 8, 1) }) => {
  const { success, error } = useNotification();
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'list' | 'add'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingEvent, setIsAddingEvent] = useState(false);

  // New Event Form State
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    time: '09:00 AM – 11:00 AM',
    location: '',
    category: 'faculty',
    categoryLabel: 'Faculty Meeting',
    color: '#10b981',
    description: '',
    attendees: 'All Faculty & Staff'
  });

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      setCurrentDate(initialMonth || new Date(2026, 8, 1));
      setSelectedDay(initialDate || 23);
      setIsAddingEvent(false);
    }
  }, [isOpen, initialDate, initialMonth]);

  const loadEvents = async () => {
    try {
      const data = await dataService.getSchoolEvents();
      setEvents(data || []);
    } catch (err) {
      console.error('Failed to load events', err);
    }
  };

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
    const today = new Date(2026, 8, 23); // Institutional reference date
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  // Generate Calendar Matrix for active month
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
      const dayEvents = (events || []).filter(e => e.date === dateString);

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
  }, [year, month, events]);

  // Filtered Events List
  const filteredEvents = useMemo(() => {
    return (events || []).filter(event => {
      const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
      const matchesSearch = searchQuery.trim() === '' ||
        (event.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, events]);

  // Events on the currently selected date
  const selectedDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const selectedDayEvents = useMemo(() => {
    return (events || []).filter(e => e.date === selectedDateString);
  }, [selectedDateString, events]);

  const categories = [
    { key: 'all', label: 'All Events', count: (events || []).length },
    { key: 'disciplinary', label: 'Disciplinary & Conduct', count: (events || []).filter(e => e.category === 'disciplinary').length, color: '#ef4444' },
    { key: 'faculty', label: 'Faculty & Admin', count: (events || []).filter(e => e.category === 'faculty').length, color: '#10b981' },
    { key: 'academic', label: 'Academic & Exams', count: (events || []).filter(e => e.category === 'academic').length, color: '#07345f' },
    { key: 'activity', label: 'School Activities', count: (events || []).filter(e => e.category === 'activity').length, color: '#8b5cf6' }
  ];

  const handleOpenAddForm = (dateStr = null) => {
    const targetDate = dateStr || selectedDateString;
    setNewEvent({
      title: '',
      date: targetDate,
      time: '09:00 AM – 11:00 AM',
      location: 'Main Conference Hall',
      category: 'faculty',
      categoryLabel: 'Faculty Meeting',
      color: '#10b981',
      description: '',
      attendees: 'All Faculty & Staff'
    });
    setIsAddingEvent(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) {
      error('Please enter an event title.');
      return;
    }
    if (!newEvent.date) {
      error('Please select an event date.');
      return;
    }

    try {
      const categoryColorMap = {
        disciplinary: { label: 'Disciplinary', color: '#ef4444' },
        faculty: { label: 'Faculty Meeting', color: '#10b981' },
        academic: { label: 'Academic', color: '#07345f' },
        activity: { label: 'School Event', color: '#8b5cf6' }
      };

      const meta = categoryColorMap[newEvent.category] || { label: 'General Event', color: '#07345f' };

      const eventToSave = {
        ...newEvent,
        categoryLabel: meta.label,
        color: meta.color
      };

      await dataService.addSchoolEvent(eventToSave);
      success(`Scheduled event "${newEvent.title}" on ${newEvent.date}!`);
      setIsAddingEvent(false);
      loadEvents();

      // Switch view date to that event's month & day
      const dParts = newEvent.date.split('-');
      if (dParts.length === 3) {
        setCurrentDate(new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, 1));
        setSelectedDay(parseInt(dParts[2], 10));
      }
    } catch (err) {
      error('Failed to schedule event: ' + err.message);
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (window.confirm(`Are you sure you want to remove scheduled event "${title}"?`)) {
      try {
        await dataService.deleteSchoolEvent(id);
        success('Event removed from school calendar.');
        loadEvents();
      } catch (err) {
        error('Failed to delete event: ' + err.message);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="School Calendar & Events Schedule"
      maxWidth="900px"
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

          {/* Action & View Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => handleOpenAddForm()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#ffffff',
                background: '#07345f',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(7, 52, 95, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>Schedule Event</span>
            </button>

            <div className="school-cal-view-tabs">
              <button
                type="button"
                onClick={() => { setActiveTab('calendar'); setIsAddingEvent(false); }}
                className={`school-cal-tab-btn ${activeTab === 'calendar' && !isAddingEvent ? 'active' : ''}`}
              >
                <CalendarIcon size={14} /> Full Grid
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('list'); setIsAddingEvent(false); }}
                className={`school-cal-tab-btn ${activeTab === 'list' && !isAddingEvent ? 'active' : ''}`}
              >
                <Clock size={14} /> Agenda List
              </button>
            </div>
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

        {/* Schedule Event Form Overlay / Inline Drawer */}
        {isAddingEvent && (
          <div style={{
            background: '#ffffff',
            borderBottom: '2px solid #e2e8f0',
            padding: '16px 20px',
            animation: 'slideDown 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarDays size={16} color="#07345f" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#07345f' }}>
                  Schedule New School Event / Meeting
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingEvent(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faculty Coordination Meeting"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Event Date *
                </label>
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Time Range
                </label>
                <input
                  type="text"
                  placeholder="e.g. 09:00 AM – 11:30 AM"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={newEvent.category}
                  onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box', background: '#fff' }}
                >
                  <option value="faculty">Faculty & Admin</option>
                  <option value="disciplinary">Disciplinary & Conduct</option>
                  <option value="academic">Academic & Examinations</option>
                  <option value="activity">School Activity / Event</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Location / Venue
                </label>
                <input
                  type="text"
                  placeholder="e.g. Conference Hall A / AVR"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Target Attendees
                </label>
                <input
                  type="text"
                  placeholder="e.g. Class Advisers, Guidance Staff"
                  value={newEvent.attendees}
                  onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Description / Agenda Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide brief details regarding the event agenda, requirements, or agenda points..."
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  style={{ width: '100%', padding: '7px 10px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '7px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  style={{ padding: '6px 14px', fontSize: '12px', border: '1px solid #cbd5e1', borderRadius: '7px', background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '6px 16px', fontSize: '12px', fontWeight: 700, border: 'none', borderRadius: '7px', background: '#07345f', color: '#fff', cursor: 'pointer' }}
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        )}

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
                        title={cell.hasEvents ? `${cell.events.length} event(s) on ${monthNames[month]} ${cell.day}` : `Select ${monthNames[month]} ${cell.day}`}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
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

                    <button
                      type="button"
                      onClick={() => handleOpenAddForm(selectedDateString)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 9px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#07345f',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      title="Add event for this date"
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                {/* Event Cards for Selected Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                  {selectedDayEvents.length === 0 ? (
                    <div className="school-cal-empty" style={{ padding: '24px 14px' }}>
                      <CalendarIcon size={26} strokeWidth={1.6} color="#94a3b8" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                        No events scheduled for {monthNames[month]} {selectedDay}.
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenAddForm(selectedDateString)}
                        style={{
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#07345f',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <Plus size={13} strokeWidth={2.4} />
                        <span>Schedule Event for this Date</span>
                      </button>
                    </div>
                  ) : (
                    selectedDayEvents.map(event => (
                      <div key={event.id} className="school-cal-item-card" style={{ position: 'relative' }}>
                        <div className="school-cal-item-top">
                          <span className="school-cal-item-title">
                            {event.title}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              className="school-cal-item-tag"
                              style={{
                                color: event.color,
                                background: `${event.color}18`
                              }}
                            >
                              {event.categoryLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(event.id, event.title)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Delete scheduled event"
                              onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                              onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="school-cal-item-meta">
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {event.time}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={12} /> {event.location}
                          </span>
                        </div>

                        {event.description && (
                          <p className="school-cal-item-desc">
                            {event.description}
                          </p>
                        )}

                        <div className="school-cal-item-attendees">
                          <Users size={12} />
                          <span>Attendees: <strong>{event.attendees || 'All Faculty & Staff'}</strong></span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="school-cal-item-tag"
                            style={{
                              color: event.color,
                              background: `${event.color}18`
                            }}
                          >
                            {event.categoryLabel}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteEvent(event.id, event.title)}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Delete event"
                            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="school-cal-item-meta">
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {event.time}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {event.location}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={12} /> {event.attendees || 'All Personnel'}
                        </span>
                      </div>

                      {event.description && (
                        <p className="school-cal-item-desc">
                          {event.description}
                        </p>
                      )}
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
