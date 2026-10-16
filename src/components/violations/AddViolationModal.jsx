import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { claimSubmissionLock, releaseSubmissionLock } from '../../utils/dataIntegrity';
import { lockBodyScroll, unlockBodyScroll } from '../../utils/scrollLock';
import {
  AlertTriangle,
  User,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Search,
  Check,
  Info,
  Phone,
  MessageSquare,
  Edit,
  ArrowRight,
  ArrowLeft,
  X,
  AlertOctagon,
  Lock
} from 'lucide-react';
import './AddViolationModal.css';

export const AddViolationModal = ({
  isOpen,
  onClose,
  onRecordAdded,
  preselectedStudentId = null,
  requireAccurateLocation = false
}) => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { success, error } = useNotification();

  const [step, setStep] = useState(1); // 1: Student, 2: Offense, 3: Status & SMS
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Selections
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [selectedViolationIds, setSelectedViolationIds] = useState([]);

  // Step 1 Filtering
  const [studentSearch, setStudentSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');

  // Step 2 Filtering
  const [violationSearch, setViolationSearch] = useState('');
  const [violationCategory, setViolationCategory] = useState('All'); // 'All', 'Minor', 'Serious', 'Major'

  // Step 3 Form Details
  const isTeacher = user?.role === 'teacher';
  const [formData, setFormData] = useState({
    sanction: '',
    remarks: '',
    status: isTeacher ? 'Under Approval' : 'Pending', // Teachers strictly locked to 'Under Approval'
    sendSMS: false,
    guardianContact: '',
    smsTemplate: 'standard',
    customMessage: ''
  });

  // Geolocation
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    accuracy: null,
    captured: false,
    timestamp: null
  });

  // Lock scroll on mount
  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      loadData();

      const geoTimer = setTimeout(() => {
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setLocation({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: Math.round(pos.coords.accuracy),
                captured: true,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              });
            },
            () => {
              setLocation({ lat: null, lng: null, accuracy: null, captured: false, timestamp: null });
            },
            { timeout: 6000, enableHighAccuracy: false }
          );
        }
      }, 200);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        unlockBodyScroll();
        clearTimeout(geoTimer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [sData, vData] = await Promise.all([
        dataService.getStudents(),
        dataService.getViolations()
      ]);
      setStudents(sData || []);
      setViolations(vData || []);

      if (preselectedStudentId) {
        const idNum = Number(preselectedStudentId);
        setSelectedStudentIds([idNum]);
        const found = (sData || []).find((s) => Number(s.id) === idNum);
        if (found) {
          setFormData((prev) => ({
            ...prev,
            guardianContact: found.parent_contact || found.contact || ''
          }));
        }
      } else {
        setSelectedStudentIds([]);
      }

      setStep(1);
      setSelectedViolationIds([]);
      setStudentSearch('');
      setGradeFilter('');
      setViolationSearch('');
      setViolationCategory('All');
      setFormData((prev) => ({
        ...prev,
        status: isTeacher ? 'Under Approval' : 'Pending',
        sendSMS: false
      }));
    } catch (err) {
      console.error('Error loading data in AddViolationModal:', err);
    }
  };

  // Filtered Students (Step 1)
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (gradeFilter) {
        const grade = String(s.grade || '').match(/\d+/)?.[0];
        if (grade !== gradeFilter) return false;
      }
      // Search text
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const fullName = `${s.fname || ''} ${s.mname || ''} ${s.lname || ''}`.toLowerCase();
        const idVal = String(s.student_id || s.id || '').toLowerCase();
        const secVal = `${s.grade || ''} ${s.section || ''}`.toLowerCase();
        if (!fullName.includes(q) && !idVal.includes(q) && !secVal.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [students, gradeFilter, studentSearch]);

  // Filtered Violations (Step 2)
  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (violationCategory !== 'All') {
        const cat = (v.type || v.category || 'Minor').toLowerCase();
        if (cat !== violationCategory.toLowerCase()) return false;
      }
      if (violationSearch.trim()) {
        const q = violationSearch.toLowerCase();
        const titleMatch = (v.title || '').toLowerCase().includes(q);
        const descMatch = (v.description || '').toLowerCase().includes(q);
        const typeMatch = (v.type || '').toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [violations, violationCategory, violationSearch]);

  // Use consistent icons and colors to make offense severity easy to scan.
  const getOffenseVisual = (type = '') => {
    const severity = type.toLowerCase();
    if (severity === 'major') {
      return { Icon: AlertOctagon, diskClass: 'disk-rose' };
    }
    if (severity === 'serious') {
      return { Icon: ShieldAlert, diskClass: 'disk-amber' };
    }
    return { Icon: ShieldCheck, diskClass: 'disk-green' };
  };

  // Toggle student selection
  const toggleSelectStudent = (id) => {
    const idNum = Number(id);
    setSelectedStudentIds((prev) => {
      const exists = prev.includes(idNum);
      const next = exists ? prev.filter((item) => item !== idNum) : [...prev, idNum];

      if (next.length === 1) {
        const found = students.find((s) => Number(s.id) === next[0]);
        if (found) {
          setFormData((f) => ({
            ...f,
            guardianContact: found.parent_contact || found.contact || ''
          }));
        }
      }
      return next;
    });
  };

  // Toggle violation selection
  const toggleSelectViolation = (id) => {
    const idNum = Number(id);
    setSelectedViolationIds((prev) => {
      const exists = prev.includes(idNum);
      const next = exists ? prev.filter((item) => item !== idNum) : [...prev, idNum];

      const chosen = violations.filter((v) => next.includes(Number(v.id)));
      const sanctionsList = chosen
        .map((v) => v.default_sanction || v.sanction)
        .filter(Boolean);

      if (sanctionsList.length > 0) {
        const unique = Array.from(new Set(sanctionsList));
        setFormData((f) => ({ ...f, sanction: unique.join(', ') }));
      }
      return next;
    });
  };

  const handleNextToStep2 = () => {
    if (selectedStudentIds.length === 0) {
      error('Please select at least one student.');
      return;
    }
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (selectedViolationIds.length === 0) {
      error('Please select at least one violation offense.');
      return;
    }
    setStep(3);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (selectedStudentIds.length === 0) {
      error('Please select at least one student.');
      setStep(1);
      return;
    }
    if (selectedViolationIds.length === 0) {
      error('Please select at least one violation offense.');
      setStep(2);
      return;
    }

    const lockKey = `add_violation_${selectedStudentIds.join('_')}_${selectedViolationIds.join('_')}`;
    if (!claimSubmissionLock(lockKey)) {
      console.warn('Duplicate rapid submit blocked by data integrity lock.');
      return;
    }

    const isApprovalMode = isTeacher || formData.status === 'Under Approval';
    setLoading(true);

    try {
      let submitLocation = location;
      if (requireAccurateLocation) {
        if (!('geolocation' in navigator)) {
          throw new Error('This device does not support GPS location. Enable location services to record a scanned violation.');
        }

        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 20000
          });
        }).catch((geoError) => {
          const reason = geoError?.code === 1
            ? 'Location permission was denied.'
            : geoError?.code === 2
              ? 'The device could not determine its location.'
              : 'GPS location timed out.';
          throw new Error(`${reason} Allow location access and try again.`);
        });

        submitLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy),
          captured: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setLocation(submitLocation);
      }

      const createdRecords = [];
      const chosenStudents = students.filter((s) => selectedStudentIds.includes(Number(s.id)));
      const chosenViolations = violations.filter((v) => selectedViolationIds.includes(Number(v.id)));

      for (const student of chosenStudents) {
        if (requireAccurateLocation) {
          await dataService.saveStudentLocation(student.id, {
            latitude: submitLocation.lat,
            longitude: submitLocation.lng,
            accuracy_meters: submitLocation.accuracy
          });
        }

        for (const violation of chosenViolations) {
          const newRecord = await dataService.addRecord({
            student_id: Number(student.id),
            student_id_value: student.student_id,
            violation_id: Number(violation.id),
            reported_by_name: user?.name || (isTeacher ? 'Faculty Teacher' : 'Authorized Administrator'),
            reported_by_type: isTeacher ? 'teacher' : isApprovalMode ? 'teacher' : (user?.role || 'admin'),
            sanction: formData.sanction || violation.default_sanction || 'Under Review',
            remarks: formData.remarks || 'Disciplinary incident report logged.',
            status: isApprovalMode ? 'Under Approval' : formData.status,
            approval_status: isApprovalMode ? 'Under Approval' : 'Approved',
            sms_notified: formData.sendSMS,
            lat: submitLocation.lat,
            lng: submitLocation.lng,
            accuracy: submitLocation.accuracy
          });
          createdRecords.push(newRecord);
        }

        const targetPhone = formData.guardianContact || student.parent_contact;
        if (!isApprovalMode && formData.sendSMS && targetPhone) {
          const violationTitles = chosenViolations.map((v) => v.title).join(', ');
          const messageText = formData.customMessage
            ? `${formData.customMessage} - [${violationTitles}]`
            : violationTitles;

          await dataService.sendSMS(
            targetPhone,
            student.parent_name || 'Guardian',
            `${student.fname} ${student.lname}`,
            messageText
          );
        }
      }

      const recordLabel = createdRecords.length === 1 ? 'violation record' : 'violation records';
      success(isTeacher
        ? `${createdRecords.length} ${recordLabel} recorded and sent for administrator review.`
        : `${createdRecords.length} ${recordLabel} recorded successfully.`);
      onRecordAdded?.(createdRecords[0] || createdRecords);
      onClose();
    } catch (err) {
      error(requireAccurateLocation
        ? `Failed to save scanned violation: ${err.message}`
        : 'Failed to save violation records: ' + err.message);
    } finally {
      releaseSubmissionLock(lockKey);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const chosenStudents = students.filter((s) => selectedStudentIds.includes(Number(s.id)));
  const chosenViolations = violations.filter((v) => selectedViolationIds.includes(Number(v.id)));

  return (
    <>
      <div className="lvm-modal-backdrop" onClick={onClose} role="presentation">
        <div
          className="lvm-window"
          role="dialog"
          aria-modal="true"
          aria-label="Log Student Violation"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar Header */}
          <div className="lvm-topbar">
            <div className="lvm-topbar-left">
              <div className="lvm-topbar-icon">
                <AlertTriangle size={24} strokeWidth={2.2} />
              </div>
              <h2 className="lvm-topbar-title">Log Student Violation</h2>
            </div>
            <button
              type="button"
              className="lvm-topbar-close"
              onClick={onClose}
              title="Close modal"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Horizontal Stepper Strip */}
          <div className="lvm-mobile-stepper-strip">
            <button
              type="button"
              className={`lvm-mobile-step-pill ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
              onClick={() => setStep(1)}
            >
              <div className="lvm-mobile-step-bubble">
                {step > 1 ? <Check size={12} strokeWidth={3} /> : '1'}
              </div>
              <span>Student</span>
            </button>

            <button
              type="button"
              className={`lvm-mobile-step-pill ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
              onClick={() => {
                if (selectedStudentIds.length > 0) setStep(2);
              }}
              disabled={selectedStudentIds.length === 0}
            >
              <div className="lvm-mobile-step-bubble">
                {step > 2 ? <Check size={12} strokeWidth={3} /> : '2'}
              </div>
              <span>Offense</span>
            </button>

            <button
              type="button"
              className={`lvm-mobile-step-pill ${step === 3 ? 'active' : ''}`}
              onClick={() => {
                if (selectedStudentIds.length > 0 && selectedViolationIds.length > 0) setStep(3);
              }}
              disabled={selectedStudentIds.length === 0 || selectedViolationIds.length === 0}
            >
              <div className="lvm-mobile-step-bubble">3</div>
              <span>Status &amp; SMS</span>
            </button>
          </div>

          {/* Main Container: Sidebar + Content */}
          <div className="lvm-body-container">
            {/* Desktop Left Sidebar */}
            <div className="lvm-sidebar">
              <div className="lvm-stepper-vertical">
                {/* Step 1 */}
                <button
                  type="button"
                  className={`lvm-step-btn ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
                  onClick={() => setStep(1)}
                >
                  <div className={`lvm-step-bubble ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                    {step > 1 ? <Check size={16} strokeWidth={3} /> : '1'}
                  </div>
                  <span className="lvm-step-name">Student</span>
                </button>

                {/* Step 2 */}
                <button
                  type="button"
                  className={`lvm-step-btn ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
                  onClick={() => {
                    if (selectedStudentIds.length > 0) setStep(2);
                  }}
                  disabled={selectedStudentIds.length === 0}
                >
                  <div className={`lvm-step-bubble ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                    {step > 2 ? <Check size={16} strokeWidth={3} /> : '2'}
                  </div>
                  <span className="lvm-step-name">Offense</span>
                </button>

                {/* Step 3 */}
                <button
                  type="button"
                  className={`lvm-step-btn ${step === 3 ? 'active' : ''}`}
                  onClick={() => {
                    if (selectedStudentIds.length > 0 && selectedViolationIds.length > 0) setStep(3);
                  }}
                  disabled={selectedStudentIds.length === 0 || selectedViolationIds.length === 0}
                >
                  <div className={`lvm-step-bubble ${step === 3 ? 'active' : ''}`}>
                    3
                  </div>
                  <span className="lvm-step-name">Status &amp; SMS</span>
                </button>
              </div>

              {/* Sidebar Motto Badge */}
              <div className="lvm-motto-wrap">
                <img
                  className="lvm-motto-logo"
                  src={isDark ? '/images/violation-motto-dark.png' : '/images/violation-motto-light.png'}
                  alt="Discipline Builds Character — Report, Guide, Support"
                />
              </div>
            </div>

            {/* Right Main Content */}
            <div className="lvm-main-panel">
              <div className="lvm-content-scroll">

                {/* ================= STEP 1: STUDENT SELECTION (IMAGE 1 SPEC) ================= */}
                {step === 1 && (
                  <div className="lvm-card">
                    {/* Header */}
                    <div className="lvm-section-header">
                      <div className="lvm-section-header-left">
                        <div className="lvm-section-icon-badge">
                          <User size={22} />
                        </div>
                        <div>
                          <h3 className="lvm-section-title">
                            Student Information <span className="req">*</span>
                          </h3>
                          <p className="lvm-section-subtitle">
                            Search and select the student you want to log a violation for.
                          </p>
                        </div>
                      </div>
                      {selectedStudentIds.length > 0 && (
                        <div className="lvm-counter-text">
                          {selectedStudentIds.length} {selectedStudentIds.length === 1 ? 'student' : 'students'} selected
                        </div>
                      )}
                    </div>

                    {/* Search Bar */}
                    <div className="lvm-search-wrap">
                      <Search className="lvm-search-icon" size={18} />
                      <input
                        type="text"
                        className="lvm-search-input"
                        placeholder="Search student by name, ID, or section..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                      />
                    </div>

                    {/* Grade Filters */}
                    <div className="lvm-filter-bar">
                      <div className="lvm-filter-pills">
                        {Array.from({ length: 6 }, (_, index) => String(index + 7)).map((grade) => (
                          <button
                            key={grade}
                            type="button"
                            className={`lvm-pill-btn ${gradeFilter === grade ? 'active' : ''}`}
                            aria-pressed={gradeFilter === grade}
                            onClick={() => setGradeFilter((current) => current === grade ? '' : grade)}
                          >
                            Grade {grade}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="lvm-student-items">
                      {filteredStudents.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px' }}>
                          No students found matching your search.
                        </div>
                      ) : (
                        filteredStudents.map((s) => {
                          const isSelected = selectedStudentIds.includes(Number(s.id));
                          const genderClass = (s.gender || 'male').toLowerCase() === 'female' ? 'female' : 'male';
                          const gradeSection = s.grade && s.section ? `${s.grade} - Section ${s.section}` : s.section || s.grade || 'General';

                          return (
                            <div
                              key={s.id}
                              className={`lvm-student-row ${isSelected ? 'selected' : ''}`}
                              role="button"
                              tabIndex={0}
                              aria-pressed={isSelected}
                              onClick={() => toggleSelectStudent(s.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  toggleSelectStudent(s.id);
                                }
                              }}
                            >
                              {/* Left Avatar + Meta */}
                              <div className="lvm-student-main">
                                <div className="lvm-student-photo">
                                  {s.image ? (
                                    <img src={s.image} alt={s.fname} />
                                  ) : (
                                    <User size={22} />
                                  )}
                                </div>
                                <div className="lvm-student-text">
                                  <div className="lvm-student-name">
                                    {s.fname} {s.mname ? `${s.mname} ` : ''}{s.lname}
                                  </div>
                                  <div className="lvm-student-subrow">
                                    <span className="lvm-student-id-txt">{s.student_id || `ID #${s.id}`}</span>
                                    <span className={`lvm-student-gender-badge ${genderClass}`}>
                                      {s.gender || 'Male'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Middle Grade / Department */}
                              <div className="lvm-student-grade-info">
                                <div className="lvm-student-grade-line">{gradeSection}</div>
                                <div className="lvm-student-dept-line">
                                  {s.track || s.strand || 'Senior High School'}
                                </div>
                              </div>

                              {isSelected && (
                                <span className="lvm-selection-check" aria-hidden="true">
                                  <Check size={14} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Can't find student notice */}
                    <div className="lvm-info-callout">
                      <Info className="lvm-info-callout-icon" size={18} />
                      <div>
                        <div className="lvm-info-callout-heading">Can't find the student?</div>
                        <div className="lvm-info-callout-body">
                          Make sure the name, ID, or section is correct. You can also try a different filter.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= STEP 2: VIOLATION OFFENSE (IMAGE 2 SPEC) ================= */}
                {step === 2 && (
                  <div className="lvm-card lvm-offense-card">
                    {/* Header */}
                    <div className="lvm-section-header">
                      <div className="lvm-section-header-left">
                        <div className="lvm-section-icon-badge">
                          <ShieldAlert size={22} />
                        </div>
                        <div>
                          <h3 className="lvm-section-title">
                            Violation Offense Category <span className="req">*</span>
                          </h3>
                        </div>
                      </div>
                      <div className="lvm-counter-text">
                        {selectedViolationIds.length} Selected
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="lvm-search-wrap">
                      <Search className="lvm-search-icon" size={18} />
                      <input
                        type="text"
                        className="lvm-search-input"
                        placeholder="Search infractions by keyword..."
                        value={violationSearch}
                        onChange={(e) => setViolationSearch(e.target.value)}
                      />
                    </div>

                    {/* Filter Pills */}
                    <div className="lvm-filter-bar">
                      <div className="lvm-filter-pills">
                        <button
                          type="button"
                          className={`lvm-pill-btn ${violationCategory === 'All' ? 'active' : ''}`}
                          onClick={() => setViolationCategory('All')}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          className={`lvm-pill-btn minor ${violationCategory === 'Minor' ? 'active' : ''}`}
                          aria-pressed={violationCategory === 'Minor'}
                          onClick={() => setViolationCategory('Minor')}
                        >
                          <Info size={14} aria-hidden="true" />
                          Minor
                        </button>
                        <button
                          type="button"
                          className={`lvm-pill-btn serious ${violationCategory === 'Serious' ? 'active' : ''}`}
                          aria-pressed={violationCategory === 'Serious'}
                          onClick={() => setViolationCategory('Serious')}
                        >
                          <AlertTriangle size={14} aria-hidden="true" />
                          Serious
                        </button>
                        <button
                          type="button"
                          className={`lvm-pill-btn major ${violationCategory === 'Major' ? 'active' : ''}`}
                          aria-pressed={violationCategory === 'Major'}
                          onClick={() => setViolationCategory('Major')}
                        >
                          <AlertOctagon size={14} aria-hidden="true" />
                          Major
                        </button>
                      </div>
                    </div>

                    {/* 2-Column Offense Grid with Circular Icons */}
                    <div className="lvm-offense-grid">
                      {filteredViolations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 0', color: '#94a3b8', fontSize: '13px', gridColumn: 'span 2' }}>
                          No infractions found matching your search.
                        </div>
                      ) : (
                        filteredViolations.map((v) => {
                          const isSelected = selectedViolationIds.includes(Number(v.id));
                          const catType = (v.type || v.category || 'Minor').toLowerCase();
                          const { Icon: OffenseIcon, diskClass } = getOffenseVisual(v.type || v.category);

                          return (
                            <div
                              key={v.id}
                              className={`lvm-offense-tile ${isSelected ? 'selected' : ''}`}
                              onClick={() => toggleSelectViolation(v.id)}
                            >
                              <div className="lvm-offense-tile-left">
                                <div className={`lvm-icon-disk ${diskClass}`}>
                                  <OffenseIcon size={20} strokeWidth={2.2} />
                                </div>
                                <div className="lvm-offense-tile-meta">
                                  <div className="lvm-offense-tile-title" title={v.title}>
                                    {v.title}
                                  </div>
                                  <div className="lvm-offense-tile-sanction">
                                    Sanction: {v.default_sanction || v.sanction || '1hr Offense | Written Reprimand'}
                                  </div>
                                </div>
                              </div>

                              <div className="lvm-offense-tile-right">
                                <span className={`lvm-category-tag ${catType}`}>
                                  {v.type || 'Minor'}
                                </span>
                                {isSelected && (
                                  <span className="lvm-selection-check" aria-hidden="true">
                                    <Check size={14} strokeWidth={3} />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Prescribed Sanction Field */}
                    <div className="lvm-form-block">
                      <label className="lvm-form-label">
                        Prescribed Sanction / Corrective Measure
                      </label>
                      <input
                        type="text"
                        className="lvm-text-field"
                        placeholder="e.g., 1hr Offense: Written Reprimand, Community Service..."
                        value={formData.sanction}
                        onChange={(e) => setFormData({ ...formData, sanction: e.target.value })}
                      />
                    </div>

                    {/* Incident Details & Remarks */}
                    <div className="lvm-form-block">
                      <label className="lvm-form-label">
                        Incident Details &amp; Faculty Remarks
                        <span className="lvm-form-label-opt">(Optional)</span>
                      </label>
                      <textarea
                        className="lvm-text-area"
                        placeholder="Specify location, witnesses, circumstances, or confiscated items..."
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* ================= STEP 3: STATUS, SMS & SUMMARY (IMAGE 3 SPEC) ================= */}
                {step === 3 && (
                  <div className="lvm-card">
                    {/* Header */}
                    <div className="lvm-section-header">
                      <div className="lvm-section-header-left">
                        <div className="lvm-section-icon-badge">
                          <FileText size={22} />
                        </div>
                        <div>
                          <h3 className="lvm-section-title">
                            Violation Status &amp; SMS <span className="req">*</span>
                          </h3>
                          <p className="lvm-section-subtitle">
                            Set the current status of the violation and notify the guardian (optional).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Teacher Role Security Warning Banner */}
                    {isTeacher && (
                      <div className="lvm-teacher-warning-box">
                        <div className="lvm-teacher-warning-icon">
                          <AlertTriangle size={20} strokeWidth={2.4} />
                        </div>
                        <div className="lvm-teacher-warning-content">
                          <div className="lvm-teacher-warning-title">
                            Faculty Submission Policy: Under Administrative Approval Only
                          </div>
                          <div className="lvm-teacher-warning-desc">
                            Teachers are authorized to file violation reports exclusively under <strong>For Approval</strong> status. Direct case resolution and parent SMS dispatch are restricted to Prefect of Discipline and Authorized Administrators once the incident is verified.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Status Options Grid */}
                    <div className="lvm-form-block">
                      <label className="lvm-form-label">
                        Violation Status <span style={{ color: '#ef4444' }}>*</span>
                        {isTeacher && (
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#f59e0b', marginLeft: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Lock size={12} /> Locked for Faculty
                          </span>
                        )}
                      </label>
                      <div className={`lvm-status-quad ${isTeacher ? 'teacher-mode' : ''}`}>
                        {[
                          { id: 'Under Approval', label: 'For Approval', sub: 'Awaiting admin review', teacherAllowed: true },
                          { id: 'Pending', label: 'Pending', sub: 'Under review', teacherAllowed: false },
                          { id: 'Resolved', label: 'Resolved', sub: 'Already dealt with', teacherAllowed: false },
                          { id: 'Escalated', label: 'Escalated', sub: 'Referred to admin', teacherAllowed: false },
                          { id: 'Dismissed', label: 'Dismissed', sub: 'No violation found', teacherAllowed: false }
                        ].map((st) => {
                          const isLockedForTeacher = isTeacher && !st.teacherAllowed;
                          const isActive = formData.status === st.id;
                          return (
                            <div
                              key={st.id}
                              className={`lvm-status-card-opt ${isActive ? 'active' : ''} ${isLockedForTeacher ? 'disabled-status' : ''}`}
                              onClick={() => {
                                if (isLockedForTeacher) return;
                                setFormData({ ...formData, status: st.id });
                              }}
                              style={isLockedForTeacher ? { opacity: 0.45, cursor: 'not-allowed', filter: 'grayscale(0.6)' } : {}}
                              title={isLockedForTeacher ? 'Faculty accounts can only submit reports Under Approval' : ''}
                            >
                              <div className="lvm-radio-ring">
                                <div className="lvm-radio-dot" />
                              </div>
                              <div className="lvm-status-meta">
                                <span className="lvm-status-h" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {st.label}
                                  {isLockedForTeacher && <Lock size={11} color="#94a3b8" />}
                                </span>
                                <span className="lvm-status-subh">{st.sub}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SMS Box */}
                    <div className={`lvm-sms-box ${isTeacher ? 'disabled-for-teacher' : ''}`}>
                      <div className="lvm-sms-topline">
                        <div className="lvm-sms-topline-left">
                          <div className="lvm-sms-icon-disk" style={isTeacher ? { opacity: 0.6 } : {}}>
                            <MessageSquare size={18} />
                          </div>
                          <div>
                            <div className="lvm-sms-h">
                              Send SMS to Guardian <span>(Optional)</span>
                              {isTeacher && (
                                <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '11px', marginLeft: '6px' }}>
                                  (Disabled for Teachers)
                                </span>
                              )}
                            </div>
                            <div className="lvm-sms-p">
                              {isTeacher
                                ? 'SMS dispatch is restricted to Admin approval to ensure institutional compliance.'
                                : "Notify the student's guardian about the violation."}
                            </div>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <div
                          className="lvm-toggle-row"
                          onClick={() => {
                            if (isTeacher) return;
                            setFormData({ ...formData, sendSMS: !formData.sendSMS });
                          }}
                          style={isTeacher ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                          title={isTeacher ? 'SMS dispatch requires administrative clearance' : ''}
                        >
                          <div className={`lvm-switch-rail ${(!isTeacher && formData.sendSMS) ? 'active' : ''}`} style={isTeacher ? { background: '#cbd5e1' } : {}}>
                            <div className="lvm-switch-circle" />
                          </div>
                          <span className="lvm-switch-txt" style={isTeacher ? { color: '#94a3b8' } : {}}>Send SMS</span>
                        </div>
                      </div>

                      {/* 3 Inputs Grid (Disabled for teacher) */}
                      <div className="lvm-sms-grid-3" style={isTeacher ? { opacity: 0.45, pointerEvents: 'none' } : {}}>
                        <div className="lvm-form-block">
                          <label className="lvm-form-label">Guardian Contact Number</label>
                          <div className="lvm-input-icon-wrap">
                            <Phone className="lvm-input-icon-left" size={16} />
                            <input
                              type="text"
                              className="lvm-iconic-input"
                              placeholder="e.g. 09xx xxx xxxx"
                              disabled={isTeacher}
                              value={formData.guardianContact}
                              onChange={(e) => setFormData({ ...formData, guardianContact: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="lvm-form-block">
                          <label className="lvm-form-label">SMS Template</label>
                          <div className="lvm-input-icon-wrap">
                            <FileText className="lvm-input-icon-left" size={16} />
                            <select
                              className="lvm-iconic-select"
                              disabled={isTeacher}
                              value={formData.smsTemplate}
                              onChange={(e) => setFormData({ ...formData, smsTemplate: e.target.value })}
                            >
                              <option value="standard">Select template</option>
                              <option value="notice">Standard Disciplinary Notice</option>
                              <option value="urgent">Urgent Guardian Conference</option>
                              <option value="attendance">Tardiness / Truancy Notice</option>
                            </select>
                          </div>
                        </div>

                        <div className="lvm-form-block">
                          <label className="lvm-form-label">
                            Custom Message <span className="lvm-form-label-opt">(Optional)</span>
                          </label>
                          <div className="lvm-sms-custom-block">
                            <MessageSquare className="lvm-sms-custom-icon" size={15} />
                            <textarea
                              className="lvm-sms-memo"
                              placeholder="Add a custom message..."
                              maxLength={160}
                              disabled={isTeacher}
                              value={formData.customMessage}
                              onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                            />
                            <span className="lvm-sms-counter">
                              {formData.customMessage.length}/160
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Notice */}
                      <div className="lvm-info-callout" style={{ background: '#f8fafc', borderColor: '#e2e8f0', marginTop: 0 }}>
                        <Info className="lvm-info-callout-icon" size={16} />
                        <div className="lvm-info-callout-body" style={{ fontSize: '11.5px' }}>
                          The SMS will be sent to the guardian's registered contact number. Make sure the number is correct to avoid delivery issues.
                        </div>
                      </div>
                    </div>

                    {/* Incident Summary Card */}
                    <div className="lvm-summary-card">
                      <div className="lvm-summary-bar">
                        <div className="lvm-summary-bar-left">
                          <div className="lvm-summary-disk">
                            <FileText size={16} />
                          </div>
                          <span className="lvm-summary-h">Incident Summary</span>
                        </div>
                        <button
                          type="button"
                          className="lvm-summary-pencil-btn"
                          onClick={() => setStep(1)}
                        >
                          <Edit size={13} />
                          <span>Edit</span>
                        </button>
                      </div>

                      <div className="lvm-summary-body">
                        <div className="lvm-summary-entry">
                          <strong>Student:</strong>
                          <span>
                            {chosenStudents.map((s) => `${s.fname} ${s.lname} (${s.student_id || `ST-${s.id}`})`).join(', ') || 'None selected'}
                          </span>
                        </div>
                        <div className="lvm-summary-entry">
                          <strong>Offense:</strong>
                          <span>
                            {chosenViolations.map((v) => v.title).join(', ') || 'None selected'}
                          </span>
                        </div>
                        <div className="lvm-summary-entry">
                          <strong>Status:</strong>
                          <span>{formData.status === 'Under Approval' ? 'For Approval' : formData.status}</span>
                        </div>
                        <div className="lvm-summary-entry">
                          <strong>Notified:</strong>
                          <span>{formData.sendSMS ? `Yes (${formData.guardianContact || 'Guardian Contact'})` : 'No'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Bottom Sticky Action Footer */}
              <div className="lvm-bottom-bar">
                {step === 1 ? (
                  <button
                    type="button"
                    className="lvm-ghost-btn"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    type="button"
                    className="lvm-ghost-btn"
                    onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                  >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                  </button>
                )}

                {step === 1 ? (
                  <button
                    type="button"
                    className="lvm-cta-btn"
                    onClick={handleNextToStep2}
                    disabled={selectedStudentIds.length === 0}
                  >
                    <span>Next: Offense</span>
                    <ArrowRight size={16} />
                  </button>
                ) : step === 2 ? (
                  <button
                    type="button"
                    className="lvm-cta-btn"
                    onClick={handleNextToStep3}
                    disabled={selectedViolationIds.length === 0}
                  >
                    <span>Next: Status &amp; SMS</span>
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="lvm-cta-btn"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    <span>
                      {loading
                        ? 'Processing...'
                        : isTeacher
                        ? 'Submit For Approval'
                        : 'Next: SMS & Complete'}
                    </span>
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddViolationModal;
