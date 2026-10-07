import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Tag,
  Users,
  FileText,
  X,
  Plus
} from 'lucide-react';
import { Modal } from './Modal';
import { CustomDatePicker } from './CustomDatePicker';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';

export const AddSchoolEventModal = ({ isOpen, onClose, initialDate, onEventSaved }) => {
  const { success, error } = useNotification();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '09:00 AM – 11:00 AM',
    location: '',
    category: 'faculty',
    attendees: 'All Faculty & Staff',
    description: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        date: initialDate || new Date().toISOString().split('T')[0],
        time: '09:00 AM – 11:00 AM',
        location: '',
        category: 'faculty',
        attendees: 'All Faculty & Staff',
        description: ''
      });
      setIsSubmitting(false);
    }
  }, [isOpen, initialDate]);

  const categoryMap = {
    disciplinary: { label: 'Disciplinary & Conduct', color: '#ef4444' },
    faculty: { label: 'Faculty & Admin', color: '#10b981' },
    academic: { label: 'Academic & Examinations', color: '#0284c7' },
    activity: { label: 'School Activity / Event', color: '#8b5cf6' }
  };

  const quickAttendees = [
    'All Faculty & Staff',
    'Class Advisers',
    'All Students',
    'Grade 10 Advisers',
    'Guidance & Discipline Office'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      error('Please enter an event title.');
      return;
    }
    if (!formData.date) {
      error('Please select an event date.');
      return;
    }

    try {
      setIsSubmitting(true);
      const meta = categoryMap[formData.category] || { label: 'General Event', color: '#0f172a' };
      const eventToSave = {
        ...formData,
        categoryLabel: meta.label,
        color: meta.color
      };

      await dataService.addSchoolEvent(eventToSave);
      success(`Event "${formData.title}" scheduled on ${formData.date}!`);
      if (onEventSaved) onEventSaved(eventToSave);
      onClose();
    } catch (err) {
      error('Failed to schedule event: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
      style={{ zIndex: 3600 }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Schedule School Event"
        style={{ maxWidth: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CalendarDays size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Schedule New Event
              </h3>
              <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0 }}>
                Add a school meeting, exam, or campus activity
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: '#f1f5f9',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              width: 30,
              height: 30,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Event Title */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Faculty General Assembly"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0f172a'
              }}
            />
          </div>

          {/* Date & Time Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Date *
              </label>
              <CustomDatePicker
                value={formData.date}
                onChange={(val) => setFormData({ ...formData, date: val })}
                placeholder="Select Date"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Time Range
              </label>
              <input
                type="text"
                placeholder="e.g. 09:00 AM – 11:30 AM"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Category & Location Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#0f172a',
                  background: '#ffffff'
                }}
              >
                <option value="faculty">Faculty & Admin</option>
                <option value="disciplinary">Disciplinary & Conduct</option>
                <option value="academic">Academic & Exams</option>
                <option value="activity">School Activity / Event</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                Location / Venue
              </label>
              <input
                type="text"
                placeholder="e.g. Audio-Visual Room (AVR)"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13px',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  color: '#0f172a'
                }}
              />
            </div>
          </div>

          {/* Target Attendees */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Attendees
            </label>
            <input
              type="text"
              placeholder="e.g. All Faculty, Grade 10 Advisers"
              value={formData.attendees}
              onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0f172a'
              }}
            />
            {/* Quick Suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {quickAttendees.map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormData({ ...formData, attendees: item })}
                  style={{
                    padding: '2px 8px',
                    fontSize: '11px',
                    borderRadius: '12px',
                    background: formData.attendees === item ? '#0f172a' : '#f1f5f9',
                    color: formData.attendees === item ? '#ffffff' : '#475569',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Notes / Agenda (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief agenda or important reminders..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '9px 12px',
                fontSize: '13px',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                outline: 'none',
                boxSizing: 'border-box',
                color: '#0f172a',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '56px'
              }}
            />
          </div>

          {/* Action Footer */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 600,
                color: '#475569',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#ffffff',
                background: '#0f172a',
                border: 'none',
                borderRadius: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.2)'
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
