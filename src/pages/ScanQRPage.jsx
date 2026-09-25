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
  X
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { AddViolationModal } from '../components/violations/AddViolationModal';
import { useNotification } from '../context/NotificationContext';
import { Html5Qrcode } from 'html5-qrcode';

export const ScanQRPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { success, error, info } = useNotification();

  const queryStudentId = searchParams.get('id') || searchParams.get('student_id');
  const queryLrn = searchParams.get('lrn');

  // Scanner States
  const [isScannerRunning, setIsScannerRunning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' or 'user'
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);
  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
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

  // Play a soft high-tech affirmative chime on QR detect
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, audioCtx.currentTime); // B5 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.18);
    } catch (e) {
      // AudioContext blocked or not supported
    }
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
        navigate(`/student-violation/${targetId}?scan=true`);
      } else {
        setIsCapturingLocation(false);
        error('Student could not be found from QR scan.');
      }
    }, 900);
  };

  // Helper to unconditionally kill all camera tracks across the DOM
  const stopAllMediaTracks = () => {
    try {
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        try {
          if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
            video.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
                track.enabled = false;
              } catch (e) {}
            });
            video.srcObject = null;
          }
        } catch (e) {}
      });
    } catch (e) {}
  };

  const stopScannerInstance = async (scanner) => {
    if (!scanner) {
      stopAllMediaTracks();
      return;
    }
    try {
      const isScanning = scanner.isScanning || (typeof scanner.getState === 'function' && scanner.getState() === 2);
      if (isScanning) {
        await scanner.stop().catch(() => {});
      }
      await scanner.clear().catch(() => {});
    } catch (e) {
      // Ignore stop errors
    } finally {
      stopAllMediaTracks();
    }
  };

  // Initialize camera safely with Html5Qrcode & guarantee cleanup on navigation
  useEffect(() => {
    if (queryStudentId || queryLrn || isCapturingLocation) return;

    let isMounted = true;
    let localScanner = null;

    const startScanner = async () => {
      const container = document.getElementById('reader-stream-container');
      if (!container || !isMounted) return;

      try {
        setCameraError(null);
        localScanner = new Html5Qrcode('reader-stream-container', { verbose: false });
        html5QrCodeRef.current = localScanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.72);
            return {
              width: Math.max(160, Math.min(260, edge)),
              height: Math.max(160, Math.min(260, edge))
            };
          }
        };

        // Query available cameras to gracefully support all webcams and mobile cameras
        let devices = [];
        try {
          devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0 && isMounted) {
            setAvailableCameras(devices);
          }
        } catch {
          // getCameras failed or not supported, continue with facingMode constraints
        }

        if (!isMounted) {
          await stopScannerInstance(localScanner);
          return;
        }

        // Build list of camera targets to try in order of priority
        const targetsToTry = [];
        if (selectedCameraId && devices.some(d => d.id === selectedCameraId)) {
          const selectedDev = devices.find(d => d.id === selectedCameraId);
          targetsToTry.push({ target: selectedDev.id, label: selectedDev.label, isPrimary: true });
        } else if (devices.length > 0) {
          const preferred = devices.find(d =>
            cameraFacing === 'environment'
              ? /back|rear|environment/i.test(d.label)
              : /front|user|facetime|integrated|webcam/i.test(d.label)
          ) || devices[0];
          targetsToTry.push({ target: preferred.id, label: preferred.label, isPrimary: true });
        }

        // Add remaining devices as graceful fallbacks (in case selected device is locked by Zoom/Teams/another tab)
        devices.forEach(d => {
          if (!targetsToTry.some(t => t.target === d.id)) {
            targetsToTry.push({ target: d.id, label: d.label, isPrimary: false });
          }
        });

        // Add generic facingMode constraints as final fallback
        targetsToTry.push({ target: { facingMode: cameraFacing }, label: `${cameraFacing} camera`, isPrimary: false });
        targetsToTry.push({
          target: { facingMode: cameraFacing === 'environment' ? 'user' : 'environment' },
          label: 'secondary camera',
          isPrimary: false
        });

        let startedSuccessfully = false;
        let lastError = null;

        for (const candidate of targetsToTry) {
          if (!isMounted) break;

          // Attempt with standard config first, then low-overhead config
          const configsToTry = [
            config,
            { fps: 10, qrbox: { width: 200, height: 200 } }
          ];

          for (const conf of configsToTry) {
            try {
              // Ensure any previous stream track lock is freed
              stopAllMediaTracks();
              
              await localScanner.start(
                candidate.target,
                conf,
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
                setIsScannerRunning(true);
                setCameraError(null);
                if (typeof candidate.target === 'string' && candidate.target !== selectedCameraId) {
                  setSelectedCameraId(candidate.target);
                  if (!candidate.isPrimary) {
                    info(`Primary camera was in use. Connected to ${candidate.label || 'alternate camera'}.`);
                  }
                }
              }
              break;
            } catch (err) {
              lastError = err;
              // Clean up scanner state before trying next target
              try {
                if (localScanner.isScanning) {
                  await localScanner.stop().catch(() => {});
                }
              } catch {}
            }
          }

          if (startedSuccessfully) break;
        }

        if (!startedSuccessfully && isMounted) {
          console.warn('All camera targets failed:', lastError);
          setCameraError(
            lastError?.message?.includes('Permission') || lastError?.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera permissions in your browser address bar.'
              : 'Camera is currently unavailable or in use by another application. You can retry, switch cameras below, or upload a QR image.'
          );
          setIsScannerRunning(false);
          stopAllMediaTracks();
        } else if (!isMounted) {
          await stopScannerInstance(localScanner);
        }
      } catch (err) {
        console.warn('Camera stream warning:', err);
        if (isMounted) {
          setCameraError(
            err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera permissions in your browser address bar.'
              : 'Camera is currently unavailable or in use by another application. You can retry, switch cameras below, or upload a QR image.'
          );
          setIsScannerRunning(false);
        }
        stopAllMediaTracks();
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
      setIsScannerRunning(false);
      const toStop = localScanner || html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      stopScannerInstance(toStop);
    };
  }, [cameraFacing, selectedCameraId, queryStudentId, queryLrn, isCapturingLocation, retryCount]);

  // Retry Camera Initialization
  const handleRetryCamera = async () => {
    setCameraError(null);
    if (html5QrCodeRef.current) {
      await stopScannerInstance(html5QrCodeRef.current);
      html5QrCodeRef.current = null;
    }
    setRetryCount(prev => prev + 1);
  };

  // Flip Front/Back Camera
  const handleToggleCameraFacing = async () => {
    if (html5QrCodeRef.current) {
      await stopScannerInstance(html5QrCodeRef.current);
      html5QrCodeRef.current = null;
    }
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);

    if (availableCameras.length > 0) {
      const match = availableCameras.find(d =>
        nextFacing === 'environment'
          ? /back|rear|environment/i.test(d.label)
          : /front|user|facetime|integrated|webcam/i.test(d.label)
      ) || (nextFacing === 'user' ? availableCameras[0] : availableCameras[availableCameras.length - 1]);
      if (match) setSelectedCameraId(match.id);
    }
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

  // Active Camera Label
  const activeCamera = availableCameras.find(c => c.id === selectedCameraId);
  const activeCameraLabel = activeCamera?.label || (availableCameras[0]?.label || 'Default Camera');

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

  // 5-Second Staged Swing Loading & Verification Sequence
  const processScanWithAnimation = async (rawInput) => {
    setIsProcessingScan(true);
    setScanProgressPercent(15);
    setScanProcessingStep('Scanning visual QR matrix...');
    setScanProcessingSubstep('Optical code captured from device');
    const startTime = Date.now();

    try {
      const students = allStudents.length > 0 ? allStudents : await dataService.getStudents();
      let clean = (rawInput || '').trim();
      let matched = null;

      if (clean.includes('id=')) {
        const urlParams = new URLSearchParams(clean.split('?')[1]);
        const sid = urlParams.get('id');
        if (sid) matched = students.find(s => s.id === Number(sid));
      } else if (clean.includes('student-violation/')) {
        const parts = clean.split('student-violation/')[1];
        const sid = parts.split('?')[0];
        if (sid) matched = students.find(s => s.id === Number(sid) || s.lrn.trim() === sid.trim());
      } else if (clean.includes('VIOTRACK-STUDENT:')) {
        clean = clean.split(':')[1] || clean;
        matched = students.find(s => s.lrn.trim() === clean.trim() || s.lrn.includes(clean));
      } else {
        matched = students.find(
          s =>
            s.lrn.trim() === clean.trim() ||
            s.lrn.includes(clean) ||
            `${s.fname} ${s.lname}`.toLowerCase().includes(clean.toLowerCase())
        );
      }

      // Stage 1 (0 -> 1800ms): Scanning visual matrix
      const elapsed1 = Date.now() - startTime;
      if (elapsed1 < 1800) {
        await new Promise(r => setTimeout(r, 1800 - elapsed1));
      }

      // Stage 2 (1800ms -> 3600ms): Database matching
      setScanProgressPercent(65);
      setScanProcessingStep('QR Matrix Verified! Locating student record...');
      setScanProcessingSubstep('Querying conduct database & disciplinary files');

      const elapsed2 = Date.now() - startTime;
      if (elapsed2 < 3600) {
        await new Promise(r => setTimeout(r, 3600 - elapsed2));
      }

      // Stage 3 (3600ms -> 5000ms): Profile preparation
      setScanProgressPercent(100);
      setScanProcessingStep('Student Profile Found! Finalizing summary...');
      setScanProcessingSubstep('Preparing verified conduct report');

      const finalElapsed = Date.now() - startTime;
      if (finalElapsed < 5000) {
        await new Promise(r => setTimeout(r, 5000 - finalElapsed));
      }

      setIsProcessingScan(false);
      setScanProcessingStep('');
      setScanProcessingSubstep('');
      setScanProgressPercent(0);

      if (matched) {
        playScanBeep();
        setScannedStudent(matched);
        loadStudentRecords(matched.id);
        success(`Student Identified: ${matched.fname} ${matched.lname} (${matched.lrn})`);
      } else {
        error(`No student record found matching: "${rawInput}"`);
      }
    } catch (err) {
      setIsProcessingScan(false);
      setScanProcessingStep('');
      setScanProcessingSubstep('');
      setScanProgressPercent(0);
      error('Search error: ' + err.message);
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
        error('Could not detect QR code in this image. Please ensure the QR code is clearly visible.');
      }
    } catch (err) {
      setIsProcessingScan(false);
      setScanProcessingStep('');
      setScanProcessingSubstep('');
      setScanProgressPercent(0);
      error('Failed to read image file: ' + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Decode and find student (immediate)
  const handleProcessDecodedText = async (rawInput) => {
    processScanWithAnimation(rawInput);
  };

  const loadStudentRecords = async (studentId) => {
    try {
      const allRecords = await dataService.getRecords();
      const studentHistory = allRecords.filter(r => (r.student?.id || r.student_id) === studentId);
      setStudentRecords(studentHistory);
    } catch (e) {
      console.error(e);
    }
  };

  if (isCapturingLocation) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '20px' }}>
        <div style={{ background: '#ffffff', borderRadius: '24px', padding: '48px 36px', boxShadow: '0 25px 60px -15px rgba(39, 54, 127, 0.2)', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '440px', width: '100%' }}>
          <div style={{ width: '76px', height: '76px', margin: '0 auto 24px', background: 'linear-gradient(135deg, #27367f 0%, #1e2b66 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(39, 54, 127, 0.3)', color: '#ffffff' }}>
            <Loader2 size={36} className="spinner" style={{ animation: 'spin 1.2s linear infinite' }} />
          </div>

          <h2 style={{ color: '#27367f', margin: '0 0 10px 0', fontSize: '22px', fontWeight: 800 }}>
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
      {/* Header Section */}
      <div className="scan-header-section">
        <div className="scan-title-wrap">
          <h1>Student QR Scanner & Tracker</h1>
          <p>Scan printed student ID badges using device camera or search via 12-digit LRN.</p>
        </div>

        <div className={`scan-status-pill ${isScannerRunning && !isScanningPaused ? 'active' : ''}`}>
          <div className="scan-status-dot" />
          <span>{isScanningPaused ? 'Scanner Paused' : isScannerRunning ? 'Scanner Active & Ready' : 'Camera Ready / Standby'}</span>
        </div>
      </div>

      {/* Main Two-Column Scanner Grid */}
      <div className="scanner-grid-container">
        {/* Left Column: Live Camera Scanner & Controls */}
        <div className="scanner-card">
          <div className="scanner-card-header">
            <h3 className="scanner-card-title">
              <Camera size={18} color="#27367f" />
              Live Camera Feed
            </h3>

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
                        const isSelected = cam.id === (selectedCameraId || availableCameras[0]?.id);
                        return (
                          <button
                            key={cam.id}
                            type="button"
                            className={`custom-camera-menu-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedCameraId(cam.id);
                              setIsCameraDropdownOpen(false);
                            }}
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

          {/* Video Viewport Container */}
          <div className="scanner-viewport-wrapper">
            <div id="reader-stream-container" />

            {/* Custom Glowing Reticle HUD */}
            <div className="scanner-overlay-reticle">
              <div className="reticle-box">
                <div className="corner-bracket top-left" />
                <div className="corner-bracket top-right" />
                <div className="corner-bracket bottom-left" />
                <div className="corner-bracket bottom-right" />
                {!isScanningPaused && isScannerRunning && <div className="laser-scan-line" />}
              </div>
            </div>

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
                              onClick={() => {
                                setSelectedCameraId(cam.id);
                                setRetryCount(prev => prev + 1);
                              }}
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
                    <span>Or enter 12-digit LRN / Name in manual search</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Scanner Controls Bar */}
          <div className="scanner-controls-bar">
            <button
              type="button"
              className="scan-ctrl-btn"
              onClick={handleToggleCameraFacing}
              title="Flip between front and rear cameras"
            >
              <RefreshCw size={14} />
              <span>Flip Camera</span>
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
              <span className="manual-search-subtag">12-Digit LRN or Name</span>
            </div>

            <div className="manual-search-input-group">
              <div className="manual-input-wrapper">
                <Search size={15} className="manual-input-search-icon" />
                <input
                  ref={manualInputRef}
                  type="text"
                  className="manual-search-field"
                  placeholder="Enter 12-digit LRN or Student Name..."
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

      {/* 5-Second Swing Loading Modal Overlay */}
      {isProcessingScan && (
        <div className="student-scan-modal-overlay">
          <div className="student-scan-modal-dialog" style={{ maxWidth: '420px', textAlign: 'center', padding: '34px 24px' }}>
            <div className="scan-processing-state" style={{ margin: 0, padding: 0 }}>
              {/* Swing Animation */}
              <div className="ldio-swing-wrapper">
                <div className="ldio-swing-orbit">
                  <div className="ldio-swing-ball ball-1" />
                  <div className="ldio-swing-ball ball-2" />
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <h3 className="processing-title" style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                  Scanning & Verifying
                </h3>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  {scanProcessingSubstep || 'Optical code captured from device'}
                </p>
              </div>

              <div className="processing-step-text" style={{ marginTop: '8px' }}>
                {scanProcessingStep || 'Scanning visual QR matrix...'}
              </div>

              {/* Dynamic 5s Progress Bar */}
              <div style={{ width: '100%', maxWidth: '300px', margin: '14px auto 0 auto' }}>
                <div className="scan-progress-bar-container">
                  <div
                    className="scan-progress-bar-fill"
                    style={{ width: `${scanProgressPercent}%` }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span className="scan-timer-pill">5s Security Verification</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#2563eb' }}>{scanProgressPercent}%</span>
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
                <div className="scan-verified-icon-badge">
                  <CheckCircle2 size={18} />
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
                <X size={18} />
              </button>
            </div>

            <div className="student-scan-modal-body">
              {/* Verified Student Header Card */}
              <div className="verified-header-card">
                <img
                  src={
                    scannedStudent.image ||
                    `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`
                  }
                  alt={`${scannedStudent.fname} ${scannedStudent.lname}`}
                  className="verified-avatar"
                />
                <div className="verified-meta">
                  <h2 className="verified-name">
                    {scannedStudent.fname} {scannedStudent.mname ? `${scannedStudent.mname[0]}. ` : ''}{scannedStudent.lname}
                  </h2>
                  <div className="verified-section-tag">
                    {scannedStudent.grade} - {scannedStudent.section}
                  </div>
                  <div className="verified-lrn-row">
                    <span>LRN:</span>
                    <span className="lrn-chip">{scannedStudent.lrn}</span>
                    <span>• S.Y. {scannedStudent.academicyear || '2026-2027'}</span>
                  </div>
                </div>
              </div>

              {/* Mini Metrics Grid */}
              <div className="student-mini-metrics">
                <div className="mini-metric-box">
                  <div className={`mini-metric-num ${studentRecords.length > 0 ? (studentRecords.length >= 3 ? 'danger' : 'warning') : 'success'}`}>
                    {studentRecords.length}
                  </div>
                  <div className="mini-metric-label">Total Infractions</div>
                </div>

                <div className="mini-metric-box">
                  <div className="mini-metric-num warning">
                    {studentRecords.filter(r => r.status === 'Pending').length}
                  </div>
                  <div className="mini-metric-label">Pending Action</div>
                </div>

                <div className="mini-metric-box">
                  <div className="mini-metric-num success">
                    {studentRecords.filter(r => r.status === 'Resolved').length}
                  </div>
                  <div className="mini-metric-label">Resolved Cases</div>
                </div>
              </div>

              {/* Guardian & Contact Info */}
              <div className="student-info-grid">
                <div className="info-sub-box">
                  <span className="info-sub-label">Parent / Guardian</span>
                  <span className="info-sub-val">{scannedStudent.parent_name || 'N/A'}</span>
                  {scannedStudent.parent_contact && (
                    <a href={`tel:${scannedStudent.parent_contact}`} className="info-sub-contact">
                      <Phone size={12} /> {scannedStudent.parent_contact}
                    </a>
                  )}
                </div>

                <div className="info-sub-box">
                  <span className="info-sub-label">Status Flag</span>
                  <span className="info-sub-val" style={{ color: studentRecords.length >= 3 ? '#dc2626' : studentRecords.length > 0 ? '#d97706' : '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {studentRecords.length >= 3 ? (
                      <><ShieldAlert size={14} /> High Priority</>
                    ) : studentRecords.length > 0 ? (
                      <><AlertTriangle size={14} /> Active Records</>
                    ) : (
                      <><CheckCircle2 size={14} /> Clean Standing</>
                    )}
                  </span>
                </div>
              </div>

              {/* Recent Violations Timeline */}
              <div className="recent-violations-wrap">
                <div className="recent-violations-title">
                  <span>Recent Violation History</span>
                  <span style={{ fontSize: '11.5px', color: '#64748b' }}>{studentRecords.length} records</span>
                </div>

                {studentRecords.length === 0 ? (
                  <div style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#15803d', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                    <CheckCircle2 size={16} color="#16a34a" />
                    Clean disciplinary standing — no active infractions logged.
                  </div>
                ) : (
                  <div className="violations-timeline-list">
                    {studentRecords.map(r => (
                      <div key={r.id} className="violation-timeline-item">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="v-item-title">{r.violation?.title || r.title || 'Violation Incident'}</span>
                          <span className="v-item-date">
                            {r.date_reported ? new Date(r.date_reported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'} • {r.violation?.type || 'Minor'}
                          </span>
                        </div>
                        <span className={`v-status-badge ${(r.status || 'pending').toLowerCase()}`}>
                          {r.status || 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="student-scan-modal-footer">
              <button
                type="button"
                className="verified-btn primary"
                onClick={() => setIsViolationModalOpen(true)}
              >
                <PlusCircle size={15} />
                <span>Log New Violation</span>
              </button>

              <button
                type="button"
                className="verified-btn secondary"
                onClick={() => navigate(`/student-violation/${scannedStudent.id}?scan=true`)}
              >
                <FileSpreadsheet size={15} />
                <span>Full Profile</span>
              </button>

              <button
                type="button"
                className="verified-btn secondary"
                onClick={handleCloseStudentModal}
                title="Scan next badge"
              >
                <RefreshCw size={14} />
                <span>Scan Next</span>
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
          onRecordAdded={() => {
            loadStudentRecords(scannedStudent.id);
            success(`Incident logged for ${scannedStudent.fname} ${scannedStudent.lname}!`);
          }}
        />
      )}

      {/* Hidden container for background file-based QR decoding */}
      <div id="qr-hidden-file-decoder" style={{ display: 'none' }} />
    </div>
  );
};
