import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { QrCode, Camera } from 'lucide-react';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { useNotification } from '../context/NotificationContext';
import { matchStudentFromScan } from '../utils/qrHelper';
import { decodeQRFromImage } from '../utils/qrImageDecoder';

// Custom Hooks
import { useCameraScanner } from '../hooks/useCameraScanner';
import { useScannerFeedback } from '../hooks/useScannerFeedback';

// Modular Scanner Subcomponents
import { ScannerFeedbackMenu } from '../components/scanner/ScannerFeedbackMenu';
import { ScannerCameraDropdown } from '../components/scanner/ScannerCameraDropdown';
import { ScannerViewfinder } from '../components/scanner/ScannerViewfinder';
import { ScannerControlsBar } from '../components/scanner/ScannerControlsBar';
import { ScannerManualSearch } from '../components/scanner/ScannerManualSearch';
import { ScanProcessingModal } from '../components/scanner/ScanProcessingModal';
import { ScannedStudentModal } from '../components/scanner/ScannedStudentModal';
import { ScannerLocationOverlay } from '../components/scanner/ScannerLocationOverlay';

export const ScanQRPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error, info } = useNotification();

  const queryStudentId = searchParams.get('id') || searchParams.get('student_id');
  const queryLrn = searchParams.get('lrn');

  // Geolocation States
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Requesting device location...');

  // Student & Data States
  const [allStudents, setAllStudents] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [scannedStudent, setScannedStudent] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);

  // Staged Verification Animation States
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanProcessingStep, setScanProcessingStep] = useState('');
  const [scanProcessingSubstep, setScanProcessingSubstep] = useState('');
  const [scanProgressPercent, setScanProgressPercent] = useState(0);

  const fileInputRef = useRef(null);
  const manualInputRef = useRef(null);

  // Hook 1: Audio & Haptic Feedback
  const {
    feedbackConfig,
    isFeedbackMenuOpen,
    setIsFeedbackMenuOpen,
    feedbackMenuRef,
    handleUpdateFeedback,
    playScanSuccessSound,
    playScanErrorSound
  } = useScannerFeedback();

  // Load initial student directory
  useEffect(() => {
    let isMounted = true;
    dataService.getStudents()
      .then(list => {
        if (isMounted) setAllStudents(list || []);
      })
      .catch(console.error);
    return () => {
      isMounted = false;
    };
  }, []);

  const loadStudentRecords = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const allRecords = await dataService.getRecords(true);
      const studentHistory = (allRecords || []).filter(
        r =>
          Number(r.student?.id || r.student_id) === Number(studentId) &&
          r.status !== 'Rejected' &&
          r.approval_status !== 'Rejected'
      );
      setStudentRecords(studentHistory);
    } catch (e) {
      console.error('Error loading student records:', e);
    }
  }, []);

  const lastScannedStudentIdRef = useRef('');
  const lastScannedStudentTimeRef = useRef(0);
  const cameraScannerRef = useRef(null);

  // Staged Verification Sequence with Cryptographic Anti-Tamper & Anti-Passback Guards
  const processScanWithAnimation = useCallback(async (rawInput) => {
    setIsProcessingScan(true);
    setScanProgressPercent(25);
    setScanProcessingStep('Scanning visual QR matrix...');
    setScanProcessingSubstep('Optical code captured from device');

    try {
      const isSignedFormat = typeof rawInput === 'string' && (rawInput.trim().startsWith('VT2:') || rawInput.trim().startsWith('VT1:'));
      const students = allStudents.length > 0 ? allStudents : await dataService.getStudents();
      const matched = matchStudentFromScan(rawInput, students);

      await new Promise(r => setTimeout(r, 350));

      if (matched) {
        const now = Date.now();
        const lastId = lastScannedStudentIdRef.current;
        const lastTime = lastScannedStudentTimeRef.current;
        const isRecentScan = lastId === String(matched.id || matched.student_id) && (now - lastTime < 60000);
        const secondsAgo = isRecentScan ? Math.max(1, Math.round((now - lastTime) / 1000)) : null;

        lastScannedStudentIdRef.current = String(matched.id || matched.student_id);
        lastScannedStudentTimeRef.current = now;

        setScanProgressPercent(70);
        setScanProcessingStep(
          matched._isSignedBadge
            ? '🛡️ Cryptographic Signature Verified (HMAC-SHA256)'
            : 'QR Code Verified! Locating student record...'
        );
        setScanProcessingSubstep(`Student: ${matched.fname} ${matched.lname} (${matched.student_id || matched.id})`);

        await new Promise(r => setTimeout(r, 450));

        setScanProgressPercent(100);
        setScanProcessingStep('Student Record Verified!');
        setScanProcessingSubstep(
          isRecentScan
            ? `⚠️ Re-scanned ${secondsAgo}s ago (Anti-Passback Alert)`
            : 'Loading disciplinary summary...'
        );

        await new Promise(r => setTimeout(r, 250));

        setIsProcessingScan(false);
        setScanProcessingStep('');
        setScanProcessingSubstep('');
        setScanProgressPercent(0);

        playScanSuccessSound();
        const studentWithMeta = {
          ...matched,
          _passbackSecondsAgo: secondsAgo
        };
        setScannedStudent(studentWithMeta);
        loadStudentRecords(matched.id);

        if (isRecentScan) {
          info(`⚠️ Anti-Passback Alert: Student re-scanned (${secondsAgo}s ago)`);
        } else {
          success(`Student Identified: ${matched.fname} ${matched.lname} (${matched.student_id || matched.id})`);
        }
      } else if (isSignedFormat) {
        setScanProgressPercent(100);
        setScanProcessingStep('❌ SECURITY ALERT: Forged / Tampered QR Signature!');
        setScanProcessingSubstep('Cryptographic HMAC-SHA256 signature does not match institutional records.');

        playScanErrorSound();
        error('SECURITY ALERT: Invalid or Forged Cryptographic QR Signature detected!');

        await new Promise(r => setTimeout(r, 3800));

        setIsProcessingScan(false);
        setScanProcessingStep('');
        setScanProcessingSubstep('');
        setScanProgressPercent(0);
        cameraScannerRef.current?.unlockScan();
      } else {
        setScanProgressPercent(100);
        setScanProcessingStep('Invalid / Unrecognized QR Code');
        setScanProcessingSubstep('No registered student record matches this QR payload');

        playScanErrorSound();
        error('Invalid QR Code: Unrecognized student ID or badge');

        await new Promise(r => setTimeout(r, 3000));

        setIsProcessingScan(false);
        setScanProcessingStep('');
        setScanProcessingSubstep('');
        setScanProgressPercent(0);
        cameraScannerRef.current?.unlockScan();
      }
    } catch {
      setIsProcessingScan(false);
      setScanProcessingStep('');
      setScanProcessingSubstep('');
      setScanProgressPercent(0);
      playScanErrorSound();
      error('Invalid QR Code: Scan processing failed');
      cameraScannerRef.current?.unlockScan();
    }
  }, [allStudents, loadStudentRecords, playScanSuccessSound, playScanErrorSound, success, error, info]);

  // Hook 2: Camera Hardware Lifecycle
  const cameraScanner = useCameraScanner({
    onScan: processScanWithAnimation,
    isEnabled: !queryStudentId && !queryLrn && !isCapturingLocation
  });
  cameraScannerRef.current = cameraScanner;

  const handleCloseStudentModal = useCallback(() => {
    setScannedStudent(null);
    setStudentRecords([]);
    cameraScannerRef.current?.unlockScan();
  }, []);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && scannedStudent && !isViolationModalOpen) {
        handleCloseStudentModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannedStudent, isViolationModalOpen, handleCloseStudentModal]);

  // Handle external QR scan from URL parameter
  useEffect(() => {
    if (queryStudentId || queryLrn) {
      let isCancelled = false;
      setIsCapturingLocation(true);
      setLocationStatus('Capturing GPS location from QR scan...');

      const runExternalScan = async () => {
        if ('geolocation' in navigator) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
            });
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const accuracy = Math.round(position.coords.accuracy);
            if (!isCancelled) {
              setLocationStatus(`✅ GPS location captured (±${accuracy}m accuracy)! Opening record...`);
            }
            localStorage.setItem('viotrack_user_lat', lat.toString());
            localStorage.setItem('viotrack_user_lng', lng.toString());
            localStorage.setItem('viotrack_user_accuracy', accuracy.toString());
          } catch {
            if (!isCancelled) setLocationStatus('Opening record...');
            localStorage.removeItem('viotrack_user_lat');
            localStorage.removeItem('viotrack_user_lng');
            localStorage.removeItem('viotrack_user_accuracy');
          }
        } else {
          localStorage.removeItem('viotrack_user_lat');
          localStorage.removeItem('viotrack_user_lng');
          localStorage.removeItem('viotrack_user_accuracy');
        }

        let targetId = queryStudentId;
        if (!targetId && queryLrn) {
          const students = await dataService.getStudents();
          const matched = students.find(s => s.student_id.trim() === queryLrn.trim());
          if (matched) targetId = matched.id;
        }

        setTimeout(() => {
          if (isCancelled) return;
          if (targetId) {
            playScanSuccessSound();
            navigate(`/student-violation/${targetId}?from_qr=1`);
          } else {
            setIsCapturingLocation(false);
            playScanErrorSound();
            error('Invalid QR Code');
          }
        }, 900);
      };

      runExternalScan();

      return () => {
        isCancelled = true;
      };
    }
  }, [queryStudentId, queryLrn, navigate, playScanSuccessSound, playScanErrorSound, error]);

  // Upload QR Image File with Multi-Engine Fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingScan(true);
    setScanProgressPercent(15);
    setScanProcessingStep('Scanning visual QR matrix from image...');
    setScanProcessingSubstep('Optical code captured from image file');
    const startTime = Date.now();

    try {
      const decodedText = await decodeQRFromImage(file, 'qr-hidden-file-decoder');

      if (decodedText) {
        await processScanWithAnimation(decodedText);
      } else {
        const elapsed = Date.now() - startTime;
        if (elapsed < 1200) {
          await new Promise(r => setTimeout(r, 1200 - elapsed));
        }
        setIsProcessingScan(false);
        setScanProcessingStep('');
        setScanProcessingSubstep('');
        setScanProgressPercent(0);
        playScanErrorSound();
        error('Could not detect QR code in this image. Please ensure the QR code is clearly visible.');
      }
    } catch (err) {
      setIsProcessingScan(false);
      setScanProcessingStep('');
      setScanProcessingSubstep('');
      setScanProgressPercent(0);
      playScanErrorSound();
      error('Failed to read image file: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTogglePause = () => {
    const isPaused = cameraScanner.handleTogglePause();
    if (isPaused) {
      info('Scanner paused.');
    } else {
      info('Scanner resumed.');
    }
  };

  if (isCapturingLocation) {
    return (
      <ScannerLocationOverlay
        isCapturingLocation={isCapturingLocation}
        locationStatus={locationStatus}
      />
    );
  }

  return (
    <div className="scan-qr-page">
      {/* 1. Standard App Page Banner Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <QrCode size={26} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--brand-blue, #07345f)' }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--text-primary, #0f172a)', letterSpacing: '-0.02em' }}>
              Student QR Scanner &amp; Tracker
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Scan printed student ID badges using device camera or search via Student ID.
            </p>
          </div>
        </div>
      </div>

      {/* Main Two-Column Scanner Grid */}
      <div className="scanner-grid-container">
        <div className="scanner-card">
          <div className="scanner-card-header">
            <h3 className="scanner-card-title">
              <Camera size={18} color="#07345f" />
              Live Camera Feed
            </h3>

            <div className="scanner-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Sound & Haptic Feedback Settings Dropdown */}
              <ScannerFeedbackMenu
                feedbackConfig={feedbackConfig}
                isFeedbackMenuOpen={isFeedbackMenuOpen}
                setIsFeedbackMenuOpen={setIsFeedbackMenuOpen}
                feedbackMenuRef={feedbackMenuRef}
                onUpdateFeedback={handleUpdateFeedback}
              />

              {/* Custom Camera Device Picker Dropdown */}
              <ScannerCameraDropdown
                availableCameras={cameraScanner.availableCameras}
                selectedCameraId={cameraScanner.selectedCameraId}
                activeCamera={cameraScanner.activeCamera}
                activeCameraLabel={cameraScanner.activeCameraLabel}
                cameraFacing={cameraScanner.cameraFacing}
                onSelectCamera={cameraScanner.handleSelectCamera}
              />
            </div>
          </div>

          {/* Video Viewport Container */}
          <ScannerViewfinder
            isFrontCamera={cameraScanner.isFrontCamera}
            cameraError={cameraScanner.cameraError}
            hasCameraPermission={cameraScanner.hasCameraPermission}
            isScannerRunning={cameraScanner.isScannerRunning}
            isScanningPaused={cameraScanner.isScanningPaused}
            isStartingCamera={cameraScanner.isStartingCamera}
            cameraStartupStep={cameraScanner.cameraStartupStep}
            isRequestingPermission={cameraScanner.isRequestingPermission}
            handleRequestCameraAccess={cameraScanner.handleRequestCameraAccess}
            handleRetryCamera={cameraScanner.handleRetryCamera}
            onTriggerFileUpload={() => fileInputRef.current?.click()}
            onFocusManualInput={() => {
              if (manualInputRef.current) {
                manualInputRef.current.focus();
                manualInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            activeCameraLabel={cameraScanner.activeCameraLabel}
            availableCameras={cameraScanner.availableCameras}
            selectedCameraId={cameraScanner.selectedCameraId}
            onSelectCamera={cameraScanner.handleSelectCamera}
          />

          {/* Scanner Controls Bar */}
          <ScannerControlsBar
            isFrontCamera={cameraScanner.isFrontCamera}
            isScanningPaused={cameraScanner.isScanningPaused}
            isProcessingScan={isProcessingScan}
            onToggleMirror={() => cameraScanner.setIsMirrored(prev => (prev !== null ? !prev : !cameraScanner.isFrontCamera))}
            onToggleCameraFacing={cameraScanner.handleToggleCameraFacing}
            onTogglePause={handleTogglePause}
            onTriggerFileUpload={() => fileInputRef.current?.click()}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
          />

          {/* Manual Search & Quick Selection Fallback */}
          <ScannerManualSearch
            manualInputRef={manualInputRef}
            manualQuery={manualQuery}
            setManualQuery={setManualQuery}
            onSearch={processScanWithAnimation}
            allStudents={allStudents}
            onSelectStudentChip={(s) => {
              setScannedStudent(s);
              loadStudentRecords(s.id);
              playScanSuccessSound();
              success(`Selected: ${s.fname} ${s.lname}`);
            }}
          />
        </div>
      </div>

      {/* Staged Loading & Verification Modal Overlay */}
      <ScanProcessingModal
        isProcessingScan={isProcessingScan}
        scanProcessingStep={scanProcessingStep}
        scanProcessingSubstep={scanProcessingSubstep}
        scanProgressPercent={scanProgressPercent}
        onDismissError={() => {
          setIsProcessingScan(false);
          setScanProcessingStep('');
          setScanProcessingSubstep('');
          setScanProgressPercent(0);
          cameraScanner.unlockScan();
        }}
      />

      {/* Verified Student Conduct Modal Popup */}
      <ScannedStudentModal
        scannedStudent={scannedStudent}
        studentRecords={studentRecords}
        onClose={handleCloseStudentModal}
        onLogViolation={() => setIsViolationModalOpen(true)}
        onViewFullProfile={() => navigate(`/student-violation/${scannedStudent.id}`)}
      />

      {/* Log Violation Modal for Verified Student */}
      {scannedStudent && (
        <AddViolationModal
          isOpen={isViolationModalOpen}
          onClose={() => setIsViolationModalOpen(false)}
          preselectedStudentId={scannedStudent.id}
          requireAccurateLocation
          onRecordAdded={async () => {
            setIsViolationModalOpen(false);
            if (scannedStudent?.id) {
              await loadStudentRecords(scannedStudent.id);
            }
          }}
        />
      )}

      {/* Hidden container for background file-based QR decoding */}
      <div id="qr-hidden-file-decoder" style={{ display: 'none' }} />
    </div>
  );
};

export default ScanQRPage;
