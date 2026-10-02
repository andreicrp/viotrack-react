import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  AlertCircle,
  Clock,
  ArrowLeft,
  Navigation,
  RotateCcw,
  Search,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Play,
  Square,
  RefreshCw,
  Crosshair,
  User,
  History,
  Activity,
  Layers,
  ChevronDown
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
  const [searchParams, setSearchParams] = useSearchParams();
  const studentIdParam = searchParams.get('student_id');

  const { user, isAdmin, isTeacher, canAccessStudent } = useAuth();
  const { success, error: showError, info } = useNotification();

  // Core Datasets
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Student Selection & Filtering
  const [selectedStudentId, setSelectedStudentId] = useState(studentIdParam || '');
  const [studentSearch, setStudentSearch] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Live Location State
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [isLiveTracking, setIsLiveTracking] = useState(false);
  const [gpsPermissionState, setGpsPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'history' | 'incidents'

  // Map & Markers References
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const accuracyCircleRef = useRef(null);
  const polylineRef = useRef(null);
  const watchIdRef = useRef(null);

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

  // Check initial browser permission status if supported
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setGpsPermissionState(result.state);
        result.onchange = () => {
          setGpsPermissionState(result.state);
          if (result.state === 'denied') {
            stopLiveTracking();
          }
        };
      }).catch(() => {
        // Fallback for browsers with restricted permissions API
      });
    }
  }, []);

  // Load student location and historical breadcrumbs when activeStudent changes
  useEffect(() => {
    if (!activeStudent?.id) return;

    const fetchLocationData = async () => {
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
    };

    fetchLocationData();
  }, [activeStudent?.id]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Sync Map Marker, Accuracy Halo & History Trail
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation || !activeStudent) return;

    const { latitude, longitude, accuracy_meters } = currentLocation;
    const latLng = [latitude, longitude];

    // 1. Remove previous marker & accuracy circle
    if (markerRef.current) markerRef.current.remove();
    if (accuracyCircleRef.current) accuracyCircleRef.current.remove();
    if (polylineRef.current) polylineRef.current.remove();

    // 2. Accuracy circle halo
    const accuracyRadius = Math.max(8, Number(accuracy_meters) || 10);
    const circleColor = accuracyRadius <= 15 ? '#10b981' : accuracyRadius <= 50 ? '#f59e0b' : '#ef4444';

    accuracyCircleRef.current = L.circle(latLng, {
      radius: accuracyRadius,
      color: circleColor,
      fillColor: circleColor,
      fillOpacity: 0.15,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(map);

    // 3. Custom student avatar pin with pulse beacon
    const studentFullName = `${activeStudent.fname} ${activeStudent.lname}`;
    const avatarUrl = activeStudent.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentFullName)}&background=07345f&color=fff&size=100&bold=true`;

    const customIcon = L.divIcon({
      className: 'student-avatar-pin',
      html: `
        <div class="pin-outer ${isLiveTracking ? 'is-live' : ''}" title="${studentFullName}">
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
          <div><strong>Status:</strong> <span style="color: ${isLiveTracking ? '#16a34a' : '#0284c7'}; font-weight: 700;">${isLiveTracking ? '🟢 Live GPS Active' : '⚪ Last Known'}</span></div>
          <div><strong>Accuracy:</strong> ±${accuracyRadius} meters</div>
          <div><strong>Time:</strong> ${new Date(currentLocation.recorded_at || Date.now()).toLocaleTimeString()}</div>
        </div>
      </div>
    `;

    markerRef.current = L.marker(latLng, { icon: customIcon })
      .addTo(map)
      .bindPopup(popupHtml);

    // 4. Draw movement breadcrumb polyline if history exists
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
  }, [currentLocation, activeStudent, isLiveTracking, locationHistory]);

  // Start Authorized High-Accuracy Device Tracking
  const startLiveTracking = useCallback(() => {
    if (!navigator.geolocation) {
      showError('Device Geolocation is not supported by your browser.');
      return;
    }

    if (!activeStudent) {
      showError('Please select a student before starting live tracking.');
      return;
    }

    info(`Initiating authorized GPS location tracking for ${activeStudent.fname} ${activeStudent.lname}...`);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000
    };

    const handleSuccess = async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      const newLocation = {
        student_id: activeStudent.id,
        latitude,
        longitude,
        accuracy_meters: Math.round(accuracy),
        tracking_status: 'Active',
        recorded_at: new Date().toISOString()
      };

      setCurrentLocation(newLocation);
      setLastRefreshedAt(new Date());
      setIsLiveTracking(true);
      setGpsPermissionState('granted');

      // Persist to Supabase / Storage
      try {
        await dataService.saveStudentLocation(activeStudent.id, newLocation);
        setLocationHistory(prev => [newLocation, ...prev.slice(0, 14)]);
      } catch (err) {
        console.warn('Failed to persist location telemetry:', err);
      }
    };

    const handleError = (error) => {
      console.warn('Geolocation tracking error:', error);
      setIsLiveTracking(false);

      if (error.code === error.PERMISSION_DENIED) {
        setGpsPermissionState('denied');
        showError('Location permission was denied. Please allow device location access in browser settings.');
      } else if (error.code === error.POSITION_UNAVAILABLE) {
        showError('GPS signal unavailable. Please ensure location services are enabled on the device.');
      } else if (error.code === error.TIMEOUT) {
        showError('Location request timed out. Retrying with cached accuracy...');
      }
    };

    // Watch real-time position updates
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
  }, [activeStudent, showError, info]);

  // Stop Live Tracking
  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsLiveTracking(false);
    info('Live tracking session paused.');
  }, [info]);

  // Manual GPS Ping / Refresh
  const handleRefreshGPS = () => {
    if (isLiveTracking) {
      info('Live tracking is active. GPS coordinates update automatically.');
      return;
    }
    startLiveTracking();
  };

  // Recenter Map on Campus
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(DEFAULT_CENTER, 14, { duration: 0.8 });
  };

  // Focus on Selected Student
  const handleFocusStudent = () => {
    const map = mapInstanceRef.current;
    if (!map || !currentLocation) return;
    map.flyTo([currentLocation.latitude, currentLocation.longitude], 16, { duration: 0.8 });
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
      return { text: `±${acc}m (High Accuracy)`, color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0' };
    }
    if (acc <= 50) {
      return { text: `±${acc}m (Moderate Accuracy)`, color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    }
    return { text: `±${acc}m (Low / Approximate)`, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
  };

  const accuracyInfo = getAccuracyBadge(currentLocation?.accuracy_meters);

  // Filtered dropdown student search
  const filteredDropdownStudents = useMemo(() => {
    if (!studentSearch.trim()) return authorizedStudents;
    const q = studentSearch.toLowerCase();
    return authorizedStudents.filter(s => 
      `${s.fname} ${s.lname}`.toLowerCase().includes(q) ||
      (s.lrn && s.lrn.includes(q)) ||
      (s.grade && s.grade.toLowerCase().includes(q))
    );
  }, [authorizedStudents, studentSearch]);

  const studentIncidents = useMemo(() => {
    if (!activeStudent?.id) return [];
    return records.filter(r => Number(r.student_id) === Number(activeStudent.id));
  }, [records, activeStudent]);

  return (
    <div className="track-location-container">
      {/* Standard App Page Banner Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <MapPin size={30} strokeWidth={2.2} color="#ffffff" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {activeStudent ? `Track Location: ${activeStudent.fname} ${activeStudent.lname}` : 'Student GPS Location Tracking'}
              </h2>
              {isLiveTracking && (
                <span
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: 'pulse 1.5s infinite'
                  }}
                >
                  <Radio size={12} /> LIVE GPS ACTIVE
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              Authorized real-time student GPS telemetry, campus proximity monitoring, and breadcrumb history.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="page-banner-actions">
          <button
            type="button"
            onClick={() => navigate('/students')}
            className="page-banner-btn-secondary"
          >
            <ArrowLeft size={15} /> Student List
          </button>

          <button
            type="button"
            onClick={handleRecenter}
            className="page-banner-btn-secondary"
          >
            <RotateCcw size={15} /> Campus Center
          </button>

          {isLiveTracking ? (
            <button
              type="button"
              onClick={stopLiveTracking}
              className="page-banner-primary-btn"
              style={{ background: '#ef4444', borderColor: '#dc2626' }}
            >
              <Square size={14} /> Stop Tracking
            </button>
          ) : (
            <button
              type="button"
              onClick={startLiveTracking}
              className="page-banner-primary-btn"
            >
              <Play size={14} /> Start Live Tracking
            </button>
          )}
        </div>
      </div>

      {/* Permission Denied Warning Banner */}
      {gpsPermissionState === 'denied' && (
        <div
          style={{
            background: '#fef2f2',
            border: '1.5px solid #fecaca',
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            color: '#991b1b',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={20} color="#dc2626" />
            <div>
              <strong>Location Permission Denied:</strong> Device GPS access is blocked. Please enable Location Services in your browser or device settings to stream real-time coordinates.
            </div>
          </div>
          <button
            type="button"
            onClick={startLiveTracking}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            Retry Permission
          </button>
        </div>
      )}

      {/* Main Grid: Map Viewport & Telemetry Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', alignItems: 'start' }}>
        
        {/* Map Viewport Card */}
        <div className="track-map-card" style={{ position: 'relative' }}>
          {/* Map Top Floating Controls Bar */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              pointerEvents: 'none'
            }}
          >
            {/* Student Selector Dropdown Wrap */}
            <div style={{ position: 'relative', pointerEvents: 'auto', width: '280px' }}>
              <button
                type="button"
                onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#0f172a'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <User size={16} color="#07345f" />
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {activeStudent ? `${activeStudent.fname} ${activeStudent.lname}` : 'Select Student'}
                  </span>
                </div>
                <ChevronDown size={16} color="#64748b" />
              </button>

              {isStudentDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    background: '#ffffff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '10px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
                    zIndex: 1010,
                    overflow: 'hidden',
                    maxHeight: '260px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                      <Search size={14} color="#64748b" />
                      <input
                        type="text"
                        placeholder="Search student or LRN..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                  <div style={{ overflowY: 'auto', maxHeight: '200px' }}>
                    {filteredDropdownStudents.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelectedStudentId(s.id);
                          setSearchParams({ student_id: s.id });
                          setIsStudentDropdownOpen(false);
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          border: 'none',
                          background: String(activeStudent?.id) === String(s.id) ? '#f0fdf4' : 'transparent',
                          color: '#0f172a',
                          fontSize: '12.5px',
                          fontWeight: String(activeStudent?.id) === String(s.id) ? 800 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <div>
                          <div>{s.fname} {s.lname}</div>
                          <div style={{ fontSize: '10.5px', color: '#64748b' }}>{s.grade} - {s.section}</div>
                        </div>
                        {String(activeStudent?.id) === String(s.id) && <CheckCircle2 size={14} color="#16a34a" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Focus Target Button */}
            <button
              type="button"
              onClick={handleFocusStudent}
              style={{
                pointerEvents: 'auto',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#07345f',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)',
                cursor: 'pointer'
              }}
            >
              <Crosshair size={15} /> Center on Student
            </button>
          </div>

          <div ref={mapContainerRef} className="track-map-wrapper" style={{ height: '520px' }} />
        </div>

        {/* Telemetry & Details Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* 1. Student Identity Card */}
          {activeStudent && (
            <div
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                padding: '16px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
              }}
            >
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
                    LRN: <strong style={{ color: '#0f172a' }}>{activeStudent.lrn || 'N/A'}</strong>
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
                    background: isLiveTracking ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${isLiveTracking ? '#bbf7d0' : '#e2e8f0'}`,
                    padding: '8px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Tracking Mode</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: isLiveTracking ? '#16a34a' : '#475569', marginTop: '2px' }}>
                    {isLiveTracking ? '🟢 Live GPS Stream' : '⚪ Last Known Ping'}
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
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>Accuracy Metric</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: accuracyInfo.color, marginTop: '2px' }}>
                    {accuracyInfo.text}
                  </div>
                </div>
              </div>

              {/* Coordinate & Time Details */}
              <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ color: '#64748b' }}>Latitude / Longitude:</span>
                  <strong>{currentLocation ? `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}` : 'N/A'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>Last Updated:</span>
                  <strong>{formatTime(lastRefreshedAt)}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={handleRefreshGPS}
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
                  <RefreshCw size={13} /> Refresh GPS Signal
                </button>
              </div>
            </div>
          )}

          {/* 2. Navigation Tabbed Section (Live Status, Breadcrumb History, Incident History) */}
          <div
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '14px',
              padding: '14px',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)'
            }}
          >
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                style={{
                  background: activeTab === 'live' ? '#07345f' : 'transparent',
                  color: activeTab === 'live' ? '#ffffff' : '#64748b',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Telemetry Info
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                style={{
                  background: activeTab === 'history' ? '#07345f' : 'transparent',
                  color: activeTab === 'history' ? '#ffffff' : '#64748b',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Path History ({locationHistory.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('incidents')}
                style={{
                  background: activeTab === 'incidents' ? '#07345f' : 'transparent',
                  color: activeTab === 'incidents' ? '#ffffff' : '#64748b',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Incidents ({studentIncidents.length})
              </button>
            </div>

            {/* Tab: Live Telemetry Info */}
            {activeTab === 'live' && (
              <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#07345f', fontWeight: 700, marginBottom: '6px' }}>
                  <ShieldCheck size={16} /> Encrypted Geolocation
                </div>
                <p style={{ margin: '0 0 8px 0', fontSize: '11.5px', color: '#64748b' }}>
                  Location data is streamed using encrypted W3C Geolocation API, mapped to Philippine Data Privacy Act standards (RA 10173).
                </p>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', fontSize: '11px' }}>
                  <div><strong>Reported By:</strong> {currentLocation?.reported_by || 'Device Telemetry'}</div>
                  <div><strong>Signal Source:</strong> High Accuracy GPS Sensor</div>
                  <div><strong>Vicinity:</strong> Main Campus / Metro Manila</div>
                </div>
              </div>
            )}

            {/* Tab: Historical Path Breadcrumbs */}
            {activeTab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                {locationHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12px', padding: '16px' }}>
                    No recorded movement history for this session.
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
                        <span>{idx === 0 ? '📍 Current Position' : `Point #${locationHistory.length - idx}`}</span>
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
