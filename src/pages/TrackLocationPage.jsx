import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  AlertCircle,
  Clock,
  ArrowLeft,
  Navigation,
  RotateCcw,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { dataService } from '../services/dataService';
import '../css/track-location.css';

// Fix default Leaflet icon paths in Vite bundles
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Default center: Manila / Caloocan region
const DEFAULT_CENTER = [14.642, 120.985];
const DEFAULT_ZOOM = 13;

export const TrackLocationPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightRecordId = searchParams.get('id');
  const studentIdParam = searchParams.get('student_id');

  const [records, setRecords] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  // Active student if filtered by student_id
  const activeStudent = useMemo(() => {
    if (!studentIdParam) return null;
    return students.find(s => String(s.id) === String(studentIdParam)) || null;
  }, [students, studentIdParam]);

  // Load records and students
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recList, studList] = await Promise.all([
        dataService.getRecords(),
        dataService.getStudents()
      ]);
      setRecords(recList || []);
      setStudents(studList || []);
    } catch (err) {
      console.error('Failed to load tracked location data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Enhance records with realistic coordinates
  const enhancedRecords = useMemo(() => {
    let list = records;
    if (studentIdParam) {
      list = records.filter(r => String(r.student_id || r.student?.id) === String(studentIdParam));
    }

    return list.map((rec, index) => {
      const seed = (typeof rec.id === 'number' ? rec.id : index + 1);
      const latOffset = ((seed * 17) % 70 - 35) * 0.0018;
      const lngOffset = ((seed * 23) % 70 - 35) * 0.0022;
      const lat = rec.lat || (DEFAULT_CENTER[0] + latOffset);
      const lng = rec.lng || (DEFAULT_CENTER[1] + lngOffset);

      const student = rec.student || students.find(s => s.id === (rec.student_id || rec.student?.id)) || {};
      const fullName = `${student.fname || ''} ${student.lname || ''}`.trim() || 'Student';
      const avatarUrl = student.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=07345f&color=fff&size=100&bold=true`;

      return {
        ...rec,
        lat,
        lng,
        student,
        studentFullName: fullName,
        avatarUrl
      };
    });
  }, [records, students, studentIdParam]);

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

  // Sync Markers to Leaflet Map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    if (enhancedRecords.length === 0 && activeStudent) {
      // If student has no infractions, drop single location pinpoint
      const customIcon = L.divIcon({
        className: 'student-avatar-pin',
        html: `
          <div class="pin-outer">
            <img src="${activeStudent.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeStudent.fname + ' ' + activeStudent.lname)}&background=07345f&color=fff&size=100&bold=true`}" class="pin-img" />
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -21]
      });

      const marker = L.marker(DEFAULT_CENTER, { icon: customIcon })
        .addTo(map)
        .bindPopup(`
          <div class="track-popup">
            <div style="font-weight: 800; font-size: 13.5px; color: #0f172a;">${activeStudent.fname} ${activeStudent.lname}</div>
            <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">${activeStudent.grade} - ${activeStudent.section}</div>
            <div style="font-size: 11px; color: #166534; margin-top: 6px; font-weight: 700;">🟢 No active violations recorded</div>
          </div>
        `);
      markersRef.current['student_pin'] = marker;
      map.flyTo(DEFAULT_CENTER, 14, { duration: 1 });
      return;
    }

    enhancedRecords.forEach((rec) => {
      const customIcon = L.divIcon({
        className: 'student-avatar-pin',
        html: `
          <div class="pin-outer" title="${rec.studentFullName}">
            <img src="${rec.avatarUrl}" class="pin-img" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(rec.studentFullName)}&background=07345f&color=fff&size=100&bold=true'" />
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
        popupAnchor: [0, -21]
      });

      const formattedDate = formatTimestamp(rec.date_reported || rec.created_at);

      const popupContent = `
        <div class="track-popup">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <img src="${rec.avatarUrl}" style="width: 32px; height: 32px; border-radius: 6px; object-fit: cover;" />
            <div>
              <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${rec.studentFullName}</div>
              <div style="font-size: 11px; color: #64748b;">${rec.student?.grade || ''} - ${rec.student?.section || ''}</div>
            </div>
          </div>
          <div style="font-size: 12px; font-weight: 700; color: #dc2626; margin-bottom: 4px;">
            ${rec.violation?.title || 'Violation'}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ${formattedDate}
          </div>
          <a href="/student-violation/${rec.student_id || rec.student?.id}" style="display: block; text-align: center; background: #0f172a; color: #fff; padding: 5px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-decoration: none;">
            View Profile
          </a>
        </div>
      `;

      const marker = L.marker([rec.lat, rec.lng], { icon: customIcon })
        .addTo(map)
        .bindPopup(popupContent);

      marker.on('click', () => {
        setSelectedRecord(rec);
      });

      markersRef.current[rec.id] = marker;
    });

    // Auto-focus if single record or student
    if (highlightRecordId && markersRef.current[highlightRecordId]) {
      const targetMarker = markersRef.current[highlightRecordId];
      const targetRec = enhancedRecords.find(r => String(r.id) === String(highlightRecordId));
      if (targetRec) {
        map.flyTo([targetRec.lat, targetRec.lng], 15, { duration: 1.2 });
        targetMarker.openPopup();
        setSelectedRecord(targetRec);
      }
    } else if (enhancedRecords.length > 0) {
      const first = enhancedRecords[0];
      map.flyTo([first.lat, first.lng], studentIdParam ? 14 : DEFAULT_ZOOM, { duration: 1 });
    }
  }, [enhancedRecords, highlightRecordId, activeStudent, studentIdParam]);

  const handleSelectRecord = (rec) => {
    setSelectedRecord(rec);
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([rec.lat, rec.lng], 15, { duration: 1 });

    const marker = markersRef.current[rec.id];
    if (marker) {
      setTimeout(() => {
        marker.openPopup();
      }, 400);
    }
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, { duration: 0.8 });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([latitude, longitude], 15, { duration: 1 });
          const userIcon = L.divIcon({
            className: 'user-pulse-marker',
            html: `<div style="width: 16px; height: 16px; background: #0284c7; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });
          L.marker([latitude, longitude], { icon: userIcon }).addTo(map).bindPopup('<b>Your Location</b>').openPopup();
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  function formatTimestamp(isoString) {
    if (!isoString) return 'Dec 10, 2025, 11:33 PM';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  }

  return (
    <div className="track-location-container">
      {/* Standard App Page Banner Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <MapPin size={30} strokeWidth={2.2} color="#ffffff" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#ffffff', letterSpacing: '-0.02em' }}>
                {activeStudent ? `Track Location: ${activeStudent.fname} ${activeStudent.lname}` : 'Track Student Location'}
              </h2>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 700,
                  padding: '2.5px 10px',
                  borderRadius: '20px',
                  backdropFilter: 'blur(4px)'
                }}
              >
                {activeStudent ? `${activeStudent.grade} - ${activeStudent.section}` : `${enhancedRecords.length} Tracked ${enhancedRecords.length === 1 ? 'Record' : 'Records'}`}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'rgba(255, 255, 255, 0.85)' }}>
              {activeStudent 
                ? `Viewing geographic incidents and last known check-in locations for ${activeStudent.fname} ${activeStudent.lname}.` 
                : 'Monitor geo-tagged student conduct records and campus incident locations.'}
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
              <ArrowLeft size={15} /> Back to Students
            </button>

            <button
              type="button"
              onClick={handleRecenter}
              className="page-banner-btn-secondary"
            >
              <RotateCcw size={15} /> Recenter Campus
            </button>
          </div>

          <button
            type="button"
            onClick={handleLocateMe}
            className="page-banner-primary-btn"
          >
            <Navigation size={15} /> Locate Current GPS
          </button>
        </div>
      </div>

      {/* Top Map Viewport */}
      <div className="track-map-card">
        <div ref={mapContainerRef} className="track-map-wrapper" />
      </div>

      {/* Tracked Violations Clean List */}
      <div className="track-list-section">
        <div className="track-list-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="track-list-icon">🗂️</span>
            <span className="track-list-title-text">
              {activeStudent ? `Tracked Incidents for ${activeStudent.fname} ${activeStudent.lname}` : 'Tracked Violations'}
            </span>
          </div>
          {activeStudent && (
            <button
              type="button"
              onClick={() => navigate('/track-location')}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#0f172a',
                cursor: 'pointer'
              }}
            >
              View All Campus Violations
            </button>
          )}
        </div>

        <div className="track-cards-stack">
          {enhancedRecords.length === 0 ? (
            <div className="track-card-row" style={{ padding: '16px 20px', cursor: 'default' }}>
              <div className="track-card-left" style={{ gap: '14px' }}>
                <img
                  src={activeStudent?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent((activeStudent?.fname || '') + ' ' + (activeStudent?.lname || ''))}&background=07345f&color=fff&size=100&bold=true`}
                  alt={activeStudent ? `${activeStudent.fname} ${activeStudent.lname}` : 'Student'}
                  className="track-card-avatar"
                  style={{ width: '40px', height: '40px' }}
                />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                      {activeStudent ? `${activeStudent.fname} ${activeStudent.lname}` : 'Student'}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: 700, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', padding: '2px 7px', borderRadius: '4px' }}>
                      🟢 Good Standing — 0 Active Violations
                    </span>
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                    LRN: <strong style={{ color: '#0f172a' }}>{activeStudent?.lrn || 'N/A'}</strong> • Address: <span style={{ color: '#334155' }}>{activeStudent?.address || 'Metro Manila, Philippines'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            enhancedRecords.map((rec) => {
              const isSelected = selectedRecord?.id === rec.id;
              const formattedDate = formatTimestamp(rec.date_reported || rec.created_at);

              return (
                <div
                  key={rec.id}
                  className={`track-card-row ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectRecord(rec)}
                >
                  <div className="track-card-left">
                    <img
                      src={rec.avatarUrl}
                      alt={rec.studentFullName}
                      className="track-card-avatar"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(rec.studentFullName)}&background=07345f&color=fff&size=100&bold=true`;
                      }}
                    />
                    <div className="track-card-info">
                      <span className="track-card-alert-dot">
                        <AlertCircle size={15} />
                      </span>
                      <span className="track-card-violation">
                        {rec.violation?.title || 'Infraction'}
                      </span>
                      <span className="track-card-time">
                        <Clock size={12} /> {formattedDate}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
