import React, { useState, useRef, useEffect } from 'react';
import { Camera, ChevronDown, Check } from 'lucide-react';

export const ScannerCameraDropdown = ({
  availableCameras = [],
  selectedCameraId,
  activeCamera,
  activeCameraLabel,
  cameraFacing,
  onSelectCamera
}) => {
  const [isCameraDropdownOpen, setIsCameraDropdownOpen] = useState(false);
  const cameraDropdownRef = useRef(null);

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

  if (availableCameras.length <= 1) {
    return (
      <span className="camera-facing-label">
        {cameraFacing === 'environment' ? 'Rear Camera' : 'Front Camera'}
      </span>
    );
  }

  return (
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
                  onClick={() => {
                    setIsCameraDropdownOpen(false);
                    onSelectCamera(cam.id);
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
  );
};
