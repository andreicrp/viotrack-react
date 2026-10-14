import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

export const useCameraScanner = ({ onScan, isEnabled = true }) => {
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
  const [cameraError, setCameraError] = useState(null);
  const [isScanningPaused, setIsScanningPaused] = useState(false);
  const [isMirrored, setIsMirrored] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const html5QrCodeRef = useRef(null);
  const isScanningLockedRef = useRef(false);
  const lastScannedCodeRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScannerInstance = async (scanner) => {
    if (!scanner) return;
    try {
      const isScanning = scanner.isScanning || (typeof scanner.getState === 'function' && scanner.getState() === 2);
      if (isScanning) {
        await scanner.stop().catch(() => {});
      }
      await scanner.clear().catch(() => {});
    } catch {
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
    if (!isEnabled) return;
    if (!hasCameraPermission) return;

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

              if (onScanRef.current) {
                onScanRef.current(cleanText);
              }

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

            // Enumerate devices quietly via standard Web API
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

                if (onScanRef.current) {
                  onScanRef.current(cleanText);
                }

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
  }, [cameraFacing, selectedCameraId, isEnabled, retryCount, hasCameraPermission]);

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
          } catch {}
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

  // Switch camera device from dropdown smoothly
  const handleSelectCamera = useCallback(async (camId) => {
    setSelectedCameraId(camId);

    // Try instant in-place track constraint switch
    if (html5QrCodeRef.current && isScannerRunning) {
      try {
        await html5QrCodeRef.current.applyVideoConstraints({ deviceId: { exact: camId } });
        return;
      } catch {
        // Fallback to restart
      }
    }

    setIsStartingCamera(true);
    setCameraStartupStep('Switching camera...');
    if (html5QrCodeRef.current) {
      await stopScannerInstance(html5QrCodeRef.current);
      html5QrCodeRef.current = null;
    }
    setRetryCount(prev => prev + 1);
  }, [isScannerRunning]);

  // Toggle Camera Facing or cycle through connected devices
  const handleToggleCameraFacing = useCallback(async () => {
    if (availableCameras.length > 1) {
      const getActive = () => {
        if (selectedCameraId) {
          const found = availableCameras.find(c => c.id === selectedCameraId);
          if (found) return found;
        }
        if (cameraFacing === 'environment') {
          return availableCameras.find(c => /back|rear|environment/i.test(c.label)) || availableCameras[availableCameras.length - 1] || availableCameras[0];
        } else {
          return availableCameras.find(c => /front|user|facetime|webcam/i.test(c.label)) || availableCameras[0];
        }
      };
      const currentCam = getActive();
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
  }, [availableCameras, cameraFacing, selectedCameraId, handleSelectCamera]);

  // Active Camera Detection
  const getActiveCamera = useCallback(() => {
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
  }, [availableCameras, cameraFacing, selectedCameraId]);

  const activeCamera = getActiveCamera();
  const activeCameraLabel = activeCamera?.label || (cameraFacing === 'environment' ? 'Rear Camera' : 'Front Camera');
  const isFrontCamera = (() => {
    if (isMirrored !== null) return isMirrored;
    if (cameraFacing === 'user') return true;
    if (activeCamera?.label) {
      if (/front|user|facetime|integrated|selfie|webcam/i.test(activeCamera.label)) return true;
      if (/back|rear|environment/i.test(activeCamera.label)) return false;
    }
    if (availableCameras.length === 1 && !/back|rear|environment/i.test(availableCameras[0]?.label || '')) return true;
    return cameraFacing === 'user';
  })();

  // Pause / Resume Scanning
  const handleTogglePause = useCallback(() => {
    if (!html5QrCodeRef.current) return false;
    try {
      if (isScanningPaused) {
        html5QrCodeRef.current.resume();
        setIsScanningPaused(false);
        return false;
      } else {
        html5QrCodeRef.current.pause();
        setIsScanningPaused(true);
        return true;
      }
    } catch (e) {
      console.warn(e);
      return isScanningPaused;
    }
  }, [isScanningPaused]);

  const unlockScan = useCallback(() => {
    isScanningLockedRef.current = false;
    lastScannedCodeRef.current = '';
  }, []);

  return {
    html5QrCodeRef,
    hasCameraPermission,
    isRequestingPermission,
    isStartingCamera,
    cameraStartupStep,
    isScannerRunning,
    cameraFacing,
    availableCameras,
    selectedCameraId,
    cameraError,
    isScanningPaused,
    isMirrored,
    setIsMirrored,
    activeCamera,
    activeCameraLabel,
    isFrontCamera,
    handleRequestCameraAccess,
    handleRetryCamera,
    handleToggleCameraFacing,
    handleSelectCamera,
    handleTogglePause,
    unlockScan,
    lastScannedCodeRef,
    lastScannedTimeRef,
    isScanningLockedRef
  };
};
