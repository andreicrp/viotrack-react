import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  QrCode,
  Search,
  AlertTriangle,
  CheckCircle2,
  Phone,
  ShieldAlert,
  MapPin,
  Loader2,
  Camera,
  CameraOff,
  RefreshCw,
  Pause,
  Play,
  Upload,
  FileSpreadsheet,
  PlusCircle,
  ChevronDown,
  Check,
  X,
  FlipHorizontal,
  UserCheck,
  Volume2,
  VolumeX,
  Volume1,
  Vibrate,
  Sliders,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { useNotification } from '../context/NotificationContext';
import { Html5Qrcode } from 'html5-qrcode';
import { matchStudentFromScan } from '../utils/qrHelper';
import {
  playSuccessChime,
  playErrorBuzz,
  getFeedbackSettings,
  saveFeedbackSettings,
  triggerHapticFeedback
} from '../utils/scannerFeedback';

export const ScanQRPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, error, info } = useNotification();

  const queryStudentId = searchParams.get('id') || searchParams.get('student_id');
  const queryLrn = searchParams.get('lrn');

  // Scanner Feedback States (Audio & Haptics)
  const [feedbackConfig, setFeedbackConfig] = useState(getFeedbackSettings);
  const [isFeedbackMenuOpen, setIsFeedbackMenuOpen] = useState(false);
  const feedbackMenuRef = useRef(null);

  // Scanner States
  const [hasCameraPermission, setHasCameraPermission] = useState(() => {
    return localStorage.getItem('viotrack_qr_camera_allowed') === 'true';
  });
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraStartupStep, setCameraStartupStep] = useState('Initializing camera...');
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' or 'user'
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [isMirrored, setIsMirrored] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Geolocation States
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Requesting device location...');

  // Student & Data States
  const [allStudents, setAllStudents] = useState([]);
  const [manualQuery, setManualQuery] = useState('');
  const [scannedStudent, setScannedStudent] = useState(null);
  const [studentRecords, setStudentRecords] = useState([]);
  const [isViolationModalOpen, setIsViolationModalOpen] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanProcessingStep, setScanProcessingStep] = useState('');
  const [scanProcessingSubstep, setScanProcessingSubstep] = useState('');
  const [scanProgressPercent, setScanProgressPercent] = useState(0);

  const html5QrCodeRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraDropdownRef = useRef(null);
  const manualInputRef = useRef(null);
  const studentDetailRef = useRef(null);
  const isScanningLockedRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);

  const handleCloseStudentModal = () => {
    setScannedStudent(null);
    setStudentRecords([]);
    isScanningLockedRef.current = false;
    lastScannedCodeRef.current = '';
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && scannedStudent && !isViolationModalOpen) {
        handleCloseStudentModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannedStudent, isViolationModalOpen]);

  // Close feedback dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (feedbackMenuRef.current && !feedbackMenuRef.current.contains(e.target)) {
        setIsFeedbackMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateFeedback = (updates) => {
    const next = { ...feedbackConfig, ...updates };
    setFeedbackConfig(next);
    saveFeedbackSettings(next);
  };

  // Play high chime & haptic feedback when QR is scanned successfully
  const playScanSuccessSound = () => {
    playSuccessChime(feedbackConfig.volume);
  };

  // Play double buzz & heavy haptic feedback when QR scan fails / is invalid
  const playScanErrorSound = () => {
    playErrorBuzz(feedbackConfig.volume);
  };

  // Load all students list initially
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const list = await dataService.getStudents();
      setAllStudents(list || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudentRecords = async (studentId) => {
    if (!studentId) return;
    try {
      const allRecords = await dataService.getRecords(true);
      const studentHistory = (allRecords || []).filter(
        r => Number(r.student?.id || r.student_id) === Number(studentId)
      );
      setStudentRecords(studentHistory);
    } catch (e) {
      console.error('Error loading student records:', e);
    }
  };

  // If accessed directly via URL from QR code scan (matching scan-qr.php)
  useEffect(() => {
    if (queryStudentId || queryLrn) {
      handleExternalQRScan(queryStudentId, queryLrn);
    }
  }, [queryStudentId, queryLrn]);

  const handleExternalQRScan = async (sId, lrnVal) => {
    setIsCapturingLocation(true);
    setLocationStatus('Capturing GPS location from QR scan...');

    if ('geolocation' in navigator) {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = Math.round(position.coords.accuracy);
        setLocationStatus(`✅ GPS location captured (±${accuracy}m accuracy)! Opening record...`);
        localStorage.setItem('viotrack_user_lat', lat.toString());
        localStorage.setItem('viotrack_user_lng', lng.toString());
        localStorage.setItem('viotrack_user_accuracy', accuracy.toString());
      } catch {
        setLocationStatus('Opening record...');
        localStorage.removeItem('viotrack_user_lat');
        localStorage.removeItem('viotrack_user_lng');
        localStorage.removeItem('viotrack_user_accuracy');
      }
    } else {
      localStorage.removeItem('viotrack_user_lat');
      localStorage.removeItem('viotrack_user_lng');
      localStorage.removeItem('viotrack_user_accuracy');
    }

    let targetId = sId;
    if (!targetId && lrnVal) {
      const students = await dataService.getStudents();
      const matched = students.find(s => s.lrn.trim() === lrnVal.trim());
      if (matched) targetId = matched.id;
    }

    setTimeout(() => {
      if (targetId) {
        playScanSuccessSound();
        navigate(`/student-violation/${targetId}`);
      } else {
        setIsCapturingLocation(false);
        playScanErrorSound();
        error('Invalid QR Code');
      }
    }, 900);
  };

  const stopScannerInstance = async (scanner) => {
    if (!scanner) return;
    try {
      const isScanning = scanner.isScanning || (typeof scanner.getState === 'function' && scanner.getState() === 2);
      if (isScanning) {
        await scanner.stop().catch(() => {});
      }
      await scanner.clear().catch(() => {});
    } catch (e) {
      // Ignore stop errors
    }
  };

  // Detect if browser camera permission is already granted so we skip any prompt
  useEffect(() => {
    let permissionStatusObj = null;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'camera' })
        .then((status) => {
          permissionStatusObj = status;
          if (status.state === 'granted') {
            setHasCameraPermission(true);
            localStorage.setItem('viotrack_qr_camera_allowed', 'true');
          }
          status.onchange = () => {
            if (status.state === 'granted') {
              setHasCameraPermission(true);
              localStorage.setItem('viotrack_qr_camera_allowed', 'true');
            } else if (status.state === 'denied') {
              setHasCameraPermission(false);
              localStorage.removeItem('viotrack_qr_camera_allowed');
            }
          };
        })
        .catch(() => {
          // Permissions API for camera not supported in some browsers
        });
    }

    return () => {
      if (permissionStatusObj) {
        permissionStatusObj.onchange = null;
      }
    };
  }, []);

  // Initialize camera safely with Html5Qrcode & guarantee cleanup on navigation
  useEffect(() => {
    if (queryStudentId || queryLrn || isCapturingLocation) return;
    if (!hasCameraPermission) return; // Wait until camera permission is allowed

    let isMounted = true;
    let localScanner = null;

    const startScanner = async () => {
      const container = document.getElementById('reader-stream-container');
      if (!container || !isMounted) return;

      try {
        setCameraError(null);
        setIsStartingCamera(true);
        setCameraStartupStep('Connecting to video sensor...');
        localScanner = new Html5Qrcode('reader-stream-container', { verbose: false });
        html5QrCodeRef.current = localScanner;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.75);
            return {
              width: Math.max(180, Math.min(300, edge)),
              height: Math.max(180, Math.min(300, edge))
            };
          },
          aspectRatio: 1.7777777778
        };

        // Determine target camera: If user picked a camera ID (string), use it directly.
        // Otherwise use facingMode constraint object { facingMode: cameraFacing }
        const primaryTarget = selectedCameraId
          ? selectedCameraId
          : { facingMode: cameraFacing };

        let startedSuccessfully = false;
        let lastError = null;

        try {
          await localScanner.start(
            primaryTarget,
            config,
            (decodedText) => {
              if (!isMounted) return;
              const now = Date.now();
              const cleanText = (decodedText || '').trim();
              if (!cleanText) return;

              // Prevent continuous multi-scanning
              if (isScanningLockedRef.current) return;
              if (lastScannedCodeRef.current === cleanText && (now - lastScannedTimeRef.current < 3500)) {
                return;
              }

              // Acquire scan lock
              isScanningLockedRef.current = true;
              lastScannedCodeRef.current = cleanText;
              lastScannedTimeRef.current = now;

              processScanWithAnimation(cleanText);

              // Release lock after cooldown
              setTimeout(() => {
                isScanningLockedRef.current = false;
              }, 6000);
            },
            () => {} // Quiet frame noise
          );

          startedSuccessfully = true;
          if (isMounted) {
            setIsStartingCamera(false);
            setIsScannerRunning(true);
            setCameraError(null);
            setHasCameraPermission(true);
            localStorage.setItem('viotrack_qr_camera_allowed', 'true');

            // Enumerate devices quietly via standard Web API (NO dummy streams or permission prompts)
            if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
              navigator.mediaDevices.enumerateDevices()
                .then((allDevices) => {
                  if (!isMounted) return;
                  const videoDevices = allDevices
                    .filter(d => d.kind === 'videoinput')
                    .map((d, i) => ({
                      id: d.deviceId,
                      label: d.label || (i === 0 ? 'Camera 1' : `Camera ${i + 1}`)
                    }));
                  if (videoDevices.length > 0) {
                    setAvailableCameras(videoDevices);
                  }
                })
                .catch(() => {});
            }
          }
        } catch (err) {
          lastError = err;
        }

        // Secondary fallback if primary facingMode failed (e.g. laptop with only front camera)
        if (!startedSuccessfully && isMounted) {
          const fallbackTarget = { facingMode: cameraFacing === 'environment' ? 'user' : 'environment' };
          try {
            await localScanner.start(
              fallbackTarget,
              { fps: 10, qrbox: { width: 200, height: 200 } },
              (decodedText) => {
                if (!isMounted) return;
                const now = Date.now();
                const cleanText = (decodedText || '').trim();
                if (!cleanText) return;
                if (isScanningLockedRef.current) return;
                if (lastScannedCodeRef.current === cleanText && (now - lastScannedTimeRef.current < 3500)) return;
                isScanningLockedRef.current = true;
                lastScannedCodeRef.current = cleanText;
                lastScannedTimeRef.current = now;
                processScanWithAnimation(cleanText);
                setTimeout(() => {
                  isScanningLockedRef.current = false;
                }, 6000);
              },
              () => {}
            );

            startedSuccessfully = true;
            if (isMounted) {
              setIsStartingCamera(false);
              setIsScannerRunning(true);
              setCameraError(null);
              setHasCameraPermission(true);
              localStorage.setItem('viotrack_qr_camera_allowed', 'true');
            }
          } catch (fallbackErr) {
            lastError = fallbackErr;
          }
        }

        if (!startedSuccessfully && isMounted) {
          console.warn('Camera startup failed:', lastError);
          setIsStartingCamera(false);
          const isPermDenied = lastError?.name === 'NotAllowedError' ||
            lastError?.name === 'PermissionDeniedError' ||
            lastError?.message?.includes('Permission');

          if (isPermDenied) {
            setCameraError('Camera permission was denied. Please allow camera permissions in your browser address bar.');
            setHasCameraPermission(false);
            localStorage.removeItem('viotrack_qr_camera_allowed');
          } else {
            setCameraError('Camera is currently unavailable or in use by another application. You can retry, switch cameras below, or upload a QR image.');
          }
          setIsScannerRunning(false);
        } else if (!isMounted) {
          setIsStartingCamera(false);
          await stopScannerInstance(localScanner);
        }
      } catch (err) {
        console.warn('Camera stream warning:', err);
        if (isMounted) {
          setIsStartingCamera(false);
          const isPermDenied = err?.name === 'NotAllowedError' ||
            err?.name === 'PermissionDeniedError' ||
            err?.message?.includes('Permission');

          if (isPermDenied) {
            setCameraError('Camera permission was denied. Please allow camera permissions in your browser address bar.');
            setHasCameraPermission(false);
            localStorage.removeItem('viotrack_qr_camera_allowed');
          } else {
            setCameraError('Camera is currently unavailable or in use by another application. You can retry, switch cameras below, or upload a QR image.');
          }
          setIsScannerRunning(false);
        }
      }
    };

    const initTimer = setTimeout(startScanner, 100);

    // Global listener when leaving tab or closing window
    const handleBeforeUnload = () => {
      stopScannerInstance(localScanner || html5QrCodeRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      setIsStartingCamera(false);
      setIsScannerRunning(false);
      const toStop = localScanner || html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      stopScannerInstance(toStop);
    };
  }, [cameraFacing, selectedCameraId, queryStudentId, queryLrn, isCapturingLocation, retryCount, hasCameraPermission]);

  // Request Camera Permission Once
  const handleRequestCameraAccess = async () => {
    setIsRequestingPermission(true);
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: cameraFacing }
        });
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      }
      localStorage.setItem('viotrack_qr_camera_allowed', 'true');
      setHasCameraPermission(true);
      setRetryCount(prev => prev + 1);
    } catch (err) {
      console.warn('Camera permission request failed:', err);
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission') || err?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please allow camera permissions in your browser address bar.');
        setHasCameraPermission(false);
        localStorage.removeItem('viotrack_qr_camera_allowed');
      } else {
        localStorage.setItem('viotrack_qr_camera_allowed', 'true');
        setHasCameraPermission(true);
        setRetryCount(prev => prev + 1);
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Retry Camera Initialization
  const handleRetryCamera = async () => {
    setCameraError(null);
    if (html5QrCodeRef.current) {
      await stopScannerInstance(html5QrCodeRef.current);
      html5QrCodeRef.current = null;
    }
    setRetryCount(prev => prev + 1);
  };

  // Flip Front/Back Camera or cycle through all connected devices smoothly
  const handleToggleCameraFacing = async () => {
    if (availableCameras.length > 1) {
      const currentCam = getActiveCamera();
      const currentIdx = availableCameras.findIndex(c => c.id === currentCam?.id);
      const nextIdx = currentIdx >= 0 ? (currentIdx + 1) % availableCameras.length : 0;
      handleSelectCamera(availableCameras[nextIdx].id);
      return;
    }
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    setSelectedCameraId(null);

    setIsStartingCamera(true);
    setCameraStartupStep('Switching camera...');
    if (html5QrCodeRef.current) {
      await stopScannerInstance(html5QrCodeRef.current);
      html5QrCodeRef.current = null;
    }
    setRetryCount(prev => prev + 1);
  };

  // Switch specific camera device from dropdown smoothly
  const handleSelectCamera = async (camId) => {
    setIsCameraDropdownOpen(false);
    setSelectedCameraId(camId);

    // 1. Try instant in-place track constraint switch with deviceId
    if (html5QrCodeRef.current && isScannerRunning) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({ deviceId: { exact: camId } });
        return;
      } catch (e) {
        // Continue to fallback restart if applyConstraints is not supported
      }
    }

    // 2. Fallback: cleanly restart stream with target device
    setIsStartingCamera(true);
    setCameraStartupStep('Switching camera...');
    if (html5QrCodeRef.current) {
      await stopScannerInstance(html5QrCodeRef.current);
      html5QrCodeRef.current = null;
    }
    setRetryCount(prev => prev + 1);
  };

  // Close custom camera dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cameraDropdownRef.current && !cameraDropdownRef.current.contains(event.target)) {
        setIsCameraDropdownOpen(false);
      }
    };
    if (isCameraDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCameraDropdownOpen]);

  // Active Camera Detection
  const getActiveCamera = () => {
    if (selectedCameraId) {
      const found = availableCameras.find(c => c.id === selectedCameraId);
      if (found) return found;
    }
    if (availableCameras.length > 0) {
      if (cameraFacing === 'environment') {
        return availableCameras.find(c => /back|rear|environment/i.test(c.label)) || availableCameras[availableCameras.length - 1] || availableCameras[0];
      } else {
        return availableCameras.find(c => /front|user|facetime|webcam/i.test(c.label)) || availableCameras[0];
      }
    }
    return null;
  };

  const activeCamera = getActiveCamera();
  const activeCameraLabel = activeCamera?.label || (cameraFacing === 'environment' ? 'Rear Camera' : 'Front Camera');
  const isFrontCamera = (() => {
    if (isMirrored !== null) return isMirrored;
    if (cameraFacing === 'user') return true;
    if (activeCamera?.label) {
      if (/front|user|facetime|integrated|selfie|webcam/i.test(activeCamera.label)) return true;
      if (/back|rear|environment/i.test(activeCamera.label)) return false;
    }
    // On laptops / PCs with a single camera or default built-in webcam
    if (availableCameras.length === 1 && !/back|rear|environment/i.test(availableCameras[0]?.label || '')) return true;
    return cameraFacing === 'user';
  })();

  // Pause / Resume Scanning
  const handleTogglePause = () => {
    if (!html5QrCodeRef.current) return;
    try {
      if (isScanningPaused) {
        html5QrCodeRef.current.resume();
        setIsScanningPaused(false);
        info('Scanner resumed.');
      } else {
        html5QrCodeRef.current.pause();
        setIsScanningPaused(true);
        info('Scanner paused.');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  // Helper to normalize image on canvas for high-res/blurry photos
  const preprocessQRImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return resolve(null);

        // Normalize size to comfortable dimension (800px)
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          resolve(blob ? new File([blob], 'preprocessed-qr.png', { type: 'image/png' }) : null);
        }, 'image/png');
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Accurate Staged Verification Sequence with Cryptographic Anti-Tamper & Anti-Passback Guards
  const processScanWithAnimation = async (rawInput) => {
    setIsProcessingScan(true);
    setScanProgressPercent(25);
    setScanProcessingStep('Scanning visual QR matrix...');
    setScanProcessingSubstep('Optical code captured from device');

    try {
      // 1. Check for tampered/forged cryptographic signatures (VT2: / VT1:)
      const isSignedFormat = typeof rawInput === 'string' && (rawInput.trim().startsWith('VT2:') || rawInput.trim().startsWith('VT1:'));
      
      // 2. Fetch active students
      const students = allStudents.length > 0 ? allStudents : await dataService.getStudents();
      
      // 3. Perform strict cryptographic and database verification
      const matched = matchStudentFromScan(rawInput, students);

      // Brief animation for optical matrix scan
      await new Promise(r => setTimeout(r, 350));

      if (matched) {
        // Anti-Passback Guard: Check if scanned within last 60 seconds
        const now = Date.now();
        const isRecentScan = lastScannedCodeRef.current === String(matched.id || matched.lrn) && (now - lastScannedTimeRef.current < 60000);
        const secondsAgo = isRecentScan ? Math.max(1, Math.round((now - lastScannedTimeRef.current) / 1000)) : null;

        lastScannedCodeRef.current = String(matched.id || matched.lrn);
        lastScannedTimeRef.current = now;

        // Stage 2: Database matching successful
        setScanProgressPercent(70);
        setScanProcessingStep(
          matched._isSignedBadge
            ? '🛡️ Cryptographic Signature Verified (HMAC-SHA256)'
            : 'QR Code Verified! Locating student record...'
        );
        setScanProcessingSubstep(`Student: ${matched.fname} ${matched.lname} (${matched.lrn || matched.id})`);

        await new Promise(r => setTimeout(r, 450));

        // Stage 3: Complete
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
          success(`Student Identified: ${matched.fname} ${matched.lname} (${matched.lrn || matched.id})`);
        }
      } else if (isSignedFormat) {
        // Explicit Forged / Tampered Cryptographic Signature Detection
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
        isScanningLockedRef.current = false;
      } else {
        // Invalid / Foreign QR Code
        setScanProgressPercent(100);
        setScanProcessingStep('Invalid / Unrecognized QR Code');
        setScanProcessingSubstep('No registered student record matches this QR payload');

        playScanErrorSound();
        error('Invalid QR Code: Unrecognized student ID or badge');

        // Show invalid notice for 3 seconds then automatically dismiss & re-arm scanner
        await new Promise(r => setTimeout(r, 3000));

        setIsProcessingScan(false);
        setScanProcessingStep('');
        setScanProcessingSubstep('');
        setScanProgressPercent(0);
        isScanningLockedRef.current = false;
      }
    } catch (err) {
      setIsProcessingScan(false);
      setScanProcessingStep('');
      setScanProcessingSubstep('');
      setScanProgressPercent(0);
      playScanErrorSound();
      error('Invalid QR Code: Scan processing failed');
      isScanningLockedRef.current = false;
    }
  };


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
      let decodedText = null;

      // Strategy 1: Native Chrome/Edge BarcodeDetector API (ultra-accurate & fast)
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
          const imgBitmap = await createImageBitmap(file);
          const detectedCodes = await detector.detect(imgBitmap);
          if (detectedCodes && detectedCodes.length > 0) {
            decodedText = detectedCodes[0].rawValue;
          }
        } catch {
          // Continue to next strategy
        }
      }

      // Strategy 2: Dedicated Html5Qrcode instance on hidden container
      if (!decodedText) {
        try {
          const tempScanner = new Html5Qrcode('qr-hidden-file-decoder', { verbose: false });
          decodedText = await tempScanner.scanFile(file, false);
          await tempScanner.clear().catch(() => {});
        } catch {
          // Continue to next strategy
        }
      }

      // Strategy 3: Canvas multi-scale normalization (for large phone photos / low contrast)
      if (!decodedText) {
        try {
          const processedBlob = await preprocessQRImage(file);
          if (processedBlob) {
            const tempScanner = new Html5Qrcode('qr-hidden-file-decoder', { verbose: false });
            decodedText = await tempScanner.scanFile(processedBlob, false);
            await tempScanner.clear().catch(() => {});
          }
        } catch {
          // Continue to next strategy
        }
      }

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

  // Decode and find student (immediate)
  const handleProcessDecodedText = async (rawInput) => {
    processScanWithAnimation(rawInput);
  };

  if (isCapturingLocation) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '48px 36px', boxShadow: '0 25px 60px -15px rgba(7, 52, 95, 0.2)', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '440px', width: '100%' }}>
          <div style={{ width: '76px', height: '76px', margin: '0 auto 24px', background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(7, 52, 95, 0.3)', color: '#ffffff' }}>
            <Loader2 size={36} className="spinner" style={{ animation: 'spin 1.2s linear infinite' }} />
          </div>

          <h2 style={{ color: '#07345f', margin: '0 0 10px 0', fontSize: '22px', fontWeight: 800 }}>
            Capturing GPS Location...
          </h2>
          <p style={{ color: '#64748b', margin: '0 0 20px 0', fontSize: '14px', lineHeight: 1.5 }}>
            Acquiring device coordinates from Student QR Scan for disciplinary audit logging.
          </p>

          <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#f0fdf4', color: '#15803d', fontSize: '13px', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <MapPin size={15} color="#16a34a" /> {locationStatus}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="scan-qr-page">
      {/* 1. Standard App Page Banner Header */}
      <div className="page-banner-header">
        <div className="page-banner-info">
          <QrCode size={26} color="#0f172a" strokeWidth={2.4} style={{ flexShrink: 0 }} />
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Student QR Scanner &amp; Tracker
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#64748b' }}>
              Scan printed student ID badges using device camera or search via Student ID.
            </p>
          </div>
        </div>
      </div>


      {/* Main Two-Column Scanner Grid */}
      <div className="scanner-grid-container">
        {/* Left Column: Live Camera Scanner & Controls */}
        <div className="scanner-card">
          <div className="scanner-card-header">
            <h3 className="scanner-card-title">
              <Camera size={18} color="#07345f" />
              Live Camera Feed
            </h3>

            <div className="scanner-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Sound & Haptic Feedback Settings Dropdown */}
              <div className="custom-feedback-dropdown-container" ref={feedbackMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className={`feedback-settings-trigger ${isFeedbackMenuOpen ? 'active' : ''} ${!feedbackConfig.soundEnabled && !feedbackConfig.hapticEnabled ? 'muted' : ''}`}
                  onClick={() => setIsFeedbackMenuOpen(prev => !prev)}
                  title="Audio & Haptic Feedback Settings"
                  aria-label="Audio & Haptic Feedback Settings"
                >
                  {feedbackConfig.soundEnabled ? (
                    <Volume2 size={15} color="#07345f" />
                  ) : (
                    <VolumeX size={15} color="#94a3b8" />
                  )}
                  <span className="feedback-trigger-label">Feedback</span>
                  {feedbackConfig.hapticEnabled && (
                    <span className="haptic-dot-indicator" title="Vibration Enabled" />
                  )}
                </button>

                {isFeedbackMenuOpen && (
                  <div className="feedback-settings-popover" role="dialog">
                    <div className="feedback-popover-header">
                      <span className="feedback-popover-title">Scanner Feedback</span>
                      <span className="feedback-popover-tag">Audio &amp; Haptics</span>
                    </div>

                    <div className="feedback-popover-body">
                      {/* Audio Chimes Toggle */}
                      <div className="feedback-toggle-row">
                        <div className="feedback-toggle-info">
                          <div className="feedback-toggle-title">
                            <Volume2 size={14} /> Sound Chimes
                          </div>
                          <span className="feedback-toggle-desc">High Chime / Double Buzz</span>
                        </div>
                        <label className="feedback-switch">
                          <input
                            type="checkbox"
                            checked={feedbackConfig.soundEnabled}
                            onChange={(e) => handleUpdateFeedback({ soundEnabled: e.target.checked })}
                          />
                          <span className="feedback-slider" />
                        </label>
                      </div>

                      {/* Volume Slider (if sound enabled) */}
                      {feedbackConfig.soundEnabled && (
                        <div className="feedback-volume-row">
                          <div className="feedback-volume-labels">
                            <span className="feedback-volume-title">Volume Level</span>
                            <span className="feedback-volume-value">{Math.round(feedbackConfig.volume * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={feedbackConfig.volume}
                            onChange={(e) => handleUpdateFeedback({ volume: parseFloat(e.target.value) })}
                            className="feedback-volume-range"
                          />
                        </div>
                      )}

                      {/* Haptic Vibration Toggle */}
                      <div className="feedback-toggle-row">
                        <div className="feedback-toggle-info">
                          <div className="feedback-toggle-title">
                            <Vibrate size={14} /> Vibration / Haptics
                          </div>
                          <span className="feedback-toggle-desc">Tactile mobile buzz</span>
                        </div>
                        <label className="feedback-switch">
                          <input
                            type="checkbox"
                            checked={feedbackConfig.hapticEnabled}
                            onChange={(e) => handleUpdateFeedback({ hapticEnabled: e.target.checked })}
                          />
                          <span className="feedback-slider" />
                        </label>
                      </div>

                      {/* Live Audio Test Buttons */}
                      <div className="feedback-test-actions">
                        <span className="feedback-test-heading">Test Feedback Profiles</span>
                        <div className="feedback-test-buttons-grid">
                          <button
                            type="button"
                            className="feedback-test-btn success"
                            onClick={() => {
                              playSuccessChime(feedbackConfig.volume);
                              triggerHapticFeedback('success');
                            }}
                            title="Test Authentic Student High Chime"
                          >
                            <Sparkles size={13} /> High Chime (Success)
                          </button>
                          <button
                            type="button"
                            className="feedback-test-btn error"
                            onClick={() => {
                              playErrorBuzz(feedbackConfig.volume);
                              triggerHapticFeedback('error');
                            }}
                            title="Test Invalid / Tampered QR Buzz"
                          >
                            <AlertTriangle size={13} /> Double Buzz (Invalid)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Modern Camera Device Picker Dropdown */}
              {availableCameras.length > 0 ? (
                <div className="custom-camera-dropdown-container" ref={cameraDropdownRef}>
                  <button
                    type="button"
                    className={`custom-camera-trigger ${isCameraDropdownOpen ? 'active' : ''}`}
                    onClick={() => setIsCameraDropdownOpen(prev => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={isCameraDropdownOpen}
                    title="Switch Camera Device"
                  >
                    <div className="custom-camera-trigger-left">
                      <span className="camera-trigger-indicator" />
                      <span className="custom-camera-trigger-text">
                        {activeCameraLabel}
                      </span>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`custom-camera-trigger-chevron ${isCameraDropdownOpen ? 'open' : ''}`}
                    />
                  </button>

                  {isCameraDropdownOpen && (
                    <div className="custom-camera-menu-dropdown" role="listbox">
                      <div className="custom-camera-menu-title">
                        <span>Detected Video Devices</span>
                        <span className="custom-camera-count-badge">{availableCameras.length}</span>
                      </div>

                      <div className="custom-camera-options-list">
                        {availableCameras.map((cam, idx) => {
                          const isSelected = cam.id === (activeCamera?.id || selectedCameraId || availableCameras[0]?.id);
                          return (
                            <button
                              key={cam.id}
                              type="button"
                              className={`custom-camera-menu-option ${isSelected ? 'selected' : ''}`}
                              onClick={() => handleSelectCamera(cam.id)}
                              role="option"
                              aria-selected={isSelected}
                            >
                              <div className="custom-camera-option-meta">
                                <div className={`camera-option-icon-wrap ${isSelected ? 'selected' : ''}`}>
                                  <Camera size={13} />
                                </div>
                                <div className="camera-option-details">
                                  <span className="camera-option-label-text">
                                    {cam.label || `Camera Device #${idx + 1}`}
                                  </span>
                                  {isSelected && (
                                    <span className="camera-option-connected-tag">Active Stream</span>
                                  )}
                                </div>
                              </div>

                              {isSelected && (
                                <Check size={15} className="camera-option-check-icon" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <span className="camera-facing-label">
                  {cameraFacing === 'environment' ? 'Rear Camera' : 'Front Camera'}
                </span>
              )}
            </div>
          </div>

          {/* Video Viewport Container */}
          <div className={`scanner-viewport-wrapper ${isFrontCamera ? 'is-front-camera' : ''} ${cameraError || (!hasCameraPermission && !isScannerRunning) ? 'camera-error-active' : ''}`}>
            <div id="reader-stream-container" />

            {/* Custom Glowing Reticle HUD (Only when camera is active and running) */}
            {!cameraError && hasCameraPermission && isScannerRunning && (
              <div className="scanner-overlay-reticle">
                <div className="reticle-box">
                  <div className="corner-bracket top-left" />
                  <div className="corner-bracket top-right" />
                  <div className="corner-bracket bottom-left" />
                  <div className="corner-bracket bottom-right" />
                  {!isScanningPaused && <div className="laser-scan-line" />}
                </div>
              </div>
            )}

            {/* Clean Modern High-Tech Camera Starting-Up Overlay */}
            {hasCameraPermission && isStartingCamera && !cameraError && (
              <div className="camera-starting-overlay">
                {/* Ambient Viewfinder HUD Corner Brackets */}
                <div className="camera-starting-hud-corner top-left" />
                <div className="camera-starting-hud-corner top-right" />
                <div className="camera-starting-hud-corner bottom-left" />
                <div className="camera-starting-hud-corner bottom-right" />

                <div className="camera-starting-card">
                  <div className="camera-starting-radar">
                    <div className="radar-pulse radar-pulse-1" />
                    <div className="radar-pulse radar-pulse-2" />
                    <div className="camera-starting-spinner-ring" />
                    <div className="camera-starting-icon-wrap">
                      <Camera size={24} className="camera-starting-icon" />
                    </div>
                  </div>

                  <div className="camera-starting-info">
                    <div className="camera-starting-badge">
                      <span className="starting-status-dot" />
                      <span>INITIALIZING SENSOR</span>
                    </div>
                    <h4 className="camera-starting-title">Starting Camera</h4>
                    <p className="camera-starting-step">{cameraStartupStep || 'Connecting to video sensor...'}</p>
                    <div className="camera-starting-progress-bar">
                      <div className="camera-starting-progress-fill" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* One-Time Camera Permission Request Overlay (Only shown before camera is allowed) */}
            {!hasCameraPermission && !cameraError && (
              <div className="camera-notice-overlay">
                <div className="camera-notice-card">
                  <div className="camera-notice-icon-wrap" style={{ background: '#eff6ff', borderColor: '#bfdbfe', color: '#2563eb' }}>
                    <div className="camera-notice-icon-pulse" style={{ borderColor: 'rgba(37, 99, 235, 0.35)' }} />
                    <Camera size={24} className="camera-notice-icon" />
                  </div>

                  <div className="camera-notice-content">
                    <h4 className="camera-notice-title">Camera Access Required</h4>
                    <p className="camera-notice-text">
                      Allow camera access to scan student ID QR badges quickly for real-time tracking and logging. Authorization is required only once.
                    </p>
                  </div>

                  <div className="camera-notice-actions">
                    <button
                      type="button"
                      onClick={handleRequestCameraAccess}
                      className="camera-notice-btn primary"
                      disabled={isRequestingPermission}
                    >
                      {isRequestingPermission ? (
                        <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Camera size={14} />
                      )}
                      <span>{isRequestingPermission ? 'Requesting Access...' : 'Allow Camera Access'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="camera-notice-btn secondary"
                    >
                      <Upload size={13} />
                      <span>Scan Image</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="camera-notice-hint-btn"
                    onClick={() => {
                      if (manualInputRef.current) {
                        manualInputRef.current.focus();
                        manualInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <Search size={12} className="camera-hint-icon" />
                    <span>Or enter Student ID / Name in manual search</span>
                  </button>
                </div>
              </div>
            )}

            {/* Camera Error / Permission Fallback Overlay */}
            {cameraError && (
              <div className="camera-notice-overlay">
                <div className="camera-notice-card">
                  <div className="camera-notice-icon-wrap">
                    <div className="camera-notice-icon-pulse" />
                    <CameraOff size={24} className="camera-notice-icon" />
                  </div>

                  <div className="camera-notice-content">
                    <h4 className="camera-notice-title">Camera Unavailable</h4>
                    <p className="camera-notice-text">
                      {cameraError}
                    </p>

                    {activeCameraLabel && (
                      <div className="camera-detected-device-pill">
                        <span className="camera-device-dot-busy" />
                        <span className="camera-device-pill-text">{activeCameraLabel}</span>
                      </div>
                    )}
                  </div>

                  {availableCameras.length > 1 && (
                    <div className="camera-fallback-devices-wrap">
                      <span className="camera-fallback-devices-title">Switch to Detected Camera</span>
                      <div className="camera-fallback-chips">
                        {availableCameras.map((cam) => {
                          const isCurrent = cam.id === selectedCameraId;
                          return (
                            <button
                              key={cam.id}
                              type="button"
                              onClick={() => handleSelectCamera(cam.id)}
                              className={`camera-fallback-chip ${isCurrent ? 'active' : ''}`}
                              title={`Switch to ${cam.label || 'Camera'}`}
                            >
                              <Camera size={11} />
                              <span>{cam.label || 'Camera'}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="camera-notice-actions">
                    <button
                      type="button"
                      onClick={handleRetryCamera}
                      className="camera-notice-btn primary"
                    >
                      <RefreshCw size={13} />
                      <span>Retry Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="camera-notice-btn secondary"
                    >
                      <Upload size={13} />
                      <span>Scan Image</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="camera-notice-hint-btn"
                    onClick={() => {
                      if (manualInputRef.current) {
                        manualInputRef.current.focus();
                        manualInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }}
                  >
                    <Search size={12} className="camera-hint-icon" />
                    <span>Or enter Student ID / Name in manual search</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scanner Controls Bar */}
          <div className="scanner-controls-bar">
            <button
              type="button"
              className={`scan-ctrl-btn ${isFrontCamera ? 'active' : ''}`}
              onClick={() => setIsMirrored(prev => (prev !== null ? !prev : !isFrontCamera))}
              title={isFrontCamera ? 'Mirroring is ON (Selfie Mode) - Click to unmirror' : 'Mirroring is OFF - Click to mirror'}
            >
              <FlipHorizontal size={14} />
              <span>{isFrontCamera ? 'Mirrored' : 'Mirror'}</span>
            </button>

            <button
              type="button"
              className="scan-ctrl-btn"
              onClick={handleToggleCameraFacing}
              title="Switch between front and rear cameras"
            >
              <RefreshCw size={14} />
              <span>Switch Cam</span>
            </button>

            <button
              type="button"
              className={`scan-ctrl-btn ${isScanningPaused ? 'active' : ''}`}
              onClick={handleTogglePause}
              title={isScanningPaused ? 'Resume live scanner' : 'Pause live scanner'}
            >
              {isScanningPaused ? <Play size={14} /> : <Pause size={14} />}
              <span>{isScanningPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              type="button"
              className={`scan-ctrl-btn ${isProcessingScan ? 'active' : ''}`}
              onClick={() => !isProcessingScan && fileInputRef.current?.click()}
              title="Upload an image file containing a student QR code"
              disabled={isProcessingScan}
            >
              {isProcessingScan ? (
                <Loader2 size={14} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Upload size={14} />
              )}
              <span>{isProcessingScan ? 'Processing Image...' : 'Scan Image'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>

          {/* Manual Search & Quick Selection Fallback */}
          <div className="manual-search-box">
            <div className="manual-search-header">
              <span className="manual-search-title">Manual Student Lookup</span>
              <span className="manual-search-subtag">Student ID or Name</span>
            </div>

            <div className="manual-search-input-group">
              <div className="manual-input-wrapper">
                <Search size={15} className="manual-input-search-icon" />
                <input
                  ref={manualInputRef}
                  type="text"
                  className="manual-search-field"
                  placeholder="Enter Student ID or Student Name..."
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualQuery.trim()) {
                      handleProcessDecodedText(manualQuery);
                    }
                  }}
                />
                {manualQuery && (
                  <button
                    type="button"
                    className="manual-clear-btn"
                    onClick={() => setManualQuery('')}
                    title="Clear input"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className="manual-search-submit-btn"
                onClick={() => manualQuery.trim() && handleProcessDecodedText(manualQuery)}
                disabled={!manualQuery.trim()}
              >
                <Search size={14} />
                <span>Search</span>
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            {allStudents.length > 0 && (
              <div className="quick-sample-chips">
                <span className="quick-sample-label">Quick Test:</span>
                <div className="quick-chips-list">
                  {allStudents.slice(0, 4).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      className="quick-chip"
                      onClick={() => {
                        setScannedStudent(s);
                        loadStudentRecords(s.id);
                        playScanBeep();
                        success(`Selected: ${s.fname} ${s.lname}`);
                      }}
                      title={`Select ${s.fname} ${s.lname}`}
                    >
                      <span className="quick-chip-dot" />
                      <span className="quick-chip-name">{s.fname} {s.lname}</span>
                      <span className="quick-chip-grade">{s.grade?.replace('Grade ', 'G') || 'G7'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Staged Loading & Verification Modal Overlay */}
      {isProcessingScan && (
        <div
          className="student-scan-modal-overlay"
          onClick={() => {
            if (scanProcessingStep.includes('Invalid')) {
              setIsProcessingScan(false);
              setScanProcessingStep('');
              setScanProcessingSubstep('');
              setScanProgressPercent(0);
              isScanningLockedRef.current = false;
            }
          }}
        >
          <div className="student-scan-modal-dialog" style={{ maxWidth: '420px', textAlign: 'center', padding: '28px 24px' }} onClick={(e) => e.stopPropagation()}>
            <div className="scan-processing-state" style={{ margin: 0, padding: 0, gap: '14px' }}>
              {/* Matrix Scanner Hub */}
              <div className="scan-matrix-hub-wrapper">
                <div className={`scan-matrix-pulse ring-1 ${scanProcessingStep.includes('Invalid') ? 'error-pulse' : ''}`} />
                <div className={`scan-matrix-pulse ring-2 ${scanProcessingStep.includes('Invalid') ? 'error-pulse' : ''}`} />
                <div className="scan-matrix-hub" style={scanProcessingStep.includes('Invalid') ? { borderColor: '#ef4444', background: '#fef2f2' } : {}}>
                  {scanProcessingStep.includes('Invalid') ? (
                    <AlertTriangle size={34} color="#dc2626" />
                  ) : (
                    <QrCode size={34} className="scan-matrix-icon" />
                  )}
                  {!scanProcessingStep.includes('Invalid') && <div className="scan-matrix-laser" />}
                  <div className="scan-matrix-corner top-left" style={scanProcessingStep.includes('Invalid') ? { borderColor: '#ef4444' } : {}} />
                  <div className="scan-matrix-corner top-right" style={scanProcessingStep.includes('Invalid') ? { borderColor: '#ef4444' } : {}} />
                  <div className="scan-matrix-corner bottom-left" style={scanProcessingStep.includes('Invalid') ? { borderColor: '#ef4444' } : {}} />
                  <div className="scan-matrix-corner bottom-right" style={scanProcessingStep.includes('Invalid') ? { borderColor: '#ef4444' } : {}} />
                </div>
              </div>

              {/* Title & Substep */}
              <div className="scan-processing-header">
                <h3 className="processing-title" style={scanProcessingStep.includes('Invalid') ? { color: '#dc2626' } : {}}>
                  {scanProcessingStep.includes('Invalid') ? 'Unrecognized QR Code' : 'Scanning & Verifying'}
                </h3>
                <p className="processing-substep-text" style={scanProcessingStep.includes('Invalid') ? { color: '#ef4444' } : {}}>
                  {scanProcessingSubstep || 'Optical code captured from device'}
                </p>
              </div>

              {/* Dynamic Status Pill */}
              <div
                className="processing-step-pill"
                style={scanProcessingStep.includes('Invalid') ? { background: '#fee2e2', borderColor: '#fca5a5', color: '#dc2626' } : {}}
              >
                <span
                  className="processing-live-dot"
                  style={scanProcessingStep.includes('Invalid') ? { background: '#ef4444', boxShadow: '0 0 8px #ef4444' } : {}}
                />
                <span className="processing-step-label">
                  {scanProcessingStep || 'Scanning visual QR matrix...'}
                </span>
              </div>

              {/* 3-Stage Pipeline Indicator */}
              <div className="scan-pipeline-steps">
                <div className={`pipeline-step ${scanProgressPercent >= 25 ? 'active' : ''} ${scanProgressPercent > 25 && !scanProcessingStep.includes('Invalid') ? 'completed' : ''}`}>
                  <div className="pipeline-dot" style={scanProcessingStep.includes('Invalid') ? { background: '#ef4444' } : {}} />
                  <span>Scan Matrix</span>
                </div>
                <div className="pipeline-connector" />
                <div className={`pipeline-step ${scanProgressPercent >= 70 ? 'active' : ''} ${scanProgressPercent > 70 && !scanProcessingStep.includes('Invalid') ? 'completed' : ''}`}>
                  <div className="pipeline-dot" style={scanProcessingStep.includes('Invalid') ? { background: '#ef4444' } : {}} />
                  <span>Database Match</span>
                </div>
                <div className="pipeline-connector" />
                <div className={`pipeline-step ${scanProgressPercent >= 100 ? (scanProcessingStep.includes('Invalid') ? 'active error' : 'active completed') : ''}`}>
                  <div className="pipeline-dot" style={scanProcessingStep.includes('Invalid') ? { background: '#ef4444' } : {}} />
                  <span>{scanProcessingStep.includes('Invalid') ? 'Rejected' : 'Finalize'}</span>
                </div>
              </div>

              {/* Dynamic Progress Bar */}
              <div className="scan-progress-wrapper">
                <div className="scan-progress-bar-container">
                  <div
                    className="scan-progress-bar-fill"
                    style={{
                      width: `${scanProgressPercent}%`,
                      background: scanProcessingStep.includes('Invalid') ? '#ef4444' : undefined
                    }}
                  >
                    {!scanProcessingStep.includes('Invalid') && <div className="scan-progress-shimmer" />}
                  </div>
                </div>
                <div className="scan-progress-meta">
                  <span className="scan-progress-status-label" style={scanProcessingStep.includes('Invalid') ? { color: '#ef4444' } : {}}>
                    {scanProcessingStep.includes('Invalid') ? 'Validation Failed' : scanProgressPercent >= 100 ? 'Verification Complete' : 'Decrypting Payload'}
                  </span>
                  <span className="scan-progress-percentage">{scanProgressPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verified Student Conduct Modal Popup */}
      {scannedStudent && (
        <div className="student-scan-modal-overlay" onClick={handleCloseStudentModal}>
          <div className="student-scan-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="student-scan-modal-header">
              <div className="student-scan-modal-title-group">
                <div className="modal-header-icon-badge">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="student-scan-modal-title">Student Identified</h3>
                  <p className="student-scan-modal-subtitle">Official Student Conduct Summary</p>
                </div>
              </div>
              <button
                type="button"
                className="student-scan-modal-close-btn"
                onClick={handleCloseStudentModal}
                aria-label="Close modal"
              >
                <X size={17} />
              </button>
            </div>

            <div className="student-scan-modal-body">
              {/* Unified Student Hero Card */}
              <div className="verified-header-card">
                <div className="verified-hero-main">
                  <div className="verified-avatar-wrapper">
                    <img
                      src={
                        scannedStudent.image ||
                        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
                      }
                      alt={`${scannedStudent.fname} ${scannedStudent.lname}`}
                      className="verified-avatar"
                    />
                    <div className="verified-avatar-badge" title="Identity Verified">
                      <Check size={10} strokeWidth={3} />
                    </div>
                  </div>

                  <div className="verified-meta">
                    <div className="verified-name-row">
                      <h2 className="verified-name">
                        {scannedStudent.fname} {scannedStudent.mname ? `${scannedStudent.mname[0]}. ` : ''}{scannedStudent.lname}
                      </h2>
                      {scannedStudent._isSignedBadge && (
                        <span
                          className="authentic-signed-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#059669',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}
                          title="Tamper-proof cryptographic signature verified"
                        >
                          <Check size={11} strokeWidth={3} /> Signed Badge
                        </span>
                      )}
                      {/* Integrated Status Pill */}
                      {studentRecords.length >= 3 ? (
                        <span className="status-flag-pill danger">
                          <ShieldAlert size={12} /> High Priority
                        </span>
                      ) : studentRecords.length > 0 ? (
                        <span className="status-flag-pill warning">
                          <AlertTriangle size={12} /> Active Records
                        </span>
                      ) : (
                        <span className="status-flag-pill success">
                          <CheckCircle2 size={12} /> Clean Standing
                        </span>
                      )}
                    </div>

                    <div className="verified-details-row">
                      <span className="verified-section-tag">
                        {scannedStudent.grade} – {scannedStudent.section}
                      </span>
                      <span className="verified-dot">•</span>
                      <span className="lrn-chip" title="Learner Reference Number">
                        ID: {scannedStudent.lrn}
                      </span>
                      {scannedStudent.academicyear && (
                        <>
                          <span className="verified-dot">•</span>
                          <span className="sy-text">S.Y. {scannedStudent.academicyear}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Integrated Guardian Sub-Bar */}
                {scannedStudent.parent_name && (
                  <div className="verified-guardian-strip">
                    <span className="guardian-strip-label">Guardian:</span>
                    <span className="guardian-strip-name">{scannedStudent.parent_name}</span>
                    {scannedStudent.parent_contact && (
                      <a href={`tel:${scannedStudent.parent_contact}`} className="guardian-strip-phone" title="Call Guardian">
                        <Phone size={11} />
                        <span>{scannedStudent.parent_contact}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Streamlined Stats Strip */}
              <div className="student-stats-strip">
                <div className={`stat-strip-item ${studentRecords.length > 0 ? (studentRecords.length >= 3 ? 'danger' : 'warning') : 'success'}`}>
                  <span className="stat-strip-num">{studentRecords.length}</span>
                  <span className="stat-strip-label">Total Infractions</span>
                </div>

                <div className="stat-strip-divider" />

                <div className="stat-strip-item warning">
                  <span className="stat-strip-num">{studentRecords.filter(r => r.status === 'Pending').length}</span>
                  <span className="stat-strip-label">Pending Action</span>
                </div>

                <div className="stat-strip-divider" />

                <div className="stat-strip-item success">
                  <span className="stat-strip-num">{studentRecords.filter(r => r.status === 'Resolved').length}</span>
                  <span className="stat-strip-label">Resolved</span>
                </div>
              </div>

              {/* Recent Violations Section */}
              <div className="recent-violations-wrap">
                <div className="recent-violations-title">
                  <span>Recent Violation History</span>
                  <span className="history-count-badge">{studentRecords.length} {studentRecords.length === 1 ? 'record' : 'records'}</span>
                </div>

                {studentRecords.length === 0 ? (
                  <div className="clean-standing-box">
                    <CheckCircle2 size={16} className="clean-standing-icon" />
                    <span>Clean disciplinary standing — no active infractions logged.</span>
                  </div>
                ) : (
                  <div className="violations-timeline-list">
                    {studentRecords.map(r => {
                      const vType = (r.violation?.type || 'Minor').toLowerCase();
                      const severityClass = vType === 'major' ? 'severity-major' : vType === 'serious' ? 'severity-serious' : 'severity-minor';
                      return (
                        <div key={r.id} className="violation-timeline-item">
                          <div className="violation-item-main">
                            <span className="v-item-title">{r.violation?.title || r.title || 'Violation Incident'}</span>
                            <div className="v-item-meta">
                              <span className="v-item-date">
                                {r.date_reported ? new Date(r.date_reported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                              </span>
                              <span className="v-item-dot">•</span>
                              <span className={`v-severity-pill ${severityClass}`}>
                                {r.violation?.type || 'Minor'}
                              </span>
                            </div>
                          </div>
                          <span className={`v-status-badge ${(r.status || 'pending').toLowerCase()}`}>
                            {r.status || 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="student-scan-modal-footer">
              <div className="footer-actions-row">
                <button
                  type="button"
                  className="verified-btn primary"
                  onClick={() => setIsViolationModalOpen(true)}
                >
                  <PlusCircle size={15} />
                  <span>Log Violation</span>
                </button>

                <button
                  type="button"
                  className="verified-btn secondary"
                  onClick={() => navigate(`/student-violation/${scannedStudent.id}`)}
                >
                  <FileSpreadsheet size={15} />
                  <span>Full Profile</span>
                </button>
              </div>

              <button
                type="button"
                className="verified-btn tertiary"
                onClick={handleCloseStudentModal}
                title="Scan next badge"
              >
                <RefreshCw size={13} />
                <span>Scan Next Badge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log Violation Modal for Verified Student */}
      {scannedStudent && (
        <AddViolationModal
          isOpen={isViolationModalOpen}
          onClose={() => setIsViolationModalOpen(false)}
          preselectedStudentId={scannedStudent.id}
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
