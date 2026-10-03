import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Clock,
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Crosshair,
  User,
  History,
  Activity,
  FileText
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { dataService } from '../services/dataService';
import '../css/track-location.css';

// Fix default Leaflet icon paths in Vite bundles
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Default center: Manila / Caloocan Institutional Grounds
const DEFAULT_CENTER = [14.642, 120.985];
const DEFAULT_ZOOM = 15;

export const TrackLocationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student_id');

  const { user, canAccessStudent } = useAuth();
  const { success, error: showError, info } = useNotification();

  // Core Datasets
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student Selection & Filtering
  const [selectedStudentId, setSelectedStudentId] = useState(studentIdParam || '');

  // Violation Recorded Location State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history' | 'incidents'

  // Map & Markers References
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);

  // Filter students based on RBAC authorization
  const authorizedStudents = useMemo(() => {
    return students.filter(s => canAccessStudent(s));
  }, [students, canAccessStudent]);

  // Active target student
  const activeStudent = useMemo(() => {
    if (!selectedStudentId) return authorizedStudents[0] || null;
    return authorizedStudents.find(s => String(s.id) === String(selectedStudentId)) || authorizedStudents[0] || null;
  }, [authorizedStudents, selectedStudentId]);

  // Initial Data Load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Update selected student when param changes
  useEffect(() => {
    if (studentIdParam && studentIdParam !== selectedStudentId) {
      setSelectedStudentId(studentIdParam);
    }
  }, [studentIdParam]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [studList, recList] = await Promise.all([
        dataService.getStudents(),
        dataService.getRecords()
      ]);
      setStudents(studList || []);
      setRecords(recList || []);
    } catch (err) {
      showError('Failed to load student tracking datasets: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load student recorded location and historical incident breadcrumbs when activeStudent changes
  const fetchLocationData = useCallback(async () => {
    if (!activeStudent?.id) return;

    try {
      const [latest, history] = await Promise.all([
        dataService.getStudentLatestLocation(activeStudent.id),
        dataService.getStudentLocationHistory(activeStudent.id, 15)
      ]);
      if (latest) {
        setCurrentLocation(latest);
        setLastRefreshedAt(new Date(latest.recorded_at || Date.now()));
      }
      setLocationHistory(history || []);
    } catch (err) {
      console.warn('Error fetching location data for student:', err);
    }
  }, [activeStudent?.id]);

  useEffect(() => {
    fetchLocationData();
  }, [fetchLocationData]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      scrollWheelZoom: true
    });

    // Add zoom controls at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Invalidate map size on next frame so container geometry is exact
    const resizeTimer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    const handleWindowResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleWindowResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Map Marker & History Trail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation || !activeStudent) return;

    const { latitude, longitude, accuracy_meters } = currentLocation;
    const latLng = [latitude, longitude];

    // 1. Remove previous marker & polyline
    if (markerRef.current) markerRef.current.remove();
    if (polylineRef.current) polylineRef.current.remove();

    // 2. Custom student avatar pin
    const studentFullName = `${activeStudent.fname} ${activeStudent.lname}`;
    const avatarUrl = activeStudent.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentFullName)}&background=07345f&color=fff&size=100&bold=true`;

    const accuracyRadius = Math.max(8, Number(accuracy_meters) || 10);

    const customIcon = L.divIcon({
      className: 'student-avatar-pin',
      html: `
        <div class="pin-outer" title="${studentFullName}">
          <img src="${avatarUrl}" class="pin-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(studentFullName)}&background=07345f&color=fff&size=100&bold=true'" />
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });

    const popupHtml = `
      <div class="track-popup">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <img src="${avatarUrl}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid #07345f;" />
          <div>
            <div style="font-weight: 800; font-size: 13.5px; color: #0f172a;">${studentFullName}</div>
            <div style="font-size: 11px; color: #64748b;">${activeStudent.grade} - ${activeStudent.section}</div>
          </div>
        </div>
        <div style="background: #f8fafc; padding: 6px 8px; border-radius: 6px; font-size: 11px; margin-bottom: 6px;">
          <div><strong>Status:</strong> <span style="color: #0284c7; font-weight: 700;">Recorded Incident Ping</span></div>
          <div><strong>Accuracy:</strong> ±${accuracyRadius} meters</div>
          <div><strong>Logged At:</strong> ${new Date(currentLocation.recorded_at || Date.now()).toLocaleTimeString()}</div>
        </div>
      </div>
    `;

    markerRef.current = L.marker(latLng, { icon: customIcon })
      .addTo(map)
      .bindPopup(popupHtml);

    // 3. Draw movement breadcrumb polyline if history exists
    if (locationHistory.length > 1) {
      const pathPoints = locationHistory.map(h => [h.latitude, h.longitude]);
      polylineRef.current = L.polyline(pathPoints, {
        color: '#0284c7',
        weight: 3,
        opacity: 0.65,
        dashArray: '6, 6'
      }).addTo(map);
    }

    // Auto-center map smoothly on coordinate update
    map.flyTo(latLng, DEFAULT_ZOOM, { duration: 0.8 });
  }, [currentLocation, activeStudent, locationHistory]);

  // Recenter Map on Campus
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(DEFAULT_CENTER, 14, { duration: 0.8 });
  };

  // Focus on Selected Student's Incident Location
  const handleFocusStudent = () => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) {
      showError('No recorded location found for this student.');
      return;
    }
    map.flyTo([currentLocation.latitude, currentLocation.longitude], 16, { duration: 0.8 });
    success(`Focused on ${activeStudent?.fname || 'Student'}'s incident location.`);
  };

  const handleRefreshRecords = async () => {
    await Promise.all([loadInitialData(), fetchLocationData()]);
    success('Student incident and location records refreshed.');
  };

  // Format Helper
  const formatTime = (dateObj) => {
    if (!dateObj) return 'N/A';
    const d = new Date(dateObj);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getAccuracyBadge = (accuracy) => {
    const acc = Number(accuracy) || 10;
    if (acc <= 15) {
      return { text: `±${acc}m (High Precision)`, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
    }
    if (acc <= 50) {
      return { text: `±${acc}m (Standard Precision)`, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    }
    return { text: `±${acc}m (Approximate)`, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  };

  const accuracyInfo = getAccuracyBadge(currentLocation?.accuracy_meters);

  const studentIncidents = useMemo(() => {
    if (!activeStudent?.id) return [];
    return records.filter(r => Number(r.student_id) === Number(activeStudent.id));
  }, [records, activeStudent]);

  return (
    <div className="track-location-container">
      {/* Page Banner Header */}
      <div className="page-banner-header track-page-banner">
        <div className="page-banner-info">
          <div className="track-header-icon-box">
            <MapPin size={24} strokeWidth={2.2} color="#ffffff" style={{ flexShrink: 0 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 className="track-header-title">
                {activeStudent ? `Incident Location: ${activeStudent.fname} ${activeStudent.lname}` : 'Student Incident Location Mapping'}
              </h2>
            </div>
            <p className="track-header-sub">
              Logged student infraction location telemetry, campus proximity, and historical incident sites.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <div className="page-banner-secondary-group">
            <button
              type="button"
              onClick={() => navigate('/students')}
              className="page-banner-btn-secondary"
            >
              <ArrowLeft size={14} /> Student List
            </button>

            <button
              type="button"
              onClick={handleFocusStudent}
              className="page-banner-btn-secondary"
            >
              <Crosshair size={14} /> Focus Location
            </button>

            <button
              type="button"
              onClick={handleRecenter}
              className="page-banner-btn-secondary"
            >
              <RotateCcw size={14} /> Campus Center
            </button>
          </div>

          <button
            type="button"
            onClick={handleRefreshRecords}
            className="page-banner-primary-btn"
          >
            <RefreshCw size={14} /> Refresh Records
          </button>
        </div>
      </div>

      {/* Main Grid: Map Viewport & Telemetry Sidebar */}
      <div className="track-main-grid">
        {/* Map Viewport Card */}
        <div className="track-map-card">
          <div ref={mapContainerRef} className="track-map-wrapper" />
        </div>

        {/* Telemetry & Details Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Student Identity Card */}
          {activeStudent && (
            <div className="track-sidebar-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <img
                  src={activeStudent.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStudent.fname + ' ' + activeStudent.lname)}&background=07345f&color=fff&size=100&bold=true`}
                  alt={activeStudent.fname}
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #07345f' }}
                />
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                    {activeStudent.fname} {activeStudent.lname}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Student ID: <strong style={{ color: '#0f172a' }}>{activeStudent.lrn || 'N/A'}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                    {activeStudent.grade} • Section {activeStudent.section}
                  </div>
                </div>
              </div>

              {/* Status / Accuracy Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    padding: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Tracking Mode</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569', marginTop: '2px' }}>
                    📍 Recorded Infraction Site
                  </div>
                </div>

                <div
                  style={{
                    background: accuracyInfo.bg,
                    border: `1px solid ${accuracyInfo.border}`,
                    padding: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Precision Metric</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: accuracyInfo.color, marginTop: '2px' }}>
                    {accuracyInfo.text}
                  </div>
                </div>
              </div>

              {/* Coordinate & Time Details */}
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Latitude / Longitude:</span>
                  <strong>{currentLocation ? `${Number(currentLocation.latitude).toFixed(5)}, ${Number(currentLocation.longitude).toFixed(5)}` : 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Recorded At:</span>
                  <strong>{formatTime(lastRefreshedAt)}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleFocusStudent}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: '#07345f',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Crosshair size={13} /> Focus Incident on Map
                </button>
              </div>
            </div>
          )}

          {/* 2. Navigation Tabbed Section (Incident Info, Breadcrumb History, Incident History) */}
          <div className="track-sidebar-card">
            <div className="track-tabs-container">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className={`track-tab-btn ${activeTab === 'live' ? 'active' : ''}`}
              >
                Incident Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`track-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
              >
                Location History ({locationHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                className={`track-tab-btn ${activeTab === 'incidents' ? 'active' : ''}`}
              >
                Incidents ({studentIncidents.length})
              </button>
            </div>

            {/* Tab: Incident Info */}
            {activeTab === 'live' && (
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#07345f', fontWeight: 700, marginBottom: '6px' }}>
                  <ShieldCheck size={16} /> Violation Incident Telemetry
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: '#64748b' }}>
                  Incident coordinates are timestamped when infractions are reported, compliant with Philippine Data Privacy Act standards (RA 10173).
                </p>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '11px' }}>
                  <div><strong>Reported By:</strong> {currentLocation?.reported_by || 'Discipline Officer'}</div>
                  <div><strong>Tracking Source:</strong> Logged Violation Report</div>
                  <div><strong>Vicinity:</strong> Main Campus Grounds</div>
                </div>
              </div>
            )}

            {/* Tab: Historical Path Breadcrumbs */}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {locationHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '16px' }}>
                    No recorded incident location history for this student.
                  </div>
                ) : (
                  locationHistory.map((crumb, idx) => (
                    <div
                      key={crumb.id || idx}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: idx === 0 ? '#f0fdf4' : '#f8fafc',
                        border: `1px solid ${idx === 0 ? '#bbf7d0' : '#e2e8f0'}`,
                        fontSize: '11.5px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#0f172a' }}>
                        <span>{idx === 0 ? '📍 Latest Infraction Site' : `Incident Point #${locationHistory.length - idx}`}</span>
                        <span style={{ fontSize: '10.5px', color: '#64748b' }}>{formatTime(crumb.recorded_at)}</span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Lat: {Number(crumb.latitude).toFixed(5)}, Lng: {Number(crumb.longitude).toFixed(5)} • ±{crumb.accuracy_meters || 10}m
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab: Linked Student Disciplinary Incidents */}
            {activeTab === 'incidents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {studentIncidents.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#16a34a', fontSize: '12px', padding: '16px', fontWeight: 700 }}>
                    🟢 Good Standing — 0 Conduct Incidents
                  </div>
                ) : (
                  studentIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        fontSize: '11.5px'
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#dc2626' }}>{inc.violation?.title || 'Infraction'}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '2px' }}>
                        {new Date(inc.date_reported || inc.created_at).toLocaleDateString()} • Status: <strong>{inc.status}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackLocationPage;
