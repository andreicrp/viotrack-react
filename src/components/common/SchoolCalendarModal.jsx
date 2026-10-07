import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Search,
  Users,
  Plus,
  Trash2,
  List
} from 'lucide-react';
import { Modal } from './Modal';
import { AddSchoolEventModal } from './AddSchoolEventModal';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';

export const SchoolCalendarModal = ({ isOpen, onClose, initialDate = 23, initialMonth = new Date(2026, 8, 1) }) => {
  const { success, error } = useNotification();
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(initialMonth);
  const [selectedDay, setSelectedDay] = useState(initialDate);
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'list'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalInitialDate, setAddModalInitialDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      setCurrentDate(initialMonth || new Date(2026, 8, 1));
      setSelectedDay(initialDate || 23);
      setIsAddModalOpen(false);
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
    const today = new Date(2026, 8, 23);
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDay(today.getDate());
  };

  // Generate Calendar Matrix
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    // Empty leading spaces
    for (let i = 0; i < firstDay; i++) {
      cells.push({ empty: true, key: `empty-${i}` });
    }

    // Days in active month
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

  const categories = [
    { key: 'all', label: 'All', count: (events || []).length },
    { key: 'disciplinary', label: 'Disciplinary', count: (events || []).filter(e => e.category === 'disciplinary').length, color: '#ef4444' },
    { key: 'faculty', label: 'Faculty', count: (events || []).filter(e => e.category === 'faculty').length, color: '#10b981' },
    { key: 'academic', label: 'Academic', count: (events || []).filter(e => e.category === 'academic').length, color: '#0284c7' },
    { key: 'activity', label: 'Activities', count: (events || []).filter(e => e.category === 'activity').length, color: '#8b5cf6' }
  ];

  // Filtered Events List for Agenda View
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
    return (events || []).filter(e => {
      const matchesCategory = selectedCategory === 'all' || e.category === selectedCategory;
      return e.date === selectedDateString && matchesCategory;
    });
  }, [selectedDateString, selectedCategory, events]);

  const handleOpenAddModal = (dateStr = null) => {
    const targetDate = dateStr || selectedDateString;
    setAddModalInitialDate(targetDate);
    setIsAddModalOpen(true);
  };

  const handleEventSaved = (savedEvent) => {
    loadEvents();
    if (savedEvent?.date) {
      const parts = savedEvent.date.split('-');
      if (parts.length === 3) {
        setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
        setSelectedDay(parseInt(parts[2], 10));
      }
    }
  };

  const handleDeleteEvent = async (id, title) => {
    if (window.confirm(`Remove scheduled event "${title}"?`)) {
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="School Calendar"
        maxWidth="840px"
      >
        <div className="school-cal-modal-wrap">
          {/* Simplified Top Navigation Header */}
          <div className="school-cal-top-bar">
            {/* Month Navigation */}
            <div className="school-cal-nav-group">
              <div className="school-cal-arrows">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="school-cal-arrow-btn"
                  aria-label="Previous Month"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="school-cal-arrow-btn"
                  aria-label="Next Month"
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

            {/* Action & View Tabs */}
            <div className="school-cal-top-actions">
              <div className="school-cal-view-tabs">
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className={`school-cal-tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
                  title="Calendar Grid"
                >
                  <CalendarIcon size={14} />
                  <span>Calendar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className={`school-cal-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                  title="List View"
                >
                  <List size={14} />
                  <span>List</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleOpenAddModal()}
                className="school-cal-add-event-btn"
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Add Event</span>
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
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
                      className="school-cal-cat-dot"
                      style={{ background: cat.color }}
                    />
                  )}
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span className="school-cal-cat-badge">
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Modal Body */}
          <div className="school-cal-content-body">
            {activeTab === 'calendar' ? (
              <div className="school-cal-main-layout">
                {/* Left: Interactive Month Grid */}
                <div className="school-cal-card">
                  <div className="school-cal-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
                      <span key={dayName} className="school-cal-weekday-label">
                        {dayName}
                      </span>
                    ))}
                  </div>

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
                          <span className="school-cal-day-num">{cell.day}</span>
                          {cell.hasEvents && (
                            <div className="school-cal-dots-row">
                              {cell.hasDisciplinary && <span className="school-cal-dot disciplinary" />}
                              {cell.hasFaculty && <span className="school-cal-dot faculty" />}
                              {cell.hasAcademic && <span className="school-cal-dot academic" />}
                              {cell.hasActivity && <span className="school-cal-dot activity" />}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Selected Date Events Details */}
                <div className="school-cal-event-details-card">
                  <div className="school-cal-date-header">
                    <div className="school-cal-date-info">
                      <span className="school-cal-date-title">
                        {new Date(year, month, selectedDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                      <span className="school-cal-date-subtitle">
                        {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(selectedDateString)}
                      className="school-cal-mini-add-btn"
                      title="Add event for this date"
                    >
                      <Plus size={13} strokeWidth={2.4} />
                      <span>Add</span>
                    </button>
                  </div>

                  {/* Event Cards for Selected Date */}
                  <div className="school-cal-events-list">
                    {selectedDayEvents.length === 0 ? (
                      <div className="school-cal-empty">
                        <CalendarIcon size={22} color="#94a3b8" />
                        <p className="school-cal-empty-text">
                          No events on {monthNames[month]} {selectedDay}.
                        </p>
                      </div>
                    ) : (
                      selectedDayEvents.map(event => (
                        <div key={event.id} className="school-cal-item-card">
                          <div className="school-cal-item-top">
                            <span className="school-cal-item-title">
                              {event.title}
                            </span>
                            <div className="school-cal-item-actions">
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
                                className="school-cal-item-delete-btn"
                                title="Delete event"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>

                          <div className="school-cal-item-meta">
                            {event.time && (
                              <span><Clock size={12} /> {event.time}</span>
                            )}
                            {event.location && (
                              <span><MapPin size={12} /> {event.location}</span>
                            )}
                          </div>

                          {event.description && (
                            <p className="school-cal-item-desc">
                              {event.description}
                            </p>
                          )}

                          {event.attendees && (
                            <div className="school-cal-item-attendees">
                              <Users size={12} />
                              <span>{event.attendees}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Agenda List View */
              <div className="school-cal-agenda-view">
                <div className="school-cal-search-box">
                  <Search size={15} className="school-cal-search-icon" />
                  <input
                    type="text"
                    placeholder="Search events, meetings, notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="school-cal-search-input"
                  />
                </div>

                <div className="school-cal-agenda-list">
                  {filteredEvents.length === 0 ? (
                    <div className="school-cal-empty">
                      <CalendarIcon size={22} color="#94a3b8" />
                      <p className="school-cal-empty-text">No matching events found.</p>
                    </div>
                  ) : (
                    filteredEvents.map(event => (
                      <div key={event.id} className="school-cal-agenda-card">
                        <div className="school-cal-agenda-top">
                          <div className="school-cal-agenda-left">
                            <span className="school-cal-agenda-date">
                              {event.date}
                            </span>
                            <span className="school-cal-item-title">
                              {event.title}
                            </span>
                          </div>
                          <div className="school-cal-item-actions">
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
                              className="school-cal-item-delete-btn"
                              title="Delete event"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="school-cal-item-meta">
                          {event.time && (
                            <span><Clock size={12} /> {event.time}</span>
                          )}
                          {event.location && (
                            <span><MapPin size={12} /> {event.location}</span>
                          )}
                          {event.attendees && (
                            <span><Users size={12} /> {event.attendees}</span>
                          )}
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
        </div>
      </Modal>

      {/* Dedicated Add Event Modal */}
      <AddSchoolEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialDate={addModalInitialDate}
        onEventSaved={handleEventSaved}
      />
    </>
  );
};
